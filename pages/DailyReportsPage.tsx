import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, Save, FileText, Search, Plus, Filter, Clock, Trash2, Paperclip, X, Check, AlertCircle, ChevronDown, Download, Edit2, File, Image, Send } from 'lucide-react';
import { DailyReport, Project, User, ReportTemplate } from '../types';

interface DailyReportsPageProps {
    reports: DailyReport[];
    projects: Project[];
    users: User[];
    currentUser: User | null;
    onAdd: (report: Omit<DailyReport, 'id' | 'createdAt'> & { progress?: number }) => Promise<void>;
    onUpdate: (id: string, report: Partial<DailyReport> & { progress?: number }) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onUploadAttachment: (reportId: string, file: File) => Promise<void>;
    onRemoveAttachment: (reportId: string, url: string) => Promise<void>;
    onSubmit: (id: string) => Promise<void>;
    onApprove: (id: string) => Promise<void>;
    onReject: (id: string) => Promise<void>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    DRAFT: { label: 'Borrador', color: 'text-slate-600', bg: 'bg-slate-100' },
    PENDING_APPROVAL: { label: 'Pendiente Aprobación', color: 'text-amber-600', bg: 'bg-amber-100' },
    APPROVED: { label: 'Aprobado', color: 'text-green-600', bg: 'bg-green-100' },
    REJECTED: { label: 'Rechazado', color: 'text-red-600', bg: 'bg-red-100' },
};

const DailyReportsPage: React.FC<DailyReportsPageProps> = ({
    reports = [], projects = [], users = [], currentUser,
    onAdd, onUpdate, onDelete, onUploadAttachment, onRemoveAttachment, onSubmit, onApprove, onReject
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [editingReport, setEditingReport] = useState<DailyReport | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [projectFilter, setProjectFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [templates, setTemplates] = useState<ReportTemplate[]>([]);
    const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});
    const [showFilters, setShowFilters] = useState(false);

    const API_URL = (window as any).ENV?.API_URL || '';

    const [newReport, setNewReport] = useState({
        date: new Date().toISOString().split('T')[0],
        content: '',
        projectId: '',
        progress: 0 as number | undefined,
        templateId: '' as string,
    });

    const [editForm, setEditForm] = useState({
        date: '',
        content: '',
        projectId: '',
        progress: 0 as number | undefined,
    });

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const res = await fetch(`${API_URL}/report-templates`, {
                headers: { 'x-company-id': localStorage.getItem('companyId') || '' }
            });
            if (res.ok) setTemplates(await res.json());
        } catch (e) { console.error(e); }
    };

    const handleSubmitForm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;
        await onAdd({
            userId: currentUser.id,
            date: newReport.date,
            content: newReport.content,
            projectId: newReport.projectId || undefined,
            progress: newReport.progress,
            status: 'DRAFT',
            attachments: [],
        });
        setIsModalOpen(false);
        setNewReport({ date: new Date().toISOString().split('T')[0], content: '', projectId: '', progress: undefined, templateId: '' });
    };

    const handleUpdateReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingReport) return;
        await onUpdate(editingReport.id, {
            date: editForm.date,
            content: editForm.content,
            projectId: editForm.projectId || undefined,
            progress: editForm.progress,
        });
        setEditingReport(null);
    };

    const openEditModal = (report: DailyReport) => {
        setEditForm({
            date: typeof report.date === 'string' ? report.date.split('T')[0] : new Date(report.date).toISOString().split('T')[0],
            content: report.content,
            projectId: report.projectId || '',
            progress: undefined,
        });
        setEditingReport(report);
    };

    const handleFileUpload = async (reportId: string, file: File) => {
        setUploadingFiles(prev => ({ ...prev, [reportId]: true }));
        try {
            await onUploadAttachment(reportId, file);
        } finally {
            setUploadingFiles(prev => ({ ...prev, [reportId]: false }));
        }
    };

    const handleTemplateSelect = (templateId: string) => {
        const template = templates.find(t => t.id === templateId);
        if (template) {
            setNewReport({ ...newReport, content: template.content, templateId });
        }
    };

    const filteredReports = useMemo(() => {
        return reports.filter(r => {
            const matchSearch = !searchTerm ||
                r.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (projects.find(p => p.id === r.projectId)?.name.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
            const matchStatus = !statusFilter || r.status === statusFilter;
            const matchProject = !projectFilter || r.projectId === projectFilter;
            const matchDateFrom = !dateFrom || new Date(r.date) >= new Date(dateFrom);
            const matchDateTo = !dateTo || new Date(r.date) <= new Date(dateTo + 'T23:59:59');
            return matchSearch && matchStatus && matchProject && matchDateFrom && matchDateTo;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [reports, searchTerm, statusFilter, projectFilter, dateFrom, dateTo, projects]);

    const canEdit = (report: DailyReport) => {
        if (currentUser?.role === 'ADMIN') return true;
        return report.userId === currentUser?.id && (report.status === 'DRAFT' || report.status === 'REJECTED');
    };

    const canApprove = () => currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERVISOR';

    const getFileIcon = (url: string) => {
        if (/\.(jpg|jpeg|png|gif|webp)$/i.test(url)) return <Image size={16} className="text-blue-500" />;
        return <File size={16} className="text-slate-400" />;
    };

    const saveTemplate = async (name: string, content: string) => {
        try {
            const res = await fetch(`${API_URL}/report-templates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-company-id': localStorage.getItem('companyId') || '' },
                body: JSON.stringify({ name, content })
            });
            if (res.ok) { fetchTemplates(); setIsTemplateModalOpen(false); }
        } catch (e) { console.error(e); }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Reportes Diarios</h2>
                    <p className="text-slate-500">Registro de actividades y avances en obra</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setIsTemplateModalOpen(true)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg flex items-center space-x-2 transition-all">
                        <FileText size={20} /><span>Plantillas</span>
                    </button>
                    <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all shadow-md shadow-blue-200">
                        <Plus size={20} /><span>Nuevo Reporte</span>
                    </button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex gap-4 items-center">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input type="text" placeholder="Buscar en reportes..." className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <button onClick={() => setShowFilters(!showFilters)} className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-all ${showFilters ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        <Filter size={20} /><span>Filtros</span><ChevronDown size={16} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                    </button>
                </div>
                {showFilters && (
                    <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Estado</label>
                            <select className="w-full px-3 py-2 border border-slate-200 rounded-lg" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                <option value="">Todos</option>
                                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Proyecto</label>
                            <select className="w-full px-3 py-2 border border-slate-200 rounded-lg" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
                                <option value="">Todos</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Desde</label>
                            <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Hasta</label>
                            <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                        </div>
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                {Object.entries(STATUS_CONFIG).map(([k, v]) => {
                    const count = reports.filter(r => r.status === k).length;
                    return (
                        <div key={k} className={`${v.bg} ${v.color} p-4 rounded-xl`}>
                            <div className="text-2xl font-bold">{count}</div>
                            <div className="text-sm">{v.label}</div>
                        </div>
                    );
                })}
            </div>

            {/* Reports Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredReports.map((report) => {
                    const project = projects.find(p => p.id === report.projectId);
                    const author = users.find(u => u.id === report.userId);
                    const status = STATUS_CONFIG[report.status] || STATUS_CONFIG.DRAFT;
                    const attachments: string[] = (report as any).attachments || [];

                    return (
                        <div key={report.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center space-x-2 text-slate-500 text-sm mb-1">
                                        <Calendar size={16} />
                                        <span className="font-medium">{new Date(report.date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="font-bold text-slate-700 text-sm">{author ? author.name : 'Usuario Desconocido'}</div>
                                </div>
                                <span className={`${status.bg} ${status.color} text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wide`}>{status.label}</span>
                            </div>

                            {project && (
                                <div className="mb-3">
                                    <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wide">{project.name}</span>
                                </div>
                            )}

                            <div className="mb-4">
                                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-sm">{report.content}</p>
                            </div>

                            {/* Attachments */}
                            {attachments.length > 0 && (
                                <div className="mb-4">
                                    <div className="text-xs text-slate-500 font-medium mb-2 flex items-center"><Paperclip size={12} className="mr-1" />Adjuntos ({attachments.length})</div>
                                    <div className="flex flex-wrap gap-2">
                                        {attachments.map((url, i) => (
                                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-1 bg-slate-50 hover:bg-slate-100 px-2 py-1 rounded text-xs text-slate-600">
                                                {getFileIcon(url)}<span className="max-w-24 truncate">{url.split('/').pop()}</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                                <div className="flex items-center text-xs text-slate-400">
                                    <Clock size={12} className="mr-1" />
                                    <span>{new Date(report.createdAt).toLocaleTimeString()}</span>
                                </div>
                                <div className="flex gap-1">
                                    {report.status === 'DRAFT' && (
                                        <button onClick={() => { if (confirm('¿Enviar para aprobación?')) onSubmit(report.id); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Enviar"><Send size={14} /></button>
                                    )}
                                    {report.status === 'PENDING_APPROVAL' && canApprove() && (
                                        <>
                                            <button onClick={() => onApprove(report.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Aprobar"><Check size={14} /></button>
                                            <button onClick={() => { if (confirm('¿Rechazar?')) onReject(report.id); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Rechazar"><X size={14} /></button>
                                        </>
                                    )}
                                    {canEdit(report) && (
                                        <>
                                            <label className="p-1.5 text-slate-500 hover:bg-slate-50 rounded cursor-pointer" title="Adjuntar">
                                                <Paperclip size={14} />
                                                <input type="file" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(report.id, e.target.files[0]); e.target.value = ''; }} />
                                            </label>
                                            <button onClick={() => openEditModal(report)} className="p-1.5 text-slate-500 hover:bg-slate-50 rounded" title="Editar"><Edit2 size={14} /></button>
                                        </>
                                    )}
                                    {(currentUser?.role === 'ADMIN') && (
                                        <button onClick={(e) => { e.stopPropagation(); if (confirm('¿Eliminar reporte?')) onDelete(report.id); }} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded" title="Eliminar"><Trash2 size={14} /></button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredReports.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                    <FileText size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No hay reportes que mostrar</p>
                </div>
            )}

            {/* New Report Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center catch-all-overlay z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-lg font-bold text-slate-800">Nuevo Reporte Diario</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><span className="text-2xl">&times;</span></button>
                        </div>
                        <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                                <input type="date" required className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={newReport.date} onChange={e => setNewReport({ ...newReport, date: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Proyecto (Requerido)</label>
                                <select required className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white" value={newReport.projectId} onChange={e => setNewReport({ ...newReport, projectId: e.target.value })}>
                                    <option value="">Seleccione un proyecto...</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Plantilla (opcional)</label>
                                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white" value={newReport.templateId} onChange={e => handleTemplateSelect(e.target.value)}>
                                    <option value="">Sin plantilla</option>
                                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Detalle de Actividades</label>
                                <textarea required rows={6} placeholder="Describa las tareas realizadas, avances y observaciones..." className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" value={newReport.content} onChange={e => setNewReport({ ...newReport, content: e.target.value })} />
                            </div>
                            {newReport.projectId && (
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <label className="block text-sm font-medium text-slate-700 mb-2 flex justify-between">
                                        <span>Actualizar Avance del Proyecto (Opcional)</span>
                                        <span className="text-blue-600 font-bold">{newReport.progress ?? projects.find(p => p.id === newReport.projectId)?.progress ?? 0}%</span>
                                    </label>
                                    <input type="range" min="0" max="100" step="1" className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" value={newReport.progress ?? (projects.find(p => p.id === newReport.projectId)?.progress ?? 0)} onChange={e => setNewReport({ ...newReport, progress: Number(e.target.value) })} />
                                </div>
                            )}
                            <div className="flex justify-end pt-4 space-x-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium">Cancelar</button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg shadow-blue-200 transition-all flex items-center"><Save size={18} className="mr-2" />Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Report Modal */}
            {editingReport && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center catch-all-overlay z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-lg font-bold text-slate-800">Editar Reporte</h3>
                            <button onClick={() => setEditingReport(null)} className="text-slate-400 hover:text-slate-600"><span className="text-2xl">&times;</span></button>
                        </div>
                        <form onSubmit={handleUpdateReport} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                                <input type="date" required className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Proyecto</label>
                                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white" value={editForm.projectId} onChange={e => setEditForm({ ...editForm, projectId: e.target.value })}>
                                    <option value="">Sin proyecto</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Detalle de Actividades</label>
                                <textarea required rows={6} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" value={editForm.content} onChange={e => setEditForm({ ...editForm, content: e.target.value })} />
                            </div>
                            {editForm.projectId && (
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <label className="block text-sm font-medium text-slate-700 mb-2 flex justify-between">
                                        <span>Actualizar Avance (Opcional)</span>
                                        <span className="text-blue-600 font-bold">{editForm.progress ?? 0}%</span>
                                    </label>
                                    <input type="range" min="0" max="100" step="1" className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" value={editForm.progress ?? (projects.find(p => p.id === editForm.projectId)?.progress ?? 0)} onChange={e => setEditForm({ ...editForm, progress: Number(e.target.value) })} />
                                </div>
                            )}
                            <div className="flex justify-end pt-4 space-x-3">
                                <button type="button" onClick={() => setEditingReport(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium">Cancelar</button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg shadow-blue-200 transition-all flex items-center"><Save size={18} className="mr-2" />Actualizar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Templates Modal */}
            {isTemplateModalOpen && (
                <TemplateModal templates={templates} onSave={saveTemplate} onDelete={async (id) => {
                    await fetch(`${API_URL}/report-templates/${id}`, { method: 'DELETE', headers: { 'x-company-id': localStorage.getItem('companyId') || '' } });
                    fetchTemplates();
                }} onClose={() => setIsTemplateModalOpen(false)} />
            )}
        </div>
    );
};

// Template Modal Component
const TemplateModal: React.FC<{
    templates: ReportTemplate[];
    onSave: (name: string, content: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onClose: () => void;
}> = ({ templates, onSave, onDelete, onClose }) => {
    const [name, setName] = useState('');
    const [content, setContent] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!name || !content) return;
        setSaving(true);
        await onSave(name, content);
        setSaving(false);
        setName('');
        setContent('');
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center catch-all-overlay z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0">
                    <h3 className="text-lg font-bold text-slate-800">Plantillas de Reportes</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><span className="text-2xl">&times;</span></button>
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                    {/* Create new template */}
                    <div className="mb-6 bg-slate-50 p-4 rounded-xl">
                        <h4 className="font-medium text-slate-700 mb-3">Nueva Plantilla</h4>
                        <input type="text" placeholder="Nombre de la plantilla" className="w-full px-3 py-2 border border-slate-200 rounded-lg mb-2" value={name} onChange={e => setName(e.target.value)} />
                        <textarea rows={4} placeholder="Contenido de la plantilla..." className="w-full px-3 py-2 border border-slate-200 rounded-lg mb-2 resize-none" value={content} onChange={e => setContent(e.target.value)} />
                        <button onClick={handleSave} disabled={saving || !name || !content} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar Plantilla'}</button>
                    </div>
                    {/* Existing templates */}
                    <div className="space-y-3">
                        {templates.map(t => (
                            <div key={t.id} className="bg-white border border-slate-200 p-4 rounded-xl">
                                <div className="flex justify-between items-start mb-2">
                                    <h5 className="font-medium text-slate-700">{t.name}</h5>
                                    <button onClick={() => { if (confirm('¿Eliminar?')) onDelete(t.id); }} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                                </div>
                                <p className="text-sm text-slate-500 whitespace-pre-wrap">{t.content}</p>
                            </div>
                        ))}
                        {templates.length === 0 && <p className="text-center text-slate-400 py-4">No hay plantillas guardadas</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DailyReportsPage;
