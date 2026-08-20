"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Variants, useMotionValue, useSpring } from 'framer-motion';
import { playSound } from '../utils/audio';
import { getDynamicProgress } from '../utils/data';
import DateRangePicker from './DateRangePicker';
import Image from 'next/image';
import { Calendar, DollarSign, Clock, Flag, ClipboardList, TrendingUp, Users, Plus, Trash2, Check, X, ChevronDown, ChevronRight, Layers, Filter, Grid } from 'lucide-react';
import FormatoShape from './FormatoShape';
import { FORMATOS_ESTANDAR, getFormato, FormatoConfig } from '../utils/formatos';
import { TaskCardContent } from './TaskCard';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { useTaskCardInteractions } from '../hooks/useTaskCardInteractions';
import { CARD_COLOR_KEYS, getCardColorTheme, getSingleSourceProjectColor } from '@/lib/utils';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Task {
  id: number;
  title: string;
  desc: string;
  format: string;
  formato?: string | null;
  time: string;
  status: 'Planificado' | 'En Proceso' | 'En Revisión' | 'Completado';
  statusColor: string;
  attachmentUrl?: string;
  subtasks: { id: number; text: string; done: boolean }[];
  sessions?: { id: number; date: string; hours: number }[];
  deadline?: string;
  fecha_programada?: string;
  fechaProg?: string;
  fecha_limite?: string;
  fechaEntrega?: string;
  fechaFin?: string;
  dueDate?: any;
  fecha_creacion?: string;
  fecha_hora_completado?: string;
  hora_inicio?: string;
  kanbanOrders?: Record<string, number>;
  color?: string;
}

export interface Project {
  id: number;
  title: string;
  client: string;
  desc: string;
  progress: string;
  percent: string;
  gradient: string;
  glow: string;
  // Dashboard extended data
  package?: string;
  status?: string;
  statusColor?: string;
  startDate?: string;
  burnRate?: string;
  deadline?: string;
  daysRemaining?: string;
  team?: { name: string; color: string }[];
  asignado_ids?: string[];
  asignado?: string;
  briefCore?: string;
  priority?: string;
  cost?: string;
  tasks?: Task[];
  customColor?: { h: number; s: number; l: number };
  customGradientStyle?: string;
  customGlowStyle?: string;
  startDateRaw?: string;
  deadlineRaw?: string;
  fechaInicio?: string;
  fechaFin?: string;
  fecha_creacion?: string;
}

interface ProjectDashboardProps {
  project: Project | null;
  onUpdateTitle?: (id: number, newTitle: string) => void;
  onUpdateBriefCore?: (id: number, newBriefCore: string) => void;
  onUpdateDates?: (id: number, startDate: string, deadline: string) => void;
  onUpdateTasks?: (id: number, tasks: Task[]) => void;
  onUpdateClient?: (id: number, newClient: string) => void;
  onUpdatePackage?: (id: number, newPackage: string) => void;
  onUpdateCost?: (id: number, newCost: string) => void;
  onUpdateBurnRate?: (id: number, newBurnRate: string) => void;
  onUpdateStatus?: (id: number, newStatus: string) => void;
  onUpdatePriority?: (id: number, newPriority: string) => void;
  onUpdateDaysRemaining?: (id: number, newDaysRemaining: string) => void;
  onSelectTask?: (taskId: number) => void;
  onDeleteProject?: (id: number) => void;
  onSelectProject?: (projectId: string | number) => void;
  isNeumorphic?: boolean;
  isNightMode?: boolean;
  isSidebarHovered?: boolean;
}

const MONTHS_SPANISH = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const FULL_MONTH_NAMES = {
  'ene': 'enero', 'feb': 'febrero', 'mar': 'marzo', 'abr': 'abril', 'may': 'mayo', 'jun': 'junio',
  'jul': 'julio', 'ago': 'agosto', 'sep': 'septiembre', 'oct': 'octubre', 'nov': 'noviembre', 'dic': 'diciembre'
};
const WEEKDAYS_SPANISH = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function getProjectBgColor(p: Project): string {
  return getSingleSourceProjectColor(p).hslCss;
}

const parseTaskTimeToHours = (timeStr: string | undefined | null): number => {
  if (!timeStr) return 0;
  const clean = timeStr.trim().toLowerCase();
  
  if (clean.includes("min")) {
    const minMatch = clean.match(/(\d+(?:\.\d+)?)/);
    if (minMatch) {
      return parseFloat(minMatch[1]) / 60;
    }
  }
  
  const hrMatch = clean.match(/(\d+(?:\.\d+)?)/);
  if (hrMatch) {
    return parseFloat(hrMatch[1]);
  }
  
  return 0;
};

function getFullDeadlineText(deadlineStr: string | undefined): string {
  if (!deadlineStr) return "";
  if (deadlineStr.toLowerCase() === 'entregado') return "Entregado";
  if (deadlineStr === '-') return "";
  
  const parts = deadlineStr.trim().split(' ');
  if (parts.length < 2) return `Termina el ${deadlineStr}`;
  
  const day = parseInt(parts[0], 10);
  const monthStr = parts[1].toLowerCase();
  const monthIdx = MONTHS_SPANISH.findIndex(m => m.toLowerCase() === monthStr);
  if (isNaN(day) || monthIdx === -1) return `Termina el ${deadlineStr}`;
  
  const year = new Date().getFullYear();
  const date = new Date(year, monthIdx, day);
  
  const weekday = WEEKDAYS_SPANISH[date.getDay()];
  const fullMonth = FULL_MONTH_NAMES[monthStr as keyof typeof FULL_MONTH_NAMES] || parts[1];
  
  return `Termina el ${weekday} ${day} de ${fullMonth}`;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.3, ease: "easeIn" }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30, filter: "blur(10px)" },
  visible: { 
    opacity: 1, 
    y: 0, 
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } 
  }
};



const getGlowFromStatusColor = (statusColor: string | undefined): string => {
  if (!statusColor) return 'bg-blue-600';
  if (statusColor.includes('yellow-500')) return 'bg-yellow-500';
  if (statusColor.includes('orange-500')) return 'bg-orange-500';
  if (statusColor.includes('blue-500')) return 'bg-blue-500';
  if (statusColor.includes('emerald-500')) return 'bg-emerald-500';
  if (statusColor.includes('rose-500')) return 'bg-rose-500';
  if (statusColor.includes('indigo-500')) return 'bg-indigo-500';
  if (statusColor.includes('fuchsia-500')) return 'bg-fuchsia-500';
  if (statusColor.includes('cyan-500')) return 'bg-cyan-500';
  return 'bg-white';
};

export function ProjectDashboard({ 
  project, 
  onUpdateTitle, 
  onUpdateBriefCore, 
  onUpdateDates,
  onUpdateTasks,
  onUpdateClient,
  onUpdatePackage,
  onUpdateCost,
  onUpdateBurnRate,
  onUpdateStatus,
  onUpdatePriority,
  onUpdateDaysRemaining,
  onSelectTask,
  onDeleteProject,
  onSelectProject,
  isNeumorphic = false,
  isNightMode = false,
  isSidebarHovered = false
}: ProjectDashboardProps) {
  const projectStatusGlow = getGlowFromStatusColor(project?.statusColor);
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [editedTitle, setEditedTitle] = React.useState(project?.title || "");
  const [originalTitle, setOriginalTitle] = React.useState("");
  const [activeTimeTaskRowId, setActiveTimeTaskRowId] = React.useState<number | null>(null);

  const [isEditingDesc, setIsEditingDesc] = React.useState(false);
  const [editedDesc, setEditedDesc] = React.useState(project?.briefCore || "");
  const [originalDesc, setOriginalDesc] = React.useState("");

  const tasks = project?.tasks || [];
  const setTasks = (updater: React.SetStateAction<Task[]>) => {
    if (!project || !onUpdateTasks) return;
    const nextTasks = typeof updater === 'function' ? updater(tasks) : updater;
    onUpdateTasks(project.id, nextTasks);
  };

  // Shared Task Card interactions hook
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
    expandedCardId,
    setExpandedCardId,
    hoveredStatusOptionCard,
    setHoveredStatusOptionCard,
    hoveredFormatOptionCard,
    setHoveredFormatOptionCard,
    getStatusPillConfig,
    getFormatPillConfig,
  } = useTaskCardInteractions();

  // Grouping & Collapse state
  const [agruparPor, setAgruparPor] = useState<"status" | "formato" | "fecha" | "ninguno">("status");
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [deleteModalConfig, setDeleteModalConfig] = useState<any>(null);

  const colorConfig = React.useMemo(() => {
    return CARD_COLOR_KEYS.reduce((acc: Record<string, any>, key: string) => {
      acc[key] = getCardColorTheme(key, isNightMode);
      return acc;
    }, {} as Record<string, any>);
  }, [isNightMode]);

  const getCalendarDaysDiff = React.useCallback((targetDate: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  }, []);

  const formatLocalDate = React.useCallback((d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const updateTaskProperty = React.useCallback((projId: string | number, tId: string | number, key: string, value: any) => {
    if (!project || !onUpdateTasks) return;

    const tIdStr = String(tId);
    const updatedTasks = (tasks || []).map((t) => {
      const isMatch = String(t.id) === tIdStr || `kt-${project.id}-${t.id}` === tIdStr || (tIdStr.startsWith("kt-") && tIdStr.endsWith(`-${t.id}`));
      if (!isMatch) return t;

      const updated = { ...t, [key]: value };
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
    });

    onUpdateTasks(project.id, updatedTasks);
  }, [project, onUpdateTasks, tasks]);

  const saveEditing = React.useCallback((projId: string | number, tId: string | number) => {
    if (!editingTaskField) return;
    updateTaskProperty(projId, tId, editingTaskField.field, editingValue);
    setEditingTaskField(null);
  }, [editingTaskField, editingValue, updateTaskProperty, setEditingTaskField]);

  const toggleSectionCollapse = (sectionId: string) => {
    playSound('click');
    setCollapsedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const groupedSections = React.useMemo(() => {
    if (agruparPor === "status") {
      const map: Record<string, Task[]> = {
        "Planificado": [],
        "En Proceso": [],
        "En Revisión": [],
        "Completado": [],
        "Sin categoría": []
      };

      tasks.forEach(t => {
        const st: string = t.status || "Planificado";
        if (st === "Planificado" || st === "Pendiente") {
          map["Planificado"].push(t);
        } else if (st === "En Proceso") {
          map["En Proceso"].push(t);
        } else if (st === "En Revisión" || st === "Revisión") {
          map["En Revisión"].push(t);
        } else if (st === "Completado") {
          map["Completado"].push(t);
        } else {
          map["Sin categoría"].push(t);
        }
      });

      return [
        { id: "status-planificado", title: "Por hacer / Planificado", tasks: map["Planificado"], badgeBg: "bg-slate-500/20 text-slate-300" },
        { id: "status-proceso", title: "En Proceso", tasks: map["En Proceso"], badgeBg: "bg-amber-500/20 text-amber-300" },
        { id: "status-revision", title: "En Revisión", tasks: map["En Revisión"], badgeBg: "bg-purple-500/20 text-purple-300" },
        { id: "status-completado", title: "Completado", tasks: map["Completado"], badgeBg: "bg-emerald-500/20 text-emerald-300" },
        ...(map["Sin categoría"].length > 0 ? [{ id: "status-sin-cat", title: "Sin categoría", tasks: map["Sin categoría"], badgeBg: "bg-neutral-500/20 text-neutral-400" }] : [])
      ];
    }

    if (agruparPor === "formato") {
      const knownFormats = ["Portada", "Flyer", "Video", "Copywriting", "Branding"];
      const map: Record<string, Task[]> = {};
      knownFormats.forEach(fmt => { map[fmt] = []; });
      map["Otros formatos"] = [];
      map["Sin categoría"] = [];

      tasks.forEach(t => {
        const fmt = t.formato || t.format;
        if (!fmt) {
          map["Sin categoría"].push(t);
        } else if (knownFormats.includes(fmt)) {
          map[fmt].push(t);
        } else {
          map["Otros formatos"].push(t);
        }
      });

      const result = knownFormats.map(fmt => ({
        id: `fmt-${fmt}`,
        title: fmt,
        tasks: map[fmt],
        badgeBg: "bg-sky-500/20 text-sky-300"
      }));

      if (map["Otros formatos"].length > 0) {
        result.push({ id: "fmt-otros", title: "Otros formatos", tasks: map["Otros formatos"], badgeBg: "bg-indigo-500/20 text-indigo-300" });
      }
      if (map["Sin categoría"].length > 0) {
        result.push({ id: "fmt-sin-cat", title: "Sin categoría", tasks: map["Sin categoría"], badgeBg: "bg-neutral-500/20 text-neutral-400" });
      }
      return result;
    }

    if (agruparPor === "fecha") {
      const map: Record<string, Task[]> = {
        "Vencidas": [],
        "Hoy": [],
        "Mañana": [],
        "Próximos 7 días": [],
        "Más adelante": [],
        "Sin categoría": []
      };

      tasks.forEach(t => {
        const targetDateStr = 
          t.fecha_limite || 
          t.deadline || 
          t.fechaEntrega || 
          t.fecha_programada || 
          project?.fechaFin || 
          (project as any)?.fecha_fin || 
          project?.deadline || 
          (project as any)?.deadlineRaw || 
          (project as any)?.dueDate || 
          project?.startDate;
        if (!targetDateStr) {
          map["Sin categoría"].push(t);
          return;
        }
        const dateObj = new Date(targetDateStr + "T00:00:00");
        const diffDays = getCalendarDaysDiff(dateObj);

        if (diffDays < 0 && t.status !== "Completado") {
          map["Vencidas"].push(t);
        } else if (diffDays === 0) {
          map["Hoy"].push(t);
        } else if (diffDays === 1) {
          map["Mañana"].push(t);
        } else if (diffDays > 1 && diffDays <= 7) {
          map["Próximos 7 días"].push(t);
        } else if (diffDays > 7) {
          map["Más adelante"].push(t);
        } else {
          map["Sin categoría"].push(t);
        }
      });

      return [
        { id: "fecha-vencidas", title: "Vencidas", tasks: map["Vencidas"], badgeBg: "bg-rose-500/20 text-rose-300" },
        { id: "fecha-hoy", title: "Hoy", tasks: map["Hoy"], badgeBg: "bg-sky-500/20 text-sky-300" },
        { id: "fecha-manana", title: "Mañana", tasks: map["Mañana"], badgeBg: "bg-amber-500/20 text-amber-300" },
        { id: "fecha-7dias", title: "Próximos 7 días", tasks: map["Próximos 7 días"], badgeBg: "bg-indigo-500/20 text-indigo-300" },
        { id: "fecha-adelante", title: "Más adelante", tasks: map["Más adelante"], badgeBg: "bg-slate-500/20 text-slate-300" },
        ...(map["Sin categoría"].length > 0 ? [{ id: "fecha-sin-cat", title: "Sin categoría", tasks: map["Sin categoría"], badgeBg: "bg-neutral-500/20 text-neutral-400" }] : [])
      ];
    }

    return [
      { id: "all-tasks", title: "Todas las tareas", tasks: tasks, badgeBg: "bg-slate-500/20 text-slate-300" }
    ];
  }, [tasks, agruparPor, getCalendarDaysDiff]);

  const [expandedTaskIds, setExpandedTaskIds] = useState<number[]>([]);

  // Local inline task creation draft state (Zero silent Firestore writes)
  const [isCreatingInlineTask, setIsCreatingInlineTask] = useState(false);
  const [inlineTaskTitle, setInlineTaskTitle] = useState("");
  const [inlineTaskTime, setInlineTaskTime] = useState("30 min");
  const [inlineTaskFormatoKey, setInlineTaskFormatoKey] = useState<string | null>(null);
  const [inlineTaskFormatoName, setInlineTaskFormatoName] = useState("");

  const handleConfirmInlineTask = () => {
    if (!inlineTaskTitle.trim() || !project) return;
    playSound('pop');
    const today = new Date();
    const fecha_creacion = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const newTask: Task = {
      id: Date.now(),
      title: inlineTaskTitle.trim(),
      desc: "",
      format: inlineTaskFormatoName || "Sin formato",
      formato: inlineTaskFormatoKey || null,
      time: inlineTaskTime.trim() || "30 min",
      status: "Planificado",
      statusColor: "bg-slate-500/20 border-slate-500/30 text-slate-300",
      subtasks: [],
      fecha_creacion,
    };
    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);
    if (onUpdateTasks && project) {
      onUpdateTasks(project.id, updatedTasks);
    }
    setIsCreatingInlineTask(false);
    setInlineTaskTitle("");
    setInlineTaskTime("30 min");
    setInlineTaskFormatoKey(null);
    setInlineTaskFormatoName("");
  };

  const handleCancelInlineTask = () => {
    setIsCreatingInlineTask(false);
    setInlineTaskTitle("");
    setInlineTaskTime("30 min");
    setInlineTaskFormatoKey(null);
    setInlineTaskFormatoName("");
  };

  const handleUpdateTaskTime = (taskId: number, newTime: string) => {
    if (!onUpdateTasks || !project) return;
    const newTasks = tasks.map(t => t.id === taskId ? { ...t, time: newTime } : t);
    onUpdateTasks(project.id, newTasks);
  };

  // Time Tracker state for task session logs
  const [activeTimerTaskId, setActiveTimerTaskId] = useState<number | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (activeTimerTaskId !== null) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setTimerSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTimerTaskId]);

  const formatTimer = (totalSeconds: number): string => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleToggleTimer = (task: Task) => {
    playSound('click');
    
    if (activeTimerTaskId === task.id) {
      // Pause active timer and save session
      const elapsedHours = parseFloat((timerSeconds * 0.1).toFixed(2));
      if (elapsedHours > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        const newSession = {
          id: Date.now(),
          date: todayStr,
          hours: elapsedHours
        };

        const updatedTasks = tasks.map(t => {
          if (t.id === task.id) {
            const existingSessions = t.sessions || [];
            const updatedSessions = [newSession, ...existingSessions];
            const totalTaskHours = updatedSessions.reduce((sum, s) => sum + s.hours, 0);
            return {
              ...t,
              time: `${totalTaskHours.toFixed(1)}h`,
              sessions: updatedSessions
            };
          }
          return t;
        });

        setTasks(updatedTasks);

        const totalSpentHours = updatedTasks.reduce((acc, t) => {
          const taskSessionsSum = t.sessions?.reduce((sum, s) => sum + s.hours, 0) || 0;
          return acc + taskSessionsSum;
        }, 0);

        let plannedHours = 40;
        if (project?.burnRate) {
          const parts = project.burnRate.split('/');
          if (parts.length > 1) {
            const plannedMatch = parts[1].match(/(\d+)/);
            if (plannedMatch) {
              plannedHours = parseInt(plannedMatch[1], 10);
            }
          }
        }

        if (onUpdateBurnRate && project) {
          onUpdateBurnRate(project.id, `${Math.round(totalSpentHours)}h / ${plannedHours}h`);
        }
      }
      setActiveTimerTaskId(null);
    } else {
      // If another task is already running, pause it first
      if (activeTimerTaskId !== null) {
        const activeTask = tasks.find(t => t.id === activeTimerTaskId);
        if (activeTask) {
          const elapsedHours = parseFloat((timerSeconds * 0.1).toFixed(2));
          if (elapsedHours > 0) {
            const todayStr = new Date().toISOString().split('T')[0];
            const newSession = {
              id: Date.now() + 1,
              date: todayStr,
              hours: elapsedHours
            };

            const updatedTasks = tasks.map(t => {
              if (t.id === activeTimerTaskId) {
                const existingSessions = t.sessions || [];
                const updatedSessions = [newSession, ...existingSessions];
                const totalTaskHours = updatedSessions.reduce((sum, s) => sum + s.hours, 0);
                return {
                  ...t,
                  time: `${totalTaskHours.toFixed(1)}h`,
                  sessions: updatedSessions
                };
              }
              return t;
            });

            setTasks(updatedTasks);
          }
        }
      }

      setActiveTimerTaskId(task.id);
      setTimerSeconds(0);
    }
  };

  const dynamicProgress = getDynamicProgress(project);

  useEffect(() => {
    if (project && tasks.length > 0) {
      // Set all tasks as expanded by default (2x height) only on initial load or if not set yet
      setExpandedTaskIds(prev => prev.length === 0 ? tasks.map(t => t.id) : prev);
    }
  }, [project?.id]);

  // Synchronize project burnRate (total spent hours) from all tasks' hours automatically
  useEffect(() => {
    if (!project || !onUpdateBurnRate) return;

    // Sum of all tasks' hours (completed or not, since project total counts all)
    const totalTasksHours = tasks.reduce((sum, t) => {
      const sessionsSum = t.sessions?.reduce((sAcc, s) => sAcc + s.hours, 0) || 0;
      const parsedTime = parseTaskTimeToHours(t.time);
      return sum + Math.max(sessionsSum, parsedTime);
    }, 0);

    // Extract current planned hours from burnRate (the Y in Xh / Yh)
    let plannedHours = 40;
    if (project.burnRate) {
      const parts = project.burnRate.split('/');
      if (parts.length > 1) {
        const plannedMatch = parts[1].match(/(\d+)/);
        if (plannedMatch) {
          plannedHours = parseInt(plannedMatch[1], 10);
        }
      } else {
        const plannedMatch = project.burnRate.match(/(\d+)/);
        if (plannedMatch) {
          plannedHours = parseInt(plannedMatch[1], 10);
        }
      }
    }

    const calculatedSpent = Math.round(totalTasksHours);
    const expectedBurnRate = `${calculatedSpent}h / ${plannedHours}h`;

    if (project.burnRate !== expectedBurnRate) {
      onUpdateBurnRate(project.id, expectedBurnRate);
    }
  }, [tasks, project?.burnRate, project?.id, onUpdateBurnRate]);

  const toggleTaskStatus = (taskId: number) => {
    playSound('pop');
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      let nextStatus: 'Planificado' | 'En Proceso' | 'En Revisión' | 'Completado';
      let nextColor: string;
      if (t.status === 'Planificado' || t.status === ('Pendiente' as any)) {
        nextStatus = 'En Proceso';
        nextColor = "bg-amber-500/10 border-amber-500/30 text-amber-400";
      } else if (t.status === 'En Proceso') {
        nextStatus = 'En Revisión';
        nextColor = "bg-purple-500/10 border-purple-500/30 text-purple-400";
      } else if (t.status === 'En Revisión' || (t.status as any) === 'Revisión') {
        nextStatus = 'Completado';
        nextColor = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
      } else {
        nextStatus = 'Planificado';
        nextColor = "bg-slate-500/10 border-slate-500/30 text-slate-300";
      }
      return { 
        ...t, 
        status: nextStatus, 
        statusColor: nextColor,
        fecha_hora_completado: nextStatus === 'Completado' ? new Date().toISOString() : undefined 
      };
    }));
  };

  const handleAttachmentToggle = (taskId: number) => {
    if (!onUpdateTasks || !project) return;
    const newTasks = tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, attachmentUrl: t.attachmentUrl ? undefined : "/taski-icon.png" };
      }
      return t;
    });
    onUpdateTasks(project.id, newTasks);
    playSound('pop');
  };

  const handleUpdateTaskTitle = (taskId: number, newTitle: string) => {
    if (!onUpdateTasks || !project) return;
    const newTasks = tasks.map(t => t.id === taskId ? { ...t, title: newTitle } : t);
    onUpdateTasks(project.id, newTasks);
  };

  const handleUpdateTaskFormat = (taskId: number, newFormat: string) => {
    if (!onUpdateTasks || !project) return;
    const newTasks = tasks.map(t => t.id === taskId ? { ...t, format: newFormat } : t);
    onUpdateTasks(project.id, newTasks);
  };

  const handleUpdateTaskDesc = (taskId: number, newDesc: string) => {
    if (!onUpdateTasks || !project) return;
    const newTasks = tasks.map(t => t.id === taskId ? { ...t, desc: newDesc } : t);
    onUpdateTasks(project.id, newTasks);
  };

  const handleUpdateSubtaskText = (taskId: number, subtaskId: number, newText: string) => {
    if (!onUpdateTasks || !project) return;
    const newTasks = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          subtasks: t.subtasks.map(s => s.id === subtaskId ? { ...s, text: newText } : s)
        };
      }
      return t;
    });
    onUpdateTasks(project.id, newTasks);
  };

  const handleAddSubtask = (taskId: number) => {
    if (!onUpdateTasks || !project) return;
    const newTasks = tasks.map(t => {
      if (t.id === taskId) {
        const newSubId = Math.max(...t.subtasks.map(s => s.id), 0) + 1;
        return {
          ...t,
          subtasks: [...t.subtasks, { id: newSubId, text: "Nueva subtarea", done: false }]
        };
      }
      return t;
    });
    onUpdateTasks(project.id, newTasks);
    playSound('pop');
  };

  const handleAddTask = () => {
    const today = new Date();
    const fecha_creacion = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const defaultDeadline = project ? ((project as any).fecha_limite || (project as any).deadlineRaw || (project.deadline && /^\d{4}-\d{2}-\d{2}$/.test(project.deadline) ? project.deadline : undefined)) : undefined;
    const newTask: Task = {
      id: Date.now(),
      title: "Nueva Tarea",
      desc: "Descripción de la tarea...",
      format: "Formato",
      time: "0H",
      status: "Planificado",
      statusColor: "bg-white",
      subtasks: [],
      fecha_creacion,
      fecha_limite: defaultDeadline,
      deadline: defaultDeadline,
    };
    setTasks([...tasks, newTask]);
    playSound('pop');
  };

  const handleDeleteTask = (taskId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setTasks(prev => prev.filter(t => t.id !== taskId));
    playSound('trash');
  };

  const toggleTaskExpand = (taskId: number) => {
    playSound('click');
    setExpandedTaskIds(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const toggleSubtask = (taskId: number, subtaskId: number) => {
    playSound('pop');
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const updatedSubtasks = t.subtasks ? t.subtasks.map(s => {
        if (s.id !== subtaskId) return s;
        return { ...s, done: !s.done };
      }) : [];
      return { ...t, subtasks: updatedSubtasks };
    }));
  };

  const handleCreateTask = () => {
    playSound('pop');
    const newTaskNum = tasks.length + 1;
    const today = new Date();
    const fecha_creacion = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const newTask = {
      id: Date.now(),
      title: `Nueva Tarea ${newTaskNum}`,
      desc: "Descripción de la nueva tarea. Clic en el cuadro de la izquierda para adjuntar imagen.",
      format: "Formato Web",
      time: "2h",
      status: "Planificado" as const,
      statusColor: "bg-white/5 border border-white/10 text-white/60",
      attachmentUrl: "",
      subtasks: [
        { id: 1, text: "Paso inicial de la tarea", done: false },
        { id: 2, text: "Verificar entregables finales", done: false }
      ],
      fecha_creacion
    };
    setTasks(prev => [...prev, newTask]);
    // Expand newly created task by default
    setExpandedTaskIds(prev => [...prev, newTask.id]);
  };

  React.useEffect(() => {
    if (project) {
      setEditedTitle(project.title);
      setEditedDesc(project.briefCore || "");
    }
    setIsEditingTitle(false);
    setIsEditingDesc(false);
  }, [project?.id]);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (onUpdateTitle && project && editedTitle.trim() !== "") {
      onUpdateTitle(project.id, editedTitle.trim());
      playSound('pop');
    } else {
      setEditedTitle(project?.title || "");
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      if (onUpdateTitle && project) {
        onUpdateTitle(project.id, originalTitle);
      }
      setEditedTitle(originalTitle);
      setIsEditingTitle(false);
      playSound('click');
    }
  };

  const handleDescSubmit = () => {
    setIsEditingDesc(false);
    if (onUpdateBriefCore && project && editedDesc.trim() !== "") {
      onUpdateBriefCore(project.id, editedDesc.trim());
      playSound('pop');
    } else {
      setEditedDesc(project?.briefCore || "");
    }
  };

  const handleDescKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      if (onUpdateBriefCore && project) {
        onUpdateBriefCore(project.id, originalDesc);
      }
      setEditedDesc(originalDesc);
      setIsEditingDesc(false);
      playSound('click');
    }
  };

  if (!project) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key={project.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        onAnimationStart={() => playSound('whoosh')}
        className="absolute top-0 left-[310px] right-6 bottom-0 z-auto p-8 pt-[140px] pointer-events-auto overflow-y-auto hide-scrollbar pb-24 relative"
      >
        {/* Dynamic Ambient Header Glow matching project color */}
        <div 
          className="absolute top-0 left-0 right-0 h-44 pointer-events-none opacity-25 blur-3xl transition-all duration-500" 
          style={{ background: `radial-gradient(ellipse at top, ${getProjectBgColor(project)} 0%, transparent 75%)` }} 
        />
        {/* Nivel 4: Acciones Rápidas (Absolute Top Right) */}
        <motion.div variants={itemVariants} className="absolute top-[186px] right-8 flex items-center gap-3 z-40">
          <button 
            className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all group ${
              isNeumorphic 
                ? 'bg-[#e6eef8] text-slate-500 shadow-[3px_3px_6px_#b8c4d9,-3px_-3px_6px_#ffffff] border border-white/40 hover:text-slate-800' 
                : 'liquid-glass-btn text-white/50 hover:text-white'
            }`} 
            title="Ver como Cliente"
          >
            <svg className={`w-4 h-4 transition-colors ${isNeumorphic ? 'text-slate-500 group-hover:text-slate-800' : 'text-white/50 group-hover:text-white/90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          <button 
            className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all group ${
              isNeumorphic 
                ? 'bg-[#e6eef8] text-slate-500 shadow-[3px_3px_6px_#b8c4d9,-3px_-3px_6px_#ffffff] border border-white/40 hover:text-slate-800' 
                : 'liquid-glass-btn text-white/50 hover:text-white'
            }`} 
            title="Editar Brief / Configuración"
          >
            <svg className={`w-4 h-4 transition-colors ${isNeumorphic ? 'text-slate-500 group-hover:text-slate-800' : 'text-white/50 group-hover:text-white/90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        </motion.div>

        {/* Nivel 1: Identidad y Contexto */}
        <div className="relative z-40 flex flex-col gap-1 pr-32">
          {/* Row 1: Client pill and Team above title */}
          <motion.div variants={itemVariants} className="flex items-center gap-3">
            <div className={`px-4 py-1.5 rounded-full text-[11px] font-bold tracking-widest uppercase flex items-center transition-all duration-300 ${
              isNightMode
                ? 'neu-dark-flat border border-white/5 text-zinc-100 shadow-md'
                : 'neu-flat text-slate-800 shadow-[2px_2px_4px_#b8c4d9,-2px_-2px_4px_#ffffff] border border-white/40'
            }`}>
              <InlineEditable 
                value={project.client}
                onSave={(val) => onUpdateClient && onUpdateClient(project.id, val)}
                className={`inline-block ${isNightMode ? 'hover:text-white text-zinc-100' : 'hover:text-slate-900 text-slate-700'}`}
              />
            </div>

            {/* Team Element */}
            <div className="flex items-center gap-2 flex-shrink-0 select-none ml-1">
              <button 
                onClick={() => playSound('click')}
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${
                  isNightMode
                    ? 'neu-dark-flat border border-white/5 text-zinc-300 hover:text-zinc-100'
                    : 'bg-[#e6eef8] text-slate-500 shadow-[2px_2px_4px_#b8c4d9,-2px_-2px_4px_#ffffff] border border-white/40 hover:text-slate-800'
                }`}
                title="Añadir miembro"
              >
                <Plus className={`w-3 h-3 ${isNightMode ? 'text-zinc-400' : 'text-slate-500'}`} strokeWidth={2.5} />
              </button>
              <span className={`text-[12px] font-bold leading-none ${isNightMode ? 'text-zinc-400' : 'text-slate-500'}`}>Equipo</span>
            </div>

            {/* Delete Project/Folder button */}
            {onDeleteProject && (
              <div className="flex items-center gap-2 flex-shrink-0 select-none ml-4">
                <button 
                  onClick={() => {
                    if (window.confirm("¿Estás seguro de que quieres eliminar este proyecto/carpeta y todas sus tareas?")) {
                      onDeleteProject(project.id);
                    }
                  }}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 shadow-md bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20 hover:scale-105 active:scale-95`}
                  title="Eliminar Proyecto"
                >
                  <Trash2 className="w-3 h-3 text-rose-500" strokeWidth={2.5} />
                </button>
                <span className="text-[12px] font-bold leading-none text-rose-500">Eliminar</span>
              </div>
            )}
          </motion.div>
        </div>

        {/* Cohesive block of Title, Dates, Description centered relative to the card */}
        <div className="relative z-40 flex flex-col justify-between h-[150px] mt-[19px] pr-32">
          {/* Row 2: Title editor */}
          <motion.div variants={itemVariants} className="flex items-center gap-4">
            <div className="relative inline-grid">
              {/* Invisible spacer to maintain exact height and width of the text */}
              <h1 className="text-4xl md:text-5xl font-extralight tracking-tight invisible whitespace-pre pb-2 pt-1 m-0" aria-hidden="true">
                {isEditingTitle ? (editedTitle || ' ') : project.title}
              </h1>
              
              {isEditingTitle ? (
                <input 
                  autoFocus
                  type="text"
                  value={editedTitle}
                  onChange={(e) => {
                    setEditedTitle(e.target.value);
                    if (onUpdateTitle && project) {
                      onUpdateTitle(project.id, e.target.value);
                    }
                    playSound('keypress');
                  }}
                  onBlur={handleTitleSubmit}
                  onKeyDown={handleTitleKeyDown}
                  className={`text-4xl md:text-5xl font-extralight tracking-tight !bg-transparent !border-0 focus:!border-transparent !outline-none focus:!outline-none focus:!ring-0 !shadow-none !rounded-none !pb-2 !pt-1 !m-0 absolute inset-0 w-full h-full ${isNightMode ? 'text-zinc-100' : 'text-slate-800'}`}
                  style={{ appearance: 'none', WebkitAppearance: 'none', outline: 'none', boxShadow: 'none' }}
                />
              ) : (
                <h1 
                  onClick={() => {
                    playSound('click');
                    setOriginalTitle(project.title);
                    setIsEditingTitle(true);
                  }}
                  className={`text-4xl md:text-5xl font-extralight tracking-tight cursor-pointer transition-opacity duration-200 hover:opacity-80 pb-2 pt-1 m-0 absolute inset-0 w-full h-full select-none ${isNightMode ? 'text-zinc-100' : 'text-slate-800'}`}
                  title="Haz clic para editar el título"
                >
                  {project.title}
                </h1>
              )}
            </div>
            
            {isEditingTitle && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1.5 ml-2">
                <button 
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevents input onBlur from firing
                    if (onUpdateTitle && project) {
                      onUpdateTitle(project.id, originalTitle);
                    }
                    setEditedTitle(originalTitle);
                    setIsEditingTitle(false);
                    playSound('click');
                  }}
                  className="w-8 h-8 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center hover:bg-rose-500/20 hover:scale-105 active:scale-95 transition-all"
                  title="Cancelar (Esc)"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <button 
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleTitleSubmit();
                  }}
                  className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center hover:bg-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
                  title="Confirmar (Enter)"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </motion.div>
            )}
          </motion.div>
 
          {/* Row 3: Dates metadata below title */}
          <motion.div variants={itemVariants} className="flex items-center mt-0 gap-4 z-50 relative">
            <div className="text-[13px] font-medium tracking-wide flex items-center gap-1 transition-colors duration-500">
              <Calendar className={`w-3.5 h-3.5 flex-shrink-0 ${isNightMode ? 'text-neutral-400' : 'text-slate-500'}`} strokeWidth={2} />
              <span className={isNightMode ? 'text-neutral-400' : 'text-slate-600'}>Creado el</span>
              <span className={`font-semibold ${isNightMode ? 'text-white' : 'text-slate-900'}`}>{project.startDate && project.startDate !== "-" ? project.startDate : "24 Jun"}</span>
              <span className={`${isNightMode ? 'text-neutral-600' : 'text-slate-300'} mx-1.5`}>•</span>
              <span className={isNightMode ? 'text-neutral-400' : 'text-slate-600'}>Termina en</span>
              <span className={`font-semibold ${isNightMode ? 'text-white' : 'text-slate-900'}`}>{project.daysRemaining || "-"}</span>
              {project.deadline && project.deadline !== '-' && (
                <span className={`font-medium ml-0.5 ${isNightMode ? 'text-neutral-300' : 'text-slate-700'}`}>({project.deadline})</span>
              )}
            </div>

            <div className={`w-px h-4 ${isNightMode ? 'bg-neutral-700' : 'bg-slate-300'}`} />

            <ProjectStatusSelector 
              status={project.status || "Planificación"}
              isNeumorphic={isNeumorphic}
              onSelect={(newStatus) => onUpdateStatus && onUpdateStatus(project.id, newStatus)}
            />
          </motion.div>
        
          {/* Nivel 3: Brief Core */}
          <motion.div variants={itemVariants} className="flex items-start gap-3 mt-0 max-w-4xl">
            {/* Left part: description text/input + save/cancel buttons */}
            <div className="relative inline-grid flex-1">
              {/* Invisible spacer to maintain exact height and width of the multiline text */}
              <p className="text-[15px] leading-relaxed font-light invisible whitespace-pre-wrap break-words pb-2 pt-1 m-0" aria-hidden="true">
                {isEditingDesc ? (editedDesc || ' ') : (project.briefCore || "Campaña integrada para promoción de tarjetas de crédito. Tono fresco, enfocado en audiencia joven. Entregables: 5 carruseles IG y 1 Reel.")}
              </p>
              
              {isEditingDesc ? (
                <textarea 
                  autoFocus
                  value={editedDesc}
                  onChange={(e) => {
                    setEditedDesc(e.target.value);
                    if (onUpdateBriefCore && project) {
                      onUpdateBriefCore(project.id, e.target.value);
                    }
                    playSound('keypress');
                  }}
                  onBlur={handleDescSubmit}
                  onKeyDown={handleDescKeyDown}
                  className={`text-[15px] leading-relaxed font-light !bg-transparent !border-0 focus:!border-transparent !outline-none focus:!outline-none focus:!ring-0 !shadow-none !rounded-none !pb-2 !pt-1 !m-0 absolute inset-0 w-full h-full resize-none overflow-hidden ${isNightMode ? 'text-neutral-400' : 'text-slate-600'}`}
                  style={{ appearance: 'none', WebkitAppearance: 'none', outline: 'none', boxShadow: 'none' }}
                />
              ) : (
                <p 
                  onClick={() => {
                    playSound('click');
                    setOriginalDesc(project.briefCore || "");
                    setIsEditingDesc(true);
                  }}
                  className={`text-[15px] leading-relaxed font-light select-text cursor-text transition-colors absolute inset-0 pb-2 pt-1 m-0 break-words ${isNightMode ? 'text-neutral-400 hover:text-neutral-200' : 'text-slate-600 hover:text-slate-800'}`}
                  title="Clic para editar descripción"
                >
                  {project.briefCore || "Campaña integrada para promoción de tarjetas de crédito. Tono fresco, enfocado en audiencia joven. Entregables: 5 carruseles IG y 1 Reel."}
                </p>
              )}
            </div>

            {isEditingDesc && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-1.5 mt-1">
                <button 
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevents textarea onBlur from firing
                    if (onUpdateBriefCore && project) {
                      onUpdateBriefCore(project.id, originalDesc);
                    }
                    setEditedDesc(originalDesc);
                    setIsEditingDesc(false);
                    playSound('click');
                  }}
                  className="w-7 h-7 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center hover:bg-rose-500/20 hover:scale-105 active:scale-95 transition-all"
                  title="Cancelar (Esc)"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <button 
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleDescSubmit();
                  }}
                  className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center hover:bg-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
                  title="Confirmar (Enter)"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Level 2 KPI Row */}
        <div className="relative z-40 flex items-center gap-4 mt-6 overflow-x-auto hide-scrollbar pb-2">
          {/* Termina en */}
          <DateRangePicker 
            startDateStr={project.startDate}
            endDateStr={project.deadline}
            onUpdate={(start, end) => {
              if (onUpdateDates && project) {
                onUpdateDates(project.id, start, end);
              }
            }}
          >
            <motion.div 
              variants={itemVariants} 
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`relative flex flex-col justify-center flex-shrink-0 px-4 py-2.5 rounded-xl border transition-all duration-200 select-none min-h-[64px] min-w-[200px] ${
                isNightMode
                  ? "bg-neutral-800/50 border-0 text-neutral-50"
                  : "bg-slate-100 border-0 text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2 leading-none flex-wrap">
                <Calendar className={`w-3.5 h-3.5 flex-shrink-0 ${isNightMode ? 'text-[#ffffff8f]' : 'text-slate-500'}`} strokeWidth={2} />
                <span className={`text-[13px] font-bold leading-none ${isNightMode ? 'text-[#ffffff8f]' : 'text-slate-600'}`}>Termina en</span>
                <InlineEditable 
                  value={project.daysRemaining || "2 Días"} 
                  onSave={(val) => onUpdateDaysRemaining && onUpdateDaysRemaining(project.id, val)}
                  className={`text-[13px] font-black inline-block leading-none ${isNightMode ? 'text-slate-50' : 'text-slate-900'}`} 
                />
                {project.deadline && project.deadline !== '-' && (
                  <span className={`text-[13px] font-medium leading-none ml-0.5 ${isNightMode ? 'text-[#ffffff8f]' : 'text-slate-500'}`}>
                    ({project.deadline})
                  </span>
                )}
              </div>
            </motion.div>
          </DateRangePicker>

          {/* Costo */}
          <motion.div 
            variants={itemVariants} 
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => playSound('click')}
            className={`relative flex flex-col justify-center flex-shrink-0 px-4 py-2.5 rounded-xl border transition-all duration-200 select-none min-h-[64px] min-w-[130px] ${
              isNightMode
                ? "bg-neutral-800/50 border-0 text-neutral-50"
                : "bg-slate-100 border-0 text-slate-900"
            }`}
          >
            <div className="flex items-center gap-1 leading-none">
              <DollarSign className={`w-3.5 h-3.5 flex-shrink-0 ${isNightMode ? 'text-[#ffffff8f]' : 'text-slate-500'}`} strokeWidth={2} />
              <span className={`text-[13px] font-bold leading-none ${isNightMode ? 'text-[#ffffff8f]' : 'text-slate-600'}`}>Costo:</span>
              <InlineEditable 
                value={project.cost || "$0"} 
                onSave={(val) => onUpdateCost && onUpdateCost(project.id, val)}
                className={`text-[13px] font-black inline-block leading-none ml-1 ${isNightMode ? 'text-emerald-400' : 'text-emerald-600'}`} 
              />
            </div>
          </motion.div>

          {/* Tiempo */}
          <motion.div 
            variants={itemVariants} 
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => playSound('click')}
            className={`relative flex flex-col justify-center flex-shrink-0 px-4 py-2.5 rounded-xl border transition-all duration-200 select-none min-h-[64px] min-w-[160px] ${
              isNightMode
                ? "bg-neutral-800/50 border-0 text-neutral-50"
                : "bg-slate-100 border-0 text-slate-900"
            }`}
          >
            <div className="flex items-center gap-2 leading-none">
              <Clock className={`w-3.5 h-3.5 flex-shrink-0 ${isNightMode ? 'text-[#ffffff8f]' : 'text-slate-500'}`} strokeWidth={2} />
              <span className={`text-[13px] font-bold leading-none ${isNightMode ? 'text-[#ffffff8f]' : 'text-slate-600'}`}>Tiempo:</span>
              <InlineEditable 
                value={project.burnRate || "0h / 0h"} 
                onSave={(val) => onUpdateBurnRate && onUpdateBurnRate(project.id, val)}
                className={`text-[13px] font-black inline-block leading-none ${isNightMode ? 'text-slate-50' : 'text-slate-900'}`} 
              />
            </div>
          </motion.div>

          {/* Prioridad */}
          <motion.div 
            variants={itemVariants} 
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => playSound('click')}
            className={`relative flex flex-col justify-center flex-shrink-0 px-4 py-2.5 rounded-xl border transition-all duration-200 select-none min-h-[64px] min-w-[130px] ${
              isNightMode
                ? "bg-neutral-800/50 border-0 text-neutral-50"
                : "bg-slate-100 border-0 text-slate-900"
            }`}
          >
            <div className="flex items-center gap-2 leading-none">
              <Flag className={`w-3.5 h-3.5 flex-shrink-0 ${isNightMode ? 'text-[#ffffff8f]' : 'text-slate-500'}`} strokeWidth={2} />
              <span className={`text-[13px] font-bold leading-none ${isNightMode ? 'text-[#ffffff8f]' : 'text-slate-600'}`}>Prioridad:</span>
              <div className={`px-2 py-0.5 rounded text-[9px] font-extrabold tracking-wider uppercase border w-fit leading-none ${
                project.priority === 'Urgente' ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' :
                project.priority === 'Alta' ? 'bg-orange-500/10 border-orange-500/30 text-orange-500' :
                project.priority === 'Media' ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' :
                'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
              }`}>
                {project.priority || "Normal"}
              </div>
            </div>
          </motion.div>

          {/* Tareas */}
          <motion.div 
            variants={itemVariants} 
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => playSound('click')}
            className={`relative flex flex-col justify-center flex-shrink-0 px-4 py-2.5 rounded-xl border transition-all duration-200 select-none min-h-[64px] min-w-[140px] ${
              isNightMode
                ? "bg-neutral-800/50 border-0 text-neutral-50"
                : "bg-slate-100 border-0 text-slate-900"
            }`}
          >
            <div className="flex items-center gap-2 leading-none">
              <ClipboardList className={`w-3.5 h-3.5 flex-shrink-0 ${isNightMode ? 'text-[#ffffff8f]' : 'text-slate-500'}`} strokeWidth={2} />
              <span className={`text-[13px] font-bold leading-none ${isNightMode ? 'text-[#ffffff8f]' : 'text-slate-600'}`}>Tareas:</span>
              <span className={`text-[13px] font-black leading-none ${isNightMode ? 'text-slate-50' : 'text-slate-900'}`}>{dynamicProgress.progress}</span>
            </div>
          </motion.div>

          {/* Avance */}
          <motion.div 
            variants={itemVariants} 
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => playSound('click')}
            className={`relative flex flex-col justify-center flex-shrink-0 px-4 py-2.5 rounded-xl border transition-all duration-200 select-none min-h-[64px] min-w-[180px] ${
              isNightMode
                ? "bg-neutral-800/50 border-0 text-neutral-50"
                : "bg-slate-100 border-0 text-slate-900"
            }`}
          >
            <div className="flex items-center gap-2 leading-none">
              <TrendingUp className={`w-3.5 h-3.5 flex-shrink-0 ${isNightMode ? 'text-[#ffffff8f]' : 'text-slate-500'}`} strokeWidth={2} />
              <span className={`text-[13px] font-bold leading-none ${isNightMode ? 'text-[#ffffff8f]' : 'text-slate-600'}`}>Avance:</span>
              <div className={`w-16 h-1.5 rounded-full overflow-hidden ${isNightMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <div 
                  className={`h-full rounded-full transition-all duration-500 ease-out ${isNightMode ? 'bg-sky-400' : 'bg-slate-900'}`} 
                  style={{ 
                    width: dynamicProgress.percent
                  }} 
                />
              </div>
              <span className={`text-[11px] font-black leading-none ${isNightMode ? 'text-slate-50' : 'text-slate-900'}`}>{dynamicProgress.percent}</span>
            </div>
          </motion.div>
        </div>

        <motion.div variants={itemVariants} className={`w-full h-px mt-6 mb-4 relative z-40 ${isNightMode ? 'bg-slate-800' : 'bg-slate-200'}`} />

        {/* Estilo Folder para Tareas */}
        <motion.div variants={itemVariants} className="w-[calc(100%-1rem)] mt-0 flex flex-col relative z-40 mx-2">
          
          {/* Folder Tab */}
          <div className={`w-[260px] px-6 py-3 rounded-t-[16px] relative z-20 flex items-center justify-center -mb-[1px] transition-all duration-300 ${
            isNightMode
              ? "bg-neutral-800/50 text-neutral-50"
              : "bg-slate-100 text-slate-900"
          }`}>
            <h2 className={`text-base font-bold tracking-wide transition-colors ${isNightMode ? 'text-slate-50' : 'text-slate-900'}`}>
              Tareas del proyecto
            </h2>
            
            {/* Curva invertida fluida */}
            <div className="absolute -right-[20px] bottom-[1px] w-[20px] h-[20px] overflow-hidden pointer-events-none z-20">
              <div className={`absolute top-[-20px] left-[0px] w-[40px] h-[40px] rounded-full bg-transparent transition-all duration-300 ${
                isNightMode
                  ? "shadow-[0_0_0_20px_rgba(38,38,38,0.5)]"
                  : "shadow-[0_0_0_20px_#f1f5f9]"
              }`} />
            </div>
          </div>

          {/* Folder Body */}
          <div className={`w-full rounded-b-[20px] rounded-tr-[20px] p-6 pt-4 -mt-px relative z-10 transition-all duration-300 ${
            isNightMode
              ? "bg-neutral-800/50 text-neutral-50"
              : "bg-slate-100 text-slate-900"
          }`}>
            {/* Header / Bar con Selector Agrupar Por */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10 mb-4 w-full">
              <div className="flex items-center gap-2">
                <Layers className={`w-4 h-4 ${isNightMode ? 'text-amber-400' : 'text-amber-600'}`} />
                <span className={`text-xs font-bold uppercase tracking-wider ${isNightMode ? 'text-neutral-300' : 'text-slate-700'}`}>
                  Tarjetas de tareas
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold ${isNightMode ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-800'}`}>
                  {tasks.length} {tasks.length === 1 ? 'tarea' : 'tareas'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 opacity-60" />
                <span className="text-xs font-semibold opacity-70">Agrupar por:</span>
                <select
                  value={agruparPor}
                  onChange={(e) => {
                    playSound('click');
                    setAgruparPor(e.target.value as any);
                  }}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border outline-none cursor-pointer transition-all ${
                    isNightMode 
                      ? "bg-neutral-900 border-neutral-700 text-neutral-100 hover:border-amber-500/50" 
                      : "bg-white border-slate-300 text-slate-900 hover:border-amber-500 shadow-sm"
                  }`}
                >
                  <option value="status">Estado</option>
                  <option value="formato">Formato</option>
                  <option value="fecha">Fecha</option>
                  <option value="ninguno">Sin agrupación</option>
                </select>
              </div>
            </div>

            {/* Contenedor de Secciones Agrupadas */}
            <div className="flex flex-col gap-6 w-full">
              {tasks.length === 0 && !isCreatingInlineTask && (
                <div className={`p-8 rounded-xl border border-dashed text-center text-sm font-medium ${isNightMode ? 'border-neutral-800 text-neutral-400' : 'border-slate-300 text-slate-500'}`}>
                  No hay tareas creadas en este proyecto todavía.
                </div>
              )}

              {groupedSections.map((section) => {
                if (section.tasks.length === 0 && agruparPor !== "ninguno" && section.id !== "status-planificado" && section.id !== "all-tasks") {
                  return null;
                }

                const isCollapsed = Boolean(collapsedSections[section.id]);

                return (
                  <div key={section.id} className="flex flex-col gap-3 w-full">
                    {/* Encabezado de Sección */}
                    <button
                      type="button"
                      onClick={() => toggleSectionCollapse(section.id)}
                      className={`flex items-center justify-between p-2.5 px-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                        isNightMode
                          ? "bg-neutral-900/60 hover:bg-neutral-900 border-neutral-800/80 text-white"
                          : "bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-sm"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                        <span className="text-sm font-bold tracking-tight">{section.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${section.badgeBg}`}>
                          {section.tasks.length}
                        </span>
                      </div>
                    </button>

                    {/* Contenido Grid de Tarjetas */}
                    {!isCollapsed && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 w-full pt-1">
                        <AnimatePresence>
                          {section.tasks.map((task) => {
                            const cardTaskId = `kt-${project?.id || 'p'}-${task.id}`;
                            return (
                              <motion.div
                                key={task.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="w-full h-full min-h-[170px]"
                              >
                                <TaskCardContent
                                  taskId={cardTaskId}
                                  projectId={project?.id || 0}
                                  onSelectProject={onSelectProject}
                                  projectName={project?.title || ""}
                                  taskTitle={task.title}
                                  completedTasks={tasks.filter(t => t.status === "Completado").length}
                                  totalTasks={tasks.length}
                                  desc={task.desc}
                                  expandedCardId={expandedCardId}
                                  setExpandedCardId={setExpandedCardId}
                                  projects={project ? [project] : []}
                                  setProjects={(updater: any) => {
                                    if (!project || !onUpdateTasks) return;
                                    const nextProjects = typeof updater === "function" ? updater([project]) : updater;
                                    const updatedProj = nextProjects.find((p: any) => String(p.id) === String(project.id));
                                    if (updatedProj && updatedProj.tasks) {
                                      onUpdateTasks(project.id, updatedProj.tasks);
                                    }
                                  }}
                                  colorConfig={colorConfig}
                                  getStatusPillConfig={getStatusPillConfig}
                                  getFormatPillConfig={getFormatPillConfig}
                                  updateTaskProperty={updateTaskProperty}
                                  activeStatusDropdownCardId={activeStatusDropdownCardId}
                                  setActiveStatusDropdownCardId={setActiveStatusDropdownCardId}
                                  activeFormatDropdownCardId={activeFormatDropdownCardId}
                                  setActiveFormatDropdownCardId={setActiveFormatDropdownCardId}
                                  activeTimeDropdownCardId={activeTimeDropdownCardId}
                                  setActiveTimeDropdownCardId={setActiveTimeDropdownCardId}
                                  activeColorSelectorCardId={activeColorSelectorCardId}
                                  setActiveColorSelectorCardId={setActiveColorSelectorCardId}
                                  activeCardMenuId={activeCardMenuId}
                                  setActiveCardMenuId={setActiveCardMenuId}
                                  hoveredStatusOptionCard={hoveredStatusOptionCard}
                                  setHoveredStatusOptionCard={setHoveredStatusOptionCard}
                                  hoveredFormatOptionCard={hoveredFormatOptionCard}
                                  setHoveredFormatOptionCard={setHoveredFormatOptionCard}
                                  availableFormats={["Portada", "Flyer", "Video", "Copywriting", "Branding"]}
                                  editingTaskField={editingTaskField}
                                  setEditingTaskField={setEditingTaskField}
                                  editingValue={editingValue}
                                  setEditingValue={setEditingValue}
                                  saveEditing={saveEditing}
                                  isNightMode={isNightMode}
                                  isHomeEditMode={false}
                                  setDeleteModalConfig={setDeleteModalConfig}
                                  getCalendarDaysDiff={getCalendarDaysDiff}
                                  formatLocalDate={formatLocalDate}
                                />
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>

                        {/* Botón Ghost de Nueva Tarea en el primer grupo */}
                        {section.id === groupedSections[0]?.id && !isCreatingInlineTask && (
                          <button
                            type="button"
                            onClick={() => {
                              playSound('click');
                              setIsCreatingInlineTask(true);
                              setInlineTaskTitle("");
                              setInlineTaskTime("30 min");
                              setInlineTaskFormatoKey(null);
                              setInlineTaskFormatoName("");
                            }}
                            className={`w-full min-h-[170px] rounded-xl border border-dashed p-4 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group ${
                              isNightMode
                                ? 'border-neutral-700/80 hover:border-amber-400/60 bg-neutral-900/30 hover:bg-neutral-900/60 text-neutral-400 hover:text-neutral-100'
                                : 'border-slate-300 hover:border-amber-500 bg-white/50 hover:bg-white text-slate-600 hover:text-slate-900 shadow-xs'
                            }`}
                          >
                            <Plus className="w-5 h-5 opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all text-amber-400" />
                            <span className="text-xs font-bold">+ Nueva tarea</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Formulario Inline de Nueva Tarea */}
              {isCreatingInlineTask && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className={`w-full rounded-xl border p-4 flex flex-col gap-3 backdrop-blur-md shadow-xl transition-all ${
                    isNightMode
                      ? "bg-neutral-900/95 border-amber-500/40 text-neutral-100"
                      : "bg-white border-amber-500/50 text-slate-900 shadow-lg"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Nombre de la tarea (obligatorio)"
                      value={inlineTaskTitle}
                      onChange={(e) => setInlineTaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleConfirmInlineTask();
                        if (e.key === "Escape") handleCancelInlineTask();
                      }}
                      className={`flex-1 border rounded-lg px-3.5 py-2 text-sm font-bold focus:outline-none focus:border-amber-400 ${
                        isNightMode
                          ? "bg-neutral-950 border-neutral-700 text-white placeholder-neutral-500"
                          : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
                      }`}
                    />
                    <input
                      type="text"
                      placeholder="30 min"
                      value={inlineTaskTime}
                      onChange={(e) => setInlineTaskTime(e.target.value)}
                      className={`w-28 border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-amber-400 ${
                        isNightMode
                          ? "bg-neutral-950 border-neutral-700 text-white placeholder-neutral-500"
                          : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
                      }`}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 mr-1">Formato:</span>
                    {Object.values(FORMATOS_ESTANDAR).map((fmt) => {
                      const isSelected = inlineTaskFormatoKey === fmt.key;
                      return (
                        <button
                          key={fmt.key}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setInlineTaskFormatoKey(null);
                              setInlineTaskFormatoName("");
                            } else {
                              setInlineTaskFormatoKey(fmt.key);
                              setInlineTaskFormatoName(fmt.nombre);
                            }
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-amber-400 text-slate-950 border-amber-300 font-bold shadow-md"
                              : isNightMode
                              ? "bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:bg-neutral-700 hover:text-white"
                              : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
                          }`}
                        >
                          <FormatoShape formatoObj={fmt} size="sm" />
                          <span>{fmt.nombre}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={handleCancelInlineTask}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium opacity-70 hover:opacity-100 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmInlineTask}
                      disabled={!inlineTaskTitle.trim()}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow ${
                        inlineTaskTitle.trim()
                          ? "bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer"
                          : "bg-neutral-700 text-neutral-400 cursor-not-allowed opacity-50"
                      }`}
                    >
                      Guardar Tarea
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
        
      </div> {/* Fin del Folder Body */}

      {/* Delete Confirmation Modal */}
      {deleteModalConfig && (
        <DeleteConfirmModal
          isOpen={Boolean(deleteModalConfig?.isOpen)}
          isNightMode={isNightMode}
          config={deleteModalConfig}
          onClose={() => setDeleteModalConfig(null)}
          onConfirmTaskDelete={async (projId, tId) => {
            if (!project) return;
            const taskIdStr = String(tId);
            try {
              await deleteDoc(doc(db, "tasks", taskIdStr));
            } catch (err) {
              console.error("Error deleting task from Firestore tasks collection:", err);
            }
            const updated = (tasks || []).filter((t) => String(t.id) !== taskIdStr);
            if (onUpdateTasks) {
              onUpdateTasks(project.id, updated);
            }
            setTasks(updated);
            setDeleteModalConfig(null);
            playSound('trash');
          }}
        />
      )}
    </motion.div>

      </motion.div>
    </AnimatePresence>
  );
}

const InlineEditable = ({ 
  value, 
  onSave, 
  className,
  placeholder = "Escribir...",
  options
}: { 
  value: string; 
  onSave: (val: string) => void; 
  className?: string;
  placeholder?: string;
  options?: string[];
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    if (tempValue.trim() !== value) {
      onSave(tempValue.trim() || placeholder);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setTempValue(value);
    }
  };

  if (options) {
    return (
      <select 
        value={value} 
        onChange={(e) => {
          onSave(e.target.value);
          playSound('click');
        }}
        onClick={(e) => e.stopPropagation()}
        className={`bg-transparent appearance-none cursor-pointer outline-none transition-colors border-b border-dashed border-transparent hover:border-white/40 ${className}`}
      >
        {options.map(opt => <option key={opt} value={opt} className="bg-[#111] text-white/90">{opt}</option>)}
      </select>
    );
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={`bg-black/20 border border-white/20 rounded px-1 outline-none backdrop-blur-md focus:border-white/50 transition-colors ${className}`}
        style={{ width: `${Math.max(tempValue.length, placeholder.length) + 1}ch` }}
      />
    );
  }

  return (
    <span 
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
        playSound('pop');
      }}
      className={`cursor-pointer hover:opacity-80 transition-opacity border-b border-dashed border-transparent hover:border-white/40 ${className}`}
    >
      {value || placeholder}
    </span>
  );
};

// ProjectStatusSelector pill dropdown menu
const ProjectStatusSelector = ({
  status,
  isNeumorphic,
  onSelect
}: {
  status: string;
  isNeumorphic: boolean;
  onSelect: (newStatus: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const options = ["Activo", "Revisión", "Completado", "Pausado"];
  const selectedIndex = options.includes(status) ? options.indexOf(status) : 0;
  const itemH = 30;

  const getStyle = (opt: string) => {
    switch (opt) {
      case "Activo":
        return isNeumorphic
          ? "bg-violet-100 text-violet-700 border-violet-200"
          : "bg-violet-500/10 text-violet-400 border-violet-500/30";
      case "Revisión":
        return isNeumorphic
          ? "bg-amber-100 text-amber-700 border-amber-200"
          : "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "Completado":
        return isNeumorphic
          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "Pausado":
        return isNeumorphic
          ? "bg-rose-100 text-rose-700 border-rose-200"
          : "bg-rose-500/10 text-rose-400 border-rose-500/30";
      default:
        return isNeumorphic
          ? "bg-slate-100 text-slate-700 border-slate-200"
          : "bg-white/10 text-white/70 border-white/20";
    }
  };

  const totalH = options.length * itemH + 8;
  const offsetTop = selectedIndex * itemH + 4;

  return (
    <div
      ref={containerRef}
      className="relative select-none z-50"
      style={{ width: 112, height: itemH }}
    >
      <div
        className="absolute left-0"
        style={{
          width: 112,
          height: isOpen ? totalH : itemH,
          top: isOpen ? -offsetTop : 0,
          borderRadius: isOpen ? 14 : 999,
          overflow: 'hidden',
          transition: 'height 280ms cubic-bezier(0.25, 0.8, 0.25, 1), top 280ms cubic-bezier(0.25, 0.8, 0.25, 1), border-radius 200ms ease',
        }}
      >
        {/* Background panel */}
        <div
          className="absolute inset-0"
          style={{
            borderRadius: isOpen ? 14 : 999,
            opacity: isOpen ? 1 : 0,
            transition: 'opacity 200ms ease, border-radius 200ms ease, box-shadow 300ms ease',
            background: isNeumorphic ? '#e2eaf5' : 'rgba(20, 20, 22, 0.95)',
            backdropFilter: isNeumorphic ? 'none' : 'blur(20px)',
            boxShadow: isOpen
              ? isNeumorphic
                ? '4px 4px 12px #b8c4d9, -4px -4px 12px #ffffff, inset 0 0 0 1px rgba(255,255,255,0.25)'
                : '0 12px 40px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.06)'
              : 'none',
          }}
        />

        {/* Options column */}
        <div
          className="relative flex flex-col"
          style={{
            paddingTop: isOpen ? 4 : 0,
            paddingBottom: isOpen ? 4 : 0,
            transform: isOpen ? 'translateY(0)' : `translateY(-${selectedIndex * itemH}px)`,
            transition: 'transform 280ms cubic-bezier(0.25, 0.8, 0.25, 1), padding 280ms cubic-bezier(0.25, 0.8, 0.25, 1)',
          }}
        >
          {options.map((opt, i) => {
            const isSel = i === selectedIndex;
            const style = getStyle(opt);

            return (
              <div
                key={opt}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isOpen) {
                    setIsOpen(true);
                    playSound('click');
                  } else {
                    onSelect(opt);
                    setIsOpen(false);
                    playSound('pop');
                  }
                }}
                className="flex items-center justify-center cursor-pointer"
                style={{
                  height: itemH,
                  opacity: !isOpen ? (isSel ? 1 : 0) : isSel ? 1 : 0.7,
                  transform: !isOpen && !isSel ? 'scale(0.92)' : 'scale(1)',
                  pointerEvents: !isOpen && !isSel ? 'none' : 'auto',
                  transition: `opacity ${isOpen ? 180 + i * 40 : 150}ms ease, transform 250ms ease`,
                }}
              >
                <div
                  className={`mx-2 px-3 py-1 rounded-full text-center truncate leading-none text-[10px] font-bold uppercase tracking-[0.08em] ${
                    isSel
                      ? `${style} border`
                      : isOpen
                        ? isNeumorphic
                          ? "border-transparent text-slate-500 hover:text-slate-800 hover:bg-white/30"
                          : "border-transparent text-white/45 hover:text-white/80 hover:bg-white/5"
                        : `${style} border`
                  }`}
                  style={{ transition: 'all 200ms ease' }}
                >
                  {opt}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

