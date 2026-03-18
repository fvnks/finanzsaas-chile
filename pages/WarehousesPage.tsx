import React, { useState, useEffect } from 'react';
import { Box, Home, ArrowRightLeft, Plus, Edit2, Trash2, Search, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { Warehouse, Stock, InventoryMovement, Product, Project } from '../types';
import { API_URL } from '../src/config';
import { useCompany } from '../components/CompanyContext';

export default function WarehousesPage() {
    const { activeCompany } = useCompany();
    const [view, setView] = useState<'WAREHOUSES' | 'STOCK' | 'MOVEMENTS'>('STOCK');
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [movements, setMovements] = useState<InventoryMovement[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter texts
    const [stockSearch, setStockSearch] = useState('');

    useEffect(() => {
        if (activeCompany) {
            fetchData();
        }
    }, [activeCompany]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const headers = { 'x-company-id': activeCompany?.id || '' };
            const [wRes, pRes, mRes] = await Promise.all([
                fetch(`${API_URL}/warehouses`, { headers }).then(r => r.json()),
                fetch(`${API_URL}/products`, { headers }).then(r => r.json()),
                fetch(`${API_URL}/inventory-movements`, { headers }).then(r => r.json())
            ]);
            
            setWarehouses(Array.isArray(wRes) ? wRes : []);
            setProducts(Array.isArray(pRes) ? pRes : []);
            setMovements(Array.isArray(mRes) ? mRes : []);
        } catch (err) {
            console.error("Error fetching inventory data", err);
        } finally {
            setLoading(false);
        }
    };

    // WAREHOUSE FORM
    const [showWarehouseForm, setShowWarehouseForm] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
    const [whForm, setWhForm] = useState({ name: '', location: '', manager: '' });

    const openWarehouseForm = (w?: Warehouse) => {
        if (w) {
            setEditingWarehouse(w);
            setWhForm({ name: w.name, location: w.location || '', manager: w.manager || '' });
        } else {
            setEditingWarehouse(null);
            setWhForm({ name: '', location: '', manager: '' });
        }
        setShowWarehouseForm(true);
    };

    const saveWarehouse = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingWarehouse ? `${API_URL}/warehouses/${editingWarehouse.id}` : `${API_URL}/warehouses`;
            const method = editingWarehouse ? 'PUT' : 'POST';
            
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'x-company-id': activeCompany?.id || '' },
                body: JSON.stringify(whForm)
            });

            if (res.ok) {
                fetchData();
                setShowWarehouseForm(false);
            }
        } catch (err) { console.error(err); }
    };

    const deleteWarehouse = async (id: string) => {
        if(!window.confirm('¿Seguro que deseas eliminar esta bodega?')) return;
        try {
            const res = await fetch(`${API_URL}/warehouses/${id}`, { method: 'DELETE', headers: { 'x-company-id': activeCompany?.id || '' }});
            if (res.ok) fetchData();
        } catch (e) { console.error(e) }
    };

    // MOVEMENT FORM
    const [showMovementForm, setShowMovementForm] = useState(false);
    const [movForm, setMovForm] = useState({
        type: 'IN', // IN, OUT, TRANSFER, ADJUSTMENT
        quantity: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        productId: '',
        fromWarehouseId: '',
        toWarehouseId: ''
    });

    const openMovementForm = (typeStr: string = 'IN') => {
        setMovForm({
            type: typeStr,
            quantity: '',
            date: new Date().toISOString().split('T')[0],
            description: '',
            productId: products.length > 0 ? products[0].id : '',
            fromWarehouseId: warehouses.length > 0 ? warehouses[0].id : '',
            toWarehouseId: warehouses.length > 1 ? warehouses[1].id : ''
        });
        setShowMovementForm(true);
    };

    const saveMovement = async (e: React.FormEvent) => {
        e.preventDefault();
        
        let payload = { ...movForm, quantity: Number(movForm.quantity) };
        if (payload.type === 'IN') delete payload.fromWarehouseId;
        if (payload.type === 'OUT') delete payload.toWarehouseId;
        if (payload.type === 'ADJUSTMENT') {
            // we will just use fromWarehouseId as the target warehouse for simplicity
            delete payload.toWarehouseId;
        }

        try {
            const res = await fetch(`${API_URL}/inventory-movements`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-company-id': activeCompany?.id || '' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                fetchData();
                setShowMovementForm(false);
            } else {
                const data = await res.json();
                alert(data.error || "Error registrando movimiento");
            }
        } catch (err) { console.error(err); }
    };

    // AGGREGATE STOCKS FOR VIEW
    const allStocks: (Stock & { productName: string, productType: string, warehouseName: string })[] = [];
    warehouses.forEach(w => {
        w.stocks?.forEach(s => {
            const p = products.find(prod => prod.id === s.productId);
            if (p) {
                allStocks.push({
                    ...s,
                    productName: p.name,
                    productType: p.type,
                    warehouseName: w.name
                });
            }
        });
    });

    const filteredStocks = allStocks.filter(s => 
        s.productName.toLowerCase().includes(stockSearch.toLowerCase()) || 
        s.warehouseName.toLowerCase().includes(stockSearch.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                        <Box size={24} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Bodegas e Inventario</h1>
                </div>
                
                <div className="flex bg-slate-200/50 p-1 rounded-lg">
                    <button 
                        onClick={() => setView('STOCK')} 
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${view === 'STOCK' ? 'bg-white text-slate-800 shadow flex items-center space-x-2' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Box size={16} /> <span>Nivel de Stock</span>
                    </button>
                    <button 
                        onClick={() => setView('MOVEMENTS')} 
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${view === 'MOVEMENTS' ? 'bg-white text-slate-800 shadow flex items-center space-x-2' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <ArrowRightLeft size={16} /> <span>Movimientos</span>
                    </button>
                    <button 
                        onClick={() => setView('WAREHOUSES')} 
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${view === 'WAREHOUSES' ? 'bg-white text-slate-800 shadow flex items-center space-x-2' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Home size={16} /> <span>Bodegas</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                
                {/* ---------------- STOCK TAB ---------------- */}
                {view === 'STOCK' && (
                    <>
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
                            <div className="relative w-full md:w-96">
                                <Search className="absolute text-slate-400 left-3 top-1/2 -translate-y-1/2" size={20} />
                                <input
                                    type="text"
                                    placeholder="Buscar producto o bodega..."
                                    value={stockSearch}
                                    onChange={(e) => setStockSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 transition-colors"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white border-b border-slate-200 text-slate-500 text-sm">
                                        <th className="p-4 font-semibold">Producto</th>
                                        <th className="p-4 font-semibold">Bodega</th>
                                        <th className="p-4 font-semibold">Cantidad</th>
                                        <th className="p-4 font-semibold">Stock Min.</th>
                                        <th className="p-4 font-semibold">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr><td colSpan={5} className="p-4 text-center">Cargando...</td></tr>
                                    ) : filteredStocks.length === 0 ? (
                                        <tr><td colSpan={5} className="p-4 text-center">No hay stock registrado.</td></tr>
                                    ) : (
                                        filteredStocks.map(stock => {
                                            const isAlert = stock.quantity <= stock.minStock;
                                            return (
                                                <tr key={stock.id} className={`hover:bg-slate-50 ${isAlert ? 'bg-red-50/30' : ''}`}>
                                                    <td className="p-4">
                                                        <div className="font-medium text-slate-800">{stock.productName}</div>
                                                        <div className="text-xs text-slate-500">{stock.productType === 'GOOD' ? 'Material' : 'Servicio'}</div>
                                                    </td>
                                                    <td className="p-4 text-slate-600 flex items-center space-x-2">
                                                        <Home size={14} className="text-slate-400" />
                                                        <span>{stock.warehouseName}</span>
                                                    </td>
                                                    <td className="p-4 font-bold text-slate-800">{stock.quantity}</td>
                                                    <td className="p-4 text-slate-500">{stock.minStock}</td>
                                                    <td className="p-4">
                                                        {isAlert ? (
                                                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full border border-red-200">Bajo Stock</span>
                                                        ) : (
                                                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">Óptimo</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}


                {/* ---------------- MOVEMENTS TAB ---------------- */}
                {view === 'MOVEMENTS' && (
                    <>
                        <div className="p-4 border-b border-slate-200 flex gap-2 overflow-x-auto bg-slate-50 rounded-t-xl">
                            <button onClick={() => openMovementForm('IN')} className="flex items-center space-x-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap">
                                <ArrowDownCircle size={18} /> <span>Ingresar Stock</span>
                            </button>
                            <button onClick={() => openMovementForm('OUT')} className="flex items-center space-x-2 bg-orange-100 text-orange-700 hover:bg-orange-200 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap">
                                <ArrowUpCircle size={18} /> <span>Salida de Stock</span>
                            </button>
                            <button onClick={() => openMovementForm('TRANSFER')} className="flex items-center space-x-2 bg-blue-100 text-blue-700 hover:bg-blue-200 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap">
                                <ArrowRightLeft size={18} /> <span>Traspaso Bodegas</span>
                            </button>
                            <button onClick={() => openMovementForm('ADJUSTMENT')} className="flex items-center space-x-2 bg-slate-200 text-slate-700 hover:bg-slate-300 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap">
                                <Edit2 size={18} /> <span>Ajuste Manual</span>
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white border-b border-slate-200 text-slate-500 text-sm">
                                        <th className="p-4 font-semibold">Fecha</th>
                                        <th className="p-4 font-semibold">Tipo</th>
                                        <th className="p-4 font-semibold">Producto</th>
                                        <th className="p-4 font-semibold">Cantidad</th>
                                        <th className="p-4 font-semibold">Origen</th>
                                        <th className="p-4 font-semibold">Destino</th>
                                        <th className="p-4 font-semibold">Ref / Glosa</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr><td colSpan={7} className="p-4 text-center">Cargando...</td></tr>
                                    ) : movements.length === 0 ? (
                                        <tr><td colSpan={7} className="p-4 text-center">No hay movimientos.</td></tr>
                                    ) : (
                                        movements.slice(0, 50).map(mov => {
                                            const pInfo = products.find(p => p.id === mov.productId);
                                            const wFromInfo = warehouses.find(w => w.id === mov.fromWarehouseId);
                                            const wToInfo = warehouses.find(w => w.id === mov.toWarehouseId);

                                            return (
                                                <tr key={mov.id} className="hover:bg-slate-50">
                                                    <td className="p-4 text-sm text-slate-500">{new Date(mov.date).toLocaleDateString()}</td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase
                                                            ${mov.type === 'IN' ? 'bg-emerald-100 text-emerald-700' : 
                                                              mov.type === 'OUT' ? 'bg-orange-100 text-orange-700' : 
                                                              mov.type === 'TRANSFER' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'}`}
                                                        >
                                                            {mov.type === 'IN' ? 'Entrada' : mov.type === 'OUT' ? 'Salida' : mov.type === 'TRANSFER' ? 'Traspaso' : 'Ajuste'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 font-medium text-slate-800">{pInfo?.name || 'Desc. '}</td>
                                                    <td className={`p-4 font-bold ${mov.type === 'IN' ? 'text-emerald-600' : mov.type === 'OUT' ? 'text-orange-600' : 'text-slate-600'}`}>
                                                        {mov.type === 'OUT' ? '-' : (mov.type === 'IN' ? '+' : '')}{mov.quantity}
                                                    </td>
                                                    <td className="p-4 text-sm text-slate-600">{wFromInfo?.name || '-'}</td>
                                                    <td className="p-4 text-sm text-slate-600">{wToInfo?.name || '-'}</td>
                                                    <td className="p-4 text-sm text-slate-500 truncate max-w-[150px]">{mov.description || '-'}</td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}


                {/* ---------------- WAREHOUSES TAB ---------------- */}
                {view === 'WAREHOUSES' && (
                    <>
                        <div className="p-4 border-b border-slate-200 flex justify-end bg-slate-50 rounded-t-xl">
                            <button
                                onClick={() => openWarehouseForm()}
                                className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
                            >
                                <Plus size={18} />
                                <span>Nueva Bodega</span>
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white border-b border-slate-200 text-slate-500 text-sm">
                                        <th className="p-4 font-semibold">Nombre</th>
                                        <th className="p-4 font-semibold">Ubicación</th>
                                        <th className="p-4 font-semibold">Encargado</th>
                                        <th className="p-4 font-semibold w-24">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr><td colSpan={4} className="p-4 text-center">Cargando...</td></tr>
                                    ) : (
                                        warehouses.map(wh => (
                                            <tr key={wh.id} className="hover:bg-slate-50">
                                                <td className="p-4 font-medium text-slate-800 flex items-center space-x-2">
                                                    <Home size={16} className="text-slate-400" />
                                                    <span>{wh.name}</span>
                                                </td>
                                                <td className="p-4 text-slate-600">{wh.location || '-'}</td>
                                                <td className="p-4 text-slate-600">{wh.manager || '-'}</td>
                                                <td className="p-4">
                                                    <div className="flex items-center space-x-2">
                                                        <button onClick={() => openWarehouseForm(wh)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"><Edit2 size={16} /></button>
                                                        <button onClick={() => deleteWarehouse(wh.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

            </div>

            {/* MODALS */}

            {/* Modal de Bodega */}
            {showWarehouseForm && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <h2 className="text-xl font-bold text-slate-800">{editingWarehouse ? 'Editar Bodega' : 'Nueva Bodega'}</h2>
                            <button onClick={() => setShowWarehouseForm(false)} className="text-2xl leading-none text-slate-400 hover:text-slate-600">&times;</button>
                        </div>
                        <form onSubmit={saveWarehouse} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Nombre identificador *</label>
                                <input required type="text" value={whForm.name} onChange={e => setWhForm({...whForm, name: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Ubicación física</label>
                                <input type="text" value={whForm.location} onChange={e => setWhForm({...whForm, location: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Responsable / Encargado</label>
                                <input type="text" value={whForm.manager} onChange={e => setWhForm({...whForm, manager: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
                                <button type="button" onClick={() => setShowWarehouseForm(false)} className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium shadow-sm transition-colors">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Movimiento */}
            {showMovementForm && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className={`p-6 border-b flex justify-between items-center 
                            ${movForm.type === 'IN' ? 'bg-emerald-50 border-emerald-100' : 
                              movForm.type === 'OUT' ? 'bg-orange-50 border-orange-100' : 
                              movForm.type === 'TRANSFER' ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-200'}
                        `}>
                            <h2 className="text-xl font-bold text-slate-800">
                                {movForm.type === 'IN' ? 'Entrada de Stock' : 
                                 movForm.type === 'OUT' ? 'Salida de Stock' : 
                                 movForm.type === 'TRANSFER' ? 'Traspaso entre Bodegas' : 'Ajuste de Stock'}
                            </h2>
                            <button onClick={() => setShowMovementForm(false)} className="text-2xl leading-none text-slate-400 hover:text-slate-600">&times;</button>
                        </div>
                        <form onSubmit={saveMovement} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2 md:col-span-1">
                                    <label className="text-sm font-medium text-slate-700">Producto *</label>
                                    <select required value={movForm.productId} onChange={e => setMovForm({...movForm, productId: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                                        <option value="">Seleccione Producto...</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name} {p.code ? `(${p.code})` : ''}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2 col-span-2 md:col-span-1">
                                    <label className="text-sm font-medium text-slate-700">Fecha *</label>
                                    <input required type="date" value={movForm.date} onChange={e => setMovForm({...movForm, date: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                                </div>
                                
                                <div className="space-y-2 col-span-2">
                                    <label className="text-sm font-medium text-slate-700">Cantidad *</label>
                                    <input required type="number" min="0.01" step="0.01" value={movForm.quantity} onChange={e => setMovForm({...movForm, quantity: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                                </div>

                                {/* Dynamic Origin/Dest */}
                                {(movForm.type === 'OUT' || movForm.type === 'TRANSFER' || movForm.type === 'ADJUSTMENT') && (
                                    <div className="space-y-2 col-span-2 md:col-span-1">
                                        <label className="text-sm font-medium text-slate-700">Bodega Origen *</label>
                                        <select required value={movForm.fromWarehouseId} onChange={e => setMovForm({...movForm, fromWarehouseId: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                                            <option value="">Seleccione Bodega...</option>
                                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                        </select>
                                    </div>
                                )}
                                
                                {(movForm.type === 'IN' || movForm.type === 'TRANSFER') && (
                                    <div className="space-y-2 col-span-2 md:col-span-1">
                                        <label className="text-sm font-medium text-slate-700">Bodega Destino *</label>
                                        <select required value={movForm.toWarehouseId} onChange={e => setMovForm({...movForm, toWarehouseId: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                                            <option value="">Seleccione Bodega...</option>
                                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                        </select>
                                    </div>
                                )}

                                <div className="space-y-2 col-span-2">
                                    <label className="text-sm font-medium text-slate-700">Glosa / Referencia</label>
                                    <input type="text" value={movForm.description} onChange={e => setMovForm({...movForm, description: e.target.value})} placeholder="Ej: OC-1234, Devolución..." className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
                                <button type="button" onClick={() => setShowMovementForm(false)} className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors">Cancelar</button>
                                <button type="submit" className={`px-4 py-2 text-white rounded-lg font-medium shadow-sm transition-colors
                                    ${movForm.type === 'IN' ? 'bg-emerald-600 hover:bg-emerald-700' : 
                                      movForm.type === 'OUT' ? 'bg-orange-600 hover:bg-orange-700' : 
                                      movForm.type === 'TRANSFER' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-800 hover:bg-slate-900'}
                                `}>Confirmar Movimiento</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
