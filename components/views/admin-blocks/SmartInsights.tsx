"use client";

import { useMemo } from "react";
import { useData } from "@/hooks/useData";
import { DONE_STATES } from "@/lib/constants";
import { ShieldAlert, UserCog, BarChart4, Sparkles } from "lucide-react";
import { parseEsfuerzoMins } from "@/lib/utils";

function parseLocalDate(s: string): Date {
  if (!s) return new Date();
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function SmartInsights() {
  const { data } = useData();

  const insights = useMemo(() => {
    if (!data) return [];
    const result = [];
    const today = new Date(); today.setHours(0,0,0,0);

    // 1. Riesgo de Proyectos (Naranja)
    const activeProjects = data.proyectos.filter(p => !DONE_STATES.has(p.estadoProyecto));
    let projectRisk = null;
    for (const p of activeProjects) {
      const pTasks = data.tareas.filter(t => t.proyecto_ids?.includes(p.id) && !DONE_STATES.has(t.estado));
      const overdueTasks = pTasks.filter(t => t.fechaEntrega && parseLocalDate(t.fechaEntrega) < today);
      if (overdueTasks.length > 0) {
        projectRisk = {
          id: `risk-${p.id}`,
          type: "warning",
          icon: ShieldAlert,
          color: "text-orange-500 dark:text-orange-400",
          bg: "bg-orange-500/10 border-orange-500/20",
          text: `El proyecto ${p.nombre} tiene ${overdueTasks.length} tareas con retraso que afectan la entrega.`
        };
        break;
      }
    }
    if (projectRisk) result.push(projectRisk);
    else {
       // Fallback if no risk
       result.push({
          id: "risk-ok",
          type: "success",
          icon: ShieldAlert,
          color: "text-emerald-500 dark:text-emerald-400",
          bg: "bg-emerald-500/10 border-emerald-500/20",
          text: "Todos los proyectos activos están entregando a tiempo."
       });
    }

    // 2. Sobrecarga de Equipo (Verde en la imagen)
    const workers = data.trabajadores.filter(w => w.rol !== "Admin");
    let overloadedWorker = null;
    for (const w of workers) {
      const wTasks = data.tareas.filter(t => t.asignado_ids?.includes(w.id) && !DONE_STATES.has(t.estado));
      const totalMins = wTasks.reduce((s, t) => s + parseEsfuerzoMins(t.esfuerzo || ""), 0);
      if (totalMins > 480) {
        const extraPct = Math.round(((totalMins - 480) / 480) * 100);
        overloadedWorker = {
          id: `worker-${w.id}`,
          type: "team",
          icon: UserCog,
          color: "text-emerald-500 dark:text-emerald-400",
          bg: "bg-emerald-500/10 border-emerald-500/20",
          text: `${w.nombre.split(" ")[0]} está sobrecargado esta semana (+${extraPct}% de tiempo estimado).`
        };
        break;
      }
    }
    if (overloadedWorker) result.push(overloadedWorker);
    else {
      result.push({
          id: "worker-ok",
          type: "team",
          icon: UserCog,
          color: "text-blue-500 dark:text-blue-400",
          bg: "bg-blue-500/10 border-blue-500/20",
          text: "La carga de trabajo del equipo está balanceada esta semana."
      });
    }

    // 3. Ineficiencia o tiempo (Azul)
    const unassignedTasks = data.tareas.filter(t => !DONE_STATES.has(t.estado) && (!t.asignado_ids || t.asignado_ids.length === 0));
    if (unassignedTasks.length > 0) {
      result.push({
        id: "unassigned",
        type: "info",
        icon: BarChart4,
        color: "text-blue-500 dark:text-blue-400",
        bg: "bg-blue-500/10 border-blue-500/20",
        text: `Hay ${unassignedTasks.length} tareas activas sin asignar que podrían retrasarse.`
      });
    } else {
      result.push({
        id: "efficiency",
        type: "info",
        icon: BarChart4,
        color: "text-purple-500 dark:text-purple-400",
        bg: "bg-purple-500/10 border-purple-500/20",
        text: "La asignación de tareas actuales es del 100%."
      });
    }

    return result;
  }, [data]);

  return (
    <div className="p-6 h-full flex flex-col relative overflow-hidden group">
      
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-black dark:text-white text-gray-900 tracking-tighter uppercase">Insights Inteligentes</h3>
      </div>

      <div className="flex flex-col gap-4 flex-1 justify-center">
        {insights.map(insight => (
          <div key={insight.id} className="flex gap-4 items-start">
            <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center border ${insight.bg} ${insight.color}`}>
              <insight.icon className="w-5 h-5" />
            </div>
            <p className="text-xs dark:text-white/60 text-gray-600 font-medium leading-snug pt-1">
              {insight.text}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 dark:border-white/5 border-black/5 border-t">
         <button className="text-[10px] font-black uppercase tracking-widest text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors flex items-center gap-1">
           Ver más insights →
         </button>
      </div>
    </div>
  );
}
