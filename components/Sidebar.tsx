
import React from 'react';
import {
  LayoutDashboard,
  Users,
  FileText,
  Briefcase,
  Target,
  PieChart,
  LogOut,
  Sparkles,
  HardHat,
  ChevronDown,
  ChevronRight,
  Map,
  Truck,
  TrendingUp,
  Wrench,
  Package,
  PhoneCall,
  Box,
  Layers,
  CreditCard,
  BarChart3
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
  const [isCollapsed, setIsCollapsed] = React.useState(true);

  // Auto-collapse on small screens if needed, or stick to manual toggle


  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupId) ? prev.filter(g => g !== groupId) : [...prev, groupId]
    );
  };

  // Define all available items with their groups
  const groups = [
    {
      id: 'obras',
      label: 'Gestión de Obras',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }, // Dashboard fits best here or top level? Let's put top level or inside Obras. Usually Dashboard is global.
        { id: 'projects', label: 'Proyectos', icon: Briefcase },
        { id: 'tools', label: 'Herramientas', icon: Wrench },
        { id: 'deliveries', label: 'Entregas (EPP/Herr.)', icon: Package },
        { id: 'reports', label: 'Reportes Diarios', icon: FileText },
        { id: 'docControl', label: 'Control Documental', icon: FileText },
        { id: 'planos', label: 'Planos // Cuelgues', icon: Map },
      ]
    },
    {
      id: 'ventas',
      label: 'Ventas y CRM',
      items: [
        { id: 'crm', label: 'CRM / Cotizaciones', icon: PhoneCall },
      ]
    },
    {
      id: 'finanzas',
      label: 'Finanzas y Compras',
      items: [
        { id: 'invoices', label: 'Facturas', icon: FileText },
        { id: 'costCenters', label: 'Centros de Costo', icon: Target },
        { id: 'expenses', label: 'Gastos', icon: TrendingUp },
        { id: 'bankAccounts', label: 'Cuentas Bancarias', icon: CreditCard },
        { id: 'cashFlow', label: 'Flujo de Caja', icon: BarChart3 },
      ]
    },
    {
      id: 'inventario',
      label: 'Inventario',
      items: [
        { id: 'products', label: 'Catálogo de Prod.', icon: Layers },
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
        { id: 'admin', label: 'Admin / Config', icon: Sparkles },
      ]
    }
  ];

  /* 
     SPECIAL CASE: Dashboard
     Often Dashboard is outside groups. Let's make logical decision:
     If we want 'menus desplegables' for everything, maybe dashboard is standalone at top.
  */

  // Filter Logic
  const getAllowedGroups = () => {
    if (!user) return [];
    
    // Check company modules
    const activeCompany = user.companies?.find(c => c.id === user.activeCompanyId);
    // Determine active modules, default to all if none specified (legacy data)
    const activeModules = activeCompany?.modules || ['INVOICING', 'PROJECTS', 'INVENTORY', 'TOOLS', 'HR'];

    // Admin sees everything within the company's active modules
    // Other users are filtered by both their role permissions AND company modules
    const allowed = user.role === UserRole.ADMIN ? null : (user.allowedSections || ['dashboard']);

    return groups.map(group => ({
      ...group,
      items: group.items.filter(item => {
        // Module check
        if (item.id === 'crm' && !(activeModules.includes('INVOICING') || activeModules.includes('CRM'))) return false;
        if (item.id === 'invoices' && !activeModules.includes('INVOICING')) return false;
        if (item.id === 'projects' && !activeModules.includes('PROJECTS')) return false;
        if (item.id === 'tools' && !activeModules.includes('TOOLS')) return false;
        if (item.id === 'deliveries' && !activeModules.includes('HR')) return false;
        if (item.id === 'workers' && !activeModules.includes('HR')) return false;
        
        if (item.id === 'products' && !activeModules.includes('INVENTORY')) return false;
        if (item.id === 'warehouses' && !activeModules.includes('INVENTORY')) return false;
        // Assume costCenters and others maybe tied to INVOICING or PROJECTS. We'll leave them open or tied to INVOICING.
        if (item.id === 'costCenters' && !activeModules.includes('INVOICING')) return false;

        // User permission check
        if (allowed && !allowed.includes(item.id)) return false;
        
        return true;
      })
    })).filter(group => group.items.length > 0);
  };

  const visibleGroups = getAllowedGroups();

  return (
    <aside
      className={`bg-slate-900 text-white flex flex-col h-screen sticky top-0 shrink-0 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'
        }`}
      onMouseEnter={() => setIsCollapsed(false)}
      onMouseLeave={() => setIsCollapsed(true)}
    >
      <div className="p-4 flex items-center justify-between">
        {!isCollapsed ? (
          <div className="w-full mr-2">
            <CompanySwitcher />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold shrink-0 mx-auto mb-2">
            V
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto custom-scrollbar">
        {visibleGroups.map(group => (
          <div key={group.id} className="border-t border-slate-800/50 pt-2 first:border-0 first:pt-0">
            {/* Group Header - Hide label if collapsed */}
            {!isCollapsed && (
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between px-2 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition-colors group"
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
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'space-x-3 px-3'} py-2.5 rounded-lg transition-all ${activeTab === item.id
                    ? 'bg-primary text-white shadow-lg shadow-slate-900/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                >
                  <item.icon size={20} strokeWidth={2} />
                  {!isCollapsed && <span className="font-medium text-sm truncate">{item.label}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-800 bg-slate-900">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} mb-4 px-1`}>
          <div className="w-9 h-9 shrink-0 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold shadow-lg shadow-indigo-900/50">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden min-w-0">
              <p className="text-sm font-bold truncate text-white">{user?.name}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold truncate">
                {user?.role === UserRole.ADMIN ? 'Administrador' :
                  user?.role === UserRole.SUPERVISOR ? 'Supervisor' :
                    user?.role === UserRole.WORKER ? 'Trabajador' : 'Usuario'}
              </p>
            </div>
          )}
        </div>
        <button
          onClick={onLogout}
          title={isCollapsed ? "Cerrar Sesión" : undefined}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2 text-slate-400 hover:text-red-400 hover:bg-slate-800/50 rounded-lg transition-colors`}
        >
          <LogOut size={isCollapsed ? 20 : 18} />
          {!isCollapsed && <span className="font-medium text-sm">Salir</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
