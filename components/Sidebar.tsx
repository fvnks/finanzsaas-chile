import React from 'react';
import {
  LayoutDashboard,
  Users,
  FileText,
  Briefcase,
  Target,
  LogOut,
  Sparkles,
  HardHat,
  ChevronDown,
  ChevronRight,
  Map,
  TrendingUp,
  Wrench,
  Package,
  PhoneCall,
  Box,
  Layers,
  CreditCard,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
  Building2
} from 'lucide-react';
import { User, UserRole } from '../types';
import CompanySwitcher from './CompanySwitcher.tsx';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User | null;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, user, onLogout }) => {
  const [expandedGroups, setExpandedGroups] = React.useState<string[]>(['obras', 'finanzas', 'directorio', 'admin']);
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupId) ? prev.filter(g => g !== groupId) : [...prev, groupId]
    );
  };

  const groups = [
    {
      id: 'obras',
      label: 'Gestión de Obras',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'projects', label: 'Proyectos', icon: Briefcase },
        { id: 'tools', label: 'Herramientas', icon: Wrench },
        { id: 'deliveries', label: 'Entregas', icon: Package },
        { id: 'reports', label: 'Reportes Diarios', icon: FileText },
        { id: 'docControl', label: 'Control Documental', icon: FileText },
        { id: 'planos', label: 'Planos y Cuelgues', icon: Map },
      ]
    },
    {
      id: 'ventas',
      label: 'Ventas y CRM',
      items: [
        { id: 'crm', label: 'CRM y Cotizaciones', icon: PhoneCall },
      ]
    },
    {
      id: 'finanzas',
      label: 'Finanzas',
      items: [
        { id: 'invoices', label: 'Facturas', icon: FileText },
        { id: 'costCenters', label: 'Centros de Costo', icon: Target },
        { id: 'expenses', label: 'Gastos', icon: TrendingUp },
        { id: 'bankAccounts', label: 'Tesorería', icon: CreditCard },
        { id: 'cashFlow', label: 'Forecast de Caja', icon: BarChart3 },
      ]
    },
    {
      id: 'inventario',
      label: 'Inventario',
      items: [
        { id: 'products', label: 'Catálogo', icon: Layers },
        { id: 'warehouses', label: 'Bodegas y Stock', icon: Box },
      ]
    },
    {
      id: 'directorio',
      label: 'Directorio',
      items: [
        { id: 'clients', label: 'Clientes', icon: Users },
        { id: 'workers', label: 'Trabajadores', icon: HardHat },
      ]
    },
    {
      id: 'admin',
      label: 'Administración',
      items: [
        { id: 'admin', label: 'Admin y Config', icon: Sparkles },
      ]
    }
  ];

  const getAllowedGroups = () => {
    if (!user) return [];

    const activeCompany = user.companies?.find(c => c.id === user.activeCompanyId);
    const activeModules = activeCompany?.modules || ['INVOICING', 'PROJECTS', 'INVENTORY', 'TOOLS', 'HR'];
    const allowed = user.role === UserRole.ADMIN ? null : (user.allowedSections || ['dashboard']);

    return groups.map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (item.id === 'crm' && !(activeModules.includes('INVOICING') || activeModules.includes('CRM'))) return false;
        if (item.id === 'invoices' && !activeModules.includes('INVOICING')) return false;
        if (item.id === 'projects' && !activeModules.includes('PROJECTS')) return false;
        if (item.id === 'tools' && !activeModules.includes('TOOLS')) return false;
        if (item.id === 'deliveries' && !activeModules.includes('HR')) return false;
        if (item.id === 'workers' && !activeModules.includes('HR')) return false;
        if (item.id === 'products' && !activeModules.includes('INVENTORY')) return false;
        if (item.id === 'warehouses' && !activeModules.includes('INVENTORY')) return false;
        if (item.id === 'costCenters' && !activeModules.includes('INVOICING')) return false;
        if (allowed && !allowed.includes(item.id)) return false;
        return true;
      })
    })).filter(group => group.items.length > 0);
  };

  const visibleGroups = getAllowedGroups();

  return (
    <aside className={`sticky top-0 self-start relative flex h-screen shrink-0 flex-col overflow-visible border-r border-slate-800 bg-[#0b1220] text-white transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-72'}`}>
      <div className="relative z-[70] border-b border-slate-800 px-3 py-3">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} gap-3`}>
          {!isCollapsed ? (
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-sky-300">
                  <Building2 size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Workspace</p>
                  <h1 className="truncate text-base font-semibold text-white">Vertikal Finanzas</h1>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800">
              <span className="text-sm font-semibold text-sky-300">V</span>
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(prev => !prev)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 transition hover:bg-slate-800 hover:text-white"
            aria-label={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {!isCollapsed && (
          <div className="mt-3 rounded-xl border border-slate-800 bg-[#091423] p-2">
            <CompanySwitcher />
          </div>
        )}
      </div>

      <nav className="relative flex-1 space-y-4 overflow-y-auto px-2 py-4">
        {visibleGroups.map(group => (
          <div key={group.id}>
            {!isCollapsed && (
              <button
                onClick={() => toggleGroup(group.id)}
                className="mb-1 flex w-full items-center justify-between px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 transition-colors hover:text-slate-200"
              >
                <span className="truncate">{group.label}</span>
                {expandedGroups.includes(group.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            )}

            <div className={`space-y-1 ${!isCollapsed && expandedGroups.includes(group.id) ? 'block' : isCollapsed ? 'block' : 'hidden'}`}>
              {group.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`group w-full rounded-lg transition-colors ${activeTab === item.id
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                    }`}
                >
                  <div className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5`}>
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${activeTab === item.id ? 'bg-slate-700 text-sky-300' : 'bg-slate-900 text-slate-300 group-hover:bg-slate-800 group-hover:text-white'}`}>
                      <item.icon size={16} strokeWidth={2.1} />
                    </div>
                    {!isCollapsed && (
                      <div className="min-w-0 text-left">
                        <div className="truncate text-sm font-medium">{item.label}</div>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="relative border-t border-slate-800 p-3">
        <div className={`mb-4 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-1`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-sm font-semibold text-slate-100">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          {!isCollapsed && (
            <div className="min-w-0 overflow-hidden">
              <p className="truncate text-sm font-medium text-white">{user?.name}</p>
              <p className="truncate text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                {user?.role === UserRole.ADMIN ? 'Administrador' :
                  user?.role === UserRole.SUPERVISOR ? 'Supervisor' :
                    user?.role === UserRole.WORKER ? 'Trabajador' : 'Usuario'}
              </p>
            </div>
          )}
        </div>
        <button
          onClick={onLogout}
          title={isCollapsed ? 'Cerrar sesión' : undefined}
          className={`w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-slate-300 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-200 ${isCollapsed ? 'flex justify-center' : 'flex items-center gap-3'}`}
        >
          <LogOut size={isCollapsed ? 20 : 18} />
          {!isCollapsed && <span className="text-sm font-medium">Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
