"use client";

import React, { useState } from "react";
import { useUIStore } from "@/lib/store";
import type { Project } from "@/lib/types";
import GlassPanel from "./GlassPanel";
import { Pin, Trash2, Link, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScratchpadProps {
  projects: Project[];
}

export default function Scratchpad({ projects }: ScratchpadProps) {
  const { scratchpadPins, addPin, removePin } = useUIStore();
  const [content, setContent] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !selectedProjectId) return;
    addPin(selectedProjectId, content.trim());
    setContent("");
  };

  return (
    <GlassPanel className="p-4 flex flex-col min-h-[220px] bg-white/[0.01]">
      <div className="flex items-center gap-2 mb-3 select-none">
        <Pin className="w-4 h-4 text-cyan-400 rotate-[30deg]" />
        <h3 className="text-xs font-black uppercase text-white tracking-wider">
          Scratchpad / Pines Rápidos
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Pega una referencia, link o idea rápida... (ej. Probar esta tipografía)"
          className="w-full h-16 bg-black/40 border border-white/[0.06] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500/40 resize-none font-medium"
        />

        <div className="flex gap-2">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="flex-1 bg-black/40 border border-white/[0.06] rounded-xl px-2.5 py-1.5 text-[11px] text-neutral-300 focus:outline-none focus:border-cyan-500/40 font-semibold"
          >
            <option value="" disabled>Asignar a proyecto...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id} className="bg-[#0f0f12] text-white">
                {p.nombre}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={!content.trim() || !selectedProjectId}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-black text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1"
          >
            <Pin className="w-3.5 h-3.5 rotate-[30deg]" />
            <span>Pinear</span>
          </button>
        </div>
      </form>

      {/* Mini list of active pins in Scratchpad */}
      {scratchpadPins.length > 0 && (
        <div className="mt-4 border-t border-white/[0.05] pt-3 flex-1 min-h-0 flex flex-col">
          <p className="text-[10px] font-black uppercase text-neutral-500 tracking-wider mb-2">
            Pines Activos ({scratchpadPins.length})
          </p>
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
            {scratchpadPins.map((pin) => {
              const proj = projects.find((p) => p.id === pin.projectId);
              const isUrl = pin.content.startsWith("http://") || pin.content.startsWith("https://");
              return (
                <div
                  key={pin.id}
                  className="flex items-start justify-between gap-3 p-2 rounded-lg bg-black/30 border border-white/[0.03] text-[10px] text-neutral-300 group"
                >
                  <div className="min-w-0">
                    <p className="font-extrabold text-cyan-400 truncate uppercase tracking-wider mb-0.5">
                      {proj?.nombre || "Proyecto"}
                    </p>
                    <div className="flex items-start gap-1 font-medium leading-relaxed">
                      {isUrl ? <Link className="w-3 h-3 text-neutral-500 mt-0.5 flex-shrink-0" /> : <FileText className="w-3 h-3 text-neutral-500 mt-0.5 flex-shrink-0" />}
                      <span className="truncate break-all">
                        {pin.content}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removePin(pin.id)}
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-400 text-neutral-600 transition-opacity p-0.5"
                    title="Eliminar pin"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </GlassPanel>
  );
}
