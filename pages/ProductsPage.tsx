import React, { useState, useEffect } from 'react';
import { Layers, Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { Product } from '../types';
import { API_URL } from '../src/config';
import { useCompany } from '../components/CompanyContext';

export default function ProductsPage() {
    const { activeCompany } = useCompany();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Form inputs
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        description: '',
        type: 'GOOD',
        category: '',
        unit: 'UN',
        price: ''
    });

    useEffect(() => {
        if (activeCompany) fetchProducts();
    }, [activeCompany]);

    const fetchProducts = async () => {
        try {
            const res = await fetch(`${API_URL}/products`, {
                headers: { 'x-company-id': activeCompany?.id || '' }
            });
            if (res.ok) {
                const data = await res.json();
                setProducts(data);
            }
        } catch (error) {
            console.error("Error fetching products", error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenForm = (product?: Product) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                code: product.code || '',
                name: product.name,
                description: product.description || '',
                type: product.type,
                category: product.category || '',
                unit: product.unit || 'UN',
                price: product.price.toString()
            });
        } else {
            setEditingProduct(null);
            setFormData({ code: '', name: '', description: '', type: 'GOOD', category: '', unit: 'UN', price: '' });
        }
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingProduct ? `${API_URL}/products/${editingProduct.id}` : `${API_URL}/products`;
            const method = editingProduct ? 'PUT' : 'POST';
            
            const res = await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'x-company-id': activeCompany?.id || ''
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                fetchProducts();
                setShowForm(false);
            } else {
                alert("Error saving product");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("¿Seguro que deseas eliminar este producto/servicio del catálogo?")) return;
        try {
            const res = await fetch(`${API_URL}/products/${id}`, {
                method: 'DELETE',
                headers: { 'x-company-id': activeCompany?.id || '' }
            });
            if (res.ok) {
                setProducts(products.filter(p => p.id !== id));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                        <Layers size={24} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Catálogo de Productos y Servicios</h1>
                </div>
                <button
                    onClick={() => handleOpenForm()}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
                >
                    <Plus size={20} />
                    <span>Nuevo Ítem</span>
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute text-slate-400 left-3 top-1/2 -translate-y-1/2" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por código o nombre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                                <th className="p-4 font-semibold">Código</th>
                                <th className="p-4 font-semibold">Nombre</th>
                                <th className="p-4 font-semibold">Tipo</th>
                                <th className="p-4 font-semibold">Categoría</th>
                                <th className="p-4 font-semibold">Precio / Unidad</th>
                                <th className="p-4 font-semibold w-24">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-4 text-center text-slate-500">Cargando catálogo...</td>
                                </tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-4 text-center text-slate-500">No hay ítems en el catálogo que coincidan con la búsqueda.</td>
                                </tr>
                            ) : (
                                filteredProducts.map(product => (
                                    <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-mono text-sm text-slate-600">{product.code || '-'}</td>
                                        <td className="p-4">
                                            <div className="font-medium text-slate-800">{product.name}</div>
                                            <div className="text-xs text-slate-500 truncate max-w-xs">{product.description}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${product.type === 'GOOD' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {product.type === 'GOOD' ? 'Material/Bien' : 'Servicio'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-600">{product.category || '-'}</td>
                                        <td className="p-4">
                                            <div className="font-medium text-slate-800">
                                                ${product.price ? product.price.toLocaleString() : '0'} 
                                            </div>
                                            <div className="text-xs text-slate-500">por {product.unit}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => handleOpenForm(product)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                    title="Editar Ítem"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(product.id)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Eliminar Ítem"
                                                >
                                                    <Trash2 size={18} />
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

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <h2 className="text-xl font-bold text-slate-800">
                                {editingProduct ? 'Editar Ítem del Catálogo' : 'Nuevo Ítem'}
                            </h2>
                            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                                <Trash2 size={24} className="opacity-0" /> {/* Spacer */}
                                <span className="absolute top-6 right-6 text-2xl leading-none">&times;</span>
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Nombre del Ítem *</label>
                                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Código interno</label>
                                    <input type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Tipo *</label>
                                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                                        <option value="GOOD">Material / Bien Físico</option>
                                        <option value="SERVICE">Servicio</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Categoría</label>
                                    <input type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="Ej: Aceros, Herramientas Menores..." className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Unidad de Medida *</label>
                                    <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                                        <option value="UN">Unidad (UN)</option>
                                        <option value="KG">Kilogramos (KG)</option>
                                        <option value="L">Litros (L)</option>
                                        <option value="M">Metros (M)</option>
                                        <option value="HR">Horas (HR)</option>
                                        <option value="GLB">Global (GLB)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Precio Referencial</label>
                                    <input type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Descripción detallada</label>
                                <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                            </div>

                            <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
                                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm">
                                    {editingProduct ? 'Guardar Cambios' : 'Crear Ítem'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
