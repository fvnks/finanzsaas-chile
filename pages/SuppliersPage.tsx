
import React, { useState, useEffect } from 'react';
import {
    Truck,
    Plus,
    Search,
    Filter,
    MoreVertical,
    Edit,
    Trash2,
    Phone,
    Mail,
    MapPin,
    Building2,
    X,
    Save
} from 'lucide-react';
import { Supplier } from '../types';

interface SuppliersPageProps {
    // We can pass initial data or fetch it
}

const SuppliersPage: React.FC<SuppliersPageProps> = () => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        rut: '',
        razonSocial: '',
        fantasyName: '',
        email: '',
        phone: '',
        address: '',
        category: ''
    });

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        try {
            const res = await fetch('/api/suppliers', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSuppliers(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingSupplier
                ? `/api/suppliers/${editingSupplier.id}`
                : '/api/suppliers';

            const method = editingSupplier ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            if (!res.ok) throw new Error('Error saving supplier');

            fetchSuppliers();
            closeModal();
        } catch (error) {
            console.error(error);
            alert('Error al guardar proveedor');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este proveedor?')) return;

        try {
            await fetch(`/api/suppliers/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            fetchSuppliers();
        } catch (error) {
            console.error(error);
        }
    };

    const openModal = (supplier?: Supplier) => {
        if (supplier) {
            setEditingSupplier(supplier);
            setFormData({
                rut: supplier.rut,
                razonSocial: supplier.razonSocial,
                fantasyName: supplier.fantasyName || '',
                email: supplier.email || '',
                phone: supplier.phone || '',
                address: supplier.address || '',
                category: supplier.category || ''
            });
        } else {
            setEditingSupplier(null);
            setFormData({
                rut: '',
                razonSocial: '',
                fantasyName: '',
                email: '',
                phone: '',
                address: '',
                category: ''
            });
        }
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
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center">
                        <Truck className="mr-2 text-blue-600" size={28} /> Proveedores
                    </h2>
                    <p className="text-slate-500 font-medium">Gestiona tu lista de proveedores y contratistas.</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center"
                >
                    <Plus size={20} className="mr-2" /> Nuevo Proveedor
                </button>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/30">
                    <div className="relative w-full md:w-96 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o RUT..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-600"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <tr>
                                <th className="px-6 py-4">RUT / Empresa</th>
                                <th className="px-6 py-4">Contacto</th>
                                <th className="px-6 py-4">Categoría</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-500">Cargando...</td></tr>
                            ) : filteredSuppliers.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-500">No hay proveedores registrados.</td></tr>
                            ) : (
                                filteredSuppliers.map((supplier) => (
                                    <tr key={supplier.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">{supplier.razonSocial}</div>
                                            <div className="text-xs text-slate-400 font-bold">{supplier.rut}</div>
                                            {supplier.fantasyName && <div className="text-xs text-slate-400 italic">{supplier.fantasyName}</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                {supplier.email && (
                                                    <div className="flex items-center text-xs text-slate-600">
                                                        <Mail size={12} className="mr-1 text-slate-400" /> {supplier.email}
                                                    </div>
                                                )}
                                                {supplier.phone && (
                                                    <div className="flex items-center text-xs text-slate-600">
                                                        <Phone size={12} className="mr-1 text-slate-400" /> {supplier.phone}
                                                    </div>
                                                )}
                                                {supplier.address && (
                                                    <div className="flex items-center text-xs text-slate-600">
                                                        <MapPin size={12} className="mr-1 text-slate-400" /> {supplier.address}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {supplier.category ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                                                    {supplier.category}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openModal(supplier)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(supplier.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                                >
                                                    <Trash2 size={16} />
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

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="bg-slate-900 px-6 py-5 flex items-center justify-between">
                            <h3 className="text-white font-black text-lg flex items-center">
                                <Truck className="mr-2 text-blue-400" size={20} />
                                {editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                            </h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">RUT</label>
                                    <input
                                        type="text"
                                        value={formData.rut}
                                        onChange={e => setFormData({ ...formData, rut: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Categoría</label>
                                    <input
                                        type="text"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Ej: Materiales"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Razón Social</label>
                                <input
                                    type="text"
                                    value={formData.razonSocial}
                                    onChange={e => setFormData({ ...formData, razonSocial: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Fantasía</label>
                                <input
                                    type="text"
                                    value={formData.fantasyName}
                                    onChange={e => setFormData({ ...formData, fantasyName: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono</label>
                                    <input
                                        type="text"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Dirección</label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-blue-200 mt-4"
                            >
                                <Save size={18} className="mr-2" />
                                {editingSupplier ? 'Guardar Cambios' : 'Crear Proveedor'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuppliersPage;
