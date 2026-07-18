"use client";

import React, { useState } from "react";
import { Activity, SlidersHorizontal } from "lucide-react";
import { Task } from "./ProjectDashboard";

interface TimeHeatmapProps {
  tasks: Task[];
  isNeumorphic?: boolean;
  isNightMode?: boolean;
}

type MetricMode = 'rendimiento' | 'cumplimiento' | 'volumen' | 'combinado';
type ViewMode = 'dia' | 'semana';

interface WeekData {
  weekIndex: number; // 0 to 11
  startDate: Date;
  endDate: Date;
  plannedHours: number;
  completedHours: number;
  theoreticalCapacity: number;
  tasks: { title: string; hours: number; completed: boolean }[];
}

export default function TimeHeatmap({ tasks, isNeumorphic = false, isNightMode = false }: TimeHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // 1. Capacity config (Monday-Friday 8h, Saturday 4h, Sunday 0h default)
  const [capacity, setCapacity] = useState<Record<number, number>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('taski_heatmap_capacity');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          // ignore parsing error
        }
      }
    }
    return { 1: 8, 2: 8, 3: 8, 4: 8, 5: 8, 6: 4, 0: 0 };
  });

  // 2. Metric mode preference (default: combined)
  const [metricMode, setMetricMode] = useState<MetricMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('taski_heatmap_metric_mode');
      if (saved && ['rendimiento', 'cumplimiento', 'volumen', 'combinado'].includes(saved)) {
        return saved as MetricMode;
      }
    }
    return 'combinado';
  });

  // 3. View mode preference (Day vs Week)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('taski_heatmap_view_mode');
      if (saved && ['dia', 'semana'].includes(saved)) {
        return saved as ViewMode;
      }
    }
    return 'dia';
  });

  const handleCapacityChange = (dayIndex: number, val: number) => {
    const newCap = { ...capacity, [dayIndex]: val };
    setCapacity(newCap);
    if (typeof window !== 'undefined') {
      localStorage.setItem('taski_heatmap_capacity', JSON.stringify(newCap));
    }
  };

  const cycleMetricMode = () => {
    const modes: MetricMode[] = ['cumplimiento', 'rendimiento', 'volumen', 'combinado'];
    const idx = modes.indexOf(metricMode);
    const nextMode = modes[(idx + 1) % modes.length];
    setMetricMode(nextMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('taski_heatmap_metric_mode', nextMode);
    }
  };

  const getMetricLabel = (mode: MetricMode) => {
    switch (mode) {
      case 'rendimiento': return 'Rendimiento (vs. Teórico)';
      case 'cumplimiento': return 'Cumplimiento (vs. Planeado)';
      case 'volumen': return 'Volumen Absoluto (Horas)';
      case 'combinado': return 'Modo Combinado (Calidad + Volumen)';
    }
  };

  const toggleViewMode = () => {
    const nextView = viewMode === 'dia' ? 'semana' : 'dia';
    setViewMode(nextView);
    if (typeof window !== 'undefined') {
      localStorage.setItem('taski_heatmap_view_mode', nextView);
    }
  };

  // Helper to get YYYY-MM-DD string from date object
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Helper to parse hours with decimal comma support (e.g., "4,5h" -> 4.5)
  const parseHours = (timeStr?: string): number => {
    if (!timeStr) return 2; // Default to 2 hours if not specified
    const cleaned = timeStr.replace(',', '.');
    const match = cleaned.match(/([\d.]+)/);
    if (match) {
      const val = parseFloat(match[1]);
      return isNaN(val) ? 2 : val;
    }
    return 2;
  };

  // Helper to retrieve capacity per day index (0=Sunday, 1=Monday, etc.)
  const getTheoreticalCapacity = (date: Date): number => {
    const dayOfWeek = date.getDay();
    return capacity[dayOfWeek] ?? 0;
  };

  // 4. Aggregate task sessions by date
  const aggregatedData: Record<string, {
    plannedHours: number;
    completedHours: number;
    tasks: { title: string; hours: number; completed: boolean }[];
  }> = {};

  tasks.forEach((task) => {
    const dStr = task.fecha_programada;
    if (!dStr) return; // Ignore tasks without a scheduled program date

    if (!aggregatedData[dStr]) {
      aggregatedData[dStr] = {
        plannedHours: 0,
        completedHours: 0,
        tasks: [],
      };
    }

    const taskHours = parseHours(task.time);
    const isCompleted = task.status === "Completado";

    aggregatedData[dStr].plannedHours += taskHours;
    if (isCompleted) {
      aggregatedData[dStr].completedHours += taskHours;
    }

    aggregatedData[dStr].tasks.push({
      title: task.title,
      hours: taskHours,
      completed: isCompleted,
    });
  });

  // Get current calendar month info
  const today = new Date();
  const year = today.getFullYear();
  const monthIdx = today.getMonth();
  const todayStr = getLocalDateString(today);
  
  // Month name
  const monthName = today.toLocaleDateString("es-ES", { month: "long" });
  const formattedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  // Total days in current month
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

  // Distribute the days of the month into 3 rows of 11 cells (total 33 slots)
  const rows: (Date | null)[][] = [[], [], []];
  for (let i = 0; i < 33; i++) {
    const rowIdx = Math.floor(i / 11);
    if (i < daysInMonth) {
      const d = new Date(year, monthIdx, i + 1);
      rows[rowIdx].push(d);
    } else {
      rows[rowIdx].push(null);
    }
  }

  // 5. Generate weekly aggregates for the last 12 weeks
  const getWeeklyData = (): WeekData[] => {
    const list: WeekData[] = [];
    const now = new Date();
    
    // Get the Monday of the current week
    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1; // Monday is day 1
    const currentMonday = new Date(now);
    currentMonday.setDate(now.getDate() - distanceToMonday);
    currentMonday.setHours(0, 0, 0, 0);

    for (let w = 11; w >= 0; w--) {
      const weekMonday = new Date(currentMonday);
      weekMonday.setDate(currentMonday.getDate() - w * 7);
      
      const weekSunday = new Date(weekMonday);
      weekSunday.setDate(weekMonday.getDate() + 6);
      weekSunday.setHours(23, 59, 59, 999);

      let weekPlanned = 0;
      let weekCompleted = 0;
      let weekCapacity = 0;
      const weekTasks: { title: string; hours: number; completed: boolean }[] = [];

      // Loop through each of the 7 days of this week
      for (let d = 0; d < 7; d++) {
        const dayDate = new Date(weekMonday);
        dayDate.setDate(weekMonday.getDate() + d);
        const dayStr = getLocalDateString(dayDate);
        
        // Add daily capacity
        weekCapacity += getTheoreticalCapacity(dayDate);

        // Add task metrics
        const dayLog = aggregatedData[dayStr];
        if (dayLog) {
          weekPlanned += dayLog.plannedHours;
          weekCompleted += dayLog.completedHours;
          weekTasks.push(...dayLog.tasks);
        }
      }

      list.push({
        weekIndex: w,
        startDate: weekMonday,
        endDate: weekSunday,
        plannedHours: weekPlanned,
        completedHours: weekCompleted,
        theoreticalCapacity: weekCapacity,
        tasks: weekTasks,
      });
    }
    return list;
  };

  const weeklyData = getWeeklyData();

  // Statistics for the footer
  let statsTotal = 0;
  let statsAverage = 0;
  let statsMax = 0;
  let statsMaxLabel = "-";

  if (viewMode === 'dia') {
    statsTotal = 0;
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, monthIdx, i);
      const dStr = getLocalDateString(d);
      const dayLog = aggregatedData[dStr];
      if (dayLog && dayLog.completedHours > 0) {
        statsTotal += dayLog.completedHours;
        if (dayLog.completedHours > statsMax) {
          statsMax = dayLog.completedHours;
          statsMaxLabel = `Día ${i}`;
        }
      }
    }
    statsAverage = statsTotal / daysInMonth;
  } else {
    statsTotal = weeklyData.reduce((acc, w) => acc + w.completedHours, 0);
    statsMax = weeklyData.reduce((acc, w) => Math.max(acc, w.completedHours), 0);
    const maxWeekIndex = weeklyData.findIndex(w => w.completedHours === statsMax);
    if (maxWeekIndex !== -1) {
      const wData = weeklyData[maxWeekIndex];
      statsMaxLabel = `S${12 - wData.weekIndex}`;
    }
    statsAverage = statsTotal / 12;
  }

  // Cell coloring logic mapper
  const getCellVisual = (
    planned: number,
    completed: number,
    capacityLimit: number
  ) => {
    // 1. RENDIMIENTO
    if (metricMode === 'rendimiento') {
      const ratio = capacityLimit > 0 ? (completed / capacityLimit) : (completed > 0 ? 1 : 0);
      if (completed === 0) {
        return {
          bgClass: isNightMode ? "bg-slate-800/60 border border-slate-700/40" : "bg-slate-200/60 border border-slate-300/40",
          text: `0% Rendimiento (${completed}h de ${capacityLimit}h cap. teórica)`,
          valueText: `${Math.round(ratio * 100)}%`
        };
      }
      if (ratio <= 0.33) {
        return {
          bgClass: "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400",
          text: `${Math.round(ratio * 100)}% Rendimiento (${completed}h de ${capacityLimit}h cap.)`,
          valueText: `${Math.round(ratio * 100)}%`
        };
      }
      if (ratio <= 0.66) {
        return {
          bgClass: "bg-emerald-500/40 border border-emerald-500/50 text-emerald-300",
          text: `${Math.round(ratio * 100)}% Rendimiento (${completed}h de ${capacityLimit}h cap.)`,
          valueText: `${Math.round(ratio * 100)}%`
        };
      }
      if (ratio <= 1.0) {
        return {
          bgClass: "bg-emerald-500/70 border border-emerald-400 text-white",
          text: `${Math.round(ratio * 100)}% Rendimiento (${completed}h de ${capacityLimit}h cap.)`,
          valueText: `${Math.round(ratio * 100)}%`
        };
      }
      return {
        bgClass: "bg-emerald-400 border border-emerald-300 shadow-md shadow-emerald-500/20 text-emerald-950 font-black",
        text: `${Math.round(ratio * 100)}% Rendimiento (Capacidad superada · ${completed}h / ${capacityLimit}h)`,
        valueText: `${Math.round(ratio * 100)}%`
      };
    }

    // 2. CUMPLIMIENTO
    if (metricMode === 'cumplimiento') {
      const ratio = planned > 0 ? (completed / planned) : (completed > 0 ? 1 : 0);
      if (planned === 0) {
        return {
          bgClass: isNightMode ? "bg-slate-800/40 border border-slate-700/20 opacity-40" : "bg-slate-200/40 border border-slate-300/20 opacity-40",
          text: `Sin tareas planeadas`,
          valueText: "-"
        };
      }
      if (completed === 0) {
        return {
          bgClass: isNightMode ? "bg-slate-800/60 border border-slate-700/40" : "bg-slate-200/60 border border-slate-300/40",
          text: `0% Cumplimiento (Tenías ${planned}h planeadas!)`,
          valueText: `0%`
        };
      }
      if (ratio <= 0.33) {
        return {
          bgClass: "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400",
          text: `${Math.round(ratio * 100)}% Cumplimiento (${completed}h de ${planned}h plan.)`,
          valueText: `${Math.round(ratio * 100)}%`
        };
      }
      if (ratio <= 0.66) {
        return {
          bgClass: "bg-emerald-500/45 border border-emerald-500/50 text-emerald-300",
          text: `${Math.round(ratio * 100)}% Cumplimiento (${completed}h de ${planned}h plan.)`,
          valueText: `${Math.round(ratio * 100)}%`
        };
      }
      if (ratio < 1.0) {
        return {
          bgClass: "bg-emerald-500/70 border border-emerald-400 text-white",
          text: `${Math.round(ratio * 100)}% Cumplimiento (${completed}h de ${planned}h plan.)`,
          valueText: `${Math.round(ratio * 100)}%`
        };
      }
      return {
        bgClass: "bg-emerald-400 border border-emerald-300 shadow-md shadow-emerald-500/20 text-emerald-950 font-black",
        text: `100% Cumplimiento (${completed}h de ${planned}h plan. completadas)`,
        valueText: `100%`
      };
    }

    // 3. VOLUMEN ABSOLUTO
    if (metricMode === 'volumen') {
      if (completed === 0) {
        return {
          bgClass: isNightMode ? "bg-slate-800/60 border border-slate-700/40" : "bg-slate-200/60 border border-slate-300/40",
          text: `0h completadas`,
          valueText: "0h"
        };
      }
      if (completed <= 2) {
        return {
          bgClass: "bg-emerald-500/25 border border-emerald-500/30 text-emerald-400",
          text: `${completed.toFixed(1)}h completadas`,
          valueText: `${completed.toFixed(0)}h`
        };
      }
      if (completed <= 4) {
        return {
          bgClass: "bg-emerald-500/50 border border-emerald-500/60 text-emerald-300",
          text: `${completed.toFixed(1)}h completadas`,
          valueText: `${completed.toFixed(0)}h`
        };
      }
      if (completed <= 6) {
        return {
          bgClass: "bg-emerald-500/80 border border-emerald-400 text-white",
          text: `${completed.toFixed(1)}h completadas`,
          valueText: `${completed.toFixed(0)}h`
        };
      }
      return {
        bgClass: "bg-emerald-400 border border-emerald-300 shadow-md shadow-emerald-500/20 text-emerald-950 font-black",
        text: `${completed.toFixed(1)}h completadas (Alto volumen)`,
        valueText: `${completed.toFixed(0)}h`
      };
    }

    // 4. COMBINADO (Dual Encoding)
    // - Hue (Tono): Green if ratio > 0.75, Yellow/Amber if 0.33 to 0.75, Red/Rose if ratio <= 0.33, and light rose if completed = 0 but planned > 0
    // - Intensity (Saturación/Opacidad): Based on absolute completed hours
    const ratio = planned > 0 ? (completed / planned) : (completed > 0 ? 1 : 0);
    
    if (planned === 0 && completed === 0) {
      return {
        bgClass: isNightMode ? "bg-slate-800/40 border border-slate-700/20 opacity-40" : "bg-slate-200/40 border border-slate-300/20 opacity-40",
        text: `Sin tareas planeadas`,
        valueText: "-"
      };
    }

    if (completed === 0 && planned > 0) {
      return {
        bgClass: "bg-rose-550/20 border border-rose-500/40 text-rose-400",
        text: `0% Cumplido (Alerta: Tenías ${planned}h planeadas!)`,
        valueText: "0%"
      };
    }

    // Red/Rose range (low compliance)
    if (ratio <= 0.33) {
      if (completed <= 2) {
        return {
          bgClass: "bg-rose-500/20 border border-rose-500/30 text-rose-300",
          text: `Bajo cumplimiento (${Math.round(ratio * 100)}%) · Bajo volumen (${completed}h)`,
          valueText: "⚠️"
        };
      }
      return {
        bgClass: "bg-rose-500/40 border border-rose-500/50 text-rose-200 font-bold",
        text: `Bajo cumplimiento (${Math.round(ratio * 100)}%) · Alto volumen (${completed}h)`,
        valueText: "⚠️"
      };
    }

    // Amber/Yellow range (medium compliance)
    if (ratio <= 0.75) {
      if (completed <= 3) {
        return {
          bgClass: "bg-amber-500/20 border border-amber-500/35 text-amber-300",
          text: `Cumplimiento medio (${Math.round(ratio * 100)}%) · Bajo volumen (${completed}h)`,
          valueText: "⚡"
        };
      }
      return {
        bgClass: "bg-amber-500/45 border border-amber-500/65 text-amber-100 font-bold",
        text: `Cumplimiento medio (${Math.round(ratio * 100)}%) · Alto volumen (${completed}h)`,
        valueText: "⚡"
      };
    }

    // Emerald/Green range (high compliance)
    if (completed <= 3) {
      return {
        bgClass: "bg-emerald-500/35 border border-emerald-500/45 text-emerald-300",
        text: `Excelente cumplimiento (${Math.round(ratio * 100)}%) · Bajo volumen (${completed}h)`,
        valueText: "✓"
      };
    }
    return {
      bgClass: "bg-emerald-400 border border-emerald-300 shadow-md shadow-emerald-500/20 text-emerald-950 font-black",
      text: `Excelente! (${Math.round(ratio * 100)}% de cumplimiento y alto volumen: ${completed}h)`,
      valueText: "✓"
    };
  };

  return (
    <div className="flex flex-col transition-all duration-300 min-h-[64px] select-none" style={{ minWidth: "220px" }}>
      
      {/* Top Header: Title & Actions */}
      <div className="flex items-center justify-between gap-1.5 mb-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <Activity className={`w-3.5 h-3.5 ${isNightMode ? 'text-slate-400' : 'text-slate-600'}`} />
          <span className={`text-[10px] font-extrabold uppercase tracking-widest ${isNightMode ? 'text-slate-450' : 'text-slate-600'}`}>
            {viewMode === 'dia' ? `Días · ${formattedMonthName}` : 'Semanas (Últ. 3 meses)'}
          </span>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1 pointer-events-auto">
          {/* Day / Week Toggle */}
          <div className="flex items-center rounded-md bg-white/5 border border-white/10 p-0.5 mr-0.5">
            <button
              onClick={() => setViewMode('dia')}
              className={`px-1 rounded text-[7.5px] font-bold uppercase transition-all py-0.5 ${
                viewMode === 'dia'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Día
            </button>
            <button
              onClick={() => setViewMode('semana')}
              className={`px-1 rounded text-[7.5px] font-bold uppercase transition-all py-0.5 ${
                viewMode === 'semana'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sem.
            </button>
          </div>

          {/* Metric Selector Button */}
          <button
            onClick={cycleMetricMode}
            title={`Métrica: ${getMetricLabel(metricMode)}. Click para cambiar.`}
            className="flex items-center justify-center h-5 px-1.5 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-slate-300 font-extrabold text-[7px] uppercase tracking-wider"
          >
            {metricMode.slice(0, 3)}
          </button>

          {/* Config Settings Icon */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            title="Configurar jornada semanal teórica"
            className={`flex items-center justify-center p-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 transition-all h-5 w-5 ${
              showSettings ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      {/* Collapsible Capacity Settings Panel */}
      {showSettings && (
        <div className="mb-2 p-2 rounded-xl bg-slate-900/95 border border-white/10 flex flex-col gap-1.5 text-[8.5px] text-white">
          <div className="flex items-center justify-between border-b border-white/10 pb-0.5">
            <span className="font-extrabold text-[7.5px] uppercase tracking-wider text-slate-400">Jornada Teórica Diaria (h)</span>
            <button
              onClick={() => {
                const standardCap = { 1: 8, 2: 8, 3: 8, 4: 8, 5: 8, 6: 4, 0: 0 };
                setCapacity(standardCap);
                localStorage.setItem('taski_heatmap_capacity', JSON.stringify(standardCap));
              }}
              className="text-[7px] text-emerald-400 hover:underline uppercase font-extrabold"
            >
              Reset 8h
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {[
              { idx: 1, label: 'L' },
              { idx: 2, label: 'M' },
              { idx: 3, label: 'M' },
              { idx: 4, label: 'J' },
              { idx: 5, label: 'V' },
              { idx: 6, label: 'S' },
              { idx: 0, label: 'D' },
            ].map(({ idx, label }) => (
              <div key={idx} className="flex flex-col items-center gap-0.5">
                <span className="text-[7px] font-bold text-slate-500 uppercase">{label}</span>
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={capacity[idx] ?? 0}
                  onChange={(e) => {
                    const parsed = parseFloat(e.target.value);
                    handleCapacityChange(idx, isNaN(parsed) ? 0 : parsed);
                  }}
                  className="w-full text-center bg-white/5 border border-white/15 rounded py-0.5 text-[8px] font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid Canvas */}
      <div className="flex flex-col gap-1.5 py-1">
        {viewMode === 'dia' ? (
          rows.map((row, rowIdx) => (
            <div key={rowIdx} className="flex gap-1.5">
              {row.map((date, colIdx) => {
                if (!date) {
                  return (
                    <div 
                      key={`empty-${colIdx}`}
                      className={`w-4 h-4 rounded-[4px] border border-dashed transition-all duration-300 ${
                        isNeumorphic 
                          ? "bg-slate-300/10 border-slate-300/40" 
                          : "bg-white/[0.01] border-white/5"
                      }`}
                      title="Fuera de rango"
                    />
                  );
                }

                const dStr = getLocalDateString(date);
                const dayLog = aggregatedData[dStr] || { plannedHours: 0, completedHours: 0, tasks: [] };
                const dayCap = getTheoreticalCapacity(date);
                const visual = getCellVisual(dayLog.plannedHours, dayLog.completedHours, dayCap);
                const isToday = dStr === todayStr;
                const isHovered = hoveredCell === dStr;

                return (
                  <div
                    key={dStr}
                    onMouseEnter={() => setHoveredCell(dStr)}
                    onMouseLeave={() => setHoveredCell(null)}
                    className="relative"
                  >
                    <div
                      className={`w-4 h-4 rounded-[4px] cursor-pointer transition-all duration-200 hover:scale-110 ${visual.bgClass} ${
                        isToday 
                          ? isNeumorphic
                            ? "ring-2 ring-blue-500 ring-offset-1"
                            : "ring-2 ring-emerald-300 ring-offset-1 ring-offset-[#0d0d12]"
                          : ""
                      }`}
                    />

                    {/* Tooltip detail card */}
                    {isHovered && (
                      <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-[100] p-2.5 rounded-xl text-[10px] pointer-events-none min-w-[165px] shadow-2xl flex flex-col gap-1.5 transition-all duration-200 ${
                        isNeumorphic
                          ? "bg-slate-900/95 text-slate-100 backdrop-blur-md"
                          : "bg-[#0c0c0e]/95 text-white backdrop-blur-md border border-white/10"
                      }`}>
                        <div className="flex items-center justify-between border-b border-white/10 pb-1">
                          <span className="font-extrabold text-[8.5px] uppercase tracking-wider text-white/50">
                            {date.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })}
                          </span>
                          {isToday && (
                            <span className="text-[7.5px] bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded font-extrabold uppercase tracking-widest">
                              Hoy
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-1 text-[9px]">
                          <div className="flex justify-between items-center text-[7.5px] uppercase tracking-wider text-white/40">
                            <span>Métrica actual ({metricMode})</span>
                          </div>
                          <span className="font-bold text-emerald-400 text-[10.5px] leading-snug">
                            {visual.text}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1 text-[8px] border-t border-white/5 pt-1.5 text-center">
                          <div className="flex flex-col">
                            <span className="text-[6.5px] text-white/40 uppercase">Plan.</span>
                            <span className="font-extrabold text-white/85">{dayLog.plannedHours.toFixed(1)}h</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[6.5px] text-white/40 uppercase">Comp.</span>
                            <span className="font-extrabold text-emerald-400">{dayLog.completedHours.toFixed(1)}h</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[6.5px] text-white/40 uppercase">Teórica</span>
                            <span className="font-extrabold text-white/85">{dayCap}h</span>
                          </div>
                        </div>

                        {dayLog.tasks.length > 0 ? (
                          <div className="flex flex-col gap-1 border-t border-white/5 pt-1.5">
                            <span className="text-[7.5px] font-extrabold uppercase tracking-wider text-white/30">Desglose de tareas:</span>
                            {dayLog.tasks.slice(0, 4).map((t, tIdx) => (
                              <div key={tIdx} className="flex items-center justify-between gap-2 text-[8.5px]">
                                <span className="truncate text-white/70 max-w-[105px] flex items-center gap-1">
                                  <span className={t.completed ? "text-emerald-400 font-extrabold" : "text-white/30"}>{t.completed ? "✓" : "○"}</span>
                                  {t.title}
                                </span>
                                <span className={`font-semibold ${t.completed ? "text-emerald-400" : "text-white/55"}`}>{t.hours}h</span>
                              </div>
                            ))}
                            {dayLog.tasks.length > 4 && (
                              <span className="text-[7px] italic text-white/40">+{dayLog.tasks.length - 4} más</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[7.5px] italic text-white/40">Sin tareas planeadas</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        ) : (
          /* Weekly Mode Grid: 2 rows of 6 rectangular cells */
          [0, 1].map((rowIdx) => (
            <div key={rowIdx} className="flex gap-1.5 justify-center">
              {Array.from({ length: 6 }).map((_, colIdx) => {
                const weekIndexInArray = rowIdx * 6 + colIdx; // index 0 to 11
                const week = weeklyData[weekIndexInArray];
                if (!week) return null;

                const weekLabel = `S${12 - week.weekIndex}`;
                const visual = getCellVisual(week.plannedHours, week.completedHours, week.theoreticalCapacity);
                const isHovered = hoveredCell === `week-${week.weekIndex}`;

                return (
                  <div
                    key={week.weekIndex}
                    onMouseEnter={() => setHoveredCell(`week-${week.weekIndex}`)}
                    onMouseLeave={() => setHoveredCell(null)}
                    className="relative"
                  >
                    <div
                      className={`w-7 h-5 rounded-[4px] border cursor-pointer transition-all duration-200 hover:scale-105 flex items-center justify-center text-[7.5px] font-extrabold ${visual.bgClass}`}
                    >
                      {weekLabel}
                    </div>

                    {/* Tooltip detail card */}
                    {isHovered && (
                      <div className={`absolute bottom-7 left-1/2 -translate-x-1/2 z-[100] p-2.5 rounded-xl text-[10px] pointer-events-none min-w-[170px] shadow-2xl flex flex-col gap-1.5 transition-all duration-200 ${
                        isNeumorphic
                          ? "bg-slate-900/95 text-slate-100 backdrop-blur-md"
                          : "bg-[#0c0c0e]/95 text-white backdrop-blur-md border border-white/10"
                      }`}>
                        <div className="flex items-center justify-between border-b border-white/10 pb-1">
                          <span className="font-extrabold text-[8.5px] uppercase tracking-wider text-white/50">
                            Semana {12 - week.weekIndex}
                          </span>
                          <span className="text-[8px] text-emerald-400 font-extrabold uppercase tracking-wider">
                            {week.startDate.toLocaleDateString("es-ES", { day: "numeric" })} - {week.endDate.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1 text-[9px]">
                          <div className="flex justify-between items-center text-[7.5px] uppercase tracking-wider text-white/40">
                            <span>Métrica actual ({metricMode})</span>
                          </div>
                          <span className="font-bold text-emerald-400 text-[10.5px] leading-snug">
                            {visual.text}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1 text-[8px] border-t border-white/5 pt-1.5 text-center">
                          <div className="flex flex-col">
                            <span className="text-[6.5px] text-white/40 uppercase">Plan.</span>
                            <span className="font-extrabold text-white/85">{week.plannedHours.toFixed(1)}h</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[6.5px] text-white/40 uppercase">Comp.</span>
                            <span className="font-extrabold text-emerald-400">{week.completedHours.toFixed(1)}h</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[6.5px] text-white/40 uppercase">Teórica</span>
                            <span className="font-extrabold text-white/85">{week.theoreticalCapacity.toFixed(1)}h</span>
                          </div>
                        </div>

                        {week.tasks.length > 0 ? (
                          <div className="flex flex-col gap-1 border-t border-white/5 pt-1.5 max-h-[100px] overflow-y-auto hide-scrollbar">
                            <span className="text-[7.5px] font-extrabold uppercase tracking-wider text-white/30">Tareas de la semana:</span>
                            {week.tasks.slice(0, 5).map((t, tIdx) => (
                              <div key={tIdx} className="flex items-center justify-between gap-2 text-[8.5px]">
                                <span className="truncate text-white/70 max-w-[110px] flex items-center gap-1">
                                  <span className={t.completed ? "text-emerald-400 font-extrabold" : "text-white/30"}>{t.completed ? "✓" : "○"}</span>
                                  {t.title}
                                </span>
                                <span className={`font-semibold ${t.completed ? "text-emerald-400" : "text-white/55"}`}>{t.hours}h</span>
                              </div>
                            ))}
                            {week.tasks.length > 5 && (
                              <span className="text-[7px] italic text-white/40">+{week.tasks.length - 5} más</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[7.5px] italic text-white/40">Sin tareas en esta semana</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Bottom statistics panel */}
      <div className={`mt-2 pt-1.5 border-t flex justify-between gap-2.5 text-[8.5px] uppercase tracking-wider ${
        isNeumorphic ? "border-slate-200 text-slate-500" : "border-white/5 text-white/45"
      }`}>
        <div className="flex flex-col">
          <span className={`text-[7px] font-extrabold ${isNeumorphic ? 'text-slate-400' : 'text-white/30'}`}>Total</span>
          <span className={`font-bold mt-0.5 text-[9.5px] ${isNeumorphic ? 'text-slate-700' : 'text-emerald-400'}`}>{statsTotal.toFixed(1)}h</span>
        </div>
        <div className="flex flex-col">
          <span className={`text-[7px] font-extrabold ${isNeumorphic ? 'text-slate-400' : 'text-white/30'}`}>Promedio</span>
          <span className={`font-bold mt-0.5 text-[9.5px] ${isNeumorphic ? 'text-slate-700' : 'text-white/80'}`}>
            {statsAverage.toFixed(1)}h/{viewMode === 'dia' ? 'd' : 'sem'}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className={`text-[7px] font-extrabold ${isNeumorphic ? 'text-slate-400' : 'text-white/30'}`}>Máximo</span>
          <span className={`font-bold mt-0.5 text-[9.5px] ${isNeumorphic ? 'text-slate-700' : 'text-white/80'}`}>
            {statsMax > 0 ? `${statsMax.toFixed(1)}h (${statsMaxLabel})` : "-"}
          </span>
        </div>
      </div>

    </div>
  );
}
