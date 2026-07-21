"use client";

import React, { useState, useEffect, useRef } from "react";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Clock, GripVertical } from "lucide-react";
import { Task } from "./ProjectDashboard";
import { parseTimeToHours } from "@/lib/utils";

export interface TimelineDiarioProps {
  tasks: Task[];
  projects: { id: number; tasks: Task[] }[];
  updateTaskProperty: (projectId: number, taskId: number, property: string, value: any) => void;
  isNightMode: boolean;
  startHour?: number; // Default 8 (8:00)
  endHour?: number;   // Default 20 (20:00)
  pxPerHour?: number; // Default 52 (px por hora)
}

// Helper: Convert "09:15" -> 9.25
function parseTimeToDecimal(timeStr?: string): number | null {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  return h + m / 60;
}

// Helper: Convert decimal 9.25 -> "09:15"
function decimalToTimeString(dec: number): string {
  const h = Math.floor(dec);
  const m = Math.round((dec - h) * 60);
  const formattedH = String(h).padStart(2, '0');
  const formattedM = String(m).padStart(2, '0');
  return `${formattedH}:${formattedM}`;
}

// Helper: Format duration minutes into friendly string
function formatDurationString(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = minutes / 60;
  if (Number.isInteger(hours)) {
    return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  }
  return `${hours.toFixed(1)} h`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Draggable Timeline Block Component
// ─────────────────────────────────────────────────────────────────────────────
interface TimelineBlockProps {
  task: Task;
  projectId: number;
  startHour: number;
  pxPerHour: number;
  updateTaskProperty: (projectId: number, taskId: number, property: string, value: any) => void;
  isNightMode: boolean;
  nowDecimal: number;
}

const TimelineBlock: React.FC<TimelineBlockProps> = ({
  task,
  projectId,
  startHour,
  pxPerHour,
  updateTaskProperty,
  isNightMode,
  nowDecimal,
}) => {
  const startDecimal = parseTimeToDecimal(task.hora_inicio) ?? startHour;
  const durationHours = parseTimeToHours(task.time) || 0.5; // Default 30 min (0.5h)
  const endDecimal = startDecimal + durationHours;

  const topPx = (startDecimal - startHour) * pxPerHour;
  const heightPx = Math.max(durationHours * pxPerHour, 24);

  const isCurrentActive = nowDecimal >= startDecimal && nowDecimal < endDecimal;

  // Draggable handle via @dnd-kit
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `timeline-block-${task.id}`,
    data: { task, projectId, isTimelineBlock: true },
  });

  const style: React.CSSProperties = {
    position: "absolute",
    top: `${topPx}px`,
    left: "64px",
    right: "12px",
    height: `${heightPx}px`,
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 999 : (isCurrentActive ? 30 : 20),
    opacity: isDragging ? 0.6 : 1,
  };

  // Status colors matching Kanban
  const getStatusStyles = () => {
    if (task.status === "Completado") {
      return isNightMode
        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-200"
        : "bg-emerald-50 border-emerald-300 text-emerald-900";
    }
    if (task.status === "En Proceso") {
      return isNightMode
        ? "bg-amber-500/20 border-amber-500/40 text-amber-200"
        : "bg-amber-50 border-amber-300 text-amber-900";
    }
    return isNightMode
      ? "bg-sky-500/20 border-sky-500/40 text-sky-200"
      : "bg-sky-50 border-sky-300 text-sky-900";
  };

  // Resize handle interaction (dragging bottom border to change duration)
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartY = useRef(0);
  const resizeStartHeight = useRef(heightPx);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = heightPx;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - resizeStartY.current;
      const newHeightPx = Math.max(resizeStartHeight.current + deltaY, 20);
      const newDurationHours = newHeightPx / pxPerHour;
      const newMinutes = Math.max(Math.round((newDurationHours * 60) / 15) * 15, 15); // snap 15m
      const formatted = formatDurationString(newMinutes);
      updateTaskProperty(projectId, task.id, "time", formatted);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const startTimeStr = decimalToTimeString(startDecimal);
  const endTimeStr = decimalToTimeString(endDecimal);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border p-2 flex flex-col justify-between transition-shadow select-none group/block ${getStatusStyles()} ${
        isCurrentActive ? "ring-2 ring-[#4dd9ff] shadow-[0_0_12px_rgba(77,217,255,0.35)]" : ""
      }`}
    >
      {/* Top Header: Timecode + Title + Drag Handle */}
      <div className="flex items-center justify-between gap-1 overflow-hidden">
        <div className="flex items-center gap-1.5 min-w-0">
          <span 
            className="text-[10px] font-bold tracking-wider opacity-85 shrink-0"
            style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
          >
            {startTimeStr} - {endTimeStr}
          </span>
          <span className="text-[11px] font-bold truncate leading-tight">
            {task.title}
          </span>
        </div>

        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-0.5 opacity-60 hover:opacity-100 transition-opacity shrink-0"
          title="Arrastrar para mover de hora"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Bottom Resize Handle */}
      <div
        onMouseDown={handleResizeMouseDown}
        className="h-1.5 w-full cursor-ns-resize hover:bg-[#4dd9ff]/50 rounded-b transition-colors mt-auto opacity-0 group-hover/block:opacity-100"
        title="Arrastrar para cambiar duración"
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main TimelineDiario Component
// ─────────────────────────────────────────────────────────────────────────────
export const TimelineDiario: React.FC<TimelineDiarioProps> = ({
  tasks,
  projects,
  updateTaskProperty,
  isNightMode,
  startHour = 8,
  endHour = 20,
  pxPerHour = 52,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { setNodeRef } = useDroppable({
    id: "timeline-droppable",
    data: { isTimeline: true, startHour, pxPerHour },
  });

  // Track live current time
  const [nowDecimal, setNowDecimal] = useState<number>(() => {
    const now = new Date();
    return now.getHours() + now.getMinutes() / 60;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setNowDecimal(now.getHours() + now.getMinutes() / 60);
    }, 30000); // update every 30s
    return () => clearInterval(interval);
  }, []);

  const totalHours = endHour - startHour;
  const totalHeightPx = totalHours * pxPerHour;

  // Filter tasks that belong to timeline (have hora_inicio assigned)
  const scheduledTasks = tasks.filter(t => t.hora_inicio && parseTimeToDecimal(t.hora_inicio) !== null);

  // Current time marker position
  const currentTopPx = (nowDecimal - startHour) * pxPerHour;
  const isNowInTimeline = nowDecimal >= startHour && nowDecimal <= endHour;

  const hoursList = Array.from({ length: totalHours + 1 }, (_, i) => startHour + i);

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#4dd9ff]" />
          <span className={`text-[10px] font-bold uppercase tracking-widest ${isNightMode ? 'text-zinc-400' : 'text-slate-500'}`}>
            Timeline del Día
          </span>
        </div>
        <span 
          className="text-[10px] font-bold text-[#4dd9ff]"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {decimalToTimeString(nowDecimal)}
        </span>
      </div>

      {/* Timeline Grid Container */}
      <div
        ref={(node) => {
          setNodeRef(node);
          (containerRef as any).current = node;
        }}
        className={`w-full relative rounded-2xl border transition-colors select-none ${
          isNightMode
            ? "bg-zinc-950/60 border-zinc-800/80"
            : "bg-slate-50/80 border-slate-200"
        }`}
        style={{ height: `${totalHeightPx}px` }}
      >
        {/* Hourly Grid Lines */}
        {hoursList.map((hour) => {
          const topPx = (hour - startHour) * pxPerHour;
          const labelStr = `${String(hour).padStart(2, '0')}:00`;

          return (
            <div
              key={hour}
              className="absolute left-0 right-0 flex items-center border-b border-white/5 pointer-events-none"
              style={{ top: `${topPx}px`, height: `${pxPerHour}px` }}
            >
              {/* Timecode label */}
              <span
                className={`w-14 pl-2.5 text-[10px] font-bold tracking-wider shrink-0 ${
                  isNightMode ? "text-zinc-500" : "text-slate-400"
                }`}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {labelStr}
              </span>
              {/* Grid line */}
              <div className={`flex-1 h-px ${isNightMode ? "bg-white/5" : "bg-slate-200/60"}`} />
            </div>
          );
        })}

        {/* Live Current Time Indicator (Cyan #4dd9ff) */}
        {isNowInTimeline && (
          <div
            className="absolute left-0 right-0 flex items-center pointer-events-none z-40 transition-all duration-500"
            style={{ top: `${currentTopPx}px` }}
          >
            {/* Glowing cyan dot */}
            <div className="w-2.5 h-2.5 rounded-full bg-[#4dd9ff] shadow-[0_0_8px_#4dd9ff] ml-12 shrink-0" />
            {/* Cyan line */}
            <div className="flex-1 h-0.5 bg-[#4dd9ff] shadow-[0_0_6px_#4dd9ff]" />
          </div>
        )}

        {/* Scheduled Task Blocks */}
        {scheduledTasks.map((task) => {
          // Find task's project ID
          const proj = projects.find(p => (p.tasks || []).some(t => t.id === task.id));
          const projectId = proj?.id ?? 0;

          return (
            <TimelineBlock
              key={task.id}
              task={task}
              projectId={projectId}
              startHour={startHour}
              pxPerHour={pxPerHour}
              updateTaskProperty={updateTaskProperty}
              isNightMode={isNightMode}
              nowDecimal={nowDecimal}
            />
          );
        })}
      </div>
    </div>
  );
};

export default TimelineDiario;
