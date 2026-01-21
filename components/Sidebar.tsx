
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
  ChevronRight
} from 'lucide-react';
import { User, UserRole } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User | null;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, user, onLogout }) => {
  const [expandedGroups, setExpandedGroups] = React.useState<string[]>(['obras', 'finanzas', 'inventario', 'directorio', 'admin']);

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
        { id: 'documents', label: 'Documentos', icon: FileText },
      ]
    },
    {
      id: 'finanzas',
      label: 'Finanzas y Compras',
      items: [
        { id: 'invoices', label: 'Facturas', icon: FileText }, // Could differentiate icon
        { id: 'purchaseOrders', label: 'Órdenes Compra', icon: FileText },
        { id: 'costCenters', label: 'Centros de Costo', icon: Target },
        { id: 'financialReports', label: 'Reportes Financieros', icon: PieChart },
      ]
    },
    {
      id: 'inventario',
      label: 'Inventario y Bodega',
      items: [
        { id: 'inventory', label: 'Inventario', icon: FileText },
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
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-screen sticky top-0 shrink-0">
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          Vertikal Finanzas
        </h1>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">SaaS ERP Edition</p>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto custom-scrollbar">
        {visibleGroups.map(group => (
          <div key={group.id}>
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(group.id)}
              className="w-full flex items-center justify-between px-2 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <span>{group.label}</span>
              </div>
              {expandedGroups.includes(group.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            <div className={`space-y-1 ${expandedGroups.includes(group.id) ? 'block' : 'hidden'}`}>
              {group.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all ${activeTab === item.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                >
                  <item.icon size={18} strokeWidth={2} />
                  <span className="font-medium text-sm">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-900">
        <div className="flex items-center space-x-3 mb-4 px-2">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-lg font-bold shadow-lg shadow-indigo-900/50">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold truncate text-white">{user?.name}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              {user?.role === UserRole.ADMIN ? 'Administrador' :
                user?.role === UserRole.SUPERVISOR ? 'Supervisor' :
                  user?.role === UserRole.WORKER ? 'Trabajador' : 'Usuario'}
            </p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-slate-800/50 rounded-lg transition-colors"
        >
          <LogOut size={18} />
          <span className="font-medium text-sm">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
