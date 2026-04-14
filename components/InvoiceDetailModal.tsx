
import React from 'react';
import { 
  X, Download, DollarSign, Printer, Building2, Briefcase, Calendar, ShieldCheck 
} from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { Invoice, Client, CostCenter, Project, Supplier, Expense } from '../types';
import { formatCLP } from '../constants';
import { getInvoiceTypeLabel, normalizeInvoiceType } from '../src/utils/invoiceUtils';

interface InvoiceDetailModalProps {
  invoice: Invoice;
  activeCompany: any;
  clients: Client[];
  suppliers: Supplier[];
  costCenters: CostCenter[];
  projects: Project[];
  expenses: Expense[];
  onClose: () => void;
}

const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  activeCompany,
  clients,
  suppliers,
  costCenters,
  projects,
  expenses,
  onClose
}) => {
  const selectedInvoice = invoice;

  const handleDownloadPDF = (inv: Invoice) => {
    const element = document.getElementById('invoice-content');
    if (!element) return;

    const opt = {
      margin: 0,
      filename: `${getInvoiceTypeLabel(inv.type)}_${inv.number}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    html2pdf().from(element).set(opt).save();
  };

  const client = clients.find(c => c.id === selectedInvoice.clientId);
  const supplier = suppliers.find(s => s.id === selectedInvoice.supplierId);
  const costCenter = costCenters.find(cc => cc.id === selectedInvoice.costCenterId);
  const project = projects.find(p => p.id === selectedInvoice.projectId);
  const linkedExpenses = expenses.filter(exp => exp.invoiceId === selectedInvoice.id);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] w-full max-w-5xl h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 duration-500 border border-slate-200">
        
        {/* HEADER VISOR */}
        <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center space-x-5">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200">
              <Printer className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none mb-1">
                {getInvoiceTypeLabel(selectedInvoice.type)}
              </h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center">
                Visualización de Documento Electrónico <ShieldCheck size={12} className="ml-1 text-blue-500" />
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 transition-all active:scale-90"
          >
            <X size={24} />
          </button>
        </div>

        {/* CONTENT VISOR */}
        <div className="flex-1 overflow-y-auto p-10 bg-slate-50/30">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* GRID CABECERA */}
            <div className="grid grid-cols-12 gap-6 items-start">
              
              {/* COL 1: INFO BÁSICA (Emisor/Folio) */}
              <div className="col-span-4 space-y-5">
                <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-4">
                  <div>
                    <p className="font-bold uppercase text-slate-400 text-[10px] mb-1">Folio Documento</p>
                    <p className="text-3xl font-black text-slate-900 tracking-tight">#{selectedInvoice.number}</p>
                  </div>
                  <div>
                    <p className="font-bold uppercase text-slate-400 text-[10px] mb-1">Fecha Emisión</p>
                    <div className="flex items-center text-slate-700 font-bold">
                      <Calendar size={14} className="mr-2 text-slate-400" />
                      {selectedInvoice.date}
                    </div>
                  </div>
                  <div>
                    <p className="font-bold uppercase text-slate-400 text-[10px] mb-1">Vencimiento</p>
                    <p className="font-bold text-slate-900 text-sm">
                      {selectedInvoice.dueDate || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="font-bold uppercase text-slate-400 text-[10px] mb-1">Estado Pago</p>
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide border ${selectedInvoice.isPaid 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {selectedInvoice.isPaid ? 'PAGADO' : 'PENDIENTE'}
                    </span>
                  </div>
                </div>
              </div>

              {/* COL 2: RECEPTOR (Cliente/Proveedor) */}
              <div className="col-span-4 space-y-3 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm min-h-[220px]">
                <p className="font-bold uppercase text-slate-400 text-[10px] tracking-wider mb-2 border-b border-slate-100 pb-2 flex items-center">
                  <Building2 size={12} className="mr-1" />
                  {normalizeInvoiceType(selectedInvoice.type) === 'PURCHASE' ? 'Proveedor' : 'Señor(es)'}
                </p>
                <div>
                  <p className="font-black text-slate-800 text-sm uppercase leading-tight h-10 overflow-hidden">
                    {normalizeInvoiceType(selectedInvoice.type) === 'PURCHASE' 
                      ? (supplier?.name || 'Proveedor Desconocido')
                      : (client?.razonSocial || 'Cliente Desconocido')}
                  </p>
                  <p className="font-mono text-slate-500 font-bold mt-2 text-xs">
                    {normalizeInvoiceType(selectedInvoice.type) === 'PURCHASE' 
                      ? (supplier?.rut || 'S/R')
                      : (client?.rut || 'S/R')}
                  </p>
                </div>
                <div className="pt-2">
                  <p className="text-slate-500 italic text-xs truncate">
                    {normalizeInvoiceType(selectedInvoice.type) === 'PURCHASE' 
                      ? (supplier?.email || 'Sin contacto')
                      : (client?.email || 'Sin contacto')}
                  </p>
                </div>
              </div>

              {/* COL 3: REFERENCIAS (Trazabilidad) */}
              <div className="col-span-4 space-y-3 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm min-h-[220px]">
                <p className="font-bold uppercase text-slate-400 text-[10px] tracking-wider mb-2 border-b border-slate-100 pb-2 flex items-center">
                  <Briefcase size={12} className="mr-1" />
                  Referencias
                </p>

                <div className="grid grid-cols-1 gap-3">
                  {/* Centro de Costo */}
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Centro de Costo</p>
                    <p className="font-bold text-slate-700 text-sm">
                      {costCenter?.name || '-'}
                    </p>
                  </div>

                  {/* Proyecto - Si existe */}
                  {selectedInvoice.projectId && (
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Proyecto</p>
                      <p className="font-bold text-blue-700 text-sm">
                        {project?.name}
                      </p>
                    </div>
                  )}

                  {/* OC / GD */}
                  {(selectedInvoice.purchaseOrderNumber || selectedInvoice.dispatchGuideNumber) && (
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                      {selectedInvoice.purchaseOrderNumber && (
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase mr-1">O.C.:</span>
                          <span className="font-mono font-bold text-slate-800 bg-slate-50 px-1 border border-slate-200 rounded text-xs">
                            {selectedInvoice.purchaseOrderNumber}
                          </span>
                        </div>
                      )}
                      {selectedInvoice.dispatchGuideNumber && (
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase mr-1">G.D.:</span>
                          <span className="font-mono font-bold text-slate-800 bg-slate-50 px-1 border border-slate-200 rounded text-xs">
                            {selectedInvoice.dispatchGuideNumber}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* BOX DE ITEMS */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden min-h-[200px] flex flex-col">
              <div className="bg-slate-50/50 px-8 py-4 border-b border-slate-100">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                  Detalle de Productos y Servicios
                </h4>
              </div>
              <div className="p-0 flex-1">
                <table className="w-full text-xs">
                  <thead className="border-b border-slate-50 text-slate-500 font-black uppercase tracking-wider">
                    <tr>
                      <th className="px-8 py-4 text-left">Descripción</th>
                      <th className="py-4 text-center w-24">Cant.</th>
                      <th className="py-4 text-right w-36">Precio Unit.</th>
                      <th className="px-8 py-4 text-right w-40">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                    {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                      selectedInvoice.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-8 py-4 pr-4">
                            <p className="font-bold text-slate-900">{item.description}</p>
                          </td>
                          <td className="py-4 text-center font-bold text-slate-600">{item.quantity}</td>
                          <td className="py-4 text-right text-slate-500">{formatCLP(item.unitPrice)}</td>
                          <td className="px-8 py-4 text-right font-black text-slate-900">{formatCLP(item.total)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-8 py-16 text-center text-slate-400 italic">
                          <div className="flex flex-col items-center">
                            <Briefcase size={32} className="mb-2 opacity-20" />
                            Sin detalle de ítems registrados en sistema.
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* FOOTER / TOTALS */}
              <div className="bg-slate-900 text-white p-8 px-10 flex justify-between items-center">
                <div className="flex gap-8">
                  <div className="text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Neto</p>
                    <p className="font-bold text-lg">{formatCLP(selectedInvoice.net)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase text-amber-500">I.V.A (19%)</p>
                    <p className="font-bold text-lg text-amber-400">{formatCLP(selectedInvoice.iva)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Documento</p>
                  <p className="text-4xl font-black">{formatCLP(selectedInvoice.total)}</p>
                </div>
              </div>
            </div>

            {/* SECCIÓN GASTOS ASOCIADOS (Si aplica) */}
            {linkedExpenses.length > 0 && (
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="bg-amber-50/30 px-8 py-4 border-b border-amber-100 flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center">
                    <DollarSign size={14} className="mr-2" />
                    Gastos / Rendiciones Asociadas
                  </h4>
                  <span className="bg-amber-100 text-amber-800 text-[9px] px-2 py-0.5 rounded-full font-black">
                    {linkedExpenses.length} REGISTROS
                  </span>
                </div>
                <table className="w-full text-left text-[10px]">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-8 py-3 text-center w-24">Fecha</th>
                      <th className="px-8 py-3 border-l border-slate-100">Descripción</th>
                      <th className="px-8 py-3 text-right border-l border-slate-100 w-32">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold text-slate-600">
                    {linkedExpenses.map((exp, idx) => (
                      <tr key={idx} className="hover:bg-amber-50/20 transition-colors">
                        <td className="px-8 py-3 text-center whitespace-nowrap">{exp.date.split('T')[0]}</td>
                        <td className="px-8 py-3 border-l border-slate-100">{exp.description}</td>
                        <td className="px-8 py-3 text-right border-l border-slate-100 font-black text-slate-900">{formatCLP(exp.amount)}</td>
                      </tr>
                    ))}
                    <tr className="bg-amber-50 text-amber-900 border-t-2 border-amber-200">
                      <td colSpan={2} className="px-8 py-3 text-right uppercase font-black">Total Gastos Adicionales:</td>
                      <td className="px-8 py-3 text-right font-black border-l border-amber-200">
                        {formatCLP(linkedExpenses.reduce((sum, e) => sum + e.amount, 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* HIDDEN PDF TEMPLATE (Strictly for generation) */}
        <div id="invoice-content" className="fixed top-0 left-[-9999px] w-[210mm] min-h-[297mm] bg-white p-10 text-slate-900 pointer-events-none">
          <div className="border border-slate-900 rounded-none p-8 h-full flex flex-col relative justify-between">
            <div className="relative z-10 flex-1">
              {/* Header PDF */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-8">
                <div>
                  <div className="mb-4">
                    <div className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                      {activeCompany?.name || 'EMPRESA REGISTRADA'}
                    </div>
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Servicios Profesionales</p>
                  <p className="text-[10px] text-slate-400">{activeCompany?.address || 'Dirección no registrada'}</p>
                </div>
                <div className="text-right">
                  <div className="border border-red-600 p-4 inline-block mb-2">
                    <p className="text-red-600 font-bold text-xs uppercase tracking-widest leading-none text-center">R.U.T.: {activeCompany?.rut || 'S/R'}</p>
                    <p className="text-slate-900 font-black text-sm uppercase tracking-tight my-1 text-center">
                      {getInvoiceTypeLabel(selectedInvoice.type)} Electrónica
                    </p>
                    <p className="text-red-600 font-bold text-sm text-center">Nº {selectedInvoice.number}</p>
                  </div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase mt-2">S.I.I. CHILE</p>
                </div>
              </div>

              {/* Grid Info PDF */}
              <div className="grid grid-cols-2 gap-12 mt-8">
                <div className="space-y-4">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-1">Señor(es)</p>
                  <div className="space-y-1">
                    <p className="text-sm font-black text-slate-900">
                      {normalizeInvoiceType(selectedInvoice.type) === 'PURCHASE' ? supplier?.name : client?.razonSocial}
                    </p>
                    <p className="text-xs font-bold text-slate-500">
                      {normalizeInvoiceType(selectedInvoice.type) === 'PURCHASE' ? supplier?.rut : client?.rut}
                    </p>
                  </div>
                </div>
                <div className="space-y-4 text-right">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-1">Emisión y Fechas</p>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-800">FECHA: {selectedInvoice.date}</p>
                    <p className="text-xs font-medium text-slate-500">VCMTO: {selectedInvoice.dueDate || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Items PDF */}
              <div className="mt-12 border border-slate-200">
                <table className="w-full text-left text-[10px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2 font-black uppercase tracking-widest text-slate-500">Descripción</th>
                      <th className="px-4 py-2 text-center w-20 font-black text-slate-500">Cant.</th>
                      <th className="px-4 py-2 text-right w-32 font-black text-slate-500">Unitario</th>
                      <th className="px-4 py-2 text-right w-32 font-black text-slate-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                      selectedInvoice.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 font-bold text-slate-800">{item.description}</td>
                          <td className="px-4 py-3 text-center">{item.quantity}</td>
                          <td className="px-4 py-3 text-right">{formatCLP(item.unitPrice)}</td>
                          <td className="px-4 py-3 text-right font-black">{formatCLP(item.total)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={4} className="p-8 text-center text-slate-300 italic">Sin detalle registrado</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totales PDF */}
              <div className="mt-8 flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-500">
                    <span>Monto Neto</span>
                    <span>{formatCLP(selectedInvoice.net)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-slate-400">
                    <span>I.V.A (19%)</span>
                    <span>{formatCLP(selectedInvoice.iva)}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-black text-slate-900 border-t-2 border-slate-900 pt-2 mt-2">
                    <span className="text-[10px] uppercase tracking-widest">Total Documento</span>
                    <span>{formatCLP(selectedInvoice.total)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-[8px] text-slate-300 font-bold uppercase tracking-[0.4em] text-center pt-8">
              Documento Generado via FinanzSaaS Platform
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="px-10 py-6 bg-white border-t border-slate-100 flex justify-end space-x-4">
          <button
            onClick={() => handleDownloadPDF(selectedInvoice)}
            className="px-8 py-3 bg-white border border-slate-200 text-slate-700 font-black rounded-2xl hover:bg-slate-50 transition-all flex items-center shadow-sm active:scale-95"
          >
            <Download size={18} className="mr-2" />
            Descargar PDF
          </button>
          <button
            onClick={onClose}
            className="px-10 py-3 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all active:scale-95"
          >
            Cerrar Visor
          </button>
        </div>

      </div>
    </div>
  );
};

export default InvoiceDetailModal;
