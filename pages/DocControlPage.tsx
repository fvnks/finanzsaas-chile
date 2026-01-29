import React, { useState, useEffect } from 'react';
import { Building2, FileText, CheckCircle, AlertCircle, Upload, ChevronRight, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { API_URL } from '../src/config.ts';
import { Client, DocumentRequirement, Document } from '../types.ts';

interface DocControlPageProps {
    clients: Client[];
}

export function DocControlPage({ clients }: DocControlPageProps) {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [requirements, setRequirements] = useState<DocumentRequirement[]>([]);
    const [loading, setLoading] = useState(false);

    // Modal states
    const [isReqModalOpen, setIsReqModalOpen] = useState(false);
    const [newReqData, setNewReqData] = useState({ name: '', description: '' });

    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadData, setUploadData] = useState({ name: '', url: '', type: 'OTHER', requirementId: '' });

    const selectedClient = clients.find(c => c.id === selectedClientId);

    useEffect(() => {
        if (selectedClientId) {
            fetchRequirements(selectedClientId);
        } else {
            setRequirements([]);
        }
    }, [selectedClientId, selectedDate]);

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
                setNewReqData({ name: '', description: '' });
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

    const handleUploadDocument = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClientId) return;

        try {
            const payload = {
                ...uploadData,
                clientId: selectedClientId,
                projectId: '' // Optional context
            };

            const res = await fetch(`${API_URL}/documents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                // Refresh requirements to see the new doc attached
                fetchRequirements(selectedClientId);
                setIsUploadModalOpen(false);
                setUploadData({ name: '', url: '', type: 'OTHER', requirementId: '' });
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
                                    <div className="flex items-center gap-2 mt-1">
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
                                </div>
                                <button
                                    onClick={() => setIsReqModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
                                >
                                    <Plus size={16} />
                                    Nuevo Requerimiento
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {loading ? (
                                    <div className="text-center py-10 text-slate-400">Cargando...</div>
                                ) : requirements.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        <FileText size={40} className="mx-auto mb-3 opacity-20" />
                                        <p>No hay requerimientos para este mes.</p>
                                    </div>
                                ) : (
                                    requirements.map(req => {
                                        const hasDocs = req.documents && req.documents.length > 0;
                                        return (
                                            <div key={req.id} className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow group">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-start gap-4">
                                                        <div className={`p-2 rounded-full mt-1 ${hasDocs ? 'bg-green-100 text-green-600' : 'bg-red-50 text-red-400'}`}>
                                                            {hasDocs ? <CheckCircle size={24} strokeWidth={2.5} /> : <AlertCircle size={24} strokeWidth={2} />}
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold text-slate-800 text-lg">{req.name}</h3>
                                                            {req.description && <p className="text-slate-500 text-sm mt-1">{req.description}</p>}

                                                            <div className="mt-3 space-y-2">
                                                                {req.documents?.map(doc => (
                                                                    <div key={doc.id} className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md w-fit">
                                                                        <FileText size={14} />
                                                                        <a href={doc.url} target="_blank" rel="noreferrer" className="hover:underline font-medium">
                                                                            {doc.name || 'Documento adjunto'}
                                                                        </a>
                                                                        <span className="text-xs text-blue-400 ml-2">({new Date(doc.createdAt).toLocaleDateString()})</span>
                                                                    </div>
                                                                ))}
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
                                    rows={3}
                                    value={newReqData.description}
                                    onChange={e => setNewReqData({ ...newReqData, description: e.target.value })}
                                />
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
                                <label className="block text-sm font-medium text-slate-700 mb-1">URL / Link</label>
                                <input
                                    required
                                    placeholder="https://..."
                                    className="w-full rounded-lg border-slate-200 focus:ring-2 focus:ring-blue-500"
                                    value={uploadData.url}
                                    onChange={e => setUploadData({ ...uploadData, url: e.target.value })}
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
        </div>
    );
}
