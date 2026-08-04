'use client';

import { useState } from 'react';
import { useSessionStore } from '@/store/useSessionStore';
import { API_URL } from '@/config/api';
import { CardForm } from './CardForm';

const VOTE_OPTIONS = [
  { choice: 'INTERESTED', emoji: '😍', label: 'ME INTERESA', activeClass: 'bg-emerald-500 text-slate-950 border-emerald-300' },
  { choice: 'INTRODUCE', emoji: '🤝', label: 'PRESÉNTAME', activeClass: 'bg-amber-400 text-slate-950 border-amber-300' },
  { choice: 'PASS', emoji: '✋', label: 'PASO', activeClass: 'bg-red-500 text-white border-red-400' },
] as const;

interface CardModeProps {
  sessionId: string;
  playerId: string | null;
  tableNumber?: string;
}

export function CardMode({ sessionId, playerId, tableNumber }: CardModeProps) {
  const activeCards = useSessionStore((s) => s.snapshot?.activeCards) || [];
  const cardsHistory = useSessionStore((s) => s.snapshot?.cardsHistory) || [];
  const myCardVotes = useSessionStore((s) => s.snapshot?.myCardVotes) || {};

  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [formSent, setFormSent] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [localVotes, setLocalVotes] = useState<Record<string, string>>({});

  const activeCard = activeCards[selectedCardIndex] || null;
  const effectiveVote = activeCard ? localVotes[activeCard.id] || myCardVotes[activeCard.id] : null;

  const handleVote = async (choice: 'INTERESTED' | 'INTRODUCE' | 'PASS') => {
    if (!activeCard || !playerId || isVoting) return;

    try {
      setIsVoting(true);
      setVoteError(null);

      const res = await fetch(`${API_URL}/cards/${activeCard.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, choice }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setVoteError(data?.message || 'No se pudo registrar tu voto.');
        return;
      }

      setLocalVotes((prev) => ({ ...prev, [activeCard.id]: choice }));
    } catch (err) {
      console.error('Error votando ficha:', err);
      setVoteError('Error de conexión. Intentá de nuevo.');
    } finally {
      setIsVoting(false);
    }
  };

  if (showForm) {
    return (
      <CardForm
        sessionId={sessionId}
        playerId={playerId}
        defaultTable={tableNumber}
        onSubmitted={() => {
          setShowForm(false);
          setFormSent(true);
        }}
        onCancel={() => setShowForm(false)}
      />
    );
  }

  const pct = (n: number) =>
    activeCard && activeCard.totalVotes > 0 ? Math.round((n / activeCard.totalVotes) * 100) : 0;

  return (
    <div className="w-full flex flex-col gap-3">
      {formSent && (
        <div className="w-full p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl text-center">
          <p className="text-xs font-bold text-emerald-400">
            ¡Ficha enviada! Aparecerá en pantalla cuando el bar la apruebe ✅
          </p>
        </div>
      )}

      {/* TABS DE FICHAS ACTIVAS */}
      {activeCards.length > 1 && (
        <div className="w-full flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {activeCards.map((card, idx) => (
            <button
              key={card.id}
              onClick={() => setSelectedCardIndex(idx)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                idx === selectedCardIndex
                  ? 'bg-pink-500 text-white border-2 border-pink-400'
                  : 'bg-slate-800 text-slate-400 border-2 border-slate-700 hover:border-slate-600'
              }`}
            >
              Ficha {idx + 1}
            </button>
          ))}
        </div>
      )}

      {/* FICHA ACTIVA EN VOTACIÓN */}
      {activeCard ? (
        <div className="w-full bg-slate-900 rounded-2xl shadow-2xl border border-pink-500/40 overflow-hidden">
          {/* Foto + datos principales */}
          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-pink-500/10 to-transparent">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-amber-400 shadow-lg bg-slate-800 flex-shrink-0">
              {activeCard.photoUrl ? (
                <img src={`${API_URL}${activeCard.photoUrl}`} alt={activeCard.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">👤</div>
              )}
            </div>
            <div className="flex-1">
              {activeCard.tableNumber && (
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  MESA {activeCard.tableNumber}
                </span>
              )}
              <h2 className="text-xl font-black text-white uppercase leading-tight">{activeCard.name}</h2>
              {activeCard.age && <p className="text-xs font-bold text-amber-400">{activeCard.age} AÑOS</p>}
              {activeCard.position && (
                <p className="text-[11px] font-black text-pink-400 uppercase tracking-wider mt-0.5">
                  ⚽ {activeCard.position}
                </p>
              )}
            </div>
          </div>

          {/* Skills */}
          {Array.isArray(activeCard.skills) && activeCard.skills.length > 0 && (
            <div className="px-4 py-2 flex flex-col gap-1">
              {activeCard.skills.map((skill: any) => (
                <div key={skill.key} className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <span>{skill.icon}</span> {skill.label}
                  </span>
                  <span className="text-amber-400 tracking-tighter">
                    {'★'.repeat(skill.stars)}
                    <span className="text-slate-700">{'★'.repeat(5 - skill.stars)}</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Objetivo */}
          {activeCard.objective && (
            <div className="mx-4 my-2 p-2.5 bg-slate-950/60 border border-amber-500/20 rounded-xl">
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-400">🏆 Objetivo de la temporada</p>
              <p className="text-xs font-medium text-white mt-0.5">{activeCard.objective}</p>
            </div>
          )}

          {/* Botones de voto */}
          <div className="p-4 flex flex-col gap-2.5">
            {voteError && (
              <p className="text-xs font-bold text-red-400 text-center bg-red-500/10 border border-red-500/30 rounded-xl py-2 px-3">
                {voteError}
              </p>
            )}
            <div className="grid grid-cols-3 gap-2">
              {VOTE_OPTIONS.map((opt) => {
                const isMyVote = effectiveVote === opt.choice;
                return (
                  <button
                    key={opt.choice}
                    disabled={isVoting || !playerId}
                    onClick={() => handleVote(opt.choice)}
                    className={`py-3 px-1 rounded-xl border-2 font-black transition-all flex flex-col items-center gap-1 active:scale-95 ${
                      isMyVote
                        ? opt.activeClass
                        : 'bg-slate-800 text-white border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className="text-[9px] uppercase tracking-wider">{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Porcentajes en vivo */}
            <div className="flex flex-col gap-1.5 mt-1">
              {VOTE_OPTIONS.map((opt) => {
                const count =
                  opt.choice === 'INTERESTED'
                    ? activeCard.counts.interested
                    : opt.choice === 'INTRODUCE'
                      ? activeCard.counts.introduce
                      : activeCard.counts.pass;
                const percentage = pct(count);
                return (
                  <div key={opt.choice} className="flex items-center gap-2">
                    <span className="text-sm w-6">{opt.emoji}</span>
                    <div className="flex-1 bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          opt.choice === 'INTERESTED'
                            ? 'bg-emerald-500'
                            : opt.choice === 'INTRODUCE'
                              ? 'bg-amber-400'
                              : 'bg-red-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 w-9 text-right">{percentage}%</span>
                  </div>
                );
              })}
            </div>

            <p className="text-center text-[10px] text-slate-500 font-mono">
              {activeCard.totalVotes} votos {effectiveVote ? '· ya votaste (podés cambiar)' : ''}
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center p-5 bg-slate-900/40 border border-pink-500/20 rounded-2xl w-full">
          <p className="text-sm font-black text-pink-400 uppercase tracking-wider">💘 Miércoles de Fichaje</p>
          <p className="text-xs text-slate-300 mt-1.5">Esperando la próxima ficha aprobada...</p>
          <p className="text-[11px] text-slate-500 mt-1">¡Cargá la ficha de tu amigo/a y que la mesa decida!</p>
        </div>
      )}

      {/* Botón cargar ficha */}
      <button
        onClick={() => setShowForm(true)}
        className="w-full py-3.5 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/50 text-pink-300 font-black rounded-xl uppercase tracking-wider text-xs transition-all"
      >
        📇 Cargar la Ficha de un Amigo/a
      </button>

      {/* Historial de fichas cerradas */}
      {cardsHistory.length > 0 && (
        <section className="w-full mt-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
            📋 Fichas de la noche ({cardsHistory.length})
          </h3>
          <div className="flex flex-col gap-2">
            {cardsHistory.map((card: any) => {
              const total = card.totalVotes || 0;
              const winnerPct = total > 0 ? Math.round((card.counts.interested / total) * 100) : 0;
              return (
                <div key={card.id} className="p-3 rounded-xl border bg-slate-900/60 border-slate-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 flex-shrink-0">
                    {card.photoUrl ? (
                      <img src={`${API_URL}${card.photoUrl}`} alt={card.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg">👤</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-white">{card.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{total} votos</p>
                  </div>
                  <span className="text-[11px] font-black text-emerald-400">😍 {winnerPct}%</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
