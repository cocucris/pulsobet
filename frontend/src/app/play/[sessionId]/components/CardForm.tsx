'use client';

import { useState } from 'react';
import { API_URL } from '@/config/api';

const PRESET_POSITIONS = [
  'DELANTERO ROMÁNTICO',
  'DEFENSOR FÉRREO',
  'MEDIOCAMPISTA SOÑADOR',
  'ARQUERO DE CONFIANZA',
  'CAPITÁN CORAZÓN',
];

const SKILLS_CATALOG = [
  { key: 'whatsapp', label: 'VELOCIDAD PARA RESPONDER WHATSAPP', icon: '💬' },
  { key: 'celos', label: 'NIVEL DE CELOS', icon: '😡' },
  { key: 'cocina', label: 'COCINA', icon: '👨‍🍳' },
  { key: 'baila', label: 'BAILA', icon: '💃' },
  { key: 'humor', label: 'HUMOR', icon: '😂' },
  { key: 'aguante', label: 'AGUANTE EN LA MESA', icon: '🍻' },
];

interface CardFormProps {
  sessionId: string;
  playerId: string | null;
  defaultTable?: string;
  onSubmitted: () => void;
  onCancel: () => void;
}

export function CardForm({ sessionId, playerId, defaultTable, onSubmitted, onCancel }: CardFormProps) {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [tableNumber, setTableNumber] = useState(defaultTable || '');
  const [position, setPosition] = useState('');
  const [strongFoot, setStrongFoot] = useState<'DERECHA' | 'IZQUIERDA' | 'AMBAS'>('DERECHA');
  const [fitness, setFitness] = useState(7);
  const [skills, setSkills] = useState<Record<string, number>>(
    Object.fromEntries(SKILLS_CATALOG.map((s) => [s.key, 3])),
  );
  const [objective, setObjective] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('La foto no puede pesar más de 5MB.');
      return;
    }
    setError(null);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // 1. Subir la foto si hay
      let photoUrl: string | null = null;
      if (photoFile) {
        const formData = new FormData();
        formData.append('photo', photoFile);
        const uploadRes = await fetch(`${API_URL}/cards/upload`, {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json().catch(() => null);
        if (!uploadRes.ok) {
          setError(uploadData?.message || 'Error al subir la foto.');
          return;
        }
        photoUrl = uploadData.url;
      }

      // 2. Crear la ficha
      const res = await fetch(`${API_URL}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          playerId: playerId || undefined,
          tableNumber: tableNumber.trim() || undefined,
          name: name.trim(),
          age: age ? Number(age) : undefined,
          position: position.trim() || undefined,
          strongFoot,
          fitness,
          skills: SKILLS_CATALOG.map((s) => ({
            key: s.key,
            label: s.label,
            icon: s.icon,
            stars: skills[s.key] || 3,
          })),
          objective: objective.trim() || undefined,
          photoUrl: photoUrl || undefined,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.message || 'Error al enviar la ficha.');
        return;
      }

      onSubmitted();
    } catch (err) {
      console.error('Error enviando ficha:', err);
      setError('Error de conexión. Intentá de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4 p-5 bg-slate-900 rounded-2xl border border-pink-500/40 shadow-2xl">
      <h2 className="text-base font-black text-pink-400 uppercase tracking-wider text-center">
        📇 Ficha Técnica de tu Amigo/a
      </h2>

      {/* Foto */}
      <div className="flex flex-col items-center gap-2">
        {photoPreview ? (
          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-amber-400 shadow-lg">
            <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-28 h-28 rounded-full bg-slate-800 border-2 border-dashed border-slate-600 flex items-center justify-center text-3xl">
            📷
          </div>
        )}
        <label className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs font-bold text-white cursor-pointer transition-all">
          {photoFile ? 'Cambiar foto' : 'Subir foto'}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="hidden" />
        </label>
      </div>

      {/* Nombre + Edad + Mesa */}
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nombre / Apodo *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            placeholder="Ej: Cristóbal"
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-pink-500"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Edad</label>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            min={18}
            max={99}
            placeholder="34"
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white text-center focus:outline-none focus:border-pink-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Mesa</label>
          <input
            type="text"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            maxLength={10}
            placeholder="Ej: 6"
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white text-center focus:outline-none focus:border-pink-500"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Pierna Hábil</label>
          <div className="flex gap-1">
            {(['DERECHA', 'IZQUIERDA', 'AMBAS'] as const).map((foot) => (
              <button
                key={foot}
                type="button"
                onClick={() => setStrongFoot(foot)}
                className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${
                  strongFoot === foot ? 'bg-pink-500 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {foot === 'DERECHA' ? 'Der' : foot === 'IZQUIERDA' ? 'Izq' : 'Ambas'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Posición */}
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Posición</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {PRESET_POSITIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPosition(p)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                position === p ? 'bg-pink-500 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          maxLength={40}
          placeholder="O escribí una posición personalizada..."
          className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-pink-500"
        />
      </div>

      {/* Estado físico */}
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
          💪 Estado Físico: <span className="text-pink-400 font-black">{fitness}/10</span>
        </label>
        <input
          type="range"
          min={1}
          max={10}
          value={fitness}
          onChange={(e) => setFitness(Number(e.target.value))}
          className="w-full accent-pink-500"
        />
      </div>

      {/* Skills con estrellas */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Habilidades (1-5 ⭐)</span>
        {SKILLS_CATALOG.map((skill) => (
          <div key={skill.key} className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 flex-1">
              <span>{skill.icon}</span>
              <span className="leading-tight">{skill.label}</span>
            </span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSkills((prev) => ({ ...prev, [skill.key]: star }))}
                  className={`text-base transition-all ${
                    star <= (skills[skill.key] || 3) ? 'text-amber-400' : 'text-slate-700'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Objetivo */}
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
          🏆 Objetivo de la Temporada
        </label>
        <textarea
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          maxLength={120}
          rows={2}
          placeholder="Ej: Encontrar compañera para ganar el campeonato del amor ❤️"
          className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-medium text-white focus:outline-none focus:border-pink-500 resize-none"
        />
      </div>

      {error && (
        <p className="text-xs font-bold text-red-400 text-center bg-red-500/10 border border-red-500/30 rounded-xl py-2 px-3">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting || !name.trim()}
          className="flex-1 py-3.5 bg-pink-500 hover:bg-pink-400 disabled:opacity-50 text-white font-black rounded-xl uppercase tracking-wider text-xs transition-all shadow-lg"
        >
          {isSubmitting ? 'ENVIANDO FICHA...' : '📤 Enviar Ficha a Moderación'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-3.5 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
        >
          Cancelar
        </button>
      </div>

      <p className="text-[10px] text-slate-500 text-center">
        La ficha aparecerá en la pantalla grande cuando el bar la apruebe ✅
      </p>
    </form>
  );
}
