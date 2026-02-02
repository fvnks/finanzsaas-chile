import React, { useState, useEffect } from 'react';
import { Plan, Project, User, PlanMark } from '../types';
import { Plus, Trash2, Map, Calendar } from 'lucide-react';
import { API_URL } from '../src/config';
import { PlanDetailView } from './PlanDetailView';

interface PlanosPageProps {
    projects: Project[];
    currentUser: User | null;
}

export const PlanosPage: React.FC<PlanosPageProps> = ({ projects, currentUser }) => {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [marks, setMarks] = useState<PlanMark[]>([]); // For stats
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileInputKey, setFileInputKey] = useState(0);
    const [loading, setLoading] = useState(false);

    // Stats state
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Helper to proxy OneDrive images
    const getImageUrl = (url?: string) => {
        if (!url) return '';
        if (url.includes('sharepoint.com') || url.includes('1drv.ms')) {
            return `${API_URL}/proxy-image?url=${encodeURIComponent(url)}`;
        }
        return url;
    };

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/plans`);
            if (res.ok) {
                const data = await res.json();
                setPlans(data);
            }
        } catch (error) {
            console.error("Error fetching plans:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_URL}/stats/marks`);
            if (res.ok) {
                const data = await res.json();
                setMarks(data);
            }
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    };

    useEffect(() => {
        fetchPlans();
        fetchStats();
    }, []);

    const handleAddPlan = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const name = (form.elements.namedItem('name') as HTMLInputElement).value;
        const projectId = (form.elements.namedItem('projectId') as HTMLSelectElement).value;
        const imageUrlInput = form.elements.namedItem('imageUrl') as HTMLInputElement;
        const imageUrl = imageUrlInput ? imageUrlInput.value : '';

        const formData = new FormData();
        formData.append('name', name);
        if (projectId) formData.append('projectId', projectId);

        if (selectedFile) {
            formData.append('file', selectedFile);
        } else if (imageUrl) {
            formData.append('imageUrl', imageUrl);
        }

        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/plans`, {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                setShowAddModal(false);
                setSelectedFile(null);
                setFileInputKey(prev => prev + 1);
                fetchPlans();
            } else {
                alert("Error creando el plano");
            }
        } catch (error) {
            console.error("Error adding plan:", error);
            alert("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePlan = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('¿Estás seguro de eliminar este plano?')) return;
        try {
            await fetch(`${API_URL}/plans/${id}`, { method: 'DELETE' });
            setPlans(plans.filter(p => p.id !== id));
        } catch (error) {
            console.error("Error deleting plan:", error);
        }
    };

    // Calculate stats
    const getMonthlyTotal = () => {
        return marks.filter(m => {
            const d = new Date(m.date);
            return (d.getMonth() + 1) === selectedMonth && d.getFullYear() === selectedYear;
        }).reduce((sum, m) => sum + (m.meters || 0), 0);
    };

    if (selectedPlan) {
        return (
            <PlanDetailView
                plan={selectedPlan}
                onBack={() => { setSelectedPlan(null); fetchStats(); }} // Refresh stats on back
                currentUser={currentUser}
            />
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Planos Interactivos</h1>
                    <p className="text-slate-500 mt-1">Gestión de cuelgues y reportes gráficos</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-blue-600/20"
                >
                    <Plus size={20} />
                    Nuevo Plano
                </button>
            </div>

            {/* Stats Dashboard */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-indigo-100 rounded-xl">
                        <Calendar className="text-indigo-600" size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800">Resumen Mensual de Cuelgues</h3>
                        <p className="text-slate-500 text-sm">Metros lineales reportados</p>
                    </div>
                    <div className="ml-auto flex gap-2">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="border border-slate-200 rounded-lg px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {[...Array(12)].map((_, i) => (
                                <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('es-ES', { month: 'long' })}</option>
                            ))}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="border border-slate-200 rounded-lg px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {[2024, 2025, 2026, 2027].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold text-indigo-900">{getMonthlyTotal().toFixed(1)}</span>
                    <span className="text-lg text-indigo-600 font-medium mb-1">metros lineales</span>
                </div>
            </div>

            {/* Grid of Plans */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map(plan => {
                    const project = projects.find(p => p.id === plan.projectId);
                    return (
                        <div
                            key={plan.id}
                            onClick={() => setSelectedPlan(plan)}
                            className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all cursor-pointer hover:-translate-y-1"
                        >
                            <div className="h-48 overflow-hidden bg-slate-100 relative">
                                <img
                                    src={getImageUrl(plan.imageUrl)}
                                    alt={plan.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Plano'; }}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            </div>
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg text-slate-800 line-clamp-1">{plan.name}</h3>
                                    <button
                                        onClick={(e) => handleDeletePlan(plan.id, e)}
                                        className="text-slate-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                {project && (
                                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-4">
                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                        {project.name}
                                    </div>
                                )}
                                <div className="flex items-center text-blue-600 text-sm font-medium">
                                    <Map size={16} className="mr-2" />
                                    Ver Plano Interactivo
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">Nuevo Plano</h2>
                        <form onSubmit={handleAddPlan} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Plano</label>
                                <input name="name" required className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej. Planta Baja Zona Norte" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Imagen del Plano</label>
                                <div className="space-y-3">
                                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors relative">
                                        <input
                                            key={fileInputKey}
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <div className="text-slate-500">
                                            {selectedFile ? (
                                                <span className="text-blue-600 font-medium">{selectedFile.name}</span>
                                            ) : (
                                                <span>Arrastra una imagen o haz clic para subir</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-slate-200"></div>
                                        </div>
                                        <div className="relative flex justify-center text-sm">
                                            <span className="px-2 bg-white text-slate-500">O usar URL</span>
                                        </div>
                                    </div>
                                    <input
                                        name="imageUrl"
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        placeholder="https://..."
                                        disabled={!!selectedFile}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Proyecto Asociado</label>
                                <select name="projectId" className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">Seleccionar Proyecto (Opcional)</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Fancelar</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Guardar Plano</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
