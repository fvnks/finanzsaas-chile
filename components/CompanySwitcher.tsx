
import React from 'react';
import { useCompany } from './CompanyContext';
import { Building2, Check, ChevronDown } from 'lucide-react';

const CompanySwitcher: React.FC = () => {
    const { activeCompany, availableCompanies, setActiveCompany } = useCompany();
    const [isOpen, setIsOpen] = React.useState(false);

    if (!activeCompany) return null;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 w-full p-2 rounded-lg hover:bg-white/5 transition-colors text-left"
            >
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shrink-0">
                    {activeCompany.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{activeCompany.name}</p>
                    <p className="text-xs text-slate-400 truncate">Multiempresa</p>
                </div>
                <ChevronDown size={16} className="text-slate-400" />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full left-0 w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                        <div className="p-2">
                            <p className="text-xs font-bold text-slate-500 uppercase px-2 py-1">Mis Empresas</p>
                            {availableCompanies.map(company => (
                                <button
                                    key={company.id}
                                    onClick={() => {
                                        setActiveCompany(company);
                                        setIsOpen(false);
                                        // Force reload to refresh data with new company context
                                        // Ideally we should use context to trigger refresh, but standard reload works for now ensures isolation
                                        setTimeout(() => window.location.reload(), 100);
                                    }}
                                    className={`w-full flex items-center space-x-3 p-2 rounded-lg transition-colors ${activeCompany.id === company.id
                                            ? 'bg-blue-600/20 text-blue-400'
                                            : 'hover:bg-white/5 text-slate-300'
                                        }`}
                                >
                                    <Building2 size={18} />
                                    <span className="flex-1 text-sm text-left truncate">{company.name}</span>
                                    {activeCompany.id === company.id && <Check size={16} />}
                                </button>
                            ))}
                        </div>
                        <div className="border-t border-slate-700 p-2 bg-slate-900/50">
                            <button className="w-full text-xs text-center text-slate-500 hover:text-slate-300 py-1 transition-colors">
                                Gestionar Empresas
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default CompanySwitcher;
