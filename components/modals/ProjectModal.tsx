"use client";

import { useState, useMemo, useEffect } from "react";
import { X, Calendar, Loader2, ExternalLink, Clock, Users, FileText, AlertTriangle, CheckCircle2 } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { useData, useCreateProject, useUpdateProject } from "@/hooks/useData";
import { cn, parseEsfuerzoMins, avatarOf } from "@/lib/utils";
import { DONE_STATES, PROJ_PRIO_OPTS, PROJ_STATUS_OPTS } from "@/lib/constants";
import type { ModalEntry } from "@/lib/types";

interface Props {
  projectId: string;
  isAdmin: boolean;
  onClose: () => void;
  openRelated?: (e: ModalEntry) => void;
}

export function ProjectModal({ projectId, isAdmin, onClose, openRelated }: Props) {
  const { data } = useData();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  
  const project = data?.proyectos.find((p) => p.id === projectId);
  const [activeTab, setActiveTab] = useState<"tasks" | "timeline">("tasks");
  const [saving, setSaving] = useState(false);
  const [nombre, setNombre] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [estadoProyecto, setEstadoProyecto] = useState("🧠 Planificacion");
  const [prioridad, setPrioridad] = useState("MODERADO");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState("");

  // Close animation hook
  const [closing, setClosing] = useState(false);
  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 300);
  };

  async function handleCreateProject() {
    if (!nombre.trim() || saving) return;
    setError("");
    setSaving(true);
    try {
      await createProject.mutateAsync({
        nombre: nombre.trim(),
        cliente_ids: clienteId ? [clienteId] : [],
        estadoProyecto,
        prioridad,
        fechaInicio: fechaInicio || undefined,
        fechaFin: fechaFin || undefined,
        descripcion: descripcion || undefined,
      } as any);
      onClose();
    } catch (err: any) {
      setError(err?.message || "No se pudo crear el proyecto.");
    } finally {
      setSaving(false);
    }
  }

  if (projectId === "new") {
    const clients = data?.clientes ?? [];

    return (
      <div className="w-full h-full flex flex-col dark:bg-[#0a0a0c] bg-white overflow-hidden relative">
        <div className="flex-shrink-0 border-b dark:border-white/10 border-black/10 p-6 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] dark:text-white/30 text-gray-500 mb-2">Nuevo proyecto</p>
            <h1 className="text-2xl font-black tracking-tight dark:text-white text-gray-900">Crear proyecto</h1>
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl dark:bg-white/5 bg-black/5 dark:text-white/60 text-gray-500 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_.8fr] gap-6">
            <div className="flex flex-col gap-5">
              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest dark:text-white/40 text-gray-500">Nombre *</span>
                <input
                  autoFocus
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Campaña de lanzamiento..."
                  className="w-full dark:bg-white/5 bg-black/5 border dark:border-white/10 border-black/10 rounded-2xl px-4 py-3 text-sm font-bold dark:text-white text-gray-900 outline-none focus:border-green-500/60"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest dark:text-white/40 text-gray-500">Descripción</span>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={8}
                  placeholder="Contexto, objetivos, entregables clave..."
                  className="w-full dark:bg-white/5 bg-black/5 border dark:border-white/10 border-black/10 rounded-2xl px-4 py-3 text-sm font-medium dark:text-white text-gray-900 outline-none focus:border-green-500/60 resize-none"
                />
              </label>
            </div>

            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest dark:text-white/40 text-gray-500">Cliente</span>
                <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="w-full dark:bg-white/5 bg-black/5 border dark:border-white/10 border-black/10 rounded-xl px-3 py-2.5 text-xs font-bold dark:text-white text-gray-900 outline-none">
                  <option value="">Sin cliente</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest dark:text-white/40 text-gray-500">Estado</span>
                <select value={estadoProyecto} onChange={(e) => setEstadoProyecto(e.target.value)} className="w-full dark:bg-white/5 bg-black/5 border dark:border-white/10 border-black/10 rounded-xl px-3 py-2.5 text-xs font-bold dark:text-white text-gray-900 outline-none">
                  {PROJ_STATUS_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest dark:text-white/40 text-gray-500">Prioridad</span>
                <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className="w-full dark:bg-white/5 bg-black/5 border dark:border-white/10 border-black/10 rounded-xl px-3 py-2.5 text-xs font-bold dark:text-white text-gray-900 outline-none">
                  {PROJ_PRIO_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest dark:text-white/40 text-gray-500">Inicio</span>
                  <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="w-full dark:bg-white/5 bg-black/5 border dark:border-white/10 border-black/10 rounded-xl px-3 py-2.5 text-xs font-bold dark:text-white text-gray-900 outline-none" />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest dark:text-white/40 text-gray-500">Fin</span>
                  <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="w-full dark:bg-white/5 bg-black/5 border dark:border-white/10 border-black/10 rounded-xl px-3 py-2.5 text-xs font-bold dark:text-white text-gray-900 outline-none" />
                </label>
              </div>

              <div className="p-4 rounded-2xl border dark:border-green-500/20 border-green-200 dark:bg-green-500/10 bg-green-50">
                <p className="text-xs font-bold dark:text-green-400 text-green-700 leading-relaxed">
                  Al crear el proyecto quedará disponible para fijarlo en el timeline y para crear tareas dentro de él.
                </p>
              </div>

              {error && <p className="text-xs font-bold text-red-500">{error}</p>}
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="flex-shrink-0 border-t dark:border-white/10 border-black/10 p-5 flex justify-end gap-3">
            <button onClick={handleClose} className="px-4 py-2.5 rounded-xl dark:bg-white/5 bg-black/5 text-xs font-bold dark:text-white/60 text-gray-600">Cancelar</button>
            <button
              onClick={handleCreateProject}
              disabled={!nombre.trim() || saving}
              className="px-5 py-2.5 rounded-xl bg-green-500 text-[#0a2417] text-xs font-black uppercase tracking-wider flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Crear proyecto
            </button>
          </div>
        )}
      </div>
    );
  }

  // If no project and not "new", it might be loading or deleted
  if (!project && projectId !== "new") return <div className="p-8 text-center text-white/50">Cargando proyecto...</div>;
  if (!project) return <div className="p-8 text-center text-white/50">Cargando proyecto...</div>;

  const client = data?.clientes.find(c => project.cliente_ids?.includes(c.id));
  const tasks = data?.tareas.filter(t => t.proyecto_ids?.includes(projectId)) || [];
  
  // Calculate metrics
  const totalMins = tasks.reduce((acc, t) => acc + parseEsfuerzoMins(t.esfuerzo || ""), 0);
  const doneMins = tasks.filter(t => DONE_STATES.has(t.estado)).reduce((acc, t) => acc + parseEsfuerzoMins(t.esfuerzo || ""), 0);
  const progressPct = totalMins > 0 ? Math.round((doneMins / totalMins) * 100) : 0;

  // Mock real time (simulating Phase 2)
  const realMins = tasks.reduce((acc, t) => {
    const tReal = (t as any).tiempoRealMins || 0;
    // Mock: if done, assume real = estimated + some random deviation
    if (DONE_STATES.has(t.estado) && tReal === 0) return acc + parseEsfuerzoMins(t.esfuerzo || "") * (1 + (Math.random() * 0.4 - 0.1));
    return acc + tReal;
  }, 0);
  const efficiencyDeviation = totalMins > 0 ? Math.round(((realMins - totalMins) / totalMins) * 100) : 0;

  const today = new Date();
  const endDate = project.fechaFin ? new Date(project.fechaFin) : null;
  const isDelayed = endDate ? endDate < today && !DONE_STATES.has(project.estadoProyecto) : false;
  const daysLeft = endDate ? differenceInDays(endDate, today) : null;

  const workers = useMemo(() => {
    const wIds = new Set<string>();
    tasks.forEach(t => t.asignado_ids?.forEach(id => wIds.add(id)));
    return Array.from(wIds).map(id => data?.trabajadores.find(w => w.id === id)).filter(Boolean);
  }, [tasks, data]);

  return (
    <div className="w-full h-full flex flex-col dark:bg-[#0a0a0c] bg-white overflow-hidden relative">
      
      {/* ── Top Header ── */}
      <div className="flex-shrink-0 border-b dark:border-white/10 border-black/10 p-6 flex flex-col gap-4">
        
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-3 h-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]",
              DONE_STATES.has(project.estadoProyecto) ? "bg-green-500 shadow-green-500/50" :
              isDelayed ? "bg-red-500 shadow-red-500/50" : "bg-blue-500 shadow-blue-500/50"
            )} />
            <div>
              <h1 className="text-2xl font-black tracking-tight dark:text-white text-gray-900 leading-none">
                {project.nombre}
              </h1>
              <p className="text-xs font-bold dark:text-white/40 text-gray-500 mt-1 uppercase tracking-widest">
                {client?.nombre || "Sin cliente asignado"} • {project.estadoProyecto}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {project.url && (
              <a href={project.url} target="_blank" rel="noreferrer" className="p-2 rounded-xl dark:bg-white/5 bg-black/5 dark:text-white/60 text-gray-500 hover:text-blue-400 transition-colors">
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button onClick={handleClose} className="p-2 rounded-xl dark:bg-white/5 bg-black/5 dark:text-white/60 text-gray-500 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Progress & Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mt-2">
           <div className="col-span-2">
             <div className="flex justify-between text-xs font-bold mb-1.5">
               <span className="dark:text-white/40 text-gray-500 uppercase tracking-widest text-[10px]">Progreso Global</span>
               <span className="dark:text-white text-gray-900">{progressPct}%</span>
             </div>
             <div className="w-full h-2 dark:bg-white/5 bg-black/5 rounded-full overflow-hidden">
               <div className={cn("h-full transition-all duration-1000", isDelayed ? "bg-red-500" : "bg-blue-500")} style={{ width: `${progressPct}%` }} />
             </div>
           </div>

           <div className="col-span-1 flex flex-col justify-end border-l dark:border-white/10 border-black/10 pl-4">
              <span className="dark:text-white/40 text-gray-500 uppercase tracking-widest text-[9px] font-bold">Tiempo (Est. vs Real)</span>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-black dark:text-white text-gray-900">{(totalMins / 60).toFixed(1)}h</span>
                <span className="text-[10px] font-bold text-orange-500">{(realMins / 60).toFixed(1)}h</span>
              </div>
           </div>

           <div className="col-span-1 flex flex-col justify-end border-l dark:border-white/10 border-black/10 pl-4">
              <span className="dark:text-white/40 text-gray-500 uppercase tracking-widest text-[9px] font-bold">Deadline</span>
              <span className={cn("text-sm font-black", isDelayed ? "text-red-500" : "dark:text-white text-gray-900")}>
                {project.fechaFin ? format(new Date(project.fechaFin), "d MMM yyyy", { locale: es }) : "Sin asignar"}
              </span>
           </div>
        </div>
      </div>

      {/* ── Body (Split View) ── */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Column: Tasks & Timeline */}
        <div className="flex-1 flex flex-col border-r dark:border-white/10 border-black/10">
          {/* Tabs */}
          <div className="flex border-b dark:border-white/10 border-black/10 px-6 pt-4 gap-6">
            <button 
              onClick={() => setActiveTab("tasks")}
              className={cn("pb-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors", 
                activeTab === "tasks" ? "border-blue-500 text-blue-500" : "border-transparent dark:text-white/40 text-gray-500 hover:dark:text-white/80"
              )}
            >
              Lista de Tareas
            </button>
            <button 
              onClick={() => setActiveTab("timeline")}
              className={cn("pb-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors", 
                activeTab === "timeline" ? "border-blue-500 text-blue-500" : "border-transparent dark:text-white/40 text-gray-500 hover:dark:text-white/80"
              )}
            >
              Timeline Interno
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-black/[0.02] dark:bg-white/[0.01]">
            {activeTab === "tasks" && (
              <div className="flex flex-col gap-3">
                {tasks.length === 0 ? (
                  <p className="text-center text-xs dark:text-white/40 text-gray-500 py-10">No hay tareas en este proyecto.</p>
                ) : (
                  tasks.map(t => (
                    <div 
                      key={t.id}
                      onClick={() => openRelated?.({ type: "task", id: t.id })}
                      className="flex items-center justify-between p-3 rounded-xl border dark:border-white/5 border-black/5 dark:bg-white/[0.02] bg-white cursor-pointer hover:border-blue-500/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center", DONE_STATES.has(t.estado) ? "bg-green-500 border-green-500" : "border-gray-400 dark:border-white/20")}>
                          {DONE_STATES.has(t.estado) && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex flex-col">
                          <span className={cn("text-sm font-bold", DONE_STATES.has(t.estado) ? "line-through dark:text-white/30 text-gray-400" : "dark:text-white text-gray-900")}>{t.titulo}</span>
                          <span className="text-[10px] uppercase font-bold dark:text-white/40 text-gray-500">{t.estado}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {t.esfuerzo && (
                           <span className="text-[10px] font-bold px-2 py-1 rounded-md dark:bg-white/5 bg-black/5 dark:text-white/60 text-gray-600">
                             {t.esfuerzo} est.
                           </span>
                        )}
                        <div className="flex -space-x-2">
                          {t.asignado_ids?.slice(0,3).map(aid => {
                            const w = data?.trabajadores.find(x => x.id === aid);
                            return w ? <div key={aid} className="w-6 h-6 rounded-full dark:bg-[#121216] bg-white border dark:border-white/10 border-black/10 flex items-center justify-center text-[8px] font-black">{avatarOf(w.nombre)}</div> : null;
                          })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "timeline" && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Calendar className="w-8 h-8 dark:text-white/20 text-gray-300 mb-4" />
                <p className="text-sm font-bold dark:text-white/60 text-gray-600 mb-1">Timeline Interno (Fases)</p>
                <p className="text-xs dark:text-white/40 text-gray-500 max-w-sm">Aquí se visualizarán las cápsulas de Research, Diseño, Dev y QA en formato Gantt interno.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Insights & Team */}
        <div className="w-[300px] flex-shrink-0 flex flex-col p-6 overflow-y-auto custom-scrollbar bg-black/[0.01] dark:bg-white/[0.005]">
          
          <h3 className="text-[10px] font-black uppercase tracking-widest dark:text-white/40 text-gray-500 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5" /> Insights Reales
          </h3>
          <div className="flex flex-col gap-3 mb-8">
             <div className="p-4 rounded-2xl border dark:border-orange-500/20 border-orange-200 dark:bg-orange-500/10 bg-orange-50">
               <p className="text-xs font-bold dark:text-orange-400 text-orange-600 mb-1">Desviación de Tiempo</p>
               <p className="text-2xl font-black dark:text-white text-gray-900">{efficiencyDeviation > 0 ? `+${efficiencyDeviation}%` : `${efficiencyDeviation}%`}</p>
               <p className="text-[10px] font-medium dark:text-orange-400/80 text-orange-600/80 mt-1">
                 {efficiencyDeviation > 0 ? "El equipo está tardando más de lo estimado." : "El equipo está siendo eficiente."}
               </p>
             </div>
             
             {isDelayed && (
               <div className="p-4 rounded-2xl border dark:border-red-500/20 border-red-200 dark:bg-red-500/10 bg-red-50">
                 <p className="text-xs font-bold dark:text-red-400 text-red-600 mb-1">Proyecto Retrasado</p>
                 <p className="text-sm font-bold dark:text-red-400/80 text-red-600/80 mt-1">
                   Fecha límite vencida. Se requiere acción inmediata.
                 </p>
               </div>
             )}
          </div>

          <h3 className="text-[10px] font-black uppercase tracking-widest dark:text-white/40 text-gray-500 mb-4 flex items-center gap-2">
            <Users className="w-3.5 h-3.5" /> Equipo Asignado ({workers.length})
          </h3>
          <div className="flex flex-col gap-2 mb-8">
            {workers.map((w: any) => (
              <div key={w.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer" onClick={() => openRelated?.({ type: "worker", id: w.id })}>
                <div className="w-8 h-8 rounded-full dark:bg-white/10 bg-black/10 flex items-center justify-center text-[9px] font-black">{avatarOf(w.nombre)}</div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold dark:text-white text-gray-900">{w.nombre}</span>
                  <span className="text-[9px] uppercase font-bold dark:text-white/40 text-gray-500">{w.rol}</span>
                </div>
              </div>
            ))}
            {workers.length === 0 && <p className="text-xs dark:text-white/30 text-gray-400">Sin equipo asignado</p>}
          </div>

          <h3 className="text-[10px] font-black uppercase tracking-widest dark:text-white/40 text-gray-500 mb-4 flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" /> Archivos & Contexto
          </h3>
          <div className="flex flex-col gap-2">
            {project.recursosDrive ? (
              <a href={project.recursosDrive} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 rounded-xl border dark:border-white/5 border-black/5 dark:bg-white/[0.02] bg-white hover:border-blue-500/50 transition-colors">
                <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center"><ExternalLink className="w-3 h-3 text-blue-500" /></div>
                <span className="text-xs font-bold dark:text-white/80 text-gray-700">Carpeta Drive</span>
              </a>
            ) : (
              <p className="text-xs dark:text-white/30 text-gray-400">No hay archivos vinculados.</p>
            )}
            {project.descripcion && (
              <div className="p-3 rounded-xl border dark:border-white/5 border-black/5 mt-2">
                <p className="text-[10px] uppercase font-bold dark:text-white/40 text-gray-500 mb-1">Descripción</p>
                <p className="text-xs dark:text-white/80 text-gray-700 leading-relaxed">{project.descripcion}</p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
