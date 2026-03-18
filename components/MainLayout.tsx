
import React, { useState } from 'react';
import Sidebar from './Sidebar.tsx';
import Dashboard from '../pages/Dashboard.tsx';
import InvoicesPage from '../pages/InvoicesPage.tsx';
import ClientsPage from '../pages/ClientsPage.tsx';
import ProjectsPage from '../pages/ProjectsPage.tsx';
import ReportsPage from '../pages/ReportsPage.tsx';
import CostCentersPage from '../pages/CostCentersPage.tsx';
import WorkersPage from '../pages/WorkersPage.tsx';
import AdminPage from '../pages/AdminPage.tsx';
import DailyReportsPage from '../pages/DailyReportsPage.tsx';
import { User, UserRole, Client, Invoice, Project, CostCenter, InvoiceType, Worker, Crew, JobTitle, DailyReport, Plan, Supplier, Expense, Tool, Epp, EppDelivery, ToolAssignment } from '../types.ts';
import ExpensesPage from '../pages/ExpensesPage';
import { PurchaseOrdersPage } from '../pages/PurchaseOrdersPage';
import { DocumentsPage } from '../pages/DocumentsPage';
import { DocControlPage } from '../pages/DocControlPage';
import { InventoryPage } from '../pages/InventoryPage';
import { PlanosPage } from '../pages/PlanosPage';
import SuppliersPage from '../pages/SuppliersPage';
import ToolsPage from '../pages/ToolsPage';
import DeliveriesPage from '../pages/DeliveriesPage';
import CrmPage from '../pages/CrmPage.tsx';
import ProductsPage from '../pages/ProductsPage.tsx';
import WarehousesPage from '../pages/WarehousesPage.tsx';
import BankAccountsPage from '../pages/BankAccountsPage.tsx';
import CashFlowPage from '../pages/CashFlowPage.tsx';

import { API_URL } from '../src/config.ts';
import { useCompany } from './CompanyContext';

interface MainLayoutProps {
    user: User;
    onLogout: () => void;
    onRefreshUser?: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ user, onLogout, onRefreshUser }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const { activeCompany } = useCompany();

    React.useEffect(() => {
        if (activeCompany?.primaryColor) {
            document.documentElement.style.setProperty('--primary-color', activeCompany.primaryColor);
        } else {
            document.documentElement.style.setProperty('--primary-color', '#2563eb');
        }
    }, [activeCompany]);

    // Estados iniciales de datos
    const [clients, setClients] = useState<Client[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [crews, setCrews] = useState<Crew[]>([]);
    const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
    const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [tools, setTools] = useState<Tool[]>([]);
    const [epps, setEpps] = useState<Epp[]>([]);
    const [eppDeliveries, setEppDeliveries] = useState<EppDelivery[]>([]);
    const [toolAssignments, setToolAssignments] = useState<ToolAssignment[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const getHeaders = () => {
        return {
            'Content-Type': 'application/json',
            'x-company-id': activeCompany?.id || ''
        };
    };

    const refreshData = async () => {
        if (!user || !activeCompany) return;
        setLoading(true);
        try {
            const headers = { 'x-company-id': activeCompany.id };

            const [resClients, resProjs, resInvoices, resCosts, resWorkers, resCrews, resJobTitles, resDailyReports, resUsers, resSuppliers, resExpenses, resTools] = await Promise.all([
                fetch(`${API_URL}/clients`, { headers }).then(res => res.json()),
                fetch(`${API_URL}/projects`, { headers }).then(res => res.json()),
                fetch(`${API_URL}/invoices`, { headers }).then(res => res.json()),
                fetch(`${API_URL}/cost-centers`, { headers }).then(res => res.json()),
                fetch(`${API_URL}/workers`, { headers }).then(res => res.json()),
                fetch(`${API_URL}/crews`, { headers }).then(res => res.json()),
                fetch(`${API_URL}/job-titles`, { headers }).then(res => res.json()),
                fetch(`${API_URL}/daily-reports`, { headers }).then(res => res.json()),
                fetch(`${API_URL}/users`, { headers }).then(res => res.json()),
                fetch(`${API_URL}/suppliers`, { headers }).then(res => res.json()),
                fetch(`${API_URL}/expenses`, { headers }).then(res => res.json()),
                fetch(`${API_URL}/tools`, { headers }).then(res => res.json()),
                fetch(`${API_URL}/epp`, { headers }).then(res => res.json()),
                fetch(`${API_URL}/epp-deliveries`, { headers }).then(res => res.json()),
                fetch(`${API_URL}/tool-assignments`, { headers }).then(res => res.json())
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
            setSuppliers(Array.isArray(resSuppliers) ? resSuppliers : []);
            setExpenses(Array.isArray(resExpenses) ? resExpenses : []);
            setTools(Array.isArray(resTools) ? resTools : []);
            setEpps(Array.isArray(resTools[5]) ? resTools[5] : []); // Using indexed due to variable scope limits

            // Let's rely on the individual fetches below
            fetch(`${API_URL}/epp`, { headers }).then(res => res.json()).then(data => setEpps(Array.isArray(data) ? data : []));
            fetch(`${API_URL}/epp-deliveries`, { headers }).then(res => res.json()).then(data => setEppDeliveries(Array.isArray(data) ? data : []));
            fetch(`${API_URL}/tool-assignments`, { headers }).then(res => res.json()).then(data => setToolAssignments(Array.isArray(data) ? data : []));

        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        if (user && activeCompany) {
            refreshData();
        }
    }, [user, activeCompany]);

    return (
        <div className="flex min-h-screen bg-slate-50">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={onLogout} />
            <main className="flex-1 p-8 overflow-y-auto">
                {activeTab === 'dashboard' && <Dashboard invoices={invoices} clients={clients} />}
                {activeTab === 'invoices' && (
                    <InvoicesPage invoices={invoices} clients={clients} suppliers={suppliers} costCenters={costCenters} projects={projects} currentUser={user}
                        onAddSupplier={async (sup) => {
                            try {
                                const res = await fetch(`${API_URL}/suppliers`, {
                                    method: 'POST',
                                    headers: getHeaders(),
                                    body: JSON.stringify(sup)
                                });
                                if (res.ok) {
                                    const saved = await res.json();
                                    setSuppliers([saved, ...suppliers]);
                                    return saved;
                                }
                            } catch (err) { console.error("Failed to add supplier", err); }
                        }}
                        onAdd={async (inv) => {
                            try {
                                const res = await fetch(`${API_URL}/invoices`, {
                                    method: 'POST',
                                    headers: getHeaders(),
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

                                    // If it's a Credit Note, update the related invoice status in local state IF requested
                                    if (normalized.type === 'NOTA_CREDITO' && normalized.relatedInvoiceId && (inv as any).annulInvoice !== false) {
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
                        onUpdate={async (inv) => {
                            try {
                                const res = await fetch(`${API_URL}/invoices/${inv.id}`, {
                                    method: 'PUT',
                                    headers: getHeaders(),
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
                                    setInvoices(prev => prev.map(item => item.id === normalized.id ? normalized : item));
                                }
                            } catch (err) { console.error("Failed to update invoice", err); }
                        }}
                        onDelete={async (id) => {
                            try {
                                const res = await fetch(`${API_URL}/invoices/${id}`, { method: 'DELETE', headers: getHeaders() });
                                if (res.ok) {
                                    setInvoices(invoices.filter(i => i.id !== id));
                                }
                            } catch (err) { console.error("Failed to delete invoice", err); }
                        }}
                    />
                )}

                {activeTab === 'expenses' && (
                    <ExpensesPage
                        expenses={expenses}
                        projects={projects}
                        costCenters={costCenters}
                        workers={workers}
                        currentUser={user}
                        onAdd={async (exp) => {
                            try {
                                const res = await fetch(`${API_URL}/expenses`, {
                                    method: 'POST',
                                    headers: getHeaders(),
                                    body: JSON.stringify(exp)
                                });
                                if (res.ok) {
                                    const saved = await res.json();
                                    setExpenses([saved, ...expenses]);
                                }
                            } catch (err) { console.error("Failed to add expense", err); }
                        }}
                        onUpdate={async (updated) => {
                            try {
                                const res = await fetch(`${API_URL}/expenses/${updated.id}`, {
                                    method: 'PUT',
                                    headers: getHeaders(),
                                    body: JSON.stringify(updated)
                                });
                                if (res.ok) {
                                    const saved = await res.json();
                                    setExpenses(expenses.map(e => e.id === saved.id ? saved : e));
                                }
                            } catch (err) { console.error("Failed to update expense", err); }
                        }}
                        onDelete={async (id) => {
                            try {
                                const res = await fetch(`${API_URL}/expenses/${id}`, { method: 'DELETE', headers: getHeaders() });
                                if (res.ok) {
                                    setExpenses(expenses.filter(e => e.id !== id));
                                }
                            } catch (err) { console.error("Failed to delete expense", err); }
                        }}
                    />
                )}

                {activeTab === 'docControl' && <DocControlPage clients={clients} />}
                {activeTab === 'planos' && <PlanosPage projects={projects} currentUser={user} />}
                {activeTab === 'deliveries' && (
                    <DeliveriesPage
                        epps={epps}
                        eppDeliveries={eppDeliveries}
                        toolAssignments={toolAssignments}
                        tools={tools}
                        workers={workers}
                        currentUser={user}
                        refreshData={refreshData}
                    />
                )}
                {activeTab === 'tools' && (
                    <ToolsPage
                        tools={tools}
                        currentUser={user}
                        onAddTool={async (tool) => {
                            try {
                                const res = await fetch(`${API_URL}/tools`, {
                                    method: 'POST',
                                    headers: getHeaders(),
                                    body: JSON.stringify(tool)
                                });
                                if (res.ok) {
                                    const saved = await res.json();
                                    setTools([saved, ...tools].sort((a, b) => a.name.localeCompare(b.name)));
                                }
                            } catch (err) { console.error("Failed to add tool", err); }
                        }}
                        onUpdateTool={async (tool) => {
                            try {
                                const res = await fetch(`${API_URL}/tools/${tool.id}`, {
                                    method: 'PUT',
                                    headers: getHeaders(),
                                    body: JSON.stringify(tool)
                                });
                                if (res.ok) {
                                    const updated = await res.json();
                                    setTools(tools.map(t => t.id === updated.id ? updated : t));
                                }
                            } catch (err) { console.error("Failed to update tool", err); }
                        }}
                        onDeleteTool={async (id) => {
                            try {
                                const res = await fetch(`${API_URL}/tools/${id}`, { method: 'DELETE', headers: getHeaders() });
                                if (res.ok) {
                                    setTools(tools.filter(t => t.id !== id));
                                }
                            } catch (err) { console.error("Failed to delete tool", err); }
                        }}
                        onAddMaintenance={async (toolId, maintenance) => {
                            try {
                                const res = await fetch(`${API_URL}/tools/${toolId}/maintenance`, {
                                    method: 'POST',
                                    headers: getHeaders(),
                                    body: JSON.stringify(maintenance)
                                });
                                if (res.ok) {
                                    const data = await res.json();
                                    setTools(tools.map(t => t.id === data.tool.id ? data.tool : t));
                                }
                            } catch (err) { console.error("Failed to log maintenance", err); }
                        }}
                    />
                )}



                {activeTab === 'clients' && (
                    <ClientsPage
                        clients={clients}
                        suppliers={suppliers}
                        invoices={invoices}
                        costCenters={costCenters}
                        projects={projects}
                        currentUser={user}
                        onAdd={async (c) => {
                            try {
                                const res = await fetch(`${API_URL}/clients`, {
                                    method: 'POST',
                                    headers: getHeaders(),
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
                                const res = await fetch(`${API_URL}/clients/${u.id}`, {
                                    method: 'PUT',
                                    headers: getHeaders(),
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
                                const res = await fetch(`${API_URL}/clients/${id}`, { method: 'DELETE', headers: getHeaders() });
                                if (res.ok) {
                                    setClients(clients.filter(c => c.id !== id));
                                }
                            } catch (err) { console.error("Failed to delete client", err); }
                        }}
                        onAddSupplier={async (s) => {
                            try {
                                const res = await fetch(`${API_URL}/suppliers`, {
                                    method: 'POST',
                                    headers: getHeaders(),
                                    body: JSON.stringify(s)
                                });
                                if (res.ok) {
                                    const saved = await res.json();
                                    setSuppliers([saved, ...suppliers]);
                                }
                            } catch (err) { console.error("Failed to add supplier", err); }
                        }}
                        onUpdateSupplier={async (u) => {
                            try {
                                const res = await fetch(`${API_URL}/suppliers/${u.id}`, {
                                    method: 'PUT',
                                    headers: getHeaders(),
                                    body: JSON.stringify(u)
                                });
                                if (res.ok) {
                                    setSuppliers(suppliers.map(s => s.id === u.id ? { ...s, ...u } : s));
                                }
                            } catch (err) { console.error("Failed to update supplier", err); }
                        }}
                        onDeleteSupplier={async (id) => {
                            try {
                                const res = await fetch(`${API_URL}/suppliers/${id}`, { method: 'DELETE', headers: getHeaders() });
                                if (res.ok) {
                                    setSuppliers(suppliers.filter(s => s.id !== id));
                                }
                            } catch (err) { console.error("Failed to delete supplier", err); }
                        }}
                    />
                )}

                {activeTab === 'suppliers' && <SuppliersPage suppliers={suppliers} onUpdate={async (u) => {
                    try {
                        const res = await fetch(`${API_URL}/suppliers/${u.id}`, {
                            method: 'PUT',
                            headers: getHeaders(),
                            body: JSON.stringify(u)
                        });
                        if (res.ok) {
                            setSuppliers(suppliers.map(s => s.id === u.id ? { ...s, ...u } : s));
                        }
                    } catch (err) { console.error("Failed to update supplier", err); }
                }}
                    onDelete={async (id) => {
                        try {
                            const res = await fetch(`${API_URL}/suppliers/${id}`, { method: 'DELETE', headers: getHeaders() });
                            if (res.ok) {
                                setSuppliers(suppliers.filter(s => s.id !== id));
                            }
                        } catch (err) { console.error("Failed to delete supplier", err); }
                    }}
                    onAdd={async (s) => {
                        try {
                            const res = await fetch(`${API_URL}/suppliers`, {
                                method: 'POST',
                                headers: getHeaders(),
                                body: JSON.stringify(s)
                            });
                            if (res.ok) {
                                const saved = await res.json();
                                setSuppliers([saved, ...suppliers]);
                            }
                        } catch (err) { console.error("Failed to add supplier", err); }
                    }}
                />}

                {activeTab === 'projects' && (
                    <ProjectsPage
                        projects={projects}
                        workers={workers}
                        invoices={invoices}
                        costCenters={costCenters}
                        dailyReports={dailyReports}
                        users={allUsers}
                        currentUser={user}
                        onAdd={async (proj) => {
                            try {
                                const res = await fetch(`${API_URL}/projects`, {
                                    method: 'POST',
                                    headers: getHeaders(),
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
                                    headers: getHeaders(),
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
                                const res = await fetch(`${API_URL}/projects/${id}`, { method: 'DELETE', headers: getHeaders() });
                                if (res.ok) {
                                    setProjects(projects.filter(p => p.id !== id));
                                }
                            } catch (err) { console.error(err); }
                        }}
                    />
                )}
                {activeTab === 'workers' && (
                    <WorkersPage workers={workers} crews={crews} projects={projects} jobTitles={jobTitles} currentUser={user}
                        onAddWorker={async (w) => {
                            try {
                                const res = await fetch(`${API_URL}/workers`, {
                                    method: 'POST',
                                    headers: getHeaders(),
                                    body: JSON.stringify(w)
                                });
                                const saved = await res.json();
                                setWorkers([saved, ...workers]);
                            } catch (e) { console.error(e); }
                        }}
                        onUpdateWorker={async (u) => {
                            try {
                                await fetch(`${API_URL}/workers/${u.id}`, {
                                    method: 'PUT',
                                    headers: getHeaders(),
                                    body: JSON.stringify(u)
                                });
                                setWorkers(workers.map(w => w.id === u.id ? u : w));
                            } catch (e) { console.error(e); }
                        }}
                        onDeleteWorker={async (id) => {
                            try {
                                await fetch(`${API_URL}/workers/${id}`, { method: 'DELETE', headers: getHeaders() });
                                setWorkers(workers.filter(w => w.id !== id));
                            } catch (e) { console.error(e); }
                        }}
                        onAddCrew={async (c) => {
                            try {
                                const res = await fetch(`${API_URL}/crews`, {
                                    method: 'POST',
                                    headers: getHeaders(),
                                    body: JSON.stringify(c)
                                });
                                const saved = await res.json();
                                setCrews([saved, ...crews]);
                            } catch (e) { console.error(e); }
                        }}
                        onUpdateCrew={async (u) => {
                            try {
                                await fetch(`${API_URL}/crews/${u.id}`, {
                                    method: 'PUT',
                                    headers: getHeaders(),
                                    body: JSON.stringify(u)
                                });
                                setCrews(crews.map(c => c.id === u.id ? u : c));
                            } catch (e) { console.error(e); }
                        }}
                        onDeleteCrew={async (id) => {
                            try {
                                await fetch(`${API_URL}/crews/${id}`, { method: 'DELETE', headers: getHeaders() });
                                setCrews(crews.filter(c => c.id !== id));
                            } catch (e) { console.error(e); }
                        }}
                    />
                )}

                {activeTab === 'costCenters' && (
                    <CostCentersPage costCenters={costCenters} invoices={invoices} projects={projects} clients={clients} currentUser={user}
                        onAdd={async (cc) => {
                            try {
                                const res = await fetch(`${API_URL}/cost-centers`, {
                                    method: 'POST',
                                    headers: getHeaders(),
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
                                    headers: getHeaders(),
                                    body: JSON.stringify(u)
                                });
                                setCostCenters(costCenters.map(c => c.id === u.id ? u : c));
                            } catch (e) { console.error(e); }
                        }}
                        onDelete={async (id) => {
                            try {
                                await fetch(`${API_URL}/cost-centers/${id}`, { method: 'DELETE', headers: getHeaders() });
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
                                    headers: getHeaders(),
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
                                await fetch(`${API_URL}/daily-reports/${id}`, { method: 'DELETE', headers: getHeaders() });
                                setDailyReports(dailyReports.filter(r => r.id !== id));
                            } catch (e) { console.error(e); }
                        }}
                    />
                )}
                {activeTab === 'financialReports' && (
                    <ReportsPage invoices={invoices} projects={projects} costCenters={costCenters} clients={clients} />
                )}
                {activeTab === 'crm' && <CrmPage currentUser={user} />}
                {activeTab === 'products' && <ProductsPage />}
                {activeTab === 'warehouses' && <WarehousesPage />}
                {activeTab === 'bankAccounts' && <BankAccountsPage />}
                {activeTab === 'cashFlow' && <CashFlowPage />}
                {activeTab === 'admin' && <AdminPage currentUser={user} projects={projects} onRefreshUser={onRefreshUser} />}
            </main>
        </div>
    );
};

export default MainLayout;
