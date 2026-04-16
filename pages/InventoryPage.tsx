
import React, { useState, useEffect, useMemo } from 'react';
import { Package, ArrowDownCircle, ArrowUpCircle, ArrowRightLeft, History, Plus, Search, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { API_URL } from '../src/config';
import { useCompany } from '../components/CompanyContext';
import { checkPermission } from '../src/utils/permissions';
import { User, Product, InventoryMovement, Warehouse } from '../types';

interface InventoryPageProps {
    currentUser: User | null;
}

export function InventoryPage({ currentUser }: InventoryPageProps) {
    const { activeCompany } = useCompany();
    const [products, setProducts] = useState<Product[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [movements, setMovements] = useState<InventoryMovement[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'STOCK' | 'MOVEMENTS'>('STOCK');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');

    useEffect(() => {
        if (activeCompany) {
            fetchData();
        }
    }, [activeCompany]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const headers = { 'x-company-id': activeCompany?.id || '' };
            const [pRes, wRes, mRes] = await Promise.all([
                fetch(`${API_URL}/products`, { headers }).then(r => r.json()),
                fetch(`${API_URL}/warehouses`, { headers }).then(r => r.json()),
                fetch(`${API_URL}/inventory-movements`, { headers }).then(r => r.json())
            ]);

            setProducts(Array.isArray(pRes) ? pRes : []);
            setWarehouses(Array.isArray(wRes) ? wRes : []);
            setMovements(Array.isArray(mRes) ? mRes : []);
        } catch (err) {
            console.error("Error fetching inventory data", err);
        } finally {
            setLoading(false);
        }
    };

    // Aggregated stock per product (across all warehouses or filtered)
    const stockData = useMemo(() => {
        const data: Record<string, { product: Product; total: number; byWarehouse: Record<string, number> }> = {};

        products.forEach(p => {
            data[p.id] = { product: p, total: 0, byWarehouse: {} };
            (p.stocks || []).forEach(s => {
                if (!selectedWarehouse || s.warehouseId === selectedWarehouse) {
                    data[p.id].total += s.quantity;
                    data[p.id].byWarehouse[s.warehouseId] = s.quantity;
                }
            });
        });

        return Object.values(data).filter(d =>
            d.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (d.product.code || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [products, searchTerm, selectedWarehouse]);

    // Stats
    const stats = useMemo(() => {
        const totalProducts = products.length;
        const totalValue = products.reduce((sum, p) => sum + (p.price || 0) * (stockData.find(d => d.product.id === p.id)?.total || 0), 0);
        const lowStock = products.filter(p => {
            const d = stockData.find(d => d.product.id === p.id);
            const total = d?.total || 0;
            const minStock = (p.stocks || []).reduce((min, s) => min + (s.minStock || 0), 0);
            return total < minStock && minStock > 0;
        }).length;
        return { totalProducts, totalValue, lowStock };
    }, [products, stockData]);

    const canCreate = checkPermission(currentUser as User, 'inventory', 'create');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                        <Package size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Inventario</h1>
                        <p className="text-slate-500 text-sm">Control de stock y movimientos de bodega</p>
                    </div>
                </div>

                <div className="flex items-center space-x-2 bg-slate-200/50 p-1 rounded-lg">
                    <button
                        onClick={() => setView('STOCK')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center space-x-2 ${view === 'STOCK' ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Package size={16} /> <span>Stock</span>
                    </button>
                    <button
                        onClick={() => setView('MOVEMENTS')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center space-x-2 ${view === 'MOVEMENTS' ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <ArrowRightLeft size={16} /> <span>Movimientos</span>
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <Package size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Total Productos</p>
                            <p className="text-xl font-bold text-slate-800">{stats.totalProducts}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Bajo Stock</p>
                            <p className="text-xl font-bold text-orange-700">{stats.lowStock}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                            <span className="text-sm font-bold">$</span>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Valor Total Stock</p>
                            <p className="text-xl font-bold text-slate-800">${(stats.totalValue / 1000000).toFixed(1)}M</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

                {view === 'STOCK' && (
                    <>
                        {/* Filters */}
                        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3 bg-slate-50">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre o código..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <select
                                value={selectedWarehouse}
                                onChange={(e) => setSelectedWarehouse(e.target.value)}
                                className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Todas las bodegas</option>
                                {warehouses.map(w => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white border-b border-slate-100">
                                    <tr>
                                        <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Código</th>
                                        <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Producto</th>
                                        <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo</th>
                                        <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Precio Unit.</th>
                                        <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Stock Total</th>
                                        <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loading ? (
                                        <tr><td colSpan={6} className="p-8 text-center text-slate-400">Cargando...</td></tr>
                                    ) : stockData.length === 0 ? (
                                        <tr><td colSpan={6} className="p-8 text-center text-slate-400">No hay productos registrados.</td></tr>
                                    ) : (
                                        stockData.map(({ product, total, byWarehouse }) => {
                                            const minStock = (product.stocks || []).reduce((min, s) => min + (s.minStock || 0), 0);
                                            const isLow = total < minStock && minStock > 0;
                                            return (
                                                <tr key={product.id} className={`hover:bg-slate-50 ${isLow ? 'bg-red-50/30' : ''}`}>
                                                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{product.code || '-'}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium text-slate-800">{product.name}</div>
                                                        {selectedWarehouse && Object.keys(byWarehouse).length > 0 && (
                                                            <div className="text-xs text-slate-400">
                                                                {warehouses.find(w => w.id === selectedWarehouse)?.name}: {byWarehouse[selectedWarehouse]}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${product.type === 'GOOD' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                            {product.type === 'GOOD' ? 'Material' : 'Servicio'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono text-sm text-slate-600">${product.price?.toLocaleString('es-CL') || 0}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className={`font-bold ${isLow ? 'text-red-600' : 'text-slate-800'}`}>
                                                            {total}
                                                        </span>
                                                        <span className="text-xs text-slate-400 ml-1">{product.unit}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {isLow ? (
                                                            <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">Bajo Stock</span>
                                                        ) : (
                                                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">OK</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {view === 'MOVEMENTS' && (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white border-b border-slate-100">
                                    <tr>
                                        <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Fecha</th>
                                        <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo</th>
                                        <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Producto</th>
                                        <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Cantidad</th>
                                        <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Origen</th>
                                        <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Destino</th>
                                        <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Glosa</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loading ? (
                                        <tr><td colSpan={7} className="p-8 text-center text-slate-400">Cargando...</td></tr>
                                    ) : movements.length === 0 ? (
                                        <tr><td colSpan={7} className="p-8 text-center text-slate-400">No hay movimientos registrados.</td></tr>
                                    ) : (
                                        movements.slice(0, 100).map(mov => {
                                            const pInfo = products.find(p => p.id === mov.productId);
                                            return (
                                                <tr key={mov.id} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 text-sm text-slate-500">{new Date(mov.date).toLocaleDateString('es-CL')}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase
                                                            ${mov.type === 'IN' ? 'bg-emerald-100 text-emerald-700' :
                                                              mov.type === 'OUT' ? 'bg-orange-100 text-orange-700' :
                                                              mov.type === 'TRANSFER' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'}`}
                                                        >
                                                            {mov.type === 'IN' ? 'Entrada' : mov.type === 'OUT' ? 'Salida' : mov.type === 'TRANSFER' ? 'Traspaso' : 'Ajuste'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 font-medium text-slate-800">{pInfo?.name || 'Producto'}</td>
                                                    <td className={`px-4 py-3 text-right font-bold ${mov.type === 'IN' ? 'text-emerald-600' : mov.type === 'OUT' ? 'text-orange-600' : 'text-slate-600'}`}>
                                                        {mov.type === 'OUT' ? '-' : mov.type === 'IN' ? '+' : ''}{mov.quantity}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-slate-600">{mov.fromWarehouseId || '-'}</td>
                                                    <td className="px-4 py-3 text-sm text-slate-600">{mov.toWarehouseId || '-'}</td>
                                                    <td className="px-4 py-3 text-sm text-slate-500 truncate max-w-[150px]">{mov.description || '-'}</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
