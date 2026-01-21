import React, { useState, useEffect } from 'react';
import { FileText, Trash2, Upload, Search, Link as LinkIcon, File } from 'lucide-react';
import { API_URL } from '../src/config.ts';

interface Document {
    id: string;
    name: string;
    type: string;
    url: string;
    createdAt: string;
    referenceId?: string;
}

export function DocumentsPage() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        type: 'OTHER',
        url: '',
        referenceId: ''
    });

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            const res = await fetch(`${API_URL}/documents`);
            const data = res.ok ? await res.json() : [];
            setDocuments(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to fetch documents", err);
            setDocuments([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar documento?")) return;
        try {
            await fetch(`${API_URL}/documents/${id}`, { method: 'DELETE' });
            setDocuments(documents.filter(d => d.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/documents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                const newDoc = await res.json();
                setDocuments([newDoc, ...documents]);
                setIsModalOpen(false);
                setFormData({ name: '', type: 'OTHER', url: '', referenceId: '' });
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="flex-1">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Gestión Documental</h1>
                    <p className="text-slate-500 mt-1">Repositorio centralizado de documentos</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Upload size={20} />
                    Subir Documento
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Nombre</th>
                            <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Tipo</th>
                            <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Fecha</th>
                            <th className="px-6 py-4 font-semibold text-slate-600 text-sm text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {documents.map((doc) => (
                            <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                            <File size={20} />
                                        </div>
                                        <span className="font-medium text-slate-700">{doc.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-semibold">{doc.type}</span>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500">
                                    {new Date(doc.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {doc.url && (
                                            <a href={doc.url} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                <LinkIcon size={18} />
                                            </a>
                                        )}
                                        <button onClick={() => handleDelete(doc.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {documents.length === 0 && (
                    <div className="p-8 text-center text-slate-500 italic">No hay documentos registrados.</div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-slate-800">Nuevo Documento</h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                                <input
                                    required
                                    className="w-full rounded-lg border-slate-200"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                                <select
                                    className="w-full rounded-lg border-slate-200"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="OTHER">Otro</option>
                                    <option value="INVOICE">Factura</option>
                                    <option value="CONTRACT">Contrato</option>
                                    <option value="RECEIPT">Comprobante</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">URL (Referencia)</label>
                                <input
                                    className="w-full rounded-lg border-slate-200"
                                    placeholder="https://..."
                                    value={formData.url}
                                    onChange={e => setFormData({ ...formData, url: e.target.value })}
                                />
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
