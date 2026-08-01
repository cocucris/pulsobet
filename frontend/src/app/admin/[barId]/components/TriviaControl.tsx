'use client';

import { useState } from 'react';
import { useSessionStore } from '@/store/useSessionStore';
import { API_URL } from '@/config/api';

const PRESET_IMAGES = [
  { label: '⚽ Balón', url: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=500&q=80' },
  { label: '🥅 Arco', url: 'https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?w=500&q=80' },
  { label: '🟨 Tarjetas', url: 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=500&q=80' },
  { label: '👟 Tiro Libre', url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=500&q=80' },
  { label: '📐 Córner', url: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=500&q=80' },
];

export function TriviaControl({ barId }: { barId: string }) {
  const activeTrivias = useSessionStore((s) => s.snapshot?.activeTrivias) || [];
  const resolvedTrivias = useSessionStore((s) => s.snapshot?.resolvedTrivias) || [];

  const [questionText, setQuestionText] = useState('');
  const [pointsReward, setPointsReward] = useState(150);
  const [isFlash, setIsFlash] = useState(false);
  const [flashSeconds, setFlashSeconds] = useState(15);
  const [imageUrl, setImageUrl] = useState('');
  const [selectedPresetImage, setSelectedPresetImage] = useState('');
  const [options, setOptions] = useState([
    { id: 1, text: 'Sí' },
    { id: 2, text: 'No' },
  ]);
  const [isLaunchingQuestion, setIsLaunchingQuestion] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  // Modo edición inline (por trivia)
  const [editingTriviaId, setEditingTriviaId] = useState<string | null>(null);
  const [editQuestionText, setEditQuestionText] = useState('');
  const [editOptions, setEditOptions] = useState<{ id: number; text: string }[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleLaunchQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) return;

    try {
      setIsLaunchingQuestion(true);
      const finalImage = imageUrl.trim() || selectedPresetImage || null;
      const finalPoints = Number(pointsReward) || (isFlash ? 900 : 150);
      const finalDuration = isFlash ? flashSeconds : 3600;

      const res = await fetch(`${API_URL}/match/questions/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barId,
          questionText,
          options,
          pointsReward: finalPoints,
          expiresInSeconds: finalDuration,
          imageUrl: finalImage,
          isFlash,
        }),
      });

      if (res.ok) {
        setQuestionText('');
      } else {
        const data = await res.json();
        alert(data.message || 'Error al lanzar la trivia.');
      }
    } catch (error) {
      console.error('Error al lanzar trivia:', error);
    } finally {
      setIsLaunchingQuestion(false);
    }
  };

  const handleResolveTrivia = async (questionId: string, correctOptionId: number) => {
    try {
      setIsResolving(true);
      const res = await fetch(`${API_URL}/match/questions/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, correctOptionId }),
      });

      if (!res.ok) {
        alert('Error al resolver la trivia.');
      }
    } catch (err) {
      console.error('Error al resolver trivia:', err);
    } finally {
      setIsResolving(false);
    }
  };

  const handleStartEdit = (trivia: (typeof activeTrivias)[number]) => {
    setEditQuestionText(trivia.questionText);
    setEditOptions(trivia.options.map((o) => ({ id: o.id, text: o.text })));
    setEditingTriviaId(trivia.id);
  };

  const handleSaveEdit = async () => {
    if (!editingTriviaId) return;
    try {
      setIsSavingEdit(true);
      const res = await fetch(`${API_URL}/match/questions/${editingTriviaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionText: editQuestionText, options: editOptions }),
      });

      if (res.ok) {
        setEditingTriviaId(null);
      }
    } catch (e) {
      console.error('Error al guardar edición:', e);
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2 text-amber-400">
          ⚡ Control de Trivias
        </h2>
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700">
          <button
            type="button"
            onClick={() => { setIsFlash(false); setPointsReward(150); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              !isFlash ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Estándar / Pre-partido
          </button>
          <button
            type="button"
            onClick={() => { setIsFlash(true); setPointsReward(900); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              isFlash ? 'bg-amber-500 text-slate-950 shadow animate-pulse' : 'text-slate-400 hover:text-white'
            }`}
          >
            ⚡ Trivia Flash (15s Popup)
          </button>
        </div>
      </div>

      {isFlash && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl mb-4 flex items-center justify-between">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            ⏱️ Duración Trivia Flash (Popup Neón):
          </span>
          <div className="flex gap-2">
            {[15, 30, 45, 60].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setFlashSeconds(sec)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold border transition-all ${
                  flashSeconds === sec
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleLaunchQuestion} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider opacity-60 mb-1">
            {isFlash ? '⚡ Pregunta Exprés Flash' : 'Pregunta Estándar'}
          </label>
          <input
            type="text"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder={isFlash ? 'Ej: ¿El próximo córner será para Olimpia?' : 'Ej: ¿Habrá más de 2.5 goles en el partido?'}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 text-sm font-medium text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider opacity-60 mb-1">
            🖼️ Foto / Flyer de la Trivia (Predeterminado o URL)
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {PRESET_IMAGES.map((img) => (
              <button
                key={img.label}
                type="button"
                onClick={() => { setSelectedPresetImage(img.url); setImageUrl(''); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                  selectedPresetImage === img.url && !imageUrl
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                }`}
              >
                {img.label}
              </button>
            ))}
          </div>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => { setImageUrl(e.target.value); setSelectedPresetImage(''); }}
            placeholder="O pegá aquí la URL de tu foto/flyer personalizado (https://...)"
            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-slate-300"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider opacity-60 mb-1">Opción A</label>
            <input
              type="text"
              value={options[0].text}
              onChange={(e) => setOptions([{ ...options[0], text: e.target.value }, options[1]])}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-medium text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider opacity-60 mb-1">Opción B</label>
            <input
              type="text"
              value={options[1].text}
              onChange={(e) => setOptions([options[0], { ...options[1], text: e.target.value }])}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-medium text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">Puntos Otorga</label>
            <input
              type="number"
              min={10}
              step={10}
              value={pointsReward}
              onChange={(e) => setPointsReward(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-slate-900 border border-amber-500/40 rounded-xl text-sm font-mono font-bold text-amber-400 text-center"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!questionText.trim() || isLaunchingQuestion}
          className={`w-full mt-2 py-3.5 font-bold rounded-xl border transition-all text-sm uppercase tracking-wider shadow-lg ${
            isFlash
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-300 font-black animate-pulse'
              : 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600'
          }`}
        >
          {isLaunchingQuestion ? 'ENVIANDO A LAS PANTALLAS...' : isFlash ? '⚡ Lanzar TRIVIA FLASH Expres' : 'Lanzar Trivia Estándar'}
        </button>
      </form>

      {/* Trivias Activas en Votación (sincronizadas reactivamente, pueden coexistir varias) */}
      {activeTrivias.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-700 flex flex-col gap-4">
          <span className="text-xs font-black uppercase text-amber-400 tracking-wider block">
            🎯 Trivias Activas en Votación ({activeTrivias.length})
          </span>
          {activeTrivias.map((trivia) => (
            <div key={trivia.id} className="bg-slate-900 p-4 rounded-xl border border-slate-700">
              {editingTriviaId === trivia.id ? (
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-black text-amber-400 uppercase tracking-wider">✏️ Editando Trivia</span>
                  <input
                    type="text"
                    value={editQuestionText}
                    onChange={(e) => setEditQuestionText(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-amber-500/40 rounded-lg text-sm font-bold text-white"
                  />
                  {editOptions.map((opt) => (
                    <input
                      key={opt.id}
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const updated = editOptions.map((o) => (o.id === opt.id ? { ...o, text: e.target.value } : o));
                        setEditOptions(updated);
                      }}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm font-bold text-white"
                    />
                  ))}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleSaveEdit}
                      disabled={isSavingEdit}
                      className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-lg uppercase tracking-wider"
                    >
                      {isSavingEdit ? 'Guardando...' : '✓ Guardar y Transmitir'}
                    </button>
                    <button
                      onClick={() => setEditingTriviaId(null)}
                      className="px-4 py-2 bg-slate-700 text-slate-300 font-bold text-xs rounded-lg uppercase tracking-wider"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-amber-400">
                      {trivia.isFlash ? '⚡ FLASH • ' : ''}Trivia (+{trivia.pointsReward || 150} PTS) • {trivia.totalVotes || 0} VOTOS
                    </span>
                    <div className="flex items-center gap-2">
                      {trivia.isClosed && (
                        <span className="text-[10px] font-black uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-full animate-pulse">
                          ⏱️ Cerrada — declará el resultado
                        </span>
                      )}
                      <button
                        onClick={() => handleStartEdit(trivia)}
                        className="text-slate-400 hover:text-amber-400 text-xs font-bold px-2 py-1 rounded-lg hover:bg-slate-800"
                      >
                        ✏️ Editar
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-white mb-3">{trivia.questionText}</p>
                  <span className="text-xs text-slate-400 font-semibold block mb-2">Declarar Respuesta Correcta:</span>
                  <div className="grid grid-cols-2 gap-3">
                    {trivia.options.map((opt) => (
                      <button
                        key={opt.id}
                        disabled={isResolving}
                        onClick={() => handleResolveTrivia(trivia.id, opt.id)}
                        className="py-2.5 px-3 bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-400 border border-amber-500/30 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                      >
                        🏆 Gana: {opt.text} ({opt.percentage || 0}%)
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Historial de Trivias Resueltas (persiste hasta cerrar la sesión) */}
      {resolvedTrivias.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-700 flex flex-col gap-3">
          <span className="text-xs font-black uppercase text-slate-400 tracking-wider block">
            📋 Historial de Resultados ({resolvedTrivias.length})
          </span>
          {resolvedTrivias.map((trivia) => (
            <div key={trivia.id} className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/60">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-400">
                  {trivia.isFlash ? '⚡ FLASH • ' : ''}+{trivia.pointsReward || 150} PTS • {trivia.totalVotes || 0} VOTOS • 🏆 {trivia.winnersCount ?? 0} ACIERTOS
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  RESUELTA
                </span>
              </div>
              <p className="text-sm font-bold text-slate-300 mb-2">{trivia.questionText}</p>
              <div className="grid grid-cols-2 gap-2">
                {trivia.options.map((opt) => {
                  const isWinner = Number(opt.id) === Number(trivia.correctOptionId);
                  return (
                    <div
                      key={opt.id}
                      className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-between border ${
                        isWinner
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                          : 'bg-slate-800/60 text-slate-500 border-slate-700/60'
                      }`}
                    >
                      <span>{isWinner ? '✅ ' : ''}{opt.text}</span>
                      <span className="font-mono">{opt.percentage || 0}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
