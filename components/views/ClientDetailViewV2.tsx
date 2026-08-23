"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimation,
  DropAnimation,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  defaultAnimateLayoutChanges,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Building2,
  ChevronLeft,
  Mail,
  Phone,
  MessageSquare,
  FileText,
  Calendar,
  DollarSign,
  Plus,
  Edit3,
  Check,
  X,
  Sparkles,
  Clock,
  TrendingUp,
  Receipt,
  MoreHorizontal
} from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DriveButton } from "@/components/common/DriveButton";
import ProjectCoverFormats from "@/app/taski/components/ProjectCoverFormats";
import { EffortGaugeRing, DELIVERY_THRESHOLDS, GaugeSeverity } from "@/app/taski/components/EffortGaugeRing";
import { GitHubActivity } from "@/components/ui/github-activity";
import { useRecentSessions, useEntitySessionStats } from "@/hooks/useSessions";
import { playSound } from "@/app/taski/utils/audio";
import {
  PROJECT_COLOR_PALETTE,
  getSingleSourceClientColor,
  getSingleSourceProjectColor,
  parseAnyDate,
  getCalendarDaysDiff,
  cn
} from "@/lib/utils";
import type { Client, Project, PaymentHistoryItem, ClientFinanzas } from "@/lib/types";

// ── 1. SMART SENSORS (Permiten clic directo y activan arrastre tras 4px) ────────
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

const dropAnimation: DropAnimation = {
  ...defaultDropAnimation,
  duration: 220,
  easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
};

function animateLayoutChanges(args: any) {
  const { isSorting, wasDragging } = args;
  if (isSorting || wasDragging) {
    return defaultAnimateLayoutChanges(args);
  }
  return true;
}

const KANBAN_STATUSES = ["Planificado", "En Proceso", "En Revisión", "Completado"];

// ── 2. TARJETA DE PROYECTO IDÉNTICA A WORK 1 (SIN TRAZOS NI HOVER DISTORSIONANTE) ──
interface WorkProjectCardContentProps {
  project: any;
  onOpen: () => void;
}

function WorkProjectCardContent({ project, onOpen }: WorkProjectCardContentProps) {
  const projColor = getSingleSourceProjectColor(project).hslCss;
  const projectTasks = (project.tasks || []).map((t: any) => ({
    id: t.id,
    title: t.title || t.titulo || "",
    format: t.format || t.formato || "",
    formato: t.format || t.formato || "",
    status: t.status || t.estado || "Planificado",
    ...t,
  }));

  const totalTasks = projectTasks.length;
  const completedTasks = projectTasks.filter(
    (t: any) => t.status === "Completado" || t.estado === "Completado"
  ).length;
  const realTotalTasks = Math.max(totalTasks, 1);

  // Fecha y Deadline
  const rawDate =
    project.fechaFin ||
    project.fechaInicio ||
    project.deadline ||
    project.deadlineRaw ||
    project.startDate ||
    project.endDate;

  const limitDate = parseAnyDate(rawDate);
  let deliveryLabel = "Sin fecha";
  let deliverySeverity: GaugeSeverity = "low";

  if (limitDate) {
    const diffLimitDays = getCalendarDaysDiff(limitDate);
    if (diffLimitDays < 0) {
      const overdue = Math.abs(diffLimitDays);
      deliveryLabel = `Atrasada ${overdue} ${overdue === 1 ? "día" : "días"}`;
      deliverySeverity = "high";
    } else if (diffLimitDays === 0) {
      deliveryLabel = "Entrega hoy";
      deliverySeverity = "high";
    } else if (diffLimitDays === 1) {
      deliveryLabel = "Entrega mañana";
      deliverySeverity = "mid";
    } else if (diffLimitDays <= DELIVERY_THRESHOLDS.low) {
      deliveryLabel = `Entrega en ${diffLimitDays} días`;
      deliverySeverity = "mid";
    } else {
      deliveryLabel = `Entrega en ${diffLimitDays} días`;
      deliverySeverity = "low";
    }
  }

  return (
    <div
      onClick={onOpen}
      className="group/card bg-[#121212] rounded-2xl pointer-events-auto relative font-sans flex flex-col justify-between h-[155px] w-full p-1.5 overflow-hidden select-none cursor-grab active:cursor-grabbing border-none"
    >
      {/* ── Portada Rectangular Sólida con Color del Proyecto (Idéntica a Work 1) ── */}
      <div
        style={{ backgroundColor: projColor }}
        className="w-full flex-1 min-h-0 rounded-xl relative z-10 flex flex-col justify-between overflow-hidden px-3.5 pt-2.5 pb-2 transition-colors border-none"
      >
        {/* Fila Superior: Iconos de Formato + Nombre de Cliente */}
        <div className="flex flex-col relative z-10">
          <div className="flex items-center justify-between w-full leading-none mb-1">
            <div className="flex items-center gap-1.5 pointer-events-none">
              <ProjectCoverFormats tasks={projectTasks as any} size="xs" layout="horizontal" />
            </div>
            <span className="text-[11px] font-medium text-white/80 leading-none truncate max-w-[110px]">
              {project.client || "Cliente"}
            </span>
          </div>

          {/* Título del Proyecto */}
          <h4 className="text-[14px] font-bold tracking-normal leading-tight line-clamp-2 text-white mt-1">
            {project.title || project.nombre}
          </h4>
        </div>

        {/* Footer dentro del color: Contador de Tareas + Barra de Progreso Segmentada */}
        <div className="mt-auto flex flex-col gap-1 pt-1 border-t border-white/[0.06] shrink-0 w-full">
          <div className="flex items-center justify-between leading-none">
            <span className="text-[11px] font-medium text-white/90">
              {totalTasks > 0 ? `${completedTasks}/${totalTasks} tareas listas` : "0 tareas"}
            </span>
          </div>

          {/* Segmentos de la Barra de Progreso */}
          <div className="w-full flex items-center gap-1 h-1 my-0.5">
            {Array.from({ length: realTotalTasks }).map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "h-full flex-1 rounded-full transition-all duration-300",
                  idx < completedTasks
                    ? "bg-white"
                    : idx === completedTasks && project.estadoProyecto === "En Proceso"
                    ? "bg-white/60"
                    : "bg-white/25"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Cuerpo Inferior (24px): Gauge y Fecha de Entrega (Exacto a Work 1) ── */}
      <div className="h-[24px] px-1.5 pt-[6px] flex items-center justify-between gap-2 bg-transparent min-w-0 pointer-events-auto shrink-0 select-none relative z-10">
        <div className="flex items-center gap-1.5 text-[#ffffff6b] font-normal min-w-0">
          <EffortGaugeRing
            severity={deliverySeverity}
            size={13}
            strokeWidth={1.75}
            showCenterDot={true}
            className="shrink-0"
          />
          <span
            className={cn(
              "text-[12px] font-normal leading-none whitespace-nowrap",
              deliverySeverity === "high"
                ? "text-rose-400 font-medium"
                : deliverySeverity === "mid"
                ? "text-amber-400"
                : "text-[#ffffff6b]"
            )}
          >
            {deliveryLabel}
          </span>
        </div>

        <span className="text-[11px] text-[#ffffff40] font-mono shrink-0">
          {projectTasks.length} {projectTasks.length === 1 ? "item" : "items"}
        </span>
      </div>
    </div>
  );
}

// ── 3. TARJETA SORTABLE INDIVIDUAL CON DND-KIT ─────────────────────────────────
interface SortableProjectCardProps {
  project: any;
  onOpenProject: (id: string | number) => void;
}

function SortableProjectCard({ project, onOpenProject }: SortableProjectCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: String(project.id),
    animateLayoutChanges,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.2 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="task-card-wrapper w-full shrink-0 select-none"
    >
      <WorkProjectCardContent
        project={project}
        onOpen={() => onOpenProject(project.id)}
      />
    </div>
  );
}

// ── 4. COLUMNA KANBAN (IDÉNTICA A KANBANCOLUMN DE WORK 1) ──────────────────────
interface KanbanColumnSectionProps {
  col: {
    id: string;
    name: string;
    projects: any[];
  };
  draggingProjId: string | null;
  onOpenProject: (id: string | number) => void;
}

function KanbanColumnSection({ col, draggingProjId, onOpenProject }: KanbanColumnSectionProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: col.id,
  });

  return (
    <div
      ref={setNodeRef}
      data-column-id={col.id}
      className={`h-full relative flex flex-col gap-2.5 transition-all duration-200 ${
        draggingProjId
          ? isOver
            ? "z-30 border border-dashed border-sky-500/40 bg-sky-500/[0.02] p-2 rounded-[13px]"
            : "z-10 border border-dashed border-white/[0.04] p-2 rounded-[13px]"
          : "border border-transparent p-0"
      }`}
      style={{
        overflow: draggingProjId ? "visible" : "hidden",
      }}
    >
      {/* Cabecera de Columna (Pill Idéntico a Work 1) */}
      <div className="flex items-center gap-2.5 px-0 pt-1 pb-1 shrink-0 select-none">
        <span className="text-[13px] font-bold text-white tracking-tight">
          {col.name}
        </span>
        <span className="px-2.5 py-0.5 min-w-[24px] h-[20px] rounded-[13px] text-[11px] font-mono font-bold flex items-center justify-center shrink-0 bg-white/10 text-white">
          {col.projects.length}
        </span>
      </div>

      {/* Lista de Tarjetas Scrollable con SortableContext */}
      <SortableContext
        id={col.id}
        items={col.projects.map((p) => String(p.id))}
        strategy={verticalListSortingStrategy}
      >
        <div className="task-list-scroll relative h-[530px] hide-scrollbar flex flex-col gap-2.5 px-0 py-0 overflow-y-auto">
          {col.projects.map((proj) => (
            <SortableProjectCard
              key={proj.id}
              project={proj}
              onOpenProject={onOpenProject}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

// ── 5. COMPONENTE PRINCIPAL CLIENT DETAIL VIEW V2 ──────────────────────────────
export interface ClientDetailViewV2Props {
  client: Client;
  projects: any[];
  onBack: () => void;
  allClients?: Client[];
  onSelectClient?: (clientId: string) => void;
  onOpenProject: (projectId: string | number) => void;
  onCreateProject?: (preselectedClientId?: string) => void;
  onUpdateClient: (updated: Partial<Client>) => Promise<void> | void;
  className?: string;
}

export function ClientDetailViewV2({
  client,
  projects = [],
  allClients = [],
  onSelectClient,
  onBack,
  onOpenProject,
  onCreateProject,
  onUpdateClient,
  className = "",
}: ClientDetailViewV2Props) {
  const [isChangingClient, setIsChangingClient] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [phone, setPhone] = useState(client.contacto?.telefono || client.tel || "");
  const [email, setEmail] = useState(client.contacto?.email || client.email || "");
  const [whatsapp, setWhatsapp] = useState(client.contacto?.whatsapp || client.whatsapp || "");
  const [contactPerson, setContactPerson] = useState(client.contacto?.persona || client.contactPerson || "");
  const [notes, setNotes] = useState(client.notas_internas || client.notes || "");
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [status, setStatus] = useState(client.status || "Activo");

  // Finanzas
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [newPayAmount, setNewPayAmount] = useState("");
  const [newPayDate, setNewPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [newPayStatus, setNewPayStatus] = useState<"pagado" | "pendiente" | "vencido">("pagado");

  // Estado DnD de proyectos
  const [draggingProjId, setDraggingProjId] = useState<string | null>(null);
  const [localProjects, setLocalProjects] = useState<any[]>([]);

  // Sensores DnD con Smart Activator
  const sensors = useSensors(
    useSensor(SmartMouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(SmartTouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  // Estadísticas de Sesiones
  const { totalHours, totalSessions } = useEntitySessionStats("client", client.id);
  const { sessions: recentSessions = [] } = useRecentSessions(50);

  const clientColor = getSingleSourceClientColor(client).hslCss;

  // Filtrar proyectos pertenecientes a este cliente
  const clientProjects = useMemo(() => {
    const clientIdStr = String(client.id);
    const clientNameLower = (client.nombre || client.name || "").toLowerCase();

    return projects.filter((p) => {
      const matchId =
        String(p.cliente_ids?.[0] || "") === clientIdStr ||
        String(p.cliente_id || "") === clientIdStr ||
        String(p.client || "") === clientIdStr;
      const matchName =
        (p.client && p.client.toLowerCase() === clientNameLower) ||
        (p.cliente && p.cliente.toLowerCase() === clientNameLower);
      return matchId || matchName;
    });
  }, [projects, client]);

  // Sincronizar estado local de proyectos
  useEffect(() => {
    setLocalProjects(clientProjects);
  }, [clientProjects]);

  // Helper para clasificar el estado de un proyecto
  const getProjectStatusCol = (p: any): string => {
    const st = p.estadoProyecto || p.estado || p.status || "Planificado";
    if (st.includes("Completado") || st.includes("Hecho") || st.includes("Concluido")) return "Completado";
    if (st.includes("Revisión") || st.includes("Revision") || st.includes("Feedback")) return "En Revisión";
    if (st.includes("Proceso") || st.includes("Curso") || st.includes("Desarrollo")) return "En Proceso";
    return "Planificado";
  };

  // Agrupar proyectos en las 4 columnas
  const cols = useMemo(() => {
    const projs = localProjects.length > 0 ? localProjects : clientProjects;
    return KANBAN_STATUSES.map((st) => ({
      id: st,
      name: st,
      projects: projs.filter((p) => getProjectStatusCol(p) === st),
    }));
  }, [localProjects, clientProjects]);

  const activeDraggedProject = useMemo(() => {
    if (!draggingProjId) return null;
    return (localProjects.length > 0 ? localProjects : clientProjects).find(
      (p) => String(p.id) === draggingProjId
    ) || null;
  }, [draggingProjId, localProjects, clientProjects]);

  // Tareas del cliente para heatmap
  const clientTasks = useMemo(() => {
    return clientProjects.flatMap((p) => p.tasks || []);
  }, [clientProjects]);

  // Sesiones de este cliente
  const clientSessions = useMemo(() => {
    const clientProjIds = new Set(clientProjects.map((p) => String(p.id)));
    return (recentSessions as any[]).filter((s: any) => {
      return (
        String(s.client_id) === String(client.id) ||
        (s.projectId && clientProjIds.has(String(s.projectId)))
      );
    });
  }, [recentSessions, clientProjects, client.id]);

  // Finanzas
  const finanzas: ClientFinanzas = client.finanzas || {
    monto_contrato: Number(client.totalBudget?.replace(/[^0-9.-]+/g, "")) || 35000,
    total_pagado: Number(client.paidAmount?.replace(/[^0-9.-]+/g, "")) || 22000,
    historial_pagos: [
      { id: "p-1", fecha: "2026-07-01", monto: 12000, estado: "pagado" },
      { id: "p-2", fecha: "2026-08-01", monto: 10000, estado: "pagado" },
      { id: "p-3", fecha: "2026-09-01", monto: 13000, estado: "pendiente" },
    ],
  };

  const montoContrato = finanzas.monto_contrato || 35000;
  const totalPagado = finanzas.total_pagado || 0;
  const balancePendiente = Math.max(0, montoContrato - totalPagado);
  const porcentajePagado = montoContrato > 0 ? Math.min(100, Math.round((totalPagado / montoContrato) * 100)) : 0;

  // ── MANEJADORES DE ACCIONES ──
  const handleSaveContact = async () => {
    await onUpdateClient({
      email,
      tel: phone,
      whatsapp,
      contactPerson,
      contacto: {
        persona: contactPerson,
        telefono: phone,
        email,
        whatsapp,
      },
    });
    setIsEditingContact(false);
    playSound("pop");
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus);
    setIsChangingStatus(false);
    await onUpdateClient({
      status: newStatus,
      estado_relacion: newStatus.toLowerCase() as any,
    });
    playSound("click");
  };

  const handleSaveNotes = async (newNotes: string) => {
    setNotes(newNotes);
    await onUpdateClient({
      notas_internas: newNotes,
      notes: newNotes,
    });
  };

  const handleAddDriveLink = async (link: { label: string; url: string }) => {
    const newId = "dl-" + Date.now();
    const currentLinks = client.drive_links || [];
    const updated = [...currentLinks, { id: newId, ...link }];
    await onUpdateClient({ drive_links: updated });
    playSound("pop");
  };

  const handleUpdateDriveLink = async (id: string, updatedLink: { label: string; url: string }) => {
    const currentLinks = client.drive_links || [];
    const updated = currentLinks.map((l) => (l.id === id ? { ...l, ...updatedLink } : l));
    await onUpdateClient({ drive_links: updated });
    playSound("click");
  };

  const handleDeleteDriveLink = async (id: string) => {
    const currentLinks = client.drive_links || [];
    const updated = currentLinks.filter((l) => l.id !== id);
    await onUpdateClient({ drive_links: updated });
    playSound("trash");
  };

  const handleAddPayment = async () => {
    if (!newPayAmount || isNaN(Number(newPayAmount))) return;
    const amount = Number(newPayAmount);
    const newPayment: PaymentHistoryItem = {
      id: "pay-" + Date.now(),
      fecha: newPayDate,
      monto: amount,
      estado: newPayStatus,
    };

    const newHistory = [newPayment, ...(finanzas.historial_pagos || [])];
    const newTotalPagado = newPayStatus === "pagado" ? totalPagado + amount : totalPagado;

    await onUpdateClient({
      finanzas: {
        ...finanzas,
        total_pagado: newTotalPagado,
        historial_pagos: newHistory,
      },
      paidAmount: `$${newTotalPagado.toLocaleString()}`,
    });

    setNewPayAmount("");
    setIsAddingPayment(false);
    playSound("pop");
  };

  // ── DND HANDLERS (IDÉNTICO A KANBANBOARD WORK 1) ──
  const handleDragStart = (event: DragStartEvent) => {
    setDraggingProjId(String(event.active.id));
    playSound("pop");
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) return;

    let overColId = overId;
    const overProj = localProjects.find((p) => String(p.id) === overId);
    if (overProj) {
      overColId = getProjectStatusCol(overProj);
    }

    if (!KANBAN_STATUSES.includes(overColId)) return;

    setLocalProjects((prev) => {
      const activeProj = prev.find((p) => String(p.id) === activeId);
      if (!activeProj) return prev;

      const activeColId = getProjectStatusCol(activeProj);
      if (activeColId !== overColId) {
        const activeIdx = prev.findIndex((p) => String(p.id) === activeId);
        const overIdx = prev.findIndex((p) => String(p.id) === overId);

        const updated = prev.map((p) => {
          if (String(p.id) === activeId) {
            return {
              ...p,
              estadoProyecto: overColId,
              estado: overColId,
              status: overColId,
            };
          }
          return p;
        });

        if (overIdx !== -1) {
          return arrayMove(updated, activeIdx, overIdx);
        }
        return updated;
      }
      return prev;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggingProjId(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    let targetColId = overId;
    const overProj = localProjects.find((p) => String(p.id) === overId);
    if (overProj) {
      targetColId = getProjectStatusCol(overProj);
    }

    if (!KANBAN_STATUSES.includes(targetColId)) return;

    // Actualizar estado local
    setLocalProjects((prev) =>
      prev.map((p) => {
        if (String(p.id) === activeId) {
          return {
            ...p,
            estadoProyecto: targetColId,
            estado: targetColId,
            status: targetColId,
          };
        }
        return p;
      })
    );

    playSound("whoosh");

    // Persistencia directa en Firestore
    try {
      await updateDoc(doc(db, "projects", activeId), {
        estadoProyecto: targetColId,
        estado: targetColId,
        status: targetColId,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Error actualizando estado del proyecto en Firestore:", err);
    }
  };

  const clientStatuses = ["VIP", "Activo", "Pausa", "Prospecto", "Cerrado"];

  return (
    <div className={`w-full grid grid-cols-12 gap-5 items-stretch max-w-full text-[#ffffffd6] ${className}`}>
      
      {/* ═════════════════════════════════════════════════════════════════════════════
          COLUMNA IZQUIERDA (3 Columnas / col-span-3 - IDÉNTICA A SESIONES WORK 1)
          ═════════════════════════════════════════════════════════════════════════════ */}
      <div className="col-span-3 flex flex-col gap-4 p-5 h-[900px] rounded-[28px] bg-[#121212] border border-white/10 shadow-2xl overflow-hidden">
        
        {/* ── 1. CABECERA DE MARCA & ESTATUS (ANÁLOGO A DAILY EFFORT BAR) ── */}
        <div className="p-4 rounded-2xl bg-[#181818] border border-white/10 flex flex-col gap-3.5 shadow-sm shrink-0">
          {/* Fila Superior: Botón Volver + Selector de Estatus */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                playSound("click");
                onBack();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#ffffff6b] hover:text-[#ffffffd6] border border-white/10 transition-all select-none"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Volver a Clientes</span>
            </button>

            {/* Selector de Estatus Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsChangingStatus((prev) => !prev)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-all cursor-pointer select-none ${
                  status.toLowerCase().includes("vip")
                    ? "bg-purple-500/20 text-purple-400 border-purple-500/40"
                    : status.toLowerCase().includes("activo")
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                    : status.toLowerCase().includes("pausa")
                    ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/40"
                    : "bg-rose-500/20 text-rose-400 border-rose-500/40"
                }`}
              >
                {status}
              </button>

              {isChangingStatus && (
                <div className="absolute right-0 top-full mt-2 z-50 min-w-[130px] p-1.5 rounded-2xl bg-[#1f1f1f] border border-white/15 shadow-2xl flex flex-col gap-1">
                  {clientStatuses.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleStatusChange(st)}
                      className="px-3 py-1.5 text-xs rounded-xl text-left text-[#ffffffd6] hover:bg-white/10 transition-colors"
                    >
                      {st}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Fila Identidad de Marca: Avatar HSL + Nombre + Industria + Switcher */}
          <div className="relative">
            <div
              onClick={() => {
                if (allClients.length > 1 && onSelectClient) {
                  setIsChangingClient((prev) => !prev);
                  playSound('click');
                }
              }}
              className={cn(
                "flex items-center gap-3 mt-1 p-1 -m-1 rounded-2xl transition-colors",
                allClients.length > 1 && onSelectClient ? "cursor-pointer hover:bg-white/5" : ""
              )}
              title={allClients.length > 1 ? "Cambiar de cliente" : undefined}
            >
              <div
                className="w-12 h-12 rounded-2xl border border-white/20 shadow-md flex items-center justify-center text-lg font-black text-white shrink-0"
                style={{ backgroundColor: clientColor }}
              >
                {client.logo && client.logo.length <= 3
                  ? client.logo
                  : (client.nombre || client.name || "C").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-base font-bold text-[#ffffffd6] tracking-tight truncate">
                    {client.nombre || client.name}
                  </h2>
                  {allClients.length > 1 && onSelectClient && (
                    <span className="text-[10px] text-[#ffffff6b] hover:text-white">▼</span>
                  )}
                </div>
                <span className="text-xs text-[#ffffff6b] truncate">
                  {client.industria || client.industry || "Marca Cliente"}
                </span>
              </div>
            </div>

            {/* Dropdown de cambio de cliente */}
            {isChangingClient && allClients.length > 1 && onSelectClient && (
              <div className="absolute left-0 top-full mt-2 z-50 w-full p-2 rounded-2xl bg-[#1f1f1f] border border-white/15 shadow-2xl flex flex-col gap-1 max-h-[220px] overflow-y-auto custom-scrollbar">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#ffffff6b] px-2 py-1">
                  Seleccionar Marca
                </span>
                {allClients.map((c) => {
                  const cColor = getSingleSourceClientColor(c).hslCss;
                  const isCurrent = String(c.id) === String(client.id);

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onSelectClient(String(c.id));
                        setIsChangingClient(false);
                      }}
                      className={cn(
                        "flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-colors text-xs",
                        isCurrent
                          ? "bg-white/15 text-white font-bold"
                          : "text-[#ffffffd6] hover:bg-white/10"
                      )}
                    >
                      <div
                        className="w-4 h-4 rounded-full shrink-0 border border-white/20"
                        style={{ backgroundColor: cColor }}
                      />
                      <span className="truncate flex-1">{c.nombre || c.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selector Interactivo de Color de Marca */}
          <div className="pt-2.5 border-t border-white/5 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#ffffff6b]">Color de Marca</span>
            <div className="flex items-center gap-1.5">
              {PROJECT_COLOR_PALETTE.slice(0, 6).map((preset) => {
                const isSelected =
                  client.color === preset.hslStr ||
                  client.colorName === preset.name;

                return (
                  <button
                    key={preset.name}
                    type="button"
                    title={preset.name}
                    onClick={async () => {
                      playSound("click");
                      await onUpdateClient({
                        color: preset.hslStr,
                        colorName: preset.name,
                      });
                    }}
                    className={cn(
                      "w-4 h-4 rounded-full bg-gradient-to-br transition-all cursor-pointer border",
                      preset.gradient,
                      isSelected
                        ? "border-white scale-125 ring-2 ring-white/40"
                        : "border-transparent opacity-60 hover:opacity-100 hover:scale-110"
                    )}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* ── 2. CUERPO DE INFORMACIÓN & ASSETS (ANÁLOGO A HOME SESSIONS COLUMN) ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-0.5">
          
          {/* Caja 1: Datos de Contacto Directo */}
          <div className="p-3.5 rounded-2xl bg-[#181818] border border-white/10 flex flex-col gap-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#ffffff6b]">
                Contacto Directo
              </span>
              <button
                type="button"
                onClick={() => setIsEditingContact((prev) => !prev)}
                className="text-[#ffffff6b] hover:text-[#ffffffd6] p-1 rounded-lg hover:bg-white/5 transition-colors"
                title="Editar contacto"
              >
                {isEditingContact ? <X className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
              </button>
            </div>

            {isEditingContact ? (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="Persona de contacto"
                  className="px-3 py-1.5 text-xs rounded-xl bg-[#222222] border border-white/10 text-[#ffffffd6] placeholder:text-[#ffffff40] outline-none"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Correo electrónico"
                  className="px-3 py-1.5 text-xs rounded-xl bg-[#222222] border border-white/10 text-[#ffffffd6] placeholder:text-[#ffffff40] outline-none"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Teléfono"
                  className="px-3 py-1.5 text-xs rounded-xl bg-[#222222] border border-white/10 text-[#ffffffd6] placeholder:text-[#ffffff40] outline-none"
                />
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="WhatsApp"
                  className="px-3 py-1.5 text-xs rounded-xl bg-[#222222] border border-white/10 text-[#ffffffd6] placeholder:text-[#ffffff40] outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveContact}
                  className="mt-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Guardar Contacto</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 text-xs text-[#ffffffd6]">
                {contactPerson && (
                  <div className="flex items-center gap-2.5 font-medium text-white/90">
                    <span className="text-[11px] text-[#ffffff6b]">Titular:</span>
                    <span className="truncate">{contactPerson}</span>
                  </div>
                )}
                {email ? (
                  <a
                    href={`mailto:${email}`}
                    className="flex items-center gap-2 text-blue-400 hover:underline truncate"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#ffffff6b] shrink-0" />
                    <span className="truncate">{email}</span>
                  </a>
                ) : (
                  <span className="text-[11px] text-[#ffffff40] italic">Sin email registrado</span>
                )}
                {phone && (
                  <a
                    href={`tel:${phone}`}
                    className="flex items-center gap-2 text-[#ffffffd6] hover:text-white truncate"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#ffffff6b] shrink-0" />
                    <span>{phone}</span>
                  </a>
                )}
                {whatsapp && (
                  <a
                    href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-emerald-400 hover:underline truncate"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>WhatsApp directo</span>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Caja 2: Google Drive & Enlaces Compartidos */}
          <div className="p-3.5 rounded-2xl bg-[#181818] border border-white/10 flex flex-col gap-2.5 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#ffffff6b]">
              Carpetas y Assets Drive
            </span>
            <DriveButton
              links={client.drive_links || []}
              onAddLink={handleAddDriveLink}
              onUpdateLink={handleUpdateDriveLink}
              onDeleteLink={handleDeleteDriveLink}
            />
          </div>

          {/* Caja 3: Notas Internas & Directrices */}
          <div className="p-3.5 rounded-2xl bg-[#181818] border border-white/10 flex flex-col gap-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#ffffff6b]">
                Notas & Directrices
              </span>
              <FileText className="w-3.5 h-3.5 text-[#ffffff6b]" />
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => handleSaveNotes(notes)}
              rows={3}
              placeholder="Instrucciones clave de marca, lineamientos de tono, accesos..."
              className="w-full p-2.5 text-xs rounded-xl bg-[#222222] border border-white/10 text-[#ffffffd6] placeholder:text-[#ffffff40] outline-none resize-none focus:border-white/20 transition-colors"
            />
          </div>

          {/* Caja 4: Resumen de Plan & Contrato */}
          <div className="p-3.5 rounded-2xl bg-[#181818] border border-white/10 flex flex-col gap-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#ffffff6b]">
                Plan & Contrato
              </span>
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[#ffffff6b]">Plan Contratado:</span>
              <span className="font-bold text-white uppercase tracking-wider text-[11px] px-2 py-0.5 rounded-md bg-white/10">
                {client.plan_contratado || "Crecimiento"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#ffffff6b]">Proyectos Totales:</span>
              <span className="font-bold text-emerald-400">{clientProjects.length} proyectos</span>
            </div>
          </div>

        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════════
          COLUMNA DERECHA (9 Columnas / col-span-9 - IDÉNTICA A WORK 1)
          ═════════════════════════════════════════════════════════════════════════════ */}
      <div className="col-span-9 flex flex-col gap-5">
        
        {/* ── 1. TABLERO KANBAN DE PROYECTOS (620px HEIGHT, SIN TÍTULOS NI CONTENEDORES EXTRA) ── */}
        <div className={`w-full h-[620px] relative ${draggingProjId ? "overflow-visible" : "overflow-hidden"}`}>
          
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            autoScroll={{ threshold: { x: 0, y: 0.2 }, acceleration: 10 }}
          >
            <div
              className={`w-full h-full relative grid grid-cols-4 gap-5 pt-0 animate-fadeIn ${
                draggingProjId ? "overflow-visible z-30 is-dragging-active" : "overflow-hidden"
              }`}
            >
              {cols.map((col) => (
                <KanbanColumnSection
                  key={col.id}
                  col={col}
                  draggingProjId={draggingProjId}
                  onOpenProject={onOpenProject}
                />
              ))}
            </div>

            {/* Floating Drag Overlay */}
            {draggingProjId && typeof document !== "undefined"
              ? createPortal(
                  <DragOverlay dropAnimation={dropAnimation}>
                    {activeDraggedProject ? (
                      <div
                        className="w-[280px] pointer-events-none select-none shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)]"
                        style={{
                          transform: `scale(1.04)`,
                        }}
                      >
                        <WorkProjectCardContent
                          project={activeDraggedProject}
                          onOpen={() => {}}
                        />
                      </div>
                    ) : null}
                  </DragOverlay>,
                  document.body
                )
              : null}
          </DndContext>
        </div>

        {/* ── 2. DOS RECTÁNGULOS REDONDEADOS INFERIORES (-mt-10 H-[300px]) ── */}
        <div className="grid grid-cols-2 gap-5 -mt-10 relative z-20">
          
          {/* Rectángulo 1 (Izquierdo): Mapa de Actividad y Sesiones del Cliente */}
          <div className="h-[300px] rounded-[24px] bg-[#181818] border border-white/10 p-5 flex flex-col justify-between overflow-hidden shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-[#ffffffd6]">Actividad & Horas Invertidas</span>
              </div>
              <span className="text-[11px] font-bold text-blue-400">
                {totalHours} hrs en {totalSessions} sesiones
              </span>
            </div>

            <div className="flex-1 flex items-center justify-center py-2 overflow-hidden">
              <GitHubActivity
                accent={clientColor || "#3b82f6"}
                cellSize={12}
                months={4}
                showMonths={true}
                sessions={clientSessions}
                tasks={clientTasks}
                projects={clientProjects}
                noContainer={true}
                className="h-full w-full"
              />
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-[#ffffff6b] shrink-0">
              <span>{clientProjects.length} Proyectos Activos</span>
              <span>{clientTasks.length} Entregables Asociados</span>
            </div>
          </div>

          {/* Rectángulo 2 (Derecho): Salud Financiera & Facturación */}
          <div className="h-[300px] rounded-[24px] bg-[#181818] border border-white/10 p-5 flex flex-col justify-between overflow-hidden shadow-xl">
            {/* Header Finanzas */}
            <div className="flex items-center justify-between pb-2 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-[#ffffffd6]">Salud Financiera & Facturación</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingPayment((prev) => !prev)}
                className="flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:text-blue-300"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Registrar Abono</span>
              </button>
            </div>

            {/* Modal / Formulario Rápido de Pago */}
            {isAddingPayment ? (
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-[#222222] border border-white/10 my-auto">
                <span className="text-[11px] font-bold text-white">Nuevo Registro de Pago</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={newPayAmount}
                    onChange={(e) => setNewPayAmount(e.target.value)}
                    placeholder="Monto ($)"
                    className="px-3 py-1.5 text-xs rounded-xl bg-[#181818] border border-white/10 text-white outline-none"
                  />
                  <input
                    type="date"
                    value={newPayDate}
                    onChange={(e) => setNewPayDate(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-xl bg-[#181818] border border-white/10 text-white outline-none"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingPayment(false)}
                    className="px-3 py-1 rounded-lg text-xs text-[#ffffff6b] hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleAddPayment}
                    className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            ) : (
              /* KPIs Financieros Principales */
              <div className="flex flex-col gap-3 my-auto">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-2.5 rounded-xl bg-[#121212] border border-white/5">
                    <span className="text-[10px] font-bold text-[#ffffff6b] uppercase">Contrato</span>
                    <div className="text-sm font-bold text-white mt-0.5">${montoContrato.toLocaleString()}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#121212] border border-white/5">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase">Pagado</span>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">${totalPagado.toLocaleString()}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#121212] border border-white/5">
                    <span className="text-[10px] font-bold text-amber-400 uppercase">Pendiente</span>
                    <div className="text-sm font-bold text-amber-400 mt-0.5">${balancePendiente.toLocaleString()}</div>
                  </div>
                </div>

                {/* Barra de Progreso Financiero */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] font-bold text-[#ffffff6b]">
                    <span>Cobrado: {porcentajePagado}%</span>
                    <span>Pendiente: {100 - porcentajePagado}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#121212] border border-white/10 overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-500"
                      style={{ width: `${porcentajePagado}%` }}
                    />
                    <div
                      className="h-full bg-amber-400/60 transition-all duration-500"
                      style={{ width: `${100 - porcentajePagado}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Historial Resumido de Pagos */}
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-[#ffffff6b] shrink-0">
              <span>{finanzas.historial_pagos?.length || 0} Abonos Registrados</span>
              <span className="font-semibold text-white/90">
                Próx. Factura: {finanzas.proxima_factura || "01 Sep 2026"}
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
