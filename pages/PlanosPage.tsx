import React, { useState, useEffect } from 'react';
import { Plan, Project, User, PlanMark } from '../types';
import { Plus, Trash2, Map, Calendar, ChevronRight } from 'lucide-react';
import { API_URL } from '../src/config';
import { PlanDetailView } from './PlanDetailView';
import { checkPermission } from '../src/utils/permissions';

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

    const [costCenters, setCostCenters] = useState<{ id: string, name: string, code: string }[]>([]);

    useEffect(() => {
        fetchPlans();
        fetchStats();
        // Fetch Cost Centers
        fetch(`${API_URL}/cost-centers`)
            .then(res => res.json())
            .then(data => setCostCenters(data))
            .catch(err => console.error("Error fetching cost centers:", err));
    }, []);



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

    // Wizard State
    const [currentStep, setCurrentStep] = useState(1);
    const [wizardData, setWizardData] = useState({
        name: '',
        projectId: '',
        costCenterId: '',
        stages: '1',
        imageUrl: '',
        systemType: '',
        installationType: '',
        installationDetail: '', // Stores "Izaje N° X" or "Otros: details"
        liftingCount: '', // Temporary for Izaje input
        otherDetail: ''   // Temporary for Otros input
    });

    const handleWizardChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setWizardData(prev => ({ ...prev, [name]: value }));
    };

    const handleNextStep = () => {
        if (currentStep === 1) {
            // Validate Step 1
            if (!wizardData.name) {
                alert("El nombre es obligatorio");
                return;
            }
            setCurrentStep(2);
        }
    };

    const handleAddPlan = async (e: React.FormEvent) => {
        e.preventDefault();

        // Prepare final data
        const formData = new FormData();
        formData.append('name', wizardData.name);
        if (wizardData.projectId) formData.append('projectId', wizardData.projectId);
        if (wizardData.costCenterId) formData.append('costCenterId', wizardData.costCenterId);
        if (wizardData.stages) formData.append('stages', wizardData.stages);

        if (wizardData.systemType) formData.append('systemType', wizardData.systemType);
        if (wizardData.installationType) formData.append('installationType', wizardData.installationType);

        // Determine installationDetail based on type
        let detail = wizardData.installationDetail;
        if (wizardData.installationType === 'Izaje') {
            detail = `Izaje N° ${wizardData.liftingCount}`;
        } else if (wizardData.installationType === 'Otros') {
            detail = wizardData.otherDetail;
        }
        if (detail) formData.append('installationDetail', detail);

        if (selectedFile) {
            formData.append('file', selectedFile);
        } else if (wizardData.imageUrl) {
            formData.append('imageUrl', wizardData.imageUrl);
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
                // Reset Wizard
                setCurrentStep(1);
                setWizardData({
                    name: '', projectId: '', costCenterId: '', stages: '1', imageUrl: '',
                    systemType: '', installationType: '', installationDetail: '', liftingCount: '', otherDetail: ''
                });
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
            {/* Header and Listing Code... same as before... */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Planos Interactivos</h1>
                    <p className="text-slate-500 mt-1">Gestión de cuelgues y reportes gráficos</p>
                </div>
                {checkPermission(currentUser, 'planos', 'create') && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-blue-600/20"
                    >
                        <Plus size={20} />
                        Nuevo Plano
                    </button>
                )}
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
                                    {checkPermission(currentUser, 'planos', 'delete') && (
                                        <button
                                            onClick={(e) => handleDeletePlan(plan.id, e)}
                                            className="text-slate-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
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

            {/* Add Modal - WIZARD */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800">
                                {currentStep === 1 ? 'Nuevo Plano - Información General' : 'Nuevo Plano - Detalles Operativos'}
                            </h2>
                            <div className="text-sm font-medium text-slate-400">Paso {currentStep} de 2</div>
                        </div>

                        <form onSubmit={handleAddPlan} className="space-y-4">
                            {currentStep === 1 && (
                                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Plano</label>
                                        <input name="name" required value={wizardData.name} onChange={handleWizardChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej. Planta Baja Zona Norte" />
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
                                            <input
                                                name="imageUrl"
                                                value={wizardData.imageUrl}
                                                onChange={handleWizardChange}
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                                placeholder="https://... (Si no subes archivo)"
                                                disabled={!!selectedFile}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Proyecto Asociado</label>
                                        <select name="projectId" value={wizardData.projectId} onChange={handleWizardChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500">
                                            <option value="">Seleccionar Proyecto (Opcional)</option>
                                            {projects.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Centro de Costo</label>
                                            <select name="costCenterId" value={wizardData.costCenterId} onChange={handleWizardChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500">
                                                <option value="">(Opcional)</option>
                                                {costCenters.map(cc => (
                                                    <option key={cc.id} value={cc.id}>{cc.code}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Etapas / Pisos</label>
                                            <input
                                                name="stages"
                                                type="number"
                                                min="1"
                                                value={wizardData.stages}
                                                onChange={handleWizardChange}
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Sistema</label>
                                        <select name="systemType" value={wizardData.systemType} onChange={handleWizardChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500">
                                            <option value="">Seleccionar...</option>
                                            <option value="Horcas">Horcas</option>
                                            <option value="Marquesinas">Marquesinas</option>
                                            <option value="Ascensor">Ascensor</option>
                                            <option value="Red Vertical (Tipo U)">Red Vertical (Tipo U)</option>
                                            <option value="Red Horizontal (Tipo S)">Red Horizontal (Tipo S)</option>
                                            <option value="Muro Cortina">Muro Cortina</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Instalación</label>
                                        <select name="installationType" value={wizardData.installationType} onChange={handleWizardChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500">
                                            <option value="">Seleccionar...</option>
                                            <option value="Montaje Inicial">Montaje Inicial</option>
                                            <option value="Izaje">Izaje</option>
                                            <option value="Cambio de Posicion">Cambio de Posición</option>
                                            <option value="Desmontaje">Desmontaje</option>
                                            <option value="Limpieza de Redes">Limpieza de Redes</option>
                                            <option value="Otros">Otros</option>
                                        </select>
                                    </div>

                                    {/* Conditional Inputs */}
                                    {wizardData.installationType === 'Izaje' && (
                                        <div className="bg-blue-50 p-4 rounded-lg animate-in fade-in">
                                            <label className="block text-sm font-medium text-blue-800 mb-1">Número de Izaje</label>
                                            <input
                                                name="liftingCount"
                                                type="number"
                                                placeholder="Ej. 1, 2, 3..."
                                                value={wizardData.liftingCount}
                                                onChange={handleWizardChange}
                                                className="w-full border border-blue-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    )}

                                    {wizardData.installationType === 'Otros' && (
                                        <div className="bg-slate-50 p-4 rounded-lg animate-in fade-in">
                                            <label className="block text-sm font-medium text-slate-800 mb-1">Detalle (Otros)</label>
                                            <input
                                                name="otherDetail"
                                                type="text"
                                                placeholder="Especificar..."
                                                value={wizardData.otherDetail}
                                                onChange={handleWizardChange}
                                                className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                                <button type="button" onClick={() => {
                                    if (currentStep === 2) setCurrentStep(1);
                                    else setShowAddModal(false);
                                }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                                    {currentStep === 2 ? 'Atrás' : 'Cancelar'}
                                </button>

                                {currentStep === 1 ? (
                                    <button type="button" onClick={handleNextStep} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
                                        Siguiente <ChevronRight size={16} />
                                    </button>
                                ) : (
                                    <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-lg shadow-blue-600/20">
                                        {loading ? 'Guardando...' : 'Crear Plano'}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
