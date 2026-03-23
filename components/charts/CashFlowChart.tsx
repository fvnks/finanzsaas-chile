
import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Invoice } from '../../types';
import { formatCLP } from '../../constants';

interface CashFlowChartProps {
    invoices: Invoice[];
}

const normalizeInvoiceType = (value?: string) => {
    if (!value) return "SALE";
    const aliases: Record<string, string> = {
        SALE: "SALE", VENTA: "SALE",
        PURCHASE: "PURCHASE", COMPRA: "PURCHASE",
        CREDIT_NOTE: "CREDIT_NOTE", NOTA_CREDITO: "CREDIT_NOTE",
        DEBIT_NOTE: "DEBIT_NOTE", NOTA_DEBITO: "DEBIT_NOTE",
        GUIA_DESPACHO: "GUIA_DESPACHO", DISPATCH_GUIDE: "GUIA_DESPACHO",
        FACTURA_EXENTA: "FACTURA_EXENTA", EXEMPT_INVOICE: "FACTURA_EXENTA"
    };
    return aliases[value] || value;
};

const CashFlowChart: React.FC<CashFlowChartProps> = ({ invoices }) => {
    const data = useMemo(() => {
        const monthlyData: Record<string, { name: string; income: number; expense: number; monthIndex: number }> = {};

        invoices.forEach(inv => {
            if (inv.status === 'CANCELLED') return;

            const date = new Date(inv.date);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            const monthName = date.toLocaleDateString('es-CL', { month: 'short', year: 'numeric' });

            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    name: monthName,
                    income: 0,
                    expense: 0,
                    monthIndex: date.getTime()
                };
            }

            const normType = normalizeInvoiceType(inv.type);
            if (normType === 'SALE' || normType === 'DEBIT_NOTE') {
                monthlyData[monthKey].income += inv.total;
            } else if (normType === 'PURCHASE' || normType === 'CREDIT_NOTE') {
                monthlyData[monthKey].expense += inv.total;
            }
        });

        return Object.values(monthlyData).sort((a, b) => a.monthIndex - b.monthIndex);
    }, [invoices]);

    if (data.length === 0) {
        return <div className="flex items-center justify-center h-full text-slate-400">Sin datos suficientes para graficar</div>;
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: '700' }}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: '700' }}
                    tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`}
                />
                <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                    formatter={(value: any) => formatCLP(value)}
                />
                <Legend iconType="circle" />
                <Bar dataKey="income" name="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="expense" name="Egresos" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
        </ResponsiveContainer>
    );
};

export default CashFlowChart;
