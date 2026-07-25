'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { useSessionStore } from '@/store/useSessionStore';
import { ScoreBoardControl } from './components/ScoreBoardControl';
import { TriviaControl } from './components/TriviaControl';
import { RewardValidator } from './components/RewardValidator';
import { AnalyticsWidget } from './components/AnalyticsWidget';
import { API_URL } from '@/config/api';

export default function AdminBarPage() {
  const params = useParams();
  const barId = params.barId as string;

  const [refreshAnalyticsKey, setRefreshAnalyticsKey] = useState(0);

  // Conectar el admin a WebSockets (isAdmin = true)
  useSocket(barId, false, true);

  const isConnected = useSessionStore((s) => s.isConnected);

  useEffect(() => {
    // Hidratar snapshot inicial si no ha llegado por socket
    fetch(`${API_URL}/session/snapshot/${barId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          useSessionStore.getState().applySnapshot(data);
        }
      })
      .catch((e) => console.error('Error al cargar snapshot inicial:', e));
  }, [barId]);

  return (
    <main className="min-h-screen bg-slate-900 text-white p-6 font-sans">
      <header className="mb-8 max-w-5xl mx-auto flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-amber-500 tracking-wider">PULSOBET OPERACIONES</h1>
          <p className="text-xs opacity-70">Consola comercial del Local ID: {barId}</p>
        </div>
        <span
          className={`text-xs px-3 py-1 rounded-full font-mono font-bold border ${
            isConnected
              ? 'bg-green-500/20 text-green-400 border-green-500/30'
              : 'bg-red-500/20 text-red-400 border-red-500/30'
          }`}
        >
          {isConnected ? 'SISTEMA ONLINE' : 'RECONECTANDO'}
        </span>
      </header>

      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
        <RewardValidator barId={barId} onRedeemedSuccess={() => setRefreshAnalyticsKey((k) => k + 1)} />
        <TriviaControl barId={barId} />
      </div>

      <div className="max-w-5xl mx-auto mt-8">
        <ScoreBoardControl sessionId={barId} />
      </div>

      <div className="max-w-5xl mx-auto mt-8">
        <AnalyticsWidget barId={barId} refreshKey={refreshAnalyticsKey} />
      </div>
    </main>
  );
}
