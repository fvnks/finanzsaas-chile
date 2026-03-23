import React, { useState, useEffect, useMemo } from 'react';
import {
    Kanban, Plus, Search, MoreVertical, Edit2, Trash2,
    Phone, Mail, Building, Clock, CheckCircle, XCircle, FileText,
    PhoneCall, Users, MessageSquare, Send, TrendingUp, Star,
    ChevronDown, Filter, X, BarChart3, Activity
} from 'lucide-react';
import { Lead, Quote, LeadActivity, EmailTemplate } from '../types';
import { API_URL } from '../src/config.ts';
import { useCompany } from '../components/CompanyContext';

interface CrmPageProps {
    currentUser: any;
}

const PIPELINE_STAGES = [
    { id: 'NEW', title: 'Nuevos', color: 'bg-blue-100 text-blue-800', icon: Star },
    { id: 'CONTACTED', title: 'Contactados', color: 'bg-cyan-100 text-cyan-800', icon: PhoneCall },
    { id: 'QUALIFIED', title: 'Calificados', color: 'bg-purple-100 text-purple-800', icon: CheckCircle },
    { id: 'PROPOSAL', title: 'Propuesta Enviada', color: 'bg-indigo-100 text-indigo-800', icon: FileText },
    { id: 'NEGOTIATION', title: 'Negociación', color: 'bg-amber-100 text-amber-800', icon: TrendingUp },
    { id: 'WON', title: 'Cerrados Ganados', color: 'bg-green-100 text-green-800', icon: Users },
    { id: 'LOST', title: 'Perdidos', color: 'bg-slate-100 text-slate-600', icon: XCircle },
];

const ACTIVITY_ICONS: Record<string, any> = {
    CALL: PhoneCall,
    MEETING: Users,
    EMAIL: Mail,
    NOTE: MessageSquare,
    STATUS_CHANGE: Activity,
    QUOTE_SENT: FileText,
};

const GRADE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
    A: { bg: 'bg-green-100', text: 'text-green-700', label: 'Alta prioridad' },
    B: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Media prioridad' },
    C: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Baja prioridad' },
};

const CrmPage: React.FC<CrmPageProps> = ({ currentUser }) => {
    const { activeCompany } = useCompany();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const [gradeFilter, setGradeFilter] = useState('');
    const [showAnalytics, setShowAnalytics] = useState(false);

    // Modal State
    const [showLeadModal, setShowLeadModal] = useState(false);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [leadForm, setLeadForm] = useState({
        name: '', companyName: '', email: '', phone: '', status: 'NEW', source: '',
        notes: '', score: 0, estimatedValue: 0, assignedTo: ''
    });

    const [modalTab, setModalTab] = useState<'details' | 'quotes' | 'activities' | 'emails'>('details');
    const [leadActivities, setLeadActivities] = useState<LeadActivity[]>([]);
    const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
    const [newActivity, setNewActivity] = useState({ type: 'NOTE', content: '' });

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
            if (res.ok) setLeads(await res.json());
        } catch (error) { console.error("Error fetching leads:", error); }
        finally { setLoading(false); }
    };

    const fetchActivities = async (leadId: string) => {
        try {
            const res = await fetch(`${API_URL}/leads/${leadId}/activities`, {
                headers: { 'company-id': activeCompany?.id || '' }
            });
            if (res.ok) setLeadActivities(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchEmailTemplates = async () => {
        try {
            const res = await fetch(`${API_URL}/email-templates`, {
                headers: { 'company-id': activeCompany?.id || '' }
            });
            if (res.ok) setEmailTemplates(await res.json());
        } catch (e) { console.error(e); }
    };

    const handleLeadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeCompany) return;
        try {
            if (editingLead) {
                const res = await fetch(`${API_URL}/leads/${editingLead.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'company-id': activeCompany.id },
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
                    headers: { 'Content-Type': 'application/json', 'company-id': activeCompany.id },
                    body: JSON.stringify(leadForm)
                });
                if (res.ok) {
                    const created = await res.json();
                    setLeads([created, ...leads]);
                    setShowLeadModal(false);
                }
            }
        } catch (error) { console.error("Error saving lead:", error); }
    };

    const handleScoreUpdate = async (leadId: string, score: number) => {
        try {
            const res = await fetch(`${API_URL}/leads/${leadId}/score`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'company-id': activeCompany?.id || '' },
                body: JSON.stringify({ score })
            });
            if (res.ok) {
                const updated = await res.json();
                setLeads(leads.map(l => l.id === updated.id ? updated : l));
            }
        } catch (e) { console.error(e); }
    };

    const handleAddActivity = async () => {
        if (!editingLead || !newActivity.content) return;
        try {
            const res = await fetch(`${API_URL}/leads/${editingLead.id}/activities`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'company-id': activeCompany?.id || '' },
                body: JSON.stringify(newActivity)
            });
            if (res.ok) {
                const activity = await res.json();
                setLeadActivities([activity, ...leadActivities]);
                setNewActivity({ type: 'NOTE', content: '' });
                // Log to lead timeline
                setLeads(leads.map(l => l.id === editingLead.id ? { ...l, activities: [activity, ...(l.activities || [])] } : l));
            }
        } catch (e) { console.error(e); }
    };

    const handleSaveEmailTemplate = async (template: Partial<EmailTemplate>) => {
        try {
            const res = await fetch(`${API_URL}/email-templates${template.id ? `/${template.id}` : ''}`, {
                method: template.id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json', 'company-id': activeCompany?.id || '' },
                body: JSON.stringify(template)
            });
            if (res.ok) { fetchEmailTemplates(); }
        } catch (e) { console.error(e); }
    };

    const handleQuoteSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeCompany || !editingLead) return;
        try {
            const endpoint = editingQuote ? `${API_URL}/quotes/${editingQuote.id}` : `${API_URL}/quotes`;
            const method = editingQuote ? 'PUT' : 'POST';
            const payload = { ...quoteForm, leadId: editingLead.id };
            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json', 'company-id': activeCompany.id },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setShowQuoteForm(false);
                // Add activity for quote sent
                if (!editingQuote || quoteForm.status === 'SENT') {
                    await fetch(`${API_URL}/leads/${editingLead.id}/activities`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'company-id': activeCompany.id },
                        body: JSON.stringify({ type: 'QUOTE_SENT', content: `Cotización ${quoteForm.number} została wysłana` })
                    });
                }
                fetchData();
            }
        } catch (error) { console.error("Error saving quote:", error); }
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
                headers: { 'Content-Type': 'application/json', 'company-id': activeCompany.id },
                body: JSON.stringify(invoicePayload)
            });
            if (res.ok) {
                alert('Factura creada exitosamente como BORRADOR.');
                await fetch(`${API_URL}/quotes/${quote.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'company-id': activeCompany.id },
                    body: JSON.stringify({ ...quote, status: 'ACCEPTED' })
                });
                // Update lead status to WON
                if (editingLead) {
                    await fetch(`${API_URL}/leads/${editingLead.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'company-id': activeCompany.id },
                        body: JSON.stringify({ ...editingLead, status: 'WON' })
                    });
                }
                fetchData();
            }
        } catch (error) { console.error("Error converting quote:", error); }
    };

    const handleDeleteLead = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!activeCompany) return;
        if (!confirm('¿Seguro que deseas eliminar este Prospecto?')) return;
        try {
            const res = await fetch(`${API_URL}/leads/${id}`, {
                method: 'DELETE',
                headers: { 'company-id': activeCompany.id }
            });
            if (res.ok) setLeads(leads.filter(l => l.id !== id));
        } catch (error) { console.error("Error deleting lead:", error); }
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
                notes: lead.notes || '',
                score: lead.score || 0,
                estimatedValue: lead.estimatedValue || 0,
                assignedTo: lead.assignedTo || ''
            });
            fetchActivities(lead.id);
        } else {
            setEditingLead(null);
            setLeadForm({ name: '', companyName: '', email: '', phone: '', status: 'NEW', source: '', notes: '', score: 0, estimatedValue: 0, assignedTo: '' });
        }
        setModalTab('details');
        setShowQuoteForm(false);
        setShowLeadModal(true);
        fetchEmailTemplates();
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
                items: quote.items?.length ? quote.items.map((i: any) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice })) : [{ description: '', quantity: 1, unitPrice: 0 }]
            });
        } else {
            setEditingQuote(null);
            setQuoteForm({ number: `COT-${Math.floor(Math.random() * 10000)}`, date: new Date().toISOString().split('T')[0], validUntil: '', status: 'DRAFT', notes: '', items: [{ description: '', quantity: 1, unitPrice: 0 }] });
        }
        setShowQuoteForm(true);
    };

    const filteredLeads = useMemo(() => {
        return leads.filter(l => {
            const matchSearch = !searchTerm ||
                l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (l.companyName || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchStatus = !statusFilter || l.status === statusFilter;
            const matchGrade = !gradeFilter || l.grade === gradeFilter;
            return matchSearch && matchStatus && matchGrade;
        });
    }, [leads, searchTerm, statusFilter, gradeFilter]);

    // Analytics
    const analytics = useMemo(() => {
        const totalLeads = leads.length;
        const totalValue = leads.reduce((sum, l) => sum + (l.estimatedValue || 0), 0);
        const wonLeads = leads.filter(l => l.status === 'WON');
        const wonValue = wonLeads.reduce((sum, l) => sum + (l.estimatedValue || 0), 0);
        const avgScore = totalLeads > 0 ? Math.round(leads.reduce((sum, l) => sum + (l.score || 0), 0) / totalLeads) : 0;
        const stageDistribution = PIPELINE_STAGES.map(s => ({ ...s, count: leads.filter(l => l.status === s.id).length }));
        return { totalLeads, totalValue, wonLeads: wonLeads.length, wonValue, avgScore, stageDistribution };
    }, [leads]);

    // Drag & Drop
    const handleDragStart = (e: React.DragEvent, leadId: string) => e.dataTransfer.setData('leadId', leadId);
    const handleDragOver = (e: React.DragEvent) => e.preventDefault();

    const handleDrop = async (e: React.DragEvent, statusId: string) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData('leadId');
        if (!leadId || !activeCompany) return;
        const leadToUpdate = leads.find(l => l.id === leadId);
        if (leadToUpdate && leadToUpdate.status !== statusId) {
            setLeads(leads.map(l => l.id === leadId ? { ...l, status: statusId as any } : l));
            try {
                const res = await fetch(`${API_URL}/leads/${leadId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'company-id': activeCompany.id },
                    body: JSON.stringify({ ...leadToUpdate, status: statusId })
                });
                if (!res.ok) fetchData();
            } catch (err) { fetchData(); }
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 70) return 'text-green-600 bg-green-50';
        if (score >= 40) return 'text-amber-600 bg-amber-50';
        return 'text-slate-500 bg-slate-50';
    };

    if (!activeCompany) {
        return <div className="p-8 text-center text-slate-500">Seleccione una empresa para ver el CRM.</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center">
                        <Kanban className="mr-3 text-indigo-600" size={28} /> CRM y Cotizaciones
                    </h2>
                    <p className="text-slate-500 font-medium mt-1">Gestiona prospectos, ciclo de venta y cotizaciones.</p>
                </div>
                <div className="flex w-full md:w-auto gap-3">
                    <button onClick={() => setShowAnalytics(!showAnalytics)} className={`px-4 py-2 rounded-xl flex items-center space-x-2 transition-all ${showAnalytics ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        <BarChart3 size={18} /><span className="font-bold hidden md:inline">Analytics</span>
                    </button>
                    <button onClick={() => setShowFilters(!showFilters)} className={`px-4 py-2 rounded-xl flex items-center space-x-2 transition-all ${showFilters ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        <Filter size={18} /><span className="font-bold hidden md:inline">Filtros</span>
                    </button>
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="Buscar prospecto..." className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <button onClick={() => openModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-all shadow-sm active:scale-95 whitespace-nowrap">
                        <Plus size={18} /><span className="font-bold">Nuevo</span>
                    </button>
                </div>
            </div>

            {/* Analytics Panel */}
            {showAnalytics && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-4 rounded-2xl">
                        <div className="text-3xl font-black">{analytics.totalLeads}</div>
                        <div className="text-indigo-100 text-sm font-medium">Total Prospectos</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white p-4 rounded-2xl">
                        <div className="text-3xl font-black">{analytics.wonLeads}</div>
                        <div className="text-green-100 text-sm font-medium">Cerrados Ganados</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white p-4 rounded-2xl">
                        <div className="text-3xl font-black">${(analytics.totalValue / 1000000).toFixed(1)}M</div>
                        <div className="text-blue-100 text-sm font-medium">Valor Pipeline</div>
                    </div>
                    <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white p-4 rounded-2xl">
                        <div className="text-3xl font-black">${(analytics.wonValue / 1000000).toFixed(1)}M</div>
                        <div className="text-amber-100 text-sm font-medium">Valor Cerrado</div>
                    </div>
                    <div className="bg-gradient-to-br from-slate-600 to-slate-700 text-white p-4 rounded-2xl">
                        <div className="text-3xl font-black">{analytics.avgScore}</div>
                        <div className="text-slate-200 text-sm font-medium">Score Promedio</div>
                    </div>
                </div>
            )}

            {/* Filters */}
            {showFilters && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex gap-4 items-center">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mr-2">Estado:</label>
                        <select className="px-3 py-2 border border-slate-200 rounded-lg" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="">Todos</option>
                            {PIPELINE_STAGES.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mr-2">Grado:</label>
                        <select className="px-3 py-2 border border-slate-200 rounded-lg" value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
                            <option value="">Todos</option>
                            <option value="A">A - Alta</option>
                            <option value="B">B - Media</option>
                            <option value="C">C - Baja</option>
                        </select>
                    </div>
                    {(statusFilter || gradeFilter) && (
                        <button onClick={() => { setStatusFilter(''); setGradeFilter(''); }} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center">
                            <X size={14} className="mr-1" /> Limpiar
                        </button>
                    )}
                </div>
            )}

            {/* Pipeline Kanban */}
            {loading ? (
                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>
            ) : (
                <div className="flex overflow-x-auto pb-4 gap-4 snap-x">
                    {PIPELINE_STAGES.map(stage => {
                        const stageLeads = filteredLeads.filter(l => l.status === stage.id);
                        return (
                            <div key={stage.id} className="bg-slate-50/80 rounded-2xl p-3 min-w-[260px] max-w-[260px] w-full flex-shrink-0 snap-center flex flex-col border border-slate-100" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, stage.id)}>
                                <div className="flex justify-between items-center mb-3 px-2">
                                    <div className="flex items-center space-x-2">
                                        <stage.icon size={14} className="text-slate-500" />
                                        <h3 className={`text-xs font-black uppercase tracking-wider ${stage.color.split(' ')[1]}`}>{stage.title}</h3>
                                    </div>
                                    <span className="text-slate-400 font-bold text-xs bg-white w-6 h-6 rounded-full flex items-center justify-center shadow-sm">{stageLeads.length}</span>
                                </div>
                                <div className="flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                                    {stageLeads.map(lead => (
                                        <div key={lead.id} draggable onDragStart={(e) => handleDragStart(e, lead.id)} className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:border-indigo-300 hover:shadow-md transition-all group" onClick={() => openModal(lead)}>
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-slate-800 text-sm truncate pr-2">{lead.name}</h4>
                                                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={(e) => { e.stopPropagation(); openModal(lead); }} className="text-slate-400 hover:text-blue-500 p-0.5"><Edit2 size={12} /></button>
                                                    <button onClick={(e) => handleDeleteLead(lead.id, e)} className="text-slate-400 hover:text-red-500 p-0.5"><Trash2 size={12} /></button>
                                                </div>
                                            </div>
                                            {lead.companyName && <div className="flex items-center text-xs text-slate-500 mb-1 truncate"><Building size={10} className="mr-1 flex-shrink-0" />{lead.companyName}</div>}
                                            <div className="flex items-center text-xs text-slate-500 mb-2"><Phone size={10} className="mr-1 flex-shrink-0" />{lead.phone || 'Sin número'}</div>
                                            {/* Score bar */}
                                            <div className="mb-2">
                                                <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                                                    <span>Score</span>
                                                    <span className={`font-bold ${getScoreColor(lead.score || 0).split(' ')[0]}`}>{lead.score || 0}</span>
                                                </div>
                                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full transition-all ${(lead.score || 0) >= 70 ? 'bg-green-500' : (lead.score || 0) >= 40 ? 'bg-amber-500' : 'bg-slate-400'}`} style={{ width: `${lead.score || 0}%` }} />
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                {lead.grade && GRADE_COLORS[lead.grade] && (
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${GRADE_COLORS[lead.grade].bg} ${GRADE_COLORS[lead.grade].text}`}>{lead.grade}</span>
                                                )}
                                                {(lead.estimatedValue || 0) > 0 && (
                                                    <span className="text-[10px] font-bold text-indigo-600">${((lead.estimatedValue || 0) / 1000000).toFixed(1)}M</span>
                                                )}
                                                {lead.quotes && lead.quotes.length > 0 && (
                                                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full flex items-center"><FileText size={8} className="mr-1" />{lead.quotes.length}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {stageLeads.length === 0 && (
                                        <div className="flex items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-medium text-center">Sin prospectos</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Lead Modal */}
            {showLeadModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-xl font-black text-slate-800">{editingLead ? editingLead.name : 'Nuevo Prospecto'}</h3>
                                {editingLead && (
                                    <div className="flex space-x-4 mt-3">
                                        {['details', 'quotes', 'activities', 'emails'].map(tab => (
                                            <button key={tab} onClick={() => { setModalTab(tab as any); if (tab === 'emails') fetchEmailTemplates(); }} className={`text-sm font-bold pb-2 border-b-2 transition-colors ${modalTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                                                {tab === 'details' ? 'Detalles' : tab === 'quotes' ? `Cotizaciones (${editingLead.quotes?.length || 0})` : tab === 'activities' ? 'Actividades' : 'Plantillas Email'}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button onClick={() => setShowLeadModal(false)} className="text-slate-400 hover:text-slate-600 -mt-6"><XCircle size={24} /></button>
                        </div>
                        <div className="overflow-y-auto p-8 custom-scrollbar flex-1">
                            {modalTab === 'details' ? (
                                <form onSubmit={handleLeadSubmit}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nombre Contacto *</label>
                                            <input type="text" required className="w-full mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-medium" value={leadForm.name} onChange={e => setLeadForm({ ...leadForm, name: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Empresa</label>
                                            <input type="text" className="w-full mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-medium" value={leadForm.companyName} onChange={e => setLeadForm({ ...leadForm, companyName: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Teléfono</label>
                                            <input type="tel" className="w-full mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-medium" value={leadForm.phone} onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Email</label>
                                            <input type="email" className="w-full mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-medium" value={leadForm.email} onChange={e => setLeadForm({ ...leadForm, email: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Origen / Fuente</label>
                                            <input type="text" placeholder="Ej: Web, LinkedIn, Recomendación" className="w-full mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-medium" value={leadForm.source} onChange={e => setLeadForm({ ...leadForm, source: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Etapa</label>
                                            <select className="w-full mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={leadForm.status} onChange={e => setLeadForm({ ...leadForm, status: e.target.value })}>
                                                {PIPELINE_STAGES.filter(s => s.id !== 'LOST').map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                                                <option value="LOST">Perdidos</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Valor Estimado (CLP)</label>
                                            <input type="number" min="0" className="w-full mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-medium" value={leadForm.estimatedValue} onChange={e => setLeadForm({ ...leadForm, estimatedValue: Number(e.target.value) })} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Score (0-100)</label>
                                            <div className="flex items-center space-x-3 mt-2">
                                                <input type="range" min="0" max="100" className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" value={leadForm.score} onChange={e => setLeadForm({ ...leadForm, score: Number(e.target.value) })} />
                                                <span className={`w-12 text-center font-black text-sm px-2 py-1 rounded-lg ${getScoreColor(leadForm.score)}`}>{leadForm.score}</span>
                                            </div>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Notas</label>
                                            <textarea className="w-full mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-medium min-h-[80px] resize-none" value={leadForm.notes} onChange={e => setLeadForm({ ...leadForm, notes: e.target.value })}></textarea>
                                        </div>
                                    </div>
                                    <div className="mt-8 flex justify-end space-x-3">
                                        <button type="button" onClick={() => setShowLeadModal(false)} className="px-6 py-3 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                                        <button type="submit" className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95">{editingLead ? 'Guardar Cambios' : 'Crear Prospecto'}</button>
                                    </div>
                                </form>
                            ) : modalTab === 'quotes' ? (
                                !showQuoteForm ? (
                                    <>
                                        <div className="flex justify-between items-center mb-6">
                                            <h4 className="font-bold text-slate-800">Cotizaciones</h4>
                                            <button onClick={() => openQuoteForm()} className="flex items-center space-x-1 text-sm bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-200"><Plus size={14} /><span>Nueva Cotización</span></button>
                                        </div>
                                        {editingLead?.quotes && editingLead.quotes.length > 0 ? (
                                            <div className="space-y-3">
                                                {editingLead.quotes.map((q: any) => (
                                                    <div key={q.id} className="border border-slate-200 p-4 rounded-xl flex items-center justify-between hover:shadow-sm">
                                                        <div>
                                                            <div className="flex items-center space-x-3">
                                                                <h5 className="font-bold text-slate-800">{q.number}</h5>
                                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${q.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' : q.status === 'REJECTED' ? 'bg-red-100 text-red-700' : q.status === 'SENT' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>{q.status}</span>
                                                            </div>
                                                            <div className="text-xs text-slate-500 mt-1 flex space-x-4">
                                                                <span>Fecha: {new Date(q.date).toLocaleDateString()}</span>
                                                                <span className="font-bold font-mono">Total: ${(q.totalAmount || 0).toLocaleString('es-CL')}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex space-x-2">
                                                            {q.status !== 'ACCEPTED' && (
                                                                <button onClick={() => handleConvertToInvoice(q)} className="text-xs font-bold bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg">Convertir a Factura</button>
                                                            )}
                                                            <button onClick={() => openQuoteForm(q)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><Edit2 size={16} /></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center p-8 bg-slate-50 rounded-xl text-slate-500 text-sm">No hay cotizaciones registradas.</div>
                                        )}
                                    </>
                                ) : (
                                    <form onSubmit={handleQuoteSubmit} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                        <div className="flex justify-between items-center mb-6">
                                            <h4 className="font-bold text-slate-800">{editingQuote ? 'Editar Cotización' : 'Nueva Cotización'}</h4>
                                            <button type="button" onClick={() => setShowQuoteForm(false)} className="text-slate-400 hover:text-slate-600"><XCircle size={20} /></button>
                                        </div>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                            <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Número</label><input type="text" required className="w-full mt-1 p-2 bg-white rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium" value={quoteForm.number} onChange={e => setQuoteForm({ ...quoteForm, number: e.target.value })} /></div>
                                            <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Fecha</label><input type="date" required className="w-full mt-1 p-2 bg-white rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium" value={quoteForm.date} onChange={e => setQuoteForm({ ...quoteForm, date: e.target.value })} /></div>
                                            <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Válida Hasta</label><input type="date" className="w-full mt-1 p-2 bg-white rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium" value={quoteForm.validUntil} onChange={e => setQuoteForm({ ...quoteForm, validUntil: e.target.value })} /></div>
                                            <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Estado</label><select className="w-full mt-1 p-2 bg-white rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold" value={quoteForm.status} onChange={e => setQuoteForm({ ...quoteForm, status: e.target.value })}><option value="DRAFT">Borrador</option><option value="SENT">Enviada</option><option value="ACCEPTED">Aceptada</option><option value="REJECTED">Rechazada</option></select></div>
                                        </div>
                                        <div className="mb-6">
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Ítems</label>
                                                <button type="button" onClick={() => setQuoteForm({ ...quoteForm, items: [...quoteForm.items, { description: '', quantity: 1, unitPrice: 0 }] })} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center"><Plus size={12} className="mr-1" /> Agregar</button>
                                            </div>
                                            <div className="space-y-2">
                                                {quoteForm.items.map((item, idx) => (
                                                    <div key={idx} className="flex space-x-2 items-center">
                                                        <input type="text" placeholder="Descripción" required className="flex-1 p-2 bg-white rounded-lg border border-slate-200 text-sm" value={item.description} onChange={(e) => { const newItems = [...quoteForm.items]; newItems[idx].description = e.target.value; setQuoteForm({ ...quoteForm, items: newItems }); }} />
                                                        <input type="number" placeholder="Cant" required min="0.01" step="0.01" className="w-20 p-2 bg-white rounded-lg border border-slate-200 text-sm text-center" value={item.quantity} onChange={(e) => { const newItems = [...quoteForm.items]; newItems[idx].quantity = Number(e.target.value); setQuoteForm({ ...quoteForm, items: newItems }); }} />
                                                        <input type="number" placeholder="Precio" required min="0" className="w-28 p-2 bg-white rounded-lg border border-slate-200 text-sm text-right" value={item.unitPrice} onChange={(e) => { const newItems = [...quoteForm.items]; newItems[idx].unitPrice = Number(e.target.value); setQuoteForm({ ...quoteForm, items: newItems }); }} />
                                                        <span className="w-28 font-mono font-bold text-sm text-right text-slate-600">${(item.quantity * item.unitPrice).toLocaleString('es-CL')}</span>
                                                        <button type="button" onClick={() => { const newItems = quoteForm.items.filter((_, i) => i !== idx); setQuoteForm({ ...quoteForm, items: newItems }); }} className="text-slate-400 hover:text-red-500 p-1"><Trash2 size={16} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-4 flex justify-end">
                                                <div className="text-right bg-white p-3 rounded-xl border border-slate-200 inline-block min-w-[200px]">
                                                    <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Neto:</span><span className="font-mono">${quoteForm.items.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0).toLocaleString('es-CL')}</span></div>
                                                    <div className="flex justify-between font-bold text-slate-800 text-sm"><span>Total (+19%):</span><span className="font-mono">${Math.round(quoteForm.items.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0) * 1.19).toLocaleString('es-CL')}</span></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-slate-200">
                                            <button type="button" onClick={() => setShowQuoteForm(false)} className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
                                            <button type="submit" className="px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition-transform active:scale-95">{editingQuote ? 'Actualizar' : 'Guardar'}</button>
                                        </div>
                                    </form>
                                )
                            ) : modalTab === 'activities' ? (
                                <div className="space-y-6">
                                    {/* Add activity */}
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <h4 className="font-medium text-slate-700 mb-3">Agregar Actividad</h4>
                                        <div className="flex gap-2 mb-3">
                                            {['CALL', 'MEETING', 'EMAIL', 'NOTE'].map(type => (
                                                <button key={type} onClick={() => setNewActivity({ ...newActivity, type })} className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${newActivity.type === type ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>{type}</button>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <textarea placeholder="Describe la actividad..." className="flex-1 p-3 bg-white rounded-xl border border-slate-200 text-sm resize-none" rows={2} value={newActivity.content} onChange={e => setNewActivity({ ...newActivity, content: e.target.value })} />
                                            <button onClick={handleAddActivity} disabled={!newActivity.content} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold disabled:opacity-50 self-end">Agregar</button>
                                        </div>
                                    </div>
                                    {/* Activity timeline */}
                                    <div className="space-y-3">
                                        {(leadActivities.length > 0 ? leadActivities : editingLead?.activities || []).map(activity => {
                                            const Icon = ACTIVITY_ICONS[activity.type] || MessageSquare;
                                            return (
                                                <div key={activity.id} className="flex items-start space-x-3 p-3 bg-white rounded-xl border border-slate-100">
                                                    <div className="p-2 bg-indigo-50 rounded-lg"><Icon size={16} className="text-indigo-600" /></div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start">
                                                            <span className="text-xs font-bold text-slate-500 uppercase">{activity.type.replace('_', ' ')}</span>
                                                            <span className="text-xs text-slate-400">{activity.createdAt ? new Date(activity.createdAt).toLocaleString('es-CL') : ''}</span>
                                                        </div>
                                                        <p className="text-sm text-slate-700 mt-1">{activity.content}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {(leadActivities.length === 0 && (!editingLead?.activities || editingLead.activities.length === 0)) && (
                                            <div className="text-center py-8 text-slate-400">No hay actividades registradas</div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                /* Email Templates */
                                <div className="space-y-4">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <h4 className="font-medium text-slate-700 mb-3">Nueva Plantilla</h4>
                                        <EmailTemplateForm onSave={handleSaveEmailTemplate} />
                                    </div>
                                    <div className="space-y-3">
                                        {emailTemplates.map(t => (
                                            <div key={t.id} className="bg-white border border-slate-200 p-4 rounded-xl">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h5 className="font-bold text-slate-700">{t.name}</h5>
                                                    <button onClick={() => handleSaveEmailTemplate({ ...t, name: prompt('Nombre:', t.name) || t.name, subject: prompt('Asunto:', t.subject) || t.subject, body: prompt('Cuerpo:', t.body) || t.body } as any)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Editar</button>
                                                </div>
                                                <div className="text-xs text-slate-500 font-medium mb-1">Asunto: {t.subject}</div>
                                                <p className="text-sm text-slate-600 whitespace-pre-wrap">{t.body}</p>
                                            </div>
                                        ))}
                                        {emailTemplates.length === 0 && <div className="text-center py-8 text-slate-400">No hay plantillas guardadas</div>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Email Template Form Component
const EmailTemplateForm: React.FC<{ onSave: (t: Partial<EmailTemplate>) => Promise<void>; initial?: Partial<EmailTemplate> }> = ({ onSave, initial }) => {
    const [name, setName] = useState(initial?.name || '');
    const [subject, setSubject] = useState(initial?.subject || '');
    const [body, setBody] = useState(initial?.body || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!name || !subject || !body) return;
        setSaving(true);
        await onSave({ name, subject, body });
        setSaving(false);
        setName(''); setSubject(''); setBody('');
    };

    return (
        <div className="space-y-3">
            <input type="text" placeholder="Nombre de la plantilla" className="w-full p-2 bg-white rounded-lg border border-slate-200 text-sm" value={name} onChange={e => setName(e.target.value)} />
            <input type="text" placeholder="Asunto del email" className="w-full p-2 bg-white rounded-lg border border-slate-200 text-sm" value={subject} onChange={e => setSubject(e.target.value)} />
            <textarea placeholder="Cuerpo del email (puedes usar {{nombre}}, {{empresa}} como variables)..." className="w-full p-2 bg-white rounded-lg border border-slate-200 text-sm resize-none" rows={4} value={body} onChange={e => setBody(e.target.value)} />
            <button onClick={handleSave} disabled={saving || !name || !subject || !body} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar Plantilla'}</button>
        </div>
    );
};

export default CrmPage;
