'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useSessionStore } from '@/store/useSessionStore';
import { useParams } from 'next/navigation';
import { API_URL } from '@/config/api';

export default function PlayPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [nickname, setNickname] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAnswered, setHasAnswered] = useState(false);

  // Estados de Premios y Canjes
  const [totalPoints, setTotalPoints] = useState(0);
  const [rewards, setRewards] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimFeedback, setClaimFeedback] = useState<{ success: boolean; message: string; code?: string } | null>(null);

  // Carga inicial desde localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem(`pulsobet_player_token:${sessionId}`);
      const savedName = localStorage.getItem(`pulsobet_nickname:${sessionId}`);
      const savedId = localStorage.getItem(`pulsobet_player_id:${sessionId}`);
      if (savedToken && savedName) {
        setToken(savedToken);
        setNickname(savedName);
        if (savedId) setPlayerId(savedId);
      }
      setLoading(false);
    }
  }, [sessionId]);

  // Función para actualizar perfil y puntos del jugador (por ID o por Apodo)
  const refreshPlayerData = useCallback(async (pId?: string | null, name?: string | null) => {
    try {
      let url = pId ? `${API_URL}/bar/player/${pId}` : null;
      if (!url && name) {
        url = `${API_URL}/bar/player/by-nickname/${sessionId}/${encodeURIComponent(name)}`;
      }
      if (!url) return;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTotalPoints(data.totalPoints || 0);
        setClaims(data.claims || []);
        if (data.id && !playerId) {
          setPlayerId(data.id);
          if (typeof window !== 'undefined') {
            localStorage.setItem(`pulsobet_player_id:${sessionId}`, data.id);
          }
        }
      } else if (res.status === 404 || res.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(`pulsobet_player_token:${sessionId}`);
          localStorage.removeItem(`pulsobet_player_id:${sessionId}`);
          localStorage.removeItem(`pulsobet_nickname:${sessionId}`);
        }
        setToken(null);
        setPlayerId(null);
      }
    } catch (err) {
      console.error('Error al actualizar datos del jugador:', err);
    }
  }, [sessionId, playerId]);

  // Función para cargar catálogo de premios
  const fetchRewards = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/bar/rewards/list/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setRewards(data);
      }
    } catch (err) {
      console.error('Error al cargar catálogo de premios:', err);
    }
  }, [sessionId]);

  useEffect(() => {
    if (token) {
      fetchRewards();
      refreshPlayerData(playerId, nickname);
    }
  }, [token, playerId, nickname, fetchRewards, refreshPlayerData]);

  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<string[]>([]);
  const [selectedTriviaIndex, setSelectedTriviaIndex] = useState(0);
  const [voteError, setVoteError] = useState<string | null>(null);

  // Hook WebSockets
  const { sendPrediction } = useSocket(sessionId, false, false);

  const snapshot = useSessionStore((s) => s.snapshot);
  const isConnected = useSessionStore((s) => s.isConnected);

  const currentTrivia = snapshot?.currentTrivia || null;
  const allActiveQuestions = currentTrivia ? [currentTrivia] : [];
  const isCurrentTriviaAnswered = currentTrivia 
    ? answeredQuestionIds.includes(currentTrivia.id) || !!snapshot?.myPlayer?.hasVotedCurrentTrivia 
    : false;

  const matchData = snapshot?.match;
  const leaderboard = snapshot?.leaderboardTop10 || [];

  // Escuchar transmisiones del Leaderboard por WebSockets en tiempo real
  useEffect(() => {
    if (leaderboard && leaderboard.length > 0) {
      const myRank = leaderboard.find(
        (item: any) =>
          (playerId && item.id === playerId) ||
          (nickname && item.nickname?.toLowerCase() === nickname?.toLowerCase())
      );
      if (myRank) {
        setTotalPoints(myRank.totalPoints);
      }
    }
  }, [leaderboard, playerId, nickname]);


  // Registro de apodo
  const handleOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/auth/player/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, nickname }),
      });

      if (!res.ok) throw new Error('Error al registrar jugador');

      const data = await res.json();
      
      localStorage.setItem(`pulsobet_player_token:${sessionId}`, data.player_token);
      localStorage.setItem(`pulsobet_nickname:${sessionId}`, data.player.nickname);
      localStorage.setItem(`pulsobet_player_id:${sessionId}`, data.player.id);
      
      setToken(data.player_token);
      setPlayerId(data.player.id);
      setTotalPoints(data.player.totalPoints || 0);
    } catch (error) {
      console.error('Error en onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  // Envío de predicción: solo se marca como respondida cuando el servidor confirma (ACK)
  const handleSelectOption = (questionId: string, optionId: number) => {
    setVoteError(null);

    sendPrediction(questionId, optionId, (result) => {
      if (result.ok) {
        setAnsweredQuestionIds((prev) => (prev.includes(questionId) ? prev : [...prev, questionId]));
        setTimeout(() => {
          if (playerId) refreshPlayerData(playerId);
        }, 1500);
      } else {
        setVoteError(result.reason || 'No se pudo registrar tu voto. Intentá de nuevo.');
      }
    });
  };

  // Reclamo de premio por puntos
  const handleClaimReward = async (rewardId: string) => {
    if (!playerId) return;

    try {
      setIsClaiming(true);
      setClaimFeedback(null);

      const res = await fetch(`${API_URL}/bar/rewards/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, rewardId }),
      });

      const data = await res.json();

      if (res.ok) {
        setClaimFeedback({
          success: true,
          message: `¡Canje exitoso! Presentá este código en la barra:`,
          code: data.claimCode,
        });
        refreshPlayerData(playerId);
        fetchRewards();
      } else {
        setClaimFeedback({
          success: false,
          message: data.message || 'No se pudo realizar el canje.',
        });
      }
    } catch (err) {
      console.error('Error al reclamar premio:', err);
      setClaimFeedback({ success: false, message: 'Error de conexión.' });
    } finally {
      setIsClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-sans">
        <p className="animate-pulse">Cargando la jugada...</p>
      </div>
    );
  }

  // 1. ESTADO ONBOARDING
  if (!token) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-950 text-white font-sans">
        <div className="w-full max-w-md p-6 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl">
          <header className="mb-6 text-center">
            <h1 className="text-3xl font-black text-amber-500 tracking-wider">PULSOBET</h1>
            <p className="text-sm opacity-75 mt-1">Pronósticos en vivo y premios en tu bar</p>
          </header>
          
          <form onSubmit={handleOnboarding} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide opacity-75 mb-2">
                ¿Cómo te vas a llamar esta noche?
              </label>
              <input
                type="text"
                maxLength={15}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Ej: ElMago10"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 text-white font-medium text-center text-lg"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl transition-all shadow-lg active:scale-98 uppercase tracking-wider"
            >
              Entrar a Jugar
            </button>
          </form>
        </div>
      </main>
    );
  }

  // 2. ESTADO DE JUEGO ACTIVO Y CANJES
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 bg-slate-950 text-white font-sans max-w-md mx-auto">
      {/* Header con Perfil, Puntos Acumulados y Estado */}
      <header className="w-full flex justify-between items-center py-3 border-b border-slate-800">
        <div>
          <h1 className="text-lg font-black tracking-wider text-amber-500">PULSOBET</h1>
          <p className="text-[11px] text-slate-400">Jugador: <span className="text-white font-bold">{nickname}</span></p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-xl text-right">
            <span className="text-[10px] text-amber-400 block font-bold uppercase tracking-wider">Mis Puntos</span>
            <span className="text-sm font-black text-amber-400 font-mono">{totalPoints} Pts</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2 py-1 rounded-full">
            <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          </div>
        </div>
      </header>

      {/* Tarjeta del Partido Transmitido en Vivo */}
      <section className="w-full my-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl text-center">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
            {matchData?.status === 'LIVE' ? 'EN VIVO' : 'PARTIDO DEL DÍA • PRE-PARTIDO'}
          </span>
          <span className="text-[10px] font-mono text-slate-400">Kilkenny Pub</span>
        </div>

        {matchData ? (
          <div className="flex items-center justify-between my-2 px-2">
            <div className="flex-1 text-right">
              <span className="text-base font-extrabold text-white block">{matchData.homeTeam}</span>
            </div>
            {matchData.status === 'LIVE' ? (
              <div className="px-4 py-1.5 mx-3 bg-slate-800 rounded-xl border border-slate-700 font-mono font-black text-xl text-amber-400 tracking-wider">
                {matchData.scoreHome} - {matchData.scoreAway}
              </div>
            ) : (
              <div className="px-4 py-1.5 mx-3 bg-slate-800 rounded-xl border border-slate-700 font-mono font-black text-base text-slate-300 tracking-wider">
                VS
              </div>
            )}
            <div className="flex-1 text-left">
              <span className="text-base font-extrabold text-slate-300 block">{matchData.awayTeam}</span>
            </div>
          </div>
        ) : (
          <div className="py-3 text-xs text-slate-500 font-bold">
            Partido por comenzar...
          </div>
        )}
      </section>

      {/* Contenido Dinámico: Trivias Activas (Múltiples) o Estado de Espera */}
      <div className="w-full my-2 flex flex-col items-center justify-center">
        {allActiveQuestions.length > 0 && currentTrivia ? (
          <div className="w-full p-5 bg-slate-900 rounded-2xl shadow-2xl border border-amber-500/40 animate-fade-in">
            {/* Selector de Pestañas si hay más de 1 trivia activa */}
            {allActiveQuestions.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
                {allActiveQuestions.map((q: any, idx: number) => {
                  const isAns = answeredQuestionIds.includes(q.id);
                  return (
                    <button
                      key={q.id || idx}
                      onClick={() => setSelectedTriviaIndex(idx)}
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                        idx === selectedTriviaIndex
                          ? 'bg-amber-500 text-slate-950 shadow-md'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      Trivia #{idx + 1} {isAns ? '✓' : ''}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex justify-between items-center mb-3">
              <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                currentTrivia.isFlash 
                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-extrabold animate-pulse'
                  : 'text-amber-400 bg-amber-500/20 border-amber-500/30'
              }`}>
                {currentTrivia.isFlash ? '⚡ TRIVIA FLASH EXPRÉS' : '⚡ Trivia Expres'} • +{currentTrivia.pointsReward || 150} Pts
              </span>
              {allActiveQuestions.length > 1 && (
                <span className="text-[10px] text-slate-400 font-mono">
                  {selectedTriviaIndex + 1} de {allActiveQuestions.length}
                </span>
              )}
            </div>

            {/* Flyer / Foto de la Trivia si existe */}
            {currentTrivia.imageUrl && (
              <div className="w-full h-32 rounded-xl overflow-hidden mb-3 border border-slate-700 shadow-inner bg-slate-950">
                <img src={currentTrivia.imageUrl} alt="Trivia flyer" className="w-full h-full object-cover" />
              </div>
            )}

            <h2 className="text-base font-bold mb-4 text-center leading-snug text-white">{currentTrivia.questionText}</h2>
            
            {isCurrentTriviaAnswered ? (
              <div className="text-center py-5 bg-slate-950/50 rounded-xl border border-green-500/30">
                <p className="text-green-400 font-bold text-sm animate-pulse">¡Pronóstico enviado con éxito! 🎯</p>
                <p className="text-xs text-slate-400 mt-1">Mirá la pantalla grande del bar...</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {currentTrivia.options.map((option: any) => (
                  <button
                    key={option.id}
                    onClick={() => handleSelectOption(currentTrivia.id, option.id)}
                    className="w-full py-3 px-4 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 rounded-xl transition-all font-extrabold text-sm border border-slate-700 active:scale-95 text-white"
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl w-full">
            <div className="h-6 w-6 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-200">Esperando la próxima jugada del partido...</p>
            <p className="text-[11px] text-slate-400 mt-1">Sumá puntos acertando las trivias y canjeá premios abajo ⬇️</p>
          </div>
        )}
      </div>

      {/* Banner de Feedback del Canje */}
      {claimFeedback && (
        <div className={`w-full my-2 p-4 rounded-2xl border text-center animate-fade-in ${
          claimFeedback.success ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' : 'bg-red-500/15 border-red-500/40 text-red-400'
        }`}>
          <p className="text-xs font-bold">{claimFeedback.message}</p>
          {claimFeedback.code && (
            <div className="mt-2 py-2 px-4 bg-slate-900 border border-amber-500/60 rounded-xl inline-block">
              <span className="text-xs text-slate-400 uppercase tracking-widest block font-mono">CÓDIGO DE CANJE</span>
              <span className="text-3xl font-mono font-black text-amber-400 tracking-widest">{claimFeedback.code}</span>
            </div>
          )}
        </div>
      )}

      {/* Mis Códigos de Canje Activos (Vouchers) */}
      {claims.length > 0 && (
        <section className="w-full my-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            🎟️ Mis Códigos de Canje ({claims.length})
          </h3>
          <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
            {claims.map((c) => (
              <div
                key={c.id}
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  c.isRedeemed 
                    ? 'bg-slate-900/40 border-slate-800 opacity-60' 
                    : 'bg-slate-900 border-amber-500/40 shadow-lg'
                }`}
              >
                <div>
                  <span className="text-xs font-extrabold text-white block">{c.reward?.title}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {c.isRedeemed ? '✅ ENTREGADO EN BARRA' : '⏳ PENDIENTE EN BARRA'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-mono font-black text-amber-400 tracking-wider">{c.claimCode}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CATÁLOGO DE PREMIOS DEL BAR */}
      <section className="w-full my-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
          🍻 Catálogo de Premios del Bar
        </h3>
        <div className="grid gap-2.5">
          {rewards.length > 0 ? (
            rewards.map((r) => {
              const canAfford = totalPoints >= r.pointsCost;
              return (
                <div
                  key={r.id}
                  className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <span className="text-sm font-bold text-white block">{r.title}</span>
                    <span className="text-xs text-amber-400 font-mono font-bold">{r.pointsCost} Pts</span>
                  </div>
                  <button
                    disabled={!canAfford || isClaiming}
                    onClick={() => handleClaimReward(r.id)}
                    className={`py-2 px-3 rounded-xl text-xs font-black transition-all ${
                      canAfford
                        ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 active:scale-95 shadow-md'
                        : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    {canAfford ? 'Canjear' : 'Faltan Pts'}
                  </button>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-slate-500 text-center py-3">Cargando premios del local...</p>
          )}
        </div>
      </section>

      <footer className="w-full py-3 text-center text-[10px] text-slate-500 border-t border-slate-800/60 mt-2">
        PulsoBet • Experiencia Interactiva en Vivo
      </footer>
    </main>
  );
}
