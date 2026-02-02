import React, { useState, useEffect, useRef } from 'react';
import { Plan, PlanMark, User, UserRole } from '../types';
import { ArrowLeft, Plus, Trash2, MapPin, ZoomIn, ZoomOut, Save, X, ChevronRight, Layout } from 'lucide-react';
import { API_URL } from '../src/config';
import { checkPermission } from '../src/utils/permissions';

interface PlanDetailViewProps {
    plan: Plan;
    onBack: () => void;
    currentUser: User | null;
}

interface UserSummary {
    name: string;
    totalMeters: number;
    count: number;
}

export const PlanDetailView: React.FC<PlanDetailViewProps> = ({ plan, onBack, currentUser }) => {
    const [marks, setMarks] = useState<PlanMark[]>([]);
    const [loading, setLoading] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [tempMark, setTempMark] = useState<{ x: number, y: number } | null>(null);

    // New Mark Form State
    const [newMarkData, setNewMarkData] = useState({ meters: '', comment: '' });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileInputKey, setFileInputKey] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Permission Check
    const isAdminOrSupervisor = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPERVISOR;

    // Sidebar State - Open by default only for Admin/Supervisor
    const [isSidebarOpen, setIsSidebarOpen] = useState(isAdminOrSupervisor);

    const imageRef = useRef<HTMLImageElement>(null);

    const getImageUrl = (url?: string) => {
        if (!url) return '';
        if (url.includes('sharepoint.com') || url.includes('1drv.ms')) {
            return `${API_URL}/proxy-image?url=${encodeURIComponent(url)}`;
        }
        return url;
    };

    // Calculate Summary (Computed from filtered marks or all marks? Usually summary based on what is visible or all?
    // User requested: "el usuario debe ver sus cuelgues y no de otros".
    // So distinct logic:
    // 1. Visible Marks on Map: 
    //    - Admin/Sup: All
    //    - User: Own
    // 2. Summary:
    //    - Admin/Sup: All users
    //    - User: Hidden (requested feature)

    // So we assume 'marks' contains everything fetched from backend.
    // We derive 'visibleMarks' for the map.
    const visibleMarks = React.useMemo(() => {
        if (isAdminOrSupervisor) return marks;
        return marks.filter(m => m.userId === currentUser?.id);
    }, [marks, currentUser, isAdminOrSupervisor]);

    const userSummary = React.useMemo(() => {
        const summary: Record<string, UserSummary> = {};
        // Summary always calculates from ALL marks? Or only visible? 
        // If sidebar is only for Admin/Sup, they see all marks.
        // So we can use 'marks'.
        marks.forEach(mark => {
            const userName = mark.user?.name || 'Desconocido';
            if (!summary[userName]) {
                summary[userName] = { name: userName, totalMeters: 0, count: 0 };
            }
            summary[userName].totalMeters += Number(mark.meters);
            summary[userName].count += 1;
        });
        return Object.values(summary).sort((a, b) => b.totalMeters - a.totalMeters);
    }, [marks]);

    const fetchMarks = async () => {
        if (!plan.id) return;
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/plans/${plan.id}/marks`);
            if (res.ok) {
                setMarks(await res.json());
            }
        } catch (error) {
            console.error("Error fetching marks:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMarks();
    }, [plan.id]);

    const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
        if (!imageRef.current || !currentUser) return;

        // Validar permiso de 'update' (Editar) para registrar marcas. 
        // Se usa 'update' porque estamos 'editando/anotando' el plano existente.
        // 'create' se reserva para subir nuevos planos.
        if (!checkPermission(currentUser, 'planos', 'update')) {
            return;
        }

        const rect = imageRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setTempMark({ x, y });
        setNewMarkData({ meters: '', comment: '' });
        setIsModalOpen(true);
    };

    const handleSaveMark = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tempMark || !currentUser) return;

        try {
            const formData = new FormData();
            formData.append('userId', currentUser.id);
            formData.append('x', tempMark.x.toString());
            formData.append('y', tempMark.y.toString());
            formData.append('meters', newMarkData.meters);
            formData.append('comment', newMarkData.comment);
            formData.append('date', new Date().toISOString());

            if (selectedFile) {
                formData.append('file', selectedFile);
            }

            const res = await fetch(`${API_URL}/plans/${plan.id}/marks`, {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const savedMark = await res.json();
                setMarks([savedMark, ...marks]);
                setIsModalOpen(false);
                setTempMark(null);
                setSelectedFile(null);
                setFileInputKey(prev => prev + 1);
            }
        } catch (error) {
            console.error("Error saving mark:", error);
        }
    };

    const handleDeleteMark = async (id: string) => {
        if (!confirm('¿Eliminar esta marca?')) return;

        // Safety check: ensure user owns the mark (even if hidden in UI)
        const markToDelete = marks.find(m => m.id === id);
        if (!markToDelete) return; // Should not happen

        if (!isAdminOrSupervisor && markToDelete.userId !== currentUser?.id) {
            alert("No tienes permiso para eliminar marcas de otros usuarios.");
            return;
        }

        try {
            await fetch(`${API_URL}/plans/marks/${id}`, { method: 'DELETE' });
            setMarks(marks.filter(m => m.id !== id));
        } catch (error) {
            console.error("Error deleting mark:", error);
        }
    };

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="bg-white p-4 border-b border-slate-200 flex justify-between items-center shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <div>
                        <h2 className="font-bold text-lg text-slate-800">{plan.name}</h2>
                        <p className="text-xs text-slate-500">Haz clic en el plano para reportar un cuelgue</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"><ZoomOut size={20} /></button>
                    <span className="text-sm font-medium w-12 text-center">{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"><ZoomIn size={20} /></button>

                    {isAdminOrSupervisor && (
                        <div className="h-6 w-px bg-slate-300 mx-2" />
                    )}

                    {isAdminOrSupervisor && (
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className={`p-2 rounded-lg transition-colors ${isSidebarOpen ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-100 text-slate-600'}`}
                            title={isSidebarOpen ? "Ocultar Resumen" : "Ver Resumen"}
                        >
                            <Layout size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Area: Canvas + Sidebar */}
            <div className="flex-1 flex overflow-hidden">
                {/* Canvas Area */}
                <div className="flex-1 overflow-auto p-8 relative cursor-crosshair bg-slate-200 flex items-center justify-center">
                    <div
                        className="relative shadow-2xl transition-transform duration-200 ease-out"
                        style={{
                            transform: `scale(${zoom})`,
                            transformOrigin: 'center center'
                        }}
                    >
                        <img
                            ref={imageRef}
                            src={getImageUrl(plan.imageUrl)}
                            alt="Plano"
                            onClick={handleImageClick}
                            className="max-w-none rounded-lg select-none"
                            style={{ maxHeight: '80vh' }}
                            draggable={false}
                            onError={(e) => { e.currentTarget.src = "https://placehold.co/1000x800?text=Error+Cargando+Imagen"; }}
                        />

                        {/* Render Marks */}
                        {visibleMarks.map(mark => (
                            <div
                                key={mark.id}
                                className="absolute group"
                                style={{ left: `${mark.x}%`, top: `${mark.y}%`, transform: 'translate(-50%, -100%)' }}
                            >
                                <MapPin
                                    size={32}
                                    className="text-red-600 drop-shadow-md filter cursor-pointer hover:scale-110 transition-transform"
                                    fill="currentColor"
                                />

                                {/* Tooltip Card */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-white rounded-xl shadow-xl p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-50 text-left border border-slate-100">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-bold text-slate-400 uppercase">Reporte de Cuelgue</span>
                                        <span className="text-xs text-slate-400">{new Date(mark.date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-2xl font-bold text-slate-800">{mark.meters}m</span>
                                        <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">lineales</span>
                                    </div>
                                    {mark.comment && <p className="text-sm text-slate-600 italic border-l-2 border-slate-200 pl-2 mb-2">"{mark.comment}"</p>}
                                    {mark.imageUrl && (
                                        <div className="mb-2">
                                            <a href={getImageUrl(mark.imageUrl)} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                                <MapPin size={12} /> Ver Foto Adjunta
                                            </a>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                        <span className="text-xs text-blue-600 font-medium">{mark.user?.name || 'Usuario'}</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteMark(mark.id); }}
                                            className="text-red-500 hover:text-red-700 p-1 pointer-events-auto"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    {/* Triangle arrow */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white"></div>
                                </div>
                            </div>
                        ))}

                        {/* Temp Mark Indicator */}
                        {tempMark && (
                            <div
                                className="absolute animate-bounce"
                                style={{ left: `${tempMark.x}%`, top: `${tempMark.y}%`, transform: 'translate(-50%, -100%)' }}
                            >
                                <MapPin size={32} className="text-blue-500 drop-shadow-lg" fill="currentColor" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Summary */}
                <div className="w-80 bg-white border-l border-slate-200 flex flex-col shadow-xl z-20">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-600 p-1.5 rounded-lg"><MapPin size={18} /></span>
                            Resumen de Cuelgues
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {userSummary.length === 0 ? (
                            <div className="text-center py-10 text-slate-400">
                                <p>No hay cuelgues registrados aún.</p>
                            </div>
                        ) : (
                            userSummary.map((user, idx) => (
                                <div key={idx} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-xl"></div>
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-slate-700">{user.name}</h4>
                                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{user.count} marcas</span>
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-bold text-blue-600">{user.totalMeters.toFixed(1)}</span>
                                        <span className="text-sm text-slate-500 font-medium">mts lineales</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-200">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-slate-600">Total Proyecto</span>
                            <span className="text-lg font-bold text-slate-900">
                                {userSummary.reduce((acc, curr) => acc + curr.totalMeters, 0).toFixed(1)} mts
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Mark Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800">Registrar Cuelgue</h3>
                            <button onClick={() => { setIsModalOpen(false); setTempMark(null); }} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveMark} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Metros Lineales</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.1"
                                        required
                                        autoFocus
                                        className="w-full text-lg font-mono border-2 border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                                        placeholder="0.0"
                                        value={newMarkData.meters}
                                        onChange={(e) => setNewMarkData({ ...newMarkData, meters: e.target.value })}
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">mts</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Comentario (Opcional)</label>
                                <textarea
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 min-h-[80px]"
                                    placeholder="Detalles sobre el cuelgue, ubicación específica, etc."
                                    value={newMarkData.comment}
                                    onChange={(e) => setNewMarkData({ ...newMarkData, comment: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Adjuntar Foto (Opcional)</label>
                                <input
                                    key={fileInputKey}
                                    type="file"
                                    accept="image/*"
                                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/30 active:scale-95 transition-all flex justify-center items-center gap-2"
                            >
                                <Save size={20} />
                                Guardar Reporte
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
