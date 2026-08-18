"use client";

import React, { useState, useEffect } from "react";
import { LayoutGrid, Table, Check, AlertTriangle, ExternalLink } from "lucide-react";
import { Project, Task } from "../ProjectDashboard";
import DailyEffortBar from "../DailyEffortBar";
import KanbanBoardV2 from "./KanbanBoardV2";
import TaskTableView from "../TaskTableView";
import DeleteConfirmModal from "../DeleteConfirmModal";
import { HomeSessionsColumn } from "@/components/views/HomeSessionsColumn";
import { useRecentSessions } from "@/hooks/useSessions";
import { playSound } from "../../utils/audio";
import { parseTimeToHours, getCardColorTheme, CARD_COLOR_KEYS } from "@/lib/utils";
import { autoEvaluateProjectStatus } from "../../utils/data";
import { persistProjectUpdate } from "../../utils/persist";
import { doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useTaskCardInteractions } from "../../hooks/useTaskCardInteractions";

export interface SynthesizedTask {
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

export type ViewMode = "buscar" | "kanban" | "tabla" | "timeline";

export interface HomeDashboardV2Props {
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

export function HomeDashboardV2({
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
}: HomeDashboardV2Props) {
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

  const {
    activeStatusDropdownCardId,
    setActiveStatusDropdownCardId,
    activeFormatDropdownCardId,
    setActiveFormatDropdownCardId,
    activeTimeDropdownCardId,
    setActiveTimeDropdownCardId,
    activeColorSelectorCardId,
    setActiveColorSelectorCardId,
    activeCardMenuId,
    setActiveCardMenuId,
    editingTaskField,
    setEditingTaskField,
    editingValue,
    setEditingValue,
    hoveredStatusOptionCard,
    setHoveredStatusOptionCard,
    hoveredFormatOptionCard,
    setHoveredFormatOptionCard,
    isAddingNewFormat,
    setIsAddingNewFormat,
    newFormatValue,
    setNewFormatValue,
    isAddingCustomTime,
    setIsAddingCustomTime,
    customTimeValue,
    setCustomTimeValue,
    getStatusPillConfig,
    getFormatPillConfig,
  } = useTaskCardInteractions();

  const [sortBy, setSortBy] = useState<"alfabetico" | "creacion" | "visto">("visto");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  const formatLocalDate = (d: Date): string => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const handleDropTask = (taskId: string, projectId: string | number, oldColId: string | undefined, newColId: string, orderMap: Record<string, number>) => {
    let taskIdStr = "";
    let targetProjectId = String(projectId);
    if (taskId.startsWith("kt-")) {
      const parts = taskId.split("-");
      targetProjectId = parts[1] || targetProjectId;
      taskIdStr = parts.slice(2).join("-");
    } else {
      taskIdStr = taskId;
    }
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

          if (String(p.id) === String(targetProjectId) && String(t.id) === String(taskIdStr)) {
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

            updateDoc(doc(db, "tasks", String(taskIdStr)), {
              estado: status,
              updatedAt: new Date().toISOString()
            }).catch(err => console.error("Error actualizando /tasks:", err));
          }

          return updatedTask;
        }) || [];

        const evalProj = autoEvaluateProjectStatus({
          ...p,
          status: (String(p.id) === String(targetProjectId) && status === "Revisión") ? "En Revisión Interna" : p.status,
          statusColor: (String(p.id) === String(targetProjectId) && status === "Revisión") ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-500" : p.statusColor,
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
        
        const targetPriority = String(p.id) === String(targetProjectId) ? priority : p.priority;
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

          if (String(p.id) === String(targetProjectId) && String(t.id) === String(taskIdStr)) {
            updatedTask = { ...updatedTask, fecha_programada: dateStr };

            updateDoc(doc(db, "tasks", String(taskIdStr)), {
              fechaProg: dateStr,
              updatedAt: new Date().toISOString()
            }).catch(err => console.error("Error actualizando fechaProg en /tasks:", err));
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

          const clientName = String(p.id) === String(targetProjectId) ? targetClient : p.client;
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

        const updated = { 
          ...t, 
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
      setActiveCardMenuId(null);
    }
  }, [expandedCardId]);

  const [limiteHorasDia, setLimiteHorasDia] = useState(() => {
    if (typeof window !== 'undefined') {
      return Number(localStorage.getItem('taski_limite_horas_dia')) || 8;
    }
    return 8;
  });

  const kanbanTasks = React.useMemo(() => {
    const list: any[] = [];
    if (!projects) return list;
    
    projects.forEach(p => {
      if (p.tasks) {
        p.tasks.forEach((t, index) => {
          const completedCount = p.tasks?.filter(tk => tk.status === "Completado").length || 0;
          const totalCount = p.tasks?.length || 0;

          const progDateStr = t.fecha_programada || (() => {
            let offset = 0;
            if (t.status === "Completado") {
              offset = 12;
            } else {
              if (t.id % 3 === 0) offset = 1;
              else if (t.id % 3 === 1) offset = 4;
              else offset = 15;
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
            taskIndex: index,
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

    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "alfabetico") {
        cmp = (a.taskTitle || "").localeCompare(b.taskTitle || "", "es", { sensitivity: "base" });
      } else if (sortBy === "creacion") {
        const dateA = new Date((a.fecha_creacion || "") + "T00:00:00").getTime();
        const dateB = new Date((b.fecha_creacion || "") + "T00:00:00").getTime();
        cmp = dateA - dateB;
      } else {
        const orderA = a.kanbanOrders?.[groupingMode] ?? Infinity;
        const orderB = b.kanbanOrders?.[groupingMode] ?? Infinity;
        if (orderA === Infinity && orderB === Infinity) {
          return a.taskIndex - b.taskIndex;
        } else {
          return orderA - orderB;
        }
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return list;
  }, [projects, groupingMode, sortBy, sortOrder]);

  const filteredKanbanTasks = React.useMemo(() => {
    let result = kanbanTasks;

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

  const { sessions: recentSessions } = useRecentSessions(100);

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
    tasksVerde: { id: number | string; title: string; hours: number; isCompleted?: boolean; executedMins?: number }[];
    tasksNaranja: { id: number | string; title: string; hours: number; isCompleted?: boolean; executedMins?: number }[];
    allTodayTasks: { id: number | string; title: string; hours: number; isCompleted?: boolean; executedMins?: number }[];
  }>(() => {
    const todayKanbanList = (filteredKanbanTasks || []).filter(t => {
      return getCalendarDaysDiff(t.dueDate) <= 0;
    });

    let verde = 0, naranja = 0, verdeCount = 0, naranjaCount = 0;
    const tasksVerde: { id: number | string; title: string; hours: number; isCompleted?: boolean; executedMins?: number }[] = [];
    const tasksNaranja: { id: number | string; title: string; hours: number; isCompleted?: boolean; executedMins?: number }[] = [];
    const allTodayTasks: { id: number | string; title: string; hours: number; isCompleted?: boolean; executedMins?: number }[] = [];

    todayKanbanList.forEach(t => {
      const hours = parseTimeToHours(t.time);
      const isCompleted = t.status === "Completado" || t.status === "Completada";
      const title = t.taskTitle || t.title || "Tarea sin título";

      const rawId = String(t.id);
      const cleanId = rawId.includes("kt-") ? rawId.split("-")[2] : rawId;

      const taskSessions = (recentSessions || []).filter(s => {
        const sTaskId = String(s.task_id || "");
        return sTaskId === cleanId || sTaskId === rawId;
      });

      const executedMins = taskSessions.reduce((sum, s) => {
        if (s.status === "en_curso") {
          const startMs = s.startTime?.toMillis ? s.startTime.toMillis() : new Date(s.startTime).getTime();
          const elapsed = Math.max(1, Math.round((Date.now() - startMs) / 60000));
          return sum + elapsed;
        }
        return sum + (s.durationMins || 0);
      }, 0);

      if (isCompleted) {
        verde += hours;
        verdeCount++;
        tasksVerde.push({ id: t.id, title, hours, isCompleted: true, executedMins });
      } else {
        naranja += hours;
        naranjaCount++;
        tasksNaranja.push({ id: t.id, title, hours, isCompleted: false, executedMins });
      }

      allTodayTasks.push({
        id: t.id,
        title,
        hours,
        isCompleted,
        executedMins
      });
    });

    const nextTask = tasksNaranja.length > 0 ? { title: tasksNaranja[0].title, hours: tasksNaranja[0].hours } : null;
    const total = verde + naranja;
    const excedente = Math.max(0, total - limiteHorasDia);
    const gris = Math.max(0, limiteHorasDia - total);
    const maxVal = Math.max(limiteHorasDia, total);

    return { verde, naranja, gris, excedente, maxVal, verdeCount, naranjaCount, nextTask, total, tasksVerde, tasksNaranja, allTodayTasks };
  }, [filteredKanbanTasks, limiteHorasDia, getCalendarDaysDiff, recentSessions]);

  const handleUpdateTaskStatus = React.useCallback((projId: string | number, taskId: string | number, status: string) => {
    onUpdateProjects(prev => prev.map(p => {
      if (String(p.id) !== String(projId)) return p;
      const updatedTasks = (p.tasks || []).map(t => {
        if (String(t.id) !== String(taskId)) return t;
        return {
          ...t,
          status: status as any,
          statusColor: status === "Completado" 
            ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
            : "bg-slate-500/20 border-slate-500/30 text-slate-300",
          fecha_hora_completado: status === "Completado" ? new Date().toISOString() : undefined
        };
      });
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const view = params.get("view") as ViewMode;
      if (view && ["buscar", "kanban", "tabla", "timeline"].includes(view)) {
        onViewChange(view);
      }
    }
  }, [onViewChange]);

  const handleAddTaskToProject = React.useCallback((projId: string | number) => {
    playSound("pop");
    onUpdateProjects((prev) =>
      prev.map((p) => {
        if (String(p.id) !== String(projId)) return p;
        const existingTasks = p.tasks || [];
        const maxId = existingTasks.reduce((max, t) => {
          const num = typeof t.id === "number" ? t.id : parseInt(String(t.id).replace(/\D/g, ""), 10) || 0;
          return Math.max(max, num);
        }, 0);
        const newId = maxId + 1;
        const defaultDeadline = (p as any).fecha_limite || ((p as any).deadlineRaw) || ((p as any).deadline && /^\d{4}-\d{2}-\d{2}$/.test((p as any).deadline) ? (p as any).deadline : undefined);
        const newTask: Task = {
          id: newId,
          title: "Nueva tarea",
          status: "Planificado",
          statusColor: "bg-slate-500/20 border-slate-500/30 text-slate-300",
          subtasks: [],
          time: "30 min",
          desc: "",
          format: "Post",
          fecha_programada: formatLocalDate(new Date()),
          fecha_creacion: formatLocalDate(new Date()),
          fecha_limite: defaultDeadline,
          deadline: defaultDeadline,
        };

        setDoc(doc(db, "tasks", String(newId)), {
          id: newId,
          titulo: newTask.title,
          contenido: "",
          formato: newTask.format,
          tiempoEstimado: newTask.time,
          estado: newTask.status,
          proyecto_id: p.id,
          fechaProg: newTask.fecha_programada,
          fechaEntrega: defaultDeadline || "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }).catch((err) => console.error("Error al guardar tarea en /tasks:", err));

        const updatedTasks = [...existingTasks, newTask];
        const evalProj = autoEvaluateProjectStatus({ ...p, tasks: updatedTasks });
        persistProjectUpdate(p.id, {
          tasks: evalProj.tasks,
          status: evalProj.status,
          statusColor: evalProj.statusColor,
          progress: evalProj.progress,
          percent: evalProj.percent,
        });
        return evalProj;
      })
    );
  }, [onUpdateProjects]);

  const handleChangeProjectColor = React.useCallback((projId: string | number) => {
    playSound("click");
    const COLOR_MAP: Record<string, { h: number; s: number; l: number; colorStr: string; gradient: string }> = {
      "Azul": { h: 217, s: 91, l: 60, colorStr: "hsl(217, 91%, 60%)", gradient: "bg-blue-600" },
      "Naranja": { h: 38, s: 92, l: 50, colorStr: "hsl(38, 92%, 50%)", gradient: "bg-amber-500" },
      "Morado": { h: 271, s: 81, l: 60, colorStr: "hsl(271, 81%, 60%)", gradient: "bg-purple-600" },
      "Verde": { h: 160, s: 84, l: 40, colorStr: "hsl(160, 84%, 40%)", gradient: "bg-emerald-600" },
      "Índigo": { h: 239, s: 84, l: 55, colorStr: "hsl(239, 84%, 55%)", gradient: "bg-indigo-600" },
      "Rosa": { h: 333, s: 71, l: 52, colorStr: "hsl(333, 71%, 52%)", gradient: "bg-pink-600" },
      "Menta": { h: 175, s: 77, l: 40, colorStr: "hsl(175, 77%, 40%)", gradient: "bg-teal-600" },
      "Gris": { h: 215, s: 14, l: 40, colorStr: "hsl(215, 14%, 40%)", gradient: "bg-slate-700" }
    };
    const keys = Object.keys(COLOR_MAP);

    onUpdateProjects((prev) =>
      prev.map((p) => {
        if (String(p.id) !== String(projId)) return p;
        
        let currIdx = -1;
        if ((p as any).color && keys.includes((p as any).color)) {
          currIdx = keys.indexOf((p as any).color);
        } else if (p.customColor && typeof p.customColor.h === "number") {
          currIdx = keys.findIndex((k) => Math.abs(COLOR_MAP[k].h - p.customColor!.h) < 15);
        }

        const nextIdx = currIdx >= 0 ? (currIdx + 1) % keys.length : 1;
        const nextColorName = keys[nextIdx];
        const cfg = COLOR_MAP[nextColorName];

        const updatedTasks = p.tasks?.map((t) => ({
          ...t,
          color: nextColorName
        })) || [];

        const updated = { 
          ...p, 
          color: nextColorName,
          customColor: { h: cfg.h, s: cfg.s, l: cfg.l },
          customGradientStyle: cfg.colorStr,
          customGlowStyle: cfg.colorStr,
          gradient: cfg.gradient,
          tasks: updatedTasks
        };
        persistProjectUpdate(p.id, { 
          color: nextColorName,
          customColor: { h: cfg.h, s: cfg.s, l: cfg.l },
          customGradientStyle: cfg.colorStr,
          customGlowStyle: cfg.colorStr,
          gradient: cfg.gradient,
          tasks: updatedTasks
        } as any);
        return updated;
      })
    );
  }, [onUpdateProjects]);

  const taskCardSharedProps = {
    projects,
    setProjects: onUpdateProjects,
    onSelectProject,
    onAddTaskToProject: handleAddTaskToProject,
    onChangeProjectColor: handleChangeProjectColor,
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
    activeCardMenuId,
    setActiveCardMenuId,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
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
  const bgStyle = isNightMode ? "bg-[#1f1f1f]" : "bg-black/[0.03]";
  const cardBgStyle = isNightMode ? "bg-white/[0.04]" : "bg-black/[0.04]";

  return (
    <div className={`w-full h-full flex flex-col gap-5 hide-scrollbar pb-6 pr-2 pt-1 overflow-x-hidden ${
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

        .task-list-scroll.is-scrolling .task-card-wrapper,
        .task-list-scroll.hover-disabled .task-card-wrapper {
          height: 162px !important;
          pointer-events: none !important;
        }

        .task-card-wrapper {
          height: 162px;
          flex-shrink: 0 !important;
          overflow: hidden;
          opacity: 1;
          transition: height 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
          will-change: height, opacity;
          scroll-snap-align: start;
          scroll-snap-stop: normal;
          touch-action: none;
        }
        .task-card-wrapper.is-dragging-card {
          transition: none !important;
        }

        .task-list-scroll:has(.is-expanded-double) {
          scroll-snap-type: none !important;
          gap: 0 !important;
        }

        .task-card-wrapper.is-expanded-double {
          height: 380px !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: flex-start !important;
        }
        .task-card-wrapper.is-shrunk-sibling {
          height: 120px !important;
        }
        .task-card-wrapper.is-expanded-double:has(+ .is-shrunk-sibling),
        .task-card-wrapper.is-shrunk-sibling:has(+ .is-expanded-double) {
          margin-bottom: 10px !important;
        }
        
        .task-card-wrapper.is-hidden-sibling {
          height: 0px !important;
          opacity: 0 !important;
          pointer-events: none !important;
          margin-top: 0 !important;
          margin-bottom: 0 !important;
          transform: none !important;
          transition: height 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease-out !important;
        }

        .task-list-scroll:has(.is-editing-card) {
          scroll-snap-type: none !important;
        }

        .task-card-wrapper.is-editing-card:not(.is-expanded-double) {
          height: 240px !important;
        }
      `}</style>
      {/* 5 Expanded Clean Simple Rectangles Grid */}
      <div className="w-full grid grid-cols-12 gap-5 items-stretch max-w-full">
        
        {/* Left Section (3 Columns): Barra de Esfuerzo Diario + Módulo de Sesiones */}
        <div className={`col-span-3 flex flex-col gap-5 p-5 h-[900px] rounded-[28px] ${isNightMode ? "bg-[#121212]" : "bg-[#fffce2]"}`}>
          <DailyEffortBar 
            todayEffort={todayEffort} 
            limiteHorasDia={limiteHorasDia} 
            setLimiteHorasDia={setLimiteHorasDia} 
            isNightMode={isNightMode} 
          />

          <div className="flex-1 overflow-hidden">
            <HomeSessionsColumn 
              todayTasks={filteredKanbanTasks.filter(t => getCalendarDaysDiff(t.dueDate) <= 0)} 
              allTasks={kanbanTasks}
              projects={projects}
              isNightMode={isNightMode}
              onUpdateTaskStatus={handleUpdateTaskStatus}
            />
          </div>
        </div>

        {/* Right Section (9 Columns) */}
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
                            <p className="text-xs text-slate-400">No se encontraron resultados para &quot;{searchQuery}&quot;</p>
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
                <KanbanBoardV2
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
                  <div className={`w-full h-8 rounded-xl ${headerBgStyle} px-4 flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider`}>
                    <div className="w-1/4">Proyecto</div>
                    <div className="w-3/4 grid grid-cols-4 text-center border-l border-white/5 h-full items-center">
                      <span className="border-r border-white/5 h-full flex items-center justify-center">Sem 1</span>
                      <span className="border-r border-white/5 h-full flex items-center justify-center">Sem 2</span>
                      <span className="border-r border-white/5 h-full flex items-center justify-center">Sem 3</span>
                      <span className="h-full flex items-center justify-center">Sem 4</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5">
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

            {/* Bottom Right Row */}
            <div className="grid grid-cols-2 gap-5 -mt-10 relative z-20">
              <div className={`h-[300px] rounded-[28px] ${bgStyle}`} />
              <div className={`h-[300px] rounded-[28px] ${bgStyle}`} />
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
        onConfirmTaskDelete={async (projId: number, tskId: number) => {
          const taskIdStr = String(tskId);
          try {
            await deleteDoc(doc(db, "tasks", taskIdStr));
          } catch (err) {
            console.error("Error al eliminar la tarea de la colección nativa /tasks:", err);
          }

          onUpdateProjects(prev => {
            return prev.map(p => {
              if (String(p.id) === String(projId)) {
                const updatedTasks = (p.tasks || []).filter(t => String(t.id) !== String(tskId) && String(t.id) !== taskIdStr);
                const evalProj = autoEvaluateProjectStatus({ ...p, tasks: updatedTasks });
                persistProjectUpdate(p.id, {
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
