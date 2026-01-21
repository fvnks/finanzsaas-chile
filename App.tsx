import React, { useState } from 'react';
import Sidebar from './components/Sidebar.tsx';
import Dashboard from './pages/Dashboard.tsx';
import InvoicesPage from './pages/InvoicesPage.tsx';
import ClientsPage from './pages/ClientsPage.tsx';
import ProjectsPage from './pages/ProjectsPage.tsx';
import ReportsPage from './pages/ReportsPage.tsx';
import CostCentersPage from './pages/CostCentersPage.tsx';
import WorkersPage from './pages/WorkersPage.tsx';
import AdminPage from './pages/AdminPage.tsx';
import DailyReportsPage from './pages/DailyReportsPage.tsx';
import { User, UserRole, Client, Invoice, Project, CostCenter, InvoiceType, Worker, Crew, JobTitle, DailyReport } from './types.ts';
import { ShieldAlert, LogIn, RefreshCcw } from 'lucide-react';
import { PurchaseOrdersPage } from './pages/PurchaseOrdersPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { InventoryPage } from './pages/InventoryPage';

import { API_URL } from './src/config.ts';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);

  // Estados iniciales de datos
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [crews, setCrews] = useState<Crew[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refreshData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [resClients, resProjs, resInvoices, resCosts, resWorkers, resCrews, resJobTitles, resDailyReports, resUsers] = await Promise.all([
        fetch(`${API_URL}/clients`).then(res => res.json()),
        fetch(`${API_URL}/projects`).then(res => res.json()),
        fetch(`${API_URL}/invoices`).then(res => res.json()),
        fetch(`${API_URL}/cost-centers`).then(res => res.json()),
        fetch(`${API_URL}/workers`).then(res => res.json()),
        fetch(`${API_URL}/crews`).then(res => res.json()),
        fetch(`${API_URL}/job-titles`).then(res => res.json()),
        fetch(`${API_URL}/daily-reports`).then(res => res.json()),
        fetch(`${API_URL}/users`).then(res => res.json())
      ]);
      setClients(Array.isArray(resClients) ? resClients : []);
      setProjects(Array.isArray(resProjs) ? resProjs : []);
      const normalizedInvoices: Invoice[] = Array.isArray(resInvoices) ? resInvoices.map((inv: any) => ({
        ...inv,
        net: inv.netAmount !== undefined ? inv.netAmount : inv.net,
        iva: inv.taxAmount !== undefined ? inv.taxAmount : inv.iva,
        total: inv.totalAmount !== undefined ? inv.totalAmount : inv.total,
        type: inv.type ? inv.type.toUpperCase() : 'DRAFT'
      })) : [];
      setInvoices(normalizedInvoices);
      setCostCenters(Array.isArray(resCosts) ? resCosts : []);
      setWorkers(Array.isArray(resWorkers) ? resWorkers : []);
      setCrews(Array.isArray(resCrews) ? resCrews : []);
      setJobTitles(Array.isArray(resJobTitles) ? resJobTitles : []);
      setDailyReports(Array.isArray(resDailyReports) ? resDailyReports : []);
      setAllUsers(Array.isArray(resUsers) ? resUsers : []);

    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user]);

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
        setUser(data);
        setError('');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  const handleLogout = () => setUser(null);

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

          <div className="mt-8 p-4 bg-blue-900/20 rounded-xl border border-blue-500/30 flex items-start space-x-3">
            <ShieldAlert className="text-blue-400 mt-1 flex-shrink-0" size={18} />
            <p className="text-xs text-blue-200 leading-relaxed">Acceso restringido. Credenciales registradas para auditoría fiscal.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={handleLogout} />
      <main className="flex-1 p-8 overflow-y-auto">
        {activeTab === 'dashboard' && <Dashboard invoices={invoices} clients={clients} />}
        {activeTab === 'invoices' && (
          <InvoicesPage invoices={invoices} clients={clients} costCenters={costCenters} projects={projects}
            onAdd={async (inv) => {
              try {
                const res = await fetch(`${API_URL}/invoices`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(inv)
                });
                if (res.ok) {
                  const saved = await res.json();
                  const normalized: Invoice = {
                    ...saved,
                    net: saved.netAmount,
                    iva: saved.taxAmount,
                    total: saved.totalAmount
                  };

                  // If it's a Credit Note, update the related invoice status in local state
                  if (normalized.type === 'NOTA_CREDITO' && normalized.relatedInvoiceId) {
                    setInvoices(prev => prev.map(inv => {
                      if (inv.id === normalized.relatedInvoiceId) {
                        return { ...inv, status: 'CANCELLED' };
                      }
                      return inv;
                    }));
                    // Add the new Credit Note
                    setInvoices(prev => [normalized, ...prev]);
                  } else {
                    setInvoices([normalized, ...invoices]);
                  }
                }
              } catch (err) { console.error("Failed to create invoice", err); }
            }}
            onDelete={async (id) => {
              try {
                const res = await fetch(`${API_URL}/invoices/${id}`, { method: 'DELETE' });
                if (res.ok) {
                  setInvoices(invoices.filter(i => i.id !== id));
                }
              } catch (err) { console.error("Failed to delete invoice", err); }
            }}
          />
        )}

        {activeTab === 'purchaseOrders' && <PurchaseOrdersPage />}
        {activeTab === 'documents' && <DocumentsPage />}
        {activeTab === 'inventory' && <InventoryPage />}

        {activeTab === 'clients' && (
          <ClientsPage clients={clients} invoices={invoices} costCenters={costCenters} projects={projects}
            onAdd={async (c) => {
              try {
                const res = await fetch(`${API_URL}/clients`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(c)
                });
                if (res.ok) {
                  const saved = await res.json();
                  setClients([saved, ...clients]);
                } else {
                  const errorData = await res.json();
                  alert(errorData.error || "Error al guardar el cliente");
                }
              } catch (err) {
                console.error("Failed to add client", err);
                alert("Error de conexión al guardar cliente");
              }
            }}
            onUpdate={async (u) => {
              try {
                // Backend doesn't have PUT /clients/:id in the snippet I saw? 
                // Wait, I need to check if PUT route exists in routes.ts!
                // I only checked POST. I will assume update needs to be added or matches.
                // Looking at routes.ts (Step 472), I saw GET and POST for clients. I did NOT see PUT or DELETE.
                // I must ADD PUT and DELETE to routes.ts as well.
                // For now, I will modify App.tsx to use them, and then I will immediately add them to routes.ts.
                const res = await fetch(`${API_URL}/clients/${u.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(u)
                });
                if (res.ok) {
                  setClients(clients.map(c => c.id === u.id ? { ...c, ...u } : c));
                  refreshData(); // Refresh to ensure sync
                }
              } catch (err) { console.error("Failed to update client", err); }
            }}
            onDelete={async (id) => {
              try {
                const res = await fetch(`${API_URL}/clients/${id}`, { method: 'DELETE' });
                if (res.ok) {
                  setClients(clients.filter(c => c.id !== id));
                }
              } catch (err) { console.error("Failed to delete client", err); }
            }}
          />
        )}
        {activeTab === 'projects' && (
          <ProjectsPage
            projects={projects}
            workers={workers}
            invoices={invoices}
            costCenters={costCenters}
            dailyReports={dailyReports}
            users={allUsers}
            onAdd={async (proj) => {
              try {
                const res = await fetch(`${API_URL}/projects`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(proj)
                });
                if (res.ok) {
                  const saved = await res.json();
                  setProjects([saved, ...projects]);
                }
              } catch (err) { console.error(err); }
            }}
            onEdit={async (proj) => {
              try {
                const res = await fetch(`${API_URL}/projects/${proj.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(proj)
                });
                if (res.ok) {
                  const updated = await res.json();
                  setProjects(projects.map(p => p.id === updated.id ? updated : p));
                }
              } catch (err) { console.error(err); }
            }}
            onDelete={async (id) => {
              try {
                const res = await fetch(`${API_URL}/projects/${id}`, { method: 'DELETE' });
                if (res.ok) {
                  setProjects(projects.filter(p => p.id !== id));
                }
              } catch (err) { console.error(err); }
            }}
          />
        )}
        {activeTab === 'workers' && (
          <WorkersPage workers={workers} crews={crews} projects={projects} jobTitles={jobTitles}
            onAddWorker={async (w) => {
              try {
                const res = await fetch(`${API_URL}/workers`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(w)
                });
                const saved = await res.json();
                setWorkers([saved, ...workers]);
              } catch (e) { console.error(e); }
            }}
            onUpdateWorker={(u) => setWorkers(workers.map(w => w.id === u.id ? u : w))}
            onDeleteWorker={(id) => setWorkers(workers.filter(w => w.id !== id))}
            onAddCrew={async (c) => {
              try {
                const res = await fetch(`${API_URL}/crews`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(c)
                });
                const saved = await res.json();
                setCrews([saved, ...crews]);
              } catch (e) { console.error(e); }
            }}
            onUpdateCrew={(u) => setCrews(crews.map(c => c.id === u.id ? u : c))}
            onDeleteCrew={(id) => setCrews(crews.filter(c => c.id !== id))}
          />
        )}

        {activeTab === 'costCenters' && (
          <CostCentersPage costCenters={costCenters} invoices={invoices} projects={projects} clients={clients}
            onAdd={async (cc) => {
              try {
                const res = await fetch(`${API_URL}/cost-centers`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(cc)
                });
                if (res.ok) {
                  const saved = await res.json();
                  setCostCenters([saved, ...costCenters]);
                }
              } catch (e) { console.error(e); }
            }}
            onUpdate={async (u) => {
              try {
                await fetch(`${API_URL}/cost-centers/${u.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(u)
                });
                setCostCenters(costCenters.map(c => c.id === u.id ? u : c));
              } catch (e) { console.error(e); }
            }}
            onDelete={async (id) => {
              try {
                await fetch(`${API_URL}/cost-centers/${id}`, { method: 'DELETE' });
                setCostCenters(costCenters.filter(c => c.id !== id));
              } catch (e) { console.error(e); }
            }}
          />
        )}

        {activeTab === 'reports' && (
          <DailyReportsPage
            reports={dailyReports}
            projects={projects}
            users={allUsers}
            currentUser={user}
            onAdd={async (r) => {
              try {
                const res = await fetch(`${API_URL}/daily-reports`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(r)
                });
                if (res.ok) {
                  const { report, updatedProject } = await res.json();
                  setDailyReports([report, ...dailyReports]);
                  if (updatedProject) {
                    setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
                  }
                }
              } catch (err) { console.error(err); }
            }}
            onDelete={async (id) => {
              try {
                await fetch(`${API_URL}/daily-reports/${id}`, { method: 'DELETE' });
                setDailyReports(dailyReports.filter(r => r.id !== id));
              } catch (e) { console.error(e); }
            }}
          />
        )}
        {activeTab === 'financialReports' && (
          <ReportsPage invoices={invoices} projects={projects} costCenters={costCenters} clients={clients} />
        )}
        {activeTab === 'admin' && <AdminPage currentUser={user} />}
      </main>
    </div>
  );
};

export default App;
