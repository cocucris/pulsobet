'use client';

import { useState, useEffect } from 'react';
import { useSessionStore } from '@/store/useSessionStore';
import { API_URL } from '@/config/api';

const VOTE_PANEL = [
  { key: 'interested', emoji: '😍', label: 'ME INTERESA', barClass: 'bg-emerald-500', textClass: 'text-emerald-400', borderClass: 'border-emerald-500/40', bgClass: 'bg-emerald-500/10' },
  { key: 'introduce', emoji: '🤝', label: 'PRESÉNTAME', barClass: 'bg-amber-400', textClass: 'text-amber-400', borderClass: 'border-amber-400/40', bgClass: 'bg-amber-400/10' },
  { key: 'pass', emoji: '✋', label: 'PASO', barClass: 'bg-red-500', textClass: 'text-red-400', borderClass: 'border-red-500/40', bgClass: 'bg-red-500/10' },
] as const;

export function CardDisplay() {
  const activeCards = useSessionStore((s) => s.snapshot?.activeCards) || [];
  const cardsHistory = useSessionStore((s) => s.snapshot?.cardsHistory) || [];

  const [currentIndex, setCurrentIndex] = useState(0);

  // Rotación automática cada 20 segundos
  useEffect(() => {
    if (activeCards.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeCards.length);
    }, 20000);
    return () => clearInterval(interval);
  }, [activeCards.length]);

  // Resetear índice si cambia el número de fichas
  useEffect(() => {
    if (currentIndex >= activeCards.length) {
      setCurrentIndex(0);
    }
  }, [activeCards.length, currentIndex]);

  const activeCard = activeCards[currentIndex] || null;

  const pct = (n: number) =>
    activeCard && activeCard.totalVotes > 0 ? Math.round((n / activeCard.totalVotes) * 100) : 0;

  return (
    <section className="w-2/3 flex flex-col bg-gradient-to-b from-slate-900/60 to-slate-950/60 border border-pink-500/30 rounded-3xl p-6 relative overflow-hidden">
      {/* Cabecera estilo cromo */}
      <div className="flex justify-between items-center bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 px-5 py-2.5 rounded-2xl shadow-lg mb-5">
        <div className="flex items-center gap-2 font-black text-base uppercase tracking-wider">
          <span>⚽ FICHA TÉCNICA</span>
          <span className="h-2.5 w-2.5 rounded-full bg-slate-950 animate-ping" />
          <span className="text-xs bg-slate-950 text-pink-400 px-2 py-0.5 rounded-full font-mono font-bold">💘 MODO FICHAJE</span>
        </div>
        <div className="flex items-center gap-2">
          {activeCards.length > 1 && (
            <span className="text-xs font-mono font-black uppercase bg-slate-950 text-amber-400 px-3 py-1 rounded-full border border-amber-400/30">
              FICHA {currentIndex + 1} DE {activeCards.length}
            </span>
          )}
          <span className="text-xs font-mono font-black uppercase bg-slate-950 text-amber-400 px-3 py-1 rounded-full border border-amber-400/30">
            MIÉRCOLES DE FICHAJE
          </span>
        </div>
      </div>

      {activeCard ? (
        <div className="flex-1 flex gap-6">
          {/* Columna central: foto + datos del jugador */}
          <div className="flex-1 flex flex-col items-center gap-4">
            {/* Foto con aro dorado + badge de mesa */}
            <div className="relative">
              {activeCard.tableNumber && (
                <div className="absolute -top-2 -left-2 z-10 bg-amber-500 text-slate-950 font-black text-sm px-3 py-1.5 rounded-xl shadow-lg border-2 border-amber-300 uppercase">
                  MESA {activeCard.tableNumber}
                </div>
              )}
              <div className="w-64 h-64 rounded-full overflow-hidden border-8 border-amber-400 shadow-[0_0_50px_rgba(251,191,36,0.4)] bg-slate-800">
                {activeCard.photoUrl ? (
                  <img src={`${API_URL}${activeCard.photoUrl}`} alt={activeCard.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-7xl">👤</div>
                )}
              </div>
            </div>

            {/* Nombre + datos */}
            <div className="text-center">
              <h2 className="text-4xl font-black text-white uppercase tracking-wide leading-none">{activeCard.name}</h2>
              {activeCard.age && <p className="text-lg font-black text-amber-400 mt-1">{activeCard.age} AÑOS</p>}
            </div>

            {/* Ficha técnica */}
            <div className="w-full flex flex-col gap-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              {activeCard.position && (
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">⚽ Posición</span>
                  <span className="text-sm font-black text-amber-400 uppercase">{activeCard.position}</span>
                </div>
              )}
              {activeCard.strongFoot && (
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">👟 Pierna Hábil</span>
                  <span className="text-sm font-black text-white uppercase">{activeCard.strongFoot}</span>
                </div>
              )}
              {activeCard.fitness && (
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">💪 Estado Físico</span>
                  <span className="text-sm font-black text-emerald-400">{activeCard.fitness}/10</span>
                </div>
              )}

              {Array.isArray(activeCard.skills) && activeCard.skills.map((skill: any) => (
                <div key={skill.key} className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <span>{skill.icon}</span> {skill.label}
                  </span>
                  <span className="text-amber-400 text-sm tracking-tighter">
                    {'★'.repeat(skill.stars)}
                    <span className="text-slate-700">{'★'.repeat(5 - skill.stars)}</span>
                  </span>
                </div>
              ))}
            </div>

            {/* Objetivo */}
            {activeCard.objective && (
              <div className="w-full bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">🏆 Objetivo de la temporada</p>
                <p className="text-sm font-bold text-white mt-1">{activeCard.objective}</p>
              </div>
            )}
          </div>

          {/* Columna derecha: votación en vivo */}
          <div className="w-72 flex flex-col gap-3">
            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-widest text-slate-300">¿QUÉ OPINA LA MESA?</p>
              <p className="text-[11px] font-mono text-slate-500 mt-0.5">👥 {activeCard.totalVotes} VOTOS</p>
            </div>

            {VOTE_PANEL.map((opt) => {
              const count = activeCard.counts[opt.key];
              const percentage = pct(count);
              return (
                <div key={opt.key} className={`${opt.bgClass} border ${opt.borderClass} rounded-2xl p-4 flex flex-col gap-2`}>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{opt.emoji}</span>
                    <div className="text-right">
                      <p className={`text-[10px] font-black uppercase tracking-widest ${opt.textClass}`}>{opt.label}</p>
                      <p className={`text-3xl font-black font-mono ${opt.textClass}`}>{percentage}%</p>
                    </div>
                  </div>
                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div className={`${opt.barClass} h-full rounded-full transition-all duration-700`} style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}

            <div className="mt-auto flex items-center justify-center gap-2 bg-slate-900/80 border border-amber-500/30 rounded-xl py-2.5">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-400">VOTACIÓN ABIERTA</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center border-2 border-dashed border-pink-500/30 rounded-2xl">
          <p className="text-2xl font-black text-pink-400 uppercase tracking-wider">💘 Miércoles de Fichaje</p>
          <p className="text-sm text-slate-300 mt-2">Esperando la primera ficha aprobada...</p>
          <p className="text-xs text-slate-500 mt-1">Escaneá el QR y cargá la ficha técnica de tu amigo/a 📇</p>
        </div>
      )}

      {/* Historial de fichas cerradas */}
      {cardsHistory.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-800">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
            📋 Fichas de la noche ({cardsHistory.length})
          </p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {cardsHistory.map((card: any) => {
              const total = card.totalVotes || 0;
              const winnerPct = total > 0 ? Math.round((card.counts.interested / total) * 100) : 0;
              return (
                <div key={card.id} className="min-w-[180px] bg-slate-900/70 border border-slate-800 rounded-xl p-2.5 flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-800 flex-shrink-0">
                    {card.photoUrl ? (
                      <img src={`${API_URL}${card.photoUrl}`} alt={card.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">👤</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-white truncate">{card.name}</p>
                    <p className="text-[10px] font-mono text-emerald-400 font-black">😍 {winnerPct}% · {total} votos</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
