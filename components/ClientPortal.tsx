import React, { useEffect, useState } from 'react';
import { API_URL } from '../src/config.ts';
import { FileText, Download, Calendar, ArrowUpRight, LogOut, Package } from 'lucide-react';

interface ClientPortalProps {
    token: string;
}

const ClientPortal: React.FC<ClientPortalProps> = ({ token }) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'dashboard' | 'invoices' | 'documents'>('dashboard');

    useEffect(() => {
        const fetchDashboard = async () => {
             try {
                 const res = await fetch(`${API_URL}/portal/${token}/dashboard`);
                 const result = await res.json();
                 if (res.ok) {
                     setData(result);
                     // Aplicar color primario de la empresa
                     if (result.company?.primaryColor) {
                          document.documentElement.style.setProperty('--primary-color', result.company.primaryColor);
                     }
                 } else {
                     setError(result.error || 'Acceso denegado');
                 }
             } catch (err: any) {
                 setError('Error de conexión con el servidor');
             } finally {
                 setLoading(false);
             }
        };

        fetchDashboard();
    }, [token]);

    const handleExit = () => {
        // Remover el parámetro de la URL para "salir"
        window.location.href = window.location.pathname;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
                <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl w-full max-w-md border border-white/20 shadow-2xl text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">Error de Acceso</h2>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <button onClick={handleExit} className="bg-primary hover:opacity-90 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg">
                        Volver al Inicio
                    </button>
                </div>
            </div>
        );
    }

    const { client, company, invoices = [], documents = [] } = data || {};

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
            {/* Header */}
            <header className="bg-slate-900/80 backdrop-blur-md border-b border-white/5 py-4 px-6 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center space-x-4">
                    {company?.logoUrl ? (
                         <img src={company.logoUrl} alt={company.name} className="h-10 w-auto rounded-lg object-contain" />
                    ) : (
                         <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center font-bold text-white text-xl">
                             {company?.name?.[0].toUpperCase()}
                         </div>
                    )}
                    <div>
                        <h1 className="text-xl font-bold text-white">{company?.name}</h1>
                        <p className="text-xs text-slate-400">Portal de Clientes</p>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <span className="text-sm text-slate-300 hidden sm:block">Hola, {client?.name}</span>
                    <button onClick={handleExit} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors" title="Salir del Portal">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            {/* Navigation Tabs */}
            <nav className="bg-slate-900 px-6 py-2 border-b border-white/5 flex space-x-2">
                <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'dashboard' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'}`}>
                    Resumen
                </button>
                <button onClick={() => setActiveTab('invoices')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'invoices' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'}`}>
                    Facturas
                </button>
                <button onClick={() => setActiveTab('documents')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'documents' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'}`}>
                    Documentos
                </button>
            </nav>

            {/* Main Content */}
            <main className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
                {activeTab === 'dashboard' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Summary Widget 1: Invoices */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-slate-400 text-sm">Facturas Recientes</span>
                                <div className="p-2 rounded-xl bg-primary/20 text-primary">
                                    <FileText size={20} />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-white">{invoices.length}</div>
                            <button onClick={() => setActiveTab('invoices')} className="mt-4 text-xs font-semibold text-primary flex items-center space-x-1 hover:underline">
                                <span>Ver todas</span>
                                <ArrowUpRight size={14} />
                            </button>
                        </div>

                         {/* Summary Widget 2: Documents */}
                         <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-slate-400 text-sm">Documentos Recibidos</span>
                                <div className="p-2 rounded-xl bg-primary/20 text-primary">
                                    <Package size={20} />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-white">{documents.length}</div>
                            <button onClick={() => setActiveTab('documents')} className="mt-4 text-xs font-semibold text-primary flex items-center space-x-1 hover:underline">
                                <span>Ver todos</span>
                                <ArrowUpRight size={14} />
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'invoices' && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md overflow-hidden">
                        <h2 className="text-xl font-bold text-white mb-6">Tus Facturas</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="text-xs uppercase text-slate-400 border-b border-white/5">
                                    <tr>
                                        <th className="py-3 px-4">Número</th>
                                        <th className="py-3 px-4">Fecha</th>
                                        <th className="py-3 px-4">Total</th>
                                        <th className="py-3 px-4">Estado</th>
                                        <th className="py-3 px-4 text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {invoices.map((inv: any) => (
                                        <tr key={inv.id} className="hover:bg-white/5 transition-colors">
                                            <td className="py-4 px-4 font-medium text-white">{inv.number}</td>
                                            <td className="py-4 px-4 text-slate-300">
                                                <div className="flex items-center space-x-1">
                                                    <Calendar size={14} className="text-slate-500" />
                                                    <span>{new Date(inv.date).toLocaleDateString()}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 font-semibold text-white">
                                                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: inv.currency || 'CLP' }).format(inv.totalAmount)}
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                                                    inv.paymentStatus === 'PAID' ? 'bg-green-500/20 text-green-400' :
                                                    inv.paymentStatus === 'PARTIAL' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                                                }`}>
                                                    {inv.paymentStatus === 'PAID' ? 'Pagado' : inv.paymentStatus === 'PARTIAL' ? 'Parcial' : 'Pendiente'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <button className="p-2 rounded-lg bg-white/5 hover:bg-primary hover:text-white text-slate-400 transition-all flex items-center space-x-1 float-right" title="Descargar PDF">
                                                    <Download size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {invoices.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-6 text-center text-slate-500">No hay facturas registradas.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'documents' && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md overflow-hidden">
                        <h2 className="text-xl font-bold text-white mb-6">Tus Documentos</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                            {documents.map((doc: any) => (
                                <div key={doc.id} className="bg-slate-900 border border-white/5 rounded-xl p-4 flex flex-col justify-between hover:border-primary/40 transition-all group">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all">
                                            <FileText size={24} />
                                        </div>
                                        <span className="text-xs text-slate-500 uppercase">{doc.type}</span>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-semibold text-white mb-1 truncate">{doc.name}</h3>
                                        <p className="text-xs text-slate-500">Subido el {new Date(doc.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="mt-4 w-full bg-white/5 group-hover:bg-primary/20 text-slate-300 group-hover:text-primary font-bold py-2 rounded-lg transition-all flex items-center justify-center space-x-1">
                                        <Download size={16} />
                                        <span>Descargar</span>
                                    </a>
                                </div>
                            ))}
                             {documents.length === 0 && (
                                <div className="col-span-full py-6 text-center text-slate-500">No hay documentos disponibles.</div>
                             )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ClientPortal;
