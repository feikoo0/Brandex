"use client";

import { useMemo, useState, useEffect } from "react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { useData, useUpdateTask } from "@/hooks/useData";
import { useQueryClient } from "@tanstack/react-query";
import { DONE_STATES } from "@/lib/constants";
import { Clock, Check, Flame, Target, Flag } from "lucide-react";
import { cn, parseEsfuerzoMins, avatarOf } from "@/lib/utils";
import { useDraggable } from "@dnd-kit/core";
import { useUIStore } from "@/lib/store";

function parseLocalDate(s: string): Date {
  if (!s) return new Date();
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Priority mapping for sorting
const PRIORITY_SCORE: Record<string, number> = {
  "Alta": 3,
  "Media": 2,
  "Baja": 1,
  "Ninguna": 0
};

export function TodayObjectives() {
  const { data } = useData();
  const updateTask = useUpdateTask();
  const qc = useQueryClient();
  const openModal = useUIStore(s => s.openModal);
  const isSmartMode = useUIStore(s => s.isSmartMode);

  const [focusPins, setFocusPins] = useState<Array<{ id: string; type: string }>>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("focus-pins") : null;
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  useEffect(() => {
    const refresh = () => {
      try {
        const raw = localStorage.getItem("focus-pins");
        setFocusPins(raw ? JSON.parse(raw) : []);
      } catch { setFocusPins([]); }
    };
    window.addEventListener("focus-pins-changed", refresh);
    return () => window.removeEventListener("focus-pins-changed", refresh);
  }, []);

  const focusData = useMemo(() => {
    if (!data) return null;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    let activeProject = null;

    const activeProjects = data.proyectos.filter(p => !DONE_STATES.has(p.estadoProyecto));

    if (!isSmartMode) {
      // MANUAL MODE: Use focus pins
      for (const pin of focusPins) {
        if (pin.type === "project") {
          const proj = activeProjects.find(p => p.id === pin.id);
          if (proj) {
            activeProject = proj;
            break;
          }
        }
      }
      if (!activeProject && activeProjects.length > 0) activeProject = activeProjects[0]; // fallback
    } else {
      // SMART MODE: Calculate Score
      if (activeProjects.length > 0) {
        let maxScore = -9999;
        
        for (const p of activeProjects) {
          let score = 0;
          const pTasks = data.tareas.filter(t => t.proyecto_ids?.includes(p.id) && !DONE_STATES.has(t.estado));
          
          if (p.fechaFin) {
            const daysLeft = differenceInDays(parseLocalDate(p.fechaFin), today);
            if (daysLeft < 0) score += 100; // Overdue project gets huge bump
            else if (daysLeft === 0) score += 50;
            else score += (30 - Math.min(daysLeft, 30)); // Closer gets more points
          }

          // Overdue tasks in project
          const overdueTasks = pTasks.filter(t => t.fechaEntrega && parseLocalDate(t.fechaEntrega) < today);
          score += (overdueTasks.length * 10);
          
          if (score > maxScore) {
            maxScore = score;
            activeProject = p;
          }
        }
      }
    }

    if (!activeProject) return null;

    // Get tasks for this project
    const pendingTasks = data.tareas.filter(t => t.proyecto_ids?.includes(activeProject.id) && !DONE_STATES.has(t.estado));
    
    // Sort tasks
    pendingTasks.sort((a, b) => {
      if (isSmartMode) {
        // SMART SORT: 1. Overdue, 2. Priority, 3. Date
        const aOverdue = a.fechaEntrega && parseLocalDate(a.fechaEntrega) < today ? 1 : 0;
        const bOverdue = b.fechaEntrega && parseLocalDate(b.fechaEntrega) < today ? 1 : 0;
        if (aOverdue !== bOverdue) return bOverdue - aOverdue;

        const aPri = PRIORITY_SCORE[a.prioridad] || 0;
        const bPri = PRIORITY_SCORE[b.prioridad] || 0;
        if (aPri !== bPri) return bPri - aPri;
      }
      
      // Default / fallback sort: by date
      const aDate = a.fechaEntrega || a.fechaProg || "9999-12-31";
      const bDate = b.fechaEntrega || b.fechaProg || "9999-12-31";
      return aDate.localeCompare(bDate);
    });

    const topTasks = pendingTasks.slice(0, 5);
    
    // Calculate progress and time for the project
    const allProjTasks = data.tareas.filter(t => t.proyecto_ids?.includes(activeProject.id));
    const totalMins = allProjTasks.reduce((s, t) => s + parseEsfuerzoMins(t.esfuerzo || ""), 0);
    const doneMins = allProjTasks.filter(t => DONE_STATES.has(t.estado)).reduce((s, t) => s + parseEsfuerzoMins(t.esfuerzo || ""), 0);
    const progressPct = totalMins > 0 ? Math.round((doneMins / totalMins) * 100) : 0;
    
    let projectHealth: "green" | "yellow" | "red" = "green";
    const projEnd = activeProject.fechaFin ? parseLocalDate(activeProject.fechaFin) : null;
    if (projEnd && projEnd < today) projectHealth = "red";
    else if (pendingTasks.some(t => t.fechaEntrega && parseLocalDate(t.fechaEntrega) < today)) projectHealth = "yellow";

    return {
      project: activeProject,
      tasks: topTasks,
      totalTasksCount: pendingTasks.length,
      progressPct,
      totalHours: (totalMins / 60).toFixed(1),
      doneHours: (doneMins / 60).toFixed(1),
      health: projectHealth
    };
  }, [data, focusPins, isSmartMode]);

  const handleCheckTask = async (taskId: string) => {
    const task = data?.tareas.find(t => t.id === taskId);
    if (!task) return;

    const isCurrentlyDone = DONE_STATES.has(task.estado);
    const newStatus = isCurrentlyDone ? "Por hacer" : "Hecho";

    const previousData = qc.getQueryData(["braindex-data"]);
    if (previousData) {
      qc.setQueryData(["braindex-data"], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          tareas: old.tareas.map((t: any) => t.id === taskId ? { ...t, estado: newStatus } : t)
        };
      });
    }

    try { 
      await updateTask.mutateAsync({ id: taskId, estado: newStatus }); 
      await qc.invalidateQueries({ queryKey: ["braindex-data"] });
    } catch (err) { 
      if (previousData) qc.setQueryData(["braindex-data"], previousData);
    }
  };

  if (!focusData) {
    return (
      <div className="dark:bg-[#121216]/60 bg-white border dark:border-white/5 border-black/5 rounded-[2.5rem] p-8 h-full flex flex-col items-center justify-center text-center shadow-2xl dark:shadow-none">
        <Target className="w-8 h-8 dark:text-white/10 text-black/10 mb-3" />
        <p className="text-sm font-black dark:text-white/30 text-black/30 uppercase tracking-widest">Sin Foco Activo</p>
      </div>
    );
  }

  return (
    <div className="dark:bg-[#0a1f16] bg-[#f0fdf4] border dark:border-emerald-500/20 border-emerald-500/30 rounded-[2.5rem] p-8 relative overflow-hidden group/foco shadow-2xl dark:shadow-none">
      {/* Background Glow */}
      <div className={cn(
        "absolute -left-20 -top-20 w-64 h-64 rounded-full blur-[100px] pointer-events-none transition-all duration-1000",
        focusData.health === "red" ? "bg-red-500/10" :
        focusData.health === "yellow" ? "bg-orange-500/10" :
        "bg-emerald-500/10"
      )} />

      <div className="flex flex-col lg:flex-row gap-8 relative z-10">
        
        {/* Left Side: Project Context & Stats */}
        <div className="lg:w-2/5 flex flex-col border-r dark:border-white/5 border-black/5 pr-8">
          <div className="flex items-center gap-2 mb-4">
             <span className="text-[10px] font-black uppercase tracking-widest dark:text-emerald-400/80 text-emerald-700">
               FOCO DEL DÍA {isSmartMode ? "(AUTO)" : "(MANUAL)"}
             </span>
          </div>

          <h2 
            className="text-3xl font-black dark:text-white text-gray-900 leading-tight tracking-tighter mb-2 cursor-pointer hover:text-emerald-500 transition-colors"
            onClick={() => openModal({ type: 'proyecto', id: focusData.project.id })}
          >
            {focusData.project.nombre}
          </h2>
          <div className="flex items-center gap-2 mb-8">
            <span className="text-[10px] font-bold dark:text-white/40 text-gray-500 line-clamp-1 max-w-[200px]">
              {focusData.project.descripcion || "Sin descripción"}
            </span>
            <span className={cn(
              "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
              focusData.health === "red" ? "bg-red-500/10 text-red-500 border-red-500/20" :
              focusData.health === "yellow" ? "bg-orange-500/10 text-orange-500 border-orange-500/20" :
              "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
            )}>
              {focusData.health === "red" ? "En Riesgo" : focusData.health === "yellow" ? "Atrasos" : "On Track"}
            </span>
          </div>

          <div className="mt-auto grid grid-cols-3 gap-4">
            {/* Progress */}
            <div className="col-span-1 flex flex-col gap-1">
              <span className="text-[9px] font-bold uppercase tracking-widest dark:text-white/40 text-gray-500">Progreso</span>
              <span className="text-2xl font-black dark:text-emerald-400 text-emerald-600">{focusData.progressPct}%</span>
              <div className="w-full h-1.5 dark:bg-white/5 bg-black/5 rounded-full mt-1 overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-1000",
                    focusData.health === "red" ? "bg-red-500" : "bg-emerald-500"
                  )}
                  style={{ width: `${focusData.progressPct}%` }} 
                />
              </div>
            </div>

            <div className="col-span-1 flex flex-col gap-1">
              <span className="text-[9px] font-bold uppercase tracking-widest dark:text-white/40 text-gray-500">Estimado</span>
              <span className="text-xl font-black dark:text-white text-gray-900">{focusData.totalHours}h</span>
            </div>

            <div className="col-span-1 flex flex-col gap-1">
              <span className="text-[9px] font-bold uppercase tracking-widest dark:text-white/40 text-gray-500">Real</span>
              <span className="text-xl font-black dark:text-white text-gray-900">{focusData.doneHours}h</span>
            </div>
          </div>
        </div>

        {/* Right Side: Top Tasks */}
        <div className="lg:w-3/5 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest dark:text-white/40 text-gray-500">
              TAREAS DE HOY • {format(new Date(), "EEEE d MMM", { locale: es })}
            </span>
            <button 
              onClick={() => openModal({ type: 'proyecto', id: focusData.project.id })}
              className="text-[10px] font-black text-emerald-500 hover:text-emerald-600 transition-colors flex items-center gap-1"
            >
              Ver todas las tareas →
            </button>
          </div>

          <div className="flex flex-col gap-2 flex-1 overflow-y-auto custom-scrollbar pr-2">
            {focusData.tasks.length === 0 && (
               <div className="flex-1 flex items-center justify-center text-xs dark:text-white/20 text-gray-400 italic">
                 No hay tareas pendientes para hoy.
               </div>
            )}
            {focusData.tasks.map(task => (
              <TaskRow key={task.id} task={task} onCheck={handleCheckTask} data={data} />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// Sub-component for individual tasks in the focus card
function TaskRow({ task, onCheck, data }: { task: any, onCheck: (id: string) => void, data: any }) {
  const isDone = DONE_STATES.has(task.estado);
  const openModal = useUIStore(s => s.openModal);
  
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { type: "task" }
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "group flex items-center justify-between py-2.5 px-3 rounded-xl transition-all cursor-grab active:cursor-grabbing",
        isDragging && "opacity-80 scale-[1.02] shadow-2xl z-50",
        isDone ? "opacity-50" : "dark:hover:bg-white/5 hover:bg-black/5"
      )}
      onClick={() => openModal({ type: 'task', id: task.id })}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onCheck(task.id); }}
          className={cn(
            "w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-all",
            isDone ? "bg-emerald-500 border-emerald-500" : "dark:border-white/30 border-gray-400 dark:bg-transparent bg-white hover:border-emerald-400"
          )}
        >
          {isDone && <Check className="w-3 h-3 text-white stroke-[3px]" />}
        </button>
        
        <span className={cn(
          "text-[13px] font-bold truncate flex-1",
          isDone ? "dark:text-white/40 text-gray-400 line-through" : "dark:text-white/90 text-gray-800"
        )}>
          {task.titulo}
        </span>
        
        {task.formato && (
           <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md dark:bg-white/10 bg-black/5 dark:text-white/50 text-gray-500 border dark:border-white/5 border-black/5 whitespace-nowrap">
             {task.formato}
           </span>
        )}
      </div>

      <div className="flex items-center gap-4 flex-shrink-0 ml-4">
        {task.esfuerzo && (
          <span className="text-[11px] font-bold dark:text-white/40 text-gray-500 w-8 text-right">
            {task.esfuerzo}
          </span>
        )}
        
        <div className="flex -space-x-1.5 w-8 justify-end">
          {task.asignado_ids?.slice(0,2).map((aid: string) => {
            const worker = data.trabajadores.find((w: any) => w.id === aid);
            return worker ? (
              <div key={aid} className="w-5 h-5 rounded-full dark:bg-[#121216] bg-white border border-gray-200 dark:border-[#26262b] flex items-center justify-center text-[7px] font-black dark:text-white text-gray-800 z-10" title={worker.nombre}>
                {avatarOf(worker.nombre)}
              </div>
            ) : null;
          })}
        </div>

        {task.prioridad && task.prioridad !== "Ninguna" && (
          <div className={cn(
            "flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-widest w-[56px] justify-center",
            task.prioridad === "Alta" ? "dark:bg-red-500/10 bg-red-50 dark:text-red-400 text-red-600 dark:border-red-500/20 border-red-200" :
            task.prioridad === "Media" ? "dark:bg-orange-500/10 bg-orange-50 dark:text-orange-400 text-orange-600 dark:border-orange-500/20 border-orange-200" :
            "dark:bg-green-500/10 bg-green-50 dark:text-green-400 text-green-600 dark:border-green-500/20 border-green-200"
          )}>
            <Flag className="w-2 h-2" />
            {task.prioridad.substring(0,4)}
          </div>
        )}
      </div>
    </div>
  );
}
