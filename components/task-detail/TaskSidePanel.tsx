"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronDown,
  ChevronUp,
  Check,
  Trash2,
  Plus,
  Maximize2,
  Clock,
  Play,
  Square,
  DollarSign,
  ExternalLink,
} from "lucide-react";
import { Project, Task } from "@/app/taski/components/ProjectDashboard";
import { getSingleSourceProjectColor, parseAnyDate, extractCleanTaskId, getCalendarDaysDiff } from "@/lib/utils";
import { playSound } from "@/app/taski/utils/audio";
import { useMembers } from "@/hooks/useMembers";
import { useUpdateTask, useDeleteTask, useCreateTask } from "@/hooks/useData";
import { useSessions, useTaskSessions } from "@/hooks/useSessions";
import { RichNoteToolbar, ActiveFormatsState } from "@/components/notes/RichNoteToolbar";
import LinearDropdownPopover from "@/app/taski/components/LinearDropdownPopover";
import LinearDatePopover from "@/app/taski/components/LinearDatePopover";
import { useTaskAccumulatedTime } from "@/app/taski/components/useTaskAccumulatedTime";
import { EffortGaugeRing } from "@/app/taski/components/EffortGaugeRing";
import { SmoothInput, SmoothTextarea } from "@/components/ui/SmoothInput";

const formatDateToFriendly = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const month = months[date.getMonth()];
  return `${day} ${month}`;
};

const MONTH_NAMES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const formatDateToFullMonth = (date: Date): string => {
  const day = date.getDate();
  const month = MONTH_NAMES_ES[date.getMonth()];
  const currentYear = new Date().getFullYear();
  if (date.getFullYear() !== currentYear) {
    return `${day} de ${month} ${date.getFullYear()}`;
  }
  return `${day} de ${month}`;
};

const formatDateToShortMonth = (date: Date): string => {
  const day = date.getDate();
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const month = months[date.getMonth()];
  const currentYear = new Date().getFullYear();
  if (date.getFullYear() !== currentYear) {
    return `${day} ${month} ${date.getFullYear()}`;
  }
  return `${day} ${month}`;
};

const formatSessionInterval = (start: any, end: any): string => {
  const dStart = parseAnyDate(start);
  const dEnd = parseAnyDate(end);
  if (!dStart) return "--:--";
  const startStr = dStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  if (!dEnd) return `${startStr} - En curso`;
  const endStr = dEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${startStr} - ${endStr}`;
};

const formatSessionDuration = (seconds?: number, start?: any, end?: any): string => {
  let sec = seconds;
  if (sec === undefined || sec === null || sec <= 0) {
    const dStart = parseAnyDate(start);
    const dEnd = parseAnyDate(end);
    if (dStart && dEnd) {
      sec = Math.max(0, Math.floor((dEnd.getTime() - dStart.getTime()) / 1000));
    } else {
      sec = 0;
    }
  }
  const hrs = Math.floor((sec || 0) / 3600);
  const mins = Math.floor(((sec || 0) % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
};


export interface TaskSidePanelProps {
  task: (Partial<Task> & { projectId?: string | number; projectName?: string; client?: string }) | null;
  projects: Project[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateTask?: (taskId: string | number, updatedData: Partial<Task>, projectId?: string | number) => void;
  onCreateTask?: (task: Task, projectId: string | number) => void;
  onDeleteTask?: (taskId: string | number, projectId?: string | number) => void;
  onSelectTask?: (task: Task) => void;
  onSelectProject?: (projectId: string | number) => void;
  onNewTask?: (projectId: string | number) => void;
  onExpandToModal?: () => void;
  isNightMode?: boolean;
}

interface SubtaskItem {
  id: number;
  text: string;
  done: boolean;
}

function convertLegacyMarkdownToHtml(text: string): string {
  if (!text || text.trim() === "" || text === "<p><br></p>") {
    return "";
  }
  if (/<(p|h1|h2|h3|ul|ol|li|b|strong|i|em|u|s|blockquote|div|span)[^>]*>/i.test(text)) {
    return text;
  }
  return text
    .replace(/^#\s+(.*)$/gm, "<h1>$1</h1>")
    .replace(/^##\s+(.*)$/gm, "<h2>$1</h2>")
    .replace(/^###\s+(.*)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
    .replace(/\*(.*?)\*/g, "<i>$1</i>")
    .replace(/^-\s+(.*)$/gm, "<li>$1</li>")
    .replace(/^>\s+(.*)$/gm, "<blockquote>$1</blockquote>")
    .replace(/\n/g, "<br>");
}

const TIME_OPTIONS = [
  { id: "15 min", label: "15 min" },
  { id: "30 min", label: "30 min" },
  { id: "45 min", label: "45 min" },
  { id: "1 hora", label: "1 hora" },
  { id: "2 horas", label: "2 horas" },
  { id: "3 horas", label: "3 horas" },
  { id: "5 horas", label: "5 horas" },
  { id: "8 horas", label: "8 horas" },
];

const FORMAT_OPTIONS = [
  { id: "Post", label: "Post" },
  { id: "Reel", label: "Reel" },
  { id: "Story", label: "Story" },
  { id: "Carrusel", label: "Carrusel" },
  { id: "Video", label: "Video" },
  { id: "Flyer", label: "Flyer" },
  { id: "Branding", label: "Branding" },
  { id: "Copywriting", label: "Copywriting" },
];

const AREA_OPTIONS = [
  { id: "Diseño", label: "Diseño" },
  { id: "Audiovisual", label: "Audiovisual" },
  { id: "Copywriting", label: "Copywriting" },
  { id: "Community", label: "Community" },
  { id: "Estrategia", label: "Estrategia" },
  { id: "Desarrollo", label: "Desarrollo" },
  { id: "Pendiente", label: "Pendiente" },
];

const PRIORITY_OPTIONS = [
  { id: "Sin prioridad", label: "Sin prioridad" },
  { id: "Urgente", label: "Urgente" },
  { id: "Alta", label: "Alta" },
  { id: "Media", label: "Media" },
  { id: "Baja", label: "Baja" },
];

const PRIORITY_POPOVER_OPTIONS = [
  { id: "Sin prioridad", label: "Sin prioridad", icon: <span className="w-2 h-2 rounded-full bg-white/30 shrink-0" /> },
  { id: "Urgente", label: "Urgente", icon: <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" /> },
  { id: "Alta", label: "Alta", icon: <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" /> },
  { id: "Media", label: "Media", icon: <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" /> },
  { id: "Baja", label: "Baja", icon: <span className="w-2 h-2 rounded-full bg-zinc-400 shrink-0" /> },
];

const STATUS_OPTIONS = [
  { id: "Planificado", label: "Planificado" },
  { id: "En Proceso", label: "En Proceso" },
  { id: "En Revisión", label: "En Revisión" },
  { id: "Completado", label: "Completado" },
];

const STATUS_POPOVER_OPTIONS = [
  { id: "Planificado", label: "Planificado", icon: <span className="w-2 h-2 rounded-full bg-white/40 shrink-0" /> },
  { id: "En Proceso", label: "En Proceso", icon: <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" /> },
  { id: "En Revisión", label: "En Revisión", icon: <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" /> },
  { id: "Completado", label: "Completado", icon: <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" /> },
];

const getPriorityDotClass = (prio: string) => {
  switch (prio) {
    case "Urgente":
      return "bg-rose-500";
    case "Alta":
      return "bg-amber-400";
    case "Media":
      return "bg-blue-400";
    case "Baja":
      return "bg-zinc-400";
    default:
      return "bg-white/30";
  }
};

const getStatusDotClass = (st: string) => {
  switch (st) {
    case "Completado":
    case "Completada":
      return "bg-emerald-400";
    case "En Proceso":
    case "En proceso":
      return "bg-amber-400";
    case "En Revisión":
    case "En revision":
      return "bg-blue-400";
    default:
      return "bg-white/40";
  }
};

export function TaskSidePanel({
  task,
  projects,
  isOpen,
  onClose,
  onUpdateTask,
  onCreateTask,
  onDeleteTask,
  onSelectTask,
  onSelectProject,
  onNewTask,
  onExpandToModal,
  isNightMode = true,
}: TaskSidePanelProps) {
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const createTaskMutation = useCreateTask();
  const { members: liveMembers } = useMembers();
  const { activeSession, startSession, endSession, endSessionForTask } = useSessions();

  // Active task state
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("Planificado");
  const [priority, setPriority] = useState("Media");
  const [time, setTime] = useState("1 hora");
  const [format, setFormat] = useState("Post");
  const [area, setArea] = useState("Diseño");
  const [asignadoId, setAsignadoId] = useState("");
  const [asignadoIds, setAsignadoIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [fechaPublicacion, setFechaPublicacion] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [subtasks, setSubtasks] = useState<SubtaskItem[]>([]);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [newSubtaskText, setNewSubtaskText] = useState("");

  // Finanzas state
  const [precio, setPrecio] = useState<number | undefined>(undefined);
  const [costo, setCosto] = useState<number | undefined>(undefined);
  const [precioInput, setPrecioInput] = useState("");
  const [costoInput, setCostoInput] = useState("");

  // Sesiones desplegable y consulta
  const [isSessionsExpanded, setIsSessionsExpanded] = useState(false);
  const { sessions: taskSessions } = useTaskSessions(task?.id ? String(task.id) : null);

  // Crear nueva tarea en el proyecto (píldora extra en la sección inferior)
  const [isAddingProjectTask, setIsAddingProjectTask] = useState(false);
  const [newProjectTaskTitle, setNewProjectTaskTitle] = useState("");
  const [isSubmittingNewTask, setIsSubmittingNewTask] = useState(false);

  // More properties accordion
  const [showMoreProps, setShowMoreProps] = useState(false);

  // Active popovers
  const [activePopover, setActivePopover] = useState<"status" | "assignee" | "date" | "header_date" | "priority" | "format" | "time" | "pub_date" | "area" | null>(null);


  // Editor WYSIWYG & Title Textarea Ref
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);
  const taskEditorRef = useRef<HTMLDivElement>(null);
  const lastLoadedTaskIdRef = useRef<string | null>(null);
  const [noteHtml, setNoteHtml] = useState("");
  const [taskBlockType, setTaskBlockType] = useState<"p" | "h1" | "h2" | "ul" | "ol" | "blockquote">("p");
  const [taskActiveFormats, setTaskActiveFormats] = useState<Partial<ActiveFormatsState>>({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    list: false,
    numbered: false,
    quote: false,
  });

  // Auto-ajustar altura del título para 1 o 2 renglones (máximo 68px)
  useEffect(() => {
    if (titleTextareaRef.current) {
      titleTextareaRef.current.style.height = "auto";
      const calculatedHeight = Math.min(titleTextareaRef.current.scrollHeight, 68);
      titleTextareaRef.current.style.height = `${Math.max(calculatedHeight, 30)}px`;
    }
  }, [title, isOpen]);

  // Resolve current project & dynamic project color
  const resolvedProjectId = task?.projectId || (task as any)?.proyecto_id || projects[0]?.id;
  const currentProject = useMemo(() => {
    return projects.find((p) => String(p.id) === String(resolvedProjectId)) || projects[0];
  }, [projects, resolvedProjectId]);

  const projectColor = useMemo(() => {
    if (currentProject) {
      return getSingleSourceProjectColor(currentProject).hslCss;
    }
    return "hsl(210, 80%, 55%)";
  }, [currentProject]);

  // Finanzas computadas reactivamente
  const currentPrecio = typeof precio === "number" ? precio : 0;
  const currentCosto = typeof costo === "number" ? costo : 0;
  const calculatedUtilidad = currentPrecio - currentCosto;

  const projectBaseBudget = useMemo(() => {
    const p = currentProject as any;
    return Number(p?.presupuestoBase ?? p?.presupuesto ?? p?.costo ?? 0);
  }, [currentProject]);

  const otherTasksPriceSum = useMemo(() => {
    if (!currentProject?.tasks) return 0;
    return currentProject.tasks.reduce((sum, t) => {
      if (!t || String(t.id) === String(task?.id)) return sum;
      return sum + (Number((t as any).precio) || 0);
    }, 0);
  }, [currentProject?.tasks, task?.id]);

  const totalProjectValue = projectBaseBudget + otherTasksPriceSum + currentPrecio;


  // Estado de expansión de otras tareas del proyecto (por defecto 3 tareas)
  const [isOtherTasksExpanded, setIsOtherTasksExpanded] = useState(false);

  // Otras tareas del mismo proyecto (excluyendo la tarea activa, no completadas primero de arriba a abajo)
  const otherProjectTasks = useMemo(() => {
    if (!currentProject?.tasks) return [];
    const filtered = currentProject.tasks.filter((t) => {
      if (!t) return false;
      return String(t.id) !== String(task?.id);
    });

    // Ordenar: No completadas primero, completadas al final
    return [...filtered].sort((a, b) => {
      const aDone = (a.status as string) === "Completado" || (a.status as string) === "Completada";
      const bDone = (b.status as string) === "Completado" || (b.status as string) === "Completada";
      if (aDone === bDone) return 0;
      return aDone ? 1 : -1;
    });
  }, [currentProject, task?.id]);

  const displayedOtherTasks = useMemo(() => {
    if (isOtherTasksExpanded) return otherProjectTasks;
    return otherProjectTasks.slice(0, 3);
  }, [otherProjectTasks, isOtherTasksExpanded]);

  // Sync state when task changes or opens
  useEffect(() => {
    if (!isOpen || !task) {
      lastLoadedTaskIdRef.current = null;
      return;
    }

    const currentTaskId = String(task.id);
    const isNewTask = lastLoadedTaskIdRef.current !== currentTaskId;

    if (isNewTask) {
      lastLoadedTaskIdRef.current = currentTaskId;

      const taskTitle = task.title || (task as any).titulo || "";
      let taskStatus = (task.status as any) || (task as any).estado || "Planificado";
      if (taskStatus === "En proceso" || taskStatus === "en_proceso") taskStatus = "En Proceso";
      if (taskStatus === "Hecho" || taskStatus === "Completada" || taskStatus === "completado") taskStatus = "Completado";
      if (taskStatus === "Revision" || taskStatus === "revision") taskStatus = "En Revisión";

      const taskPriority = (task.priority as any) || (task as any).prioridad || "Media";
      const taskFormat = (task.formato as any) || (task.format as any) || "Post";
      const taskTime = (task.time as any) || (task as any).esfuerzo || "1 hora";
      const taskArea = (task as any).area || "Diseño";
      const taskAsignadoId = (task.asignado_id as any) || (task.asignado_ids && task.asignado_ids[0]) || "";
      const taskAsignadoIds = task.asignado_ids || (task.asignado_id ? [task.asignado_id] : []);
      const taskStart = task.fecha_programada || (task as any).startDate || (task as any).fechaProg || "";
      const taskLimit = task.fecha_limite || (task as any).deadline || (task as any).fechaEntrega || "";
      const taskPub = task.fechaPublicacion || "";
      const taskAttach = task.attachmentUrl || (task as any).recursosDrive || "";
      const rawNote = task.desc || (task as any).descripcion || (task as any).contenido || (task as any).copy || "";
      const taskPrecio = typeof (task as any).precio === "number" ? (task as any).precio : undefined;
      const taskCosto = typeof (task as any).costo === "number" ? (task as any).costo : undefined;

      setTitle(taskTitle);
      setStatus(taskStatus);
      setPriority(taskPriority);
      setFormat(taskFormat);
      setTime(taskTime);
      setArea(taskArea);
      setAsignadoId(taskAsignadoId);
      setAsignadoIds(taskAsignadoIds);
      setStartDate(taskStart);
      setDeadline(taskLimit);
      setFechaPublicacion(taskPub);
      setAttachmentUrl(taskAttach);
      setSubtasks(task.subtasks || []);
      setPrecio(taskPrecio);
      setPrecioInput(taskPrecio !== undefined ? String(taskPrecio) : "");
      setCosto(taskCosto);
      setCostoInput(taskCosto !== undefined ? String(taskCosto) : "");

      const formattedHtml = convertLegacyMarkdownToHtml(rawNote);
      setNoteHtml(formattedHtml);
      if (taskEditorRef.current) {
        taskEditorRef.current.innerHTML = formattedHtml;
      }
    }
  }, [isOpen, task?.id]);

  // Tiempo acumulado en sesiones y progreso vs tiempo presupuestado
  const {
    accumulatedMins,
    accumulatedHours,
    estimatedMins,
    estimatedHours,
    consumptionPercent,
    effortSeverity,
    isExceeded,
    overrunMins,
    formattedAccumulatedTime,
    formattedEstimatedTime,
    formattedComparison,
    hasActiveSession,
  } = useTaskAccumulatedTime(
    task?.id,
    time || (task as any)?.time || (task as any)?.esfuerzo,
    null,
    (task as any)?.sessions,
    task?.id,
    resolvedProjectId
  );

  // Matching reactivo para verificar si la sesión activa corresponde a esta tarea
  const isThisTaskActive = useMemo(() => {
    if (!activeSession?.task_id || !task?.id) return false;
    const s = activeSession as any;
    const activeTaskId = String(s.task_id || s.taskId || "").trim();
    const activeProjId = String(s.project_id || s.projectId || "").trim();
    const activeCleanId = extractCleanTaskId(activeTaskId, activeProjId);

    const rawId = String(task.id).trim();
    const pId = String(resolvedProjectId || "").trim();
    const cleanId = extractCleanTaskId(rawId, pId);

    if (rawId === activeTaskId || rawId === activeCleanId) return true;
    if (cleanId && activeCleanId && cleanId === activeCleanId) return true;
    if (cleanId && cleanId === activeTaskId) return true;
    if (activeCleanId && rawId === activeCleanId) return true;
    if (rawId.endsWith(`-${activeTaskId}`) || rawId.endsWith(`-${activeCleanId}`)) return true;
    if (activeTaskId.endsWith(`-${rawId}`) || activeTaskId.endsWith(`-${cleanId}`)) return true;

    return false;
  }, [activeSession, task?.id, resolvedProjectId]);

  // Escape key handler to close panel
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        playSound("click");
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Auto-save helper to update task in memory and in Firestore
  const triggerSave = useCallback(
    (overrides: Partial<Task> = {}) => {
      if (!task?.id) return;
      const targetTaskId = task.id;
      const targetProjectId = resolvedProjectId;

      const targetPrecio = overrides.precio !== undefined ? overrides.precio : precio;
      const targetCosto = overrides.costo !== undefined ? overrides.costo : costo;
      const targetUtilidad = (targetPrecio ?? 0) - (targetCosto ?? 0);

      const payload: Partial<Task> = {
        title: overrides.title !== undefined ? overrides.title : title,
        desc: overrides.desc !== undefined ? overrides.desc : (taskEditorRef.current?.innerHTML || noteHtml),
        status: (overrides.status !== undefined ? overrides.status : status) as any,
        priority: overrides.priority !== undefined ? overrides.priority : priority,
        format: overrides.format !== undefined ? overrides.format : format,
        formato: overrides.formato !== undefined ? overrides.formato : format,
        time: overrides.time !== undefined ? overrides.time : time,
        area: overrides.area !== undefined ? overrides.area : area,
        asignado_id: overrides.asignado_id !== undefined ? overrides.asignado_id : asignadoId,
        asignado_ids: overrides.asignado_ids !== undefined ? overrides.asignado_ids : asignadoIds,
        fecha_programada: overrides.fecha_programada !== undefined ? overrides.fecha_programada : startDate,
        fecha_limite: overrides.fecha_limite !== undefined ? overrides.fecha_limite : deadline,
        deadline: overrides.fecha_limite !== undefined ? overrides.fecha_limite : deadline,
        fechaPublicacion: overrides.fechaPublicacion !== undefined ? overrides.fechaPublicacion : fechaPublicacion,
        attachmentUrl: overrides.attachmentUrl !== undefined ? overrides.attachmentUrl : attachmentUrl,
        precio: targetPrecio,
        costo: targetCosto,
        utilidad: targetUtilidad,
        subtasks: overrides.subtasks !== undefined ? overrides.subtasks : subtasks,
      };

      if (onUpdateTask) {
        onUpdateTask(targetTaskId, payload, targetProjectId);
      }

      // Firestore persistence
      updateTaskMutation.mutateAsync({
        id: String(targetTaskId),
        titulo: payload.title,
        descripcion: payload.desc,
        estado: payload.status,
        status: payload.status,
        prioridad: payload.priority,
        formato: payload.formato || payload.format,
        esfuerzo: payload.time,
        area: payload.area,
        asignado_id: payload.asignado_id,
        asignado_ids: payload.asignado_ids,
        fecha_programada: payload.fecha_programada,
        fecha_limite: payload.fecha_limite,
        fechaPublicacion: payload.fechaPublicacion,
        recursosDrive: payload.attachmentUrl,
        attachmentUrl: payload.attachmentUrl,
        precio: payload.precio,
        costo: payload.costo,
        utilidad: payload.utilidad,
        subtasks: payload.subtasks,
      } as any).catch((err) => console.error("Error saving task from SidePanel:", err));
    },
    [
      task?.id,
      resolvedProjectId,
      title,
      noteHtml,
      status,
      priority,
      format,
      time,
      area,
      asignadoId,
      asignadoIds,
      startDate,
      deadline,
      fechaPublicacion,
      attachmentUrl,
      precio,
      costo,
      subtasks,
      onUpdateTask,
      updateTaskMutation,
    ]
  );

  // Subtasks actions
  const handleToggleSubtask = (stId: number) => {
    playSound("click");
    const updated = subtasks.map((st) => (st.id === stId ? { ...st, done: !st.done } : st));
    setSubtasks(updated);
    triggerSave({ subtasks: updated });
  };

  const handleUpdateSubtaskText = (stId: number, text: string) => {
    const updated = subtasks.map((st) => (st.id === stId ? { ...st, text } : st));
    setSubtasks(updated);
  };

  const handleDeleteSubtask = (stId: number) => {
    playSound("trash");
    const updated = subtasks.filter((st) => st.id !== stId);
    setSubtasks(updated);
    triggerSave({ subtasks: updated });
  };

  const handleAddSubtask = () => {
    if (!newSubtaskText.trim()) return;
    playSound("pop");
    const newItem: SubtaskItem = {
      id: Date.now(),
      text: newSubtaskText.trim(),
      done: false,
    };
    const updated = [...subtasks, newItem];
    setSubtasks(updated);
    setNewSubtaskText("");
    setIsAddingSubtask(false);
    triggerSave({ subtasks: updated });
  };

  // Handler para crear una nueva tarea en el proyecto actual
  const handleCreateProjectTask = async () => {
    const trimmedTitle = newProjectTaskTitle.trim();
    if (!trimmedTitle || !currentProject?.id || isSubmittingNewTask) return;

    try {
      setIsSubmittingNewTask(true);
      const targetProjId = String(currentProject.id);
      const clientIds = (currentProject as any).cliente_ids || 
        ((currentProject as any).cliente_id ? [String((currentProject as any).cliente_id)] : 
        ((currentProject as any).client_id ? [String((currentProject as any).client_id)] : []));
      const primaryClientId = clientIds[0] || (currentProject as any).cliente_id || (currentProject as any).client_id || null;

      const createdDoc = await createTaskMutation.mutateAsync({
        titulo: trimmedTitle,
        title: trimmedTitle,
        descripcion: "",
        desc: "",
        proyecto_id: targetProjId,
        proyecto_ids: [targetProjId],
        cliente_id: primaryClientId,
        cliente_ids: clientIds,
        estado: "Planificado",
        status: "Planificado",
        statusColor: "#4f46e5",
        prioridad: "Media",
        priority: "Media",
        esfuerzo: "1h",
        time: "1 hora",
        formato: "Post",
        format: "Post",
        subtasks: [],
        sessions: [],
      } as any);

      const newTaskId = (createdDoc as any)?.id || "task-" + Date.now();
      const newTaskObj: Task = {
        id: newTaskId,
        title: trimmedTitle,
        desc: "",
        status: "Planificado",
        statusColor: "#4f46e5",
        priority: "Media",
        time: "1 hora",
        format: "Post",
        formato: "Post",
        subtasks: [],
        sessions: [],
      };

      if (onCreateTask) {
        onCreateTask(newTaskObj, targetProjId);
      }

      playSound("pop");
      setNewProjectTaskTitle("");
      setIsAddingProjectTask(false);
    } catch (err) {
      console.error("Error creating project task from TaskSidePanel:", err);
    } finally {
      setIsSubmittingNewTask(false);
    }
  };

  // WYSIWYG note editor handlers
  const updateTaskActiveStyles = useCallback(() => {
    if (typeof window === "undefined" || !document) return;
    try {
      const isBold = document.queryCommandState("bold");
      const isItalic = document.queryCommandState("italic");
      const isUnderline = document.queryCommandState("underline");
      const isStrike = document.queryCommandState("strikethrough");
      const isUl = document.queryCommandState("insertUnorderedList");
      const isOl = document.queryCommandState("insertOrderedList");

      setTaskActiveFormats({
        bold: isBold,
        italic: isItalic,
        underline: isUnderline,
        strikeThrough: isStrike,
        list: isUl,
        numbered: isOl,
        quote: false,
      });

      const sel = window.getSelection();
      if (sel && sel.anchorNode) {
        let node: Node | null = sel.anchorNode;
        let foundBlock: "p" | "h1" | "h2" | "ul" | "ol" | "blockquote" = "p";
        while (node && node !== taskEditorRef.current) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const tag = (node as HTMLElement).tagName.toLowerCase();
            if (["h1", "h2", "blockquote", "ul", "ol"].includes(tag)) {
              foundBlock = tag as any;
              break;
            }
          }
          node = node.parentNode;
        }
        setTaskBlockType(foundBlock);
      }
    } catch {}
  }, []);

  const handleTaskFormatClick = (fmt: "bold" | "italic" | "underline" | "strikeThrough" | "list" | "numbered" | "quote") => {
    if (!taskEditorRef.current) return;
    taskEditorRef.current.focus();

    if (fmt === "bold") document.execCommand("bold", false);
    else if (fmt === "italic") document.execCommand("italic", false);
    else if (fmt === "underline") document.execCommand("underline", false);
    else if (fmt === "strikeThrough") document.execCommand("strikeThrough", false);
    else if (fmt === "list") document.execCommand("insertUnorderedList", false);
    else if (fmt === "numbered") document.execCommand("insertOrderedList", false);
    else if (fmt === "quote") document.execCommand("formatBlock", false, "<blockquote>");

    updateTaskActiveStyles();
    triggerSave({ desc: taskEditorRef.current.innerHTML });
  };

  const handleTaskBlockTypeChange = (type: "p" | "h1" | "h2" | "ul" | "ol" | "blockquote") => {
    if (!taskEditorRef.current) return;
    taskEditorRef.current.focus();

    if (type === "p") document.execCommand("formatBlock", false, "<p>");
    else if (type === "h1") document.execCommand("formatBlock", false, "<h1>");
    else if (type === "h2") document.execCommand("formatBlock", false, "<h2>");
    else if (type === "blockquote") document.execCommand("formatBlock", false, "<blockquote>");
    else if (type === "ul") document.execCommand("insertUnorderedList", false);
    else if (type === "ol") document.execCommand("insertOrderedList", false);

    setTaskBlockType(type);
    updateTaskActiveStyles();
    triggerSave({ desc: taskEditorRef.current.innerHTML });
  };

  const completedSubtasksCount = subtasks.filter((s) => s.done).length;

  if (!isOpen || !task) return null;

  // Resolve Assignee name
  const currentMember = liveMembers.find((m) => String(m.id) === String(asignadoId));
  const assigneeName = currentMember ? currentMember.nombre : "Sin asignar";

  // Delivery calculation matching TaskCard
  const rawTaskLimit = deadline || task?.fecha_limite || (task as any)?.deadline || (task as any)?.fechaEntrega;
  const rawProjectLimit =
    (currentProject as any)?.fecha_limite ||
    (currentProject as any)?.fechaEntrega ||
    (currentProject as any)?.endDate ||
    (currentProject as any)?.fechaInicio ||
    (currentProject as any)?.fecha_inicio ||
    (currentProject as any)?.startDate ||
    (currentProject as any)?.fecha;

  const limitDate = parseAnyDate(rawTaskLimit) || parseAnyDate(rawProjectLimit);

  let deliveryPrefix = "";
  let deliveryHighlight = "Sin fecha";
  let deliveryHighlightColor = "text-[#ffffff6b]";

  if (limitDate) {
    const diffLimitDays = getCalendarDaysDiff(limitDate);

    if (diffLimitDays < 0) {
      const overdue = Math.abs(diffLimitDays);
      deliveryPrefix = "Atrasada ";
      deliveryHighlight = `${overdue} ${overdue === 1 ? "día" : "días"}`;
      deliveryHighlightColor = "text-rose-400 font-medium";
    } else if (diffLimitDays === 0) {
      deliveryPrefix = "Entrega ";
      deliveryHighlight = "hoy";
      deliveryHighlightColor = "text-amber-400 font-medium";
    } else if (diffLimitDays === 1) {
      deliveryPrefix = "Entrega ";
      deliveryHighlight = "mañana";
      deliveryHighlightColor = "text-[#ffffffd6] font-medium";
    } else {
      deliveryPrefix = "Entrega en ";
      deliveryHighlight = `${diffLimitDays} ${diffLimitDays === 1 ? "día" : "días"}`;
      deliveryHighlightColor = "text-[#ffffffd6] font-medium";
    }
  }

  // Fechas formateadas con mes completo
  const rawCreation =
    (task as any)?.fecha_creacion ||
    (task as any)?.createdAt ||
    (task as any)?.created_at ||
    (task as any)?.created;
  const creationDate = parseAnyDate(rawCreation);
  const formattedCreation = creationDate ? formatDateToShortMonth(creationDate) : "Reciente";

  const formattedDelivery = limitDate ? formatDateToShortMonth(limitDate) : "Sin fecha";

  const rawProgramada =
    startDate ||
    (task as any)?.fecha_programada ||
    (task as any)?.fechaProg ||
    (task as any)?.startDate;
  const programadaDate = parseAnyDate(rawProgramada);
  const formattedProgramada = programadaDate ? formatDateToFullMonth(programadaDate) : "Sin programar";

  return (
    <aside
      className="w-full shrink-0 h-full flex flex-col bg-transparent overflow-hidden relative z-40 select-none font-sans"
    >
      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pt-0.5 pb-[0.625rem] px-1 flex flex-col justify-between min-h-full">
        {/* Contenido Superior (Encabezado, Propiedades, Notas, Subtareas) */}
        <div className="space-y-2 w-full shrink-0">
          {/* ───────────────────────────────────────────────────────────────── */}
          {/* 1. ENCABEZADO — ÚNICO RECTÁNGULO CONTENEDOR CON COLOR DEL PROYECTO */}
          {/* ───────────────────────────────────────────────────────────────── */}
          <div
            className="w-full shrink-0 rounded-[18px] px-3.5 py-4 relative flex flex-col items-center justify-center text-center overflow-hidden shadow-sm transition-all group/card gap-1"
            style={{ backgroundColor: projectColor }}
          >
            {/* Botón Colapsar Panel: Solo visible al hacer hover en el rectángulo */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                playSound("click");
                onClose();
              }}
              className="absolute top-2 left-2 w-10 h-10 flex items-center justify-center rounded-xl text-white/80 hover:text-white hover:bg-white/20 opacity-0 group-hover/card:opacity-100 pointer-events-none group-hover/card:pointer-events-auto transition-all duration-200 cursor-pointer z-10 group/btn"
              title="Colapsar panel (Esc)"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="object-contain text-white/80 group-hover/btn:text-white transition-colors duration-200"
              >
                <rect width="18" height="18" x="3" y="3" rx="5" />
                <path d="M15 3v18" />
                <path d="m10 9 3 3-3 3" />
              </svg>
            </button>

            {/* Nombre del Proyecto: 14px (Arriba del título con enlace interactivo al proyecto) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                playSound("click");
                onSelectProject?.(currentProject.id);
              }}
              className="text-[14px] font-medium text-white/80 hover:text-white normal-case tracking-normal text-center leading-snug truncate max-w-[78%] hover:underline cursor-pointer transition-colors"
              title={`Ir al proyecto: ${currentProject?.title || "Proyecto"}`}
            >
              {currentProject?.title || "Proyecto"}
            </button>

            {/* Título de la Tarea: 25px con Smooth Caret elástico */}
            <SmoothTextarea
              ref={titleTextareaRef}
              value={title}
              unstyled
              wrapperClassName="w-full max-w-[78%] mx-auto"
              caretClassName="bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]"
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleTextareaRef.current) {
                  titleTextareaRef.current.style.height = "auto";
                  const calculatedHeight = Math.min(titleTextareaRef.current.scrollHeight, 68);
                  titleTextareaRef.current.style.height = `${Math.max(calculatedHeight, 30)}px`;
                }
              }}
              onBlur={() => triggerSave({ title })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
              placeholder="Título de la tarea..."
              rows={1}
              className="w-full bg-transparent text-[25px] font-bold text-white text-center placeholder-white/60 outline-none border-none ring-0 p-0 leading-tight focus:outline-none focus:ring-0 my-0.5 resize-none overflow-hidden select-text max-h-[68px]"
            />

            {/* Fila integrada: Creado el (izq) y Entrega el (der) dentro del rectángulo de color (sin separador) */}
            <div className="w-full flex items-center justify-between mt-2.5 select-none text-[12px]">
              {/* Izquierda: Creado el [Día] [Mes 3 letras] */}
              <div className="flex items-center text-white/70 font-normal shrink-0">
                <span>{creationDate ? `Creado el ${formattedCreation}` : "Creado recientemente"}</span>
              </div>

              {/* Derecha: Entrega el [Día] [Mes 3 letras] (Clickeable con hover:underline) */}
              <div className="relative flex items-center gap-1 text-white/70 font-normal shrink-0">
                <span>{limitDate ? "Entrega el" : "Entrega"}</span>
                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setActivePopover(activePopover === "header_date" ? null : "header_date");
                  }}
                  className="text-white font-medium hover:underline cursor-pointer transition-colors focus:outline-none"
                  title="Cambiar fecha de entrega"
                >
                  {formattedDelivery}
                </button>
                <LinearDatePopover
                  isOpen={activePopover === "header_date"}
                  onClose={() => setActivePopover(null)}
                  align="right"
                  startDate={startDate}
                  deadline={deadline}
                  onSelectDates={(start, end) => {
                    setStartDate(start);
                    setDeadline(end);
                    triggerSave({ fecha_programada: start, fecha_limite: end, deadline: end });
                  }}
                />
              </div>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────────── */}
          {/* MÉTRICAS DE TAREA: ENTREGA/ATRASADA (IZQ) Y CONTADOR DE TIEMPO (DER) */}
          {/* ───────────────────────────────────────────────────────────────── */}
          <div className="w-full flex items-center justify-between px-1.5 py-1 min-w-0 shrink-0 select-none">
            {/* Izquierda: Entrega o atrasada relativa (idéntico a tarjeta de tarea) */}
            <div className="flex items-center text-[#ffffff6b] font-normal shrink-0 min-w-0">
              <span className="text-[12px] sm:text-[13px] font-normal leading-none whitespace-nowrap">
                {deliveryPrefix}
                <span className={deliveryHighlightColor}>{deliveryHighlight}</span>
              </span>
            </div>

            {/* Derecha: Contador de tiempo y esfuerzo (Clickeable para iniciar/detener sesión) */}
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                playSound("click");
                if (isThisTaskActive) {
                  await endSession();
                } else if (task?.id) {
                  await startSession({
                    taskId: String(task.id),
                    projectId: String(resolvedProjectId || "1"),
                    clientId: (currentProject as any)?.cliente_id || null,
                    origin: "manual",
                  });
                  setStatus("En Proceso");
                  triggerSave({ status: "En Proceso" as any, estado: "En Proceso" as any });
                }
              }}
              className="flex items-center gap-1.5 shrink-0 cursor-pointer hover:opacity-85 transition-opacity focus:outline-none"
              title={isThisTaskActive ? "Detener cronómetro en esta tarea" : `Iniciar cronómetro (${formattedAccumulatedTime} / ${formattedEstimatedTime})`}
            >
              <EffortGaugeRing
                progress={consumptionPercent}
                severity={effortSeverity}
                size={13}
                strokeWidth={1.75}
                showCenterDot={true}
                className="shrink-0"
              />
              <span
                className={`text-[12px] font-medium leading-none tabular-nums tracking-tight ${
                  isExceeded
                    ? "text-rose-400 font-semibold"
                    : effortSeverity === "mid"
                    ? "text-amber-400"
                    : "text-[#ffffffd6]"
                }`}
              >
                {formattedAccumulatedTime} / {formattedEstimatedTime}
              </span>
            </button>
          </div>

          {/* ───────────────────────────────────────────────────────────────── */}
          {/* 2. PROPIEDADES DE LA TAREA (Texto a la izquierda, Píldora a la derecha) */}
          {/* ───────────────────────────────────────────────────────────────── */}
          <div className="w-full flex flex-col divide-y divide-white/5 pt-0.5">
            {/* 1. Duración (Visible por defecto) */}
            <div className="flex items-center justify-between py-1.5 min-h-[36px] w-full">
              <span className="text-[13px] font-medium text-[#ffffff6b]">Duración</span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setActivePopover(activePopover === "time" ? null : "time");
                  }}
                  className={`h-[28px] flex items-center gap-1.5 px-3 rounded-full border text-[12px] font-medium transition-colors cursor-pointer ${
                    activePopover === "time"
                      ? "bg-white/10 border-white/30 text-white"
                      : "bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-white/90"
                  }`}
                  title={time || "1 hora"}
                >
                  <span className="truncate max-w-[140px]">{time || "1 hora"}</span>
                </button>
                <LinearDropdownPopover
                  isOpen={activePopover === "time"}
                  onClose={() => setActivePopover(null)}
                  placeholder="Cambiar duración…"
                  shortcutKey="D"
                  align="right"
                  selectedValue={time}
                  onSelect={(val) => {
                    setTime(val);
                    triggerSave({ time: val });
                  }}
                  options={TIME_OPTIONS}
                />
              </div>
            </div>

            {/* 2. Formato (Visible por defecto) */}
            <div className="flex items-center justify-between py-1.5 min-h-[36px] w-full">
              <span className="text-[13px] font-medium text-[#ffffff6b]">Formato</span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setActivePopover(activePopover === "format" ? null : "format");
                  }}
                  className={`h-[28px] flex items-center gap-1.5 px-3 rounded-full border text-[12px] font-medium transition-colors cursor-pointer ${
                    activePopover === "format"
                      ? "bg-white/10 border-white/30 text-white"
                      : "bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-white/90"
                  }`}
                  title={format || "Post"}
                >
                  <span className="truncate max-w-[140px]">{format || "Post"}</span>
                </button>
                <LinearDropdownPopover
                  isOpen={activePopover === "format"}
                  onClose={() => setActivePopover(null)}
                  placeholder="Cambiar formato…"
                  shortcutKey="F"
                  align="right"
                  selectedValue={format}
                  onSelect={(val) => {
                    setFormat(val);
                    triggerSave({ format: val, formato: val });
                  }}
                  options={FORMAT_OPTIONS}
                />
              </div>
            </div>

            {/* 3. Programada (Visible por defecto - Texto limpio en el fondo) */}
            <div className="flex items-center justify-between py-1.5 min-h-[36px] w-full">
              <span className="text-[13px] font-medium text-[#ffffff6b]">Programada</span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setActivePopover(activePopover === "date" ? null : "date");
                  }}
                  className="text-[12px] font-medium text-white hover:underline cursor-pointer transition-colors py-1 px-1 focus:outline-none"
                  title={`Fecha programada: ${formattedProgramada}`}
                >
                  <span className="truncate max-w-[160px]">{formattedProgramada}</span>
                </button>
                <LinearDatePopover
                  isOpen={activePopover === "date"}
                  onClose={() => setActivePopover(null)}
                  align="right"
                  startDate={startDate}
                  deadline={deadline}
                  onSelectDates={(start, end) => {
                    setStartDate(start);
                    setDeadline(end);
                    triggerSave({ fecha_programada: start, fecha_limite: end, deadline: end });
                  }}
                />
              </div>
            </div>

            {/* Opciones adicionales desplegadas con 'Mostrar más' (Estado, Prioridad, Responsable, etc. + Finanzas) */}
            {showMoreProps && (
              <>
                {/* Estado */}
                <div className="flex items-center justify-between py-1.5 min-h-[36px] w-full">
                  <span className="text-[13px] font-medium text-[#ffffff6b]">Estado</span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        playSound("click");
                        setActivePopover(activePopover === "status" ? null : "status");
                      }}
                      className={`h-[28px] flex items-center gap-1.5 px-3 rounded-full border text-[12px] font-medium transition-colors cursor-pointer ${
                        activePopover === "status"
                          ? "bg-white/10 border-white/30 text-white"
                          : "bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-white/90"
                      }`}
                      title={status || "Estado"}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getStatusDotClass(status)}`} />
                      <span className="truncate max-w-[140px]">{status || "Estado"}</span>
                    </button>
                    <LinearDropdownPopover
                      isOpen={activePopover === "status"}
                      onClose={() => setActivePopover(null)}
                      placeholder="Cambiar estado…"
                      shortcutKey="S"
                      align="right"
                      selectedValue={status}
                      onSelect={async (val) => {
                        setStatus(val);
                        if (val === "Completado" && task?.id) {
                          try {
                            await endSessionForTask(task.id);
                          } catch (e) {
                            console.warn("Error finalizando sesión al completar:", e);
                          }
                        }
                        triggerSave({ status: val as any, estado: val as any });
                      }}
                      options={STATUS_POPOVER_OPTIONS}
                    />
                  </div>
                </div>

                {/* Prioridad */}
                <div className="flex items-center justify-between py-1.5 min-h-[36px] w-full">
                  <span className="text-[13px] font-medium text-[#ffffff6b]">Prioridad</span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        playSound("click");
                        setActivePopover(activePopover === "priority" ? null : "priority");
                      }}
                      className={`h-[28px] flex items-center gap-1.5 px-3 rounded-full border text-[12px] font-medium transition-colors cursor-pointer ${
                        activePopover === "priority"
                          ? "bg-white/10 border-white/30 text-white"
                          : "bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-white/90"
                      }`}
                      title={priority || "Media"}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getPriorityDotClass(priority)}`} />
                      <span className="truncate max-w-[140px]">{priority || "Media"}</span>
                    </button>
                    <LinearDropdownPopover
                      isOpen={activePopover === "priority"}
                      onClose={() => setActivePopover(null)}
                      placeholder="Cambiar prioridad…"
                      shortcutKey="P"
                      align="right"
                      selectedValue={priority}
                      onSelect={(val) => {
                        setPriority(val);
                        triggerSave({ priority: val });
                      }}
                      options={PRIORITY_POPOVER_OPTIONS}
                    />
                  </div>
                </div>

                {/* Responsable (Asignado) */}
                <div className="flex items-center justify-between py-1.5 min-h-[36px] w-full">
                  <span className="text-[13px] font-medium text-[#ffffff6b]">Responsable</span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        playSound("click");
                        setActivePopover(activePopover === "assignee" ? null : "assignee");
                      }}
                      className={`h-[28px] flex items-center gap-1.5 px-3 rounded-full border text-[12px] font-medium transition-colors cursor-pointer ${
                        activePopover === "assignee"
                          ? "bg-white/10 border-white/30 text-white"
                          : "bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-white/90"
                      }`}
                      title={assigneeName}
                    >
                      <span className="truncate max-w-[140px]">{assigneeName}</span>
                    </button>
                    <LinearDropdownPopover
                      isOpen={activePopover === "assignee"}
                      onClose={() => setActivePopover(null)}
                      placeholder="Asignar miembro…"
                      shortcutKey="A"
                      align="right"
                      selectedValue={asignadoId}
                      onSelect={(val) => {
                        setAsignadoId(val);
                        setAsignadoIds(val ? [val] : []);
                        triggerSave({ asignado_id: val, asignado_ids: val ? [val] : [] });
                      }}
                      options={[
                        { id: "", label: "Sin asignar" },
                        ...liveMembers.map((m) => ({ id: m.id, label: m.nombre, badge: m.rol })),
                      ]}
                    />
                  </div>
                </div>

                {/* Publicación */}
                <div className="flex items-center justify-between py-1.5 min-h-[36px] w-full">
                  <span className="text-[13px] font-medium text-[#ffffff6b]">Publicación</span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        playSound("click");
                        setActivePopover(activePopover === "pub_date" ? null : "pub_date");
                      }}
                      className={`h-[28px] flex items-center gap-1.5 px-3 rounded-full border text-[12px] font-medium transition-colors cursor-pointer ${
                        activePopover === "pub_date"
                          ? "bg-white/10 border-white/30 text-white"
                          : "bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-white/90"
                      }`}
                      title={fechaPublicacion ? formatDateToFriendly(parseAnyDate(fechaPublicacion) || new Date()) : "Sin programar"}
                    >
                      <span className="truncate max-w-[140px]">
                        {fechaPublicacion ? formatDateToFriendly(parseAnyDate(fechaPublicacion) || new Date()) : "Sin programar"}
                      </span>
                    </button>
                    <LinearDatePopover
                      isOpen={activePopover === "pub_date"}
                      onClose={() => setActivePopover(null)}
                      align="right"
                      startDate={fechaPublicacion}
                      deadline={fechaPublicacion}
                      onSelectDates={(start) => {
                        setFechaPublicacion(start);
                        triggerSave({ fechaPublicacion: start });
                      }}
                    />
                  </div>
                </div>

                {/* Área */}
                <div className="flex items-center justify-between py-1.5 min-h-[36px] w-full">
                  <span className="text-[13px] font-medium text-[#ffffff6b]">Área</span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        playSound("click");
                        setActivePopover(activePopover === "area" ? null : "area");
                      }}
                      className={`h-[28px] flex items-center gap-1.5 px-3 rounded-full border text-[12px] font-medium transition-colors cursor-pointer ${
                        activePopover === "area"
                          ? "bg-white/10 border-white/30 text-white"
                          : "bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-white/90"
                      }`}
                      title={area || "Diseño"}
                    >
                      <span className="truncate max-w-[140px]">{area || "Diseño"}</span>
                    </button>
                    <LinearDropdownPopover
                      isOpen={activePopover === "area"}
                      onClose={() => setActivePopover(null)}
                      placeholder="Seleccionar área…"
                      align="right"
                      selectedValue={area}
                      onSelect={(val) => {
                        setArea(val);
                        triggerSave({ area: val });
                      }}
                      options={AREA_OPTIONS}
                    />
                  </div>
                </div>

                {/* Enlace Drive */}
                <div className="flex items-center justify-between py-1.5 min-h-[36px] w-full">
                  <span className="text-[13px] font-medium text-[#ffffff6b]">Enlace Drive</span>
                  <div className="flex items-center gap-1.5 flex-1 max-w-[180px] justify-end">
                    <SmoothInput
                      type="url"
                      unstyled
                      placeholder="Pegar enlace..."
                      value={attachmentUrl}
                      onChange={(e) => setAttachmentUrl(e.target.value)}
                      onBlur={() => triggerSave({ attachmentUrl })}
                      wrapperClassName="h-[28px] w-full px-2.5 rounded-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] focus-within:border-white/30 transition-colors"
                      className="text-[12px] text-white placeholder-white/30 truncate"
                    />
                    {attachmentUrl && (
                      <a
                        href={attachmentUrl.startsWith("http") ? attachmentUrl : `https://${attachmentUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-7 h-7 shrink-0 rounded-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.1] text-white/60 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                        title="Abrir en Drive"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Fila: Sesiones (con desplegable para ver sesiones registradas) */}
                <div className="flex flex-col py-1.5 min-h-[36px] w-full">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[13px] font-medium text-[#ffffff6b]">Sesiones</span>
                    <button
                      type="button"
                      onClick={() => {
                        playSound("click");
                        setIsSessionsExpanded((prev) => !prev);
                      }}
                      className={`h-[28px] flex items-center gap-1.5 px-3 rounded-full border text-[12px] font-medium transition-colors cursor-pointer ${
                        isSessionsExpanded
                          ? "bg-white/10 border-white/30 text-white"
                          : "bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-white/90"
                      }`}
                      title={isSessionsExpanded ? "Ocultar sesiones" : "Ver sesiones registradas"}
                    >
                      <Clock className="w-3 h-3 text-white/60 shrink-0" />
                      <span>{taskSessions.length} {taskSessions.length === 1 ? "registrada" : "registradas"}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-white/50 transition-transform duration-200 ${
                          isSessionsExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>

                  {/* Lista desplegable de sesiones */}
                  <AnimatePresence>
                    {isSessionsExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden pt-2 space-y-1.5"
                      >
                        {taskSessions.length === 0 ? (
                          <p className="text-[12px] text-white/35 italic py-1 px-1">
                            No hay sesiones registradas aún para esta tarea.
                          </p>
                        ) : (
                          <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                            {taskSessions.map((session, idx) => {
                              const s = session as any;
                              const worker = liveMembers.find(
                                (m) => String(m.id) === String(s.workerId || s.worker_id || s.userId || s.user_id)
                              );
                              const workerName = worker?.nombre || s.workerName || s.userName || "Colaborador";
                              const intervalText = formatSessionInterval(s.startTime || s.start_time, s.endTime || s.end_time);
                              const durationText = formatSessionDuration(s.durationSeconds || s.duration_seconds, s.startTime || s.start_time, s.endTime || s.end_time);

                              return (
                                <div
                                  key={s.id || `session-${idx}`}
                                  className="rounded-xl bg-white/[0.03] border border-white/5 px-2.5 py-1.5 flex items-center justify-between text-xs transition-colors hover:bg-white/[0.05]"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                    <span className="font-medium text-white/90 truncate max-w-[100px]" title={workerName}>
                                      {workerName}
                                    </span>
                                    <span className="text-[11px] text-[#ffffff6b] tabular-nums truncate">
                                      {intervalText}
                                    </span>
                                  </div>
                                  <span className="text-[12px] font-semibold text-[#ffffffd6] tabular-nums shrink-0 ml-2">
                                    {durationText}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Sección de Finanzas de la Tarea (Oculta dentro de 'Mostrar más') */}
                <div className="w-full pt-2.5 pb-1 space-y-2">
                  <div className="flex items-center justify-between px-0.5">
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-white/50 shrink-0" />
                      <span className="text-[12px] font-semibold text-white/70 uppercase tracking-wider">
                        Finanzas
                      </span>
                    </div>
                    <div className="text-[11px] text-[#ffffff8c]" title="Presupuesto base del proyecto + extras de tareas">
                      <span>Total Proyecto: </span>
                      <span className="font-semibold text-white">${totalProjectValue.toLocaleString("en-US")}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {/* Precio */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-medium text-[#ffffff6b] px-1">Precio</span>
                      <div className="h-[32px] rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] focus-within:border-white/30 px-2.5 flex items-center gap-1 transition-colors">
                        <span className="text-xs text-white/40 font-medium">$</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0"
                          value={precioInput}
                          onChange={(e) => {
                            setPrecioInput(e.target.value);
                            const parsed = e.target.value.trim() === "" ? undefined : parseFloat(e.target.value);
                            setPrecio(isNaN(parsed as any) ? undefined : parsed);
                          }}
                          onBlur={() => {
                            const parsed = precioInput.trim() === "" ? undefined : parseFloat(precioInput);
                            const finalPrecio = isNaN(parsed as any) ? undefined : parsed;
                            setPrecio(finalPrecio);
                            triggerSave({ precio: finalPrecio });
                          }}
                          className="w-full bg-transparent text-[12px] font-medium text-white placeholder-white/20 outline-none border-none ring-0 p-0 tabular-nums focus:outline-none focus:ring-0"
                        />
                      </div>
                    </div>

                    {/* Costo */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-medium text-[#ffffff6b] px-1">Costo</span>
                      <div className="h-[32px] rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] focus-within:border-white/30 px-2.5 flex items-center gap-1 transition-colors">
                        <span className="text-xs text-white/40 font-medium">$</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0"
                          value={costoInput}
                          onChange={(e) => {
                            setCostoInput(e.target.value);
                            const parsed = e.target.value.trim() === "" ? undefined : parseFloat(e.target.value);
                            setCosto(isNaN(parsed as any) ? undefined : parsed);
                          }}
                          onBlur={() => {
                            const parsed = costoInput.trim() === "" ? undefined : parseFloat(costoInput);
                            const finalCosto = isNaN(parsed as any) ? undefined : parsed;
                            setCosto(finalCosto);
                            triggerSave({ costo: finalCosto });
                          }}
                          className="w-full bg-transparent text-[12px] font-medium text-white placeholder-white/20 outline-none border-none ring-0 p-0 tabular-nums focus:outline-none focus:ring-0"
                        />
                      </div>
                    </div>

                    {/* Utilidad */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-medium text-[#ffffff6b] px-1">Utilidad</span>
                      <div
                        className="h-[32px] rounded-xl border border-white/10 bg-white/[0.02] px-2.5 flex items-center justify-between select-none"
                        title={`Utilidad = Precio ($${currentPrecio}) - Costo ($${currentCosto})`}
                      >
                        <span
                          className={`text-[12px] font-semibold tabular-nums truncate ${
                            calculatedUtilidad > 0
                              ? "text-emerald-400"
                              : calculatedUtilidad < 0
                              ? "text-rose-400"
                              : "text-white/50"
                          }`}
                        >
                          {calculatedUtilidad > 0 ? "+" : ""}${calculatedUtilidad.toLocaleString("en-US")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Desglose explicativo sutil */}
                  <div className="text-[10px] text-white/35 flex items-center justify-between px-1">
                    <span>Base: ${projectBaseBudget.toLocaleString("en-US")}</span>
                    <span>Tareas extras: ${(otherTasksPriceSum + currentPrecio).toLocaleString("en-US")}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Fila Inferior de Propiedades: Más opciones / Eliminar */}
          <div className="flex items-center justify-between pt-0.5 text-xs">
            <button
              type="button"
              onClick={() => {
                playSound("click");
                setShowMoreProps(!showMoreProps);
              }}
              className="text-[12px] font-medium text-white/40 hover:text-white/80 flex items-center gap-1 cursor-pointer transition-colors"
            >
              {showMoreProps ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Menos opciones</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Más opciones</span>
                </>
              )}
            </button>

            {onDeleteTask && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("¿Deseas eliminar esta tarea permanentemente?")) {
                    playSound("trash");
                    onDeleteTask(task.id!, resolvedProjectId);
                    onClose();
                  }
                }}
                className="text-[12px] font-medium text-rose-400/70 hover:text-rose-400 flex items-center gap-1 cursor-pointer transition-colors px-1 py-0.5"
                title="Eliminar tarea"
              >
                <Trash2 className="w-3 h-3" />
                <span>Eliminar tarea</span>
              </button>
            )}
          </div>

          <div className="h-px bg-white/5 my-1" />

          {/* ───────────────────────────────────────────────────────────────── */}
          {/* 4. EDITOR DE NOTAS CENTRAL (Texto limpio sin contenedores extra)  */}
          {/* ───────────────────────────────────────────────────────────────── */}
          <div className="space-y-2">
            {/* Barra de Formato WYSIWYG Sutil */}
            <RichNoteToolbar
              currentBlockType={taskBlockType}
              onBlockTypeChange={handleTaskBlockTypeChange}
              onFormatClick={handleTaskFormatClick}
              activeFormats={taskActiveFormats}
              isNightMode={isNightMode}
              className="border-b border-white/5 pb-1"
            />

            {/* Lienzo de Escritura WYSIWYG */}
            <div
              ref={taskEditorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={() => {
                if (taskEditorRef.current) {
                  setNoteHtml(taskEditorRef.current.innerHTML);
                }
                updateTaskActiveStyles();
              }}
              onBlur={() => {
                if (taskEditorRef.current) {
                  const newHtml = taskEditorRef.current.innerHTML;
                  setNoteHtml(newHtml);
                  triggerSave({ desc: newHtml });
                }
              }}
              onKeyUp={updateTaskActiveStyles}
              onMouseUp={updateTaskActiveStyles}
              onSelect={updateTaskActiveStyles}
              className="w-full min-h-[140px] bg-transparent outline-none border-none ring-0 focus:outline-none focus:ring-0 select-text text-[14px] leading-relaxed text-[#ffffffd6] [&_h1]:text-[20px] [&_h1]:font-bold [&_h1]:text-white [&_h1]:my-2 [&_h2]:text-[16px] [&_h2]:font-semibold [&_h2]:text-white/90 [&_h2]:my-1.5 [&_p]:my-1 [&_p]:text-[14px] [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1 [&_blockquote]:border-l-2 [&_blockquote]:border-white/30 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:my-2 [&_blockquote]:text-white/70"
              data-placeholder="Escribe los detalles o notas de la entrega…"
            />
          </div>

          <div className="h-px bg-white/5 my-1" />

          {/* ───────────────────────────────────────────────────────────────── */}
          {/* 5. SUBTAREAS / CHECKLIST (Texto limpio)                           */}
          {/* ───────────────────────────────────────────────────────────────── */}
          <div className="space-y-2 pb-2">
            <div className="flex items-center justify-between text-xs text-white/60 font-medium">
              <span>Subtareas</span>
              {subtasks.length > 0 && (
                <span>
                  {completedSubtasksCount} de {subtasks.length}
                </span>
              )}
            </div>

            {/* Barra de progreso de subtareas */}
            {subtasks.length > 0 && (
              <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-300"
                  style={{
                    width: `${(completedSubtasksCount / Math.max(1, subtasks.length)) * 100}%`,
                  }}
                />
              </div>
            )}

            {/* Lista de subtareas */}
            <div className="flex flex-col gap-1.5">
              <AnimatePresence>
                {subtasks.map((st) => (
                  <motion.div
                    layout
                    key={st.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center justify-between gap-2 text-[14px] group py-0.5"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleSubtask(st.id)}
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                          st.done ? "bg-emerald-500 text-black" : "border border-white/30 hover:border-white/60"
                        }`}
                      >
                        {st.done && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </button>

                      <SmoothInput
                        type="text"
                        unstyled
                        value={st.text}
                        onChange={(e) => handleUpdateSubtaskText(st.id, e.target.value)}
                        onBlur={() => triggerSave({ subtasks })}
                        wrapperClassName="flex-1"
                        className={`text-[14px] ${
                          st.done ? "line-through text-white/40" : "text-white/90"
                        }`}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteSubtask(st.id)}
                      className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-rose-400 transition-all cursor-pointer p-0.5"
                      title="Eliminar subtarea"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Añadir subtarea */}
              {!isAddingSubtask ? (
                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setIsAddingSubtask(true);
                  }}
                  className="text-[12px] text-white/50 hover:text-white flex items-center gap-1.5 pt-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir subtarea</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 pt-1">
                  <SmoothInput
                    type="text"
                    autoFocus
                    unstyled
                    placeholder="Descripción de la subtarea..."
                    value={newSubtaskText}
                    onChange={(e) => setNewSubtaskText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddSubtask();
                      if (e.key === "Escape") {
                        setIsAddingSubtask(false);
                        setNewSubtaskText("");
                      }
                    }}
                    wrapperClassName="flex-1 border-b border-white/20 pb-0.5 focus-within:border-white/50"
                    className="text-[14px] text-white placeholder-white/30"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    className="text-xs px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  >
                    Guardar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* 6. OTRAS TAREAS DEL PROYECTO (Anclado al fondo, expande hacia arriba) */}
        {/* ───────────────────────────────────────────────────────────────── */}
        <div className="mt-auto pt-3 pb-[40px] shrink-0 space-y-2.5">
          <div className="h-px bg-white/5 mb-2" />

          {/* Header en 12px con tipografía invertida y enlace interactivo al proyecto */}
          <div className="flex items-center justify-between gap-1.5 px-0 pt-0.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (currentProject?.id) {
                  playSound("click");
                  onSelectProject?.(currentProject.id);
                }
              }}
              className="text-[12px] flex items-center gap-1.5 truncate text-left group/proj cursor-pointer"
              title={`Ir al proyecto: ${currentProject?.title || "Proyecto"}`}
            >
              <span className="font-normal text-[#ffffff8c]">Otras tareas de</span>
              <span className="font-bold text-[#ffffffd6] group-hover/proj:text-white group-hover/proj:underline truncate transition-colors">
                {currentProject?.title || "Proyecto"}
              </span>
            </button>

            {/* Flecha hacia arriba para expandir/colapsar si hay más de 3 tareas */}
            {otherProjectTasks.length > 3 && (
              <button
                type="button"
                onClick={() => {
                  playSound("click");
                  setIsOtherTasksExpanded((prev) => !prev);
                }}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer shrink-0"
                title={isOtherTasksExpanded ? "Mostrar menos tareas" : `Ver todas las tareas (${otherProjectTasks.length})`}
              >
                <ChevronUp
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isOtherTasksExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>
            )}
          </div>

          {/* Lista de píldoras de tareas y píldora para crear nueva tarea (40px) */}
          <div className="flex flex-col gap-2">
            {displayedOtherTasks.length > 0 ? (
              <AnimatePresence initial={false}>
                {displayedOtherTasks.map((otherTask) => {
                  const isCompleted = (otherTask.status as string) === "Completado" || (otherTask.status as string) === "Completada";

                  return (
                    <motion.button
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      key={otherTask.id}
                      type="button"
                      onClick={() => {
                        playSound("click");
                        onSelectTask?.({
                          ...otherTask,
                          projectId: resolvedProjectId,
                          projectName: currentProject?.title,
                          client: currentProject?.client,
                        } as any);
                      }}
                      className="w-full h-[40px] rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 px-3.5 flex items-center text-left transition-all cursor-pointer group/pill"
                    >
                      <span className={`text-[14px] font-medium truncate ${isCompleted ? 'line-through text-white/40' : 'text-white/90 group-hover/pill:text-white'}`}>
                        {otherTask.title || (otherTask as any).titulo || "Tarea"}
                      </span>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            ) : (
              <p className="text-[12px] text-white/30 italic pt-0.5 px-0.5">
                No hay más tareas en este proyecto.
              </p>
            )}

            {/* Píldora extra: Crear nueva tarea en este proyecto */}
            {!isAddingProjectTask ? (
              <button
                type="button"
                onClick={() => {
                  playSound("click");
                  setIsAddingProjectTask(true);
                }}
                className="w-full h-[40px] rounded-2xl border border-dashed border-white/15 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/30 px-3.5 flex items-center gap-2 text-white/45 hover:text-white transition-all cursor-pointer group/newtask"
                title={`Crear nueva tarea en ${currentProject?.title || "este proyecto"}`}
              >
                <Plus className="w-3.5 h-3.5 text-white/40 group-hover/newtask:text-white transition-colors shrink-0" />
                <span className="text-[13px] font-medium tracking-normal">
                  Nueva tarea
                </span>
              </button>
            ) : (
              <div className="w-full h-[40px] rounded-2xl border border-white/30 bg-white/[0.05] px-3.5 flex items-center gap-2 transition-all">
                <Plus className="w-3.5 h-3.5 text-white/60 shrink-0" />
                <SmoothInput
                  type="text"
                  autoFocus
                  unstyled
                  placeholder="Nombre de la nueva tarea..."
                  value={newProjectTaskTitle}
                  onChange={(e) => setNewProjectTaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateProjectTask();
                    } else if (e.key === "Escape") {
                      setIsAddingProjectTask(false);
                      setNewProjectTaskTitle("");
                    }
                  }}
                  onBlur={() => {
                    if (!newProjectTaskTitle.trim()) {
                      setIsAddingProjectTask(false);
                    }
                  }}
                  disabled={isSubmittingNewTask}
                  wrapperClassName="flex-1"
                  className="w-full text-[13px] font-medium text-white placeholder-white/40"
                />

                {newProjectTaskTitle.trim() && (
                  <button
                    type="button"
                    onClick={handleCreateProjectTask}
                    disabled={isSubmittingNewTask}
                    className="text-[11px] font-medium px-2 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer shrink-0"
                  >
                    {isSubmittingNewTask ? "..." : "Crear"}
                  </button>
                )}

                {onNewTask && (
                  <button
                    type="button"
                    onClick={() => {
                      if (currentProject?.id) {
                        onNewTask(currentProject.id);
                        setIsAddingProjectTask(false);
                        setNewProjectTaskTitle("");
                      }
                    }}
                    className="p-1 text-white/40 hover:text-white transition-colors cursor-pointer shrink-0"
                    title="Abrir modal completo"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
