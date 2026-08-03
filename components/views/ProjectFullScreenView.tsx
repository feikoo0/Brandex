"use client";

import { useState, useEffect } from "react";
import { 
  Calendar, DollarSign, Loader2, Plus, Trash2, User, Flag, Tag, X, Maximize2, MoreHorizontal, Paperclip
} from "lucide-react";
import { useData, useUpdateProject, useUpdateTask, useCreateTask } from "@/hooks/useData";
import { useProjectSummary } from "@/hooks/useProjectSummary";
import { cn, getSingleSourceProjectColor, PROJECT_COLOR_PALETTE } from "@/lib/utils";
import { useUIStore } from "@/lib/store";
import FormatoShape from "@/app/taski/components/FormatoShape";
import { FORMATOS_ESTANDAR, getFormato } from "@/app/taski/utils/formatos";
import LinearDropdownPopover from "@/app/taski/components/LinearDropdownPopover";
import LinearDatePopover from "@/app/taski/components/LinearDatePopover";
import { ProjectStatusIcon } from "@/components/common/ProjectStatusIcon";
import { playSound } from "@/app/taski/utils/audio";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function ProjectFullScreenView({ 
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
  const [isSaving, setIsSaving] = useState(false);

  const [isCreatingFormTask, setIsCreatingFormTask] = useState(false);
  const [formTaskTitle, setFormTaskTitle] = useState("");
  const [formTaskFormatoKey, setFormTaskFormatoKey] = useState<string | null>(null);
  const [formTaskTime, setFormTaskTime] = useState("30 min");

  // Initial color
  const colorObj = project ? getSingleSourceProjectColor(project) : { hslCss: "#9b51e0" };
  const initialProjColor = colorObj.hslCss;

  const [selectedColorIdx, setSelectedColorIdx] = useState(() => {
    if (!project) return 0;
    const foundIdx = PROJECT_COLOR_PALETTE.findIndex(p => p.hslStr === initialProjColor || p.name.toLowerCase() === ((project as any).colorName || "").toLowerCase());
    return foundIdx >= 0 ? foundIdx : 3;
  });

  // Local Form Data (guarda las ediciones en memoria hasta dar clic en Guardar Cambios)
  const [formData, setFormData] = useState(() => ({
    nombre: project?.nombre || "",
    descripcion: project?.descripcion || "",
    estadoProyecto: project?.estadoProyecto || project?.estado || "Planificación",
    prioridad: project?.prioridad || "Media",
    tipo: (project as any)?.tipo || (project as any)?.paquete || "Desarrollo Web",
    cliente_id: summary.client?.id || project?.cliente_ids?.[0] || (project as any)?.cliente_id || "",
    clientName: summary.clientName || "Brandex",
    asignado_ids: project?.asignado_ids || [],
    asignado: project?.asignado || "",
    costo: project?.costo !== undefined && project?.costo !== null ? project.costo : 0,
    fechaInicio: project?.fechaInicio || "",
    fechaFin: project?.fechaFin || "",
    color: initialProjColor,
    colorName: (project as any)?.colorName || "",
  }));

  // Sincronizar formData cuando el proyecto carga o cambia de ID
  useEffect(() => {
    if (project) {
      const cObj = getSingleSourceProjectColor(project);
      setFormData({
        nombre: project.nombre || "",
        descripcion: project.descripcion || "",
        estadoProyecto: project.estadoProyecto || project.estado || "Planificación",
        prioridad: project.prioridad || "Media",
        tipo: (project as any).tipo || (project as any).paquete || "Desarrollo Web",
        cliente_id: summary.client?.id || project.cliente_ids?.[0] || (project as any).cliente_id || "",
        clientName: summary.clientName || "Brandex",
        asignado_ids: project.asignado_ids || [],
        asignado: project.asignado || "",
        costo: project.costo !== undefined && project.costo !== null ? project.costo : 0,
        fechaInicio: project.fechaInicio || "",
        fechaFin: project.fechaFin || "",
        color: cObj.hslCss,
        colorName: (project as any).colorName || "",
      });

      const foundIdx = PROJECT_COLOR_PALETTE.findIndex(p => p.hslStr === cObj.hslCss || p.name.toLowerCase() === ((project as any).colorName || "").toLowerCase());
      if (foundIdx >= 0) setSelectedColorIdx(foundIdx);
    }
  }, [project?.id]);

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
  const currentProjColor = formData.color || initialProjColor;

  // Selector de color en borrador
  const handleSelectColor = (idx: number) => {
    setSelectedColorIdx(idx);
    playSound("click");
    const preset = PROJECT_COLOR_PALETTE[idx];
    if (preset) {
      setFormData(prev => ({
        ...prev,
        color: preset.hslStr,
        colorName: preset.name,
      }));
    }
  };

  // Toggle asignado en borrador
  const handleToggleWorker = (workerId: string) => {
    const currentIds = formData.asignado_ids || [];
    const newIds = currentIds.includes(workerId)
      ? currentIds.filter((id: string) => id !== workerId)
      : [...currentIds, workerId];
    
    const selectedWorkers = workers.filter((w) => newIds.includes(w.id));
    setFormData(prev => ({
      ...prev,
      asignado_ids: newIds,
      asignado: selectedWorkers.map((w) => w.nombre).join(", ") || "",
    }));
  };

  // Guardar Cambios al servidor
  const handleSaveChanges = async () => {
    if (!project || isSaving) return;
    setIsSaving(true);
    playSound("click");
    try {
      const preset = PROJECT_COLOR_PALETTE[selectedColorIdx];
      await updateProject.mutateAsync({
        id: project.id,
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim(),
        estadoProyecto: formData.estadoProyecto,
        estado: formData.estadoProyecto,
        prioridad: formData.prioridad,
        tipo: formData.tipo,
        paquete: formData.tipo,
        cliente_id: formData.cliente_id || undefined,
        cliente_ids: formData.cliente_id ? [formData.cliente_id] : [],
        cliente: formData.clientName !== "Brandex" ? formData.clientName : undefined,
        asignado_ids: formData.asignado_ids,
        asignado: formData.asignado || undefined,
        costo: formData.costo,
        fechaInicio: formData.fechaInicio,
        fechaFin: formData.fechaFin,
        color: formData.color,
        colorName: formData.colorName,
        gradient: preset?.gradient,
        customColor: preset ? { h: preset.h, s: preset.s, l: preset.l } : undefined,
      } as any);
      onBack();
    } catch (e) {
      console.error("Error guardando proyecto:", e);
    } finally {
      setIsSaving(false);
    }
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

  // Confirmar creación de tarea inline
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
        cliente_id: formData.cliente_id || summary.client?.id || project.cliente_ids?.[0] || undefined,
      } as any);
      setFormTaskTitle("");
      setIsCreatingFormTask(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#181818] text-[#ffffffd6] overflow-y-auto custom-scrollbar p-6 rounded-[24px]">
      
      {/* ── 1. ENCABEZADO INTEGRADO DEL COLOR DEL PROYECTO ── */}
      <div 
        className="p-5 rounded-2xl transition-all duration-300 space-y-3 shadow-lg select-none mb-4 shrink-0"
        style={{ backgroundColor: currentProjColor }}
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
                <span>{formData.clientName || "Brandex"}</span>
              </button>
              <LinearDropdownPopover
                isOpen={activePopover === "header_client"}
                onClose={() => setActivePopover(null)}
                placeholder="Cambiar cliente…"
                shortcutKey="C"
                selectedValue={formData.cliente_id}
                onSelect={(val) => {
                  const selectedClient = data?.clientes.find((c) => c.id === val);
                  setFormData((prev) => ({
                    ...prev,
                    cliente_id: val || "",
                    clientName: selectedClient?.nombre || "Brandex",
                  }));
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
          value={formData.nombre}
          onChange={(e) => setFormData((prev) => ({ ...prev, nombre: e.target.value }))}
          placeholder="Nuevo proyecto"
          className="w-full bg-transparent text-[19px] font-bold text-white placeholder-white/70 border-none outline-none ring-0 focus:outline-none focus:ring-0 focus:border-none focus-visible:outline-none focus-visible:ring-0 caret-white p-0 shadow-none focus:shadow-none"
        />

        {/* PROJECT DESCRIPTION / CORE BRIEF TEXTAREA */}
        <textarea
          rows={3}
          placeholder="Escribe el core brief aquí."
          value={formData.descripcion}
          onChange={(e) => setFormData((prev) => ({ ...prev, descripcion: e.target.value }))}
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
            <ProjectStatusIcon status={formData.estadoProyecto} className="w-3.5 h-3.5" />
            <span>{formData.estadoProyecto}</span>
          </button>
          <LinearDropdownPopover
            isOpen={activePopover === "status"}
            onClose={() => setActivePopover(null)}
            placeholder="Cambiar estado…"
            shortcutKey="S"
            selectedValue={formData.estadoProyecto}
            onSelect={(val) => {
              setFormData((prev) => ({ ...prev, estadoProyecto: val }));
              setActivePopover(null);
            }}
            options={[
              { id: "Planificación", label: "Planificación", icon: <ProjectStatusIcon status="Planificación" className="w-3.5 h-3.5" />, shortcut: "1" },
              { id: "En Proceso", label: "En Proceso", icon: <ProjectStatusIcon status="En Proceso" className="w-3.5 h-3.5" />, shortcut: "2" },
              { id: "En Revisión", label: "En Revisión", icon: <ProjectStatusIcon status="En Revisión" className="w-3.5 h-3.5" />, shortcut: "3" },
              { id: "Completado", label: "Completado", icon: <ProjectStatusIcon status="Completado" className="w-3.5 h-3.5" />, shortcut: "4" }
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
            <span>{formData.prioridad}</span>
          </button>
          <LinearDropdownPopover
            isOpen={activePopover === "priority"}
            onClose={() => setActivePopover(null)}
            placeholder="Cambiar prioridad…"
            shortcutKey="P"
            selectedValue={formData.prioridad}
            onSelect={(val) => {
              setFormData((prev) => ({ ...prev, prioridad: val }));
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
            <span>{formData.tipo}</span>
          </button>
          <LinearDropdownPopover
            isOpen={activePopover === "type"}
            onClose={() => setActivePopover(null)}
            placeholder="Cambiar tipo…"
            shortcutKey="T"
            selectedValue={formData.tipo}
            onSelect={(val) => {
              setFormData((prev) => ({ ...prev, tipo: val }));
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
              {formData.asignado || (formData.asignado_ids?.length ? `${formData.asignado_ids.length} asignados` : "Asignado")}
            </span>
          </button>
          <LinearDropdownPopover
            isOpen={activePopover === "assignee"}
            onClose={() => setActivePopover(null)}
            placeholder="Cambiar asignado…"
            shortcutKey="A"
            selectedValue={formData.asignado_ids?.[0] || ""}
            onSelect={(val) => {
              handleToggleWorker(val);
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
            value={formData.costo !== undefined && formData.costo !== null ? String(formData.costo) : ""}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9.]/g, "");
              setFormData((prev) => ({ ...prev, costo: val ? Number(val) : 0 }));
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
              {formData.fechaInicio && formData.fechaFin
                ? `${formData.fechaInicio} → ${formData.fechaFin}`
                : "Fechas"}
            </span>
          </button>
          <LinearDatePopover
            isOpen={activePopover === "date"}
            onClose={() => setActivePopover(null)}
            startDate={formData.fechaInicio || ""}
            deadline={formData.fechaFin || ""}
            onSelectDates={(start, end) => {
              setFormData((prev) => ({ ...prev, fechaInicio: start, fechaFin: end }));
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
          onClick={handleSaveChanges}
          disabled={isSaving}
          className="px-5 py-2 rounded-full bg-white hover:bg-[#e4e4e7] text-black text-xs font-bold uppercase tracking-wider shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
        >
          {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />}
          <span>{isSaving ? "Guardando…" : "Guardar Cambios"}</span>
        </button>
      </div>

    </div>
  );
}
