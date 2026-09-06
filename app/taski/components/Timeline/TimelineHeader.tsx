"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Brandex OS / Taski — TimelineHeader
//  Barra superior con Selector de Mes Flotante Dinámico, Zoom, Filtro y "Ir a hoy"
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, ListFilter, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TimelineZoomLevel, ZOOM_CONFIG } from "@/lib/timelineUtils";
import { playSound } from "../../utils/audio";

interface TimelineHeaderProps {
  visibleMonthLabel: string;
  zoomLevel: TimelineZoomLevel;
  onSetZoomLevel: (zoom: TimelineZoomLevel) => void;
  onScrollToToday: () => void;
  onStepMonth: (direction: -1 | 1) => void;
  totalProjects: number;
  totalTasks: number;
  timelineHideCompleted?: boolean;
  onToggleTimelineHideCompleted?: () => void;
  timelineSortBy?: "recientes" | "urgentes" | "alfabetico";
  onSetTimelineSortBy?: (sort: "recientes" | "urgentes" | "alfabetico") => void;
  isNightMode?: boolean;
}

export const TimelineHeader: React.FC<TimelineHeaderProps> = React.memo(({
  visibleMonthLabel,
  zoomLevel,
  onSetZoomLevel,
  onScrollToToday,
  onStepMonth,
  totalProjects,
  totalTasks,
  timelineHideCompleted = false,
  onToggleTimelineHideCompleted,
  timelineSortBy = "recientes",
  onSetTimelineSortBy,
  isNightMode = true,
}) => {
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  return (
    <div
      className={`w-full h-12 px-4 flex items-center justify-between gap-3 select-none shrink-0 ${
        isNightMode
          ? "bg-transparent text-[#ffffffd6]"
          : "bg-transparent text-slate-900"
      }`}
    >
      {/* ── Izquierda: Selector de Mes Minimalista (Sin Cápsula) e Ir a Hoy ── */}
      <div className="flex items-center gap-1.5 min-w-0">
        <button
          onClick={() => {
            playSound("click");
            onStepMonth(-1);
          }}
          title="Mes anterior"
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="px-1.5 text-base font-black tracking-tight text-[#ffffffd6] capitalize whitespace-nowrap select-none">
          {visibleMonthLabel}
        </span>

        <button
          onClick={() => {
            playSound("click");
            onStepMonth(1);
          }}
          title="Mes siguiente"
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            playSound("click");
            onScrollToToday();
          }}
          className="ml-2 px-3.5 py-1 rounded-full text-sm font-semibold bg-white/5 hover:bg-white/10 text-[#ffffffa0] hover:text-white border border-white/10 transition-all duration-150 active:scale-95 shadow-sm"
        >
          Ir a hoy
        </button>
      </div>

      {/* ── Derecha: Filtros de Vista + Switcher de Zoom en Píldora Redondeada ── */}
      <div className="flex items-center gap-2">
        {/* Dropdown de Filtros y Orden del Timeline */}
        <div className="relative">
          <button
            onClick={() => {
              playSound("click");
              setFilterDropdownOpen(!filterDropdownOpen);
            }}
            title="Filtrar y ordenar proyectos"
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold transition-all duration-150 shadow-sm active:scale-95 ${
              timelineHideCompleted || timelineSortBy !== "recientes"
                ? "bg-white/10 border-white/20 text-white"
                : "bg-[#121212] border-white/10 text-[#ffffff6b] hover:text-[#ffffffd6] hover:bg-white/5"
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filtrar</span>
            {(timelineHideCompleted || timelineSortBy !== "recientes") && (
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
            )}
          </button>

          <AnimatePresence>
            {filterDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.15 }}
                className={`absolute right-0 mt-2 w-56 rounded-2xl border backdrop-blur-md shadow-2xl z-[150] p-2 flex flex-col gap-0.5 ${
                  isNightMode
                    ? "bg-slate-950/95 border-white/10 text-slate-350 shadow-black/80"
                    : "bg-white/95 border-slate-200 text-slate-700 shadow-slate-200/50"
                }`}
              >
                <div className="text-xs font-black text-slate-500 uppercase tracking-widest px-2.5 py-1 select-none">
                  Filtros de Proyectos
                </div>

                <button
                  onClick={() => {
                    onToggleTimelineHideCompleted?.();
                    playSound("click");
                  }}
                  className={`text-left px-2.5 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-between transition-all duration-150 ${
                    timelineHideCompleted
                      ? "bg-white/10 text-white shadow-sm font-bold"
                      : "hover:bg-white/[0.04] text-[#ffffffa0] hover:text-white"
                  }`}
                >
                  <span>Ocultar completados</span>
                  {timelineHideCompleted && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </button>

                <div className="h-px bg-white/10 my-1" />

                <div className="text-xs font-black text-slate-500 uppercase tracking-widest px-2.5 py-1 select-none">
                  Ordenar por
                </div>

                <button
                  onClick={() => {
                    onSetTimelineSortBy?.("recientes");
                    setFilterDropdownOpen(false);
                    playSound("click");
                  }}
                  className={`text-left px-2.5 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-between transition-all duration-150 ${
                    timelineSortBy === "recientes"
                      ? "bg-white/10 text-white shadow-sm font-bold"
                      : "hover:bg-white/[0.04] text-[#ffffffa0] hover:text-white"
                  }`}
                >
                  <span>Más recientes primero</span>
                  {timelineSortBy === "recientes" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </button>

                <button
                  onClick={() => {
                    onSetTimelineSortBy?.("urgentes");
                    setFilterDropdownOpen(false);
                    playSound("click");
                  }}
                  className={`text-left px-2.5 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-between transition-all duration-150 ${
                    timelineSortBy === "urgentes"
                      ? "bg-white/10 text-white shadow-sm font-bold"
                      : "hover:bg-white/[0.04] text-[#ffffffa0] hover:text-white"
                  }`}
                >
                  <span>Atrasados / Urgentes</span>
                  {timelineSortBy === "urgentes" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </button>

                <button
                  onClick={() => {
                    onSetTimelineSortBy?.("alfabetico");
                    setFilterDropdownOpen(false);
                    playSound("click");
                  }}
                  className={`text-left px-2.5 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-between transition-all duration-150 ${
                    timelineSortBy === "alfabetico"
                      ? "bg-white/10 text-white shadow-sm font-bold"
                      : "hover:bg-white/[0.04] text-[#ffffffa0] hover:text-white"
                  }`}
                >
                  <span>Alfabético (A - Z)</span>
                  {timelineSortBy === "alfabetico" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Switcher de Zoom (Día / Semana / Mes) en Píldora Redondeada */}
        <div className="flex items-center gap-1 p-1 rounded-full bg-[#121212] border border-white/10 shadow-sm shrink-0">
          {(["dia", "semana", "mes"] as TimelineZoomLevel[]).map((level) => {
            const isActive = zoomLevel === level;
            const config = ZOOM_CONFIG[level];

            return (
              <button
                key={level}
                onClick={() => {
                  playSound("click");
                  onSetZoomLevel(level);
                }}
                title={config.subLabel}
                className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all duration-150 ${
                  isActive
                    ? "bg-white/10 text-white border border-white/15 shadow-sm"
                    : "text-[#ffffff6b] hover:text-[#ffffffd6] hover:bg-white/5"
                }`}
              >
                {config.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

TimelineHeader.displayName = "TimelineHeader";
