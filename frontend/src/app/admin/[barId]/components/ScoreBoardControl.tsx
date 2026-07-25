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

  const handleStartMatch = async (e: React.FormEvent) => {
    e.preventDefault();
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
        }),
      });

      if (!res.ok) {
        alert('Error al iniciar el partido.');
      }
    } catch (e) {
      console.error('Error iniciando partido:', e);
    } finally {
      setIsStartingMatch(false);
    }
  };

  const handleScoreUpdate = async (side: 'home' | 'away' | 'none', delta: number) => {
    if (!match) return;
    const newHome = side === 'home' ? Math.max(0, match.scoreHome + delta) : match.scoreHome;
    const newAway = side === 'away' ? Math.max(0, match.scoreAway + delta) : match.scoreAway;

    try {
      setIsUpdatingScore(true);
      await fetch(`${API_URL}/match/score`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match.id,
          scoreHome: newHome,
          scoreAway: newAway,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          currentMinute: match.currentMinute,
        }),
      });
      // El store se actualiza cuando la emisión WS (MATCH_SCORE_UPDATED) retorna al cliente
    } catch (e) {
      console.error('Error actualizando marcador:', e);
    } finally {
      setIsUpdatingScore(false);
    }
  };

  if (!match) {
    return (
      <section className="bg-slate-800 p-6 rounded-2xl border border-amber-500/30 shadow-xl">
        <h2 className="text-xl font-black text-amber-500 tracking-wider mb-1">⚽ Partido del Día / Definir Equipos</h2>
        <p className="text-xs text-slate-400 mb-6">Ingresá los nombres de los equipos para habilitar el marcador y el transmisor en vivo.</p>

        <form onSubmit={handleStartMatch} className="grid md:grid-cols-3 gap-6 items-end">
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

          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={isStartingMatch || !newHomeTeam.trim() || !newAwayTeam.trim()}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl uppercase tracking-wider text-sm transition-all shadow-lg"
            >
              {isStartingMatch ? 'CREANDO PARTIDO...' : '🚀 Iniciar Marcador en Vivo del Partido'}
            </button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className="bg-slate-800 p-6 rounded-2xl border border-amber-500/30 shadow-xl">
      <h2 className="text-xl font-black text-amber-500 tracking-wider mb-1">⚽ Control de Marcador en Vivo</h2>
      <p className="text-xs text-slate-400 mb-6">Los cambios en nombres de equipos y goles se transmiten instantáneamente a todas las pantallas y celulares.</p>

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
          <span className="text-[10px] font-mono text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full animate-pulse">
            {match.status}
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
        <p className="text-center text-xs text-amber-400 animate-pulse mt-4">Transmitiendo marcador a todas las pantallas...</p>
      )}
    </section>
  );
}
