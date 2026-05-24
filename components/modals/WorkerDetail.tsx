"use client";

import { useState, useEffect, useMemo } from "react";
import { X, ExternalLink, Loader2, Save, User, Mail, Phone, Briefcase, Clock, Calendar } from "lucide-react";
import { useData, useUpdateWorker } from "@/hooks/useData";
import { cn } from "@/lib/utils";
import { DONE_STATES } from "@/lib/constants";
import type { ModalEntry, Task } from "@/lib/types";

interface Props {
  id:           string;
  isAdmin:      boolean;
  onClose:      () => void;
  openRelated?: (e: ModalEntry) => void;
}

export function WorkerDetail({ id, isAdmin, onClose, openRelated }: Props) {
  const { data } = useData();
  const updateWorker = useUpdateWorker();
  
  const worker = data?.trabajadores.find((x) => x.id === id);
  const workerTasks = useMemo(() => 
    (data?.tareas ?? []).filter(t => t.asignado_ids?.includes(id) && !DONE_STATES.has(t.estado)),
  [data?.tareas, id]);

  const [nombre, setNombre] = useState(worker?.nombre ?? "");
  const [email, setEmail] = useState(worker?.email ?? "");
  const [telefono, setTelefono] = useState(worker?.telefono ?? "");
  const [rol, setRol] = useState(worker?.rol ?? "");
  const [notas, setNotas] = useState(worker?.notas ?? "");
  const [disponibilidad, setDisponibilidad] = useState(worker?.disponibilidad ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (worker) {
      setNombre(worker.nombre);
      setEmail(worker.email || "");
      setTelefono(worker.telefono || "");
      setRol(worker.rol || "");
      setNotas(worker.notas || "");
      setDisponibilidad(worker.disponibilidad || "");
    }
  }, [worker]);

  async function handleSave() {
    if (!nombre.trim()) return;
    setSaving(true);
    try {
      await updateWorker.mutateAsync({ id, nombre, email, telefono, rol, notas, disponibilidad } as any);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  if (!worker) {
    return (
      <div className="bg-[#0e0e12] border border-white/10 rounded-[2rem] p-8 text-center">
        <p className="text-white/40 text-sm">Miembro del equipo no encontrado.</p>
        <button onClick={onClose} className="mt-4 text-xs font-bold text-blue-400 hover:underline">Cerrar</button>
      </div>
    );
  }

  return (
    <div className="bg-[#0e0e12]/95 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <User className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">Ficha de Equipo</span>
            <h2 className="text-sm font-bold text-white leading-tight">{nombre || "Cargando..."}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {worker.url && (
            <a href={worker.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-[11px] font-bold hover:bg-white/10 transition-all">
              <ExternalLink className="w-3.5 h-3.5" /> Notion
            </a>
          )}
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:bg-red-500/20 hover:text-red-400 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5 col-span-2">
            <label className="text-[10px] font-black text-white/20 uppercase ml-1">Nombre</label>
            <input 
              value={nombre} onChange={e => setNombre(e.target.value)} disabled={!isAdmin}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-white/20 uppercase ml-1">Rol / Especialidad</label>
            <input 
              value={rol} onChange={e => setRol(e.target.value)} disabled={!isAdmin}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-white/20 uppercase ml-1">Disponibilidad</label>
            <input 
              value={disponibilidad} onChange={e => setDisponibilidad(e.target.value)} disabled={!isAdmin}
              placeholder="Ej: 8h/día"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white"
            />
          </div>
        </div>

        {/* Contact */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-white/20 uppercase ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
              <input 
                value={email} onChange={e => setEmail(e.target.value)} disabled={!isAdmin}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-white/20 uppercase ml-1">Teléfono</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
              <input 
                value={telefono} onChange={e => setTelefono(e.target.value)} disabled={!isAdmin}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-white/20 uppercase ml-1">Biografía / Notas Internas</label>
          <textarea 
            rows={3} value={notas} onChange={e => setNotas(e.target.value)} disabled={!isAdmin}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white resize-none focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          />
        </div>

        {/* Active Tasks Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between ml-1">
            <label className="text-[10px] font-black text-white/20 uppercase">Tareas en Curso ({workerTasks.length})</label>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-white/20" />
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-tighter">Carga Activa</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            {workerTasks.map(t => (
              <button 
                key={t.id}
                onClick={() => openRelated?.({ type: 'task', id: t.id })}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-all group text-left"
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: getStatusColor(t.estado) }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors truncate">{t.titulo}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-white/30 uppercase font-black">{t.estado}</span>
                    {t.prioridad && <span className="text-[9px] text-white/20">•</span>}
                    {t.prioridad && <span className="text-[9px] text-white/20 uppercase">{t.prioridad}</span>}
                  </div>
                </div>
                {t.fechaEntrega && (
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className="text-[8px] text-white/20 uppercase font-black">Entrega</span>
                    <span className="text-[10px] text-white/40 font-bold">{t.fechaEntrega}</span>
                  </div>
                )}
              </button>
            ))}
            {workerTasks.length === 0 && (
              <div className="py-8 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-2xl opacity-30">
                <Briefcase className="w-5 h-5 mb-2" />
                <p className="text-[10px] font-bold uppercase">Sin tareas asignadas</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      {isAdmin && (
        <div className="p-4 border-t border-white/5 bg-white/[0.01] flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 rounded-xl text-xs font-bold text-white/40 hover:bg-white/5 transition-all">Cancelar</button>
          <button 
            onClick={handleSave}
            disabled={saving || !nombre}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-xs font-black transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Guardar Cambios
          </button>
        </div>
      )}
    </div>
  );
}

function getStatusColor(status: string) {
  const s = status.toLowerCase();
  if (s.includes("proceso") || s.includes("haciendo")) return "#3b82f6"; // Blue
  if (s.includes("revis") || s.includes("espera")) return "#eab308"; // Yellow
  if (s.includes("complet") || s.includes("listo")) return "#22c55e"; // Green
  return "#6b7280"; // Gray
}
