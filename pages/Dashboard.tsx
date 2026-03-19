import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Cell, PieChart, Pie
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Wallet,
  ReceiptText,
  Clock3
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
  const pendingInvoices = invoices.filter(i => !i.isPaid).length;
  const paidInvoices = invoices.filter(i => i.isPaid).length;
  const collectionRate = invoices.length > 0 ? Math.round((paidInvoices / invoices.length) * 100) : 0;
  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const getLast6Months = () => {
    const months = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push({
        date: d,
        name: d.toLocaleString('es-CL', { month: 'short' }),
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      });
    }
    return months;
  };

  const last6Months = getLast6Months();
  const data = last6Months.map(month => {
    const monthlyInvoices = invoices.filter(inv => inv.date.startsWith(month.key));

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

  const strongestMonth = [...data].sort((a, b) => (b.ventas - b.compras) - (a.ventas - a.compras))[0];
  const pieData = [
    { name: 'Ventas', value: totalSales },
    { name: 'Compras', value: totalPurchases },
  ];
  const COLORS = ['#2563eb', '#f97316'];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="rounded-lg bg-blue-100 p-2.5 text-blue-700 w-fit">
            <TrendingUp size={20} />
          </div>
          <div className="mt-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Ventas</p>
            <p className="text-xl font-semibold text-slate-900">{formatCLP(totalSales)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="rounded-lg bg-orange-100 p-2.5 text-orange-700 w-fit">
            <TrendingDown size={20} />
          </div>
          <div className="mt-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Compras</p>
            <p className="text-xl font-semibold text-slate-900">{formatCLP(totalPurchases)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="rounded-lg bg-emerald-100 p-2.5 text-emerald-700 w-fit">
            <DollarSign size={20} />
          </div>
          <div className="mt-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Margen</p>
            <p className="text-xl font-semibold text-slate-900">{formatCLP(margin)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="rounded-lg bg-violet-100 p-2.5 text-violet-700 w-fit">
            <Users size={20} />
          </div>
          <div className="mt-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Clientes</p>
            <p className="text-xl font-semibold text-slate-900">{clients.length}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_0.9fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Resumen financiero</h2>
              <p className="mt-1 text-sm text-slate-500">Lectura rápida de operación y cobranza.</p>
            </div>
            <div className={`rounded-lg px-3 py-2 text-sm font-semibold ${margin >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {margin >= 0 ? 'Margen positivo' : 'Margen negativo'}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 px-4 py-3">
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Cobranza</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{collectionRate}%</div>
              <p className="mt-1 text-sm text-slate-500">{paidInvoices} pagadas</p>
            </div>
            <div className="rounded-lg border border-slate-200 px-4 py-3">
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Pendientes</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{pendingInvoices}</div>
              <p className="mt-1 text-sm text-slate-500">Facturas por seguir</p>
            </div>
            <div className="rounded-lg border border-slate-200 px-4 py-3">
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Mejor mes</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">{strongestMonth?.name || 'Sin datos'}</div>
              <p className="mt-1 text-sm text-slate-500">
                {strongestMonth ? formatCLP(strongestMonth.ventas - strongestMonth.compras) : 'Sin historial'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Cobranza</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{collectionRate}%</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <Wallet size={20} />
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-500">{paidInvoices} facturas pagadas de {invoices.length} registradas.</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Pendientes</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{pendingInvoices}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <Clock3 size={20} />
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-500">Documentos que aún exigen seguimiento comercial o financiero.</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Mejor mes</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{strongestMonth?.name || 'Sin datos'}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                <ReceiptText size={20} />
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-500">
              {strongestMonth ? `Balance estimado ${formatCLP(strongestMonth.ventas - strongestMonth.compras)}.` : 'Aún no hay operación suficiente.'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-slate-900">Ritmo de operación reciente</h3>
            <p className="text-sm text-slate-500">Comparación entre ventas y compras de los últimos seis meses.</p>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(value) => formatCLP(value)}
                  width={80}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px -12px rgb(15 23 42 / 0.25)' }}
                  formatter={(value: number) => [formatCLP(value), '']}
                />
                <Legend iconType="circle" />
                <Bar dataKey="ventas" name="Ventas" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="compras" name="Compras" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-5 text-lg font-semibold text-slate-900">Mix financiero</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={82}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [formatCLP(value), '']} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Actividad reciente</h3>
          <p className="text-sm text-slate-500">Últimos documentos registrados para seguimiento rápido.</p>
        </div>
        <div className="grid gap-3">
          {recentInvoices.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              Aún no hay facturas para mostrar en la actividad reciente.
            </div>
          )}
          {recentInvoices.map(invoice => (
            <div key={invoice.id} className="grid gap-3 rounded-lg border border-slate-200 px-4 py-3 md:grid-cols-[1.4fr_0.8fr_0.8fr_0.6fr] md:items-center">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{invoice.type}</div>
                <div className="mt-1 text-sm font-medium text-slate-900">Folio {invoice.number}</div>
              </div>
              <div className="text-sm text-slate-600">{new Date(invoice.date).toLocaleDateString('es-CL')}</div>
              <div className="text-sm font-medium text-slate-900">{formatCLP(invoice.total)}</div>
              <div className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${invoice.isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {invoice.isPaid ? 'Pagada' : 'Pendiente'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
