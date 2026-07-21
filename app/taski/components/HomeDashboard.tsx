"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, LayoutGrid, Table, CalendarDays, ExternalLink, MoreHorizontal, ArrowRight, TrendingUp, ArrowUpRight, Wallet, Activity, Layers, Flag, Calendar, ChevronDown, ChevronUp, Plus, Check, Clock, X, AlertTriangle, Settings } from "lucide-react";
import { Project, Task } from "./ProjectDashboard";
import TimeHeatmap from "./TimeHeatmap";
import DailyEffortBar from "./DailyEffortBar";
import TimelineDiario from "./TimelineDiario";
import KanbanBoard from "./KanbanBoard";
import TaskTableView from "./TaskTableView";
import DeleteConfirmModal from "./DeleteConfirmModal";
import { playSound } from "../utils/audio";
import { parseTimeToHours, getCardColorTheme, CARD_COLOR_KEYS } from "@/lib/utils";
import { autoEvaluateProjectStatus } from "../utils/data";
import { persistProjectUpdate } from "../utils/persist";

interface SynthesizedTask {
  id: string;
  projectName: string;
  projectId: number;
  taskTitle: string;
  completedTasks: number;
  totalTasks: number;
  taskIndex: number;
  dueDate: Date;
  fecha_programada: string;
  fecha_limite: string;
  fecha_creacion: string;
  status?: string;
  format?: string;
  time?: string;
  desc?: string;
  kanbanOrders?: Record<string, number>;
}





type ViewMode = "buscar" | "kanban" | "tabla" | "timeline";

interface HomeDashboardProps {
  projects: Project[];
  onSelectTab: (tab: string) => void;
  onSelectProject?: (projectId: string | number) => void;
  isNeumorphic: boolean;
  isNightMode: boolean;
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  viewFilterMode: "mio" | "equipo";
  groupingMode: "fecha" | "cliente" | "prioridad" | "estado";
  onUpdateProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  isHomeEditMode?: boolean;
  onDeleteProject?: (id: number) => void;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
}


const updateVisibleCards = (container: HTMLDivElement) => {
  const children = container.children;
  const scrollTop = container.scrollTop;
  // Card height is 162px, gap is 10px. Total 172px.
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

export function HomeDashboard({
  projects,
  onSelectTab,
  onSelectProject,
  isNeumorphic,
  isNightMode,
  activeView,
  onViewChange,
  viewFilterMode,
  groupingMode,
  onUpdateProjects,
  isHomeEditMode = false,
  onDeleteProject,
  searchQuery = "",
  onSearchQueryChange,
}: HomeDashboardProps) {
  const colorConfig = CARD_COLOR_KEYS.reduce((acc: Record<string, any>, key: string) => {
    acc[key] = getCardColorTheme(key, isNightMode);
    return acc;
  }, {} as Record<string, any>);

  const [columnScrollIndices, setColumnScrollIndices] = useState<Record<string, number>>({});
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const [deleteModalConfig, setDeleteModalConfig] = useState<{
    isOpen: boolean;
    step: 1 | 2;
    projectId: number;
    projectTitle: string;
    taskId: number;
    taskTitle: string;
    targetType?: "task" | "project";
  } | null>(null);

  const [availableFormats, setAvailableFormats] = useState<string[]>([
    "Reel",
    "Post",
    "Portada",
    "Flyer",
    "Video",
    "Copywriting",
    "Branding"
  ]);

  const [activeStatusDropdownCardId, setActiveStatusDropdownCardId] = useState<string | null>(null);
  const [activeFormatDropdownCardId, setActiveFormatDropdownCardId] = useState<string | null>(null);
  const [isAddingNewFormat, setIsAddingNewFormat] = useState<boolean>(false);
  const [newFormatValue, setNewFormatValue] = useState<string>("");
  const [activeColorSelectorCardId, setActiveColorSelectorCardId] = useState<string | null>(null);

  const [hoveredStatusOptionCard, setHoveredStatusOptionCard] = useState<{ taskId: string; status: string } | null>(null);
  const [hoveredFormatOptionCard, setHoveredFormatOptionCard] = useState<{ taskId: string; format: string } | null>(null);

  const getStatusPillConfig = React.useCallback((st: string) => {
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

  const getFormatPillConfig = React.useCallback((fmt: string, index: number) => {
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

  const [editingTaskField, setEditingTaskField] = useState<{ taskId: string; field: "title" | "desc" } | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  const registerNativeEdit = React.useCallback((taskId: string, field: "title" | "desc", currentValue: string) => {
    return (node: HTMLElement | null) => {
      if (!node) return;
      node.onmousedown = (e) => e.stopPropagation();
      node.ontouchstart = (e) => e.stopPropagation();
      node.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        playSound('click');
        setEditingTaskField({ taskId, field });
        setEditingValue(currentValue || "");
      };
    };
  }, []);

  const registerNativeInput = React.useCallback((node: HTMLElement | null) => {
    if (!node) return;
    node.onmousedown = (e) => e.stopPropagation();
    node.ontouchstart = (e) => e.stopPropagation();
  }, []);


  const [activeTimeDropdownCardId, setActiveTimeDropdownCardId] = useState<string | null>(null);
  const [isAddingCustomTime, setIsAddingCustomTime] = useState<boolean>(false);
  const [customTimeValue, setCustomTimeValue] = useState<string>("");
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [hoveredColumnId, setHoveredColumnId] = useState<string | null>(null);
  const boardRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        activeStatusDropdownCardId !== null ||
        activeFormatDropdownCardId !== null ||
        activeTimeDropdownCardId !== null ||
        activeColorSelectorCardId !== null
      ) {
        if (!target.closest("[data-dropdown-container]")) {
          setActiveStatusDropdownCardId(null);
          setActiveFormatDropdownCardId(null);
          setActiveTimeDropdownCardId(null);
          setActiveColorSelectorCardId(null);
          setIsAddingNewFormat(false);
          setIsAddingCustomTime(false);
        }
      }
    };

    window.addEventListener("click", handleOutsideClick);
    return () => {
      window.removeEventListener("click", handleOutsideClick);
    };
  }, [activeStatusDropdownCardId, activeFormatDropdownCardId, activeTimeDropdownCardId, activeColorSelectorCardId]);


  const formatLocalDate = (d: Date): string => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const handleDropTask = (taskId: string, projectId: string | number, oldColId: string | undefined, newColId: string, orderMap: Record<string, number>) => {
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

        // Atomic update for project
        persistProjectUpdate(p.id, {
          tasks: evalProj.tasks,
          status: evalProj.status,
          statusColor: evalProj.statusColor,
          progress: evalProj.progress,
          percent: evalProj.percent
        });

        return evalProj;
      }));
    } else if (groupingMode === "prioridad") {
      const priority = newColId.replace("priority-", "");
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
          return updatedTask;
        }) || [];
        
        const targetPriority = String(p.id) === String(projectId) ? priority : p.priority;
        const evalProj = autoEvaluateProjectStatus({ ...p, priority: targetPriority, tasks: updatedTasks });

        persistProjectUpdate(p.id, {
          tasks: evalProj.tasks,
          priority: evalProj.priority
        });

        return evalProj;
      }));
    } else if (groupingMode === "fecha") {
      const today = new Date();
      let targetDate = new Date();
      if (newColId === "manana") {
        targetDate.setDate(today.getDate() + 1);
      } else if (newColId === "semana") {
        targetDate.setDate(today.getDate() + 4);
      } else if (newColId === "mes") {
        targetDate.setDate(today.getDate() + 15);
      }
      const dateStr = formatLocalDate(targetDate);
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
            updatedTask = { ...updatedTask, fecha_programada: dateStr };
          }
          
          return updatedTask;
        }) || [];

        const evalProj = autoEvaluateProjectStatus({ ...p, tasks: updatedTasks });

        persistProjectUpdate(p.id, {
          tasks: evalProj.tasks
        });

        return evalProj;
      }));
    } else if (groupingMode === "cliente") {
      const uniqueClients = Array.from(new Set(projects.map(p => p.client))).slice(0, 4);
      while (uniqueClients.length < 4) {
        uniqueClients.push(`Cliente ${uniqueClients.length + 1}`);
      }
      const clientIdx = parseInt(newColId.replace("client-", ""), 10);
      const targetClient = uniqueClients[clientIdx];
      if (targetClient) {
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
            return updatedTask;
          }) || [];

          const clientName = p.id === projectId ? targetClient : p.client;
          const evalProj = autoEvaluateProjectStatus({ ...p, client: clientName, tasks: updatedTasks });

          persistProjectUpdate(p.id, {
            tasks: evalProj.tasks,
            client: evalProj.client
          });

          return evalProj;
        }));
      }
    }
  };

  useEffect(() => {
    const formatsSet = new Set(availableFormats);
    projects.forEach(p => {
      p.tasks?.forEach(t => {
        if (t.format) {
          formatsSet.add(t.format);
        }
      });
    });
    setAvailableFormats(Array.from(formatsSet));
  }, [projects]);

  const updateTaskProperty = React.useCallback((projId: string | number, tId: string | number, key: string, value: any) => {
    onUpdateProjects(prev => prev.map(p => {
      if (String(p.id) !== String(projId)) return p;
      const updatedTasks = p.tasks?.map(t => {
        if (String(t.id) !== String(tId)) return t;

        // Preserve stable due date even if dynamically generated previously
        const existingProgDate = t.fecha_programada || (() => {
          let offset = 0;
          if (t.status === "Completado") offset = 12;
          else if (t.status === "En Proceso") offset = 0;
          else {
            if (Number(t.id) % 3 === 0) offset = 1;
            else if (Number(t.id) % 3 === 1) offset = 4;
            else offset = 15;
          }
          const d = new Date();
          d.setDate(d.getDate() + offset);
          return formatLocalDate(d);
        })();

        const updated = { 
          ...t, 
          fecha_programada: t.fecha_programada || existingProgDate,
          [key]: value 
        };

        if (key === "status") {
          updated.statusColor = value === "Completado" 
            ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
            : value === "En Proceso"
              ? "bg-amber-500/20 border-amber-500/30 text-amber-400"
              : value === "En Revisión" || value === "Revisión"
                ? "bg-purple-500/20 border-purple-500/30 text-purple-400"
                : "bg-slate-500/20 border-slate-500/30 text-slate-300";
          updated.fecha_hora_completado = value === "Completado" 
            ? new Date().toISOString() 
            : undefined;
        }
        return updated;
      }) || [];

      const evalProj = autoEvaluateProjectStatus({
        ...p,
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
  }, [onUpdateProjects]);

  const saveEditing = React.useCallback((projectId: string | number, taskIdStr: string | number) => {
    if (!editingTaskField) return;
    const { field } = editingTaskField;
    updateTaskProperty(projectId, taskIdStr, field === "title" ? "title" : "desc", editingValue);
    setEditingTaskField(null);
    setEditingValue("");
  }, [editingTaskField, editingValue, updateTaskProperty]);
  useEffect(() => {
    if (expandedCardId === null) {
      setActiveStatusDropdownCardId(null);
      setActiveFormatDropdownCardId(null);
      setIsAddingNewFormat(false);
      setNewFormatValue("");
      setActiveTimeDropdownCardId(null);
      setIsAddingCustomTime(false);
      setCustomTimeValue("");
      setActiveColorSelectorCardId(null);
    }
  }, [expandedCardId]);




  // LED counter stats calculations
  const totalProjects = projects.length;
  const totalTasks = projects.reduce((acc, p) => acc + (p.tasks?.length || 0), 0);
  const totalHours = projects.reduce((acc, p) => {
    // Sum up only non-completed tasks' hours for this project
    const pendingTasksSum = p.tasks?.reduce((sum, t) => {
      if (t.status === "Completado") return sum;
      const sessionsSum = t.sessions?.reduce((sAcc, s) => sAcc + s.hours, 0) || 0;
      const parsedTime = parseTimeToHours(t.time);
      return sum + Math.max(sessionsSum, parsedTime);
    }, 0) || 0;

    return acc + pendingTasksSum;
  }, 0);

  // Estado persistido en localStorage
  const [limiteHorasDia, setLimiteHorasDia] = useState(() => {
    if (typeof window !== 'undefined') {
      return Number(localStorage.getItem('taski_limite_horas_dia')) || 8;
    }
    return 8;
  });

  // Vertical Navbar Pill State
  const [isVerticalNavExpanded, setIsVerticalNavExpanded] = useState(false);
  const [selectedVerticalOption, setSelectedVerticalOption] = useState("opcion1");
  const [hoveredVerticalOption, setHoveredVerticalOption] = useState<string | null>(null);

  const verticalNavOptions = React.useMemo(() => [
    { 
      id: "opcion1", 
      label: "Opción 1", 
      activeBgClass: "bg-[#10b981] border-none",
      hoverBgClass: "bg-[#34d399] border-none",
      textActiveColor: "text-slate-950 font-extrabold",
      textHoverColor: "text-slate-950 font-bold",
      dotClass: "bg-slate-950"
    },
    { 
      id: "opcion2", 
      label: "Opción 2", 
      activeBgClass: "bg-[#0ea5e9] border-none",
      hoverBgClass: "bg-[#38bdf8] border-none",
      textActiveColor: "text-slate-950 font-extrabold",
      textHoverColor: "text-slate-950 font-bold",
      dotClass: "bg-slate-950"
    },
    { 
      id: "opcion3", 
      label: "Opción 3", 
      activeBgClass: "bg-[#f59e0b] border-none",
      hoverBgClass: "bg-[#fbbf24] border-none",
      textActiveColor: "text-slate-950 font-extrabold",
      textHoverColor: "text-slate-950 font-bold",
      dotClass: "bg-slate-950"
    },
    { 
      id: "opcion4", 
      label: "Opción 4", 
      activeBgClass: "bg-[#a855f7] border-none",
      hoverBgClass: "bg-[#c084fc] border-none",
      textActiveColor: "text-white font-extrabold",
      textHoverColor: "text-white font-bold",
      dotClass: "bg-white"
    },
  ], []);

  // Cálculo del esfuerzo diario
  const todayEffort = React.useMemo<{
    verde: number;
    naranja: number;
    gris: number;
    excedente: number;
    maxVal: number;
    verdeCount: number;
    naranjaCount: number;
    nextTask: { title: string; hours: number } | null;
    total: number;
    tasksVerde: { id: number; title: string; hours: number; kanbanOrders?: any }[];
    tasksNaranja: { id: number; title: string; hours: number; kanbanOrders?: any }[];
  }>(() => {
    const hoy = formatLocalDate(new Date());
    let verde = 0, naranja = 0, verdeCount = 0, naranjaCount = 0;
    const tasksVerde: { id: number; title: string; hours: number; kanbanOrders?: any }[] = [];
    const tasksNaranja: { id: number; title: string; hours: number; kanbanOrders?: any }[] = [];

    projects.forEach(p => {
      (p.tasks || []).forEach(t => {
        const isToday = t.fecha_programada === hoy;
        const completedToday = t.status === "Completado"
          && t.fecha_hora_completado?.startsWith(hoy);

        if (!isToday && !completedToday) return;

        const hours = parseTimeToHours(t.time);

        if (t.status === "Completado" && (completedToday || (isToday && !t.fecha_hora_completado))) {
          verde += hours;
          verdeCount++;
          tasksVerde.push({ id: t.id, title: t.title, hours, kanbanOrders: t.kanbanOrders });
        } else if (t.status !== "Completado" && isToday) {
          naranja += hours;
          naranjaCount++;
          tasksNaranja.push({ id: t.id, title: t.title, hours, kanbanOrders: t.kanbanOrders });
        }
      });
    });

    const sortFn = (a: any, b: any) => {
      const orderA = a.kanbanOrders?.[groupingMode] ?? Infinity;
      const orderB = b.kanbanOrders?.[groupingMode] ?? Infinity;
      if (orderA === Infinity && orderB === Infinity) {
        return a.id - b.id;
      }
      return orderA - orderB;
    };
    
    tasksVerde.sort(sortFn);
    tasksNaranja.sort(sortFn);

    const nextTask = tasksNaranja.length > 0 ? { title: tasksNaranja[0].title, hours: tasksNaranja[0].hours } : null;

    const total = verde + naranja;
    const excedente = Math.max(0, total - limiteHorasDia);
    const gris = Math.max(0, limiteHorasDia - total);
    const maxVal = Math.max(limiteHorasDia, total);

    return { verde, naranja, gris, excedente, maxVal, verdeCount, naranjaCount, nextTask, total, tasksVerde, tasksNaranja };
  }, [projects, limiteHorasDia, groupingMode]);

  const kanbanTasks = React.useMemo(() => {
    const list: any[] = [];
    if (!projects) return list;
    
    projects.forEach(p => {
      if (p.tasks) {
        p.tasks.forEach((t, index) => {
          // Calculate completed tasks in the parent project
          const completedCount = p.tasks?.filter(tk => tk.status === "Completado").length || 0;
          const totalCount = p.tasks?.length || 0;

          // Dynamically distribute due dates based on task status or task ID if not set:
          const progDateStr = t.fecha_programada || (() => {
            let offset = 0;
            if (t.status === "Completado") {
              offset = 12; // Completado -> Este mes
            } else if (t.status === "En Proceso") {
              offset = 0; // En proceso -> Hoy
            } else {
              // Pending tasks are distributed:
              if (t.id % 3 === 0) offset = 1; // Tomorrow
              else if (t.id % 3 === 1) offset = 4; // This Week
              else offset = 15; // This Month
            }
            const d = new Date();
            d.setDate(d.getDate() + offset);
            return formatLocalDate(d);
          })();

          const limitDateStr = t.fecha_limite || t.deadline || progDateStr;

          const createdDateStr = t.fecha_creacion || (() => {
            const d = new Date();
            const offset = 2 + (t.id % 5);
            d.setDate(d.getDate() - offset);
            return formatLocalDate(d);
          })();

          const dueDate = new Date(progDateStr + "T00:00:00");

          list.push({
            id: `kt-${p.id}-${t.id}`,
            projectName: p.title,
            projectId: p.id,
            taskTitle: t.title,
            completedTasks: completedCount,
            totalTasks: totalCount,
            taskIndex: index + 1,
            dueDate,
            fecha_programada: progDateStr,
            fecha_limite: limitDateStr,
            fecha_creacion: createdDateStr,
            status: t.status,
            format: t.format,
            time: t.time,
            desc: t.desc,
            kanbanOrders: t.kanbanOrders
          });
        });
      }
    });

    // Ordenar globalmente por la vista actual (groupingMode)
    list.sort((a, b) => {
      // Usamos Infinity para que las tareas viejas sin reordenar queden al final en lugar de colarse en medio.
      // Si ambas son Infinity, las ordenamos por ID/índice para que el renderizado sea estable.
      const orderA = a.kanbanOrders?.[groupingMode] ?? Infinity;
      const orderB = b.kanbanOrders?.[groupingMode] ?? Infinity;
      
      if (orderA === Infinity && orderB === Infinity) {
        return a.taskIndex - b.taskIndex;
      }
      return orderA - orderB;
    });

    return list;
  }, [projects, groupingMode]);

  const filteredKanbanTasks = React.useMemo(() => {
    let result = kanbanTasks;

    // Filter out completed tasks ONLY when grouping by delivery date ("fecha")
    if (groupingMode === "fecha") {
      result = result.filter(t => t.status !== "Completado" && t.status !== "Completada");
    }

    if (viewFilterMode === "mio") {
      result = result.filter(t => {
        const parts = t.id.split("-");
        const taskIdStr = parts[2] || "0";
        const charSum = taskIdStr.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
        return charSum % 2 === 0;
      });
    }
    return result;
  }, [kanbanTasks, viewFilterMode, groupingMode]);

  const getCalendarDaysDiff = (targetDate: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };



  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const view = params.get("view") as ViewMode;
      if (view && ["buscar", "kanban", "tabla", "timeline"].includes(view)) {
        onViewChange(view);
      }
    }
  }, [onViewChange]);

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
    isHomeEditMode,
    setDeleteModalConfig,
    getCalendarDaysDiff,
    formatLocalDate,
  };

  const headerBgStyle = isNightMode ? "bg-white/[0.03]" : "bg-black/[0.03]";
  const bgStyle = headerBgStyle;
  const r1BgStyle = isNightMode ? "bg-[#111113]" : "bg-[#f8fafc]";
  const r1BorderStyle = isNightMode ? "border border-white/10" : "border border-slate-200";
  const cardBgStyle = isNightMode ? "bg-white/[0.04]" : "bg-black/[0.04]";

  return (
    <div className={`w-full h-full flex flex-col gap-5 hide-scrollbar pb-6 pr-2 pt-1 ${
      draggingTaskId ? "overflow-visible is-dragging-active" : "overflow-y-auto"
    }`}>
      <style>{`
        @keyframes subtle-wiggle {
          0% { transform: rotate(-0.5deg); }
          100% { transform: rotate(0.5deg); }
        }
        @keyframes subtle-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.82; }
        }
        .home-edit-wiggle {
          animation: subtle-wiggle 0.22s ease-in-out infinite alternate, subtle-pulse 1.3s ease-in-out infinite;
        }

        .task-list-scroll {
          scroll-snap-type: y mandatory;
          scroll-behavior: smooth;
        }
        /* Disable scroll-snap while hovering so the browser does not re-snap
           during accordion height animations (prevents flickering) */
        .task-list-scroll:has(.task-card-wrapper:hover),
        .task-list-scroll.hover-disabled,
        .task-list-scroll.is-scrolling {
          scroll-snap-type: none !important;
        }



        /* During scrolling or cooldown, force all wrappers to 162px and disable hover scale/pointer events */
        .task-list-scroll.is-scrolling .task-card-wrapper,
        .task-list-scroll.hover-disabled .task-card-wrapper {
          height: 162px !important;
          pointer-events: none !important;
        }
        /* Reset card internals to defaults during scroll/cooldown */
        .task-list-scroll.is-scrolling .task-card-title,
        .task-list-scroll.hover-disabled .task-card-title {
          transform: translateY(12px) !important;
        }
        .task-list-scroll.is-scrolling .project-title,
        .task-list-scroll.hover-disabled .project-title {
          transform: translateY(0) !important;
          opacity: 1 !important;
        }
        .task-list-scroll.is-scrolling .task-card-details,
        .task-list-scroll.hover-disabled .task-card-details {
          opacity: 0 !important;
          transform: translateY(22px) !important;
        }

        /* Wrapper clips inner card content directionally */
        .task-card-wrapper {
          height: 162px;
          overflow: hidden;
          opacity: 1;
          transition: height 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) !important;
          will-change: height, opacity;
          scroll-snap-align: start;
          scroll-margin-top: 10px;
          touch-action: none;
        }
        .task-card-wrapper.is-dragging-card {
          transition: none !important;
        }

        /* Delay card hover changes to prevent accidental triggers when passing cursor by */
        .task-list-scroll:has(.task-card-wrapper:hover) .task-card-wrapper {
          transition-delay: 280ms !important;
        }
        .task-list-scroll:has(.task-card-wrapper:hover) .task-card {
          transition-delay: 280ms !important;
        }
        .task-list-scroll:has(.task-card-wrapper:hover) .project-title {
          transition-delay: 280ms !important;
        }
        .task-list-scroll:has(.task-card-wrapper:hover) .task-card-title {
          transition-delay: 280ms !important;
        }


        /* Hovered card expands to 215px (+53px from 162px baseline) ONLY when NO card is expanded double */
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)) .card-pos-0:hover,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)) .card-pos-1:hover,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)) .card-pos-2:hover {
          height: 215px !important;
        }

        /* Target specific hover states to set precise transform-origins and direction-aware layout alignment */
        
        /* 1. When hovering Card 1 (card-pos-0) */
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-0:hover) .card-pos-0 {
          display: flex !important;
          flex-direction: column !important;
          justify-content: flex-start !important;
        }
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-0:hover) .card-pos-1,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-0:hover) .card-pos-2 {
          height: 135.5px !important;
          display: flex !important;
          flex-direction: column !important;
        }
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-0:hover) .card-pos-1 .task-card,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-0:hover) .card-pos-2 .task-card {
          transform: none !important;
        }

        /* 2. When hovering Card 2 (card-pos-1 - middle card) */
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-1:hover) .card-pos-1 {
          display: flex !important;
          flex-direction: column !important;
          justify-content: center !important;
        }
        /* Top card contracts bottom-to-top (pulled upwards) */
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-1:hover) .card-pos-0 {
          height: 135.5px !important;
          display: flex !important;
          flex-direction: column !important;
        }
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-1:hover) .card-pos-0 .task-card {
          transform: none !important;
        }
        /* Bottom card contracts top-to-bottom (pushed downwards) */
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-1:hover) .card-pos-2 {
          height: 135.5px !important;
          display: flex !important;
          flex-direction: column !important;
        }
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-1:hover) .card-pos-2 .task-card {
          transform: none !important;
        }

        /* 3. When hovering Card 3 (card-pos-2) */
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-2:hover) .card-pos-2 {
          display: flex !important;
          flex-direction: column !important;
          justify-content: flex-end !important;
        }
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-2:hover) .card-pos-0,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-2:hover) .card-pos-1 {
          height: 135.5px !important;
          display: flex !important;
          flex-direction: column !important;
        }
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-2:hover) .card-pos-0 .task-card,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-2:hover) .card-pos-1 .task-card {
          transform: none !important;
        }

        /* Hide details on all unhovered shrunk cards */
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-0:hover) .card-pos-1 .task-card-details,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-0:hover) .card-pos-2 .task-card-details,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-1:hover) .card-pos-0 .task-card-details,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-1:hover) .card-pos-2 .task-card-details,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-2:hover) .card-pos-0 .task-card-details,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-2:hover) .card-pos-1 .task-card-details {
          display: none !important;
        }

        /* Inner card transitions */
        .task-card {
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s ease-out, background-color 0.3s ease-out, padding 0.6s cubic-bezier(0.16, 1, 0.3, 1) !important;
          will-change: transform, opacity, padding;
        }

        /* Keep full opacity on all task cards */
        .task-card-wrapper .task-card {
          opacity: 1 !important;
        }

        /* Task title for all unhovered shrunk neighbor cards is translated to 0px, ONLY when NO card is expanded double */
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-0:hover) .card-pos-1 .task-card-title,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-0:hover) .card-pos-2 .task-card-title,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-1:hover) .card-pos-0 .task-card-title,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-1:hover) .card-pos-2 .task-card-title,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-2:hover) .card-pos-0 .task-card-title,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-2:hover) .card-pos-1 .task-card-title {
          transform: translateY(0px) !important;
        }

        /* Project title (base rules) */
        .project-title {
          opacity: 1 !important;
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease-in-out !important;
          transform: translateY(0) !important;
        }
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)) .task-card-wrapper:hover .project-title {
          opacity: 0 !important;
          transition: opacity 0.12s ease-out !important;
          transition-delay: 280ms !important;
        }

        /* Task title (base rules) */
        .task-card-title {
          transform: translateY(0px) !important;
          transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), color 0.3s ease-out !important;
          will-change: transform;
        }
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)) .task-card-wrapper:hover .task-card-title {
          transform: translateY(0px) !important;
          transition-delay: 380ms !important;
        }
        /* Keep neighbor card titles at normal multi-line display when another card is hovered */
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.task-card-wrapper:hover) .task-card-wrapper:not(:hover) .task-card-title {
          display: -webkit-box !important;
          -webkit-line-clamp: 2 !important;
          -webkit-box-orient: vertical !important;
          overflow: hidden !important;
        }

        /* Details group (base rules) */
        .task-card-details {
          max-height: 0 !important;
          opacity: 0 !important;
          overflow: hidden;
          transform: translateY(22px) !important;
          transition: max-height 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease-out !important;
          will-change: max-height, transform;
        }
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)) .task-card-wrapper:hover .task-card-details {
          max-height: 75px !important;
          opacity: 1 !important;
          transform: translateY(0px) !important;
          transition-delay: 380ms !important;
        }

        /* =====================================================
           DOUBLE EXPANSION CLICK STATE STYLES
           ===================================================== */
        /* Disable scroll-snap during double expansion to prevent browser fight */
        .task-list-scroll:has(.is-expanded-double) {
          scroll-snap-type: none !important;
        }

        /* Heights and visibility states for click expansion */
        .task-card-wrapper.is-expanded-double {
          height: 361px !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: flex-start !important;
        }
        .task-card-wrapper.is-shrunk-sibling {
          height: 135px !important;
        }
        
        /* Hidden siblings will slide up/down and fade out beautifully */
        .task-card-wrapper.is-hidden-sibling {
          height: 0px !important;
          opacity: 0 !important;
          pointer-events: none !important;
          margin-top: 0 !important;
          margin-bottom: 0 !important;
          transition: height 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease-out, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        
        /* Sibling above the expanded card slides up */
        .task-card-wrapper.is-hidden-sibling:has(~ .is-expanded-double) {
          transform: translateY(-50px) !important;
        }
        
        /* Sibling below the expanded card slides down */
        .is-expanded-double ~ .task-card-wrapper.is-hidden-sibling {
          transform: translateY(50px) !important;
        }

        /* Inner card transitions under click expansion */
        .is-expanded-double .task-card-title {
          transform: translateY(0px) !important;
        }
        .is-expanded-double .task-card-details {
          max-height: 260px !important;
          opacity: 1 !important;
          transform: translateY(0px) !important;
        }

        /* Expanded metadata section (Tiempo, Programada, Entrega) — CSS-animated instead of conditional render */
        .task-card-expanded-meta {
          max-height: 0 !important;
          opacity: 0 !important;
          overflow: hidden;
          pointer-events: none;
          margin-top: 0 !important;
          padding-top: 0 !important;
          border-color: transparent !important;
          transition: max-height 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease-out, margin-top 0.5s cubic-bezier(0.16, 1, 0.3, 1), padding-top 0.5s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s ease-out !important;
          will-change: max-height, opacity;
        }
        .is-expanded-double .task-card-expanded-meta {
          max-height: 120px !important;
          opacity: 1 !important;
          pointer-events: auto;
          margin-top: 10px !important;
          padding-top: 10px !important;
          border-color: rgba(255,255,255,0.04) !important;
          transition-delay: 150ms !important;
        }

        .is-shrunk-sibling .task-card {
          padding: 12px 14px !important;
        }
        .is-shrunk-sibling .task-card-title {
          transform: translateY(0px) !important;
          display: -webkit-box !important;
          -webkit-line-clamp: 1 !important;
          -webkit-box-orient: vertical !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }
        .is-shrunk-sibling .task-card-details {
          display: none !important;
        }

        /* Override scale transitions when active selection exists */
        .task-list-scroll:has(.is-expanded-double) .task-card {
          transform: none !important;
        }
        .task-list-scroll:has(.is-expanded-double) .is-expanded-double .task-card {
          cursor: pointer !important;
        }

        /* =====================================================
           TASK CARD EDITING STATE STYLES
           ===================================================== */
        /* Disable scroll-snap during editing to prevent browser snapping fight */
        .task-list-scroll:has(.is-editing-card) {
          scroll-snap-type: none !important;
        }

        /* Heights and visibility states for task editing card (mirroring hover state) */
        .task-card-wrapper.is-editing-card:not(.is-expanded-double) {
          height: 220px !important;
        }
        .task-card-wrapper.is-editing-card:not(.is-expanded-double) .project-title {
          opacity: 0 !important;
          transition: opacity 0.12s ease-out !important;
        }
        .task-card-wrapper.is-editing-card:not(.is-expanded-double) .task-card-title {
          transform: translateY(0px) !important;
        }
        .task-card-wrapper.is-editing-card:not(.is-expanded-double) .task-card-details {
          max-height: 105px !important;
          opacity: 1 !important;
          transform: translateY(0px) !important;
        }

        /* Keep other cards shrunk in the same list when a card is in edit mode */
        .task-list-scroll:has(.is-editing-card) .task-card-wrapper:not(.is-editing-card):not(.is-expanded-double):not(.is-hidden-sibling):not(.is-shrunk-sibling) {
          height: 115px !important;
        }
        .task-list-scroll:has(.is-editing-card) .task-card-wrapper:not(.is-editing-card):not(.is-expanded-double):not(.is-hidden-sibling):not(.is-shrunk-sibling) .task-card {
          transform: scale(0.97) !important;
          padding: 12px 14px !important;
        }
        .task-list-scroll:has(.is-editing-card) .task-card-wrapper:not(.is-editing-card):not(.is-expanded-double):not(.is-hidden-sibling):not(.is-shrunk-sibling) .task-card-details {
          display: none !important;
        }
        .task-list-scroll:has(.is-editing-card) .task-card-wrapper:not(.is-editing-card):not(.is-expanded-double):not(.is-hidden-sibling):not(.is-shrunk-sibling) .task-card-title {
          transform: translateY(0px) !important;
        }
      `}</style>
      {/* 5 Expanded Clean Simple Rectangles Grid */}
      <div className="w-full grid grid-cols-12 gap-5 items-start">
        
        {/* Left Section (9 Columns) */}
        <div className="col-span-9 flex flex-col gap-5">
          {/* Active View Content (Borderless) */}
          <div className={`w-full h-[620px] relative ${draggingTaskId ? "overflow-visible" : "overflow-hidden"}`}>
              {/* 0. SEARCH VIEW */}
              {activeView === "buscar" && (() => {
                const matchingProjects = projects.filter(
                  p =>
                    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.client.toLowerCase().includes(searchQuery.toLowerCase())
                );

                const matchingTasks: { id: string; title: string; projectTitle: string; status?: string }[] = [];
                projects.forEach(p => {
                  p.tasks?.forEach(t => {
                    if (
                      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (t.desc && t.desc.toLowerCase().includes(searchQuery.toLowerCase()))
                    ) {
                      matchingTasks.push({
                        id: String(t.id),
                        title: t.title,
                        projectTitle: p.title,
                        status: t.status
                      });
                    }
                  });
                });

                return (
                  <div className="w-full h-full flex flex-col gap-4 pt-1 animate-fadeIn">
                    {searchQuery ? (
                      <div className="flex flex-col gap-5 max-h-[440px] overflow-y-auto pr-1 hide-scrollbar">
                        {matchingProjects.length > 0 && (
                          <div className="flex flex-col gap-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Proyectos encontrados ({matchingProjects.length})</span>
                            <div className="flex flex-col gap-2">
                              {matchingProjects.map((proj) => (
                                <div
                                  key={proj.id}
                                  onClick={() => {
                                    onSelectTab("proyectos");
                                    onSelectProject?.(proj.id);
                                  }}
                                  className={`w-full h-11 rounded-xl ${headerBgStyle} px-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors`}
                                >
                                  <div className="flex items-center gap-3">
                                    <LayoutGrid className="w-4 h-4 text-orange-400 shrink-0" />
                                    <span className="text-xs font-semibold text-slate-300">{proj.title}</span>
                                    <span className="text-[10px] text-slate-500">({proj.client})</span>
                                  </div>
                                  <span className="text-[9px] font-bold text-orange-400 uppercase tracking-wider">Proyecto</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {matchingTasks.length > 0 && (
                          <div className="flex flex-col gap-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Tareas encontradas ({matchingTasks.length})</span>
                            <div className="flex flex-col gap-2">
                              {matchingTasks.map((t) => (
                                <div
                                  key={t.id}
                                  className={`w-full h-11 rounded-xl ${headerBgStyle} px-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors`}
                                >
                                  <div className="flex items-center gap-3">
                                    <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                                    <span className="text-xs font-semibold text-slate-300">{t.title}</span>
                                    <span className="text-[10px] text-slate-500">en {t.projectTitle}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {t.status && (
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold ${
                                        t.status === "Completado" 
                                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                                          : t.status === "En Proceso"
                                            ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                            : "bg-slate-500/10 border-slate-500/20 text-slate-400"
                                      }`}>
                                        {t.status}
                                      </span>
                                    )}
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Tarea</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {matchingProjects.length === 0 && matchingTasks.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-10 text-center">
                            <AlertTriangle className="w-8 h-8 text-slate-500 mb-2" />
                            <p className="text-xs text-slate-400">No se encontraron resultados para "{searchQuery}"</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Búsquedas recientes</span>
                        <div className="flex flex-col gap-2">
                          <div className={`w-full h-11 rounded-xl ${headerBgStyle} px-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors`}>
                            <div className="flex items-center gap-3">
                              <LayoutGrid className="w-4 h-4 text-orange-400 shrink-0" />
                              <span className="text-xs font-semibold text-slate-300">Proyecto Taski</span>
                            </div>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Proyecto</span>
                          </div>
                          <div className={`w-full h-11 rounded-xl ${headerBgStyle} px-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors`}>
                            <div className="flex items-center gap-3">
                              <Table className="w-4 h-4 text-blue-400 shrink-0" />
                              <span className="text-xs font-semibold text-slate-300">Base de datos de Clientes</span>
                            </div>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Tabla</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
              {/* 1. KANBAN VIEW */}
              {activeView === "kanban" && (
                <KanbanBoard
                  projects={projects}
                  filteredKanbanTasks={filteredKanbanTasks}
                  groupingMode={groupingMode}
                  isNightMode={isNightMode}
                  headerBgStyle={headerBgStyle}
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
              )}

              {/* 2. TABLA / BASE DE DATOS VIEW */}
              {activeView === "tabla" && (
                <TaskTableView
                  projects={projects}
                  kanbanTasks={kanbanTasks}
                  headerBgStyle={headerBgStyle}
                  cardBgStyle={cardBgStyle}
                  onSelectTab={onSelectTab}
                  onSelectProject={onSelectProject}
                />
              )}

              {/* 3. TIMELINE VIEW */}
              {activeView === "timeline" && (
                <div className="w-full h-full flex flex-col gap-3 pt-1 animate-fadeIn overflow-hidden">
                  {/* Timeline Header (Weeks indicator) */}
                  <div className={`w-full h-8 rounded-xl ${headerBgStyle} px-4 flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider`}>
                    <div className="w-1/4">Proyecto</div>
                    <div className="w-3/4 grid grid-cols-4 text-center border-l border-white/5 h-full items-center">
                      <span className="border-r border-white/5 h-full flex items-center justify-center">Sem 1</span>
                      <span className="border-r border-white/5 h-full flex items-center justify-center">Sem 2</span>
                      <span className="border-r border-white/5 h-full flex items-center justify-center">Sem 3</span>
                      <span className="h-full flex items-center justify-center">Sem 4</span>
                    </div>
                  </div>

                  {/* Timeline Project Rows */}
                  <div className="flex flex-col gap-2.5">
                    {/* Row 1: Diseño Taski (Semana 1 - Semana 2) */}
                    <div className={`w-full h-12 rounded-xl ${cardBgStyle} px-4 flex items-center border border-white/5`}>
                      <div className="w-1/4 flex items-center gap-2 pr-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                        <span className="text-[10px] font-bold text-slate-200 truncate">Diseño Taski</span>
                      </div>
                      <div className="w-3/4 h-full relative flex items-center border-l border-white/5">
                        <div className="absolute left-[2%] w-[46%] h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between px-2 cursor-pointer hover:bg-emerald-500/20 transition-colors" onClick={() => onSelectTab("proyectos")}>
                          <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-wider">100% Listo</span>
                          <ExternalLink className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Web Corporativa (Semana 2 - Semana 4) */}
                    <div className={`w-full h-12 rounded-xl ${cardBgStyle} px-4 flex items-center border border-white/5`}>
                      <div className="w-1/4 flex items-center gap-2 pr-2">
                        <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                        <span className="text-[10px] font-bold text-slate-200 truncate">Web Corp</span>
                      </div>
                      <div className="w-3/4 h-full relative flex items-center border-l border-white/5">
                        <div className="absolute left-[27%] w-[71%] h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-between px-2 cursor-pointer hover:bg-amber-500/20 transition-colors" onClick={() => onSelectTab("proyectos")}>
                          <span className="text-[8px] font-bold text-amber-400 uppercase tracking-wider">33% en desarrollo</span>
                          <ExternalLink className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                        </div>
                      </div>
                    </div>

                    {/* Row 3: Campaña Ads (Semana 3 - Semana 4) */}
                    <div className={`w-full h-12 rounded-xl ${cardBgStyle} px-4 flex items-center border border-white/5`}>
                      <div className="w-1/4 flex items-center gap-2 pr-2">
                        <div className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                        <span className="text-[10px] font-bold text-slate-200 truncate">Campaña Ads</span>
                      </div>
                      <div className="w-3/4 h-full relative flex items-center border-l border-white/5">
                        <div className="absolute left-[52%] w-[46%] h-6 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-between px-2 cursor-pointer hover:bg-orange-500/20 transition-colors" onClick={() => onSelectTab("proyectos")}>
                          <span className="text-[8px] font-bold text-orange-400 uppercase tracking-wider">Por empezar (0%)</span>
                          <ExternalLink className="w-2.5 h-2.5 text-orange-400 shrink-0" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          {/* Bottom Left Row: 2 Equal Rectangles - Expanded */}
          <div className="grid grid-cols-2 gap-5">
            {/* [R3] Bottom-Left Rectangle 1 - Vertical Navbar Pill */}
            <div
              className={`h-[180px] rounded-[28px] ${bgStyle} p-4 flex items-center justify-center relative overflow-visible`}
            >
              <motion.div
                layout
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
                className={`relative z-20 flex flex-col transition-all duration-200 ${
                  isVerticalNavExpanded
                    ? "w-[135px] bg-[#0e0e0c]/95 dark:bg-[#0e0e0c]/95 border border-white/10 shadow-2xl backdrop-blur-xl p-1.5 rounded-2xl"
                    : "w-auto bg-transparent border-none shadow-none p-0"
                }`}
              >
                {/* Trigger Pill */}
                <motion.button
                  layout
                  type="button"
                  onClick={() => {
                    setIsVerticalNavExpanded(!isVerticalNavExpanded);
                    playSound('click');
                  }}
                  className={`relative z-10 box-border flex items-center justify-between gap-1.5 h-5.5 px-2.5 rounded-full border-none text-[12px] font-bold transition-all duration-200 select-none cursor-pointer shadow-md ${
                    isVerticalNavExpanded ? "w-full" : "w-[125px]"
                  } ${
                    verticalNavOptions.find(o => o.id === selectedVerticalOption)?.activeBgClass || "bg-[#10b981] text-slate-950"
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      verticalNavOptions.find(o => o.id === selectedVerticalOption)?.dotClass || "bg-slate-950"
                    }`} />
                    <span className="truncate">
                      {verticalNavOptions.find(o => o.id === selectedVerticalOption)?.label || "Navegación"}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-3 h-3 shrink-0 transition-transform duration-300 opacity-80 ${
                      isVerticalNavExpanded ? "rotate-180" : ""
                    }`}
                  />
                </motion.button>

                {/* Expanded Vertical Pills List */}
                <AnimatePresence>
                  {isVerticalNavExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      onMouseLeave={() => setHoveredVerticalOption(null)}
                      className="flex flex-col gap-1 pt-1 overflow-hidden"
                    >
                      {verticalNavOptions.map((opt) => {
                        const isSelected = selectedVerticalOption === opt.id;
                        const isHovered = hoveredVerticalOption === opt.id;

                        return (
                          <motion.button
                            key={opt.id}
                            layout
                            type="button"
                            onHoverStart={() => setHoveredVerticalOption(opt.id)}
                            onClick={() => {
                              setSelectedVerticalOption(opt.id);
                              playSound('click');
                            }}
                            transition={{ type: "spring", stiffness: 350, damping: 28 }}
                            className={`relative z-10 box-border w-full flex items-center justify-center gap-1.5 h-5.5 px-2.5 rounded-full text-[12px] font-bold transition-colors duration-200 select-none cursor-pointer border-none ${
                              isSelected
                                ? opt.textActiveColor
                                : isHovered
                                ? opt.textHoverColor
                                : (isNightMode ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900")
                            }`}
                          >
                            {/* Active Indicator */}
                            {isSelected && (
                              <motion.span
                                layoutId="verticalActiveViewIndicator"
                                className={`absolute inset-0 rounded-full border-none shadow-md ${opt.activeBgClass}`}
                                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                              />
                            )}

                            {/* Sliding Hover Indicator */}
                            {isHovered && (
                              <motion.span
                                layoutId="verticalHoverViewIndicator"
                                className={`absolute inset-0 rounded-full border-none shadow-sm ${opt.hoverBgClass}`}
                                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                              />
                            )}

                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 relative z-10 ${opt.dotClass}`} />
                            <span className="truncate relative z-10">{opt.label}</span>
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>

            {/* [R4] Bottom-Left Rectangle 2 - Expanded */}
            <div
              className={`h-[180px] rounded-[28px] ${bgStyle}`}
            />
          </div>
        </div>

        {/* Right Section (3 Columns) */}
        <div className="col-span-3 flex flex-col gap-4">
          {/* Card 1: KPIs & Financial Metrics */}
          <div
            className={`w-full rounded-[28px] ${bgStyle} p-4.5 flex flex-col items-center justify-center overflow-hidden relative transition-all duration-500`}
          >
            {/* KPIs container */}
            <div className="w-full flex flex-col gap-3 items-center">
              {/* Row 1: LED Counters */}
              <div className="flex items-center justify-center gap-4 w-full px-1">
                {/* Counter 1: Projects */}
                <div className="relative flex items-center pr-8">
                  <span 
                    className="tracking-tight transition-colors duration-500"
                    style={{ 
                      fontFamily: "'LedCounter', monospace", 
                      fontSize: "40px",
                      color: isNightMode ? '#fafafa' : '#0f172a',
                      textShadow: isNightMode
                        ? '0 0 16px rgba(255,255,255,0.2)'
                        : '0 0 12px rgba(0,0,0,0.05)'
                    }}
                  >
                    {String(totalProjects).padStart(2, '0')}
                  </span>
                  <span className={`absolute top-0 right-0 px-1 py-0.5 rounded-full text-[6px] font-bold tracking-widest uppercase transition-all duration-500 border ${
                    isNightMode
                      ? 'bg-neutral-900 border-neutral-800 text-neutral-300'
                      : 'bg-slate-100 border-slate-200 text-slate-800'
                  }`}>
                    proy.
                  </span>
                </div>

                {/* Divider */}
                <div className={`w-px h-6 self-center transition-colors duration-500 ${isNightMode ? 'bg-white/10' : 'bg-slate-200'}`} />

                {/* Counter 2: Tasks */}
                <div className="relative flex items-center pr-8">
                  <span 
                    className="tracking-tight transition-colors duration-500"
                    style={{ 
                      fontFamily: "'LedCounter', monospace", 
                      fontSize: "40px",
                      color: isNightMode ? '#fafafa' : '#0f172a',
                      textShadow: isNightMode
                        ? '0 0 16px rgba(255,255,255,0.2)'
                        : '0 0 12px rgba(0,0,0,0.05)'
                    }}
                  >
                    {String(totalTasks).padStart(2, '0')}
                  </span>
                  <span className={`absolute top-0 right-0 px-1 py-0.5 rounded-full text-[6px] font-bold tracking-widest uppercase transition-all duration-500 border ${
                    isNightMode
                      ? 'bg-neutral-900 border-neutral-800 text-neutral-300'
                      : 'bg-slate-100 border-slate-200 text-slate-800'
                  }`}>
                    tareas
                  </span>
                </div>

                {/* Divider */}
                <div className={`w-px h-6 self-center transition-colors duration-500 ${isNightMode ? 'bg-white/10' : 'bg-slate-200'}`} />

                {/* Counter 3: Hours */}
                <div className="relative flex items-center pr-9">
                  <span 
                    className="tracking-tight transition-colors duration-500"
                    style={{ 
                      fontFamily: "'LedCounter', monospace", 
                      fontSize: "40px",
                      color: isNightMode ? '#fafafa' : '#0f172a',
                      textShadow: isNightMode
                        ? '0 0 16px rgba(255,255,255,0.2)'
                        : '0 0 12px rgba(0,0,0,0.05)'
                    }}
                  >
                    {String(Math.round(totalHours)).padStart(3, '0')}
                  </span>
                  <span className={`absolute top-0 right-0 px-1 py-0.5 rounded-full text-[6px] font-bold tracking-widest uppercase transition-all duration-500 border ${
                    isNightMode
                      ? 'bg-neutral-900 border-neutral-800 text-neutral-300'
                      : 'bg-slate-100 border-slate-200 text-slate-800'
                  }`}>
                    horas
                  </span>
                </div>
              </div>

              {/* Row 2: Financial Stats Bar */}
              <div className="flex items-center justify-between w-full text-[8.5px] font-semibold tracking-tight px-1 mt-0.5">
                {/* Metric 1: MRR Facturación */}
                <div className="flex items-center gap-1 shrink-0" title="Ingresos Mensuales Recurrentes">
                  <TrendingUp className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span className={isNightMode ? 'text-slate-200' : 'text-slate-700'}>
                    +$48.5k <span className="opacity-60 text-[7px] uppercase font-sans font-bold">MRR</span>
                  </span>
                </div>

                {/* Metric 2: Margen Operativo */}
                <div className="flex items-center gap-1 shrink-0" title="Margen Operativo Neto">
                  <ArrowUpRight className="w-3 h-3 text-sky-500 shrink-0" />
                  <span className={isNightMode ? 'text-slate-200' : 'text-slate-700'}>
                    68.5% <span className="opacity-60 text-[7px] uppercase font-sans font-bold">Margen</span>
                  </span>
                </div>

                {/* Metric 3: Por Cobrar */}
                <div className="flex items-center gap-1 shrink-0" title="Cuentas por Cobrar Pendientes">
                  <Wallet className="w-3 h-3 text-amber-500 shrink-0" />
                  <span className={isNightMode ? 'text-slate-200' : 'text-slate-700'}>
                    $18.2k <span className="opacity-60 text-[7px] uppercase font-sans font-bold">Cobro</span>
                  </span>
                </div>

                {/* Metric 4: Eficiencia Operativa */}
                <div className="flex items-center gap-1 shrink-0" title="Eficiencia de Entregables">
                  <Activity className="w-3 h-3 text-purple-500 shrink-0" />
                  <span className={isNightMode ? 'text-slate-200' : 'text-slate-700'}>
                    94.8% <span className="opacity-60 text-[7px] uppercase font-sans font-bold">Efic.</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Daily Effort Bar & TimelineDiario */}
          <div
            className={`w-full rounded-[28px] ${bgStyle} p-4.5 flex flex-col items-center justify-center gap-4 overflow-hidden relative transition-all duration-500`}
          >
            <DailyEffortBar
              todayEffort={todayEffort}
              limiteHorasDia={limiteHorasDia}
              setLimiteHorasDia={setLimiteHorasDia}
              isNightMode={isNightMode}
            />

            <div className={`w-full h-px transition-colors duration-500 ${isNightMode ? 'bg-white/5' : 'bg-slate-200'} shrink-0`} />

            <TimelineDiario
              tasks={projects.reduce<Task[]>((acc, p) => acc.concat(p.tasks || []), [])}
              projects={projects}
              updateTaskProperty={updateTaskProperty}
              isNightMode={isNightMode}
            />
          </div>

          {/* Card 3: Time Heatmap */}
          <div
            className={`w-full rounded-[28px] ${bgStyle} p-4 flex flex-col items-center justify-center overflow-hidden relative transition-all duration-500`}
          >
            <div className="w-full flex justify-center scale-90 origin-center shrink-0">
              <div className="flex flex-col gap-1.5 items-center w-full">
                <span className={`text-[8px] font-bold uppercase tracking-widest ${isNightMode ? 'text-zinc-500' : 'text-slate-400'}`}>Actividad de Tareas</span>
                <TimeHeatmap 
                  tasks={projects.reduce<Task[]>((acc, p) => acc.concat(p.tasks || []), [])}
                  isNeumorphic={isNeumorphic}
                  isNightMode={isNightMode}
                />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Custom Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deleteModalConfig?.isOpen)}
        isNightMode={isNightMode}
        config={deleteModalConfig}
        onClose={() => setDeleteModalConfig(null)}
        onSetStep={(step: 1 | 2, targetType?: "task" | "project") => {
          setDeleteModalConfig(prev => prev ? { ...prev, step, targetType } : null);
        }}
        onConfirmTaskDelete={(projId: number, tskId: number) => {
          onUpdateProjects(prev => {
            return prev.map(p => {
              if (p.id === projId) {
                const updatedTasks = (p.tasks || []).filter(t => t.id !== tskId);
                const evalProj = autoEvaluateProjectStatus({ ...p, tasks: updatedTasks });
                persistProjectUpdate(projId, {
                  tasks: evalProj.tasks,
                  status: evalProj.status,
                  statusColor: evalProj.statusColor,
                  progress: evalProj.progress,
                  percent: evalProj.percent
                });
                return evalProj;
              }
              return p;
            });
          });
          setDeleteModalConfig(null);
        }}
        onConfirmProjectDelete={(projId: number) => {
          if (onDeleteProject) {
            onDeleteProject(projId);
          } else {
            onUpdateProjects(prev => prev.filter(p => p.id !== projId));
          }
          setDeleteModalConfig(null);
        }}
      />

    </div>
  );
}
