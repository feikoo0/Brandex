"use client";

import { useMemo } from "react";
import { useData } from "@/hooks/useData";
import { DONE_STATES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Activity, AlertCircle, CheckCircle2, Target } from "lucide-react";
import { parseEsfuerzoMins } from "@/lib/utils";

function parseLocalDate(s: string): Date {
  if (!s) return new Date();
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function SystemControl() {
  const { data } = useData();

  const stats = useMemo(() => {
    if (!data) return { activeProjects: 0, overdueTasks: 0, weeklyCompliance: 0, totalHoursWorked: 0, totalHoursExpected: 0 };
    
    const today = new Date();
    today.setHours(0,0,0,0);

    // Active projects
    const activeProjects = data.proyectos.filter(p => !DONE_STATES.has(p.estadoProyecto)).length;

    // Overdue tasks
    let overdueTasks = 0;
    data.tareas.forEach(t => {
      if (!DONE_STATES.has(t.estado) && t.fechaEntrega) {
        if (parseLocalDate(t.fechaEntrega) < today) overdueTasks++;
      }
    });

    // Time calculations (Simulation of weekly compliance)
    // We will look at tasks scheduled for the current week.
    // For simplicity, let's just look at all tasks that have a date.
    let expectedMins = 0;
    let workedMins = 0;
    
    data.tareas.forEach(t => {
       // if task has effort
       const effort = parseEsfuerzoMins(t.esfuerzo || "");
       if (effort > 0) {
         expectedMins += effort;
         if (DONE_STATES.has(t.estado)) {
           workedMins += effort;
         }
       }
    });

    const weeklyCompliance = expectedMins > 0 ? Math.round((workedMins / expectedMins) * 100) : 0;

    return {
      activeProjects,
      overdueTasks,
      weeklyCompliance,
      totalHoursWorked: (workedMins / 60).toFixed(1),
      totalHoursExpected: (expectedMins / 60).toFixed(1)
    };

  }, [data]);

  return (
    <div className="p-2 h-full flex flex-col relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-500/5 rounded-full blur-[60px] group-hover:bg-blue-500/10 transition-all duration-700" />
      
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
          <Activity className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-black text-white">Salud del Sistema</h3>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Control General</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 flex-1 relative z-10">
        {/* Active Projects */}
        <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5 flex flex-col justify-between hover:bg-white/[0.05] transition-colors">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Proyectos Activos</span>
            <Target className="w-3.5 h-3.5 text-blue-400/50" />
          </div>
          <p className="text-3xl font-black text-white tracking-tighter">{stats.activeProjects}</p>
        </div>

        {/* Overdue Tasks */}
        <div className="bg-red-500/[0.03] rounded-2xl p-4 border border-red-500/10 flex flex-col justify-between hover:bg-red-500/[0.05] transition-colors">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black uppercase text-red-400/60 tracking-widest">Tareas Vencidas</span>
            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
          </div>
          <p className="text-3xl font-black text-red-400 tracking-tighter">{stats.overdueTasks}</p>
        </div>

        {/* Compliance */}
        <div className="col-span-2 bg-gradient-to-br from-white/[0.03] to-transparent rounded-2xl p-4 border border-white/5">
           <div className="flex justify-between items-center mb-3">
             <div className="flex items-center gap-2">
               <CheckCircle2 className="w-4 h-4 text-emerald-400" />
               <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Cumplimiento Global</span>
             </div>
             <span className="text-sm font-black text-emerald-400">{stats.weeklyCompliance}%</span>
           </div>
           
           <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mb-3">
             <div 
               className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-1000"
               style={{ width: `${stats.weeklyCompliance}%` }}
             />
           </div>

           <div className="flex justify-between">
             <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
               Real: <span className="text-white/80">{stats.totalHoursWorked}h</span>
             </span>
             <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
               Esperado: <span className="text-white/80">{stats.totalHoursExpected}h</span>
             </span>
           </div>
        </div>
      </div>
    </div>
  );
}
