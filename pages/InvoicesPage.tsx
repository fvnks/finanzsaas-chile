
import React, { useState, useMemo } from 'react';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import {
  Plus,
  Search,
  Filter,
  Download,
  FileType,
  Trash2,
  AlertTriangle,
  X,
  Briefcase,
  Check,
  Target,
  Building2,
  Eye,
  Calendar,
  ShieldCheck,
  Printer,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Eraser,
  // Added missing Calculator icon
  Calculator
} from 'lucide-react';
import { Invoice, InvoiceType, Client, CostCenter, Project, InvoiceItem } from '../types';
import { formatCLP, IVA_RATE } from '../constants';

interface InvoicesPageProps {
  invoices: Invoice[];
  clients: Client[];
  costCenters: CostCenter[];
  projects: Project[];
  onAdd: (invoice: Invoice) => void;
  onDelete: (id: string) => void;
}

const InvoicesPage: React.FC<InvoicesPageProps> = ({ invoices, clients, costCenters, projects, onAdd, onDelete }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Basic Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | InvoiceType>('ALL');

  // Advanced Filter State
  const [advancedFilters, setAdvancedFilters] = useState({
    dateStart: '',
    dateEnd: '',
    minAmount: '',
    maxAmount: ''
  });

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      // Basic Filters
      const matchesType = filterType === 'ALL' || inv.type === filterType;
      const client = clients.find(c => c.id === inv.clientId);
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = inv.number.toLowerCase().includes(searchLower) ||
        client?.razonSocial.toLowerCase().includes(searchLower) ||
        client?.rut.toLowerCase().includes(searchLower);

      // Advanced Filters
      const matchesDateStart = !advancedFilters.dateStart || inv.date >= advancedFilters.dateStart;
      const matchesDateEnd = !advancedFilters.dateEnd || inv.date <= advancedFilters.dateEnd;
      const matchesMinAmount = !advancedFilters.minAmount || inv.total >= Number(advancedFilters.minAmount);
      const matchesMaxAmount = !advancedFilters.maxAmount || inv.total <= Number(advancedFilters.maxAmount);

      return matchesType && matchesSearch && matchesDateStart && matchesDateEnd && matchesMinAmount && matchesMaxAmount;
    });
  }, [invoices, searchTerm, filterType, advancedFilters, clients]);

  const stats = useMemo(() => {
    const net = filteredInvoices.reduce((sum, inv) => sum + inv.net, 0);
    const iva = filteredInvoices.reduce((sum, inv) => sum + inv.iva, 0);
    const total = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);
    return { net, iva, total };
  }, [filteredInvoices]);

  const [formData, setFormData] = useState({
    type: InvoiceType.VENTA,
    number: '',
    date: new Date().toISOString().split('T')[0],
    net: 0,
    clientId: '',
    costCenterId: '',
    projectId: '',
    purchaseOrderNumber: '',
    dispatchGuideNumber: '',
    relatedInvoiceId: '', // Added for Credit Notes
    items: [] as InvoiceItem[]
  });

  const handleAddItem = () => {
    const newItem: InvoiceItem = {
      id: Math.random().toString(36).substr(2, 9),
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const handleRemoveItem = (id: string) => {
    setFormData(prev => {
      const newItems = prev.items.filter(item => item.id !== id);
      const newNet = newItems.reduce((sum, item) => sum + item.total, 0);
      return { ...prev, items: newItems, net: newItems.length > 0 ? newNet : prev.net };
    });
  };

  const handleItemChange = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setFormData(prev => {
      const newItems = prev.items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'quantity' || field === 'unitPrice') {
            updatedItem.total = Math.round(Number(updatedItem.quantity) * Number(updatedItem.unitPrice));
          }
          return updatedItem;
        }
        return item;
      });
      const newNet = newItems.reduce((sum, item) => sum + item.total, 0);
      return { ...prev, items: newItems, net: newNet };
    });
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterType('ALL');
    setAdvancedFilters({
      dateStart: '',
      dateEnd: '',
      minAmount: '',
      maxAmount: ''
    });
  };

  const handleDownloadPDF = (invoice: Invoice) => {
    const element = document.getElementById('invoice-content');
    if (!element) return;

    const opt = {
      margin: [10, 10] as [number, number], // top, left, bottom, right
      filename: `Factura_${invoice.number}_${invoice.date}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(element).save();
  };



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId || !formData.costCenterId) return;

    const net = Number(formData.net);
    const iva = Math.round(net * IVA_RATE);
    const total = net + iva;

    const newInvoice: Invoice = {
      id: Math.random().toString(36).substr(2, 9),
      ...formData,
      net,
      iva,
      total,
      pdfUrl: '#'
    };
    onAdd(newInvoice);
    setShowModal(false);
    setFormData({
      type: InvoiceType.VENTA,
      number: '',
      date: new Date().toISOString().split('T')[0],
      net: 0,
      clientId: '',
      costCenterId: '',
      projectId: '',
      purchaseOrderNumber: '',
      dispatchGuideNumber: '',
      relatedInvoiceId: '',
      items: []
    });
  };

  const handleDeleteConfirm = () => {
    if (invoiceToDelete) {
      onDelete(invoiceToDelete.id);
      setInvoiceToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Facturación</h2>
          <p className="text-slate-500">Gestión y auditoría de documentos tributarios electrónicos.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all shadow-md shadow-blue-200 active:scale-95"
        >
          <Plus size={20} />
          <span>Emitir Documento</span>
        </button>
      </div>

      {/* Control de Filtros */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por folio, RUT o razón social..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <select
              className="border border-slate-200 rounded-xl px-4 py-2.5 bg-white outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 text-sm appearance-none cursor-pointer pr-8 relative"
              style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.2em' }}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
            >
              <option value="ALL">Todos los flujos</option>
              <option value={InvoiceType.VENTA}>Ventas Emitidas</option>
              <option value={InvoiceType.COMPRA}>Compras Recibidas</option>
            </select>

            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border font-bold text-sm transition-all ${showAdvanced
                ? 'bg-blue-50 border-blue-200 text-blue-600'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
            >
              <Filter size={18} />
              <span>Filtros Avanzados</span>
              {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {(searchTerm || filterType !== 'ALL' || Object.values(advancedFilters).some(v => v !== '')) && (
              <button
                onClick={resetFilters}
                className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                title="Limpiar Filtros"
              >
                <Eraser size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Panel Avanzado Colapsable */}
        {showAdvanced && (
          <div className="px-6 pb-6 pt-2 border-t border-slate-100 bg-slate-50/30 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Desde Fecha</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="date"
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
                    value={advancedFilters.dateStart}
                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, dateStart: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hasta Fecha</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="date"
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
                    value={advancedFilters.dateEnd}
                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, dateEnd: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monto Mínimo</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
                    value={advancedFilters.minAmount}
                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, minAmount: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monto Máximo</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="number"
                    placeholder="Sin límite"
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
                    value={advancedFilters.maxAmount}
                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, maxAmount: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Resumen de Resultados Filtrados */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase">Neto Consolidado</p>
            <p className="text-lg font-black text-slate-800">{formatCLP(stats.net)}</p>
          </div>
          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
            {/* Corrected: Calculator is now imported */}
            <Calculator size={20} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase">IVA Retenido</p>
            <p className="text-lg font-black text-slate-800">{formatCLP(stats.iva)}</p>
          </div>
          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
            <ShieldCheck size={20} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase">Total Bruto Filtrado</p>
            <p className="text-lg font-black text-blue-600">{formatCLP(stats.total)}</p>
          </div>
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <DollarSign size={20} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
              <tr>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Folio</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Entidad Comercial</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">SII</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className={`hover:bg-slate-50/50 transition-colors group ${inv.status === 'CANCELLED' ? 'opacity-60 bg-red-50/30' : ''}`}>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter 
                      ${inv.type === InvoiceType.VENTA ? 'bg-green-100 text-green-700' :
                        inv.type === InvoiceType.COMPRA ? 'bg-orange-100 text-orange-700' :
                          'bg-purple-100 text-purple-700' // Credit Note Style
                      }`}>
                      {inv.type.replace('_', ' ')}
                    </span>
                    {inv.status === 'CANCELLED' && (
                      <span className="ml-2 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter bg-red-100 text-red-700">
                        ANULADA
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-800">
                    <span className={inv.status === 'CANCELLED' ? 'line-through text-slate-400' : ''}>{inv.number}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs font-medium">{inv.date}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-slate-700 font-bold text-sm truncate max-w-[200px]">
                        {clients.find(c => c.id === inv.clientId)?.razonSocial || 'Desconocido'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {clients.find(c => c.id === inv.clientId)?.rut}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-black text-slate-900">{formatCLP(inv.total)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-green-600 bg-green-50 px-2 py-1 rounded-full w-fit">
                      <ShieldCheck size={12} className="mr-1" />
                      <span className="text-[10px] font-bold uppercase">Validado</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center space-x-1">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="text-slate-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-all"
                        title="Ver Detalle"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-lg transition-all"
                        title="Descargar"
                      >
                        <Download size={18} />
                      </button>
                      <button
                        onClick={() => setInvoiceToDelete(inv)}
                        className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-all"
                        title="Anular"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-slate-400 italic font-medium">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Search size={40} className="text-slate-200" />
                      <p>No se encontraron facturas con los criterios aplicados.</p>
                      <button onClick={resetFilters} className="text-blue-600 font-bold hover:underline text-xs">Limpiar todos los filtros</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visor de Detalle de Factura */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
            {/* Header Visor (No imprimir esto) */}
            <div className="px-8 py-6 bg-slate-900 text-white flex justify-between items-center print:hidden">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-2xl ${selectedInvoice.type === InvoiceType.VENTA ? 'bg-green-500' : 'bg-orange-500'}`}>
                  <FileType size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight uppercase">Factura de {selectedInvoice.type}</h3>
                  <div className="flex items-center space-x-2 text-slate-400 text-xs font-bold">
                    <span>FOLIO: {selectedInvoice.number}</span>
                    <span className="opacity-20">|</span>
                    <span className="flex items-center text-green-400"><ShieldCheck size={12} className="mr-1" /> DOCUMENTO ELECTRÓNICO</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                data-html2canvas-ignore="true"
              >
                <X size={28} />
              </button>
            </div>

            <div id="invoice-content" className="flex-1 overflow-y-auto p-10 bg-white">
              <div className="border-2 border-slate-900 rounded-none p-8 h-full min-h-[1000px] flex flex-col relative justify-between">

                {/* Watermark/Background Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rotate-45 transform translate-x-32 -translate-y-32 z-0 rounded-full mix-blend-multiply opacity-50"></div>

                <div className="relative z-10 flex-1">
                  {/* Header PDF Only */}
                  <div className="flex justify-between items-start border-b-4 border-slate-900 pb-8 mb-8">
                    <div>
                      <div className="mb-4">
                        {/* Logo Placeholder or Text */}
                        <div className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                          Vertikal Finanzas
                          <span className="text-blue-600">.SaaS</span>
                        </div>
                      </div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Soluciones Tecnológicas</p>
                      <p className="text-xs text-slate-400">Av. Providencia 1234, Of. 601, Santiago</p>
                      <p className="text-xs text-slate-400">contacto@vertikalfinanzas.cl</p>
                    </div>
                    <div className="text-right">
                      <div className="border-4 border-red-600 p-4 inline-block mb-2">
                        <p className="text-red-600 font-bold text-lg uppercase tracking-widest leading-none text-center">R.U.T.: 76.123.456-7</p>
                        <p className="text-slate-900 font-black text-xl uppercase tracking-tight my-1 text-center">Factura Electrónica</p>
                        <p className="text-red-600 font-bold text-lg text-center">Nº {selectedInvoice.number}</p>
                      </div>
                      <p className="text-[10px] font-bold text-red-600 uppercase mt-2">S.I.I. - SANTIAGO CENTRO</p>
                    </div>
                  </div>

                  {/* Grid de Información Básica */}
                  <div className="grid grid-cols-2 gap-12">
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Entidad Comercial</p>
                      <div className="space-y-1">
                        <p className="text-lg font-black text-slate-900">{clients.find(c => c.id === selectedInvoice.clientId)?.razonSocial}</p>
                        <p className="text-sm font-bold text-blue-600">{clients.find(c => c.id === selectedInvoice.clientId)?.rut}</p>
                        <p className="text-xs text-slate-500">{clients.find(c => c.id === selectedInvoice.clientId)?.email}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fecha y Emisión</p>
                      <div className="flex items-center space-x-2 text-slate-800">
                        <Calendar size={18} className="text-slate-400" />
                        <span className="font-bold">{selectedInvoice.date}</span>
                      </div>
                      <div className="flex items-center text-xs font-bold text-slate-500">
                        <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                        TRANSACCIÓN COMPLETADA
                      </div>
                    </div>
                  </div>

                  {/* Centro de Costo y Proyectos */}
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center">
                      <Target size={12} className="mr-2" /> Imputación y Trazabilidad
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Centro de Costo</span>
                        <span className="font-bold text-slate-900 text-sm">{costCenters.find(cc => cc.id === selectedInvoice.costCenterId)?.name}</span>
                      </div>
                      {selectedInvoice.projectId && (
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Proyecto Vinculado</span>
                          <div className="flex gap-2 mt-1">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black rounded border border-blue-200 flex items-center">
                              <Briefcase size={10} className="mr-1" />
                              {projects.find(p => p.id === selectedInvoice.projectId)?.name}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Desglose Financiero */}
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Detalle Económico</p>
                    <div className="border border-slate-100 rounded-3xl overflow-hidden">
                      <div className="grid grid-cols-4 bg-slate-50 p-4 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-100">
                        <div className="col-span-2">Descripción del Item</div>
                        <div className="text-right">Unidad</div>
                        <div className="text-right">Monto</div>
                      </div>

                      {/* Items Dinámicos si existen */}
                      {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                        <div className="divide-y divide-slate-50">
                          {selectedInvoice.items.map((item, idx) => (
                            <div key={idx} className="grid grid-cols-4 p-4 text-sm font-medium text-slate-700">
                              <div className="col-span-2">
                                <span className="block text-slate-900 font-bold">{item.description}</span>
                                <span className="text-xs text-slate-400">Cant: {item.quantity} x {formatCLP(item.unitPrice)}</span>
                              </div>
                              <div className="text-right text-slate-400 flex items-center justify-end">
                                UND
                              </div>
                              <div className="text-right font-bold text-slate-800">{formatCLP(item.total)}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-slate-400 italic text-xs">Sin detalle de ítems registrado.</div>
                      )}

                      <div className="p-4 space-y-3 bg-slate-50/50 border-t border-slate-100">
                        <div className="grid grid-cols-4 text-sm font-medium text-slate-700">
                          <div className="col-span-2">Monto Neto Afecto</div>
                          <div className="text-right text-slate-400">100%</div>
                          <div className="text-right font-bold">{formatCLP(selectedInvoice.net)}</div>
                        </div>
                        <div className="grid grid-cols-4 text-sm font-medium text-slate-700">
                          <div className="col-span-2">I.V.A (Impuesto al Valor Agregado)</div>
                          <div className="text-right text-slate-400">19%</div>
                          <div className="text-right font-bold">{formatCLP(selectedInvoice.iva)}</div>
                        </div>
                      </div>
                      <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">Total a Pagar</span>
                        <span className="text-3xl font-black">{formatCLP(selectedInvoice.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Visor */}
            <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center" data-html2canvas-ignore="true">
              <div className="flex items-center space-x-2 text-slate-400 text-[10px] font-bold">
                <Printer size={14} />
                <span>CÓDIGO DE VERIFICACIÓN: {selectedInvoice.id.toUpperCase()}</span>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => handleDownloadPDF(selectedInvoice)}
                  className="px-6 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors flex items-center"
                >
                  <Download size={16} className="mr-2" /> PDF
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="px-8 py-2 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
                >
                  Cerrar Visor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Registro Factura */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8 border border-slate-100">
            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200">
                  <FileType size={20} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Registrar Nueva Factura</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                  <FileType size={12} />
                  <span>Información del Documento</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase">Tipo Documento</label>
                    <select
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                      value={formData.type}
                      onChange={(e) => {
                        const newType = e.target.value as InvoiceType;
                        setFormData({
                          ...formData,
                          type: newType,
                          relatedInvoiceId: newType === InvoiceType.NOTA_CREDITO ? formData.relatedInvoiceId : undefined
                        });
                      }}
                    >
                      <option value={InvoiceType.VENTA}>Factura de Venta</option>
                      <option value={InvoiceType.COMPRA}>Factura de Compra</option>
                      <option value={InvoiceType.NOTA_CREDITO}>Nota de Crédito</option>
                    </select>
                  </div>

                  {/* Related Invoice Selector for Credit Notes */}
                  {formData.type === InvoiceType.NOTA_CREDITO && (
                    <div className="col-span-2 space-y-1.5 animate-in slide-in-from-top-1">
                      <label className="text-xs font-bold text-slate-600 uppercase flex items-center text-blue-600">
                        <Target size={12} className="mr-1" />
                        Referencia Factura (A Anular)
                      </label>
                      <select
                        className="w-full p-2.5 bg-blue-50 border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-700"
                        value={formData.relatedInvoiceId || ''}
                        onChange={(e) => setFormData({ ...formData, relatedInvoiceId: e.target.value })}
                        required={formData.type === InvoiceType.NOTA_CREDITO}
                      >
                        <option value="">Seleccione Factura a Anular...</option>
                        {invoices
                          .filter(inv => inv.type === InvoiceType.VENTA && inv.status !== 'CANCELLED')
                          .map(inv => {
                            const client = clients.find(c => c.id === inv.clientId);
                            return (
                              <option key={inv.id} value={inv.id}>
                                Nº {inv.number} - {client?.razonSocial} - {formatCLP(inv.total)} ({inv.date})
                              </option>
                            );
                          })}
                      </select>
                      <p className="text-[10px] text-blue-500 font-medium ml-1">
                        * Al emitir esta Nota de Crédito, la factura seleccionada quedará ANULADA.
                      </p>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase">Nº Factura</label>
                    <input
                      required
                      type="text"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                      value={formData.number}
                      placeholder={formData.type === InvoiceType.NOTA_CREDITO ? "NC-..." : "F-..."}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase">Fecha Emisión</label>
                    <input
                      required
                      type="date"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase">Monto Neto (CLP)</label>
                    <input
                      required
                      type="number"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-800"
                      value={formData.net || ''}
                      placeholder="0"
                      onChange={(e) => setFormData({ ...formData, net: Number(e.target.value) })}
                    />
                  </div>
                </div>
                {/* New Fields for PO and Dispatch Guide */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase">Nº Orden de Compra</label>
                    <input
                      type="text"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                      value={formData.purchaseOrderNumber}
                      placeholder="OC-12345"
                      onChange={(e) => setFormData({ ...formData, purchaseOrderNumber: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase">Nº Guía de Despacho</label>
                    <input
                      type="text"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                      value={formData.dispatchGuideNumber}
                      placeholder="GD-67890"
                      onChange={(e) => setFormData({ ...formData, dispatchGuideNumber: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-50">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                    <Target size={12} />
                    <span>Detalle de Ítems</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-[10px] font-black text-blue-600 uppercase hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                  >
                    + Agregar Ítem
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.items.map((item, index) => (
                    <div key={item.id} className="flex gap-2 items-start animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Descripción..."
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-blue-500 transition-colors"
                          value={item.description}
                          onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                        />
                      </div>
                      <div className="w-20">
                        <input
                          type="number"
                          placeholder="Cant."
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-blue-500 transition-colors text-center"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                        />
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          placeholder="Precio"
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-blue-500 transition-colors text-right"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(item.id, 'unitPrice', Number(e.target.value))}
                        />
                      </div>
                      <div className="w-24">
                        <div className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 text-right">
                          {formatCLP(item.total)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {formData.items.length === 0 && (
                    <div className="text-center py-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                      <p className="text-xs text-slate-400 italic">No hay ítems agregados. El monto neto será manual.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-50">
                <div className="flex items-center space-x-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                  <Building2 size={12} />
                  <span>Entidad Comercial</span>
                </div>
                <div className="space-y-1.5">
                  <select
                    required
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold text-slate-700"
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  >
                    <option value="">Seleccione un Cliente o Proveedor...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.rut} — {c.razonSocial}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-6">
                <div className="flex items-center space-x-2 text-blue-600 text-[10px] font-bold uppercase tracking-widest">
                  <Target size={12} />
                  <span>Imputación Contable y Proyectos</span>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700 uppercase flex items-center">
                      Centro de Costo <span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="relative">
                      <Target className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <select
                        required
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-800 appearance-none"
                        value={formData.costCenterId}
                        onChange={(e) => setFormData({ ...formData, costCenterId: e.target.value })}
                      >
                        <option value="">Defina el destino de los fondos...</option>
                        {costCenters.map(cc => (
                          <option key={cc.id} value={cc.id}>{cc.name}</option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <Filter size={14} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-700 uppercase flex items-center">
                      Vincular Proyectos <span className="text-slate-400 font-normal ml-2">(Opcional)</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                      {projects.map(prj => {
                        const isSelected = formData.projectId === prj.id;
                        return (
                          <button
                            key={prj.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, projectId: isSelected ? '' : prj.id })}
                            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all border ${isSelected
                              ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                              }`}
                          >
                            <span className="truncate">{prj.name}</span>
                            {isSelected ? <Check size={14} className="ml-2 flex-shrink-0" /> : <div className="ml-2 w-3.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
                >
                  Descartar
                </button>
                <button
                  type="submit"
                  disabled={!formData.clientId || !formData.costCenterId || !formData.net || !formData.number}
                  className={`px-10 py-3 rounded-2xl font-black text-white shadow-xl transition-all active:scale-95 ${!formData.clientId || !formData.costCenterId || !formData.net || !formData.number
                    ? 'bg-slate-300 cursor-not-allowed shadow-none'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                    }`}
                >
                  Confirmar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmación Eliminación Factura */}
      {invoiceToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-100">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-red-50/50">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">¿Anular Factura?</h3>
              <p className="text-slate-500 leading-relaxed mb-8 px-4">
                Estás a punto de anular la factura <span className="font-bold text-slate-800">{invoiceToDelete.number}</span>.
                Esta acción impactará los reportes financieros.
              </p>

              <div className="flex flex-col space-y-3">
                <button
                  onClick={handleDeleteConfirm}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-200 active:scale-95"
                >
                  Sí, Anular Factura
                </button>
                <button
                  onClick={() => setInvoiceToDelete(null)}
                  className="w-full py-4 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-2xl transition-all"
                >
                  Volver Atrás
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesPage;
