
import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Invoice, InvoiceType, Client } from '../../types';
import { formatCLP } from '../../constants';

interface TopEntitiesChartProps {
    invoices: Invoice[];
    clients: Client[]; // Pass clients to resolve names
    type: 'CLIENTS' | 'SUPPLIERS';
}

const TopEntitiesChart: React.FC<TopEntitiesChartProps> = ({ invoices, clients, type }) => {
    const data = useMemo(() => {
        const totals: Record<string, number> = {};

        invoices.forEach(inv => {
            if (inv.status === 'CANCELLED') return;

            const targetType = type === 'CLIENTS' ? InvoiceType.VENTA : InvoiceType.COMPRA;
            if (inv.type !== targetType) return;

            // Use clientId or fallback to a "Unknown" key if null
            // For Clients, clientId is usually mandatory. For Suppliers (Purchase), usually clientId acts as provider ref.
            const key = inv.clientId || 'unknown';

            if (!totals[key]) totals[key] = 0;
            totals[key] += inv.total;
        });

        // Convert to array and sort
        return Object.entries(totals)
            .map(([id, total]) => {
                const client = clients.find(c => c.id === id);
                return {
                    name: client ? client.razonSocial : (id === 'unknown' ? 'Sin Entidad' : id),
                    total
                };
            })
            .sort((a, b) => b.total - a.total)
            .slice(0, 5); // Top 5
    }, [invoices, clients, type]);

    const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e'];

    if (data.length === 0) {
        return <div className="flex items-center justify-center h-full text-slate-400 text-sm">Sin datos para ranking</div>;
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                    interval={0}
                />
                <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => formatCLP(value)}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={20}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

export default TopEntitiesChart;
