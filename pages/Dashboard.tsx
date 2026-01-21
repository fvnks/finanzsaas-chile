
import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, Cell, PieChart, Pie
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Invoice, InvoiceType } from '../types';
import { formatCLP } from '../constants';

interface DashboardProps {
  invoices: Invoice[];
  clients: any[];
}

const Dashboard: React.FC<DashboardProps> = ({ invoices, clients }) => {
  const totalSales = invoices
    .filter(i => i.type === InvoiceType.VENTA)
    .reduce((acc, curr) => acc + curr.total, 0);

  const totalPurchases = invoices
    .filter(i => i.type === InvoiceType.COMPRA)
    .reduce((acc, curr) => acc + curr.total, 0);

  const margin = totalSales - totalPurchases;

  // Calculate dynamic 6-month cash flow
  const getLast6Months = () => {
    const months = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push({
        date: d,
        name: d.toLocaleString('es-CL', { month: 'short' }),
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` // YYYY-MM format for easy matching
      });
    }
    return months;
  };

  const last6Months = getLast6Months();

  const data = last6Months.map(month => {
    // Filter invoices for this month
    const monthlyInvoices = invoices.filter(inv => {
      // Assuming inv.date is YYYY-MM-DD string
      return inv.date.startsWith(month.key);
    });

    const ventas = monthlyInvoices
      .filter(i => i.type === InvoiceType.VENTA)
      .reduce((acc, curr) => acc + curr.total, 0);

    const compras = monthlyInvoices
      .filter(i => i.type === InvoiceType.COMPRA)
      .reduce((acc, curr) => acc + curr.total, 0);

    return {
      name: month.name,
      ventas,
      compras
    };
  });

  const pieData = [
    { name: 'Ventas', value: totalSales },
    { name: 'Compras', value: totalPurchases },
  ];
  const COLORS = ['#3b82f6', '#f97316'];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Vista General</h2>
        <p className="text-slate-500">Resumen financiero y métricas clave de tu negocio.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <TrendingUp size={24} />
            </div>
            <span className="flex items-center text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded-full">
              +12% <ArrowUpRight size={14} className="ml-1" />
            </span>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-500">Ventas Totales</p>
            <p className="text-2xl font-bold text-slate-800">{formatCLP(totalSales)}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
              <TrendingDown size={24} />
            </div>
            <span className="flex items-center text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full">
              -5% <ArrowDownRight size={14} className="ml-1" />
            </span>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-500">Compras Totales</p>
            <p className="text-2xl font-bold text-slate-800">{formatCLP(totalPurchases)}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-green-50 text-green-600 rounded-xl">
              <DollarSign size={24} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-500">Margen Bruto</p>
            <p className="text-2xl font-bold text-slate-800">{formatCLP(margin)}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <Users size={24} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-500">Clientes Activos</p>
            <p className="text-2xl font-bold text-slate-800">{clients.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold mb-6">Flujo de Caja (6 meses)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="ventas" name="Ventas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="compras" name="Compras" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold mb-6">Distribución de Operaciones</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
