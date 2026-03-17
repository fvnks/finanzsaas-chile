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
    Download
} from 'lucide-react';
import { User, UserRole, Company } from '../types';

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

const AdminPage: React.FC<AdminPageProps> = ({ currentUser, projects, onRefreshUser }) => {
    const [activeTab, setActiveTab] = useState<'USERS' | 'ROLES' | 'COMPANIES' | 'BACKUPS'>('USERS');
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<JobTitle[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [backups, setBackups] = useState<any[]>([]);
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
    const [companyForm, setCompanyForm] = useState({ name: '', rut: '', logoUrl: '' });
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);

    // Role Form State
    const [roleForm, setRoleForm] = useState({ name: '', description: '' });

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'USERS') {
                const res = await fetch(`${API_URL}/users`);
                const data = await res.json();
                setUsers(Array.isArray(data) ? data : []);
            } else if (activeTab === 'ROLES') {
                const res = await fetch(`${API_URL}/job-titles`);
                const data = await res.json();
                setRoles(Array.isArray(data) ? data : []);
            } else if (activeTab === 'COMPANIES') {
                const res = await fetch(`${API_URL}/companies`);
                const data = await res.json();
                setCompanies(Array.isArray(data) ? data : []);
            } else if (activeTab === 'BACKUPS') {
                const res = await fetch(`${API_URL}/backups`);
                const data = await res.json();
                setBackups(Array.isArray(data) ? data : []);
            }

            // Always fetch companies for User modal if not already fetched
            if (activeTab === 'USERS' && companies.length === 0) {
                const res = await fetch(`${API_URL}/companies`);
                const data = await res.json();
                setCompanies(Array.isArray(data) ? data : []);
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
                    headers: { 'Content-Type': 'application/json' },
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
                    headers: { 'Content-Type': 'application/json' },
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
            await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
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
                headers: { 'Content-Type': 'application/json' },
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
            await fetch(`${API_URL}/job-titles/${id}`, { method: 'DELETE' });
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
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(companyForm)
                });
                if (res.ok) {
                    const updated = await res.json();
                    setCompanies(companies.map(c => c.id === updated.id ? updated : c));
                    setEditingCompany(null);
                    setCompanyForm({ name: '', rut: '', logoUrl: '' });
                }
            } else {
                const res = await fetch(`${API_URL}/companies`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...companyForm,
                        creatorId: currentUser?.id
                    })
                });
                if (res.ok) {
                    const created = await res.json();
                    setCompanies([...companies, created]);
                    setCompanyForm({ name: '', rut: '', logoUrl: '' });
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
            await fetch(`${API_URL}/companies/${id}`, { method: 'DELETE' });
            setCompanies(companies.filter(c => c.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    const startEditCompany = (company: Company) => {
        setEditingCompany(company);
        setCompanyForm({ name: company.name, rut: company.rut, logoUrl: company.logoUrl || '' });
    };

    const cancelEditCompany = () => {
        setEditingCompany(null);
        setCompanyForm({ name: '', rut: '', logoUrl: '' });
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
            const res = await fetch(`${API_URL}/backups`, { method: 'POST' });
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
            await fetch(`${API_URL}/backups/${filename}`, { method: 'DELETE' });
            setBackups(backups.filter(b => b.name !== filename));
        } catch (err) {
            console.error(err);
        }
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
                                            </div>
                                        </div>
                                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
