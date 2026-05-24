"use client";

import { useState, useEffect } from "react";
import { X, ExternalLink, Loader2, Save, Users, Mail, Phone, Instagram, MessageSquare } from "lucide-react";
import { useData, useUpdateClient, useCreateClient } from "@/hooks/useData";
import { statusColor } from "@/lib/utils";
import { POTENCIAL_OPTS, FUENTE_OPTS } from "@/lib/constants";
import type { ModalEntry } from "@/lib/types";

interface Props {
  id:           string;
  isAdmin:      boolean;
  onClose:      () => void;
  openRelated?: (e: ModalEntry) => void;
}

export function ClientDetail({ id, isAdmin, onClose, openRelated }: Props) {
  const { data } = useData();
  const updateClient = useUpdateClient();
  const createClient = useCreateClient();
  
  const isCreate = id === "new";
  const client = data?.clientes.find((x) => x.id === id);
  const projs = (data?.proyectos ?? []).filter((p) => p.cliente_ids?.includes(id));

  const [nombre, setNombre] = useState(client?.nombre ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [tel, setTel] = useState(client?.tel ?? "");
  const [instagram, setInstagram] = useState(client?.instagram ?? "");
  const [potencial, setPotencial] = useState(client?.potencial ?? "Prospecto");
  const [fuente, setFuente] = useState(client?.fuente ?? "");
  const [obs, setObs] = useState(client?.obs ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (client) {
      setNombre(client.nombre);
      setEmail(client.email || "");
      setTel(client.tel || "");
      setInstagram(client.instagram || "");
      setPotencial(client.potencial || "Prospecto");
      setFuente(client.fuente || "");
      setObs(client.obs || "");
    }
  }, [client]);

  async function handleSave() {
    if (!nombre.trim()) return;
    setSaving(true);
    try {
      if (isCreate) {
        await createClient.mutateAsync({ nombre, email, tel, instagram, potencial, fuente, obs } as any);
      } else {
        await updateClient.mutateAsync({ id, nombre, email, tel, instagram, potencial, fuente, obs } as any);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  if (!client && !isCreate) {
    return (
      <div className="bg-[#0e0e12] border border-white/10 rounded-[2rem] p-8">
        <p className="text-white/40 text-sm">Cliente no encontrado.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0e0e12]/95 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">{isCreate ? "Nuevo Cliente" : "Detalle de Cliente"}</span>
            <h2 className="text-sm font-bold text-white leading-tight">{nombre || "Sin nombre"}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isCreate && client?.url && (
            <a href={client.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-[11px] font-bold hover:bg-white/10 transition-all">
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
        {/* Name Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-white/20 uppercase ml-1">Nombre Completo</label>
          <input 
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            disabled={!isAdmin}
            placeholder="Nombre de la empresa o persona..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50"
          />
        </div>

        {/* Contact Grid */}
        <div className="grid grid-cols-2 gap-4">
           <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-white/20 uppercase ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                <input 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white"
                />
              </div>
           </div>
           <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-white/20 uppercase ml-1">Teléfono</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                <input 
                  value={tel}
                  onChange={e => setTel(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white"
                />
              </div>
           </div>
           <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-white/20 uppercase ml-1">Instagram</label>
              <div className="relative">
                <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                <input 
                  value={instagram}
                  onChange={e => setInstagram(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white"
                />
              </div>
           </div>
           <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-white/20 uppercase ml-1">Origen / Fuente</label>
              <select 
                value={fuente}
                onChange={e => setFuente(e.target.value)}
                disabled={!isAdmin}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white appearance-none"
              >
                <option value="">— Seleccionar Fuente —</option>
                {FUENTE_OPTS.map(o => <option key={o} value={o} className="bg-black">{o}</option>)}
              </select>
           </div>
           <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-[10px] font-black text-white/20 uppercase ml-1">Potencial / Status</label>
              <select 
                value={potencial}
                onChange={e => setPotencial(e.target.value)}
                disabled={!isAdmin}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white appearance-none"
              >
                {POTENCIAL_OPTS.map(o => <option key={o} value={o} className="bg-black">{o}</option>)}
              </select>
           </div>
        </div>

        {/* Observation */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-white/20 uppercase ml-1">Observaciones</label>
          <textarea 
            rows={3}
            value={obs}
            onChange={e => setObs(e.target.value)}
            disabled={!isAdmin}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white resize-none"
          />
        </div>

        {/* Projects List */}
        {!isCreate && (
          <div className="space-y-3">
             <label className="text-[10px] font-black text-white/20 uppercase ml-1">Proyectos Relacionados ({projs.length})</label>
             <div className="grid grid-cols-1 gap-2">
                {projs.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => openRelated?.({ type: 'proyecto', id: p.id })}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-all group"
                  >
                    <span className="text-xs font-bold text-white group-hover:text-purple-400 transition-colors">{p.nombre}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 uppercase font-black">{p.estadoProyecto}</span>
                  </button>
                ))}
                {projs.length === 0 && <p className="text-[10px] text-white/20 italic p-2">No hay proyectos activos para este cliente.</p>}
             </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {isAdmin && (
        <div className="p-4 border-t border-white/5 bg-white/[0.01] flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 rounded-xl text-xs font-bold text-white/40 hover:bg-white/5 transition-all">Cancelar</button>
          <button 
            onClick={handleSave}
            disabled={saving || !nombre}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-xl text-xs font-black transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {isCreate ? "Crear Cliente" : "Guardar Cambios"}
          </button>
        </div>
      )}
    </div>
  );
}
