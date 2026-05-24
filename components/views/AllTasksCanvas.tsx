"use client";

import { useData } from "@/hooks/useData";
import { useUIStore } from "@/lib/store";
import { CanvasLayout } from "./CanvasLayout";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { CheckSquare, Star, ChevronLeft, Play, ListTodo, Activity } from "lucide-react";
import { cn, parseEsfuerzoMins } from "@/lib/utils";
import { DONE_STATES } from "@/lib/constants";

export function AllTasksCanvas() {
  const { data } = useData();
  const tasks = data?.tareas || [];
  
  const pinnedTasks = useUIStore(s => s.pinnedTasks);
  const togglePinTask = useUIStore(s => s.togglePinTask);
  const goToHome = useUIStore(s => s.goToHome);
  const pushView = useUIStore(s => s.pushView);

  const pendingTasks = tasks.filter(t => !DONE_STATES.has(t.estado));
  
  const leftBlock = (
    <div className="flex flex-col gap-8 h-full">
      <div className="flex flex-col gap-4">
        <div className="mt-2">
          <h1 className="text-3xl font-black tracking-tight leading-none text-white">Tareas</h1>
          <p className="text-xs font-bold text-white/40 mt-3 uppercase tracking-widest">
            Master Canvas
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2"><CheckSquare className="w-3.5 h-3.5" /> Centro de Tareas</h3>
        <p className="text-sm text-white/80 leading-relaxed font-medium">
          Visualiza todas las tareas pendientes globales de todos los proyectos activos.
        </p>
        
        <div className="mt-8 flex flex-col gap-4">
           <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Tareas Pendientes</span>
              <span className="text-xl font-black text-white">{pendingTasks.length}</span>
           </div>
           <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-blue-500/80 uppercase tracking-widest">Esfuerzo Total</span>
              <span className="text-xl font-black text-blue-400">
                {Math.round(pendingTasks.reduce((s, t) => s + parseEsfuerzoMins(t.esfuerzo || "0"), 0) / 60)}h
              </span>
           </div>
        </div>
      </div>
    </div>
  );

  const centerBlock = (
    <div className="flex flex-col gap-6 min-h-[400px]">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
         <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2"><ListTodo className="w-3.5 h-3.5" /> Todas las Tareas</h3>
      </div>
      
      <div className="flex flex-col gap-3">
        {pendingTasks.map(t => {
           const project = data?.proyectos.find(p => t.proyecto_ids?.includes(p.id));
           return (
             <div key={t.id} className="flex items-center gap-4 bg-white/5 border border-white/5 p-4 rounded-2xl group transition-all hover:border-white/20 cursor-pointer" onClick={() => pushView({ level: 'task', id: t.id })}>
               <div className="flex flex-col flex-1">
                 <p className="text-sm font-bold text-white/90 group-hover:text-white transition-colors">{t.titulo}</p>
                 <div className="flex items-center gap-2 mt-1">
                   <p className="text-[10px] font-bold text-[#4ade80] uppercase tracking-widest">{project?.nombre || "Sin Proyecto"}</p>
                   <span className="text-white/20">•</span>
                   <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{t.estado}</p>
                 </div>
               </div>
               
               <div className="text-xs font-bold text-white/50 bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                 {t.esfuerzo || "1h"}
               </div>
             </div>
           );
        })}
      </div>
    </div>
  );

  const rightBlock = (
    <div className="flex flex-col gap-6">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-white/50 flex items-center gap-2"><Activity className="w-3.5 h-3.5" /> Insights</h3>
      
      <div className="flex flex-col gap-4">
        {pendingTasks.length > 20 ? (
          <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
            <p className="text-xs text-orange-400 leading-relaxed font-medium">Hay una gran cantidad de tareas pendientes globales. Considera enfocar al equipo en un solo proyecto.</p>
          </div>
        ) : (
          <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
            <p className="text-xs text-green-400 leading-relaxed font-medium">La carga de trabajo se ve manejable a nivel global.</p>
          </div>
        )}
      </div>
    </div>
  );

  return <CanvasLayout leftBlock={leftBlock} centerBlock={centerBlock} rightBlock={rightBlock} />;
}
