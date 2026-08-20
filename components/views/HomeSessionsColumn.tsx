"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSessions, useRecentSessions, useTrashSessions } from "@/hooks/useSessions";
import { useData } from "@/hooks/useData";
import { 
  Clock, 
  Play, 
  Square, 
  Plus, 
  Bot, 
  User, 
  ShieldCheck, 
  Search, 
  Check, 
  MoreHorizontal, 
  CheckSquare, 
  Trash2, 
  RotateCcw, 
  X, 
  Inbox, 
  AlertTriangle 
} from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { SessionDoc, SessionOrigin } from "@/lib/types";
import { CARD_COLOR_KEYS, getCardColorTheme, getSingleSourceProjectColor, parseTimeToHours } from "@/lib/utils";
import FormatoShape from "@/app/taski/components/FormatoShape";
import { playSound } from "@/app/taski/utils/audio";

function getOriginBadge(origin: SessionOrigin) {
  switch (origin) {
    case "agent_self":
      return { label: "Agente Self", icon: <Bot className="w-3 h-3 text-purple-400" /> };
    case "agent_research":
      return { label: "Agente Research", icon: <Search className="w-3 h-3 text-cyan-400" /> };
    case "agent_qa_visual":
      return { label: "Agente QA", icon: <ShieldCheck className="w-3 h-3 text-emerald-400" /> };
    default:
      return { label: "Manual", icon: <User className="w-3 h-3 text-blue-400" /> };
  }
}

function getLastSessionText(taskSessions: SessionDoc[]): string | null {
  if (!taskSessions || taskSessions.length === 0) return null;
  let latestTime: number = 0;
  for (const s of taskSessions) {
    let raw = s.endTime || s.updatedAt || s.updated_at;
    if (!raw && s.startTime && s.durationMins > 0) {
      const startMs = s.startTime.toMillis ? s.startTime.toMillis() : new Date(s.startTime).getTime();
      if (!isNaN(startMs)) {
        const endMs = startMs + s.durationMins * 60 * 1000;
        if (endMs > latestTime) latestTime = endMs;
        continue;
      }
    }
    if (!raw) raw = s.startTime;
    if (!raw) continue;
    const ms = raw.toMillis ? raw.toMillis() : new Date(raw).getTime();
    if (!isNaN(ms) && ms > latestTime) {
      latestTime = ms;
    }
  }
  if (latestTime === 0) return null;

  const diffMins = Math.max(0, Math.floor((Date.now() - latestTime) / 60000));
  if (diffMins < 60) {
    return `Última sesión hace ${diffMins}m`;
  } else {
    const diffHours = Math.floor(diffMins / 60);
    return `Última sesión hace ${diffHours}h`;
  }
}

function getSessionEndRelativeTime(s: SessionDoc): string {
  if (s.status === "en_curso" || (!s.endTime && s.durationMins === 0)) {
    return "En curso";
  }

  let endMs: number | null = null;
  const endTimestamp = s.endTime || s.updatedAt || s.updated_at;
  if (endTimestamp) {
    endMs = endTimestamp.toMillis ? endTimestamp.toMillis() : new Date(endTimestamp).getTime();
  }

  // Si no hay endTime pero hay startTime y durationMins, calculamos: startTime + durationMins
  if ((!endMs || isNaN(endMs)) && s.startTime && s.durationMins > 0) {
    const startMs = s.startTime.toMillis ? s.startTime.toMillis() : new Date(s.startTime).getTime();
    if (!isNaN(startMs)) {
      endMs = startMs + s.durationMins * 60 * 1000;
    }
  }

  if (!endMs || isNaN(endMs)) {
    const fallback = s.createdAt || s.created || s.startTime;
    if (fallback) {
      endMs = fallback.toMillis ? fallback.toMillis() : new Date(fallback).getTime();
    }
  }

  if (!endMs || isNaN(endMs)) return "Recientemente";

  const diffMins = Math.max(0, Math.floor((Date.now() - endMs) / 60000));

  if (diffMins <= 0) return "Hace un momento";
  if (diffMins < 60) return `Hace ${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Hace ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `Hace ${diffDays}d`;
}

function getDateGroupTitle(timestamp: any): string {
  if (!timestamp) return "Anteriores";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Hoy";
  if (date.toDateString() === yesterday.toDateString()) return "Ayer";

  return date.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
}

export function getProjectBgColor(project: any, task?: any): string {
  if (project) {
    return getSingleSourceProjectColor(project).hslCss;
  }
  if (task) {
    return getSingleSourceProjectColor(task).hslCss;
  }
  return "hsl(217, 91%, 60%)";
}

function getCreatedText(t: any): string {
  let createdDate: Date | null = null;
  const rawCreated = t.fecha_creacion || t.createdAt || t.created_at;

  if (rawCreated) {
    if (typeof rawCreated === "string") {
      createdDate = new Date(rawCreated.includes("T") ? rawCreated : rawCreated + "T00:00:00");
    } else if (rawCreated.toDate) {
      createdDate = rawCreated.toDate();
    } else if (typeof rawCreated === "number") {
      createdDate = new Date(rawCreated);
    }
  }

  if (!createdDate || isNaN(createdDate.getTime())) {
    return "Creada hoy";
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const cDay = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
  const diffDays = Math.round((today.getTime() - cDay.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Creada hoy";
  if (diffDays === 1) return "Creada hace 1 día";
  return `Creada hace ${diffDays} días`;
}

function getDueText(t: any): { text: string; isOverdue: boolean } {
  let dueDateObj: Date | null = null;

  if (t.dueDate instanceof Date) {
    dueDateObj = t.dueDate;
  } else {
    const rawDue = t.dueDate || t.fecha_limite || t.deadline || t.fecha_programada;
    if (rawDue) {
      if (typeof rawDue === "string") {
        dueDateObj = new Date(rawDue.includes("T") ? rawDue : rawDue + "T00:00:00");
      } else if (rawDue.toDate) {
        dueDateObj = rawDue.toDate();
      } else if (typeof rawDue === "number") {
        dueDateObj = new Date(rawDue);
      }
    }
  }

  if (!dueDateObj || isNaN(dueDateObj.getTime())) {
    return { text: "Entrega: Hoy", isOverdue: false };
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(dueDateObj.getFullYear(), dueDateObj.getMonth(), dueDateObj.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      text: overdueDays === 1 ? "Atraso de 1 día" : `Atraso de ${overdueDays} días`,
      isOverdue: true,
    };
  } else if (diffDays === 0) {
    return { text: "Entrega: Hoy", isOverdue: false };
  } else if (diffDays === 1) {
    return { text: "Entrega: Mañana", isOverdue: false };
  } else {
    return { text: `Entrega en ${diffDays} días`, isOverdue: false };
  }
}

interface HomeSessionsColumnProps {
  todayTasks?: any[];
  allTasks?: any[];
  projects?: any[];
  isNightMode?: boolean;
  onUpdateTaskStatus?: (projectId: string | number, taskId: string | number, status: string) => void;
}

export function HomeSessionsColumn({ todayTasks: externalTodayTasks, allTasks, projects, isNightMode = true, onUpdateTaskStatus }: HomeSessionsColumnProps) {
  const { sessions, isLoading, refetch } = useRecentSessions(100);
  const { activeSession, startSession, endSession, softDeleteSessions } = useSessions();
  const { trashSessions, trashCount, restoreSessions: restoreTrashSessions, permanentDeleteSessions, emptyTrash } = useTrashSessions();
  const { data } = useData();
  const [isMounted, setIsMounted] = useState(false);
  const [activeElapsedSecs, setActiveElapsedSecs] = useState<number>(0);

  // Estados para selección múltiple y papelera
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Cerrar menú contextual al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setIsHeaderMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Contador de tiempo en vivo segundo a segundo cuando hay una sesión activa
  useEffect(() => {
    if (!activeSession?.startTime) {
      setActiveElapsedSecs(0);
      return;
    }

    const startMs = activeSession.startTime.toMillis
      ? activeSession.startTime.toMillis()
      : new Date(activeSession.startTime).getTime();

    const update = () => {
      const secs = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      setActiveElapsedSecs(secs);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const formatRunningTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const { projectMap, clientMap, taskMap, internalTodayTasks } = useMemo(() => {
    const pMap = new Map<string, any>();
    const cMap = new Map<string, any>();
    const tMap = new Map<string, any>();
    const tList: any[] = [];

    if (projects && projects.length > 0) {
      projects.forEach((p) => {
        const idStr = String(p.id);
        pMap.set(idStr, p);
        if (p.title) pMap.set(p.title.toLowerCase().trim(), p);
        if (p.nombre) pMap.set(p.nombre.toLowerCase().trim(), p);
      });
    }

    if (data) {
      data.clientes.forEach((c) => cMap.set(String(c.id), c.nombre));
      data.proyectos.forEach((p) => {
        const idStr = String(p.id);
        if (!pMap.has(idStr)) {
          pMap.set(idStr, p);
        }
      });
      data.tareas.forEach((t) => {
        tMap.set(String(t.id), t);
        if (t.estado !== "Completado") {
          tList.push(t);
        }
      });
    }

    const tasksToMap = allTasks || externalTodayTasks;
    if (tasksToMap) {
      tasksToMap.forEach((st: any) => {
        const rawId = String(st.id);
        const taskNumId = rawId.includes("kt-") ? rawId.split("-")[2] : rawId;
        tMap.set(rawId, st);
        tMap.set(taskNumId, st);

        const pId = String(st.projectId || st.proyecto_id || "");
        if (pId && !pMap.has(pId)) {
          const matchProj = projects?.find((p) => String(p.id) === pId || p.title === st.projectName || p.nombre === st.projectName);
          if (matchProj) {
            pMap.set(pId, matchProj);
          } else {
            pMap.set(pId, {
              id: pId,
              nombre: st.projectName,
              title: st.projectName,
              cliente_id: st.clientId || st.client_id,
              customColor: st.customColor || st.project?.customColor,
              customGradientStyle: st.customGradientStyle || st.project?.customGradientStyle,
              gradient: st.gradient || st.project?.gradient
            });
          }
        }
      });
    }

    return { projectMap: pMap, clientMap: cMap, taskMap: tMap, internalTodayTasks: tList.slice(0, 8) };
  }, [data, externalTodayTasks, allTasks, projects]);

  const activeTodayTasks = externalTodayTasks && externalTodayTasks.length > 0 ? externalTodayTasks : internalTodayTasks;

  const groupedSessions = useMemo(() => {
    const groups: Array<{ groupName: string; items: SessionDoc[] }> = [];
    const groupMap = new Map<string, SessionDoc[]>();

    sessions.forEach((s) => {
      const gName = getDateGroupTitle(s.startTime);
      if (!groupMap.has(gName)) {
        groupMap.set(gName, []);
      }
      groupMap.get(gName)!.push(s);
    });

    groupMap.forEach((items, groupName) => {
      groups.push({ groupName, items });
    });

    return groups;
  }, [sessions]);

  const handleToggleSession = async (t: any) => {
    const rawTaskId = String(t.id || t.taskId || "");
    const taskIdStr = rawTaskId.includes("kt-") ? rawTaskId.split("-")[2] : rawTaskId;
    const projIdStr = String(t.projectId || t.proyecto_id || t.proyecto_ids?.[0] || "");
    const project = projectMap.get(projIdStr);
    const clientIdStr = project?.cliente_id || t.clientId || null;

    if (activeSession?.task_id === taskIdStr) {
      await endSession();
    } else {
      await startSession({
        taskId: taskIdStr,
        projectId: projIdStr,
        clientId: clientIdStr,
        origin: "manual",
      });
    }
  };

  const handleToggleCompleteTask = async (e: React.MouseEvent, t: any) => {
    e.stopPropagation();
    const rawTaskId = String(t.id || t.taskId || "");
    const taskIdStr = rawTaskId.includes("kt-") ? rawTaskId.split("-")[2] : rawTaskId;
    const projIdStr = String(t.projectId || t.proyecto_id || t.proyecto_ids?.[0] || "");
    const isComp = t.status === "Completado" || t.status === "Completada";
    const newStatus = isComp ? "Planificado" : "Completado";

    try {
      await updateDoc(doc(db, "tasks", taskIdStr), {
        estado: newStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error al actualizar estado de la tarea:", err);
    }

    if (onUpdateTaskStatus) {
      onUpdateTaskStatus(projIdStr, taskIdStr, newStatus);
    }
  };

  // Manejadores para la selección múltiple y eliminación a la papelera
  const handleToggleSelectSession = (sessionId: string) => {
    setSelectedSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedSessionIds.size === sessions.length) {
      setSelectedSessionIds(new Set());
    } else {
      setSelectedSessionIds(new Set(sessions.map((s) => s.id)));
    }
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedSessionIds(new Set());
  };

  const handleConfirmDelete = async () => {
    if (selectedSessionIds.size === 0) return;
    setIsDeleting(true);
    try {
      await softDeleteSessions(Array.from(selectedSessionIds));
      setSelectedSessionIds(new Set());
      setIsSelectionMode(false);
      setIsDeleteModalOpen(false);
      playSound('trash');
    } catch (err) {
      console.error("Error al mover sesiones a la papelera:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isMounted) {
    return (
      <div className={`flex flex-col h-full justify-center items-center text-xs ${isNightMode ? 'text-white/30' : 'text-slate-400'}`}>
        Cargando estudio...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden space-y-4 select-none">
      {/* 1. SECCIÓN SUPERIOR: "HOY — TAREAS PROGRAMADAS" */}
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between gap-2.5 px-0 pt-1 pb-1 shrink-0">
          <h3 className={`text-[13px] font-bold ${isNightMode ? 'text-white' : 'text-slate-900'}`}>Hoy — Tareas Programadas</h3>
          <span className={`px-2.5 py-0.5 min-w-[24px] h-[20px] rounded-[13px] text-[11px] font-mono font-bold flex items-center justify-center shrink-0 ${
            isNightMode ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-800'
          }`}>
            {activeTodayTasks.length}
          </span>
        </div>

        <div className="max-h-[275px] overflow-y-auto space-y-2 custom-scrollbar pr-1 pt-1">
          {activeTodayTasks.length === 0 ? (
            <div className={`py-3 text-center text-[11px] font-medium ${isNightMode ? 'text-white/30' : 'text-slate-600'}`}>
              No hay tareas pendientes para hoy.
            </div>
          ) : (
            activeTodayTasks.map((t) => {
              const projIdStr = String(t.projectId || t.proyecto_id || t.proyecto_ids?.[0] || "");
              let project = projectMap.get(projIdStr);
              if (!project && t.projectName) {
                project = projectMap.get(String(t.projectName).toLowerCase().trim());
              }
              if (!project && t.project) {
                project = t.project;
              }
              
              const projectName = t.projectName || project?.nombre || project?.title || "Sin Proyecto";
              const taskTitle = t.taskTitle || t.titulo || t.title || "Tarea";
              const dueInfo = getDueText(t);

              const rawTaskId = String(t.id);
              const cleanTaskId = rawTaskId.includes("kt-") ? rawTaskId.split("-")[2] : rawTaskId;
              const isActive = activeSession?.task_id === cleanTaskId || activeSession?.task_id === rawTaskId;

              const estHours = parseTimeToHours(t.time || t.horas || t.hours || t.duracion) || 1;
              const totalMins = Math.max(1, Math.round(estHours * 60));

              const taskSessions = (sessions || []).filter(s => {
                const sTaskId = String(s.task_id || "").trim();
                if (!sTaskId || !cleanTaskId) return false;
                return sTaskId === cleanTaskId || sTaskId === rawTaskId;
              });

              const executedMins = taskSessions.reduce((sum, s) => {
                if (s.status === "en_curso") {
                  const startMs = s.startTime?.toMillis ? s.startTime.toMillis() : new Date(s.startTime).getTime();
                  const elapsed = Math.max(1, Math.round((Date.now() - startMs) / 60000));
                  return sum + elapsed;
                }
                return sum + (s.durationMins || 0);
              }, 0);

              const isCompleted = t.status === "Completado" || t.status === "Completada";
              const fillRatio = isCompleted ? 1 : Math.min(1, executedMins / totalMins);
              const hasExcess = executedMins > totalMins;
              const excessMins = hasExcess ? executedMins - totalMins : 0;
              const excessRatio = Math.min(1, excessMins / totalMins);
              const ringCircumference = 50.2655; 

              const lastSessionText = getLastSessionText(taskSessions);
              const lastSessionDisplay = isCompleted ? "Completada" : (lastSessionText || "Sin sesión");

              return (
                <motion.div
                  key={t.id}
                  initial="initial"
                  whileHover="hover"
                  className={`group/taskRow p-2.5 rounded-[24px] transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer select-none shadow-[0_5px_16px_-4px_#00000012] ${
                    isActive
                      ? isNightMode 
                        ? "bg-[#333333] text-white border border-[#ffffff1f]" 
                        : "bg-amber-200/90 text-amber-950"
                      : isNightMode 
                        ? "bg-[#1f1f1f] hover:bg-[#282828] border border-[#ffffff1f]" 
                        : "bg-amber-100/90 hover:bg-amber-200/80"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => handleToggleCompleteTask(e, t)}
                      className="relative flex items-center justify-center shrink-0 group/checkBtn focus:outline-none select-none"
                    >
                      <div className={`absolute bottom-full left-0 mb-2 px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-2xl opacity-0 scale-90 group-hover/checkBtn:opacity-100 group-hover/checkBtn:scale-100 pointer-events-none transition-all duration-150 z-[100] whitespace-nowrap ${
                        isNightMode ? 'bg-zinc-900 text-white border border-white/10' : 'bg-slate-900 text-white shadow-md'
                      }`}>
                        {isCompleted ? "Marcar como pendiente" : "Marcar como completado"}
                      </div>

                      <motion.div
                        className={`w-5 h-5 rounded-full flex items-center justify-center relative transition-colors duration-150 ${
                          isNightMode
                            ? 'group-hover/checkBtn:bg-white'
                            : 'group-hover/checkBtn:bg-slate-900'
                        }`}
                      >
                        <svg 
                          className="w-full h-full shrink-0 -rotate-90 overflow-visible group-hover/checkBtn:opacity-0 transition-opacity duration-150" 
                          viewBox="0 0 20 20"
                        >
                          <circle 
                            cx="10" 
                            cy="10" 
                            r="8" 
                            stroke="currentColor" 
                            strokeWidth="1.75" 
                            fill="none" 
                            className={isNightMode ? "text-white/25" : "text-slate-400/40"} 
                          />
                          
                          <motion.circle 
                            cx="10" 
                            cy="10" 
                            r="8" 
                            stroke={isNightMode ? "#FFFFFF" : "#0F172A"} 
                            strokeWidth="1.75" 
                            strokeLinecap={fillRatio > 0 ? "round" : "butt"} 
                            fill="none" 
                            strokeDasharray={ringCircumference} 
                            variants={{
                              initial: { strokeDashoffset: ringCircumference * (1 - fillRatio) },
                              hover: { strokeDashoffset: 0 }
                            }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                          />

                          {hasExcess && (
                            <circle 
                              cx="10" 
                              cy="10" 
                              r="8" 
                              stroke={isNightMode ? "#F43F5E" : "#E11D48"} 
                              strokeWidth="1.75" 
                              strokeLinecap="round" 
                              fill="none" 
                              strokeDasharray={ringCircumference} 
                              strokeDashoffset={ringCircumference * (1 - excessRatio)} 
                              className="transition-all duration-300"
                            />
                          )}
                        </svg>

                        <motion.div
                          variants={{
                            initial: { opacity: 0, scale: 0.4 },
                            hover: { opacity: 1, scale: 1 }
                          }}
                          transition={{ duration: 0.15, delay: 0.18, ease: "backOut" }}
                          className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        >
                          <Check className={`w-3 h-3 stroke-[2.25] transition-colors duration-150 ${
                            isNightMode 
                              ? 'text-white group-hover/checkBtn:text-slate-950' 
                              : 'text-slate-900 group-hover/checkBtn:text-white'
                          }`} />
                        </motion.div>
                      </motion.div>
                    </button>

                    <motion.div
                      variants={{
                        initial: { width: 0, opacity: 0, scale: 0.75, marginRight: 0 },
                        hover: { width: "auto", opacity: 1, scale: 1, marginRight: 4 }
                      }}
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      className="overflow-hidden flex items-center justify-center shrink-0"
                    >
                      <FormatoShape formatoKey={t.formato || t.format} size="sm" isNightMode={isNightMode} />
                    </motion.div>
                    
                    <motion.div
                      variants={{
                        initial: { x: 0 },
                        hover: { x: 4 }
                      }}
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      className="min-w-0"
                    >
                      <div className={`text-[14px] font-bold truncate tracking-tight ${isNightMode ? 'text-white' : 'text-amber-950'}`}>{taskTitle}</div>
                      <div className={`text-[12px] font-normal truncate ${
                        isCompleted
                          ? (isNightMode ? 'text-emerald-400' : 'text-emerald-700')
                          : dueInfo.isOverdue
                            ? (isNightMode ? 'text-rose-400' : 'text-rose-700')
                            : (isNightMode ? 'text-white/60' : 'text-amber-900/70')
                      }`}>
                        {lastSessionDisplay}
                      </div>
                    </motion.div>
                  </div>

                  <button
                    onClick={() => handleToggleSession(t)}
                    title={isActive ? `Detener Sesión (${formatRunningTime(activeElapsedSecs)})` : "Iniciar Sesión de Trabajo"}
                    className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 shadow-sm ${
                      isActive
                        ? "bg-rose-500 text-white hover:bg-rose-600 shadow-rose-500/20"
                        : isNightMode
                          ? "bg-white text-slate-950 hover:bg-slate-200"
                          : "bg-amber-950 text-amber-50 hover:bg-amber-900"
                    }`}
                  >
                    {isActive ? (
                      <>
                        <Square className="w-2.5 h-2.5 fill-current shrink-0" />
                        <span className="font-mono font-bold tracking-tight">{formatRunningTime(activeElapsedSecs)}</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Sesión</span>
                      </>
                    )}
                  </button>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. SECCIÓN INFERIOR: HISTORIAL DEL ESTUDIO */}
      <div className={`flex-1 flex flex-col min-h-0 pt-2 border-t ${isNightMode ? 'border-white/5' : 'border-slate-300/60'}`}>
        
        {!isSelectionMode ? (
          <div className="flex items-center justify-between mb-2 relative">
            <div className="flex items-center gap-2">
              <h3 className={`text-xs font-black uppercase tracking-wider ${isNightMode ? 'text-white' : 'text-slate-900'}`}>
                Historial del Estudio
              </h3>
              <span className={`px-2 py-0.5 min-w-[22px] h-[18px] rounded-[11px] text-[10px] font-mono font-bold flex items-center justify-center shrink-0 ${
                isNightMode ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-800'
              }`}>
                {sessions.length}
              </span>
            </div>

            <div ref={headerMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsHeaderMenuOpen((prev) => !prev)}
                className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${
                  isHeaderMenuOpen
                    ? isNightMode ? "bg-white/20 text-white" : "bg-slate-300 text-slate-900"
                    : isNightMode ? "text-white/60 hover:text-white hover:bg-white/10" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                }`}
                title="Opciones del historial"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {isHeaderMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 4 }}
                    transition={{ duration: 0.12 }}
                    className={`absolute right-0 top-full mt-1.5 z-50 min-w-[195px] p-1.5 rounded-2xl shadow-2xl ${
                      isNightMode
                        ? "bg-[#181818] border border-white/15 shadow-black/90 text-white"
                        : "bg-white border border-slate-200 shadow-slate-900/20 text-slate-900"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setIsSelectionMode(true);
                        setIsHeaderMenuOpen(false);
                        setSelectedSessionIds(new Set());
                        playSound('click');
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors text-left ${
                        isNightMode ? "hover:bg-white/10 text-[#ffffffd6]" : "hover:bg-slate-100 text-slate-800"
                      }`}
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                      <span>Seleccionar sesiones</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsTrashModalOpen(true);
                        setIsHeaderMenuOpen(false);
                        playSound('click');
                      }}
                      className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors text-left ${
                        isNightMode ? "hover:bg-white/10 text-[#ffffffd6]" : "hover:bg-slate-100 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>Papelera (30 días)</span>
                      </div>
                      {trashCount > 0 && (
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                          isNightMode ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "bg-rose-100 text-rose-700"
                        }`}>
                          {trashCount}
                        </span>
                      )}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className={`p-2 rounded-2xl mb-2 flex items-center justify-between gap-2 border transition-all ${
            isNightMode ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-300"
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={handleSelectAll}
                className={`text-[11px] font-bold underline transition-colors cursor-pointer ${
                  isNightMode ? "text-white/80 hover:text-white" : "text-slate-700 hover:text-slate-900"
                }`}
              >
                {selectedSessionIds.size === sessions.length && sessions.length > 0 ? "Deseleccionar" : "Todas"}
              </button>
              <span className={`text-[11px] font-mono font-medium truncate ${
                isNightMode ? "text-white/60" : "text-slate-600"
              }`}>
                ({selectedSessionIds.size} seleccionada{selectedSessionIds.size === 1 ? '' : 's'})
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCancelSelection}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-colors cursor-pointer ${
                  isNightMode ? "bg-white/10 hover:bg-white/15 text-white/80 hover:text-white" : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={selectedSessionIds.size === 0}
                onClick={() => {
                  if (selectedSessionIds.size > 0) {
                    setIsDeleteModalOpen(true);
                    playSound('click');
                  }
                }}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                  selectedSessionIds.size > 0
                    ? "bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/20 cursor-pointer"
                    : "bg-white/5 text-white/30 border border-white/5 cursor-not-allowed"
                }`}
              >
                <Trash2 className="w-3 h-3" />
                <span>Eliminar ({selectedSessionIds.size})</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-1">
          {isLoading ? (
            <div className={`py-8 text-center text-xs ${isNightMode ? 'text-white/30' : 'text-slate-500'}`}>Cargando historial del estudio...</div>
          ) : groupedSessions.length === 0 ? (
            <div className={`py-8 text-center text-xs font-medium ${isNightMode ? 'text-white/30' : 'text-slate-600'}`}>
              No se han registrado sesiones de trabajo recientemente.
            </div>
          ) : (
            groupedSessions.map(({ groupName, items }) => (
              <div key={groupName} className="space-y-1.5">
                <div className={`text-[10px] font-extrabold uppercase tracking-widest pt-1 pb-0.5 ${
                  isNightMode ? 'text-white/30' : 'text-amber-900/70'
                }`}>
                  {groupName}
                </div>

                <div className="space-y-1.5 pt-0.5">
                  {items.map((s) => {
                    const taskIdStr = String(s.task_id);
                    const projIdStr = String(s.project_id);

                    const task = taskMap.get(taskIdStr) || (taskIdStr.includes("kt-") ? taskMap.get(taskIdStr.split("-")[2]) : null);
                    let project = projectMap.get(projIdStr);
                    if (!project && task) {
                      const tProjId = String(task.projectId || task.proyecto_id || "");
                      if (tProjId) project = projectMap.get(tProjId);
                    }

                    const taskTitle = task?.titulo || task?.taskTitle || task?.title || s.summary || "Tarea de Sesión";
                    const projectName = project?.nombre || project?.title || task?.projectName || "Proyecto";

                    const badge = getOriginBadge(s.origin);
                    const relTime = getSessionEndRelativeTime(s);
                    const dotBgColor = getProjectBgColor(project, task);
                    const isSelected = selectedSessionIds.has(s.id);

                    return (
                      <motion.div
                        key={s.id}
                        initial="initial"
                        whileHover="hover"
                        onClick={() => {
                          if (isSelectionMode) {
                            handleToggleSelectSession(s.id);
                            playSound('tick');
                          }
                        }}
                        className={`p-2.5 rounded-2xl transition-all duration-200 flex items-center justify-between gap-2 cursor-pointer select-none border ${
                          isSelected
                            ? isNightMode
                              ? "bg-rose-500/15 border-rose-500/40 text-white ring-1 ring-rose-500/30"
                              : "bg-rose-100 border-rose-300 text-rose-950"
                            : isNightMode 
                              ? "bg-white/[0.025] hover:bg-white/[0.045] border-transparent" 
                              : "bg-amber-100/90 hover:bg-amber-200/80 shadow-sm border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isSelectionMode && (
                            <div className="shrink-0 flex items-center justify-center mr-0.5">
                              <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                                isSelected
                                  ? "bg-rose-500 border-rose-400 text-white"
                                  : isNightMode
                                    ? "border-white/30 bg-white/5 hover:border-white/50"
                                    : "border-slate-400 bg-white hover:border-slate-600"
                              }`}>
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            </div>
                          )}

                          <span 
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: dotBgColor }}
                            title={projectName} 
                          />

                          <motion.div
                            variants={{
                              initial: { width: 0, opacity: 0, scale: 0.75, marginRight: 0 },
                              hover: { width: "auto", opacity: 1, scale: 1, marginRight: 4 }
                            }}
                            transition={{ type: "spring", stiffness: 350, damping: 25 }}
                            className="overflow-hidden flex items-center justify-center shrink-0"
                          >
                            <FormatoShape formatoKey={task?.formato || task?.format} size="sm" isNightMode={isNightMode} />
                          </motion.div>

                          <motion.div
                            variants={{
                              initial: { x: 0 },
                              hover: { x: 4 }
                            }}
                            transition={{ type: "spring", stiffness: 350, damping: 25 }}
                            className="min-w-0"
                          >
                            <h4 className={`text-xs font-bold tracking-tight truncate transition-colors ${
                              isNightMode ? 'text-white' : 'text-amber-950'
                            }`}>
                              {taskTitle}
                            </h4>
                            <div className={`flex items-center gap-1.5 text-[9px] mt-0.5 truncate ${
                              isNightMode ? 'text-white/40' : 'text-amber-900/70'
                            }`}>
                              <span className={`font-semibold ${isNightMode ? 'text-white/70' : 'text-amber-900'}`}>{projectName}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                {badge.icon}
                                <span>{badge.label}</span>
                              </span>
                            </div>
                          </motion.div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className={`text-xs font-black ${isNightMode ? 'text-white' : 'text-amber-950'}`}>{s.durationMins > 0 ? `${s.durationMins} min` : "En curso"}</div>
                          <div className={`text-[9px] font-medium ${isNightMode ? 'text-white/30' : 'text-amber-900/60'}`}>{relTime}</div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. MODAL DE CONFIRMACIÓN PARA MOVER SESIONES A LA PAPELERA */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className={`w-full max-w-sm p-6 rounded-[28px] border shadow-2xl relative select-none ${
                isNightMode
                  ? "bg-[#181818] border-white/10 text-white shadow-black/90"
                  : "bg-white border-slate-200 text-slate-900 shadow-xl"
              }`}
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/10">
                  <Trash2 className="w-6 h-6 stroke-[2.2]" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-base font-bold tracking-tight">
                    ¿Mover {selectedSessionIds.size} {selectedSessionIds.size === 1 ? "sesión" : "sesiones"} a la papelera?
                  </h3>
                  <p className={`text-xs leading-relaxed ${isNightMode ? "text-white/60" : "text-slate-600"}`}>
                    Las sesiones eliminadas se conservarán en el basurero durante <strong className={isNightMode ? "text-white" : "text-slate-900"}>30 días</strong> antes de eliminarse de forma permanente.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 w-full mt-2">
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(false)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isNightMode
                        ? "bg-white/5 border-white/10 hover:bg-white/10 text-white/80 hover:text-white"
                        : "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleConfirmDelete}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isDeleting ? (
                      <span>Moviendo...</span>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Mover a papelera</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. MODAL DEL BASURERO / PAPELERA DE SESIONES */}
      <AnimatePresence>
        {isTrashModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className={`w-full max-w-md max-h-[85vh] flex flex-col p-5 rounded-[28px] border shadow-2xl relative select-none ${
                isNightMode
                  ? "bg-[#181818] border-white/10 text-white shadow-black/90"
                  : "bg-white border-slate-200 text-slate-900 shadow-xl"
              }`}
            >
              <div className="flex items-start justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold tracking-tight">Papelera de Sesiones</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {trashSessions.length}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTrashModalOpen(false)}
                  className={`p-1.5 rounded-full border transition-colors cursor-pointer ${
                    isNightMode ? "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10" : "bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-3 space-y-2 custom-scrollbar pr-1 min-h-[200px] max-h-[360px]">
                {trashSessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-2 text-white/30">
                      <Inbox className="w-6 h-6" />
                    </div>
                    <p className={`text-xs font-semibold ${isNightMode ? "text-white/60" : "text-slate-600"}`}>
                      La papelera está vacía
                    </p>
                  </div>
                ) : (
                  trashSessions.map((s) => {
                    const taskIdStr = String(s.task_id);
                    const projIdStr = String(s.project_id);
                    const task = taskMap.get(taskIdStr) || (taskIdStr.includes("kt-") ? taskMap.get(taskIdStr.split("-")[2]) : null);
                    let project = projectMap.get(projIdStr);
                    if (!project && task) {
                      const tProjId = String(task.projectId || task.proyecto_id || "");
                      if (tProjId) project = projectMap.get(tProjId);
                    }
                    const taskTitle = task?.titulo || task?.taskTitle || task?.title || s.summary || "Tarea";
                    const projectName = project?.nombre || project?.title || "Proyecto";
                    const dotBgColor = getProjectBgColor(project, task);

                    return (
                      <div
                        key={s.id}
                        className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
                          isNightMode
                            ? "bg-white/[0.03] hover:bg-white/[0.05] border-white/5"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: dotBgColor }}
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold truncate tracking-tight">{taskTitle}</div>
                            <div className={`text-[10px] flex items-center gap-1.5 mt-0.5 truncate ${isNightMode ? "text-white/40" : "text-slate-500"}`}>
                              <span className="font-semibold">{projectName}</span>
                              <span>•</span>
                              <span>{s.durationMins > 0 ? `${s.durationMins} min` : "0 min"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Badge de Días Restantes */}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            s.daysRemaining <= 3
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              : "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                          }`}>
                            {s.daysRemaining === 1 ? "1 día restante" : `${s.daysRemaining} días`}
                          </span>

                          {/* Botón Restaurar */}
                          <button
                            type="button"
                            onClick={async () => {
                              await restoreTrashSessions([s.id]);
                              playSound('click');
                            }}
                            className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-white/10 hover:bg-white/20 text-white transition-all flex items-center gap-1 cursor-pointer"
                            title="Restaurar sesión"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Restaurar</span>
                          </button>

                          {/* Botón Eliminar Permanente */}
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm("¿Eliminar definitivamente esta sesión? Esta acción no se puede deshacer.")) {
                                await permanentDeleteSessions([s.id]);
                                playSound('trash');
                              }
                            }}
                            className="p-1.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 transition-all cursor-pointer"
                            title="Eliminar permanentemente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {trashSessions.length > 0 && (
                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm(`¿Vaciar completamente la papelera (${trashSessions.length} sesiones)?`)) {
                        await emptyTrash();
                        playSound('trash');
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/15 transition-all cursor-pointer"
                  >
                    Vaciar papelera
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsTrashModalOpen(false)}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white transition-all cursor-pointer"
                  >
                    Listo
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
