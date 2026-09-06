"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Calendar, DollarSign, Loader2, Plus, Trash2, User, Flag, Tag, X, 
  Maximize2, MoreHorizontal, Paperclip, Search, LayoutGrid, Table, Clock, 
  CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Check, Layers, Users, Sparkles,
  CalendarDays, ListFilter, Target, UserCheck
} from "lucide-react";
import { useData, useUpdateProject, useUpdateTask, useCreateTask } from "@/hooks/useData";
import { useClients } from "@/hooks/useClients";
import { useProjectSummary } from "@/hooks/useProjectSummary";
import { 
  cn, 
  getSingleSourceProjectColor, 
  getSingleSourceClientColor, 
  PROJECT_COLOR_PALETTE, 
  formatProjectCreatedDate, 
  parseAnyDate, 
  getCalendarDaysDiff as getCalendarDaysDiffUtil,
  CARD_COLOR_KEYS,
  getCardColorTheme
} from "@/lib/utils";
import { useUIStore } from "@/lib/store";
import { TaskCardContent } from "@/app/taski/components/TaskCard";
import { useTaskCardInteractions } from "@/app/taski/hooks/useTaskCardInteractions";
import { DeleteConfirmModal } from "@/app/taski/components/DeleteConfirmModal";
import NewTaskModal, { TaskData } from "@/app/taski/components/NewTaskModal";
import FormatoShape from "@/app/taski/components/FormatoShape";
import { FORMATOS_ESTANDAR, getFormato } from "@/app/taski/utils/formatos";
import LinearDropdownPopover from "@/app/taski/components/LinearDropdownPopover";
import LinearDatePopover from "@/app/taski/components/LinearDatePopover";
import { ProjectStatusIcon } from "@/components/common/ProjectStatusIcon";
import { SmoothInput, SmoothTextarea } from "@/components/ui/SmoothInput";
import { playSound } from "@/app/taski/utils/audio";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Client, ProjectHealthRAG } from "@/lib/types";
import type { Project, Task } from "@/app/taski/components/ProjectDashboard";

type ProjectViewTab = "todo" | "kanban" | "tabla" | "timeline" | "buscar";

export default function ProjectFullScreenView({ 
  projectId, 
  onBack 
}: { 
  projectId: string; 
  onBack: () => void;
}) {
  const summary = useProjectSummary(projectId);
  const { data } = useData();
  const { clients: firestoreClients } = useClients();
  const updateProject = useUpdateProject();
  const updateTask = useUpdateTask();
  const createTask = useCreateTask();
  const openModal = useUIStore((s) => s.openModal);

  const project = summary.project;

  // Catálogo unificado de marcas clientes
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

  // Controles de Popovers de Proyecto
  const [activePopover, setActivePopover] = useState<"header_client" | "status" | "priority" | "type" | "assignee" | "date" | "salud" | "lead" | null>(null);
  const [showMoreProps, setShowMoreProps] = useState(false);
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
  const [activeView, setActiveView] = useState<ProjectViewTab>("todo");
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [previousView, setPreviousView] = useState<ProjectViewTab>("todo");
  const [taskSearch, setTaskSearch] = useState("");
  const isSearchActive = activeView === "buscar";

  // Dropdown de agrupación y filtros
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);
  const [groupingFilter, setGroupingFilter] = useState<"todos" | "Planificado" | "En Proceso" | "En Revisión" | "Completado">("todos");

  // Creación inline de tarea rápida
  const [isCreatingInlineTask, setIsCreatingInlineTask] = useState(false);
  const [inlineTaskTitle, setInlineTaskTitle] = useState("");
  const [inlineTaskFormato, setInlineTaskFormato] = useState("Post");
  const [inlineTaskEsfuerzo, setInlineTaskEsfuerzo] = useState("30 min");

  // Hook Oficial de Interacciones de Tarjetas de Tareas (Idéntico a Work / HomeDashboard)
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

  // Modal de confirmación de eliminación
  const [deleteModalConfig, setDeleteModalConfig] = useState<any>(null);

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

  // Sincronizar formData cuando el proyecto cambia
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

  const tasks = summary.tasks || [];
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

  // Filtrado reactivo de tareas
  const filteredTasks = tasks.filter((t: any) => {
    const query = taskSearch.toLowerCase().trim();
    const matchesSearch = !query || 
      (t.titulo || t.title || "").toLowerCase().includes(query) ||
      (t.descripcion || t.desc || "").toLowerCase().includes(query) ||
      (t.formato || t.format || "").toLowerCase().includes(query);
    
    const taskStatus = t.estado || t.status || "Planificado";
    const matchesGroup = groupingFilter === "todos" || taskStatus === groupingFilter;
    return matchesSearch && matchesGroup;
  });

  const completedTasksCount = tasks.filter((t: any) => (t.estado || t.status) === "Completado").length;
  const progressPercent = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;

  // Objeto Adapter del Proyecto para alimentar el TaskCard oficial
  const adaptedTasks: Task[] = tasks.map((t: any, index: number) => ({
    id: t.id,
    title: t.titulo || t.title || "Tarea",
    desc: t.descripcion || t.desc || "",
    format: t.formato || t.format || "Post",
    formato: t.formato || t.format || "Post",
    time: t.esfuerzo || t.time || "30 min",
    status: (t.estado || t.status || "Planificado") as any,
    statusColor: (t.estado || t.status) === "Completado" 
      ? "bg-emerald-500/20 text-emerald-400" 
      : (t.estado || t.status) === "En Proceso"
      ? "bg-amber-500/20 text-amber-400"
      : "bg-white/10 text-white",
    attachmentUrl: t.attachmentUrl || "",
    subtasks: t.subtasks || [],
    sessions: t.sessions || [],
    deadline: t.fecha_limite || t.deadline || t.fechaEntrega || t.fechaProg || formData.fechaFin,
    fecha_limite: t.fecha_limite || t.deadline || t.fechaEntrega || t.fechaProg || formData.fechaFin,
    fecha_programada: t.fecha_programada || t.fechaProg || formData.fechaInicio,
    fecha_creacion: t.fecha_creacion || t.createdAt || "",
    color: t.color || formData.color,
  }));

  const adaptedProject: Project = {
    id: project ? Number(project.id) || 1 : 1,
    title: formData.nombre || project?.nombre || "Proyecto",
    client: formData.clientName || summary.clientName || "Brandex",
    desc: formData.descripcion || project?.descripcion || "",
    progress: `${progressPercent}%`,
    percent: `${progressPercent}%`,
    gradient: PROJECT_COLOR_PALETTE[selectedColorIdx]?.gradient || "",
    glow: "",
    customColor: PROJECT_COLOR_PALETTE[selectedColorIdx] 
      ? { h: PROJECT_COLOR_PALETTE[selectedColorIdx].h, s: PROJECT_COLOR_PALETTE[selectedColorIdx].s, l: PROJECT_COLOR_PALETTE[selectedColorIdx].l } 
      : undefined,
    fechaInicio: formData.fechaInicio,
    fechaFin: formData.fechaFin,
    tasks: adaptedTasks,
  } as any;

  // Manejo de paleta de colores
  const handleSelectColor = (idx: number) => {
    setSelectedColorIdx(idx);
    playSound("click");
    const preset = PROJECT_COLOR_PALETTE[idx];
    if (preset) {
      setFormData((prev) => ({
        ...prev,
        color: preset.hslStr,
        colorName: preset.name,
      }));
    }
  };

  // Toggle asignados
  const handleToggleWorker = (workerId: string) => {
    const currentIds = formData.asignado_ids || [];
    const newIds = currentIds.includes(workerId)
      ? currentIds.filter((id: string) => id !== workerId)
      : [...currentIds, workerId];
    
    const selectedWorkers = workers.filter((w) => newIds.includes(w.id));
    setFormData((prev) => ({
      ...prev,
      asignado_ids: newIds,
      asignado: selectedWorkers.map((w) => w.nombre).join(", ") || "",
    }));
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
    { id: "verde", label: "En tiempo", icon: <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" /> },
    { id: "ambar", label: "Con riesgos", icon: <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" /> },
    { id: "rojo", label: "Bloqueado", icon: <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm" /> },
  ], []);

  const PROJ_TYPE_OPTIONS = useMemo(() => [
    { id: "Desarrollo Web", label: "Desarrollo Web" },
    { id: "Estratégico", label: "Estratégico" },
    { id: "Branding Complete", label: "Branding Complete" },
    { id: "UI/UX Design", label: "UI/UX Design" },
    { id: "Marketing Digital", label: "Marketing Digital" },
  ], []);

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

  // Guardar Cambios en Firestore
  const handleSaveChanges = async () => {
    if (!project) return;
    playSound("click");
    triggerSave();
  };

  // Actualizar propiedad de tarea directamente en Firestore
  const handleUpdateTaskProperty = async (projId: string | number, tId: string | number, property: string, value: any) => {
    const cleanId = String(tId).startsWith("kt-") ? String(tId).split("-").slice(2).join("-") : String(tId);
    if (!cleanId) return;
    playSound("click");
    try {
      if (property === "status" || property === "estado") {
        await updateTask.mutateAsync({ id: cleanId, estado: value, status: value } as any);
      } else if (property === "format" || property === "formato") {
        await updateTask.mutateAsync({ id: cleanId, formato: value, format: value } as any);
      } else if (property === "time" || property === "esfuerzo" || property === "duracion") {
        await updateTask.mutateAsync({ id: cleanId, esfuerzo: value, time: value } as any);
      } else if (property === "priority" || property === "prioridad") {
        await updateTask.mutateAsync({ id: cleanId, prioridad: value, priority: value } as any);
      } else if (property === "color") {
        await updateTask.mutateAsync({ id: cleanId, color: value } as any);
      } else if (property === "title" || property === "titulo") {
        await updateTask.mutateAsync({ id: cleanId, titulo: value, title: value } as any);
      } else if (property === "desc" || property === "descripcion" || property === "contenido") {
        await updateTask.mutateAsync({ id: cleanId, descripcion: value, desc: value, contenido: value } as any);
      } else if (property === "deadline" || property === "fecha_limite" || property === "fechaEntrega") {
        await updateTask.mutateAsync({ id: cleanId, fecha_limite: value, fechaEntrega: value, deadline: value } as any);
      } else if (property === "startDate" || property === "fecha_programada" || property === "fechaProg") {
        await updateTask.mutateAsync({ id: cleanId, fecha_programada: value, fechaProg: value } as any);
      } else {
        await updateTask.mutateAsync({ id: cleanId, [property]: value } as any);
      }
    } catch (e) {
      console.error("Error actualizando propiedad de tarea:", e);
    }
  };

  // Guardar edición de título/descripción inline
  const handleSaveEditing = async (pId: string | number, tId: string | number) => {
    if (!editingTaskField || !editingValue.trim()) {
      setEditingTaskField(null);
      return;
    }
    const field = editingTaskField.field;
    const val = editingValue.trim();
    const cleanId = String(tId).startsWith("kt-") ? String(tId).split("-").slice(2).join("-") : String(tId);
    try {
      if (field === "title") {
        await updateTask.mutateAsync({ id: cleanId, titulo: val, title: val } as any);
      } else if (field === "desc") {
        await updateTask.mutateAsync({ id: cleanId, descripcion: val, desc: val, contenido: val } as any);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEditingTaskField(null);
      setEditingValue("");
    }
  };

  // Confirmar eliminación de tarea
  const handleConfirmTaskDelete = async (pId: number, tId: number) => {
    playSound("trash");
    try {
      await deleteDoc(doc(db, "tasks", String(tId)));
    } catch (e) {
      console.error("Error eliminando tarea:", e);
    } finally {
      setDeleteModalConfig(null);
    }
  };

  if (!project) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center h-full bg-[#121212] rounded-[24px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#ffffff6b] mb-4" />
        <p className="text-sm font-bold text-[#ffffff6b]">Cargando detalles del proyecto...</p>
      </div>
    );
  }

  // Confirmar creación de tarea inline
  const handleCreateInlineTask = async () => {
    if (!inlineTaskTitle.trim()) return;
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
      console.error("Error creando tarea:", e);
    }
  };

  // Manejadores del Modal Oficial de Tarea (NewTaskModal)
  const handleOpenTaskModal = (taskObj: any, originRect?: { x: number; y: number; width: number; height: number }) => {
    playSound("click");
    const cleanId = String(taskObj.id).startsWith("kt-")
      ? String(taskObj.id).split("-").slice(2).join("-")
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
      projectId: project.id,
      proyecto_id: project.id,
      projectName: formData.nombre || project.nombre || "Proyecto",
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
  };

  const handleOpenNewTaskModal = (originRect?: { x: number; y: number; width: number; height: number }) => {
    playSound("pop");
    setEditingTaskModal(null);
    setTaskModalOriginRect(originRect || null);
    setShowTaskModal(true);
  };

  const handleModalCreateTask = async (taskData: TaskData) => {
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
      ? String(taskId).split("-").slice(2).join("-")
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
      if (updatedData.area !== undefined) {
        updatePayload.area = updatedData.area;
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

  const handleModalDeleteTask = async (taskId: string | number) => {
    playSound("trash");
    const cleanId = String(taskId).startsWith("kt-")
      ? String(taskId).split("-").slice(2).join("-")
      : String(taskId);
    try {
      await deleteDoc(doc(db, "tasks", cleanId));
      setShowTaskModal(false);
      setEditingTaskModal(null);
    } catch (err) {
      console.error("Error al eliminar tarea desde modal:", err);
    }
  };

  // Helper para renderizar una tarjeta de tarea oficial
  const renderOfficialTaskCard = (t: any, idx: number) => {
    const cardTaskId = `kt-${project.id}-${t.id}`;
    return (
      <div key={t.id} className="w-full h-[10.75rem] task-card-wrapper relative hover:z-20 transition-[z-index] duration-150">
        <TaskCardContent
          taskId={cardTaskId}
          projectId={project.id}
          projectName={formData.nombre || project.nombre || "Proyecto"}
          taskTitle={t.titulo || t.title || ""}
          completedTasks={completedTasksCount}
          totalTasks={tasks.length}
          taskIndex={idx}
          desc={t.descripcion || t.desc || ""}
          projects={[adaptedProject]}
          setProjects={() => {}}
          colorConfig={colorConfig}
          getStatusPillConfig={getStatusPillConfig}
          getFormatPillConfig={getFormatPillConfig}
          updateTaskProperty={handleUpdateTaskProperty}
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
          onSelectTask={(taskObj, pId, originRect) => handleOpenTaskModal(taskObj, originRect)}
          onSelectProject={() => {}}
          onAddTaskToProject={() => handleOpenNewTaskModal()}
          onChangeProjectColor={() => {}}
          hoveredStatusOptionCard={hoveredStatusOptionCard}
          setHoveredStatusOptionCard={setHoveredStatusOptionCard}
          hoveredFormatOptionCard={hoveredFormatOptionCard}
          setHoveredFormatOptionCard={setHoveredFormatOptionCard}
          availableFormats={["Post", "Reels", "Story", "Flyer", "Banner", "Web", "Video", "Copywriting", "Branding"]}
          editingTaskField={editingTaskField}
          setEditingTaskField={setEditingTaskField}
          editingValue={editingValue}
          setEditingValue={setEditingValue}
          saveEditing={handleSaveEditing}
          isNightMode={true}
          isHomeEditMode={false}
          setDeleteModalConfig={setDeleteModalConfig}
          getCalendarDaysDiff={getCalendarDaysDiff}
          formatLocalDate={formatLocalDate}
        />
      </div>
    );
  };

  // Helper para renderizar la tarjeta inicial de '+ Nueva tarea'
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
          className="w-full h-[10.75rem] relative flex flex-col items-center justify-center p-4 rounded-2xl border border-dashed border-white/20 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/40 transition-all cursor-pointer group select-none shadow-sm"
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
      <div className="w-full h-[10.75rem] relative flex flex-col justify-between p-3.5 rounded-2xl border border-white/20 bg-[#1c1c1f] shadow-lg">
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
              {Object.values(FORMATOS_ESTANDAR).map((f) => (
                <option key={f.key} value={f.nombre}>
                  {f.nombre}
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
            className="px-2.5 py-0.5 text-[11px] text-[#ffffff6b] hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleCreateInlineTask}
            disabled={!inlineTaskTitle.trim()}
            className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-white text-black hover:bg-[#e4e4e7] disabled:opacity-40"
          >
            Añadir
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0 min-w-0 overflow-hidden bg-transparent text-[#ffffffd6]">
      
      {/* ── CONTENEDOR 12-COLUMN GRID (IDÉNTICO A CLIENTS Y WORK) ── */}
      <div className="w-full h-full flex-1 grid grid-cols-12 gap-5 items-stretch max-w-full min-h-0 min-w-0 overflow-hidden">
        
        {/* ── COLUMNA IZQUIERDA (3 COLUMNAS): PORTADA & DATOS DEL PROYECTO ── */}
        <div className="col-span-3 flex flex-col h-full min-h-0 rounded-[24px] bg-[#121212] border border-white/[0.08] shadow-2xl overflow-hidden">
          
          {/* Scrollable Container (idéntico a TaskSidePanel) */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 flex flex-col justify-between min-h-full space-y-3">
            
            <div className="space-y-3 w-full shrink-0">
              {/* 1. PORTADA CON COLOR DINÁMICO DEL PROYECTO (HERO CARD) */}
              <div 
                className="w-full shrink-0 rounded-[20px] p-4 relative flex flex-col justify-between overflow-hidden shadow-sm transition-all group gap-2.5 text-white"
                style={{ backgroundColor: currentProjColor }}
              >
                {/* Controles Superiores: Botón Volver + 3 Puntos */}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      playSound("click");
                      onBack();
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white text-[11px] font-semibold transition-all cursor-pointer border border-white/20 shadow-sm backdrop-blur-sm"
                    title="Volver a proyectos"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-white" />
                    <span>Volver</span>
                  </button>

                  {/* Menú de opciones de proyecto */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        playSound("click");
                        setIsMoreMenuOpen(!isMoreMenuOpen);
                      }}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors cursor-pointer",
                        isMoreMenuOpen ? "bg-white/30 text-white" : "text-white/80 hover:text-white hover:bg-white/20"
                      )}
                      title="Opciones del proyecto"
                    >
                      <MoreHorizontal className="w-4 h-4 text-white" />
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

                {/* Cliente & Fecha de Creación */}
                <div className="flex items-center gap-1.5 text-[11px] text-white/80 font-medium">
                  <span className="truncate max-w-[140px]">{formData.clientName || "Brandex"}</span>
                  <span className="text-white/40">·</span>
                  <span className="text-white/70 text-[10px]">{formatProjectCreatedDate(project)}</span>
                </div>

                {/* Título del Proyecto con Smooth Caret */}
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
                  className="w-full text-[22px] font-bold text-white placeholder-white/60 leading-tight select-text"
                />

                {/* Barra de Progreso Minimalista (Idéntica a TaskSidePanel) */}
                <div className="pt-1 flex flex-col gap-1 w-full">
                  <div className="flex items-center justify-between text-[11px] font-medium text-white/90">
                    <span>Tarea {completedTasksCount} de {tasks.length}</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div
                    className="w-full h-[5px] rounded-full bg-black/30 overflow-hidden select-none"
                    title={`Progreso: ${completedTasksCount} de ${tasks.length} tareas (${progressPercent}%)`}
                  >
                    <div
                      className="h-full bg-white rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${Math.min(Math.max(progressPercent, 0), 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* 2. PROPIEDADES EN PÍLDORAS (2 FILAS LIMPIAS) */}
              <div className="space-y-1.5 w-full">
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
                      className={`w-full h-[28px] flex items-center justify-center text-center border text-[11px] font-medium px-1.5 rounded-full transition-colors cursor-pointer truncate ${
                        activePopover === "status"
                          ? "bg-white/10 border-white/30 text-white"
                          : "bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-white/80"
                      }`}
                      title={formData.estadoProyecto || "Estado"}
                    >
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
                        setActivePopover(activePopover === "header_client" ? null : "header_client");
                      }}
                      className={`w-full h-[28px] flex items-center justify-center text-center border text-[11px] font-medium px-1.5 rounded-full transition-colors cursor-pointer truncate ${
                        activePopover === "header_client"
                          ? "bg-white/10 border-white/30 text-white"
                          : "bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-white/80"
                      }`}
                      title={formData.clientName || "Cliente"}
                    >
                      <span className="truncate">{formData.clientName || "Cliente"}</span>
                    </button>
                    <LinearDropdownPopover
                      isOpen={activePopover === "header_client"}
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

                  {/* Fecha */}
                  <div className="relative w-full">
                    <button
                      type="button"
                      onClick={() => {
                        playSound("click");
                        setActivePopover(activePopover === "date" ? null : "date");
                      }}
                      className={`w-full h-[28px] flex items-center justify-center text-center border text-[11px] font-medium px-1.5 rounded-full transition-colors cursor-pointer truncate ${
                        activePopover === "date"
                          ? "bg-white/10 border-white/30 text-white"
                          : "bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-white/80"
                      }`}
                      title={dateLabel}
                    >
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

                {/* Fila 2: Prioridad, Salud RAG, Tipo de Proyecto */}
                <div className="grid grid-cols-3 gap-1.5 w-full">
                  {/* Prioridad */}
                  <div className="relative w-full">
                    <button
                      type="button"
                      onClick={() => {
                        playSound("click");
                        setActivePopover(activePopover === "priority" ? null : "priority");
                      }}
                      className={`w-full h-[28px] flex items-center justify-center text-center border text-[11px] font-medium px-1.5 rounded-full transition-colors cursor-pointer truncate ${
                        activePopover === "priority"
                          ? "bg-white/10 border-white/30 text-white"
                          : "bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-white/80"
                      }`}
                      title={`Prioridad: ${formData.prioridad || "Media"}`}
                    >
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
                      className={`w-full h-[28px] flex items-center justify-center gap-1 text-center border text-[11px] font-medium px-1.5 rounded-full transition-colors cursor-pointer truncate ${
                        activePopover === "salud"
                          ? "bg-white/10 border-white/30 text-white"
                          : "bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-white/80"
                      }`}
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

                  {/* Tipo de Proyecto */}
                  <div className="relative w-full">
                    <button
                      type="button"
                      onClick={() => {
                        playSound("click");
                        setActivePopover(activePopover === "type" ? null : "type");
                      }}
                      className={`w-full h-[28px] flex items-center justify-center text-center border text-[11px] font-medium px-1.5 rounded-full transition-colors cursor-pointer truncate ${
                        activePopover === "type"
                          ? "bg-white/10 border-white/30 text-white"
                          : "bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-white/80"
                      }`}
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

                {/* Fila de Selector de Color */}
                <div className="flex items-center justify-between px-1 pt-0.5">
                  <span className="text-[10px] text-white/40 font-medium">Color de portada</span>
                  <div className="flex items-center gap-1.5">
                    {PROJECT_COLOR_PALETTE.map((preset, idx) => {
                      const isSelected = selectedColorIdx === idx;
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          title={preset.name}
                          onClick={() => {
                            handleSelectColor(idx);
                            triggerSave({ color: preset.hslStr, colorName: preset.name });
                          }}
                          className={cn(
                            "w-3.5 h-3.5 rounded-full bg-gradient-to-br transition-all cursor-pointer border",
                            preset.gradient,
                            isSelected ? "border-white scale-125 shadow-sm ring-1 ring-white/40" : "border-transparent opacity-50 hover:opacity-100"
                          )}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3. FINANZAS & RENTABILIDAD */}
              <div className="pt-2 border-t border-white/5 space-y-1.5">
                <div className="flex items-center justify-between">
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

                <div className="grid grid-cols-3 gap-1.5 p-2.5 rounded-2xl bg-white/[0.025] border border-white/10">
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
                  </div>

                  {/* Costo Real (Rollup de Sesiones) */}
                  <div className="flex flex-col gap-0.5 border-l border-white/5 pl-2">
                    <span className="text-[10px] text-white/40 font-medium">Costo Real</span>
                    <span className="text-xs font-semibold text-white/80" title="Calculado a partir de sesiones de trabajo registradas">
                      ${(summary.costoReal || 0).toLocaleString()}
                    </span>
                  </div>

                  {/* Margen */}
                  <div className="flex flex-col gap-0.5 border-l border-white/5 pl-2">
                    <span className="text-[10px] text-white/40 font-medium">Margen</span>
                    {summary.margen !== null ? (
                      <span className={cn(
                        "text-[11px] font-bold px-1.5 py-0.5 rounded-md w-fit",
                        summary.margen >= 20 ? "text-emerald-400 bg-emerald-500/15" :
                        summary.margen >= 0 ? "text-amber-400 bg-amber-500/15" :
                        "text-rose-400 bg-rose-500/15"
                      )}>
                        {summary.margen > 0 ? `+${summary.margen}%` : `${summary.margen}%`}
                      </span>
                    ) : (
                      <span className="text-xs text-white/40 font-medium">—</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 4. EQUIPO DEL PROYECTO */}
              <div className="pt-2 border-t border-white/5 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffffff6b]">
                  Equipo del Proyecto
                </span>

                <div className="p-2.5 rounded-2xl bg-white/[0.025] border border-white/10 space-y-2">
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

              {/* 5. METAS DE NEGOCIO / OKRs */}
              <div className="pt-2 border-t border-white/5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffffff6b]">
                    Metas & OKRs ({formData.metas_negocio?.length || 0})
                  </span>
                </div>

                <div className="p-2.5 rounded-2xl bg-white/[0.025] border border-white/10 space-y-2">
                  {/* Input para nueva meta */}
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
                      wrapperClassName="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-2.5 py-1 focus-within:border-white/20"
                      className="text-xs text-[#ffffffd6] placeholder:text-white/30"
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
                    <div className="flex flex-col gap-1 max-h-[120px] overflow-y-auto custom-scrollbar">
                      {formData.metas_negocio.map((meta: string, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-start justify-between gap-2 p-1.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 transition-colors group"
                        >
                          <div className="flex items-start gap-1.5 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                            <span className="text-[11px] text-[#ffffffd6] leading-relaxed break-words">{meta}</span>
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
                    <p className="text-[11px] text-white/30 italic">Sin objetivos definidos aún.</p>
                  )}
                </div>
              </div>

              {/* 6. DIRECTRICES Y NOTAS DEL PROYECTO */}
              <div className="pt-2 border-t border-white/5 flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffffff6b]">
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
                  wrapperClassName="w-full p-3 rounded-2xl bg-white/[0.025] hover:bg-white/[0.04] focus-within:bg-white/[0.04] border border-white/10 transition-colors"
                  className="text-xs text-[#ffffffd6] placeholder:text-white/30 leading-relaxed custom-scrollbar"
                />
              </div>

              {/* 7. ENTREGABLES DEL PROYECTO */}
              {tasks.length > 0 && (
                <div className="pt-2 border-t border-white/5 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[#ffffff6b]">
                    <span>Entregables ({tasks.length})</span>
                    <span>{completedTasksCount} listos</span>
                  </div>
                  <div className="flex flex-col gap-1 max-h-[140px] overflow-y-auto custom-scrollbar">
                    {tasks.map((t: any) => {
                      const isDone = (t.estado || t.status) === "Completado";
                      return (
                        <div
                          key={t.id}
                          onClick={(e) => {
                            playSound("click");
                            const rect = e.currentTarget.getBoundingClientRect();
                            handleOpenTaskModal(t, { x: rect.x, y: rect.y, width: rect.width, height: rect.height });
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 transition-all cursor-pointer group select-none"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={cn(
                              "w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                              isDone ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" : "border-white/20 text-transparent"
                            )}>
                              {isDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
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

            {/* Indicador de guardado discreto en el pie */}
            <div className="pt-2 flex items-center justify-between text-[11px] text-[#ffffff6b] border-t border-white/5">
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all",
                  saveStatus === "saving" ? "bg-amber-400 animate-pulse" :
                  saveStatus === "saved" ? "bg-emerald-400" : "bg-white/20"
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

        {/* ── COLUMNA DERECHA (9 COLUMNAS): CATÁLOGO DE TARJETAS DE TAREAS ── */}
        <div className="col-span-9 flex flex-col h-full min-h-0 overflow-hidden pl-1">
          
          {/* ── BARRA SUPERIOR: NAVEGADOR DE PESTAÑAS (DUPLICADO DE WORK + OPCIÓN 'TODO') ── */}
          <div className="flex items-center h-[52px] w-full gap-2 shrink-0 mb-4 select-none">
            
            {/* Zona Izquierda de balance */}
            <div className="flex-1 basis-0" />

            {/* ZONA CENTRAL: VIEW SWITCHER (Idéntico a Work) */}
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
                      layoutId="projectActiveViewIndicator"
                      className="absolute inset-0 rounded-full border bg-[#1f1f1f] border-[#ffffff1f] shadow-sm"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  {!isSearchActive && hoveredTab === "buscar" && (
                    <motion.span
                      layoutId="projectHoverViewIndicator"
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
                      placeholder="Buscar tareas del proyecto..."
                      wrapperClassName="w-full relative z-10"
                      className="text-xs text-[#ffffffd6] placeholder:text-[#ffffff6b]"
                    />
                  ) : (
                    <span className="relative z-10 text-[#ffffffd6]">Search</span>
                  )}
                </motion.button>

                {/* 2. Todo Tab (Nueva opción solicitada) */}
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
                  className={`relative z-10 box-border inline-flex h-8 items-center justify-center rounded-full whitespace-nowrap select-none gap-1.5 px-4 text-xs font-bold transition-colors duration-200 ${
                    activeView === "todo"
                      ? "text-[#ffffffd6]"
                      : "text-[#ffffffd6] hover:text-white"
                  }`}
                >
                  {activeView === "todo" && (
                    <motion.span
                      layoutId="projectActiveViewIndicator"
                      className="absolute inset-0 rounded-full border bg-[#1f1f1f] border-[#ffffff1f] shadow-sm"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  {hoveredTab === "todo" && (
                    <motion.span
                      layoutId="projectHoverViewIndicator"
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
                  className={`relative z-10 box-border inline-flex h-8 items-center justify-center rounded-full whitespace-nowrap select-none gap-1.5 px-4 text-xs font-bold transition-colors duration-200 ${
                    activeView === "kanban"
                      ? "text-[#ffffffd6]"
                      : "text-[#ffffffd6] hover:text-white"
                  }`}
                >
                  {activeView === "kanban" && (
                    <motion.span
                      layoutId="projectActiveViewIndicator"
                      className="absolute inset-0 rounded-full border bg-[#1f1f1f] border-[#ffffff1f] shadow-sm"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  {hoveredTab === "kanban" && (
                    <motion.span
                      layoutId="projectHoverViewIndicator"
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
                  className={`relative z-10 box-border inline-flex h-8 items-center justify-center rounded-full whitespace-nowrap select-none gap-1.5 px-4 text-xs font-bold transition-colors duration-200 ${
                    activeView === "tabla"
                      ? "text-[#ffffffd6]"
                      : "text-[#ffffffd6] hover:text-white"
                  }`}
                >
                  {activeView === "tabla" && (
                    <motion.span
                      layoutId="projectActiveViewIndicator"
                      className="absolute inset-0 rounded-full border bg-[#1f1f1f] border-[#ffffff1f] shadow-sm"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  {hoveredTab === "tabla" && (
                    <motion.span
                      layoutId="projectHoverViewIndicator"
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
                  className={`relative z-10 box-border inline-flex h-8 items-center justify-center rounded-full whitespace-nowrap select-none gap-1.5 px-4 text-xs font-bold transition-colors duration-200 ${
                    activeView === "timeline"
                      ? "text-[#ffffffd6]"
                      : "text-[#ffffffd6] hover:text-white"
                  }`}
                >
                  {activeView === "timeline" && (
                    <motion.span
                      layoutId="projectActiveViewIndicator"
                      className="absolute inset-0 rounded-full border bg-[#1f1f1f] border-[#ffffff1f] shadow-sm"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  {hoveredTab === "timeline" && (
                    <motion.span
                      layoutId="projectHoverViewIndicator"
                      className="absolute inset-0 rounded-full border bg-[#282828] border-white/10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <CalendarDays className="w-[13.55px] h-[13.55px] shrink-0 relative z-10 text-[#ffffffd6]" />
                  <span className="relative z-10">Timeline</span>
                </motion.button>
              </motion.div>
            </div>

            {/* ZONA DERECHA: Botón de Agrupar/Filtros */}
            <div className="flex-1 basis-0 flex items-center justify-end">
              <div className="relative">
                <button
                  onClick={() => {
                    playSound('click');
                    setGroupDropdownOpen(!groupDropdownOpen);
                  }}
                  title="Filtrar por estado"
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
                        className="absolute right-0 mt-2.5 w-48 rounded-2xl border backdrop-blur-md shadow-2xl z-50 p-2 flex flex-col gap-0.5 bg-slate-950/95 border-white/10 text-slate-350 shadow-black/80"
                      >
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
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>

          </div>

          {/* ── CONTENIDO DINÁMICO SEGÚN LA PESTAÑA ACTIVA ── */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
            
            {/* ── 1. VISTA 'TODO' O 'BUSCAR' (CUADRÍCULA COMPLETA CON '+ NUEVA TAREA') ── */}
            {(activeView === "todo" || activeView === "buscar") && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5 pb-8">
                {/* Tarjeta 0: '+ Nueva tarea' */}
                {renderNewTaskCard()}

                {/* Tarjetas oficiales de tareas */}
                {filteredTasks.map((t: any, idx: number) => renderOfficialTaskCard(t, idx))}
              </div>
            )}

            {/* ── 2. VISTA 'KANBAN' (COLUMNAS POR ESTADO DENTRO DEL PROYECTO) ── */}
            {activeView === "kanban" && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pb-8 items-start">
                {(["Planificado", "En Proceso", "En Revisión", "Completado"] as const).map((colStatus) => {
                  const colTasks = filteredTasks.filter((t: any) => {
                    const st = t.estado || t.status || "Planificado";
                    if (colStatus === "Planificado") return st === "Planificado" || st === "Pendiente" || !st;
                    if (colStatus === "En Revisión") return st === "En Revisión" || st === "Revisión";
                    return st === colStatus;
                  });

                  return (
                    <div key={colStatus} className="flex flex-col gap-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] p-3 min-h-[500px]">
                      {/* Header de Columna */}
                      <div className="flex items-center justify-between px-1 pb-1">
                        <div className="flex items-center gap-2">
                          <ProjectStatusIcon status={colStatus} className="w-3.5 h-3.5" />
                          <span className="text-xs font-bold text-[#ffffffd6]">{colStatus}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-white/10 text-white text-[11px] font-mono font-bold">
                          {colTasks.length}
                        </span>
                      </div>

                      {/* Lista de Tarjetas en esta columna */}
                      <div className="flex flex-col gap-3">
                        {colTasks.map((t: any, idx: number) => renderOfficialTaskCard(t, idx))}
                        
                        {colTasks.length === 0 && (
                          <div className="py-12 text-center text-[11px] text-[#ffffff40] border border-dashed border-white/10 rounded-xl">
                            Sin tareas en {colStatus}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── 3. VISTA 'BASE DE DATOS' (TABLA COMPACTA) ── */}
            {activeView === "tabla" && (
              <div className="flex flex-col gap-2 pb-8">
                {/* Botón rápido de creación en lista */}
                <button
                  type="button"
                  onClick={() => handleOpenNewTaskModal()}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border border-dashed border-white/20 bg-white/[0.02] hover:bg-white/[0.05] text-xs font-bold text-[#ffffffd6] hover:text-white transition-all mb-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear Nueva Tarea en este proyecto</span>
                </button>

                {filteredTasks.map((t: any) => {
                  const fmtObj = getFormato(t.formato || t.format);
                  const rawStatus = t.estado || t.status || "Planificado";
                  const isDone = rawStatus === "Completado";

                  return (
                    <div
                      key={t.id}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        handleOpenTaskModal(t, { x: rect.x, y: rect.y, width: rect.width, height: rect.height });
                      }}
                      className="w-full flex items-center justify-between p-3 px-4 rounded-2xl bg-[#181818] border border-white/10 hover:border-white/20 transition-all cursor-pointer group shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                          {fmtObj ? (
                            <FormatoShape formatoObj={fmtObj} size="sm" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5 text-white/50" />
                          )}
                        </div>

                        <div className="flex flex-col min-w-0">
                          <span className={cn(
                            "text-xs font-bold text-[#ffffffd6] group-hover:text-white truncate",
                            isDone && "line-through text-white/40"
                          )}>
                            {t.titulo || t.title}
                          </span>
                          <span className="text-[10px] text-[#ffffff6b] truncate">
                            {fmtObj?.nombre || t.formato || "Entregable"} · {formData.clientName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          rawStatus === "Completado" ? "bg-emerald-500/20 text-emerald-400" :
                          rawStatus === "En Proceso" ? "bg-amber-500/20 text-amber-400" : "bg-white/10 text-white/70"
                        )}>
                          {rawStatus}
                        </span>

                        <span className="text-[11px] font-mono text-[#ffffff6b]">
                          {t.esfuerzo || "30 min"}
                        </span>

                        <button
                          type="button"
                          onClick={async () => {
                            playSound("trash");
                            try {
                              await deleteDoc(doc(db, "tasks", String(t.id)));
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className="p-1 text-[#ffffff40] hover:text-rose-400 transition-colors"
                          title="Eliminar tarea"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── 4. VISTA 'TIMELINE' (ORGANIZADA POR TIEMPO Y DEADLINE) ── */}
            {activeView === "timeline" && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pb-8 items-start">
                {[
                  { id: "hoy", label: "Hoy", filter: (t: any) => getCalendarDaysDiff(t.fecha_limite || t.deadline) <= 0 },
                  { id: "manana", label: "Mañana", filter: (t: any) => getCalendarDaysDiff(t.fecha_limite || t.deadline) === 1 },
                  { id: "semana", label: "Esta Semana", filter: (t: any) => {
                    const d = getCalendarDaysDiff(t.fecha_limite || t.deadline);
                    return d > 1 && d <= 7;
                  }},
                  { id: "mes", label: "Este Mes / Futuras", filter: (t: any) => {
                    const d = getCalendarDaysDiff(t.fecha_limite || t.deadline);
                    return d > 7;
                  }},
                ].map((col) => {
                  const colTasks = filteredTasks.filter(col.filter);

                  return (
                    <div key={col.id} className="flex flex-col gap-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] p-3 min-h-[500px]">
                      {/* Header de Columna */}
                      <div className="flex items-center justify-between px-1 pb-1">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-xs font-bold text-[#ffffffd6]">{col.label}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-white/10 text-white text-[11px] font-mono font-bold">
                          {colTasks.length}
                        </span>
                      </div>

                      {/* Lista de Tarjetas */}
                      <div className="flex flex-col gap-3">
                        {colTasks.map((t: any, idx: number) => renderOfficialTaskCard(t, idx))}
                        
                        {colTasks.length === 0 && (
                          <div className="py-12 text-center text-[11px] text-[#ffffff40] border border-dashed border-white/10 rounded-xl">
                            Sin entregables para {col.label.toLowerCase()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ESTADO VACÍO CUANDO NO HAY TAREAS */}
            {filteredTasks.length === 0 && !isCreatingInlineTask && (
              <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
                <Layers className="w-12 h-12 mb-3 text-[#ffffff6b]" />
                <h4 className="text-lg font-bold text-[#ffffffd6]">Sin entregables encontrados</h4>
                <p className="text-xs text-[#ffffff6b] mt-1 max-w-xs">
                  {taskSearch ? `No hay tareas que coincidan con "${taskSearch}".` : "Comienza agregando la primera tarea a este proyecto."}
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenNewTaskModal()}
                  className="mt-4 px-4 py-2 rounded-xl bg-white text-black text-xs font-bold transition-all hover:bg-[#e4e4e7] cursor-pointer"
                >
                  + Añadir Tarea
                </button>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Modal Oficial de Tarea (Detalle Completo, Copys, Subtareas, Archivos y Sesiones) */}
      <NewTaskModal
        isOpen={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setEditingTaskModal(null);
        }}
        onCreateTask={handleModalCreateTask}
        onUpdateTask={handleModalUpdateTask}
        onDeleteTask={handleModalDeleteTask}
        editingTask={editingTaskModal}
        projects={[adaptedProject]}
        defaultProjectId={project.id}
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
