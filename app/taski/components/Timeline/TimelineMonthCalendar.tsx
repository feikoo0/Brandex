"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Brandex OS / Taski — TimelineMonthCalendar
//  Calendario Mensual Clásico (7 Columnas: Lun–Dom) con Tareas y Arrastre
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo } from "react";
import { Project, Task } from "../ProjectDashboard";
import FormatoShape from "../FormatoShape";
import { getSingleSourceProjectColor } from "@/lib/utils";
import { formatDateIso, parseDateSafe, tryParseDate, isSameDay } from "@/lib/timelineUtils";
import { CheckCircle2, Clock, MoreHorizontal, X, Layers, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { playSound } from "../../utils/audio";

interface TimelineMonthCalendarProps {
  projects: Project[];
  currentDate: Date;
  onSelectTask?: (
    task: Task,
    projectId?: string | number,
    originRect?: { x: number; y: number; width: number; height: number }
  ) => void;
  onUpdateSchedule?: (
    taskId: string | number,
    projectId: string | number,
    newProgDate: string,
    newLimitDate: string,
    prevSchedule?: { fecha_programada?: string; fecha_limite?: string }
  ) => void;
  isNightMode?: boolean;
  timelineHideCompleted?: boolean;
}

interface CalendarDayCell {
  date: Date;
  dateIso: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  tasksWithProject: Array<{
    task: Task;
    project: Project;
    hslCss: string;
  }>;
}

const WEEKDAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const WEEKDAY_NAMES_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export const TimelineMonthCalendar: React.FC<TimelineMonthCalendarProps> = React.memo(({
  projects,
  currentDate,
  onSelectTask,
  onUpdateSchedule,
  isNightMode = true,
  timelineHideCompleted = false,
}) => {
  const [dragOverDateIso, setDragOverDateIso] = useState<string | null>(null);
  const [expandedDayIso, setExpandedDayIso] = useState<string | null>(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // 1. Construcción de la matriz 7xN de semanas y días del mes actual
  const calendarCells: CalendarDayCell[] = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Monday = 0, Sunday = 6
    const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;

    const cells: CalendarDayCell[] = [];

    // Días previos de padding (mes anterior)
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i, 0, 0, 0, 0);
      const iso = formatDateIso(d);
      const dayOfWeek = d.getDay();
      cells.push({
        date: d,
        dateIso: iso,
        dayNumber: d.getDate(),
        isCurrentMonth: false,
        isToday: isSameDay(d, today),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        tasksWithProject: [],
      });
    }

    // Días del mes activo
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i, 0, 0, 0, 0);
      const iso = formatDateIso(d);
      const dayOfWeek = d.getDay();
      cells.push({
        date: d,
        dateIso: iso,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: isSameDay(d, today),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        tasksWithProject: [],
      });
    }

    // Días posteriores de padding (mes siguiente) para completar múltiplos de 7
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i, 0, 0, 0, 0);
      const iso = formatDateIso(d);
      const dayOfWeek = d.getDay();
      cells.push({
        date: d,
        dateIso: iso,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: isSameDay(d, today),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        tasksWithProject: [],
      });
    }

    // 2. Mapeo indexado de tareas hacia cada día del calendario
    const cellMap = new Map<string, CalendarDayCell>();
    cells.forEach((cell) => cellMap.set(cell.dateIso, cell));

    projects.forEach((proj) => {
      const { hslCss } = getSingleSourceProjectColor(proj);
      (proj.tasks || []).forEach((t) => {
        // Filtrar tareas completadas si el usuario activó "Ocultar completados"
        const rawStatus = (t as any).status || (t as any).estado || "Planificado";
        const isCompleted = rawStatus === "Completado" || rawStatus === "Completada";
        if (timelineHideCompleted && isCompleted) {
          return;
        }

        // Buscar una fecha explícita real para situar la tarea en su día exacto del calendario.
        // Enfoque 2: Priorizamos la fecha de trabajo (fecha_programada / fechaProg) o la fecha en
        // que se completó (fecha_completado_real / fecha_hora_completado), dejando intacta la fecha de entrega con el cliente.
        const rawDate =
          t.fecha_programada ||
          t.fechaProg ||
          (isCompleted ? ((t as any).fecha_completado_real || (t as any).fecha_hora_completado) : null) ||
          t.fecha_limite ||
          t.fechaEntrega ||
          (t as any).deadline ||
          (t as any).dueDate;

        if (!rawDate) return;

        // tryParseDate soporta ISO (YYYY-MM-DD), español ("10 Ago", "31 Jul") y DD/MM/YYYY
        // Si no se puede interpretar una fecha real, no se sitúa arbitrariamente en "Hoy"
        const taskDate = tryParseDate(rawDate);
        if (!taskDate) return;

        const taskIso = formatDateIso(taskDate);

        const targetCell = cellMap.get(taskIso);
        if (targetCell) {
          targetCell.tasksWithProject.push({
            task: t,
            project: proj,
            hslCss,
          });
        }
      });
    });

    return cells;
  }, [currentDate, projects, today, timelineHideCompleted]);

  // Manejo de Drag & Drop nativo entre casillas del calendario
  const handleDragStart = (
    e: React.DragEvent,
    task: Task,
    project: Project
  ) => {
    e.dataTransfer.setData(
      "application/task-schedule",
      JSON.stringify({
        taskId: task.id,
        projectId: project.id,
        prevProg: task.fecha_programada || task.fechaProg || "",
        prevLimit: task.fecha_limite || task.fechaEntrega || "",
      })
    );
    e.dataTransfer.effectAllowed = "move";
    playSound("tick");
  };

  const handleDragOver = (e: React.DragEvent, dateIso: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverDateIso !== dateIso) {
      setDragOverDateIso(dateIso);
    }
  };

  const handleDragLeave = (e: React.DragEvent, dateIso: string) => {
    if (dragOverDateIso === dateIso) {
      setDragOverDateIso(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetDateIso: string) => {
    e.preventDefault();
    setDragOverDateIso(null);
    try {
      const rawData = e.dataTransfer.getData("application/task-schedule");
      if (!rawData) return;
      const { taskId, projectId, prevProg, prevLimit } = JSON.parse(rawData);

      if (onUpdateSchedule) {
        // Al arrastrar en el calendario, movemos la fecha de trabajo (fecha_programada)
        // manteniendo intacto el compromiso de entrega con el cliente (prevLimit)
        onUpdateSchedule(taskId, projectId, targetDateIso, prevLimit || targetDateIso, {
          fecha_programada: prevProg,
          fecha_limite: prevLimit,
        });
        playSound("pop");
      }
    } catch (err) {
      console.error("Error en drop de tarea en calendario:", err);
    }
  };

  // Popover de tareas expandidas para días con muchas entregas
  const expandedCell = useMemo(() => {
    if (!expandedDayIso) return null;
    return calendarCells.find((c) => c.dateIso === expandedDayIso) || null;
  }, [calendarCells, expandedDayIso]);

  return (
    <div className="flex-1 w-full h-full flex flex-col overflow-hidden bg-[#121212] select-none">
      {/* ── Encabezado de los 7 Días de la Semana (tal cual en el fondo: Lun, Mar, Mié...) ── */}
      <div className="grid grid-cols-7 gap-1.5 px-2 pt-2 pb-1 shrink-0 bg-transparent select-none">
        {WEEKDAY_NAMES_SHORT.map((dayName) => {
          return (
            <div
              key={dayName}
              className="text-center text-sm font-bold tracking-tight text-[#ffffff6b]"
            >
              <span>{dayName}</span>
            </div>
          );
        })}
      </div>

      {/* ── Cuadrícula 7xN de Celdas de Días (Rectángulos Redondeados sin Trazo y más grandes) ── */}
      <div className="flex-1 grid grid-cols-7 gap-1.5 px-2 pb-2 pt-0.5 auto-rows-fr overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {calendarCells.map((cell) => {
          const isOver = dragOverDateIso === cell.dateIso;
          const maxVisible = 3;
          const visibleTasks = cell.tasksWithProject.slice(0, maxVisible);
          const hiddenCount = cell.tasksWithProject.length - maxVisible;

          return (
            <div
              key={cell.dateIso}
              onDragOver={(e) => handleDragOver(e, cell.dateIso)}
              onDragLeave={(e) => handleDragLeave(e, cell.dateIso)}
              onDrop={(e) => handleDrop(e, cell.dateIso)}
              className={`min-h-[125px] p-2.5 rounded-2xl flex flex-col transition-all relative group ${
                cell.isToday
                  ? "bg-[#222222] shadow-sm"
                  : "bg-[#191919] hover:bg-[#1f1f1f]"
              } ${
                !cell.isCurrentMonth
                  ? "opacity-30 bg-black/40"
                  : "opacity-100"
              } ${isOver ? "ring-2 ring-inset ring-white/30 bg-white/10" : ""}`}
            >
              {/* Cabecera de la Casilla del Día: Número en la esquina superior derecha a 14px (sin contador) */}
              <div className="flex items-center justify-end mb-1.5 shrink-0">
                <span
                  className={`leading-none select-none text-sm ${
                    cell.isToday
                      ? "text-white font-black"
                      : "text-[#ffffffd6] font-bold"
                  }`}
                >
                  {cell.dayNumber}
                </span>
              </div>

              {/* Lista de Pastillas de Tareas Sólidas sin Iconos */}
              <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                {visibleTasks.map(({ task, project, hslCss }) => {
                  const taskTitle = (task as any).title || (task as any).titulo || "Tarea";
                  const rawStatus = (task as any).status || (task as any).estado || "Planificado";
                  const isCompleted = rawStatus === "Completado" || rawStatus === "Completada";

                  return (
                    <div
                      key={task.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, task, project)}
                      onClick={(e) => {
                        playSound("click");
                        if (onSelectTask) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          onSelectTask(task, project.id, {
                            x: rect.left,
                            y: rect.top,
                            width: rect.width,
                            height: rect.height,
                          });
                        }
                      }}
                      className={`group/task relative px-2 py-1.5 rounded-lg flex items-center cursor-grab active:cursor-grabbing select-none transition-all duration-150 shadow-sm overflow-hidden ${
                        isCompleted
                          ? "opacity-35 hover:opacity-75"
                          : "hover:opacity-90 hover:scale-[1.01]"
                      }`}
                      style={{
                        backgroundColor: hslCss,
                      }}
                    >
                      {/* Título de la tarea (sin icono ni formato, color sólido, más opaco si está completada) */}
                      <span className={`text-xs font-semibold tracking-tight text-white truncate drop-shadow-sm ${isCompleted ? "text-white/80" : ""}`}>
                        {taskTitle}
                      </span>
                    </div>
                  );
                })}

                {/* Botón "+X más" cuando hay más tareas en el día */}
                {hiddenCount > 0 && (
                  <button
                    onClick={() => {
                      playSound("click");
                      setExpandedDayIso(cell.dateIso);
                    }}
                    className="w-full py-1 rounded-md bg-white/5 hover:bg-white/10 text-xs font-bold text-white/80 hover:text-white text-center transition-colors shadow-sm"
                  >
                    +{hiddenCount} más
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Modal Popover para Días con Muchas Entregas ── */}
      <AnimatePresence>
        {expandedCell && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-md rounded-2xl bg-[#181818] border border-white/15 shadow-2xl p-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-[#ffffffd6] capitalize">
                    {expandedCell.date.toLocaleDateString("es-MX", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </span>
                  <span className="text-xs font-bold text-white bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15">
                    {expandedCell.tasksWithProject.length} entregas
                  </span>
                </div>
                <button
                  onClick={() => setExpandedDayIso(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
                {expandedCell.tasksWithProject.map(({ task, project, hslCss }) => {
                  const rawStatus = (task as any).status || (task as any).estado || "Planificado";
                  const isCompleted = rawStatus === "Completado" || rawStatus === "Completada";
                  const isInProgress = rawStatus === "En Proceso" || rawStatus === "En curso" || rawStatus === "En Revisión";
                  const taskFormato = (task as any).formato || (task as any).format || "Post";
                  const taskTitle = (task as any).title || (task as any).titulo || "Tarea";

                  return (
                    <div
                      key={task.id}
                      onClick={(e) => {
                        setExpandedDayIso(null);
                        playSound("click");
                        if (onSelectTask) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          onSelectTask(task, project.id, {
                            x: rect.left,
                            y: rect.top,
                            width: rect.width,
                            height: rect.height,
                          });
                        }
                      }}
                      className={`group relative p-2.5 rounded-xl border border-white/10 hover:border-white/30 flex items-center justify-between gap-2 cursor-pointer bg-[#1f1f1f] hover:bg-[#252525] transition-all ${
                        isCompleted ? "opacity-40 hover:opacity-75" : ""
                      }`}
                    >
                      <div
                        className="absolute inset-0 opacity-15 group-hover:opacity-25 rounded-xl pointer-events-none transition-opacity"
                        style={{ backgroundColor: hslCss }}
                      />

                      <div className="flex items-center gap-2.5 min-w-0 flex-1 z-10">
                        <FormatoShape
                          formatoKey={taskFormato}
                          size="sm"
                          isNightMode={isNightMode}
                        />

                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-[#ffffffd6] truncate">
                            {taskTitle}
                          </span>
                          <span className="text-xs text-[#ffffff6b] truncate">
                            {project.title || (project as any).nombre}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 z-10">
                        {isCompleted ? (
                          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Completado
                          </span>
                        ) : isInProgress ? (
                          <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            En proceso
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-white/50 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                            Planificado
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});

TimelineMonthCalendar.displayName = "TimelineMonthCalendar";
