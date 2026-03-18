import React, { useState, useEffect } from 'react';
import { 
    Kanban, Plus, Search, MoreVertical, Edit2, Trash2, 
    Phone, Mail, Building, Clock, CheckCircle, XCircle, FileText
} from 'lucide-react';
import { Lead, Quote, Company, UserRole } from '../types';
import { API_URL } from '../src/config.ts';
import { useCompany } from '../components/CompanyContext';

interface CrmPageProps {
    currentUser: any;
}

const CrmPage: React.FC<CrmPageProps> = ({ currentUser }) => {
    const { activeCompany } = useCompany();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [showLeadModal, setShowLeadModal] = useState(false);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [leadForm, setLeadForm] = useState({
        name: '', companyName: '', email: '', phone: '', status: 'NEW', source: '', notes: ''
    });

    const [modalTab, setModalTab] = useState<'details' | 'quotes'>('details');
    const [showQuoteForm, setShowQuoteForm] = useState(false);
    const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
    const [quoteForm, setQuoteForm] = useState({
        number: `COT-${Math.floor(Math.random() * 10000)}`,
        date: new Date().toISOString().split('T')[0],
        validUntil: '',
        status: 'DRAFT',
        notes: '',
        items: [{ description: '', quantity: 1, unitPrice: 0 }]
    });

    useEffect(() => {
        if (activeCompany) fetchData();
    }, [activeCompany]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/leads`, {
                headers: { 'company-id': activeCompany?.id || '' }
            });
            if (res.ok) {
                const data = await res.json();
                setLeads(data);
            }
        } catch (error) {
            console.error("Error fetching leads:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLeadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeCompany) return;

        try {
            if (editingLead) {
                const res = await fetch(`${API_URL}/leads/${editingLead.id}`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'company-id': activeCompany.id
                    },
                    body: JSON.stringify(leadForm)
                });
                if (res.ok) {
                    const updated = await res.json();
                    setLeads(leads.map(l => l.id === updated.id ? updated : l));
                    setShowLeadModal(false);
                }
            } else {
                const res = await fetch(`${API_URL}/leads`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'company-id': activeCompany.id
                    },
                    body: JSON.stringify(leadForm)
                });
                if (res.ok) {
                    const created = await res.json();
                    setLeads([created, ...leads]);
                    setShowLeadModal(false);
                }
            }
        } catch (error) {
            console.error("Error saving lead:", error);
        }
    };

    const handleQuoteSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeCompany || !editingLead) return;

        try {
            const endpoint = editingQuote 
                ? `${API_URL}/quotes/${editingQuote.id}` 
                : `${API_URL}/quotes`;
            const method = editingQuote ? 'PUT' : 'POST';
            
            const payload = { ...quoteForm, leadId: editingLead.id };

            const res = await fetch(endpoint, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'company-id': activeCompany.id
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setShowQuoteForm(false);
                fetchData(); // Refresh leads to get nested updated quotes
            }
        } catch (error) {
            console.error("Error saving quote:", error);
        }
    };

    const handleConvertToInvoice = async (quote: Quote) => {
        if (!activeCompany) return;
        if (!confirm('¿Deseas convertir esta cotización en una Factura (Borrador)?')) return;

        try {
            const invoicePayload = {
                number: `F-${quote.number}`,
                date: new Date().toISOString(),
                status: 'DRAFT',
                type: 'VENTA',
                emissionType: 'ELECTRONIC',
                net: quote.netAmount,
                iva: quote.taxAmount,
                total: quote.totalAmount,
                items: quote.items?.map((item: any) => ({
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    total: item.total
                }))
            };

            const res = await fetch(`${API_URL}/invoices`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'company-id': activeCompany.id
                },
                body: JSON.stringify(invoicePayload)
            });

            if (res.ok) {
                alert('Factura creada exitosamente como BORRADOR. Puedes revisarla en la sección Facturas.');
                // Update quote status
                await fetch(`${API_URL}/quotes/${quote.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'company-id': activeCompany.id },
                    body: JSON.stringify({ ...quote, status: 'ACCEPTED' })
                });
                fetchData();
            }
        } catch (error) {
            console.error("Error converting quote:", error);
        }
    };

    const handleDeleteLead = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!activeCompany) return;
        if (!confirm('¿Seguro que deseas eliminar este Prospecto? Las cotizaciones asociadas también se verán afectadas.')) return;
        
        try {
            const res = await fetch(`${API_URL}/leads/${id}`, {
                method: 'DELETE',
                headers: { 'company-id': activeCompany.id }
            });
            if (res.ok) {
                setLeads(leads.filter(l => l.id !== id));
            }
        } catch (error) {
            console.error("Error deleting lead:", error);
        }
    };

    const openModal = (lead?: Lead) => {
        if (lead) {
            setEditingLead(lead);
            setLeadForm({
                name: lead.name,
                companyName: lead.companyName || '',
                email: lead.email || '',
                phone: lead.phone || '',
                status: lead.status,
                source: lead.source || '',
                notes: lead.notes || ''
            });
        } else {
            setEditingLead(null);
            setLeadForm({
                name: '', companyName: '', email: '', phone: '', status: 'NEW', source: '', notes: ''
            });
        }
        setModalTab('details');
        setShowQuoteForm(false);
        setShowLeadModal(true);
    };

    const openQuoteForm = (quote?: Quote) => {
        if (quote) {
            setEditingQuote(quote);
            setQuoteForm({
                number: quote.number,
                date: new Date(quote.date).toISOString().split('T')[0],
                validUntil: quote.validUntil ? new Date(quote.validUntil).toISOString().split('T')[0] : '',
                status: quote.status,
                notes: quote.notes || '',
                items: quote.items?.length ? quote.items.map((i:any) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice })) : [{ description: '', quantity: 1, unitPrice: 0 }]
            });
        } else {
            setEditingQuote(null);
            setQuoteForm({
                number: `COT-${Math.floor(Math.random() * 10000)}`,
                date: new Date().toISOString().split('T')[0],
                validUntil: '',
                status: 'DRAFT',
                notes: '',
                items: [{ description: '', quantity: 1, unitPrice: 0 }]
            });
        }
        setShowQuoteForm(true);
    };

    // Kanban Logic
    const columns = [
        { id: 'NEW', title: 'Nuevos (Leads)', color: 'bg-blue-100 text-blue-800' },
        { id: 'CONTACTED', title: 'Contactados', color: 'bg-yellow-100 text-yellow-800' },
        { id: 'QUALIFIED', title: 'Calificados / Cotizados', color: 'bg-purple-100 text-purple-800' },
        { id: 'LOST', title: 'Perdidos', color: 'bg-slate-100 text-slate-800' }
    ];

    const filteredLeads = leads.filter(l => 
        l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (l.companyName && l.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleDragStart = (e: React.DragEvent, leadId: string) => {
        e.dataTransfer.setData('leadId', leadId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = async (e: React.DragEvent, statusId: string) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData('leadId');
        if (!leadId || !activeCompany) return;

        const leadToUpdate = leads.find(l => l.id === leadId);
        if (leadToUpdate && leadToUpdate.status !== statusId) {
            // Optimistic update
            setLeads(leads.map(l => l.id === leadId ? { ...l, status: statusId as any } : l));

            try {
                const res = await fetch(`${API_URL}/leads/${leadId}`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'company-id': activeCompany.id
                    },
                    body: JSON.stringify({ ...leadToUpdate, status: statusId })
                });
                
                if (!res.ok) {
                    throw new Error("Failed to update status");
                }
            } catch (err) {
                console.error(err);
                // Revert
                fetchData();
            }
        }
    };

    if (!activeCompany) {
        return <div className="p-8 text-center text-slate-500">Seleccione una empresa para ver el CRM.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center">
                        <Kanban className="mr-3 text-indigo-600" size={28} /> CRM y Cotizaciones
                    </h2>
                    <p className="text-slate-500 font-medium mt-1">
                        Gestiona tus prospectos, ciclo de venta y cotizaciones.
                    </p>
                </div>
                
                <div className="flex w-full md:w-auto gap-3">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar prospecto..."
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => openModal()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-sm active:scale-95 whitespace-nowrap"
                    >
                        <Plus size={18} />
                        <span className="font-bold">Nuevo</span>
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            ) : (
                <div className="flex overflow-x-auto pb-4 gap-6 snap-x min-h-[60vh]">
                    {columns.map(column => {
                        const columnLeads = filteredLeads.filter(l => l.status === column.id);
                        
                        return (
                            <div 
                                key={column.id} 
                                className="bg-slate-50/50 rounded-3xl p-4 min-w-[320px] max-w-[320px] w-full flex-shrink-0 snap-center flex flex-col border border-slate-100"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, column.id)}
                            >
                                <div className="flex justify-between items-center mb-4 px-2">
                                    <h3 className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full ${column.color}`}>
                                        {column.title}
                                    </h3>
                                    <span className="text-slate-400 font-bold text-sm bg-white w-6 h-6 rounded-full flex items-center justify-center shadow-sm">
                                        {columnLeads.length}
                                    </span>
                                </div>

                                <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                                    {columnLeads.map(lead => (
                                        <div 
                                            key={lead.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, lead.id)}
                                            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:border-indigo-300 hover:shadow-md transition-all group"
                                            onClick={() => openModal(lead)}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-slate-800 truncate pr-4">{lead.name}</h4>
                                                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={(e) => { e.stopPropagation(); openModal(lead); }} className="text-slate-400 hover:text-blue-500 p-1"><Edit2 size={14} /></button>
                                                    <button onClick={(e) => handleDeleteLead(lead.id, e)} className="text-slate-400 hover:text-red-500 p-1"><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                            
                                            {lead.companyName && (
                                                <div className="flex items-center text-xs text-slate-500 mb-1">
                                                    <Building size={12} className="mr-1.5 min-w-3 text-slate-400" />
                                                    <span className="truncate">{lead.companyName}</span>
                                                </div>
                                            )}
                                            
                                            <div className="flex items-center text-xs text-slate-500 mb-3">
                                                <Phone size={12} className="mr-1.5 min-w-3 text-slate-400" />
                                                <span>{lead.phone || 'Sin número'}</span>
                                            </div>

                                            <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                                                <div className="text-[10px] font-bold text-slate-400 flex items-center">
                                                    <Clock size={10} className="mr-1" />
                                                    {new Date(lead.createdAt || '').toLocaleDateString('es-CL', { month: 'short', day: 'numeric' })}
                                                </div>
                                                {lead.quotes && lead.quotes.length > 0 && (
                                                    <div className="flex items-center text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full">
                                                        <FileText size={10} className="mr-1" />
                                                        {lead.quotes.length} Cotiz.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {columnLeads.length === 0 && (
                                        <div className="flex items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm font-medium">
                                            Sin prospectos
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            {showLeadModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-xl font-black text-slate-800">{editingLead ? editingLead.name : 'Nuevo Prospecto'}</h3>
                                {editingLead && (
                                    <div className="flex space-x-4 mt-3">
                                        <button onClick={() => setModalTab('details')} className={`text-sm font-bold pb-2 border-b-2 transition-colors ${modalTab === 'details' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Detalles</button>
                                        <button onClick={() => setModalTab('quotes')} className={`text-sm font-bold pb-2 border-b-2 transition-colors ${modalTab === 'quotes' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Cotizaciones ({editingLead.quotes?.length || 0})</button>
                                    </div>
                                )}
                            </div>
                            <button onClick={() => setShowLeadModal(false)} className="text-slate-400 hover:text-slate-600 -mt-6"><XCircle size={24} /></button>
                        </div>
                        <div className="overflow-y-auto p-8 custom-scrollbar">
                        {modalTab === 'details' ? (
                            <form onSubmit={handleLeadSubmit}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nombre Contacto / Cliente</label>
                                    <input type="text" required className="w-full mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                        value={leadForm.name} onChange={e => setLeadForm({ ...leadForm, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Empresa (Opcional)</label>
                                    <input type="text" className="w-full mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                        value={leadForm.companyName} onChange={e => setLeadForm({ ...leadForm, companyName: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Teléfono</label>
                                    <input type="tel" className="w-full mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                        value={leadForm.phone} onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Email</label>
                                    <input type="email" className="w-full mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                        value={leadForm.email} onChange={e => setLeadForm({ ...leadForm, email: e.target.value })} />
                                </div>
                                <div className="md:col-span-2 grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Origen / Fuente</label>
                                        <input type="text" placeholder="Ej: Recomendación, Web, LinkedIn" className="w-full mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                            value={leadForm.source} onChange={e => setLeadForm({ ...leadForm, source: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Etapa</label>
                                        <select className="w-full mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                                            value={leadForm.status} onChange={e => setLeadForm({ ...leadForm, status: e.target.value })}>
                                            <option value="NEW">Nuevo</option>
                                            <option value="CONTACTED">Contactado</option>
                                            <option value="QUALIFIED">Calificado / Cotizado</option>
                                            <option value="LOST">Perdido</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Notas</label>
                                    <textarea className="w-full mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-medium min-h-[100px] resize-none"
                                        value={leadForm.notes} onChange={e => setLeadForm({ ...leadForm, notes: e.target.value })}></textarea>
                                </div>
                            </div>
                                <div className="mt-8 flex justify-end space-x-3">
                                    <button type="button" onClick={() => setShowLeadModal(false)} className="px-6 py-3 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                                    <button type="submit" className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95">
                                        {editingLead ? 'Guardar Cambios' : 'Crear Prospecto'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-6">
                                {!showQuoteForm ? (
                                    <>
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-bold text-slate-800">Cotizaciones</h4>
                                            <button onClick={() => openQuoteForm()} className="flex items-center space-x-1 text-sm bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-200">
                                                <Plus size={14} /> <span>Nueva Cotización</span>
                                            </button>
                                        </div>
                                        {editingLead?.quotes && editingLead.quotes.length > 0 ? (
                                            <div className="space-y-3">
                                                {editingLead.quotes.map((q: any) => (
                                                    <div key={q.id} className="border border-slate-200 p-4 rounded-xl flex items-center justify-between hover:shadow-sm">
                                                        <div>
                                                            <div className="flex items-center space-x-3">
                                                                <h5 className="font-bold text-slate-800">{q.number}</h5>
                                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${q.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' : q.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>{q.status}</span>
                                                            </div>
                                                            <div className="text-xs text-slate-500 mt-1 flex space-x-4">
                                                                <span>Fecha: {new Date(q.date).toLocaleDateString()}</span>
                                                                <span className="font-bold font-mono">Total: ${(q.totalAmount || 0).toLocaleString('es-CL')}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex space-x-2">
                                                            {q.status !== 'ACCEPTED' && (
                                                                <button onClick={() => handleConvertToInvoice(q)} className="text-xs font-bold bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg transition-colors">
                                                                    Convertir a Factura
                                                                </button>
                                                            )}
                                                            <button onClick={() => openQuoteForm(q)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><Edit2 size={16} /></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center p-8 bg-slate-50 rounded-xl text-slate-500 text-sm">No hay cotizaciones registradas para este prospecto.</div>
                                        )}
                                    </>
                                ) : (
                                    <form onSubmit={handleQuoteSubmit} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                        <div className="flex justify-between items-center mb-6">
                                            <h4 className="font-bold text-slate-800">{editingQuote ? 'Editar Cotización' : 'Nueva Cotización'}</h4>
                                            <button type="button" onClick={() => setShowQuoteForm(false)} className="text-slate-400 hover:text-slate-600"><XCircle size={20} /></button>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Número</label>
                                                <input type="text" required className="w-full mt-1 p-2 bg-white rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                                                    value={quoteForm.number} onChange={e => setQuoteForm({ ...quoteForm, number: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Fecha</label>
                                                <input type="date" required className="w-full mt-1 p-2 bg-white rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                                                    value={quoteForm.date} onChange={e => setQuoteForm({ ...quoteForm, date: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Válida Hasta</label>
                                                <input type="date" className="w-full mt-1 p-2 bg-white rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                                                    value={quoteForm.validUntil} onChange={e => setQuoteForm({ ...quoteForm, validUntil: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Estado</label>
                                                <select className="w-full mt-1 p-2 bg-white rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold"
                                                    value={quoteForm.status} onChange={e => setQuoteForm({ ...quoteForm, status: e.target.value })}>
                                                    <option value="DRAFT">Borrador</option>
                                                    <option value="SENT">Enviada</option>
                                                    <option value="ACCEPTED">Aceptada</option>
                                                    <option value="REJECTED">Rechazada</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="mb-6">
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Ítems</label>
                                                <button type="button" onClick={() => setQuoteForm({...quoteForm, items: [...quoteForm.items, {description: '', quantity: 1, unitPrice: 0}]})} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center"><Plus size={12} className="mr-1"/> Agregar Ítem</button>
                                            </div>
                                            <div className="space-y-2">
                                                {quoteForm.items.map((item, idx) => (
                                                    <div key={idx} className="flex space-x-2 items-center">
                                                        <input type="text" placeholder="Descripción" required className="flex-1 p-2 bg-white rounded-lg border border-slate-200 text-sm"
                                                            value={item.description} onChange={(e) => {
                                                                const newItems = [...quoteForm.items];
                                                                newItems[idx].description = e.target.value;
                                                                setQuoteForm({...quoteForm, items: newItems});
                                                            }} />
                                                        <input type="number" placeholder="Cant" required min="0.01" step="0.01" className="w-20 p-2 bg-white rounded-lg border border-slate-200 text-sm text-center"
                                                            value={item.quantity} onChange={(e) => {
                                                                const newItems = [...quoteForm.items];
                                                                newItems[idx].quantity = Number(e.target.value);
                                                                setQuoteForm({...quoteForm, items: newItems});
                                                            }} />
                                                        <input type="number" placeholder="Precio" required min="0" className="w-28 p-2 bg-white rounded-lg border border-slate-200 text-sm text-right"
                                                            value={item.unitPrice} onChange={(e) => {
                                                                const newItems = [...quoteForm.items];
                                                                newItems[idx].unitPrice = Number(e.target.value);
                                                                setQuoteForm({...quoteForm, items: newItems});
                                                            }} />
                                                        <span className="w-28 font-mono font-bold text-sm text-right text-slate-600">
                                                            ${(item.quantity * item.unitPrice).toLocaleString('es-CL')}
                                                        </span>
                                                        <button type="button" onClick={() => {
                                                            const newItems = quoteForm.items.filter((_, i) => i !== idx);
                                                            setQuoteForm({...quoteForm, items: newItems});
                                                        }} className="text-slate-400 hover:text-red-500 p-1"><Trash2 size={16}/></button>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-4 flex justify-end">
                                                <div className="text-right bg-white p-3 rounded-xl border border-slate-200 inline-block min-w-[200px]">
                                                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                                                        <span>Neto:</span>
                                                        <span className="font-mono">${quoteForm.items.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0).toLocaleString('es-CL')}</span>
                                                    </div>
                                                    <div className="flex justify-between font-bold text-slate-800 text-sm">
                                                        <span>Total (+19%):</span>
                                                        <span className="font-mono">${Math.round(quoteForm.items.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0) * 1.19).toLocaleString('es-CL')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-slate-200">
                                            <button type="button" onClick={() => setShowQuoteForm(false)} className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
                                            <button type="submit" className="px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition-transform active:scale-95">
                                                {editingQuote ? 'Actualizar' : 'Guardar Cotización'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        )}
                        </div>
                    </div>
                </div>
            )}

            

            {/* NOTE: Quotes modal logic will go here on next phase. A sub-tab or detailed view per Lead. */}
        </div>
    );
};

export default CrmPage;
