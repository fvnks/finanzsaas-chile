import React, { useState, useEffect } from 'react';
import {
    Users,
    Shield,
    Trash2,
    Edit2,
    Plus,
    Save,
    X,
    Lock,
    UserPlus,
    Briefcase,
    CheckCircle,
    AlertCircle,
    Building,
    Database,
    Download,
    CreditCard,
    Check
} from 'lucide-react';
import { User, UserRole, Company, SubscriptionPlan } from '../types';

import { API_URL } from '../src/config.ts';

interface JobTitle {
    id: string;
    name: string;
    description?: string;
}

interface AdminPageProps {
    currentUser: User | null;
    projects: any[]; // Or proper type
    onRefreshUser?: () => void;
}

const MODULE_OPTIONS = [
    { id: 'INVOICING', label: 'Facturación' },
    { id: 'PROJECTS', label: 'Proyectos' },
    { id: 'INVENTORY', label: 'Inventario' },
    { id: 'TOOLS', label: 'Herramientas' },
    { id: 'HR', label: 'RRHH' },
    { id: 'CRM', label: 'CRM y Cotizaciones' }
];

const PLAN_STATUS_OPTIONS = [
    { id: 'ACTIVE', label: 'Activa' },
    { id: 'TRIAL', label: 'Trial' },
    { id: 'SUSPENDED', label: 'Suspendida' }
];

const AdminPage: React.FC<AdminPageProps> = ({ currentUser, projects, onRefreshUser }) => {
    const [activeTab, setActiveTab] = useState<'USERS' | 'ROLES' | 'COMPANIES' | 'BACKUPS' | 'PLANS'>('USERS');
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<JobTitle[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [backups, setBackups] = useState<any[]>([]);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(false);

    // Define available sections for permissions
    const availableSections = [
        { id: 'clients', label: 'Clientes' },
        { id: 'projects', label: 'Proyectos' },
        { id: 'invoices', label: 'Facturas' },
        { id: 'purchaseOrders', label: 'Órdenes de Compra' },
        { id: 'documents', label: 'Documentos' },
        { id: 'inventory', label: 'Inventario' },
        { id: 'workers', label: 'Trabajadores' },
        { id: 'costCenters', label: 'Centros de Costo' },
        { id: 'reports', label: 'Reportes Diarios' },
        { id: 'financialReports', label: 'Reportes Financieros' },
        { id: 'planos', label: 'Planos y Cuelgues' },
    ];

    // User Form State
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userForm, setUserForm] = useState({
        name: '',
        email: '',
        password: '',
        role: 'USER',
        allowedSections: [] as string[],
        assignedProjectIds: [] as string[],
        companyIds: [] as string[]
    });

    // Company Form State
    const [companyForm, setCompanyForm] = useState({
        name: '',
        rut: '',
        logoUrl: '',
        planId: '',
        primaryColor: '',
        planStatus: 'ACTIVE',
        modules: [] as string[],
        subscriptionStartedAt: '',
        subscriptionEndsAt: '',
        billingCycleMonths: 1
    });
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);

    // Plan Form State
    const [planForm, setPlanForm] = useState({
        name: '',
        price: 0,
        description: '',
        features: [] as string[],
        modules: [] as string[],
        maxUsers: 5,
        maxStorageGB: 5
    });
    const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

    // Role Form State
    const [roleForm, setRoleForm] = useState({ name: '', description: '' });

    const getHeaders = () => ({
        'Content-Type': 'application/json',
        'x-user-id': currentUser?.id || ''
    });

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const applyPlanToCompanyForm = (planId: string) => {
        const selectedPlan = plans.find(plan => plan.id === planId);
        setCompanyForm(prev => ({
            ...prev,
            planId,
            modules: selectedPlan?.modules || []
        }));
    };

    const getModuleLabel = (moduleId: string) => {
        return MODULE_OPTIONS.find(option => option.id === moduleId)?.label || moduleId;
    };

    const now = new Date();
    const expiringSoonCompanies = companies.filter(company => {
        if (!company.subscriptionEndsAt) return false;
        const endDate = new Date(company.subscriptionEndsAt);
        const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 7 && company.planStatus !== 'SUSPENDED';
    });
    const expiredCompanies = companies.filter(company => {
        if (!company.subscriptionEndsAt) return false;
        return new Date(company.subscriptionEndsAt) < now || company.planStatus === 'SUSPENDED';
    });

    const handleRenewCompany = async (companyId: string, months = 1) => {
        try {
            const res = await fetch(`${API_URL}/companies/${companyId}/renew`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ months })
            });

            if (res.ok) {
                const renewed = await res.json();
                setCompanies(prev => prev.map(company => company.id === renewed.id ? renewed : company));
            }
        } catch (error) {
            console.error("Error renewing company subscription:", error);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'USERS') {
                const res = await fetch(`${API_URL}/users`, { headers: getHeaders() });
                const data = await res.json();
                setUsers(Array.isArray(data) ? data : []);
            } else if (activeTab === 'ROLES') {
                const res = await fetch(`${API_URL}/job-titles`, { headers: getHeaders() });
                const data = await res.json();
                setRoles(Array.isArray(data) ? data : []);
            } else if (activeTab === 'COMPANIES') {
                const res = await fetch(`${API_URL}/companies`, { headers: getHeaders() });
                const data = await res.json();
                setCompanies(Array.isArray(data) ? data : []);
            } else if (activeTab === 'BACKUPS') {
                const res = await fetch(`${API_URL}/backups`, { headers: getHeaders() });
                const data = await res.json();
                setBackups(Array.isArray(data) ? data : []);
            } else if (activeTab === 'PLANS') {
                const res = await fetch(`${API_URL}/plans`, { headers: getHeaders() });
                const data = await res.json();
                setPlans(Array.isArray(data) ? data : []);
            }

            // Always fetch companies for User modal if not already fetched
            if ((activeTab === 'USERS' || activeTab === 'COMPANIES') && companies.length === 0) {
                const res = await fetch(`${API_URL}/companies`, { headers: getHeaders() });
                const data = await res.json();
                setCompanies(Array.isArray(data) ? data : []);
            }
            // Always fetch plans for Companies if needed
            if (activeTab === 'COMPANIES' && plans.length === 0) {
                const res = await fetch(`${API_URL}/plans`, { headers: getHeaders() });
                const data = await res.json();
                setPlans(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("Error fetching admin data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUserSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingUser) {
                // Edit existing user
                const res = await fetch(`${API_URL}/users/${editingUser.id}`, {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify(userForm)
                });
                if (res.ok) {
                    const updated = await res.json();
                    setUsers(users.map(u => u.id === updated.id ? updated : u));
                }
            } else {
                // Create new user
                const res = await fetch(`${API_URL}/users`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(userForm)
                });
                if (res.ok) {
                    const created = await res.json();
                    setUsers([created, ...users]);
                }
            }
            setShowUserModal(false);
        } catch (err) {
            console.error("Error saving user:", err);
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
        try {
            await fetch(`${API_URL}/users/${id}`, { method: 'DELETE', headers: getHeaders() });
            setUsers(users.filter(u => u.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    const handleRoleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!roleForm.name) return;
        try {
            const res = await fetch(`${API_URL}/job-titles`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(roleForm)
            });
            if (res.ok) {
                const newRole = await res.json();
                setRoles([newRole, ...roles]);
                setRoleForm({ name: '', description: '' });
            }
        } catch (err) {
            console.error("Error creating role:", err);
        }
    };

    const handleDeleteRole = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este cargo?')) return;
        try {
            await fetch(`${API_URL}/job-titles/${id}`, { method: 'DELETE', headers: getHeaders() });
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleCompanySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCompany) {
                const res = await fetch(`${API_URL}/companies/${editingCompany.id}`, {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify(companyForm)
                });
                if (res.ok) {
                    const updated = await res.json();
                    setCompanies(companies.map(c => c.id === updated.id ? updated : c));
                    setEditingCompany(null);
                    setCompanyForm({ name: '', rut: '', logoUrl: '', planId: '', primaryColor: '', planStatus: 'ACTIVE', modules: [], subscriptionStartedAt: '', subscriptionEndsAt: '', billingCycleMonths: 1 });
                }
            } else {
                const res = await fetch(`${API_URL}/companies`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({
                        ...companyForm,
                        creatorId: currentUser?.id
                    })
                });
                if (res.ok) {
                    const created = await res.json();
                    setCompanies([...companies, created]);
                    setCompanyForm({ name: '', rut: '', logoUrl: '', planId: '', primaryColor: '', planStatus: 'ACTIVE', modules: [], subscriptionStartedAt: '', subscriptionEndsAt: '', billingCycleMonths: 1 });
                    if (onRefreshUser) onRefreshUser();
                }
            }
        } catch (err) {
            console.error("Error creating/updating company:", err);
        }
    };

    const handleDeleteCompany = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta empresa? Esto podría afectar datos vinculados.')) return;
        try {
            await fetch(`${API_URL}/companies/${id}`, { method: 'DELETE', headers: getHeaders() });
            setCompanies(companies.filter(c => c.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    const startEditCompany = (company: Company) => {
        setEditingCompany(company);
        setCompanyForm({ 
            name: company.name, 
            rut: company.rut, 
            logoUrl: company.logoUrl || '', 
            planId: company.planId || '', 
            primaryColor: company.primaryColor || '',
            planStatus: company.planStatus || 'ACTIVE',
            modules: company.modules || [],
            subscriptionStartedAt: company.subscriptionStartedAt ? String(company.subscriptionStartedAt).slice(0, 10) : '',
            subscriptionEndsAt: company.subscriptionEndsAt ? String(company.subscriptionEndsAt).slice(0, 10) : '',
            billingCycleMonths: company.billingCycleMonths || 1
        });
    };

    const cancelEditCompany = () => {
        setEditingCompany(null);
        setCompanyForm({ name: '', rut: '', logoUrl: '', planId: '', primaryColor: '', planStatus: 'ACTIVE', modules: [], subscriptionStartedAt: '', subscriptionEndsAt: '', billingCycleMonths: 1 });
    };

    const openUserModal = (user?: User) => {
        if (user) {
            setEditingUser(user);
            setUserForm({
                name: user.name,
                email: user.email,
                password: '',
                role: user.role,
                allowedSections: user.allowedSections || [],
                assignedProjectIds: user.assignedProjectIds || [],
                companyIds: user.companies?.map(c => c.id) || []
            });
        } else {
            setEditingUser(null);
            setUserForm({
                name: '',
                email: '',
                password: '',
                role: 'USER',
                allowedSections: availableSections.map(s => s.id),
                assignedProjectIds: [],
                companyIds: []
            });
        }
        setShowUserModal(false); // Close first then open to reset? No, setState is enough.
        setShowUserModal(true);
    };

    const handleCreateBackup = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/backups`, { method: 'POST', headers: getHeaders() });
            if (res.ok) {
                fetchData();
            } else {
                alert('Failed to create backup');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteBackup = async (filename: string) => {
        if (!confirm('Are you sure you want to delete this backup?')) return;
        try {
            await fetch(`${API_URL}/backups/${filename}`, { method: 'DELETE', headers: getHeaders() });
            setBackups(backups.filter(b => b.name !== filename));
        } catch (err) {
            console.error(err);
        }
    };

    const handlePlanSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingPlan) {
                const res = await fetch(`${API_URL}/plans/${editingPlan.id}`, {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify({ ...planForm, price: Number(planForm.price) })
                });
                if (res.ok) {
                    const updated = await res.json();
                    setPlans(plans.map(p => p.id === updated.id ? updated : p));
                    setEditingPlan(null);
                    setPlanForm({ name: '', price: 0, description: '', features: [], modules: [], maxUsers: 5, maxStorageGB: 5 });
                }
            } else {
                const res = await fetch(`${API_URL}/plans`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({ ...planForm, price: Number(planForm.price) })
                });
                if (res.ok) {
                    const created = await res.json();
                    setPlans([...plans, created]);
                    setPlanForm({ name: '', price: 0, description: '', features: [], modules: [], maxUsers: 5, maxStorageGB: 5 });
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeletePlan = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este plan?')) return;
        try {
            await fetch(`${API_URL}/plans/${id}`, { method: 'DELETE', headers: getHeaders() });
            setPlans(plans.filter(p => p.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    const startEditPlan = (plan: SubscriptionPlan) => {
        setEditingPlan(plan);
        setPlanForm({
            name: plan.name,
            price: plan.price,
            description: plan.description || '',
            features: plan.features as string[] || [],
            modules: plan.modules || [],
            maxUsers: plan.maxUsers || 5,
            maxStorageGB: plan.maxStorageGB || 5
        });
    };

    if (currentUser?.role !== UserRole.ADMIN) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
                <Shield size={64} className="mb-4 text-slate-300" />
                <h2 className="text-xl font-black uppercase tracking-widest">Acceso Restringido</h2>
                <p className="text-sm font-medium">Se requieren privilegios de Administrador.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center">
                        <Shield className="mr-3 text-indigo-600" size={28} /> Panel de Administración
                    </h2>
                    <p className="text-slate-500 font-medium">Gestión de usuarios del sistema y configuración global.</p>
                </div>
                <div className="flex bg-slate-200 p-1 rounded-2xl">
                    <button
                        onClick={() => setActiveTab('USERS')}
                        className={`px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'USERS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Users size={14} /> USUARIOS
                    </button>
                    <button
                        onClick={() => setActiveTab('ROLES')}
                        className={`px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'ROLES' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Briefcase size={14} /> CARGOS
                    </button>
                    <button
                        onClick={() => setActiveTab('COMPANIES')}
                        className={`px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'COMPANIES' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Building size={14} /> EMPRESAS
                    </button>
                    <button
                        onClick={() => setActiveTab('PLANS')}
                        className={`px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'PLANS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <CreditCard size={14} /> PLANES SAAS
                    </button>
                    <button
                        onClick={() => setActiveTab('BACKUPS')}
                        className={`px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'BACKUPS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Database size={14} /> BACKUPS
                    </button>
                </div>
            </div>

            {activeTab === 'USERS' && (
                <div className="space-y-6">
                    <div className="flex justify-end">
                        <button
                            onClick={() => openUserModal()}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl flex items-center space-x-2 transition-all shadow-xl active:scale-95"
                        >
                            <UserPlus size={18} />
                            <span className="font-bold">Nuevo Usuario</span>
                        </button>
                    </div>

                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuario</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rol</th>
                                    <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {users.map(u => (
                                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-5 flex items-center space-x-4">
                                            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black">
                                                {u.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-bold text-slate-800">{u.name}</span>
                                        </td>
                                        <td className="px-8 py-5 text-sm font-medium text-slate-600">{u.email}</td>
                                        <td className="px-8 py-5">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <div className="flex items-center justify-center space-x-2">
                                                <button onClick={() => openUserModal(u)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                                                <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'ROLES' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1">
                        <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl">
                            <h3 className="text-xl font-black mb-6 flex items-center"><Plus className="mr-2" /> Nuevo Cargo</h3>
                            <form onSubmit={handleRoleSubmit} className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nombre del Cargo</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ej: Albañil Primera"
                                        className="w-full mt-2 p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-bold placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={roleForm.name}
                                        onChange={e => setRoleForm({ ...roleForm, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Descripción (Opcional)</label>
                                    <textarea
                                        placeholder="Responsabilidades principales..."
                                        className="w-full mt-2 p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-medium placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                                        value={roleForm.description}
                                        onChange={e => setRoleForm({ ...roleForm, description: e.target.value })}
                                    />
                                </div>
                                <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-lg transition-all active:scale-95">
                                    Guardar Cargo
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200">
                            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center"><Briefcase className="mr-2 text-slate-400" /> Cargos Definidos</h3>
                            <div className="space-y-3">
                                {roles.length === 0 && <p className="text-slate-400 italic font-medium">No hay cargos definidos.</p>}
                                {roles.map(role => (
                                    <div key={role.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:border-indigo-200 transition-all">
                                        <div>
                                            <h4 className="font-bold text-slate-800">{role.name}</h4>
                                            {role.description && <p className="text-xs text-slate-500 mt-1">{role.description}</p>}
                                        </div>
                                        <button onClick={() => handleDeleteRole(role.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'COMPANIES' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1">
                        <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl">
                            <h3 className="text-xl font-black mb-6 flex items-center">
                                <Plus className="mr-2" /> {editingCompany ? 'Editar Empresa' : 'Nueva Empresa'}
                            </h3>
                            <form onSubmit={handleCompanySubmit} className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nombre</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ej: Constructora Vertikal"
                                        className="w-full mt-2 p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-bold placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={companyForm.name}
                                        onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">RUT</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="76.123.456-7"
                                        className="w-full mt-2 p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-bold placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={companyForm.rut}
                                        onChange={e => setCompanyForm({ ...companyForm, rut: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logo URL (Opcional)</label>
                                    <input
                                        type="text"
                                        placeholder="https://..."
                                        className="w-full mt-2 p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-medium placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={companyForm.logoUrl}
                                        onChange={e => setCompanyForm({ ...companyForm, logoUrl: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Color Primario (Hex)</label>
                                    <div className="flex items-center gap-2 mt-2">
                                        <input
                                            type="color"
                                            className="h-12 w-12 p-1 bg-slate-800 border border-slate-700 rounded-xl cursor-pointer"
                                            value={companyForm.primaryColor || '#2563eb'}
                                            onChange={e => setCompanyForm({ ...companyForm, primaryColor: e.target.value })}
                                        />
                                        <input
                                            type="text"
                                            placeholder="#2563eb"
                                            className="flex-1 p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-medium placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={companyForm.primaryColor}
                                            onChange={e => setCompanyForm({ ...companyForm, primaryColor: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Plan Suscripción</label>
                                    <select
                                        className="w-full mt-2 p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-medium placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={companyForm.planId}
                                        onChange={e => applyPlanToCompanyForm(e.target.value)}
                                    >
                                        <option value="">(Sin Plan)</option>
                                        {plans.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado SuscripciÃ³n</label>
                                    <select
                                        className="w-full mt-2 p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-medium placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={companyForm.planStatus}
                                        onChange={e => setCompanyForm({ ...companyForm, planStatus: e.target.value })}
                                    >
                                        {PLAN_STATUS_OPTIONS.map(option => (
                                            <option key={option.id} value={option.id}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">MÃ³dulos Vendidos</label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {MODULE_OPTIONS.map(option => (
                                            <label key={option.id} className="flex items-center space-x-2 text-sm text-slate-300">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-slate-600 bg-slate-800"
                                                    checked={companyForm.modules.includes(option.id)}
                                                    onChange={e => {
                                                        const checked = e.target.checked;
                                                        setCompanyForm(prev => ({
                                                            ...prev,
                                                            modules: checked
                                                                ? [...prev.modules, option.id]
                                                                : prev.modules.filter(moduleId => moduleId !== option.id)
                                                        }));
                                                    }}
                                                />
                                                <span>{option.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <p className="mt-2 text-xs text-slate-500">Plan base mÃ¡s personalizaciÃ³n por empresa.</p>
                                </div>
                                <div className="flex space-x-2">
                                    <button type="submit" className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-lg transition-all active:scale-95">
                                        {editingCompany ? 'Actualizar' : 'Guardar'}
                                    </button>
                                    {editingCompany && (
                                        <button type="button" onClick={cancelEditCompany} className="px-4 py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-2xl transition-all">
                                            Cancelar
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200">
                            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center"><Building className="mr-2 text-slate-400" /> Empresas Registradas</h3>
                            <div className="mb-6 grid gap-3 md:grid-cols-3">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Empresas activas</div>
                                    <div className="mt-1 text-2xl font-semibold text-slate-900">
                                        {companies.filter(company => company.planStatus === 'ACTIVE' || company.planStatus === 'TRIAL').length}
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700">Vencen en 7 días</div>
                                    <div className="mt-1 text-2xl font-semibold text-amber-800">{expiringSoonCompanies.length}</div>
                                </div>
                                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-rose-700">Suspendidas o vencidas</div>
                                    <div className="mt-1 text-2xl font-semibold text-rose-800">{expiredCompanies.length}</div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {companies.length === 0 && <p className="text-slate-400 italic font-medium">No hay empresas registradas.</p>}
                                {companies.map(company => (
                                    <div key={company.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:border-indigo-200 transition-all">
                                        <div className="flex items-center space-x-4">
                                            {company.logoUrl ? (
                                                <img src={company.logoUrl} alt={company.name} className="w-10 h-10 rounded-lg object-contain bg-white" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-black">
                                                    {company.name.charAt(0)}
                                                </div>
                                            )}
                                            <div>
                                                <h4 className="font-bold text-slate-800">{company.name}</h4>
                                                <p className="text-xs text-slate-500 font-mono">{company.rut}</p>
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-bold uppercase text-slate-600">
                                                        {company.plan?.name || 'Sin plan'}
                                                    </span>
                                                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                                                        company.planStatus === 'ACTIVE'
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : company.planStatus === 'TRIAL'
                                                                ? 'bg-amber-100 text-amber-700'
                                                                : 'bg-rose-100 text-rose-700'
                                                    }`}>
                                                        {company.planStatus || 'ACTIVE'}
                                                    </span>
                                                    <span className="rounded-full bg-indigo-100 px-2 py-1 text-[10px] font-bold uppercase text-indigo-700">
                                                        {company.userCount || 0} usuarios
                                                    </span>
                                                    {company.subscriptionEndsAt && (
                                                        <span className="rounded-full bg-sky-100 px-2 py-1 text-[10px] font-bold uppercase text-sky-700">
                                                            Vence {new Date(company.subscriptionEndsAt).toLocaleDateString('es-CL')}
                                                        </span>
                                                    )}
                                                </div>
                                                {!!company.modules?.length && (
                                                    <div className="mt-2 flex flex-wrap gap-1">
                                                        {company.modules.map(moduleId => (
                                                            <span key={moduleId} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600">
                                                                {getModuleLabel(moduleId)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleRenewCompany(company.id)} className="p-2 text-slate-300 hover:text-emerald-600 transition-colors" title="Renovar 1 mes">
                                                <CheckCircle size={18} />
                                            </button>
                                            <button onClick={() => startEditCompany(company)} className="p-2 text-slate-300 hover:text-blue-500 transition-colors">
                                                <Edit2 size={18} />
                                            </button>
                                            <button onClick={() => handleDeleteCompany(company.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'BACKUPS' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm max-w-2xl border border-blue-100">
                            <p className="font-bold flex items-center"><AlertCircle size={16} className="mr-2" /> Importante</p>
                            <p>Los respaldos guardan toda la base de datos. Descárgalos periódicamente para evitar pérdida de información.</p>
                        </div>
                        <button
                            onClick={handleCreateBackup}
                            disabled={loading}
                            className={`bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl flex items-center space-x-2 transition-all shadow-xl active:scale-95 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Save size={18} />
                            <span className="font-bold">{loading ? 'Creando...' : 'Crear Respaldo'}</span>
                        </button>
                    </div>

                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Archivo</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tamaño</th>
                                    <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {backups.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-10 text-center text-slate-400 italic font-medium">No hay respaldos disponibles.</td>
                                    </tr>
                                )}
                                {backups.map((backup: any) => (
                                    <tr key={backup.name} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-5 font-bold text-slate-700 flex items-center">
                                            <Database size={16} className="mr-3 text-slate-400" />
                                            {backup.name}
                                        </td>
                                        <td className="px-8 py-5 text-sm font-medium text-slate-600">
                                            {new Date(backup.date).toLocaleString()}
                                        </td>
                                        <td className="px-8 py-5 text-sm font-medium text-slate-600">
                                            {(backup.size / 1024 / 1024).toFixed(2)} MB
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <div className="flex items-center justify-center space-x-2">
                                                <a
                                                    href={`${API_URL}/backups/${backup.name}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                                                    title="Descargar"
                                                >
                                                    <Download size={18} />
                                                </a>
                                                <button
                                                    onClick={() => handleDeleteBackup(backup.name)}
                                                    className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'PLANS' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1">
                        <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl">
                            <h3 className="text-xl font-black mb-6 flex items-center">
                                <Plus className="mr-2" /> {editingPlan ? 'Editar Plan' : 'Nuevo Plan'}
                            </h3>
                            <form onSubmit={handlePlanSubmit} className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nombre Plan</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ej: Plan Pro"
                                        className="w-full mt-2 p-3 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold placeholder-slate-600 outline-none"
                                        value={planForm.name}
                                        onChange={e => setPlanForm({ ...planForm, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Precio</label>
                                    <input
                                        type="number"
                                        required
                                        placeholder="0"
                                        className="w-full mt-2 p-3 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold placeholder-slate-600 outline-none"
                                        value={planForm.price}
                                        onChange={e => setPlanForm({ ...planForm, price: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Descripción</label>
                                    <input
                                        type="text"
                                        className="w-full mt-2 p-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-600 outline-none"
                                        value={planForm.description}
                                        onChange={e => setPlanForm({ ...planForm, description: e.target.value })}
                                    />
                                </div>
                                
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Módulos Activos</label>
                                    <div className="space-y-2">
                                        {MODULE_OPTIONS.map(option => (
                                            <label key={option.id} className="flex items-center space-x-2 text-sm text-slate-300">
                                                <input 
                                                    type="checkbox" 
                                                    className="rounded border-slate-600 bg-slate-800"
                                                    checked={planForm.modules.includes(option.id)}
                                                    onChange={e => {
                                                        const checked = e.target.checked;
                                                        setPlanForm(prev => ({
                                                            ...prev,
                                                            modules: checked ? [...prev.modules, option.id] : prev.modules.filter(m => m !== option.id)
                                                        }));
                                                    }}
                                                />
                                                <span>{option.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex space-x-2 pt-4">
                                    <button type="submit" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all">
                                        {editingPlan ? 'Actualizar' : 'Guardar'}
                                    </button>
                                    {editingPlan && (
                                        <button type="button" onClick={() => {
                                            setEditingPlan(null);
                                            setPlanForm({ name: '', price: 0, description: '', features: [], modules: [], maxUsers: 5, maxStorageGB: 5 });
                                        }} className="px-4 py-3 bg-slate-700 text-white rounded-xl">Cancelar</button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {plans.map(plan => (
                                <div key={plan.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="text-xl font-black text-slate-800">{plan.name}</h4>
                                            <p className="text-indigo-600 font-bold text-2xl mt-1">${plan.price.toLocaleString()}<span className="ml-1 text-sm text-slate-400">/ mes</span></p>
                                        </div>
                                        <div className="flex space-x-1">
                                            <button onClick={() => startEditPlan(plan)} className="p-2 text-slate-400 hover:text-blue-500"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDeletePlan(plan.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-500 mb-4">{plan.description}</p>
                                    <div className="space-y-2 mb-4">
                                        <p className="text-xs font-bold text-slate-400 uppercase">Módulos</p>
                                        <div className="flex flex-wrap gap-2">
                                            {plan.modules.map(m => (
                                                <span key={m} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg border border-slate-200">{m}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center text-xs font-bold text-slate-400">
                                        <Users size={14} className="mr-1" /> Usuarios: {plan.maxUsers || 'Ilimitado'}
                                    </div>
                                    <div className="mt-2 text-xs font-bold text-slate-400">
                                        Storage: {plan.maxStorageGB || 'N/D'} GB
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {showUserModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-8">
                        <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
                            <h3 className="text-xl font-black text-slate-900">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
                            <button onClick={() => setShowUserModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleUserSubmit} className="flex flex-col md:flex-row h-[calc(100vh-200px)] min-h-[500px]">
                            {/* Left Col: Basic Info */}
                            <div className="w-full md:w-1/3 p-8 space-y-5 border-r border-slate-100 overflow-y-auto">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nombre</label>
                                    <input type="text" required className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                        value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Email</label>
                                    <input type="email" required className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                        value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex justify-between">
                                        Contraseña
                                        {editingUser && <span className="text-[10px] text-orange-500 normal-case">(Opcional)</span>}
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input type="password" className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-200 font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                            value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} placeholder={editingUser ? "••••••••" : ""} />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Rol</label>
                                    <select className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                        value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
                                        <option value="USER">Usuario Estándar</option>
                                        <option value="WORKER">Trabajador</option>
                                        <option value="SUPERVISOR">Jefe de Área</option>
                                        <option value="ADMIN">Administrador</option>
                                    </select>
                                </div>

                                {/* Company Assignment */}
                                <div className="pt-4 border-t border-slate-100">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Empresas Asignadas</label>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-32 overflow-y-auto space-y-1">
                                        {companies.map(company => (
                                            <label key={company.id} className="flex items-center space-x-2 p-1.5 hover:bg-white rounded-lg cursor-pointer transition-colors">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                    checked={userForm.companyIds?.includes(company.id)}
                                                    onChange={e => {
                                                        const checked = e.target.checked;
                                                        setUserForm(prev => ({
                                                            ...prev,
                                                            companyIds: checked
                                                                ? [...(prev.companyIds || []), company.id]
                                                                : (prev.companyIds || []).filter(id => id !== company.id)
                                                        }));
                                                    }}
                                                />
                                                <span className="text-xs font-medium text-slate-700 truncate">{company.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Project Assignment - Condensed */}
                                {userForm.role !== 'ADMIN' && (
                                    <div className="pt-4 border-t border-slate-100">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Proyectos Asignados</label>
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-48 overflow-y-auto space-y-1">
                                            {projects.map(project => (
                                                <label key={project.id} className="flex items-center space-x-2 p-1.5 hover:bg-white rounded-lg cursor-pointer transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-slate-300 text-green-600 focus:ring-green-500"
                                                        checked={userForm.assignedProjectIds?.includes(project.id)}
                                                        onChange={e => {
                                                            const checked = e.target.checked;
                                                            setUserForm(prev => ({
                                                                ...prev,
                                                                assignedProjectIds: checked
                                                                    ? [...(prev.assignedProjectIds || []), project.id]
                                                                    : (prev.assignedProjectIds || []).filter(id => id !== project.id)
                                                            }));
                                                        }}
                                                    />
                                                    <span className="text-xs font-medium text-slate-700 truncate">{project.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4">
                                    <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95">
                                        {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                                    </button>
                                </div>
                            </div>

                            {/* Right Col: Permissions Matrix */}
                            <div className="w-full md:w-2/3 bg-slate-50/50 p-8 overflow-y-auto">
                                {userForm.role === 'ADMIN' ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                        <Shield size={64} className="mb-4 text-purple-200" />
                                        <p className="font-medium text-center max-w-xs">Los administradores tienen acceso total a todas las secciones y acciones.</p>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="flex justify-between items-center mb-6">
                                            <div>
                                                <h4 className="font-black text-slate-800 text-lg">Permisos de Acceso</h4>
                                                <p className="text-xs text-slate-500">Define qué puede hacer este usuario en cada sección.</p>
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-100 border-b border-slate-200">
                                                    <tr>
                                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Sección</th>
                                                        <th className="px-2 py-4 text-center text-[10px] font-black text-blue-500 uppercase w-16" title="Ver / Leer">Ver</th>
                                                        <th className="px-2 py-4 text-center text-[10px] font-black text-green-500 uppercase w-16" title="Crear / Agregar">Crear</th>
                                                        <th className="px-2 py-4 text-center text-[10px] font-black text-orange-500 uppercase w-16" title="Editar / Modificar">Edit</th>
                                                        <th className="px-2 py-4 text-center text-[10px] font-black text-red-500 uppercase w-16" title="Eliminar / Borrar">Borrar</th>
                                                        <th className="px-4 py-4 text-center w-24"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {availableSections.map(section => {
                                                        const hasPermission = (action: string) => userForm.allowedSections.includes(`${section.id}:${action}`) || userForm.allowedSections.includes(`${section.id}:*`);

                                                        const togglePermission = (action: string) => {
                                                            const perm = `${section.id}:${action}`;
                                                            setUserForm(prev => {
                                                                const current = prev.allowedSections;
                                                                if (current.includes(perm)) {
                                                                    return { ...prev, allowedSections: current.filter(p => p !== perm) };
                                                                } else {
                                                                    // If we are granting create/update/delete, auto-grant read? Usually yes.
                                                                    const newPerms = [...current, perm];
                                                                    if (action !== 'read' && !current.includes(`${section.id}:read`)) {
                                                                        newPerms.push(`${section.id}:read`);
                                                                    }
                                                                    return { ...prev, allowedSections: newPerms };
                                                                }
                                                            });
                                                        };

                                                        const toggleAll = () => {
                                                            const all = ['read', 'create', 'update', 'delete'].map(a => `${section.id}:${a}`);
                                                            const hasAll = all.every(p => userForm.allowedSections.includes(p));

                                                            setUserForm(prev => ({
                                                                ...prev,
                                                                allowedSections: hasAll
                                                                    ? prev.allowedSections.filter(p => !p.startsWith(`${section.id}:`))
                                                                    : [...new Set([...prev.allowedSections, ...all])]
                                                            }));
                                                        };

                                                        return (
                                                            <tr key={section.id} className="hover:bg-slate-50 transition-colors">
                                                                <td className="px-6 py-4 font-bold text-sm text-slate-700">{section.label}</td>
                                                                {['read', 'create', 'update', 'delete'].map(action => (
                                                                    <td key={action} className="px-2 py-4 text-center">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={hasPermission(action)}
                                                                            onChange={() => togglePermission(action)}
                                                                            className={`w-5 h-5 rounded border-2 border-slate-300 focus:ring-offset-0 cursor-pointer transition-colors
                                                                                ${action === 'read' ? 'text-blue-500 focus:ring-blue-500' : ''}
                                                                                ${action === 'create' ? 'text-green-500 focus:ring-green-500' : ''}
                                                                                ${action === 'update' ? 'text-orange-500 focus:ring-orange-500' : ''}
                                                                                ${action === 'delete' ? 'text-red-500 focus:ring-red-500' : ''}
                                                                            `}
                                                                        />
                                                                    </td>
                                                                ))}
                                                                <td className="px-4 py-4 text-center">
                                                                    <button
                                                                        type="button"
                                                                        onClick={toggleAll}
                                                                        className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
                                                                    >
                                                                        TODO
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPage;
