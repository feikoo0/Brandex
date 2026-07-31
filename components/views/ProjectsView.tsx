"use client";

import { useData } from "@/hooks/useData";
import { useProjectSummary } from "@/hooks/useProjectSummary";
import { STATUS_COLORS } from "@/lib/constants";
import { useUIStore } from "@/lib/store";
import { Loader2, Plus, Briefcase, Calendar, Target, CheckCircle2, Clock, DollarSign, Layers } from "lucide-react";

function ProjectCardView({ projectId }: { projectId: string }) {
  const openModal = useUIStore((s) => s.openModal);
  const summary = useProjectSummary(projectId);

  if (!summary.project) return null;

  const p = summary.project;
  const statusColor = STATUS_COLORS[summary.status] || "var(--blue)";

  return (
    <div 
      onClick={() => openModal({ type: "proyecto", id: p.id })}
      className="group p-6 rounded-3xl glass border border-white/10 hover:border-blue-500/30 transition-all duration-300 cursor-pointer flex flex-col justify-between hover:shadow-2xl hover:shadow-blue-500/5 relative overflow-hidden"
    >
      {/* Glow decorativo de fondo */}
      <div className="absolute -top-12 -right-12 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all" />

      <div>
        {/* Cabecera: Estatus & Cliente */}
        <div className="flex items-center justify-between mb-3 gap-2">
          <div 
            className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/5 border border-white/10 flex items-center gap-1.5" 
            style={{ color: statusColor }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
            {summary.status}
          </div>
          
          <span className="text-[11px] font-semibold text-white/50 truncate max-w-[140px]" title={summary.clientName}>
            {summary.clientName}
          </span>
        </div>

        {/* Título del Proyecto */}
        <h3 className="text-lg font-black tracking-tight mb-2 group-hover:text-blue-400 transition-colors line-clamp-1">
          {p.nombre}
        </h3>

        {/* Área & Paquete */}
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-3.5 h-3.5 text-white/30" />
          <span className="text-xs font-medium text-white/50">
            {summary.area || "General"}
          </span>
          {p.ciclo && (
            <>
              <span className="text-white/20">•</span>
              <span className="text-xs text-white/40">{p.ciclo}</span>
            </>
          )}
        </div>

        {/* Formatos / Bento Micro-badges */}
        {summary.formatos.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {summary.formatos.map((fmt) => (
              <span 
                key={fmt.key}
                className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/5 border border-white/10 text-white/70 flex items-center gap-1"
              >
                <span>{fmt.icon || "📄"}</span>
                <span>{fmt.count}</span>
                <span className="text-white/40 text-[9px]">{fmt.name}</span>
              </span>
            ))}
          </div>
        )}

        {/* Barra de Progreso */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="text-white/40 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-blue-400" />
              {summary.completedTasks} de {summary.totalTasks} entregables
            </span>
            <span className="text-blue-400 font-bold">{summary.progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${summary.progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-auto">
        <div className="flex items-center gap-1.5 text-xs text-white/50">
          <Calendar className="w-3.5 h-3.5 text-white/30" />
          <span>
            {summary.fechaFin ? new Date(summary.fechaFin).toLocaleDateString("es-ES", { month: "short", day: "numeric" }) : "Sin fecha"}
          </span>
        </div>

        {summary.costo > 0 && (
          <div className="flex items-center gap-1 text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            <DollarSign className="w-3 h-3" />
            <span>{summary.costo.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}

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
            Seguimiento de campañas y entregables de marca ({projects.length} activos)
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
        {projects.map((p) => (
          <ProjectCardView key={p.id} projectId={p.id} />
        ))}
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
