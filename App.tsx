
import React, { useState } from 'react';
import { User } from './types.ts';
import { ShieldAlert, LogIn, RefreshCcw } from 'lucide-react';
import { API_URL } from './src/config.ts';
import MainLayout from './components/MainLayout.tsx';
import { CompanyProvider } from './components/CompanyContext.tsx';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const email = (form[0] as HTMLInputElement).value;
    const password = (form[1] as HTMLInputElement).value;

    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (res.ok) {
        // Ensure allowedSections is present even if backend sends null
        setUser({
          ...data,
          allowedSections: data.allowedSections || [],
          companies: data.companies || [],
          activeCompanyId: data.activeCompanyId
        });
        setError('');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(`Connection error: ${err.message || 'Unknown error'}`);
    }
  };

  const handleLogout = () => setUser(null);

  const refreshUser = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/users/${user.id}`);
      if (res.ok) {
        const updated = await res.json();
        setUser({
          ...updated,
          allowedSections: updated.allowedSections || [],
          companies: updated.companies || []
        });
      }
    } catch (err) {
      console.error("Failed to refresh user:", err);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl w-full max-w-md border border-white/20 shadow-2xl animate-in fade-in zoom-in duration-500">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Vertikal Finanzas</h1>
            <p className="text-slate-400">Software de Gestión Tributaria</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Email Corporativo</label>
              <input type="email" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="usuario@empresa.cl" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Contraseña</label>
              <input type="password" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="••••••••" />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20 active:scale-95">
              <LogIn size={20} />
              <span>Ingresar al Sistema</span>
            </button>
          </form>

          <div className="mt-8 p-4 bg-blue-900/20 rounded-xl border border-blue-500/30 flex flex-col space-y-3">
            <div className="flex items-start space-x-3">
              <ShieldAlert className="text-blue-400 mt-1 flex-shrink-0" size={18} />
              <p className="text-xs text-blue-200 leading-relaxed">Acceso restringido. Credenciales registradas para auditoría fiscal.</p>
            </div>
            {/* Connection test logic omitted for brevity as it was debug only */}
          </div>
        </div>
      </div>
    );
  }

  return (
    <CompanyProvider user={user}>
      <MainLayout user={user} onLogout={handleLogout} onRefreshUser={refreshUser} />
    </CompanyProvider>
  );
};

export default App;
