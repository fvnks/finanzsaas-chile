import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Cell, PieChart, Pie, AreaChart, Area
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Wallet,
  ReceiptText,
  Clock3,
  ArrowUpRight
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
      compras,
      margen: ventas - compras
    };
  });

  const strongestMonth = [...data].sort((a, b) => b.margen - a.margen)[0];
  const pieData = [
    { name: 'Ventas', value: totalSales },
    { name: 'Compras', value: totalPurchases },
  ];
  const colors = ['#0f6cbd', '#f97316'];

  const headlineCards = [
    {
      label: 'Ventas',
      value: formatCLP(totalSales),
      icon: TrendingUp,
      tint: 'from-sky-500/20 to-transparent',
      chip: 'Ingresos'
    },
    {
      label: 'Compras',
      value: formatCLP(totalPurchases),
      icon: TrendingDown,
      tint: 'from-orange-500/20 to-transparent',
      chip: 'Egresos'
    },
    {
      label: 'Margen',
      value: formatCLP(margin),
      icon: DollarSign,
      tint: margin >= 0 ? 'from-emerald-500/20 to-transparent' : 'from-rose-500/20 to-transparent',
      chip: margin >= 0 ? 'Saludable' : 'En revision'
    },
    {
      label: 'Clientes',
      value: `${clients.length}`,
      icon: Users,
      tint: 'from-violet-500/20 to-transparent',
      chip: 'Relacion'
    }
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(242,247,252,0.82))] shadow-[var(--shadow-soft)]">
        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.35fr_0.95fr] lg:px-8 lg:py-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">
              Pulso financiero
            </div>
            <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-tight text-slate-950">
              Una lectura ejecutiva de caja, operacion y cobranza.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              La interfaz prioriza lo que exige accion: ventas versus compras, velocidad de cobranza y el mes con mejor rendimiento operativo.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {headlineCards.map(card => (
                <div key={card.label} className={`relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white px-4 py-4 shadow-[var(--shadow-panel)]`}>
                  <div className={`pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-br ${card.tint}`} />
                  <div className="relative flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{card.label}</p>
                      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{card.value}</p>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
                      <card.icon size={19} />
                    </div>
                  </div>
                  <div className="relative mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-600">
                    <ArrowUpRight size={12} />
                    {card.chip}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200/70 bg-[#07111d] p-5 text-white shadow-[var(--shadow-panel)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Cobranza activa</p>
                <p className="mt-2 text-4xl font-semibold tracking-tight">{collectionRate}%</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-sky-200">
                <Wallet size={22} />
              </div>
            </div>
            <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Pagadas</p>
                  <p className="mt-2 text-2xl font-semibold">{paidInvoices}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Pendientes</p>
                  <p className="mt-2 text-2xl font-semibold text-amber-300">{pendingInvoices}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-300">
                {strongestMonth ? `Mejor mes: ${strongestMonth.name} con ${formatCLP(strongestMonth.margen)} de margen.` : 'Aun no hay historial suficiente para estimar tendencias.'}
              </p>
            </div>

            <div className="mt-5 h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="dashboardMargin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.14)" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ stroke: '#38bdf8', strokeWidth: 1, strokeDasharray: '4 4' }}
                    contentStyle={{ borderRadius: '18px', border: '1px solid rgba(148,163,184,0.15)', background: '#020617', color: '#fff' }}
                    formatter={(value: number) => [formatCLP(value), 'Margen']}
                  />
                  <Area type="monotone" dataKey="margen" stroke="#38bdf8" strokeWidth={2.4} fill="url(#dashboardMargin)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_0.95fr]">
        <section className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[var(--shadow-panel)] backdrop-blur">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold tracking-tight text-slate-950">Ritmo de operacion reciente</h3>
              <p className="mt-1 text-sm text-slate-500">Comparacion entre ventas y compras de los ultimos seis meses.</p>
            </div>
            <div className={`rounded-full px-3 py-1 text-xs font-semibold ${margin >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {margin >= 0 ? 'Margen positivo' : 'Margen negativo'}
            </div>
          </div>

          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barGap={10}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(value) => formatCLP(value)}
                  width={90}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 18px 48px -24px rgba(15,23,42,0.18)' }}
                  formatter={(value: number) => [formatCLP(value), '']}
                />
                <Legend iconType="circle" />
                <Bar dataKey="ventas" name="Ventas" fill="#0f6cbd" radius={[8, 8, 0, 0]} />
                <Bar dataKey="compras" name="Compras" fill="#f97316" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="grid gap-4">
          <div className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[var(--shadow-panel)] backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Mix financiero</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">Ventas vs compras</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <ReceiptText size={20} />
              </div>
            </div>
            <div className="mt-4 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={58} outerRadius={82} paddingAngle={4} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatCLP(value), '']} />
                  <Legend verticalAlign="bottom" height={30} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[var(--shadow-panel)] backdrop-blur">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Pendientes</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-950">{pendingInvoices}</p>
                  </div>
                  <Clock3 className="text-amber-500" size={22} />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Mejor mes</p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">{strongestMonth?.name || 'Sin datos'}</p>
                  </div>
                  <ArrowUpRight className="text-sky-600" size={22} />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[var(--shadow-panel)] backdrop-blur">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-slate-950">Actividad reciente</h3>
            <p className="mt-1 text-sm text-slate-500">Ultimos documentos registrados, ordenados por fecha.</p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {recentInvoices.length} documentos visibles
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {recentInvoices.length > 0 ? recentInvoices.map(invoice => (
            <div key={invoice.id} className="grid gap-3 py-4 md:grid-cols-[1.1fr_0.65fr_0.55fr_0.45fr] md:items-center">
              <div>
                <p className="text-sm font-semibold text-slate-950">{invoice.number}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{invoice.type}</p>
              </div>
              <div className="text-sm text-slate-600">{new Date(invoice.date).toLocaleDateString('es-CL')}</div>
              <div className="text-sm font-medium text-slate-800">{formatCLP(invoice.total)}</div>
              <div className="md:text-right">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${invoice.isPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {invoice.isPaid ? 'Pagada' : 'Pendiente'}
                </span>
              </div>
            </div>
          )) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
              Todavia no hay documentos para mostrar en el resumen.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
