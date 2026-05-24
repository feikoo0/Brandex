"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useData, useCreateTask } from "@/hooks/useData";
import { TASK_ESTADO_OPTS, TASK_PRIO_OPTS, ESFUERZOS, FORMATOS, AREAS } from "@/lib/constants";
import { useUIStore } from "@/lib/store";

export function NewTaskCanvas() {
  const { data } = useData();
  const createTask = useCreateTask();
  const popView = useUIStore(s => s.popView);
  
  const [saving, setSaving] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [estado, setEstado] = useState("Por hacer");
  const [prioridad, setPrioridad] = useState("Media");
  const [formato, setFormato] = useState("");
  const [area, setArea] = useState("");
  const [esfuerzo, setEsfuerzo] = useState("");
  const [asignado, setAsignado] = useState("");
  const [fechaProg, setFechaProg] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [proyectoId, setProyectoId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [error, setError] = useState("");

  const workers = data?.trabajadores.map((w) => w.nombre) ?? [];
  const projects = data?.proyectos ?? [];
  const clients = data?.clientes ?? [];

  const handleProjectChange = (id: string) => {
    setProyectoId(id);
    if (id) {
      const proj = projects.find(p => p.id === id);
      if (proj && proj.cliente_ids?.[0]) {
        setClienteId(proj.cliente_ids[0]);
      }
    }
  };

  async function handleCreateTask() {
    if (!titulo.trim() || saving) return;
    setError("");
    setSaving(true);
    try {
      const p: Record<string, string> = { titulo: titulo.trim() };
      if (contenido) p.contenido = contenido;
      if (estado) p.estado = estado;
      if (prioridad) p.prioridad = prioridad;
      if (formato) p.formato = formato;
      if (area) p.area = area;
      if (esfuerzo) p.esfuerzo = esfuerzo;
      if (asignado) p.asignado = asignado;
      if (fechaProg) p.fechaProg = fechaProg;
      if (fechaEntrega) p.fechaEntrega = fechaEntrega;
      if (proyectoId) p.proyecto_id = proyectoId;
      if (clienteId) p.cliente_id = clienteId;

      await createTask.mutateAsync(p as never);
      popView();
    } catch (err: any) {
      setError(err?.message || "No se pudo crear la tarea.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full h-full flex flex-col pt-6 px-10">
      <div className="flex-shrink-0 mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight dark:text-white text-gray-900">
            Nueva Tarea
          </h1>
          <p className="text-sm font-bold dark:text-white/40 text-gray-500 mt-1">
            Crea un entregable o tarea individual y asígnala a un proyecto.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={popView} 
            className="px-4 py-2.5 rounded-xl dark:bg-white/5 bg-black/5 text-xs font-bold dark:text-white/60 text-gray-600 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreateTask}
            disabled={!titulo.trim() || saving}
            className="px-5 py-2.5 rounded-xl bg-blue-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 disabled:opacity-50 hover:bg-blue-400 transition-colors shadow-lg shadow-blue-500/20"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Crear Tarea
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8">
          
          {/* Main Info */}
          <div className="flex flex-col gap-6">
            <label className="flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest dark:text-white/40 text-gray-500">Título *</span>
              <input
                autoFocus
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej: Diseñar carrusel de Instagram..."
                className="w-full dark:bg-white/5 bg-black/5 border dark:border-white/10 border-black/10 rounded-2xl px-4 py-3 text-sm font-bold dark:text-white text-gray-900 outline-none focus:border-blue-500/60"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest dark:text-white/40 text-gray-500">Descripción / Brief</span>
              <textarea
                value={contenido}
                onChange={(e) => setContenido(e.target.value)}
                rows={8}
                placeholder="Contexto, referencias, copies requeridos..."
                className="w-full dark:bg-white/5 bg-black/5 border dark:border-white/10 border-black/10 rounded-2xl px-4 py-3 text-sm font-medium dark:text-white text-gray-900 outline-none focus:border-blue-500/60 resize-none"
              />
            </label>
          </div>

          {/* Sidebar Info */}
          <div className="flex flex-col gap-5 p-6 rounded-3xl dark:bg-white/[0.02] bg-black/[0.02] border dark:border-white/5 border-black/5">
            
            <label className="flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest dark:text-white/40 text-gray-500">Proyecto</span>
              <select value={proyectoId} onChange={(e) => handleProjectChange(e.target.value)} className="w-full dark:bg-white/5 bg-black/5 border dark:border-white/10 border-black/10 rounded-xl px-3 py-2.5 text-xs font-bold dark:text-white text-gray-900 outline-none">
                <option value="">Sin proyecto</option>
                {projects.map((p) => <option key={p.id} value={p.id}>📁 {p.nombre}</option>)}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest dark:text-white/40 text-gray-500">Cliente</span>
              <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="w-full dark:bg-white/5 bg-black/5 border dark:border-white/10 border-black/10 rounded-xl px-3 py-2.5 text-xs font-bold dark:text-white text-gray-900 outline-none">
                <option value="">Sin cliente</option>
                {clients.map((c) => <option key={c.id} value={c.id}>🏢 {c.nombre}</option>)}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3 mt-2">
              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest dark:text-white/40 text-gray-500">Estado</span>
                <select value={estado} onChange={(e) => setEstado(e.target.value)} className="w-full dark:bg-white/5 bg-black/5 border dark:border-white/10 border-black/10 rounded-xl px-3 py-2 text-xs font-bold dark:text-white text-gray-900 outline-none">
                  {TASK_ESTADO_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest dark:text-white/40 text-gray-500">Prioridad</span>
                <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className="w-full dark:bg-white/5 bg-black/5 border dark:border-white/10 border-black/10 rounded-xl px-3 py-2 text-xs font-bold dark:text-white text-gray-900 outline-none">
                  {TASK_PRIO_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest dark:text-white/40 text-gray-500">Formato</span>
                <select value={formato} onChange={(e) => setFormato(e.target.value)} className="w-full dark:bg-white/5 bg-black/5 border dark:border-white/10 border-black/10 rounded-xl px-3 py-2 text-xs font-bold dark:text-white text-gray-900 outline-none">
                  <option value="">—</option>
                  {FORMATOS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest dark:text-white/40 text-gray-500">Esfuerzo</span>
                <select value={esfuerzo} onChange={(e) => setEsfuerzo(e.target.value)} className="w-full dark:bg-white/5 bg-black/5 border dark:border-white/10 border-black/10 rounded-xl px-3 py-2 text-xs font-bold dark:text-white text-gray-900 outline-none">
                  <option value="">—</option>
                  {ESFUERZOS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest dark:text-white/40 text-gray-500">Área</span>
                <select value={area} onChange={(e) => setArea(e.target.value)} className="w-full dark:bg-white/5 bg-black/5 border dark:border-white/10 border-black/10 rounded-xl px-3 py-2 text-xs font-bold dark:text-white text-gray-900 outline-none">
                  <option value="">—</option>
                  {AREAS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest dark:text-white/40 text-gray-500">Asignado</span>
                <select value={asignado} onChange={(e) => setAsignado(e.target.value)} className="w-full dark:bg-white/5 bg-black/5 border dark:border-white/10 border-black/10 rounded-xl px-3 py-2 text-xs font-bold dark:text-white text-gray-900 outline-none">
                  <option value="">—</option>
                  {workers.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2">
              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest dark:text-white/40 text-gray-500">Prog.</span>
                <input type="date" value={fechaProg} onChange={(e) => setFechaProg(e.target.value)} className="w-full dark:bg-white/5 bg-black/5 border dark:border-white/10 border-black/10 rounded-xl px-3 py-2 text-xs font-bold dark:text-white text-gray-900 outline-none" />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#ff9f0a]">Entrega</span>
                <input type="date" value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} className="w-full bg-[#ff9f0a]/10 border border-[#ff9f0a]/20 rounded-xl px-3 py-2 text-xs font-bold text-[#ff9f0a] outline-none" />
              </label>
            </div>

            {error && <p className="text-xs font-bold text-red-500 mt-2">{error}</p>}
          </div>

        </div>
      </div>
    </div>
  );
}
