import React, { useState, useMemo } from 'react';
import { Calendar, Save, FileText, Search, Plus, Filter, Clock, Trash2 } from 'lucide-react';
import { DailyReport, Project, User } from '../types';

interface DailyReportsPageProps {
    reports: DailyReport[];
    projects: Project[];
    users: User[];
    currentUser: User | null;
    onAdd: (report: Omit<DailyReport, 'id' | 'createdAt'> & { progress?: number }) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

const DailyReportsPage: React.FC<DailyReportsPageProps> = ({ reports = [], projects = [], users = [], currentUser, onAdd, onDelete }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [newReport, setNewReport] = useState<{
        date: string;
        content: string;
        projectId: string;
        progress?: number;
    }>({
        date: new Date().toISOString().split('T')[0],
        content: '',
        projectId: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        await onAdd({
            userId: currentUser.id,
            date: newReport.date,
            content: newReport.content,
            projectId: newReport.projectId || undefined,
            progress: newReport.progress // Pass the progress
        });

        setIsModalOpen(false);
        setNewReport({
            date: new Date().toISOString().split('T')[0],
            content: '',
            projectId: ''
        });
    };

    const filteredReports = useMemo(() => {
        return reports.filter(r =>
            r.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (projects.find(p => p.id === r.projectId)?.name.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [reports, searchTerm, projects]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Reportes Diarios</h2>
                    <p className="text-slate-500">Registro de actividades y avances en obra</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all shadow-md shadow-blue-200"
                >
                    <Plus size={20} />
                    <span>Nuevo Reporte</span>
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar en reportes..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredReports.map((report) => {
                    const project = projects.find(p => p.id === report.projectId);
                    const author = users.find(u => u.id === report.userId);

                    return (
                        <div key={report.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center space-x-2 text-slate-500 text-sm mb-1">
                                        <Calendar size={16} />
                                        <span className="font-medium">{new Date(report.date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="font-bold text-slate-700 text-sm">
                                        {author ? author.name : 'Usuario Desconocido'}
                                    </div>
                                </div>
                                {project && (
                                    <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wide">
                                        {project.name}
                                    </span>
                                )}
                            </div>

                            <div className="mb-4">
                                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{report.content}</p>
                            </div>

                            <div className="pt-4 border-t border-slate-50 flex justify-between items-center text-xs text-slate-400">
                                <div className="flex items-center">
                                    <Clock size={12} className="mr-1" />
                                    <span>Registrado: {new Date(report.createdAt).toLocaleTimeString()}</span>
                                </div>
                                {currentUser?.role === 'ADMIN' && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm('¿Eliminar reporte?')) onDelete(report.id);
                                        }}
                                        className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"
                                        title="Eliminar reporte"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center catch-all-overlay z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-lg font-bold text-slate-800">Nuevo Reporte Diario</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <span className="text-2xl">&times;</span>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={newReport.date}
                                    onChange={e => setNewReport({ ...newReport, date: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Proyecto (Requerido)</label>
                                <select
                                    required
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none bg-white"
                                    value={newReport.projectId}
                                    onChange={e => setNewReport({ ...newReport, projectId: e.target.value })}
                                >
                                    <option value="">Seleccione un proyecto...</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Detalle de Actividades</label>
                                <textarea
                                    required
                                    rows={6}
                                    placeholder="Describa las tareas realizadas, avances y observaciones..."
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                                    value={newReport.content}
                                    onChange={e => setNewReport({ ...newReport, content: e.target.value })}
                                />
                            </div>

                            {/* Campo opcional de Avance del Proyecto */}
                            {newReport.projectId && (
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <label className="block text-sm font-medium text-slate-700 mb-2 flex justify-between">
                                        <span>Actualizar Avance del Proyecto (Opcional)</span>
                                        <span className="text-blue-600 font-bold">{newReport.progress ?? projects.find(p => p.id === newReport.projectId)?.progress ?? 0}%</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="1"
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                        value={newReport.progress ?? (projects.find(p => p.id === newReport.projectId)?.progress ?? 0)}
                                        onChange={e => setNewReport({ ...newReport, progress: Number(e.target.value) })}
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">* Esto actualizará el porcentaje de avance general del proyecto seleccionado.</p>
                                </div>
                            )}

                            <div className="flex justify-end pt-4 space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg shadow-blue-200 transition-all transform active:scale-95 flex items-center"
                                >
                                    <Save size={18} className="mr-2" />
                                    Guardar Reporte
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DailyReportsPage;
