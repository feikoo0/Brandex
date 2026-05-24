"use client";

import { useState, useCallback } from "react";
import { Calendar, ExternalLink, Clock, FileText, CheckCircle2, Play, Plus, ChevronRight, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useData, useUpdateTask, useUpdateProject, useCreateTask, useCreateProject } from "@/hooks/useData";
import { cn, parseEsfuerzoMins, avatarOf } from "@/lib/utils";
import { DONE_STATES, PROJ_STATUS_OPTS, PROJ_PRIO_OPTS, TASK_PRIO_OPTS, ESFUERZOS, FORMATOS } from "@/lib/constants";
import { useUIStore } from "@/lib/store";
import { CanvasLayout } from "./CanvasLayout";
import { useDebouncedSave } from "@/hooks/useDebouncedSave";
import { SaveIndicator } from "@/components/ui/SaveIndicator";

export function ProjectCanvas({ projectId }: { projectId: string }) {
  const { data } = useData();
  const updateTask = useUpdateTask();
  const updateProject = useUpdateProject();
  const createTask = useCreateTask();
  const pushView = useUIStore(s => s.pushView);
  const openModal = useUIStore(s => s.openModal);
  const goToHome = useUIStore(s => s.goToHome);
  
  const project = data?.proyectos.find((p) => p.id === projectId);

  if (!project) return <div className="p-6 text-center text-white/50">Cargando proyecto...</div>;

  return <ProjectCanvasInner project={project} />;
}

function ProjectCanvasInner({ project }: { project: any }) {
  const { data } = useData();
  const updateTask = useUpdateTask();
  const updateProject = useUpdateProject();
  const createTask = useCreateTask();
  const pushView = useUIStore(s => s.pushView);

  // Creating new task state
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPrio, setNewTaskPrio] = useState("Media");
  const [newTaskEsfuerzo, setNewTaskEsfuerzo] = useState("");
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [taskCreated, setTaskCreated] = useState(false);

  // Debounced saves
  const saveName = useCallback(async (v: string) => {
    await updateProject.mutateAsync({ id: project.id, nombre: v } as any);
  }, [project.id, updateProject]);

  const saveDesc = useCallback(async (v: string) => {
    await updateProject.mutateAsync({ id: project.id, descripcion: v } as any);
  }, [project.id, updateProject]);

  const nombre = useDebouncedSave(project.nombre || "", saveName);
  const desc = useDebouncedSave(project.descripcion || "", saveDesc);

  const client = data?.clientes.find(c => project.cliente_ids?.includes(c.id));
  const tasks = data?.tareas.filter(t => t.proyecto_ids?.includes(project.id)) || [];
  
  // Calculate metrics
  const totalMins = tasks.reduce((acc, t) => acc + parseEsfuerzoMins(t.esfuerzo || ""), 0);
  const doneMins = tasks.filter(t => DONE_STATES.has(t.estado)).reduce((acc, t) => acc + parseEsfuerzoMins(t.esfuerzo || ""), 0);
  const progressPct = totalMins > 0 ? Math.round((doneMins / totalMins) * 100) : 0;

  const today = new Date();
  const endDate = project.fechaFin ? new Date(project.fechaFin) : null;
  const isDelayed = endDate ? endDate < today && !DONE_STATES.has(project.estadoProyecto) : false;

  const handleCheckTask = async (taskId: string) => {
    updateTask.mutate({ id: taskId, estado: "Hecho" } as never);
  };

  const handleStatusChange = async (value: string) => {
    await updateProject.mutateAsync({ id: project.id, estadoProyecto: value } as any);
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim() || isCreatingTask) return;
    setIsCreatingTask(true);
    try {
      await createTask.mutateAsync({
        titulo: newTaskTitle.trim(),
        estado: "Pendiente",
        prioridad: newTaskPrio,
        esfuerzo: newTaskEsfuerzo || undefined,
        proyecto_id: project.id,
        cliente_id: project.cliente_ids?.[0] || undefined,
      } as any);
      setTaskCreated(true);
      setNewTaskTitle("");
      setNewTaskPrio("Media");
      setNewTaskEsfuerzo("");
      setTimeout(() => { setTaskCreated(false); setShowNewTask(false); }, 1200);
    } catch { /* noop */ } finally { setIsCreatingTask(false); }
  };

  const leftBlock = (
    <div className="flex flex-col gap-5 h-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className={cn(
            "w-3 h-3 rounded-full mt-1.5 flex-shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.5)]",
            DONE_STATES.has(project.estadoProyecto) ? "bg-green-500 shadow-green-500/50" :
            isDelayed ? "bg-red-500 shadow-red-500/50" : "bg-blue-500 shadow-blue-500/50"
          )} />
          <div className="flex flex-col gap-1 w-full">
            <div className="flex items-center gap-2">
              <input 
                value={nombre.value}
                onChange={(e) => nombre.setValue(e.target.value)}
                onBlur={() => nombre.flush()}
                className="text-2xl font-black tracking-tight dark:text-white text-gray-900 bg-transparent border-none p-0 focus:ring-0 w-full outline-none"
              />
              <SaveIndicator status={nombre.saveStatus} compact />
            </div>
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold dark:text-white/40 text-gray-500 uppercase tracking-widest leading-none">
                {client?.nombre || "Sin cliente"} •
              </p>
              <select 
                value={project.estadoProyecto}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="bg-white/5 border-none text-[10px] font-black uppercase tracking-widest p-0 px-1 rounded text-white/60 focus:ring-0 cursor-pointer hover:text-white outline-none"
              >
                {PROJ_STATUS_OPTS.map(s => (
                  <option key={s} value={s} className="bg-[#151518] text-white">{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        {project.url && (
          <a href={project.url} target="_blank" rel="noreferrer" className="p-2 rounded-xl dark:bg-white/5 bg-black/5 dark:text-white/60 text-gray-500 hover:text-blue-400 transition-colors">
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* Progress */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t dark:border-white/5 border-black/5">
        <div className="col-span-1">
          <span className="dark:text-white/40 text-gray-500 uppercase tracking-widest text-[9px] font-bold">Progreso</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-lg font-black dark:text-white text-gray-900">{progressPct}%</span>
          </div>
          <div className="w-full h-1.5 dark:bg-white/5 bg-black/5 rounded-full overflow-hidden mt-1.5">
            <div className={cn("h-full transition-all duration-1000", isDelayed ? "bg-red-500" : "bg-green-500")} style={{ width: `${progressPct}%` }} />
          </div>
        </div>
        <div className="col-span-1 flex flex-col border-l dark:border-white/10 border-black/10 pl-4">
          <span className="dark:text-white/40 text-gray-500 uppercase tracking-widest text-[9px] font-bold">Tiempo</span>
          <span className="text-lg font-black dark:text-white text-gray-900 mt-1">{(totalMins / 60).toFixed(1)}h</span>
        </div>
        <div className="col-span-1 flex flex-col border-l dark:border-white/10 border-black/10 pl-4">
          <span className="dark:text-white/40 text-gray-500 uppercase tracking-widest text-[9px] font-bold">Deadline</span>
          <span className={cn("text-sm font-black mt-1", isDelayed ? "text-red-500" : "dark:text-white text-gray-900")}>
            {project.fechaFin ? format(new Date(project.fechaFin), "d MMM", { locale: es }) : "—"}
          </span>
        </div>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-[10px] font-black uppercase tracking-widest dark:text-white/40 text-gray-500 flex items-center gap-2"><FileText className="w-3 h-3" /> Contexto</h3>
          <SaveIndicator status={desc.saveStatus} compact />
        </div>
        <textarea 
          value={desc.value}
          onChange={(e) => desc.setValue(e.target.value)}
          onBlur={() => desc.flush()}
          placeholder="Descripción del proyecto..."
          className="text-xs dark:text-white/80 text-gray-700 leading-relaxed font-medium bg-transparent border-none p-0 focus:ring-0 w-full flex-1 resize-none outline-none min-h-[60px]"
        />
      </div>
    </div>
  );

  const centerBlock = (
    <div className="flex flex-col w-full h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-black uppercase tracking-widest dark:text-white/40 text-gray-500 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5" /> Tareas ({tasks.length})
        </h3>
        <button 
          onClick={() => setShowNewTask(!showNewTask)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/15 text-green-400 rounded-full text-[10px] font-black uppercase tracking-wider hover:bg-green-500/25 transition-all"
        >
          <Plus className="w-3 h-3" /> Nueva
        </button>
      </div>

      {/* Quick create task inline */}
      {showNewTask && (
        <div className="mb-4 p-3 rounded-xl border border-green-500/20 bg-green-500/5 flex flex-col gap-2">
          <input
            autoFocus
            value={newTaskTitle}
            onChange={e => setNewTaskTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleCreateTask(); } }}
            placeholder="Nombre de la tarea..."
            className="w-full bg-white/5 border border-white/10 text-xs font-bold text-white placeholder-white/20 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500/40"
          />
          <div className="flex gap-2 items-center">
            <select value={newTaskPrio} onChange={e => setNewTaskPrio(e.target.value)} className="bg-white/5 border border-white/5 text-[10px] font-bold px-2 py-1 rounded-lg text-white/70 outline-none flex-1">
              {TASK_PRIO_OPTS.map(o => <option key={o} value={o} className="bg-[#111]">{o}</option>)}
            </select>
            <select value={newTaskEsfuerzo} onChange={e => setNewTaskEsfuerzo(e.target.value)} className="bg-white/5 border border-white/5 text-[10px] font-bold px-2 py-1 rounded-lg text-white/70 outline-none flex-1">
              <option value="" className="bg-[#111]">Sin estimar</option>
              {ESFUERZOS.map(o => <option key={o} value={o} className="bg-[#111]">{o}</option>)}
            </select>
            <button
              onClick={handleCreateTask}
              disabled={!newTaskTitle.trim() || isCreatingTask}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-black text-white flex items-center gap-1.5 transition-all",
                taskCreated ? "bg-green-600" : "bg-green-500 hover:bg-green-400 disabled:opacity-40"
              )}
            >
              {taskCreated ? <><CheckCircle2 className="w-3 h-3" /> ✓</> : isCreatingTask ? <Loader2 className="w-3 h-3 animate-spin" /> : "Crear"}
            </button>
          </div>
        </div>
      )}

      {/* Tasks list */}
      <div className="flex flex-col gap-0.5 flex-1 overflow-y-auto custom-scrollbar">
        {tasks.length === 0 ? (
          <p className="text-center text-xs dark:text-white/40 text-gray-500 py-8">No hay tareas en este proyecto.</p>
        ) : (
          tasks.map(t => (
            <div 
              key={t.id}
              className="flex items-center justify-between py-2.5 border-b border-white/[0.03] group hover:bg-white/[0.02] transition-all px-2 rounded-lg cursor-pointer"
              onClick={() => pushView({ level: "task", id: t.id })}
            >
              <div className="flex items-center gap-3">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleCheckTask(t.id); }}
                  className={cn(
                    "w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0",
                    DONE_STATES.has(t.estado) ? "bg-green-500 border-green-500" : "border-white/10 group-hover:border-white/30"
                  )}
                >
                  {DONE_STATES.has(t.estado) && <CheckCircle2 className="w-3 h-3 text-[#0a2417]" />}
                </button>
                <div className="flex flex-col">
                  <span className={cn("text-xs font-bold transition-colors leading-none", DONE_STATES.has(t.estado) ? "line-through dark:text-white/30 text-gray-400" : "dark:text-white text-gray-900 group-hover:text-white")}>{t.titulo}</span>
                  <span className="text-[8px] uppercase font-black dark:text-white/20 text-gray-500 mt-1 tracking-widest">{t.estado}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {t.esfuerzo && (
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md border border-white/5 bg-white/5 text-white/30 group-hover:text-white/50 transition-colors">
                    {t.esfuerzo}
                  </span>
                )}
                <div className="flex -space-x-1.5">
                  {t.asignado_ids?.slice(0,2).map(aid => {
                    const w = data?.trabajadores.find(x => x.id === aid);
                    return w ? <div key={aid} className="w-5 h-5 rounded-full dark:bg-[#1a1a20] bg-white border-2 dark:border-[#121216] border-white flex items-center justify-center text-[7px] font-black uppercase text-white/30">{avatarOf(w.nombre)}</div> : null;
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const rightBlock = (
    <div className="flex flex-col gap-4">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-white/50 flex items-center gap-2"><Play className="w-3.5 h-3.5" /> Insights</h3>
      
      <div className="flex flex-col gap-3">
        {isDelayed && (
          <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
            <p className="text-[11px] text-red-500/90 leading-relaxed font-medium">Proyecto con retraso. Revisa tareas pendientes críticas.</p>
          </div>
        )}
        
        {tasks.length === 0 && (
          <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
            <p className="text-[11px] text-blue-400 leading-relaxed font-medium">Sin tareas. Crea el primer hito de trabajo.</p>
          </div>
        )}
        
        {tasks.length > 0 && !isDelayed && progressPct < 100 && (
          <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-xl flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
            <p className="text-[11px] text-green-400 leading-relaxed font-medium">Proyecto en tiempo. Mantén el ritmo.</p>
          </div>
        )}
        
        {progressPct === 100 && (
          <div className="bg-purple-500/10 border border-purple-500/20 p-3 rounded-xl flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
            <p className="text-[11px] text-purple-400 leading-relaxed font-medium">¡Todas las tareas completadas! Listo para entregar.</p>
          </div>
        )}
      </div>
    </div>
  );

  return <CanvasLayout leftBlock={leftBlock} centerBlock={centerBlock} rightBlock={rightBlock} />;
}
