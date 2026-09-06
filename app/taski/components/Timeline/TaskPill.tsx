"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Brandex OS / Taski — TaskPill (Timeline Pill Component)
//  Píldora de tarea interactiva con Drag completo + Resize izquierdo/derecho
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect } from "react";
import { Task, Project } from "../ProjectDashboard";
import {
  PositionedTimelineTask,
  formatDateIso,
  addDays,
  diffInDays,
  LANE_HEIGHT,
} from "@/lib/timelineUtils";
import { getSingleSourceProjectColor } from "@/lib/utils";
import { playSound } from "../../utils/audio";
import { Clock } from "lucide-react";

interface TaskPillProps {
  positionedTask: PositionedTimelineTask;
  project: Project;
  timelineStartDate: Date;
  dayWidth: number;
  onUpdateSchedule: (
    taskId: string | number,
    projectId: string | number,
    fecha_programada: string,
    fecha_limite: string,
    prevSchedule?: { fecha_programada?: string; fecha_limite?: string }
  ) => void;
  onSelectTask?: (
    task: Task,
    projectId?: string | number,
    originRect?: { x: number; y: number; width: number; height: number }
  ) => void;
  isNightMode?: boolean;
}

type DragMode = "move" | "resize-left" | "resize-right" | null;

export const TaskPill: React.FC<TaskPillProps> = React.memo(({
  positionedTask,
  project,
  timelineStartDate,
  dayWidth,
  onUpdateSchedule,
  onSelectTask,
  isNightMode = true,
}) => {
  const { task, startDate, endDate, durationDays, leftPx, widthPx, topPx } = positionedTask;
  const pillRef = useRef<HTMLDivElement>(null);
  const { hslCss } = getSingleSourceProjectColor(project);

  const hasMovedRef = useRef(false);

  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [dragOffsetDays, setDragOffsetDays] = useState(0);
  const [resizeLeftDays, setResizeLeftDays] = useState(0);
  const [resizeRightDays, setResizeRightDays] = useState(0);

  const dragStartRef = useRef<{
    startX: number;
    initialStartDate: Date;
    initialEndDate: Date;
    initialDuration: number;
    lastTickDays: number;
  }>({
    startX: 0,
    initialStartDate: startDate,
    initialEndDate: endDate,
    initialDuration: durationDays,
    lastTickDays: 0,
  });

  const rawStatus = (task as any).status || (task as any).estado || "Planificado";
  const isCompleted = rawStatus === "Completado" || rawStatus === "Completada";
  const isInProgress = rawStatus === "En Proceso" || rawStatus === "En curso" || rawStatus === "En Revisión" || rawStatus === "Revisión";

  // 1. Fechas proyectadas durante el arrastre interactivo
  let currentStart = startDate;
  let currentEnd = endDate;

  if (dragMode === "move") {
    currentStart = addDays(startDate, dragOffsetDays);
    currentEnd = addDays(currentStart, durationDays - 1);
  } else if (dragMode === "resize-left") {
    currentStart = addDays(startDate, resizeLeftDays);
    if (currentStart > endDate) currentStart = endDate;
  } else if (dragMode === "resize-right") {
    currentEnd = addDays(endDate, resizeRightDays);
    if (currentEnd < startDate) currentEnd = startDate;
  }

  const currentDurationDays = Math.max(1, diffInDays(currentEnd, currentStart) + 1);

  // 2. Coordenadas en píxeles (con preview en vivo si está arrastrándose)
  const currentStartDiffDays = diffInDays(currentStart, timelineStartDate);
  const currentLeftPx = currentStartDiffDays * dayWidth;
  const currentWidthPx = Math.max(dayWidth - 8, currentDurationDays * dayWidth - 8);

  // 3. Controladores de Drag & Drop
  const handleMouseDown = (e: React.MouseEvent, mode: DragMode) => {
    e.stopPropagation();
    e.preventDefault();

    hasMovedRef.current = false;
    setDragMode(mode);
    setDragOffsetDays(0);
    setResizeLeftDays(0);
    setResizeRightDays(0);

    dragStartRef.current = {
      startX: e.clientX,
      initialStartDate: startDate,
      initialEndDate: endDate,
      initialDuration: durationDays,
      lastTickDays: 0,
    };

    playSound("tick");

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - dragStartRef.current.startX;
      if (Math.abs(deltaX) > 3) {
        hasMovedRef.current = true;
      }
      const daysDelta = Math.round(deltaX / dayWidth);

      if (daysDelta !== dragStartRef.current.lastTickDays) {
        dragStartRef.current.lastTickDays = daysDelta;
        playSound("tick");
      }

      if (mode === "move") {
        setDragOffsetDays(daysDelta);
      } else if (mode === "resize-left") {
        setResizeLeftDays(daysDelta);
      } else if (mode === "resize-right") {
        setResizeRightDays(daysDelta);
      }
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);

      const deltaX = upEvent.clientX - dragStartRef.current.startX;
      const finalDaysDelta = Math.round(deltaX / dayWidth);

      let finalStart = startDate;
      let finalEnd = endDate;

      if (mode === "move") {
        finalStart = addDays(startDate, finalDaysDelta);
        finalEnd = addDays(finalStart, durationDays - 1);
      } else if (mode === "resize-left") {
        finalStart = addDays(startDate, finalDaysDelta);
        if (finalStart > endDate) finalStart = endDate;
        finalEnd = endDate;
      } else if (mode === "resize-right") {
        finalEnd = addDays(endDate, finalDaysDelta);
        if (finalEnd < startDate) finalEnd = startDate;
        finalStart = startDate;
      }

      const finalStartStr = formatDateIso(finalStart);
      const finalEndStr = formatDateIso(finalEnd);
      const prevStartStr = formatDateIso(startDate);
      const prevEndStr = formatDateIso(endDate);

      setDragMode(null);
      setDragOffsetDays(0);
      setResizeLeftDays(0);
      setResizeRightDays(0);

      // Si las fechas cambiaron efectivamente, hacer commit a Firestore automáticamente
      if (finalStartStr !== prevStartStr || finalEndStr !== prevEndStr) {
        playSound("pop");
        onUpdateSchedule(task.id, project.id, finalStartStr, finalEndStr, {
          fecha_programada: prevStartStr,
          fecha_limite: prevEndStr,
        });
      }

      // Desactivar el flag de movimiento tras el click event
      setTimeout(() => {
        hasMovedRef.current = false;
      }, 150);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (hasMovedRef.current || dragMode !== null) return;
    e.stopPropagation();
    playSound("click");
    if (onSelectTask && pillRef.current) {
      const rect = pillRef.current.getBoundingClientRect();
      onSelectTask(task as any, project.id, {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      });
    }
  };

  const formatDateDisplay = (d: Date) => {
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  };

  const taskFormato = (task as any).formato || (task as any).format || "Post";
  const taskTitle = (task as any).title || (task as any).titulo || "Tarea";

  return (
    <div
      ref={pillRef}
      onClick={handleClick}
      onMouseDown={(e) => handleMouseDown(e, "move")}
      style={{
        left: `${currentLeftPx}px`,
        top: `${topPx}px`,
        width: `${currentWidthPx}px`,
        height: `${LANE_HEIGHT}px`,
      }}
      className={`group absolute rounded-full border select-none transition-shadow duration-150 cursor-grab active:cursor-grabbing flex items-center justify-between px-3 z-10 ${
        dragMode !== null ? "z-30 shadow-2xl scale-[1.01] opacity-95 ring-2 ring-white/30" : "hover:z-20 hover:shadow-lg"
      } ${
        isNightMode
          ? "bg-[#1f1f1f]/95 hover:bg-[#262626] border-white/10"
          : "bg-white/95 hover:bg-slate-100 border-slate-200 shadow-sm"
      }`}
    >
      {/* Fondo con tinte sutil del color del proyecto */}
      <div
        className="absolute inset-0 rounded-full opacity-20 pointer-events-none transition-opacity group-hover:opacity-30"
        style={{ backgroundColor: hslCss }}
      />

      {/* Tirador Izquierdo de Redimensionamiento (Resize Left) */}
      <div
        onMouseDown={(e) => handleMouseDown(e, "resize-left")}
        title="Arrastrar para ajustar fecha de inicio"
        className="absolute left-1 top-0 bottom-0 w-2 cursor-ew-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
      >
        <div className="w-1 h-3 rounded-full bg-white/70 shadow-sm" />
      </div>

      {/* Contenido Principal de la Píldora */}
      <div className="flex items-center min-w-0 flex-1 pointer-events-none pl-[5px]">
        {/* Título de la Tarea al 100% de blanco */}
        <span className="text-[13px] font-semibold tracking-tight text-white truncate">
          {taskTitle}
        </span>
      </div>

      {/* Tirador Derecho de Redimensionamiento (Resize Right) */}
      <div
        onMouseDown={(e) => handleMouseDown(e, "resize-right")}
        title="Arrastrar para ajustar fecha de entrega"
        className="absolute right-1 top-0 bottom-0 w-2 cursor-ew-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
      >
        <div className="w-1 h-3 rounded-full bg-white/70 shadow-sm" />
      </div>

      {/* Tooltip / Ghost de Preview en Drag Activo */}
      {dragMode !== null && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-slate-950/95 border border-white/20 text-white text-[10px] font-semibold shadow-2xl backdrop-blur-md whitespace-nowrap pointer-events-none flex items-center gap-1.5 z-50">
          <Clock className="w-3 h-3 text-cyan-400" />
          <span>
            {formatDateDisplay(currentStart)} – {formatDateDisplay(currentEnd)}
          </span>
          <span className="text-white/60 font-normal">
            ({currentDurationDays} {currentDurationDays === 1 ? "día" : "días"})
          </span>
        </div>
      )}
    </div>
  );
});

TaskPill.displayName = "TaskPill";
