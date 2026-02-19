
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
  Pencil,
  CornerDownRight, // Added CornerDownRight
  // Added missing Calculator icon
  Calculator,
  CheckCircle, // Added CheckCircle
  Clock, // Added Clock for overdue icon
  ArrowUpDown, // Added for sorting
  ArrowUp,
  ArrowDown,
  Truck, // Added for Dispatch Guides
  RefreshCw // Added for Refacturación
} from 'lucide-react';
import { Invoice, InvoiceType, Client, CostCenter, Project, InvoiceItem, Supplier } from '../types';
import { formatCLP, IVA_RATE } from '../constants';
import SupplierFormModal from '../components/SupplierFormModal';

interface InvoicesPageProps {
  invoices: Invoice[];
  clients: Client[];
  suppliers?: Supplier[]; // Added suppliers prop
  costCenters: CostCenter[];
  projects: Project[];
  onAdd: (invoice: Invoice) => void;
  onUpdate: (invoice: Invoice) => void;
  onDelete: (id: string) => void;
  onAddSupplier?: (supplier: Omit<Supplier, 'id' | 'companyId'>) => Promise<any>; // Added callback
  currentUser: any;
}

import { checkPermission } from '../src/utils/permissions';
import { User } from '../types';
import { useCompany } from '../components/CompanyContext';

const InvoicesPage: React.FC<InvoicesPageProps> = ({ invoices, clients, suppliers = [], costCenters, projects, onAdd, onUpdate, onDelete, onAddSupplier, currentUser }) => {
  const { activeCompany } = useCompany();
  const [showModal, setShowModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false); // State for supplier modal
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Warning Modal State
  const [showAssignmentWarning, setShowAssignmentWarning] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<boolean>(false);

  // Grouping State
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());

  const toggleInvoice = (id: string) => {
    const newSet = new Set(expandedInvoices);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedInvoices(newSet);
  };

  // Basic Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | InvoiceType>('ALL');

  // Status Dropdown State
  const [openStatusId, setOpenStatusId] = useState<string | null>(null);

  // Advanced Filter State
  const [advancedFilters, setAdvancedFilters] = useState({
    dateStart: '',
    dateEnd: '',
    minAmount: '',
    maxAmount: '',
    clientId: ''
  });

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  }>(() => {
    // Initialize from localStorage if available
    try {
      const saved = localStorage.getItem('invoiceSortConfig');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse sort config', e);
    }
    return { key: 'date', direction: 'desc' };
  });

  // Persist sort config
  React.useEffect(() => {
    try {
      localStorage.setItem('invoiceSortConfig', JSON.stringify(sortConfig));
    } catch (e) {
      console.error('Failed to save sort config', e);
    }
  }, [sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleExportExcel = () => {
    import('xlsx').then(XLSX => {
      const data = groupedInvoices.flatMap(group => {
        const parent = group.invoice;
        const children = group.children;

        const formatRow = (inv: Invoice) => ({
          'Folio': inv.number,
          'Tipo': inv.type,
          'Fecha': new Date(inv.date).toLocaleDateString('es-CL'),
          'Razón Social': clients.find(c => c.id === inv.clientId)?.razonSocial || 'N/A',
          'RUT': clients.find(c => c.id === inv.clientId)?.rut || 'N/A',
          'Proyecto': projects.find(p => p.id === inv.projectId)?.name || '-',
          'Centro Costo': costCenters.find(cc => cc.id === inv.costCenterId)?.name || '-',
          'Neto': inv.net,
          'IVA': inv.iva,
          'Total': inv.total,
          'Estado Pago': inv.paymentStatus || (inv.isPaid ? 'PAID' : 'PENDING'),
          'Estado Doc': inv.status === 'CANCELLED' ? 'NULA' : 'VIGENTE'
        });

        return [formatRow(parent), ...children.map(formatRow)];
      });

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Facturas");
      XLSX.writeFile(wb, `Reporte_Facturas_${new Date().toISOString().split('T')[0]}.xlsx`);
    });
  };

  const getSortIcon = (columnKey: string) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} className="ml-1 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />;
    return sortConfig.direction === 'asc'
      ? <ArrowUp size={14} className="ml-1 text-blue-600" />
      : <ArrowDown size={14} className="ml-1 text-blue-600" />;
  };

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

      // Client Filter
      const matchesClient = !advancedFilters.clientId || inv.clientId === advancedFilters.clientId;

      return matchesType && matchesSearch && matchesDateStart && matchesDateEnd && matchesMinAmount && matchesMaxAmount && matchesClient;
    });
  }, [invoices, searchTerm, filterType, advancedFilters, clients]);

  // Grouping & Sorting Logic (Threaded History View)
  const groupedInvoices = useMemo(() => {
    // 1. Map all invoices for lookup
    const idToInv = new Map<string, Invoice>();
    invoices.forEach(inv => idToInv.set(inv.id, inv));

    // 2. Build adjacency for relationships (Bi-directional for clusters)
    const adj = new Map<string, Set<string>>();
    invoices.forEach(inv => {
      if (inv.relatedInvoiceId && idToInv.has(inv.relatedInvoiceId)) {
        if (!adj.has(inv.id)) adj.set(inv.id, new Set());
        adj.get(inv.id)!.add(inv.relatedInvoiceId);

        if (!adj.has(inv.relatedInvoiceId)) adj.set(inv.relatedInvoiceId, new Set());
        adj.get(inv.relatedInvoiceId)!.add(inv.id);
      }
    });

    // 3. Find cluster Helper (BFS)
    const getCluster = (startId: string): Invoice[] => {
      const clusterIds = new Set<string>();
      const queue = [startId];
      clusterIds.add(startId);

      while (queue.length > 0) {
        const current = queue.shift()!;
        const neighbors = adj.get(current);
        if (neighbors) {
          neighbors.forEach(neighborId => {
            if (!clusterIds.has(neighborId)) {
              clusterIds.add(neighborId);
              queue.push(neighborId);
            }
          });
        }
      }

      return Array.from(clusterIds)
        .map(id => idToInv.get(id)!)
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          const aNum = parseInt(a.number.replace(/\D/g, ''), 10) || 0;
          const bNum = parseInt(b.number.replace(/\D/g, ''), 10) || 0;
          return aNum - bNum;
        }); // Chronological order (date + folio tie-breaker)
    };

    // 4. Identify the "Roots" to display in the main list
    const rootIds = new Set<string>();
    const matches = new Set<string>(filteredInvoices.map(inv => inv.id));

    filteredInvoices.forEach(inv => {
      const cluster = getCluster(inv.id);
      const master = cluster[0]; // Earliest is Master

      if (inv.type === InvoiceType.NOTA_CREDITO) {
        // If an NC matches, redirect to the earliest document in its chain
        if (master.id !== inv.id) {
          rootIds.add(master.id);
        } else if (matches.has(inv.id)) {
          // Orphaned NC matching search
          rootIds.add(inv.id);
        }
      } else {
        // Sales/Purchases match themselves, but if they are part of a chain, 
        // they should also ensure the Master is visible? 
        // User dijo: "la factura asociada debe mostrarse en el listado mas que nada para saber que se volvio hacer"
        // So we keep the flat entry for the search match.
        rootIds.add(inv.id);
      }
    });

    // 5. Map identified roots to their clusters
    const roots = Array.from(rootIds)
      .map(id => idToInv.get(id)!)
      .filter(inv => {
        // Filter out NCs from top level unless orphaned and matched
        if (inv.type === InvoiceType.NOTA_CREDITO) {
          return !inv.relatedInvoiceId && matches.has(inv.id);
        }
        return true;
      })
      .map(inv => {
        const cluster = getCluster(inv.id);
        const isMaster = cluster[0].id === inv.id;

        return {
          invoice: inv,
          // Show history IF it's the "Master Root" (Oldest) OR if it is "Nula" (CANCELLED)
          // The history is the rest of the cluster (excluding self)
          children: (isMaster || inv.status === 'CANCELLED')
            ? cluster.filter(c => c.id !== inv.id)
            : []
        };
      });

    // 5. Sort results
    roots.sort((a, b) => {
      const { key, direction } = sortConfig;
      const modifier = direction === 'asc' ? 1 : -1;

      switch (key) {
        case 'number':
          const numA = parseInt(a.invoice.number.replace(/\D/g, ''), 10) || 0;
          const numB = parseInt(b.invoice.number.replace(/\D/g, ''), 10) || 0;
          return (numA - numB) * modifier;

        case 'date':
          return a.invoice.date.localeCompare(b.invoice.date) * modifier;

        case 'client':
          const clientNameA = clients.find(c => c.id === a.invoice.clientId)?.razonSocial || '';
          const clientNameB = clients.find(c => c.id === b.invoice.clientId)?.razonSocial || '';
          return clientNameA.localeCompare(clientNameB) * modifier;

        case 'total':
          return (a.invoice.total - b.invoice.total) * modifier;

        case 'status':
          if (a.invoice.isPaid === b.invoice.isPaid) return 0;
          return (a.invoice.isPaid ? 1 : -1) * modifier;

        case 'type':
          return a.invoice.type.localeCompare(b.invoice.type) * modifier;

        default:
          return 0;
      }
    });

    return roots;
  }, [invoices, filteredInvoices, sortConfig, clients]);

  const stats = useMemo(() => {
    // Exclude cancelled invoices from totals
    const activeInvoices = filteredInvoices.filter(inv => inv.status !== 'CANCELLED');

    const net = activeInvoices.reduce((sum, inv) => sum + inv.net, 0);
    const iva = activeInvoices.reduce((sum, inv) => sum + inv.iva, 0);
    const total = activeInvoices.reduce((sum, inv) => sum + inv.total, 0);
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
    hesNumber: '',
    relatedInvoiceId: '', // Added for Credit Notes
    status: 'ISSUED', // Added to persist status
    isPaid: false,
    paymentStatus: 'PENDING' as 'PENDING' | 'PAID' | 'FACTORING' | 'COLLECTION',
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
      maxAmount: '',
      clientId: ''
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



  const processSubmit = () => {
    // Frontend Validation for Duplicates (Pre-check)
    // We check against loaded invoices. This is not perfect (doesn't check server if pagination existed),
    // but good for immediate feedback in this context.
    // Logic: 
    // - If it's a new invoice (!editingId)
    // - Check if there is an existing invoice with same Number + Type
    // - If Type is COMPRA, also match ClientId.
    // - If editing, exclude self.

    if (!isEditing) {
      const isDuplicate = invoices.some(inv => {
        if (inv.status === 'CANCELLED') return false; // Ignore cancelled? Or strict? strict for now.

        const sameNumber = inv.number === formData.number;
        const sameType = inv.type === formData.type;

        if (formData.type === InvoiceType.COMPRA) {
          return sameNumber && sameType && inv.clientId === formData.clientId;
        }

        // For Sales/Notes, check global uniqueness (or per company if multi-tenant, but here global)
        return sameNumber && sameType;
      });

      if (isDuplicate) {
        // We need a way to show error. For now, alert() or a toast would be best. 
        // Since we don't have a toast system visible here, I'll use alert for immediate feedback
        // or set a form error state if I had one.
        // Let's use a standard alert for now as a blocking warning.
        const typeName = formData.type === InvoiceType.COMPRA ? 'Compra' : 'Documento';
        alert(`Ya existe un documento ${typeName} con el folio ${formData.number}. Por favor verifique.`);
        setPendingSubmit(false); // Reset pending state
        return;
      }
    }

    const net = Number(formData.net);
    const iva = Math.round(net * IVA_RATE);
    const total = net + iva;

    // Construct the invoice object
    // Construct the invoice object
    const invoiceData: any = {
      ...formData,
      net,
      iva,
      total,
      pdfUrl: '#',
      status: formData.status, // Pass current status
      // Ensure annulInvoice is sent, default to true if it's a Credit Note and undefined
      annulInvoice: formData.type === InvoiceType.NOTA_CREDITO ? (formData.annulInvoice !== false) : undefined
    };

    if (isEditing && editingId) {
      onUpdate({ ...invoiceData, id: editingId });
    } else {
      // @ts-ignore
      onAdd({ ...invoiceData, id: Math.random().toString(36).substr(2, 9) }); // ID will be replaced by backend
    }

    setShowModal(false);
    setShowAssignmentWarning(false);
    setPendingSubmit(false);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId) return;

    // Check for missing assignments
    if (!formData.costCenterId && !formData.projectId) {
      setPendingSubmit(true);
      setShowAssignmentWarning(true);
      return;
    }

    processSubmit();
  };

  // Helper to get next available number
  const getNextCorrelative = (type: InvoiceType): string => {
    // Filter invoices by the selected type
    const relevantInvoices = invoices.filter(inv => inv.type === type);

    // Extract numbers (assuming numeric or prefix-numeric format like "123" or "NC-123")
    // We will try to extract the numeric part at the end
    const numbers = relevantInvoices.map(inv => {
      const match = inv.number.match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    });

    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNumber = maxNumber + 1;

    // Optional: Add prefix based on type if customary, though user asked for "correlative".
    // Keeping it simple number for now as per "folios" usually being numeric in Chile, 
    // or customizable prefixes. Let's just return the number string.
    // However, user prompt implied existing "NC-..." format in placeholders.
    // Let's stick to just the number for "VENTA" and "COMPRA", but maybe prefixes for Notes if preferred?
    // User request: "correlativo... igual deja la posibilidad de editar".
    // I'll return just the number to be safe, or maybe "NC-{number}" if they are using prefixes.
    // Looking at existing placeholders: placeholder={formData.type === InvoiceType.NOTA_CREDITO ? "NC-..." : ...}
    // I will try to respect the format of the max found number.

    // Actually, looking at placeholders again. Let's provide a smart default.
    return nextNumber.toString();
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    const initialType = InvoiceType.VENTA;
    setFormData({
      type: initialType,
      number: getNextCorrelative(initialType),
      date: new Date().toISOString().split('T')[0],
      net: 0,
      clientId: '',
      costCenterId: '',
      projectId: '',
      purchaseOrderNumber: '',
      dispatchGuideNumber: '',
      hesNumber: '',
      relatedInvoiceId: '',
      status: 'ISSUED',
      isPaid: false,
      paymentStatus: 'PENDING',
      items: []
    });
  };

  const handleEditClick = (inv: Invoice) => {
    setIsEditing(true);
    setEditingId(inv.id);
    setFormData({
      type: inv.type,
      number: inv.number,
      date: inv.date.split('T')[0],
      net: inv.net,
      clientId: inv.clientId,
      costCenterId: inv.costCenterId || '',
      projectId: inv.projectId || '',
      purchaseOrderNumber: inv.purchaseOrderNumber || '',
      dispatchGuideNumber: inv.dispatchGuideNumber || '',
      hesNumber: inv.hesNumber || '',
      relatedInvoiceId: inv.relatedInvoiceId || '',
      status: inv.status || 'ISSUED',
      isPaid: inv.isPaid || false,
      paymentStatus: inv.paymentStatus || (inv.isPaid ? 'PAID' : 'PENDING'),
      items: inv.items ? inv.items.map(i => ({ ...i })) : []
    });
    setShowModal(true);
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
        {checkPermission(currentUser as User, 'invoices', 'create') && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all shadow-md shadow-blue-200 active:scale-95"
          >
            <Plus size={20} />
            <span>Emitir Documento</span>
          </button>
        )}
      </div>

      {/* Control de Filtros */}
      < div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden" >
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
              <option value={InvoiceType.GUIA_DESPACHO}>Guías de Despacho</option>
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

            <button
              onClick={handleExportExcel}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-all font-bold text-sm"
              title="Exportar a Excel"
            >
              <Download size={18} />
              <span className="hidden sm:inline">Excel</span>
            </button>
          </div>
        </div>

        {/* Panel Avanzado Colapsable */}
        {
          showAdvanced && (
            <div className="px-6 pb-6 pt-2 border-t border-slate-100 bg-slate-50/30 animate-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select
                      className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 appearance-none"
                      value={advancedFilters.clientId}
                      onChange={(e) => setAdvancedFilters({ ...advancedFilters, clientId: e.target.value })}
                    >
                      <option value="">Todos los Clientes</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>
                          {client.razonSocial}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
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
          )
        }
      </div >

      {/* Resumen de Resultados Filtrados */}
      < div className="grid grid-cols-1 md:grid-cols-3 gap-4" >
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
      </div >

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
              <tr>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 hover:text-blue-600 transition-colors group" onClick={() => handleSort('type')}>
                  <div className="flex items-center">
                    Tipo
                    {getSortIcon('type')}
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 hover:text-blue-600 transition-colors group" onClick={() => handleSort('number')}>
                  <div className="flex items-center">
                    Folio
                    {getSortIcon('number')}
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 hover:text-blue-600 transition-colors group" onClick={() => handleSort('date')}>
                  <div className="flex items-center">
                    Fecha
                    {getSortIcon('date')}
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 hover:text-blue-600 transition-colors group" onClick={() => handleSort('client')}>
                  <div className="flex items-center">
                    Entidad Comercial
                    {getSortIcon('client')}
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  Asignación
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 hover:text-blue-600 transition-colors group" onClick={() => handleSort('total')}>
                  <div className="flex items-center">
                    Total
                    {getSortIcon('total')}
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 hover:text-blue-600 transition-colors group" onClick={() => handleSort('status')}>
                  <div className="flex items-center">
                    Estado Pago
                    {getSortIcon('status')}
                  </div>
                </th>
                <th className="px-6 py-4 text-center">Antigüedad</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groupedInvoices.map(({ invoice: inv, children }, index) => (
                <React.Fragment key={inv.id}>
                  <tr className={`hover:bg-slate-50/50 transition-colors group ${inv.status === 'CANCELLED' ? 'opacity-60 bg-red-50/30' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {children.length > 0 && (
                          <button
                            onClick={() => toggleInvoice(inv.id)}
                            className="p-1 rounded hover:bg-slate-200 text-slate-400 text-xs transition-colors"
                          >
                            {expandedInvoices.has(inv.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        )}
                        <div className="flex flex-col items-start gap-1">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter 
                              ${inv.type === InvoiceType.VENTA ? 'bg-green-100 text-green-700' :
                              inv.type === InvoiceType.COMPRA ? 'bg-orange-100 text-orange-700' :
                                inv.type === InvoiceType.GUIA_DESPACHO ? 'bg-indigo-100 text-indigo-700' :
                                  inv.type === InvoiceType.NOTA_DEBITO ? 'bg-blue-100 text-blue-700' :
                                    'bg-purple-100 text-purple-700' // Credit Note Style
                            }`}>
                            {inv.type === InvoiceType.GUIA_DESPACHO ? (
                              <div className="flex items-center gap-1">
                                <Truck size={10} />
                                <span>GUIA DESPACHO</span>
                              </div>
                            ) : (
                              inv.type.replace('_', ' ')
                            )}
                          </span>
                          {children.length > 0 && (
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight ml-1">
                              + {children.length} Docs
                            </span>
                          )}
                        </div>
                      </div>
                      {inv.status === 'CANCELLED' && (
                        <span className="mt-1 block w-fit px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter bg-red-100 text-red-700">
                          ANULADA
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800">
                      <span className={inv.status === 'CANCELLED' ? 'line-through text-slate-400' : ''}>{inv.number}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs font-medium">
                      {/* Format Date: DD/MM/YYYY */}
                      {new Date(inv.date).toLocaleDateString('es-CL', { timeZone: 'UTC' })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-slate-700 font-bold text-sm truncate max-w-[200px]">
                          {inv.type === InvoiceType.COMPRA
                            ? (suppliers.find(s => s.id === inv.clientId)?.razonSocial || 'Desconocido')
                            : (clients.find(c => c.id === inv.clientId)?.razonSocial || 'Desconocido')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {inv.type === InvoiceType.COMPRA
                            ? (suppliers.find(s => s.id === inv.clientId)?.rut)
                            : (clients.find(c => c.id === inv.clientId)?.rut)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        {inv.projectId && (
                          <div className="flex items-center text-xs" title="Proyecto asociado">
                            <Briefcase size={12} className="mr-1.5 text-blue-500 flex-shrink-0" />
                            <span className="font-semibold text-slate-700 truncate max-w-[140px]">
                              {projects.find(p => p.id === inv.projectId)?.name}
                            </span>
                          </div>
                        )}
                        {inv.costCenterId && (
                          <div className="flex items-center text-xs" title="Centro de Costo">
                            <Building2 size={12} className="mr-1.5 text-indigo-500 flex-shrink-0" />
                            <span className="font-medium text-slate-600 truncate max-w-[140px]">
                              {costCenters.find(cc => cc.id === inv.costCenterId)?.name}
                            </span>
                          </div>
                        )}
                        {/* References Group */}
                        {(inv.purchaseOrderNumber || inv.dispatchGuideNumber) && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {inv.purchaseOrderNumber && (
                              <span className="text-[9px] bg-slate-50 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded flex items-center" title="Orden de Compra">
                                <span className="font-bold mr-1">OC:</span> {inv.purchaseOrderNumber}
                              </span>
                            )}
                            {inv.dispatchGuideNumber && (
                              <span className="text-[9px] bg-slate-50 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded flex items-center" title="Guía de Despacho">
                                <span className="font-bold mr-1">GD:</span> {inv.dispatchGuideNumber}
                              </span>
                            )}
                          </div>
                        )}

                        {!inv.projectId && !inv.costCenterId && !inv.purchaseOrderNumber && !inv.dispatchGuideNumber && (
                          <span className="text-[10px] text-slate-300 italic pl-1">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-black text-slate-900">{formatCLP(inv.total)}</td>

                    <td className="px-6 py-4">
                      {/* Payment Status Dropdown */}
                      {inv.status === 'CANCELLED' ? (
                        <div className="flex items-center px-2.5 py-1 rounded-full w-fit border bg-slate-100 text-slate-500 border-slate-200">
                          <AlertTriangle size={14} className="mr-1.5" />
                          <span className="text-[10px] font-black uppercase tracking-wide">
                            NULA
                          </span>
                        </div>
                      ) : (
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenStatusId(openStatusId === inv.id ? null : inv.id);
                            }}
                            className={`flex items-center px-2.5 py-1 rounded-full w-fit transition-all border ${(inv.paymentStatus === 'PAID' || (!inv.paymentStatus && inv.isPaid)) ? 'bg-green-50 text-green-700 border-green-200' :
                              inv.paymentStatus === 'FACTORING' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                inv.paymentStatus === 'COLLECTION' ? 'bg-red-50 text-red-700 border-red-200' :
                                  'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                          >
                            {(inv.paymentStatus === 'PAID' || (!inv.paymentStatus && inv.isPaid)) ? <CheckCircle size={14} className="mr-1.5" /> :
                              inv.paymentStatus === 'FACTORING' ? <Building2 size={14} className="mr-1.5" /> :
                                inv.paymentStatus === 'COLLECTION' ? <AlertTriangle size={14} className="mr-1.5" /> :
                                  <Clock size={14} className="mr-1.5" />}

                            <span className="text-[10px] font-black uppercase tracking-wide">
                              {(inv.paymentStatus === 'PAID' || (!inv.paymentStatus && inv.isPaid)) ? 'PAGADA' :
                                inv.paymentStatus === 'FACTORING' ? 'FACTORING' :
                                  inv.paymentStatus === 'COLLECTION' ? 'COBRANZA' :
                                    'PENDIENTE'}
                            </span>
                            <ChevronDown size={12} className="ml-1 opacity-50" />
                          </button>

                          {/* Backdrop to close */}
                          {openStatusId === inv.id && (
                            <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpenStatusId(null); }} />
                          )}

                          {/* Dropdown Menu */}
                          {openStatusId === inv.id && (
                            <div className={`absolute left-0 w-40 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-200 ${index >= groupedInvoices.length - 2 ? 'bottom-full mb-1 origin-bottom-left' : 'top-full mt-1'
                              }`}>
                              <div className="p-1 space-y-0.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdate({ ...inv, paymentStatus: 'PENDING', isPaid: false });
                                    setOpenStatusId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg flex items-center"
                                >
                                  <div className="w-2 h-2 rounded-full bg-amber-400 mr-2"></div>
                                  Pendiente
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdate({ ...inv, paymentStatus: 'PAID', isPaid: true });
                                    setOpenStatusId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-green-50 text-green-700 rounded-lg flex items-center"
                                >
                                  <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                                  Pagada
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdate({ ...inv, paymentStatus: 'FACTORING', isPaid: false });
                                    setOpenStatusId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-blue-50 text-blue-700 rounded-lg flex items-center"
                                >
                                  <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                                  Factoring
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdate({ ...inv, paymentStatus: 'COLLECTION', isPaid: false });
                                    setOpenStatusId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-red-50 text-red-700 rounded-lg flex items-center"
                                >
                                  <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                                  En Cobranza
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {/* Days Overdue Calculation */}
                      {(!inv.paymentStatus || inv.paymentStatus === 'PENDING' || inv.paymentStatus === 'COLLECTION') && !inv.isPaid && inv.status !== 'CANCELLED' ? (() => {
                        const daysDiff = Math.floor((new Date().getTime() - new Date(inv.date).getTime()) / (1000 * 3600 * 24));
                        let colorClass = 'text-slate-400 bg-slate-50 border-slate-200';
                        if (daysDiff > 60) colorClass = 'text-red-600 bg-red-50 border-red-200';
                        else if (daysDiff > 30) colorClass = 'text-amber-600 bg-amber-50 border-amber-200';

                        return (
                          <div className={`inline-flex items-center justify-center px-2 py-1 rounded-lg border ${colorClass}`}>
                            <Clock size={12} className="mr-1" />
                            <span className="text-[10px] font-bold">{daysDiff} días</span>
                          </div>
                        );
                      })() : (
                        <span className="text-slate-300">-</span>
                      )}
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
                        {checkPermission(currentUser as User, 'invoices', 'update') && (
                          <button
                            onClick={() => handleEditClick(inv)}
                            className="text-slate-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-all"
                            title="Editar"
                          >
                            <Pencil size={18} />
                          </button>
                        )}
                        {checkPermission(currentUser as User, 'invoices', 'delete') && (
                          <button
                            onClick={() => setInvoiceToDelete(inv)}
                            className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-all"
                            title="Anular"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Children Rows */}
                  {
                    expandedInvoices.has(inv.id) && children.map(child => (
                      <tr key={child.id} className="bg-slate-50/80 animate-in slide-in-from-top-1 duration-200">
                        <td className="px-6 py-3 pl-12 border-l-4 border-slate-200">
                          <div className="flex items-center space-x-2">
                            <CornerDownRight size={14} className="text-slate-300" />
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter 
                                ${child.type === InvoiceType.NOTA_DEBITO ? 'bg-blue-100 text-blue-700' :
                                child.type === InvoiceType.GUIA_DESPACHO ? 'bg-indigo-100 text-indigo-700' :
                                  child.type === InvoiceType.VENTA ? 'bg-green-100 text-green-700' :
                                    'bg-purple-100 text-purple-700'
                              }`}>
                              {child.type === InvoiceType.VENTA ? (
                                <div className="flex items-center gap-1">
                                  <RefreshCw size={10} className="animate-spin-slow" />
                                  <span>{(() => {
                                    if (child.date !== inv.date) return child.date < inv.date ? 'ANTECEDENTE' : 'REFACTURACIÓN';
                                    const cNum = parseInt(child.number.replace(/\D/g, ''), 10) || 0;
                                    const pNum = parseInt(inv.number.replace(/\D/g, ''), 10) || 0;
                                    return cNum < pNum ? 'ANTECEDENTE' : 'REFACTURACIÓN';
                                  })()}</span>
                                </div>
                              ) : (
                                child.type.replace('_', ' ')
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3 font-bold text-slate-600 text-sm">
                          {child.number}
                        </td>
                        <td className="px-6 py-3 text-slate-400 text-xs">{child.date}</td>
                        <td className="px-6 py-3 text-xs text-slate-400 italic">
                          {(() => {
                            if (child.type === InvoiceType.NOTA_CREDITO) return 'Nota de Crédito';
                            const isPast = child.date !== inv.date
                              ? child.date < inv.date
                              : (parseInt(child.number.replace(/\D/g, ''), 10) || 0) < (parseInt(inv.number.replace(/\D/g, ''), 10) || 0);

                            if (isPast) return 'Antecedente / Origen';
                            return 'Refacturación / Continuidad';
                          })()}
                        </td>
                        <td className="px-6 py-3">
                          {/* Assignment Empty */}
                        </td>
                        <td className="px-6 py-3 font-bold text-slate-700 text-sm">{formatCLP(child.total)}</td>
                        <td className="px-6 py-3">
                          {/* Empty or specific status for child */}
                        </td>
                        <td className="px-6 py-3">
                          {/* Antigüedad Empty */}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => setSelectedInvoice(child)}
                              className="text-slate-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded-lg transition-all"
                              title="Ver Detalle"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => setInvoiceToDelete(child)}
                              className="text-slate-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-all"
                              title="Eliminar Nota"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  }
                </React.Fragment>
              ))}
              {groupedInvoices.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-20 text-center text-slate-400 italic font-medium">
                    {/* Empty State */}
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
      {
        selectedInvoice && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-slate-200">
              {/* Header Visor Web */}
              <div className="px-8 py-5 bg-white border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-2xl ${selectedInvoice.type === InvoiceType.VENTA ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                    <FileType size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Detalle de Documento</h3>
                    <div className="flex items-center space-x-2 text-slate-500 text-sm">
                      <span className="font-mono font-bold">#{selectedInvoice.number}</span>
                      <span>•</span>
                      <span className="capitalize">{selectedInvoice.type.replace('_', ' ').toLowerCase()}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X size={24} />
                </button>
              </div>

              {/* WEB VIEW CONTENT (Scrollable) */}
              <div className="flex-1 overflow-y-auto bg-slate-100 p-8 flex justify-center">
                <div className="bg-white w-full max-w-3xl shadow-xl rounded-sm border border-slate-200 p-10 min-h-[800px] flex flex-col relative text-slate-800">

                  {/* Watermark */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rotate-45 transform translate-x-32 -translate-y-32 z-0 rounded-full mix-blend-multiply opacity-50 pointer-events-none"></div>

                  {/* HEADER ROW */}
                  <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-8 relative z-10">
                    <div>
                      <div className="mb-2">
                        <div className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                          Vertikal Finanzas
                          <span className="text-blue-600">.SaaS</span>
                        </div>
                      </div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Soluciones Tecnológicas</p>
                      <p className="text-[10px] text-slate-400">Av. Providencia 1234, Of. 601, Santiago</p>
                      <p className="text-[10px] text-slate-400">contacto@vertikalfinanzas.cl</p>
                    </div>
                    <div className="text-right">
                      <div className="border-[3px] border-red-600 p-3 inline-block mb-2 bg-white">
                        <p className="text-red-600 font-bold text-sm uppercase tracking-widest leading-none text-center mb-1">R.U.T.: 76.123.456-7</p>
                        <p className="text-slate-900 font-black text-lg uppercase tracking-tight my-1 text-center leading-none">
                          {selectedInvoice.type.replace('_', ' ')}
                        </p>
                        <p className="text-red-600 font-black text-lg text-center">Nº {selectedInvoice.number}</p>
                      </div>
                      <p className="text-[9px] font-bold text-red-600 uppercase mt-1">S.I.I. - SANTIAGO CENTRO</p>
                    </div>
                  </div>

                  {/* INFO ROW GRID */}
                  <div className="grid grid-cols-12 gap-8 mb-8 relative z-10 text-xs">
                    {/* COL 1: EMISOR (Implícito arriba, aquí ponemos fecha) */}
                    <div className="col-span-4 space-y-4">
                      <div>
                        <p className="font-bold uppercase text-slate-400 text-[10px] mb-1">Fecha Emisión</p>
                        <p className="font-bold text-slate-900 text-sm">{selectedInvoice.date}</p>
                      </div>
                      <div>
                        <p className="font-bold uppercase text-slate-400 text-[10px] mb-1">Vencimiento</p>
                        <p className="font-bold text-slate-900 text-sm">
                          {selectedInvoice.dueDate || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="font-bold uppercase text-slate-400 text-[10px] mb-1">Estado Pago</p>
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide border \${selectedInvoice.isPaid 
                            ? 'bg-green-50 text-green-700 border-green-200' 
                            : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {selectedInvoice.isPaid ? 'PAGADO' : 'PENDIENTE'}
                        </span>
                      </div>
                    </div>

                    {/* COL 2: RECEPTOR (Cliente) */}
                    <div className="col-span-4 space-y-3 bg-slate-50 p-4 rounded border border-slate-100">
                      <p className="font-bold uppercase text-slate-400 text-[10px] tracking-wider mb-2 border-b border-slate-200 pb-1">Señor(es)</p>
                      <div>
                        <p className="font-black text-slate-800 text-sm uppercase leading-tight">
                          {clients.find(c => c.id === selectedInvoice.clientId)?.razonSocial || 'Cliente Desconocido'}
                        </p>
                        <p className="font-mono text-slate-500 font-bold mt-1">
                          {clients.find(c => c.id === selectedInvoice.clientId)?.rut || 'S/R'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 italic truncate">
                          {clients.find(c => c.id === selectedInvoice.clientId)?.email || 'Sin contacto'}
                        </p>
                      </div>
                    </div>

                    {/* COL 3: REFERENCIAS (Trazabilidad) */}
                    <div className="col-span-4 space-y-3 bg-slate-50 p-4 rounded border border-slate-100">
                      <p className="font-bold uppercase text-slate-400 text-[10px] tracking-wider mb-2 border-b border-slate-200 pb-1">Referencias</p>

                      <div className="grid grid-cols-1 gap-2">
                        {/* Centro de Costo */}
                        <div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">Centro de Costo</p>
                          <p className="font-bold text-slate-700">
                            {costCenters.find(cc => cc.id === selectedInvoice.costCenterId)?.name || '-'}
                          </p>
                        </div>

                        {/* Proyecto - Si existe */}
                        {selectedInvoice.projectId && (
                          <div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">Proyecto</p>
                            <p className="font-bold text-blue-700">
                              {projects.find(p => p.id === selectedInvoice.projectId)?.name}
                            </p>
                          </div>
                        )}

                        {/* OC / GD */}
                        {(selectedInvoice.purchaseOrderNumber || selectedInvoice.dispatchGuideNumber) && (
                          <div className="pt-2 border-t border-slate-200 mt-1 flex flex-wrap gap-2">
                            {selectedInvoice.purchaseOrderNumber && (
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase mr-1">O.C.:</span>
                                <span className="font-mono font-bold text-slate-800 bg-white px-1 border border-slate-200 rounded">
                                  {selectedInvoice.purchaseOrderNumber}
                                </span>
                              </div>
                            )}
                            {selectedInvoice.dispatchGuideNumber && (
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase mr-1">G.D.:</span>
                                <span className="font-mono font-bold text-slate-800 bg-white px-1 border border-slate-200 rounded">
                                  {selectedInvoice.dispatchGuideNumber}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ITEMS TABLE */}
                  <div className="flex-1 mb-8">
                    <table className="w-full text-xs">
                      <thead className="border-b-2 border-slate-900 text-slate-900 font-black uppercase tracking-wider">
                        <tr>
                          <th className="py-2 text-left">Descripción</th>
                          <th className="py-2 text-center w-20">Cant.</th>
                          <th className="py-2 text-right w-32">Precio Unit.</th>
                          <th className="py-2 text-right w-32">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                          selectedInvoice.items.map((item, idx) => (
                            <tr key={idx}>
                              <td className="py-3 pr-4">
                                <p className="font-bold text-slate-900">{item.description}</p>
                              </td>
                              <td className="py-3 text-center">{item.quantity}</td>
                              <td className="py-3 text-right text-slate-500">{formatCLP(item.unitPrice)}</td>
                              <td className="py-3 text-right font-bold text-slate-900">{formatCLP(item.total)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                              Sin detalle de ítems.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* FOOTER / TOTALS */}
                  <div className="border-t-2 border-slate-900 pt-4 flex justify-end">
                    <div className="w-64 space-y-2 text-sm">
                      <div className="flex justify-between text-slate-500 font-medium">
                        <span>Monto Neto</span>
                        <span>{formatCLP(selectedInvoice.net)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500 font-medium">
                        <span>I.V.A. (19%)</span>
                        <span>{formatCLP(selectedInvoice.iva)}</span>
                      </div>
                      <div className="flex justify-between text-slate-900 font-black text-lg pt-2 border-t border-slate-200 mt-2">
                        <span>TOTAL</span>
                        <span>{formatCLP(selectedInvoice.total)}</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>


              {/* HIDDEN PDF TEMPLATE (Strictly for generation) */}
              <div id="invoice-content" className="fixed top-0 left-[-9999px] w-[210mm] min-h-[297mm] bg-white p-10 text-slate-900 pointer-events-none">
                <div className="border-2 border-slate-900 rounded-none p-8 h-full flex flex-col relative justify-between">
                  {/* Watermark/Background Decoration */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rotate-45 transform translate-x-32 -translate-y-32 z-0 rounded-full mix-blend-multiply opacity-50"></div>

                  <div className="relative z-10 flex-1">
                    {/* Header PDF Only */}
                    <div className="flex justify-between items-start border-b-4 border-slate-900 pb-8 mb-8">
                      <div>
                        <div className="mb-4">
                          <div className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                            {activeCompany?.name || 'Vertikal Finanzas'}
                            {/* <span className="text-blue-600">.SaaS</span> */}
                          </div>
                        </div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Soluciones Tecnológicas</p>
                        <p className="text-xs text-slate-400">{activeCompany?.address || 'Sin dirección registrada'}</p>
                        <p className="text-xs text-slate-400">{activeCompany?.email || 'Sin contacto'}</p>
                      </div>
                      <div className="text-right">
                        <div className="border-4 border-red-600 p-4 inline-block mb-2">
                          <p className="text-red-600 font-bold text-lg uppercase tracking-widest leading-none text-center">R.U.T.: {activeCompany?.rut || 'Sin RUT'}</p>
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
                          <span className="font-bold">{selectedInvoice.date}</span>
                        </div>
                        <div className="flex items-center text-xs font-bold text-slate-500">
                          TRANSACCIÓN COMPLETADA
                        </div>
                      </div>
                    </div>

                    {/* Centro de Costo y Proyectos */}
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 mt-8">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center">
                        Imputación y Trazabilidad
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
                                {projects.find(p => p.id === selectedInvoice.projectId)?.name}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-200">
                      {selectedInvoice.purchaseOrderNumber && (
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Orden de Compra</span>
                          <span className="font-mono font-bold text-slate-900 text-sm border border-slate-300 px-2 py-0.5 rounded bg-white">
                            {selectedInvoice.purchaseOrderNumber}
                          </span>
                        </div>
                      )}
                      {selectedInvoice.dispatchGuideNumber && (
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Guía de Despacho</span>
                          <span className="font-mono font-bold text-slate-900 text-sm border border-slate-300 px-2 py-0.5 rounded bg-white">
                            {selectedInvoice.dispatchGuideNumber}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Desglose Financiero */}
                    <div className="space-y-4 mt-8">
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

              {/* Footer Visor Web */}
              <div className="px-8 py-5 bg-white border-t border-slate-100 flex justify-end space-x-3">
                <button
                  onClick={() => handleDownloadPDF(selectedInvoice)}
                  className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center shadow-sm"
                >
                  <Download size={16} className="mr-2" />
                  <span>Descargar PDF</span>
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="px-8 py-2.5 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all active:scale-95"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div >
        )
      }

      {/* Modal Registro Factura */}
      {
        showModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8 border border-slate-100 flex flex-col max-h-[90vh]">
              <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200">
                    <FileType size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">{isEditing ? 'Editar Factura' : 'Registrar Nueva Factura'}</h3>
                </div>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
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
                            number: getNextCorrelative(newType), // Auto-update number on type change
                            relatedInvoiceId: (newType === InvoiceType.NOTA_CREDITO || newType === InvoiceType.NOTA_DEBITO || newType === InvoiceType.VENTA) ? formData.relatedInvoiceId : undefined
                          });
                        }}
                      >
                        <option value={InvoiceType.VENTA}>Factura de Venta</option>
                        <option value={InvoiceType.COMPRA}>Factura de Compra</option>
                        <option value={InvoiceType.NOTA_CREDITO}>Nota de Crédito</option>
                        <option value={InvoiceType.NOTA_DEBITO}>Nota de Débito</option>
                      </select>
                    </div>

                    {/* Related Invoice Selector for Credit/Debit Notes & Refacturación */}
                    {(formData.type === InvoiceType.NOTA_CREDITO || formData.type === InvoiceType.NOTA_DEBITO || formData.type === InvoiceType.VENTA) && (
                      <div className="col-span-2 space-y-1.5 animate-in slide-in-from-top-1">
                        <label className="text-xs font-bold text-slate-600 uppercase flex items-center text-blue-600">
                          <Target size={12} className="mr-1" />
                          {formData.type === InvoiceType.VENTA ? 'Refacturación de...' : `Referencia Factura ${formData.type === InvoiceType.NOTA_CREDITO ? '(A Anular o Corregir)' : '(Asociada)'}`}
                        </label>
                        <select
                          className="w-full p-2.5 bg-blue-50 border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-700"
                          value={formData.relatedInvoiceId || ''}
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            const relatedInvoice = invoices.find(inv => inv.id === selectedId);

                            if (relatedInvoice) {
                              setFormData({
                                ...formData,
                                relatedInvoiceId: selectedId,
                                clientId: relatedInvoice.clientId,
                                costCenterId: relatedInvoice.costCenterId || '',
                                projectId: relatedInvoice.projectId || '',
                                net: relatedInvoice.net, // Copy Net Amount
                                purchaseOrderNumber: relatedInvoice.purchaseOrderNumber || '',
                                dispatchGuideNumber: relatedInvoice.dispatchGuideNumber || '',
                                items: relatedInvoice.items ? relatedInvoice.items.map(item => ({
                                  ...item,
                                  id: Math.random().toString(36).substr(2, 9) // Generate new IDs for the copy
                                })) : []
                              });
                            } else {
                              setFormData({ ...formData, relatedInvoiceId: selectedId });
                            }
                          }}
                          required={formData.type === InvoiceType.NOTA_CREDITO}
                        >
                          <option value="">Seleccione Factura...</option>
                          {invoices
                            .filter(inv => (
                              inv.type === InvoiceType.VENTA ||
                              inv.type === InvoiceType.NOTA_DEBITO ||
                              inv.type === InvoiceType.NOTA_CREDITO ||
                              inv.type === InvoiceType.FACTURA_EXENTA
                            ) && inv.id !== editingId)
                            .map(inv => {
                              const client = clients.find(c => c.id === inv.clientId);
                              return (
                                <option key={inv.id} value={inv.id}>
                                  Nº {inv.number} - {client?.razonSocial} - {formatCLP(inv.total)} ({inv.date}) {inv.status === 'CANCELLED' ? '(ANULADA)' : ''}
                                </option>
                              );
                            })}
                        </select>

                        {/* Checkbox for Full Annulment */}
                        {formData.type === InvoiceType.NOTA_CREDITO && (
                          <div className="flex items-start space-x-2 mt-2 p-2 bg-blue-50/50 rounded-lg border border-blue-100">
                            <input
                              type="checkbox"
                              id="annulInvoice"
                              checked={formData.annulInvoice !== false} // Default to true if undefined
                              onChange={(e) => setFormData({ ...formData, annulInvoice: e.target.checked })}
                              className="mt-0.5 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex flex-col">
                              <label htmlFor="annulInvoice" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                                Anular Factura Completa
                              </label>
                              <p className="text-[10px] text-slate-500 leading-tight">
                                {formData.annulInvoice !== false
                                  ? "La factura referenciada cambiará su estado a NULA (Cancelada)."
                                  : "La factura referenciada mantendrá su estado actual (Vigente/Pagada)."}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase">Nº Factura</label>
                      <input
                        required
                        type="text"
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                        value={formData.number}
                        placeholder={formData.type === InvoiceType.NOTA_CREDITO ? "NC-..." : formData.type === InvoiceType.NOTA_DEBITO ? "ND-..." : "F-..."}
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
                  {/* New Fields for PO, Dispatch Guide, HES and Document Status */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase">Nº HES</label>
                      <input
                        type="text"
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                        value={formData.hesNumber}
                        placeholder="HES-12345"
                        onChange={(e) => setFormData({ ...formData, hesNumber: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-red-600 uppercase">Estado Documento</label>
                      <select
                        className={`w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-black text-xs ${formData.status === 'CANCELLED' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="ISSUED">✅ VIGENTE (Sumar)</option>
                        <option value="CANCELLED">❌ ANULADA (No Sumar)</option>
                        <option value="PAID">💰 PAGADA</option>
                      </select>
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
                    <span>{formData.type === InvoiceType.COMPRA ? 'Proveedor' : 'Cliente / Receptor'}</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <select
                        required
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold text-slate-700"
                        value={formData.clientId}
                        onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                      >
                        <option value="">
                          {formData.type === InvoiceType.COMPRA ? 'Seleccione un Proveedor...' : 'Seleccione un Cliente...'}
                        </option>
                        {formData.type === InvoiceType.COMPRA ? (
                          suppliers.map(s => (
                            <option key={s.id} value={s.id}>{s.rut} — {s.razonSocial}</option>
                          ))
                        ) : (
                          clients.map(c => (
                            <option key={c.id} value={c.id}>{c.rut} — {c.razonSocial}</option>
                          ))
                        )}
                      </select>
                    </div>
                    {formData.type === InvoiceType.COMPRA && onAddSupplier && (
                      <button
                        type="button"
                        onClick={() => setShowSupplierModal(true)}
                        className="p-3 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-colors"
                        title="Crear Nuevo Proveedor"
                      >
                        <Plus size={20} />
                      </button>
                    )}
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
                        Centro de Costo <span className="text-slate-400 ml-1 font-normal">(Opcional)</span>
                      </label>
                      <div className="relative">
                        <Target className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select
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
        )
      }

      {/* Modal Confirmación Eliminación Factura */}
      {
        invoiceToDelete && (
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
        )
      }
      {/* Modal de Advertencia de Asignación */}
      {
        showAssignmentWarning && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
              <div className="p-8 text-center space-y-4">
                <div className="w-20 h-20 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <AlertTriangle size={40} />
                </div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                  ¿Guardar sin Asignación?
                </h3>
                <p className="text-sm text-slate-500 font-medium">
                  Esta factura no está vinculada a ningún <strong>Centro de Costo</strong> ni <strong>Proyecto</strong>.
                  <br /><br />
                  Esto afectará la trazabilidad en los reportes de gestión.
                </p>
              </div>
              <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex flex-col gap-3">
                <button
                  onClick={processSubmit}
                  className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-lg"
                >
                  Guardar de todos modos
                </button>
                <button
                  onClick={() => setShowAssignmentWarning(false)}
                  className="w-full py-3 bg-white text-slate-600 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  Volver y Corregir
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Supplier Modal */}
      {showSupplierModal && onAddSupplier && (
        <SupplierFormModal
          isOpen={showSupplierModal}
          onClose={() => setShowSupplierModal(false)}
          onSave={async (newSupplier) => {
            const saved = await onAddSupplier(newSupplier);
            if (saved && saved.id) {
              setFormData(prev => ({ ...prev, clientId: saved.id }));
            }
          }}
        />
      )}

    </div >
  );
};

export default InvoicesPage;
