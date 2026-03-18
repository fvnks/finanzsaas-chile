import React, { useState, useEffect } from 'react';
import { TrendingUp, BarChart3, ArrowUpRight, ArrowDownLeft, Calendar } from 'lucide-react';
import { API_URL } from '../src/config';
import { useCompany } from '../components/CompanyContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CashFlowData {
    currentBalanceCLP: number;
    accountsPayable: any[];
    accountsReceivable: any[];
}

export default function CashFlowPage() {
    const { activeCompany } = useCompany();
    const [data, setData] = useState<CashFlowData | null>(null);
    const [loading, setLoading] = useState(true);
    const [chartData, setChartData] = useState<any[]>([]);

    useEffect(() => {
        if (activeCompany) fetchCashFlow();
    }, [activeCompany]);

    const fetchCashFlow = async () => {
        try {
            const res = await fetch(`${API_URL}/cash-flow`, {
                headers: { 'x-company-id': activeCompany?.id || '' }
            });
            if (res.ok) {
                const result = await res.json();
                setData(result);
                processChartData(result);
            }
        } catch (error) {
            console.error("Error fetching cash flow", error);
        } finally {
            setLoading(false);
        }
    };

    const processChartData = (raw: CashFlowData) => {
        // Group by Month from dueDate
        const monthsMap: { [key: string]: { month: string, ingresos: number, egresos: number, sortKey: string } } = {};

        const getMonthYear = (dateStr: string) => {
             const d = new Date(dateStr);
             const month = d.toLocaleString('es-CL', { month: 'short', year: '2-digit' });
             const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
             return { month, sortKey };
        };

        // Process Receivables (Ingresos)
        raw.accountsReceivable.forEach(inv => {
             if (!inv.dueDate) return;
             const { month, sortKey } = getMonthYear(inv.dueDate);
             if (!monthsMap[month]) monthsMap[month] = { month, ingresos: 0, egresos: 0, sortKey };
             // Use totalAmount if present, or net if calculated
             const amount = inv.totalAmount || inv.total || 0;
             monthsMap[month].ingresos += amount * (inv.exchangeRate || 1);
        });

        // Process Payables (Egresos)
        raw.accountsPayable.forEach(inv => {
             if (!inv.dueDate) return;
             const { month, sortKey } = getMonthYear(inv.dueDate);
             if (!monthsMap[month]) monthsMap[month] = { month, ingresos: 0, egresos: 0, sortKey };
             const amount = inv.totalAmount || inv.total || 0;
             monthsMap[month].egresos += amount * (inv.exchangeRate || 1);
        });

        // Convert to array and sort chronologically
        const sorted = Object.values(monthsMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey));

        setChartData(sorted);
    };

    const formatCLP = (amount: number) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount);
    };

    const totalPayable = data?.accountsPayable.reduce((sum, inv) => sum + (inv.totalAmount * (inv.exchangeRate || 1)), 0) || 0;
    const totalReceivable = data?.accountsReceivable.reduce((sum, inv) => sum + (inv.totalAmount * (inv.exchangeRate || 1)), 0) || 0;
    const projectedBalance = (data?.currentBalanceCLP || 0) + totalReceivable - totalPayable;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                        <TrendingUp size={24} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Flujo de Caja Proyectado</h1>
                </div>
            </div>

            {loading ? (
                <div>Cargando proyecciones...</div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <div className="text-sm text-slate-500">Saldo Bancario Actual</div>
                            <div className="text-2xl font-bold text-slate-900 mt-1">{formatCLP(data?.currentBalanceCLP || 0)}</div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <div className="text-sm text-slate-500 flex items-center space-x-1">
                                <ArrowUpRight size={14} className="text-emerald-500" />
                                <span>Por Cobrar (Ventas)</span>
                            </div>
                            <div className="text-2xl font-bold text-emerald-600 mt-1">+{formatCLP(totalReceivable)}</div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <div className="text-sm text-slate-500 flex items-center space-x-1">
                                <ArrowDownLeft size={14} className="text-red-500" />
                                <span>Por Pagar (Compras)</span>
                            </div>
                            <div className="text-2xl font-bold text-red-600 mt-1">-{formatCLP(totalPayable)}</div>
                        </div>
                        <div className="bg-slate-800 text-white rounded-xl shadow-sm p-6">
                            <div className="text-sm text-slate-300">Caja Proyectada</div>
                            <div className="text-2xl font-bold mt-1">{formatCLP(projectedBalance)}</div>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h2 className="font-bold text-slate-800 mb-4 flex items-center space-x-2">
                            <BarChart3 size={18} className="text-slate-400" />
                            <span>Proyección Mensual de Vencimientos</span>
                        </h2>
                        
                        {chartData.length === 0 ? (
                            <div className="h-64 flex items-center justify-center text-slate-500">
                                No hay facturas con fecha de vencimiento configurada para proyectar.
                            </div>
                        ) : (
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="month" stroke="#64748b" />
                                        <YAxis stroke="#64748b" tickFormatter={(v) => `$${(v/1000000)}M`} />
                                        <Tooltip formatter={(value) => formatCLP(Number(value))} />
                                        <Legend />
                                        <Bar dataKey="ingresos" name="Ingresos Proyectados" fill="#10b981" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="egresos" name="Egresos Proyectados" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
