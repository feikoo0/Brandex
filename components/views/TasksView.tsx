"use client";

import { useData } from "@/hooks/useData";
import { STATUS_COLORS, PRIORITY_COLORS } from "@/lib/constants";
import { useUIStore } from "@/lib/store";
import { Loader2, Plus, ListTodo, Filter, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function TasksView() {
  const { data, isLoading } = useData();
  const openModal = useUIStore((s) => s.openModal);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const tasks = data?.tareas ?? [];

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Tareas</h2>
          <p className="text-sm" style={{ color: "var(--txt3)" }}>
            Listado detallado de todas las asignaciones
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold glass border-white/10 hover:bg-white/10 transition-all">
            <Filter className="w-3.5 h-3.5" />
            Filtros
          </button>
          <button 
            onClick={() => openModal({ type: "task", id: "new" })}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: "var(--blue)", color: "#fff" }}
          >
            <Plus className="w-4 h-4" />
            Nueva Tarea
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        <div className="glass rounded-2xl overflow-hidden border-white/5">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/5">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Título</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Estado</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Prioridad</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Asignado</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Entrega</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {tasks.map((t) => (
                <tr 
                  key={t.id} 
                  onClick={() => openModal({ type: "task", id: t.id })}
                  className="hover:bg-white/5 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold group-hover:text-blue-400 transition-colors">{t.titulo}</span>
                      <span className="text-[10px] text-white/20 font-medium tracking-tight mt-0.5 uppercase">
                        {t.formato || "General"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[t.estado] || "#333" }} />
                      <span className="text-[11px] font-bold text-white/60">{t.estado}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md" style={{ background: `${PRIORITY_COLORS[t.prioridad]}15`, color: PRIORITY_COLORS[t.prioridad] }}>
                      {t.prioridad}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[9px] font-black text-white/40 border border-white/5">
                        {t.asignado?.[0]?.toUpperCase() || "?"}
                      </div>
                      <span className="text-xs font-medium text-white/50">{t.asignado || "Sin asignar"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-white/30">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold">
                        {t.fechaEntrega ? format(new Date(t.fechaEntrega), "d MMM", { locale: es }) : "—"}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {tasks.length === 0 && !isLoading && (
          <div className="py-24 flex flex-col items-center justify-center text-center opacity-30">
            <ListTodo className="w-12 h-12 mb-4" />
            <h4 className="text-xl font-black">Lista vacía</h4>
            <p className="text-sm">No hay tareas programadas para este periodo.</p>
          </div>
        )}
      </div>
    </div>
  );
}
