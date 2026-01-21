import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, Check, X, Eye } from 'lucide-react';
import { API_URL } from '../src/config.ts';


interface PurchaseOrder {
    id: string;
    number: string;
    provider: string;
    date: string;
    status: string;
    projectId: string;
    project?: { name: string };
    items: any[];
    total?: number;
}

interface Project {
    id: string;
    name: string;
}

export function PurchaseOrdersPage() {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    // Form State
    const [formData, setFormData] = useState({
        number: '',
        provider: '',
        date: new Date().toISOString().split('T')[0],
        projectId: '',
        items: [{ description: '', quantity: 1, unitPrice: 0 }]
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                const [ordersRes, projectsRes] = await Promise.all([
                    fetch(`${API_URL}/purchase-orders`),
                    fetch(`${API_URL}/projects`)
                ]);

                const ordersData = ordersRes.ok ? await ordersRes.json() : [];
                const projectsData = projectsRes.ok ? await projectsRes.json() : [];

                setOrders(Array.isArray(ordersData) ? ordersData : []);
                setProjects(Array.isArray(projectsData) ? projectsData : []);
            } catch (err) {
                console.error("Failed to load data", err);
                setOrders([]);
                setProjects([]);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/purchase-orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                const newOrder = await res.json();
                setOrders([newOrder, ...orders]);
                setIsModalOpen(false);
                // Reset form...
            }
        } catch (err) {
            console.error(err);
        }
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { description: '', quantity: 1, unitPrice: 0 }]
        });
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setFormData({ ...formData, items: newItems });
    };

    const calculateTotal = (order: PurchaseOrder) => {
        return order.items?.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0) || 0;
    };

    return (
        <div className="flex-1">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Órdenes de Compra</h1>
                    <p className="text-slate-500 mt-1">Gestión de adquisiciones y proveedores</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm"
                >
                    <Plus size={20} />
                    Nueva Orden
                </button>
            </div>

            {loading ? (
                <div>Cargando...</div>
            ) : (
                <div className="grid gap-4">
                    {orders.map((order) => (
                        <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-800">OC #{order.number}</h3>
                                    <p className="text-sm text-slate-500">{order.provider}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-8">
                                <div className="text-right">
                                    <p className="text-sm text-slate-500">Proyecto</p>
                                    <p className="font-medium text-slate-700">{order.project?.name || 'N/A'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-slate-500">Monto</p>
                                    <p className="font-medium text-slate-700">
                                        ${calculateTotal(order).toLocaleString('es-CL')}
                                    </p>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-medium 
                    ${order.status === 'PENDING' ? 'bg-amber-50 text-amber-600' :
                                        order.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                                    {order.status === 'PENDING' ? 'Pendiente' : order.status}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0">
                            <h2 className="text-xl font-bold text-gray-800">Nueva Orden de Compra</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Número OC</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                                        value={formData.number}
                                        onChange={e => setFormData({ ...formData, number: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Proveedor</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                                        value={formData.provider}
                                        onChange={e => setFormData({ ...formData, provider: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Proyecto</label>
                                    <select
                                        className="w-full rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                                        value={formData.projectId}
                                        onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                                    >
                                        <option value="">Seleccione un proyecto...</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-medium text-slate-800">Ítems</h3>
                                    <button type="button" onClick={addItem} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">+ Agregar Ítem</button>
                                </div>
                                <div className="space-y-3">
                                    {formData.items.map((item, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <input
                                                placeholder="Descripción"
                                                className="flex-1 rounded-lg border-slate-200 text-sm"
                                                value={item.description}
                                                onChange={e => updateItem(idx, 'description', e.target.value)}
                                            />
                                            <input
                                                type="number"
                                                placeholder="Cant."
                                                className="w-20 rounded-lg border-slate-200 text-sm"
                                                value={item.quantity}
                                                onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                                            />
                                            <input
                                                type="number"
                                                placeholder="Precio Unit."
                                                className="w-32 rounded-lg border-slate-200 text-sm"
                                                value={item.unitPrice}
                                                onChange={e => updateItem(idx, 'unitPrice', Number(e.target.value))}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                                >
                                    Guardar Orden
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
