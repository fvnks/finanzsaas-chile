import React, { useState } from 'react';
import { Plus, Search, MapPin, Calendar, Clock, AlertTriangle, CheckCircle2, MoreVertical, Edit2, Trash2, ArrowUpRight, BarChart3, Target, Info, CheckSquare, X, Users, ClipboardList, Check, Wallet, ChevronRight, FileText, Construction, Briefcase, DollarSign, HardHat, ShieldCheck, Zap, UserCheck, Calculator } from 'lucide-react';
import { Project, Worker, Invoice, CostCenter, DailyReport, User } from '../types';
import { formatCLP } from '../constants';

interface ProjectsPageProps {
  projects: Project[];
  workers: Worker[];
  invoices: Invoice[];
  costCenters: CostCenter[];
  dailyReports?: DailyReport[]; // Added dailyReports prop
  users?: User[]; // Added users prop
  onAdd: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onEdit: (project: Project) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  currentUser: User | null;
}

import { checkPermission } from '../src/utils/permissions';

const ProjectsPage: React.FC<ProjectsPageProps> = ({ projects = [], workers = [], invoices = [], costCenters = [], dailyReports = [], users = [], onAdd, onEdit, onDelete, currentUser }) => {
  if (!projects || !workers || !invoices || !costCenters) {
    return <div className="p-8 text-center text-slate-500">Cargando datos del sistema...</div>;
  }

  const [showModal, setShowModal] = useState(false);
  const [viewingProject, setViewingProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newTask, setNewTask] = useState('');

  const [formData, setFormData] = useState<Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'clientId' | 'dailyReports' | 'documents' | 'invoices' | 'purchaseOrders' | 'inventoryMovements' | 'crews'>>({
    name: '',
    budget: 0,
    address: '',
    tasks: [],
    costCenterIds: [],
    progress: 0,
    startDate: '',
    endDate: '',
    workerIds: [] as string[],
    status: 'ACTIVE',
    description: ''
  });

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.address || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        name: project.name,
        budget: project.budget,
        address: project.address || '',
        tasks: project.tasks || [],
        costCenterIds: project.costCenterIds || [],
        progress: project.progress || 0,
        startDate: project.startDate || '',
        endDate: project.endDate || '',
        workerIds: project.workerIds || [],
        status: project.status,
        description: project.description || ''
      });
    } else {
      setEditingProject(null);
      setFormData({
        name: '',
        budget: 0,
        address: '',
        tasks: [],
        costCenterIds: [],
        progress: 0,
        startDate: '',
        endDate: '',
        workerIds: [],
        status: 'ACTIVE',
        description: ''
      });
    }
    setShowModal(true);
  };

  const toggleCostCenter = (ccId: string) => {
    setFormData(prev => ({
      ...prev,
      costCenterIds: prev.costCenterIds.includes(ccId)
        ? prev.costCenterIds.filter(id => id !== ccId)
        : [...prev.costCenterIds, ccId]
    }));
  };

  const addTask = () => {
    if (newTask.trim()) {
      setFormData(prev => ({
        ...prev,
        tasks: [...prev.tasks, newTask.trim()]
      }));
      setNewTask('');
    }
  };

  const removeTask = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.budget < 0) return;
    if (editingProject) {
      onEdit({ ...formData, id: editingProject.id } as Project);
    } else {
      onAdd({ ...formData });
    }
    setShowModal(false);
  };

  const handleDeleteConfirm = () => {
    if (projectToDelete) {
      onDelete(projectToDelete.id);
      setProjectToDelete(null);
    }
  };

  const getProjectDetails = (project: Project) => {
    // Include invoices that explicitly match this project OR belong to cost centers assigned to this project
    const associatedInvoices = invoices.filter(inv =>
      inv.projectId === project.id ||
      (inv.costCenterId && (project.costCenterIds || []).includes(inv.costCenterId))
    );

    const sales = associatedInvoices.filter(i => i.type === 'VENTA').reduce((acc, i) => acc + (i.total || 0), 0);
    const purchases = associatedInvoices.filter(i => i.type === 'COMPRA').reduce((acc, i) => acc + (i.total || 0), 0);
    const margin = sales - purchases;

    // Filter cost centers that are EITHER assigned to the project OR have invoices in this project context
    const assignedCostCenters = costCenters
      .filter(cc =>
        (project.costCenterIds || []).includes(cc.id) ||
        associatedInvoices.some(inv => inv.costCenterId === cc.id)
      )
      .map(cc => {
        // Calculate total for this specific cost center using the broadened invoice list
        const totalCC = associatedInvoices
          .filter(inv => inv.costCenterId === cc.id)
          .reduce((acc, inv) => acc + (inv.total || 0), 0);
        return { ...cc, total: totalCC };
      });

    const progress = project.progress || 0;

    // Logic to find specific workers for this project
    // Note: 'crews' variable was referenced but not defined in props. 
    // Assuming we don't have crews prop anymore or it's part of something else.
    // Simplifying to just use workerIds if available.

    // Fallback if crews not available
    const assignedCrews: any[] = [];
    const projectWorkers: Array<{ worker: Worker, crewName: string }> = [];

    // Map workerIds to workers
    if (project.workerIds) {
      project.workerIds.forEach(wid => {
        const worker = workers.find(w => w.id === wid);
        if (worker) {
          projectWorkers.push({ worker, crewName: 'Asignado Directo' });
        }
      });
    }

    return {
      associatedInvoices,
      sales,
      purchases,
      margin,
      assignedCostCenters,
      progress,
      assignedCrews,
      projectWorkers
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Ecosistema de Proyectos</h2>
          <p className="text-slate-500 font-medium">Control total de logística, mano de obra y ejecución financiera.</p>
        </div>
        </div>
        {checkPermission(currentUser, 'projects', 'create') && (
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl flex items-center space-x-2 transition-all shadow-xl shadow-blue-200 active:scale-95"
        >
          <Plus size={20} />
          <span className="font-bold">Nuevo Proyecto</span>
        </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200">
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre, dirección o tareas..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => {
          const { progress } = getProjectDetails(project);
          return (
            <div key={project.id} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 hover:shadow-xl transition-all group relative overflow-hidden border-b-4 border-b-transparent hover:border-b-blue-600">
              <div className="absolute top-0 right-0 p-6 opacity-[0.03] text-blue-600 group-hover:scale-110 transition-transform">
                <Construction size={100} />
              </div>

              <div className="flex items-start justify-between mb-6 relative z-10">
                <div className="w-14 h-14 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                  <Briefcase size={28} />
                </div>
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {checkPermission(currentUser, 'projects', 'update') && (
                  <button onClick={() => handleOpenModal(project)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
                    <Edit2 size={18} />
                  </button>
                  )}
                  {checkPermission(currentUser, 'projects', 'delete') && (
                  <button onClick={() => setProjectToDelete(project)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                    <Trash2 size={18} />
                  </button>
                  )}
                </div>
              </div>

              <div className="space-y-6 relative z-10">
                <div>
                  <h3 className="font-black text-slate-800 text-xl leading-tight truncate uppercase tracking-tight" title={project.name}>
                    {project.name}
                  </h3>
                  <div className="flex items-center mt-2 text-slate-400">
                    <MapPin size={14} className="mr-1.5 flex-shrink-0" />
                    <p className="text-[10px] font-bold truncate uppercase">{project.address || 'DIRECCIÓN NO DEFINIDA'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Dotación</p>
                    <div className="flex items-center text-slate-800 font-black text-xs">
                      <Users size={12} className="mr-1.5 text-blue-600" />
                      {project.workerIds?.length || 0} Asignados
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Duración</p>
                    <div className="flex items-center text-slate-800 font-black text-[10px]">
                      <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                        {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Inicio?'} - {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Fin?'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Ejecución Presupuestaria</p>
                    <p className="text-sm font-black text-slate-900">{formatCLP(project.budget)}</p>
                  </div>
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-700 rounded-full ${progress > 90 ? 'bg-red-500' : 'bg-blue-600'}`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] font-bold text-slate-400">Avance Real</span>
                    <span className="text-[9px] font-bold text-blue-600">{progress.toFixed(1)}%</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  {(() => {
                    if (!project.endDate) return (
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-50 text-slate-600 text-[10px] font-black uppercase tracking-widest border border-slate-100">
                        <Construction size={12} className="mr-1.5" /> Sin Fecha
                      </span>
                    );

                    const today = new Date();
                    const end = new Date(project.endDate);
                    const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                    if (diffDays < 0) {
                      return (
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest border border-red-100 animate-pulse">
                          <AlertTriangle size={12} className="mr-1.5" /> Atrasado ({Math.abs(diffDays)}d)
                        </span>
                      );
                    } else if (diffDays <= 7) {
                      return (
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-50 text-yellow-600 text-[10px] font-black uppercase tracking-widest border border-yellow-100">
                          <Clock size={12} className="mr-1.5" /> Cierre Próximo ({diffDays}d)
                        </span>
                      );
                    } else {
                      return (
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest border border-green-100">
                          <CheckCircle2 size={12} className="mr-1.5" /> En Plazo
                        </span>
                      );
                    }
                  })()}
                  <button
                    onClick={() => setViewingProject(project)}
                    className="text-[10px] text-blue-600 font-black hover:translate-x-1 transition-transform flex items-center uppercase tracking-widest"
                  >
                    Auditar Faena <ArrowUpRight size={16} className="ml-1" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visor Detallado de Faena (Auditoría Integral) */ }
  {
    viewingProject && (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-hidden">
        <div className="bg-white rounded-[2.5rem] w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-slate-200 animate-in fade-in zoom-in duration-300">
          <div className="px-10 py-8 bg-slate-900 text-white flex justify-between items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Construction size={120} />
            </div>
            <div className="flex items-center space-x-6 relative z-10">
              <div className="p-4 rounded-3xl bg-blue-600 shadow-xl shadow-blue-500/20">
                <BarChart3 size={32} />
              </div>
              <div>
                <h3 className="text-3xl font-black tracking-tighter uppercase leading-none mb-2">{viewingProject.name}</h3>
                <div className="flex items-center space-x-4">
                  <p className="text-blue-400 text-[11px] font-black uppercase tracking-widest flex items-center">
                    <MapPin size={14} className="mr-2" /> {viewingProject.address || 'UBICACIÓN POR DEFINIR'}
                  </p>
                  <span className="h-3 w-px bg-white/20"></span>
                  <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest flex items-center">
                    <Target size={14} className="mr-2" /> Auditoría Operativa 2.0
                  </p>
                </div>
              </div>
            </div>
            <button onClick={() => setViewingProject(null)} className="p-3 hover:bg-white/10 rounded-full transition-all relative z-10">
              <X size={32} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-10 space-y-10 bg-slate-50/30 custom-scrollbar">
            {(() => {
              const details = getProjectDetails(viewingProject);
              return (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm group hover:border-blue-200 transition-all">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Presupuesto Global</p>
                      <p className="text-2xl font-black text-slate-900">{formatCLP(viewingProject.budget)}</p>
                    </div>
                    <div className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm group hover:border-orange-200 transition-all">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Compras Acumuladas</p>
                      <p className="text-2xl font-black text-orange-600">{formatCLP(details.purchases)}</p>
                    </div>
                    <div className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm group hover:border-green-200 transition-all">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Facturación (Ventas)</p>
                      <p className="text-2xl font-black text-green-600">{formatCLP(details.sales)}</p>
                    </div>
                    <div className="bg-slate-900 p-7 rounded-[2rem] shadow-xl shadow-slate-200 flex flex-col justify-between">
                      <p className="text-[10px] font-black text-blue-400 uppercase mb-2 tracking-widest">Personal en Faena</p>
                      <div className="flex items-end justify-between">
                        <p className="text-3xl font-black text-white">{details.projectWorkers.length}</p>
                        <Users size={28} className="text-white/20" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Logística, Cuadrillas y Tareas */}
                    <div className="space-y-8">
                      {/* Equipos de Trabajo (Cuadrillas) */}
                      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Construction size={20} />
                          </div>
                          <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Cuadrillas Activas</h4>
                        </div>
                        <div className="space-y-4">
                          {details.assignedCrews.map((c: any) => (
                            <div key={c.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group hover:bg-indigo-50/30 transition-colors">
                              <div>
                                <p className="text-xs font-black text-slate-800 uppercase">{c.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{c.workerIds.length} Operativos</p>
                              </div>
                              <ChevronRight className="text-slate-300 group-hover:translate-x-1 transition-transform" size={16} />
                            </div>
                          ))}
                          {details.assignedCrews.length === 0 && (
                            <p className="text-xs text-slate-400 italic py-6 text-center border-2 border-dashed border-slate-50 rounded-2xl">Sin cuadrillas asignadas actualmente.</p>
                          )}
                        </div>
                      </div>

                      {/* Listado de Trabajos / Alcance */}
                      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                              <ClipboardList size={20} />
                            </div>
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Alcance Técnico</h4>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {(viewingProject.tasks || []).map((task, idx) => (
                            <div key={idx} className="flex items-center p-3 bg-slate-50 border border-slate-100 rounded-xl">
                              <Check size={14} className="text-green-500 mr-3 flex-shrink-0" />
                              <span className="text-xs font-bold text-slate-700">{task}</span>
                            </div>
                          ))}
                          {(viewingProject.tasks || []).length === 0 && (
                            <p className="py-6 text-center text-slate-400 italic text-sm">Sin tareas definidas.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Dotación Nominal (NUEVA SECCIÓN) */}
                    <div className="lg:col-span-2 space-y-8">
                      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                              <Users size={20} />
                            </div>
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Manifiesto de Personal en Obra</h4>
                          </div>
                          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg uppercase">
                            {details.projectWorkers.length} Trabajadores
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-50 tracking-widest">
                              <tr>
                                <th className="pb-4 pr-4">Trabajador</th>
                                <th className="pb-4 pr-4">Identificación (RUT)</th>
                                <th className="pb-4 pr-4">Especialidad / Rol</th>
                                <th className="pb-4 text-right">Cuadrilla</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {details.projectWorkers.map(({ worker, crewName }) => (
                                <tr key={worker.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="py-4">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">
                                        {worker.name.charAt(0)}
                                      </div>
                                      <span className="font-bold text-slate-800">{worker.name}</span>
                                    </div>
                                  </td>
                                  <td className="py-4 font-bold text-slate-500">{worker.rut}</td>
                                  <td className="py-4">
                                    <div className="flex flex-col">
                                      <span className="font-black text-blue-600 uppercase text-[9px]">{worker.role}</span>
                                      <span className="text-slate-400 font-medium">{worker.specialty}</span>
                                    </div>
                                  </td>
                                  <td className="py-4 text-right">
                                    <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 font-black text-[9px] uppercase tracking-tighter">
                                      {crewName}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                              {details.projectWorkers.length === 0 && (
                                <tr>
                                  <td colSpan={4} className="py-12 text-center text-slate-400 italic">No hay personal asignado nominalmente a este proyecto.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Centros de Costo Imputados */}
                      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Target size={20} />
                          </div>
                          <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Distribución por Centro de Costo</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {details.assignedCostCenters.map(cc => (
                            <div key={cc.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-black text-slate-600 uppercase">{cc.name}</span>
                                <span className="text-xs font-black text-slate-900">{formatCLP(cc.total)}</span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-indigo-600"
                                  style={{ width: `${(cc.total / (details.purchases || 1)) * 100}%` }}
                                />
                              </div>
                            </div>
                          ))}
                          {details.assignedCostCenters.length === 0 && (
                            <p className="text-xs text-slate-400 italic text-center w-full col-span-2">No hay costos imputados.</p>
                          )}
                        </div>
                      </div>

                      {/* Historial de Avances (Reportes Diarios) */}
                      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-green-50 text-green-600 rounded-xl">
                            <FileText size={20} />
                          </div>
                          <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Historial de Reportes y Avances</h4>
                        </div>
                        <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                          {dailyReports
                            .filter(r => r.projectId === viewingProject.id)
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map(report => (
                              <div key={report.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 hover:bg-white hover:shadow-md transition-all">
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center space-x-2">
                                    <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                                      <Calendar size={14} />
                                    </div>
                                    <p className="text-xs font-bold text-slate-700">{new Date(report.date).toLocaleDateString()}</p>
                                  </div>
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {users.find(u => u.id === report.userId)?.name || 'Desconocido'}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed pl-2 border-l-2 border-slate-200">
                                  {report.content}
                                </p>
                              </div>
                            ))}
                          {dailyReports.filter(r => r.projectId === viewingProject.id).length === 0 && (
                            <p className="text-xs text-slate-400 italic text-center py-4">No hay reportes registrados para este proyecto.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex justify-end space-x-4">
            <button
              onClick={() => setViewingProject(null)}
              className="px-12 py-3.5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 shadow-2xl shadow-blue-500/30 transition-all active:scale-95 uppercase tracking-widest text-xs"
            >
              Finalizar Auditoría
            </button>
          </div>
        </div>
      </div>
    )
  }

  {/* Modal Formulario Operativo */ }

  {
    showModal && (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-white rounded-[2rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-100 my-4">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg">
                <Construction size={20} />
              </div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                {editingProject ? 'Configurar Faena' : 'Nueva Faena'}
              </h3>
            </div>
            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Sección 1: Datos Básicos */}
            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-1">Identificación</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre del Proyecto</label>
                  <input
                    required
                    type="text"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all font-bold text-slate-800 text-sm"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Urbanización Sector Oriente"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Presupuesto (CLP)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      required
                      type="number"
                      min="0"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all font-black text-slate-900 text-sm"
                      value={formData.budget || ''}
                      onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                  <MapPin size={10} className="mr-1.5" /> Dirección
                </label>
                <input
                  required
                  type="text"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all font-bold text-slate-800 text-sm"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Ej: Av. Principal 1234, Comuna"
                />
              </div>
            </div>

            {/* Sección 2: Alcance Técnico */}
            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-1 flex items-center">
                <ClipboardList size={12} className="mr-1.5" /> Hitos de Trabajo
              </p>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Agregar tarea..."
                    className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-xs"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTask())}
                  />
                  <button
                    type="button"
                    onClick={addTask}
                    className="px-4 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors text-xs"
                  >
                    Añadir
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
                  {formData.tasks.map((task, i) => (
                    <div key={i} className="flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 text-[9px] font-black rounded-lg border border-blue-100 group">
                      {task}
                      <button type="button" onClick={() => removeTask(i)} className="ml-2 hover:text-red-500 transition-colors">
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  {formData.tasks.length === 0 && <p className="text-[10px] text-slate-400 italic">Sin tareas definidas.</p>}
                </div>
              </div>
            </div>

            {/* Sección 3: Planificación y Equipo */}
            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-1 flex items-center">
                <Target size={12} className="mr-1.5" /> Planificación
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase">Inicio</label>
                      <input
                        type="date"
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs font-bold text-slate-700"
                        value={formData.startDate ? new Date(formData.startDate).toISOString().split('T')[0] : ''}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase">Término</label>
                      <input
                        type="date"
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs font-bold text-slate-700"
                        value={formData.endDate ? new Date(formData.endDate).toISOString().split('T')[0] : ''}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase flex justify-between">
                      <span>Avance: {formData.progress || 0}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      value={formData.progress || 0}
                      onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trabajadores</label>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 h-24 overflow-y-auto">
                    {workers.length > 0 ? (
                      <div className="space-y-1">
                        {workers.map(worker => (
                          <label key={worker.id} className="flex items-center space-x-2 cursor-pointer hover:bg-slate-100 p-1 rounded-md">
                            <input
                              type="checkbox"
                              checked={formData.workerIds?.includes(worker.id)}
                              onChange={(e) => {
                                const currentIds = formData.workerIds || [];
                                if (e.target.checked) {
                                  setFormData({ ...formData, workerIds: [...currentIds, worker.id] });
                                } else {
                                  setFormData({ ...formData, workerIds: currentIds.filter(id => id !== worker.id) });
                                }
                              }}
                              className="w-3 h-3 rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-[10px] font-bold text-slate-700 truncate">{worker.name}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic">Sin registros.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sección 4: Imputación */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-700 uppercase flex items-center tracking-widest">
                Centros de Costo <span className="text-slate-400 font-normal ml-2 tracking-normal">(Auditoría)</span>
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto pr-1 custom-scrollbar">
                {costCenters.map(cc => {
                  const isSelected = formData.costCenterIds.includes(cc.id);
                  return (
                    <button
                      key={cc.id}
                      type="button"
                      onClick={() => toggleCostCenter(cc.id)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-[9px] font-black transition-all border uppercase tracking-tight ${isSelected
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                        }`}
                    >
                      <span className="truncate">{cc.name}</span>
                      {isSelected && <Check size={12} className="ml-1 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-all text-xs">Cancelar</button>
              <button
                type="submit"
                disabled={!formData.name || !formData.address}
                className={`px-8 py-3 rounded-xl font-black text-white shadow-xl transition-all active:scale-95 text-xs uppercase tracking-wide ${!formData.name || !formData.address ? 'bg-slate-300 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                  }`}
              >
                {editingProject ? 'Guardar' : 'Aperturar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  {/* Modal Confirmación Eliminación */ }
  {
    projectToDelete && (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[60]">
        <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-100">
          <div className="p-10 text-center">
            <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 ring-8 ring-red-50/50">
              <AlertTriangle size={48} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">¿Cierre de Proyecto?</h3>
            <p className="text-slate-500 leading-relaxed mb-8 px-4 text-sm font-medium">
              Eliminar <span className="font-black text-slate-800">"{projectToDelete.name}"</span> desvinculará permanentemente toda la trazabilidad de faena, tareas y personal.
            </p>

            <div className="flex flex-col space-y-3">
              <button onClick={handleDeleteConfirm} className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-red-200 active:scale-95 uppercase tracking-widest text-xs">
                Confirmar Cierre y Borrado
              </button>
              <button onClick={() => setProjectToDelete(null)} className="w-full py-4 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-2xl transition-all uppercase tracking-widest text-xs">
                Mantener Faena
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
    </div >
  );
};

export default ProjectsPage;
