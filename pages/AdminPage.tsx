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
    AlertCircle
} from 'lucide-react';
import { User, UserRole } from '../types';

import { API_URL } from '../src/config.ts';

interface JobTitle {
    id: string;
    name: string;
    description?: string;
}

interface AdminPageProps {
    currentUser: User | null;
    projects: any[]; // Or proper type
}

const AdminPage: React.FC<AdminPageProps> = ({ currentUser, projects }) => {
    const [activeTab, setActiveTab] = useState<'USERS' | 'ROLES'>('USERS');
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<JobTitle[]>([]);
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
        assignedProjectIds: [] as string[]
    });

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
            } else {
                const res = await fetch(`${API_URL}/job-titles`);
                const data = await res.json();
                setRoles(Array.isArray(data) ? data : []);
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

    const openUserModal = (user?: User) => {
        if (user) {
            setEditingUser(user);
            setUserForm({
                name: user.name,
                email: user.email,
                password: '',
                role: user.role,
                allowedSections: user.allowedSections || [],
                assignedProjectIds: user.assignedProjectIds || []
            });
        } else {
            setEditingUser(null);
            setUserForm({
                name: '',
                email: '',
                password: '',
                role: 'USER',
                allowedSections: availableSections.map(s => s.id),
                assignedProjectIds: []
            });
        }
        setShowUserModal(true);
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
                        <Briefcase size={14} /> CARGOS / ROLES
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

            {/* Basic User Modal */}
            {showUserModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-xl font-black text-slate-900">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
                            <button onClick={() => setShowUserModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleUserSubmit} className="p-8 space-y-4">
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
                                    {editingUser && <span className="text-[10px] text-orange-500 normal-case">(Dejar en blanco para no cambiar)</span>}
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

                            {/* Section Permissions UI */}
                            {userForm.role !== 'ADMIN' && (
                                <div className="space-y-4">
                                    {/* SECTIONS */}
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Permisos de Secciones</label>
                                        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-4 rounded-xl border border-slate-200 h-32 overflow-y-auto">
                                            {availableSections.map(section => (
                                                <label key={section.id} className="flex items-center space-x-2 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                        checked={userForm.allowedSections.includes(section.id)}
                                                        onChange={e => {
                                                            const checked = e.target.checked;
                                                            setUserForm(prev => ({
                                                                ...prev,
                                                                allowedSections: checked
                                                                    ? [...prev.allowedSections, section.id]
                                                                    : prev.allowedSections.filter(id => id !== section.id)
                                                            }));
                                                        }}
                                                    />
                                                    <span className="text-sm font-medium text-slate-700">{section.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* PROJECT ASSIGNMENT */}
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Asignación de Proyectos</label>
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 h-48 overflow-y-auto space-y-2">
                                            {projects.length === 0 && <p className="text-xs text-slate-400 italic">No hay proyectos disponibles.</p>}
                                            {projects.map(project => (
                                                <label key={project.id} className="flex items-center space-x-2 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-slate-300 text-green-600 focus:ring-green-500"
                                                        checked={userForm.assignedProjectIds?.includes(project.id)}
                                                        onChange={e => {
                                                            const checked = e.target.checked;
                                                            setUserForm(prev => {
                                                                const current = prev.assignedProjectIds || [];
                                                                return {
                                                                    ...prev,
                                                                    assignedProjectIds: checked
                                                                        ? [...current, project.id]
                                                                        : current.filter(id => id !== project.id)
                                                                };
                                                            });
                                                        }}
                                                    />
                                                    <span className="text-sm font-medium text-slate-700 truncate">{project.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1 italic">
                                            El usuario solo podrá reportar cuelgues en los proyectos seleccionados.
                                        </p>
                                    </div>
                                </div>
                            )}
                            <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl shadow-lg mt-4">
                                {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPage;
