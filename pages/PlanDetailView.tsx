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

    // Workers Selection State
    const [workers, setWorkers] = useState<any[]>([]); // Using any for simplicity or import Worker type
    const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);

    useEffect(() => {
        fetch(`${API_URL}/workers`)
            .then(res => res.json())
            .then(data => setWorkers(data))
            .catch(err => console.error("Error fetching workers:", err));
    }, []);

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

    // Stage State
    const [currentStage, setCurrentStage] = useState(1);

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
        if (!Array.isArray(marks)) return [];
        let filtered = marks;
        if (!isAdminOrSupervisor) {
            filtered = marks.filter(m => m.userId === currentUser?.id);
        }
        // Filter by Stage
        return filtered.filter(m => (m.stage || 1) === currentStage);
    }, [marks, currentUser, isAdminOrSupervisor, currentStage]);

    const userSummary = React.useMemo(() => {
        if (!Array.isArray(marks)) return [];
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
                const data = await res.json();
                if (Array.isArray(data)) {
                    setMarks(data);
                } else {
                    console.error("Expected array of marks, got:", data);
                    setMarks([]);
                }
            }
        } catch (error) {
            console.error("Error fetching marks:", error);
            setMarks([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMarks();
    }, [plan.id]);


    // --- DRAWING STATE ---
    const [drawMode, setDrawMode] = useState<'POINT' | 'PATH'>('POINT');
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState<{ x: number, y: number }[]>([]);
    const [startPos, setStartPos] = useState<{ x: number, y: number } | null>(null);

    // Generate color based on user ID or name
    const getUserColor = (userId: string, userName: string) => {
        if (!userId && !userName) return '#ccc'; // Fallback
        let hash = 0;
        const str = (userId || '') + (userName || '');
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const h = Math.abs(hash) % 360;
        return `hsl(${h}, 70%, 50%)`;
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!imageRef.current || !currentUser) return;
        // Check permission early
        if (!checkPermission(currentUser, 'planos', 'update')) return;

        // Prevent default drag behavior
        e.preventDefault();

        const rect = imageRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setIsDrawing(true);
        setStartPos({ x, y });

        if (drawMode === 'PATH') {
            setCurrentPath([{ x, y }]);
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDrawing || !imageRef.current) return;

        const rect = imageRef.current.getBoundingClientRect();
        const clientX = Math.max(rect.left, Math.min(e.clientX, rect.right));
        const clientY = Math.max(rect.top, Math.min(e.clientY, rect.bottom));

        const x = ((clientX - rect.left) / rect.width) * 100;
        const y = ((clientY - rect.top) / rect.height) * 100;

        if (drawMode === 'PATH') {
            setCurrentPath(prev => [...prev, { x, y }]);
        }
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDrawing || !imageRef.current || !startPos) return;

        const rect = imageRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        const dist = Math.sqrt(Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2));

        if (drawMode === 'PATH') {
            // Include drag distance threshold or path length check
            if (currentPath.length > 2 || dist > 1) { // It's a path
                setIsModalOpen(true);
                setTempMark(currentPath[currentPath.length - 1]);
                setNewMarkData({ meters: '', comment: '' });
                setSelectedWorkerIds([]);
            } else {
                // Too short, treat as accidental click or just ignore?
                // User asked for "mark from point to point". 
                // Currently we only support freehand drag. 
                // If they just clicked in PATH mode, maybe they want a point?
                // For now, let's keep it strict: Must drag for PATH.
                setCurrentPath([]); // Reset if invalid
            }
        } else {
            // POINT Mode
            // Treat as click regardless of small movement
            setTempMark({ x, y });
            setNewMarkData({ meters: '', comment: '' });
            setSelectedWorkerIds([]);
            setIsModalOpen(true);
        }

        setIsDrawing(false);
        setStartPos(null);
    };

    // Removed standalone handleImageClick to avoid conflict

    const handleSaveMark = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        try {
            const formData = new FormData();
            formData.append('userId', currentUser.id);
            formData.append('type', drawMode); // Save type
            formData.append('stage', currentStage.toString());

            if (drawMode === 'PATH') {
                formData.append('points', JSON.stringify(currentPath));
                // Use first point as anchor
                formData.append('x', currentPath[0].x.toString());
                formData.append('y', currentPath[0].y.toString());
            } else if (tempMark) {
                formData.append('x', tempMark.x.toString());
                formData.append('y', tempMark.y.toString());
            }

            formData.append('meters', newMarkData.meters);
            formData.append('comment', newMarkData.comment);
            formData.append('date', new Date().toISOString());
            formData.append('workerIds', JSON.stringify(selectedWorkerIds));

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
                setCurrentPath([]); // Clear path
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

    // Verify Plan integrity
    if (!plan) {
        return <div className="p-8 text-center text-red-500">Error: No se pudo cargar la información del plano.</div>;
    }

    // Logging for debug
    console.log("Rendering PlanDetailView for:", plan.name);

    // Safe Date Helper
    const formatDate = (dateString: string | Date) => {
        try {
            const d = new Date(dateString);
            if (isNaN(d.getTime())) return 'Fecha inválida';
            return d.toLocaleDateString();
        } catch (e) {
            return 'Error fecha';
        }
    };

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="bg-white p-4 border-b border-slate-200 flex justify-between items-center shadow-sm z-10 w-full">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <div>
                        <h2 className="font-bold text-lg text-slate-800">{plan.name || 'Sin Nombre'}</h2>
                        <p className="text-xs text-slate-500">
                            {drawMode === 'POINT' ? 'Modo: Puntos (Clic para marcar)' : 'Modo: Trazado (Arrastra para dibujar)'}
                        </p>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
                    <button
                        onClick={() => setDrawMode('POINT')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${drawMode === 'POINT' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                    >
                        <MapPin size={16} className="inline mr-1" /> Punto
                    </button>
                    <button
                        onClick={() => setDrawMode('PATH')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${drawMode === 'PATH' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                    >
                        <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> Trazado
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    {/* Stage Selector */}
                    {(plan.stages && plan.stages > 1) && (
                        <div className="flex bg-slate-100 p-1 rounded-lg gap-1 mr-2">
                            {Array.from({ length: plan.stages }).map((_, i) => (
                                <button
                                    key={i + 1}
                                    onClick={() => setCurrentStage(i + 1)}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${currentStage === i + 1 ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                    )}

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
                <div className="flex-1 overflow-auto p-4 relative cursor-crosshair bg-slate-200">
                    <div className="min-w-full min-h-full flex items-center justify-center">
                        <div
                            className="relative shadow-2xl transition-all duration-200 ease-out select-none bg-white"
                            style={{
                                width: `${zoom * 100}%`,
                                minWidth: '100px', // Prevent collapse
                            }}
                        >
                            <img
                                ref={imageRef}
                                src={getImageUrl(plan.imageUrl)}
                                alt="Plano"
                                className="w-full h-auto block rounded-lg select-none"
                                draggable={false}
                                onError={(e) => { e.currentTarget.src = "https://placehold.co/1000x800?text=Error+Cargando+Imagen"; }}
                            />

                            {/* Interaction Overlay: Handles Clicks (Point) and Draws (Path) */}
                            <div
                                className="absolute inset-0 cursor-crosshair z-10"
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={() => setIsDrawing(false)}
                            />

                            {/* SVG Layer for Paths */}
                            <svg
                                className="absolute inset-0 w-full h-full pointer-events-none"
                                style={{ zIndex: 1 }}
                                viewBox="0 0 100 100"
                                preserveAspectRatio="none"
                            >
                                {/* Render Saved Paths */}
                                {visibleMarks.filter(m => m.type === 'PATH').map(mark => {
                                    // Safety: Ensure points is an array
                                    let points = mark.points as { x: number, y: number }[] | undefined;
                                    if (typeof points === 'string') {
                                        try { points = JSON.parse(points); } catch (e) { points = []; }
                                    }
                                    if (!Array.isArray(points) || points.length === 0) return null;

                                    const color = getUserColor(mark.userId, mark.user?.name || mark.userId);
                                    return (
                                        <polyline
                                            key={mark.id}
                                            points={points.map(p => `${p.x},${p.y}`).join(' ')}
                                            fill="none"
                                            stroke={color}
                                            strokeWidth={2 / zoom} // Keep stroke width visually constant
                                            vectorEffect="non-scaling-stroke"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="drop-shadow-sm opacity-80 hover:opacity-100 transition-all cursor-pointer pointer-events-auto"
                                            onClick={(e) => { e.stopPropagation(); /* Show info? */ }}
                                        >
                                            <title>{mark.user?.name || 'Usuario'}: {mark.meters}m</title>
                                        </polyline>
                                    );
                                })}

                                {/* Render Current Drawing Path */}
                                {currentPath.length > 0 && (
                                    <polyline
                                        points={currentPath.map(p => `${p.x},${p.y}`).join(' ')}
                                        fill="none"
                                        stroke="blue"
                                        strokeWidth={2 / zoom}
                                        vectorEffect="non-scaling-stroke"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="opacity-70"
                                    />
                                )}
                            </svg>

                            {/* Render Point Marks */}
                            {visibleMarks.filter(m => m.type !== 'PATH').map(mark => {
                                const isTop = (mark.y || 0) < 20;
                                const isLeft = (mark.x || 0) < 20;
                                const isRight = (mark.x || 0) > 80;

                                let tooltipClasses = "absolute mb-2 w-64 bg-white rounded-xl shadow-xl p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-50 text-left border border-slate-100";
                                let arrowClasses = "absolute border-8 border-transparent";

                                if (isTop) {
                                    tooltipClasses += " top-full mt-2 left-1/2 -translate-x-1/2";
                                    arrowClasses += " bottom-full left-1/2 -translate-x-1/2 border-b-white";
                                } else if (isLeft) {
                                    tooltipClasses += " left-full ml-2 top-1/2 -translate-y-1/2";
                                    arrowClasses += " right-full top-1/2 -translate-y-1/2 border-r-white";
                                } else if (isRight) {
                                    tooltipClasses += " right-full mr-2 top-1/2 -translate-y-1/2";
                                    arrowClasses += " left-full top-1/2 -translate-y-1/2 border-l-white";
                                } else {
                                    // Default (Top) - renders above mark
                                    tooltipClasses += " bottom-full mb-2 left-1/2 -translate-x-1/2";
                                    arrowClasses += " top-full left-1/2 -translate-x-1/2 border-t-white";
                                }

                                return (
                                    <div
                                        key={mark.id}
                                        className="absolute group z-10"
                                        style={{ left: `${mark.x || 0}%`, top: `${mark.y || 0}%`, transform: 'translate(-50%, -100%)' }}
                                    >
                                        <MapPin
                                            size={32}
                                            style={{ color: getUserColor(mark.userId, mark.user?.name || mark.userId) }}
                                            className="drop-shadow-md filter cursor-pointer hover:scale-110 transition-transform"
                                            fill="currentColor"
                                        />

                                        {/* Tooltip Card */}
                                        <div className={tooltipClasses}>
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-xs font-bold text-slate-400 uppercase">Reporte</span>
                                                <span className="text-xs text-slate-400">{formatDate(mark.date)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-2xl font-bold text-slate-800">{mark.meters}m</span>
                                            </div>
                                            {mark.comment && <p className="text-sm text-slate-600 italic border-l-2 border-slate-200 pl-2 mb-2">"{mark.comment}"</p>}
                                            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                                <span className="text-xs text-blue-600 font-medium">{mark.user?.name || 'Usuario'}</span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteMark(mark.id); }}
                                                    className="text-red-500 hover:text-red-700 p-1 pointer-events-auto"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <div className={arrowClasses}></div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Temp Mark Indicator (Point Mode) */}
                            {tempMark && drawMode === 'POINT' && (
                                <div
                                    className="absolute animate-bounce z-20"
                                    style={{ left: `${tempMark.x}%`, top: `${tempMark.y}%`, transform: 'translate(-50%, -100%)' }}
                                >
                                    <MapPin size={32} className="text-blue-500 drop-shadow-lg" fill="currentColor" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Summary */}
                <div className="w-80 bg-white border-l border-slate-200 flex flex-col shadow-xl z-20">
                    {/* ... Existing sidebar content ... */}
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
                                    <div
                                        className="absolute top-0 left-0 w-1 h-full rounded-l-xl"
                                        style={{ backgroundColor: getUserColor(user.name /*name as id fallback*/, user.name) }}
                                    ></div>
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-slate-700">{user.name}</h4>
                                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{user.count} marcas</span>
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-bold text-slate-800">{user.totalMeters.toFixed(1)}</span>
                                        <span className="text-sm text-slate-500 font-medium">mts lineales</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Add Mark Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800">
                                {drawMode === 'PATH' ? 'Registrar Trazado' : 'Registrar Punto'}
                            </h3>
                            <button onClick={() => { setIsModalOpen(false); setTempMark(null); setCurrentPath([]); }} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveMark} className="space-y-4">
                            {/* ... Form fields ... */}
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
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Trabajadores Participantes</label>
                                <div className="border border-slate-200 rounded-xl p-3 max-h-40 overflow-y-auto space-y-2">
                                    {workers.map(worker => (
                                        <div key={worker.id} className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                id={`worker-${worker.id}`}
                                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                                                checked={selectedWorkerIds.includes(worker.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedWorkerIds(prev => [...prev, worker.id]);
                                                    } else {
                                                        setSelectedWorkerIds(prev => prev.filter(id => id !== worker.id));
                                                    }
                                                }}
                                            />
                                            <label htmlFor={`worker-${worker.id}`} className="text-sm text-slate-700 cursor-pointer select-none flex-1">
                                                {worker.name}
                                            </label>
                                        </div>
                                    ))}
                                    {workers.length === 0 && <p className="text-xs text-slate-400 text-center">No hay trabajadores registrados.</p>}
                                </div>
                            </div>

                            {/* ... Comments and Files ... */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Comentario (Opcional)</label>
                                <textarea
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 min-h-[80px]"
                                    placeholder="Detalles..."
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
