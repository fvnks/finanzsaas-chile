
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
  Map
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
        { id: 'reports', label: 'Reportes Diarios', icon: FileText },
        { id: 'docControl', label: 'Control Documental', icon: FileText },
        { id: 'planos', label: 'Planos // Cuelgues', icon: Map },
      ]
    },
    {
      id: 'finanzas',
      label: 'Finanzas y Compras',
      items: [
        { id: 'invoices', label: 'Facturas', icon: FileText }, // Could differentiate icon

        { id: 'costCenters', label: 'Centros de Costo', icon: Target },
        { id: 'financialReports', label: 'Reportes Financieros', icon: PieChart },
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

    // Admin sees everything
    if (user.role === UserRole.ADMIN) return groups;

    // Filter for others
    const allowed = user.allowedSections || ['dashboard']; // Ensure dashboard access by default if needed

    return groups.map(group => ({
      ...group,
      items: group.items.filter(item => {
        // Always allow dashboard if it's in the list and user has basic access? 
        // Or strictly follow allowedSections. 
        // Let's strictly follow allowedSections, assuming 'dashboard' is in the allowed list.
        // We added logic in previous step to force 'dashboard' if empty sidebar, but let's rely on allowed list.
        // If 'dashboard' is not in allowed list, they won't see it.
        return allowed.includes(item.id);
      })
    })).filter(group => group.items.length > 0);
  };

  const visibleGroups = getAllowedGroups();

  return (
    <aside
      className={`bg-slate-900 text-white flex flex-col h-screen sticky top-0 shrink-0 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'
        }`}
    >
      <div className="p-4 flex items-center justify-between">
        {!isCollapsed ? (
          <div className="w-full mr-2">
            <CompanySwitcher />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shrink-0 mx-auto mb-2">
            V
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronRight className="rotate-180" size={20} />}
        </button>
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
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
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
