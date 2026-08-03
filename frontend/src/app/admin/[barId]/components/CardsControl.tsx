'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSessionStore } from '@/store/useSessionStore';
import { API_URL } from '@/config/api';

export function CardsControl({ sessionId }: { sessionId: string }) {
  const mode = useSessionStore((s) => s.snapshot?.mode) || 'MATCH';
  const activeCard = useSessionStore((s) => s.snapshot?.activeCard);
  const cardsHistory = useSessionStore((s) => s.snapshot?.cardsHistory) || [];
  const pendingCardsCount = useSessionStore((s) => s.snapshot?.pendingCardsCount) || 0;

  const [pendingCards, setPendingCards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/cards/pending/${sessionId}`);
      if (res.ok) {
        setPendingCards(await res.json());
      }
    } catch (e) {
      console.error('Error cargando fichas pendientes:', e);
    }
  }, [sessionId]);

  useEffect(() => {
    if (mode === 'CARDS') {
      fetchPending();
    }
  }, [mode, fetchPending, pendingCardsCount]);

  const handleSetMode = async (newMode: 'MATCH' | 'CARDS') => {
    if (newMode === mode) return;
    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/cards/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, mode: newMode }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        alert(`Error al cambiar de modo: ${data?.message || `HTTP ${res.status}`}`);
        return;
      }
      useSessionStore.getState().applyEvent('SESSION_MODE_CHANGED', { mode: newMode });
    } catch (e) {
      console.error('Error cambiando modo:', e);
      alert('Error de red al cambiar de modo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (cardId: string, action: 'approve' | 'reject' | 'close') => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/cards/${cardId}/${action}`, { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.message || `Error al procesar la ficha (HTTP ${res.status})`);
        return;
      }
      if (action !== 'close') {
        setPendingCards((prev) => prev.filter((c) => c.id !== cardId));
      }
    } catch (e) {
      console.error(`Error en ${action}:`, e);
      setError('Error de red. Intentá de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="bg-slate-800 p-6 rounded-2xl border border-pink-500/30 shadow-xl">
      {/* Switch de modo */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg font-bold flex items-center gap-2 text-pink-400">
          💘 Modo Fichaje / ⚽ Modo Partido
        </h2>
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleSetMode('MATCH')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              mode === 'MATCH' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            ⚽ Partido
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleSetMode('CARDS')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              mode === 'CARDS' ? 'bg-pink-500 text-white shadow animate-pulse' : 'text-slate-400 hover:text-white'
            }`}
          >
            💘 Fichaje {pendingCardsCount > 0 ? `(${pendingCardsCount})` : ''}
          </button>
        </div>
      </div>

      {mode !== 'CARDS' ? (
        <p className="text-xs text-slate-400">
          El modo partido está activo (trivias de fútbol). Activá el <strong>Modo Fichaje</strong> para moderar fichas técnicas.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {error && (
            <p className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl py-2 px-3">
              {error}
            </p>
          )}

          {/* FICHA ACTIVA EN VOTACIÓN */}
          {activeCard && (
            <div className="bg-slate-900 p-4 rounded-xl border border-pink-500/50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-black uppercase text-pink-400 tracking-wider">
                  💘 Ficha Activa en Votación • {activeCard.totalVotes} votos
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={isLoading}
                    onClick={() => handleAction(activeCard.id, 'close')}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] rounded-lg uppercase tracking-wider"
                  >
                    ⏹️ Cerrar Votación
                  </button>
                  <button
                    disabled={isLoading}
                    onClick={() => handleAction(activeCard.id, 'reject')}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-black text-[10px] rounded-lg uppercase tracking-wider"
                  >
                    🚫 Anular
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-800 flex-shrink-0">
                  {activeCard.photoUrl ? (
                    <img src={`${API_URL}${activeCard.photoUrl}`} alt={activeCard.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl">👤</div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    {activeCard.name} {activeCard.age ? `(${activeCard.age})` : ''} {activeCard.tableNumber ? `• Mesa ${activeCard.tableNumber}` : ''}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    😍 {activeCard.counts.interested} · 🤝 {activeCard.counts.introduce} · ✋ {activeCard.counts.pass}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* FICHAS PENDIENTES DE APROBACIÓN */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-black uppercase text-amber-400 tracking-wider">
              📥 Pendientes de Aprobación ({pendingCards.length})
            </span>
            {pendingCards.length === 0 ? (
              <p className="text-xs text-slate-500">No hay fichas esperando moderación.</p>
            ) : (
              pendingCards.map((card) => (
                <div key={card.id} className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-800 border-2 border-slate-600 flex-shrink-0">
                    {card.photoUrl ? (
                      <img src={`${API_URL}${card.photoUrl}`} alt={card.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">
                      {card.name} {card.age ? `(${card.age})` : ''} {card.tableNumber ? `• Mesa ${card.tableNumber}` : ''}
                    </p>
                    {card.position && <p className="text-[11px] text-pink-400 font-bold uppercase">{card.position}</p>}
                    {card.objective && <p className="text-[11px] text-slate-400 italic mt-0.5">"{card.objective}"</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button
                      disabled={isLoading}
                      onClick={() => handleAction(card.id, 'approve')}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] rounded-lg uppercase tracking-wider"
                    >
                      ✅ Aprobar y Publicar
                    </button>
                    <button
                      disabled={isLoading}
                      onClick={() => handleAction(card.id, 'reject')}
                      className="px-4 py-2 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60 font-bold text-[10px] rounded-lg uppercase tracking-wider"
                    >
                      🚫 Rechazar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* HISTORIAL DE LA NOCHE */}
          {cardsHistory.length > 0 && (
            <div className="flex flex-col gap-2 pt-3 border-t border-slate-700">
              <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
                📋 Fichas Cerradas ({cardsHistory.length})
              </span>
              {cardsHistory.map((card: any) => (
                <div key={card.id} className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/60 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-800 flex-shrink-0">
                    {card.photoUrl ? (
                      <img src={`${API_URL}${card.photoUrl}`} alt={card.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">👤</div>
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-300 flex-1">{card.name}</p>
                  <span className="text-[10px] font-mono text-slate-400">
                    😍 {card.counts.interested} · 🤝 {card.counts.introduce} · ✋ {card.counts.pass}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
