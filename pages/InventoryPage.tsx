import React, { useState, useEffect } from 'react';
import { Package, ArrowUp, ArrowDown, History, Plus, Search, Filter } from 'lucide-react';

interface Material {
    id: string;
    name: string;
    code: string;
    unit: string;
    minStock: number;
    stock?: number;
}

export function InventoryPage() {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal states
    const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
    const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
    const [selectedMaterialId, setSelectedMaterialId] = useState('');

    // Forms
    const [materialForm, setMaterialForm] = useState({ name: '', code: '', unit: 'UNAP', minStock: 10 });
    const [movementForm, setMovementForm] = useState({ materialId: '', type: 'IN', quantity: 0, notes: '' });

    useEffect(() => {
        fetchMaterials();
    }, []);

    const fetchMaterials = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/inventory/materials');
            const data = res.ok ? await res.json() : [];
            setMaterials(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to fetch materials", err);
            setMaterials([]);
        } finally {
            setLoading(false);
        }
    };

    const handleMaterialSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:3001/api/inventory/materials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(materialForm)
            });
            if (res.ok) {
                const newMat = await res.json();
                setMaterials([newMat, ...materials]);
                setIsMaterialModalOpen(false);
                setMaterialForm({ name: '', code: '', unit: 'UNAP', minStock: 10 });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleMovementSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:3001/api/inventory/movements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(movementForm)
            });
            if (res.ok) {
                // Update local stock roughly or re-fetch
                const movement = await res.json();
                // Refetch to ensure sync
                fetchMaterials();
                setIsMovementModalOpen(false);
                setMovementForm({ materialId: '', type: 'IN', quantity: 0, notes: '' });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const filteredMaterials = materials.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex-1">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Inventario de Materiales</h1>
                    <p className="text-slate-500 mt-1">Control de stock de pañol y movimientos</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsMovementModalOpen(true)}
                        className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-50 transition-colors"
                    >
                        <History size={20} />
                        Registrar Movimiento
                    </button>
                    <button
                        onClick={() => setIsMaterialModalOpen(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus size={20} />
                        Nuevo Material
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                            <Package size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Total Items</p>
                            <p className="text-2xl font-bold text-slate-800">{materials.length}</p>
                        </div>
                    </div>
                </div>
                {/* Add more stats if needed */}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center gap-4 bg-slate-50">
                    <Search className="text-slate-400" size={20} />
                    <input
                        placeholder="Buscar material..."
                        className="bg-transparent border-none outline-none text-sm w-full font-medium text-slate-600"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <table className="w-full text-left">
                    <thead className="bg-white border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Código</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Material</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Unidad</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Stock Actual</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Min. Stock</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredMaterials.map((mat) => (
                            <tr key={mat.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-mono text-xs text-slate-500">{mat.code}</td>
                                <td className="px-6 py-4 font-bold text-slate-700">{mat.name}</td>
                                <td className="px-6 py-4 text-sm text-slate-500">{mat.unit}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${(mat.stock || 0) <= mat.minStock ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                        {mat.stock || 0}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-xs text-slate-400">{mat.minStock}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal New Material */}
            {isMaterialModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4">Nuevo Material</h2>
                        <form onSubmit={handleMaterialSubmit} className="space-y-4">
                            <input placeholder="Nombre" className="w-full p-2 border rounded" required value={materialForm.name} onChange={e => setMaterialForm({ ...materialForm, name: e.target.value })} />
                            <input placeholder="Código (SKU)" className="w-full p-2 border rounded" required value={materialForm.code} onChange={e => setMaterialForm({ ...materialForm, code: e.target.value })} />
                            <input placeholder="Unidad (UN, KG, M)" className="w-full p-2 border rounded" required value={materialForm.unit} onChange={e => setMaterialForm({ ...materialForm, unit: e.target.value })} />
                            <input type="number" placeholder="Stock Mínimo" className="w-full p-2 border rounded" required value={materialForm.minStock} onChange={e => setMaterialForm({ ...materialForm, minStock: Number(e.target.value) })} />
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setIsMaterialModalOpen(false)} className="px-4 py-2 text-slate-600">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Movement */}
            {isMovementModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4">Registrar Movimiento</h2>
                        <form onSubmit={handleMovementSubmit} className="space-y-4">
                            <select className="w-full p-2 border rounded" required value={movementForm.materialId} onChange={e => setMovementForm({ ...movementForm, materialId: e.target.value })}>
                                <option value="">Seleccione Material...</option>
                                {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                            <select className="w-full p-2 border rounded" value={movementForm.type} onChange={e => setMovementForm({ ...movementForm, type: e.target.value })}>
                                <option value="IN">Entrada (Compra/Devolución)</option>
                                <option value="OUT">Salida (Consumo/Pérdida)</option>
                            </select>
                            <input type="number" placeholder="Cantidad" className="w-full p-2 border rounded" required value={movementForm.quantity} onChange={e => setMovementForm({ ...movementForm, quantity: Number(e.target.value) })} />
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setIsMovementModalOpen(false)} className="px-4 py-2 text-slate-600">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Registrar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
