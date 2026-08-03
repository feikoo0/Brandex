"use client";

import { useState, useMemo, useCallback } from "react";
import { 
  ArrowLeft, Briefcase, Calendar, CheckCircle2, Clock, DollarSign, 
  ExternalLink, FolderKanban, LayoutGrid, Loader2, Plus, Search, 
  Sparkles, Table, Target, Users, AlertTriangle, FileText, Layers, 
  ChevronRight, X, Tag, SlidersHorizontal, Check, RefreshCw, Eye, 
  BarChart3, Filter, ListFilter, ArrowUpDown, ChevronDown, MoreHorizontal,
  Maximize2, Paperclip, Flag, Trash2, User
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { useData, useUpdateProject, useCreateProject, useUpdateTask, useCreateTask } from "@/hooks/useData";
import { useProjectSummary } from "@/hooks/useProjectSummary";
import { useDebouncedSave } from "@/hooks/useDebouncedSave";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { cn, parseEsfuerzoMins, avatarOf, getSingleSourceProjectColor, PROJECT_COLOR_PALETTE } from "@/lib/utils";
import { DONE_STATES, PROJ_PRIO_OPTS, PROJ_STATUS_OPTS, STATUS_COLORS } from "@/lib/constants";
import { useUIStore } from "@/lib/store";
import ProjectCoverFormats from "@/app/taski/components/ProjectCoverFormats";
import FormatoShape from "@/app/taski/components/FormatoShape";
import { FORMATOS_ESTANDAR, getFormato } from "@/app/taski/utils/formatos";
import LinearDropdownPopover from "@/app/taski/components/LinearDropdownPopover";
import LinearDatePopover from "@/app/taski/components/LinearDatePopover";
import { playSound } from "@/app/taski/utils/audio";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// ── 1. TARJETA DE PROYECTO (DISEÑO OPTIMIZADO DE ALTO VALOR INFORMATIVO) ───────
function ProjectCardItem({ 
  projectId, 
  onOpenFullScreen,
  cardStyle = "cover"
}: { 
  projectId: string; 
  onOpenFullScreen: (id: string) => void;
  cardStyle?: "cover" | "full";
}) {
  const summary = useProjectSummary(projectId);
  const { data } = useData();

  if (!summary.project) return null;

  const p = summary.project;
  const statusColor = STATUS_COLORS[summary.status] || "#ffffffd6";
  const projColor = getSingleSourceProjectColor(p).hslCss;

  // Tareas pertenecientes a este proyecto formateadas para el mosaico de íconos
  const projectTasks = summary.tasks.map((t: any) => ({
    id: t.id,
    title: t.titulo || "",
    format: t.formato || t.format || "",
    formato: t.formato || t.format || "",
    status: t.estado || "Pendiente",
    ...t,
  }));

  // Rescatar avatares del equipo asignado (por IDs o por texto plano)
  let assignedWorkers = (p.asignado_ids || [])
    .map((id) => data?.trabajadores.find((w) => String(w.id) === String(id)))
    .filter(Boolean);

  if (assignedWorkers.length === 0 && p.asignado) {
    const names = p.asignado.split(",").map((s) => s.trim().toLowerCase());
    assignedWorkers = (data?.trabajadores || []).filter((w) => 
      names.some((n) => n && w.nombre.toLowerCase().includes(n))
    );
  }

  const totalTasksCount = Math.max(summary.totalTasks, 1);
  const completedCount = summary.completedTasks;

  // Texto del contador de tareas de alto valor
  const taskCountText = summary.totalTasks > 0 
    ? (completedCount > 0 ? `Tarea ${completedCount} de ${summary.totalTasks}` : `${summary.totalTasks} tareas`)
    : "Sin tareas asignadas";

  // ── ESTILO 2: TARJETA DE COLOR COMPLETO (Imagen 2 de referencia) ──
  if (cardStyle === "full") {
    return (
      <div 
        onClick={() => onOpenFullScreen(p.id)}
        className="p-4 rounded-2xl border border-white/10 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-sm hover:shadow-md relative overflow-hidden group text-white h-[210px]"
        style={{ backgroundColor: projColor }}
      >
        <div>
          {/* Fila Superior: Cliente • Estatus del Proyecto */}
          <div className="flex items-center justify-between mb-3 text-[11px] font-semibold text-white/90">
            <span className="truncate max-w-[150px]" title={summary.clientName}>
              {summary.clientName} • {summary.status}
            </span>
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); onOpenFullScreen(p.id); }}
              className="p-0.5 rounded-lg hover:bg-white/20 transition-colors"
            >
              <MoreHorizontal className="w-3.5 h-3.5 text-white/80" />
            </button>
          </div>

          {/* Fila Principal: Caja de Ícono de Formato + Título + Subtítulo */}
          <div className="flex items-center gap-2.5 mb-3">
            {projectTasks.length > 0 ? (
              <div className="w-10 h-10 rounded-xl border border-white/40 bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0 shadow-sm">
                <ProjectCoverFormats tasks={projectTasks as any} size="sm" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl border border-white/40 bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0 shadow-sm text-sm">
                📁
              </div>
            )}

            <div className="flex flex-col min-w-0">
              <h3 className="text-sm font-bold text-white tracking-tight line-clamp-1">
                {p.nombre}
              </h3>
              <p className="text-[11px] text-white/80 font-medium line-clamp-1">
                {p.descripcion || summary.clientName || summary.area}
              </p>
            </div>
          </div>
        </div>

        {/* Footer: Contador de Tareas + Barra de Progreso Segmentada */}
        <div className="pt-2 border-t border-white/20 flex flex-col gap-1.5 mt-auto">
          <div className="flex items-center justify-between text-[11px] font-bold text-white">
            <span>{taskCountText}</span>
            {summary.costo > 0 && (
              <span className="bg-black/20 px-1.5 py-0.5 rounded text-[10px] font-black">${summary.costo.toLocaleString()}</span>
            )}
          </div>
          
          {/* Segmentos de progreso */}
          <div className="flex items-center gap-1 w-full">
            {Array.from({ length: totalTasksCount }).map((_, idx) => (
              <div 
                key={idx}
                className={cn(
                  "h-1 flex-1 rounded-full transition-all",
                  idx < completedCount ? "bg-white" : "bg-white/30"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── ESTILO 1: TARJETA CON PORTADA EN COLOR + MOSAICO DE ÍCONOS (Imagen 1 de referencia) ──
  return (
    <div 
      onClick={() => onOpenFullScreen(p.id)}
      className="rounded-2xl border border-white/10 overflow-hidden bg-[#181818] hover:border-white/25 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-sm hover:shadow-md group h-[225px]"
    >
      {/* 1. PORTADA SUPERIOR EN COLOR + BADGE DE ESTATUS EN VIVO */}
      <div 
        className="h-28 w-full flex items-center justify-center p-2 relative overflow-hidden transition-colors"
        style={{ backgroundColor: projColor }}
      >
        {/* Floating Estatus Badge en la esquina superior derecha de la portada */}
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center gap-1.5 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: statusColor }} />
          <span>{summary.status}</span>
        </div>

        <ProjectCoverFormats tasks={projectTasks as any} size="sm" />
      </div>

      {/* 2. CUERPO INFERIOR OSCURO (#1a1a1a) */}
      <div className="p-3.5 flex flex-col justify-between flex-1 bg-[#1a1a1a]">
        <div>
          {/* Título Principal */}
          <h3 className="text-sm font-bold text-[#ffffffd6] group-hover:text-white transition-colors line-clamp-1 tracking-tight">
            {p.nombre}
          </h3>

          {/* Subtítulo: Cliente • Fecha o Antigüedad */}
          <div className="text-[11px] text-[#ffffff6b] font-medium flex items-center gap-1 mt-0.5">
            <span className="font-semibold text-white/80 truncate max-w-[110px]" title={summary.clientName}>
              {summary.clientName}
            </span>
            <span>•</span>
            <span className="shrink-0">
              {summary.fechaFin ? format(new Date(summary.fechaFin), "d MMM", { locale: es }) : "Reciente"}
            </span>
          </div>
        </div>

        {/* Sección de Progreso Segmentado: Contador de Tareas "X tareas" o "Tarea X de Y" */}
        <div className="pt-2 border-t border-white/10 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#ffffff6b]">
            <span>{taskCountText}</span>
            <div className="flex items-center gap-2">
              {/* Avatares del equipo en footer */}
              {assignedWorkers.length > 0 && (
                <div className="flex -space-x-1.5">
                  {assignedWorkers.slice(0, 2).map((w: any) => (
                    <div 
                      key={w.id} 
                      className="w-4 h-4 rounded-full bg-[#222222] border border-white/20 flex items-center justify-center text-[6px] font-bold text-[#ffffffd6]"
                      title={w.nombre}
                    >
                      {avatarOf(w.nombre)}
                    </div>
                  ))}
                </div>
              )}
              {summary.costo > 0 && (
                <span className="text-emerald-400 font-bold text-[10px]">${summary.costo.toLocaleString()}</span>
              )}
            </div>
          </div>

          {/* Líneas segmentadas de progreso */}
          <div className="flex items-center gap-1 w-full">
            {Array.from({ length: totalTasksCount }).map((_, idx) => (
              <div 
                key={idx}
                className={cn(
                  "h-1 flex-1 rounded-full transition-all",
                  idx < completedCount ? "bg-white" : "bg-white/20"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 2. VISTA COMPACTA DE TABLA ────────────────────────────────────────────────
function ProjectListItem({
  projectId,
  onOpenFullScreen
}: {
  projectId: string;
  onOpenFullScreen: (id: string) => void;
}) {
  const summary = useProjectSummary(projectId);
  const { data } = useData();

  if (!summary.project) return null;

  const p = summary.project;
  const statusColor = STATUS_COLORS[summary.status] || "#ffffffd6";
  const projColor = getSingleSourceProjectColor(p).hslCss;

  let assignedWorkers = (p.asignado_ids || [])
    .map((id) => data?.trabajadores.find((w) => String(w.id) === String(id)))
    .filter(Boolean);

  if (assignedWorkers.length === 0 && p.asignado) {
    const names = p.asignado.split(",").map((s) => s.trim().toLowerCase());
    assignedWorkers = (data?.trabajadores || []).filter((w) => 
      names.some((n) => n && w.nombre.toLowerCase().includes(n))
    );
  }

  return (
    <div 
      onClick={() => onOpenFullScreen(p.id)}
      className="flex items-center justify-between p-3.5 rounded-xl bg-[#181818] border border-white/10 hover:border-white/25 transition-all cursor-pointer group"
    >
      <div className="flex items-center gap-3 min-w-[200px]">
        <span 
          className="w-3 h-3 rounded-full shrink-0 border border-white/20 shadow-sm" 
          style={{ backgroundColor: projColor }} 
        />
        <div className="flex flex-col">
          <h4 className="text-xs font-bold text-[#ffffffd6] group-hover:text-white transition-colors">
            {p.nombre}
          </h4>
          <span className="text-[10px] text-[#ffffff6b]">
            {summary.clientName}
          </span>
        </div>
      </div>

      {/* Estatus Pill */}
      <div 
        className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#222222] border border-white/10 flex items-center gap-1.5"
        style={{ color: statusColor }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
        {summary.status}
      </div>

      {/* Progreso */}
      <div className="flex items-center gap-2.5 w-36">
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${summary.progressPercent}%` }}
          />
        </div>
        <span className="text-[11px] font-bold text-[#ffffffd6] shrink-0">
          {summary.completedTasks}/{summary.totalTasks}
        </span>
      </div>

      {/* Avatares & Costo */}
      <div className="flex items-center gap-3">
        {assignedWorkers.length > 0 && (
          <div className="flex -space-x-2">
            {assignedWorkers.slice(0, 3).map((w: any) => (
              <div 
                key={w.id} 
                className="w-5 h-5 rounded-full bg-[#222222] border border-white/10 flex items-center justify-center text-[7px] font-bold text-[#ffffffd6]"
                title={w.nombre}
              >
                {avatarOf(w.nombre)}
              </div>
            ))}
          </div>
        )}

        {summary.costo > 0 && (
          <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
            ${summary.costo.toLocaleString()}
          </span>
        )}

        <ChevronRight className="w-3.5 h-3.5 text-[#ffffff6b] group-hover:text-[#ffffffd6] transition-colors" />
      </div>
    </div>
  );
}

// ── 3. VISTA A PANTALLA COMPLETA DEL PROYECTO ───────────────────────────────
function ProjectFullScreenView({ 
  projectId, 
  onBack 
}: { 
  projectId: string; 
  onBack: () => void;
}) {
  const summary = useProjectSummary(projectId);
  const { data } = useData();
  const updateProject = useUpdateProject();
  const updateTask = useUpdateTask();
  const createTask = useCreateTask();
  const openModal = useUIStore((s) => s.openModal);

  const project = summary.project;

  const [activePopover, setActivePopover] = useState<"header_client" | "status" | "priority" | "type" | "assignee" | "date" | null>(null);
  const [activeTaskPopover, setActiveTaskPopover] = useState<{ taskId: string | number; type: "format" | "time" } | null>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const [isCreatingFormTask, setIsCreatingFormTask] = useState(false);
  const [formTaskTitle, setFormTaskTitle] = useState("");
  const [formTaskFormatoKey, setFormTaskFormatoKey] = useState<string | null>(null);
  const [formTaskTime, setFormTaskTime] = useState("30 min");

  // Debounced save hooks para nombre y descripción
  const saveName = useCallback(async (v: string) => {
    if (!project) return;
    await updateProject.mutateAsync({ id: project.id, nombre: v } as any);
  }, [project, updateProject]);

  const saveDesc = useCallback(async (v: string) => {
    if (!project) return;
    await updateProject.mutateAsync({ id: project.id, descripcion: v } as any);
  }, [project, updateProject]);

  const nombreState = useDebouncedSave(project?.nombre || "", saveName);
  const descState = useDebouncedSave(project?.descripcion || "", saveDesc);

  const colorObj = project ? getSingleSourceProjectColor(project) : { hslCss: "#9b51e0" };
  const projColor = colorObj.hslCss;

  const [selectedColorIdx, setSelectedColorIdx] = useState(() => {
    if (!project) return 0;
    const foundIdx = PROJECT_COLOR_PALETTE.findIndex(p => p.hslStr === projColor || p.name.toLowerCase() === ((project as any).colorName || "").toLowerCase());
    return foundIdx >= 0 ? foundIdx : 3;
  });

  if (!project) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center h-full bg-[#121212]">
        <Loader2 className="w-8 h-8 animate-spin text-[#ffffff6b] mb-4" />
        <p className="text-sm font-bold text-[#ffffff6b]">Cargando detalles del proyecto...</p>
      </div>
    );
  }

  const tasks = summary.tasks;
  const workers = data?.trabajadores || [];

  // Selector de color del proyecto
  const handleSelectColor = async (idx: number) => {
    setSelectedColorIdx(idx);
    playSound("click");
    const preset = PROJECT_COLOR_PALETTE[idx];
    if (preset && project) {
      await updateProject.mutateAsync({
        id: project.id,
        color: preset.hslStr,
        gradient: preset.gradient,
        customColor: { h: preset.h, s: preset.s, l: preset.l },
        colorName: preset.name
      } as any);
    }
  };

  // Toggle asignado a proyecto
  const handleToggleWorker = async (workerId: string) => {
    const currentIds = project.asignado_ids || [];
    const newIds = currentIds.includes(workerId)
      ? currentIds.filter((id: string) => id !== workerId)
      : [...currentIds, workerId];
    
    const selectedWorkers = workers.filter((w) => newIds.includes(w.id));
    await updateProject.mutateAsync({
      id: project.id,
      asignado_ids: newIds,
      asignado: selectedWorkers.map((w) => w.nombre).join(", ") || undefined,
    } as any);
  };

  // Borrar tarea
  const handleDeleteTask = async (taskId: string | number) => {
    playSound("trash");
    try {
      await deleteDoc(doc(db, "tasks", String(taskId)));
    } catch (e) {
      console.error(e);
    }
  };

  // Confirmar creación de tarea inline estilo modal
  const handleConfirmFormTask = async () => {
    if (!formTaskTitle.trim()) return;
    playSound("click");
    try {
      await createTask.mutateAsync({
        titulo: formTaskTitle.trim(),
        estado: "Pendiente",
        prioridad: "Media",
        formato: formTaskFormatoKey || "Post",
        esfuerzo: formTaskTime,
        proyecto_id: project.id,
        cliente_id: summary.client?.id || project.cliente_ids?.[0] || (project as any).cliente_id || undefined,
      } as any);
      setFormTaskTitle("");
      setIsCreatingFormTask(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#181818] text-[#ffffffd6] overflow-y-auto custom-scrollbar p-6 rounded-[24px]">
      
      {/* ── 1. ENCABEZADO INTEGRADO DEL COLOR DEL PROYECTO (RECTÁNGULO REDONDEADO) ── */}
      <div 
        className="p-5 rounded-2xl transition-all duration-300 space-y-3 shadow-lg select-none mb-4 shrink-0"
        style={{ backgroundColor: projColor }}
      >
        {/* TOP INTEGRATED HEADER ROW */}
        <div className="flex items-center justify-between text-xs">
          {/* Left: Client Pill + Breadcrumb */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                role="combobox"
                onClick={() => {
                  playSound("click");
                  setActivePopover(activePopover === "header_client" ? null : "header_client");
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all cursor-pointer border-none outline-none",
                  activePopover === "header_client" ? "bg-white text-black font-bold" : "bg-white/20 hover:bg-white/30 text-white"
                )}
              >
                <User className={cn("w-3.5 h-3.5 shrink-0", activePopover === "header_client" ? "text-black" : "text-white")} />
                <span>{summary.clientName || "Brandex"}</span>
              </button>
              <LinearDropdownPopover
                isOpen={activePopover === "header_client"}
                onClose={() => setActivePopover(null)}
                placeholder="Cambiar cliente…"
                shortcutKey="C"
                selectedValue={summary.client?.id || ""}
                onSelect={async (val) => {
                  const selectedClient = data?.clientes.find((c) => c.id === val);
                  await updateProject.mutateAsync({
                    id: project.id,
                    cliente_id: val || undefined,
                    cliente_ids: val ? [val] : [],
                    cliente: selectedClient?.nombre || undefined,
                  } as any);
                  setActivePopover(null);
                }}
                options={(data?.clientes || []).map((c, i) => ({
                  id: c.id,
                  label: c.nombre,
                  shortcut: String(i + 1),
                }))}
              />
            </div>
            <span className="text-white/70 font-medium">›</span>
            <span className="text-white/90 font-semibold">Editar proyecto</span>
          </div>

          {/* Right: Window Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                playSound("click");
                onBack();
              }}
              className="p-1.5 rounded text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
              title="Expandir"
            >
              <Maximize2 className="w-3.5 h-3.5 text-white" />
            </button>
            <button
              type="button"
              onClick={() => {
                playSound("click");
                onBack();
              }}
              className="p-1.5 rounded text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
              title="Cerrar"
            >
              <X className="w-4 h-4 text-white" />
            </button>

            {/* 3 Dots Menu Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  playSound("click");
                  setIsMoreMenuOpen(!isMoreMenuOpen);
                }}
                className={cn(
                  "p-1.5 rounded transition-colors cursor-pointer",
                  isMoreMenuOpen ? "bg-white/30 text-white" : "text-white/80 hover:text-white hover:bg-white/20"
                )}
                title="Opciones del proyecto"
              >
                <MoreHorizontal className="w-4 h-4 text-white" />
              </button>

              {isMoreMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMoreMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1.5 z-50 w-48 rounded-xl bg-[#1d1d22] border border-[#2e2e38] shadow-2xl p-1 overflow-hidden">
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
        </div>

        {/* PROJECT TITLE INPUT */}
        <input
          type="text"
          value={nombreState.value}
          onChange={(e) => nombreState.setValue(e.target.value)}
          onBlur={() => nombreState.flush()}
          placeholder="Nuevo proyecto"
          className="w-full bg-transparent text-[19px] font-bold text-white placeholder-white/70 border-none outline-none ring-0 focus:outline-none focus:ring-0 focus:border-none focus-visible:outline-none focus-visible:ring-0 caret-white p-0 shadow-none focus:shadow-none"
        />

        {/* PROJECT DESCRIPTION / CORE BRIEF TEXTAREA */}
        <textarea
          rows={3}
          placeholder="Escribe el core brief aquí."
          value={descState.value}
          onChange={(e) => descState.setValue(e.target.value)}
          onBlur={() => descState.flush()}
          className="w-full bg-transparent text-[13px] text-white/90 placeholder-white/70 border-none outline-none ring-0 focus:outline-none focus:ring-0 focus:border-none focus-visible:outline-none focus-visible:ring-0 caret-white resize-none leading-relaxed p-0 min-h-[60px] shadow-none focus:shadow-none"
        />
      </div>

      {/* ── 2. BARRA DE PROPIEDADES (PÍLDORAS CON POPOVERS) ── */}
      <div className="flex flex-wrap items-center gap-2 py-2.5 border-t border-[#222226]">
        {/* Status button + Popover */}
        <div className="relative">
          <button
            type="button"
            role="combobox"
            onClick={() => {
              playSound("click");
              setActivePopover(activePopover === "status" ? null : "status");
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-all cursor-pointer",
              activePopover === "status" ? "bg-[#32323e] border border-[#484856] text-white" : "bg-[#1d1d21] hover:bg-[#27272f] border border-[#2e2e36] hover:border-[#444450] text-[#f4f4f5]"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span>{project.estadoProyecto || project.estado || "Planificación"}</span>
          </button>
          <LinearDropdownPopover
            isOpen={activePopover === "status"}
            onClose={() => setActivePopover(null)}
            placeholder="Cambiar estado…"
            shortcutKey="S"
            selectedValue={project.estadoProyecto || project.estado || "Activo"}
            onSelect={async (val) => {
              await updateProject.mutateAsync({ id: project.id, estadoProyecto: val, estado: val } as any);
              setActivePopover(null);
            }}
            options={[
              { id: "Backlog", label: "Backlog", shortcut: "1" },
              { id: "Planificación", label: "Planificación", shortcut: "2" },
              { id: "Activo", label: "Activo", shortcut: "3" },
              { id: "En Proceso", label: "En Proceso", shortcut: "4" },
              { id: "En Revisión", label: "En Revisión", shortcut: "5" },
              { id: "Completado", label: "Completado", shortcut: "6" }
            ]}
          />
        </div>

        {/* Priority button + Popover */}
        <div className="relative">
          <button
            type="button"
            role="combobox"
            onClick={() => {
              playSound("click");
              setActivePopover(activePopover === "priority" ? null : "priority");
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-all cursor-pointer",
              activePopover === "priority" ? "bg-[#32323e] border border-[#484856] text-white" : "bg-[#1d1d21] hover:bg-[#27272f] border border-[#2e2e36] hover:border-[#444450] text-[#f4f4f5]"
            )}
          >
            <Flag className="w-3 h-3 text-white shrink-0" />
            <span>{project.prioridad || "Media"}</span>
          </button>
          <LinearDropdownPopover
            isOpen={activePopover === "priority"}
            onClose={() => setActivePopover(null)}
            placeholder="Cambiar prioridad…"
            shortcutKey="P"
            selectedValue={project.prioridad || "Media"}
            onSelect={async (val) => {
              await updateProject.mutateAsync({ id: project.id, prioridad: val } as any);
              setActivePopover(null);
            }}
            options={[
              { id: "No Priority", label: "Sin prioridad", shortcut: "1" },
              { id: "Urgente", label: "Urgente", shortcut: "2" },
              { id: "Alta", label: "Alta", shortcut: "3" },
              { id: "Media", label: "Media", shortcut: "4" },
              { id: "Baja", label: "Baja", shortcut: "5" }
            ]}
          />
        </div>

        {/* Type button + Popover */}
        <div className="relative">
          <button
            type="button"
            role="combobox"
            onClick={() => {
              playSound("click");
              setActivePopover(activePopover === "type" ? null : "type");
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-all cursor-pointer",
              activePopover === "type" ? "bg-[#32323e] border border-[#484856] text-white" : "bg-[#1d1d21] hover:bg-[#27272f] border border-[#2e2e36] hover:border-[#444450] text-[#f4f4f5]"
            )}
          >
            <Tag className="w-3 h-3 text-white shrink-0" />
            <span>{(project as any).tipo || (project as any).paquete || "Desarrollo Web"}</span>
          </button>
          <LinearDropdownPopover
            isOpen={activePopover === "type"}
            onClose={() => setActivePopover(null)}
            placeholder="Cambiar tipo…"
            shortcutKey="T"
            selectedValue={(project as any).tipo || (project as any).paquete || ""}
            onSelect={async (val) => {
              await updateProject.mutateAsync({ id: project.id, tipo: val, paquete: val } as any);
              setActivePopover(null);
            }}
            options={[
              { id: "Desarrollo Web", label: "Desarrollo Web", shortcut: "1" },
              { id: "Estratégico", label: "Estratégico", shortcut: "2" },
              { id: "Branding Complete", label: "Branding Complete", shortcut: "3" },
              { id: "UI/UX Design", label: "UI/UX Design", shortcut: "4" },
              { id: "Marketing Digital", label: "Marketing Digital", shortcut: "5" }
            ]}
          />
        </div>

        {/* Assignee button + Popover */}
        <div className="relative">
          <button
            type="button"
            role="combobox"
            onClick={() => {
              playSound("click");
              setActivePopover(activePopover === "assignee" ? null : "assignee");
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-all cursor-pointer",
              activePopover === "assignee" ? "bg-[#32323e] border border-[#484856] text-white" : "bg-[#1d1d21] hover:bg-[#27272f] border border-[#2e2e36] hover:border-[#444450] text-[#f4f4f5]"
            )}
          >
            <User className="w-3 h-3 text-white shrink-0" />
            <span>
              {project.asignado || (project.asignado_ids?.length ? `${project.asignado_ids.length} asignados` : "Asignado")}
            </span>
          </button>
          <LinearDropdownPopover
            isOpen={activePopover === "assignee"}
            onClose={() => setActivePopover(null)}
            placeholder="Cambiar asignado…"
            shortcutKey="A"
            selectedValue={project.asignado_ids?.[0] || ""}
            onSelect={async (val) => {
              await handleToggleWorker(val);
              setActivePopover(null);
            }}
            options={workers.map((w, i) => ({
              id: w.id,
              label: w.nombre,
              badge: w.rol,
              shortcut: String(i + 1)
            }))}
          />
        </div>

        {/* Cost input pill */}
        <div className="flex items-center gap-1.5 rounded-full px-3 py-1 bg-[#1d1d21] hover:bg-[#27272f] border border-[#2e2e36] hover:border-[#444450] text-[11px] text-[#f4f4f5] transition-all">
          <DollarSign className="w-3 h-3 text-white shrink-0" />
          <input
            type="text"
            value={project.costo !== undefined && project.costo !== null ? String(project.costo) : "2,500"}
            onChange={async (e) => {
              const val = e.target.value.replace(/[^0-9.]/g, "");
              await updateProject.mutateAsync({ id: project.id, costo: val ? Number(val) : 0 } as any);
            }}
            placeholder="Precio"
            className="w-16 bg-transparent text-[11px] text-[#f4f4f5] font-bold outline-none ring-0 focus:outline-none"
          />
        </div>

        {/* Date Popover Button Pill */}
        <div className="relative">
          <button
            type="button"
            role="combobox"
            onClick={() => {
              playSound("click");
              setActivePopover(activePopover === "date" ? null : "date");
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-all cursor-pointer",
              activePopover === "date" ? "bg-[#32323e] border border-[#484856] text-white" : "bg-[#1d1d21] hover:bg-[#27272f] border border-[#2e2e36] hover:border-[#444450] text-[#f4f4f5]"
            )}
          >
            <Calendar className="w-3 h-3 text-white shrink-0" />
            <span>
              {project.fechaInicio && project.fechaFin
                ? `${project.fechaInicio} → ${project.fechaFin}`
                : "Fechas"}
            </span>
          </button>
          <LinearDatePopover
            isOpen={activePopover === "date"}
            onClose={() => setActivePopover(null)}
            startDate={project.fechaInicio || ""}
            deadline={project.fechaFin || ""}
            onSelectDates={async (start, end) => {
              await updateProject.mutateAsync({ id: project.id, fechaInicio: start, fechaFin: end } as any);
              setActivePopover(null);
            }}
          />
        </div>
      </div>

      {/* ── 3. COLOR DEL PROYECTO (PALETA DE PUNTOS) ── */}
      <div className="flex items-center justify-between py-2.5 border-t border-[#222226]">
        <span className="text-[11px] font-medium text-[#71717a]">Color del proyecto</span>
        <div className="flex items-center gap-2">
          {PROJECT_COLOR_PALETTE.map((preset, idx) => {
            const isSelected = selectedColorIdx === idx;
            return (
              <button
                key={preset.name}
                type="button"
                title={preset.name}
                onClick={() => handleSelectColor(idx)}
                className={cn(
                  "w-4 h-4 rounded-full bg-gradient-to-br transition-all cursor-pointer border",
                  preset.gradient,
                  isSelected ? "border-white scale-125 shadow-md shadow-purple-500/20" : "border-transparent opacity-60 hover:opacity-100"
                )}
              />
            );
          })}
        </div>
      </div>

      {/* ── 4. TAREAS DEL PROYECTO ── */}
      <div className="py-3 border-t border-[#222226] space-y-2 flex-1 flex flex-col">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#a1a1aa]">Tareas del proyecto ({tasks.length})</span>
        </div>

        <div className="flex flex-col gap-1.5">
          {tasks.map((t) => {
            const fmtObj = getFormato(t.formato || (t as any).format);
            const isFmtOpen = activeTaskPopover?.taskId === t.id && activeTaskPopover?.type === "format";
            const isTimeOpen = activeTaskPopover?.taskId === t.id && activeTaskPopover?.type === "time";
            return (
              <div
                key={t.id}
                className="w-full rounded-full border-none bg-[#1d1d21] p-1.5 px-4 flex items-center justify-between gap-3 transition-all relative shadow-sm hover:bg-[#232328]"
              >
                <input
                  type="text"
                  value={t.titulo}
                  onChange={async (e) => {
                    const newTitle = e.target.value;
                    await updateTask.mutateAsync({ id: t.id, titulo: newTitle } as any);
                  }}
                  className="flex-1 bg-transparent text-xs font-semibold text-[#f4f4f5] outline-none border-none ring-0 focus:outline-none p-0 ml-1 shadow-none"
                />

                <div className="flex items-center gap-2 shrink-0">
                  {/* Formato Popover Trigger */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        playSound("click");
                        setActiveTaskPopover(
                          isFmtOpen ? null : { taskId: t.id, type: "format" }
                        );
                      }}
                      className="px-3 py-1 rounded-full bg-white hover:bg-[#e4e4e7] text-[10px] font-bold text-[#09090b] border-none outline-none transition-colors cursor-pointer"
                    >
                      <span>{fmtObj?.nombre || t.formato || "Formato"}</span>
                    </button>
                    <LinearDropdownPopover
                      isOpen={isFmtOpen}
                      onClose={() => setActiveTaskPopover(null)}
                      placeholder="Cambiar formato…"
                      shortcutKey="F"
                      selectedValue={fmtObj?.key || t.formato || ""}
                      position="top"
                      align="right"
                      onSelect={async (val) => {
                        await updateTask.mutateAsync({ id: t.id, formato: val } as any);
                        setActiveTaskPopover(null);
                      }}
                      options={Object.values(FORMATOS_ESTANDAR).map((f, idx) => ({
                        id: f.key,
                        label: f.nombre,
                        badge: f.proporcion,
                        shortcut: String(idx + 1),
                        icon: <FormatoShape formatoObj={f} size="sm" />
                      }))}
                    />
                  </div>

                  {/* Tiempo Popover Trigger */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        playSound("click");
                        setActiveTaskPopover(
                          isTimeOpen ? null : { taskId: t.id, type: "time" }
                        );
                      }}
                      className="px-3 py-1 rounded-full bg-white hover:bg-[#e4e4e7] text-[10px] font-bold text-[#09090b] border-none outline-none transition-colors cursor-pointer"
                    >
                      {t.esfuerzo || "30 min"}
                    </button>
                    <LinearDropdownPopover
                      isOpen={isTimeOpen}
                      onClose={() => setActiveTaskPopover(null)}
                      placeholder="Cambiar duración…"
                      shortcutKey="D"
                      selectedValue={t.esfuerzo || "30 min"}
                      position="top"
                      align="right"
                      onSelect={async (val) => {
                        await updateTask.mutateAsync({ id: t.id, esfuerzo: val } as any);
                        setActiveTaskPopover(null);
                      }}
                      options={[
                        { id: "15 min", label: "15 min", shortcut: "1" },
                        { id: "30 min", label: "30 min", shortcut: "2" },
                        { id: "45 min", label: "45 min", shortcut: "3" },
                        { id: "1 hora", label: "1 hora", shortcut: "4" },
                        { id: "2 horas", label: "2 horas", shortcut: "5" },
                        { id: "3 horas", label: "3 horas", shortcut: "6" }
                      ]}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteTask(t.id)}
                    className="p-1 text-[#71717a] hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {!isCreatingFormTask ? (
            <button
              type="button"
              onClick={() => {
                playSound("click");
                setIsCreatingFormTask(true);
                setFormTaskTitle("");
                setFormTaskTime("30 min");
                setFormTaskFormatoKey("Post");
              }}
              className="w-full rounded-full border border-dashed border-[#33333e] hover:border-[#4f4f5e] p-2.5 text-xs font-medium text-[#a1a1aa] hover:text-[#f4f4f5] flex items-center justify-center gap-2 bg-transparent hover:bg-[#1a1a1e]/40 transition-all cursor-pointer mt-1"
            >
              <Plus className="w-3.5 h-3.5 text-[#a1a1aa] shrink-0" />
              <span>Añadir tarea al proyecto</span>
            </button>
          ) : (
            <div className="w-full rounded-full border-none bg-[#1d1d21] p-1.5 px-4 flex items-center justify-between gap-3 transition-all relative shadow-sm mt-1">
              <input
                type="text"
                autoFocus
                placeholder="Nombre de la tarea…"
                value={formTaskTitle}
                onChange={(e) => setFormTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConfirmFormTask();
                  if (e.key === "Escape") setIsCreatingFormTask(false);
                }}
                className="flex-1 bg-transparent text-xs font-semibold text-[#f4f4f5] placeholder-[#686873] outline-none border-none ring-0 focus:outline-none p-0 ml-1 shadow-none"
              />

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleConfirmFormTask}
                  disabled={!formTaskTitle.trim()}
                  className="px-3 py-1 rounded-full bg-white hover:bg-[#e4e4e7] text-[10px] font-bold text-[#09090b] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Añadir
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingFormTask(false)}
                  className="px-2 py-1 text-[10px] font-semibold text-[#71717a] hover:text-white"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 5. PIE DE PÁGINA DE ACCIONES (CONTROLES INFERIORES) ── */}
      <div className="flex items-center justify-between pt-4 mt-auto border-t border-[#222226] shrink-0">
        <button
          type="button"
          onClick={() => playSound("click")}
          className="p-2 rounded-full bg-[#1d1d21] hover:bg-[#27272f] border border-[#2e2e36] text-[#a1a1aa] hover:text-white transition-colors cursor-pointer"
          title="Añadir adjuntos"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => {
            playSound("click");
            onBack();
          }}
          className="px-5 py-2 rounded-full bg-white hover:bg-[#e4e4e7] text-black text-xs font-bold uppercase tracking-wider shadow-lg hover:shadow-xl transition-all cursor-pointer"
        >
          Guardar Cambios
        </button>
      </div>

    </div>
  );
}

// ── 4. COMPONENTE PRINCIPAL PROJECTS VIEW ────────────────────────────────────
export function ProjectsView() {
  const { data, isLoading } = useData();
  const openModal = useUIStore((s) => s.openModal);

  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [sortBy, setSortBy] = useState<"recientes" | "nombre" | "progreso" | "costo">("recientes");
  const [displayMode, setDisplayMode] = useState<"grid" | "list">("grid");
  const [cardVariant, setCardVariant] = useState<"cover" | "full">("cover");

  const projects = data?.proyectos ?? [];

  // Filtrado y ordenamiento de proyectos
  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) => {
        const matchesSearch = 
          p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.descripcion && p.descripcion.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const matchesStatus = statusFilter === "Todos" || p.estadoProyecto === statusFilter || p.estado === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "nombre") return a.nombre.localeCompare(b.nombre);
        if (sortBy === "costo") return (b.costo || 0) - (a.costo || 0);
        return 0;
      });
  }, [projects, searchQuery, statusFilter, sortBy]);

  // Si hay un proyecto activo seleccionado, renderizar la vista A PANTALLA COMPLETA
  if (activeProjectId) {
    return (
      <ProjectFullScreenView 
        projectId={activeProjectId} 
        onBack={() => setActiveProjectId(null)} 
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 bg-transparent">
        <Loader2 className="w-8 h-8 animate-spin text-[#ffffff6b]" />
        <p className="text-xs font-bold text-[#ffffff6b]">Cargando proyectos...</p>
      </div>
    );
  }

  // Cálculos KPIs globales
  const totalProjects = projects.length;
  const activeCount = projects.filter((p) => !DONE_STATES.has(p.estadoProyecto || p.estado)).length;
  const completedCount = projects.filter((p) => DONE_STATES.has(p.estadoProyecto || p.estado)).length;
  const totalBudget = projects.reduce((acc, p) => acc + (p.costo || 0), 0);

  return (
    <div className="p-6 h-full flex flex-col overflow-y-auto custom-scrollbar bg-transparent text-[#ffffffd6]">
      
      {/* ── CABECERA KPI BAR (Superficies Sólidas #181818 & Trazos Finos) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-5 rounded-2xl bg-[#181818] border border-white/10 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffffff6b]">Proyectos Registrados</span>
            <FolderKanban className="w-4 h-4 text-[#ffffff6b]" />
          </div>
          <div className="text-3xl font-bold text-[#ffffffd6] mt-2">{totalProjects}</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#181818] border border-white/10 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffffff6b]">Proyectos Activos</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-emerald-400 mt-2">{activeCount}</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#181818] border border-white/10 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffffff6b]">Completados</span>
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-cyan-400 mt-2">{completedCount}</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#181818] border border-white/10 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffffff6b]">Presupuesto Global</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-[#ffffffd6] mt-2">
            ${totalBudget.toLocaleString()}
          </div>
        </div>
      </div>

      {/* ── BARRA DE BÚSQUEDA & FILTROS ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        
        {/* Buscador Integrado */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#ffffff6b]" />
          <input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar proyectos..."
            className="w-full bg-[#181818] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-[#ffffffd6] outline-none focus:border-white/30 shadow-sm"
          />
        </div>

        {/* Filtros, Selector de Estilo de Tarjeta & Botón Nuevo */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          
          {/* Switcher de Estilo de Tarjeta (Portada vs Color Completo) */}
          <div className="flex items-center rounded-xl p-1 bg-[#181818] border border-white/10 text-xs font-bold">
            <button 
              onClick={() => setCardVariant("cover")}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-colors text-[11px]",
                cardVariant === "cover" ? "bg-white/15 text-white" : "text-[#ffffff6b] hover:text-white"
              )}
              title="Estilo Portada (Imagen 1)"
            >
              Portada
            </button>
            <button 
              onClick={() => setCardVariant("full")}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-colors text-[11px]",
                cardVariant === "full" ? "bg-white/15 text-white" : "text-[#ffffff6b] hover:text-white"
              )}
              title="Estilo Color Completo (Imagen 2)"
            >
              Color
            </button>
          </div>

          {/* Switcher de Vista Grid / Lista */}
          <div className="flex items-center rounded-xl p-1 bg-[#181818] border border-white/10">
            <button 
              onClick={() => setDisplayMode("grid")}
              className={cn(
                "p-1.5 rounded-lg text-xs transition-colors",
                displayMode === "grid" ? "bg-white/15 text-white" : "text-[#ffffff6b] hover:text-white"
              )}
              title="Vista de Cuadrícula Bento"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setDisplayMode("list")}
              className={cn(
                "p-1.5 rounded-lg text-xs transition-colors",
                displayMode === "list" ? "bg-white/15 text-white" : "text-[#ffffff6b] hover:text-white"
              )}
              title="Vista Compacta de Lista"
            >
              <Table className="w-4 h-4" />
            </button>
          </div>

          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#181818] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#ffffffd6] outline-none shadow-sm cursor-pointer"
          >
            <option value="Todos">Todos los Estatus</option>
            {PROJ_STATUS_OPTS.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>

          {/* Botón Nuevo Proyecto */}
          <button 
            onClick={() => openModal({ type: "proyecto", id: "new" })}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-white/90 text-black text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Proyecto</span>
          </button>
        </div>
      </div>

      {/* ── CATALOGO DE PROYECTOS (VISTA EN GRID DE 5 COLUMNAS O TABLA) ── */}
      {displayMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4">
          {filteredProjects.map((p) => (
            <ProjectCardItem 
              key={p.id} 
              projectId={p.id} 
              onOpenFullScreen={(id) => setActiveProjectId(id)}
              cardStyle={cardVariant}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredProjects.map((p) => (
            <ProjectListItem 
              key={p.id}
              projectId={p.id}
              onOpenFullScreen={(id) => setActiveProjectId(id)}
            />
          ))}
        </div>
      )}

      {/* Estado Vacío */}
      {filteredProjects.length === 0 && (
        <div className="py-24 flex flex-col items-center justify-center text-center opacity-40">
          <Briefcase className="w-14 h-14 mb-4 text-[#ffffff6b]" />
          <h4 className="text-xl font-bold text-[#ffffffd6]">No se encontraron proyectos</h4>
          <p className="text-xs text-[#ffffff6b] mt-1 max-w-sm">
            Prueba ajustando los filtros de búsqueda o crea un nuevo proyecto de marca.
          </p>
        </div>
      )}
    </div>
  );
}
