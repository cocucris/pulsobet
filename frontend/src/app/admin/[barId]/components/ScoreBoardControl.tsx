'use client';

import { useState } from 'react';
import { useSessionStore } from '@/store/useSessionStore';
import { API_URL } from '@/config/api';

export function ScoreBoardControl({ sessionId }: { sessionId: string }) {
  const match = useSessionStore((s) => s.snapshot?.match);
  const [isUpdatingScore, setIsUpdatingScore] = useState(false);

  // Estados para creación de partido nuevo
  const [newHomeTeam, setNewHomeTeam] = useState('Olimpia');
  const [newAwayTeam, setNewAwayTeam] = useState('Cerro Porteño');
  const [isStartingMatch, setIsStartingMatch] = useState(false);

  const handleStartMatch = async (status: 'SCHEDULED' | 'LIVE') => {
    if (!newHomeTeam.trim() || !newAwayTeam.trim()) return;

    try {
      setIsStartingMatch(true);
      const res = await fetch(`${API_URL}/session/start-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          homeTeam: newHomeTeam,
          awayTeam: newAwayTeam,
          status,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(`Error al publicar el partido: ${data?.message || `HTTP ${res.status}`}`);
        return;
      }

      // Actualización optimista: no depender solo del evento socket MATCH_STARTED
      if (data) {
        const { sessionId: _ignored, ...matchData } = data;
        void _ignored;
        useSessionStore.getState().applyEvent('MATCH_STARTED', matchData);
      }
    } catch (e) {
      console.error('Error iniciando partido:', e);
      alert('Error de red al publicar el partido. Verificá la conexión con el servidor.');
    } finally {
      setIsStartingMatch(false);
    }
  };

  const handleScoreUpdate = async (side: 'home' | 'away' | 'none', delta: number, newStatus?: 'SCHEDULED' | 'LIVE' | 'FINISHED') => {
    if (!match) return;
    const newHome = side === 'home' ? Math.max(0, match.scoreHome + delta) : match.scoreHome;
    const newAway = side === 'away' ? Math.max(0, match.scoreAway + delta) : match.scoreAway;
    const statusToSend = newStatus || match.status;

    try {
      setIsUpdatingScore(true);
      const res = await fetch(`${API_URL}/match/score`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match.id,
          scoreHome: newHome,
          scoreAway: newAway,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          currentMinute: match.currentMinute,
          status: statusToSend,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(`Error al actualizar el marcador: ${data?.message || `HTTP ${res.status}`}`);
        return;
      }

      // Actualización optimista: reflejar el cambio aunque el evento socket no llegue
      if (data) {
        useSessionStore.getState().applyEvent('MATCH_SCORE_UPDATED', data);
      }
    } catch (e) {
      console.error('Error actualizando marcador:', e);
      alert('Error de red al actualizar el marcador. Verificá la conexión con el servidor.');
    } finally {
      setIsUpdatingScore(false);
    }
  };

  const handleResetMatch = async () => {
    try {
      setIsUpdatingScore(true);
      const res = await fetch(`${API_URL}/session/reset-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(`Error al limpiar las pantallas: ${data?.message || `HTTP ${res.status}`}`);
        return;
      }

      // Actualización optimista: limpiar el marcador local sin esperar el socket
      useSessionStore.getState().applyEvent('MATCH_FINISHED', null);
    } catch (e) {
      console.error('Error reseteando partido:', e);
      alert('Error de red al limpiar las pantallas. Verificá la conexión con el servidor.');
    } finally {
      setIsUpdatingScore(false);
    }
  };

  // CASO A: No hay partido registrado aún
  if (!match) {
    return (
      <section className="bg-slate-800 p-6 rounded-2xl border border-amber-500/30 shadow-xl">
        <h2 className="text-xl font-black text-amber-500 tracking-wider mb-1">⚽ Partido del Día / Publicar Versus</h2>
        <p className="text-xs text-slate-400 mb-6">
          Ingresá los equipos para publicar el Versus en las pantallas y celulares (sin marcador todavía), e iniciar las trivias pre-partido.
        </p>

        <form onSubmit={(e) => { e.preventDefault(); handleStartMatch('SCHEDULED'); }} className="grid md:grid-cols-3 gap-6 items-end">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider opacity-60 mb-1">Equipo Local</label>
            <input
              type="text"
              value={newHomeTeam}
              onChange={(e) => setNewHomeTeam(e.target.value)}
              placeholder="Ej: Olimpia"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 text-sm font-bold text-white text-center"
            />
          </div>

          <div className="text-center font-mono font-black text-slate-400 text-2xl pb-3">VS</div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider opacity-60 mb-1">Equipo Visitante</label>
            <input
              type="text"
              value={newAwayTeam}
              onChange={(e) => setNewAwayTeam(e.target.value)}
              placeholder="Ej: Cerro Porteño"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 text-sm font-bold text-white text-center"
            />
          </div>

          <div className="md:col-span-3 flex flex-col md:flex-row gap-3 mt-2">
            <button
              type="button"
              onClick={() => handleStartMatch('SCHEDULED')}
              disabled={isStartingMatch || !newHomeTeam.trim() || !newAwayTeam.trim()}
              className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl uppercase tracking-wider text-xs md:text-sm transition-all shadow-lg"
            >
              {isStartingMatch ? 'PUBLICANDO...' : '📢 Publicar Versus (Pre-Partido)'}
            </button>
            <button
              type="button"
              onClick={() => handleStartMatch('LIVE')}
              disabled={isStartingMatch || !newHomeTeam.trim() || !newAwayTeam.trim()}
              className="py-3.5 px-6 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl uppercase tracking-wider text-xs md:text-sm transition-all"
            >
              ⚽ Iniciar Partido EN VIVO Directamente
            </button>
          </div>
        </form>
      </section>
    );
  }

  const isLive = match.status === 'LIVE';
  const isScheduled = match.status === 'SCHEDULED' || match.status === 'PAUSED';

  return (
    <section className="bg-slate-800 p-6 rounded-2xl border border-amber-500/30 shadow-xl">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-black text-amber-500 tracking-wider mb-1">
            ⚽ {isLive ? 'Control de Marcador en Vivo' : 'Partido del Día (Pre-Partido / Anunciado)'}
          </h2>
          <p className="text-xs text-slate-400">
            {isLive
              ? 'Los goles y cambios se transmiten instantáneamente a todas las pantallas y celulares.'
              : 'El Versus ya figura en las pantallas. Hacé clic en "Iniciar Partido EN VIVO" cuando empiece el juego.'}
          </p>
        </div>

        {/* Botón para alternar Estado del Partido */}
        <div className="flex gap-2 items-center">
          {match.status === 'LIVE' ? (
            <button
              onClick={() => handleScoreUpdate('none', 0, 'FINISHED')}
              disabled={isUpdatingScore}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-xl uppercase tracking-wider shadow-lg"
            >
              🏁 Finalizar Partido
            </button>
          ) : match.status === 'FINISHED' ? (
            <button
              onClick={() => handleScoreUpdate('none', 0, 'LIVE')}
              disabled={isUpdatingScore}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl uppercase tracking-wider shadow-lg"
            >
              ▶️ Reabrir Partido EN VIVO
            </button>
          ) : (
            <button
              onClick={() => handleScoreUpdate('none', 0, 'LIVE')}
              disabled={isUpdatingScore}
              className="px-4 py-2 bg-green-500 hover:bg-green-400 text-slate-950 font-black text-xs rounded-xl uppercase tracking-wider shadow-lg animate-pulse"
            >
              ▶️ Iniciar Partido EN VIVO
            </button>
          )}

          <button
            onClick={handleResetMatch}
            disabled={isUpdatingScore}
            className="px-3 py-2 bg-red-950/60 hover:bg-red-900 text-red-300 font-bold text-xs rounded-xl uppercase tracking-wider border border-red-800/60 transition-all"
            title="Borra el partido actual y resetea las pantallas a cero"
          >
            🧹 Limpiar Pantallas
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 items-center">
        {/* Equipo Local */}
        <div className="flex flex-col items-center gap-3">
          <input
            type="text"
            value={match.homeTeam}
            onChange={(e) => {
              useSessionStore.getState().applyEvent('MATCH_SCORE_UPDATED', { ...match, homeTeam: e.target.value });
            }}
            onBlur={() => handleScoreUpdate('none', 0)}
            placeholder="Equipo local"
            className="text-center text-sm font-black uppercase tracking-wider text-white bg-slate-900 border border-slate-700 focus:border-amber-500 focus:outline-none w-full py-2 px-3 rounded-xl"
          />
          <span className="text-6xl font-black font-mono text-amber-400">{match.scoreHome}</span>
          <div className="flex gap-2">
            <button
              onClick={() => handleScoreUpdate('home', -1)}
              disabled={isUpdatingScore || match.scoreHome === 0}
              className="w-12 h-12 rounded-xl bg-slate-700 hover:bg-red-500/30 text-red-400 font-black text-xl border border-slate-600 hover:border-red-500/50 transition-all disabled:opacity-40"
            >
              −
            </button>
            <button
              onClick={() => handleScoreUpdate('home', +1)}
              disabled={isUpdatingScore}
              className="w-12 h-12 rounded-xl bg-slate-700 hover:bg-green-500/30 text-green-400 font-black text-xl border border-slate-600 hover:border-green-500/50 transition-all disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>

        {/* Centro: VS y Estado */}
        <div className="flex flex-col items-center gap-3">
          <span className="text-5xl font-black font-mono text-slate-300">VS</span>
          <span
            className={`text-[10px] font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
              match.status === 'LIVE'
                ? 'text-green-400 bg-green-500/10 border border-green-500/20 animate-pulse'
                : match.status === 'FINISHED'
                ? 'text-slate-400 bg-slate-900 border border-slate-700'
                : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
            }`}
          >
            {match.status === 'LIVE' ? 'EN VIVO' : match.status === 'FINISHED' ? 'FINALIZADO' : 'PRE-PARTIDO'}
          </span>
        </div>

        {/* Equipo Visitante */}
        <div className="flex flex-col items-center gap-3">
          <input
            type="text"
            value={match.awayTeam}
            onChange={(e) => {
              useSessionStore.getState().applyEvent('MATCH_SCORE_UPDATED', { ...match, awayTeam: e.target.value });
            }}
            onBlur={() => handleScoreUpdate('none', 0)}
            placeholder="Equipo visitante"
            className="text-center text-sm font-black uppercase tracking-wider text-white bg-slate-900 border border-slate-700 focus:border-amber-500 focus:outline-none w-full py-2 px-3 rounded-xl"
          />
          <span className="text-6xl font-black font-mono text-amber-400">{match.scoreAway}</span>
          <div className="flex gap-2">
            <button
              onClick={() => handleScoreUpdate('away', -1)}
              disabled={isUpdatingScore || match.scoreAway === 0}
              className="w-12 h-12 rounded-xl bg-slate-700 hover:bg-red-500/30 text-red-400 font-black text-xl border border-slate-600 hover:border-red-500/50 transition-all disabled:opacity-40"
            >
              −
            </button>
            <button
              onClick={() => handleScoreUpdate('away', +1)}
              disabled={isUpdatingScore}
              className="w-12 h-12 rounded-xl bg-slate-700 hover:bg-green-500/30 text-green-400 font-black text-xl border border-slate-600 hover:border-green-500/50 transition-all disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {isUpdatingScore && (
        <p className="text-center text-xs text-amber-400 animate-pulse mt-4">Transmitiendo a todas las pantallas...</p>
      )}
    </section>
  );
}
