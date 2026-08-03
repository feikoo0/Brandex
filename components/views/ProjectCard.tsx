"use client";

import React from "react";
import { MoreHorizontal, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useData } from "@/hooks/useData";
import { useProjectSummary } from "@/hooks/useProjectSummary";
import { cn, avatarOf, getSingleSourceProjectColor } from "@/lib/utils";
import { STATUS_COLORS } from "@/lib/constants";
import ProjectCoverFormats from "@/app/taski/components/ProjectCoverFormats";
import { ProjectStatusIcon } from "@/components/common/ProjectStatusIcon";

export interface ProjectCardItemProps {
  projectId: string;
  onOpenFullScreen: (id: string) => void;
  cardStyle?: "cover" | "full";
}

function parseAnyDate(s?: any): Date | null {
  if (!s) return null;
  if (s instanceof Date) return isNaN(s.getTime()) ? null : s;
  if (typeof s === "object" && s.toDate && typeof s.toDate === "function") {
    try { return s.toDate(); } catch {}
  }
  const str = String(s).trim();
  if (!str || str.toLowerCase() === "sin fecha" || str.toLowerCase() === "hoy") return null;

  const currentYear = new Date().getFullYear();

  // 1. Formato YYYY-MM-DD o ISO
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const d = parseInt(isoMatch[3], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d);
    }
  }

  // 2. Formato DD/MM/YYYY
  const latamMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (latamMatch) {
    const d = parseInt(latamMatch[1], 10);
    const m = parseInt(latamMatch[2], 10) - 1;
    const y = parseInt(latamMatch[3], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d);
    }
  }

  // 3. Formato amigable en español (ej: "17 Ago", "3 Ene", "25 Dic")
  const spanishMonths: Record<string, number> = {
    ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
    jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11
  };

  const friendlyMatch = str.match(/^(\d{1,2})\s+([a-zA-Z]{3,4})/i);
  if (friendlyMatch) {
    const day = parseInt(friendlyMatch[1], 10);
    const monthKey = friendlyMatch[2].toLowerCase().substring(0, 3);
    if (!isNaN(day) && spanishMonths[monthKey] !== undefined) {
      return new Date(currentYear, spanishMonths[monthKey], day);
    }
  }

  const fallback = new Date(str);
  if (!isNaN(fallback.getTime())) {
    if (fallback.getFullYear() < 2015 && !str.includes("20") && !str.includes("19")) {
      fallback.setFullYear(currentYear);
    }
    return fallback;
  }

  return null;
}

function getDeliveryStatusText(fechaFin?: string, fechaInicio?: string): string {
  const rawDate = fechaFin || fechaInicio;
  if (!rawDate) return "Sin fecha";

  const targetDate = parseAnyDate(rawDate);
  if (!targetDate) return "Sin fecha";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

  const diffDays = Math.round((targetMidnight.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdue = Math.abs(diffDays);
    return `Atrasada ${overdue} ${overdue === 1 ? "día" : "días"}`;
  } else if (diffDays === 0) {
    return "Entrega hoy";
  } else {
    return `Entrega en ${diffDays} ${diffDays === 1 ? "día" : "días"}`;
  }
}

// ── 1. TARJETA DE PROYECTO (DISEÑO OPTIMIZADO DE ALTO VALOR INFORMATIVO) ───────
export function ProjectCardItem({ 
  projectId, 
  onOpenFullScreen,
  cardStyle = "cover"
}: ProjectCardItemProps) {
  const summary = useProjectSummary(projectId);
  const { data } = useData();

  if (!summary.project) return null;

  const p = summary.project;
  const statusColor = STATUS_COLORS[summary.status] || "#ffffffd6";
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
            <span className="truncate max-w-[170px] bg-black/20 px-2 py-0.5 rounded-full" title={summary.clientName}>
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

          {/* Fila Principal: Título + Fechas Conectadas */}
          <div className="flex flex-col min-w-0 mb-3">
            <h3 className="text-base font-medium text-white tracking-tight line-clamp-2 mt-2.5 translate-y-[6px]">
              {p.nombre}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 text-[14px] text-[#ffffff6b] font-normal">
              {summary.status && (
                <>
                  <ProjectStatusIcon status={summary.status} className="w-3.5 h-3.5 translate-y-[1.5px]" />
                  <span className="font-medium text-white">{summary.status}</span>
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
    <div 
      onClick={() => onOpenFullScreen(p.id)}
      className="p-2 rounded-2xl overflow-hidden bg-[#1f1f1f] hover:bg-[#262626] transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-sm hover:shadow-md group h-[220px]"
    >
      {/* 1. PORTADA SUPERIOR EN CONTENEDOR RECTÁNGULO REDONDEADO SÓLIDO */}
      <div 
        className="flex-1 w-full p-3.5 rounded-xl relative flex flex-col justify-between overflow-hidden transition-colors"
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
            {p.nombre}
          </h3>

          {/* Subtítulo en texto normal: Cantidad de tareas • Nombre del cliente */}
          <div className="text-[14px] font-medium text-white/90 flex items-center gap-1.5 line-clamp-1">
            <span>{summary.totalTasks} {summary.totalTasks === 1 ? "Tarea" : "Tareas"}</span>
            <span className="text-white/60">•</span>
            <span className="truncate font-normal" title={summary.clientName}>{summary.clientName}</span>
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
      <div className="pt-2 px-1 pb-0.5 flex items-center justify-between gap-2 bg-transparent min-w-0">
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
      names.some((n) => n && w.nombre.toLowerCase().includes(n))
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
