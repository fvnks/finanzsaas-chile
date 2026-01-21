
import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  HardHat,
  Users,
  Briefcase,
  X,
  UserPlus,
  ShieldCheck,
  ChevronRight,
  Construction,
  Check,
  Eye,
  Calendar,
  Contact,
  Award,
  History,
  MapPin,
  Mail,
  Phone,
  Clock,
  Zap,
  Tag
} from 'lucide-react';
import { Worker, Crew, Project, JobTitle } from '../types';
import { validateRUT } from '../constants';

interface WorkersPageProps {
  workers: Worker[];
  crews: Crew[];
  projects: Project[];
  jobTitles: JobTitle[];
  onAddWorker: (w: Worker) => void;
  onUpdateWorker: (w: Worker) => void;
  onDeleteWorker: (id: string) => void;
  onAddCrew: (c: Crew) => void;
  onUpdateCrew: (c: Crew) => void;
  onDeleteCrew: (id: string) => void;
}

const WorkersPage: React.FC<WorkersPageProps> = ({
  workers, crews, projects, jobTitles,
  onAddWorker, onUpdateWorker, onDeleteWorker,
  onAddCrew, onUpdateCrew, onDeleteCrew
}) => {
  const [activeTab, setActiveTab] = useState<'PERSONAL' | 'CUADRILLAS'>('PERSONAL');
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [showCrewModal, setShowCrewModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [editingCrew, setEditingCrew] = useState<Crew | null>(null);
  const [viewingWorker, setViewingWorker] = useState<Worker | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCert, setNewCert] = useState('');

  const [workerForm, setWorkerForm] = useState<Omit<Worker, 'id'>>({
    rut: '',
    name: '',
    role: '',
    specialty: '',
    email: '',
    phone: '',
    experienceYears: 0,
    certifications: []
  });

  const [crewForm, setCrewForm] = useState<Omit<Crew, 'id'>>({
    name: '',
    workerIds: [],
    projectId: ''
  });

  const filteredWorkers = useMemo(() => workers.filter(w =>
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.rut.includes(searchTerm)
  ), [workers, searchTerm]);

  const filteredCrews = useMemo(() => crews.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  ), [crews, searchTerm]);

  const handleOpenWorkerModal = (w?: Worker) => {
    if (w) {
      setEditingWorker(w);
      setWorkerForm({
        rut: w.rut,
        name: w.name,
        role: w.role,
        specialty: w.specialty,
        email: w.email || '',
        phone: w.phone || '',
        experienceYears: w.experienceYears || 0,
        certifications: w.certifications || []
      });
    } else {
      setEditingWorker(null);
      setWorkerForm({ rut: '', name: '', role: '', specialty: '', email: '', phone: '', experienceYears: 0, certifications: [] });
    }
    setShowWorkerModal(true);
  };

  const handleOpenCrewModal = (c?: Crew) => {
    if (c) {
      setEditingCrew(c);
      setCrewForm({ name: c.name, workerIds: c.workerIds, projectId: c.projectId || '' });
    } else {
      setEditingCrew(null);
      setCrewForm({ name: '', workerIds: [], projectId: '' });
    }
    setShowCrewModal(true);
  };

  const workerStats = useMemo(() => {
    if (!viewingWorker) return null;
    const workerCrews = crews.filter(c => c.workerIds.includes(viewingWorker.id));
    const currentCrew = workerCrews[0];
    const currentProject = projects.find(p => p.id === currentCrew?.projectId);
    const crewHistory = workerCrews.map(c => ({
      crew: c,
      project: projects.find(p => p.id === c.projectId)
    }));
    return { currentCrew, currentProject, crewHistory };
  }, [viewingWorker, crews, projects]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center">
            <HardHat className="mr-3 text-blue-600" size={28} /> Capital Humano Operativo
          </h2>
          <p className="text-slate-500 font-medium">Gestión de personal de obra y orquestación de cuadrillas.</p>
        </div>

        <div className="flex bg-slate-200 p-1 rounded-2xl w-fit">
          <button onClick={() => setActiveTab('PERSONAL')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'PERSONAL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>PERSONAL</button>
          <button onClick={() => setActiveTab('CUADRILLAS')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'CUADRILLAS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>CUADRILLAS</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder={activeTab === 'PERSONAL' ? "Buscar trabajador..." : "Buscar cuadrilla..."}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button onClick={() => activeTab === 'PERSONAL' ? handleOpenWorkerModal() : handleOpenCrewModal()} className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl flex items-center space-x-2 transition-all shadow-xl active:scale-95 whitespace-nowrap">
          <Plus size={20} />
          <span className="font-bold">{activeTab === 'PERSONAL' ? 'Fichar Trabajador' : 'Nueva Cuadrilla'}</span>
        </button>
      </div>

      {activeTab === 'PERSONAL' ? (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Trabajador</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">RUT / ID</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Especialidad</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Asignación</th>
                <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredWorkers.map(w => {
                const isAssigned = crews.some(c => c.workerIds.includes(w.id));
                return (
                  <tr key={w.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5 cursor-pointer" onClick={() => setViewingWorker(w)}>
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black">{w.name.charAt(0)}</div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-sm">{w.name}</span>
                          <span className="text-[10px] font-black text-blue-600 uppercase">{w.role}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 font-bold text-slate-500 text-sm">{w.rut}</td>
                    <td className="px-8 py-5 font-medium text-slate-600 text-sm">{w.specialty}</td>
                    <td className="px-8 py-5">
                      {isAssigned ? (
                        <span className="px-3 py-1 bg-green-50 text-green-700 text-[10px] font-black rounded-full border border-green-100">VINCULADO</span>
                      ) : (
                        <span className="px-3 py-1 bg-slate-100 text-slate-400 text-[10px] font-black rounded-full border border-slate-200">DISPONIBLE</span>
                      )}
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button onClick={() => setViewingWorker(w)} className="p-2 text-slate-400 hover:text-blue-600"><Eye size={18} /></button>
                        <button onClick={() => handleOpenWorkerModal(w)} className="p-2 text-slate-400 hover:text-blue-600"><Edit2 size={16} /></button>
                        <button onClick={() => onDeleteWorker(w.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCrews.map(c => (
            <div key={c.id} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 group hover:shadow-lg transition-all border-b-4 border-b-transparent hover:border-b-indigo-600">
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg"><Construction size={24} /></div>
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleOpenCrewModal(c)} className="p-2 text-slate-400 hover:text-blue-600"><Edit2 size={16} /></button>
                  <button onClick={() => onDeleteCrew(c.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                </div>
              </div>
              <h3 className="text-lg font-black text-slate-800 uppercase mb-2">{c.name}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Proyecto: {projects.find(p => p.id === c.projectId)?.name || 'Sin Asignar'}</p>
              <div className="flex -space-x-2">
                {c.workerIds.map(wid => (
                  <div key={wid} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-white text-white flex items-center justify-center text-[10px] font-black">
                    {workers.find(w => w.id === wid)?.name.charAt(0)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewingWorker && workerStats && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-hidden">
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col border border-slate-200">
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center space-x-6">
                <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-2xl font-black">
                  {viewingWorker.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase">{viewingWorker.name}</h3>
                  <p className="text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] flex items-center mt-1">
                    <ShieldCheck size={14} className="mr-2" /> Expediente Operativo Verificado
                  </p>
                </div>
              </div>
              <button onClick={() => setViewingWorker(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={32} /></button>
            </div>

            <div className="p-10 overflow-y-auto flex-1 space-y-10 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="space-y-6">
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Información de Enlace</p>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3"><Mail size={16} className="text-slate-400" /><span className="text-sm font-bold truncate">{viewingWorker.email || 'N/A'}</span></div>
                      <div className="flex items-center space-x-3"><Phone size={16} className="text-slate-400" /><span className="text-sm font-bold">{viewingWorker.phone || 'N/A'}</span></div>
                    </div>
                  </div>
                  <div className="bg-slate-900 p-6 rounded-3xl shadow-xl space-y-4 text-white">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/10 pb-2">Status Actual</p>
                    {workerStats.currentProject ? (
                      <div className="space-y-2">
                        <p className="text-xs font-black text-blue-400">{workerStats.currentProject.name}</p>
                        <p className="text-[10px] font-bold text-slate-400">CUADRILLA: {workerStats.currentCrew?.name}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No asignado a obra activa</p>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 space-y-8">
                  <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                    <h4 className="text-sm font-black text-slate-800 uppercase flex items-center"><Award size={18} className="mr-2 text-blue-600" /> Certificaciones Técnicas</h4>
                    <div className="flex flex-wrap gap-2">
                      {viewingWorker.certifications?.map((cert, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-lg border border-slate-200">{cert}</span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-slate-800 uppercase flex items-center"><History size={18} className="mr-2 text-indigo-600" /> Bitácora de Cuadrillas</h4>
                    <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <tr>
                            <th className="px-6 py-4">Equipo / Cuadrilla</th>
                            <th className="px-6 py-4">Obra / Proyecto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {workerStats.crewHistory.map(({ crew, project }) => (
                            <tr key={crew.id} className="hover:bg-slate-50/50">
                              <td className="px-6 py-4">
                                <div className="flex items-center space-x-2">
                                  <Users size={14} className="text-indigo-400" />
                                  <span className="font-bold text-slate-800">{crew.name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center space-x-2 text-slate-600 font-medium">
                                  <Briefcase size={14} className="text-slate-300" />
                                  <span>{project?.name || 'Histórico / Sin Asignar'}</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={() => setViewingWorker(null)} className="px-10 py-3 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 shadow-xl">
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}
      {showWorkerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900">{editingWorker ? 'Editar Trabajador' : 'Nuevo Trabajador'}</h3>
              <button onClick={() => setShowWorkerModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">RUT / ID</label>
                <input type="text" className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  value={workerForm.rut} onChange={e => setWorkerForm({ ...workerForm, rut: e.target.value })} placeholder="12.345.678-9" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nombre Completo</label>
                <input type="text" className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  value={workerForm.name} onChange={e => setWorkerForm({ ...workerForm, name: e.target.value })} placeholder="Juan Pérez" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Rol / Cargo</label>
                  <select
                    className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    value={workerForm.role}
                    onChange={e => setWorkerForm({ ...workerForm, role: e.target.value })}
                  >
                    <option value="">Seleccionar</option>
                    {jobTitles && jobTitles.length > 0 ? (
                      jobTitles.map(t => <option key={t.id} value={t.name}>{t.name}</option>)
                    ) : (
                      <>
                        <option value="Trabajador">Trabajador</option>
                        <option value="Capataz">Capataz</option>
                        <option value="Jefe de Obra">Jefe de Obra</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Especialidad</label>
                  <input type="text" className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    value={workerForm.specialty} onChange={e => setWorkerForm({ ...workerForm, specialty: e.target.value })} placeholder="Albañilería" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Email</label>
                <input type="email" className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  value={workerForm.email} onChange={e => setWorkerForm({ ...workerForm, email: e.target.value })} placeholder="email@ejemplo.com" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Teléfono</label>
                <input type="text" className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  value={workerForm.phone} onChange={e => setWorkerForm({ ...workerForm, phone: e.target.value })} placeholder="+56 9 ..." />
              </div>
              <button onClick={() => {
                if (editingWorker) {
                  onUpdateWorker({ ...editingWorker, ...workerForm });
                } else {
                  onAddWorker({ id: '', ...workerForm }); // ID assigned by backend
                }
                setShowWorkerModal(false);
              }} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl shadow-lg mt-4">
                {editingWorker ? 'Guardar Cambios' : 'Registrar Trabajador'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCrewModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900">{editingCrew ? 'Editar Cuadrilla' : 'Nueva Cuadrilla'}</h3>
              <button onClick={() => setShowCrewModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nombre de Cuadrilla</label>
                <input type="text" className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  value={crewForm.name} onChange={e => setCrewForm({ ...crewForm, name: e.target.value })} placeholder="Cuadrilla A-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Asignar Proyecto</label>
                <select className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  value={crewForm.projectId} onChange={e => setCrewForm({ ...crewForm, projectId: e.target.value })}>
                  <option value="">Sin Asignar</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">Seleccionar Trabajadores</label>
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1">
                  {workers.map(w => (
                    <label key={w.id} className="flex items-center p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                      <input type="checkbox" className="mr-3 rounded text-blue-600 focus:ring-blue-500"
                        checked={crewForm.workerIds.includes(w.id)}
                        onChange={e => {
                          if (e.target.checked) setCrewForm({ ...crewForm, workerIds: [...crewForm.workerIds, w.id] });
                          else setCrewForm({ ...crewForm, workerIds: crewForm.workerIds.filter(id => id !== w.id) });
                        }}
                      />
                      <span className="text-sm font-bold text-slate-700">{w.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={() => {
                if (editingCrew) {
                  onUpdateCrew({ ...editingCrew, ...crewForm });
                } else {
                  onAddCrew({ id: '', ...crewForm });
                }
                setShowCrewModal(false);
              }} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-lg mt-4">
                {editingCrew ? 'Guardar Cuadrilla' : 'Crear Cuadrilla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkersPage;
