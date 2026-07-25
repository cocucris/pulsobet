'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { API_URL } from '@/config/api';

function AnalyticsWidget({ barId, refreshKey }: { barId: string; refreshKey: number }) {
  const [preset, setPreset] = useState<'WEEK' | 'MONTH' | 'YEAR'>('WEEK');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/bar/analytics?preset=${preset}`);
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error('Error al cargar analíticas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [preset, refreshKey]);

  const handleDownloadCsv = () => {
    window.open(`${API_URL}/bar/analytics/export-csv?preset=${preset}`, '_blank');
  };

  return (
    <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl mt-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-700 pb-4">
        <div>
          <h2 className="text-xl font-black text-amber-500 tracking-wider">📊 Analíticas e Informes de Canjes</h2>
          <p className="text-xs text-slate-400">Rendimiento de premios y métricas de consumo en el local</p>
        </div>

        {/* Filtro por rango de fechas */}
        <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-700">
          {(['WEEK', 'MONTH', 'YEAR'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                preset === p ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              {p === 'WEEK' ? 'Esta Semana' : p === 'MONTH' ? 'Este Mes' : 'Este Año'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-center text-xs py-8 animate-pulse text-slate-400">Cargando métricas del local...</p>
      ) : analyticsData ? (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Card 1: Entregas Totales */}
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-700 flex flex-col justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Premios Entregados</span>
            <span className="text-4xl font-black text-amber-400 font-mono my-2">
              {analyticsData.metrics.totalClaimsRedeemed}
            </span>
            <span className="text-[10px] text-slate-500">Validados en barra por los mozos</span>
          </div>

          {/* Card 2: Jugadores Activos */}
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-700 flex flex-col justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Jugadores Participantes</span>
            <span className="text-4xl font-black text-white font-mono my-2">
              {analyticsData.metrics.totalActivePlayers}
            </span>
            <span className="text-[10px] text-slate-500">Clientes que enviaron al menos 1 pronóstico</span>
          </div>

          {/* Card 3: Top Premios y Exportación */}
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-700 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">Más Reclamados</span>
              <ul className="text-xs space-y-1">
                {analyticsData.metrics.topRewards.map((r: any, idx: number) => (
                  <li key={idx} className="flex justify-between text-slate-300">
                    <span>{r.rewardTitle}</span>
                    <span className="font-bold text-amber-400 font-mono">{r.totalRedeemed}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={handleDownloadCsv}
              className="mt-4 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2"
            >
              📊 Exportar Planilla Contable (.CSV)
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default function AdminBarPage() {
  const params = useParams();
  const barId = params.barId as string;

  // Estado para refrescar analíticas tras un canje
  const [refreshAnalyticsKey, setRefreshAnalyticsKey] = useState(0);

  // Estados para el validador de premios
  const [claimCode, setClaimCode] = useState('');
  const [redeemStatus, setRedeemStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isProcessingCode, setIsProcessingCode] = useState(false);

  // Estados para el lanzador manual de trivias
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

  // Imágenes deportivas predeterminadas rápidas
  const PRESET_IMAGES = [
    { label: '⚽ Balón', url: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=500&q=80' },
    { label: '🥅 Arco', url: 'https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?w=500&q=80' },
    { label: '🟨 Tarjetas', url: 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=500&q=80' },
    { label: '👟 Tiro Libre', url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=500&q=80' },
    { label: '📐 Córner', url: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=500&q=80' },
  ];

  // Estado para la lista de trivias activas a resolver
  const [activeTrivias, setActiveTrivias] = useState<Array<{ id: string; text: string; pointsReward?: number; options: { id: number; text: string }[] }>>([]);
  const [isResolving, setIsResolving] = useState(false);

  // Estado del partido en vivo
  const [liveMatch, setLiveMatch] = useState<any>(null);
  const [isUpdatingScore, setIsUpdatingScore] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/match/live/session-demo-01`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setLiveMatch(d); })
      .catch(() => {});
  }, []);

  const handleScoreUpdate = async (side: 'home' | 'away' | 'none', delta: number) => {
    if (!liveMatch) return;
    const newHome = side === 'home' ? Math.max(0, liveMatch.scoreHome + delta) : liveMatch.scoreHome;
    const newAway = side === 'away' ? Math.max(0, liveMatch.scoreAway + delta) : liveMatch.scoreAway;
    try {
      setIsUpdatingScore(true);
      const res = await fetch(`${API_URL}/match/score`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: liveMatch.id,
          scoreHome: newHome,
          scoreAway: newAway,
          homeTeam: liveMatch.homeTeam,
          awayTeam: liveMatch.awayTeam,
          currentMinute: liveMatch.currentMinute,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setLiveMatch(updated);
      }
    } catch (e) {
      console.error('Error actualizando marcador:', e);
    } finally {
      setIsUpdatingScore(false);
    }
  };

  const handleMinuteUpdate = async (minute: number) => {
    if (!liveMatch) return;
    try {
      const res = await fetch(`${API_URL}/match/score`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: liveMatch.id, scoreHome: liveMatch.scoreHome, scoreAway: liveMatch.scoreAway, currentMinute: minute }),
      });
      if (res.ok) setLiveMatch((prev: any) => ({ ...prev, currentMinute: minute }));
    } catch (e) {}
  };

  // Manejador para validar el código de 4 dígitos entregado por el mozo/cliente
  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (claimCode.length !== 4) return;

    try {
      setIsProcessingCode(true);
      setRedeemStatus(null);
      
      const staffToken = localStorage.getItem(`pulsobet_staff_token:${barId}`) || 'mock_token';

      const res = await fetch(`${API_URL}/bar/rewards/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${staffToken}`
        },
        body: JSON.stringify({ claimCode: claimCode.toUpperCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setRedeemStatus({ success: false, message: data.message || 'Código inválido o ya usado.' });
      } else {
        const rewardTitle = data.reward?.title || 'Premio';
        const playerNickname = data.player?.nickname || 'Cliente';
        setRedeemStatus({
          success: true,
          message: `¡ENTREGAR A ${playerNickname.toUpperCase()}: ${rewardTitle.toUpperCase()}! 🍻 (Código ${data.claimCode} validado con éxito)`,
        });
        setClaimCode('');
        setRefreshAnalyticsKey((prev) => prev + 1);
      }
    } catch (error) {
      setRedeemStatus({ success: false, message: 'Error de conexión con el servidor.' });
    } finally {
      setIsProcessingCode(false);
    }
  };

  // Manejador para lanzar una pregunta al WebSocket room del bar de forma manual
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

      const data = await res.json();

      if (res.ok) {
        setActiveTrivias((prev) => [
          {
            id: data.questionId,
            text: questionText,
            options: [...options],
            pointsReward: finalPoints,
          },
          ...prev,
        ]);
        alert(`¡${isFlash ? '⚡ TRIVIA FLASH (Popup Expres)' : 'Trivia Estándar'} de ${finalPoints} Pts lanzada con éxito! 🚀`);
        setQuestionText('');
      } else {
        alert(data.message || 'Error al procesar el lanzamiento de la pregunta.');
      }
    } catch (error) {
      console.error('Error al lanzar trivia:', error);
    } finally {
      setIsLaunchingQuestion(false);
    }
  };

  // Manejador para resolver la trivia y declarar la opción ganadora
  const handleResolveTrivia = async (questionId: string, correctOptionId: number) => {
    try {
      setIsResolving(true);
      const res = await fetch(`${API_URL}/match/questions/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          correctOptionId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(`¡Trivia resuelta! Ganadores: ${data.winnersCount}. Puntos acreditados y Leaderboard actualizado en la TV 🏆`);
        setActiveTrivias((prev) => prev.filter((t) => t.id !== questionId));
      } else {
        alert('Error al resolver la trivia.');
      }
    } catch (err) {
      console.error('Error al resolver trivia:', err);
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 text-white p-6 font-sans">
      <header className="mb-8 max-w-5xl mx-auto flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-amber-500 tracking-wider">PULSOBET OPERACIONES</h1>
          <p className="text-xs opacity-70">Consola comercial del Local ID: {barId}</p>
        </div>
        <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-full font-mono font-bold">
          CONEXIÓN API ACTIVA
        </span>
      </header>

      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
        
        {/* BLOQUE A: VALIDADOR DE PREMIOS (Mesa de Control / Caja) */}
        <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2 text-amber-400">
              🎁 Despacho de Premios
            </h2>
            <p className="text-xs opacity-75 mb-6 leading-relaxed">
              Ingresá el código alfanumérico de 4 caracteres que el cliente presenta en su PWA móvil al hacer el reclamo en barra.
            </p>

            <form onSubmit={handleRedeemCode} className="flex flex-col gap-4">
              <div>
                <input
                  type="text"
                  maxLength={4}
                  value={claimCode}
                  onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
                  placeholder="Escribí ej: X8Y3"
                  className="w-full text-center text-3xl font-mono font-black py-4 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 uppercase tracking-widest text-white"
                />
              </div>

              <button
                type="submit"
                disabled={claimCode.length !== 4 || isProcessingCode}
                className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-600 disabled:border-slate-700 disabled:cursor-not-allowed font-black rounded-xl transition-all shadow-lg text-slate-950 text-sm uppercase tracking-wider"
              >
                {isProcessingCode ? 'VERIFICANDO...' : 'Validar y Entregar'}
              </button>
            </form>
          </div>

          {/* Feedback del Canje Transaccional */}
          {redeemStatus && (
            <div className={`mt-6 p-4 rounded-xl border font-medium text-sm text-center animate-fade-in ${
              redeemStatus.success 
                ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                : 'bg-red-500/20 text-red-400 border-red-500/30'
            }`}>
              {redeemStatus.message}
            </div>
          )}
        </section>

        {/* BLOQUE B: INYECTOR MANUAL DE TRIVIAS (Operador / Animador) */}
        <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-amber-400">
              ⚡ Control de Trivias
            </h2>
            {/* Toggle Tipo de Trivia */}
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

          {/* Selector de Duración de Trivia Flash */}
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
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 text-sm font-medium"
              />
            </div>

            {/* Carga de Imagen / Flyer */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider opacity-60 mb-1">
                🖼️ Foto / Flyer de la Trivia (Predeterminado o URL)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {PRESET_IMAGES.map((img) => (
                  <button
                    key={img.label}
                    type="button"
                    onClick={() => {
                      setSelectedPresetImage(img.url);
                      setImageUrl('');
                    }}
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
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider opacity-60 mb-1">Opción B</label>
                <input
                  type="text"
                  value={options[1].text}
                  onChange={(e) => setOptions([options[0], { ...options[1], text: e.target.value }])}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-medium"
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

          {/* Panel de Cierre de Trivias Activas (Marcar Ganador) */}
          {activeTrivias.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-700 flex flex-col gap-4">
              <span className="text-xs font-black uppercase text-amber-400 tracking-wider block">
                🎯 Trivias Activas en Votación ({activeTrivias.length})
              </span>
              {activeTrivias.map((trivia, index) => (
                <div key={trivia.id || index} className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-amber-400">Trivia #{activeTrivias.length - index} (+{trivia.pointsReward || 150} PTS)</span>
                  </div>
                  <p className="text-sm font-bold text-white mb-3">
                    {trivia.text}
                  </p>
                  <span className="text-xs text-slate-400 font-semibold block mb-2">Declarar Respuesta Correcta:</span>
                  <div className="grid grid-cols-2 gap-3">
                    {trivia.options.map((opt) => (
                      <button
                        key={opt.id}
                        disabled={isResolving}
                        onClick={() => handleResolveTrivia(trivia.id, opt.id)}
                        className="py-2.5 px-3 bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-400 border border-amber-500/30 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                      >
                        🏆 Gana: {opt.text}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>

      {/* BLOQUE C: CONTROL DE MARCADOR EN VIVO */}
      <div className="max-w-5xl mx-auto mt-8">
        {liveMatch ? (
          <section className="bg-slate-800 p-6 rounded-2xl border border-amber-500/30 shadow-xl">
            <h2 className="text-xl font-black text-amber-500 tracking-wider mb-1">⚽ Control de Marcador en Vivo</h2>
            <p className="text-xs text-slate-400 mb-6">Los cambios se transmiten instantáneamente a todas las pantallas y celulares.</p>

            <div className="grid md:grid-cols-3 gap-6 items-center">
              {/* Equipo Local */}
              <div className="flex flex-col items-center gap-3">
                <input
                  type="text"
                  value={liveMatch.homeTeam}
                  onChange={(e) => setLiveMatch((prev: any) => ({ ...prev, homeTeam: e.target.value }))}
                  onBlur={() => handleScoreUpdate('none', 0)}
                  placeholder="Equipo local"
                  className="text-center text-sm font-black uppercase tracking-wider text-white bg-transparent border-b border-slate-600 focus:border-amber-500 focus:outline-none w-full pb-1"
                />
                <span className="text-6xl font-black font-mono text-amber-400">{liveMatch.scoreHome}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleScoreUpdate('home', -1)}
                    disabled={isUpdatingScore || liveMatch.scoreHome === 0}
                    className="w-12 h-12 rounded-xl bg-slate-700 hover:bg-red-500/30 text-red-400 font-black text-xl border border-slate-600 hover:border-red-500/50 transition-all disabled:opacity-40"
                  >−</button>
                  <button
                    onClick={() => handleScoreUpdate('home', +1)}
                    disabled={isUpdatingScore}
                    className="w-12 h-12 rounded-xl bg-slate-700 hover:bg-green-500/30 text-green-400 font-black text-xl border border-slate-600 hover:border-green-500/50 transition-all disabled:opacity-40"
                  >+</button>
                </div>
              </div>

              {/* Centro: VS y Estado */}
              <div className="flex flex-col items-center gap-3">
                <span className="text-5xl font-black font-mono text-slate-300">VS</span>
                <span className="text-[10px] font-mono text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full animate-pulse">
                  {liveMatch.status}
                </span>
              </div>

              {/* Equipo Visitante */}
              <div className="flex flex-col items-center gap-3">
                <input
                  type="text"
                  value={liveMatch.awayTeam}
                  onChange={(e) => setLiveMatch((prev: any) => ({ ...prev, awayTeam: e.target.value }))}
                  onBlur={() => handleScoreUpdate('none', 0)}
                  placeholder="Equipo visitante"
                  className="text-center text-sm font-black uppercase tracking-wider text-white bg-transparent border-b border-slate-600 focus:border-amber-500 focus:outline-none w-full pb-1"
                />
                <span className="text-6xl font-black font-mono text-amber-400">{liveMatch.scoreAway}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleScoreUpdate('away', -1)}
                    disabled={isUpdatingScore || liveMatch.scoreAway === 0}
                    className="w-12 h-12 rounded-xl bg-slate-700 hover:bg-red-500/30 text-red-400 font-black text-xl border border-slate-600 hover:border-red-500/50 transition-all disabled:opacity-40"
                  >−</button>
                  <button
                    onClick={() => handleScoreUpdate('away', +1)}
                    disabled={isUpdatingScore}
                    className="w-12 h-12 rounded-xl bg-slate-700 hover:bg-green-500/30 text-green-400 font-black text-xl border border-slate-600 hover:border-green-500/50 transition-all disabled:opacity-40"
                  >+</button>
                </div>
              </div>
            </div>

            {isUpdatingScore && (
              <p className="text-center text-xs text-amber-400 animate-pulse mt-4">Transmitiendo marcador a todas las pantallas...</p>
            )}
          </section>
        ) : (
          <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 text-center">
            <p className="text-slate-400 text-sm">⚽ No hay partido EN VIVO registrado. Lanzá una trivia primero para crear uno automáticamente.</p>
          </section>
        )}
      </div>

      {/* BLOQUE D: ANALÍTICAS E INFORMES DE CANJES */}
      <div className="max-w-5xl mx-auto">
        <AnalyticsWidget barId={barId} refreshKey={refreshAnalyticsKey} />
      </div>
    </main>
  );
}
