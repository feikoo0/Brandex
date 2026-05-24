"use client";

import { useMemo } from "react";
import { useData } from "@/hooks/useData";
import { DONE_STATES } from "@/lib/constants";
import { Calendar, ArrowRight } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/store";

function parseLocalDate(s: string): Date {
  if (!s) return new Date();
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function UpcomingDeliveries() {
  const { data } = useData();
  const setTab = useUIStore(s => s.setTab);

  const upcoming = useMemo(() => {
    if (!data) return [];
    const today = new Date(); today.setHours(0,0,0,0);
    
    return data.proyectos
      .filter(p => !DONE_STATES.has(p.estadoProyecto) && p.fechaFin)
      .map(p => {
        const date = parseLocalDate(p.fechaFin);
        return {
          ...p,
          date,
          daysLeft: differenceInDays(date, today)
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 4); // Show up to 4 items in the horizontal bar
  }, [data]);

  if (upcoming.length === 0) return null;

  return (
    <div className="w-full py-4 flex flex-col md:flex-row items-center gap-6">
      <div className="flex-shrink-0 min-w-[150px] pl-4">
        <h3 className="text-[10px] font-black dark:text-white/40 text-black/40 uppercase tracking-widest">
          Próximas Entregas
        </h3>
      </div>

      <div className="flex-1 flex items-center justify-start gap-8 overflow-x-auto custom-scrollbar">
        {upcoming.map((p, i) => (
          <div key={p.id} className="flex items-center gap-3 min-w-[200px] flex-shrink-0">
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center border",
              i === 0 ? "bg-green-500/10 border-green-500/20 text-green-500" :
              i === 1 ? "bg-purple-500/10 border-purple-500/20 text-purple-500" :
              "bg-orange-500/10 border-orange-500/20 text-orange-500"
            )}>
              <Calendar className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black dark:text-white text-gray-900 truncate max-w-[150px]">
                {p.nombre}
              </span>
              <span className="text-[10px] font-bold dark:text-white/40 text-gray-500 truncate max-w-[150px]">
                {p.descripcion || "Entrega de proyecto"}
              </span>
            </div>
            <span className="ml-4 text-[11px] font-black dark:text-white/60 text-gray-600">
              {format(p.date, "d MMM", { locale: es })}
            </span>
          </div>
        ))}
      </div>

      <div className="flex-shrink-0 pr-4">
        <button 
          onClick={() => setTab("calendario")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl dark:bg-white/5 bg-black/5 dark:text-white/80 text-black/80 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-[10px] font-black uppercase tracking-widest"
        >
          <Calendar className="w-3.5 h-3.5" />
          Ver calendario completo
          <ArrowRight className="w-3 h-3 ml-1" />
        </button>
      </div>
    </div>
  );
}
