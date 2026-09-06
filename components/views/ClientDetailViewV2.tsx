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
  MoreHorizontal,
  Shield,
  Award,
  Users,
  Palette,
  ExternalLink,
  Link2
} from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/lib/store";
import { useData } from "@/hooks/useData";
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
  isProjectActive,
  cn
} from "@/lib/utils";
import type { Client, Project, PaymentHistoryItem, ClientFinanzas, ClientSLA, BrandKit, Member } from "@/lib/types";

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
  onCreateProject?: () => void;
}

function KanbanColumnSection({ col, draggingProjId, onOpenProject, onCreateProject }: KanbanColumnSectionProps) {
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
      <div className="flex items-center justify-between px-0 pt-1 pb-1 shrink-0 select-none">
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] font-bold text-white tracking-tight">
            {col.name}
          </span>
          <span className="px-2.5 py-0.5 min-w-[24px] h-[20px] rounded-[13px] text-[11px] font-mono font-bold flex items-center justify-center shrink-0 bg-white/10 text-white">
            {col.projects.length}
          </span>
        </div>
        {col.id === "Planificación" && onCreateProject && (
          <button
            type="button"
            onClick={() => {
              playSound("click");
              onCreateProject();
            }}
            className="p-1 rounded-lg text-[#ffffff6b] hover:text-white hover:bg-white/10 transition-colors"
            title="Crear nuevo proyecto"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
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
  const role = useAuthStore((s) => s.role);
  const isAdmin = role === "admin";

  const { data } = useData();
  const allMembers = data?.miembros || [];

  const [isChangingClient, setIsChangingClient] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [phone, setPhone] = useState(client.contacto?.telefono || client.tel || "");
  const [email, setEmail] = useState(client.contacto?.email || client.email || "");
  const [whatsapp, setWhatsapp] = useState(client.contacto?.whatsapp || client.whatsapp || "");
  const [contactPerson, setContactPerson] = useState(client.contacto?.persona || client.contactPerson || "");
  const [notes, setNotes] = useState(client.notas_internas || client.notes || "");
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [status, setStatus] = useState(client.status || "Activo");

  // SLA
  const [sla, setSla] = useState<ClientSLA | "">(client.sla || "");
  const [isChangingSla, setIsChangingSla] = useState(false);

  // Responsables
  const [responsablesIds, setResponsablesIds] = useState<string[]>(client.responsables_ids || []);
  const [isSelectingResponsables, setIsSelectingResponsables] = useState(false);

  // Kit de Marca
  const [isEditingBrandKit, setIsEditingBrandKit] = useState(false);
  const [logoUrl, setLogoUrl] = useState(client.brand_kit?.logotipos_url || "");
  const [manualUrl, setManualUrl] = useState(client.brand_kit?.manual_estilo_url || "");
  const [voiceGuidelines, setVoiceGuidelines] = useState(client.brand_kit?.brand_voice_guidelines || "");
  const [driveFolderUrl, setDriveFolderUrl] = useState(client.brand_kit?.drive_folder_url || "");

  // LTV Histórico
  const [ltvHistorico, setLtvHistorico] = useState<string>(
    client.ltv_historico !== undefined ? String(client.ltv_historico) : ""
  );

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

  // Proyectos Activos (filtrados en vivo con isProjectActive)
  const activeClientProjects = useMemo(() => {
    return clientProjects.filter((p) => isProjectActive(p.estadoProyecto || p.estado || p.status));
  }, [clientProjects]);

  // Sincronizar estado local al cambiar el cliente
  useEffect(() => {
    setLocalProjects(clientProjects);
    setSla(client.sla || "");
    setResponsablesIds(client.responsables_ids || []);
    setLogoUrl(client.brand_kit?.logotipos_url || "");
    setManualUrl(client.brand_kit?.manual_estilo_url || "");
    setVoiceGuidelines(client.brand_kit?.brand_voice_guidelines || "");
    setDriveFolderUrl(client.brand_kit?.drive_folder_url || "");
    setLtvHistorico(client.ltv_historico !== undefined ? String(client.ltv_historico) : "");
  }, [client, clientProjects]);

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

  const handleSlaChange = async (newSla: ClientSLA | "") => {
    setSla(newSla);
    setIsChangingSla(false);
    await onUpdateClient({
      sla: newSla ? newSla : undefined,
    });
    playSound("click");
  };

  const handleToggleResponsable = async (memberId: string) => {
    const updated = responsablesIds.includes(memberId)
      ? responsablesIds.filter((id) => id !== memberId)
      : [...responsablesIds, memberId];
    setResponsablesIds(updated);
    await onUpdateClient({ responsables_ids: updated });
    playSound("pop");
  };

  const handleSaveBrandKit = async () => {
    const updatedKit: BrandKit = {
      logotipos_url: logoUrl.trim() || undefined,
      manual_estilo_url: manualUrl.trim() || undefined,
      brand_voice_guidelines: voiceGuidelines.trim() || undefined,
      drive_folder_url: driveFolderUrl.trim() || undefined,
    };
    setIsEditingBrandKit(false);
    await onUpdateClient({ brand_kit: updatedKit });
    playSound("pop");
  };

  const handleSaveLtvHistorico = async (val: string) => {
    const num = val.trim() ? parseFloat(val) : undefined;
    await onUpdateClient({ ltv_historico: num });
    playSound("pop");
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
        <div className="p-4 rounded-2xl bg-[#181818] border border-white/10 flex flex-col gap-3 shadow-sm shrink-0">
          {/* Fila Superior: Botón Volver + Selectores (Estatus & SLA) */}
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => {
                playSound("click");
                onBack();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#ffffff6b] hover:text-[#ffffffd6] border border-white/10 transition-all select-none"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Volver</span>
            </button>

            <div className="flex items-center gap-1.5">
              {/* Selector de SLA */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsChangingSla((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer select-none flex items-center gap-1 ${
                    sla === "enterprise"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      : sla === "premium"
                      ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                      : sla === "standard"
                      ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                      : "bg-white/5 text-white/50 border-white/10"
                  }`}
                  title="Nivel de SLA"
                >
                  <Shield className="w-3 h-3" />
                  <span>{sla ? sla.toUpperCase() : "SLA"}</span>
                </button>

                {isChangingSla && (
                  <div className="absolute right-0 top-full mt-2 z-50 min-w-[130px] p-1.5 rounded-2xl bg-[#1f1f1f] border border-white/15 shadow-2xl flex flex-col gap-1">
                    {(["standard", "premium", "enterprise", ""] as const).map((sOpt) => (
                      <button
                        key={sOpt || "none"}
                        type="button"
                        onClick={() => handleSlaChange(sOpt)}
                        className="px-3 py-1.5 text-xs rounded-xl text-left text-[#ffffffd6] hover:bg-white/10 transition-colors capitalize"
                      >
                        {sOpt ? sOpt : "Sin SLA"}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selector de Estatus Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsChangingStatus((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer select-none ${
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

          {/* Responsables de Cuenta (Multi-Select de Members) */}
          <div className="pt-2.5 border-t border-white/5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#ffffff6b] flex items-center gap-1">
                <Users className="w-3 h-3 text-white/40" />
                Responsables ({responsablesIds.length})
              </span>
              <button
                type="button"
                onClick={() => setIsSelectingResponsables((prev) => !prev)}
                className="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                {isSelectingResponsables ? "Listo" : "+ Asignar"}
              </button>
            </div>

            {/* Chips de responsables */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {responsablesIds.map((mId) => {
                const member = allMembers.find((m) => String(m.id) === String(mId));
                return (
                  <span
                    key={mId}
                    onClick={() => handleToggleResponsable(mId)}
                    className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-white/80 hover:text-rose-300 border border-white/10 text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 group"
                    title="Clic para remover"
                  >
                    <span>{member?.nombre || mId}</span>
                    <X className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100" />
                  </span>
                );
              })}
              {responsablesIds.length === 0 && (
                <span className="text-[10px] text-white/30 italic">Sin responsables asignados</span>
              )}
            </div>

            {/* Popover de selección */}
            {isSelectingResponsables && (
              <div className="p-2 rounded-xl bg-[#222222] border border-white/15 flex flex-col gap-1 max-h-[160px] overflow-y-auto custom-scrollbar mt-1">
                {allMembers.map((m) => {
                  const isSelected = responsablesIds.includes(String(m.id));
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleToggleResponsable(String(m.id))}
                      className={cn(
                        "flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left",
                        isSelected
                          ? "bg-blue-600/30 text-blue-300 font-bold"
                          : "text-white/70 hover:bg-white/5"
                      )}
                    >
                      <span className="truncate">{m.nombre}</span>
                      {isSelected && <Check className="w-3 h-3 text-blue-400 shrink-0 ml-1" />}
                    </button>
                  );
                })}
                {allMembers.length === 0 && (
                  <span className="text-[10px] text-white/30 italic p-1">No hay colaboradores registrados</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── 2. CUERPO DE INFORMACIÓN & ASSETS (ANÁLOGO A HOME SESSIONS COLUMN) ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-0.5">

          {/* Caja 2: Kit de Marca & Identidad */}
          <div className="p-3.5 rounded-2xl bg-[#181818] border border-white/10 flex flex-col gap-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#ffffff6b] flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-purple-400" />
                Kit de Marca & Identidad
              </span>
              <button
                type="button"
                onClick={() => setIsEditingBrandKit((prev) => !prev)}
                className="text-[#ffffff6b] hover:text-[#ffffffd6] p-1 rounded-lg hover:bg-white/5 transition-colors"
                title="Editar kit de marca"
              >
                {isEditingBrandKit ? <X className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
              </button>
            </div>

            {isEditingBrandKit ? (
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase text-white/40">Logotipos (URL)</label>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://drive.google.com/logos..."
                    className="px-3 py-1.5 text-xs rounded-xl bg-[#222222] border border-white/10 text-white placeholder:text-white/30 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase text-white/40">Manual de Estilo (URL)</label>
                  <input
                    type="url"
                    value={manualUrl}
                    onChange={(e) => setManualUrl(e.target.value)}
                    placeholder="https://figma.com/file/brand-manual..."
                    className="px-3 py-1.5 text-xs rounded-xl bg-[#222222] border border-white/10 text-white placeholder:text-white/30 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase text-white/40">Brand Voice / Tono</label>
                  <textarea
                    rows={2}
                    value={voiceGuidelines}
                    onChange={(e) => setVoiceGuidelines(e.target.value)}
                    placeholder="Tono cercano, profesional, dinámico..."
                    className="px-3 py-1.5 text-xs rounded-xl bg-[#222222] border border-white/10 text-white placeholder:text-white/30 outline-none resize-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase text-white/40">Carpeta de Assets (URL)</label>
                  <input
                    type="url"
                    value={driveFolderUrl}
                    onChange={(e) => setDriveFolderUrl(e.target.value)}
                    placeholder="https://drive.google.com/folder..."
                    className="px-3 py-1.5 text-xs rounded-xl bg-[#222222] border border-white/10 text-white placeholder:text-white/30 outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSaveBrandKit}
                  className="mt-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Guardar Kit de Marca</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {logoUrl ? (
                  <a
                    href={logoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 text-purple-300 font-medium transition-colors truncate"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    <span className="truncate">Logotipos</span>
                  </a>
                ) : (
                  <span className="p-2 rounded-xl bg-white/[0.01] border border-dashed border-white/5 text-[10px] text-white/30 italic text-center">
                    Sin Logos
                  </span>
                )}

                {manualUrl ? (
                  <a
                    href={manualUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 text-purple-300 font-medium transition-colors truncate"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    <span className="truncate">Manual Estilo</span>
                  </a>
                ) : (
                  <span className="p-2 rounded-xl bg-white/[0.01] border border-dashed border-white/5 text-[10px] text-white/30 italic text-center">
                    Sin Manual
                  </span>
                )}

                {driveFolderUrl ? (
                  <a
                    href={driveFolderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="col-span-2 flex items-center gap-1.5 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 text-blue-300 font-medium transition-colors truncate"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    <span className="truncate">Carpeta de Assets</span>
                  </a>
                ) : null}

                {voiceGuidelines && (
                  <div className="col-span-2 p-2 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-white/70 italic">
                    <span className="font-bold text-white/90 not-italic block mb-0.5 text-[9px] uppercase tracking-wider">
                      Brand Voice:
                    </span>
                    {voiceGuidelines}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Caja 3: Google Drive & Enlaces Compartidos */}
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

          {/* Caja 4: Notas Internas & Directrices */}
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

          {/* Caja 5: Resumen de Plan & Contrato */}
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
              <span className="text-[#ffffff6b]">Proyectos Activos:</span>
              <span className="font-bold text-emerald-400">{activeClientProjects.length} proyectos</span>
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
                  onCreateProject={onCreateProject ? () => onCreateProject(String(client.id)) : undefined}
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
              <span>{activeClientProjects.length} Proyectos Activos</span>
              <span>{clientTasks.length} Entregables Asociados</span>
            </div>
          </div>

          {/* Rectángulo 2 (Derecho): Salud Financiera & LTV (Gateado estrictamente con isAdmin) */}
          {isAdmin && (
            <div className="h-[300px] rounded-[24px] bg-[#181818] border border-white/10 p-5 flex flex-col justify-between overflow-hidden shadow-xl">
              {/* Header Finanzas */}
              <div className="flex items-center justify-between pb-2 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-[#ffffffd6]">Salud Financiera & LTV</span>
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
                /* KPIs Financieros Principales & LTV */
                <div className="flex flex-col gap-2.5 my-auto">
                  {/* Fila 1: KPIs Contrato / Pagado / Pendiente */}
                  <div className="grid grid-cols-3 gap-2.5 text-center">
                    <div className="p-2 rounded-xl bg-[#121212] border border-white/5">
                      <span className="text-[9px] font-bold text-[#ffffff6b] uppercase">Contrato</span>
                      <div className="text-xs font-bold text-white mt-0.5">${montoContrato.toLocaleString()}</div>
                    </div>
                    <div className="p-2 rounded-xl bg-[#121212] border border-white/5">
                      <span className="text-[9px] font-bold text-emerald-400 uppercase">Pagado</span>
                      <div className="text-xs font-bold text-emerald-400 mt-0.5">${totalPagado.toLocaleString()}</div>
                    </div>
                    <div className="p-2 rounded-xl bg-[#121212] border border-white/5">
                      <span className="text-[9px] font-bold text-amber-400 uppercase">Pendiente</span>
                      <div className="text-xs font-bold text-amber-400 mt-0.5">${balancePendiente.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Fila 2: LTV Histórico + LTV Calculado + LTV Total */}
                  <div className="p-2.5 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/20 flex items-center justify-between gap-3">
                    {/* LTV Histórico (Input editable) */}
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <label className="text-[8px] font-bold uppercase text-emerald-400/80">LTV Histórico ($)</label>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={ltvHistorico}
                        onChange={(e) => setLtvHistorico(e.target.value)}
                        onBlur={(e) => handleSaveLtvHistorico(e.target.value)}
                        placeholder="0"
                        className="w-full bg-[#121212] border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-emerald-500/50"
                      />
                    </div>

                    {/* LTV Calculado (Rollup automático de pagos) */}
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0 text-center">
                      <span className="text-[8px] font-bold uppercase text-[#ffffff6b]">LTV Calculado</span>
                      <span className="text-xs font-bold text-white truncate py-1">
                        ${(client.ltv_calculado ?? 0).toLocaleString()}
                      </span>
                    </div>

                    {/* LTV Total (Suma de ambos) */}
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0 text-right">
                      <span className="text-[8px] font-bold uppercase text-emerald-400">LTV Total</span>
                      <span className="text-xs font-black text-emerald-300 truncate py-1">
                        ${(
                          (ltvHistorico ? parseFloat(ltvHistorico) || 0 : client.ltv_historico || 0) +
                          (client.ltv_calculado || 0)
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Barra de Progreso Financiero */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[9px] font-bold text-[#ffffff6b]">
                      <span>Cobrado: {porcentajePagado}%</span>
                      <span>Pendiente: {100 - porcentajePagado}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#121212] border border-white/10 overflow-hidden flex">
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
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-[#ffffff6b] shrink-0">
                <span>{finanzas.historial_pagos?.length || 0} Abonos Registrados</span>
                <span className="font-semibold text-white/90">
                  Próx. Factura: {finanzas.proxima_factura || "01 Sep 2026"}
                </span>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
