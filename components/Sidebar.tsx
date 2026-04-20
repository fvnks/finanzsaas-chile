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
import { useCompany } from './CompanyContext';
import CompanySwitcher from './CompanySwitcher.tsx';
import { canAccessTab } from '../src/utils/navigationPermissions';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User | null;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, user, onLogout }) => {
  const [expandedGroups, setExpandedGroups] = React.useState<string[]>(['obras', 'finanzas', 'directorio', 'admin']);
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const { activeCompany } = useCompany();

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupId) ? prev.filter(g => g !== groupId) : [...prev, groupId]
    );
  };

  const groups = [
    {
      id: 'obras',
      label: 'Gestion de Obras',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'projects', label: 'Proyectos', icon: Briefcase },
        { id: 'tools', label: 'Herramientas', icon: Wrench },
        { id: 'deliveries', label: 'Entregas', icon: Package },
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
        { id: 'purchaseOrders', label: 'Ordenes de Compra', icon: CreditCard },
        { id: 'costCenters', label: 'Centros de Costo', icon: Target },
        { id: 'expenses', label: 'Gastos', icon: TrendingUp },
        { id: 'cashFlow', label: 'Forecast de Caja', icon: BarChart3 },
      ]
    },
    {
      id: 'inventario',
      label: 'Inventario',
      items: [
        { id: 'products', label: 'Catalogo', icon: Layers },
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
      label: 'Administracion',
      items: [
        { id: 'admin', label: 'Admin y Config', icon: Sparkles },
      ]
    }
  ];

  const visibleGroups = user
    ? groups
        .map(group => ({
          ...group,
          items: group.items.filter(item => canAccessTab(user, activeCompany, item.id))
        }))
        .filter(group => group.items.length > 0)
    : [];

  return (
    <aside className={`sticky top-0 self-start relative flex h-screen shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[#08101a] text-white transition-all duration-300 ${isCollapsed ? 'w-24' : 'w-80'}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_22%),radial-gradient(circle_at_80%_18%,rgba(37,99,235,0.18),transparent_18%),linear-gradient(180deg,rgba(15,23,42,0.2),rgba(2,6,23,0))]" />

      <div className="relative z-10 border-b border-white/10 px-4 py-4">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} gap-3`}>
          {!isCollapsed ? (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-sky-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur">
                  <Building2 size={18} strokeWidth={2.15} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-slate-500">Workspace</p>
                  <h1 className="truncate text-lg font-semibold tracking-tight text-white">Vertikal Finanzas</h1>
                  <p className="truncate text-xs text-slate-400">Operacion, caja y terreno en una sola vista.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/8">
              <span className="text-sm font-semibold text-sky-200">V</span>
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(prev => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/6 text-slate-300 transition hover:bg-white/10 hover:text-white"
            aria-label={isCollapsed ? 'Expandir menu' : 'Colapsar menu'}
          >
            {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {!isCollapsed && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/6 p-2 backdrop-blur-xl">
            <CompanySwitcher />
          </div>
        )}
      </div>

      <nav className="relative z-10 flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {visibleGroups.map(group => (
          <div key={group.id}>
            {!isCollapsed && (
              <button
                onClick={() => toggleGroup(group.id)}
                className="mb-2 flex w-full items-center justify-between px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 transition-colors hover:text-slate-200"
              >
                <span className="truncate">{group.label}</span>
                {expandedGroups.includes(group.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            )}

            <div className={`space-y-1.5 ${!isCollapsed && expandedGroups.includes(group.id) ? 'block' : isCollapsed ? 'block' : 'hidden'}`}>
              {group.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`group w-full rounded-2xl transition-all duration-200 ${activeTab === item.id
                    ? 'bg-white/[0.12] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                    : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'}`}
                >
                  <div className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3.5'} py-3`}>
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${activeTab === item.id ? 'bg-sky-400/16 text-sky-200' : 'bg-white/[0.04] text-slate-300 group-hover:bg-white/[0.08] group-hover:text-white'}`}>
                      <item.icon size={16} strokeWidth={2.1} />
                    </div>
                    {!isCollapsed && (
                      <div className="min-w-0 text-left">
                        <div className="truncate text-sm font-medium">{item.label}</div>
                        <div className={`truncate text-[11px] ${activeTab === item.id ? 'text-sky-100/80' : 'text-slate-500 group-hover:text-slate-400'}`}>
                          {group.label}
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="relative z-10 border-t border-white/10 p-4">
        <div className={`mb-4 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-1`}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-sm font-semibold text-slate-100">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          {!isCollapsed && (
            <div className="min-w-0 overflow-hidden">
              <p className="truncate text-sm font-medium text-white">{user?.name}</p>
              <p className="truncate text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                {user?.role === UserRole.ADMIN ? 'Administrador' :
                  user?.role === UserRole.SUPERVISOR ? 'Supervisor' :
                    user?.role === UserRole.WORKER ? 'Trabajador' : 'Usuario'}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={onLogout}
          title={isCollapsed ? 'Cerrar sesion' : undefined}
          className={`w-full rounded-2xl border border-white/10 bg-white/6 px-3 py-3 text-slate-300 transition hover:border-red-400/20 hover:bg-red-500/10 hover:text-red-100 ${isCollapsed ? 'flex justify-center' : 'flex items-center gap-3'}`}
        >
          <LogOut size={isCollapsed ? 20 : 18} />
          {!isCollapsed && <span className="text-sm font-medium">Cerrar sesion</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
