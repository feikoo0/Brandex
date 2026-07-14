"use client";

import React, { useMemo } from "react";
import GlassPanel from "./GlassPanel";
import { Zap, Calendar, MessageSquare, Code } from "lucide-react";
import type { Task } from "@/lib/types";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface TensionMapProps {
  tasks: Task[];
}

interface DayData {
  name: string;
  dateStr: string;
  meetings: number;
  deliveries: number;
  tensionScore: number; // 0 to 10
  energyType: "production" | "meetings" | "balanced";
}

export default function TensionMap({ tasks }: TensionMapProps) {
  const weekDays = useMemo(() => {
    const today = new Date();
    // Get start of current week (Monday)
    const monday = startOfWeek(today, { weekStartsOn: 1 });
    
    const days: DayData[] = [];
    
    for (let i = 0; i < 5; i++) {
      const currentDay = addDays(monday, i);
      const dateStr = format(currentDay, "yyyy-MM-dd");
      const name = format(currentDay, "EEEE", { locale: es });
      
      // Filter tasks assigned or scheduled for this day
      const dayTasks = tasks.filter((t) => {
        if (!t.fechaEntrega) return false;
        try {
          return isSameDay(parseISO(t.fechaEntrega), currentDay);
        } catch (e) {
          return false;
        }
      });

      // Count meetings (tasks involving calls, meetings, client feedback briefs)
      const meetings = dayTasks.filter((t) => {
        const title = t.titulo.toLowerCase();
        return title.includes("reunion") || title.includes("llamada") || title.includes("kickoff") || title.includes("levantamiento") || title.includes("brief");
      }).length;

      // Count production deliverables
      const deliveries = dayTasks.length - meetings;

      // Calculate tension score
      // meetings increase tension heavily (red/orange energy)
      // deliveries increase production focus (blue/cyan energy)
      const tensionScore = Math.min((meetings * 2.5) + (deliveries * 1.0), 10);

      // Determine energy type
      let energyType: DayData["energyType"] = "balanced";
      if (meetings > deliveries) {
        energyType = "meetings";
      } else if (deliveries > 0 && meetings === 0) {
        energyType = "production";
      }

      days.push({
        name: name.substring(0, 3).toUpperCase(),
        dateStr: format(currentDay, "dd MMM"),
        meetings,
        deliveries,
        tensionScore,
        energyType,
      });
    }

    return days;
  }, [tasks]);

  return (
    <GlassPanel className="p-4 flex flex-col min-h-[170px] bg-white/[0.01]">
      <div className="flex items-center gap-2 mb-3 select-none">
        <Zap className="w-4 h-4 text-amber-500 animate-pulse" />
        <h3 className="text-xs font-black uppercase text-white tracking-wider">
          Mapa de Tensión Semanal
        </h3>
        <span className="ml-auto text-[10px] font-bold text-neutral-500">
          Planificador de Energía
        </span>
      </div>

      {/* Week row */}
      <div className="grid grid-cols-5 gap-2.5 flex-1">
        {weekDays.map((day) => {
          // Heat colors:
          // Production -> Cyan/Blue glow
          // Meetings -> Red/Orange glow
          // Balanced/Low tension -> Subtle neutral glow
          let glowClass = "border-white/[0.04] bg-white/[0.01]";
          let energyLabel = "Producción";
          let energyIcon = <Code className="w-3.5 h-3.5 text-cyan-400" />;
          
          if (day.energyType === "meetings") {
            glowClass = "border-rose-500/10 bg-rose-500/[0.02] hover:bg-rose-500/[0.04]";
            energyLabel = "Reuniones";
            energyIcon = <MessageSquare className="w-3.5 h-3.5 text-rose-400" />;
          } else if (day.energyType === "production") {
            glowClass = "border-blue-500/10 bg-blue-500/[0.02] hover:bg-blue-500/[0.04]";
            energyLabel = "Diseño Puro";
            energyIcon = <Code className="w-3.5 h-3.5 text-blue-400" />;
          } else if (day.tensionScore > 5) {
            glowClass = "border-amber-500/10 bg-amber-500/[0.02] hover:bg-amber-500/[0.04]";
            energyLabel = "Carga Alta";
            energyIcon = <Zap className="w-3.5 h-3.5 text-amber-400" />;
          }

          return (
            <div
              key={day.name}
              className={cn(
                "rounded-xl border p-2.5 flex flex-col justify-between transition-all select-none text-center cursor-help relative group",
                glowClass
              )}
              title={`${day.meetings} reuniones, ${day.deliveries} entregables. Carga: ${Math.round(day.tensionScore * 10)}%`}
            >
              {/* Day title */}
              <div>
                <p className="text-[10px] font-black text-white/90">{day.name}</p>
                <p className="text-[9px] text-neutral-500 font-bold mt-0.5">{day.dateStr}</p>
              </div>

              {/* Energy Badge */}
              <div className="flex flex-col items-center gap-1.5 mt-2">
                {energyIcon}
                <span className="text-[8px] font-black uppercase text-neutral-400 scale-90 group-hover:scale-95 transition-transform">
                  {energyLabel}
                </span>
              </div>

              {/* Energy Heat Scale bar */}
              <div className="w-full h-1 rounded-full bg-white/[0.05] overflow-hidden mt-2">
                <div
                  className={cn(
                    "h-full rounded-full",
                    day.energyType === "meetings" ? "bg-rose-500" :
                    day.energyType === "production" ? "bg-blue-500" : "bg-neutral-500"
                  )}
                  style={{ width: `${Math.max(day.tensionScore * 10, 10)}%` }}
                />
              </div>

              {/* Specular light hover */}
              <div className="absolute inset-0 pointer-events-none rounded-xl border border-white/[0.06] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          );
        })}
      </div>
    </GlassPanel>
  );
}
