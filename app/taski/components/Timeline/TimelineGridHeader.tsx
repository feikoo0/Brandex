"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Brandex OS / Taski — TimelineGridHeader (Sticky Top Day Axis)
//  Sincronizado de forma 100% directa y nativa con el scroll horizontal
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { TimelineDayHeader } from "@/lib/timelineUtils";

interface TimelineGridHeaderProps {
  days: TimelineDayHeader[];
  dayWidth: number;
  totalWidth: number;
  isNightMode?: boolean;
}

export const TimelineGridHeader: React.FC<TimelineGridHeaderProps> = React.memo(({
  days,
  dayWidth,
  totalWidth,
  isNightMode = true,
}) => {
  return (
    <div
      style={{ width: `${totalWidth + 280}px` }}
      className={`sticky top-0 z-20 flex h-10 select-none backdrop-blur-md ${
        isNightMode ? "bg-[#0d0d0d]/95" : "bg-white/95"
      }`}
    >
      {/* ── Esquina Fija Izquierda (Sticky Left Rail Header) ── */}
      <div className="sticky left-0 z-30 w-[260px] md:w-[280px] shrink-0 h-full px-3.5 flex items-center justify-between border-r border-white/[0.08] bg-[#0d0d0d]">
        <span className="text-xs font-black tracking-wider text-[#ffffff6b]">
          Proyectos Activos
        </span>
      </div>

      {/* ── Columnas del Eje Temporal Sincronizadas 100% al Scroll (Rectángulos Redondeados sin Trazo) ── */}
      <div className="flex relative h-full py-1">
        {days.map((day) => {
          return (
            <div
              key={day.dateStr}
              style={{ width: `${dayWidth}px` }}
              className="h-full shrink-0 px-0.5 flex items-center"
            >
              <div
                className={`w-full h-full rounded-xl px-2.5 flex items-center justify-between transition-all relative select-none ${
                  day.isToday
                    ? "bg-[#222222] shadow-sm"
                    : "bg-[#191919]"
                }`}
              >
                {/* Indicador de inicio de mes flotante en la columna */}
                {day.isFirstOfMonth && (
                  <span className="absolute -top-2 left-2 text-xs font-black uppercase tracking-wider text-white/60">
                    {day.monthName.slice(0, 3)}
                  </span>
                )}

                {/* Nombre corto del día (Lun, Mar, Mié...) tal cual en el fondo */}
                <span
                  className={`text-sm font-semibold tracking-tight leading-none ${
                    day.isToday
                      ? "text-white font-bold"
                      : "text-[#ffffff6b]"
                  }`}
                >
                  {day.dayNameShort}
                </span>

                {/* Número del día en la esquina derecha a 14px */}
                <span
                  className={`leading-none text-sm ${
                    day.isToday
                      ? "text-white font-black"
                      : "text-[#ffffffd6] font-bold"
                  }`}
                >
                  {day.dayNumber}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

TimelineGridHeader.displayName = "TimelineGridHeader";
