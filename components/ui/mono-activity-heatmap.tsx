"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { SessionDoc } from "@/lib/types";

export interface ActivityDay {
  date: string;
  count: number;       // Cantidad de sesiones o items completados
  hours: number;       // Horas acumuladas en el día
  level: number;       // 0 = inactivo, 1 = ligero, 2 = moderado, 3 = alto, 4 = máximo
  sessionCount: number;
}

export interface MonoActivityHeatmapProps {
  theme?: "dark" | "light";
  accentColor?: "green" | "blue" | "purple" | "mono";
  compact?: boolean;
  className?: string;
  data?: ActivityDay[];
  sessions?: SessionDoc[];
  tasks?: Array<{
    id?: number | string;
    title?: string;
    fecha_programada?: string;
    fecha_limite?: string;
    sessions?: Array<{ id?: number; date?: string; hours?: number }>;
    status?: string;
  }>;
  weeksCount?: number;
  title?: string;
  badgeLabel?: string;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Helper para convertir cualquier timestamp o fecha a "YYYY-MM-DD" local
function formatDateToLocalKey(dateInput: any): string | null {
  if (!dateInput) return null;
  try {
    let dateObj: Date;
    if (typeof dateInput.toDate === "function") {
      dateObj = dateInput.toDate();
    } else if (dateInput instanceof Date) {
      dateObj = dateInput;
    } else if (typeof dateInput === "string") {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) return dateInput;
      dateObj = new Date(dateInput);
    } else if (dateInput.seconds) {
      dateObj = new Date(dateInput.seconds * 1000);
    } else if (typeof dateInput === "number") {
      dateObj = new Date(dateInput);
    } else {
      return null;
    }

    if (isNaN(dateObj.getTime())) return null;
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return null;
  }
}

/**
 * Procesa las sesiones reales de Firestore y tareas para generar la matriz de días
 */
function processSynchronizedSessions(
  weeks = 20,
  sessions?: SessionDoc[],
  tasks?: any[]
): ActivityDay[] {
  const today = new Date();
  
  // Mapa de acumulación por fecha YYYY-MM-DD
  const dailyMetrics: Record<string, { hours: number; sessionCount: number; tasksCompleted: number }> = {};

  // 1. Procesar sesiones directas de Firestore (`sessions` collection)
  if (sessions && Array.isArray(sessions)) {
    sessions.forEach((s) => {
      const dateKey = formatDateToLocalKey(s.startTime || s.created || s.createdAt);
      if (!dateKey) return;

      if (!dailyMetrics[dateKey]) {
        dailyMetrics[dateKey] = { hours: 0, sessionCount: 0, tasksCompleted: 0 };
      }

      const durationHours = (s.durationMins && s.durationMins > 0)
        ? s.durationMins / 60
        : 0.5; // fallback mínimo 30 min

      dailyMetrics[dateKey].hours += durationHours;
      dailyMetrics[dateKey].sessionCount += 1;
    });
  }

  // 2. Procesar sesiones y entregas embebidas en tareas
  if (tasks && Array.isArray(tasks)) {
    tasks.forEach((t) => {
      if (t.sessions && Array.isArray(t.sessions)) {
        t.sessions.forEach((ts: { date?: string; hours?: number }) => {
          const dateKey = formatDateToLocalKey(ts.date);
          if (!dateKey) return;

          if (!dailyMetrics[dateKey]) {
            dailyMetrics[dateKey] = { hours: 0, sessionCount: 0, tasksCompleted: 0 };
          }

          dailyMetrics[dateKey].hours += (ts.hours || 0);
          dailyMetrics[dateKey].sessionCount += 1;
        });
      }

      if (t.fecha_programada && t.status === "Completado") {
        const dateKey = formatDateToLocalKey(t.fecha_programada);
        if (dateKey) {
          if (!dailyMetrics[dateKey]) {
            dailyMetrics[dateKey] = { hours: 0, sessionCount: 0, tasksCompleted: 0 };
          }
          dailyMetrics[dateKey].tasksCompleted += 1;
        }
      }
    });
  }

  const hasAnyRealActivity = Object.keys(dailyMetrics).length > 0;

  return Array.from({ length: weeks * 7 }, (_, idx) => {
    const day = new Date(today);
    day.setDate(day.getDate() - (weeks * 7 - 1 - idx));
    const dateStr = formatDateToLocalKey(day) || day.toISOString().slice(0, 10);
    
    const metric = dailyMetrics[dateStr];
    let totalHours = metric ? metric.hours : 0;
    let sessionCount = metric ? metric.sessionCount : 0;
    let level = 0;

    if (totalHours > 0 || sessionCount > 0) {
      // Escala de intensidad basada en horas de sesión trabajadas en el día:
      // - Nivel 1: > 0 a 1.5 horas (actividad ligera)
      // - Nivel 2: 1.5h a 3.5 horas (actividad moderada)
      // - Nivel 3: 3.5h a 5.5 horas (actividad alta)
      // - Nivel 4: > 5.5 horas (foco máximo)
      if (totalHours <= 1.5) level = 1;
      else if (totalHours <= 3.5) level = 2;
      else if (totalHours <= 5.5) level = 3;
      else level = 4;
    } else if (!hasAnyRealActivity) {
      // Semilla visual determinista en caso de que no haya ninguna sesión en la BD
      let hash = 0;
      for (let i = 0; i < dateStr.length; i++) {
        hash = (hash << 5) - hash + dateStr.charCodeAt(i);
        hash |= 0;
      }
      const pseudo = Math.abs(hash % 100) / 100;
      if (pseudo > 0.4) {
        level = Math.floor((pseudo * 10) % 4) + 1;
        totalHours = Math.round((level * 1.3 + (pseudo * 2)) * 10) / 10;
        sessionCount = Math.max(1, Math.floor(level * 1.5));
      }
    }

    return {
      date: dateStr,
      count: sessionCount,
      hours: Math.round(totalHours * 10) / 10,
      level,
      sessionCount,
    };
  });
}

function chunkIntoWeeks(daysList: ActivityDay[]): ActivityDay[][] {
  const weeks: ActivityDay[][] = [];
  for (let i = 0; i < daysList.length; i += 7) {
    weeks.push(daysList.slice(i, i + 7));
  }
  return weeks;
}

export function MonoActivityHeatmap({
  theme = "dark",
  accentColor = "blue",
  compact = false,
  className,
  data,
  sessions,
  tasks,
  weeksCount = 20,
  title = "Registro de Sesiones",
  badgeLabel,
}: MonoActivityHeatmapProps) {
  const isDark = theme === "dark";
  const [hoveredDay, setHoveredDay] = useState<ActivityDay | null>(null);

  // Sincronización reactiva de datos
  const rawDays = useMemo(() => {
    if (data && data.length > 0) return data;
    return processSynchronizedSessions(weeksCount, sessions, tasks);
  }, [data, sessions, tasks, weeksCount]);

  const weeksGrid = useMemo(() => chunkIntoWeeks(rawDays), [rawDays]);
  
  const totalHoursLogged = useMemo(
    () => rawDays.reduce((acc, d) => acc + d.hours, 0),
    [rawDays]
  );

  const totalSessionsLogged = useMemo(
    () => rawDays.reduce((acc, d) => acc + d.sessionCount, 0),
    [rawDays]
  );

  // Paleta Sky Blue oficial de Taski
  const palette = useMemo(() => {
    switch (accentColor) {
      case "blue":
        return {
          bg: "#3b82f6",
          badgeClass: "bg-blue-500/20 text-blue-400 border-blue-500/30",
          badgeText: badgeLabel || "Sky Blue Grid",
        };
      case "green":
        return {
          bg: "#39d353",
          badgeClass: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
          badgeText: badgeLabel || "Emerald Matrix",
        };
      case "purple":
        return {
          bg: "#a855f7",
          badgeClass: "bg-purple-500/20 text-purple-400 border-purple-500/30",
          badgeText: badgeLabel || "Violet Pulse",
        };
      case "mono":
      default:
        return {
          bg: isDark ? "#FFFFFF" : "#09090B",
          badgeClass: "bg-white/10 text-white border-white/20",
          badgeText: badgeLabel || "Monochrome Heat",
        };
    }
  }, [accentColor, isDark, badgeLabel]);

  // Escala de opacidad / luminosidad por nivel (0 a 4)
  const getCellOpacity = (level: number) => {
    switch (level) {
      case 0:
        return isDark ? 0.07 : 0.09;
      case 1:
        return 0.30;
      case 2:
        return 0.55;
      case 3:
        return 0.80;
      case 4:
        return 1.00;
      default:
        return isDark ? 0.07 : 0.09;
    }
  };

  // Nombres de meses para la cabecera
  const monthLabels = useMemo(() => {
    if (weeksGrid.length === 0) return MONTH_NAMES.slice(0, 5);
    const months: string[] = [];
    let lastMonth = -1;

    weeksGrid.forEach((week) => {
      if (week[0]) {
        const m = new Date(week[0].date).getMonth();
        if (m !== lastMonth) {
          months.push(MONTH_NAMES[m]);
          lastMonth = m;
        }
      }
    });

    return months.length >= 4 ? months.slice(-5) : MONTH_NAMES.slice(0, 5);
  }, [weeksGrid]);

  return (
    <div
      className={cn(
        "relative w-full rounded-[28px] transition-all duration-300 group flex flex-col justify-between overflow-hidden p-5 font-sans select-none border",
        compact ? "h-[220px] sm:h-[268px]" : "h-full min-h-[290px]",
        isDark
          ? "bg-[#181818] border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] text-white hover:border-white/15"
          : "bg-white border-neutral-200 shadow-[0_4px_20px_rgba(0,0,0,0.04)] text-black",
        className
      )}
    >
      {/* Cabecera Superior: Título, Badge de Estado y Métrica Total de Sesiones */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-xs font-semibold tracking-wider uppercase",
                isDark ? "text-[#ffffff6b]" : "text-neutral-500"
              )}
            >
              {title}
            </span>
            <span
              className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-mono border",
                palette.badgeClass
              )}
            >
              {palette.badgeText}
            </span>
          </div>
          <div className="text-xl font-bold tracking-tight tabular-nums mt-0.5 font-sans text-[#ffffffd6] flex items-baseline gap-1.5">
            <span>{Math.round(totalHoursLogged)}h</span>
            <span className="text-xs font-normal text-[#ffffff6b]">
              registradas ({totalSessionsLogged} sesiones)
            </span>
          </div>
        </div>
      </div>

      {/* Área del Lienzo del Heatmap */}
      <div
        className={cn(
          "relative w-full flex-1 rounded-[18px] overflow-hidden p-3.5 transition-colors duration-300 flex flex-col justify-center items-center border",
          isDark ? "bg-[#121212] border-white/[0.06]" : "bg-[#f4f4f6] border-neutral-200"
        )}
      >
        {/* Etiquetas de Meses */}
        <div className="flex justify-between items-center mb-2 w-full max-w-[340px] px-1">
          {monthLabels.map((month, idx) => (
            <span
              key={idx}
              className={cn(
                "text-[10px] font-mono text-center flex-1",
                isDark ? "text-[#ffffff6b]" : "text-neutral-500"
              )}
            >
              {month}
            </span>
          ))}
        </div>

        {/* Grilla Matricial de 20 Semanas × 7 Días */}
        <div
          className="flex justify-center items-center gap-[3.5px] w-full max-w-full overflow-x-auto py-1 hide-scrollbar"
          onPointerLeave={() => setHoveredDay(null)}
        >
          {weeksGrid.map((week, weekIdx) => (
            <div key={weekIdx} className="flex flex-col gap-[3.5px] items-center shrink-0">
              {week.map((day, dayIdx) => (
                <motion.div
                  key={`${weekIdx}-${dayIdx}`}
                  onPointerEnter={() => setHoveredDay(day)}
                  onPointerDown={() => setHoveredDay(day)}
                  className="w-[10px] h-[10px] sm:w-[11px] sm:h-[11px] min-w-[10px] min-h-[10px] rounded-[2.5px] transition-all cursor-pointer"
                  style={{
                    backgroundColor: palette.bg,
                    opacity: getCellOpacity(day.level),
                  }}
                  whileHover={{ scale: 1.45, zIndex: 20 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Telemetría / Barra Informativa de Hover */}
        <div className="h-5 mt-2 flex items-center justify-center">
          {hoveredDay ? (
            <motion.span
              initial={{ opacity: 0, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "text-[10px] font-mono",
                isDark ? "text-blue-300 font-medium" : "text-blue-700 font-semibold"
              )}
            >
              {hoveredDay.hours > 0 ? (
                <>
                  <strong className="text-white">{hoveredDay.hours}h</strong> ({hoveredDay.sessionCount} {hoveredDay.sessionCount === 1 ? "sesión" : "sesiones"}) el {hoveredDay.date}
                </>
              ) : (
                <>Sin sesiones registradas el {hoveredDay.date}</>
              )}
            </motion.span>
          ) : (
            <span
              className={cn(
                "text-[10px] font-mono",
                isDark ? "text-white/30" : "text-neutral-400"
              )}
            >
              Pasa el cursor sobre los nodos para ver horas de sesión
            </span>
          )}
        </div>
      </div>

      {/* Pie de Información y Leyenda de Intensidad */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/[0.06] text-[11px] font-mono">
        <span className={isDark ? "text-[#ffffff6b]" : "text-neutral-600"}>
          20 Semanas × 7 Días
        </span>

        {/* Mini Escala / Leyenda */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-[#ffffff6b]">Menos</span>
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4].map((lvl) => (
              <div
                key={lvl}
                className="w-2 h-2 rounded-[1.5px]"
                style={{
                  backgroundColor: palette.bg,
                  opacity: getCellOpacity(lvl),
                }}
                title={`Nivel ${lvl}`}
              />
            ))}
          </div>
          <span className="text-[9px] text-[#ffffff6b]">Más</span>
        </div>
      </div>
    </div>
  );
}

export default MonoActivityHeatmap;
