
import React, { useMemo } from 'react';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Invoice, InvoiceType } from '../../types';
import { formatCLP } from '../../constants';

interface AgingReportChartProps {
    invoices: Invoice[];
}

const AgingReportChart: React.FC<AgingReportChartProps> = ({ invoices }) => {
    const data = useMemo(() => {
        const buckets = {
            current: 0,
            days30: 0,
            days60: 0,
            days90plus: 0
        };

        const now = new Date();

        invoices.forEach(inv => {
            // Analyze only Unpaid Sales
            if (inv.type !== InvoiceType.VENTA || inv.status === 'CANCELLED' || inv.isPaid) return;

            // Calculate days overdue
            // If dueDate exists use it, otherwise use date
            const refDate = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.date);
            const diffTime = now.getTime() - refDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 0) {
                buckets.current += inv.total;
            } else if (diffDays <= 30) {
                buckets.days30 += inv.total;
            } else if (diffDays <= 60) {
                buckets.days60 += inv.total;
            } else {
                buckets.days90plus += inv.total;
            }
        });

        return [
            { name: 'Al Día', value: buckets.current, color: '#22c55e' },
            { name: '1-30 Días', value: buckets.days30, color: '#eab308' },
            { name: '31-60 Días', value: buckets.days60, color: '#f97316' },
            { name: '> 60 Días', value: buckets.days90plus, color: '#ef4444' },
        ].filter(d => d.value > 0);
    }, [invoices]);

    if (data.length === 0) {
        return <div className="flex items-center justify-center h-full text-slate-400 text-sm">Sin deuda pendiente</div>;
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatCLP(value)} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
        </ResponsiveContainer>
    );
};

export default AgingReportChart;
