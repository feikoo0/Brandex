"use client";

import { useState, useCallback } from "react";
import { Loader2, Play, Clock, CheckCircle2, User, AlignLeft, Tag } from "lucide-react";
import { useData, useUpdateTask } from "@/hooks/useData";
import { useUIStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { DONE_STATES, STATUS_COLORS, PRIORITY_COLORS, ESFUERZOS } from "@/lib/constants";
import { CanvasLayout } from "./CanvasLayout";
import { useDebouncedSave } from "@/hooks/useDebouncedSave";
import { SaveIndicator } from "@/components/ui/SaveIndicator";

export function TaskCanvas({ taskId }: { taskId: string }) {
  const { data } = useData();
  const updateTask = useUpdateTask();
  const pushView = useUIStore(s => s.pushView);
  
  const startTimer = useUIStore(s => s.startTimer);
  const activeTimer = useUIStore(s => s.activeTimer);
  const isTimerActive = activeTimer?.taskId === taskId;

  const task = data?.tareas.find((t) => t.id === taskId);
  
  if (!task) return <div className="p-6 text-center text-white/50">Cargando tarea...</div>;

  return <TaskCanvasInner task={task} />;
}

function TaskCanvasInner({ task }: { task: any }) {
  const { data } = useData();
  const updateTask = useUpdateTask();
  const pushView = useUIStore(s => s.pushView);
  const startTimer = useUIStore(s => s.startTimer);
  const activeTimer = useUIStore(s => s.activeTimer);
  const isTimerActive = activeTimer?.taskId === task.id;

  // Debounced saves
  const saveTitle = useCallback(async (v: string) => {
    await updateTask.mutateAsync({ id: task.id, titulo: v } as any);
  }, [task.id, updateTask]);

  const saveContent = useCallback(async (v: string) => {
    await updateTask.mutateAsync({ id: task.id, contenido: v } as any);
  }, [task.id, updateTask]);

  const titulo = useDebouncedSave(task.titulo || "", saveTitle);
  const contenido = useDebouncedSave(task.contenido || "", saveContent);

  // Local state for selects (immediate save)
  const [estado, setEstado] = useState(task.estado ?? "");
  const [prioridad, setPrioridad] = useState(task.prioridad ?? "");
  const [selectSaving, setSelectSaving] = useState(false);

  // Derived
  const project = data?.proyectos.find(p => task.proyecto_ids?.includes(p.id));
  const assigned = task.asignado_ids?.map((aid: string) => data?.trabajadores.find(w => w.id === aid)).filter(Boolean) || [];

  const handleSelectUpdate = async (field: string, value: string) => {
    setSelectSaving(true);
    if (field === "estado") setEstado(value);
    if (field === "prioridad") setPrioridad(value);
    try {
      await updateTask.mutateAsync({ id: task.id, [field]: value } as any);
    } catch (e) {
      console.error(e);
    } finally {
      setSelectSaving(false);
    }
  };

  const isDone = DONE_STATES.has(estado || task.estado);

  const leftBlock = (
    <div className="flex flex-col gap-5 h-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 flex-1">
          <button 
            className={cn(
              "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors cursor-pointer mt-1 flex-shrink-0", 
              isDone ? "bg-green-500 border-green-500 shadow-[0_0_10px_rgba(74,222,128,0.3)]" : "border-gray-300 dark:border-white/20 hover:border-green-500"
            )}
            onClick={() => handleSelectUpdate("estado", isDone ? "Por hacer" : "Hecho")}
          >
            {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-[#0a2417]" />}
          </button>
          <div className="flex flex-col gap-1 w-full">
            <div className="flex items-center gap-2">
              <input 
                value={titulo.value}
                onChange={(e) => titulo.setValue(e.target.value)}
                onBlur={() => titulo.flush()}
                className={cn("text-2xl font-black tracking-tight leading-none bg-transparent border-none p-0 focus:ring-0 w-full outline-none", isDone ? "dark:text-white/40 text-gray-400 line-through" : "dark:text-white text-gray-900")}
              />
              <SaveIndicator status={titulo.saveStatus} compact />
            </div>
            <p className="text-[10px] font-bold dark:text-white/40 text-gray-500 mt-1 uppercase tracking-widest cursor-pointer hover:text-green-400 transition-colors leading-none" onClick={() => project && pushView({ level: 'project', id: project.id })}>
              {project?.nombre || "Sin Proyecto"}
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          {selectSaving && <SaveIndicator status="saving" compact />}
          {!isTimerActive ? (
            <button onClick={() => startTimer(task.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-[#0a2417] text-[10px] font-black uppercase tracking-wider rounded-xl hover:scale-105 transition-all">
              <Play className="w-3 h-3 fill-current" /> Timer
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-black uppercase tracking-wider rounded-xl animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" /> Tracking
            </div>
          )}
        </div>
      </div>
      
      {/* Quick Meta Tags */}
      <div className="flex flex-wrap gap-2 pt-4 border-t dark:border-white/5 border-black/5">
        <select 
          value={estado || task.estado} 
          onChange={e => handleSelectUpdate("estado", e.target.value)}
          className={cn("text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full appearance-none cursor-pointer outline-none border border-transparent hover:border-current transition-all")}
          style={{ backgroundColor: `${(STATUS_COLORS as any)[estado || task.estado] || '#666'}20`, color: (STATUS_COLORS as any)[estado || task.estado] || '#999' }}
        >
          {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s} className="bg-[#0a0a0c]">{s}</option>)}
        </select>
        
        <select 
          value={prioridad || task.prioridad} 
          onChange={e => handleSelectUpdate("prioridad", e.target.value)}
          className={cn("text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full appearance-none cursor-pointer outline-none border border-transparent hover:border-current transition-all")}
          style={{ backgroundColor: `${(PRIORITY_COLORS as any)[prioridad || task.prioridad] || '#666'}20`, color: (PRIORITY_COLORS as any)[prioridad || task.prioridad] || '#999' }}
        >
          {Object.keys(PRIORITY_COLORS).map(p => <option key={p} value={p} className="bg-[#0a0a0c]">{p}</option>)}
        </select>
      </div>

      {/* Metadata */}
      <div className="flex flex-col gap-3 flex-1">
        <h3 className="text-[10px] font-black uppercase tracking-widest dark:text-white/40 text-gray-500 flex items-center gap-2"><Tag className="w-3 h-3" /> Metadatos</h3>
        
        <div>
          <p className="text-[9px] font-bold dark:text-white/40 text-gray-400 uppercase tracking-widest mb-1">Responsable</p>
          <div className="flex flex-wrap gap-1.5">
            {assigned.length > 0 ? assigned.map((a: any) => (
              <div key={a?.id} className="flex items-center gap-1.5 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-full border border-white/5">
                 <User className="w-3 h-3 dark:text-white/40 text-gray-600" />
                 <span className="text-[10px] font-bold dark:text-white text-gray-900">{a?.nombre}</span>
              </div>
            )) : <span className="text-[10px] font-bold dark:text-white/40 text-gray-500 italic">Sin asignar</span>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[9px] font-bold dark:text-white/40 text-gray-400 uppercase tracking-widest mb-1">Programado</p>
            <input 
              type="date"
              value={task.fechaProg || ""}
              onChange={(e) => updateTask.mutate({ id: task.id, fechaProg: e.target.value } as any)}
              className="w-full bg-gray-100 dark:bg-white/5 px-2 py-1.5 rounded-lg border border-white/5 text-[10px] font-bold dark:text-white text-gray-900 focus:ring-0 outline-none"
            />
          </div>
          <div>
            <p className="text-[9px] font-bold dark:text-white/40 text-gray-400 uppercase tracking-widest mb-1">Entrega</p>
            <input 
              type="date"
              value={task.fechaEntrega || ""}
              onChange={(e) => updateTask.mutate({ id: task.id, fechaEntrega: e.target.value } as any)}
              className="w-full bg-red-500/10 px-2 py-1.5 rounded-lg border border-red-500/10 text-[10px] font-bold text-red-500 focus:ring-0 outline-none"
            />
          </div>
        </div>

        <div>
          <p className="text-[9px] font-bold dark:text-white/40 text-gray-400 uppercase tracking-widest mb-1">Esfuerzo</p>
          <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-white/5 px-2 py-1.5 rounded-lg border border-white/5 w-fit">
            <Clock className="w-3 h-3 dark:text-white/40 flex-shrink-0" />
            <select 
              value={task.esfuerzo || ""}
              onChange={(e) => updateTask.mutate({ id: task.id, esfuerzo: e.target.value } as any)}
              className="bg-transparent border-none p-0 focus:ring-0 text-[10px] font-bold dark:text-white text-gray-900 outline-none cursor-pointer min-w-[60px]"
            >
              <option value="" className="bg-[#0a0a0c] text-white/50">—</option>
              {ESFUERZOS.map((o) => (
                <option key={o} value={o} className="bg-[#0a0a0c] text-white">{o}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const centerBlock = (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center gap-2 border-b dark:border-white/5 border-black/5 pb-3">
        <h3 className="text-[10px] font-black uppercase tracking-widest dark:text-white/40 text-gray-500 flex items-center gap-2"><AlignLeft className="w-3 h-3" /> Descripción</h3>
        <SaveIndicator status={contenido.saveStatus} compact />
      </div>
      <textarea
        value={contenido.value}
        onChange={(e) => contenido.setValue(e.target.value)}
        onBlur={() => contenido.flush()}
        placeholder="Añade detalles, links, o contexto aquí..."
        className="w-full flex-1 resize-none bg-transparent outline-none dark:text-white/90 text-gray-800 text-sm leading-relaxed placeholder:dark:text-white/20 placeholder:text-gray-400 font-medium"
      />
    </div>
  );

  const rightBlock = (
    <div className="flex flex-col gap-4">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-green-400 flex items-center gap-2"><Play className="w-3.5 h-3.5" /> Insights</h3>
      <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
        <p className="text-[11px] dark:text-white/60 text-gray-600 leading-relaxed font-medium">
          {isDone ? "✅ Tarea completada." : 
           isTimerActive ? "⏱️ Trabajando activamente. ¡Concéntrate!" :
           "Usa el botón superior para trackear tiempo."}
        </p>
      </div>
    </div>
  );

  return <CanvasLayout leftBlock={leftBlock} centerBlock={centerBlock} rightBlock={rightBlock} />;
}
