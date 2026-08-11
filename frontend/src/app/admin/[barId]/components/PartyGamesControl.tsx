'use client';

import { useEffect, useState } from 'react';
import { useSessionStore } from '@/store/useSessionStore';
import { API_URL } from '@/config/api';

interface Category {
  id: string;
  name: string;
  isDefault: boolean;
}

type GameType = 'BLUFFING' | 'TUTI_FRUTI' | 'SOCIAL_JUDGMENT';

interface Props {
  barId: string;
  sessionId: string;
  socket: any;
}

const GAME_LABELS: Record<GameType, { label: string; emoji: string; color: string }> = {
  BLUFFING: { label: 'Mentiroso', emoji: '🤥', color: 'amber' },
  TUTI_FRUTI: { label: 'Tuti Fruti', emoji: '🔤', color: 'emerald' },
  SOCIAL_JUDGMENT: { label: 'Juicio Social', emoji: '🔮', color: 'violet' },
};

export function PartyGamesControl({ barId, sessionId, socket }: Props) {
  const partyGame = useSessionStore((s) => s.snapshot?.partyGame);
  const activeRound = partyGame?.activeRound;

  const [selectedGame, setSelectedGame] = useState<GameType>('BLUFFING');
  const [prompt, setPrompt] = useState('');
  const [realAnswer, setRealAnswer] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [timeLimit, setTimeLimit] = useState(60);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Letra aleatoria para Tuti Fruti
  const randomLetter = () => {
    const letters = 'ABCDEFGHIJLMNOPRSTV';
    setPrompt(letters[Math.floor(Math.random() * letters.length)]);
  };

  useEffect(() => {
    fetch(`${API_URL}/party-games/categories/${barId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [barId]);

  const toggleCategory = (name: string) => {
    setSelectedCategories((prev) =>
      prev.includes(name)
        ? prev.filter((c) => c !== name)
        : prev.length < 4
        ? [...prev, name]
        : prev,
    );
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await fetch(`${API_URL}/party-games/categories/${barId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      if (res.ok) {
        const cat = await res.json();
        setCategories((prev) => [...prev, cat]);
        setNewCategoryName('');
      }
    } catch {}
  };

  const handleStartRound = async () => {
    if (!prompt.trim() || loading) return;
    if (selectedGame === 'TUTI_FRUTI' && selectedCategories.length === 0) return;
    setLoading(true);
    setError(null);

    const payload = {
      sessionId,
      gameType: selectedGame,
      prompt: prompt.trim(),
      ...(selectedGame === 'BLUFFING' && realAnswer.trim() ? { realAnswer: realAnswer.trim() } : {}),
      ...(selectedGame === 'TUTI_FRUTI' ? { categories: selectedCategories } : {}),
      timeLimit,
    };

    // Usar REST (más confiable para admin)
    try {
      const res = await fetch(`${API_URL}/party-games/rounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message =
          (body && (Array.isArray(body.message) ? body.message.join(' ') : body.message)) ||
          `Error ${res.status} al iniciar la ronda.`;
        setError(message);
        return;
      }
      setPrompt('');
      setRealAnswer('');
    } catch {
      setError('No se pudo conectar con el servidor. Verificá que el backend esté corriendo.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdvancePhase = async () => {
    if (!activeRound) return;
    await fetch(`${API_URL}/party-games/rounds/${activeRound.id}/advance`, { method: 'POST' });
  };

  const handleStartCountdown = async () => {
    if (!activeRound) return;
    await fetch(`${API_URL}/party-games/rounds/${activeRound.id}/start`, { method: 'POST' });
  };

  const handleEndRound = async () => {
    if (!activeRound) return;
    await fetch(`${API_URL}/party-games/rounds/${activeRound.id}/end`, { method: 'POST' });
  };

  const handleEndGame = async () => {
    if (!confirm('¿Finalizar el juego completo y mostrar el podio definitivo?')) return;
    await fetch(`${API_URL}/party-games/game/end/${sessionId}`, { method: 'POST' });
  };

  const colorMap: Record<string, string> = {
    amber: 'border-amber-400/40 bg-amber-400/10 text-amber-400',
    emerald: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-400',
    violet: 'border-violet-400/40 bg-violet-400/10 text-violet-400',
  };

  const phaseLabel: Record<string, string> = {
    LOBBY: 'Lobby — Previa del juego',
    COUNTDOWN: 'Cuenta regresiva — 3, 2, 1...',
    INPUT: 'Fase INPUT — Jugadores respondiendo',
    VOTING: 'Fase VOTING — Jugadores votando',
    REVEAL: 'Fase REVEAL — Resultados visibles',
    FINISHED: 'Ronda finalizada',
  };

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
      <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
        🎮 <span>Party Games</span>
      </h2>

      {/* Ronda activa — controles */}
      {activeRound && (
        <div className="mb-6 p-4 rounded-xl border border-white/20 bg-white/5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-white/50 text-xs uppercase tracking-wider">Ronda activa</span>
              <p className="font-bold text-white flex items-center gap-2">
                {GAME_LABELS[activeRound.gameType as GameType]?.emoji}{' '}
                {GAME_LABELS[activeRound.gameType as GameType]?.label}
              </p>
              <p className="text-white/50 text-sm">{phaseLabel[activeRound.phase]}</p>
            </div>
            <div className="text-right">
              <p className="text-white/50 text-xs">Respondieron</p>
              <p className="text-2xl font-black text-white">
                {activeRound.submittedCount}/{activeRound.totalPlayers}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {activeRound.phase === 'LOBBY' && (
              <button
                id="party-start-countdown-btn"
                onClick={handleStartCountdown}
                className="py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-xl transition-colors"
              >
                ▶ Iniciar (3-2-1)
              </button>
            )}
            {(activeRound.phase === 'INPUT' || activeRound.phase === 'VOTING') && (
              <button
                id="party-advance-btn"
                onClick={handleAdvancePhase}
                className="py-3 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-xl transition-colors"
              >
                ▶ Siguiente Fase
              </button>
            )}
            <button
              id="party-end-btn"
              onClick={handleEndRound}
              className={`py-3 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-xl transition-colors ${
                activeRound.phase === 'COUNTDOWN' || activeRound.phase === 'REVEAL' || activeRound.phase === 'FINISHED'
                  ? 'col-span-2'
                  : 'col-span-1'
              }`}
            >
              ✕ Cerrar Ronda
            </button>
          </div>
        </div>
      )}

      {/* Formulario nueva ronda */}
      {!activeRound && (
        <>
          {/* Selector de juego */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {(Object.keys(GAME_LABELS) as GameType[]).map((type) => {
              const g = GAME_LABELS[type];
              return (
                <button
                  key={type}
                  id={`party-game-${type.toLowerCase()}`}
                  onClick={() => { setSelectedGame(type); setPrompt(''); setSelectedCategories([]); }}
                  className={`py-3 rounded-xl border font-bold transition-all text-sm ${
                    selectedGame === type
                      ? colorMap[g.color]
                      : 'border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {g.emoji} {g.label}
                </button>
              );
            })}
          </div>

          {/* Configuración de Mentiroso */}
          {selectedGame === 'BLUFFING' && (
            <div className="mb-5 flex flex-col gap-3">
              <div>
                <label className="text-amber-400 font-bold text-xs uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                  <span>❓</span>
                  <span>Premisa / Dato curioso incompleto</span>
                </label>
                <textarea
                  id="party-bluffing-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder='Ej: "El récord mundial de tiro libre más lejano fue logrado por..."'
                  rows={2}
                  className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white placeholder:text-white/20 resize-none focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>

              <div>
                <label className="text-emerald-400 font-bold text-xs uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                  <span>✅</span>
                  <span>Respuesta Correcta / Verdadera</span>
                </label>
                <input
                  id="party-bluffing-real-answer"
                  type="text"
                  value={realAnswer}
                  onChange={(e) => setRealAnswer(e.target.value)}
                  placeholder='Ej: "Un jugador de tercera división en 1985"'
                  className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl p-3 text-emerald-300 font-bold placeholder:text-white/20 focus:outline-none focus:border-emerald-400 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Configuración de Tuti Fruti */}
          {selectedGame === 'TUTI_FRUTI' && (
            <div className="mb-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider block mb-1">Letra</label>
                  <input
                    id="party-tuti-letter"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value.toUpperCase().slice(0, 1))}
                    maxLength={1}
                    className="w-16 text-3xl font-black text-center bg-white/10 border border-white/20 rounded-xl p-2 text-emerald-400 focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <button
                  id="party-tuti-random-letter"
                  onClick={randomLetter}
                  className="mt-5 px-3 py-2 bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 rounded-xl text-sm font-bold"
                >
                  🎲 Aleatoria
                </button>
              </div>

              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider block mb-2">
                  Categorías (máx 4) — seleccionadas: {selectedCategories.length}/4
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.name)}
                      className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all ${
                        selectedCategories.includes(cat.name)
                          ? 'bg-emerald-400/20 border-emerald-400 text-emerald-400'
                          : 'bg-white/5 border-white/20 text-white/60'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    id="party-tuti-new-category"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Nueva categoría..."
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-emerald-400"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                  />
                  <button
                    onClick={handleAddCategory}
                    className="px-3 py-2 bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 rounded-xl text-sm font-bold"
                  >
                    + Agregar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Configuración de Juicio Social */}
          {selectedGame === 'SOCIAL_JUDGMENT' && (
            <div className="mb-5">
              <label className="text-white/50 text-xs uppercase tracking-wider block mb-2">
                El más probable que...
              </label>
              <input
                id="party-social-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder='Ej: "...llore en una película de Disney"'
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-violet-400 transition-colors"
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {[
                  '...llore en una película de Disney',
                  '...sea el alma de la fiesta',
                  '...revise el chat antes de dormir',
                  '...tenga más de 3 plantas en casa',
                  '...pida perdón primero en una pelea',
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => setPrompt(s)}
                    className="px-2 py-1 bg-white/5 border border-white/10 text-white/50 rounded-lg text-xs hover:border-violet-400/40 hover:text-violet-400 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tiempo límite */}
          <div className="mb-5">
            <label className="text-white/50 text-xs uppercase tracking-wider block mb-2">
              Tiempo límite: <span className="text-white font-bold">{timeLimit}s</span>
            </label>
            <input
              id="party-time-limit"
              type="range"
              min={15}
              max={120}
              step={5}
              value={timeLimit}
              onChange={(e) => setTimeLimit(Number(e.target.value))}
              className="w-full accent-amber-400"
            />
            <div className="flex justify-between text-white/30 text-xs mt-1">
              <span>15s</span><span>120s</span>
            </div>
          </div>

          <button
            id="party-start-btn"
            onClick={handleStartRound}
            disabled={
              loading ||
              !prompt.trim() ||
              (selectedGame === 'TUTI_FRUTI' && selectedCategories.length === 0)
            }
            className="w-full py-4 bg-gradient-to-r from-amber-400 to-orange-400 text-black font-black text-lg rounded-xl disabled:opacity-40 active:scale-95 transition-all"
          >
            {loading ? 'Iniciando...' : `🚀 Iniciar ${GAME_LABELS[selectedGame].label}`}
          </button>

          {error && (
            <p className="text-red-400 text-sm font-semibold bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </>
      )}

      {/* Finalizar juego completo (podio definitivo) */}
      <div className="mt-6 pt-4 border-t border-slate-700">
        <button
          id="party-end-game-btn"
          onClick={handleEndGame}
          className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black rounded-xl transition-all"
        >
          🏆 Finalizar Juego / Mostrar Podio
        </button>
      </div>
    </div>
  );
}
