"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Brandex OS / Taski — ProjectRailCard (Sticky Left Rail)
//  Tarjeta de Proyecto — Rectángulo Redondeado Puro (Cliente > Título 2L > Tareas + Barra)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useRef } from "react";
import { Project } from "../ProjectDashboard";
import { useProjectSummary } from "@/hooks/useProjectSummary";
import { cn, getSingleSourceProjectColor } from "@/lib/utils";
import { playSound } from "../../utils/audio";

interface ProjectRailCardProps {
  project: Project;
  rowHeight: number;
  onSelectProject?: (
    projectId: string | number,
    originRect?: { x: number; y: number; width: number; height: number }
  ) => void;
  isNightMode?: boolean;
}

export const ProjectRailCard: React.FC<ProjectRailCardProps> = React.memo(
  ({ project, rowHeight, onSelectProject, isNightMode = true }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const summary = useProjectSummary(String(project.id));

    const p = project || summary.project;
    const projTitle = (p as any)?.nombre || p?.title || "Sin título";
    const clientName = summary.clientName || p?.client || (p as any)?.cliente || "Brandex";
    const projColor = getSingleSourceProjectColor(p).hslCss;

    // Tareas del proyecto
    const projectTasks = summary.tasks && summary.tasks.length > 0 ? summary.tasks : p.tasks || [];
    const realTotalTasks = summary.totalTasks > 0 ? summary.totalTasks : projectTasks.length;
    const totalTasksCount = Math.max(realTotalTasks, 1);
    const completedCount =
      summary.completedTasks > 0
        ? summary.completedTasks
        : projectTasks.filter(
            (t: any) => t.status === "Completado" || (t as any).estado === "Completado"
          ).length;

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      playSound("click");
      if (onSelectProject && cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        onSelectProject(project.id, {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        });
      }
    };

    return (
      <div
        ref={cardRef}
        onClick={handleClick}
        style={{ height: `${rowHeight}px` }}
        className={`group relative w-[260px] md:w-[280px] shrink-0 p-1.5 select-none cursor-pointer border-r border-b border-white/[0.08] transition-all flex flex-col justify-center ${
          isNightMode ? "bg-[#121212] hover:bg-[#151515]" : "bg-white hover:bg-slate-50"
        }`}
      >
        {/* ── RECTÁNGULO REDONDEADO PURO CON COLOR DE PROYECTO ── */}
        <div
          className="w-full h-full p-2.5 rounded-xl relative flex flex-col justify-between overflow-hidden shadow-sm transition-transform duration-200 group-hover:scale-[1.01]"
          style={{ backgroundColor: projColor }}
        >
          {/* Arriba: Nombre del Cliente + Título en hasta 2 renglones */}
          <div className="z-10 flex flex-col gap-0.5 min-w-0">
            <span
              className="text-[12px] font-medium text-white/80 truncate tracking-tight leading-tight"
              title={clientName}
            >
              {clientName}
            </span>

            <h3 className="text-[14px] font-semibold text-white tracking-tight line-clamp-2 leading-[1.2] drop-shadow-sm mt-0.5">
              {projTitle}
            </h3>
          </div>

          {/* Abajo: Cantidad de tareas + Barra de progreso ANCLADA */}
          <div className="z-10 mt-auto shrink-0 pt-1 flex flex-col gap-1">
            <div className="text-[12px] font-medium text-white/90 flex items-center justify-between leading-none">
              <span>
                {realTotalTasks} {realTotalTasks === 1 ? "Tarea" : "Tareas"}
              </span>
            </div>

            {/* Barra de progreso de tareas segmentada */}
            <div className="flex items-center gap-1 w-full h-1 shrink-0 mt-0.5">
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
      </div>
    );
  }
);

ProjectRailCard.displayName = "ProjectRailCard";
