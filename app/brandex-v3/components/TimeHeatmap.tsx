"use client";

import React, { useState } from "react";
import { Activity } from "lucide-react";
import { Task } from "./ProjectDashboard";

interface TimeHeatmapProps {
  tasks: Task[];
  isNeumorphic?: boolean;
  isNightMode?: boolean;
}

interface DailyLog {
  date: string;
  hours: number;
  tasks: { taskTitle: string; hours: number }[];
}

export default function TimeHeatmap({ tasks, isNeumorphic = false, isNightMode = false }: TimeHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  // Helper to get YYYY-MM-DD string from date object
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Aggregate task sessions by date
  const aggregatedLogs: Record<string, DailyLog> = {};
  tasks.forEach((task) => {
    if (task.sessions) {
      task.sessions.forEach((session) => {
        const dStr = session.date;
        if (!aggregatedLogs[dStr]) {
          aggregatedLogs[dStr] = {
            date: dStr,
            hours: 0,
            tasks: [],
          };
        }
        aggregatedLogs[dStr].hours += session.hours;
        // Check if task is already logged for this day
        const existingTaskLog = aggregatedLogs[dStr].tasks.find((t) => t.taskTitle === task.title);
        if (existingTaskLog) {
          existingTaskLog.hours += session.hours;
        } else {
          aggregatedLogs[dStr].tasks.push({
            taskTitle: task.title,
            hours: session.hours,
          });
        }
      });
    }
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

  // Calculate statistics for the calendar month
  let totalHours = 0;
  let maxHours = 0;
  let maxDate = "-";

  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, monthIdx, i);
    const dStr = getLocalDateString(d);
    const log = aggregatedLogs[dStr];
    if (log && log.hours > 0) {
      totalHours += log.hours;
      if (log.hours > maxHours) {
        maxHours = log.hours;
        maxDate = d.toLocaleDateString("es-ES", { day: "numeric" });
      }
    }
  }

  const averageHours = totalHours / daysInMonth;

  // Determine colors based on hours
  const getCellColor = (hours: number) => {
    if (hours === 0) {
      return isNightMode ? "bg-slate-800/80 border border-slate-700/60" : "bg-slate-200/80 border border-slate-300/60";
    }
    if (hours <= 2) {
      return "bg-emerald-500/30 border border-emerald-500/50";
    }
    if (hours <= 4) {
      return "bg-emerald-500/50 border border-emerald-500/70";
    }
    if (hours <= 6) {
      return "bg-emerald-500/80 border border-emerald-400";
    }
    return "bg-emerald-400 border border-emerald-300 shadow-sm";
  };

  return (
    <div className="flex flex-col transition-all duration-300 min-h-[64px] select-none" style={{ minWidth: "220px" }}>
      
      {/* Top Header: Title */}
      <div className="flex items-center gap-1.5 mb-2.5">
        <Activity className={`w-3.5 h-3.5 ${isNightMode ? 'text-slate-400' : 'text-slate-600'}`} />
        <span className={`text-[11px] font-extrabold uppercase tracking-widest ${isNightMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Actividad · {formattedMonthName}
        </span>
      </div>

      {/* Grid: 3 Rows of 11 Cells */}
      <div className="flex flex-col gap-1.5 py-1">
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="flex gap-1.5">
            {row.map((date, colIdx) => {
              if (!date) {
                // Placeholder cell for days outside the current month (next month placeholders in gray)
                return (
                  <div 
                    key={`empty-${colIdx}`}
                    className={`w-4 h-4 rounded-[4px] border border-dashed transition-all duration-300 ${
                      isNeumorphic 
                        ? "bg-slate-300/10 border-slate-300/40" 
                        : "bg-white/[0.01] border-white/5"
                    }`}
                    title="Fuera de rango del mes"
                  />
                );
              }

              const dStr = getLocalDateString(date);
              const log = aggregatedLogs[dStr];
              const hours = log ? log.hours : 0;
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
                    className={`w-4 h-4 rounded-[4px] cursor-pointer transition-all duration-200 hover:scale-110 ${getCellColor(hours)} ${
                      isToday 
                        ? isNeumorphic
                          ? "ring-2 ring-blue-500 ring-offset-1"
                          : "ring-2 ring-emerald-300 ring-offset-1 ring-offset-[#0d0d12]"
                        : ""
                    }`}
                  />

                  {/* Tooltip */}
                  {isHovered && (
                    <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-[100] p-2.5 rounded-xl text-[10px] pointer-events-none min-w-[140px] shadow-2xl flex flex-col gap-1.5 transition-all duration-200 ${
                      isNeumorphic
                        ? "bg-slate-900/95 text-slate-100 backdrop-blur-md"
                        : "bg-[#0c0c0e]/95 text-white backdrop-blur-md border border-white/10"
                    }`}>
                      <div className="flex items-center justify-between border-b border-white/10 pb-1">
                        <span className="font-extrabold text-[9px] uppercase tracking-wider text-white/50">
                          {date.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })}
                        </span>
                        {isToday && (
                          <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded font-bold uppercase tracking-widest">
                            Hoy
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1 font-medium">
                        <span className="text-[13px] font-black text-emerald-400">{hours.toFixed(1)}h</span>
                        <span className="text-white/60">registradas</span>
                      </div>

                      {log && log.tasks.length > 0 ? (
                        <div className="flex flex-col gap-1 border-t border-white/5 pt-1.5">
                          <span className="text-[8px] font-extrabold uppercase tracking-wider text-white/30">Desglose:</span>
                          {log.tasks.slice(0, 3).map((t, tIdx) => (
                            <div key={tIdx} className="flex items-center justify-between gap-2 text-[9px]">
                              <span className="truncate text-white/70 max-w-[90px]">{t.taskTitle}</span>
                              <span className="font-semibold text-emerald-400">{t.hours}h</span>
                            </div>
                          ))}
                          {log.tasks.length > 3 && (
                            <span className="text-[7.5px] italic text-white/40">+{log.tasks.length - 3} tareas más</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[8px] italic text-white/40">Sin actividad registrada</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom statistics panel */}
      <div className={`mt-3 pt-2 border-t flex justify-between gap-4 text-[9px] uppercase tracking-wider ${
        isNeumorphic ? "border-slate-200 text-slate-500" : "border-white/5 text-white/40"
      }`}>
        <div className="flex flex-col">
          <span className={`text-[7.5px] font-extrabold ${isNeumorphic ? 'text-slate-400' : 'text-white/30'}`}>Mes</span>
          <span className={`font-bold mt-0.5 text-[10px] ${isNeumorphic ? 'text-slate-700' : 'text-emerald-400'}`}>{totalHours.toFixed(1)}h</span>
        </div>
        <div className="flex flex-col">
          <span className={`text-[7.5px] font-extrabold ${isNeumorphic ? 'text-slate-400' : 'text-white/30'}`}>Promedio</span>
          <span className={`font-bold mt-0.5 text-[10px] ${isNeumorphic ? 'text-slate-700' : 'text-white/80'}`}>{averageHours.toFixed(2)}h/d</span>
        </div>
        <div className="flex flex-col items-end">
          <span className={`text-[7.5px] font-extrabold ${isNeumorphic ? 'text-slate-400' : 'text-white/30'}`}>Máximo</span>
          <span className={`font-bold mt-0.5 text-[10px] ${isNeumorphic ? 'text-slate-700' : 'text-white/80'}`}>{maxHours > 0 ? `${maxHours.toFixed(1)}h (Día ${maxDate})` : "-"}</span>
        </div>
      </div>

    </div>
  );
}
