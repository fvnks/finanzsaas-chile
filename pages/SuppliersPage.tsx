
import React, { useState } from 'react';
import {
    Truck,
    Plus,
    Search,
    Edit,
    Trash2,
    Phone,
    Mail,
    MapPin
} from 'lucide-react';
import { Supplier } from '../types';
import SupplierFormModal from '../components/SupplierFormModal';

interface SuppliersPageProps {
    suppliers: Supplier[];
    onAdd: (supplier: Omit<Supplier, 'id' | 'companyId'>) => Promise<void>;
    onUpdate: (supplier: Supplier) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    embedded?: boolean;
}

const SuppliersPage: React.FC<SuppliersPageProps> = ({ suppliers, onAdd, onUpdate, onDelete, embedded = false }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este proveedor?')) return;
        await onDelete(id);
    };

    const openModal = (supplier?: Supplier) => {
        setEditingSupplier(supplier || null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingSupplier(null);
    };

    const filteredSuppliers = suppliers.filter(s =>
        s.razonSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.rut.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {!embedded && (
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center">
                            <Truck className="mr-2 text-blue-600" size={28} /> Proveedores
                        </h2>
                        <p className="text-slate-500 font-medium">Gestiona tu lista de proveedores y contratistas.</p>
                    </div>
                )}
                <div className={embedded ? "w-full flex justify-end" : ""}>
                    <button
                        onClick={() => openModal()}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm flex items-center"
                    >
                        <Plus size={16} className="mr-1" /> Nuevo Proveedor
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-3 border-b border-slate-50 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/30">
                    <div className="relative w-full md:w-72 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o RUT..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-600"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <tr>
                                <th className="px-4 py-2">RUT / Empresa</th>
                                <th className="px-4 py-2">Contacto</th>
                                <th className="px-4 py-2">Categoría</th>
                                <th className="px-4 py-2 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredSuppliers.length === 0 ? (
                                <tr><td colSpan={4} className="p-4 text-center text-slate-500 text-xs">No hay proveedores registrados.</td></tr>
                            ) : (
                                filteredSuppliers.map((supplier) => (
                                    <tr key={supplier.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-4 py-2">
                                            <div className="font-bold text-slate-800 text-xs">{supplier.razonSocial}</div>
                                            <div className="text-[10px] text-slate-400 font-bold">{supplier.rut}</div>
                                            {supplier.fantasyName && <div className="text-[10px] text-slate-400 italic">{supplier.fantasyName}</div>}
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="flex flex-col gap-0.5">
                                                {supplier.email && (
                                                    <div className="flex items-center text-[10px] text-slate-600">
                                                        <Mail size={10} className="mr-1 text-slate-400" /> {supplier.email}
                                                    </div>
                                                )}
                                                {supplier.phone && (
                                                    <div className="flex items-center text-[10px] text-slate-600">
                                                        <Phone size={10} className="mr-1 text-slate-400" /> {supplier.phone}
                                                    </div>
                                                )}
                                                {supplier.address && (
                                                    <div className="flex items-center text-[10px] text-slate-600">
                                                        <MapPin size={10} className="mr-1 text-slate-400" /> {supplier.address}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2">
                                            {supplier.category ? (
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600">
                                                    {supplier.category}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 text-[10px]">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openModal(supplier)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                >
                                                    <Edit size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(supplier.id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <SupplierFormModal
                isOpen={isModalOpen}
                onClose={closeModal}
                onSave={async (data) => {
                    if (editingSupplier) {
                        await onUpdate({ ...data, id: editingSupplier.id, companyId: editingSupplier.companyId });
                    } else {
                        await onAdd(data);
                    }
                }}
                editingSupplier={editingSupplier}
            />
        </div>
    );
};

export default SuppliersPage;
