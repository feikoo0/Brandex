"use client";

import React, { useState } from "react";
import GlassPanel from "./GlassPanel";
import { AlertCircle, Send, CheckCircle2, MessageSquare } from "lucide-react";
import type { Task, Client } from "@/lib/types";
import { cn } from "@/lib/utils";

interface FrictionTrackerProps {
  tasks: Task[];
  clients: Client[];
}

interface BottleneckItem {
  task: Task;
  clientName: string;
  hoursStuck: number;
}

export default function FrictionTracker({ tasks, clients }: FrictionTrackerProps) {
  const [nudgedTasks, setNudgedTasks] = useState<Record<string, boolean>>({});

  // Filter tasks that are stuck in "Revision" or similar states
  const bottlenecks = React.useMemo(() => {
    const list: BottleneckItem[] = [];
    
    // States that represent waiting on client approval
    const stuckStates = new Set(["Revision", "Por publicar", "Modificar"]);

    tasks.forEach((t) => {
      if (stuckStates.has(t.estado)) {
        const client = clients.find((c) => t.cliente_ids?.includes(c.id));
        const clientName = client ? client.nombre : "Sin Cliente";
        
        // Simulate stuck hours (e.g. between 48 and 120 hours based on task ID character codes)
        const codeSum = t.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const hoursStuck = 48 + (codeSum % 72); // 48h to 120h

        list.push({
          task: t,
          clientName,
          hoursStuck,
        });
      }
    });

    // Sort by hours stuck (descending)
    return list.sort((a, b) => b.hoursStuck - a.hoursStuck).slice(0, 3);
  }, [tasks, clients]);

  const handleNudge = (taskId: string, clientName: string, format: string) => {
    setNudgedTasks((prev) => ({ ...prev, [taskId]: true }));
    
    // Simulate auto-reset nudge state after 3 seconds
    setTimeout(() => {
      setNudgedTasks((prev) => ({ ...prev, [taskId]: false }));
    }, 3000);
  };

  return (
    <GlassPanel className="p-4 flex flex-col flex-1 min-h-0 bg-white/[0.01]">
      <div className="flex items-center gap-2 mb-3 select-none">
        <AlertCircle className="w-4 h-4 text-rose-500 animate-pulse" />
        <h3 className="text-xs font-black uppercase text-white tracking-wider">
          Tracker de Fricción (Bottlenecks)
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5">
        {bottlenecks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-3 select-none">
            <CheckCircle2 className="w-7 h-7 text-emerald-500 mb-1.5" />
            <p className="text-[10px] text-neutral-500 font-bold">
              Cero fricciones. Ninguna pieza congelada en aprobación de cliente.
            </p>
          </div>
        ) : (
          bottlenecks.map(({ task, clientName, hoursStuck }) => {
            const isNudged = nudgedTasks[task.id];
            
            return (
              <div
                key={task.id}
                className={cn(
                  "p-2.5 rounded-xl border flex items-center justify-between gap-3 bg-black/40 transition-all",
                  isNudged ? "border-emerald-600/30" : "border-white/[0.04] hover:border-white/[0.08]"
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 select-none">
                    <span className="text-[9px] font-black uppercase bg-rose-600/20 text-rose-400 border border-rose-500/10 px-1.5 py-0.5 rounded-md">
                      {hoursStuck}h atascado
                    </span>
                    <span className="text-[10px] font-extrabold text-neutral-400 truncate uppercase">
                      {clientName}
                    </span>
                  </div>
                  <h4 className="text-[11px] font-bold text-white truncate mt-1">
                    {task.titulo}
                  </h4>
                </div>

                <button
                  onClick={() => handleNudge(task.id, clientName, task.formato)}
                  disabled={isNudged}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all focus:outline-none flex-shrink-0 border",
                    isNudged
                      ? "bg-emerald-600/20 border-emerald-500/30 text-emerald-400"
                      : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.1] text-neutral-300 hover:text-white"
                  )}
                  title="Enviar recordatorio automático"
                >
                  {isNudged ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 animate-bounce" />
                      <span>Nudged</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3 h-3" />
                      <span>Nudge</span>
                    </>
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>
    </GlassPanel>
  );
}
