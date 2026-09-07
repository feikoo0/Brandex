"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Calendar, DollarSign, Loader2, Plus, Trash2, User, Flag, Tag, X, 
  Maximize2, MoreHorizontal, Paperclip, Search, LayoutGrid, Table, Clock, 
  CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Check, Layers, Users, Sparkles,
  CalendarDays, ListFilter, Target, UserCheck, ArrowRight
} from "lucide-react";
import { useData, useUpdateProject, useUpdateTask, useCreateTask } from "@/hooks/useData";
import { useClients } from "@/hooks/useClients";
import { useProjectSummary } from "@/hooks/useProjectSummary";
import { useRecentSessions } from "@/hooks/useSessions";
import { 
  cn, 
  getSingleSourceProjectColor, 
  getSingleSourceClientColor, 
  PROJECT_COLOR_PALETTE, 
  formatProjectCreatedDate, 
  parseAnyDate, 
  getCalendarDaysDiff as getCalendarDaysDiffUtil,
  CARD_COLOR_KEYS,
  getCardColorTheme,
  extractCleanTaskId,
  parseTimeToHours
} from "@/lib/utils";
import { resolveBucketDate } from "@/lib/timelineUtils";
import { TaskCardContent } from "@/app/taski/components/TaskCard";
import { useTaskCardInteractions } from "@/app/taski/hooks/useTaskCardInteractions";
import DeleteConfirmModal from "@/app/taski/components/DeleteConfirmModal";
import NewTaskModal, { TaskData } from "@/app/taski/components/NewTaskModal";
import KanbanBoard from "@/app/taski/components/KanbanBoard";
import { SynthesizedTask } from "@/app/taski/components/KanbanColumn";
import { TimelineView } from "@/app/taski/components/Timeline/TimelineView";
import TaskTableView from "@/app/taski/components/TaskTableView";
import { ResizableDivider } from "@/components/ui/ResizableDivider";
import LinearDropdownPopover from "@/app/taski/components/LinearDropdownPopover";
import LinearDatePopover from "@/app/taski/components/LinearDatePopover";
import { TaskSidePanel } from "@/components/task-detail/TaskSidePanel";
import { ProjectStatusIcon } from "@/components/common/ProjectStatusIcon";
import { SmoothInput, SmoothTextarea } from "@/components/ui/SmoothInput";
import { playSound } from "@/app/taski/utils/audio";
import { doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Client, ProjectHealthRAG } from "@/lib/types";
import type { Project, Task } from "@/app/taski/components/ProjectDashboard";

type ProjectViewTab = "buscar" | "todo" | "kanban" | "tabla" | "timeline";

export interface ProjectFullScreenProps {
  projectId: string;
  onBack: () => void;
  onSelectTask?: (task: Task, projectId?: string | number, originRect?: any) => void;
}

export default function ProjectFullScreenView({ 
  projectId, 
  onBack,
  onSelectTask: onSelectTaskProp,
}: ProjectFullScreenProps) {
  const summary = useProjectSummary(projectId);
  const { data } = useData();
  const { clients: firestoreClients } = useClients();
  const { sessions: recentSessions } = useRecentSessions();
  const updateProject = useUpdateProject();
  const updateTask = useUpdateTask();
  const createTask = useCreateTask();

  const project = summary.project;

  // Catálogo unificado de clientes
  const availableClients = useMemo(() => {
    const map = new Map<string, Client>();
    (firestoreClients || []).forEach((c) => {
      if (c.id) map.set(String(c.id), c);
    });
    (data?.clientes || []).forEach((c) => {
      if (c.id && !map.has(String(c.id))) {
        map.set(String(c.id), c);
      }
    });
    return Array.from(map.values());
  }, [firestoreClients, data?.clientes]);

  // Ancho redimensionable de la columna izquierda (Persistido)
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("taski_project_sidebar_width");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 240 && parsed <= 480) {
          return parsed;
        }
      }
    }
    return 310;
  });

  const handleSidebarResize = useCallback((deltaX: number) => {
    setSidebarWidth((prev) => {
      const maxW = typeof window !== "undefined" ? Math.floor(window.innerWidth * 0.40) : 480;
      return Math.min(Math.max(prev + deltaX, 240), maxW);
    });
  }, []);

  const handleSidebarResizeEnd = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("taski_project_sidebar_width", String(sidebarWidth));
    }
  }, [sidebarWidth]);

  // Controles de Popovers de Proyecto
  const [activePopover, setActivePopover] = useState<"client" | "status" | "priority" | "type" | "lead" | "date" | "salud" | "assignee" | null>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [newMetaInput, setNewMetaInput] = useState("");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Navegador Superior (Idéntico a Work / HomeDashboard con la opción "Todo")
  const [activeView, setActiveView] = useState<ProjectViewTab>("kanban");
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [previousView, setPreviousView] = useState<ProjectViewTab>("kanban");
  const [taskSearch, setTaskSearch] = useState("");
  const isSearchActive = activeView === "buscar";

  // Agrupación y Filtros (Kanban y Timeline)
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);
  const [groupingMode, setGroupingMode] = useState<"fecha" | "cliente" | "prioridad" | "estado">("estado");
  const [groupingFilter, setGroupingFilter] = useState<"todos" | "Planificado" | "En Proceso" | "En Revisión" | "Completado">("todos");
  const [timelineHideCompleted, setTimelineHideCompleted] = useState<boolean>(false);
  const [timelineSortBy, setTimelineSortBy] = useState<"recientes" | "urgentes" | "alfabetico">("recientes");

  // Creación inline de tarea rápida en vista Todo
  const [isCreatingInlineTask, setIsCreatingInlineTask] = useState(false);
  const [inlineTaskTitle, setInlineTaskTitle] = useState("");
  const [inlineTaskFormato, setInlineTaskFormato] = useState("Post");
  const [inlineTaskEsfuerzo, setInlineTaskEsfuerzo] = useState("30 min");

  // DnD States para KanbanBoard
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [columnScrollIndices, setColumnScrollIndices] = useState<Record<string, number>>({});

  // Hook Oficial de Interacciones de Tarjetas de Tareas
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
    getStatusPillConfig,
    getFormatPillConfig,
  } = useTaskCardInteractions();

  const [availableFormats] = useState<string[]>([
    "Post",
    "Reel",
    "Story",
    "Flyer",
    "Banner",
    "Web",
    "Video",
    "Copywriting",
    "Branding",
  ]);

  // Modal de confirmación de eliminación
  const [deleteModalConfig, setDeleteModalConfig] = useState<{
    isOpen: boolean;
    step: 1 | 2;
    projectId: number;
    projectTitle: string;
    taskId: number;
    taskTitle: string;
    targetType?: "task" | "project";
  } | null>(null);

  // Modal Oficial de Detalle y Edición de Tarea
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTaskModal, setEditingTaskModal] = useState<any | null>(null);
  const [taskModalOriginRect, setTaskModalOriginRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Color de proyecto
  const colorObj = project ? getSingleSourceProjectColor(project) : { hslCss: "#9b51e0" };
  const initialProjColor = colorObj.hslCss;

  const [selectedColorIdx, setSelectedColorIdx] = useState(() => {
    if (!project) return 0;
    const foundIdx = PROJECT_COLOR_PALETTE.findIndex(
      p => p.hslStr === initialProjColor || p.name.toLowerCase() === ((project as any).colorName || "").toLowerCase()
    );
    return foundIdx >= 0 ? foundIdx : 3;
  });

  // Local Form Data
  const [formData, setFormData] = useState(() => {
    const rawPresupuesto = (project as any)?.presupuesto !== undefined && (project as any)?.presupuesto !== null
      ? Number((project as any)?.presupuesto)
      : (project?.costo !== undefined && project?.costo !== null ? Number(project.costo) : 0);

    return {
      nombre: project?.nombre || "",
      descripcion: project?.descripcion || "",
      estadoProyecto: project?.estadoProyecto || project?.estado || "Planificación",
      salud: (((project as any)?.salud || "verde") as ProjectHealthRAG),
      prioridad: project?.prioridad || "Media",
      tipo: (project as any)?.tipo || (project as any)?.paquete || "Desarrollo Web",
      cliente_id: summary.client?.id || project?.cliente_ids?.[0] || (project as any)?.cliente_id || "",
      clientName: summary.clientName || "Brandex",
      lead_id: (project as any)?.lead_id || "",
      asignado_ids: project?.asignado_ids || [],
      asignado: project?.asignado || "",
      presupuesto: rawPresupuesto,
      costo: rawPresupuesto,
      metas_negocio: Array.isArray((project as any)?.metas_negocio) ? (project as any).metas_negocio : [],
      fechaInicio: project?.fechaInicio || "",
      fechaFin: project?.fechaFin || "",
      color: initialProjColor,
      colorName: (project as any)?.colorName || "",
    };
  });

  // Sincronizar formData cuando el proyecto de Firestore cambia
  useEffect(() => {
    if (project) {
      const cObj = getSingleSourceProjectColor(project);
      const rawPresupuesto = (project as any).presupuesto !== undefined && (project as any).presupuesto !== null
        ? Number((project as any).presupuesto)
        : (project.costo !== undefined && project.costo !== null ? Number(project.costo) : 0);

      setFormData({
        nombre: project.nombre || "",
        descripcion: project.descripcion || "",
        estadoProyecto: project.estadoProyecto || project.estado || "Planificación",
        salud: (((project as any).salud || "verde") as ProjectHealthRAG),
        prioridad: project.prioridad || "Media",
        tipo: (project as any).tipo || (project as any).paquete || "Desarrollo Web",
        cliente_id: summary.client?.id || project.cliente_ids?.[0] || (project as any).cliente_id || "",
        clientName: summary.clientName || "Brandex",
        lead_id: (project as any).lead_id || "",
        asignado_ids: project.asignado_ids || [],
        asignado: project.asignado || "",
        presupuesto: rawPresupuesto,
        costo: rawPresupuesto,
        metas_negocio: Array.isArray((project as any).metas_negocio) ? (project as any).metas_negocio : [],
        fechaInicio: project.fechaInicio || "",
        fechaFin: project.fechaFin || "",
        color: cObj.hslCss,
        colorName: (project as any).colorName || "",
      });

      const foundIdx = PROJECT_COLOR_PALETTE.findIndex(
        p => p.hslStr === cObj.hslCss || p.name.toLowerCase() === ((project as any).colorName || "").toLowerCase()
      );
      if (foundIdx >= 0) setSelectedColorIdx(foundIdx);
    }
  }, [project, summary.client?.id, summary.clientName]);

  const tasks = useMemo(() => summary.tasks || [], [summary.tasks]);
  const workers = useMemo(() => data?.miembros || [], [data?.miembros]);
  const leadMember = useMemo(() => {
    return workers.find((w: any) => String(w.id) === String(formData.lead_id));
  }, [workers, formData.lead_id]);
  const currentProjColor = formData.color || initialProjColor;

  const colorConfig = useMemo(() => {
    return CARD_COLOR_KEYS.reduce((acc: Record<string, any>, key: string) => {
      acc[key] = getCardColorTheme(key, true);
      return acc;
    }, {} as Record<string, any>);
  }, []);

  const getCalendarDaysDiff = useCallback((targetDate: Date | string | undefined) => {
    if (!targetDate) return 999;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDate);
    if (isNaN(target.getTime())) return 999;
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  }, []);

  const formatLocalDate = useCallback((d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const completedTasksCount = tasks.filter((t: any) => (t.estado || t.status) === "Completado").length;
  const progressPercent = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;

  // Objeto Adapter Oficial de Tareas
  const adaptedTasks: Task[] = useMemo(() => {
    return tasks.map((t: any, index: number) => {
      const rawStatus = t.estado || t.status || "Planificado";
      let statusColor = t.statusColor;
      if (!statusColor || statusColor.includes("white/5") || statusColor === "bg-white") {
        if (rawStatus === "Completado") statusColor = "bg-emerald-500/20 border-emerald-500/30 text-emerald-400";
        else if (rawStatus === "En Proceso") statusColor = "bg-amber-500/20 border-amber-500/30 text-amber-400";
        else if (rawStatus === "En Revisión" || rawStatus === "Revisión") statusColor = "bg-purple-500/20 border-purple-500/30 text-purple-400";
        else statusColor = "bg-slate-500/20 border-slate-500/30 text-slate-300";
      }

      const progDate = t.fecha_programada || t.fechaProg || t.fecha_limite || t.deadline || formData.fechaFin || formData.fechaInicio || "";
      const limitDate = t.fecha_limite || t.fechaEntrega || t.deadline || formData.fechaFin || progDate || "";

      return {
        id: t.id,
        title: t.titulo || t.title || "Tarea",
        desc: t.descripcion || t.desc || t.contenido || "",
        format: t.formato || t.format || "Post",
        formato: t.formato || t.format || "Post",
        time: t.esfuerzo || t.time || "30 min",
        status: rawStatus as any,
        estado: rawStatus as any,
        statusColor,
        attachmentUrl: t.attachmentUrl || t.recursosDrive || "",
        recursosDrive: t.attachmentUrl || t.recursosDrive || "",
        subtasks: t.subtasks || [],
        sessions: t.sessions || [],
        deadline: limitDate,
        fecha_limite: limitDate,
        fechaEntrega: limitDate,
        fecha_programada: progDate,
        fechaProg: progDate,
        fecha_creacion: t.fecha_creacion || t.createdAt || "",
        color: t.color || formData.color,
        priority: t.prioridad || t.priority || "Media",
        prioridad: t.prioridad || t.priority || "Media",
        asignado_id: t.asignado_id || t.asignado_ids?.[0],
        asignado_ids: t.asignado_ids || (t.asignado_id ? [t.asignado_id] : []),
        asignado: t.asignado,
        copywriting: t.copywriting,
        copy: t.copy,
        fechaPublicacion: t.fechaPublicacion,
        kanbanOrders: t.kanbanOrders || {},
      } as Task;
    });
  }, [tasks, formData.color, formData.fechaFin, formData.fechaInicio]);

  // Objeto Adapter del Proyecto
  const adaptedProject: Project = useMemo(() => {
    if (!project) return null as any;
    return {
      ...project,
      id: project.id as any,
      title: formData.nombre || project.nombre || "Proyecto",
      client: formData.clientName || summary.clientName || "Brandex",
      desc: formData.descripcion || project.descripcion || "",
      progress: `${progressPercent}%`,
      percent: `${progressPercent}%`,
      gradient: PROJECT_COLOR_PALETTE[selectedColorIdx]?.gradient || (project as any).gradient || "",
      glow: "",
      customColor: PROJECT_COLOR_PALETTE[selectedColorIdx] 
        ? { h: PROJECT_COLOR_PALETTE[selectedColorIdx].h, s: PROJECT_COLOR_PALETTE[selectedColorIdx].s, l: PROJECT_COLOR_PALETTE[selectedColorIdx].l } 
        : undefined,
      fechaInicio: formData.fechaInicio,
      fechaFin: formData.fechaFin,
      tasks: adaptedTasks,
    } as any;
  }, [project, formData, summary.clientName, progressPercent, selectedColorIdx, adaptedTasks]);

  // Estado reactivo local de proyectos para sincronizar KanbanBoard y TimelineView
  const [localProjects, setLocalProjects] = useState<Project[]>([]);
  useEffect(() => {
    if (adaptedProject) {
      setLocalProjects([adaptedProject]);
    }
  }, [adaptedProject]);

  const handleUpdateProjects = useCallback((updater: React.SetStateAction<Project[]>) => {
    setLocalProjects((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const proj = next[0];
      if (proj?.tasks) {
        proj.tasks.forEach((t) => {
          const cleanId = String(t.id).startsWith("kt-")
            ? extractCleanTaskId(String(t.id), proj.id)
            : String(t.id);
          if (cleanId) {
            updateTask.mutate({
              id: cleanId,
              fecha_programada: t.fecha_programada || (t as any).fechaProg || null,
              fechaProg: t.fecha_programada || (t as any).fechaProg || null,
              fecha_limite: t.fecha_limite || (t as any).deadline || null,
              fechaEntrega: t.fecha_limite || (t as any).deadline || null,
              deadline: t.fecha_limite || (t as any).deadline || null,
              estado: t.status || (t as any).estado || "Planificado",
              status: t.status || (t as any).estado || "Planificado",
              kanbanOrders: t.kanbanOrders || {},
            } as any);
          }
        });
      }
      return next;
    });
  }, [updateTask]);

  // Manejo de paleta de colores
  const handleSelectColor = (idx: number) => {
    setSelectedColorIdx(idx);
    playSound("click");
    const preset = PROJECT_COLOR_PALETTE[idx];
    if (preset) {
      triggerSave({
        color: preset.hslStr,
        colorName: preset.name,
      });
    }
  };

  // Auto-guardado debounced reactivo hacia Firestore (Single Source of Truth)
  const triggerSave = useCallback(
    (overrides: Partial<typeof formData> = {}) => {
      if (!project?.id) return;
      const nextData = { ...formData, ...overrides };
      setFormData(nextData);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      setSaveStatus("saving");
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const preset = PROJECT_COLOR_PALETTE.find(p => p.hslStr === nextData.color) || PROJECT_COLOR_PALETTE[selectedColorIdx];
          await updateProject.mutateAsync({
            id: project.id,
            nombre: nextData.nombre.trim() || "Proyecto sin título",
            descripcion: nextData.descripcion.trim(),
            estadoProyecto: nextData.estadoProyecto,
            estado: nextData.estadoProyecto,
            salud: nextData.salud,
            prioridad: nextData.prioridad,
            tipo: nextData.tipo,
            paquete: nextData.tipo,
            cliente_id: nextData.cliente_id || undefined,
            cliente_ids: nextData.cliente_id ? [nextData.cliente_id] : [],
            cliente: nextData.clientName !== "Brandex" ? nextData.clientName : undefined,
            lead_id: nextData.lead_id || undefined,
            asignado_ids: nextData.asignado_ids,
            asignado: nextData.asignado || undefined,
            presupuesto: nextData.presupuesto,
            costo: nextData.presupuesto,
            metas_negocio: nextData.metas_negocio,
            fechaInicio: nextData.fechaInicio,
            fechaFin: nextData.fechaFin,
            color: nextData.color,
            colorName: nextData.colorName,
            gradient: preset?.gradient,
            customColor: preset ? { h: preset.h, s: preset.s, l: preset.l } : undefined,
          } as any);
          setSaveStatus("saved");
          playSound("pop");
          setTimeout(() => setSaveStatus("idle"), 2000);
        } catch (e) {
          console.error("Error auto-saving project:", e);
          setSaveStatus("idle");
        }
      }, 400);
    },
    [project?.id, formData, selectedColorIdx, updateProject]
  );

  const dateLabel = useMemo(() => {
    if (formData.fechaInicio && formData.fechaFin) {
      return `${formData.fechaInicio} → ${formData.fechaFin}`;
    }
    if (formData.fechaFin) {
      return `Entrega: ${formData.fechaFin}`;
    }
    if (formData.fechaInicio) {
      return `Inicio: ${formData.fechaInicio}`;
    }
    return "Sin fecha";
  }, [formData.fechaInicio, formData.fechaFin]);

  const PROJ_STATUS_OPTIONS = useMemo(() => [
    { id: "Planificación", label: "Planificación", icon: <ProjectStatusIcon status="Planificación" className="w-3.5 h-3.5" /> },
    { id: "En Proceso", label: "En Proceso", icon: <ProjectStatusIcon status="En Proceso" className="w-3.5 h-3.5" /> },
    { id: "En Revisión", label: "En Revisión", icon: <ProjectStatusIcon status="En Revisión" className="w-3.5 h-3.5" /> },
    { id: "Completado", label: "Completado", icon: <ProjectStatusIcon status="Completado" className="w-3.5 h-3.5" /> },
  ], []);

  const PROJ_PRIORITY_OPTIONS = useMemo(() => [
    { id: "Sin prioridad", label: "Sin prioridad" },
    { id: "Urgente", label: "Urgente" },
    { id: "Alta", label: "Alta" },
    { id: "Media", label: "Media" },
    { id: "Baja", label: "Baja" },
  ], []);

  const PROJ_HEALTH_OPTIONS = useMemo(() => [
    { id: "verde", label: "En tiempo", icon: <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" /> },
    { id: "ambar", label: "Con riesgos", icon: <span className="w-2 h-2 rounded-full bg-amber-500 shadow-sm" /> },
    { id: "rojo", label: "Bloqueado", icon: <span className="w-2 h-2 rounded-full bg-rose-500 shadow-sm" /> },
  ], []);

  const PROJ_TYPE_OPTIONS = useMemo(() => [
    { id: "Desarrollo Web", label: "Desarrollo Web" },
    { id: "Estratégico", label: "Estratégico" },
    { id: "Branding Complete", label: "Branding Complete" },
    { id: "UI/UX Design", label: "UI/UX Design" },
    { id: "Marketing Digital", label: "Marketing Digital" },
  ], []);

  const handleToggleWorker = (workerId: string) => {
    const currentIds = formData.asignado_ids || [];
    const newIds = currentIds.includes(workerId)
      ? currentIds.filter((id: string) => id !== workerId)
      : [...currentIds, workerId];
    
    const selectedWorkers = workers.filter((w: any) => newIds.includes(w.id));
    const assignedNames = selectedWorkers.map((w: any) => w.nombre).join(", ");
    triggerSave({
      asignado_ids: newIds,
      asignado: assignedNames || "",
    });
  };

  const handleAddMeta = () => {
    if (!newMetaInput.trim()) return;
    playSound("pop");
    const list = Array.isArray(formData.metas_negocio) ? formData.metas_negocio : [];
    const updated = [...list, newMetaInput.trim()];
    triggerSave({ metas_negocio: updated });
    setNewMetaInput("");
  };

  const handleDeleteMeta = (idx: number) => {
    playSound("trash");
    const list = Array.isArray(formData.metas_negocio) ? formData.metas_negocio : [];
    const updated = list.filter((_, i) => i !== idx);
    triggerSave({ metas_negocio: updated });
  };

  // Actualizar propiedad de tarea directamente en Firestore
  const handleUpdateTaskProperty = useCallback(async (projId: string | number, tId: string | number, property: string, value: any) => {
    const cleanId = String(tId).startsWith("kt-")
      ? extractCleanTaskId(String(tId), projId)
      : String(tId);
    if (!cleanId) return;
    playSound("click");

    handleUpdateProjects((prev) =>
      prev.map((p) => {
        if (String(p.id) !== String(projId)) return p;
        const updatedTasks = (p.tasks || []).map((t) => {
          if (String(t.id) !== String(cleanId) && `kt-${projId}-${t.id}` !== String(tId)) return t;
          const updated = { ...t, [property]: value };
          if (property === "status") {
            updated.status = value;
            updated.estado = value;
          }
          return updated;
        });
        return { ...p, tasks: updatedTasks };
      })
    );

    try {
      if (property === "status" || property === "estado") {
        await updateTask.mutateAsync({
          id: cleanId,
          estado: value,
          status: value,
          fecha_hora_completado: value === "Completado" ? new Date().toISOString() : null,
          fecha_completado_real: value === "Completado" ? new Date().toISOString().split("T")[0] : null,
        } as any);
      } else if (property === "format" || property === "formato") {
        await updateTask.mutateAsync({ id: cleanId, formato: value, format: value } as any);
      } else if (property === "time" || property === "esfuerzo") {
        await updateTask.mutateAsync({ id: cleanId, esfuerzo: value, time: value } as any);
      } else if (property === "priority" || property === "prioridad") {
        await updateTask.mutateAsync({ id: cleanId, prioridad: value, priority: value } as any);
      } else if (property === "color") {
        await updateTask.mutateAsync({ id: cleanId, color: value } as any);
      } else if (property === "title" || property === "titulo") {
        await updateTask.mutateAsync({ id: cleanId, titulo: value, title: value } as any);
      } else if (property === "desc" || property === "descripcion") {
        await updateTask.mutateAsync({ id: cleanId, descripcion: value, desc: value } as any);
      } else if (property === "deadline" || property === "fecha_limite") {
        await updateTask.mutateAsync({ id: cleanId, fecha_limite: value, deadline: value } as any);
      } else if (property === "fecha_programada" || property === "startDate") {
        await updateTask.mutateAsync({ id: cleanId, fecha_programada: value, fechaProg: value } as any);
      } else {
        await updateTask.mutateAsync({ id: cleanId, [property]: value } as any);
      }
    } catch (e) {
      console.error("Error actualizando propiedad de tarea:", e);
    }
  }, [handleUpdateProjects, updateTask]);

  // Guardar edición de título/descripción inline
  const handleSaveEditing = useCallback(async (pId: string | number, tId: string | number) => {
    if (!editingTaskField || !editingValue.trim()) {
      setEditingTaskField(null);
      return;
    }
    const field = editingTaskField.field;
    const val = editingValue.trim();
    const cleanId = String(tId).startsWith("kt-") ? extractCleanTaskId(String(tId), pId) : String(tId);

    setEditingTaskField(null);
    setEditingValue("");

    try {
      if (field === "title") {
        await handleUpdateTaskProperty(pId, cleanId, "title", val);
      } else if (field === "desc") {
        await handleUpdateTaskProperty(pId, cleanId, "desc", val);
      }
    } catch (e) {
      console.error(e);
    }
  }, [editingTaskField, editingValue, handleUpdateTaskProperty, setEditingTaskField, setEditingValue]);

  // Confirmar eliminación de tarea
  const handleConfirmTaskDelete = async (pId: number, tId: number) => {
    playSound("trash");
    try {
      await deleteDoc(doc(db, "tasks", String(tId)));
      handleUpdateProjects((prev) =>
        prev.map((p) => ({
          ...p,
          tasks: (p.tasks || []).filter((t) => String(t.id) !== String(tId)),
        }))
      );
    } catch (e) {
      console.error("Error eliminando tarea:", e);
    } finally {
      setDeleteModalConfig(null);
    }
  };

  // Creación rápida de tarea inline
  const handleCreateInlineTask = async () => {
    if (!inlineTaskTitle.trim() || !project) return;
    playSound("pop");
    try {
      await createTask.mutateAsync({
        titulo: inlineTaskTitle.trim(),
        estado: "Planificado",
        status: "Planificado",
        prioridad: "Media",
        formato: inlineTaskFormato || "Post",
        esfuerzo: inlineTaskEsfuerzo,
        proyecto_id: project.id,
        proyecto_ids: [project.id],
        cliente_id: formData.cliente_id || summary.client?.id || project.cliente_ids?.[0] || undefined,
      } as any);
      setInlineTaskTitle("");
      setIsCreatingInlineTask(false);
    } catch (e) {
      console.error("Error creando tarea inline:", e);
    }
  };

  // Panel Lateral Derecho de Tarea (TaskSidePanel)
  const [internalSideTask, setInternalSideTask] = useState<any | null>(null);
  const [taskSidePanelWidth, setTaskSidePanelWidth] = useState<number>(315);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("taski_task_sidepanel_width");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 315) {
          setTaskSidePanelWidth(parsed);
        }
      }
    }
  }, []);

  const handleSelectTask = useCallback((taskObj: any, pId?: any, originRect?: { x: number; y: number; width: number; height: number }) => {
    playSound("click");
    const cleanId = String(taskObj.id).startsWith("kt-")
      ? extractCleanTaskId(String(taskObj.id), project?.id)
      : String(taskObj.id);
    const foundTask = tasks.find((t: any) => String(t.id) === cleanId) || taskObj;

    const synthesizedTask: any = {
      ...foundTask,
      id: cleanId,
      title: foundTask.titulo || foundTask.title || "",
      desc: foundTask.descripcion || foundTask.desc || foundTask.contenido || "",
      status: foundTask.estado || foundTask.status || "Planificado",
      estado: foundTask.estado || foundTask.status || "Planificado",
      priority: foundTask.prioridad || foundTask.priority || "Media",
      prioridad: foundTask.prioridad || foundTask.priority || "Media",
      format: foundTask.formato || foundTask.format || "Post",
      formato: foundTask.formato || foundTask.format || "Post",
      time: foundTask.esfuerzo || foundTask.time || "30 min",
      startDate: foundTask.fecha_programada || foundTask.fechaProg || foundTask.fechaInicio || formData.fechaInicio,
      deadline: foundTask.fecha_limite || foundTask.deadline || foundTask.fechaEntrega || foundTask.fechaFin || formData.fechaFin,
      fecha_programada: foundTask.fecha_programada || foundTask.fechaProg || foundTask.fechaInicio || formData.fechaInicio,
      fecha_limite: foundTask.fecha_limite || foundTask.deadline || foundTask.fechaEntrega || foundTask.fechaFin || formData.fechaFin,
      fechaPublicacion: foundTask.fechaPublicacion || "",
      projectId: project?.id,
      proyecto_id: project?.id,
      projectName: formData.nombre || project?.nombre || "Proyecto",
      client: formData.clientName || summary.clientName || "Brandex",
      clientId: formData.cliente_id || summary.client?.id,
      asignado_id: foundTask.asignado_id,
      asignado_ids: foundTask.asignado_ids || (foundTask.asignado_id ? [foundTask.asignado_id] : []),
      asignado: foundTask.asignado,
      subtasks: foundTask.subtasks || [],
      copywriting: foundTask.copywriting,
      copy: foundTask.copy,
      attachmentUrl: foundTask.attachmentUrl || foundTask.recursosDrive || "",
      recursosDrive: foundTask.attachmentUrl || foundTask.recursosDrive || "",
      color: foundTask.color || formData.color,
    };

    if (onSelectTaskProp) {
      onSelectTaskProp(synthesizedTask, project?.id, originRect);
    } else {
      setInternalSideTask(synthesizedTask);
    }
  }, [tasks, project?.id, project?.nombre, formData.fechaInicio, formData.fechaFin, formData.nombre, formData.clientName, formData.cliente_id, formData.color, summary.clientName, summary.client?.id, onSelectTaskProp]);

  // Manejadores del Modal Oficial de Tarea (NewTaskModal)
  const handleOpenTaskModal = useCallback((taskObj: any, originRect?: { x: number; y: number; width: number; height: number }) => {
    playSound("click");
    const cleanId = String(taskObj.id).startsWith("kt-")
      ? extractCleanTaskId(String(taskObj.id), project?.id)
      : String(taskObj.id);
    const foundTask = tasks.find((t: any) => String(t.id) === cleanId) || taskObj;

    setEditingTaskModal({
      ...foundTask,
      id: cleanId,
      title: foundTask.titulo || foundTask.title || "",
      desc: foundTask.descripcion || foundTask.desc || foundTask.contenido || "",
      status: foundTask.estado || foundTask.status || "Planificado",
      priority: foundTask.prioridad || foundTask.priority || "Media",
      format: foundTask.formato || foundTask.format || "Post",
      formato: foundTask.formato || foundTask.format || "Post",
      time: foundTask.esfuerzo || foundTask.time || "30 min",
      startDate: foundTask.fecha_programada || foundTask.fechaProg || foundTask.fechaInicio || formData.fechaInicio,
      deadline: foundTask.fecha_limite || foundTask.deadline || foundTask.fechaEntrega || foundTask.fechaFin || formData.fechaFin,
      fecha_programada: foundTask.fecha_programada || foundTask.fechaProg || foundTask.fechaInicio || formData.fechaInicio,
      fecha_limite: foundTask.fecha_limite || foundTask.deadline || foundTask.fechaEntrega || foundTask.fechaFin || formData.fechaFin,
      fechaPublicacion: foundTask.fechaPublicacion || "",
      projectId: project?.id,
      proyecto_id: project?.id,
      projectName: formData.nombre || project?.nombre || "Proyecto",
      client: formData.clientName || summary.clientName || "Brandex",
      clientId: formData.cliente_id || summary.client?.id,
      asignado_id: foundTask.asignado_id,
      asignado_ids: foundTask.asignado_ids || (foundTask.asignado_id ? [foundTask.asignado_id] : []),
      asignado: foundTask.asignado,
      subtasks: foundTask.subtasks || [],
      copywriting: foundTask.copywriting,
      copy: foundTask.copy,
      attachmentUrl: foundTask.attachmentUrl || foundTask.recursosDrive || "",
      recursosDrive: foundTask.attachmentUrl || foundTask.recursosDrive || "",
      color: foundTask.color || formData.color,
    });
    setTaskModalOriginRect(originRect || null);
    setShowTaskModal(true);
  }, [tasks, project?.id, project?.nombre, formData.fechaInicio, formData.fechaFin, formData.nombre, formData.clientName, formData.cliente_id, formData.color, summary.clientName, summary.client?.id]);

  const handleOpenNewTaskModal = useCallback((originRect?: { x: number; y: number; width: number; height: number }) => {
    playSound("pop");
    setEditingTaskModal(null);
    setTaskModalOriginRect(originRect || null);
    setShowTaskModal(true);
  }, []);

  const handleModalCreateTask = async (taskData: TaskData) => {
    if (!project) return;
    playSound("pop");
    try {
      const payload: Record<string, any> = {
        titulo: taskData.title?.trim() || "Nueva tarea",
        title: taskData.title?.trim() || "Nueva tarea",
        descripcion: taskData.desc?.trim() || "",
        desc: taskData.desc?.trim() || "",
        contenido: taskData.desc?.trim() || "",
        estado: taskData.status || "Planificado",
        status: taskData.status || "Planificado",
        prioridad: taskData.priority || "Media",
        formato: taskData.formato || taskData.format || "Post",
        format: taskData.format || taskData.formato || "Post",
        esfuerzo: taskData.time || "30 min",
        time: taskData.time || "30 min",
        proyecto_id: project.id,
        proyecto_ids: [project.id],
        cliente: formData.clientName || summary.clientName || "Brandex",
        subtasks: taskData.subtasks || [],
        color: taskData.color || formData.color,
      };

      if (formData.cliente_id || summary.client?.id || project.cliente_ids?.[0]) {
        const cId = formData.cliente_id || summary.client?.id || project.cliente_ids?.[0];
        payload.cliente_id = cId;
        payload.cliente_ids = [cId];
      }
      if (taskData.asignado_id || taskData.asignado_ids?.[0]) {
        payload.asignado_id = taskData.asignado_id || taskData.asignado_ids?.[0];
      }
      if (taskData.asignado_ids && taskData.asignado_ids.length > 0) {
        payload.asignado_ids = taskData.asignado_ids;
      }
      if (taskData.asignado) {
        payload.asignado = taskData.asignado;
      }
      if (taskData.fecha_programada || taskData.startDate) {
        const fProg = taskData.fecha_programada || taskData.startDate;
        payload.fecha_programada = fProg;
        payload.fechaProg = fProg;
      }
      if (taskData.fecha_limite || taskData.deadline) {
        const fLim = taskData.fecha_limite || taskData.deadline;
        payload.fecha_limite = fLim;
        payload.fechaEntrega = fLim;
        payload.deadline = fLim;
      }
      if (taskData.fechaPublicacion) {
        payload.fechaPublicacion = taskData.fechaPublicacion;
      }
      if (taskData.copywriting && (taskData.copywriting.gancho || taskData.copywriting.cuerpo || taskData.copywriting.cta)) {
        payload.copywriting = {
          gancho: taskData.copywriting.gancho || "",
          cuerpo: taskData.copywriting.cuerpo || "",
          cta: taskData.copywriting.cta || "",
        };
      }
      if (taskData.copy) {
        payload.copy = taskData.copy;
      }
      if (taskData.attachmentUrl || taskData.recursosDrive) {
        const driveUrl = taskData.attachmentUrl || taskData.recursosDrive;
        payload.attachmentUrl = driveUrl;
        payload.recursosDrive = driveUrl;
      }

      await createTask.mutateAsync(payload as any);
      setShowTaskModal(false);
      setEditingTaskModal(null);
    } catch (err) {
      console.error("Error al crear tarea desde modal:", err);
    }
  };

  const handleModalUpdateTask = async (taskId: string | number, updatedData: Partial<TaskData>) => {
    playSound("pop");
    const cleanId = String(taskId).startsWith("kt-")
      ? extractCleanTaskId(String(taskId), project?.id)
      : String(taskId);
    try {
      const updatePayload: Record<string, any> = {
        id: cleanId,
      };

      if (updatedData.title !== undefined) {
        updatePayload.titulo = updatedData.title.trim();
        updatePayload.title = updatedData.title.trim();
      }
      if (updatedData.desc !== undefined) {
        updatePayload.descripcion = updatedData.desc.trim();
        updatePayload.desc = updatedData.desc.trim();
        updatePayload.contenido = updatedData.desc.trim();
      }
      if (updatedData.status !== undefined) {
        updatePayload.estado = updatedData.status;
        updatePayload.status = updatedData.status;
      }
      if (updatedData.priority !== undefined) {
        updatePayload.prioridad = updatedData.priority;
        updatePayload.priority = updatedData.priority;
      }
      if (updatedData.formato !== undefined || updatedData.format !== undefined) {
        const fmt = updatedData.formato || updatedData.format;
        updatePayload.formato = fmt;
        updatePayload.format = fmt;
      }
      if (updatedData.time !== undefined) {
        updatePayload.esfuerzo = updatedData.time;
        updatePayload.time = updatedData.time;
      }
      if (updatedData.asignado_id !== undefined) {
        updatePayload.asignado_id = updatedData.asignado_id || null;
      }
      if (updatedData.asignado_ids !== undefined) {
        updatePayload.asignado_ids = updatedData.asignado_ids;
      }
      if (updatedData.asignado !== undefined) {
        updatePayload.asignado = updatedData.asignado || null;
      }
      if (updatedData.fecha_programada !== undefined || updatedData.startDate !== undefined) {
        const fProg = updatedData.fecha_programada || updatedData.startDate;
        updatePayload.fecha_programada = fProg || null;
        updatePayload.fechaProg = fProg || null;
      }
      if (updatedData.fecha_limite !== undefined || updatedData.deadline !== undefined) {
        const fLim = updatedData.fecha_limite || updatedData.deadline;
        updatePayload.fecha_limite = fLim || null;
        updatePayload.fechaEntrega = fLim || null;
        updatePayload.deadline = fLim || null;
      }
      if (updatedData.fechaPublicacion !== undefined) {
        updatePayload.fechaPublicacion = updatedData.fechaPublicacion || null;
      }
      if (updatedData.copywriting !== undefined) {
        updatePayload.copywriting = {
          gancho: updatedData.copywriting?.gancho?.trim() || "",
          cuerpo: updatedData.copywriting?.cuerpo?.trim() || "",
          cta: updatedData.copywriting?.cta?.trim() || "",
        };
      }
      if (updatedData.copy !== undefined) {
        updatePayload.copy = updatedData.copy?.trim() || "";
      }
      if (updatedData.subtasks !== undefined) {
        updatePayload.subtasks = updatedData.subtasks;
      }
      if (updatedData.attachmentUrl !== undefined || updatedData.recursosDrive !== undefined) {
        const driveUrl = updatedData.attachmentUrl || updatedData.recursosDrive;
        updatePayload.attachmentUrl = driveUrl || null;
        updatePayload.recursosDrive = driveUrl || null;
      }
      if (updatedData.color !== undefined) {
        updatePayload.color = updatedData.color;
      }

      await updateTask.mutateAsync(updatePayload as any);
      setShowTaskModal(false);
      setEditingTaskModal(null);
    } catch (err) {
      console.error("Error al actualizar tarea desde modal:", err);
    }
  };

  // Drag & Drop Handler Oficial para KanbanBoard
  const handleDropTask = (
    taskId: string,
    projId: string | number,
    oldColId: string | undefined,
    newColId: string,
    orderMap: Record<string, number>
  ) => {
    const cleanId = String(taskId).startsWith("kt-")
      ? extractCleanTaskId(taskId, projId)
      : String(taskId);
    if (!cleanId) return;

    if (groupingMode === "estado") {
      const status = newColId.replace("status-", "");
      playSound("pop");
      handleUpdateProjects((prev) =>
        prev.map((p) => {
          const updatedTasks = (p.tasks || []).map((t) => {
            let updatedTask = t;
            const fullTaskId = `kt-${p.id}-${t.id}`;

            if (orderMap[fullTaskId] !== undefined) {
              updatedTask = {
                ...updatedTask,
                kanbanOrders: { ...(updatedTask.kanbanOrders || {}), [groupingMode]: orderMap[fullTaskId] },
              };
            }

            if (String(t.id) === String(cleanId) || fullTaskId === taskId) {
              updatedTask = {
                ...updatedTask,
                status: status as any,
                estado: status as any,
                statusColor:
                  status === "Completado"
                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                    : status === "En Proceso"
                    ? "bg-amber-500/20 border-amber-500/30 text-amber-400"
                    : status === "En Revisión" || status === "Revisión"
                    ? "bg-purple-500/20 border-purple-500/30 text-purple-400"
                    : "bg-slate-500/20 border-slate-500/30 text-slate-300",
                fecha_hora_completado: status === "Completado" ? new Date().toISOString() : undefined,
                fecha_completado_real: status === "Completado" ? new Date().toISOString().split("T")[0] : undefined,
              };

              updateDoc(doc(db, "tasks", String(cleanId)), {
                estado: status,
                status: status,
                fecha_hora_completado: status === "Completado" ? new Date().toISOString() : null,
                fecha_completado_real: status === "Completado" ? new Date().toISOString().split("T")[0] : null,
                kanbanOrders: updatedTask.kanbanOrders || {},
                updatedAt: serverTimestamp(),
                updated_at: serverTimestamp(),
              }).catch((err) => console.error("Error actualizando /tasks:", err));
            }

            return updatedTask;
          });

          return { ...p, tasks: updatedTasks };
        })
      );
    } else if (groupingMode === "prioridad") {
      const priority = newColId.replace("priority-", "");
      playSound("pop");
      handleUpdateProjects((prev) =>
        prev.map((p) => {
          const updatedTasks = (p.tasks || []).map((t) => {
            let updatedTask = t;
            const fullTaskId = `kt-${p.id}-${t.id}`;
            if (orderMap[fullTaskId] !== undefined) {
              updatedTask = {
                ...updatedTask,
                kanbanOrders: { ...(updatedTask.kanbanOrders || {}), [groupingMode]: orderMap[fullTaskId] },
              };
            }
            if (String(t.id) === String(cleanId) || fullTaskId === taskId) {
              updatedTask = {
                ...updatedTask,
                prioridad: priority,
                priority: priority,
              };
              updateDoc(doc(db, "tasks", String(cleanId)), {
                prioridad: priority,
                priority: priority,
                kanbanOrders: updatedTask.kanbanOrders || {},
                updatedAt: serverTimestamp(),
                updated_at: serverTimestamp(),
              }).catch((err) => console.error("Error actualizando prioridad en /tasks:", err));
            }
            return updatedTask;
          });
          return { ...p, tasks: updatedTasks };
        })
      );
    } else if (groupingMode === "fecha") {
      playSound("pop");
      handleUpdateProjects((prev) =>
        prev.map((p) => {
          const updatedTasks = (p.tasks || []).map((t) => {
            let updatedTask = t;
            const fullTaskId = `kt-${p.id}-${t.id}`;

            if (orderMap[fullTaskId] !== undefined) {
              updatedTask = {
                ...updatedTask,
                kanbanOrders: { ...(updatedTask.kanbanOrders || {}), [groupingMode]: orderMap[fullTaskId] },
              };
            }

            if (String(t.id) === String(cleanId) || fullTaskId === taskId) {
              const existingDateStr = t.fecha_programada || (t as any).fechaProg || "";
              const dateStr = resolveBucketDate(newColId, existingDateStr);
              const targetDate = new Date(dateStr + "T00:00:00");

              updatedTask = {
                ...updatedTask,
                fecha_programada: dateStr,
                fechaProg: dateStr,
                dueDate: targetDate,
              };

              updateDoc(doc(db, "tasks", String(cleanId)), {
                fecha_programada: dateStr,
                fechaProg: dateStr,
                kanbanOrders: updatedTask.kanbanOrders || {},
                updatedAt: serverTimestamp(),
                updated_at: serverTimestamp(),
              }).catch((err) => console.error("Error actualizando fecha en /tasks:", err));
            }

            return updatedTask;
          });

          return { ...p, tasks: updatedTasks };
        })
      );
    }
  };

  // Props compartidas oficiales para tarjetas de tareas (Idéntico a Work / HomeDashboard)
  const taskCardSharedProps = useMemo(() => ({
    projects: localProjects,
    setProjects: handleUpdateProjects,
    onSelectProject: () => {},
    onSelectTask: (task: Task, pId: any, originRect: any) => handleSelectTask(task, pId, originRect),
    onAddTaskToProject: () => handleOpenNewTaskModal(),
    onChangeProjectColor: () => {},
    colorConfig,
    getStatusPillConfig,
    getFormatPillConfig,
    updateTaskProperty: handleUpdateTaskProperty,
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
    sortBy: "visto" as const,
    setSortBy: () => {},
    sortOrder: "desc" as const,
    setSortOrder: () => {},
    hoveredStatusOptionCard,
    setHoveredStatusOptionCard,
    hoveredFormatOptionCard,
    setHoveredFormatOptionCard,
    availableFormats,
    editingTaskField,
    setEditingTaskField,
    editingValue,
    setEditingValue,
    saveEditing: handleSaveEditing,
    isNightMode: true,
    isHomeEditMode: false,
    setDeleteModalConfig,
    getCalendarDaysDiff,
    formatLocalDate,
    sessions: recentSessions,
  }), [
    localProjects,
    handleUpdateProjects,
    colorConfig,
    getStatusPillConfig,
    getFormatPillConfig,
    handleUpdateTaskProperty,
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
    hoveredStatusOptionCard,
    setHoveredStatusOptionCard,
    hoveredFormatOptionCard,
    setHoveredFormatOptionCard,
    availableFormats,
    editingTaskField,
    setEditingTaskField,
    editingValue,
    setEditingValue,
    handleSaveEditing,
    getCalendarDaysDiff,
    formatLocalDate,
    recentSessions,
    handleSelectTask,
    handleOpenNewTaskModal,
    setDeleteModalConfig,
  ]);

  // Lista de Tareas Sintetizadas para el Kanban y la Tabla
  const kanbanTasks: SynthesizedTask[] = useMemo(() => {
    const proj = localProjects[0] || adaptedProject;
    if (!proj || !proj.tasks) return [];
    return proj.tasks.map((t, index) => {
      const progDateStr = t.fecha_programada || (t as any).fechaProg || t.fecha_limite || (t as any).deadline || formData.fechaFin || formData.fechaInicio || formatLocalDate(new Date());
      const limitDateStr = t.fecha_limite || (t as any).deadline || formData.fechaFin || progDateStr;
      const dueDate = parseAnyDate(limitDateStr) || new Date();

      return {
        id: `kt-${proj.id}-${t.id}`,
        projectName: proj.title,
        projectId: proj.id as any,
        taskTitle: t.title,
        completedTasks: completedTasksCount,
        totalTasks: proj.tasks?.length || 0,
        taskIndex: index,
        dueDate,
        fecha_programada: progDateStr,
        fecha_limite: limitDateStr,
        fecha_creacion: (t as any).fecha_creacion || "",
        status: t.status || (t as any).estado || "Planificado",
        format: t.format || (t as any).formato || "Post",
        time: t.time || (t as any).esfuerzo || "30 min",
        desc: t.desc || "",
        priority: (t as any).priority || (t as any).prioridad || "Media",
        prioridad: (t as any).prioridad || (t as any).priority || "Media",
        kanbanOrders: (t as any).kanbanOrders || {},
        asignado_id: (t as any).asignado_id,
        asignado_ids: (t as any).asignado_ids,
        asignado: (t as any).asignado,
      } as SynthesizedTask;
    });
  }, [localProjects, adaptedProject, formData.fechaFin, formData.fechaInicio, completedTasksCount, formatLocalDate]);

  // Tareas filtradas por búsqueda y filtro de estado
  const filteredKanbanTasks = useMemo(() => {
    return kanbanTasks.filter((t) => {
      const query = taskSearch.toLowerCase().trim();
      if (query) {
        const matches =
          t.taskTitle.toLowerCase().includes(query) ||
          (t.desc && t.desc.toLowerCase().includes(query)) ||
          (t.format && t.format.toLowerCase().includes(query));
        if (!matches) return false;
      }
      if (groupingFilter !== "todos") {
        if (t.status !== groupingFilter) return false;
      }
      return true;
    });
  }, [kanbanTasks, taskSearch, groupingFilter]);

  if (!project) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center h-full bg-[#121212] rounded-[24px] border border-white/[0.08]">
        <Loader2 className="w-8 h-8 animate-spin text-[#ffffff6b] mb-4" />
        <p className="text-sm font-bold text-[#ffffff6b]">Cargando detalles del proyecto...</p>
      </div>
    );
  }

  // Renderizador de tarjeta de '+ Nueva Tarea' en vista Todo
  const renderNewTaskCard = () => {
    if (!isCreatingInlineTask) {
      return (
        <div
          onClick={() => {
            playSound("click");
            setIsCreatingInlineTask(true);
            setInlineTaskTitle("");
            setInlineTaskFormato("Post");
            setInlineTaskEsfuerzo("30 min");
          }}
          className="w-full task-card-wrapper relative flex flex-col items-center justify-center p-4 rounded-2xl border border-dashed border-white/20 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/40 transition-all cursor-pointer group select-none shadow-sm"
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-white/10 group-hover:bg-white/20 group-hover:scale-110 transition-all mb-2 text-white">
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="text-[13px] font-semibold text-white/90 group-hover:text-white text-center">
            Nueva tarea
          </div>
          <p className="text-[11px] text-white/40 mt-0.5 text-center font-normal">
            Añadir entregable a este proyecto
          </p>
        </div>
      );
    }

    return (
      <div className="w-full task-card-wrapper relative flex flex-col justify-between p-3.5 rounded-2xl border border-white/20 bg-[#1c1c1f] shadow-lg">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffffff6b]">
            Crear Nueva Tarea
          </span>
          <SmoothInput
            type="text"
            autoFocus
            unstyled
            placeholder="Nombre de la tarea…"
            value={inlineTaskTitle}
            onChange={(e) => setInlineTaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateInlineTask();
              if (e.key === "Escape") setIsCreatingInlineTask(false);
            }}
            wrapperClassName="w-full px-2.5 py-1 rounded-xl bg-[#252528] border border-white/10 focus-within:border-white/30"
            className="text-xs font-semibold text-white placeholder-white/40"
          />

          <div className="grid grid-cols-2 gap-1.5 mt-0.5">
            <select
              value={inlineTaskFormato}
              onChange={(e) => setInlineTaskFormato(e.target.value)}
              className="px-2 py-1 text-[10px] font-bold rounded-xl bg-[#252528] border border-white/10 text-white outline-none"
            >
              {availableFormats.map((f: string) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>

            <select
              value={inlineTaskEsfuerzo}
              onChange={(e) => setInlineTaskEsfuerzo(e.target.value)}
              className="px-2 py-1 text-[10px] font-bold rounded-xl bg-[#252528] border border-white/10 text-white outline-none"
            >
              <option value="15 min">15 min</option>
              <option value="30 min">30 min</option>
              <option value="45 min">45 min</option>
              <option value="1 hora">1 hora</option>
              <option value="2 horas">2 horas</option>
              <option value="3 horas">3 horas</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/10">
          <button
            type="button"
            onClick={() => setIsCreatingInlineTask(false)}
            className="px-2.5 py-0.5 text-[11px] text-[#ffffff6b] hover:text-white cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleCreateInlineTask}
            disabled={!inlineTaskTitle.trim()}
            className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-white text-black hover:bg-[#e4e4e7] disabled:opacity-40 cursor-pointer"
          >
            Añadir
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`w-full h-full flex flex-col min-h-0 min-w-0 overflow-hidden bg-transparent text-[#ffffffd6] select-none ${
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
      `}</style>

      {/* ── LAYOUT REDIMENSIONABLE CON DIVISOR INTERACTIVO (IDÉNTICO A WORK) ── */}
      <div className="w-full h-full flex-1 flex gap-3 items-stretch max-w-full min-h-0 min-w-0 overflow-hidden">
        
        {/* ── COLUMNA IZQUIERDA: INFORMACIÓN DEL PROYECTO (LIMPIO, MONOCROMÁTICO Y SIN CAJAS DISONANTES) ── */}
        <div 
          style={{ width: `${sidebarWidth}px` }}
          className="shrink-0 flex flex-col h-full overflow-hidden min-h-0 bg-transparent"
        >
          {/* Scrollable Container */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 py-0.5 flex flex-col justify-between min-h-full space-y-3">
            
            <div className="space-y-3 w-full shrink-0">
              {/* 0. CONTROLES SUPERIORES: BOTÓN VOLVER + ACCIONES */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    onBack();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
                  title="Volver a proyectos"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver</span>
                </button>

                {/* Menú de 3 puntos */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      playSound("click");
                      setIsMoreMenuOpen(!isMoreMenuOpen);
                    }}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors cursor-pointer",
                      isMoreMenuOpen ? "bg-white/20 text-white" : "text-white/60 hover:text-white hover:bg-white/10"
                    )}
                    title="Opciones del proyecto"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {isMoreMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsMoreMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-1.5 z-50 w-44 rounded-xl bg-[#1d1d22] border border-[#2e2e38] shadow-2xl p-1 overflow-hidden">
                        <button
                          type="button"
                          onClick={async () => {
                            playSound("trash");
                            setIsMoreMenuOpen(false);
                            try {
                              await deleteDoc(doc(db, "projects", project.id));
                              await deleteDoc(doc(db, "v3_projects", project.id)).catch(() => {});
                            } catch (e) {
                              console.error(e);
                            }
                            onBack();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/15 rounded-lg transition-colors cursor-pointer text-left"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>Eliminar proyecto</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 1. HERO CARD DEL PROYECTO (COLOR DEL PROYECTO) */}
              <div 
                className="w-full rounded-[22px] p-4 flex flex-col gap-2.5 shadow-md text-white transition-colors duration-300 relative overflow-hidden"
                style={{ backgroundColor: currentProjColor }}
              >
                {/* Meta superior: Cliente */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-semibold text-white/90 truncate max-w-[200px] text-[13px] drop-shadow-sm">
                      {formData.clientName || "Brandex"}
                    </span>
                  </div>
                </div>

                {/* Título editable con SmoothInput */}
                <SmoothInput
                  type="text"
                  unstyled
                  value={formData.nombre}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData((prev) => ({ ...prev, nombre: val }));
                  }}
                  onBlur={() => triggerSave({ nombre: formData.nombre })}
                  placeholder="Nombre del proyecto…"
                  caretClassName="bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]"
                  className="w-full text-lg font-bold text-white placeholder:text-white/40 leading-snug py-0.5 select-text drop-shadow-sm"
                />

                {/* Barra de progreso segmentada oficial (Taski standard) — SIN separador */}
                <div className="flex flex-col gap-1 w-full pt-0.5">
                  <div className="flex items-center justify-between text-[11px] text-white/90 font-medium drop-shadow-sm">
                    <span>Tarea {completedTasksCount} de {tasks.length}</span>
                    <span className="font-bold text-white">{progressPercent}%</span>
                  </div>
                  <div className="w-full flex items-center gap-1 h-1.5 my-0.5">
                    {Array.from({ length: Math.max(1, tasks.length) }).map((_, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "h-full flex-1 rounded-full transition-all duration-300",
                          idx < completedTasksCount ? "bg-white" : "bg-white/25"
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Fecha de creación: Debajo del rectángulo redondeado */}
              <div className="px-1 text-[11px] text-[#ffffff6b] font-normal">
                Creado el {formatProjectCreatedDate(project)}
              </div>

              {/* 1. PROPIEDADES (2 FILAS DE 3 PÍLDORAS) */}
              <div className="flex flex-col gap-2 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffffff6b] px-0.5">
                  Propiedades
                </span>

                {/* Fila 1: Estado, Cliente, Fechas */}
                <div className="grid grid-cols-3 gap-1.5 w-full">
                  {/* Estado */}
                  <div className="relative w-full">
                    <button
                      type="button"
                      onClick={() => {
                        playSound("click");
                        setActivePopover(activePopover === "status" ? null : "status");
                      }}
                      className={cn(
                        "w-full h-7 flex items-center justify-center gap-1 text-center border text-[11px] font-medium px-1.5 rounded-full transition-colors cursor-pointer truncate",
                        activePopover === "status"
                          ? "bg-white/10 border-white/30 text-white"
                          : "bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-white/80"
                      )}
                      title={`Estado: ${formData.estadoProyecto || "Planificación"}`}
                    >
                      <ProjectStatusIcon status={formData.estadoProyecto || "Planificación"} className="w-3 h-3 shrink-0" />
                      <span className="truncate">{formData.estadoProyecto || "Estado"}</span>
                    </button>
                    <LinearDropdownPopover
                      isOpen={activePopover === "status"}
                      onClose={() => setActivePopover(null)}
                      placeholder="Cambiar estado…"
                      shortcutKey="S"
                      selectedValue={formData.estadoProyecto}
                      onSelect={(val) => {
                        triggerSave({ estadoProyecto: val });
                        setActivePopover(null);
                      }}
                      options={PROJ_STATUS_OPTIONS}
                    />
                  </div>

                  {/* Cliente */}
                  <div className="relative w-full">
                    <button
                      type="button"
                      onClick={() => {
                        playSound("click");
                        setActivePopover(activePopover === "client" ? null : "client");
                      }}
                      className={cn(
                        "w-full h-7 flex items-center justify-center gap-1 text-center border text-[11px] font-medium px-1.5 rounded-full transition-colors cursor-pointer truncate",
                        activePopover === "client"
                          ? "bg-white/10 border-white/30 text-white"
                          : "bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-white/80"
                      )}
                      title={`Cliente: ${formData.clientName || "Cliente"}`}
                    >
                      <User className="w-3 h-3 shrink-0 text-white/60" />
                      <span className="truncate">{formData.clientName || "Cliente"}</span>
                    </button>
                    <LinearDropdownPopover
                      isOpen={activePopover === "client"}
                      onClose={() => setActivePopover(null)}
                      placeholder="Cambiar cliente…"
                      shortcutKey="C"
                      selectedValue={formData.cliente_id}
                      onSelect={(val) => {
                        const selectedClient = availableClients.find((c: Client) => String(c.id) === String(val));
                        const clientName = selectedClient?.nombre || (selectedClient as any)?.name || "Brandex";
                        triggerSave({ cliente_id: val || "", clientName });
                        setActivePopover(null);
                      }}
                      options={availableClients.map((c: Client) => ({
                        id: String(c.id),
                        label: c.nombre || (c as any).name || "Cliente",
                        color: getSingleSourceClientColor(c).hslCss,
                        badge: c.industria || (c as any).industry || undefined,
                      }))}
                    />
                  </div>

                  {/* Fechas */}
                  <div className="relative w-full">
                    <button
                      type="button"
                      onClick={() => {
                        playSound("click");
                        setActivePopover(activePopover === "date" ? null : "date");
                      }}
                      className={cn(
                        "w-full h-7 flex items-center justify-center gap-1 text-center border text-[11px] font-medium px-1.5 rounded-full transition-colors cursor-pointer truncate",
                        activePopover === "date"
                          ? "bg-white/10 border-white/30 text-white"
                          : "bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-white/80"
                      )}
                      title={dateLabel}
                    >
                      <Calendar className="w-3 h-3 shrink-0 text-white/60" />
                      <span className="truncate">{dateLabel}</span>
                    </button>
                    <LinearDatePopover
                      isOpen={activePopover === "date"}
                      onClose={() => setActivePopover(null)}
                      startDate={formData.fechaInicio || ""}
                      deadline={formData.fechaFin || ""}
                      onSelectDates={(start, end) => {
                        triggerSave({ fechaInicio: start, fechaFin: end });
                        setActivePopover(null);
                      }}
                    />
                  </div>
                </div>

                {/* Fila 2: Prioridad, Salud RAG, Tipo de proyecto */}
                <div className="grid grid-cols-3 gap-1.5 w-full">
                  {/* Prioridad */}
                  <div className="relative w-full">
                    <button
                      type="button"
                      onClick={() => {
                        playSound("click");
                        setActivePopover(activePopover === "priority" ? null : "priority");
                      }}
                      className={cn(
                        "w-full h-7 flex items-center justify-center gap-1 text-center border text-[11px] font-medium px-1.5 rounded-full transition-colors cursor-pointer truncate",
                        activePopover === "priority"
                          ? "bg-white/10 border-white/30 text-white"
                          : "bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-white/80"
                      )}
                      title={`Prioridad: ${formData.prioridad || "Media"}`}
                    >
                      <Flag className="w-3 h-3 shrink-0 text-white/60" />
                      <span className="truncate">{formData.prioridad || "Prioridad"}</span>
                    </button>
                    <LinearDropdownPopover
                      isOpen={activePopover === "priority"}
                      onClose={() => setActivePopover(null)}
                      placeholder="Cambiar prioridad…"
                      shortcutKey="P"
                      selectedValue={formData.prioridad}
                      onSelect={(val) => {
                        triggerSave({ prioridad: val });
                        setActivePopover(null);
                      }}
                      options={PROJ_PRIORITY_OPTIONS}
                    />
                  </div>

                  {/* Salud RAG */}
                  <div className="relative w-full">
                    <button
                      type="button"
                      onClick={() => {
                        playSound("click");
                        setActivePopover(activePopover === "salud" ? null : "salud");
                      }}
                      className={cn(
                        "w-full h-7 flex items-center justify-center gap-1 text-center border text-[11px] font-medium px-1.5 rounded-full transition-colors cursor-pointer truncate",
                        activePopover === "salud"
                          ? "bg-white/10 border-white/30 text-white"
                          : "bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-white/80"
                      )}
                      title={formData.salud === "rojo" ? "Bloqueado" : formData.salud === "ambar" ? "Con riesgos" : "En tiempo"}
                    >
                      <span className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        formData.salud === "rojo" ? "bg-rose-500" :
                        formData.salud === "ambar" ? "bg-amber-500" : "bg-emerald-500"
                      )} />
                      <span className="truncate">{formData.salud === "rojo" ? "Bloqueado" : formData.salud === "ambar" ? "Riesgo" : "A tiempo"}</span>
                    </button>
                    <LinearDropdownPopover
                      isOpen={activePopover === "salud"}
                      onClose={() => setActivePopover(null)}
                      placeholder="Salud del proyecto…"
                      shortcutKey="H"
                      selectedValue={formData.salud}
                      onSelect={(val) => {
                        triggerSave({ salud: val as any });
                        setActivePopover(null);
                      }}
                      options={PROJ_HEALTH_OPTIONS}
                    />
                  </div>

                  {/* Tipo de proyecto */}
                  <div className="relative w-full">
                    <button
                      type="button"
                      onClick={() => {
                        playSound("click");
                        setActivePopover(activePopover === "type" ? null : "type");
                      }}
                      className={cn(
                        "w-full h-7 flex items-center justify-center text-center border text-[11px] font-medium px-1.5 rounded-full transition-colors cursor-pointer truncate",
                        activePopover === "type"
                          ? "bg-white/10 border-white/30 text-white"
                          : "bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-white/80"
                      )}
                      title={formData.tipo || "Tipo"}
                    >
                      <span className="truncate">{formData.tipo || "Tipo"}</span>
                    </button>
                    <LinearDropdownPopover
                      isOpen={activePopover === "type"}
                      onClose={() => setActivePopover(null)}
                      placeholder="Tipo de proyecto…"
                      shortcutKey="T"
                      selectedValue={formData.tipo}
                      onSelect={(val) => {
                        triggerSave({ tipo: val });
                        setActivePopover(null);
                      }}
                      options={PROJ_TYPE_OPTIONS}
                    />
                  </div>
                </div>
              </div>

              {/* 2. COLOR DE PORTADA (SQUIRCLES) */}
              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffffff6b] px-0.5">
                  Color de portada
                </span>
                <div className="flex items-center gap-1.5">
                  {PROJECT_COLOR_PALETTE.map((preset, idx) => {
                    const isSelected = selectedColorIdx === idx;
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        title={preset.name}
                        onClick={() => handleSelectColor(idx)}
                        className={cn(
                          "w-4 h-4 rounded-[6px] bg-gradient-to-br transition-all cursor-pointer border",
                          preset.gradient,
                          isSelected ? "border-white scale-110 shadow-sm ring-1 ring-white/50" : "border-transparent opacity-60 hover:opacity-100"
                        )}
                      />
                    );
                  })}
                </div>
              </div>

              {/* 3. FINANZAS & RENTABILIDAD */}
              <div className="pt-2 border-t border-white/5 flex flex-col gap-2">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffffff6b]">
                    Finanzas & Rentabilidad
                  </span>
                  {summary.sessionsSinTarifa > 0 && (
                    <span className="text-[10px] text-amber-400 flex items-center gap-1" title={`${summary.sessionsSinTarifa} sesiones sin tarifa horaria`}>
                      <AlertCircle className="w-3 h-3" />
                      <span>{summary.sessionsSinTarifa} sin tarifa</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  {/* Presupuesto */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-white/40 font-medium">Presupuesto</span>
                    <div className="flex items-center gap-0.5 text-xs font-semibold text-[#ffffffd6]">
                      <span className="text-white/40">$</span>
                      <input
                        type="text"
                        value={formData.presupuesto !== undefined ? String(formData.presupuesto) : ""}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.]/g, "");
                          setFormData((prev) => ({ ...prev, presupuesto: val ? Number(val) : 0, costo: val ? Number(val) : 0 }));
                        }}
                        onBlur={() => triggerSave({ presupuesto: formData.presupuesto, costo: formData.presupuesto })}
                        placeholder="0"
                        className="w-full bg-transparent text-xs font-semibold text-[#ffffffd6] placeholder-white/20 outline-none ring-0 border-none p-0"
                      />
                    </div>
                    {(summary.tareasExtrasPrecio ?? 0) > 0 && (
                      <span className="text-[9px] text-emerald-400/80 font-mono leading-none" title="Precio acumulado de tareas extras">
                        +${(summary.tareasExtrasPrecio || 0).toLocaleString()} extra
                      </span>
                    )}
                  </div>

                  {/* Costo Real */}
                  <div className="flex flex-col gap-0.5 border-l border-white/5 pl-2">
                    <span className="text-[10px] text-white/40 font-medium">Costo Real</span>
                    <span className="text-xs font-semibold text-white/80" title={`Sesiones: $${summary.costoSesiones || 0} | Delegación: $${summary.tareasCostoDelegado || 0}`}>
                      ${(summary.costoReal || 0).toLocaleString()}
                    </span>
                    {(summary.tareasCostoDelegado ?? 0) > 0 && (
                      <span className="text-[9px] text-white/40 font-mono leading-none" title="Costo de tareas delegadas">
                        ${(summary.tareasCostoDelegado || 0).toLocaleString()} del.
                      </span>
                    )}
                  </div>

                  {/* Margen */}
                  <div className="flex flex-col gap-0.5 border-l border-white/5 pl-2">
                    <span className="text-[10px] text-white/40 font-medium">Margen</span>
                    {summary.margen !== null ? (
                      <div className="flex items-center gap-1">
                        <span className={cn(
                          "text-[10px] font-bold px-1 py-0.5 rounded leading-none",
                          summary.margen >= 20 ? "text-emerald-400 bg-emerald-500/15" :
                          summary.margen >= 0 ? "text-amber-400 bg-amber-500/15" :
                          "text-rose-400 bg-rose-500/15"
                        )}>
                          {summary.margen > 0 ? `+${summary.margen}%` : `${summary.margen}%`}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-white/40 font-medium">—</span>
                    )}
                    {summary.margenDinero !== undefined && summary.margenDinero !== null && (
                      <span className={cn(
                        "text-[9px] font-mono leading-none",
                        summary.margenDinero >= 0 ? "text-white/60" : "text-rose-400/80"
                      )}>
                        ${summary.margenDinero.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 4. EQUIPO DEL PROYECTO */}
              <div className="pt-2 border-t border-white/5 flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffffff6b] px-0.5">
                  Equipo del Proyecto
                </span>

                <div className="flex flex-col gap-2 px-0.5">
                  {/* Project Lead */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-white/70">
                      <UserCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>Project Lead:</span>
                    </div>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          playSound("click");
                          setActivePopover(activePopover === "lead" ? null : "lead");
                        }}
                        className="text-xs font-medium text-[#ffffffd6] hover:text-white bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg border border-white/5 transition-colors cursor-pointer flex items-center gap-1.5 truncate max-w-[140px]"
                      >
                        <span className="truncate">{leadMember ? leadMember.nombre : "Sin asignar"}</span>
                      </button>
                      <LinearDropdownPopover
                        isOpen={activePopover === "lead"}
                        onClose={() => setActivePopover(null)}
                        placeholder="Asignar Lead…"
                        shortcutKey="L"
                        selectedValue={formData.lead_id}
                        onSelect={(val) => {
                          triggerSave({ lead_id: val });
                          setActivePopover(null);
                        }}
                        options={[
                          { id: "", label: "Sin asignar" },
                          ...workers.map((w: any) => ({
                            id: String(w.id),
                            label: w.nombre || "Colaborador",
                            badge: w.rol || undefined,
                          })),
                        ]}
                      />
                    </div>
                  </div>

                  {/* Colaboradores Asignados */}
                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    <div className="flex items-center gap-1.5 text-xs text-white/70">
                      <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>Colaboradores:</span>
                    </div>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          playSound("click");
                          setActivePopover(activePopover === "assignee" ? null : "assignee");
                        }}
                        className="text-xs font-medium text-[#ffffffd6] hover:text-white bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg border border-white/5 transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <span>{formData.asignado_ids?.length ? `${formData.asignado_ids.length} asignados` : "Asignar"}</span>
                      </button>
                      <LinearDropdownPopover
                        isOpen={activePopover === "assignee"}
                        onClose={() => setActivePopover(null)}
                        placeholder="Asignar colaboradores…"
                        shortcutKey="A"
                        selectedValue={formData.asignado_ids?.[0] || ""}
                        onSelect={(val) => {
                          handleToggleWorker(val);
                        }}
                        options={workers.map((w: any) => ({
                          id: String(w.id),
                          label: w.nombre || "Colaborador",
                          badge: formData.asignado_ids?.includes(w.id) ? "✓ Asignado" : w.rol || undefined,
                        }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. METAS DE NEGOCIO / OKRS */}
              <div className="pt-2 border-t border-white/5 flex flex-col gap-2">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffffff6b]">
                    Metas & OKRs ({formData.metas_negocio?.length || 0})
                  </span>
                </div>

                {/* Input para agregar meta */}
                <div className="flex items-center gap-1.5">
                  <SmoothInput
                    type="text"
                    unstyled
                    value={newMetaInput}
                    onChange={(e) => setNewMetaInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddMeta();
                      }
                    }}
                    placeholder="Añadir objetivo u OKR..."
                    wrapperClassName="flex-1 bg-[#181818] border border-white/10 rounded-xl px-2.5 py-1 focus-within:border-white/20"
                    className="text-xs text-[#ffffffd6] placeholder:text-[#ffffff6b]"
                  />
                  <button
                    type="button"
                    onClick={handleAddMeta}
                    disabled={!newMetaInput.trim()}
                    className="px-2 py-1 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white transition-colors cursor-pointer shrink-0"
                    title="Agregar objetivo"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Lista de metas */}
                {formData.metas_negocio && formData.metas_negocio.length > 0 ? (
                  <div className="flex flex-col gap-1 max-h-[110px] overflow-y-auto custom-scrollbar pr-0.5">
                    {formData.metas_negocio.map((meta: string, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-start justify-between gap-2 p-1.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 transition-colors group"
                      >
                        <div className="flex items-start gap-1.5 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                          <span className="text-xs text-[#ffffffd6] leading-relaxed break-words">{meta}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteMeta(idx)}
                          className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-rose-400 transition-opacity cursor-pointer p-0.5 shrink-0"
                          title="Eliminar meta"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-[#ffffff6b] italic px-1">Sin objetivos definidos aún.</p>
                )}
              </div>

              {/* 6. DIRECTRICES Y NOTAS */}
              <div className="pt-2 border-t border-white/5 flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffffff6b] px-0.5">
                  Directrices y Notas
                </span>
                <SmoothTextarea
                  rows={3}
                  unstyled
                  value={formData.descripcion}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData((prev) => ({ ...prev, descripcion: val }));
                  }}
                  onBlur={() => triggerSave({ descripcion: formData.descripcion })}
                  placeholder="Escribe directrices, objetivos, brief o notas del proyecto..."
                  wrapperClassName="w-full p-2.5 rounded-xl bg-[#181818] border border-white/10 focus-within:border-white/20 transition-colors"
                  className="text-xs text-[#ffffffd6] placeholder:text-[#ffffff6b] leading-relaxed custom-scrollbar"
                />
              </div>

              {/* 7. ENTREGABLES DEL PROYECTO */}
              {tasks.length > 0 && (
                <div className="pt-2 border-t border-white/5 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[#ffffff6b] px-0.5">
                    <span>Entregables ({tasks.length})</span>
                    <span>{completedTasksCount} listos</span>
                  </div>
                  <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto custom-scrollbar pr-0.5">
                    {tasks.map((t: any) => {
                      const isDone = (t.estado || t.status) === "Completado";
                      return (
                        <div
                          key={t.id}
                          onClick={() => handleSelectTask(t)}
                          className="w-full flex items-center justify-between p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 transition-all cursor-pointer group select-none"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                playSound("pop");
                                const newStatus = isDone ? "Planificado" : "Completado";
                                updateTask.mutate({
                                  id: String(t.id),
                                  estado: newStatus,
                                  status: newStatus,
                                } as any);
                              }}
                              className={cn(
                                "w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors cursor-pointer",
                                isDone ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" : "border-white/20 hover:border-white/40 text-transparent"
                              )}
                              title={isDone ? "Marcar como pendiente" : "Marcar como completada"}
                            >
                              {isDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </button>
                            <span className={cn(
                              "text-xs truncate transition-colors",
                              isDone ? "line-through text-white/40" : "text-[#ffffffd6] group-hover:text-white"
                            )}>
                              {t.titulo || t.title || "Tarea"}
                            </span>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/50 border border-white/5 shrink-0">
                            {t.formato || t.format || "Post"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            {/* Pie con indicador de guardado Firestore */}
            <div className="pt-2 flex items-center justify-between text-[11px] text-[#ffffff6b] border-t border-white/5">
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all",
                  saveStatus === "saving" ? "bg-amber-400 animate-pulse" :
                  saveStatus === "saved" ? "bg-emerald-400" : "bg-emerald-500/60"
                )} />
                <span>
                  {saveStatus === "saving" ? "Guardando…" :
                   saveStatus === "saved" ? "Guardado en la nube" : "Sincronizado"}
                </span>
              </div>
              <span className="text-[10px] text-white/30 font-mono">Firestore</span>
            </div>

          </div>
        </div>

        {/* ── DIVISOR REDIMENSIONABLE CON PÍLDORA AZUL (IDÉNTICO A WORK) ── */}
        <ResizableDivider 
          side="right"
          ariaLabel="Redimensionar panel del proyecto"
          onResize={handleSidebarResize}
          onResizeEnd={handleSidebarResizeEnd}
        />

        {/* ── COLUMNA DERECHA: KANBAN / TODAS LAS TAREAS / TIMELINE / TABLA ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4 h-full overflow-hidden">
          
          {/* ── BARRA SUPERIOR DE VISTAS (IDÉNTICO A WORK + OPCIÓN 'TODO') ── */}
          <div className="flex items-center h-[52px] w-full gap-2 shrink-0 select-none">
            
            {/* Zona Izquierda de balance */}
            <div className="flex-1 basis-0" />

            {/* ZONA CENTRAL: VIEW SWITCHER OFICIAL (PÍLDORA TASKI) */}
            <div className="flex-none flex items-center justify-center">
              {/* Botón de cerrar búsqueda */}
              <AnimatePresence>
                {isSearchActive && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8, width: 0, marginRight: 0 }}
                    animate={{ opacity: 1, scale: 1, width: 32, marginRight: 8 }}
                    exit={{ opacity: 0, scale: 0.8, width: 0, marginRight: 0 }}
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                    type="button"
                    onClick={() => {
                      setActiveView(previousView);
                      setTaskSearch("");
                      playSound('click');
                    }}
                    className="flex items-center justify-center h-8 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 cursor-pointer shrink-0 z-50 overflow-hidden"
                    title="Cerrar búsqueda"
                  >
                    <X className="w-4 h-4 shrink-0" />
                  </motion.button>
                )}
              </AnimatePresence>
              
              <motion.div 
                layout
                className="flex items-center rounded-full p-1 w-fit shrink-0 border transition-colors duration-300 bg-[#121212] border-[#ffffff1f]"
              >
                {/* 1. Search Tab */}
                <motion.button
                  layout
                  type="button"
                  onHoverStart={() => !isSearchActive && setHoveredTab("buscar")}
                  onHoverEnd={() => setHoveredTab(null)}
                  onClick={() => {
                    if (activeView !== "buscar") {
                      setPreviousView(activeView);
                    }
                    setActiveView("buscar");
                    playSound('click');
                  }}
                  animate={{
                    width: isSearchActive ? 280 : (hoveredTab === "buscar" ? 120 : 92),
                  }}
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  className={`relative z-10 box-border inline-flex h-8 items-center justify-center rounded-full whitespace-nowrap select-none gap-1.5 text-xs font-bold transition-colors duration-200 ${
                    isSearchActive
                      ? "text-[#ffffffd6] px-3"
                      : "text-[#ffffffd6] hover:text-white cursor-pointer px-0"
                  }`}
                >
                  {activeView === "buscar" && (
                    <motion.span
                      layoutId="projActiveViewIndicator"
                      className="absolute inset-0 rounded-full border bg-[#1f1f1f] border-[#ffffff1f] shadow-sm"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  {!isSearchActive && hoveredTab === "buscar" && (
                    <motion.span
                      layoutId="projHoverViewIndicator"
                      className="absolute inset-0 rounded-full border bg-[#282828] border-white/10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Search className="w-[13.55px] h-[13.55px] shrink-0 relative z-10 text-[#ffffffd6]" />
                  {isSearchActive ? (
                    <SmoothInput
                      type="text"
                      autoFocus
                      unstyled
                      value={taskSearch}
                      onChange={(e) => setTaskSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Buscar tareas en este proyecto..."
                      wrapperClassName="w-full relative z-10"
                      className="text-xs text-[#ffffffd6] placeholder:text-[#ffffff6b]"
                    />
                  ) : (
                    <span className="relative z-10 text-[#ffffffd6]">Search</span>
                  )}
                </motion.button>

                {/* 2. Todo Tab (Todas las tareas) */}
                <motion.button
                  layout
                  type="button"
                  onHoverStart={() => setHoveredTab("todo")}
                  onHoverEnd={() => setHoveredTab(null)}
                  onClick={() => {
                    setActiveView("todo");
                    playSound('click');
                  }}
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  className={`relative z-10 box-border inline-flex h-8 items-center justify-center rounded-full whitespace-nowrap select-none gap-1.5 px-4 text-xs font-bold transition-colors duration-200 cursor-pointer ${
                    activeView === "todo"
                      ? "text-[#ffffffd6]"
                      : "text-[#ffffffd6] hover:text-white"
                  }`}
                >
                  {activeView === "todo" && (
                    <motion.span
                      layoutId="projActiveViewIndicator"
                      className="absolute inset-0 rounded-full border bg-[#1f1f1f] border-[#ffffff1f] shadow-sm"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  {hoveredTab === "todo" && (
                    <motion.span
                      layoutId="projHoverViewIndicator"
                      className="absolute inset-0 rounded-full border bg-[#282828] border-white/10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Layers className="w-[13.55px] h-[13.55px] shrink-0 relative z-10 text-[#ffffffd6]" />
                  <span className="relative z-10">Todo</span>
                </motion.button>

                {/* 3. Kanban Tab */}
                <motion.button
                  layout
                  type="button"
                  onHoverStart={() => setHoveredTab("kanban")}
                  onHoverEnd={() => setHoveredTab(null)}
                  onClick={() => {
                    setActiveView("kanban");
                    playSound('click');
                  }}
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  className={`relative z-10 box-border inline-flex h-8 items-center justify-center rounded-full whitespace-nowrap select-none gap-1.5 px-4 text-xs font-bold transition-colors duration-200 cursor-pointer ${
                    activeView === "kanban"
                      ? "text-[#ffffffd6]"
                      : "text-[#ffffffd6] hover:text-white"
                  }`}
                >
                  {activeView === "kanban" && (
                    <motion.span
                      layoutId="projActiveViewIndicator"
                      className="absolute inset-0 rounded-full border bg-[#1f1f1f] border-[#ffffff1f] shadow-sm"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  {hoveredTab === "kanban" && (
                    <motion.span
                      layoutId="projHoverViewIndicator"
                      className="absolute inset-0 rounded-full border bg-[#282828] border-white/10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <LayoutGrid className="w-[13.55px] h-[13.55px] shrink-0 relative z-10 text-[#ffffffd6]" />
                  <span className="relative z-10">Kanban</span>
                </motion.button>

                {/* 4. Base de Datos / Tabla Tab */}
                <motion.button
                  layout
                  type="button"
                  onHoverStart={() => setHoveredTab("tabla")}
                  onHoverEnd={() => setHoveredTab(null)}
                  onClick={() => {
                    setActiveView("tabla");
                    playSound('click');
                  }}
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  className={`relative z-10 box-border inline-flex h-8 items-center justify-center rounded-full whitespace-nowrap select-none gap-1.5 px-4 text-xs font-bold transition-colors duration-200 cursor-pointer ${
                    activeView === "tabla"
                      ? "text-[#ffffffd6]"
                      : "text-[#ffffffd6] hover:text-white"
                  }`}
                >
                  {activeView === "tabla" && (
                    <motion.span
                      layoutId="projActiveViewIndicator"
                      className="absolute inset-0 rounded-full border bg-[#1f1f1f] border-[#ffffff1f] shadow-sm"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  {hoveredTab === "tabla" && (
                    <motion.span
                      layoutId="projHoverViewIndicator"
                      className="absolute inset-0 rounded-full border bg-[#282828] border-white/10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Table className="w-[13.55px] h-[13.55px] shrink-0 relative z-10 text-[#ffffffd6]" />
                  <span className="relative z-10">Base de datos</span>
                </motion.button>

                {/* 5. Timeline Tab */}
                <motion.button
                  layout
                  type="button"
                  onHoverStart={() => setHoveredTab("timeline")}
                  onHoverEnd={() => setHoveredTab(null)}
                  onClick={() => {
                    setActiveView("timeline");
                    playSound('click');
                  }}
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  className={`relative z-10 box-border inline-flex h-8 items-center justify-center rounded-full whitespace-nowrap select-none gap-1.5 px-4 text-xs font-bold transition-colors duration-200 cursor-pointer ${
                    activeView === "timeline"
                      ? "text-[#ffffffd6]"
                      : "text-[#ffffffd6] hover:text-white"
                  }`}
                >
                  {activeView === "timeline" && (
                    <motion.span
                      layoutId="projActiveViewIndicator"
                      className="absolute inset-0 rounded-full border bg-[#1f1f1f] border-[#ffffff1f] shadow-sm"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  {hoveredTab === "timeline" && (
                    <motion.span
                      layoutId="projHoverViewIndicator"
                      className="absolute inset-0 rounded-full border bg-[#282828] border-white/10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <CalendarDays className="w-[13.55px] h-[13.55px] shrink-0 relative z-10 text-[#ffffffd6]" />
                  <span className="relative z-10">Timeline</span>
                </motion.button>
              </motion.div>
            </div>

            {/* ZONA DERECHA: Botón de Agrupación / Filtros */}
            <div className="flex-1 basis-0 flex items-center justify-end">
              <div className="relative">
                <button
                  onClick={() => {
                    playSound('click');
                    setGroupDropdownOpen(!groupDropdownOpen);
                  }}
                  title="Filtros y agrupación"
                  className="flex items-center justify-center h-8 w-8 rounded-full border transition-all duration-200 shrink-0 shadow-sm active:scale-95 bg-[#1f1f1f] border-[#ffffff1f] text-[#ffffffd6] hover:bg-[#282828] hover:text-white cursor-pointer"
                >
                  <ListFilter className="w-[13.55px] h-[13.55px] text-[#ffffffd6]" />
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {groupDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setGroupDropdownOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2.5 w-52 rounded-2xl border backdrop-blur-md shadow-2xl z-50 p-2 flex flex-col gap-0.5 bg-slate-950/95 border-white/10 text-slate-350 shadow-black/80"
                      >
                        {activeView === "kanban" ? (
                          <>
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2.5 py-1 select-none">
                              Agrupar Kanban por
                            </div>
                            
                            {(["estado", "fecha", "prioridad"] as const).map((mode) => (
                              <button
                                key={mode}
                                onClick={() => {
                                  setGroupingMode(mode);
                                  setGroupDropdownOpen(false);
                                  playSound("click");
                                }}
                                className={cn(
                                  "text-left px-2.5 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-between transition-all duration-150 cursor-pointer",
                                  groupingMode === mode
                                    ? "bg-white/10 text-white shadow-sm font-bold"
                                    : "hover:bg-white/[0.04] hover:text-slate-200 text-slate-400"
                                )}
                              >
                                <span>
                                  {mode === "estado" ? "Estado de tarea" :
                                   mode === "fecha" ? "Fecha de entrega" : "Prioridad"}
                                </span>
                                {groupingMode === mode && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                              </button>
                            ))}
                          </>
                        ) : activeView === "timeline" ? (
                          <>
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2.5 py-1 select-none">
                              Filtros de Timeline
                            </div>
                            <button
                              onClick={() => {
                                setTimelineHideCompleted(!timelineHideCompleted);
                                playSound("click");
                              }}
                              className={cn(
                                "text-left px-2.5 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-between transition-all duration-150 cursor-pointer",
                                timelineHideCompleted ? "bg-white/10 text-white font-bold" : "hover:bg-white/[0.04] text-slate-400"
                              )}
                            >
                              <span>Ocultar completadas</span>
                              {timelineHideCompleted && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2.5 py-1 select-none">
                              Filtrar por estado
                            </div>
                            {(["todos", "Planificado", "En Proceso", "En Revisión", "Completado"] as const).map((st) => (
                              <button
                                key={st}
                                onClick={() => {
                                  setGroupingFilter(st);
                                  setGroupDropdownOpen(false);
                                  playSound("click");
                                }}
                                className={cn(
                                  "text-left px-2.5 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-between transition-all duration-150 cursor-pointer",
                                  groupingFilter === st
                                    ? "bg-white/10 text-white shadow-sm font-bold"
                                    : "hover:bg-white/[0.04] hover:text-slate-200 text-slate-400"
                                )}
                              >
                                <span>{st === "todos" ? "Todos los estados" : st}</span>
                                {groupingFilter === st && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                              </button>
                            ))}
                          </>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>

          </div>

          {/* ── CONTENIDO DINÁMICO SEGÚN LA PESTAÑA ACTIVA ── */}
          <div className={`w-full h-full flex-1 min-h-0 min-w-0 relative ${draggingTaskId ? "overflow-visible" : "overflow-hidden"}`}>
            
            {/* 1. VISTA 'KANBAN' (EL KANBAN REAL DE WORK CON DND) */}
            {activeView === "kanban" && (
              <KanbanBoard
                projects={localProjects}
                filteredKanbanTasks={filteredKanbanTasks}
                groupingMode={groupingMode}
                isNightMode={true}
                headerBgStyle="bg-white/[0.03]"
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
                updateVisibleCards={() => {}}
                getCalendarDaysDiff={getCalendarDaysDiff}
                formatLocalDate={formatLocalDate}
                handleDropTask={handleDropTask}
                taskCardSharedProps={taskCardSharedProps}
              />
            )}

            {/* 2. VISTA 'TODO' (TODAS LAS TAREAS EN CUADRÍCULA CON TARJETAS OFICIALES ACTUALIZADAS) */}
            {activeView === "todo" && (
              <div className="w-full h-full overflow-y-auto custom-scrollbar pr-1 pb-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5 items-start">
                  {/* Tarjeta 0: '+ Nueva tarea' */}
                  {renderNewTaskCard()}

                  {/* Tarjetas oficiales de tareas */}
                  {filteredKanbanTasks.map((t, idx) => (
                    <div 
                      key={t.id} 
                      className="w-full task-card-wrapper relative hover:z-20 transition-[z-index] duration-150"
                    >
                      <TaskCardContent
                        {...taskCardSharedProps}
                        taskId={t.id}
                        projectId={t.projectId}
                        projectName={t.projectName}
                        taskTitle={t.taskTitle}
                        completedTasks={completedTasksCount}
                        totalTasks={tasks.length}
                        taskIndex={idx}
                        desc={t.desc || ""}
                      />
                    </div>
                  ))}
                </div>

                {filteredKanbanTasks.length === 0 && !isCreatingInlineTask && (
                  <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
                    <Layers className="w-12 h-12 mb-3 text-[#ffffff6b]" />
                    <h4 className="text-lg font-bold text-[#ffffffd6]">Sin entregables encontrados</h4>
                    <p className="text-xs text-[#ffffff6b] mt-1 max-w-xs">
                      {taskSearch ? `No hay tareas que coincidan con "${taskSearch}".` : "Comienza agregando la primera tarea a este proyecto."}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 3. VISTA 'TIMELINE' (EL TIMELINE REAL DE WORK) */}
            {activeView === "timeline" && (
              <TimelineView
                projects={localProjects}
                onSelectProject={() => {}}
                onSelectTask={(task, pId, originRect) => handleSelectTask(task, pId, originRect)}
                onUpdateProjects={handleUpdateProjects}
                timelineHideCompleted={timelineHideCompleted}
                onToggleTimelineHideCompleted={() => setTimelineHideCompleted(!timelineHideCompleted)}
                timelineSortBy={timelineSortBy}
                onSetTimelineSortBy={setTimelineSortBy}
                isNightMode={true}
              />
            )}

            {/* 4. VISTA 'TABLA' / BASE DE DATOS (LA TABLA REAL DE WORK) */}
            {activeView === "tabla" && (
              <TaskTableView
                projects={localProjects}
                kanbanTasks={kanbanTasks}
                headerBgStyle="bg-white/[0.03]"
                cardBgStyle="bg-white/[0.04]"
                onSelectTab={() => {}}
                onSelectProject={() => {}}
                onSelectTask={(task, pId) => handleSelectTask(task, pId)}
              />
            )}

            {/* 5. VISTA 'BUSCAR' */}
            {activeView === "buscar" && (
              <div className="w-full h-full overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-1 pt-1">
                <span className="text-[10px] font-bold text-[#ffffff6b] uppercase tracking-wider px-1">
                  Resultados en este proyecto ({filteredKanbanTasks.length})
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5 items-start pb-8">
                  {filteredKanbanTasks.map((t, idx) => (
                    <div 
                      key={t.id} 
                      className="w-full task-card-wrapper relative hover:z-20 transition-[z-index] duration-150"
                    >
                      <TaskCardContent
                        {...taskCardSharedProps}
                        taskId={t.id}
                        projectId={t.projectId}
                        projectName={t.projectName}
                        taskTitle={t.taskTitle}
                        completedTasks={completedTasksCount}
                        totalTasks={tasks.length}
                        taskIndex={idx}
                        desc={t.desc || ""}
                      />
                    </div>
                  ))}
                </div>

                {filteredKanbanTasks.length === 0 && (
                  <div className="py-16 flex flex-col items-center justify-center text-center opacity-40">
                    <Search className="w-10 h-10 mb-2 text-[#ffffff6b]" />
                    <p className="text-xs text-[#ffffff6b]">No se encontraron tareas con &quot;{taskSearch}&quot;</p>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

        {/* ── COLUMNA DERECHA: PANEL LATERAL DE TAREA (TaskSidePanel) ── */}
        <AnimatePresence mode="wait">
          {internalSideTask && (
            <>
              <div className="shrink-0 h-full flex items-center justify-center -mx-1.5 z-40">
                <ResizableDivider
                  side="left"
                  ariaLabel="Redimensionar panel lateral de tarea"
                  onResize={(deltaX) => {
                    setTaskSidePanelWidth((prev) => Math.min(Math.max(prev - deltaX, 315), 600));
                  }}
                  onResizeEnd={() => {
                    if (typeof window !== "undefined") {
                      localStorage.setItem("taski_task_sidepanel_width", String(taskSidePanelWidth));
                    }
                  }}
                  className="h-full"
                />
              </div>
              <motion.div
                key="internal-task-sidepanel"
                initial={{ opacity: 0, x: 40, width: 0 }}
                animate={{ opacity: 1, x: 0, width: taskSidePanelWidth }}
                exit={{ opacity: 0, x: 40, width: 0 }}
                transition={{ type: "spring", damping: 28, stiffness: 280 }}
                className="shrink-0 h-full flex flex-col overflow-hidden z-40 relative"
                style={{ width: `${taskSidePanelWidth}px` }}
              >
                <TaskSidePanel
                  task={internalSideTask}
                  projects={localProjects}
                  isOpen={!!internalSideTask}
                  onClose={() => setInternalSideTask(null)}
                  onUpdateTask={async (taskId, updatedData) => {
                    playSound("pop");
                    setInternalSideTask((prev: any) => prev ? { ...prev, ...updatedData } : null);
                    handleUpdateProjects((prev) =>
                      prev.map((p) => ({
                        ...p,
                        tasks: (p.tasks || []).map((t) =>
                          String(t.id) === String(taskId) ? { ...t, ...updatedData } : t
                        ),
                      }))
                    );
                  }}
                  onDeleteTask={async (taskId) => {
                    playSound("trash");
                    setInternalSideTask(null);
                    const cleanId = String(taskId).startsWith("kt-")
                      ? extractCleanTaskId(String(taskId), project?.id)
                      : String(taskId);
                    await deleteDoc(doc(db, "tasks", cleanId));
                  }}
                  onExpandToModal={() => {
                    handleOpenTaskModal(internalSideTask);
                  }}
                  isNightMode={true}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </div>

      {/* Modal Oficial de Tarea (NewTaskModal) */}
      <NewTaskModal
        isOpen={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setEditingTaskModal(null);
        }}
        onCreateTask={handleModalCreateTask}
        onUpdateTask={handleModalUpdateTask}
        onDeleteTask={async (taskId) => {
          playSound("trash");
          const cleanId = String(taskId).startsWith("kt-")
            ? extractCleanTaskId(String(taskId), project?.id)
            : String(taskId);
          try {
            await deleteDoc(doc(db, "tasks", cleanId));
            setShowTaskModal(false);
            setEditingTaskModal(null);
          } catch (err) {
            console.error("Error al eliminar tarea desde modal:", err);
          }
        }}
        editingTask={editingTaskModal}
        projects={localProjects}
        defaultProjectId={project?.id}
        originRect={taskModalOriginRect}
        isNightMode={true}
      />

      {/* Modal de confirmación de eliminación */}
      {deleteModalConfig && (
        <DeleteConfirmModal
          isOpen={Boolean(deleteModalConfig?.isOpen)}
          isNightMode={true}
          config={deleteModalConfig}
          onClose={() => setDeleteModalConfig(null)}
          onConfirmTaskDelete={handleConfirmTaskDelete}
        />
      )}

    </div>
  );
}
