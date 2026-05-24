"use client";

import { useMemo } from "react";
import { useData } from "@/hooks/useData";
import { DONE_STATES } from "@/lib/constants";
import { cn, parseEsfuerzoMins, avatarOf } from "@/lib/utils";
import { Users, ArrowRight } from "lucide-react";
import { useUIStore } from "@/lib/store";

export function TeamWorkload() {
  const { data } = useData();
  const openModal = useUIStore((s) => s.openModal);

  const workersStats = useMemo(() => {
    if (!data) return [];
    
    const workers = data.trabajadores.filter(w => w.rol !== "Admin");
    
    return workers.map(w => {
      const wTasks = data.tareas.filter(t => t.asignado_ids?.includes(w.id) && !DONE_STATES.has(t.estado));
      const totalMins = wTasks.reduce((s, t) => s + parseEsfuerzoMins(t.esfuerzo || ""), 0);
      
      // Assume 480 mins (8 hours) is 100% capacity
      const capacityPct = Math.round((totalMins / 480) * 100);
      
      let status: "green" | "yellow" | "red" = "green";
      let statusText = "Libre";
      if (capacityPct > 100) { status = "red"; statusText = "Sobrecargado"; }
      else if (capacityPct > 70) { status = "yellow"; statusText = "Alta"; }
      else if (capacityPct > 40) { status = "green"; statusText = "Normal"; }
      
      return {
        ...w,
        activeTasks: wTasks.length,
        hours: (totalMins / 60).toFixed(1),
        capacityPct,
        status,
        statusText
      };
    }).sort((a, b) => b.capacityPct - a.capacityPct); // Saturated first
    
  }, [data]);

  return (
    <div className="p-2 h-full flex flex-col relative overflow-hidden group">
      
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 dark:text-white/40 text-gray-500" />
          <h3 className="text-[10px] font-black dark:text-white/40 text-gray-500 uppercase tracking-widest">Equipo</h3>
        </div>
        <button className="text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-600 transition-colors flex items-center gap-1">
           Ver equipo →
         </button>
      </div>

      <p className="text-xs font-bold dark:text-white/40 text-gray-500 mb-4 px-1">Carga de trabajo</p>

      <div className="flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2 relative z-10">
        {workersStats.length === 0 && (
          <p className="text-xs dark:text-white/30 text-gray-400 text-center italic mt-10">Cargando equipo...</p>
        )}
        
        {workersStats.map(w => (
          <div 
            key={w.id}
            onClick={() => openModal({ type: 'worker', id: w.id })}
            className="flex items-center gap-4 cursor-pointer group/worker transition-all"
          >
            <div className="w-8 h-8 rounded-full dark:bg-white/10 bg-black/5 flex items-center justify-center text-[10px] font-black dark:text-white text-gray-800 flex-shrink-0">
              {avatarOf(w.nombre)}
            </div>
            
            <div className="flex flex-col w-[100px] flex-shrink-0">
              <span className="text-xs font-black dark:text-white text-gray-900 truncate group-hover/worker:text-emerald-500 transition-colors">{w.nombre.split(" ")[0]} {w.nombre.split(" ")[1] || ""}</span>
              <span className="text-[9px] font-bold dark:text-white/40 text-gray-500 uppercase tracking-widest truncate">{w.rol || "Talento"}</span>
            </div>

            <div className="flex-1 flex items-center gap-3">
               <div className="flex-1 h-1.5 dark:bg-white/5 bg-black/5 rounded-full overflow-hidden">
                 <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      w.status === "red" ? "bg-red-500" :
                      w.status === "yellow" ? "bg-orange-500" :
                      "bg-emerald-500"
                    )}
                    style={{ width: `${Math.min(w.capacityPct, 100)}%` }}
                 />
               </div>
               <span className="text-xs font-black w-8 text-right dark:text-white text-gray-900">{w.capacityPct}%</span>
               <span className={cn(
                 "text-[9px] font-bold uppercase tracking-widest w-[80px]",
                 w.status === "red" ? "text-red-500" :
                 w.status === "yellow" ? "text-orange-500" :
                 "text-emerald-500"
               )}>
                 {w.statusText}
               </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
