"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useData, useCreateProject } from "@/hooks/useData";
import { PROJ_PRIO_OPTS, PROJ_STATUS_OPTS } from "@/lib/constants";
import { useUIStore } from "@/lib/store";

export function NewProjectCanvas() {
  const { data } = useData();
  const createProject = useCreateProject();
  const popView = useUIStore(s => s.popView);
  const pushView = useUIStore(s => s.pushView);
  
  const [saving, setSaving] = useState(false);
  const [nombre, setNombre] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [estadoProyecto, setEstadoProyecto] = useState("🧠 Planificacion");
  const [prioridad, setPrioridad] = useState("MODERADO");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState("");

  async function handleCreateProject() {
    if (!nombre.trim() || saving) return;
    setError("");
    setSaving(true);
    try {
      const res = await createProject.mutateAsync({
        nombre: nombre.trim(),
        cliente_ids: clienteId ? [clienteId] : [],
        estadoProyecto,
        prioridad,
        fechaInicio: fechaInicio || undefined,
        fechaFin: fechaFin || undefined,
        descripcion: descripcion || undefined,
      } as any);
      
      // Navigate to the new project or go back
      popView();
      // If we got the ID back we could pushView({level: 'project', id: res.id})
      // But typically we just pop back for now.
    } catch (err: any) {
      setError(err?.message || "No se pudo crear el proyecto.");
    } finally {
      setSaving(false);
    }
  }

  const clients = data?.clientes ?? [];

  return (
    <div className="w-full h-full flex flex-col pt-6 px-10">
      <div className="flex-shrink-0 mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight dark:text-white text-gray-900">
            Nuevo Proyecto
          </h1>
          <p className="text-sm font-bold dark:text-white/40 text-gray-500 mt-1">
            Crea una nueva campaña, desarrollo web, o entregable agrupado.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={popView} 
            className="px-4 py-2.5 rounded-xl dark:bg-white/5 bg-black/5 text-xs font-bold dark:text-white/60 text-gray-600 hover:bg-black/10 dark:hover:bg-white/10"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreateProject}
            disabled={!nombre.trim() || saving}
            className="px-5 py-2.5 rounded-xl bg-green-500 text-[#0a2417] text-xs font-black uppercase tracking-wider flex items-center gap-2 disabled:opacity-50 hover:bg-green-400 transition-colors"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Crear Proyecto
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8">
          
          <div className="flex flex-col gap-6">
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

          <div className="flex flex-col gap-5 p-6 rounded-3xl dark:bg-white/[0.02] bg-black/[0.02] border dark:border-white/5 border-black/5">
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

            {error && <p className="text-xs font-bold text-red-500 mt-2">{error}</p>}
          </div>

        </div>
      </div>
    </div>
  );
}
