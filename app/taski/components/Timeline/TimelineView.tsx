"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Brandex OS / Taski — TimelineView
//  Tablero Maestro del Timeline (Gantt Horizontal Día/Semana + Calendario Mensual)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from "react";
import { Project, Task } from "../ProjectDashboard";
import {
  TimelineZoomLevel,
  ZOOM_CONFIG,
  diffInDays,
  addDays,
  parseDateSafe,
  generateTimelineDays,
  calculateProjectLanes,
} from "@/lib/timelineUtils";
import { TimelineHeader } from "./TimelineHeader";
import { TimelineGridHeader } from "./TimelineGridHeader";
import { ProjectRailCard } from "./ProjectRailCard";
import { TaskPill } from "./TaskPill";
import { TimelineMonthCalendar } from "./TimelineMonthCalendar";
import { useTaskScheduling } from "@/hooks/useTaskScheduling";
import { getSingleSourceProjectColor } from "@/lib/utils";
import { autoEvaluateProjectStatus } from "../../utils/data";
import { persistProjectUpdate } from "../../utils/persist";
import { Layers } from "lucide-react";

interface TimelineViewProps {
  projects: Project[];
  onSelectProject?: (projectId: string | number, originRect?: { x: number; y: number; width: number; height: number }) => void;
  onSelectTask?: (task: Task, projectId?: string | number, originRect?: { x: number; y: number; width: number; height: number }) => void;
  onUpdateProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  timelineHideCompleted?: boolean;
  onToggleTimelineHideCompleted?: () => void;
  timelineSortBy?: "recientes" | "urgentes" | "alfabetico";
  onSetTimelineSortBy?: (sort: "recientes" | "urgentes" | "alfabetico") => void;
  isNightMode?: boolean;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  projects,
  onSelectProject,
  onSelectTask,
  onUpdateProjects,
  timelineHideCompleted = false,
  onToggleTimelineHideCompleted,
  timelineSortBy = "recientes",
  onSetTimelineSortBy,
  isNightMode = true,
}) => {
  const [zoomLevel, setZoomLevel] = useState<TimelineZoomLevel>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("taski_timeline_zoom");
      if (saved === "dia" || saved === "semana" || saved === "mes") {
        return saved as TimelineZoomLevel;
      }
    }
    return "dia";
  });

  const handleSetZoomLevel = useCallback((level: TimelineZoomLevel) => {
    setZoomLevel(level);
    if (typeof window !== "undefined") {
      localStorage.setItem("taski_timeline_zoom", level);
    }
  }, []);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const taskSchedulingMutation = useTaskScheduling();

  // Medición reactiva del ancho disponible del contenedor
  const [containerWidth, setContainerWidth] = useState(1200);
  const containerWidthRef = useRef(1200);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const updateSize = () => {
      if (el.clientWidth > 0 && Math.abs(el.clientWidth - containerWidthRef.current) > 2) {
        containerWidthRef.current = el.clientWidth;
        setContainerWidth(el.clientWidth);
      }
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, [zoomLevel]);

  // Cálculo del ancho por día para anclar exactamente a 3 días o 7 días
  const dayWidth = useMemo(() => {
    if (zoomLevel === "mes") return 0;
    const availableGridWidth = Math.max(360, containerWidth - 280);
    if (zoomLevel === "dia") {
      // Exactamente 3 días visibles en la pantalla
      return Math.floor(availableGridWidth / 3);
    }
    // "semana": Exactamente 7 días visibles en la pantalla
    return Math.floor(availableGridWidth / 7);
  }, [zoomLevel, containerWidth]);

  // 1. Cálculo del rango temporal maestro con amplio buffer hacia el pasado y futuro
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // 1.1 Fecha activa para navegación del Calendario Clásico Mensual
  const [activeCalendarDate, setActiveCalendarDate] = useState<Date>(() => new Date());

  // 1.2 Filtrado y ordenación reactiva de proyectos (§Filtro de Vista)
  const processedProjects = useMemo(() => {
    let list = projects;
    if (timelineHideCompleted) {
      list = list
        .map((p) => ({
          ...p,
          tasks: (p.tasks || []).filter((t) => {
            const st = String(t.status || (t as any).estado || "");
            return st !== "Completado" && st !== "Completada";
          }),
        }))
        .filter((p) => {
          const isProjCompleted = p.status === "Completado" || (p as any).estadoProyecto === "Completado" || (p as any).estado === "Completado";
          const hasNoTasksLeft = !p.tasks || p.tasks.length === 0;
          return !(isProjCompleted || hasNoTasksLeft);
        });
    }

    return [...list].sort((a, b) => {
      if (timelineSortBy === "alfabetico") {
        const nameA = a.title || (a as any).nombre || "";
        const nameB = b.title || (b as any).nombre || "";
        return nameA.localeCompare(nameB, "es", { sensitivity: "base" });
      }
      if (timelineSortBy === "urgentes") {
        const getUrgency = (p: Project) => {
          const rawLimit = (p as any).fechaFin || (p as any).deadline || (p as any).fecha_fin || (p as any).fecha_limite || (p as any).fechaEntrega;
          const date = parseDateSafe(rawLimit);
          if (!date) return 99999;
          return diffInDays(date, today);
        };
        return getUrgency(a) - getUrgency(b);
      }
      const getTs = (p: Project) => {
        const d = (p as any).createdAt || (p as any).created_at || (p as any).startDate || (p as any).fechaInicio || p.id;
        if (typeof d === "number") return d;
        const parsed = new Date(d).getTime();
        return isNaN(parsed) ? 0 : parsed;
      };
      return getTs(b) - getTs(a);
    });
  }, [projects, timelineHideCompleted, timelineSortBy, today]);

  const timelineStartDate = useMemo(() => {
    // Rango pasado acotado: mínimo 120 días hacia el pasado, acotado a máximo 365 días
    const minAllowedPast = addDays(today, -365);
    let earliest = addDays(today, -120);

    processedProjects.forEach((p) => {
      const pStart = parseDateSafe((p as any).fechaInicio || (p as any).startDate);
      if (pStart && pStart < earliest && pStart >= minAllowedPast) {
        earliest = addDays(pStart, -14);
      }
      p.tasks?.forEach((t) => {
        const tStart = parseDateSafe(t.fecha_programada || t.fechaProg || t.fecha_limite || (t as any).deadline);
        if (tStart && tStart < earliest && tStart >= minAllowedPast) {
          earliest = addDays(tStart, -14);
        }
      });
    });
    return earliest;
  }, [today, processedProjects]);

  const totalDays = useMemo(() => {
    // Rango futuro acotado: mínimo 180 días hacia el futuro, máximo 365 días
    const maxAllowedFuture = addDays(today, 365);
    let latest = addDays(today, 180);

    processedProjects.forEach((p) => {
      const pEnd = parseDateSafe((p as any).fechaFin || (p as any).deadline || (p as any).fecha_fin);
      if (pEnd && pEnd > latest && pEnd <= maxAllowedFuture) {
        latest = addDays(pEnd, 30);
      }
      p.tasks?.forEach((t) => {
        const tEnd = parseDateSafe(t.fecha_limite || t.fechaEntrega || (t as any).deadline);
        if (tEnd && tEnd > latest && tEnd <= maxAllowedFuture) {
          latest = addDays(tEnd, 30);
        }
      });
    });
    return Math.max(200, diffInDays(latest, timelineStartDate) + 14);
  }, [today, timelineStartDate, processedProjects]);

  const effectiveDayWidth = dayWidth || 160;

  const { days, totalWidth } = useMemo(() => {
    return generateTimelineDays(timelineStartDate, totalDays, effectiveDayWidth);
  }, [timelineStartDate, totalDays, effectiveDayWidth]);

  // 2. Cálculo de la posición X de la línea "Hoy"
  const todayOffsetPx = useMemo(() => {
    const daysSinceStart = diffInDays(today, timelineStartDate);
    return daysSinceStart * effectiveDayWidth + effectiveDayWidth / 2;
  }, [today, timelineStartDate, effectiveDayWidth]);

  const currentMonthLabelRef = useRef("");
  const [visibleMonthLabel, setVisibleMonthLabel] = useState(() => {
    const mNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    return `${mNames[today.getMonth()]} ${today.getFullYear()}`;
  });

  const updateVisibleMonthFromScroll = useCallback(() => {
    if (zoomLevel === "mes") return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollLeft = container.scrollLeft;
    const viewportWidth = container.clientWidth;
    const centerPx = scrollLeft + viewportWidth / 2 - 280;
    const centerDayIndex = Math.max(0, Math.min(totalDays - 1, Math.floor(centerPx / effectiveDayWidth)));
    const centerDate = addDays(timelineStartDate, centerDayIndex);

    const mNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const newLabel = `${mNames[centerDate.getMonth()]} ${centerDate.getFullYear()}`;
    if (newLabel !== currentMonthLabelRef.current) {
      currentMonthLabelRef.current = newLabel;
      setVisibleMonthLabel(newLabel);
    }
  }, [zoomLevel, timelineStartDate, totalDays, effectiveDayWidth]);

  useEffect(() => {
    if (zoomLevel === "mes") {
      const mNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
      const monthLabel = `${mNames[activeCalendarDate.getMonth()]} ${activeCalendarDate.getFullYear()}`;
      currentMonthLabelRef.current = monthLabel;
      setVisibleMonthLabel(monthLabel);
    }
  }, [zoomLevel, activeCalendarDate]);

  useEffect(() => {
    if (zoomLevel === "mes") return;
    const container = scrollContainerRef.current;
    if (!container) return;
    let rafId: number | null = null;
    const handleScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => updateVisibleMonthFromScroll());
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [zoomLevel, updateVisibleMonthFromScroll]);

  // 4. Scroll suave hacia "Hoy" / Anclar al día actual
  const scrollToToday = useCallback((smooth = true) => {
    if (zoomLevel === "mes") {
      setActiveCalendarDate(new Date());
      return;
    }
    const container = scrollContainerRef.current;
    if (!container) return;

    let targetLeft = 0;
    const daysSinceStart = diffInDays(today, timelineStartDate);

    if (zoomLevel === "dia") {
      // En 3 Días: anclar a Hoy en la primera posición visible
      targetLeft = daysSinceStart * effectiveDayWidth;
    } else if (zoomLevel === "semana") {
      // En Semana: anclar al Lunes de la semana actual
      const dayOfWeek = (today.getDay() + 6) % 7; // Lunes = 0
      targetLeft = (daysSinceStart - dayOfWeek) * effectiveDayWidth;
    }

    container.scrollTo({ left: Math.max(0, targetLeft), behavior: smooth ? "smooth" : "auto" });
  }, [zoomLevel, today, timelineStartDate, effectiveDayWidth]);

  // Posicionamiento en Hoy ÚNICAMENTE en el primer render o al cambiar explícitamente de zoom
  const lastScrolledZoomRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (zoomLevel === "mes") {
      lastScrolledZoomRef.current = "mes";
      return;
    }

    if (lastScrolledZoomRef.current !== zoomLevel) {
      lastScrolledZoomRef.current = zoomLevel;
      if (scrollContainerRef.current) {
        let targetLeft = 0;
        const daysSinceStart = diffInDays(today, timelineStartDate);
        if (zoomLevel === "dia") {
          targetLeft = daysSinceStart * effectiveDayWidth;
        } else if (zoomLevel === "semana") {
          const dayOfWeek = (today.getDay() + 6) % 7;
          targetLeft = (daysSinceStart - dayOfWeek) * effectiveDayWidth;
        }
        scrollContainerRef.current.scrollLeft = Math.max(0, targetLeft);
      }
    }
  }, [zoomLevel, today, timelineStartDate, effectiveDayWidth]);

  // 5. Navegación por pasos (3 Días / 7 Días / 1 Mes)
  const handleStepMonth = (direction: -1 | 1) => {
    if (zoomLevel === "mes") {
      setActiveCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
      return;
    }
    const container = scrollContainerRef.current;
    if (!container) return;

    const stepDays = zoomLevel === "dia" ? 3 : 7;
    const deltaPx = stepDays * effectiveDayWidth * direction;
    container.scrollBy({ left: deltaPx, behavior: "smooth" });
  };

  // 6. Cálculo de Carriles y Stacking por Proyecto (§4 RFC) para el modo Gantt
  const projectRowsData = useMemo(() => {
    if (zoomLevel === "mes") return [];
    return processedProjects.map((project) => {
      const projectTasks = project.tasks || [];
      const { positionedTasks, totalLanes, rowHeight } = calculateProjectLanes(
        projectTasks,
        project.id,
        timelineStartDate,
        effectiveDayWidth
      );

      return {
        project,
        projectId: project.id,
        positionedTasks,
        totalLanes,
        rowHeight,
      };
    });
  }, [zoomLevel, processedProjects, timelineStartDate, effectiveDayWidth]);

  // Total de tareas en el cronograma
  const totalTasksCount = useMemo(() => {
    return processedProjects.reduce((acc, p) => acc + (p.tasks?.length || 0), 0);
  }, [processedProjects]);

  // 7. Mutación de fechas planeadas (Sincronización bidireccional reactiva)
  const handleUpdateSchedule = useCallback(
    async (
      taskId: string | number,
      projectId: string | number,
      newProgDate: string,
      newLimitDate: string,
      prevSchedule?: { fecha_programada?: string; fecha_limite?: string }
    ) => {
      // Actualización optimista local inmediata
      onUpdateProjects((prev) =>
        prev.map((p) => {
          if (String(p.id) !== String(projectId)) return p;
          const updatedTasks = (p.tasks || []).map((t) => {
            if (String(t.id) !== String(taskId)) return t;
            return {
              ...t,
              fecha_programada: newProgDate,
              fechaProg: newProgDate,
              fecha_limite: newLimitDate,
              fechaEntrega: newLimitDate,
              deadline: newLimitDate,
            };
          });

          const evalProj = autoEvaluateProjectStatus({ ...p, tasks: updatedTasks });
          persistProjectUpdate(p.id, {
            tasks: evalProj.tasks,
            status: evalProj.status,
            progress: evalProj.progress,
            percent: evalProj.percent,
          });

          return evalProj;
        })
      );

      // Persistencia en Firestore vía useTaskScheduling
      try {
        await taskSchedulingMutation.mutateAsync({
          taskId,
          projectId,
          fecha_programada: newProgDate,
          fecha_limite: newLimitDate,
          previousSchedule: prevSchedule,
        });
      } catch (err) {
        console.error("Error sincronizando fecha de tarea en Timeline:", err);
      }
    },
    [onUpdateProjects, taskSchedulingMutation]
  );

  return (
    <div
      className={`w-full h-full flex flex-col overflow-hidden ${
        isNightMode
          ? "bg-transparent text-white"
          : "bg-transparent text-slate-900"
      }`}
    >
      {/* ── 1. Top Controls Bar (Mes Flotante, Zoom, Filtro, Contador, Ir a hoy) ── */}
      <TimelineHeader
        visibleMonthLabel={visibleMonthLabel}
        zoomLevel={zoomLevel}
        onSetZoomLevel={handleSetZoomLevel}
        onScrollToToday={() => scrollToToday(true)}
        onStepMonth={handleStepMonth}
        totalProjects={processedProjects.length}
        totalTasks={totalTasksCount}
        timelineHideCompleted={timelineHideCompleted}
        onToggleTimelineHideCompleted={onToggleTimelineHideCompleted}
        timelineSortBy={timelineSortBy}
        onSetTimelineSortBy={onSetTimelineSortBy}
        isNightMode={isNightMode}
      />

      {/* ── 2. VISTA CONDICIONAL: CALENDARIO MENSUAL CLÁSICO vs TIMELINE GANTT ── */}
      {zoomLevel === "mes" ? (
        <TimelineMonthCalendar
          projects={processedProjects}
          currentDate={activeCalendarDate}
          onSelectTask={onSelectTask}
          onUpdateSchedule={handleUpdateSchedule}
          isNightMode={isNightMode}
          timelineHideCompleted={timelineHideCompleted}
        />
      ) : (
        /* ── Viewport Scrolleable Sincronizado (Sticky Rail + Time Grid 100% Fluido) ── */
        <div
          ref={scrollContainerRef}
          className="relative flex-1 overflow-x-auto overflow-y-auto overscroll-x-none select-none scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
        >
          {/* Contenedor con ancho total del canvas */}
          <div style={{ width: `${totalWidth + 280}px` }} className="relative min-h-full flex flex-col">
            {/* Header Fijo de Días */}
            <TimelineGridHeader
              days={days}
              dayWidth={effectiveDayWidth}
              totalWidth={totalWidth}
              isNightMode={isNightMode}
            />

            {/* ── 3. Línea Vertical Sutil "HOY" que atraviesa todas las filas ── */}
            <div
              style={{
                left: `${todayOffsetPx + 280}px`,
              }}
              className="absolute top-10 bottom-0 w-[1px] bg-white/20 z-20 pointer-events-none"
            />

            {/* ── 4. Filas de Proyectos ── */}
            {projectRowsData.length === 0 ? (
              <div className="w-full h-64 flex flex-col items-center justify-center text-white/40 gap-3">
                <Layers className="w-8 h-8 stroke-1 text-white/20" />
                <p className="text-xs">No hay proyectos activos para mostrar en el Timeline.</p>
              </div>
            ) : (
              projectRowsData.map(({ project, positionedTasks, rowHeight }) => {
                const { hslCss } = getSingleSourceProjectColor(project);

                return (
                  <div
                    key={project.id}
                    style={{ height: `${rowHeight}px` }}
                    className="flex relative border-b border-white/[0.06] group/row"
                  >
                    {/* Rail Fijo Izquierdo (ProjectRailCard) */}
                    <div className="sticky left-0 z-30 shrink-0">
                      <ProjectRailCard
                        project={project}
                        rowHeight={rowHeight}
                        onSelectProject={onSelectProject}
                        isNightMode={isNightMode}
                      />
                    </div>

                    {/* Canvas de la Fila (Grid de Días vía CSS Puro + Píldoras de Tareas) */}
                    <div
                      style={{
                        width: `${totalWidth}px`,
                        height: `${rowHeight}px`,
                        backgroundImage: isNightMode
                          ? `repeating-linear-gradient(to right, transparent 0, transparent ${effectiveDayWidth - 1}px, rgba(255, 255, 255, 0.035) ${effectiveDayWidth - 1}px, rgba(255, 255, 255, 0.035) ${effectiveDayWidth}px)`
                          : `repeating-linear-gradient(to right, transparent 0, transparent ${effectiveDayWidth - 1}px, rgba(0, 0, 0, 0.05) ${effectiveDayWidth - 1}px, rgba(0, 0, 0, 0.05) ${effectiveDayWidth}px)`,
                      }}
                      className="relative shrink-0"
                    >
                      {/* Tinte de fondo sutil del color del proyecto (§2.2 RFC) */}
                      <div
                        className="absolute inset-0 opacity-[0.03] group-hover/row:opacity-[0.06] transition-opacity pointer-events-none"
                        style={{ backgroundColor: hslCss }}
                      />

                      {/* Píldoras de Tareas posicionadas en este carril */}
                      {positionedTasks.map((posTask) => (
                        <TaskPill
                          key={posTask.task.id}
                          positionedTask={posTask}
                          project={project}
                          timelineStartDate={timelineStartDate}
                          dayWidth={effectiveDayWidth}
                          onUpdateSchedule={handleUpdateSchedule}
                          onSelectTask={onSelectTask}
                          isNightMode={isNightMode}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
