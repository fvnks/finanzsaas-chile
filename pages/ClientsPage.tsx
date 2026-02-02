
import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Mail,
  Phone,
  Building2,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  X,
  History,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  ShieldAlert,
  FileEdit,
  Eye,
  ShieldCheck,
  Target,
  Briefcase,
  Printer,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Client, Invoice, InvoiceType, CostCenter, Project } from '../types';
import { validateRUT, formatCLP } from '../constants';

interface ClientsPageProps {
  clients: Client[];
  invoices: Invoice[];
  costCenters: CostCenter[];
  projects: Project[];
  onAdd: (client: Client) => void;
  onUpdate: (client: Client) => void;
  onDelete: (id: string) => void;
  onDelete: (id: string) => void;
  currentUser: any; // Using 'any' for now to match prop drilling flexibility, or User type
}

import { checkPermission } from '../src/utils/permissions';
import { User } from '../types';

const ClientsPage: React.FC<ClientsPageProps> = ({ clients, invoices, costCenters, projects, onAdd, onUpdate, onDelete, currentUser }) => {
  const [showModal, setShowModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'ALL' | InvoiceType>('ALL');
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Validation States
  const [emailError, setEmailError] = useState(false);
  const [phoneError, setPhoneError] = useState(false);

  const [formData, setFormData] = useState<Omit<Client, 'id'>>({
    rut: '',
    razonSocial: '',
    nombreComercial: '',
    email: '',
    telefono: '',
    notas: ''
  });

  // Reset pagination when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredClients = useMemo(() => {
    return clients.filter(c =>
      (c.razonSocial || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.rut || '').includes(searchTerm) ||
      (c.nombreComercial || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clients, searchTerm]);

  // Paginated data
  const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);
  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredClients.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredClients, currentPage]);

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        rut: client.rut,
        razonSocial: client.razonSocial,
        nombreComercial: client.nombreComercial,
        email: client.email,
        telefono: client.telefono,
        notas: client.notas || ''
      });
    } else {
      setEditingClient(null);
      setFormData({
        rut: '',
        razonSocial: '',
        nombreComercial: '',
        email: '',
        telefono: '',
        notas: ''
      });
    }
    setEmailError(false);
    setPhoneError(false);
    setShowModal(true);
  };

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let cleaned = e.target.value.replace(/[^0-9kK]/g, '');
    let formatted = cleaned;
    if (cleaned.length > 1) {
      const body = cleaned.slice(0, -1);
      const dv = cleaned.slice(-1).toLowerCase();
      formatted = `${body}-${dv}`;
    }
    setFormData({ ...formData, rut: formatted });
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, email: value });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailError(value.length > 5 && !emailRegex.test(value));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, telefono: value });
    const phoneRegex = /^(\+?56)?\s?9\s?\d{8}$/;
    const cleanedPhone = value.replace(/\s/g, '');
    setPhoneError(cleanedPhone.length >= 9 && !phoneRegex.test(cleanedPhone));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRUT(formData.rut) || emailError || phoneError) return;
    if (editingClient) {
      onUpdate({ ...formData, id: editingClient.id });
    } else {
      onAdd({ ...formData, id: Math.random().toString(36).substr(2, 9) });
    }
    setShowModal(false);
  };

  const handleDeleteConfirm = () => {
    if (clientToDelete) {
      onDelete(clientToDelete.id);
      setClientToDelete(null);
    }
  };

  const rutValid = useMemo(() => validateRUT(formData.rut), [formData.rut]);
  const isRutEmpty = formData.rut.length === 0;

  const isFormInvalid = useMemo(() => {
    return !rutValid ||
      emailError ||
      phoneError ||
      !formData.rut ||
      !formData.razonSocial ||
      !formData.email ||
      !formData.telefono;
  }, [rutValid, emailError, phoneError, formData]);

  const filteredHistoryInvoices = useMemo(() => {
    if (!historyClient) return [];
    return invoices
      .filter(inv => inv.clientId === historyClient.id)
      .filter(inv => historyTypeFilter === 'ALL' || inv.type === historyTypeFilter)
      .filter(inv => inv.number.toLowerCase().includes(historySearchTerm.toLowerCase()))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [historyClient, invoices, historySearchTerm, historyTypeFilter]);

  const historyTotals = useMemo(() => {
    const sales = filteredHistoryInvoices.filter(i => i.type === InvoiceType.VENTA).reduce((acc, curr) => acc + curr.total, 0);
    const purchases = filteredHistoryInvoices.filter(i => i.type === InvoiceType.COMPRA).reduce((acc, curr) => acc + curr.total, 0);
    return { sales, purchases };
  }, [filteredHistoryInvoices]);

  const changePage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Clientes y Proveedores</h2>
          <p className="text-slate-500">Administra tu cartera comercial con trazabilidad histórica.</p>
        </div>
        </div>
        {checkPermission(currentUser as User, 'clients', 'create') && (
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all shadow-md shadow-blue-200"
        >
          <Plus size={20} />
          <span>Nuevo Cliente</span>
        </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por RUT o Nombre..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedClients.map((client) => (
          <div key={client.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/20 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110"></div>

            <div className="flex items-start justify-between mb-4 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl shadow-inner">
                {(client.razonSocial || '?').charAt(0)}
              </div>
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {checkPermission(currentUser as User, 'clients', 'update') && (
                <button onClick={() => handleOpenModal(client)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                )}
                {checkPermission(currentUser as User, 'clients', 'delete') && (
                <button onClick={() => setClientToDelete(client)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                )}
              </div>
            </div>

            <div className="space-y-3 relative z-10">
              <div>
                <h3 className="font-bold text-slate-800 leading-tight truncate">{client.razonSocial || 'Sin Razón Social'}</h3>
                <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">{client.rut || 'S/Rut'}</p>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center text-sm text-slate-600">
                  <Mail size={14} className="mr-2 text-slate-400" />
                  <span className="truncate">{client.email || 'Sin Email'}</span>
                </div>
                <div className="flex items-center text-sm text-slate-600">
                  <Phone size={14} className="mr-2 text-slate-400" />
                  <span>{client.telefono || 'Sin Teléfono'}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center relative z-10">
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-wider">
                <UserCheck size={10} className="mr-1" /> Verificado
              </span>
              <button
                onClick={() => {
                  setHistoryClient(client);
                  setHistorySearchTerm('');
                  setHistoryTypeFilter('ALL');
                }}
                className="text-xs text-blue-600 font-bold hover:underline flex items-center bg-blue-50 px-3 py-1.5 rounded-lg transition-colors hover:bg-blue-100"
              >
                <History size={14} className="mr-1.5" /> Historial
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */ }
  {
    totalPages > 1 && (
      <div className="flex flex-col sm:flex-row items-center justify-between pt-8 pb-4 border-t border-slate-200">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 sm:mb-0">
          Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredClients.length)} de {filteredClients.length} clientes
        </p>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => changePage(currentPage - 1)}
            disabled={currentPage === 1}
            className={`p-2 rounded-xl border transition-all ${currentPage === 1
              ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 active:scale-95'
              }`}
          >
            <ChevronLeft size={20} />
          </button>

          <div className="flex items-center space-x-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => changePage(page)}
                className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${currentPage === page
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => changePage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`p-2 rounded-xl border transition-all ${currentPage === totalPages
              ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 active:scale-95'
              }`}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    )
  }

  {/* Modal Historial Detallado */ }
  {
    historyClient && (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col border border-slate-200">
          <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200">
                <History size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{historyClient.razonSocial || 'Cliente Desconocido'}</h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{historyClient.rut || 'S/R'} — Historial de Documentos</p>
              </div>
            </div>
            <button onClick={() => setHistoryClient(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
              <X size={28} />
            </button>
          </div>

          <div className="p-8 overflow-y-auto flex-1 space-y-6">
            {/* Filtros Internos del Historial */}
            <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Filtrar por número de folio..."
                  className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  value={historySearchTerm}
                  onChange={(e) => setHistorySearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-2 bg-white p-1 rounded-xl border border-slate-200">
                {(['ALL', InvoiceType.VENTA, InvoiceType.COMPRA] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setHistoryTypeFilter(type)}
                    className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${historyTypeFilter === type
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-600'
                      }`}
                  >
                    {type === 'ALL' ? 'Todos' : type + 's'}
                  </button>
                ))}
              </div>
            </div>

            {/* KPIs de Historial */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm flex items-center justify-between group">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Ventas (Filtro)</p>
                  <p className="text-2xl font-black text-green-600">{formatCLP(historyTotals.sales)}</p>
                </div>
                <div className="p-3 bg-green-50 text-green-600 rounded-2xl group-hover:scale-110 transition-transform">
                  <ArrowUpRight size={24} />
                </div>
              </div>
              <div className="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm flex items-center justify-between group">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Compras (Filtro)</p>
                  <p className="text-2xl font-black text-orange-600">{formatCLP(historyTotals.purchases)}</p>
                </div>
                <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl group-hover:scale-110 transition-transform">
                  <ArrowDownRight size={24} />
                </div>
              </div>
            </div>

            {/* Listado de Documentos */}
            <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Flujo</th>
                    <th className="px-6 py-4">Nº Folio</th>
                    <th className="px-6 py-4">Fecha Emisión</th>
                    <th className="px-6 py-4 text-right">Total Bruto</th>
                    <th className="px-6 py-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredHistoryInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-[9px] font-black uppercase ${inv.type === InvoiceType.VENTA ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                          {inv.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-700">{inv.number}</td>
                      <td className="px-6 py-4 text-slate-500 flex items-center">
                        <Calendar size={12} className="mr-2 opacity-40" /> {inv.date}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-slate-900">{formatCLP(inv.total)}</td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => setSelectedInvoice(inv)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredHistoryInvoices.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center text-slate-400 italic font-medium">
                        No se encontraron documentos bajo los criterios de búsqueda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button onClick={() => setHistoryClient(null)} className="px-8 py-2.5 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all active:scale-95 shadow-lg">
              Cerrar Historial
            </button>
          </div>
        </div>
      </div>
    )
  }

  {/* Reutilización del Visor de Detalle (selectedInvoice) */ }
  {
    selectedInvoice && (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-4 z-[60]">
        <div className="bg-white rounded-[2rem] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200">
          <div className="px-8 py-5 bg-slate-900 text-white flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-xl ${selectedInvoice.type === InvoiceType.VENTA ? 'bg-green-500' : 'bg-orange-500'}`}>
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tighter">Folio {selectedInvoice.number}</h3>
                <div className="flex items-center text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                  <ShieldCheck size={10} className="mr-1 text-green-400" /> Auditoría SII Completada
                </div>
              </div>
            </div>
            <button onClick={() => setSelectedInvoice(null)} className="p-2 hover:bg-white/10 rounded-full"><X size={24} /></button>
          </div>

          <div className="p-8 space-y-8">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Entidad</p>
                <p className="font-bold text-slate-900">{historyClient?.razonSocial || 'Desconocido'}</p>
                <p className="text-xs text-blue-600 font-bold">{historyClient?.rut || 'S/R'}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Fecha</p>
                <p className="font-bold text-slate-900">{selectedInvoice.date}</p>
                <p className="text-xs text-slate-500 font-medium">{selectedInvoice.type === InvoiceType.VENTA ? 'Emitida' : 'Recibida'}</p>
              </div>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Target className="text-blue-500" size={18} />
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase">Centro de Costo</p>
                  <p className="text-sm font-bold text-slate-700">{costCenters.find(cc => cc.id === selectedInvoice.costCenterId)?.name || 'General'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-6 border-t border-slate-100">
              <div className="flex justify-between text-sm"><span className="text-slate-500 font-bold uppercase text-[10px]">Neto</span><span className="font-black">{formatCLP(selectedInvoice.net)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500 font-bold uppercase text-[10px]">IVA (19%)</span><span className="font-black">{formatCLP(selectedInvoice.iva)}</span></div>
              <div className="flex justify-between text-2xl font-black pt-3 text-slate-900 border-t border-slate-50">
                <span>Total Bruto</span><span>{formatCLP(selectedInvoice.total)}</span>
              </div>
            </div>
          </div>

          <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3">
            <button className="flex items-center px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100"><Download size={14} className="mr-2" /> Exportar</button>
            <button onClick={() => setSelectedInvoice(null)} className="px-6 py-2 bg-blue-600 text-white text-xs font-black rounded-xl shadow-lg shadow-blue-200">Cerrar Visor</button>
          </div>
        </div>
      </div>
    )
  }

  {/* Modal Creación / Edición */ }
  {
    showModal && (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100">
          <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
              {editingClient ? 'Editar Entidad' : 'Nueva Entidad Comercial'}
            </h3>
            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest">RUT (Sin puntos, con guion)</label>
              <input
                required
                type="text"
                className={`w-full p-3 border rounded-xl outline-none font-bold ${!isRutEmpty && !rutValid ? 'border-red-500 bg-red-50' : 'border-slate-200 focus:ring-2 focus:ring-blue-500'}`}
                value={formData.rut}
                onChange={handleRutChange}
                placeholder="12345678-9"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Razón Social</label>
              <input required type="text" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={formData.razonSocial} onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Email</label>
                <input required type="email" className={`w-full p-3 border rounded-xl outline-none font-bold ${emailError ? 'border-red-300' : 'border-slate-200'}`} value={formData.email} onChange={handleEmailChange} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Teléfono</label>
                <input required type="text" className={`w-full p-3 border rounded-xl outline-none font-bold ${phoneError ? 'border-red-300' : 'border-slate-200'}`} value={formData.telefono} onChange={handlePhoneChange} />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100">
              <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-colors">Cancelar</button>
              <button type="submit" disabled={isFormInvalid} className={`px-10 py-2.5 rounded-2xl font-black text-white shadow-lg ${isFormInvalid ? 'bg-slate-300 cursor-not-allowed opacity-60' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 active:scale-95 transition-all'}`}>
                {editingClient ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  {/* Confirmación Eliminación */ }
  {
    clientToDelete && (
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-lg flex items-center justify-center p-4 z-[100]">
        <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
          <div className="p-10 text-center">
            <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse ring-8 ring-red-50/50">
              <ShieldAlert size={48} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-4">¿Confirmar Eliminación?</h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-8">Esta acción borrará a <span className="font-bold text-slate-800">"{clientToDelete.razonSocial}"</span> y podría afectar la integridad de los reportes históricos.</p>
            <div className="flex flex-col space-y-3">
              <button onClick={handleDeleteConfirm} className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95">Eliminar Permanentemente</button>
              <button onClick={() => setClientToDelete(null)} className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all">Cancelar</button>
            </div>
          </div>
        </div>
      </div>
    )
  }
    </div >
  );
};

export default ClientsPage;
