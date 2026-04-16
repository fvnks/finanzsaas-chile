import React, { useState } from 'react';
import { Package, Search, Plus, Wrench, ArrowLeftRight, CheckCircle2 } from 'lucide-react';
import { User, Epp, EppDelivery, ToolAssignment, Tool, Worker } from '../types';
import { API_URL } from '../src/config';
import { checkPermission } from '../src/utils/permissions';
import { useCompany } from '../components/CompanyContext';

interface DeliveriesPageProps {
    epps: Epp[];
    eppDeliveries: EppDelivery[];
    toolAssignments: ToolAssignment[];
    tools: Tool[];
    workers: Worker[];
    currentUser: User | null;
    refreshData: () => void;
}

export default function DeliveriesPage({ epps, eppDeliveries, toolAssignments, tools, workers, currentUser, refreshData }: DeliveriesPageProps) {
    const { activeCompany } = useCompany();
    const [activeTab, setActiveTab] = useState<'EPP' | 'TOOLS'>('EPP');
    const [searchTerm, setSearchTerm] = useState('');

    // EPP Form State
    const [isCreatingEpp, setIsCreatingEpp] = useState(false);
    const [eppName, setEppName] = useState('');
    const [eppDesc, setEppDesc] = useState('');
    const [eppStock, setEppStock] = useState('0');

    // EPP Delivery State
    const [isDeliveringEpp, setIsDeliveringEpp] = useState(false);
    const [selectedEppId, setSelectedEppId] = useState('');
    const [selectedWorkerId, setSelectedWorkerId] = useState('');
    const [deliveryQty, setDeliveryQty] = useState('1');
    const [deliveryNotes, setDeliveryNotes] = useState('');

    // Tool Assignment State
    const [isAssigningTool, setIsAssigningTool] = useState(false);
    const [selectedToolId, setSelectedToolId] = useState('');
    const [assignWorkerId, setAssignWorkerId] = useState('');
    const [assignNotes, setAssignNotes] = useState('');

    const canEdit = checkPermission(currentUser, 'deliveries', 'create')
        || checkPermission(currentUser, 'deliveries', 'update')
        || checkPermission(currentUser, 'deliveries', 'delete');
    const getHeaders = () => ({ 'Content-Type': 'application/json', 'x-company-id': activeCompany?.id || '' });

    // Filter available tools
    const availableTools = tools.filter(t => t.status === 'AVAILABLE');
    const activeAssignments = toolAssignments.filter(a => !a.returnedAt);

    const handleCreateEpp = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/epp`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ name: eppName, description: eppDesc, stock: Number(eppStock) })
            });
            if (res.ok) {
                setIsCreatingEpp(false);
                refreshData();
            }
        } catch (err) { console.error(err); }
    };

    const handleDeliverEpp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEppId || !selectedWorkerId) return;
        try {
            const res = await fetch(`${API_URL}/epp-deliveries`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    eppId: selectedEppId,
                    workerId: selectedWorkerId,
                    quantity: Number(deliveryQty),
                    date: new Date().toISOString(),
                    notes: deliveryNotes
                })
            });
            if (res.ok) {
                setIsDeliveringEpp(false);
                refreshData();
            }
        } catch (err) { console.error(err); }
    };

    const handleAssignTool = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedToolId || !assignWorkerId) return;
        try {
            const res = await fetch(`${API_URL}/tool-assignments`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    toolId: selectedToolId,
                    workerId: assignWorkerId,
                    assignedAt: new Date().toISOString(),
                    notes: assignNotes
                })
            });
            if (res.ok) {
                setIsAssigningTool(false);
                refreshData();
            }
        } catch (err) { console.error(err); }
    };

    const handleReturnTool = async (assignmentId: string) => {
        if (!window.confirm('¿Confirmar devolución de la herramienta?')) return;
        try {
            await fetch(`${API_URL}/tool-assignments/${assignmentId}/return`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ returnedAt: new Date().toISOString() })
            });
            refreshData();
        } catch (err) { console.error(err); }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Entregador y Control Inventario</h2>
                <p className="text-sm text-gray-500 mt-1">Gestión de EPP y asignaciones temporales de Herramientas.</p>
            </div>

            <div className="flex space-x-4 border-b border-gray-200">
                <button
                    className={`pb-2 px-1 font-medium transition-colors border-b-2 ${activeTab === 'EPP' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}
                    onClick={() => setActiveTab('EPP')}
                >
                    <Package className="inline-block w-4 h-4 mr-2" />
                    Inventario EPP
                </button>
                <button
                    className={`pb-2 px-1 font-medium transition-colors border-b-2 ${activeTab === 'TOOLS' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}
                    onClick={() => setActiveTab('TOOLS')}
                >
                    <Wrench className="inline-block w-4 h-4 mr-2" />
                    Herramientas en Terreno
                </button>
            </div>

            {/* EPP VIEW */}
            {activeTab === 'EPP' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Buscar EPP..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        {canEdit && (
                            <div className="space-x-3 flex">
                                <button
                                    onClick={() => { setIsCreatingEpp(true); setEppName(''); setEppStock('0'); }}
                                    className="flex items-center space-x-2 bg-gray-100 text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
                                >
                                    <Plus size={18} />
                                    <span>Crear EPP</span>
                                </button>
                                <button
                                    onClick={() => { setIsDeliveringEpp(true); setSelectedEppId(''); setSelectedWorkerId(''); }}
                                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                                >
                                    <ArrowLeftRight size={18} />
                                    <span>Entregar Puesto</span>
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* EPP Stock List */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                                <Package className="mr-2 text-slate-400" size={20} /> Stock Actual
                            </h3>
                            <ul className="space-y-3">
                                {epps.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase())).map(epp => (
                                    <li key={epp.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <div>
                                            <p className="font-semibold text-gray-800">{epp.name}</p>
                                            <p className="text-xs text-gray-500">{epp.description}</p>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-sm font-bold ${epp.stock > 5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {epp.stock} Unid.
                                        </div>
                                    </li>
                                ))}
                                {epps.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No hay EPP registrados. Crea tu inventario primero.</p>}
                            </ul>
                        </div>

                        {/* Recent deliveries */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                                <CheckCircle2 className="mr-2 text-slate-400" size={20} /> Últimas Entregas
                            </h3>
                            <ul className="space-y-3">
                                {eppDeliveries.slice(0, 8).map(delivery => (
                                    <li key={delivery.id} className="text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <div className="flex justify-between font-medium">
                                            <span className="text-blue-700">{delivery.worker?.name || 'Trabajador'}</span>
                                            <span className="text-gray-500">{new Date(delivery.date).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-gray-600 mt-1">
                                            Recibió <strong className="text-gray-800">{delivery.quantity}x {delivery.epp?.name}</strong>
                                        </p>
                                        {delivery.notes && <p className="text-xs text-gray-400 mt-1 italic">"{delivery.notes}"</p>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* TOOLS ASSIGNMENT VIEW */}
            {activeTab === 'TOOLS' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Buscar en asignaciones activas..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        {canEdit && (
                            <button
                                onClick={() => { setIsAssigningTool(true); setSelectedToolId(''); setAssignWorkerId(''); }}
                                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                            >
                                <ArrowLeftRight size={18} />
                                <span>Asignar Herramienta</span>
                            </button>
                        )}
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trabajador</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Herramienta</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Asignación</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {activeAssignments.filter(a => a.worker?.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.tool?.name.toLowerCase().includes(searchTerm.toLowerCase())).map(assignment => (
                                    <tr key={assignment.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-gray-900">{assignment.worker?.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-gray-900 font-medium">{assignment.tool?.name}</div>
                                            <div className="text-xs text-gray-500">SN: {assignment.tool?.serialNumber || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(assignment.assignedAt).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => handleReturnTool(assignment.id)} className="text-indigo-600 hover:text-indigo-900 hover:underline">
                                                Devolver Herramienta
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {activeAssignments.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No hay herramientas prestadas a trabajadores en este momento.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* CREATE EPP MODAL */}
            {isCreatingEpp && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <form onSubmit={handleCreateEpp} className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-slideUp">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-lg font-bold text-gray-800">Agregar Ítem EPP</h3>
                            <button type="button" onClick={() => setIsCreatingEpp(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Artículo *</label>
                                <input required type="text" value={eppName} onChange={e => setEppName(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Stock Inicial *</label>
                                <input required type="number" min="0" value={eppStock} onChange={e => setEppStock(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>
                        <div className="p-6 pt-0 flex justify-end gap-3">
                            <button type="button" onClick={() => setIsCreatingEpp(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Guardar Inventario</button>
                        </div>
                    </form>
                </div>
            )}

            {/* DELIVER EPP MODAL */}
            {isDeliveringEpp && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <form onSubmit={handleDeliverEpp} className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-slideUp">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-blue-50/50">
                            <h3 className="text-lg font-bold text-gray-800">Entregar EPP</h3>
                            <button type="button" onClick={() => setIsDeliveringEpp(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Trabajador *</label>
                                <select required value={selectedWorkerId} onChange={e => setSelectedWorkerId(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                                    <option value="">Seleccione trabajador...</option>
                                    {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Artículo EPP *</label>
                                <select required value={selectedEppId} onChange={e => setSelectedEppId(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                                    <option value="">Seleccione EPP...</option>
                                    {epps.map(e => <option key={e.id} value={e.id}>{e.name} (Stock: {e.stock})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad *</label>
                                <input required type="number" min="1" max={epps.find(e => e.id === selectedEppId)?.stock || 1} value={deliveryQty} onChange={e => setDeliveryQty(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>
                        <div className="p-6 pt-0 flex justify-end gap-3">
                            <button type="button" onClick={() => setIsDeliveringEpp(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Confirmar Entrega</button>
                        </div>
                    </form>
                </div>
            )}

            {/* ASSIGN TOOL MODAL */}
            {isAssigningTool && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <form onSubmit={handleAssignTool} className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-slideUp">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-indigo-50/50">
                            <h3 className="text-lg font-bold text-gray-800">Asignar Herramienta</h3>
                            <button type="button" onClick={() => setIsAssigningTool(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Trabajador *</label>
                                <select required value={assignWorkerId} onChange={e => setAssignWorkerId(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                                    <option value="">Seleccione trabajador...</option>
                                    {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Herramienta Disponible *</label>
                                <select required value={selectedToolId} onChange={e => setSelectedToolId(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                                    <option value="">Seleccione herramienta...</option>
                                    {availableTools.map(t => <option key={t.id} value={t.id}>{t.name} {t.serialNumber ? `(SN: ${t.serialNumber})` : ''}</option>)}
                                    {availableTools.length === 0 && <option value="" disabled>No hay herramientas disponibles</option>}
                                </select>
                            </div>
                        </div>
                        <div className="p-6 pt-0 flex justify-end gap-3">
                            <button type="button" onClick={() => setIsAssigningTool(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700" disabled={availableTools.length === 0}>Asignar Herramienta</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
