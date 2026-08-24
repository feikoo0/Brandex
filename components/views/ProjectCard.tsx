"use client";

import React from "react";
import { motion } from "framer-motion";
import { MoreHorizontal, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useData } from "@/hooks/useData";
import { useProjectSummary } from "@/hooks/useProjectSummary";
import { cn, avatarOf, getSingleSourceProjectColor, parseAnyDate, getCalendarDaysDiff } from "@/lib/utils";
import { STATUS_COLORS } from "@/lib/constants";
import ProjectCoverFormats from "@/app/taski/components/ProjectCoverFormats";
import { ProjectStatusIcon } from "@/components/common/ProjectStatusIcon";

export interface ProjectCardItemProps {
  projectId: string;
  project?: any;
  onOpenFullScreen: (id: string) => void;
  cardStyle?: "cover" | "full";
}

function getDeliveryStatusText(fechaFin?: string, fechaInicio?: string): string {
  const rawDate = fechaFin || fechaInicio;
  if (!rawDate) return "Sin fecha";

  const targetDate = parseAnyDate(rawDate);
  if (!targetDate) return "Sin fecha";

  const diffDays = getCalendarDaysDiff(targetDate);

  if (diffDays < 0) {
    const overdue = Math.abs(diffDays);
    return `Atrasada ${overdue} ${overdue === 1 ? "día" : "días"}`;
  } else if (diffDays === 0) {
    return "Entrega hoy";
  } else if (diffDays === 1) {
    return "Entrega mañana";
  } else {
    return `Entrega en ${diffDays} ${diffDays === 1 ? "día" : "días"}`;
  }
}

// ── 1. TARJETA DE PROYECTO (DISEÑO OPTIMIZADO DE ALTO VALOR INFORMATIVO) ───────
export function ProjectCardItem({ 
  projectId, 
  project,
  onOpenFullScreen,
  cardStyle = "cover"
}: ProjectCardItemProps) {
  const summary = useProjectSummary(projectId);
  const { data } = useData();

  const p = project || summary.project;
  if (!p) return null;

  const projTitle = p.nombre || p.title || "Sin título";
  const clientName = summary.clientName || p.client || p.cliente || "Brandex";
  const statusColor = STATUS_COLORS[summary.status || p.status || "Planificación"] || "#ffffffd6";
  const projColor = getSingleSourceProjectColor(p).hslCss;

  // Resolución de fecha con fallback exhaustivo directo desde el proyecto y summary
  const effectiveDate = 
    summary.fechaFin || 
    summary.fechaInicio || 
    p.fechaFin || 
    p.fechaInicio || 
    (p as any).fecha_fin || 
    (p as any).fecha_inicio || 
    (p as any).deadline || 
    (p as any).fechaEntrega || 
    (p as any).fecha_entrega || 
    (p as any).startDate || 
    (p as any).endDate || 
    (p as any).fecha;

  const deliveryStatusText = getDeliveryStatusText(effectiveDate);

  // Tareas pertenecientes a este proyecto formateadas para el mosaico de íconos
  const projectTasks = (summary.tasks && summary.tasks.length > 0 ? summary.tasks : (p.tasks || [])).map((t: any) => ({
    id: t.id,
    title: t.titulo || t.title || "",
    format: t.formato || t.format || "",
    formato: t.formato || t.format || "",
    status: t.estado || t.status || "Pendiente",
    ...t,
  }));

  // Rescatar avatares del equipo asignado (por IDs o por texto plano)
  let assignedWorkers = (p.asignado_ids || [])
    .map((id: string) => data?.trabajadores.find((w) => String(w.id) === String(id)))
    .filter(Boolean);

  if (assignedWorkers.length === 0 && p.asignado) {
    const names = String(p.asignado).split(",").map((s) => s.trim().toLowerCase());
    assignedWorkers = (data?.trabajadores || []).filter((w) => 
      names.some((n) => n && (w.nombre || (w as any).name || "").toLowerCase().includes(n))
    );
  }

  const realTotalTasks = summary.totalTasks > 0 ? summary.totalTasks : projectTasks.length;
  const totalTasksCount = Math.max(realTotalTasks, 1);
  const completedCount = summary.completedTasks > 0 
    ? summary.completedTasks 
    : projectTasks.filter((t: any) => t.status === "Completado" || t.estado === "Completado").length;

  // Texto del contador de tareas de alto valor
  const taskCountText = realTotalTasks > 0 
    ? (completedCount > 0 ? `Tarea ${completedCount} de ${realTotalTasks}` : `${realTotalTasks} tareas`)
    : "Sin tareas asignadas";

  // ── ESTILO 2: TARJETA DE COLOR COMPLETO ──
  if (cardStyle === "full") {
    return (
      <div 
        onClick={() => onOpenFullScreen(p.id)}
        className="p-4 rounded-2xl border-none transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-sm hover:shadow-md relative overflow-hidden group text-white h-[210px]"
        style={{ backgroundColor: projColor }}
      >
        <div>
          {/* Fila Superior: Cliente • Estatus del Proyecto */}
          <div className="flex items-center justify-between mb-2.5 text-[11px] font-semibold text-white/90">
            <span className="truncate max-w-[170px] bg-black/20 px-2 py-0.5 rounded-full" title={clientName}>
              {clientName} • {summary.status || p.status || "Planificación"}
            </span>
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); onOpenFullScreen(p.id); }}
              className="p-0.5 rounded-lg hover:bg-white/20 transition-colors"
            >
              <MoreHorizontal className="w-3.5 h-3.5 text-white/80" />
            </button>
          </div>

          {/* Fila Principal: Título + Fechas Conectadas */}
          <div className="flex flex-col min-w-0 mb-3">
            <h3 className="text-base font-medium text-white tracking-tight line-clamp-2 mt-2.5 translate-y-[6px]">
              {projTitle}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 text-[14px] text-[#ffffff6b] font-normal">
              {(summary.status || p.status) && (
                <>
                  <ProjectStatusIcon status={summary.status || p.status} className="w-3.5 h-3.5 translate-y-[1.5px]" />
                  <span className="font-medium text-white">{summary.status || p.status}</span>
                  <span className="text-white/40">•</span>
                </>
              )}
              <span>{deliveryStatusText}</span>
            </div>
          </div>
        </div>

        {/* Footer: Barra de Progreso Segmentada (Sin texto de tarea x de x) */}
        <div className="pt-2 border-t border-white/20 flex flex-col gap-1.5 mt-auto">

          
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

  // ── ESTILO 1: TARJETA CON PORTADA EN CONTENEDOR RECTÁNGULO REDONDEADO ──
  return (
    <motion.div 
      onClick={() => onOpenFullScreen(p.id)}
      className="relative cursor-pointer h-[220px] p-2"
      initial="initial"
      whileHover="hover"
    >
      {/* Rectángulo contenedor de fondo que aparece detrás del contenido haciendo FADE IN + Crecimiento al hacer hover */}
      <motion.div 
        variants={{
          initial: { opacity: 0, scale: 0.88 },
          hover: { opacity: 1, scale: 1 }
        }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0 rounded-2xl bg-[#26262a] border border-white/20 pointer-events-none z-0 shadow-2xl shadow-black/70" 
      />

      {/* Contenido totalmente ESTÁTICO (Portada del color de proyecto + propiedades) sin escalado */}
      <div className="relative z-10 flex flex-col justify-between h-full w-full pointer-events-none">
        {/* 1. PORTADA SUPERIOR EN CONTENEDOR RECTÁNGULO REDONDEADO SÓLIDO */}
        <div 
          className="flex-1 w-full p-3.5 rounded-xl relative flex flex-col justify-between overflow-hidden pointer-events-auto"
          style={{ backgroundColor: projColor }}
        >
          {/* Fila Superior: Íconos de Formato horizontal ordenados en fila arriba del título */}
          <div className="z-10 flex items-center justify-start h-6 shrink-0 pointer-events-none">
            <ProjectCoverFormats tasks={projectTasks as any} size="xs" layout="horizontal" />
          </div>

          {/* Contenido en la parte inferior de la portada: Título + Cliente • Estatus + Barra de Progreso */}
          <div className="z-10 mt-auto flex flex-col gap-1.5">
            {/* Título del proyecto (Mantenido igual en text-base) */}
            <h3 className="text-base font-medium text-white tracking-tight line-clamp-1 leading-snug mt-2.5 translate-y-[6px]">
              {projTitle}
            </h3>

            {/* Subtítulo en texto normal: Cantidad de tareas • Nombre del cliente */}
            <div className="text-[14px] font-medium text-white/90 flex items-center gap-1.5 line-clamp-1">
              <span>{realTotalTasks} {realTotalTasks === 1 ? "Tarea" : "Tareas"}</span>
              <span className="text-white/60">•</span>
              <span className="truncate font-normal" title={clientName}>{clientName}</span>
            </div>

            {/* Barra de progreso de tareas segmentada */}
            <div className="flex items-center gap-1 w-full mt-0.5">
              {Array.from({ length: totalTasksCount }).map((_, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-all",
                    idx < completedCount ? "bg-white" : "bg-white/35"
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 2. CUERPO INFERIOR OSCURO (Estado del Proyecto • Fecha de Entrega) */}
        <div className="pt-2 px-1 pb-0.5 flex items-center justify-between gap-2 bg-transparent min-w-0 pointer-events-auto">
          {/* Estado + Fechas Conectadas */}
          <div className="flex items-center gap-1.5 text-[#ffffff6b] font-normal min-w-0 flex-wrap">
            {summary.status && (
              <>
                <ProjectStatusIcon status={summary.status} className="w-3.5 h-3.5 translate-y-[1.5px]" />
                <span className="text-[14px] font-medium text-[#ffffffd6] whitespace-nowrap">{summary.status}</span>
                <span className="text-[#ffffff6b]">•</span>
              </>
            )}
            <span className="text-[14px] font-normal text-[#ffffff6b] whitespace-nowrap">{deliveryStatusText}</span>
          </div>

          {/* Avatares del equipo + Costo */}
          <div className="flex items-center gap-2 shrink-0">
            {assignedWorkers.length > 0 && (
              <div className="flex -space-x-1.5">
                {assignedWorkers.slice(0, 3).map((w: any) => (
                  <div 
                    key={w.id} 
                    className="w-4.5 h-4.5 rounded-full bg-[#222222] border border-white/20 flex items-center justify-center text-[6.5px] font-bold text-[#ffffffd6]"
                    title={w.nombre}
                  >
                    {avatarOf(w.nombre)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── 2. VISTA COMPACTA DE TABLA ────────────────────────────────────────────────
export function ProjectListItem({
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
  const effectiveDate = 
    summary.fechaFin || 
    summary.fechaInicio || 
    p.fechaFin || 
    p.fechaInicio || 
    (p as any).fecha_fin || 
    (p as any).fecha_inicio || 
    (p as any).deadline || 
    (p as any).fechaEntrega || 
    (p as any).fecha_entrega || 
    (p as any).startDate || 
    (p as any).endDate || 
    (p as any).fecha;

  const deliveryStatusText = getDeliveryStatusText(effectiveDate);

  let assignedWorkers = (p.asignado_ids || [])
    .map((id) => data?.trabajadores.find((w) => String(w.id) === String(id)))
    .filter(Boolean);

  if (assignedWorkers.length === 0 && p.asignado) {
    const names = p.asignado.split(",").map((s) => s.trim().toLowerCase());
    assignedWorkers = (data?.trabajadores || []).filter((w) => 
      names.some((n) => n && (w.nombre || (w as any).name || "").toLowerCase().includes(n))
    );
  }

  return (
    <div 
      onClick={() => onOpenFullScreen(p.id)}
      className="flex items-center justify-between p-3.5 rounded-xl bg-[#1f1f1f] hover:bg-[#262626] transition-all cursor-pointer group"
    >
      <div className="flex items-center gap-3 min-w-[200px]">
        <span 
          className="w-3 h-3 rounded-full shrink-0 border border-white/20 shadow-sm" 
          style={{ backgroundColor: projColor }} 
        />
        <div className="flex flex-col">
          <h4 className="text-xs font-medium text-[#ffffffd6] group-hover:text-white transition-colors">
            {p.nombre}
          </h4>
          <span className="text-[10px] text-[#ffffff6b]">
            {summary.clientName}
          </span>
        </div>
      </div>

      {/* Estatus Pill */}
      <div 
        className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider bg-[#222222] border border-white/10 flex items-center gap-1.5"
        style={{ color: statusColor }}
      >
        <ProjectStatusIcon status={summary.status} className="w-3.5 h-3.5 translate-y-[0.5px]" />
        {summary.status}
      </div>

      {/* Fechas Conectadas */}
      <div className="flex items-center gap-1.5 text-xs text-[#ffffff6b] font-normal w-36 shrink-0">
        <span>{deliveryStatusText}</span>
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



        <ChevronRight className="w-3.5 h-3.5 text-[#ffffff6b] group-hover:text-[#ffffffd6] transition-colors" />
      </div>
    </div>
  );
}

export default ProjectCardItem;
