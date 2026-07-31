"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Briefcase, DollarSign, Calendar, Mail, Phone, ExternalLink, 
  Plus, CheckCircle2, AlertCircle, ArrowUpRight, ShieldCheck, Sparkles, FolderPlus,
  Layers, ChevronDown, LayoutGrid, Table, CalendarDays, Edit3, Check, X, Trash2, Folder, Clock, Flag
} from 'lucide-react';
import { Project, Task } from './ProjectDashboard';
import { ClientItem, INITIAL_CLIENTS } from './ClientsDashboard';
import KanbanBoard from './KanbanBoard';
import TaskTableView from './TaskTableView';
import TimelineDiario from './TimelineDiario';
import DeleteConfirmModal from './DeleteConfirmModal';
import { playSound } from '../utils/audio';
import { doc, getDoc, setDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { persistProjectUpdate } from '../utils/persist';
import { autoEvaluateProjectStatus } from '../utils/data';
import { SynthesizedTask } from './KanbanColumn';
import { getCardColorTheme, CARD_COLOR_KEYS } from "@/lib/utils";

export interface ClientV2DashboardProps {
  projects: Project[];
  onUpdateProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  onSelectProject: (projectId: number | string) => void;
  isNeumorphic?: boolean;
  isNightMode?: boolean;
}

export function ClientV2Dashboard({
  projects,
  onUpdateProjects,
  onSelectProject,
  isNeumorphic = false,
  isNightMode = true,
}: ClientV2DashboardProps) {
  // State for Clients
  const [clients, setClients] = useState<ClientItem[]>(INITIAL_CLIENTS);
  const [activeClientId, setActiveClientId] = useState<number>(1);
  const [isClientsLoaded, setIsClientsLoaded] = useState<boolean>(false);
  const [isEditingNotes, setIsEditingNotes] = useState<boolean>(false);
  const [editedNotes, setEditedNotes] = useState<string>('');

  // View state
  const [activeView, setActiveView] = useState<"kanban" | "tabla" | "timeline">("kanban");
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [groupingMode, setGroupingMode] = useState<"fecha" | "cliente" | "prioridad" | "estado">("estado");
  const [groupDropdownOpen, setGroupDropdownOpen] = useState<boolean>(false);

  // Kanban interaction state
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [activeStatusDropdownCardId, setActiveStatusDropdownCardId] = useState<string | null>(null);
  const [activeFormatDropdownCardId, setActiveFormatDropdownCardId] = useState<string | null>(null);
  const [activeTimeDropdownCardId, setActiveTimeDropdownCardId] = useState<string | null>(null);
  const [activeColorSelectorCardId, setActiveColorSelectorCardId] = useState<string | null>(null);
  const [hoveredStatusOptionCard, setHoveredStatusOptionCard] = useState<{ taskId: string; status: string } | null>(null);
  const [hoveredFormatOptionCard, setHoveredFormatOptionCard] = useState<{ taskId: string; format: string } | null>(null);
  const [availableFormats, setAvailableFormats] = useState<string[]>(["Reel", "Post", "Portada", "Flyer", "Video", "Copywriting", "Branding"]);
  const [editingTaskField, setEditingTaskField] = useState<{ taskId: string; field: "title" | "desc" } | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [columnScrollIndices, setColumnScrollIndices] = useState<Record<string, number>>({});

  // 1. Load clients from Firestore v3_clients
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const colRef = collection(db, "v3_clients");
        const snap = await getDocs(colRef);
        if (snap.empty) {
          // Seed INITIAL_CLIENTS into Firestore
          const seedPromises = INITIAL_CLIENTS.map(c => setDoc(doc(db, "v3_clients", String(c.id)), c));
          await Promise.all(seedPromises);
          setClients(INITIAL_CLIENTS);
        } else {
          const list: ClientItem[] = [];
          snap.forEach(d => list.push(d.data() as ClientItem));
          list.sort((a, b) => a.id - b.id);
          setClients(list);
        }
      } catch (err) {
        console.error("Error loading v3_clients from Firestore:", err);
        setClients(INITIAL_CLIENTS);
      } finally {
        setIsClientsLoaded(true);
      }
    };
    fetchClients();
  }, []);

  // Active client object
  const activeClient = useMemo(() => {
    return clients.find(c => c.id === activeClientId) || clients[0] || INITIAL_CLIENTS[0];
  }, [clients, activeClientId]);

  // Update active client notes when switching client
  useEffect(() => {
    if (activeClient) {
      setEditedNotes(activeClient.notes || '');
    }
  }, [activeClient]);

  // Save notes handler
  const handleSaveNotes = async () => {
    if (!activeClient) return;
    const updated = clients.map(c => c.id === activeClient.id ? { ...c, notes: editedNotes } : c);
    setClients(updated);
    setIsEditingNotes(false);
    playSound('click');

    try {
      await updateDoc(doc(db, "v3_clients", String(activeClient.id)), { notes: editedNotes });
    } catch (e) {
      console.error("Failed to update client notes in Firestore:", e);
    }
  };

  // Cycle client status (VIP -> Activo -> Prospecto -> Concluido -> VIP)
  const handleCycleStatus = async () => {
    if (!activeClient) return;
    const statuses: Array<"VIP" | "Activo" | "Prospecto" | "Concluido"> = ["VIP", "Activo", "Prospecto", "Concluido"];
    const colors = {
      "VIP": "bg-purple-500/10 border-purple-500/30 text-purple-400",
      "Activo": "bg-blue-500/10 border-blue-500/30 text-blue-400",
      "Prospecto": "bg-amber-500/10 border-amber-500/30 text-amber-400",
      "Concluido": "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    };
    const nextIndex = (statuses.indexOf(activeClient.status) + 1) % statuses.length;
    const nextStatus = statuses[nextIndex];
    const nextColor = colors[nextStatus];

    const updated = clients.map(c => c.id === activeClient.id ? { ...c, status: nextStatus, statusColor: nextColor } : c);
    setClients(updated);
    playSound('pop');

    try {
      await updateDoc(doc(db, "v3_clients", String(activeClient.id)), { status: nextStatus, statusColor: nextColor });
    } catch (e) {
      console.error("Failed to update status in Firestore:", e);
    }
  };

  // Projects of the active client
  const clientProjects = useMemo(() => {
    if (!activeClient) return [];
    const clientNameClean = activeClient.name.trim().toLowerCase();
    return projects.filter(p => {
      if (!p.client) return false;
      const pClientClean = p.client.trim().toLowerCase();
      return pClientClean.includes(clientNameClean) || clientNameClean.includes(pClientClean);
    });
  }, [projects, activeClient]);

  // Synthesized tasks for active client across all their projects
  const clientTasks: SynthesizedTask[] = useMemo(() => {
    const list: SynthesizedTask[] = [];
    clientProjects.forEach(p => {
      if (!p.tasks) return;
      const total = p.tasks.length;
      const completed = p.tasks.filter(t => t.status === "Completado").length;
      p.tasks.forEach((t, idx) => {
        list.push({
          id: `kt-${p.id}-${t.id}`,
          projectName: p.title,
          projectId: p.id,
          taskTitle: t.title,
          completedTasks: completed,
          totalTasks: total,
          taskIndex: idx,
          dueDate: t.deadline ? new Date(t.deadline) : (p.deadline ? new Date(p.deadline) : new Date()),
          fecha_programada: t.fecha_programada || t.deadline || p.deadline || new Date().toISOString(),
          fecha_limite: t.fecha_limite || t.deadline || p.deadline || new Date().toISOString(),
          fecha_creacion: t.fecha_creacion || new Date().toISOString(),
          status: t.status,
          format: t.format,
          time: t.time,
          desc: t.desc,
          kanbanOrders: t.kanbanOrders
        });
      });
    });
    return list;
  }, [clientProjects]);

  // Progress metrics calculation
  const totalTasksCount = clientTasks.length;
  const completedTasksCount = clientTasks.filter(t => t.status === "Completado").length;
  const clientProgressPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  // Helpers for TaskCard
  const colorConfig = useMemo(() => {
    return CARD_COLOR_KEYS.reduce((acc: Record<string, any>, key: string) => {
      acc[key] = getCardColorTheme(key, isNightMode);
      return acc;
    }, {} as Record<string, any>);
  }, [isNightMode]);

  const getStatusPillConfig = useCallback((st: string) => {
    switch (st) {
      case "Completado":
        return {
          activeBgClass: "bg-[#10b981] border-none",
          hoverBgClass: "bg-[#34d399] border-none",
          textActiveColor: "text-emerald-100 font-bold",
          textHoverColor: "text-emerald-50 font-bold",
          dotClass: "bg-emerald-100",
        };
      case "En Proceso":
        return {
          activeBgClass: "bg-[#f59e0b] border-none",
          hoverBgClass: "bg-[#fbbf24] border-none",
          textActiveColor: "text-amber-100 font-bold",
          textHoverColor: "text-amber-50 font-bold",
          dotClass: "bg-amber-100",
        };
      case "En Revisión":
      case "Revisión":
        return {
          activeBgClass: "bg-[#8b5cf6] border-none",
          hoverBgClass: "bg-[#a78bfa] border-none",
          textActiveColor: "text-purple-100 font-bold",
          textHoverColor: "text-purple-50 font-bold",
          dotClass: "bg-purple-100",
        };
      case "Planificado":
      case "Pendiente":
      default:
        return {
          activeBgClass: "bg-slate-600 border-none",
          hoverBgClass: "bg-slate-500 border-none",
          textActiveColor: "text-slate-100 font-bold",
          textHoverColor: "text-slate-50 font-bold",
          dotClass: "bg-slate-100",
        };
    }
  }, []);

  const getFormatPillConfig = useCallback((fmt: string, index: number) => {
    const colors = [
      { active: "bg-indigo-500", hover: "bg-indigo-400", text: "text-indigo-100", dot: "bg-indigo-100" },
      { active: "bg-violet-500", hover: "bg-violet-400", text: "text-violet-100", dot: "bg-violet-100" },
      { active: "bg-teal-500", hover: "bg-teal-400", text: "text-teal-100", dot: "bg-teal-100" },
      { active: "bg-sky-500", hover: "bg-sky-400", text: "text-sky-100", dot: "bg-sky-100" },
      { active: "bg-pink-500", hover: "bg-pink-400", text: "text-pink-100", dot: "bg-pink-100" },
    ];
    const c = colors[Math.abs(index) % colors.length];
    return {
      activeBgClass: `${c.active} border-none`,
      hoverBgClass: `${c.hover} border-none`,
      textActiveColor: `${c.text} font-bold`,
      textHoverColor: `${c.text} font-bold`,
      dotClass: c.dot,
    };
  }, []);

  const getCalendarDaysDiff = useCallback((targetDate: Date): number => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTarget = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    return Math.round((startOfTarget.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
  }, []);

  const formatLocalDate = useCallback((d: Date): string => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const updateTaskProperty = useCallback((projId: string | number, tId: string | number, key: string, value: any) => {
    onUpdateProjects(prev => prev.map(p => {
      if (String(p.id) !== String(projId)) return p;
      const updatedTasks = p.tasks?.map(t => {
        if (String(t.id) !== String(tId)) return t;
        const updated = { ...t, [key]: value };
        if (key === "status") {
          updated.statusColor = value === "Completado" 
            ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
            : value === "En Proceso"
              ? "bg-amber-500/20 border-amber-500/30 text-amber-400"
              : value === "En Revisión" || value === "Revisión"
                ? "bg-purple-500/20 border-purple-500/30 text-purple-400"
                : "bg-slate-500/20 border-slate-500/30 text-slate-300";
          updated.fecha_hora_completado = value === "Completado" ? new Date().toISOString() : undefined;
        }
        return updated;
      }) || [];

      const evalProj = autoEvaluateProjectStatus({ ...p, tasks: updatedTasks });
      persistProjectUpdate(p.id, {
        tasks: evalProj.tasks,
        status: evalProj.status,
        statusColor: evalProj.statusColor,
        progress: evalProj.progress,
        percent: evalProj.percent
      });
      return evalProj;
    }));
  }, [onUpdateProjects]);

  const saveEditing = useCallback((projectId: string | number, taskIdStr: string | number) => {
    if (!editingTaskField) return;
    const { field } = editingTaskField;
    updateTaskProperty(projectId, taskIdStr, field === "title" ? "title" : "desc", editingValue);
    setEditingTaskField(null);
    setEditingValue("");
  }, [editingTaskField, editingValue, updateTaskProperty]);

  // Drop task handler for KanbanBoard
  const handleDropTask = (
    taskId: string,
    projectId: string | number,
    oldColId: string | undefined,
    newColId: string,
    orderMap: Record<string, number>
  ) => {
    const parts = taskId.split("-");
    const taskIdStr = parts[2];
    if (!taskIdStr) return;

    if (groupingMode === "estado") {
      const status = newColId.replace("status-", "");
      onUpdateProjects(prev => prev.map(p => {
        const updatedTasks = p.tasks?.map(t => {
          let updatedTask = t;
          const fullTaskId = `kt-${p.id}-${t.id}`;

          if (orderMap[fullTaskId] !== undefined) {
            updatedTask = { 
              ...updatedTask, 
              kanbanOrders: { ...(updatedTask.kanbanOrders || {}), [groupingMode]: orderMap[fullTaskId] } 
            };
          }

          if (String(p.id) === String(projectId) && String(t.id) === String(taskIdStr)) {
            updatedTask = {
              ...updatedTask,
              status: status as any,
              statusColor: status === "Completado" 
                ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                : status === "En Proceso"
                  ? "bg-amber-500/20 border-amber-500/30 text-amber-400"
                  : status === "En Revisión" || status === "Revisión"
                    ? "bg-purple-500/20 border-purple-500/30 text-purple-400"
                    : "bg-slate-500/20 border-slate-500/30 text-slate-300",
              fecha_hora_completado: status === "Completado"
                ? new Date().toISOString()
                : undefined
            };
          }

          return updatedTask;
        }) || [];

        const evalProj = autoEvaluateProjectStatus({
          ...p,
          status: (p.id === projectId && status === "Revisión") ? "En Revisión Interna" : p.status,
          statusColor: (p.id === projectId && status === "Revisión") ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-500" : p.statusColor,
          tasks: updatedTasks
        });

        persistProjectUpdate(p.id, {
          tasks: evalProj.tasks,
          status: evalProj.status,
          statusColor: evalProj.statusColor,
          progress: evalProj.progress,
          percent: evalProj.percent
        });

        return evalProj;
      }));
    }
  };

  const updateVisibleCards = (container: HTMLDivElement) => {
    const children = container.children;
    const scrollTop = container.scrollTop;
    const topVisibleIndex = Math.round(scrollTop / 172);
    
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement;
      child.classList.remove("card-pos-0", "card-pos-1", "card-pos-2");
      if (i === topVisibleIndex) {
        child.classList.add("card-pos-0");
      } else if (i === topVisibleIndex + 1) {
        child.classList.add("card-pos-1");
      } else if (i === topVisibleIndex + 2) {
        child.classList.add("card-pos-2");
      }
    }
  };

  const taskCardSharedProps = {
    projects,
    setProjects: onUpdateProjects,
    colorConfig,
    getStatusPillConfig,
    getFormatPillConfig,
    updateTaskProperty,
    activeStatusDropdownCardId,
    setActiveStatusDropdownCardId,
    activeFormatDropdownCardId,
    setActiveFormatDropdownCardId,
    activeTimeDropdownCardId,
    setActiveTimeDropdownCardId,
    activeColorSelectorCardId,
    setActiveColorSelectorCardId,
    hoveredStatusOptionCard,
    setHoveredStatusOptionCard,
    hoveredFormatOptionCard,
    setHoveredFormatOptionCard,
    availableFormats,
    editingTaskField,
    setEditingTaskField,
    editingValue,
    setEditingValue,
    saveEditing,
    isNightMode,
    isHomeEditMode: false,
    setDeleteModalConfig: () => {},
    getCalendarDaysDiff,
    formatLocalDate,
    onSelectProject,
  };

  return (
    <div className="w-full h-full flex flex-col gap-5 overflow-y-auto pr-1 select-none">
      
      {/* 1. TOP HERO HEADER: Client Information & KPIs (Project Dashboard Style) */}
      <div className={`relative w-full rounded-[24px] p-6 border overflow-hidden shadow-2xl transition-all duration-500 ${
        isNightMode 
          ? "bg-[#16181d]/90 border-white/10 text-white shadow-black/60" 
          : "bg-white/90 border-slate-200 text-slate-900 shadow-slate-200/50"
      }`}>
        {/* Glow backdrop decor */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Client Top Row: Logo, Name, Industry, Status Badge & Quick Dock */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shadow-inner shrink-0 border ${
              isNightMode ? "bg-white/10 border-white/15 text-white" : "bg-slate-100 border-slate-300 text-slate-800"
            }`}>
              {activeClient.logo}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl md:text-3xl font-black tracking-tight">{activeClient.name}</h2>
                <button
                  onClick={handleCycleStatus}
                  className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest border transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer ${activeClient.statusColor}`}
                  title="Haz clic para cambiar el estado del cliente"
                >
                  {activeClient.status}
                </button>
              </div>
              <p className={`text-xs font-medium mt-0.5 ${isNightMode ? "text-slate-400" : "text-slate-500"}`}>
                {activeClient.industry} • Cliente desde {activeClient.sinceDate}
              </p>
            </div>
          </div>

          {/* Quick Client Cards Dock (Horizontal Switcher) */}
          <div className="flex items-center gap-2 overflow-x-auto max-w-full py-1 pr-2">
            <span className={`text-[10px] font-bold uppercase tracking-widest mr-1 ${isNightMode ? "text-slate-500" : "text-slate-400"}`}>
              Clientes:
            </span>
            {clients.map(c => {
              const isSel = c.id === activeClient.id;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveClientId(c.id);
                    playSound('click');
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all duration-200 shrink-0 cursor-pointer ${
                    isSel 
                      ? isNightMode 
                        ? "bg-white/15 border-white/30 text-white shadow-md scale-105" 
                        : "bg-slate-900 border-slate-900 text-white shadow-md scale-105"
                      : isNightMode 
                        ? "bg-white/5 border-white/5 text-slate-400 hover:text-white hover:border-white/10" 
                        : "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span className="text-sm">{c.logo}</span>
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Middle Grid: Financial KPIs & Contact Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mt-5 relative z-10">
          
          {/* Presupuesto Total */}
          <div className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
            isNightMode ? "bg-white/[0.03] border-white/5" : "bg-slate-50 border-slate-200/80"
          }`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isNightMode ? "text-slate-400" : "text-slate-500"}`}>
              Presupuesto Total
            </span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-black text-emerald-400">{activeClient.totalBudget}</span>
            </div>
          </div>

          {/* Monto Pagado */}
          <div className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
            isNightMode ? "bg-white/[0.03] border-white/5" : "bg-slate-50 border-slate-200/80"
          }`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isNightMode ? "text-slate-400" : "text-slate-500"}`}>
              Monto Pagado
            </span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-black text-blue-400">{activeClient.paidAmount}</span>
            </div>
          </div>

          {/* Saldo Pendiente */}
          <div className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
            isNightMode ? "bg-white/[0.03] border-white/5" : "bg-slate-50 border-slate-200/80"
          }`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isNightMode ? "text-slate-400" : "text-slate-500"}`}>
              Saldo Pendiente
            </span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-black text-amber-400">{activeClient.pendingBalance}</span>
            </div>
          </div>

          {/* Proyectos Activos & Avance */}
          <div className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
            isNightMode ? "bg-white/[0.03] border-white/5" : "bg-slate-50 border-slate-200/80"
          }`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isNightMode ? "text-slate-400" : "text-slate-500"}`}>
              Proyectos / Avance
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black">{clientProjects.length} <span className="text-xs font-medium text-slate-400">proyectos</span></span>
              <span className="text-sm font-extrabold text-purple-400">{clientProgressPercent}%</span>
            </div>
          </div>

          {/* Contacto Principal */}
          <div className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
            isNightMode ? "bg-white/[0.03] border-white/5" : "bg-slate-50 border-slate-200/80"
          }`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isNightMode ? "text-slate-400" : "text-slate-500"}`}>
              Contacto Directo
            </span>
            <div className="mt-1 flex flex-col gap-0.5 text-xs truncate">
              <span className="font-bold truncate">{activeClient.contactPerson}</span>
              <span className={`truncate text-[11px] ${isNightMode ? "text-slate-400" : "text-slate-600"}`}>{activeClient.email}</span>
            </div>
          </div>

        </div>

        {/* Bottom Row: Client Projects Pills & Editable Notes */}
        <div className="mt-4 pt-4 border-t border-white/5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 relative z-10">
          
          {/* Projects associated with this client */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[11px] font-bold uppercase tracking-widest ${isNightMode ? "text-slate-400" : "text-slate-600"}`}>
              Proyectos del cliente:
            </span>
            {clientProjects.length === 0 ? (
              <span className="text-xs italic text-slate-500">Sin proyectos registrados</span>
            ) : (
              clientProjects.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    playSound('click');
                    onSelectProject(p.id);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 hover:text-indigo-100 transition-all duration-200 cursor-pointer"
                  title="Ver este proyecto en el Panel de Proyectos"
                >
                  <Folder className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{p.title}</span>
                  <span className="text-[10px] opacity-70">({p.percent || "0%"})</span>
                </button>
              ))
            )}
          </div>

          {/* Notes / Brief preview & edit */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            {isEditingNotes ? (
              <div className="flex items-center gap-2 w-full">
                <input
                  type="text"
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  className={`px-3 py-1 rounded-xl text-xs border outline-none w-full lg:w-80 ${
                    isNightMode ? "bg-black/50 border-white/20 text-white" : "bg-slate-100 border-slate-300 text-slate-900"
                  }`}
                  placeholder="Escribe notas del cliente..."
                  autoFocus
                />
                <button
                  onClick={handleSaveNotes}
                  className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                  title="Guardar notas"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsEditingNotes(false)}
                  className="p-1.5 rounded-lg bg-slate-500/20 text-slate-400 hover:text-white transition-colors"
                  title="Cancelar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className={`text-xs italic truncate max-w-xs ${isNightMode ? "text-slate-400" : "text-slate-600"}`}>
                  "{activeClient.notes || "Sin notas registradas"}"
                </span>
                <button
                  onClick={() => setIsEditingNotes(true)}
                  className="p-1 text-slate-400 hover:text-white transition-colors"
                  title="Editar notas del cliente"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 2. NAVBAR SUPERIOR DE VISTAS (SIN SEARCH) & CONTROLES */}
      <div className="flex items-center justify-between gap-4 py-1 border-b border-white/5">
        
        {/* Left/Center View Switcher Tabs: Kanban, Base de datos, Timeline */}
        <div className="flex items-center rounded-full bg-[oklch(0.55_0.01_286_/_6%)] border border-white/5 p-1 w-fit">
          
          {/* Kanban Tab */}
          <button
            type="button"
            onMouseEnter={() => setHoveredTab("kanban")}
            onMouseLeave={() => setHoveredTab(null)}
            onClick={() => {
              setActiveView("kanban");
              playSound('click');
            }}
            className={`relative z-10 inline-flex h-8 items-center justify-center rounded-full whitespace-nowrap select-none gap-1.5 px-4 text-xs font-bold transition-colors duration-200 cursor-pointer ${
              activeView === "kanban"
                ? isNightMode ? "text-white" : "text-slate-900"
                : isNightMode ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {activeView === "kanban" && (
              <motion.span
                layoutId="activeClientViewIndicator"
                className={`absolute inset-0 rounded-full border ${isNightMode ? "bg-white/10 border-white/10 shadow-sm" : "bg-white border-slate-200 shadow-sm"}`}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <LayoutGrid className={`w-4 h-4 shrink-0 relative z-10 ${isNightMode ? (activeView === "kanban" ? "text-white" : "text-slate-400") : "text-slate-700"}`} />
            <span className="relative z-10">Kanban</span>
          </button>

          {/* Base de datos Tab */}
          <button
            type="button"
            onMouseEnter={() => setHoveredTab("tabla")}
            onMouseLeave={() => setHoveredTab(null)}
            onClick={() => {
              setActiveView("tabla");
              playSound('click');
            }}
            className={`relative z-10 inline-flex h-8 items-center justify-center rounded-full whitespace-nowrap select-none gap-1.5 px-4 text-xs font-bold transition-colors duration-200 cursor-pointer ${
              activeView === "tabla"
                ? isNightMode ? "text-white" : "text-slate-900"
                : isNightMode ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {activeView === "tabla" && (
              <motion.span
                layoutId="activeClientViewIndicator"
                className={`absolute inset-0 rounded-full border ${isNightMode ? "bg-white/10 border-white/10 shadow-sm" : "bg-white border-slate-200 shadow-sm"}`}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Table className={`w-4 h-4 shrink-0 relative z-10 ${isNightMode ? (activeView === "tabla" ? "text-white" : "text-slate-400") : "text-slate-700"}`} />
            <span className="relative z-10">Base de datos</span>
          </button>

          {/* Timeline Tab */}
          <button
            type="button"
            onMouseEnter={() => setHoveredTab("timeline")}
            onMouseLeave={() => setHoveredTab(null)}
            onClick={() => {
              setActiveView("timeline");
              playSound('click');
            }}
            className={`relative z-10 inline-flex h-8 items-center justify-center rounded-full whitespace-nowrap select-none gap-1.5 px-4 text-xs font-bold transition-colors duration-200 cursor-pointer ${
              activeView === "timeline"
                ? isNightMode ? "text-white" : "text-slate-900"
                : isNightMode ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {activeView === "timeline" && (
              <motion.span
                layoutId="activeClientViewIndicator"
                className={`absolute inset-0 rounded-full border ${isNightMode ? "bg-white/10 border-white/10 shadow-sm" : "bg-white border-slate-200 shadow-sm"}`}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <CalendarDays className={`w-4 h-4 shrink-0 relative z-10 ${isNightMode ? (activeView === "timeline" ? "text-white" : "text-slate-400") : "text-slate-700"}`} />
            <span className="relative z-10">Timeline</span>
          </button>

        </div>

        {/* Right Controls: Grouping Dropdown & Task counter */}
        <div className="flex items-center gap-3">
          
          <div className="relative">
            <button
              onClick={() => {
                playSound('click');
                setGroupDropdownOpen(!groupDropdownOpen);
              }}
              title="Agrupar y ordenar"
              className={`flex items-center justify-center h-8 w-8 rounded-full border transition-all duration-200 shrink-0 shadow-sm active:scale-95 ${
                isNightMode
                  ? "bg-[oklch(0.55_0.01_286_/_6%)] border-white/5 text-slate-300 hover:text-white hover:border-white/10"
                  : "bg-[oklch(0.55_0.01_286_/_4%)] border-slate-200 text-slate-750 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              <Layers className="w-4 h-4 text-slate-400" />
            </button>

            <AnimatePresence>
              {groupDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.15 }}
                  className={`absolute right-0 mt-2.5 w-52 rounded-2xl border backdrop-blur-md shadow-2xl z-[150] p-2 flex flex-col gap-0.5 ${
                    isNightMode
                      ? "bg-slate-950/90 border-white/10 text-slate-300 shadow-black/80"
                      : "bg-white/95 border-slate-200 text-slate-700 shadow-slate-200/50"
                  }`}
                >
                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2.5 py-1 select-none">
                    Agrupar por
                  </div>
                  
                  <button
                    onClick={() => { setGroupingMode("estado"); setGroupDropdownOpen(false); }}
                    className={`text-left px-2.5 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-between transition-all duration-150 ${
                      groupingMode === "estado" ? (isNightMode ? "bg-white/10 text-white font-bold" : "bg-slate-100 text-slate-950 font-bold") : ""
                    }`}
                  >
                    <span>Estado de tarea</span>
                    {groupingMode === "estado" && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                  </button>

                  <button
                    onClick={() => { setGroupingMode("prioridad"); setGroupDropdownOpen(false); }}
                    className={`text-left px-2.5 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-between transition-all duration-150 ${
                      groupingMode === "prioridad" ? (isNightMode ? "bg-white/10 text-white font-bold" : "bg-slate-100 text-slate-950 font-bold") : ""
                    }`}
                  >
                    <span>Prioridad</span>
                    {groupingMode === "prioridad" && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                  </button>

                  <button
                    onClick={() => { setGroupingMode("fecha"); setGroupDropdownOpen(false); }}
                    className={`text-left px-2.5 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-between transition-all duration-150 ${
                      groupingMode === "fecha" ? (isNightMode ? "bg-white/10 text-white font-bold" : "bg-slate-100 text-slate-950 font-bold") : ""
                    }`}
                  >
                    <span>Fecha de entrega</span>
                    {groupingMode === "fecha" && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                  </button>

                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
            isNightMode ? "bg-white/5 border-white/10 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
          }`}>
            {clientTasks.length} tareas
          </span>

        </div>

      </div>

      {/* 3. MAIN DASHBOARD CONTENT AREA: Filtered Client Tasks */}
      <div className="flex-1 min-h-[500px] relative">
        <AnimatePresence mode="wait">
          
          {/* KANBAN VIEW */}
          {activeView === "kanban" && (
            <motion.div
              key="client-kanban"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full"
            >
              <KanbanBoard
                projects={projects}
                filteredKanbanTasks={clientTasks}
                groupingMode={groupingMode}
                isNightMode={isNightMode}
                headerBgStyle={isNightMode ? "bg-[#111113]" : "bg-[#fffce2]"}
                draggingTaskId={draggingTaskId}
                setDraggingTaskId={setDraggingTaskId}
                activeStatusDropdownCardId={activeStatusDropdownCardId}
                activeFormatDropdownCardId={activeFormatDropdownCardId}
                activeTimeDropdownCardId={activeTimeDropdownCardId}
                activeColorSelectorCardId={activeColorSelectorCardId}
                editingTaskField={editingTaskField}
                expandedCardId={expandedCardId}
                setExpandedCardId={setExpandedCardId}
                columnScrollIndices={columnScrollIndices}
                setColumnScrollIndices={setColumnScrollIndices}
                updateVisibleCards={updateVisibleCards}
                getCalendarDaysDiff={getCalendarDaysDiff}
                formatLocalDate={formatLocalDate}
                handleDropTask={handleDropTask}
                taskCardSharedProps={taskCardSharedProps}
              />
            </motion.div>
          )}

          {/* TABLE VIEW */}
          {activeView === "tabla" && (
            <motion.div
              key="client-tabla"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full"
            >
              <TaskTableView
                projects={clientProjects}
                kanbanTasks={clientTasks as any}
                headerBgStyle=""
                cardBgStyle=""
                onSelectTab={() => {}}
                onSelectProject={(projId) => onSelectProject(Number(projId))}
              />
            </motion.div>
          )}

          {/* TIMELINE VIEW */}
          {activeView === "timeline" && (
            <motion.div
              key="client-timeline"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full"
            >
              <TimelineDiario
                tasks={clientTasks as any}
                projects={clientProjects as any}
                updateTaskProperty={() => {}}
                isNightMode={isNightMode}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}
