"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Clock, AlertTriangle, Send } from "lucide-react";
import type { Task, Worker } from "@/lib/types";
import { useUpdateTask } from "@/hooks/useData";
import { DONE_STATES } from "@/lib/constants";
import LiquidTimeBar from "./LiquidTimeBar";
import { cn } from "@/lib/utils";

interface ChildTaskCardProps {
  task: Task;
  owner?: Worker;
  isMakerMode?: boolean;
}

// Helper to parse esfuerzo string into estimated hours
function parseEsfuerzoHours(esfuerzo: string): number {
  if (!esfuerzo) return 1; // default to 1h
  const s = esfuerzo.toLowerCase();
  if (s.includes("15 min") || s.includes("flash")) return 0.25;
  if (s.includes("30 min") || s.includes("corto")) return 0.5;
  if (s.includes("1 h") || s.includes("medio")) return 1;
  if (s.includes("2 h") || s.includes("largo")) return 2;
  if (s.includes("3 h") || s.includes("maratón")) return 3;
  
  // Try to regex parse e.g. "4 h" or "4h"
  const match = s.match(/(\d+)\s*h/);
  if (match) return parseInt(match[1]);
  return 1;
}

export default function ChildTaskCard({
  task,
  owner,
  isMakerMode = false,
}: ChildTaskCardProps) {
  const updateTaskMut = useUpdateTask();
  const [notifiedCEO, setNotifiedCEO] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const isDone = DONE_STATES.has(task.estado);
  const estimatedHours = parseEsfuerzoHours(task.esfuerzo);
  const spentHours = (task.tiempoRealMins || 0) / 60;
  const isExceeded = spentHours > estimatedHours && !isDone;

  const handleToggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent expanding/collapsing parent project
    const nextState = isDone ? "Pendiente" : "Hecho";
    updateTaskMut.mutate({ id: task.id, estado: nextState });
  };

  const handleNotifyCEO = (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent expanding/collapsing parent project
    setNotifiedCEO(true);
    // Auto reset after 3 seconds
    setTimeout(() => setNotifiedCEO(false), 3000);
  };

  return (
    <div
      id={`child-task-${task.id}`}
      onClick={() => setIsExpanded(!isExpanded)}
      className={cn(
        "relative p-3.5 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] transition-all cursor-pointer z-10 flex flex-col gap-2.5",
        isDone && "opacity-60"
      )}
    >
      {/* Level 1: Row Scan */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Custom Checkbox */}
          <button
            onClick={handleToggleComplete}
            className={cn(
              "w-5 h-5 rounded-md border flex items-center justify-center transition-all focus:outline-none flex-shrink-0",
              isDone
                ? "bg-blue-600/30 border-blue-500 text-blue-400"
                : "border-white/20 hover:border-white/40 bg-transparent text-transparent"
            )}
          >
            <motion.div
              initial={false}
              animate={{ scale: isDone ? 1 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <Check className="w-3.5 h-3.5 stroke-[3px]" />
            </motion.div>
          </button>

          {/* Title */}
          <div className="min-w-0">
            <h4 className={cn("text-xs font-bold text-white tracking-wide truncate", isDone && "line-through text-white/50")}>
              {task.titulo}
            </h4>
            <p className="text-[10px] text-neutral-500 font-semibold uppercase mt-0.5">
              {task.formato || "General"} · {task.area || "Diseño"}
            </p>
          </div>
        </div>

        {/* Right side: Badge / Info */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isExceeded && (
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
          )}
          {owner && (
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center border border-white/10" title={owner.nombre}>
              <span className="text-[10px] font-black text-white">
                {owner.nombre[0].toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Level 2: Effort / Time progression (Always visible unless done to save vertical space) */}
      {!isDone && (
        <div onClick={(e) => e.stopPropagation()}>
          <LiquidTimeBar
            estimatedHours={estimatedHours}
            spentHours={spentHours}
            showLabels={isExpanded}
            className="mt-1"
          />
        </div>
      )}

      {/* Level 3: Expanded Detail */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden border-t border-white/[0.04] pt-2.5 mt-1 text-[11px] text-neutral-400 space-y-2 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {task.contenido && (
              <div className="bg-white/[0.02] p-2 rounded-lg border border-white/[0.03]">
                <p className="text-white/80 leading-relaxed font-medium">{task.contenido}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <span className="text-neutral-500">Entrega:</span>{" "}
                <span className="text-neutral-300 font-bold">{task.fechaEntrega || "Sin fecha"}</span>
              </div>
              <div>
                <span className="text-neutral-500">Prioridad:</span>{" "}
                <span className={cn(
                  "font-bold",
                  task.prioridad === "Urgente" ? "text-rose-400" :
                  task.prioridad === "Alta" ? "text-orange-400" : "text-neutral-300"
                )}>{task.prioridad}</span>
              </div>
            </div>

            {/* Contextual Action Button */}
            {isExceeded && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleNotifyCEO}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                    notifiedCEO
                      ? "bg-emerald-600 text-white"
                      : "bg-rose-600/20 text-rose-400 hover:bg-rose-600/35 border border-rose-500/10"
                  )}
                >
                  <Send className="w-3 h-3" />
                  <span>{notifiedCEO ? "CEO Notificado" : "Notificar al CEO"}</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
