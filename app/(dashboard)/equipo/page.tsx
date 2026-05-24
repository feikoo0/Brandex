"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuthStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useData, useUpdateTask } from "@/hooks/useData";
import { ACTIVE_STATES } from "@/lib/constants";
import { Loader2 } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";

// ── NATIVE SVG ICONS ──
const IconLayers = () => <svg className="w-3.5 h-3.5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>;
const IconCalendar = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
const IconMessage = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
const IconGrip = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1" /><circle cx="9" cy="5" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="19" r="1" /></svg>;
const IconFolder = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>;
const IconX = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
const IconZap = () => <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;

// ── UTILS ──
const cn = (...classes: any[]) => classes.filter(Boolean).join(" ");
const fmt = (d?: string) => d ? new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) : "Sin fecha";

// Mapping employee columns to task states
const COLUMNS = [
  { id: "pendientes", label: "Pendientes", color: "purple", states: ["Por hacer", "Pendiente", "Modificar"] },
  { id: "trabajando", label: "Trabajando ahora", color: "orange", states: ["En proceso"] },
  { id: "revision", label: "Enviado a Revisión", color: "blue", states: ["Revision", "Aprobación", "Esperando aprobación", "Por aprobar"] },
];

function TaskCard({ task, project, type, onClick }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      onClick={onClick}
      className={cn(
        "p-6 rounded-[2.5rem] border bg-[#121217] relative group cursor-pointer hover:-translate-y-1 transition-transform",
        type === "pendientes" ? "border-purple-500/10 hover:border-purple-500/30" : type === "trabajando" ? "border-orange-500/30 shadow-lg shadow-orange-500/10" : "border-blue-500/10 opacity-70 hover:opacity-100"
      )}
    >
      <div {...attributes} {...listeners} onClick={e => e.stopPropagation()} className="absolute top-5 right-5 opacity-20 hover:opacity-100 p-2 cursor-grab active:cursor-grabbing text-white">
        <IconGrip />
      </div>
      
      <div className="flex flex-col items-start text-left w-full">
        <div className="flex items-center gap-2 mb-3">
          <div className="text-[9px] font-black uppercase text-purple-400 bg-purple-400/10 px-3 py-1.5 rounded-full flex items-center gap-1.5 tracking-wider">
            <IconLayers /> {task.formato || "Tarea"}
          </div>
          {task.prioridad === "Alta" && (
            <div className="text-[9px] font-black uppercase text-red-400 bg-red-400/10 px-3 py-1.5 rounded-full tracking-wider">
              ALTA PRIORIDAD
            </div>
          )}
        </div>
        
        <h4 className="text-sm font-black mb-2 leading-snug text-white/90 w-[85%]">{task.titulo}</h4>
        
        {project && (
          <div className="text-[10px] font-bold text-white/50 mb-4 px-2 py-1 rounded-lg bg-white/5 truncate max-w-[80%]">
            {project.nombre}
          </div>
        )}

        {task.notasCliente && (
          <div className="w-full mb-3 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-[10px] font-bold text-red-400 flex items-center gap-2">
            <IconMessage /> Cliente pide cambios
          </div>
        )}

        <div className="flex items-center justify-between w-full mt-auto">
          <div className="text-[10px] font-bold text-white/40 flex items-center gap-1.5">
            <IconCalendar /> {fmt(task.fechaProg || task.fechaEntrega)}
          </div>
          {project?.recursosDrive && (
            <button 
              onClick={(e) => { e.stopPropagation(); window.open(project.recursosDrive, "_blank"); }}
              className="text-blue-400 hover:text-blue-300 p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
              title="Abrir Recursos (Drive)"
            >
              <IconFolder />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskModal({ task, project, onClose }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-[#0e0e11]/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-8 pb-4">
          <div className="flex items-start justify-between mb-6">
            <div className="text-[10px] font-black uppercase text-purple-400 bg-purple-400/10 px-3 py-1.5 rounded-full flex items-center gap-2 tracking-wider">
              <IconLayers /> {task.formato || "Tarea"}
            </div>
            <button onClick={onClose} className="text-white/30 hover:text-white p-1 transition-colors"><IconX /></button>
          </div>
          
          <h2 className="text-2xl font-black mb-2 leading-tight">{task.titulo}</h2>
          {project && <p className="text-sm font-bold text-white/40 mb-6">{project.nombre}</p>}
          
          <div className="flex items-center gap-6 text-xs font-bold text-white/50 mb-8 border-b border-white/5 pb-6">
            <div className="flex items-center gap-2"><IconCalendar /> Programado: {fmt(task.fechaProg || task.fechaEntrega)}</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500" /> Estado: {task.estado}</div>
          </div>

          {task.contenido && (
            <div className="mb-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Copy / Contenido</h4>
              <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/5 text-sm text-white/70 italic leading-relaxed">
                {task.contenido}
              </div>
            </div>
          )}

          {task.notasCliente && (
            <div className="mb-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-red-400 flex items-center gap-2 mb-3">
                <IconMessage /> Notas del Cliente (Correcciones)
              </h4>
              <div className="p-5 rounded-3xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 leading-relaxed font-medium">
                {task.notasCliente}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-white/[0.02] border-t border-white/5 flex gap-4 mt-auto">
          {project?.recursosDrive && (
            <button onClick={() => window.open(project.recursosDrive, "_blank")} className="flex-1 py-4 rounded-2xl text-xs font-black bg-blue-600 text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2">
              <IconFolder /> ABRIR RECURSOS EN DRIVE
            </button>
          )}
          <button onClick={onClose} className="flex-1 py-4 rounded-2xl text-xs font-black bg-white/5 text-white hover:bg-white/10 transition-colors">
            CERRAR DETALLES
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function EquipoPage() {
  const role = useAuthStore((s) => s.role);
  const userName = useAuthStore((s) => s.userName);
  const router = useRouter();
  const { data, isLoading } = useData();
  const updateTask = useUpdateTask();

  const [localTasks, setLocalTasks] = useState<any[]>([]);
  const [syncingIds, setSyncingIds] = useState<string[]>([]);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    if (role && role === "admin") router.replace("/admin");
    if (role && role === "cliente") router.replace("/cliente");
  }, [role, router]);

  useEffect(() => {
    if (data?.tareas && syncingIds.length === 0) {
      // Filtrar solo mis tareas activas
      const mine = data.tareas.filter((t) => t.asignado === userName && ACTIVE_STATES.has(t.estado));
      setLocalTasks(mine);
    }
  }, [data?.tareas, syncingIds, userName]);

  const findContainer = (id: string) => {
    if (COLUMNS.find(c => c.id === id)) return id;
    const task = localTasks.find(t => t.id === id);
    if (!task) return null;
    return COLUMNS.find(c => c.states.includes(task.estado))?.id;
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as string;
    const overContainer = findContainer(over.id as string);
    if (!overContainer) return;

    let newState = COLUMNS.find(c => c.id === overContainer)?.states[0] || "Por hacer";
    const task = localTasks.find(t => t.id === taskId);
    
    // Logic specific to state transitions
    if (overContainer === "pendientes") newState = "Por hacer";
    if (overContainer === "trabajando") newState = "En proceso";
    if (overContainer === "revision") newState = "Revision";

    if (task && task.estado !== newState) {
      setLocalTasks(prev => prev.map(t => t.id === taskId ? { ...t, estado: newState } : t));
      setSyncingIds(prev => [...prev, taskId]);
      updateTask.mutate({ id: taskId, estado: newState }, {
        onSettled: () => setSyncingIds(prev => prev.filter(id => id !== taskId))
      });
    }
  };

  const effortCount = useMemo(() => localTasks.length, [localTasks]);
  const estimatedMins = useMemo(() => {
    return localTasks.reduce((acc, t) => {
      if (t.esfuerzo === "25 mins") return acc + 25;
      if (t.esfuerzo === "1-2 horas") return acc + 90;
      if (t.esfuerzo === "Medio día") return acc + 240;
      if (t.esfuerzo === "Día completo") return acc + 480;
      return acc;
    }, 0);
  }, [localTasks]);
  const capacityMins = 480; // 8 hours default

  if (isLoading) return <div className="h-screen bg-[#0a0a0c] flex items-center justify-center text-purple-500 font-black tracking-widest">CARGANDO...</div>;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0a0a0c] text-white font-sans relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* ── HEADER ── */}
      <header className="px-10 py-8 flex flex-col gap-6 z-10 border-b border-white/5 bg-[#0e0e11]/50 backdrop-blur-md">
         <div className="flex items-end justify-between">
           <div>
             <h1 className="text-4xl font-black tracking-tight mb-2">Hola, {userName} 👋</h1>
             <p className="text-sm font-bold text-white/40 max-w-xl leading-relaxed">Este es tu Focus Mode. Tienes {effortCount} tareas asignadas en tu radar para hoy.</p>
           </div>
           
           <div className="flex items-center gap-4">
              {syncingIds.length > 0 && (
                <div className="text-[10px] font-black uppercase text-purple-400 bg-purple-400/10 px-3 py-2 rounded-full flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" /> Sincronizando...
                </div>
              )}
              {/* Esfuerzo Card */}
              <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#121217] border border-white/5 shadow-lg">
                <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400"><IconZap /></div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-white/30">Tiempo Estimado (Hoy)</div>
                  <div className="text-sm font-black">{(estimatedMins / 60).toFixed(1)}h <span className="text-white/30 text-xs">/ {(capacityMins / 60).toFixed(1)}h Disp.</span></div>
                </div>
              </div>
           </div>
         </div>
      </header>

      {/* ── KANBAN BOARD ── */}
      <main className="flex-1 overflow-hidden relative">
         <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="h-full overflow-x-auto flex px-10 py-10 gap-6 items-start z-10 hide-scrollbar">
              {COLUMNS.map(col => (
                <Column key={col.id} id={col.id} label={col.label} color={col.color} count={localTasks.filter(t => col.states.includes(t.estado)).length}>
                   <SortableContext id={col.id} items={localTasks.filter(t => col.states.includes(t.estado)).map(t => t.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-4">
                        {localTasks.filter(t => col.states.includes(t.estado)).map(task => {
                          const project = data?.proyectos?.find((p) => p.id === task.proyecto_ids?.[0]);
                          return (
                            <TaskCard 
                              key={task.id} 
                              task={task} 
                              project={project}
                              type={col.id} 
                              onClick={() => setSelectedTask({ task, project })}
                            />
                          );
                        })}
                      </div>
                   </SortableContext>
                </Column>
              ))}
            </div>
         </DndContext>
      </main>

      <AnimatePresence>
        {selectedTask && (
          <TaskModal 
            task={selectedTask.task} 
            project={selectedTask.project}
            onClose={() => setSelectedTask(null)}
          />
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{__html: ".hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }"}} />
    </div>
  );
}

function Column({ id, label, color, count, children }: any) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className="w-[340px] flex-shrink-0 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6 px-2">
        <div className="flex items-center gap-3">
          <div className={cn("w-2 h-2 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]", color === "orange" ? "bg-orange-500 shadow-orange-500/50" : color === "purple" ? "bg-purple-500 shadow-purple-500/50" : "bg-blue-500 shadow-blue-500/50")} />
          <h3 className="text-xs font-black uppercase tracking-widest text-white/70">{label}</h3>
        </div>
        <div className="text-[10px] font-bold text-white/30 bg-white/5 px-2 py-1 rounded-full">{count}</div>
      </div>
      <div className="flex-1 overflow-y-auto hide-scrollbar pb-10 min-h-[200px]">{children}</div>
    </div>
  );
}

