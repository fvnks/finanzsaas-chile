
import React, { useState, useMemo } from 'react';
import {
  PieChart as PieChartIcon,
  BarChart3,
  TrendingUp,
  Calendar,
  Filter,
  Download,
  FileText,
  Briefcase,
  ArrowUpRight,
  Calculator,
  Target,
  ChevronRight,
  Activity
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Invoice, Project, InvoiceType } from '../types';
import { formatCLP } from '../constants';

interface ReportsPageProps {
  invoices: Invoice[];
  projects: Project[];
  costCenters?: any[]; // Loose type for now to avoid import chaos
  clients?: any[];
}

const ReportsPage: React.FC<ReportsPageProps> = ({ invoices, projects, costCenters }) => {
  const [startDate, setStartDate] = useState<string>('2023-01-01');
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Filtrado y procesamiento de datos
  const reportData = useMemo(() => {
    const filteredInvoices = invoices.filter(inv => {
      const date = new Date(inv.date).getTime();
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();
      return date >= start && date <= end;
    });

    const totalSales = filteredInvoices
      .filter(inv => inv.type === InvoiceType.VENTA)
      .reduce((sum, inv) => sum + inv.total, 0);

    const totalPurchases = filteredInvoices
      .filter(inv => inv.type === InvoiceType.COMPRA)
      .reduce((sum, inv) => sum + inv.total, 0);

    // Group by project
    const projectStats = projects.map(p => {
      const pInvoices = filteredInvoices.filter(inv => inv.projectId === p.id);
      const sales = pInvoices
        .filter(inv => inv.type === InvoiceType.VENTA)
        .reduce((sum, inv) => sum + inv.total, 0);
      const purchases = pInvoices
        .filter(inv => inv.type === InvoiceType.COMPRA)
        .reduce((sum, inv) => sum + inv.total, 0);

      return {
        id: p.id,
        name: p.name,
        budget: p.budget,
        sales,
        purchases,
        margin: sales - purchases,
        execution: p.budget > 0 ? (sales / p.budget) * 100 : 0
      };
    }).filter(p => p.sales > 0 || p.purchases > 0);

    // Group by Cost Center
    const ccStats = (costCenters || []).map(cc => {
      const ccInvoices = filteredInvoices.filter(inv => inv.costCenterId === cc.id);
      const sales = ccInvoices
        .filter(inv => inv.type === InvoiceType.VENTA)
        .reduce((sum, inv) => sum + inv.total, 0);
      const purchases = ccInvoices
        .filter(inv => inv.type === InvoiceType.COMPRA)
        .reduce((sum, inv) => sum + inv.total, 0);

      return {
        id: cc.id,
        name: cc.name,
        code: cc.code,
        sales,
        purchases,
        margin: sales - purchases
      };
    }).filter(cc => cc.sales > 0 || cc.purchases > 0);

    return { projectStats, ccStats, totalSales, totalPurchases };
  }, [invoices, projects, costCenters, startDate, endDate]);

  const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center">
            <BarChart3 className="mr-2 text-blue-600" size={28} /> Reportes Estratégicos
          </h2>
          <p className="text-slate-500 font-medium">Análisis consolidado de rentabilidad y ejecución por proyecto.</p>
        </div>

        <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-2 px-3">
            <Calendar size={16} className="text-slate-400" />
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs font-bold text-slate-600 border-none bg-transparent focus:ring-0 cursor-pointer"
              />
              <span className="text-slate-300">/</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs font-bold text-slate-600 border-none bg-transparent focus:ring-0 cursor-pointer"
              />
            </div>
          </div>
          <button
            onClick={() => {
              import('xlsx').then(XLSX => {
                // 1. Prepare Data
                const projectData = reportData.projectStats.map(p => ({
                  'Proyecto': p.name,
                  'Presupuesto': p.budget,
                  'Ventas (Ingresos)': p.sales,
                  'Compras (Gastos)': p.purchases,
                  'Margen': p.margin,
                  'Ejecución (%)': (p.execution).toFixed(2)
                }));

                const ccData = reportData.ccStats.map(cc => ({
                  'Centro Costo': cc.name,
                  'Código': cc.code,
                  'Ventas (Ingresos)': cc.sales,
                  'Compras (Gastos)': cc.purchases,
                  'Margen': cc.margin
                }));

                const summaryData = [{
                  'Total Ventas': reportData.totalSales,
                  'Total Compras': reportData.totalPurchases,
                  'Margen Global': reportData.totalSales - reportData.totalPurchases
                }];

                // 2. Create Workbook
                const wb = XLSX.utils.book_new();

                if (projectData.length > 0) {
                  const wsProjects = XLSX.utils.json_to_sheet(projectData);
                  XLSX.utils.book_append_sheet(wb, wsProjects, "Proyectos");
                }

                if (ccData.length > 0) {
                  const wsCC = XLSX.utils.json_to_sheet(ccData);
                  XLSX.utils.book_append_sheet(wb, wsCC, "Centros de Costo");
                }

                const wsSummary = XLSX.utils.json_to_sheet(summaryData);
                XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen Global");

                // 3. Save File
                XLSX.writeFile(wb, `Reporte_Financiero_${startDate}_${endDate}.xlsx`);
              });
            }}
            className="bg-slate-900 text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
            title="Descargar Reporte Excel"
          >
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-16 -mt-16 group-hover:bg-blue-100/50 transition-colors"></div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ventas Proyectos</p>
            <p className="text-3xl font-black text-slate-900">{formatCLP(reportData.totalSales)}</p>
            <div className="flex items-center mt-4 text-green-600 text-xs font-bold bg-green-50 w-fit px-2 py-1 rounded-lg">
              <TrendingUp size={14} className="mr-1" /> Análisis del Período
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50/50 rounded-full -mr-16 -mt-16 group-hover:bg-orange-100/50 transition-colors"></div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Costos Operativos</p>
            <p className="text-3xl font-black text-slate-900">{formatCLP(reportData.totalPurchases)}</p>
            <div className="flex items-center mt-4 text-orange-600 text-xs font-bold bg-orange-50 w-fit px-2 py-1 rounded-lg">
              <Calculator size={14} className="mr-1" /> Imputación Directa
            </div>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-3xl shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full -mr-16 -mt-16"></div>
          <div className="relative z-10 text-white">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Margen Consolidado</p>
            <p className="text-3xl font-black text-white">{formatCLP(reportData.totalSales - reportData.totalPurchases)}</p>
            <div className="flex items-center mt-4 text-blue-200 text-xs font-bold bg-white/10 w-fit px-2 py-1 rounded-lg">
              <Target size={14} className="mr-1" /> Rendimiento Global
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico de Barras: Comparativa Ventas vs Costos (Prioridad Centros de Costo si no hay proyectos) */}
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                Rentabilidad Comparativa {reportData.projectStats.length === 0 ? "(Por Centro de Costo)" : "(Por Proyecto)"}
              </h3>
              <p className="text-xs text-slate-500 font-medium">Comparación directa entre Ventas (Ingresos) y Compras (Egresos).</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-sm">
              <Activity size={24} />
            </div>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData.projectStats.length > 0 ? reportData.projectStats : reportData.ccStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="sales" name="Ventas (Ingresos)" fill="#22c55e" radius={[6, 6, 0, 0]} barSize={32} />
                <Bar dataKey="purchases" name="Compras (Gastos)" fill="#f97316" radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Barras: Ranking de Facturación */}
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Ranking de Facturación</h3>
              <p className="text-xs text-slate-500 font-medium">Volumen de ventas brutas totales.</p>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <ArrowUpRight size={20} />
            </div>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData.projectStats.length > 0 ? reportData.projectStats : reportData.ccStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: '700' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: '700' }}
                  tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                  formatter={(value: any) => formatCLP(value)}
                />
                <Bar dataKey="sales" name="Ventas" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40}>
                  {(reportData.projectStats.length > 0 ? reportData.projectStats : reportData.ccStats).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico Circular: Distribución de Mercado */}
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Mix de Ingresos</h3>
              <p className="text-xs text-slate-500 font-medium">Participación porcentual del flujo total.</p>
            </div>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <PieChartIcon size={20} />
            </div>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={reportData.projectStats.length > 0 ? reportData.projectStats : reportData.ccStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="sales"
                >
                  {(reportData.projectStats.length > 0 ? reportData.projectStats : reportData.ccStats).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatCLP(value)} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabla de Detalle de Centros de Costo (Si no hay proyectos) */}
      {reportData.projectStats.length === 0 && reportData.ccStats.length > 0 && (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-lg font-black text-slate-800 flex items-center">
              <Calculator className="mr-2 text-slate-400" size={20} /> Detalle por Centro de Costo
            </h3>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded-lg uppercase tracking-widest">
              {reportData.ccStats.length} Centros Analizados
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="px-8 py-4">Código / Nombre</th>
                  <th className="px-8 py-4">Ventas Brutas</th>
                  <th className="px-8 py-4">Compras/Gastos</th>
                  <th className="px-8 py-4">Margen Neto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {reportData.ccStats.map((stat, idx) => (
                  <tr key={stat.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-xs uppercase">
                          {stat.code.charAt(0)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 text-sm block">{stat.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">{stat.code}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm font-black text-green-600">{formatCLP(stat.sales)}</td>
                    <td className="px-8 py-5 text-sm font-bold text-orange-500">{formatCLP(stat.purchases)}</td>
                    <td className="px-8 py-5 text-sm font-black text-slate-900">{formatCLP(stat.margin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabla de Detalle de Proyectos */}
      {reportData.projectStats.length > 0 && (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-lg font-black text-slate-800 flex items-center">
              <FileText className="mr-2 text-slate-400" size={20} /> Detalle de Ejecución Comercial
            </h3>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded-lg uppercase tracking-widest">
              {reportData.projectStats.length} Proyectos Analizados
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="px-8 py-4">Proyecto</th>
                  <th className="px-8 py-4">Presupuesto</th>
                  <th className="px-8 py-4">Ventas Brutas</th>
                  <th className="px-8 py-4">Compras/Gastos</th>
                  <th className="px-8 py-4">Margen Neto</th>
                  <th className="px-8 py-4">Ejecución</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {reportData.projectStats.map((stat, idx) => (
                  <tr key={stat.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </div>
                        <span className="font-bold text-slate-800 text-sm">{stat.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm text-slate-500 font-medium">{formatCLP(stat.budget)}</td>
                    <td className="px-8 py-5 text-sm font-black text-green-600">{formatCLP(stat.sales)}</td>
                    <td className="px-8 py-5 text-sm font-bold text-orange-500">{formatCLP(stat.purchases)}</td>
                    <td className="px-8 py-5 text-sm font-black text-slate-900">{formatCLP(stat.margin)}</td>
                    <td className="px-8 py-5">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 h-1.5 w-20 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${Math.min(stat.execution, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-black text-slate-400">{stat.execution.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportData.projectStats.length === 0 && reportData.ccStats.length === 0 && (
        <div className="bg-white p-12 rounded-[2rem] border border-slate-100 text-center text-slate-400 italic font-medium">
          No hay datos disponibles para el período seleccionado.
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
