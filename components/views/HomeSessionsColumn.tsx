"use client";

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
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
  AlertTriangle,
  ArrowLeft,
  Calendar,
  History,
  Pencil
} from "lucide-react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/lib/store";
import type { SessionDoc, SessionOrigin } from "@/lib/types";
import { CARD_COLOR_KEYS, getCardColorTheme, getSingleSourceProjectColor, parseTimeToHours, extractCleanTaskId, getWorkspaceScopedCol } from "@/lib/utils";
import FormatoShape from "@/app/taski/components/FormatoShape";
import { GitHubActivity } from "@/components/ui/github-activity";
import { playSound } from "@/app/taski/utils/audio";
import EditSessionModal from "@/components/modals/EditSessionModal";
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote, useReorderNotes, useTrashNotes } from "@/hooks/useNotes";
import { NoteSquircleCard } from "@/components/notes/NoteSquircleCard";
import { SortableNoteSquircleCard } from "@/components/notes/SortableNoteSquircleCard";
import { NoteExpandedModal } from "@/components/notes/NoteExpandedModal";
import type { NoteDoc } from "@/lib/types";
import { Sparkles } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  closestCorners,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

class SmartMouseSensor extends MouseSensor {
  static activators = [
    {
      eventName: "onMouseDown" as const,
      handler: ({ nativeEvent: event }: { nativeEvent: MouseEvent }) => {
        let element = event.target as HTMLElement | null;
        while (element) {
          if (
            element.dataset?.noDnd === "true" ||
            element.tagName === "BUTTON" ||
            element.tagName === "INPUT" ||
            element.tagName === "TEXTAREA" ||
            element.getAttribute("contenteditable") === "true"
          ) {
            return false;
          }
          element = element.parentElement;
        }
        return true;
      },
    },
  ];
}

class SmartTouchSensor extends TouchSensor {
  static activators = [
    {
      eventName: "onTouchStart" as const,
      handler: ({ nativeEvent: event }: { nativeEvent: TouchEvent }) => {
        let element = event.target as HTMLElement | null;
        while (element) {
          if (
            element.dataset?.noDnd === "true" ||
            element.tagName === "BUTTON" ||
            element.tagName === "INPUT" ||
            element.tagName === "TEXTAREA" ||
            element.getAttribute("contenteditable") === "true"
          ) {
            return false;
          }
          element = element.parentElement;
        }
        return true;
      },
    },
  ];
}

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

export function formatSessionDurationDisplay(durationMins: number, durationSeconds?: number): string {
  if (typeof durationSeconds === "number" && durationSeconds > 0 && durationSeconds < 60) {
    return `${durationSeconds}s`;
  }
  if (!durationMins || durationMins <= 0) {
    if (typeof durationSeconds === "number" && durationSeconds > 0) {
      return `${durationSeconds}s`;
    }
    return "0 min";
  }
  const hours = Math.floor(durationMins / 60);
  const mins = durationMins % 60;

  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${mins} min`;
  }
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
    const rawDue = 
      t.dueDate || 
      t.fecha_limite || 
      t.deadline || 
      t.fechaEntrega || 
      t.fecha_programada || 
      t.project?.fechaFin || 
      t.project?.fecha_fin || 
      t.project?.deadline || 
      t.project?.deadlineRaw || 
      t.project?.dueDate || 
      t.project?.fechaInicio;
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
  onSelectTask?: (task: any, projectId?: string | number) => void;
}

export function HomeSessionsColumn({ todayTasks: externalTodayTasks, allTasks, projects, isNightMode = true, onUpdateTaskStatus, onSelectTask }: HomeSessionsColumnProps) {
  const workspaceId = useAuthStore((s) => s.workspaceId) || "brandex-master";
  const isMaster = workspaceId === "brandex-master" || workspaceId === "ws_159789" || workspaceId === "159789";
  const { sessions, isLoading, refetch } = useRecentSessions(100);
  const { activeSession, startSession, endSession, softDeleteSessions } = useSessions();
  const { trashSessions, trashCount, restoreSessions: restoreTrashSessions, permanentDeleteSessions, emptyTrash } = useTrashSessions();
  const { data } = useData();
  const [isMounted, setIsMounted] = useState(false);
  const [activeElapsedSecs, setActiveElapsedSecs] = useState<number>(0);

  // Notas en tiempo real
  const { data: notes = [] } = useNotes();
  const createNoteMutation = useCreateNote();
  const updateNoteMutation = useUpdateNote();
  const deleteNoteMutation = useDeleteNote();
  const reorderNotesMutation = useReorderNotes();
  const {
    trashNotes,
    trashCount: notesTrashCount,
    restoreNotes,
    permanentDeleteNotes,
    emptyTrash: emptyNotesTrash,
  } = useTrashNotes();
  const [isNotesTrashModalOpen, setIsNotesTrashModalOpen] = useState<boolean>(false);
  const [activeDragNoteId, setActiveDragNoteId] = useState<string | null>(null);

  const activeDragNote = useMemo(
    () => (activeDragNoteId ? notes.find((n) => n.id === activeDragNoteId) || null : null),
    [notes, activeDragNoteId]
  );

  const noteSensors = useSensors(
    useSensor(SmartMouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(SmartTouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    })
  );

  const handleNoteDragStart = (event: DragStartEvent) => {
    setActiveDragNoteId(event.active.id as string);
    playSound("click");
  };

  const handleNoteDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragNoteId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const oldIndex = filteredNotes.findIndex((n) => n.id === activeId);
    const newIndex = filteredNotes.findIndex((n) => n.id === overId);

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      playSound("pop");
      const reordered = arrayMove(filteredNotes, oldIndex, newIndex);

      const otherNotes = notes.filter((n) => !reordered.some((r) => r.id === n.id));
      const fullReordered = [...reordered, ...otherNotes];
      reorderNotesMutation.mutate(fullReordered);
    }
  };

  const [expandedNote, setExpandedNote] = useState<NoteDoc | null>(null);
  const [noteFilter, setNoteFilter] = useState<"pendientes" | "completadas">("pendientes");

  const pendingNotes = useMemo(() => notes.filter((n) => !n.isCompleted), [notes]);
  const completedNotes = useMemo(() => notes.filter((n) => !!n.isCompleted), [notes]);

  const filteredNotes = useMemo(() => {
    if (noteFilter === "completadas") return completedNotes;
    return pendingNotes;
  }, [noteFilter, pendingNotes, completedNotes]);

  const handleCreateNewNote = async () => {
    playSound("pop");
    try {
      const newDoc = await createNoteMutation.mutateAsync({
        title: "Nueva Nota",
        content: "",
        noteType: "texto",
        subtasks: [],
      });
      if (newDoc) {
        setExpandedNote(newDoc as NoteDoc);
      }
    } catch (e) {
      console.error("Error creating note:", e);
    }
  };

  // Modo de vista de la sección superior: "tareas", "historial" o "heatmap"
  const [topViewMode, setTopViewMode] = useState<"tareas" | "historial" | "heatmap">("tareas");

  // Estados para selección múltiple y papelera
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState<boolean>(false);
  const [isNotesMenuOpen, setIsNotesMenuOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [editingSessionData, setEditingSessionData] = useState<{ session: SessionDoc; task?: any; project?: any } | null>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const notesMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Cerrar menú contextual al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setIsHeaderMenuOpen(false);
      }
      if (notesMenuRef.current && !notesMenuRef.current.contains(e.target as Node)) {
        setIsNotesMenuOpen(false);
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
        const taskNumId = extractCleanTaskId(rawId, st.projectId || st.proyecto_id);
        tMap.set(rawId, st);
        if (taskNumId) {
          tMap.set(taskNumId, st);
        }

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

  const baseTodayTasks = externalTodayTasks && externalTodayTasks.length > 0 ? externalTodayTasks : internalTodayTasks;

  // Helper unificado para determinar si una tarea tiene la sesión activa corriendo
  const isTaskSessionActive = useCallback((t: any) => {
    if (!activeSession?.task_id) return false;
    const s = activeSession as any;
    const activeTaskId = String(s.task_id || s.taskId || "").trim();
    const activeProjId = String(s.project_id || s.projectId || "").trim();
    const activeCleanId = extractCleanTaskId(activeTaskId, activeProjId);

    const rawId = String(t.id || t.taskId || "").trim();
    const pId = String(t.projectId || t.proyecto_id || t.proyecto_ids?.[0] || "").trim();
    const cleanId = extractCleanTaskId(rawId, pId);

    if (rawId === activeTaskId || rawId === activeCleanId) return true;
    if (cleanId && activeCleanId && cleanId === activeCleanId) return true;
    if (cleanId && cleanId === activeTaskId) return true;
    if (activeCleanId && rawId === activeCleanId) return true;
    if (rawId.endsWith(`-${activeTaskId}`) || rawId.endsWith(`-${activeCleanId}`)) return true;
    if (activeTaskId.endsWith(`-${rawId}`) || activeTaskId.endsWith(`-${cleanId}`)) return true;
    if (s.taskTitle && (t.taskTitle || t.title || t.titulo) && s.taskTitle.trim().toLowerCase() === (t.taskTitle || t.title || t.titulo).trim().toLowerCase()) return true;

    return false;
  }, [activeSession]);

  // Si hay una sesión activa, posiciona la tarea activa temporalmente hasta la parte superior de la lista
  const activeTodayTasks = useMemo(() => {
    if (!activeSession?.task_id) return baseTodayTasks;

    return [...baseTodayTasks].sort((a, b) => {
      const isAActive = isTaskSessionActive(a);
      const isBActive = isTaskSessionActive(b);

      if (isAActive && !isBActive) return -1;
      if (!isAActive && isBActive) return 1;
      return 0;
    });
  }, [baseTodayTasks, activeSession, isTaskSessionActive]);

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
    const projIdStr = String(t.projectId || t.proyecto_id || t.proyecto_ids?.[0] || "");
    const taskIdStr = extractCleanTaskId(rawTaskId, projIdStr) || rawTaskId;
    const project = projectMap.get(projIdStr);
    const clientIdStr = project?.cliente_id || t.clientId || null;

    const isRunning = isTaskSessionActive(t);

    if (isRunning) {
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
    const projIdStr = String(t.projectId || t.proyecto_id || t.proyecto_ids?.[0] || "");
    const taskIdStr = extractCleanTaskId(rawTaskId, projIdStr) || rawTaskId;
    const isComp = t.status === "Completado" || t.status === "Completada" || t.estado === "Completado";
    const newStatus = isComp ? "Planificado" : "Completado";

    // Si la tarea se completa y tiene una sesión activa corriendo, detener la sesión de inmediato
    if (!isComp && isTaskSessionActive(t)) {
      try {
        await endSession();
      } catch (sessErr) {
        console.warn("[handleToggleCompleteTask] Error al detener sesión activa:", sessErr);
      }
    }

    try {
      const tasksCol = getWorkspaceScopedCol("tasks", workspaceId, isMaster);
      await updateDoc(doc(db, tasksCol, taskIdStr), {
        estado: newStatus,
        status: newStatus,
        updatedAt: serverTimestamp(),
        updated_at: serverTimestamp(),
        fecha_hora_completado: newStatus === "Completado" ? new Date().toISOString() : null,
      });
    } catch (err) {
      try {
        await updateDoc(doc(db, "tasks", taskIdStr), {
          estado: newStatus,
          status: newStatus,
          updatedAt: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
      } catch (err2) {
        console.error("Error al actualizar estado de la tarea en Firestore:", err2);
      }
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
      {/* 1. SECCIÓN SUPERIOR: CONMUTADOR "HOY — TAREAS PROGRAMADAS" / "HISTORIAL DEL ESTUDIO" */}
      <AnimatePresence mode="wait">
        {topViewMode === "tareas" ? (
          <motion.div
            key="view-tareas"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col space-y-2"
          >
            {/* Header: Hoy — Tareas Programadas sin contador y en 14px */}
            <div className="flex items-center justify-between gap-2.5 px-0 pt-0.5 pb-0.5 shrink-0">
              <div className="flex items-center gap-2">
                <h3 className={`text-[14px] font-bold ${isNightMode ? 'text-[#ffffffd6]' : 'text-slate-900'}`}>
                  Hoy — Tareas Programadas
                </h3>
              </div>

              {/* Botón 3 Puntos */}
              <div ref={headerMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsHeaderMenuOpen((prev) => !prev)}
                  className={`p-1.5 rounded-lg transition-colors flex items-center justify-center cursor-pointer ${
                    isHeaderMenuOpen
                      ? isNightMode ? "bg-white/20 text-white" : "bg-slate-300 text-slate-900"
                      : isNightMode ? "text-white/60 hover:text-white hover:bg-white/10" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                  }`}
                  title="Opciones de la vista"
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
                      className={`absolute right-0 top-full mt-1.5 z-50 min-w-[220px] p-1.5 rounded-2xl shadow-2xl ${
                        isNightMode
                          ? "bg-[#181818] border border-white/15 shadow-black/90 text-white"
                          : "bg-white border border-slate-200 shadow-slate-900/20 text-slate-900"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setTopViewMode("historial");
                          setIsHeaderMenuOpen(false);
                          playSound('click');
                        }}
                        className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer ${
                          isNightMode ? "hover:bg-white/10 text-[#ffffffd6]" : "hover:bg-slate-100 text-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                          <span>Ver Historial del Estudio</span>
                        </div>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                          isNightMode ? "bg-white/10 text-white/70" : "bg-slate-200 text-slate-700"
                        }`}>
                          {sessions.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTopViewMode("heatmap");
                          setIsHeaderMenuOpen(false);
                          playSound('click');
                        }}
                        className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer ${
                          isNightMode ? "hover:bg-white/10 text-[#ffffffd6]" : "hover:bg-slate-100 text-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Ver Mapa de Calor</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsTrashModalOpen(true);
                          setIsHeaderMenuOpen(false);
                          playSound('click');
                        }}
                        className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer ${
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

            {/* Lista de Tareas Programadas calibrada para 4 tarjetas completas */}
            <div className="max-h-[268px] overflow-y-auto space-y-2 autohide-scrollbar pr-1 pt-1 pb-1 snap-y snap-mandatory overscroll-contain">
              {activeTodayTasks.length === 0 ? (
                <div className={`py-6 text-center text-[12px] font-medium ${isNightMode ? 'text-white/30' : 'text-slate-600'}`}>
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
                  const cleanTaskId = extractCleanTaskId(rawTaskId, t.projectId || t.proyecto_id);
                  const isActive = isTaskSessionActive(t);

                  const estHours = parseTimeToHours(t.time || t.horas || t.hours || t.duracion) || 1;
                  const totalMins = Math.max(1, Math.round(estHours * 60));

                  const taskSessions = (sessions || []).filter(s => {
                    if (s.isDeleted || s.status === "deleted") return false;
                    const sTaskId = String(s.task_id || (s as any).taskId || "").trim();
                    if (!sTaskId) return false;
                    return sTaskId === cleanTaskId || sTaskId === rawTaskId || extractCleanTaskId(sTaskId) === cleanTaskId;
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
                      const sMs = s.startTime?.toMillis ? s.startTime.toMillis() : new Date(s.startTime).getTime();
                      const eMs = s.endTime?.toMillis ? s.endTime.toMillis() : new Date(s.endTime).getTime();
                      if (!isNaN(sMs) && !isNaN(eMs) && eMs > sMs) {
                        return sum + Math.round((eMs - sMs) / 1000);
                      }
                    }
                    return sum + ((s.durationMins || 0) * 60);
                  }, 0);

                  const executedMins = Math.round(executedSecs / 60);

                  const isCompleted = t.status === "Completado" || t.status === "Completada" || t.estado === "Completado";
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
                      onClick={() => {
                        if (onSelectTask) {
                          onSelectTask(t, projIdStr);
                        }
                      }}
                      className={`group/taskRow p-2.5 rounded-[24px] transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer select-none shadow-[0_5px_16px_-4px_#00000012] snap-start shrink-0 ${
                        isActive
                          ? isNightMode 
                            ? "bg-[#333333] text-white" 
                            : "bg-amber-200/90 text-amber-950"
                          : isNightMode 
                            ? "bg-[#1f1f1f] hover:bg-[#282828]" 
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
                          <div className={`text-[14px] font-bold truncate tracking-tight ${isNightMode ? 'text-[#ffffffd6]' : 'text-amber-950'}`}>{taskTitle}</div>
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
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSession(t);
                        }}
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
          </motion.div>
        ) : topViewMode === "heatmap" ? (
          <motion.div
            key="view-heatmap"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col space-y-2"
          >
            {/* Header: Mapa de Calor con botón Volver y 3 Puntos */}
            <div className="flex items-center justify-between gap-2 px-0 pt-0.5 pb-0.5 shrink-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    setTopViewMode("tareas");
                    playSound('click');
                  }}
                  className={`p-1.5 -ml-1 rounded-lg transition-colors flex items-center justify-center cursor-pointer shrink-0 ${
                    isNightMode ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                  title="Volver a Tareas Programadas"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <h3 className={`text-[13px] font-bold truncate ${isNightMode ? 'text-[#ffffffd6]' : 'text-slate-900'}`}>
                  Mapa de Calor
                </h3>
              </div>

              {/* Botón 3 Puntos para Mapa de Calor */}
              <div ref={headerMenuRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setIsHeaderMenuOpen((prev) => !prev)}
                  className={`p-1.5 rounded-lg transition-colors flex items-center justify-center cursor-pointer ${
                    isHeaderMenuOpen
                      ? isNightMode ? "bg-white/20 text-white" : "bg-slate-300 text-slate-900"
                      : isNightMode ? "text-white/60 hover:text-white hover:bg-white/10" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                  }`}
                  title="Opciones"
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
                      className={`absolute right-0 top-full mt-1.5 z-50 min-w-[220px] p-1.5 rounded-2xl shadow-2xl ${
                        isNightMode
                          ? "bg-[#181818] border border-white/15 shadow-black/90 text-white"
                          : "bg-white border border-slate-200 shadow-slate-900/20 text-slate-900"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setTopViewMode("tareas");
                          setIsHeaderMenuOpen(false);
                          playSound('click');
                        }}
                        className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer ${
                          isNightMode ? "hover:bg-white/10 text-[#ffffffd6]" : "hover:bg-slate-100 text-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Volver a Tareas de Hoy</span>
                        </div>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                          isNightMode ? "bg-white/10 text-white/70" : "bg-slate-200 text-slate-700"
                        }`}>
                          {activeTodayTasks.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTopViewMode("historial");
                          setIsHeaderMenuOpen(false);
                          playSound('click');
                        }}
                        className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer ${
                          isNightMode ? "hover:bg-white/10 text-[#ffffffd6]" : "hover:bg-slate-100 text-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                          <span>Ver Historial del Estudio</span>
                        </div>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                          isNightMode ? "bg-white/10 text-white/70" : "bg-slate-200 text-slate-700"
                        }`}>
                          {sessions.length}
                        </span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Contenido del Mapa de Calor */}
            <div className="max-h-[285px] overflow-y-auto space-y-2 autohide-scrollbar pr-1 pt-1">
              <GitHubActivity
                accent="#3b82f6"
                cellSize={11}
                months={4}
                showMonths={true}
                sessions={sessions}
                tasks={allTasks || externalTodayTasks || internalTodayTasks}
                projects={projects}
                noContainer={true}
                className="h-full w-full"
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="view-historial"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col space-y-2"
          >
            {/* Header: Historial del Estudio con botón Volver y 3 Puntos */}
            <div className="flex items-center justify-between gap-2 px-0 pt-0.5 pb-0.5 shrink-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    setTopViewMode("tareas");
                    setIsSelectionMode(false);
                    playSound('click');
                  }}
                  className={`p-1.5 -ml-1 rounded-lg transition-colors flex items-center justify-center cursor-pointer shrink-0 ${
                    isNightMode ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                  title="Volver a Tareas Programadas"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <h3 className={`text-[14px] font-bold truncate ${isNightMode ? 'text-[#ffffffd6]' : 'text-slate-900'}`}>
                  Historial del Estudio
                </h3>
                <span className={`px-2.5 py-0.5 min-w-[24px] h-[20px] rounded-[13px] text-[12px] font-mono font-bold flex items-center justify-center shrink-0 ${
                  isNightMode ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-800'
                }`}>
                  {sessions.length}
                </span>
              </div>

              {/* Botón 3 Puntos para Historial */}
              <div ref={headerMenuRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setIsHeaderMenuOpen((prev) => !prev)}
                  className={`p-1.5 rounded-lg transition-colors flex items-center justify-center cursor-pointer ${
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
                      className={`absolute right-0 top-full mt-1.5 z-50 min-w-[220px] p-1.5 rounded-2xl shadow-2xl ${
                        isNightMode
                          ? "bg-[#181818] border border-white/15 shadow-black/90 text-white"
                          : "bg-white border border-slate-200 shadow-slate-900/20 text-slate-900"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setTopViewMode("tareas");
                          setIsSelectionMode(false);
                          setIsHeaderMenuOpen(false);
                          playSound('click');
                        }}
                        className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer ${
                          isNightMode ? "hover:bg-white/10 text-[#ffffffd6]" : "hover:bg-slate-100 text-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Volver a Tareas de Hoy</span>
                        </div>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                          isNightMode ? "bg-white/10 text-white/70" : "bg-slate-200 text-slate-700"
                        }`}>
                          {activeTodayTasks.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTopViewMode("heatmap");
                          setIsSelectionMode(false);
                          setIsHeaderMenuOpen(false);
                          playSound('click');
                        }}
                        className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer ${
                          isNightMode ? "hover:bg-white/10 text-[#ffffffd6]" : "hover:bg-slate-100 text-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Ver Mapa de Calor</span>
                        </div>
                      </button>

                      <div className={`h-px my-1 ${isNightMode ? 'bg-white/10' : 'bg-slate-200'}`} />

                      <button
                        type="button"
                        onClick={() => {
                          setIsSelectionMode(true);
                          setIsHeaderMenuOpen(false);
                          setSelectedSessionIds(new Set());
                          playSound('click');
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer ${
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
                        className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer ${
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

            {/* Barra de Selección Múltiple si está activa */}
            {isSelectionMode && (
              <div className={`p-2 rounded-2xl mb-1 flex items-center justify-between gap-2 border transition-all ${
                isNightMode ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-300"
              }`}>
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className={`text-[12px] font-bold underline transition-colors cursor-pointer ${
                      isNightMode ? "text-white/80 hover:text-white" : "text-slate-700 hover:text-slate-900"
                    }`}
                  >
                    {selectedSessionIds.size === sessions.length && sessions.length > 0 ? "Deseleccionar" : "Todas"}
                  </button>
                  <span className={`text-[12px] font-mono font-medium truncate ${
                    isNightMode ? "text-white/60" : "text-slate-600"
                  }`}>
                    {selectedSessionIds.size} {selectedSessionIds.size === 1 ? "seleccionada" : "seleccionadas"}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleCancelSelection}
                    className={`px-2 py-1 rounded-lg text-[12px] font-semibold border transition-all cursor-pointer ${
                      isNightMode ? "border-white/10 hover:bg-white/10 text-white/70" : "border-slate-300 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    disabled={selectedSessionIds.size === 0}
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg text-[12px] font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>
            )}

            {/* Feed Agrupado de Sesiones */}
            <div className="max-h-[268px] overflow-y-auto space-y-3 autohide-scrollbar pr-1 pt-1 pb-1">
              {groupedSessions.length === 0 ? (
                <div className={`py-6 text-center text-[12px] font-medium ${isNightMode ? 'text-white/30' : 'text-slate-600'}`}>
                  No hay sesiones registradas.
                </div>
              ) : (
                groupedSessions.map(({ groupName, items }) => (
                  <div key={groupName} className="space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                      <span className={`text-[12px] font-bold uppercase tracking-wider ${isNightMode ? 'text-white/40' : 'text-slate-600'}`}>
                        {groupName}
                      </span>
                      <span className={`text-[12px] font-mono ${isNightMode ? 'text-white/30' : 'text-slate-600'}`}>
                        {items.length} {items.length === 1 ? "sesión" : "sesiones"}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {items.map((s) => {
                        const originBadge = getOriginBadge(s.origin);
                        const isEnCurso = s.status === "en_curso";
                        const relTime = getSessionEndRelativeTime(s);
                        const isSelected = selectedSessionIds.has(s.id);
                        
                        const task = s.task_id ? taskMap.get(String(s.task_id)) : null;
                        const projIdStr = String(s.project_id || (s as any).projectId || task?.projectId || task?.proyecto_id || task?.proyecto_ids?.[0] || "");
                        let project = projectMap.get(projIdStr);
                        if (!project && task?.projectName) {
                          project = projectMap.get(String(task.projectName).toLowerCase().trim());
                        }

                        return (
                          <motion.div
                            key={s.id}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={() => {
                              if (isSelectionMode) {
                                handleToggleSelectSession(s.id);
                                playSound('pop');
                              }
                            }}
                            className={`group relative p-2 px-3 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-2.5 ${
                              isSelectionMode ? "cursor-pointer" : "cursor-default"
                            } ${
                              isSelected
                                ? "bg-rose-500/10 border-rose-500/40 text-white"
                                : isEnCurso
                                ? isNightMode
                                  ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                                  : "bg-emerald-50 border-emerald-200 text-emerald-900"
                                : isNightMode
                                ? "bg-[#181818] border-white/10 hover:border-white/20 hover:bg-[#1e1e1e]"
                                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm"
                            }`}
                          >
                            {isSelectionMode && (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleSelectSession(s.id);
                                  playSound('pop');
                                }}
                                className={`w-4 h-4 rounded-[6px] border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                                  isSelected
                                    ? "bg-rose-500 border-rose-500 text-white"
                                    : isNightMode
                                    ? "border-white/30 hover:border-white"
                                    : "border-slate-300 hover:border-slate-800"
                                }`}
                              >
                                {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </div>
                            )}

                            <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-semibold border shrink-0 ${
                                  isNightMode ? 'bg-white/5 border-white/10 text-white/70' : 'bg-slate-100 border-slate-200 text-slate-700'
                                }`}>
                                  {originBadge.icon}
                                  <span>{originBadge.label}</span>
                                </span>
                              </div>

                              <div className="text-[12px] font-bold truncate">
                                {(s as any).taskTitle || (s.task_id ? taskMap.get(String(s.task_id))?.titulo || taskMap.get(String(s.task_id))?.title : null) || s.summary || "Sesión de Trabajo"}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-right shrink-0">
                                <div className={`text-xs font-black ${isNightMode ? 'text-[#ffffffd6]' : 'text-amber-950'}`}>
                                  {s.status === "en_curso" || (!s.endTime && (s.durationMins === 0 && !(s as any).durationSeconds))
                                    ? "En curso"
                                    : formatSessionDurationDisplay(s.durationMins, (s as any).durationSeconds)}
                                </div>
                                <div className={`text-[9px] font-medium ${isNightMode ? 'text-white/30' : 'text-amber-900/60'}`}>{relTime}</div>
                              </div>

                              {!isSelectionMode && (
                                <button
                                  type="button"
                                  title="Editar duración y detalles"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingSessionData({ session: s, task, project });
                                    playSound('tick');
                                  }}
                                  className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${
                                    isNightMode 
                                      ? "bg-white/5 hover:bg-white/15 text-white/50 hover:text-white border border-white/10" 
                                      : "bg-amber-200/80 hover:bg-amber-300 text-amber-900 border border-amber-300"
                                  }`}
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. SECCIÓN INFERIOR: MÓDULO DE NOTAS */}
      <div className="flex-1 flex flex-col min-h-0 pt-2">
        
        {/* Header de Notas con Filtros a la derecha y Menú de 3 Puntos */}
        <div className="flex items-center justify-between gap-2 mb-2 px-0.5 shrink-0">
          <h3 className={`text-[14px] font-bold ${isNightMode ? 'text-[#ffffffd6]' : 'text-slate-900'}`}>
            Notas
          </h3>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Filtros de Notas a la derecha: Pendientes | Hechas */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setNoteFilter("pendientes");
                  playSound("click");
                }}
                className={`px-2.5 py-1 rounded-xl text-[12px] font-medium transition-colors cursor-pointer ${
                  noteFilter === "pendientes"
                    ? isNightMode
                      ? "bg-white/15 text-white font-bold"
                      : "bg-slate-200 text-slate-900 font-bold"
                    : isNightMode
                    ? "text-white/40 hover:text-white/70"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Pendientes
              </button>
              <button
                type="button"
                onClick={() => {
                  setNoteFilter("completadas");
                  playSound("click");
                }}
                className={`px-2.5 py-1 rounded-xl text-[12px] font-medium transition-colors cursor-pointer ${
                  noteFilter === "completadas"
                    ? isNightMode
                      ? "bg-white/15 text-white font-bold"
                      : "bg-slate-200 text-slate-900 font-bold"
                    : isNightMode
                    ? "text-white/40 hover:text-white/70"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Hechas
              </button>
            </div>

            {/* Botón 3 Puntos para Notas con opción de Papelera */}
            <div ref={notesMenuRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsNotesMenuOpen((prev) => !prev);
                  playSound("pop");
                }}
                className={`p-1.5 rounded-lg transition-colors flex items-center justify-center cursor-pointer ${
                  isNotesMenuOpen
                    ? isNightMode ? "bg-white/20 text-white" : "bg-slate-300 text-slate-900"
                    : isNightMode ? "text-white/60 hover:text-white hover:bg-white/10" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                }`}
                title="Opciones de notas"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {isNotesMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 4 }}
                    transition={{ duration: 0.12 }}
                    className={`absolute right-0 top-full mt-1.5 z-50 min-w-[200px] p-1.5 rounded-2xl shadow-2xl ${
                      isNightMode
                        ? "bg-[#181818] border border-white/15 shadow-black/90 text-white"
                        : "bg-white border border-slate-200 shadow-slate-900/20 text-slate-900"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setIsNotesTrashModalOpen(true);
                        setIsNotesMenuOpen(false);
                        playSound("click");
                      }}
                      className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer ${
                        isNightMode ? "hover:bg-white/10 text-[#ffffffd6]" : "hover:bg-slate-100 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>Papelera de notas</span>
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Contenido Dinámico de la Sección de Notas */}
        <div className="flex-1 w-full overflow-hidden min-h-[220px] flex flex-col">
          <div className="flex-1 overflow-y-auto autohide-scrollbar pr-0.5 pt-1 pb-2 space-y-2">
            {/* Tarjeta fija para Crear Nueva Nota */}
            <button
              type="button"
              onClick={handleCreateNewNote}
              className={`group w-full p-2.5 px-3.5 rounded-2xl transition-all duration-150 cursor-pointer select-none flex items-center justify-between gap-2.5 shrink-0 ${
                isNightMode
                  ? "bg-[#181818] hover:bg-[#1e1e1e] text-white/50 hover:text-white"
                  : "bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900 shadow-sm"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-4 h-4 rounded-[6px] flex items-center justify-center transition-all shrink-0 ${
                    isNightMode
                      ? "border border-dashed border-white/40 group-hover:border-white group-hover:bg-white group-hover:text-black text-white/60"
                      : "border border-dashed border-slate-400 group-hover:border-slate-800 group-hover:bg-slate-900 group-hover:text-white text-slate-600"
                  }`}
                >
                  <Plus className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span className="text-[14px] font-medium truncate">
                  Crear nueva nota...
                </span>
              </div>
              <span
                className={`text-[12px] font-medium px-2 py-0.5 rounded-full transition-opacity shrink-0 ${
                  isNightMode
                    ? "bg-white/5 text-white/40 group-hover:text-white/80"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                + Nueva
              </span>
            </button>

            {/* Tarjeta destacada si hay sesión activa en curso */}
            {activeSession && (
              <div className={`p-2.5 px-3 rounded-2xl border flex flex-col gap-1 ${
                isNightMode ? 'bg-white/5 border-white/15 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
              }`}>
                <div className="flex items-center justify-between text-[12px] font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1.5 text-white/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    En Enfoque (Timer)
                  </span>
                  <span>{formatRunningTime(activeElapsedSecs)}</span>
                </div>
                <div className="text-[14px] font-bold truncate">
                  {(activeSession as any).taskTitle || (activeSession.task_id ? taskMap.get(String(activeSession.task_id))?.titulo || taskMap.get(String(activeSession.task_id))?.title : null) || "Tarea en curso"}
                </div>
                <button
                  type="button"
                  onClick={handleCreateNewNote}
                  className="text-[12px] font-semibold text-white/70 hover:text-white flex items-center gap-1 cursor-pointer transition-colors pt-0.5"
                >
                  <Plus className="w-3 h-3" />
                  <span>Tomar apunte rápido</span>
                </button>
              </div>
            )}

            {/* Feed de Notas Squircle Filtradas */}
            {filteredNotes.length === 0 && !activeSession ? (
              <div
                onClick={handleCreateNewNote}
                className={`w-full min-h-[140px] rounded-2xl border border-dashed flex flex-col items-center justify-center p-4 text-center gap-1.5 cursor-pointer transition-all ${
                  isNightMode
                    ? "bg-white/[0.02] border-white/10 hover:border-purple-500/40 text-white/40 hover:text-purple-300"
                    : "bg-slate-50 border-slate-300 text-slate-400 hover:text-purple-600"
                }`}
              >
                <Sparkles className="w-5 h-5 opacity-60" />
                <p className="text-[14px] font-semibold">
                  {noteFilter === "completadas"
                    ? "No hay notas completadas"
                    : "No hay notas pendientes"}
                </p>
                <p className="text-[12px] max-w-[200px] leading-relaxed">
                  {noteFilter === "completadas"
                    ? "Completa notas pendientes para verlas aquí."
                    : "Haz clic en Crear nueva nota para agregar un apunte o recordatorio."}
                </p>
              </div>
            ) : (
              <DndContext
                sensors={noteSensors}
                collisionDetection={closestCorners}
                onDragStart={handleNoteDragStart}
                onDragEnd={handleNoteDragEnd}
                onDragCancel={() => setActiveDragNoteId(null)}
              >
                <SortableContext
                  items={filteredNotes.map((n) => n.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex flex-col gap-2 pb-2">
                    {filteredNotes.map((n) => (
                      <SortableNoteSquircleCard
                        key={n.id}
                        note={n}
                        projects={projects}
                        onSelect={(selected) => setExpandedNote(selected)}
                        onDelete={(id) => deleteNoteMutation.mutate(id)}
                        onTogglePin={(id) => {
                          const target = notes.find((item) => item.id === id);
                          if (target) {
                            updateNoteMutation.mutate({ id, isPinned: !target.isPinned });
                          }
                        }}
                        onToggleComplete={(id, isCompleted) => {
                          updateNoteMutation.mutate({ id, isCompleted });
                        }}
                        isNightMode={isNightMode}
                      />
                    ))}
                  </div>
                </SortableContext>

                <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
                  {activeDragNote ? (
                    <div className="scale-[1.02] shadow-2xl shadow-black/80 rounded-2xl cursor-grabbing pointer-events-none">
                      <NoteSquircleCard
                        note={activeDragNote}
                        projects={projects}
                        onSelect={() => {}}
                        isNightMode={isNightMode}
                        isActive={true}
                      />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        </div>
      </div>

      {/* MODAL EXPANDIDO DE NOTA (El Snippet UI de Alta Fidelidad) */}
      <NoteExpandedModal
        isOpen={!!expandedNote}
        onClose={() => setExpandedNote(null)}
        note={expandedNote}
        onUpdateNote={(id, updates) => {
          updateNoteMutation.mutate({ id, ...updates });
          if (expandedNote && expandedNote.id === id) {
            setExpandedNote({ ...expandedNote, ...updates });
          }
        }}
        onDeleteNote={(id) => {
          deleteNoteMutation.mutate(id);
          setExpandedNote(null);
        }}
        onConvertToTask={(noteToConvert) => {
          if (onSelectTask) {
            onSelectTask({
              title: noteToConvert.title,
              desc: noteToConvert.content,
              subtasks: noteToConvert.subtasks || [],
              projectId: noteToConvert.projectId || undefined,
            });
          }
        }}
        projects={projects}
        allTasks={allTasks}
        isNightMode={isNightMode}
      />

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
                    const taskIdStr = String(s.task_id || (s as any).taskId || "");
                    const projIdStr = String(s.project_id || (s as any).projectId || "");
                    const cleanSId = extractCleanTaskId(taskIdStr, projIdStr);
                    const task = taskMap.get(taskIdStr) || (cleanSId ? taskMap.get(cleanSId) : null);
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
                              <span>{formatSessionDurationDisplay(s.durationMins, (s as any).durationSeconds)}</span>
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
                            className="px-2.5 py-1 rounded-xl text-[12px] font-semibold bg-white/10 hover:bg-white/20 text-white transition-all flex items-center gap-1 cursor-pointer"
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

      {/* 5. MODAL DEL BASURERO / PAPELERA DE NOTAS */}
      <AnimatePresence>
        {isNotesTrashModalOpen && (
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
              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold tracking-tight">Papelera de Notas</h3>
                      <span className="px-2 py-0.5 rounded-full text-[12px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {trashNotes.length}
                      </span>
                    </div>
                    <p className={`text-[12px] mt-0.5 ${isNightMode ? "text-white/40" : "text-slate-500"}`}>
                      Las notas se eliminan automáticamente tras 30 días
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNotesTrashModalOpen(false)}
                  className={`p-1.5 rounded-full border transition-colors cursor-pointer ${
                    isNightMode
                      ? "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                      : "bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Contenido de notas eliminadas */}
              <div className="flex-1 overflow-y-auto py-3 space-y-2 custom-scrollbar pr-1 min-h-[200px] max-h-[360px]">
                {trashNotes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-2 text-white/30">
                      <Inbox className="w-6 h-6" />
                    </div>
                    <p className={`text-xs font-semibold ${isNightMode ? "text-white/60" : "text-slate-600"}`}>
                      La papelera de notas está vacía
                    </p>
                  </div>
                ) : (
                  trashNotes.map((n: any) => (
                    <div
                      key={n.id}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
                        isNightMode
                          ? "bg-white/[0.03] hover:bg-white/[0.05] border-white/5"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate tracking-tight">
                            {n.title || "Nota sin título"}
                          </div>
                          <div
                            className={`text-[10px] flex items-center gap-1.5 mt-0.5 truncate ${
                              isNightMode ? "text-white/40" : "text-slate-500"
                            }`}
                          >
                            {n.taskTitle ? (
                              <span className="font-semibold truncate max-w-[140px]">
                                {n.taskTitle}
                              </span>
                            ) : n.projectTitle ? (
                              <span className="font-semibold truncate max-w-[140px]">
                                {n.projectTitle}
                              </span>
                            ) : (
                              <span>Nota general</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Días restantes */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            n.daysRemaining <= 3
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              : "bg-white/5 text-white/50 border border-white/10"
                          }`}
                        >
                          {n.daysRemaining === 1
                            ? "1 día"
                            : `${n.daysRemaining} días`}
                        </span>

                        {/* Botón Restaurar */}
                        <button
                          type="button"
                          onClick={async () => {
                            playSound("pop");
                            await restoreNotes([n.id]);
                          }}
                          title="Restaurar nota"
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            isNightMode
                              ? "bg-white/5 border-white/10 hover:bg-emerald-500/20 hover:border-emerald-500/30 text-white/70 hover:text-emerald-400"
                              : "bg-slate-100 border-slate-200 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600"
                          }`}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        {/* Botón Eliminar Permanente */}
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm("¿Eliminar definitivamente esta nota? Esta acción no se puede deshacer.")) {
                              playSound("trash");
                              await permanentDeleteNotes([n.id]);
                            }
                          }}
                          title="Eliminar definitivamente"
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            isNightMode
                              ? "bg-white/5 border-white/10 hover:bg-rose-500/20 hover:border-rose-500/30 text-white/70 hover:text-rose-400"
                              : "bg-slate-100 border-slate-200 hover:bg-rose-50 text-slate-600 hover:text-rose-600"
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {trashNotes.length > 0 && (
                <div className="pt-3 mt-2 border-t border-white/10 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      playSound("pop");
                      await restoreNotes(trashNotes.map((n: any) => n.id));
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isNightMode
                        ? "bg-white/5 border-white/10 text-white/80 hover:text-white hover:bg-white/10"
                        : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restaurar todas</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm(`¿Vaciar completamente la papelera (${trashNotes.length} notas)?`)) {
                        playSound("trash");
                        await emptyNotesTrash();
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-200 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Vaciar papelera</span>
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE EDICIÓN AVANZADA DE SESIONES */}
      <EditSessionModal
        isOpen={!!editingSessionData}
        onClose={() => setEditingSessionData(null)}
        session={editingSessionData?.session || null}
        task={editingSessionData?.task}
        project={editingSessionData?.project}
        isNightMode={isNightMode}
        onSuccess={() => refetch()}
      />
    </div>
  );
}

