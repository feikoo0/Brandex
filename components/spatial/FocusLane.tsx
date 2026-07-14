"use client";

import React from "react";
import { motion } from "framer-motion";
import { AlertCircle, Target, CheckCircle2, Check } from "lucide-react";
import type { Task, Worker } from "@/lib/types";
import { DONE_STATES } from "@/lib/constants";
import { useUpdateTask } from "@/hooks/useData";
import GlassPanel from "./GlassPanel";
import ChildTaskCard from "./ChildTaskCard";
import { cn } from "@/lib/utils";

interface FocusLaneProps {
  tasks: Task[];
  workers: Worker[];
}

// Helper to get delay impact message
function getDelayImpact(task: Task): string {
  if (task.prioridad === "Urgente") {
    return `Retrasa directamente el lanzamiento del entregable de ${task.formato || "Diseño"}`;
  }
  if (task.prioridad === "Alta") {
    return `Pone en riesgo el cronograma acordado de ${task.area || "COMMUNITY"}`;
  }
  return `Retrasa el cierre del sprint semanal del cliente`;
}

export default function FocusLane({ tasks, workers }: FocusLaneProps) {
  const updateTaskMut = useUpdateTask();

  // Get active (not done) tasks
  const activeTasks = tasks.filter((t) => !DONE_STATES.has(t.estado));

  // Determine top 3 "Must-Wins" based on urgency and priority
  const mustWins = React.useMemo(() => {
    return [...activeTasks]
      .sort((a, b) => {
        const prioWeight = { "Urgente": 4, "Alta": 3, "Media": 2, "Baja": 1 };
        const wA = prioWeight[a.prioridad as keyof typeof prioWeight] || 1;
        const wB = prioWeight[b.prioridad as keyof typeof prioWeight] || 1;
        return wB - wA; // highest priority first
      })
      .slice(0, 3);
  }, [activeTasks]);

  // Rest of tasks go to "Ambient Zone"
  const ambientTasks = React.useMemo(() => {
    const mustWinIds = new Set(mustWins.map((m) => m.id));
    return activeTasks.filter((t) => !mustWinIds.has(t.id));
  }, [activeTasks, mustWins]);

  const handleToggleComplete = (taskId: string) => {
    updateTaskMut.mutate({ id: taskId, estado: "Hecho" });
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4">
      {/* 1. Focus Lane (Must-Wins) */}
      <div className="flex-shrink-0">
        <div className="flex items-center gap-2 mb-2.5 select-none">
          <Target className="w-4 h-4 text-rose-500 animate-pulse" />
          <h3 className="text-xs font-black uppercase text-rose-400 tracking-wider">
            Focus Lane — Victorias del Día (Must-Wins)
          </h3>
          <span className="ml-auto text-[10px] font-bold text-neutral-500">
            Foco Máximo
          </span>
        </div>

        {mustWins.length === 0 ? (
          <GlassPanel className="p-5 flex flex-col items-center justify-center text-center bg-white/[0.01]">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2" />
            <p className="text-xs text-neutral-400 font-bold select-none">
              ¡Felicidades! Todas las victorias del día están completadas.
            </p>
          </GlassPanel>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {mustWins.map((task) => {
              const impact = getDelayImpact(task);
              const worker = workers.find((w) => task.asignado_ids?.includes(w.id));
              
              return (
                <GlassPanel
                  key={task.id}
                  glowColor="rgba(255, 45, 85, 0.08)"
                  className="p-4 relative border-rose-500/10 bg-rose-500/[0.01] hover:bg-rose-500/[0.03] transition-all group flex flex-col justify-between h-[115px]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase text-rose-400 tracking-wider">
                        {task.prioridad} · {task.area || "Diseño"}
                      </p>
                      <h4 className="text-xs font-black text-white truncate mt-0.5 group-hover:text-rose-300 transition-colors">
                        {task.titulo}
                      </h4>
                    </div>

                    <button
                      onClick={() => handleToggleComplete(task.id)}
                      className="w-5 h-5 rounded-md border border-rose-500/20 hover:border-rose-500/60 bg-transparent text-transparent flex items-center justify-center flex-shrink-0 transition-all hover:bg-rose-500/10 focus:outline-none"
                      title="Marcar como hecha"
                    >
                      <Check className="w-3 h-3 hover:text-rose-400" />
                    </button>
                  </div>

                  <div className="mt-2 text-[10px] select-none font-medium leading-tight">
                    <div className="text-rose-300/80 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{impact}</span>
                    </div>
                    {worker && (
                      <p className="text-neutral-500 text-[9px] uppercase tracking-wider font-extrabold mt-1">
                        Líder: {worker.nombre}
                      </p>
                    )}
                  </div>
                </GlassPanel>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Ambient Zone (Blurred backup tasks) */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex items-center gap-2 mb-2 select-none">
          <h3 className="text-xs font-black uppercase text-neutral-500 tracking-wider">
            Ambient Zone — Tareas del Mañana
          </h3>
          <span className="ml-auto text-[10px] font-bold text-neutral-500">
            {ambientTasks.length} pendientes
          </span>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5 backdrop-blur-[1px] opacity-60 hover:opacity-100 transition-all duration-300">
          {ambientTasks.length === 0 ? (
            <p className="text-xs text-neutral-600 font-medium py-4 text-center select-none">
              No hay más tareas en cola.
            </p>
          ) : (
            ambientTasks.map((task) => {
              const taskOwner = workers.find((w) => task.asignado_ids?.includes(w.id));
              return (
                <ChildTaskCard
                  key={task.id}
                  task={task}
                  owner={taskOwner}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
