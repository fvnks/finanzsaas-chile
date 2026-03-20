import React, { useState } from 'react';
import { User } from './types.ts';
import { ShieldAlert, LogIn, Building2, BarChart3, Landmark, ShieldCheck } from 'lucide-react';
import { API_URL } from './src/config.ts';
import MainLayout from './components/MainLayout.tsx';
import { CompanyProvider } from './components/CompanyContext.tsx';
import ClientPortal from './components/ClientPortal.tsx';

const TOKEN_STORAGE_KEY = 'token';
const USER_STORAGE_KEY = 'currentUser';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser) as User;
    } catch {
      localStorage.removeItem(USER_STORAGE_KEY);
      return null;
    }
  });
  const [error, setError] = useState('');

  const urlParams = new URLSearchParams(window.location.search);
  const portalToken = urlParams.get('portal');

  React.useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      const activeCompanyId = localStorage.getItem('activeCompanyId');
      const request = input instanceof Request ? input : null;
      const url = typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : request?.url || '';
      const headers = new Headers(init?.headers || request?.headers || undefined);

      if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      if (
        activeCompanyId &&
        url.startsWith(API_URL) &&
        !url.endsWith('/login') &&
        !url.includes('/portal/') &&
        !headers.has('x-company-id') &&
        !headers.has('active-company-id')
      ) {
        headers.set('x-company-id', activeCompanyId);
      }

      return originalFetch(input, {
        ...init,
        headers
      });
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

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
        const nextUser = {
          ...data,
          allowedSections: data.allowedSections || [],
          companies: data.companies || [],
          activeCompanyId: data.activeCompanyId
        };
        setUser(nextUser);
        if (data.token) {
          localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
        }
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
        setError('');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(`Connection error: ${err.message || 'Unknown error'}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem('activeCompanyId');
    setUser(null);
  };

  const refreshUser = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/users/${user.id}`);
      if (res.ok) {
        const updated = await res.json();
        const nextUser = {
          ...updated,
          allowedSections: updated.allowedSections || [],
          companies: updated.companies || []
        };
        setUser(nextUser);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  React.useEffect(() => {
    if (user) {
      refreshUser();
    }
  }, []);

  if (portalToken) {
    return <ClientPortal token={portalToken} />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[linear-gradient(135deg,#0b1220_0%,#0f172a_42%,#e8eef5_42%,#f4f7fb_100%)] p-4 md:p-6">
        <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_32px_80px_-34px_rgba(15,23,42,0.45)] lg:grid-cols-[1.15fr_0.85fr]">
          <section className="relative hidden overflow-hidden bg-[linear-gradient(160deg,#0b1220,#10233f_58%,#123154)] px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.20),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.18),transparent_26%)]" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
                <Building2 size={16} className="text-sky-300" />
                Plataforma financiera corporativa
              </div>
              <h1 className="mt-8 max-w-xl text-4xl font-semibold leading-tight">
                Control financiero y operativo con una vista clara para cada empresa.
              </h1>
              <p className="mt-4 max-w-lg text-base leading-7 text-slate-300">
                Unifica facturación, tesorería, inventario y seguimiento operativo en un mismo entorno de trabajo.
              </p>
            </div>

            <div className="relative z-10 mt-10 grid gap-4">
              <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-3xl border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Tesorería</p>
                      <p className="mt-2 text-2xl font-semibold text-white">Forecast y control</p>
                    </div>
                    <div className="rounded-2xl bg-sky-400/15 p-3 text-sky-300">
                      <BarChart3 size={22} />
                    </div>
                  </div>
                  <div className="mt-5 h-24 rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4">
                    <div className="flex h-full items-end gap-2">
                      <div className="w-full rounded-t-lg bg-sky-400/65" style={{ height: '38%' }} />
                      <div className="w-full rounded-t-lg bg-sky-400/65" style={{ height: '56%' }} />
                      <div className="w-full rounded-t-lg bg-sky-400/65" style={{ height: '48%' }} />
                      <div className="w-full rounded-t-lg bg-sky-400/65" style={{ height: '76%' }} />
                      <div className="w-full rounded-t-lg bg-sky-300" style={{ height: '64%' }} />
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-[#0f1d33] p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Control</p>
                      <p className="mt-2 text-lg font-semibold text-white">Entorno seguro</p>
                    </div>
                    <div className="rounded-2xl bg-emerald-400/15 p-3 text-emerald-300">
                      <ShieldCheck size={22} />
                    </div>
                  </div>
                  <div className="mt-5 space-y-3">
                    <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-slate-200">Acceso por empresa</div>
                    <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-slate-200">Trazabilidad operativa</div>
                    <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-slate-200">Visión consolidada</div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Operación</p>
                    <p className="mt-2 text-lg font-semibold text-white">Módulos integrados</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3 text-slate-200">
                    <Landmark size={22} />
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-4 text-slate-200">Facturación</div>
                  <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-4 text-slate-200">Inventario</div>
                  <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-4 text-slate-200">Proyectos</div>
                </div>
              </div>
            </div>
          </section>

          <section className="flex items-center justify-center bg-[#f4f7fb] px-6 py-10 md:px-10 lg:px-12">
            <div className="w-full max-w-md">
              <div className="mb-8">
                <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
                  <Building2 size={16} className="text-sky-700" />
                  Vertikal Finanzas
                </div>
                <h2 className="mt-6 text-3xl font-semibold tracking-tight text-slate-900">Iniciar sesión</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Ingresa con tus credenciales corporativas para acceder al entorno operativo.
                </p>
              </div>

              {error && (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5 rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Email corporativo</label>
                  <input
                    type="email"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100"
                    placeholder="usuario@empresa.cl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Contraseña</label>
                  <input
                    type="password"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <LogIn size={18} />
                  Ingresar al sistema
                </button>
              </form>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 shrink-0 text-sky-700" size={18} />
                  <p className="text-sm leading-6 text-slate-600">
                    Acceso restringido. El ingreso queda registrado para control interno y trazabilidad operativa.
                  </p>
                </div>
              </div>
            </div>
          </section>
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
