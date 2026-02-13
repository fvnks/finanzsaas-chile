
import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Invoice, InvoiceType } from '../../types';
import { formatCLP } from '../../constants';

interface CashFlowChartProps {
    invoices: Invoice[];
}

const CashFlowChart: React.FC<CashFlowChartProps> = ({ invoices }) => {
    const data = useMemo(() => {
        const monthlyData: Record<string, { name: string; income: number; expense: number; monthIndex: number }> = {};

        invoices.forEach(inv => {
            // Filter out cancelled
            if (inv.status === 'CANCELLED') return;

            const date = new Date(inv.date);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            const monthName = date.toLocaleDateString('es-CL', { month: 'short', year: 'numeric' });

            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    name: monthName,
                    income: 0,
                    expense: 0,
                    monthIndex: date.getTime() // Crude sort key
                };
            }

            if (inv.type === InvoiceType.VENTA || inv.type === InvoiceType.NOTA_DEBITO) {
                monthlyData[monthKey].income += inv.total;
            } else if (inv.type === InvoiceType.COMPRA || inv.type === InvoiceType.NOTA_CREDITO) {
                // Technically NC on Sales reduces Income, but usually tracked as Expense/Contra-revenue for simple visuals
                // Or strictly: Review types. If Type is NC, checks 'relatedInvoice'.
                // For simplicity in this overview:
                // Sales = Income
                // Purchases = Expense
                // NC usually reduces the respective category, but if type is unique, let's treat Purchases as Expense.
                // Let's stick to strict: VENTA -> Income, COMPRA -> Expense.
                if (inv.type === InvoiceType.COMPRA) {
                    monthlyData[monthKey].expense += inv.total;
                }
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
