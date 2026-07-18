"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Variants, useMotionValue, useSpring } from 'framer-motion';
import { playSound } from '../utils/audio';
import { getDynamicProgress } from '../utils/data';
import DateRangePicker from './DateRangePicker';
import Image from 'next/image';
import { Calendar, DollarSign, Clock, Flag, ClipboardList, TrendingUp, Users, Plus, Trash2 } from 'lucide-react';

export interface Task {
  id: number;
  title: string;
  desc: string;
  format: string;
  time: string;
  status: 'Pendiente' | 'En Proceso' | 'Completado';
  statusColor: string;
  attachmentUrl?: string;
  subtasks: { id: number; text: string; done: boolean }[];
  sessions?: { id: number; date: string; hours: number }[];
  deadline?: string;
  fecha_programada?: string;
  fecha_limite?: string;
  fecha_creacion?: string;
  kanbanOrders?: Record<string, number>;
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
  briefCore?: string;
  priority?: string;
  cost?: string;
  tasks?: Task[];
  customColor?: { h: number; s: number; l: number };
  customGradientStyle?: string;
  customGlowStyle?: string;
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
  isNeumorphic?: boolean;
  isNightMode?: boolean;
}

const MONTHS_SPANISH = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const FULL_MONTH_NAMES = {
  'ene': 'enero', 'feb': 'febrero', 'mar': 'marzo', 'abr': 'abril', 'may': 'mayo', 'jun': 'junio',
  'jul': 'julio', 'ago': 'agosto', 'sep': 'septiembre', 'oct': 'octubre', 'nov': 'noviembre', 'dic': 'diciembre'
};
const WEEKDAYS_SPANISH = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

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
  isNeumorphic = false,
  isNightMode = false
}: ProjectDashboardProps) {
  const projectStatusGlow = getGlowFromStatusColor(project?.statusColor);
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [editedTitle, setEditedTitle] = React.useState(project?.title || "");
  const [originalTitle, setOriginalTitle] = React.useState("");

  const [isEditingDesc, setIsEditingDesc] = React.useState(false);
  const [editedDesc, setEditedDesc] = React.useState(project?.briefCore || "");
  const [originalDesc, setOriginalDesc] = React.useState("");

  const tasks = project?.tasks || [];
  const setTasks = (updater: React.SetStateAction<Task[]>) => {
    if (!project || !onUpdateTasks) return;
    const nextTasks = typeof updater === 'function' ? updater(tasks) : updater;
    onUpdateTasks(project.id, nextTasks);
  };

  const [expandedTaskIds, setExpandedTaskIds] = useState<number[]>([]);

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
      let nextStatus: 'Pendiente' | 'En Proceso' | 'Completado';
      let nextColor: string;
      if (t.status === 'Pendiente') {
        nextStatus = 'En Proceso';
        nextColor = "bg-orange-500/10 border-orange-500/30 text-orange-400";
      } else if (t.status === 'En Proceso') {
        nextStatus = 'Completado';
        nextColor = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
      } else {
        nextStatus = 'Pendiente';
        nextColor = "bg-white/5 border border-white/10 text-white/60";
      }
      return { ...t, status: nextStatus, statusColor: nextColor };
    }));
  };

  const handleAttachmentToggle = (taskId: number) => {
    if (!onUpdateTasks || !project) return;
    const newTasks = tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, attachmentUrl: t.attachmentUrl ? undefined : "/TASKI%20ICON.png" };
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
    const newTask: Task = {
      id: Date.now(),
      title: "Nueva Tarea",
      desc: "Descripción de la tarea...",
      format: "Formato",
      time: "0H",
      status: "Pendiente",
      statusColor: "bg-white",
      subtasks: [],
      fecha_creacion
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
      status: "Pendiente" as const,
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
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onAnimationStart={() => playSound('whoosh')}
        className="absolute top-0 left-[508px] right-[40px] bottom-0 z-auto p-8 pt-[140px] pointer-events-auto"
      >
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
                <Calendar className={`w-3.5 h-3.5 flex-shrink-0 ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`} strokeWidth={2} />
                <span className={`text-[13px] font-bold leading-none ${isNightMode ? 'text-slate-400' : 'text-slate-600'}`}>Termina en</span>
                <InlineEditable 
                  value={project.daysRemaining || "2 Días"} 
                  onSave={(val) => onUpdateDaysRemaining && onUpdateDaysRemaining(project.id, val)}
                  className={`text-[13px] font-black inline-block leading-none ${isNightMode ? 'text-slate-50' : 'text-slate-900'}`} 
                />
                {project.deadline && project.deadline !== '-' && (
                  <span className={`text-[13px] font-medium leading-none ml-0.5 ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`}>
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
              <DollarSign className={`w-3.5 h-3.5 flex-shrink-0 ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`} strokeWidth={2} />
              <span className={`text-[13px] font-bold leading-none ${isNightMode ? 'text-slate-400' : 'text-slate-600'}`}>Costo:</span>
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
              <Clock className={`w-3.5 h-3.5 flex-shrink-0 ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`} strokeWidth={2} />
              <span className={`text-[13px] font-bold leading-none ${isNightMode ? 'text-slate-400' : 'text-slate-600'}`}>Tiempo:</span>
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
              <Flag className={`w-3.5 h-3.5 flex-shrink-0 ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`} strokeWidth={2} />
              <span className={`text-[13px] font-bold leading-none ${isNightMode ? 'text-slate-400' : 'text-slate-600'}`}>Prioridad:</span>
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
              <ClipboardList className={`w-3.5 h-3.5 flex-shrink-0 ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`} strokeWidth={2} />
              <span className={`text-[13px] font-bold leading-none ${isNightMode ? 'text-slate-400' : 'text-slate-600'}`}>Tareas:</span>
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
              <TrendingUp className={`w-3.5 h-3.5 flex-shrink-0 ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`} strokeWidth={2} />
              <span className={`text-[13px] font-bold leading-none ${isNightMode ? 'text-slate-400' : 'text-slate-600'}`}>Avance:</span>
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
            
            {/* Sección de Tareas / Tarjetas Inferiores */}
            <div className="flex items-start gap-6 pt-4 pb-6 overflow-x-auto w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] mask-linear-right pr-12">
          <AnimatePresence>
          {tasks.map((task) => {
            const isExpanded = true;
            const taskGlow = getGlowFromStatusColor(task.statusColor);
            return (
              <motion.div 
                layout
                key={task.id}
                variants={itemVariants} 
                whileHover={{ scale: 1.01 }}
                exit={{ opacity: 0, y: 30, scale: 0.9, filter: "blur(5px)", width: 0, paddingLeft: 0, paddingRight: 0, marginLeft: -24, overflow: "hidden", transition: { duration: 0.3 } }}
                onClick={() => { playSound('task-click'); if (onSelectTask) onSelectTask(task.id); }}
                className={`rounded-2xl p-4 flex flex-col shrink-0 select-none cursor-pointer transition-all duration-200 relative w-[340px] h-[320px] group/card border ${
                  isNightMode
                    ? "bg-neutral-900 border-neutral-800 text-neutral-50 shadow-sm"
                    : "bg-slate-50 border-slate-200 text-slate-900 shadow-sm"
                }`}
              >
                {/* Radial Glow (Clipped to card shape) */}
                {!isNeumorphic && (
                  <div className="absolute inset-0 rounded-[24px] overflow-hidden pointer-events-none">
                    <div className={`absolute -top-8 -left-8 w-28 h-28 ${taskGlow} ${task.status === 'Pendiente' ? 'opacity-[0.15]' : 'opacity-[0.60]'} rounded-full blur-[25px] transition-all duration-500`} />
                  </div>
                )}
                
                {/* Delete Button (appears on hover) */}
                <div 
                  onClick={(e) => handleDeleteTask(task.id, e)}
                  className={`absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all duration-300 cursor-pointer shadow-xl z-50 ${
                    isNeumorphic
                      ? "bg-[#e6eef8] border border-white/40 shadow-[2px_2px_4px_#b8c4d9,-2px_-2px_4px_#ffffff]"
                      : "bg-[#1c1c1e] border border-white/10 hover:border-white/30 hover:bg-[#2c2c2e]"
                  }`}
                  title="Eliminar tarea"
                >
                  <svg className={`w-3 h-3 transition-colors ${isNeumorphic ? 'text-slate-500 hover:text-slate-800' : 'text-white/50 hover:text-white/90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>

                {/* Upper part: Image square + Text */}
                <div className="flex gap-3 w-full items-start pr-6">
                  {/* Image box placeholder with "+" */}
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAttachmentToggle(task.id);
                    }}
                    className={`w-16 h-16 rounded-[20px] flex items-center justify-center flex-shrink-0 transition-all duration-200 group/upload overflow-hidden relative ${
                      isNeumorphic
                        ? "bg-transparent border border-dashed border-slate-400 hover:border-slate-800"
                        : "bg-white/5 border border-dashed border-white/20 hover:border-white/45 hover:bg-white/10"
                    }`}
                    title={task.attachmentUrl ? "Quitar adjunto" : "Adjuntar imagen"}
                  >
                    {task.attachmentUrl ? (
                      <>
                        <div 
                          className={`absolute inset-0 ${isNeumorphic ? 'bg-slate-200' : 'bg-zinc-800'}`} 
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Image src="/TASKI%20ICON.png" alt="Adjunto" width={22} height={22} className="object-contain opacity-80" />
                        </div>
                        <div className="absolute inset-0 bg-black/70 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity duration-200 z-10">
                          <span className="text-[8px] font-bold text-rose-400 uppercase tracking-widest">Quitar</span>
                        </div>
                      </>
                    ) : (
                      <svg className={`w-4 h-4 transition-colors ${isNeumorphic ? 'text-slate-400 group-hover/upload:text-slate-800' : 'text-white/40 group-hover/upload:text-white/80'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    )}
                  </div>

                  {/* Title & Desc */}
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded border text-[8px] font-extrabold uppercase tracking-widest leading-none flex items-center justify-center ${
                        isNightMode
                          ? "border-neutral-800 bg-neutral-950 text-neutral-300"
                          : "border-slate-200 bg-slate-100 text-slate-700"
                      }`}>
                        <InlineEditable 
                          value={task.format || "Formato"}
                          onSave={(val) => handleUpdateTaskFormat(task.id, val)}
                          className={`inline-block ${isNightMode ? 'hover:text-white text-neutral-300' : 'hover:text-slate-900 text-slate-700'}`}
                        />
                      </span>
                    </div>
                    <h4 className={`font-bold text-[15px] truncate tracking-wide ${isNightMode ? 'text-neutral-50' : 'text-slate-900'}`} title={task.title}>
                      <InlineEditable 
                        value={task.title}
                        onSave={(val) => handleUpdateTaskTitle(task.id, val)}
                        className={`inline-block ${isNightMode ? 'hover:text-white text-neutral-50' : 'hover:text-slate-950 text-slate-900'}`}
                      />
                    </h4>
                    <p className={`text-[12px] mt-1 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'} ${isNightMode ? 'text-neutral-300' : 'text-slate-600'}`}>
                      <InlineEditable 
                        value={task.desc}
                        onSave={(val) => handleUpdateTaskDesc(task.id, val)}
                        className={`inline-block w-full ${isNightMode ? 'hover:text-white text-neutral-300' : 'hover:text-slate-900 text-slate-600'}`}
                      />
                    </p>
                  </div>
                </div>

                {/* Middle part: Subtasks (only when expanded) */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`mt-4 flex flex-col gap-2 min-h-0 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pt-3 border-t ${
                        isNightMode ? 'border-neutral-800' : 'border-slate-200'
                      }`}
                    >
                      <span className={`text-[9px] font-extrabold tracking-widest uppercase mb-1 ${isNightMode ? 'text-neutral-400' : 'text-slate-500'}`}>Subtareas de control</span>
                      <div className="flex flex-col gap-2.5">
                        {task.subtasks && task.subtasks.map((sub) => (
                          <div 
                            key={sub.id} 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSubtask(task.id, sub.id);
                            }}
                            className="flex items-center gap-2 group/sub cursor-pointer select-none"
                          >
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
                              sub.done 
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-500' 
                                : isNightMode
                                  ? 'border-neutral-700 hover:border-neutral-500'
                                  : 'border-slate-300 hover:border-slate-500'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSubtask(task.id, sub.id);
                            }}>
                              {sub.done && (
                                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <span className={`text-[11.5px] transition-colors flex-1 min-w-0 ${
                              sub.done 
                                ? isNightMode ? 'text-neutral-500 line-through' : 'text-slate-400 line-through' 
                                : isNightMode ? 'text-neutral-200 group-hover/sub:text-white font-medium' : 'text-slate-800 group-hover/sub:text-slate-950 font-medium'
                            }`}>
                              <InlineEditable 
                                value={sub.text}
                                onSave={(val) => handleUpdateSubtaskText(task.id, sub.id, val)}
                                className="w-full inline-block truncate"
                              />
                            </span>
                          </div>
                        ))}
                        
                        {/* Add Subtask Button */}
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddSubtask(task.id);
                          }}
                          className="flex items-center gap-2 mt-1 cursor-pointer group/add w-fit"
                        >
                          <div className={`w-3.5 h-3.5 rounded border border-dashed flex items-center justify-center transition-all flex-shrink-0 ${
                            isNightMode
                              ? "border-neutral-700 text-neutral-400 group-hover/add:text-neutral-200 group-hover/add:border-neutral-500"
                              : "border-slate-300 text-slate-500 group-hover/add:text-slate-900 group-hover/add:border-slate-500"
                          }`}>
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </div>
                          <span className={`text-[10px] font-extrabold uppercase tracking-widest transition-colors ${
                            isNightMode ? "text-neutral-400 group-hover/add:text-neutral-200" : "text-slate-500 group-hover/add:text-slate-900"
                          }`}>
                            Añadir Subtarea
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Bottom part: Properties (Format, Time, Status) */}
                <div className={`mt-auto pt-2 flex items-center justify-between w-full uppercase ${
                  isNightMode 
                    ? "border-t border-neutral-800 text-neutral-300" 
                    : "border-t border-slate-200 text-slate-700"
                }`}>
                  {/* Formato */}
                  <div className="flex flex-col">
                    <span className={`text-[9px] font-extrabold tracking-wider mb-0.5 ${isNightMode ? 'text-neutral-400' : 'text-slate-500'}`}>Formato</span>
                    <span className={`text-[11.5px] font-bold lowercase tracking-wide first-letter:uppercase ${isNightMode ? 'text-neutral-100' : 'text-slate-900'}`}>{task.format}</span>
                  </div>

                  <div className={`w-px h-6 ${isNightMode ? 'bg-neutral-800' : 'bg-slate-200'}`} />

                  {/* Tiempo */}
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleTimer(task);
                    }}
                    className={`flex flex-col cursor-pointer group/timer p-1 px-2 rounded-lg transition-all ${
                      activeTimerTaskId === task.id
                        ? "bg-red-500/10 border border-red-500/20"
                        : isNightMode ? "hover:bg-neutral-800" : "hover:bg-slate-100"
                    }`}
                  >
                    <span className={`text-[9px] font-extrabold tracking-wider mb-0.5 flex items-center gap-1 leading-none ${
                      activeTimerTaskId === task.id 
                        ? 'text-red-400 font-bold' 
                        : isNightMode ? 'text-neutral-400' : 'text-slate-500'
                    }`}>
                      {activeTimerTaskId === task.id ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                          Grabando
                        </>
                      ) : (
                        "Tiempo"
                      )}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5 leading-none">
                      <span className={`text-[11.5px] font-bold tracking-wide ${
                        activeTimerTaskId === task.id
                          ? 'text-red-400 font-bold'
                          : isNightMode ? 'text-neutral-100' : 'text-slate-900'
                      }`}>
                        {activeTimerTaskId === task.id 
                          ? formatTimer(timerSeconds)
                          : task.time
                        }
                      </span>
                      {activeTimerTaskId === task.id ? (
                        <svg className="w-2.5 h-2.5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                          <rect x="6" y="4" width="4" height="16" rx="1" />
                          <rect x="14" y="4" width="4" height="16" rx="1" />
                        </svg>
                      ) : (
                        <svg className="w-2.5 h-2.5 text-emerald-400 opacity-0 group-hover/timer:opacity-100 transition-opacity flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </div>
                  </div>

                  <div className={`w-px h-6 ${isNightMode ? 'bg-neutral-800' : 'bg-slate-200'}`} />

                  {/* Estado */}
                  <div className="flex flex-col items-end">
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTaskStatus(task.id);
                      }}
                      className={`w-[100px] py-1.5 rounded-full border text-[11px] font-bold capitalize tracking-wide leading-none flex items-center justify-center cursor-pointer ${
                        task.status === 'Completado' ? 'bg-emerald-600 text-white border-transparent' :
                        task.status === 'En Proceso' ? 'bg-amber-600 text-white border-transparent' :
                        isNightMode 
                          ? 'bg-neutral-800 border-neutral-700/80 text-neutral-300' 
                          : 'bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
          </AnimatePresence>

          {/* Tarjeta de Agregar Tarea (+) */}
          <motion.div 
            variants={itemVariants} 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAddTask}
            className={`w-[340px] h-[320px] rounded-2xl border border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group shrink-0 ${
              isNightMode
                ? 'border-neutral-800 bg-neutral-900/50 hover:bg-neutral-900 hover:border-neutral-700 text-neutral-400 hover:text-neutral-100'
                : 'border-slate-300 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-400 text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors border ${
              isNightMode 
                ? 'bg-neutral-950 border-neutral-800 text-neutral-400 group-hover:text-neutral-100' 
                : 'bg-white border-slate-200 text-slate-500 group-hover:text-slate-900 shadow-sm'
            }`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className={`text-[11px] font-bold uppercase tracking-widest mt-3 transition-colors ${
              isNeumorphic ? 'text-slate-500 group-hover:text-slate-800' : 'text-white/30 group-hover:text-white/60'
            }`}>Crear Tarea</span>
          </motion.div>
        </div>
        
      </div> {/* Fin del Folder Body */}
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

