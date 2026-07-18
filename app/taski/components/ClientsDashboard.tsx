"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Briefcase, Building2, DollarSign, Calendar, Mail, Phone, ExternalLink, 
  Plus, CheckCircle2, AlertCircle, ArrowUpRight, ShieldCheck, Sparkles, FolderPlus
} from 'lucide-react';
import { Project } from './ProjectDashboard';
import { playSound } from '../utils/audio';

export interface ClientItem {
  id: number;
  name: string;
  industry: string;
  logo: string;
  contactPerson: string;
  email: string;
  phone: string;
  totalBudget: string;
  paidAmount: string;
  pendingBalance: string;
  status: "VIP" | "Activo" | "Prospecto" | "Concluido";
  statusColor: string;
  sinceDate: string;
  website: string;
  notes: string;
}

export const INITIAL_CLIENTS: ClientItem[] = [
  {
    id: 1,
    name: "Apple Inc.",
    industry: "Tecnología & Hardware",
    logo: "",
    contactPerson: "Sarah Jenkins / VP Design",
    email: "s.jenkins@apple.com",
    phone: "+1 (408) 996-1010",
    totalBudget: "$45,000",
    paidAmount: "$32,000",
    pendingBalance: "$13,000",
    status: "VIP",
    statusColor: "bg-purple-500/10 border-purple-500/30 text-purple-400",
    sinceDate: "Ene 2024",
    website: "apple.com",
    notes: "Cuenta clave corporativa. Prioridad máxima en revisiones de interfaces tridimensionales."
  },
  {
    id: 2,
    name: "Nike",
    industry: "Moda & Deporte",
    logo: "N",
    contactPerson: "Alex Mercer / Marketing Lead",
    email: "alex.mercer@nike.com",
    phone: "+1 (503) 671-6453",
    totalBudget: "$28,000",
    paidAmount: "$20,000",
    pendingBalance: "$8,000",
    status: "Activo",
    statusColor: "bg-blue-500/10 border-blue-500/30 text-blue-400",
    sinceDate: "Mar 2024",
    website: "nike.com",
    notes: "Campañas de lanzamientos de productos deportivos interactivos 3D."
  },
  {
    id: 3,
    name: "Tesla",
    industry: "Automotriz & Energía",
    logo: "T",
    contactPerson: "Claire Bennet / Product Owner",
    email: "cbennet@tesla.com",
    phone: "+1 (650) 681-5000",
    totalBudget: "$65,000",
    paidAmount: "$50,000",
    pendingBalance: "$15,000",
    status: "VIP",
    statusColor: "bg-purple-500/10 border-purple-500/30 text-purple-400",
    sinceDate: "Nov 2023",
    website: "tesla.com",
    notes: "Plataforma e-commerce y visualizadores WebGL de vehículos en tiempo real."
  },
  {
    id: 4,
    name: "Airbnb",
    industry: "Hospedaje & Viajes",
    logo: "A",
    contactPerson: "David Lawson / Mobile Design Lead",
    email: "d.lawson@airbnb.com",
    phone: "+1 (415) 800-5959",
    totalBudget: "$18,000",
    paidAmount: "$12,000",
    pendingBalance: "$6,000",
    status: "Activo",
    statusColor: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    sinceDate: "Feb 2024",
    website: "airbnb.com",
    notes: "Prototipado rápido de aplicación móvil MVP para experiencias locales."
  },
  {
    id: 5,
    name: "OpenAI",
    industry: "Inteligencia Artificial",
    logo: "AI",
    contactPerson: "Lisa K. / AI Research Director",
    email: "lisa.k@openai.com",
    phone: "+1 (415) 555-0199",
    totalBudget: "$80,000",
    paidAmount: "$80,000",
    pendingBalance: "$0",
    status: "VIP",
    statusColor: "bg-purple-500/10 border-purple-500/30 text-purple-400",
    sinceDate: "Dic 2023",
    website: "openai.com",
    notes: "Dashboards hiper-detallados de analíticas y monitoreo de modelos generativos."
  },
  {
    id: 6,
    name: "Stripe",
    industry: "Fintech & Pagos",
    logo: "S",
    contactPerson: "Mark Taylor / Head of Growth",
    email: "mtaylor@stripe.com",
    phone: "+1 (888) 963-8969",
    totalBudget: "$35,000",
    paidAmount: "$18,500",
    pendingBalance: "$16,500",
    status: "Activo",
    statusColor: "bg-blue-500/10 border-blue-500/30 text-blue-400",
    sinceDate: "Abr 2024",
    website: "stripe.com",
    notes: "Interfaces para billeteras digitales móviles y pasarelas de pago cripto."
  }
];

interface ClientsDashboardProps {
  projects: Project[];
  onUpdateProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  isNeumorphic?: boolean;
  isNightMode?: boolean;
}

export const ClientsDashboard: React.FC<ClientsDashboardProps> = ({
  projects,
  onUpdateProjects,
  isNeumorphic = true,
  isNightMode = false
}) => {
  const [clients, setClients] = useState<ClientItem[]>(INITIAL_CLIENTS);
  const [activeClientId, setActiveClientId] = useState<number>(1);
  const [filterStatus, setFilterStatus] = useState<string>("Todos");
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectCost, setNewProjectCost] = useState("$10,000");

  const activeClient = clients.find(c => c.id === activeClientId) || clients[0];

  // Projects associated with this client
  const clientProjects = projects.filter(p => 
    p.client?.toLowerCase().includes(activeClient.name.toLowerCase()) ||
    activeClient.name.toLowerCase().includes(p.client?.toLowerCase() || "")
  );

  // Client tasks across all their projects
  const clientTasks = clientProjects.flatMap(p => 
    (p.tasks || []).map(t => ({ ...t, projectName: p.title }))
  );

  const filteredClients = clients.filter(c => 
    filterStatus === "Todos" || c.status === filterStatus
  );

  const handleCreateProjectForClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectTitle.trim()) return;

    const newProject: Project = {
      id: Date.now(),
      title: newProjectTitle,
      client: activeClient.name,
      package: "Estratégico",
      desc: `Proyecto creado expresamente para el cliente ${activeClient.name}.`,
      progress: "0 de 5 tareas",
      percent: "0%",
      gradient: "from-blue-600 to-indigo-500",
      glow: "bg-blue-600",
      status: "Activo",
      statusColor: "bg-blue-500/10 border-blue-500/30 text-blue-400",
      burnRate: "0h / 40h",
      deadline: "30 Sep",
      daysRemaining: "A Tiempo",
      briefCore: `Entrega clave alineada a las metas comerciales de ${activeClient.name}.`,
      priority: "Alta",
      cost: newProjectCost,
      tasks: [
        {
          id: Date.now() + 1,
          title: "Kickoff y Alineación Inicial",
          desc: "Definición de requerimientos y entregables clave con el cliente.",
          format: "Reunión",
          time: "2h",
          status: "Pendiente",
          statusColor: "bg-white/5 border-white/10 text-white/60",
          subtasks: [
            { id: 1, text: "Aprobar cronograma de trabajo", done: false },
            { id: 2, text: "Recibir accesos del cliente", done: false }
          ]
        }
      ]
    };

    onUpdateProjects(prev => [newProject, ...prev]);
    playSound('pop');
    setNewProjectTitle("");
    setIsNewProjectModalOpen(false);
  };

  return (
    <div className="w-full h-full flex gap-6 relative select-none">
      {/* LEFT COLUMN: Vertical Client Cards */}
      <div className="w-[300px] shrink-0 flex flex-col gap-4 h-full pb-16">
        {/* Header & Filter Bar */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className={`w-4 h-4 ${isNeumorphic ? 'text-slate-700' : 'text-purple-400'}`} />
              <span className={`text-[12px] font-black uppercase tracking-widest ${isNeumorphic ? 'text-slate-800' : 'text-white'}`}>
                Clientes ({clients.length})
              </span>
            </div>
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
              Tarjetas Verticales
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1">
            {["Todos", "VIP", "Activo", "Prospecto", "Concluido"].map(st => (
              <button
                key={st}
                onClick={() => {
                  setFilterStatus(st);
                  playSound('click');
                }}
                className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap border ${
                  filterStatus === st
                    ? isNeumorphic
                      ? "bg-slate-800 text-white border-slate-700 shadow-sm"
                      : "bg-white text-black border-white shadow-md"
                    : isNeumorphic
                      ? "bg-[#e6eef8] text-slate-600 border-white/40 hover:text-slate-900"
                      : "bg-white/5 text-white/60 border-white/10 hover:text-white"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Vertical Cards Container */}
        <div className="flex flex-col gap-3.5 overflow-y-auto hide-scrollbar pr-1 pb-12">
          {filteredClients.map(client => {
            const isSelected = client.id === activeClientId;
            const projectCount = projects.filter(p => 
              p.client?.toLowerCase().includes(client.name.toLowerCase())
            ).length;

            return (
              <motion.div
                key={client.id}
                onClick={() => {
                  setActiveClientId(client.id);
                  playSound('click');
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`p-4 rounded-2xl cursor-pointer transition-all duration-300 relative border flex flex-col gap-3 ${
                  isNightMode
                    ? isSelected
                      ? "neu-dark-inset border-white/5 text-zinc-100 shadow-lg"
                      : "neu-dark-flat border-white/5 text-zinc-300 hover:border-zinc-700"
                    : isSelected
                      ? "neu-inset border-white/30 text-slate-900 shadow-lg"
                      : "neu-flat border-white/40 text-slate-700 hover:border-slate-300"
                }`}
              >
                {/* Client Header Card */}
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shadow-inner shrink-0 ${
                    isNeumorphic
                      ? "bg-slate-800 text-white"
                      : "bg-gradient-to-br from-purple-500/30 to-blue-500/20 text-white border border-white/20"
                  }`}>
                    {client.logo}
                  </div>

                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-bold text-[14px] leading-tight truncate">
                      {client.name}
                    </span>
                    <span className={`text-[10px] font-medium leading-tight truncate mt-0.5 ${
                      isNeumorphic ? 'text-slate-500' : 'text-white/50'
                    }`}>
                      {client.industry}
                    </span>
                  </div>
                </div>

                {/* Status and Projects Badge */}
                <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-2.5">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${client.statusColor}`}>
                    {client.status}
                  </span>

                  <span className={`text-[10px] font-bold ${isNeumorphic ? 'text-slate-600' : 'text-white/60'}`}>
                    {projectCount} {projectCount === 1 ? 'Proyecto' : 'Proyectos'}
                  </span>
                </div>

                {/* Revenue stats */}
                <div className="flex items-center justify-between text-[10px] font-mono opacity-80 pt-0.5">
                  <span>Facturado: <strong className="text-emerald-400 font-bold">{client.totalBudget}</strong></span>
                  <span>Cliente desde {client.sinceDate}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* RIGHT CANVAS: Selected Client Dashboard */}
      <div className="flex-1 flex flex-col gap-6 h-full pb-16 pt-2 px-1 overflow-y-auto hide-scrollbar">
        {/* Client Banner Header */}
        <motion.div
          key={activeClient.id}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`p-6 rounded-3xl border relative ${
            isNightMode
              ? "neu-dark-flat border-white/5 text-zinc-100 shadow-2xl"
              : "neu-flat border-white/60 text-slate-800 shadow-[6px_6px_16px_#b8c4d9,-6px_-6px_16px_#ffffff]"
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg shrink-0 ${
                isNightMode
                  ? "neu-dark-inset text-zinc-100 border border-white/10"
                  : "bg-slate-800 text-white"
              }`}>
                {activeClient.logo}
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className={`text-2xl md:text-3xl font-bold tracking-tight leading-normal ${isNightMode ? 'text-zinc-100' : 'text-slate-800'}`}>{activeClient.name}</h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shrink-0 ${activeClient.statusColor}`}>
                    {activeClient.status}
                  </span>
                </div>
                <p className={`text-[12px] font-medium mt-0.5 ${isNightMode ? 'text-zinc-300' : 'text-slate-600'}`}>
                  {activeClient.industry} • Contacto: <span className="font-bold">{activeClient.contactPerson}</span>
                </p>
                <p className={`text-[11px] mt-2 max-w-xl leading-relaxed ${isNightMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                  {activeClient.notes}
                </p>
              </div>
            </div>

            {/* Action Button: Create Project for Client */}
            <button
              onClick={() => {
                setIsNewProjectModalOpen(true);
                playSound('click');
              }}
              className={`px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all active:scale-95 shrink-0 ${
                isNightMode
                  ? "neu-dark-flat border border-white/10 text-indigo-400 hover:text-indigo-300"
                  : "bg-slate-800 text-white shadow-md hover:bg-slate-700"
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Crear Proyecto para Cliente</span>
            </button>
          </div>
        </motion.div>

        {/* Financial KPI Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-4 rounded-xl border flex flex-col gap-1 ${
            isNightMode ? "bg-neutral-900 border-neutral-800 text-neutral-50 shadow-sm" : "bg-white border-slate-200 text-slate-900 shadow-sm"
          }`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Presupuesto Total Contratado</span>
            <span className="text-2xl font-black mt-1">{activeClient.totalBudget}</span>
            <span className="text-[10px] text-emerald-500 font-bold">Valor acumulado de contratos</span>
          </div>

          <div className={`p-4 rounded-xl border flex flex-col gap-1 ${
            isNightMode ? "bg-neutral-900 border-neutral-800 text-neutral-50 shadow-sm" : "bg-white border-slate-200 text-slate-900 shadow-sm"
          }`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Monto Facturado / Pagado</span>
            <span className="text-2xl font-black mt-1 text-emerald-500">{activeClient.paidAmount}</span>
            <span className="text-[10px] text-emerald-500 font-bold">Liquidadas exitosamente</span>
          </div>

          <div className={`p-4 rounded-xl border flex flex-col gap-1 ${
            isNightMode ? "bg-neutral-900 border-neutral-800 text-neutral-50 shadow-sm" : "bg-white border-slate-200 text-slate-900 shadow-sm"
          }`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Balance Pendiente por Cobrar</span>
            <span className="text-2xl font-black mt-1 text-amber-500">{activeClient.pendingBalance}</span>
            <span className="text-[10px] text-amber-500 font-bold">Hitos por entregar</span>
          </div>

          <div className={`p-4 rounded-xl border flex flex-col gap-1 ${
            isNightMode ? "bg-neutral-900 border-neutral-800 text-neutral-50 shadow-sm" : "bg-white border-slate-200 text-slate-900 shadow-sm"
          }`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Proyectos Activos</span>
            <span className="text-2xl font-black mt-1">{clientProjects.length}</span>
            <span className="text-[10px] text-purple-500 font-bold">En el pipeline activo</span>
          </div>
        </div>

        {/* Client Projects Section (Signature Task Card Style) */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className={`text-[12px] font-extrabold uppercase tracking-widest ${isNightMode ? 'text-slate-50' : 'text-slate-900'}`}>
              Proyectos Asignados a {activeClient.name} ({clientProjects.length})
            </h3>
          </div>

          <div className="flex items-center gap-5 overflow-x-auto pb-4 pt-1 pr-4 hide-scrollbar">
            {clientProjects.length === 0 ? (
              <div className={`w-full p-8 rounded-2xl border text-center text-xs ${
                isNightMode ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-white border-slate-200 text-slate-600"
              }`}>
                Este cliente no tiene proyectos activos asignados en este momento. Haz clic en "Crear Proyecto para Cliente" para asignarle uno.
              </div>
            ) : (
              clientProjects.map(project => (
                <motion.div
                  key={project.id}
                  whileHover={{ scale: 1.015, y: -2 }}
                  whileTap={{ scale: 0.985 }}
                  className={`rounded-2xl p-5 flex flex-col justify-between shrink-0 select-none cursor-pointer transition-all duration-200 relative w-[340px] h-[320px] group/card border ${
                    isNightMode
                      ? "bg-slate-900 border-slate-800 text-slate-50 shadow-sm"
                      : "bg-white border-slate-200 text-slate-900 shadow-sm"
                  }`}
                >
                  {/* Top Row: Thumbnail + Title + Status Pill */}
                  <div className="flex items-start justify-between gap-3 relative z-10">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-bold text-base shadow-sm border ${
                        isNightMode
                          ? "bg-slate-950 text-slate-50 border-slate-800"
                          : "bg-slate-900 text-white border-slate-800"
                      }`}>
                        {project.title.substring(0, 2).toUpperCase()}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className={`font-bold text-[14px] tracking-tight leading-tight truncate ${isNightMode ? 'text-slate-50' : 'text-slate-900'}`}>
                          {project.title}
                        </span>
                        <span className={`text-[10px] font-mono mt-0.5 truncate ${isNightMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          {project.package} Package
                        </span>
                      </div>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border shrink-0 ${project.statusColor}`}>
                      {project.status}
                    </span>
                  </div>

                  {/* Middle Description */}
                  <p className={`text-[12px] font-normal leading-relaxed line-clamp-2 relative z-10 ${
                    isNightMode ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                    {project.desc || project.briefCore}
                  </p>

                  {/* Key Badges Row */}
                  <div className="flex items-center gap-2 flex-wrap relative z-10">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold border ${
                      isNightMode ? 'bg-slate-950 text-slate-200 border-slate-800' : 'bg-slate-100 text-slate-900 border-slate-200'
                    }`}>
                      {project.cost}
                    </span>
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-mono border ${
                      isNightMode ? 'bg-slate-950 text-slate-300 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {project.burnRate}
                    </span>
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-mono border ${
                      isNightMode ? 'bg-slate-950 text-slate-300 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {project.deadline}
                    </span>
                  </div>

                  {/* Bottom Progress Section */}
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-zinc-800 relative z-10">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className={isNightMode ? 'text-zinc-400' : isNeumorphic ? 'text-slate-500' : 'text-zinc-400'}>
                        {project.progress}
                      </span>
                      <span className={isNightMode ? 'text-zinc-100 font-bold' : isNeumorphic ? 'text-slate-800' : 'text-zinc-200 font-bold'}>
                        {project.percent}
                      </span>
                    </div>
                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${isNightMode ? 'bg-zinc-800' : isNeumorphic ? 'bg-slate-200' : 'bg-zinc-800'}`}>
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${isNightMode ? 'bg-indigo-400' : isNeumorphic ? 'bg-slate-800' : 'bg-zinc-200'}`}
                        style={{ width: project.percent }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Client Tasks Section */}
        <div className="flex flex-col gap-3 mt-2 pb-10">
          <h3 className={`text-[12px] font-black uppercase tracking-widest ${isNightMode ? 'text-zinc-100' : isNeumorphic ? 'text-slate-800' : 'text-white'}`}>
            Entregables y Tareas del Cliente ({clientTasks.length})
          </h3>

          <div className={`rounded-2xl border overflow-hidden ${
            isNightMode 
              ? "neu-dark-flat border-white/5 text-zinc-100" 
              : isNeumorphic 
                ? "neu-flat border-white/60 text-slate-800" 
                : "liquid-glass-btn border-white/10 text-white"
          }`}>
            {clientTasks.length === 0 ? (
              <div className="p-8 text-center text-xs opacity-60">No hay tareas creadas para los proyectos de este cliente.</div>
            ) : (
              <div className="divide-y divide-white/10">
                {clientTasks.map(task => (
                  <div key={task.id} className="p-4 flex items-center justify-between gap-4 hover:bg-white/5 transition-colors">
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-[13px] ${isNightMode ? 'text-zinc-100' : ''}`}>{task.title}</span>
                        <span className={`text-[10px] font-mono ${isNightMode ? 'text-zinc-400' : 'opacity-50'}`}>• {task.projectName}</span>
                      </div>
                      <span className={`text-[11px] line-clamp-1 ${isNightMode ? 'text-zinc-400' : 'opacity-60'}`}>{task.desc}</span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-[10px] font-mono ${isNightMode ? 'text-zinc-400' : 'opacity-60'}`}>{task.time}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${task.statusColor}`}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: Create New Project for Client */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl flex flex-col gap-5 ${
              isNightMode
                ? "neu-dark-flat text-zinc-100 border-white/10 shadow-2xl"
                : isNeumorphic
                  ? "bg-[#e6eef8] text-slate-800 border-white/80"
                  : "bg-[#0c0c0e] text-white border-white/20"
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Crear Proyecto para {activeClient.name}</h3>
              <button 
                onClick={() => setIsNewProjectModalOpen(false)}
                className="text-xs opacity-50 hover:opacity-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProjectForClient} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Título del Proyecto</label>
                <input 
                  type="text"
                  placeholder="Ej. Rediseño de Portal Web 3.0"
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  className={`p-3 rounded-xl border text-xs outline-none ${
                    isNeumorphic 
                      ? "bg-slate-200 border-slate-300 text-slate-800" 
                      : "bg-white/5 border-white/10 text-white focus:border-cyan-400"
                  }`}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Presupuesto / Costo ($)</label>
                <input 
                  type="text"
                  placeholder="$15,000"
                  value={newProjectCost}
                  onChange={(e) => setNewProjectCost(e.target.value)}
                  className={`p-3 rounded-xl border text-xs outline-none ${
                    isNeumorphic 
                      ? "bg-slate-200 border-slate-300 text-slate-800" 
                      : "bg-white/5 border-white/10 text-white focus:border-cyan-400"
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold opacity-60 hover:opacity-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black uppercase bg-purple-500 text-white shadow-lg cursor-pointer hover:bg-purple-600"
                >
                  Crear Proyecto
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
