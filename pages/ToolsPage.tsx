import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Wrench, Calendar, FileText, AlertTriangle } from 'lucide-react';
import { Tool, User, ToolMaintenance } from '../types';
import { checkPermission } from '../src/utils/permissions';

interface ToolsPageProps {
    tools: Tool[];
    currentUser: User | null;
    onAddTool: (tool: Omit<Tool, 'id' | 'maintenances'>) => void;
    onUpdateTool: (tool: Tool) => void;
    onDeleteTool: (id: string) => void;
    onAddMaintenance: (toolId: string, maintenance: Omit<ToolMaintenance, 'id' | 'toolId' | 'createdAt' | 'updatedAt'>) => void;
}

const statusColors = {
    AVAILABLE: 'bg-green-100 text-green-800',
    IN_USE: 'bg-blue-100 text-blue-800',
    IN_MAINTENANCE: 'bg-amber-100 text-amber-800',
    RETIRED: 'bg-red-100 text-red-800'
};

const statusLabels = {
    AVAILABLE: 'Disponible',
    IN_USE: 'En Uso',
    IN_MAINTENANCE: 'En Mantención',
    RETIRED: 'Retirada'
};

export default function ToolsPage({ tools, currentUser, onAddTool, onUpdateTool, onDeleteTool, onAddMaintenance }: ToolsPageProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddingTool, setIsAddingTool] = useState(false);
    const [editingTool, setEditingTool] = useState<Tool | null>(null);
    const [selectedToolForMaintenance, setSelectedToolForMaintenance] = useState<Tool | null>(null);

    // Form states...
    const [name, setName] = useState('');
    const [brand, setBrand] = useState('');
    const [model, setModel] = useState('');
    const [serialNumber, setSerialNumber] = useState('');
    const [status, setStatus] = useState<'AVAILABLE' | 'IN_USE' | 'IN_MAINTENANCE' | 'RETIRED'>('AVAILABLE');
    const [lastMaintenanceDate, setLastMaintenanceDate] = useState('');
    const [nextMaintenanceDate, setNextMaintenanceDate] = useState('');

    // Maintenance form states
    const [maintDate, setMaintDate] = useState('');
    const [maintDescription, setMaintDescription] = useState('');
    const [maintCost, setMaintCost] = useState('');
    const [maintProvider, setMaintProvider] = useState('');

    const canEdit = checkPermission(currentUser, 'tools', 'create')
        || checkPermission(currentUser, 'tools', 'update')
        || checkPermission(currentUser, 'tools', 'delete');

    const filteredTools = tools.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOpenAdd = () => {
        setIsAddingTool(true);
        setEditingTool(null);
        setName('');
        setBrand('');
        setModel('');
        setSerialNumber('');
        setStatus('AVAILABLE');
        setLastMaintenanceDate('');
        setNextMaintenanceDate('');
    };

    const handleOpenEdit = (tool: Tool) => {
        setIsAddingTool(true);
        setEditingTool(tool);
        setName(tool.name);
        setBrand(tool.brand || '');
        setModel(tool.model || '');
        setSerialNumber(tool.serialNumber || '');
        setStatus(tool.status);
        setLastMaintenanceDate(tool.lastMaintenanceDate ? new Date(tool.lastMaintenanceDate).toISOString().split('T')[0] : '');
        setNextMaintenanceDate(tool.nextMaintenanceDate ? new Date(tool.nextMaintenanceDate).toISOString().split('T')[0] : '');
    };

    const handleSaveTool = (e: React.FormEvent) => {
        e.preventDefault();
        const toolData = {
            name,
            brand: brand || undefined,
            model: model || undefined,
            serialNumber: serialNumber || undefined,
            status,
            lastMaintenanceDate: lastMaintenanceDate ? new Date(lastMaintenanceDate) : undefined,
            nextMaintenanceDate: nextMaintenanceDate ? new Date(nextMaintenanceDate) : undefined
        };

        if (editingTool) {
            onUpdateTool({ ...editingTool, ...toolData });
        } else {
            onAddTool(toolData as any);
        }
        setIsAddingTool(false);
    };

    const handleOpenMaintenance = (tool: Tool) => {
        setSelectedToolForMaintenance(tool);
        const today = new Date().toISOString().split('T')[0];
        setMaintDate(today);
        setMaintDescription('');
        setMaintCost('');
        setMaintProvider('');
    };

    const handleSaveMaintenance = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedToolForMaintenance) return;

        onAddMaintenance(selectedToolForMaintenance.id, {
            date: new Date(maintDate).toISOString(),
            description: maintDescription,
            cost: Number(maintCost),
            provider: maintProvider
        });
        setSelectedToolForMaintenance(null);
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Directorio de Herramientas</h2>
                    <p className="text-sm text-gray-500 mt-1">Gesti&oacute;n y control de mantenciones</p>
                </div>
                {canEdit && (
                    <button
                        onClick={handleOpenAdd}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                        <Plus size={20} />
                        <span>Nueva Herramienta</span>
                    </button>
                )}
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, marca, nº serie..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTools.map(tool => {
                    const isOverdue = tool.nextMaintenanceDate && new Date(tool.nextMaintenanceDate) < new Date() && tool.status !== 'RETIRED';
                    return (
                        <div key={tool.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800 truncate">{tool.name}</h3>
                                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1 font-medium">
                                            {(tool.brand || tool.model) ? `${tool.brand || ''} ${tool.model || ''}` : 'Sin marca/modelo'}
                                        </p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${statusColors[tool.status]} border-opacity-20`}>
                                        {statusLabels[tool.status]}
                                    </span>
                                </div>

                                <div className="space-y-2 mb-5">
                                    <p className="text-sm flex items-center text-gray-600">
                                        <span className="w-20 font-medium text-slate-500 text-xs uppercase tracking-wider">Nº Serie:</span>
                                        <span className="font-mono text-slate-800">{tool.serialNumber || '-'}</span>
                                    </p>
                                    <p className="text-sm flex items-center text-gray-600">
                                        <span className="w-20 font-medium text-slate-500 text-xs uppercase tracking-wider">Últ. Mant:</span>
                                        <span>{tool.lastMaintenanceDate ? new Date(tool.lastMaintenanceDate).toLocaleDateString() : 'No registrada'}</span>
                                    </p>
                                    <p className={`text-sm flex items-center ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                                        <span className="w-20 font-medium text-slate-500 text-xs uppercase tracking-wider">Próx. Mant:</span>
                                        <span>{tool.nextMaintenanceDate ? new Date(tool.nextMaintenanceDate).toLocaleDateString() : 'No programada'}</span>
                                        {isOverdue && <AlertTriangle size={14} className="ml-1" />}
                                    </p>
                                </div>

                                {tool.maintenances && tool.maintenances.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Historial Reciente</h4>
                                        <ul className="space-y-2">
                                            {tool.maintenances.slice(0, 2).map((m: any) => (
                                                <li key={m.id} className="text-xs bg-slate-50 p-2 rounded relative group">
                                                    <div className="flex justify-between font-medium text-slate-700">
                                                        <span>{new Date(m.date).toLocaleDateString()}</span>
                                                        <span>${m.cost.toLocaleString()}</span>
                                                    </div>
                                                    <p className="text-slate-500 mt-1 truncate">{m.description}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {canEdit && (
                                <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex justify-end space-x-2">
                                    <button
                                        onClick={() => handleOpenMaintenance(tool)}
                                        className="flex-1 flex justify-center items-center space-x-1 px-3 py-1.5 bg-white border border-blue-200 text-blue-600 rounded hover:bg-blue-50 transition text-sm font-medium"
                                        title="Registrar Mantención"
                                    >
                                        <Wrench size={14} />
                                        <span>Mantenimiento</span>
                                    </button>
                                    <button
                                        onClick={() => handleOpenEdit(tool)}
                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (window.confirm('¿Eliminar esta herramienta?')) onDeleteTool(tool.id);
                                        }}
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {filteredTools.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                    <Wrench className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No hay herramientas</h3>
                    <p className="text-gray-500">Agrega una nueva herramienta para comenzar.</p>
                </div>
            )}

            {/* Tool Modal */}
            {isAddingTool && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-slideUp">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-lg font-bold text-gray-800">
                                {editingTool ? 'Editar Herramienta' : 'Nueva Herramienta'}
                            </h3>
                            <button
                                onClick={() => setIsAddingTool(false)}
                                className="text-gray-400 hover:text-gray-600 transition p-1"
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleSaveTool} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                                    <input
                                        required
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                                        <input
                                            type="text"
                                            value={brand}
                                            onChange={(e) => setBrand(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                                        <input
                                            type="text"
                                            value={model}
                                            onChange={(e) => setModel(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nº Serie</label>
                                        <input
                                            type="text"
                                            value={serialNumber}
                                            onChange={(e) => setSerialNumber(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Estado *</label>
                                        <select
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value as any)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="AVAILABLE">Disponible</option>
                                            <option value="IN_USE">En Uso</option>
                                            <option value="IN_MAINTENANCE">En Mantención</option>
                                            <option value="RETIRED">Retirada</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Última Mantención</label>
                                        <input
                                            type="date"
                                            value={lastMaintenanceDate}
                                            onChange={(e) => setLastMaintenanceDate(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Próxima Mantención</label>
                                        <input
                                            type="date"
                                            value={nextMaintenanceDate}
                                            onChange={(e) => setNextMaintenanceDate(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAddingTool(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                >
                                    {editingTool ? 'Guardar Cambios' : 'Crear Herramienta'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Maintenance Modal */}
            {selectedToolForMaintenance && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slideUp">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-blue-50/50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Registrar Mantención</h3>
                                <p className="text-sm text-blue-600 font-medium">{selectedToolForMaintenance.name}</p>
                            </div>
                            <button
                                onClick={() => setSelectedToolForMaintenance(null)}
                                className="text-gray-400 hover:text-gray-600 transition p-1"
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleSaveMaintenance} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                                    <input
                                        required
                                        type="date"
                                        value={maintDate}
                                        onChange={(e) => setMaintDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción del Trabajo *</label>
                                    <textarea
                                        required
                                        value={maintDescription}
                                        onChange={(e) => setMaintDescription(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                                        placeholder="Detalle de mantención o reparación..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Costo ($) *</label>
                                        <input
                                            required
                                            type="number"
                                            min="0"
                                            value={maintCost}
                                            onChange={(e) => setMaintCost(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor/Taller</label>
                                        <input
                                            type="text"
                                            value={maintProvider}
                                            onChange={(e) => setMaintProvider(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                            </div>

                            <div className="mt-8 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setSelectedToolForMaintenance(null)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                >
                                    Guardar Mantención
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
