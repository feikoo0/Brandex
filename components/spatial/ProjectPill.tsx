"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, DollarSign, Layers, ChevronDown, AlertCircle, Trash2 } from "lucide-react";
import type { Project, Task, Client, Worker } from "@/lib/types";
import { useUIStore } from "@/lib/store";
import { DONE_STATES } from "@/lib/constants";
import TiltCard from "./TiltCard";
import ChildTaskCard from "./ChildTaskCard";
import LiquidTimeBar from "./LiquidTimeBar";
import DependencyTree from "./DependencyTree";
import { cn } from "@/lib/utils";
import { differenceInDays, isBefore, parseISO, format } from "date-fns";

interface ProjectPillProps {
  project: Project;
  allTasks: Task[];
  clients: Client[];
  workers: Worker[];
  role: string | null;
}

export default function ProjectPill({
  project,
  allTasks,
  clients,
  workers,
  role,
}: ProjectPillProps) {
  const { expandedProjectId, setExpandedProject, scratchpadPins, removePin } = useUIStore();
  const projectPins = scratchpadPins.filter((p) => p.projectId === project.id);
  const [isHovered, setIsHovered] = useState(false);
  const [isBlooming, setIsBlooming] = useState(false);

  const isExpanded = expandedProjectId === project.id;

  // Filter tasks belonging to this project
  const projectTasks = allTasks.filter((t) => t.proyecto_ids?.includes(project.id) || project.tarea_ids?.includes(t.id));
  const totalTasks = projectTasks.length;
  const completedTasks = projectTasks.filter((t) => DONE_STATES.has(t.estado)).length;
  
  // Calculate completion percentage
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Find client name
  const client = clients.find((c) => project.cliente_ids?.includes(c.id));
  const clientName = client ? client.nombre : "Sin Cliente";

  // Parse dates and determine if overdue
  let isOverdue = false;
  let daysDiffText = "";
  if (project.fechaFin) {
    try {
      const dueDate = parseISO(project.fechaFin);
      const today = new Date();
      isOverdue = isBefore(dueDate, today) && project.estadoProyecto !== "✅ Completado" && project.estadoProyecto !== "Completado";
      const diff = Math.abs(differenceInDays(today, dueDate));
      daysDiffText = isOverdue ? `Vencido (${diff}d)` : `${diff}d restantes`;
    } catch (e) {
      // invalid date
    }
  }

  // Determine health semaphore color (dot in corner)
  // Red = overdue or Urgent and low progress. Yellow = behind. Green = normal.
  let healthColor = "bg-emerald-500";
  if (isOverdue) {
    healthColor = "bg-rose-500";
  } else if (project.prioridad === "🔥 U R G E N T E 🔥" || project.prioridad === "⚠️IMPORTANTE") {
    healthColor = progressPercent < 40 ? "bg-amber-500" : "bg-emerald-500";
  }

  // Handle click to expand (Bloom effect)
  const handleToggleExpand = () => {
    if (!isExpanded) {
      setIsBlooming(true);
      setExpandedProject(project.id);
    } else {
      setExpandedProject(null);
    }
  };

  // Reset bloom state after animation duration
  useEffect(() => {
    if (isBlooming) {
      const timer = setTimeout(() => setIsBlooming(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isBlooming]);

  // Aggregate project hours
  const totalEstHours = projectTasks.reduce((acc, t) => {
    const s = t.esfuerzo?.toLowerCase() || "";
    if (s.includes("15 min")) return acc + 0.25;
    if (s.includes("30 min")) return acc + 0.5;
    if (s.includes("1 h")) return acc + 1;
    if (s.includes("2 h")) return acc + 2;
    if (s.includes("3 h")) return acc + 3;
    return acc + 1; // default
  }, 0);

  const totalSpentHours = projectTasks.reduce((acc, t) => acc + (t.tiempoRealMins || 0) / 60, 0);

  return (
    <div
      id={`project-pill-${project.id}`}
      className="relative w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <TiltCard
        glowColor={
          isExpanded
            ? "rgba(50, 210, 245, 0.15)"
            : isHovered
            ? "rgba(58, 123, 213, 0.1)"
            : undefined
        }
        maxTilt={isExpanded ? 0 : 5} // Disable tilt when fully expanded for easy interaction
        onClick={handleToggleExpand}
        className={cn(
          "p-4 transition-all duration-300 relative select-none",
          isBlooming && "animate-bloom-flash",
          isExpanded ? "border-white/10 bg-white/[0.04]" : "border-white/[0.04] bg-white/[0.01]"
        )}
      >
        {/* Level 1: Pill Scan (Header Row) */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Health Semaphore dot */}
            <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse", healthColor)} />
            
            <div className="min-w-0">
              <h3 className="text-sm font-black text-white tracking-wide truncate">
                {project.nombre}
              </h3>
              <p className="text-[10px] text-neutral-500 font-extrabold uppercase mt-0.5 tracking-wider">
                {clientName} · {project.area || "Diseño/Web"}
              </p>
            </div>
          </div>

          {/* Right Corner stats (Micro-states) */}
          <div className="flex items-center gap-3 text-right flex-shrink-0">
            <div className="text-[10px] font-black tracking-wider text-neutral-500">
              <span className={cn(isOverdue ? "text-rose-400" : "text-neutral-400")}>
                {daysDiffText || project.estadoProyecto || "Activo"}
              </span>
            </div>
            <div className="w-12 h-6 rounded-md bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
              <span className="text-[10px] font-black text-cyan-400">
                {progressPercent}%
              </span>
            </div>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-neutral-500 transition-transform duration-300",
                isExpanded && "rotate-180 text-white"
              )}
            />
          </div>
        </div>

        {/* Level 2: Hover/Reveal Info */}
        <AnimatePresence>
          {(isHovered || isExpanded) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-3.5 pt-3.5 border-t border-white/[0.05] overflow-hidden"
            >
              {/* Short description */}
              {project.descripcion && (
                <p className="text-xs text-neutral-400 font-medium mb-3 leading-relaxed">
                  {project.descripcion}
                </p>
              )}

              {/* Progress and Estimated/Real efforts */}
              {projectTasks.length > 0 && (
                <div className="mb-3" onClick={(e) => e.stopPropagation()}>
                  <LiquidTimeBar
                    estimatedHours={totalEstHours}
                    spentHours={totalSpentHours}
                    showLabels={true}
                  />
                </div>
              )}

              <div className="flex items-center gap-4 text-[10px] text-neutral-500 font-semibold uppercase">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {project.fechaInicio ? format(parseISO(project.fechaInicio), "dd MMM") : "Inicio"} -{" "}
                    {project.fechaFin ? format(parseISO(project.fechaFin), "dd MMM") : "Fin"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  <span>
                    {completedTasks}/{totalTasks} Tareas
                  </span>
                </div>
                {role === "admin" && project.costo > 0 && (
                  <div className="flex items-center gap-0.5 text-emerald-400 font-black">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>{project.costo.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Level 3: Expanded bloom panel (Tasks List) */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="overflow-hidden mt-4 pt-4 border-t border-white/[0.08]"
              onClick={(e) => e.stopPropagation()} // Click here doesn't toggle project
            >
              {/* Pinned references / notes from Scratchpad */}
              {projectPins.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-[10px] font-black uppercase text-cyan-400 tracking-wider mb-2 flex items-center gap-1.5 select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    Referencias y Pines
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {projectPins.map((pin) => (
                      <div
                        key={pin.id}
                        className="p-2.5 rounded-xl border border-cyan-500/10 bg-cyan-500/[0.02] text-xs text-neutral-300 relative flex justify-between gap-3 group"
                      >
                        <p className="font-medium leading-relaxed break-words flex-1 pr-4">
                          {pin.content}
                        </p>
                        <button
                          onClick={() => removePin(pin.id)}
                          className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 text-neutral-500 hover:text-rose-400 transition-opacity"
                          title="Despinear"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <h4 className="text-xs font-black uppercase text-neutral-400 tracking-wider mb-3">
                Tareas del Proyecto
              </h4>
              
              {projectTasks.length === 0 ? (
                <p className="text-xs text-neutral-600 font-medium py-3 text-center">
                  No hay tareas registradas en este proyecto.
                </p>
              ) : (
                <div className="relative pl-6 py-2 flex flex-col gap-3 min-h-[100px]">
                  {/* SVG Connections Canvas */}
                  <DependencyTree
                    parentId={project.id}
                    childIds={projectTasks.map((t) => t.id)}
                  />

                  {/* Tasks Cards */}
                  {projectTasks.map((task) => {
                    const taskOwner = workers.find((w) => task.asignado_ids?.includes(w.id));
                    return (
                      <ChildTaskCard
                        key={task.id}
                        task={task}
                        owner={taskOwner}
                      />
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </TiltCard>
    </div>
  );
}
