'use client';

import { useState } from 'react';
import { API_URL } from '@/config/api';

export function RewardValidator({
  barId,
  onRedeemedSuccess,
}: {
  barId: string;
  onRedeemedSuccess?: () => void;
}) {
  const [claimCode, setClaimCode] = useState('');
  const [redeemStatus, setRedeemStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isProcessingCode, setIsProcessingCode] = useState(false);

  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (claimCode.length !== 4) return;

    try {
      setIsProcessingCode(true);
      setRedeemStatus(null);

      const staffToken = typeof window !== 'undefined' ? localStorage.getItem(`pulsobet_staff_token:${barId}`) || '' : '';

      const res = await fetch(`${API_URL}/bar/rewards/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${staffToken}`,
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
        onRedeemedSuccess?.();
      }
    } catch (error) {
      setRedeemStatus({ success: false, message: 'Error de conexión con el servidor.' });
    } finally {
      setIsProcessingCode(false);
    }
  };

  return (
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

      {redeemStatus && (
        <div
          className={`mt-6 p-4 rounded-xl border font-medium text-sm text-center animate-fade-in ${
            redeemStatus.success ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'
          }`}
        >
          {redeemStatus.message}
        </div>
      )}
    </section>
  );
}
