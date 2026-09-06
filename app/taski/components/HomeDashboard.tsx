"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, LayoutGrid, Table, CalendarDays, ExternalLink, MoreHorizontal, ArrowRight, TrendingUp, ArrowUpRight, Wallet, Activity, Layers, Flag, Calendar, ChevronDown, ChevronUp, Plus, Check, Clock, X, AlertTriangle, Settings } from "lucide-react";
import { Project, Task } from "./ProjectDashboard";
import DailyEffortBar from "./DailyEffortBar";
import TimelineDiario from "./TimelineDiario";
import KanbanBoard from "./KanbanBoard";
import TaskTableView from "./TaskTableView";
import { TimelineView } from "./Timeline/TimelineView";
import DeleteConfirmModal from "./DeleteConfirmModal";
import { HomeSessionsColumn } from "@/components/views/HomeSessionsColumn";
import { ResizableDivider } from "@/components/ui/ResizableDivider";
import { useRecentSessions, useSessions } from "@/hooks/useSessions";
import { resolveBucketDate } from "@/lib/timelineUtils";
import { playSound } from "../utils/audio";
import { parseTimeToHours, getCardColorTheme, CARD_COLOR_KEYS, extractCleanTaskId } from "@/lib/utils";
import { autoEvaluateProjectStatus } from "../utils/data";
import { persistProjectUpdate } from "../utils/persist";
import { doc, updateDoc, deleteDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useTaskCardInteractions } from "../hooks/useTaskCardInteractions";
import { useAuthStore } from "@/lib/store";

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
  asignado_id?: string;
  asignado_ids?: string[];
  asignado?: string;
}





type ViewMode = "buscar" | "kanban" | "tabla" | "timeline";

interface HomeDashboardProps {
  projects: Project[];
  onSelectTab: (tab: string) => void;
  onSelectProject?: (projectId: string | number, originRect?: { x: number; y: number; width: number; height: number }) => void;
  onSelectTask?: (task: Task, projectId?: string | number, originRect?: { x: number; y: number; width: number; height: number }) => void;
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
  timelineHideCompleted?: boolean;
  onToggleTimelineHideCompleted?: () => void;
  timelineSortBy?: "recientes" | "urgentes" | "alfabetico";
  onSetTimelineSortBy?: (sort: "recientes" | "urgentes" | "alfabetico") => void;
}


const updateVisibleCards = () => {};

export function HomeDashboard({
  projects,
  onSelectTab,
  onSelectProject,
  onSelectTask,
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
  timelineHideCompleted = false,
  onToggleTimelineHideCompleted,
  timelineSortBy = "recientes",
  onSetTimelineSortBy,
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

  // Ancho dinámico y redimensionable de la columna de sesiones
  const [sessionsWidth, setSessionsWidth] = useState<number>(280);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("taski_sessions_column_width");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 220 && parsed <= 550) {
          setSessionsWidth(parsed);
        }
      }
    }
  }, []);

  const handleSessionsResize = React.useCallback((deltaX: number) => {
    setSessionsWidth((prev) => {
      const maxW = typeof window !== "undefined" ? Math.floor(window.innerWidth * 0.40) : 480;
      return Math.min(Math.max(prev + deltaX, 240), maxW);
    });
  }, []);

  const handleSessionsResizeEnd = React.useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("taski_sessions_column_width", String(sessionsWidth));
    }
  }, [sessionsWidth]);

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
  }, [setEditingTaskField, setEditingValue]);

  const registerNativeInput = React.useCallback((node: HTMLElement | null) => {
    if (!node) return;
    node.onmousedown = (e) => e.stopPropagation();
    node.ontouchstart = (e) => e.stopPropagation();
  }, []);

  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [hoveredColumnId, setHoveredColumnId] = useState<string | null>(null);
  const boardRef = React.useRef<HTMLDivElement>(null);


  const formatLocalDate = (d: Date): string => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const handleDropTask = (taskId: string, projectId: string | number, oldColId: string | undefined, newColId: string, orderMap: Record<string, number>) => {
    const prefix = `kt-${projectId}-`;
    const taskIdStr = taskId.startsWith(prefix) ? taskId.slice(prefix.length) : extractCleanTaskId(taskId, projectId);
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
              estado: status as any,
              statusColor: status === "Completado" 
                ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                : status === "En Proceso"
                  ? "bg-amber-500/20 border-amber-500/30 text-amber-400"
                  : status === "En Revisión" || status === "Revisión"
                    ? "bg-purple-500/20 border-purple-500/30 text-purple-400"
                    : "bg-slate-500/20 border-slate-500/30 text-slate-300",
              fecha_hora_completado: status === "Completado"
                ? new Date().toISOString()
                : undefined,
              fecha_completado_real: status === "Completado"
                ? new Date().toISOString().split("T")[0]
                : undefined
            };

            // Persistencia en la colección nativa /tasks
            updateDoc(doc(db, "tasks", String(taskIdStr)), {
              estado: status,
              status: status,
              fecha_hora_completado: status === "Completado" ? new Date().toISOString() : null,
              fecha_completado_real: status === "Completado" ? new Date().toISOString().split("T")[0] : null,
              kanbanOrders: updatedTask.kanbanOrders || {},
              updatedAt: serverTimestamp(),
              updated_at: serverTimestamp(),
            }).catch(err => console.error("Error actualizando /tasks:", err));
          }

          return updatedTask;
        }) || [];

        const evalProj = autoEvaluateProjectStatus({
          ...p,
          status: (String(p.id) === String(projectId) && (status === "En Revisión" || status === "Revisión")) ? "En Revisión" : p.status,
          tasks: updatedTasks
        });

        // Persistencia atómica de proyecto
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
          if (String(p.id) === String(projectId) && String(t.id) === String(taskIdStr)) {
            updatedTask = {
              ...updatedTask,
              prioridad: priority,
              priority: priority,
            };
            updateDoc(doc(db, "tasks", String(taskIdStr)), {
              prioridad: priority,
              priority: priority,
              kanbanOrders: updatedTask.kanbanOrders || {},
              updatedAt: serverTimestamp(),
              updated_at: serverTimestamp(),
            }).catch(err => console.error("Error actualizando prioridad en /tasks:", err));
          }
          return updatedTask;
        }) || [];
        
        const evalProj = autoEvaluateProjectStatus({ ...p, tasks: updatedTasks });

        persistProjectUpdate(p.id, {
          tasks: evalProj.tasks
        });

        return evalProj;
      }));
    } else if (groupingMode === "fecha") {
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
            const existingDateStr = t.fecha_programada || t.fechaProg || "";
            const dateStr = resolveBucketDate(newColId, existingDateStr);
            const targetDate = new Date(dateStr + "T00:00:00");

            updatedTask = { 
              ...updatedTask, 
              fecha_programada: dateStr, 
              fechaProg: dateStr,
              dueDate: targetDate,
            };

            // Persistencia en la colección nativa /tasks
            updateDoc(doc(db, "tasks", String(taskIdStr)), {
              fechaProg: dateStr,
              fecha_programada: dateStr,
              kanbanOrders: updatedTask.kanbanOrders || {},
              updatedAt: serverTimestamp(),
              updated_at: serverTimestamp(),
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

          const clientName = String(p.id) === String(projectId) ? targetClient : p.client;
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





  const kanbanTasks = React.useMemo(() => {
    const list: any[] = [];
    if (!projects) return list;
    
    projects.forEach(p => {
      if (p.tasks) {
        // Fechas de calendario del proyecto padre
        const projectDeadline = 
          (p as any).fechaFin || 
          (p as any).fecha_fin || 
          (p as any).deadline || 
          (p as any).deadlineRaw || 
          (p as any).dueDate || 
          (p as any).fechaEntrega || 
          (p as any).endDate;

        const projectStartDate = 
          (p as any).fechaInicio || 
          (p as any).fecha_inicio || 
          (p as any).startDate || 
          (p as any).fecha;

        p.tasks.forEach((t, index) => {
          // Calculate completed tasks in the parent project
          const completedCount = p.tasks?.filter(tk => tk.status === "Completado").length || 0;
          const totalCount = p.tasks?.length || 0;

          // Sincronizar fechas programadas y de entrega con la tarea o el calendario del proyecto:
          const progDateStr = 
            t.fecha_programada || 
            t.fechaProg || 
            t.fecha_limite || 
            t.deadline || 
            projectDeadline || 
            projectStartDate || 
            formatLocalDate(new Date());

          const limitDateStr = 
            t.fecha_limite || 
            t.deadline || 
            t.fechaEntrega || 
            projectDeadline || 
            progDateStr;

          const createdDateStr = 
            t.fecha_creacion || 
            (t as any).createdAt || 
            projectStartDate || 
            formatLocalDate(new Date());

          const dueDate = new Date(progDateStr.includes("T") ? progDateStr : progDateStr + "T00:00:00");

          list.push({
            id: `kt-${p.id}-${t.id}`,
            projectName: p.title || (p as any).nombre || "Proyecto",
            projectId: p.id,
            taskTitle: t.title || (t as any).titulo || (t as any).nombre || "Tarea sin título",
            completedTasks: completedCount,
            totalTasks: totalCount,
            taskIndex: index,
            dueDate,
            fecha_programada: progDateStr,
            fecha_limite: limitDateStr,
            fecha_creacion: createdDateStr,
            status: t.status || (t as any).estado || "Planificado",
            format: t.format || (t as any).formato || "Post",
            time: t.time || (t as any).esfuerzo || "30 min",
            desc: t.desc || (t as any).contenido || (t as any).descripcion || "",
            priority: t.priority || (t as any).prioridad || p.priority || "Media",
            prioridad: (t as any).prioridad || t.priority || (p as any).prioridad || "Media",
            kanbanOrders: t.kanbanOrders,
            asignado_id: t.asignado_id,
            asignado_ids: t.asignado_ids,
            asignado: t.asignado,
          });
        });
      }
    });

    // Ordenar globalmente por la vista actual (groupingMode) y criterios de ordenación (sortBy, sortOrder)
    list.sort((a, b) => {
      if (sortBy === "alfabetico") {
        const cmp = (a.taskTitle || "").localeCompare(b.taskTitle || "", "es", { sensitivity: "base" });
        return sortOrder === "asc" ? cmp : -cmp;
      } else if (sortBy === "creacion") {
        const dateA = new Date((a.fecha_creacion || "") + "T00:00:00").getTime() || 0;
        const dateB = new Date((b.fecha_creacion || "") + "T00:00:00").getTime() || 0;
        const cmp = dateA - dateB;
        return sortOrder === "asc" ? cmp : -cmp;
      } else {
        const orderA = a.kanbanOrders?.[groupingMode] !== undefined ? a.kanbanOrders[groupingMode] : Infinity;
        const orderB = b.kanbanOrders?.[groupingMode] !== undefined ? b.kanbanOrders[groupingMode] : Infinity;
        if (orderA === Infinity && orderB === Infinity) {
          return a.taskIndex - b.taskIndex;
        }
        return orderA - orderB;
      }
    });

    return list;
  }, [projects, groupingMode, sortBy, sortOrder]);

  const currentUserId = useAuthStore((s) => s.userId);
  const currentUserName = useAuthStore((s) => s.userName);

  // Obtener sesiones recientes para calcular el avance en tiempo real de cada píldora y sincronizar el heatmap
  const { sessions: recentSessions } = useRecentSessions(300);
  const { activeSession } = useSessions();

  const filteredKanbanTasks = React.useMemo(() => {
    let result = kanbanTasks;

    // Filter out completed tasks ONLY when grouping by delivery date ("fecha")
    if (groupingMode === "fecha") {
      result = result.filter(t => t.status !== "Completado" && t.status !== "Completada");
    }

    if (viewFilterMode === "mio") {
      result = result.filter(t => {
        if (!currentUserId && !currentUserName) return true;
        const matchId = t.asignado_id && String(t.asignado_id) === String(currentUserId);
        const matchIds = Array.isArray(t.asignado_ids) && t.asignado_ids.map(String).includes(String(currentUserId));
        const matchName = currentUserName && t.asignado && t.asignado.toLowerCase().includes(currentUserName.toLowerCase());
        return matchId || matchIds || matchName;
      });
    }

    return result;
  }, [kanbanTasks, viewFilterMode, groupingMode, currentUserId, currentUserName]);

  const getCalendarDaysDiff = (targetDate: Date) => {
    if (!targetDate || !(targetDate instanceof Date) || isNaN(targetDate.getTime())) return 999;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  // Cálculo del esfuerzo diario sincronizado 1:1 con las tarjetas exactas de la columna "Hoy" en el Kanban
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
    todayExecutedMins?: number;
  }>(() => {
    // 1. Helper para verificar si una fecha o timestamp pertenece a "Hoy"
    const isSameDayAsToday = (dateVal: any): boolean => {
      if (!dateVal) return false;
      const d = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
      if (isNaN(d.getTime())) return false;
      const today = new Date();
      return (
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate()
      );
    };

    // 2. Calcular la suma total de minutos de todas las sesiones registradas HOY en el estudio
    const todaySessionsList = (recentSessions || []).filter(s => {
      return isSameDayAsToday(s.startTime || s.createdAt || s.created_at || s.created);
    });

    const todayExecutedSecs = todaySessionsList.reduce((sum, s) => {
      if (s.status === "en_curso") {
        const startMs = s.startTime?.toMillis ? s.startTime.toMillis() : new Date(s.startTime).getTime();
        const elapsed = isNaN(startMs) ? 0 : Math.max(0, Math.round((Date.now() - startMs) / 1000));
        return sum + elapsed;
      }
      if (typeof (s as any).durationSeconds === "number" && (s as any).durationSeconds >= 0) {
        return sum + (s as any).durationSeconds;
      }
      if (s.startTime && s.endTime) {
        const startMs = s.startTime?.toMillis ? s.startTime.toMillis() : new Date(s.startTime).getTime();
        const endMs = s.endTime?.toMillis ? s.endTime.toMillis() : new Date(s.endTime).getTime();
        if (!isNaN(startMs) && !isNaN(endMs) && endMs > startMs) {
          return sum + Math.round((endMs - startMs) / 1000);
        }
      }
      return sum + ((s.durationMins || 0) * 60);
    }, 0);

    let todayExecutedMins = Math.round(todayExecutedSecs / 60);

    // Si hay una sesión activa de hoy que aún no figura en la lista de recientes
    if (activeSession && isSameDayAsToday(activeSession.startTime) && !todaySessionsList.some(s => s.id === activeSession.id)) {
      const startMs = activeSession.startTime?.toMillis ? activeSession.startTime.toMillis() : new Date(activeSession.startTime).getTime();
      const elapsedSecs = isNaN(startMs) ? 0 : Math.max(0, Math.round((Date.now() - startMs) / 1000));
      todayExecutedMins = Math.round((todayExecutedSecs + elapsedSecs) / 60);
    }

    // Leemos estrictamente las tareas que corresponden a la columna "Hoy" del Kanban
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
      const cleanId = rawId.startsWith("kt-") ? rawId.replace(/^kt-[^-]+-/, "") : rawId;

      // Calcular todos los segundos acumulados en sesiones para esta tarea
      const taskSessions = (recentSessions || []).filter(s => {
        if (s.isDeleted || s.status === "deleted") return false;
        const sTaskId = String(s.task_id || (s as any).taskId || "");
        return sTaskId === cleanId || sTaskId === rawId || extractCleanTaskId(sTaskId) === cleanId;
      });

      const executedSecs = taskSessions.reduce((sum, s) => {
        if (s.status === "en_curso") {
          const startMs = s.startTime?.toMillis ? s.startTime.toMillis() : new Date(s.startTime).getTime();
          const elapsed = isNaN(startMs) ? 0 : Math.max(0, Math.round((Date.now() - startMs) / 1000));
          return sum + elapsed;
        }
        if (typeof (s as any).durationSeconds === "number" && (s as any).durationSeconds >= 0) {
          return sum + (s as any).durationSeconds;
        }
        if (s.startTime && s.endTime) {
          const startMs = s.startTime?.toMillis ? s.startTime.toMillis() : new Date(s.startTime).getTime();
          const endMs = s.endTime?.toMillis ? s.endTime.toMillis() : new Date(s.endTime).getTime();
          if (!isNaN(startMs) && !isNaN(endMs) && endMs > startMs) {
            return sum + Math.round((endMs - startMs) / 1000);
          }
        }
        return sum + ((s.durationMins || 0) * 60);
      }, 0);

      const executedMins = Math.round(executedSecs / 60);

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

    return { verde, naranja, gris, excedente, maxVal, verdeCount, naranjaCount, nextTask, total, tasksVerde, tasksNaranja, allTodayTasks, todayExecutedMins };
  }, [filteredKanbanTasks, limiteHorasDia, getCalendarDaysDiff, recentSessions, activeSession]);

  const handleUpdateTaskStatus = React.useCallback((projId: string | number, taskId: string | number, status: string) => {
    onUpdateProjects(prev => prev.map(p => {
      if (String(p.id) !== String(projId)) return p;
      const isComp = status === "Completado";
      const nowIso = new Date().toISOString();
      const nowDay = nowIso.split("T")[0];

      const updatedTasks = (p.tasks || []).map(t => {
        if (String(t.id) !== String(taskId)) return t;
        return {
          ...t,
          status: status as any,
          statusColor: isComp
            ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
            : "bg-slate-500/20 border-slate-500/30 text-slate-300",
          fecha_hora_completado: isComp ? nowIso : undefined,
          fecha_completado_real: isComp ? nowDay : undefined,
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

      // Persistencia en colección nativa /tasks
      const taskIdClean = String(taskId).replace(/^kt-[^-]+-/, "");
      updateDoc(doc(db, "tasks", taskIdClean), {
        estado: status,
        status: status,
        fecha_hora_completado: isComp ? nowIso : null,
        fecha_completado_real: isComp ? nowDay : null,
        updatedAt: serverTimestamp(),
        updated_at: serverTimestamp(),
      }).catch(err => console.error("Error actualizando status en /tasks:", err));

      return evalProj;
    }));
  }, [onUpdateProjects, autoEvaluateProjectStatus, persistProjectUpdate]);



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
        const defaultDeadline = (p as any).fechaFin || (p as any).fecha_fin || (p as any).fecha_limite || ((p as any).deadlineRaw) || ((p as any).deadline && /^\d{4}-\d{2}-\d{2}$/.test((p as any).deadline) ? (p as any).deadline : undefined);
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

        // Guardar la nueva tarea en la colección /tasks de Firestore
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
  }, [onUpdateProjects, formatLocalDate]);

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
    onSelectTask,
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
    sessions: recentSessions,
  };

  const headerBgStyle = isNightMode ? "bg-white/[0.03]" : "bg-black/[0.03]";
  const bgStyle = isNightMode ? "bg-[#1f1f1f]" : "bg-black/[0.03]";
  const r1BgStyle = isNightMode ? "bg-[#111113]" : "bg-[#fffce2]";
  const r1BorderStyle = isNightMode ? "border border-white/10" : "border border-slate-200";
  const cardBgStyle = isNightMode ? "bg-white/[0.04]" : "bg-black/[0.04]";

  return (
    <div className={`w-full h-full flex flex-col min-h-0 overflow-hidden ${
      draggingTaskId ? "is-dragging-active" : ""
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
          scroll-behavior: smooth;
        }

        /* Task card wrapper standard scalable dimensions */
        .task-card-wrapper {
          height: 10.125rem;
          overflow: visible;
          opacity: 1;
          touch-action: none;
        }
        .task-card-wrapper.is-dragging-card {
          transition: none !important;
        }

        /* Inner card base styles */
        .task-card {
          transition: border-color 0.3s ease-out, background-color 0.3s ease-out !important;
        }

        /* Keep full opacity on all task cards */
        .task-card-wrapper .task-card {
          opacity: 1 !important;
        }

        .project-title {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }

        .task-card-title {
          transform: translateY(0px) !important;
        }

        .task-card-details {
          max-height: 0 !important;
          opacity: 0 !important;
          overflow: hidden;
          display: none;
        }

        /* Task Card standard styles */
        .task-card-wrapper {
          height: 10.125rem;
          overflow: visible;
          opacity: 1;
          touch-action: none;
        }
        .task-card-wrapper.is-dragging-card {
          transition: none !important;
        }

        .task-card {
          transition: border-color 0.3s ease-out, background-color 0.3s ease-out !important;
        }
      `}</style>
      {/* Layout Redimensionable con Divisor Interactivo */}
      <div className="w-full h-full flex-1 flex gap-3 items-stretch max-w-full min-h-0 min-w-0 overflow-hidden">
        
        {/* Left Section: Barra de Esfuerzo Diario + Módulo de Sesiones (Persistente / Inmune a scroll) */}
        <div 
          style={{ width: `${sessionsWidth}px` }}
          className="shrink-0 flex flex-col gap-5 h-full overflow-hidden min-h-0"
        >
          <DailyEffortBar 
            todayEffort={todayEffort} 
            limiteHorasDia={limiteHorasDia} 
            setLimiteHorasDia={setLimiteHorasDia} 
            isNightMode={isNightMode} 
          />

          <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
            <HomeSessionsColumn 
              todayTasks={filteredKanbanTasks.filter(t => getCalendarDaysDiff(t.dueDate) <= 0)} 
              allTasks={kanbanTasks}
              projects={projects}
              isNightMode={isNightMode}
              onUpdateTaskStatus={handleUpdateTaskStatus}
              onSelectTask={onSelectTask}
            />
          </div>
        </div>

        {/* Divisor redimensionable con píldora azul entre Sesiones y Kanban */}
        <ResizableDivider 
          side="right"
          ariaLabel="Redimensionar columna de sesiones"
          onResize={handleSessionsResize}
          onResizeEnd={handleSessionsResizeEnd}
        />

        {/* Right Section: Kanban / Table / Timeline / Search */}
        <div className="flex-1 min-w-0 flex flex-col gap-5 h-full overflow-hidden">
          {/* Active View Content (Borderless) */}
          <div className={`w-full h-full flex-1 min-h-0 min-w-0 relative ${draggingTaskId ? "overflow-visible" : "overflow-hidden"}`}>
              {/* 0. SEARCH VIEW */}
              {activeView === "buscar" && (() => {
                const matchingProjects = projects.filter(
                  p =>
                    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.client.toLowerCase().includes(searchQuery.toLowerCase())
                );

                const matchingTasks: { id: string; title: string; projectTitle: string; projectId: number | string; status?: string }[] = [];
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
                        projectId: p.id,
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
                                  onClick={() => {
                                    const proj = projects.find(p => p.id === t.projectId);
                                    const matchedTask = proj?.tasks?.find(tk => String(tk.id) === String(t.id));
                                    if (matchedTask) {
                                      onSelectTask?.(matchedTask, t.projectId);
                                    }
                                  }}
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
                  onSelectTask={onSelectTask}
                />
              )}

              {/* 3. TIMELINE VIEW */}
              {activeView === "timeline" && (
                <TimelineView
                  projects={projects}
                  onSelectProject={onSelectProject}
                  onSelectTask={onSelectTask}
                  onUpdateProjects={onUpdateProjects}
                  timelineHideCompleted={timelineHideCompleted}
                  onToggleTimelineHideCompleted={onToggleTimelineHideCompleted}
                  timelineSortBy={timelineSortBy}
                  onSetTimelineSortBy={onSetTimelineSortBy}
                  isNightMode={isNightMode}
                />
              )}
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
            // 1. Eliminar de la colección nativa /tasks en Firestore
            await deleteDoc(doc(db, "tasks", taskIdStr));
          } catch (err) {
            console.error("Error al eliminar la tarea de la colección nativa /tasks:", err);
          }

          // 2. Actualizar el estado local y persistir actualización en proyectos
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
