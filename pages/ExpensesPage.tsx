import React, { useState, useMemo } from 'react';
import {
    Plus,
    Search,
    Filter,
    DollarSign,
    Briefcase,
    Target,
    User as UserIcon,
    ArrowRight,
    TrendingUp,
    CreditCard,
    Building2,
    Calendar,
    X,
    Trash2,
    Check,
    Download
} from 'lucide-react';
import { Expense, Project, CostCenter, Worker, Company } from '../types';
import { formatCLP } from '../constants';
import { useCompany } from '../components/CompanyContext';

interface ExpensesPageProps {
    expenses: Expense[];
    projects: Project[];
    costCenters: CostCenter[];
    workers: Worker[];
    currentUser: any;
    onAdd: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    onUpdate: (expense: Expense) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

const ExpensesPage: React.FC<ExpensesPageProps> = ({
    expenses,
    projects,
    costCenters,
    workers,
    currentUser,
    onAdd,
    onUpdate,
    onDelete
}) => {
    const { activeCompany, availableCompanies } = useCompany();
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        originCompanyId: activeCompany?.id || '',
        targetCompanyId: activeCompany?.id || '',
        workerId: '',
        category: '',
        customCategory: '',
        invoiceNumber: '',
        isProrated: false,
        distributions: [] as { projectId: string; costCenterId: string; amount: number }[]
    });

    const CATEGORIES = [
        'Materiales',
        'Mano de Obra',
        'Subcontratos',
        'Arriendo de Equipos',
        'Combustible / Peajes',
        'Alimentación / Viáticos',
        'Oficina / Administración',
        'Seguros / Finanzas',
        'Otro'
    ];

    // Derived State
    const filteredExpenses = useMemo(() => {
        return expenses.filter(expense =>
            expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            expense.amount.toString().includes(searchTerm)
        );
    }, [expenses, searchTerm]);

    // Calculations
    const totalAmount = useMemo(() => filteredExpenses.reduce((sum, e) => sum + e.amount, 0), [filteredExpenses]);

    // Handlers
    const handleDistributionChange = (index: number, field: string, value: any) => {
        const newDistributions = [...formData.distributions];
        // @ts-ignore
        newDistributions[index][field] = value;
        setFormData({ ...formData, distributions: newDistributions });
    };

    const addDistributionRow = () => {
        setFormData({
            ...formData,
            distributions: [...formData.distributions, { projectId: '', costCenterId: '', amount: 0 }]
        });
    };

    const removeDistributionRow = (index: number) => {
        const newDistributions = formData.distributions.filter((_, i) => i !== index);
        setFormData({ ...formData, distributions: newDistributions });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const expenseData = {
                ...formData,
                amount: Number(formData.amount),
                category: formData.category === 'Otro' ? formData.customCategory : formData.category,
                distributions: formData.isProrated ? formData.distributions : ([
                    // If not prorated but project/CC selected, send as single distribution? 
                    // Or handle in backend. For now sending empty if not prorated, simple expense.
                    // Actually, let's create a simple distribution if single assignment is needed
                ])
            };

            // @ts-ignore
            await onAdd(expenseData);
            setShowModal(false);
            setFormData({
                description: '',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                originCompanyId: activeCompany?.id || '',
                targetCompanyId: activeCompany?.id || '',
                workerId: '',
                invoiceNumber: '',
                isProrated: false,
                distributions: []
            });
        } catch (error) {
            console.error(error);
            alert('Error al guardar el gasto');
        } finally {
            setIsSubmitting(false);
        }
    };

    const downloadCSV = () => {
        const headers = ['Fecha', 'Descripcion', 'Categoria', 'Monto', 'Estado', 'Origen', 'Destino', 'Beneficiario', 'Distribucion'];
        const csvContent = [
            headers.join(','),
            ...filteredExpenses.map(e => {
                const row = [
                    e.date.split('T')[0],
                    `"${e.description.replace(/"/g, '""')}"`,
                    e.category || '',
                    e.amount,
                    e.status,
                    `"${e.originCompany?.name || ''}"`,
                    `"${e.targetCompany?.name || ''}"`,
                    `"${e.worker?.name || ''}"`,
                    `"${e.distributions?.map(d => `${d.project?.name || d.costCenter?.name}: ${d.amount}`).join('; ') || ''}"`
                ];
                return row.join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `gastos_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gastos y Rendiciones</h1>
                    <p className="text-slate-500 font-medium">Control de gastos no facturados, cajas chicas y mutuos inter-empresa.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 transition-all flex items-center active:scale-95"
                >
                    <Plus size={20} className="mr-2" />
                    Registrar Gasto
                </button>
                <button
                    onClick={downloadCSV}
                    className="px-4 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-colors flex items-center"
                    title="Exportar a Excel (CSV)"
                >
                    <Download size={20} className="mr-2" />
                    Exportar
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center md:col-span-2">
                    <div className="p-4 bg-orange-100 text-orange-600 rounded-2xl mr-5">
                        <TrendingUp size={32} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Total Gastos Registrados</p>
                        <p className="text-3xl font-black text-slate-900">{formatCLP(totalAmount)}</p>
                    </div>
                </div>
            </div>


            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por descripción o monto..."
                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            <div className="bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white border-b border-slate-200 text-slate-400 text-xs font-black uppercase tracking-widest">
                                <th className="p-5">Fecha / Descripción</th>
                                <th className="p-5">Estado</th>
                                <th className="p-5">Origen / Destino</th>
                                <th className="p-5 text-center">Beneficiario</th>
                                <th className="p-5 text-right">Monto</th>
                                <th className="p-5 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {filteredExpenses.map((expense) => {
                                const isInterCompany = expense.originCompanyId !== expense.targetCompanyId;
                                return (
                                    <tr key={expense.id} className="hover:bg-white transition-colors group">
                                        <td className="p-5">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-bold text-slate-400">{expense.date.split('T')[0]}</span>
                                                    {expense.invoiceNumber && (
                                                        <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono text-slate-500">
                                                            #{expense.invoiceNumber}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-800">{expense.description}</span>
                                                    {expense.category && (
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded w-fit mt-0.5">
                                                            {expense.category}
                                                        </span>
                                                    )}
                                                </div>
                                                {expense.distributions && expense.distributions.length > 0 && (
                                                    <div className="flex gap-1 mt-1 flex-wrap">
                                                        {expense.distributions.map(d => (
                                                            <span key={d.id} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-lg border border-blue-100">
                                                                {d.project?.name || d.costCenter?.name || 'Varios'}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <button
                                                onClick={() => onUpdate({ ...expense, status: expense.status === 'PENDING' ? 'SETTLED' : 'PENDING' })}
                                                className={`px-3 py-1 rounded-full text-xs font-black border transition-all ${expense.status === 'SETTLED'
                                                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200'
                                                    : 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200'
                                                    }`}
                                            >
                                                {expense.status === 'SETTLED' ? 'PAGADO' : 'PENDIENTE'}
                                            </button>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase">Paga</span>
                                                    <span className="text-xs font-bold text-slate-700 truncate max-w-[120px]" title={expense.originCompany?.name}>
                                                        {expense.originCompany?.name || '---'}
                                                    </span>
                                                </div>
                                                <div className={`flex items-center justify-between p-2 rounded-lg border ${isInterCompany ? 'bg-orange-50 border-orange-100' : 'bg-slate-50 border-slate-100'}`}>
                                                    <span className={`text-[10px] font-black uppercase ${isInterCompany ? 'text-orange-400' : 'text-slate-400'}`}>Recibe</span>
                                                    <span className={`text-xs font-bold truncate max-w-[120px] ${isInterCompany ? 'text-orange-700' : 'text-slate-700'}`} title={expense.targetCompany?.name}>
                                                        {expense.targetCompany?.name || '---'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5 text-center">
                                            {expense.worker ? (
                                                <div className="inline-flex items-center px-3 py-1 bg-slate-100 rounded-full">
                                                    <UserIcon size={12} className="mr-2 text-slate-400" />
                                                    <span className="text-xs font-bold text-slate-600">{expense.worker.name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </td>
                                        <td className="p-5 text-right">
                                            <span className="text-lg font-black text-slate-900">{formatCLP(expense.amount)}</span>
                                        </td>
                                        <td className="p-5 text-center">
                                            <button
                                                onClick={() => onDelete(expense.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                                                title="Eliminar Gasto"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredExpenses.length === 0 && (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                                <DollarSign size={32} />
                            </div>
                            <h3 className="text-slate-900 font-bold text-lg mb-1">Sin gastos registrados</h3>
                            <p className="text-slate-500">Registra gastos no facturados para llevar el control.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL */}
            {
                showModal && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-100 flex flex-col max-h-[90vh]">
                            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <CreditCard className="text-blue-600" />
                                    Registrar Nuevo Gasto
                                </h3>
                                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">

                                {/* Header Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600 uppercase">Descripción del Gasto</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold"
                                            placeholder="Ej: Compra materiales urgentes, Uber a obra, Almuerzo cliente..."
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600 uppercase">Monto Total</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                            <input
                                                required
                                                type="number"
                                                className="w-full pl-8 pr-3 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-black text-slate-800"
                                                placeholder="0"
                                                value={formData.amount}
                                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600 uppercase">Fecha</label>
                                        <input
                                            required
                                            type="date"
                                            className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Company & Worker Info */}
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                                <Building2 size={12} />
                                                Quién Paga (Origen)
                                            </label>
                                            <select
                                                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500"
                                                value={formData.originCompanyId}
                                                onChange={(e) => setFormData({ ...formData, originCompanyId: e.target.value })}
                                            >
                                                {availableCompanies.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="col-span-2 space-y-1.5">
                                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                                <Target size={12} />
                                                Categoría
                                            </label>
                                            <div className="flex gap-2">
                                                <select
                                                    className="flex-1 p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500"
                                                    value={formData.category}
                                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                >
                                                    <option value="">Seleccionar Categoría...</option>
                                                    {CATEGORIES.map(cat => (
                                                        <option key={cat} value={cat}>{cat}</option>
                                                    ))}
                                                </select>
                                                {formData.category === 'Otro' && (
                                                    <input
                                                        type="text"
                                                        placeholder="Especificar..."
                                                        className="flex-1 p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 animate-in fade-in slide-in-from-left-2"
                                                        value={formData.customCategory}
                                                        onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                                                        autoFocus
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                                <ArrowRight size={12} />
                                                Para Quién (Destino)
                                            </label>
                                            <select
                                                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500"
                                                value={formData.targetCompanyId}
                                                onChange={(e) => setFormData({ ...formData, targetCompanyId: e.target.value })}
                                            >
                                                {availableCompanies.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="col-span-2 space-y-1.5">
                                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                                <UserIcon size={12} />
                                                Solicitante / Beneficiario (Opcional)
                                            </label>
                                            <select
                                                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-blue-500"
                                                value={formData.workerId}
                                                onChange={(e) => setFormData({ ...formData, workerId: e.target.value })}
                                            >
                                                <option value="">-- Ninguno / Empresa --</option>
                                                {workers.map(w => (
                                                    <option key={w.id} value={w.id}>{w.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Distribution */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-black text-slate-700 uppercase flex items-center gap-2">
                                            <Target size={14} className="text-blue-600" />
                                            Distribución / Prorrateo
                                        </label>
                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-500 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="accent-blue-600 w-4 h-4"
                                                checked={formData.isProrated}
                                                onChange={(e) => setFormData({ ...formData, isProrated: e.target.checked })}
                                            />
                                            Prorratear entre varios
                                        </label>
                                    </div>

                                    {formData.isProrated ? (
                                        <div className="space-y-2">
                                            {formData.distributions.map((dist, idx) => (
                                                <div key={idx} className="flex gap-2 items-center animate-in slide-in-from-left-2">
                                                    <select
                                                        className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                                                        value={dist.projectId}
                                                        onChange={(e) => handleDistributionChange(idx, 'projectId', e.target.value)}
                                                    >
                                                        <option value="">Proyecto (Opcional)</option>
                                                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                    </select>
                                                    <select
                                                        className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                                                        value={dist.costCenterId}
                                                        onChange={(e) => handleDistributionChange(idx, 'costCenterId', e.target.value)}
                                                    >
                                                        <option value="">C. Costo (Opcional)</option>
                                                        {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
                                                    </select>
                                                    <input
                                                        type="number"
                                                        placeholder="Monto"
                                                        className="w-24 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-right"
                                                        value={dist.amount}
                                                        onChange={(e) => handleDistributionChange(idx, 'amount', Number(e.target.value))}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeDistributionRow(idx)}
                                                        className="p-2 text-slate-400 hover:text-red-500"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={addDistributionRow}
                                                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-2"
                                            >
                                                <Plus size={12} />
                                                Agregar fila
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                                            <p className="text-xs text-slate-400">Sin distribución específica (Gasto General) o activa el prorrateo para asignar.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !formData.amount || !formData.description}
                                        className="px-8 py-3 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 shadow-xl shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? 'Guardando...' : 'Registrar Gasto'}
                                    </button>
                                </div>

                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default ExpensesPage;
