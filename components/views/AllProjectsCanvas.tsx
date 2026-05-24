"use client";

import { useData } from "@/hooks/useData";
import { useUIStore } from "@/lib/store";
import { CanvasLayout } from "./CanvasLayout";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { FolderOpen, Star, ChevronLeft, ArrowUp, ArrowDown, Sparkles, Folder, Play, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";

export function AllProjectsCanvas() {
  const { data } = useData();
  const projects = data?.proyectos || [];
  
  const pinnedProjects = useUIStore(s => s.pinnedProjects);
  const togglePinProject = useUIStore(s => s.togglePinProject);
  const movePinnedProject = useUIStore(s => s.movePinnedProject);
  const autoSortPinnedProjects = useUIStore(s => s.autoSortPinnedProjects);
  const goToHome = useUIStore(s => s.goToHome);
  const pushView = useUIStore(s => s.pushView);

  // Group projects into pinned and unpinned
  const pinnedList = pinnedProjects.map(id => projects.find(p => p.id === id)).filter(Boolean) as any[];
  const unpinnedList = projects.filter(p => !pinnedProjects.includes(p.id));

  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const availableStatuses = useMemo(() => {
    const statuses = new Set(unpinnedList.map(p => p.estadoProyecto).filter(Boolean));
    return Array.from(statuses) as string[];
  }, [unpinnedList]);

  const unpinnedFiltered = useMemo(() => {
    if (!filterStatus) return unpinnedList;
    return unpinnedList.filter(p => p.estadoProyecto === filterStatus);
  }, [unpinnedList, filterStatus]);

  const leftBlock = (
    <div className="flex flex-col gap-8 h-full">
      <div className="flex flex-col gap-4">
        <div className="mt-2">
          <h1 className="text-3xl font-black tracking-tight leading-none text-white">Proyectos</h1>
          <p className="text-xs font-bold text-white/40 mt-3 uppercase tracking-widest">
            Master Canvas
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2"><FolderOpen className="w-3.5 h-3.5" /> Centro de Control</h3>
        <p className="text-sm text-white/80 leading-relaxed font-medium">
          Administra y ordena tus proyectos activos. Los proyectos fijados (con estrella) determinarán qué se renderiza en el Timeline global.
        </p>
        
        <div className="mt-8 flex flex-col gap-4">
           <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Total Activos</span>
              <span className="text-xl font-black text-white">{projects.length}</span>
           </div>
           <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-yellow-500/80 uppercase tracking-widest">Fijados en Timeline</span>
              <span className="text-xl font-black text-yellow-400">{pinnedProjects.length}</span>
           </div>
        </div>
      </div>
    </div>
  );

  const centerBlock = (
    <div className="flex flex-col gap-6 min-h-[400px]">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
         <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2"><Star className="w-3.5 h-3.5" /> Proyectos Fijados ({pinnedList.length})</h3>
         {pinnedList.length > 1 && (
           <button 
             onClick={() => autoSortPinnedProjects(projects)}
             className="text-[10px] font-bold text-[#4ade80] flex items-center gap-1.5 hover:text-white transition-colors bg-[#4ade80]/10 px-3 py-1.5 rounded-lg border border-[#4ade80]/20"
           >
             <Sparkles className="w-3 h-3" /> Auto Ordenar
           </button>
         )}
      </div>

      {pinnedList.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-white/10 rounded-2xl bg-white/5">
           <p className="text-xs font-bold text-white/40">No hay proyectos fijados.</p>
           <p className="text-[10px] font-medium text-white/30 mt-1">Usa la estrella abajo para agregarlos al Timeline.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {pinnedList.map((p, idx) => (
             <div key={p.id} className="flex items-center gap-4 bg-[#121216] border border-white/10 p-3 rounded-2xl group transition-all hover:border-yellow-500/50">
               <button 
                 onClick={() => togglePinProject(p.id)}
                 className="text-yellow-400 hover:text-white transition-colors"
               >
                 <Star className="w-5 h-5 fill-yellow-400" />
               </button>
               
               <div className="flex-1 cursor-pointer" onClick={() => pushView({ level: 'project', id: p.id })}>
                 <p className="text-sm font-bold text-white group-hover:text-yellow-400 transition-colors">{p.nombre}</p>
                 <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-0.5">{p.estadoProyecto}</p>
               </div>
               
               <div className="flex flex-col gap-1 pr-2">
                 <button 
                   onClick={() => movePinnedProject(p.id, 'up')}
                   disabled={idx === 0}
                   className="text-white/20 hover:text-white disabled:opacity-0 transition-colors p-1"
                 >
                   <ArrowUp className="w-3.5 h-3.5" />
                 </button>
                 <button 
                   onClick={() => movePinnedProject(p.id, 'down')}
                   disabled={idx === pinnedList.length - 1}
                   className="text-white/20 hover:text-white disabled:opacity-0 transition-colors p-1"
                 >
                   <ArrowDown className="w-3.5 h-3.5" />
                 </button>
               </div>
             </div>
          ))}
        </div>
      )}

      <div className="flex flex-col xl:flex-row xl:items-center justify-between border-b border-white/5 pb-4 mt-8 gap-4">
         <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2 flex-shrink-0"><Folder className="w-3.5 h-3.5" /> Otros Proyectos ({unpinnedFiltered.length}{filterStatus ? ` / ${unpinnedList.length}` : ""})</h3>
         
         {availableStatuses.length > 0 && (
           <div className="flex flex-wrap gap-1.5 justify-end">
             <button
               onClick={() => setFilterStatus(null)}
               className={cn("text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md transition-colors border", filterStatus === null ? "bg-white/10 text-white border-white/20" : "bg-transparent text-white/30 border-transparent hover:bg-white/5 hover:text-white/60")}
             >
               Todos
             </button>
             {availableStatuses.map(status => (
               <button
                 key={status}
                 onClick={() => setFilterStatus(status)}
                 className={cn("text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md transition-colors border", filterStatus === status ? "bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/30" : "bg-transparent text-white/30 border-transparent hover:bg-white/5 hover:text-white/60")}
               >
                 {status}
               </button>
             ))}
           </div>
         )}
      </div>
      
      <div className="flex flex-col gap-3">
        {unpinnedFiltered.map(p => (
           <div key={p.id} className="flex items-center gap-4 bg-white/5 border border-white/5 p-3 rounded-2xl group transition-all hover:border-white/20">
             <button 
               onClick={() => togglePinProject(p.id)}
               className="text-white/20 hover:text-yellow-400 transition-colors"
             >
               <Star className="w-5 h-5" />
             </button>
             
             <div className="flex-1 cursor-pointer" onClick={() => pushView({ level: 'project', id: p.id })}>
               <p className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">{p.nombre}</p>
               <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-0.5">{p.estadoProyecto}</p>
             </div>
           </div>
        ))}
      </div>
    </div>
  );

  const rightBlock = (
    <div className="flex flex-col gap-6">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-white/50 flex items-center gap-2"><Play className="w-3.5 h-3.5" /> Insights Globales</h3>
      
      <div className="flex flex-col gap-4">
        {pinnedList.length === 0 ? (
          <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-yellow-500 mt-1.5 flex-shrink-0" />
            <p className="text-xs text-yellow-500/90 leading-relaxed font-medium">El Timeline está vacío. Fija los proyectos más urgentes para no perderlos de vista.</p>
          </div>
        ) : (
          <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
            <p className="text-xs text-green-400 leading-relaxed font-medium">El Timeline ahora mostrará exactamente el orden que has definido aquí.</p>
          </div>
        )}
      </div>
    </div>
  );

  return <CanvasLayout leftBlock={leftBlock} centerBlock={centerBlock} rightBlock={rightBlock} />;
}
