"use client";

import React, { useState } from "react";
import { Settings, Check } from "lucide-react";

export interface TodayEffortTask {
  id: string;
  title: string;
  hours: number;
}

export interface TodayEffortData {
  verde: number;
  naranja: number;
  gris: number;
  excedente: number;
  maxVal: number;
  verdeCount: number;
  naranjaCount: number;
  nextTask: { title: string; hours: number } | null;
  total: number;
  tasksVerde: TodayEffortTask[];
  tasksNaranja: TodayEffortTask[];
}

export interface DailyEffortBarProps {
  todayEffort: TodayEffortData;
  limiteHorasDia: number;
  setLimiteHorasDia: (value: number) => void;
  isNightMode: boolean;
}

export const DailyEffortBar: React.FC<DailyEffortBarProps> = ({
  todayEffort,
  limiteHorasDia,
  setLimiteHorasDia,
  isNightMode,
}) => {
  const [showLimitInput, setShowLimitInput] = useState(false);

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex items-center justify-between">
        {/* Left Column: Discreet label + Big main number */}
        <div className="flex flex-col justify-end">
          <span className={`text-[10px] font-bold tracking-widest uppercase opacity-60 mb-0.5 ${isNightMode ? 'text-zinc-400' : 'text-slate-500'}`}>
            Esfuerzo Diario
          </span>
          <div className={`text-[28px] sm:text-[30px] font-bold leading-none tracking-tight flex items-baseline gap-1.5 ${isNightMode ? 'text-white' : 'text-slate-900'}`}>
            <span>{todayEffort.verde}h</span>
            <span className="text-base font-normal opacity-50">de</span>
            <span>{todayEffort.total}h</span>
          </div>
        </div>
        
        {/* Right Column: Badge + Gear icon toggle on top, Siguiente/Estado on bottom */}
        <div className="flex flex-col items-end justify-between gap-1.5">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
              todayEffort.verde === todayEffort.total && todayEffort.total > 0
                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                : todayEffort.excedente > 0
                  ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                  : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
            }`}>
              {todayEffort.verde === todayEffort.total && todayEffort.total > 0 ? "¡Día Completo!" : todayEffort.excedente > 0 ? "Sobrecargado" : "A tiempo"}
            </span>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLimitInput(prev => !prev)}
                title="Configurar límite de horas"
                className={`p-1 rounded-md transition-all duration-200 ${
                  showLimitInput 
                    ? (isNightMode ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-900') 
                    : (isNightMode ? 'text-zinc-400 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100')
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
              </button>

              {showLimitInput && (
                <div className={`absolute right-0 top-full mt-1.5 z-20 flex items-center gap-2 px-2.5 py-1.5 rounded-lg border shadow-lg backdrop-blur-md transition-all ${
                  isNightMode ? 'bg-zinc-900/95 border-zinc-700/80 text-white' : 'bg-white/95 border-slate-200 text-slate-800'
                }`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap opacity-70">Límite:</span>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={limiteHorasDia}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setLimiteHorasDia(val);
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('taski_limite_horas_dia', val.toString());
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Escape') {
                        setShowLimitInput(false);
                      }
                    }}
                    autoFocus
                    className={`w-10 px-1 py-0.5 text-center text-xs font-bold rounded border outline-none ${
                      isNightMode ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                    }`}
                  />
                  <span className="text-[10px] font-bold opacity-60">h</span>
                  <button
                    type="button"
                    onClick={() => setShowLimitInput(false)}
                    className="text-emerald-500 hover:text-emerald-400 p-0.5"
                    title="Guardar"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {todayEffort.nextTask && (
            <div className="flex items-center gap-1.5 text-right">
              <span className={`text-[9px] font-semibold uppercase opacity-60 ${isNightMode ? 'text-zinc-300' : 'text-slate-500'}`}>
                Siguiente:
              </span>
              <span className={`text-[10px] font-bold max-w-[140px] truncate ${isNightMode ? 'text-amber-400' : 'text-amber-600'}`}>
                {todayEffort.nextTask.title} · {todayEffort.nextTask.hours}h
              </span>
            </div>
          )}
          {!todayEffort.nextTask && todayEffort.total > 0 && (
            <div className="flex items-center gap-1.5 text-right">
              <span className={`text-[9px] font-semibold uppercase opacity-60 ${isNightMode ? 'text-zinc-300' : 'text-slate-500'}`}>
                Estado:
              </span>
              <span className={`text-[10px] font-bold ${isNightMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                Todo listo 🎉
              </span>
            </div>
          )}
          {todayEffort.total === 0 && (
            <div className="flex items-center gap-1.5 text-right">
              <span className={`text-[10px] font-bold ${isNightMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                Sin tareas hoy
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Segmented Bar */}
      <div className="w-full h-3 flex gap-1 relative">
        {/* Verde */}
        {todayEffort.tasksVerde.map((tk, idx) => (
          <div 
            key={`v-${tk.id}-${idx}`}
            className="h-full bg-[#3ecf8e] hover:bg-emerald-400 transition-all duration-300 rounded-full relative group/segment cursor-default"
            style={{ width: `${(tk.hours / todayEffort.maxVal) * 100}%` }}
          >
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-xl bg-slate-900/95 border border-white/10 shadow-2xl opacity-0 scale-90 group-hover/segment:opacity-100 group-hover/segment:scale-100 pointer-events-none transition-all duration-150 z-[100] whitespace-nowrap text-[12px] font-bold text-white flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e]" />
              <span>{tk.title}</span>
              <span className="opacity-60 font-semibold text-[9px]">({tk.hours}h)</span>
            </div>
          </div>
        ))}
        {/* Naranja */}
        {todayEffort.tasksNaranja.map((tk, idx) => (
          <div 
            key={`n-${tk.id}-${idx}`}
            className="h-full bg-[#f0a545] hover:bg-amber-400 transition-all duration-300 rounded-full relative group/segment cursor-default"
            style={{ width: `${(tk.hours / todayEffort.maxVal) * 100}%` }}
          >
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-xl bg-slate-900/95 border border-white/10 shadow-2xl opacity-0 scale-90 group-hover/segment:opacity-100 group-hover/segment:scale-100 pointer-events-none transition-all duration-150 z-[100] whitespace-nowrap text-[12px] font-bold text-white flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f0a545]" />
              <span>{tk.title}</span>
              <span className="opacity-60 font-semibold text-[9px]">({tk.hours}h)</span>
            </div>
          </div>
        ))}
        {/* Gris libre (only up to limit) */}
        {todayEffort.gris > 0 && (
          <div 
            className={`h-full transition-all duration-500 rounded-full ${isNightMode ? 'bg-[#2a3654]' : 'bg-slate-200'}`}
            style={{ width: `${(todayEffort.gris / todayEffort.maxVal) * 100}%` }}
            title={`Capacidad libre: ${todayEffort.gris}h`}
          />
        )}
        {/* Excedente (Rayado rojo) */}
        {todayEffort.excedente > 0 && (
          <div 
            className="h-full bg-rose-500/20 transition-all duration-500 rounded-full"
            style={{ 
              width: `${(todayEffort.excedente / todayEffort.maxVal) * 100}%`,
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(244,63,94,0.5) 5px, rgba(244,63,94,0.5) 10px)'
            }}
            title={`Excedente: ${todayEffort.excedente}h`}
          />
        )}
      </div>
    </div>
  );
};

export default DailyEffortBar;
