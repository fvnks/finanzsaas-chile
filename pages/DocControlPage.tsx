import React, { useState, useEffect } from 'react';
import { Building2, FileText, CheckCircle, AlertCircle, Upload, ChevronRight, ChevronDown, Plus, Trash2, XCircle, Clock, Copy } from 'lucide-react';
import { API_URL } from '../src/config.ts';
import { Client, DocumentRequirement, Document, ClientMonthlyInfo, DocumentCategory } from '../types.ts';
import { useCompany } from '../components/CompanyContext';

interface DocControlPageProps {
    clients: Client[];
}

export function DocControlPage({ clients }: DocControlPageProps) {
    const { activeCompany } = useCompany();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [requirements, setRequirements] = useState<DocumentRequirement[]>([]);
    const [categories, setCategories] = useState<DocumentCategory[]>([]);
    const [loading, setLoading] = useState(false);

    // Modal states
    const [isReqModalOpen, setIsReqModalOpen] = useState(false);
    const [newReqData, setNewReqData] = useState({ name: '', description: '', dueDate: '', categoryId: '' });

    // Category Modal
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [newCatData, setNewCatData] = useState({ name: '', color: '#3b82f6' });

    // Monthly Info
    const [monthlyInfo, setMonthlyInfo] = useState<ClientMonthlyInfo | null>(null);

    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadData, setUploadData] = useState({ name: '', url: '', type: 'OTHER', requirementId: '' });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileInputKey, setFileInputKey] = useState(0);

    // Import Modal
    const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
    const [copySourceDate, setCopySourceDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d;
    });

    const selectedClient = clients.find(c => c.id === selectedClientId);

    useEffect(() => {
        if (selectedClientId) {
            fetchRequirements(selectedClientId);
            fetchMonthlyInfo(selectedClientId);
            // We can call fetchCategories here directly or via the other useEffect if we split them.
            // But since fetchCategories depends on selectedClientId state which is set, calling it here is safe 
            // if we update it to use the param or state. 
            // The implementation below uses state.
        } else {
            setRequirements([]);
            setMonthlyInfo(null);
            setCategories([]);
        }
    }, [selectedClientId, selectedDate]);

    useEffect(() => {
        if (selectedClientId) {
            fetchCategories();
        }
    }, [selectedClientId]);

    const fetchRequirements = async (clientId: string) => {
        setLoading(true);
        try {
            const month = selectedDate.getMonth() + 1; // 1-12
            const year = selectedDate.getFullYear();
            const res = await fetch(`${API_URL}/clients/${clientId}/requirements?month=${month}&year=${year}`);
            if (res.ok) {
                const data = await res.json();
                setRequirements(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMonthlyInfo = async (clientId: string) => {
        try {
            const month = selectedDate.getMonth() + 1; // 1-12
            const year = selectedDate.getFullYear();
            const res = await fetch(`${API_URL}/clients/${clientId}/monthly-info?month=${month}&year=${year}`);
            if (res.ok) {
                const data = await res.json();
                setMonthlyInfo(data.id ? data : null);
            } else {
                setMonthlyInfo(null);
            }
        } catch (err) {
            console.error(err);
            setMonthlyInfo(null);
        }
    };

    const handleUpdateMonthlyInfo = async (edpDateStr: string) => {
        if (!selectedClientId) return;
        try {
            const month = selectedDate.getMonth() + 1;
            const year = selectedDate.getFullYear();
            const res = await fetch(`${API_URL}/clients/${selectedClientId}/monthly-info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    month,
                    year,
                    edpDate: edpDateStr
                })
            });
            if (res.ok) {
                const updated = await res.json();
                setMonthlyInfo(updated);
            }
        } catch (err) { console.error(err); }
    };

    const fetchCategories = async () => {
        if (!selectedClientId) return;
        try {
            const res = await fetch(`${API_URL}/clients/${selectedClientId}/document-categories`);
            if (res.ok) {
                const data = await res.json();
                setCategories(data);
            } else {
                setCategories([]);
            }
        } catch (err) {
            console.error(err);
            setCategories([]);
        }
    };

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClientId) return;

        try {
            const res = await fetch(`${API_URL}/clients/${selectedClientId}/document-categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCatData)
            });
            if (res.ok) {
                const saved = await res.json();
                setCategories([...categories, saved]);
                setNewCatData({ name: '', color: '#3b82f6' });
            }
        } catch (err) { console.error(err); }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm('¿Eliminar esta categoría?')) return;
        try {
            await fetch(`${API_URL}/document-categories/${id}`, { method: 'DELETE' });
            setCategories(categories.filter(c => c.id !== id));
        } catch (err) { console.error(err); }
    };

    const handleAddRequirement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClientId) return;
        try {
            const res = await fetch(`${API_URL}/clients/${selectedClientId}/requirements`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newReqData,
                    month: selectedDate.getMonth() + 1,
                    year: selectedDate.getFullYear()
                })
            });
            if (res.ok) {
                const saved = await res.json();
                setRequirements([saved, ...requirements]);
                setIsReqModalOpen(false);
                setNewReqData({ name: '', description: '', dueDate: '', categoryId: '' });
            }
        } catch (err) { console.error(err); }
    };

    const handleUpdateRequirementStatus = async (reqId: string, updates: any) => {
        try {
            const res = await fetch(`${API_URL}/requirements/${reqId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (res.ok) {
                const updated = await res.json();
                setRequirements(requirements.map(r => r.id === reqId ? { ...r, ...updated } : r));
            }
        } catch (err) { console.error(err); }
    };

    const handleDeleteRequirement = async (id: string) => {
        if (!confirm('¿Eliminar este requerimiento?')) return;
        try {
            await fetch(`${API_URL}/requirements/${id}`, { method: 'DELETE' });
            setRequirements(requirements.filter(r => r.id !== id));
        } catch (err) { console.error(err); }
    };

    const handleCopyRequirements = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClientId) return;

        try {
            const res = await fetch(`${API_URL}/clients/${selectedClientId}/requirements/copy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fromMonth: copySourceDate.getMonth() + 1,
                    fromYear: copySourceDate.getFullYear(),
                    toMonth: selectedDate.getMonth() + 1,
                    toYear: selectedDate.getFullYear()
                })
            });

            if (res.ok) {
                const result = await res.json();
                if (result.count > 0) {
                    // Refresh list
                    fetchRequirements(selectedClientId);
                    setIsCopyModalOpen(false);
                } else {
                    alert('No se encontraron requerimientos en el mes seleccionado para copiar.');
                }
            } else {
                const err = await res.json();
                alert(err.error || 'Error al copiar requerimientos');
            }
        } catch (err) { console.error(err); }
    };

    const handleUploadDocument = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClientId) return;

        try {
            const formData = new FormData();
            formData.append('name', uploadData.name);
            formData.append('type', uploadData.type);
            formData.append('clientId', selectedClientId);
            formData.append('requirementId', uploadData.requirementId);

            if (selectedFile) {
                formData.append('file', selectedFile);
            } else if (uploadData.url) {
                formData.append('url', uploadData.url);
            }

            const res = await fetch(`${API_URL}/documents`, {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                // Refresh requirements to see the new doc attached
                fetchRequirements(selectedClientId);
                setIsUploadModalOpen(false);
                setUploadData({ name: '', url: '', type: 'OTHER', requirementId: '' });
                setSelectedFile(null);
                setFileInputKey(prev => prev + 1);
            }
        } catch (err) { console.error(err); }
    };

    const handleUpdateDocStatus = async (docId: string, newStatus: 'APPROVED' | 'REJECTED') => {
        try {
            const res = await fetch(`${API_URL}/documents/${docId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                if (selectedClientId) fetchRequirements(selectedClientId);
            }
        } catch (err) { console.error(err); }
    };

    const changeMonth = (offset: number) => {
        const newDate = new Date(selectedDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setSelectedDate(newDate);
    };

    return (
        <div className="flex h-full flex-col space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Control Documental</h1>
                    <p className="text-slate-500 mt-1">Gestión de cumplimiento por empresa</p>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6 h-[calc(100vh-12rem)]">
                {/* Client List */}
                <div className="col-span-4 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                        <h2 className="font-semibold text-slate-700">Empresas</h2>
                    </div>
                    <div className="overflow-y-auto flex-1">
                        {clients.map(client => (
                            <div
                                key={client.id}
                                onClick={() => setSelectedClientId(client.id)}
                                className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${selectedClientId === client.id ? 'bg-blue-50 border-blue-100' : ''}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${selectedClientId === client.id ? 'bg-blue-200 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                                        <Building2 size={20} />
                                    </div>
                                    <div>
                                        <h3 className={`font-medium ${selectedClientId === client.id ? 'text-blue-900' : 'text-slate-700'}`}>
                                            {client.razonSocial}
                                        </h3>
                                        <p className="text-xs text-slate-400">{client.rut}</p>
                                    </div>
                                    <ChevronRight size={16} className={`ml-auto ${selectedClientId === client.id ? 'text-blue-500' : 'text-slate-300'}`} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Requirements Detail */}
                <div className="col-span-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    {selectedClient ? (
                        <>
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">{selectedClient.razonSocial}</h2>
                                    <div className="flex items-center gap-4 mt-2">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-200 rounded">
                                                <ChevronDown className="rotate-90 text-slate-500" size={16} />
                                            </button>
                                            <span className="font-medium text-slate-600 min-w-[120px] text-center">
                                                {selectedDate.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
                                            </span>
                                            <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-200 rounded">
                                                <ChevronDown className="-rotate-90 text-slate-500" size={16} />
                                            </button>
                                        </div>

                                        {/* Period EDP Date */}
                                        <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-lg">
                                            <span className="text-xs font-semibold text-slate-500">Hoja Ruta EDP:</span>
                                            <input
                                                type="date"
                                                className="border-none p-0 text-sm focus:ring-0 text-slate-700 bg-transparent"
                                                value={monthlyInfo?.edpDate ? new Date(monthlyInfo.edpDate).toISOString().split('T')[0] : ''}
                                                onChange={(e) => handleUpdateMonthlyInfo(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsReqModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
                                >
                                    <Plus size={16} />
                                    Nuevo Requerimiento
                                </button>
                                <button
                                    onClick={() => setIsCopyModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors text-sm font-medium ml-2"
                                    title="Copiar de otro mes"
                                >
                                    <Copy size={16} />
                                    Importar
                                </button>
                                <button
                                    onClick={() => setIsCatModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors text-sm font-medium ml-2"
                                    title="Gestionar Categorías"
                                >
                                    <Building2 size={16} />
                                    Categorías
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                                {loading ? (
                                    <div className="text-center py-10 text-slate-400">Cargando...</div>
                                ) : requirements.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        <FileText size={40} className="mx-auto mb-3 opacity-20" />
                                        <p>No hay requerimientos para este mes.</p>
                                    </div>
                                ) : (
                                    // Group by category
                                    Object.entries(requirements.reduce((acc, req) => {
                                        const catId = req.categoryId || 'uncategorized';
                                        if (!acc[catId]) acc[catId] = [];
                                        acc[catId].push(req);
                                        return acc;
                                    }, {} as Record<string, DocumentRequirement[]>)).map(([catId, reqs]: [string, DocumentRequirement[]]) => {
                                        const category = categories.find(c => c.id === catId);
                                        const catName = category ? category.name : 'Sin Categoría';

                                        return (
                                            <div key={catId}>
                                                <h3 className="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
                                                    {category && <span className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color || '#cbd5e1' }}></span>}
                                                    {catName}
                                                    <span className="text-xs font-normal text-slate-400 ml-2">({reqs.length})</span>
                                                </h3>
                                                <div className="space-y-4">
                                                    {reqs.map(req => {
                                                        const hasDocs = req.documents && req.documents.length > 0;
                                                        // Status logic
                                                        const status = req.status || 'PENDING';

                                                        const isApproved = req.documents?.some(d => d.status === 'APPROVED');

                                                        // Determine container color and icon based on status
                                                        let containerColor = 'bg-red-50 text-red-500';
                                                        let StatusIcon = AlertCircle;

                                                        if (isApproved || status === 'OK') {
                                                            containerColor = 'bg-green-100 text-green-600';
                                                            StatusIcon = CheckCircle;
                                                        } else if (status === 'REVIEW') {
                                                            containerColor = 'bg-yellow-50 text-yellow-600';
                                                            StatusIcon = Clock;
                                                        }

                                                        return (
                                                            <div key={req.id} className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow group bg-white">
                                                                <div className="flex justify-between items-start mb-4">
                                                                    <div className="flex items-start gap-4">
                                                                        <div className={`p-2 rounded-full mt-1 ${containerColor}`}>
                                                                            <StatusIcon size={24} strokeWidth={2.5} />
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <div className="flex justify-between items-center w-full gap-4">
                                                                                <h3 className="font-semibold text-slate-800 text-lg">{req.name}</h3>
                                                                                <div className="flex items-center gap-3">
                                                                                    {req.dueDate && (
                                                                                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                                                                            Vence: {new Date(req.dueDate).toLocaleDateString()}
                                                                                        </span>
                                                                                    )}

                                                                                    <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-1">
                                                                                        <button
                                                                                            onClick={() => handleUpdateRequirementStatus(req.id, { status: 'PENDING' })}
                                                                                            className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${status === 'PENDING' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-500 hover:text-red-500'}`}
                                                                                        >
                                                                                            Sin enviar
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => handleUpdateRequirementStatus(req.id, { status: 'REVIEW' })}
                                                                                            className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${status === 'REVIEW' ? 'bg-yellow-400 text-slate-800 shadow-sm' : 'text-slate-500 hover:text-yellow-500'}`}
                                                                                        >
                                                                                            En revisión
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => handleUpdateRequirementStatus(req.id, { status: 'OK' })}
                                                                                            className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${status === 'OK' ? 'bg-green-500 text-white shadow-sm' : 'text-slate-500 hover:text-green-500'}`}
                                                                                        >
                                                                                            OK
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            {req.description && <p className="text-slate-500 text-sm mt-1">{req.description}</p>}

                                                                            <div className="mt-3 space-y-2">
                                                                                {req.documents?.map(doc => {
                                                                                    let statusColor = 'bg-slate-100 text-slate-600';
                                                                                    if (doc.status === 'APPROVED') statusColor = 'bg-green-50 text-green-700 border border-green-200';
                                                                                    if (doc.status === 'REJECTED') statusColor = 'bg-red-50 text-red-700 border border-red-200';
                                                                                    if (doc.status === 'PENDING') statusColor = 'bg-yellow-50 text-yellow-700 border border-yellow-200';

                                                                                    return (
                                                                                        <div key={doc.id} className={`flex items-center justify-between gap-2 text-sm p-2 rounded-md ${statusColor}`}>
                                                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                                                <FileText size={16} className="shrink-0" />
                                                                                                <a href={doc.url} target="_blank" rel="noreferrer" className="hover:underline font-medium truncate">
                                                                                                    {doc.name || 'Documento adjunto'}
                                                                                                </a>
                                                                                                {doc.status === 'APPROVED' && <CheckCircle size={14} className="shrink-0 text-green-600" />}
                                                                                                {doc.status === 'REJECTED' && <XCircle size={14} className="shrink-0 text-red-600" />}
                                                                                            </div>
                                                                                            <div className="flex items-center gap-1 shrink-0">
                                                                                                {doc.status !== 'APPROVED' && (
                                                                                                    <button onClick={() => handleUpdateDocStatus(doc.id, 'APPROVED')} className="p-1 hover:bg-green-200 text-green-700 rounded" title="Aprobar">
                                                                                                        <CheckCircle size={16} />
                                                                                                    </button>
                                                                                                )}
                                                                                                {doc.status !== 'REJECTED' && (
                                                                                                    <button onClick={() => handleUpdateDocStatus(doc.id, 'REJECTED')} className="p-1 hover:bg-red-200 text-red-700 rounded" title="Rechazar">
                                                                                                        <XCircle size={16} />
                                                                                                    </button>
                                                                                                )}
                                                                                                <span className="text-xs opacity-70 ml-1">
                                                                                                    {new Date(doc.createdAt).toLocaleDateString()}
                                                                                                </span>
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button
                                                                            onClick={() => {
                                                                                setUploadData({ ...uploadData, requirementId: req.id, name: req.name });
                                                                                setIsUploadModalOpen(true);
                                                                            }}
                                                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                                                            title="Subir documento"
                                                                        >
                                                                            <Upload size={18} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteRequirement(req.id)}
                                                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                                            title="Eliminar requerimiento"
                                                                        >
                                                                            <Trash2 size={18} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                            <Building2 size={48} className="mb-4 opacity-20" />
                            <p className="text-lg">Seleccione una empresa para gestionar su documentación</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Requirement Modal */}
            {isReqModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-slate-800">Nuevo Requerimiento</h2>
                            <p className="text-sm text-slate-500">{selectedDate.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</p>
                        </div>
                        <form onSubmit={handleAddRequirement} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Requerimiento</label>
                                <input
                                    required
                                    placeholder="Ej: Escritura, Rol Tributario, Cédula Representante"
                                    className="w-full rounded-lg border-slate-200 focus:ring-2 focus:ring-blue-500 transition-all"
                                    value={newReqData.name}
                                    onChange={e => setNewReqData({ ...newReqData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción (Opcional)</label>
                                <textarea
                                    className="w-full rounded-lg border-slate-200 focus:ring-2 focus:ring-blue-500 transition-all"
                                    rows={2}
                                    value={newReqData.description}
                                    onChange={e => setNewReqData({ ...newReqData, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                                <select
                                    className="w-full rounded-lg border-slate-200 focus:ring-2 focus:ring-blue-500 transition-all"
                                    value={newReqData.categoryId}
                                    onChange={e => setNewReqData({ ...newReqData, categoryId: e.target.value })}
                                >
                                    <option value="">-- Sin Categoría --</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Vencimiento</label>
                                    <input
                                        type="date"
                                        className="w-full rounded-lg border-slate-200 focus:ring-2 focus:ring-blue-500"
                                        value={newReqData.dueDate}
                                        onChange={e => setNewReqData({ ...newReqData, dueDate: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsReqModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-medium">Crear</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Upload Document Modal */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-slate-800">Subir Documento</h2>
                            <p className="text-sm text-slate-500 mt-1">Para: {requirements.find(r => r.id === uploadData.requirementId)?.name}</p>
                        </div>
                        <form onSubmit={handleUploadDocument} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Archivo</label>
                                <input
                                    required
                                    className="w-full rounded-lg border-slate-200 focus:ring-2 focus:ring-blue-500"
                                    value={uploadData.name}
                                    onChange={e => setUploadData({ ...uploadData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Archivo</label>
                                <input
                                    key={fileInputKey}
                                    type="file"
                                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mb-2"
                                    onChange={(e) => {
                                        const file = e.target.files ? e.target.files[0] : null;
                                        setSelectedFile(file);
                                        if (file && !uploadData.name) {
                                            setUploadData(prev => ({ ...prev, name: file.name }));
                                        }
                                    }}
                                />
                                <div className="text-center text-xs text-slate-400 my-2">- O -</div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">URL / Link Externo</label>
                                <input
                                    placeholder="https://..."
                                    className="w-full rounded-lg border-slate-200 focus:ring-2 focus:ring-blue-500"
                                    value={uploadData.url}
                                    onChange={e => setUploadData({ ...uploadData, url: e.target.value })}
                                    disabled={!!selectedFile}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                                <select
                                    className="w-full rounded-lg border-slate-200"
                                    value={uploadData.type}
                                    onChange={e => setUploadData({ ...uploadData, type: e.target.value })}
                                >
                                    <option value="OTHER">Otro</option>
                                    <option value="PDF">PDF</option>
                                    <option value="IMAGE">Imagen</option>
                                    <option value="CONTRACT">Contrato</option>
                                </select>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsUploadModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Guardar Documento</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Category Manager Modal */}
            {isCatModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-slate-800">Gestionar Categorías</h2>
                            <p className="text-sm text-slate-500">Categorías de documentos para organizar requerimientos.</p>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handleAddCategory} className="flex gap-2 mb-6">
                                <input
                                    required
                                    placeholder="Nombre de categoría"
                                    className="flex-1 rounded-lg border-slate-200 focus:ring-2 focus:ring-blue-500"
                                    value={newCatData.name}
                                    onChange={e => setNewCatData({ ...newCatData, name: e.target.value })}
                                />
                                <input
                                    type="color"
                                    className="h-10 w-10 p-1 rounded-lg border border-slate-200 cursor-pointer"
                                    value={newCatData.color}
                                    onChange={e => setNewCatData({ ...newCatData, color: e.target.value })}
                                />
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                    <Plus size={20} />
                                </button>
                            </form>

                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {categories.length === 0 ? (
                                    <p className="text-center text-slate-400 text-sm">No hay categorías creadas.</p>
                                ) : (
                                    categories.map(cat => (
                                        <div key={cat.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }}></div>
                                                <span className="font-medium text-slate-700">{cat.name}</span>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteCategory(cat.id)}
                                                className="text-slate-400 hover:text-red-500"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="mt-6 text-right">
                                <button onClick={() => setIsCatModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
