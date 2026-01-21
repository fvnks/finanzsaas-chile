
import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Target,
  DollarSign,
  X,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  FileText,
  PieChart,
  ChevronRight,
  History,
  ShieldCheck,
  Calculator,
  Briefcase,
  Check
} from 'lucide-react';
import { CostCenter, Invoice, InvoiceType, Client, Project } from '../types';
import { formatCLP } from '../constants';

interface CostCentersPageProps {
  costCenters: CostCenter[];
  invoices: Invoice[];
  projects: Project[];
  clients: Client[];
  onAdd: (cc: CostCenter) => void;
  onUpdate: (cc: CostCenter) => void;
  onDelete: (id: string) => void;
}

const CostCentersPage: React.FC<CostCentersPageProps> = ({ costCenters, invoices, projects, clients, onAdd, onUpdate, onDelete }) => {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingCC, setViewingCC] = useState<CostCenter | null>(null);
  const [editingCC, setEditingCC] = useState<CostCenter | null>(null);
  const [ccToDelete, setCcToDelete] = useState<CostCenter | null>(null);

  const [formData, setFormData] = useState<Omit<CostCenter, 'id'>>({
    code: '',
    name: '',
    budget: 0,
    projectIds: []
  });

  const filteredCCs = costCenters.filter(cc =>
    cc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = useMemo(() => {
    const totalPurchasesGlobal = invoices
      .filter(inv => inv.type === InvoiceType.COMPRA)
      .reduce((sum, inv) => sum + inv.total, 0);

    return { totalPurchasesGlobal };
  }, [invoices]);

  const getCCDetails = (cc: CostCenter) => {
    const associatedInvoices = invoices.filter(inv => inv.costCenterId === cc.id);
    const purchases = associatedInvoices
      .filter(inv => inv.type === InvoiceType.COMPRA)
      .reduce((sum, inv) => sum + inv.total, 0);
    const sales = associatedInvoices
      .filter(inv => inv.type === InvoiceType.VENTA)
      .reduce((sum, inv) => sum + inv.total, 0);

    const budget = cc.budget || 0;
    const execution = budget > 0 ? (purchases / budget) * 100 : 0;
    const share = stats.totalPurchasesGlobal > 0 ? (purchases / stats.totalPurchasesGlobal) * 100 : 0;

    const linkedProjects = projects.filter(p => (cc.projectIds || []).includes(p.id));

    return { associatedInvoices, purchases, sales, execution, share, linkedProjects };
  };

  const handleOpenModal = (cc?: CostCenter) => {
    if (cc) {
      setEditingCC(cc);
      setFormData({
        code: cc.code,
        name: cc.name,
        budget: cc.budget || 0,
        projectIds: cc.projectIds || []
      });
    } else {
      setEditingCC(null);
      setFormData({
        code: '',
        name: '',
        budget: 0,
        projectIds: []
      });
    }
    setShowModal(true);
  };

  const toggleProject = (projectId: string) => {
    setFormData(prev => ({
      ...prev,
      projectIds: prev.projectIds.includes(projectId)
        ? prev.projectIds.filter(id => id !== projectId)
        : [...prev.projectIds, projectId]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) return;

    if (editingCC) {
      onUpdate({ ...formData, id: editingCC.id });
    } else {
      onAdd({ ...formData, id: Math.random().toString(36).substr(2, 9) });
    }
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Centros de Costo</h2>
          <p className="text-slate-500 font-medium">Segmentación financiera vinculada a unidades operativas y proyectos.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-2xl flex items-center space-x-2 transition-all shadow-xl active:scale-95"
        >
          <Plus size={20} />
          <span className="font-bold">Nuevo Centro</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar unidad operativa..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCCs.map((cc) => {
          const details = getCCDetails(cc);
          return (
            <div key={cc.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 group relative overflow-hidden hover:shadow-lg transition-all border-b-4 border-b-transparent hover:border-b-blue-600">
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Target size={24} />
                </div>
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleOpenModal(cc)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl"><Edit2 size={16} /></button>
                  <button onClick={() => setCcToDelete(cc)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl"><Trash2 size={16} /></button>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight leading-tight">{cc.name}</h3>
                  <div className="flex items-center mt-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    PROYECTOS: {details.linkedProjects.length}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Presupuesto</p>
                      <p className="text-lg font-black text-slate-900">{formatCLP(cc.budget || 0)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gasto Real</p>
                      <p className="text-lg font-black text-orange-600">{formatCLP(details.purchases)}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase">
                      <span className="text-slate-500">Ejecución Presupuestaria</span>
                      <span className={details.execution > 90 ? 'text-red-600' : 'text-blue-600'}>
                        {details.execution.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-700 ${details.execution > 90 ? 'bg-red-500' : 'bg-blue-600'}`}
                        style={{ width: `${Math.min(details.execution, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                  <div className="flex items-center space-x-1 text-[10px] font-black text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded-lg">
                    <PieChart size={12} className="text-slate-300" />
                    <span>Share: {details.share.toFixed(1)}%</span>
                  </div>
                  <button
                    onClick={() => setViewingCC(cc)}
                    className="text-xs font-black text-blue-600 flex items-center hover:translate-x-1 transition-transform"
                  >
                    Auditar Gastos <ArrowUpRight size={16} className="ml-1" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visor Detallado de Auditoría */}
      {viewingCC && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col border border-slate-200">
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center space-x-5">
                <div className="p-4 bg-slate-900 text-white rounded-[1.5rem] shadow-xl">
                  <History size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{viewingCC.name}</h3>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] flex items-center">
                    <ShieldCheck size={14} className="mr-2 text-green-500" /> Auditoría Fiscal en Tiempo Real
                  </p>
                </div>
              </div>
              <button onClick={() => setViewingCC(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-all">
                <X size={32} />
              </button>
            </div>

            <div className="p-10 overflow-y-auto flex-1 space-y-10">
              {(() => {
                const details = getCCDetails(viewingCC);
                return (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      {[
                        { label: 'Presupuesto', val: formatCLP(viewingCC.budget || 0), icon: Target, color: 'text-slate-900' },
                        { label: 'Gasto Consolidado', val: formatCLP(details.purchases), icon: TrendingUp, color: 'text-orange-600' },
                        { label: 'Ventas Vinculadas', val: formatCLP(details.sales), icon: ArrowUpRight, color: 'text-green-600' },
                        { label: 'Margen Neto', val: formatCLP(details.sales - details.purchases), icon: Calculator, color: 'text-blue-600' },
                      ].map((item, i) => (
                        <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all">
                          <item.icon className="text-slate-200 mb-4 group-hover:text-blue-100 transition-colors" size={24} />
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                            <p className={`text-xl font-black ${item.color}`}>{item.val}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Proyectos Vinculados */}
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                        <div className="flex items-center space-x-2">
                          <Briefcase className="text-blue-500" size={18} />
                          <h4 className="text-sm font-black text-slate-800 uppercase">Proyectos Asociados</h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {details.linkedProjects.map(p => (
                            <span key={p.id} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-[10px] font-black rounded-xl border border-blue-100">
                              {p.name}
                            </span>
                          ))}
                          {details.linkedProjects.length === 0 && (
                            <p className="text-xs text-slate-400 italic">Sin proyectos vinculados.</p>
                          )}
                        </div>
                      </div>

                      <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center">
                            <FileText size={18} className="mr-2 text-blue-600" /> Documentación Digitalizada
                          </h4>
                          <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                            {details.associatedInvoices.length} Transacciones
                          </span>
                        </div>

                        <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <tr>
                                <th className="px-8 py-5">Nº Folio</th>
                                <th className="px-8 py-5">Entidad Comercial</th>
                                <th className="px-8 py-5">Fecha</th>
                                <th className="px-8 py-5 text-right">Monto Bruto</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {details.associatedInvoices.map(inv => (
                                <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                                  <td className="px-8 py-5">
                                    <div className="flex flex-col">
                                      <span className="font-black text-slate-800">{inv.number}</span>
                                      <span className={`text-[9px] font-black uppercase ${inv.type === InvoiceType.VENTA ? 'text-green-500' : 'text-orange-500'}`}>
                                        {inv.type}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-8 py-5 font-bold text-slate-600">
                                    {clients.find(c => c.id === inv.clientId)?.razonSocial}
                                  </td>
                                  <td className="px-8 py-5 text-slate-400 font-medium">{inv.date}</td>
                                  <td className={`px-8 py-5 text-right font-black ${inv.type === InvoiceType.VENTA ? 'text-green-600' : 'text-slate-900'}`}>
                                    {formatCLP(inv.total)}
                                  </td>
                                </tr>
                              ))}
                              {details.associatedInvoices.length === 0 && (
                                <tr>
                                  <td colSpan={4} className="px-8 py-20 text-center text-slate-400 italic">
                                    No hay documentos tributarios asociados a este centro.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewingCC(null)}
                className="px-10 py-3 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all shadow-xl active:scale-95"
              >
                Cerrar Auditoría
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Creación / Edición */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-100">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                {editingCC ? 'Configurar Centro' : 'Nuevo Centro de Gasto'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={28} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Código Interno</label>
                  <input
                    required
                    type="text"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-black text-slate-800 uppercase"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="Ej: BRJ-01"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Identificador / Nombre</label>
                  <input
                    required
                    type="text"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-bold text-slate-800"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Operaciones Logísticas"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Presupuesto Asignado (CLP)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      required
                      type="number"
                      min="0"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-black text-slate-900"
                      value={formData.budget || ''}
                      onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black text-slate-700 uppercase flex items-center">
                  Vincular a Proyectos <span className="text-slate-400 font-normal ml-2">(Múltiples permitidos)</span>
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar p-1">
                  {projects.map(prj => {
                    const isSelected = formData.projectIds.includes(prj.id);
                    return (
                      <button
                        key={prj.id}
                        type="button"
                        onClick={() => toggleProject(prj.id)}
                        className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${isSelected
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                          }`}
                      >
                        <span className="truncate">{prj.name}</span>
                        {isSelected ? <Check size={14} className="ml-2 flex-shrink-0" /> : <Plus size={14} className="ml-2 opacity-20" />}
                      </button>
                    );
                  })}
                  {projects.length === 0 && (
                    <p className="col-span-2 text-xs text-slate-400 italic py-4 text-center">No hay proyectos creados aún.</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!formData.name}
                  className={`px-10 py-3 rounded-2xl font-black text-white shadow-xl transition-all active:scale-95 ${!formData.name ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-200'
                    }`}
                >
                  {editingCC ? 'Actualizar' : 'Crear Centro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmación Eliminación */}
      {ccToDelete && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-lg flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-10 text-center">
              <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse ring-8 ring-red-50/50">
                <AlertTriangle size={48} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-4">¿Confirmar Baja?</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-8">
                Eliminar el centro <span className="font-bold text-slate-800">"{ccToDelete.name}"</span> desvinculará todos los documentos históricos y su relación con proyectos.
              </p>
              <div className="flex flex-col space-y-3">
                <button
                  onClick={() => { onDelete(ccToDelete.id); setCcToDelete(null); }}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95"
                >
                  Confirmar Eliminación
                </button>
                <button onClick={() => setCcToDelete(null)} className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all">
                  Mantener Centro
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostCentersPage;
