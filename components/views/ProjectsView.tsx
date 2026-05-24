"use client";

import { useData } from "@/hooks/useData";
import { PROJ_STATUS_OPTS, STATUS_COLORS } from "@/lib/constants";
import { useUIStore } from "@/lib/store";
import { Loader2, Plus, Briefcase, Calendar, Target } from "lucide-react";

export function ProjectsView() {
  const { data, isLoading } = useData();
  const openModal = useUIStore((s) => s.openModal);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const projects = data?.proyectos ?? [];

  return (
    <div className="p-6 h-full flex flex-col overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Proyectos</h2>
          <p className="text-sm" style={{ color: "var(--txt3)" }}>
            Seguimiento de campañas y entregables de marca
          </p>
        </div>
        <button 
          onClick={() => openModal({ type: "proyecto", id: "new" })}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: "var(--blue)", color: "#fff" }}
        >
          <Plus className="w-4 h-4" />
          Nuevo Proyecto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {projects.map((p) => {
          const statusColor = STATUS_COLORS[p.estadoProyecto] || "var(--blue)";
          return (
            <div 
              key={p.id}
              onClick={() => openModal({ type: "proyecto", id: p.id })}
              className="group p-6 rounded-3xl glass hover:border-white/20 transition-all cursor-pointer flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/5`} style={{ color: statusColor }}>
                  {p.estadoProyecto}
                </div>
                <div className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">
                  {p.formato || "General"}
                </div>
              </div>

              <h3 className="text-xl font-black tracking-tight mb-2 group-hover:text-blue-400 transition-colors">
                {p.nombre}
              </h3>
              
              <div className="flex items-center gap-2 mb-6">
                <Target className="w-3.5 h-3.5 text-white/20" />
                <span className="text-xs font-medium text-white/40">
                  {p.area || "Sin área"}
                </span>
              </div>

              <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-white/20" />
                  <span className="text-xs font-bold">
                    {p.fechaFin ? new Date(p.fechaFin).toLocaleDateString() : "Sin fecha"}
                  </span>
                </div>
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-6 h-6 rounded-full glass border border-white/10 flex items-center justify-center text-[10px] font-black">
                      {i}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {projects.length === 0 && (
        <div className="py-24 flex flex-col items-center justify-center text-center opacity-30">
          <Briefcase className="w-12 h-12 mb-4" />
          <h4 className="text-xl font-black">No hay proyectos</h4>
          <p className="text-sm">Empieza a gestionar tu primer proyecto de marca hoy.</p>
        </div>
      )}
    </div>
  );
}
