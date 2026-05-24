"use client";

import { useMemo } from "react";
import { useData } from "@/hooks/useData";
import { DONE_STATES } from "@/lib/constants";
import { Clock, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

function parseLocalDate(s: string): Date {
  if (!s) return new Date();
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function RecentActivity() {
  const { data } = useData();

  const upcomingDeliveries = useMemo(() => {
    if (!data) return [];
    
    const today = new Date();
    today.setHours(0,0,0,0);

    const upcoming = data.proyectos
      .filter(p => !DONE_STATES.has(p.estadoProyecto) && p.fechaFin)
      .map(p => {
        const date = parseLocalDate(p.fechaFin);
        const days = differenceInDays(date, today);
        return {
          ...p,
          date,
          daysLeft: days
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5); // top 5 upcoming

    return upcoming;
  }, [data]);

  return (
    <div className="p-2 h-full flex flex-col relative overflow-hidden group">
      {/* Background Glow */}
      <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-purple-500/5 rounded-full blur-[60px] group-hover:bg-purple-500/10 transition-all duration-700" />
      
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-purple-400">
          <CalendarDays className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-black text-white">Actividad</h3>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Próximas Entregas</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-3 relative z-10">
        {upcomingDeliveries.length === 0 && (
           <p className="text-xs text-white/30 text-center italic mt-10">No hay entregas próximas programadas.</p>
        )}

        {upcomingDeliveries.map(p => (
          <div key={p.id} className="flex gap-4">
            <div className="flex flex-col items-center mt-1">
              <div className={cn(
                "w-2 h-2 rounded-full",
                p.daysLeft < 0 ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" :
                p.daysLeft === 0 ? "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" :
                "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]"
              )} />
              <div className="w-[1px] h-full bg-white/10 mt-1" />
            </div>
            
            <div className="flex-1 pb-3">
              <div className="flex justify-between items-start">
                <p className="text-xs font-black text-white/90 truncate max-w-[150px]">{p.nombre}</p>
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                  p.daysLeft < 0 ? "bg-red-500/10 text-red-400" :
                  p.daysLeft === 0 ? "bg-orange-500/10 text-orange-400" :
                  "bg-white/5 text-white/40"
                )}>
                  {p.daysLeft < 0 ? "Atrasado" : p.daysLeft === 0 ? "Hoy" : `En ${p.daysLeft}d`}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-white/30">
                <Clock className="w-3 h-3" />
                <span className="text-[10px] font-bold capitalize">
                  {format(p.date, "MMM dd", { locale: es })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
