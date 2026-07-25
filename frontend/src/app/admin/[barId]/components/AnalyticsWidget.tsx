'use client';

import { useState, useEffect } from 'react';
import { API_URL } from '@/config/api';

export function AnalyticsWidget({ barId, refreshKey = 0 }: { barId: string; refreshKey?: number }) {
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
              {analyticsData.metrics?.totalClaimsRedeemed || 0}
            </span>
            <span className="text-[10px] text-slate-500">Validados en barra por los mozos</span>
          </div>

          {/* Card 2: Jugadores Activos */}
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-700 flex flex-col justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Jugadores Participantes</span>
            <span className="text-4xl font-black text-white font-mono my-2">
              {analyticsData.metrics?.totalActivePlayers || 0}
            </span>
            <span className="text-[10px] text-slate-500">Clientes que enviaron al menos 1 pronóstico</span>
          </div>

          {/* Card 3: Top Premios y Exportación */}
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-700 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">Más Reclamados</span>
              <ul className="text-xs space-y-1">
                {analyticsData.metrics?.topRewards?.map((r: any, idx: number) => (
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
