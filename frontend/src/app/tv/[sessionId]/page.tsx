'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { API_URL } from '@/config/api';

// Imágenes predeterminadas de respaldo por si no se adjunta flyer
const DEFAULT_IMAGES = [
  'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=500&q=80', // Balón
  'https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?w=500&q=80', // Arco
  'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=500&q=80', // Tarjeta
  'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=500&q=80', // Tiro Libre
];

export default function TvPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  // Nos conectamos al WebSocket segmentado para la TV del local
  const { isConnected, leaderboard, activeQuestion, activeQuestions } = useSocket(sessionId, true);

  const [mounted, setMounted] = useState(false);
  const [initialLeaderboard, setInitialLeaderboard] = useState<any[]>([]);
  const [initialActiveQuestions, setInitialActiveQuestions] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  useEffect(() => {
    setMounted(true);

    fetch(`${API_URL}/match/leaderboard/${sessionId}`)
      .then((res) => (res.ok && res.status !== 204 ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setInitialLeaderboard(data);
      })
      .catch((err) => console.error('Error al cargar leaderboard inicial:', err));

    fetch(`${API_URL}/match/questions/active/${sessionId}`)
      .then((res) => (res.ok && res.status !== 204 ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setInitialActiveQuestions(data);
        } else if (data && data.id) {
          setInitialActiveQuestions([data]);
        } else {
          setInitialActiveQuestions([]);
        }
      })
      .catch((err) => console.error('Error al cargar trivias activas iniciales:', err));

    // Timer de 1 segundo para sincronizar cuenta regresiva de Trivias Flash
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [sessionId]);

  const displayLeaderboard = leaderboard.length > 0 ? leaderboard : initialLeaderboard;
  
  const rawActiveQuestions = activeQuestions.length > 0 
    ? activeQuestions 
    : (initialActiveQuestions.length > 0 ? initialActiveQuestions : (activeQuestion ? [activeQuestion] : []));

  // Separar Trivias Estándar vs Trivias Flash ⚡ Activas (con tiempo restante > 0)
  const flashQuestion = useMemo(() => {
    return rawActiveQuestions.find((q: any) => {
      if (!q.isFlash) return false;
      const expires = new Date(q.expiresAt).getTime();
      return expires > currentTime;
    }) || null;
  }, [rawActiveQuestions, currentTime]);

  const standardQuestions = useMemo(() => {
    return rawActiveQuestions.filter((q: any) => !q.isFlash || new Date(q.expiresAt).getTime() <= currentTime);
  }, [rawActiveQuestions, currentTime]);

  // Paginador para Trivias Estándar (4 por página)
  const [pageIndex, setPageIndex] = useState(0);
  const TRIVIAS_PER_PAGE = 4;
  const totalPages = Math.ceil(standardQuestions.length / TRIVIAS_PER_PAGE) || 1;

  useEffect(() => {
    if (totalPages <= 1) {
      setPageIndex(0);
      return;
    }
    const timer = setInterval(() => {
      setPageIndex((prev) => (prev + 1) % totalPages);
    }, 10000);
    return () => clearInterval(timer);
  }, [totalPages]);

  const currentQuestionsPage = standardQuestions.slice(
    pageIndex * TRIVIAS_PER_PAGE,
    (pageIndex + 1) * TRIVIAS_PER_PAGE
  );

  // Puntos totales en juego en la ronda
  const pointsInPlay = useMemo(() => {
    return rawActiveQuestions.reduce((acc: number, q: any) => acc + (q.pointsReward || 150), 0) || 650;
  }, [rawActiveQuestions]);

  // Tiempo restante de Trivia Flash activa (Formato 00:15)
  const flashRemainingSeconds = useMemo(() => {
    if (!flashQuestion) return 0;
    const expires = new Date(flashQuestion.expiresAt).getTime();
    return Math.max(0, Math.ceil((expires - currentTime) / 1000));
  }, [flashQuestion, currentTime]);

  // Construimos la URL dinámica que escanearán los clientes en sus mesas
  const accessUrl = mounted
    ? `${window.location.origin}/play/${sessionId}`
    : `http://localhost:3000/play/${sessionId}`;

  return (
    <main className="min-h-screen bg-[#0a0b0e] text-white flex p-6 gap-6 font-sans overflow-hidden select-none relative">
      
      {/* SECCIÓN IZQUIERDA: Onboarding QR & Estadísticas (1/3) */}
      <section className="w-1/3 flex flex-col justify-between bg-slate-900/40 border border-slate-800 rounded-3xl p-6 backdrop-blur-md">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-amber-500 font-mono text-2xl font-black">📈</span>
            <h1 className="text-4xl font-black text-amber-500 tracking-wider">PULSOBET</h1>
          </div>
          <p className="text-xs opacity-75 font-black uppercase tracking-widest text-slate-300">
            ¡PRONOSTICÁ EN VIVO DESDE TU MESA!
          </p>
        </div>

        {/* Tarjeta del Código QR Destacada */}
        <div className="flex flex-col items-center my-auto p-5 bg-white rounded-3xl shadow-2xl border-2 border-amber-500/40">
          {mounted ? (
            <QRCodeSVG 
              value={accessUrl} 
              size={240}
              level="H"
              includeMargin={false}
              fgColor="#090a0f" 
            />
          ) : (
            <div className="w-[240px] h-[240px] bg-slate-200 animate-pulse rounded-xl" />
          )}
          <p className="text-slate-950 font-black text-lg mt-3 tracking-wider font-mono uppercase">pulso.bet/play</p>
        </div>

        {/* Bloques Estadísticos (Conectados, Puntos, Próxima Flash) */}
        <div className="flex flex-col gap-3">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">👥</span>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">JUGADORES CONECTADOS</span>
                <span className="text-xl font-black font-mono text-white">{displayLeaderboard.length || 128}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">📊</span>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">PUNTOS EN JUEGO</span>
                <span className="text-xl font-black font-mono text-amber-400">+{pointsInPlay} PTS</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">⏱️</span>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">PRÓXIMA TRIVIA FLASH</span>
                <span className="text-xs font-black font-mono text-amber-400 animate-pulse uppercase">EN CUALQUIER MOMENTO</span>
              </div>
            </div>
          </div>

          {/* Badge Estado Sistema Online */}
          <div className="flex items-center justify-center gap-2 py-2 bg-slate-900/60 border border-slate-850 rounded-xl">
            <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="font-mono font-black text-xs uppercase tracking-wider text-slate-300">
              {isConnected ? 'SISTEMA ONLINE' : 'RECONECTANDO'}
            </span>
          </div>
        </div>
      </section>

      {/* SECCIÓN DERECHA: Lista de Trivias Estándar + Overlay Popup Trivia Flash ⚡ (2/3) */}
      <section className="w-2/3 flex flex-col justify-between bg-slate-900/30 border border-slate-800/80 rounded-3xl p-6 relative overflow-hidden">
        
        {/* Cabecera Superior: Píldora Naranja de Trivias en Curso */}
        <div className="flex justify-between items-center bg-amber-500 text-slate-950 px-5 py-2.5 rounded-2xl shadow-lg mb-4">
          <div className="flex items-center gap-2 font-black text-base uppercase tracking-wider">
            <span>TRIVIAS EN CURSO</span>
            <span className="h-2.5 w-2.5 rounded-full bg-slate-950 animate-ping" />
            <span className="text-xs bg-slate-950 text-amber-400 px-2 py-0.5 rounded-full font-mono font-bold">EN VIVO</span>
          </div>
          <span className="text-xs font-mono font-black uppercase bg-slate-950 text-amber-400 px-3 py-1 rounded-full border border-amber-400/30">
            🏆 TOP 10 NACIONAL
          </span>
        </div>

        {/* LISTADO DE 4 TRIVIAS ESTÁNDAR APILADAS HORIZONTALMENTE */}
        <div className="flex-1 flex flex-col justify-between gap-3 my-1">
          {currentQuestionsPage.length > 0 ? (
            currentQuestionsPage.map((q: any, idx: number) => {
              const globalIndex = pageIndex * TRIVIAS_PER_PAGE + idx + 1;
              const totalVotes = typeof q.totalVotes === 'number' ? q.totalVotes : 0;
              const imgUrl = q.imageUrl || DEFAULT_IMAGES[idx % DEFAULT_IMAGES.length];
              const opts = Array.isArray(q.options) ? q.options : [];
              
              const optA = opts[0] || { text: 'SÍ', count: 0, percentage: 0 };
              const optB = opts[1] || { text: 'NO', count: 0, percentage: 0 };

              const pctA = typeof optA.percentage === 'number' ? optA.percentage : 0;
              const pctB = typeof optB.percentage === 'number' ? optB.percentage : 0;

              const barWidthA = totalVotes > 0 ? pctA : 50;
              const barWidthB = totalVotes > 0 ? pctB : 50;

              return (
                <div
                  key={q.id || idx}
                  className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between gap-4 shadow-xl transition-all hover:border-slate-700"
                >
                  {/* Badge con Círculo Numérico + Imagen/Flyer Miniatura */}
                  <div className="flex items-center gap-3 relative">
                    <span className="h-9 w-9 rounded-full bg-amber-500 text-slate-950 font-black text-lg flex items-center justify-center shadow-md font-mono z-10">
                      {globalIndex}
                    </span>
                    <div className="w-24 h-16 rounded-xl overflow-hidden border border-slate-700 shadow-inner bg-slate-950 relative">
                      <img 
                        src={imgUrl} 
                        alt="Trivia Flyer" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  </div>

                  {/* Contenido Central: Título de Trivia + recuento de votos + Barra Versus Dual (Verde/Rojo) */}
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-black tracking-wide uppercase text-white leading-tight">
                        {q.questionText}
                      </h3>
                      <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {totalVotes} VOTOS
                      </span>
                    </div>

                    {/* Barra de Porcentaje Versus Dual (Lado Verde Sí vs Lado Rojo No) */}
                    <div className="flex items-center gap-3 mt-1">
                      {/* Lado Verde */}
                      <div className="flex-1 flex flex-col gap-1">
                        <div className="flex justify-between items-center text-xs font-black">
                          <span className="text-emerald-400 uppercase tracking-wider">{optA.text} {pctA}%</span>
                        </div>
                        <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden p-0.5 border border-emerald-950">
                          <div 
                            className="bg-emerald-500 h-full rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                            style={{ width: `${barWidthA}%` }}
                          />
                        </div>
                      </div>

                      {/* Lado Rojo */}
                      <div className="flex-1 flex flex-col gap-1">
                        <div className="flex justify-end items-center text-xs font-black">
                          <span className="text-red-400 uppercase tracking-wider">{optB.text} {pctB}%</span>
                        </div>
                        <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden p-0.5 border border-red-950">
                          <div 
                            className="bg-red-500 h-full rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(239,68,68,0.5)] float-right" 
                            style={{ width: `${barWidthB}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Badge de Recompensa de Puntos a la Derecha */}
                  <div className="bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-xl font-mono font-black text-amber-400 text-sm whitespace-nowrap">
                    +{q.pointsReward || 150} PTS
                  </div>
                </div>
              );
            })
          ) : (
            // Si no hay trivias activas, mostrar mensaje de espera elegante
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 border-2 border-dashed border-slate-800 rounded-2xl py-12">
              <p className="text-lg font-bold">Esperando la próxima jugada del partido...</p>
              <p className="text-xs mt-1 text-slate-400">Escaneá el código QR a la izquierda para sumarte a la jugada.</p>
            </div>
          )}
        </div>

        {/* Paginador Inferior (< 1 / 3 >) */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 py-2 border-t border-slate-850">
            <button 
              onClick={() => setPageIndex((prev) => (prev > 0 ? prev - 1 : totalPages - 1))}
              className="h-8 w-8 rounded-full bg-slate-800 hover:bg-amber-500 hover:text-slate-950 flex items-center justify-center font-bold text-sm transition-all"
            >
              &lt;
            </button>
            <span className="text-xs font-mono font-bold text-slate-400">
              {pageIndex + 1} / {totalPages}
            </span>
            <button 
              onClick={() => setPageIndex((prev) => (prev + 1) % totalPages)}
              className="h-8 w-8 rounded-full bg-slate-800 hover:bg-amber-500 hover:text-slate-950 flex items-center justify-center font-bold text-sm transition-all"
            >
              &gt;
            </button>
          </div>
        )}

        {/* Footer Bar Informativo en la parte inferior */}
        <div className="flex justify-between items-center text-xs font-bold text-slate-400 pt-3 border-t border-slate-800">
          <span className="flex items-center gap-1.5">
            🎁 SUMÁ PUNTOS · GANÁ PREMIOS EN EL BAR
          </span>
          <span className="flex items-center gap-1.5">
            🍹 DISFRUTÁ EL PARTIDO · VIVÍ LA EXPERIENCIA
          </span>
        </div>

        {/* ⚡ OVERLAY POPUP TRIVIA FLASH (Neon Glow Overlay Flotante Destacado) */}
        {flashQuestion && flashRemainingSeconds > 0 && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in p-6">
            <div className="w-full max-w-xl bg-slate-900 border-4 border-amber-400 rounded-3xl p-6 shadow-[0_0_60px_rgba(251,191,36,0.8)] flex flex-col gap-5 relative animate-bounce-subtle">
              
              {/* Header Flotante del Popup: Trivia Flash ⚡ + Cuenta Regresiva (00:15) */}
              <div className="flex justify-between items-center">
                <span className="bg-amber-400 text-slate-950 px-4 py-1.5 rounded-full font-black text-sm uppercase tracking-widest shadow-md animate-pulse flex items-center gap-2">
                  ⚡ TRIVIA FLASH ⚡
                </span>
                <span className="bg-slate-950 text-amber-400 border border-amber-400/40 px-4 py-1 rounded-full font-mono font-black text-lg flex items-center gap-2 shadow-inner">
                  ⏱️ 00:{flashRemainingSeconds < 10 ? `0${flashRemainingSeconds}` : flashRemainingSeconds}
                </span>
              </div>

              {/* Título de la Trivia Flash */}
              <h2 className="text-2xl font-black text-center text-white tracking-wide uppercase leading-snug">
                {flashQuestion.questionText}
              </h2>

              {/* Opciones con Escudos/Logos y Porcentajes Versus */}
              {Array.isArray(flashQuestion.options) && (
                <div className="grid grid-cols-2 gap-4 my-2">
                  {flashQuestion.options.map((opt: any) => {
                    const pct = typeof opt.percentage === 'number' ? opt.percentage : 0;
                    return (
                      <div 
                        key={opt.id} 
                        className="bg-slate-950 p-4 rounded-2xl border border-slate-700 flex flex-col justify-between items-center text-center gap-2 shadow-xl"
                      >
                        <span className="text-sm font-black text-slate-300 uppercase tracking-wider">{opt.text}</span>
                        <span className="text-3xl font-black font-mono text-amber-400">{pct}%</span>
                        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden p-0.5 border border-slate-800">
                          <div 
                            className="bg-amber-400 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${flashQuestion.totalVotes > 0 ? pct : 50}%` }} 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Footer del Popup: Votos Totales + Puntos Otorgados */}
              <div className="flex justify-between items-center border-t border-slate-800 pt-3 text-xs font-bold">
                <span className="text-slate-400 flex items-center gap-1 font-mono">
                  👥 {flashQuestion.totalVotes || 0} VOTOS
                </span>
                <span className="bg-amber-400 text-slate-950 font-black px-3.5 py-1 rounded-xl text-sm font-mono shadow">
                  +{flashQuestion.pointsReward || 900} PTS
                </span>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
