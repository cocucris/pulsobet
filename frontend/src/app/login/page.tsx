'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/config/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setLoading(true);
      setErrorMessage(null);

      const res = await fetch(`${API_URL}/auth/staff/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message || 'Credenciales inválidas. Verificá tu correo y contraseña.');
        return;
      }

      // Guardamos el token de staff y la información del bar asociado
      localStorage.setItem('pulsobet_staff_token', data.access_token);

      // Decodificamos o redirigimos a la consola del bar correspondiente
      // En producción, el payload del JWT o la respuesta incluye el barId
      const barId = data.barId || 'local-demo';
      router.push(`/admin/${barId}`);
    } catch (error) {
      setErrorMessage('Error de conexión con el servidor de autenticación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 text-white font-sans">
      <div className="w-full max-w-md bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-black text-amber-500 tracking-wider">PULSOBET</h1>
          <p className="text-xs text-slate-400 font-semibold mt-1 uppercase tracking-widest">
            Portal de Administración B2B
          </p>
        </header>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="gerente@kilkenny.com.py"
              className="w-full px-4 py-3.5 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 text-sm font-medium transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3.5 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 text-sm font-medium transition-colors"
            />
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl font-medium text-center">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 text-slate-950 font-black rounded-xl transition-all shadow-lg active:scale-98 uppercase text-sm tracking-wider mt-2"
          >
            {loading ? 'AUTENTICANDO...' : 'Iniciar Sesión'}
          </button>
        </form>

        <footer className="mt-8 text-center text-xs text-slate-600">
          <p>PulsoBet Platform v1.0 • Acceso Exclusivo Locales Adheridos</p>
        </footer>
      </div>
    </main>
  );
}
