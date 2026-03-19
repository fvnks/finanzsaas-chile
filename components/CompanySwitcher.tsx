
import React from 'react';
import { useCompany } from './CompanyContext';
import { Building2, Check, ChevronDown } from 'lucide-react';

const CompanySwitcher: React.FC = () => {
    const { activeCompany, availableCompanies, setActiveCompany } = useCompany();
    const [isOpen, setIsOpen] = React.useState(false);

    if (!activeCompany) return null;

    return (
        <div className="relative z-[80]">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center space-x-3 rounded-xl border border-slate-800 bg-[#0b1628] px-3 py-3 text-left shadow-sm transition-colors hover:bg-[#122038]"
            >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">
                    {activeCompany.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{activeCompany.name}</p>
                    <p className="truncate text-xs font-medium text-slate-200">Multiempresa</p>
                </div>
                <ChevronDown size={16} className="text-slate-200" />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute left-0 top-full z-[90] mt-2 w-full overflow-hidden rounded-2xl border border-slate-950 bg-[#08111f] opacity-100 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.75)]">
                        <div className="p-2">
                            <p className="px-2 py-1 text-xs font-bold uppercase text-slate-400">Mis Empresas</p>
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
                                    className={`flex w-full items-center space-x-3 rounded-xl p-3 transition-colors ${activeCompany.id === company.id
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-[#0d1726] text-slate-100 hover:bg-[#142235]'
                                        }`}
                                >
                                    <Building2 size={18} />
                                    <span className="flex-1 text-sm text-left truncate">{company.name}</span>
                                    {activeCompany.id === company.id && <Check size={16} />}
                                </button>
                            ))}
                        </div>
                        <div className="border-t border-slate-800 bg-[#0d1726] p-2">
                            <button className="w-full py-1 text-center text-xs text-slate-300 transition-colors hover:text-white">
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
