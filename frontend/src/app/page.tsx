'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0b0e] text-white flex flex-col items-center justify-center p-6 font-sans select-none relative overflow-hidden">
      
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Title */}
      <div className="flex flex-col items-center text-center mb-10 z-10">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">📈</span>
          <h1 className="text-5xl font-black text-amber-500 tracking-wider">PULSOBET</h1>
        </div>
        <p className="text-sm font-black uppercase tracking-widest text-slate-300">
          ¡Plataforma de Trivias Deportivas en Tiempo Real para Bares y Smart TVs!
        </p>
      </div>

      {/* Navigation Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full z-10">
        
        {/* Card 1: Jugador Celular */}
        <Link 
          href="/play/session-demo-01" 
          className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 p-6 rounded-3xl flex flex-col items-center text-center transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-amber-500/10 group"
        >
          <span className="text-5xl mb-4 group-hover:scale-110 transition-transform">📱</span>
          <h2 className="text-xl font-black text-amber-400 mb-1">Móvil Jugador</h2>
          <p className="text-xs text-slate-400 mb-6">
            Escaneá el QR desde tu mesa, elegí tu apodo y votá en vivo.
          </p>
          <span className="mt-auto px-6 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider group-hover:bg-amber-400 transition-colors">
            Ingresar como Jugador
          </span>
        </Link>

        {/* Card 2: Pantalla Smart TV */}
        <Link 
          href="/tv/session-demo-01" 
          className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 p-6 rounded-3xl flex flex-col items-center text-center transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-amber-500/10 group"
        >
          <span className="text-5xl mb-4 group-hover:scale-110 transition-transform">📺</span>
          <h2 className="text-xl font-black text-amber-400 mb-1">Pantalla Smart TV</h2>
          <p className="text-xs text-slate-400 mb-6">
            Visualizador público con QR, trivias en vivo y Leaderboard.
          </p>
          <span className="mt-auto px-6 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-black text-xs uppercase tracking-wider group-hover:bg-slate-700 transition-colors">
            Abrir Pantalla TV
          </span>
        </Link>

        {/* Card 3: Dashboard Admin */}
        <Link 
          href="/admin/local-kilkenny-test" 
          className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 p-6 rounded-3xl flex flex-col items-center text-center transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-amber-500/10 group"
        >
          <span className="text-5xl mb-4 group-hover:scale-110 transition-transform">🎛️</span>
          <h2 className="text-xl font-black text-amber-400 mb-1">Panel de Admin</h2>
          <p className="text-xs text-slate-400 mb-6">
            Lanzá trivias flash, resolvé ganadores y validá canjes de premios.
          </p>
          <span className="mt-auto px-6 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-black text-xs uppercase tracking-wider group-hover:bg-slate-700 transition-colors">
            Ir al Dashboard Admin
          </span>
        </Link>

      </div>

      {/* Footer */}
      <footer className="mt-12 text-xs text-slate-500 font-mono z-10">
        PULSOBET v1.0 • Powered by NestJS + Next.js + Socket.io
      </footer>

    </main>
  );
}
