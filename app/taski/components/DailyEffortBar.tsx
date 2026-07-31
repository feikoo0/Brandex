"use client";

import React from "react";

export interface TodayEffortTask {
  id: string | number;
  title: string;
  hours: number;
  isCompleted?: boolean;
  executedMins?: number;
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
  allTodayTasks?: TodayEffortTask[];
  realExecutedHours?: number;
}

export interface DailyEffortBarProps {
  todayEffort: TodayEffortData;
  limiteHorasDia?: number;
  setLimiteHorasDia?: (value: number) => void;
  isNightMode: boolean;
}

export const DailyEffortBar: React.FC<DailyEffortBarProps> = ({
  todayEffort,
  isNightMode,
}) => {
  const tasksToRender: TodayEffortTask[] = todayEffort.allTodayTasks ?? [
    ...todayEffort.tasksVerde.map(t => ({ ...t, isCompleted: true })),
    ...todayEffort.tasksNaranja.map(t => ({ ...t, isCompleted: false }))
  ];

  const totalHours = tasksToRender.reduce((sum, t) => sum + (t.hours || 0), 0);

  // Calcula las horas y minutos restantes netos descontando los minutos ejecutados de las tareas pendientes
  const rawRemainingMins = tasksToRender.reduce((sum, t) => {
    if (t.isCompleted) return sum;
    const estMins = (t.hours || 0) * 60;
    const execMins = t.executedMins || 0;
    const leftMins = Math.max(0, estMins - execMins);
    return sum + leftMins;
  }, 0);

  const remH = Math.floor(rawRemainingMins / 60);
  const remM = rawRemainingMins % 60;

  let remainingText = "0min";
  if (remH > 0 && remM > 0) {
    remainingText = `${remH}h ${remM}min`;
  } else if (remH > 0 && remM === 0) {
    remainingText = `${remH}h`;
  } else if (remH === 0 && remM > 0) {
    remainingText = `${remM}min`;
  }

  // Calcula el avance real acumulado en sesiones trabajadas
  const totalExecutedMins = tasksToRender.reduce((sum, t) => {
    if (t.isCompleted) {
      const estMins = (t.hours || 0) * 60;
      return sum + Math.max(estMins, t.executedMins || 0);
    }
    return sum + (t.executedMins || 0);
  }, 0);

  const execH = Math.floor(totalExecutedMins / 60);
  const execM = totalExecutedMins % 60;
  
  let executedText = "0min de avance";
  if (execH > 0 && execM > 0) {
    executedText = `${execH}h ${execM}min de avance`;
  } else if (execH > 0 && execM === 0) {
    executedText = `${execH}h de avance`;
  } else if (execH === 0 && execM > 0) {
    executedText = `${execM}min de avance`;
  }

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Encabezado limpio: horas y minutos restantes hoy y avance abajo */}
      <div className="flex flex-col gap-0.5">
        <div className={`tracking-tight flex items-baseline gap-2 ${isNightMode ? 'text-white' : 'text-slate-900'}`}>
          {totalHours === 0 ? (
            <span className={`text-sm font-bold ${isNightMode ? 'text-white/50' : 'text-slate-500'}`}>Sin tareas para hoy</span>
          ) : rawRemainingMins === 0 ? (
            <span className={`text-[18px] font-black ${isNightMode ? 'text-emerald-400' : 'text-emerald-600'}`}>¡Día completado! (0min por terminar)</span>
          ) : (
            <>
              <span className={`text-[24px] font-black leading-none ${isNightMode ? 'text-white' : 'text-slate-900'}`}>{remainingText}</span>
              <span className={`text-[14px] font-bold ${isNightMode ? 'text-white/70' : 'text-slate-600'}`}>para terminar hoy</span>
            </>
          )}
        </div>

        {totalHours > 0 && (
          <div className={`text-[11px] font-semibold ${isNightMode ? 'text-white/50' : 'text-slate-500'}`}>
            {executedText}
          </div>
        )}
      </div>

      {/* Barra de Progreso dividida proporcionalmente según las tareas de hoy */}
      <div className={`w-full h-3 flex gap-1 relative p-0.5 rounded-full border ${
        isNightMode ? 'bg-white/5 border-white/5' : 'bg-slate-200/80 border-slate-300/60'
      }`}>
        {totalHours === 0 ? (
          <div className={`w-full h-full rounded-full ${isNightMode ? 'bg-white/5' : 'bg-slate-200'}`} />
        ) : (
          tasksToRender.map((tk, idx) => {
            const isDone = tk.isCompleted ?? false;
            const pct = totalHours > 0 ? (tk.hours / totalHours) * 100 : 0;
            const totalMins = Math.max(1, (tk.hours || 0) * 60);
            const execMins = tk.executedMins || 0;

            // Relleno progresivo según las sesiones ejecutadas
            const fillRatio = isDone ? 1 : Math.min(1, execMins / totalMins);

            // Excedente de tiempo por sobrepasar las horas planeadas (Capa roja)
            const hasExcess = execMins > totalMins;
            const excessMins = hasExcess ? execMins - totalMins : 0;
            const excessRatio = Math.min(1, excessMins / totalMins);

            return (
              <div 
                key={`tk-${tk.id}-${idx}`}
                className="h-full relative group/segment cursor-default"
                style={{ width: `${pct}%` }}
              >
                {/* Pista y Relleno interno adaptativo para Modo Claro / Modo Oscuro */}
                <div className={`w-full h-full rounded-full overflow-hidden p-[0.5px] border relative ${
                  isNightMode ? 'bg-white/20 border-white/5' : 'bg-slate-300/70 border-slate-400/20'
                }`}>
                  {/* Base de tiempo planeado */}
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isNightMode 
                        ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]' 
                        : 'bg-slate-900 shadow-[0_0_6px_rgba(15,23,42,0.3)]'
                    }`}
                    style={{ width: `${fillRatio * 100}%` }}
                  />

                  {/* Capa de relleno rojo por tiempo excedido sobre el planeado */}
                  {hasExcess && (
                    <div 
                      className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${
                        isNightMode 
                          ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]' 
                          : 'bg-rose-600 shadow-[0_0_6px_rgba(225,29,72,0.4)]'
                      }`}
                      style={{ width: `${excessRatio * 100}%` }}
                    />
                  )}
                </div>

                {/* Tooltip informativo adaptativo al pasar el cursor */}
                <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-xl shadow-xl opacity-0 scale-90 group-hover/segment:opacity-100 group-hover/segment:scale-100 pointer-events-none transition-all duration-150 z-[100] whitespace-nowrap text-[12px] font-bold flex items-center gap-2 ${
                  isNightMode ? 'bg-zinc-900 text-white' : 'bg-white text-slate-900 border border-slate-200/80 shadow-2xl'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${hasExcess ? 'bg-rose-500' : fillRatio >= 1 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span>{tk.title}</span>
                  <span className={`font-semibold text-[9px] ${isNightMode ? 'opacity-60' : 'text-slate-500'}`}>
                    ({execMins > 0 ? `${Math.floor(execMins / 60) > 0 ? `${Math.floor(execMins / 60)}h ` : ''}${execMins % 60 > 0 ? `${execMins % 60}m ` : ''}/ ` : ''}{tk.hours}h {hasExcess ? `· Excedido (+${Math.floor(excessMins / 60) > 0 ? `${Math.floor(excessMins / 60)}h ` : ''}${excessMins % 60 > 0 ? `${excessMins % 60}m` : ''})` : isDone ? '· Completada' : fillRatio > 0 ? `· ${Math.round(fillRatio * 100)}%` : '· Pendiente'})
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DailyEffortBar;
