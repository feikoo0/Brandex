"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { format, addDays, addMonths, differenceInDays, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { useData, useUpdateProject } from "@/hooks/useData";
import { DONE_STATES, PROJECT_COLORS, CAPSULE_COLORS } from "@/lib/constants";
import { ChevronLeft, ChevronRight, Plus, Filter, LayoutGrid, Star, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/store";
import { calculateProjections, ProjectedTask } from "@/lib/scheduler";
import * as Tooltip from "@radix-ui/react-tooltip";

function parseLocalDate(s: string): Date {
  if (!s) return new Date();
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function ProjectTimeline() {
  const { data } = useData();
  const updateProject = useUpdateProject();
  const openModal = useUIStore(s => s.openModal);
  const setActiveProject = useUIStore(s => s.setActiveProject);
  const pushView = useUIStore(s => s.pushView);
  const pinnedProjects = useUIStore(s => s.pinnedProjects);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [containerNode, setContainerNode] = useState<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [activeMonth, setActiveMonth] = useState(new Date());
  const [isAdding, setIsAdding] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [dragState, setDragState] = useState<{ projectId: string, originalEndOff: number, currentEndOff: number } | null>(null);

  // Attach observer
  useEffect(() => {
    if (!containerNode) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
        setContainerHeight(entry.contentRect.height);
      }
    });
    obs.observe(containerNode);
    return () => obs.disconnect();
  }, [containerNode]);

  const COL_WIDTH = useMemo(() => {
    let base = 120;
    if (containerWidth <= 300) {
      base = 140;
    } else {
      const available = containerWidth - 300;
      base = Math.max(120, Math.floor(available / 7));
    }
    return Math.floor(base * zoomLevel);
  }, [containerWidth, zoomLevel]);

  const ROW_H = 56;

  // Range: -1 month to +12 months
  const monthsRange = useMemo(() => {
    const months = [];
    const start = startOfMonth(addMonths(new Date(), -1));
    for (let i = 0; i <= 13; i++) {
      months.push(addMonths(start, i));
    }
    return months;
  }, []);

  const days = useMemo(() => {
    const rangeStart = monthsRange[0];
    const rangeEnd   = endOfMonth(monthsRange[monthsRange.length - 1]);
    const count = differenceInDays(rangeEnd, rangeStart) + 1;
    return Array.from({ length: count }).map((_, i) => addDays(rangeStart, i));
  }, [monthsRange]);

  const startDate = days[0];

  const handleTimelineScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const sl = e.currentTarget.scrollLeft;
    const dayIdx = Math.floor((sl + 200) / COL_WIDTH);
    if (days[dayIdx]) {
      const d = days[dayIdx];
      if (d.getMonth() !== activeMonth.getMonth() || d.getFullYear() !== activeMonth.getFullYear()) {
        setActiveMonth(d);
      }
    }
  };

  const scrollToMonth = (month: Date) => {
    if (scrollRef.current) {
      const dayIdx = differenceInDays(startOfMonth(month), startDate);
      scrollRef.current.scrollTo({
        left: dayIdx * COL_WIDTH,
        behavior: "smooth"
      });
    }
  };

  const scrollToToday = () => {
    if (scrollRef.current) {
      const dayIdx = differenceInDays(new Date(), startDate);
      const target = (dayIdx * COL_WIDTH) - (scrollRef.current.offsetWidth / 2);
      scrollRef.current.scrollTo({
        left: Math.max(0, target),
        behavior: "smooth"
      });
    }
  };

  useEffect(() => {
    if (scrollRef.current && days.length > 0) {
      const today = new Date();
      const idx = differenceInDays(today, startDate);
      const target = (idx * COL_WIDTH) - (scrollRef.current.offsetWidth / 2) + (COL_WIDTH / 2);
      scrollRef.current.scrollLeft = Math.max(0, target);
      setActiveMonth(today);
    }
  }, [startDate, days.length, COL_WIDTH]);

  const timelineData = useMemo(() => {
    if (!data || pinnedProjects.length === 0) return [];
    
    const projections = calculateProjections(data);

    return pinnedProjects
      .map(id => data.proyectos.find(p => p.id === id))
      .filter((p): p is any => !!p)
      .map((p, i) => {
        const colorIdx = i % PROJECT_COLORS.length;
        const colorClass = PROJECT_COLORS[colorIdx];
        const capsuleColor = CAPSULE_COLORS[colorIdx];
        
        const pProjections = projections.filter(pj => String(pj.project_id) === String(p.id));
        
        const taskMap: Record<number, ProjectedTask[]> = {};
        pProjections.forEach(pj => {
          const d = parseLocalDate(pj.projectedDate);
          const off = differenceInDays(d, startDate);
          if (!taskMap[off]) taskMap[off] = [];
          taskMap[off].push(pj);
        });

        const taskOffs = Object.keys(taskMap).map(Number);
        const minTaskOff = taskOffs.length > 0 ? Math.min(...taskOffs) : Infinity;
        const maxTaskOff = taskOffs.length > 0 ? Math.max(...taskOffs) : -Infinity;

        let startOff = p.fechaInicio ? differenceInDays(parseLocalDate(p.fechaInicio), startDate) : 0;
        let endOff   = p.fechaFin ? differenceInDays(parseLocalDate(p.fechaFin), startDate) : 30;

        if (minTaskOff < startOff && minTaskOff !== Infinity) startOff = minTaskOff;
        if (maxTaskOff > endOff && maxTaskOff !== -Infinity) endOff = maxTaskOff;

        const isProjectDone = pProjections.length > 0 && pProjections.every(pj => DONE_STATES.has(pj.task.estado));

        return {
          id: p.id,
          name: p.nombre,
          colorClass,
          capsuleColor,
          startOff,
          endOff,
          tasks: taskMap,
          isProjectDone
        };
      });
  }, [data, pinnedProjects, startDate]);



  if (!data) return null;

  return (
    <div className="w-full h-full min-h-0 flex flex-col relative bg-white dark:bg-[#0a0a0c] rounded-t-[24px] overflow-hidden">
      
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 dark:border-white/5 flex-shrink-0 z-[100] relative bg-white dark:bg-[#0a0a0c]">
        
        {/* Left: Title */}
        <h2 className="text-[13px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em] w-1/4">
          Project Timeline
        </h2>
        
        {/* Center: Controls */}
        <div className="flex items-center gap-3 flex-1 justify-center">
          
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 border border-gray-200 dark:border-white/10 rounded-xl p-1 bg-gray-50 dark:bg-white/5 shadow-inner mr-2">
            <button 
              onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
              className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-all text-gray-500 hover:text-gray-900 dark:hover:text-white"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="w-8 text-center text-[10px] font-bold text-gray-400 select-none">
              {Math.round(zoomLevel * 100)}%
            </div>
            <button 
              onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}
              className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-all text-gray-500 hover:text-gray-900 dark:hover:text-white"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <div className="relative group">
            <select
              value={monthsRange.find(m => m.getMonth() === activeMonth.getMonth() && m.getFullYear() === activeMonth.getFullYear())?.toISOString() || monthsRange[0].toISOString()}
              onChange={(e) => scrollToMonth(new Date(e.target.value))}
              className="appearance-none bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white text-[11px] font-bold px-4 py-2 rounded-xl outline-none cursor-pointer pr-10 hover:border-gray-300 dark:hover:border-white/20 transition-all bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2210%22%20height%3D%226%22%20viewBox%3D%220%200%2010%206%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M1%201L5%205L9%201%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-no-repeat bg-[position:calc(100%-12px)_center]"
            >
              <option value="weekly">Weekly</option>
              {monthsRange.map((m, i) => (
                <option key={i} value={m.toISOString()} className="dark:bg-[#111] bg-white">
                  {format(m, 'MMMM yyyy', { locale: es })}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-1 border border-gray-200 dark:border-white/10 rounded-xl p-1 bg-gray-50 dark:bg-white/5 shadow-inner">
            <button 
              onClick={() => scrollToMonth(addMonths(activeMonth, -1))}
              className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-all text-gray-500 hover:text-gray-900 dark:hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => scrollToMonth(addMonths(activeMonth, 1))}
              className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-all text-gray-500 hover:text-gray-900 dark:hover:text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <button 
            onClick={scrollToToday}
            className="text-[11px] font-bold text-gray-700 dark:text-white bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-5 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-all shadow-sm active:scale-95"
          >
            Today
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3 w-1/4 justify-end">
          <div className="relative">
             <button className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-[11px] font-bold text-gray-600 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/10 transition-all">
                <Filter className="w-3.5 h-3.5" /> Filters <ChevronLeft className="w-3 h-3 rotate-270" />
             </button>
          </div>

          <div className={cn(
            "relative flex items-center bg-[#f0f9f4] dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl transition-all duration-300 overflow-hidden shadow-sm",
            isAdding ? "px-1 w-48" : "w-28"
          )}>
            <button 
              onClick={() => setIsAdding(!isAdding)}
              className={cn(
                "flex items-center justify-center gap-2 h-9 text-[11px] font-bold text-green-700 dark:text-green-400 transition-all",
                isAdding ? "w-0 opacity-0 pointer-events-none" : "w-full opacity-100"
              )}
            >
              <Plus className="w-3.5 h-3.5" /> Agregar
            </button>

            <div className={cn(
              "flex items-center gap-1 w-full h-9 transition-all",
              isAdding ? "opacity-100" : "opacity-0 pointer-events-none translate-x-10"
            )}>
              <button 
                onClick={() => { pushView({ level: 'new_project' }); setIsAdding(false); }}
                className="flex-1 h-7 rounded-lg hover:bg-green-500/20 text-[10px] font-bold text-green-700 dark:text-green-400"
              >
                Proyecto
              </button>
              <div className="w-[1px] h-3 bg-green-500/20" />
              <button 
                onClick={() => { pushView({ level: 'new_task' }); setIsAdding(false); }}
                className="flex-1 h-7 rounded-lg hover:bg-green-500/20 text-[10px] font-bold text-green-700 dark:text-green-400"
              >
                Tarea
              </button>
              <button onClick={() => setIsAdding(false)} className="px-1.5 opacity-50 hover:opacity-100">
                <Plus className="w-3 h-3 rotate-45" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Single Scrollable Container (Sticky Table Pattern) ── */}
      <div className="flex-1 min-h-0 relative overflow-hidden" ref={setContainerNode}>
        <div 
          ref={scrollRef}
          onScroll={handleTimelineScroll}
          className="w-full h-full overflow-x-auto overflow-y-auto custom-scrollbar relative"
        >
          <div 
            className="relative"
            style={{ 
              width: `${days.length * COL_WIDTH + 220}px`,
              height: `${Math.max(200, (timelineData.length + 1) * ROW_H + 44)}px`
            }}
          >
            {/* 1. Grid Background (Vertical lines) */}
            <div className="absolute inset-0 pointer-events-none flex pl-[220px]">
              {days.map((d, i) => {
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <div 
                    key={i} 
                    className={cn(
                      "h-full border-r border-gray-50 dark:border-white/[0.03]",
                      isWeekend ? "bg-gray-50/30 dark:bg-white/[0.01]" : ""
                    )}
                    style={{ width: `${COL_WIDTH}px` }}
                  />
                );
              })}
            </div>

            {/* 2. Header Row (Dates) */}
            <div className="sticky top-0 z-[80] bg-white dark:bg-[#0a0a0c] flex border-b border-gray-100 dark:border-white/5">
              <div className="w-[220px] sticky left-0 z-[90] bg-white dark:bg-[#0a0a0c] border-r border-gray-100 dark:border-white/5 flex items-center justify-between px-6">
                <span className="text-[10px] font-black uppercase text-gray-400 dark:text-white/20 tracking-[0.2em]">
                  Proyectos
                </span>
                <button 
                  onClick={() => pushView({ level: 'all_projects' })}
                  className="text-[9px] font-bold uppercase text-blue-500 hover:text-blue-400 transition-colors"
                >
                  Ver Todos
                </button>
              </div>
              <div className="flex">
                {days.map((d, i) => {
                  const isToday = format(d, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                  return (
                    <div 
                      key={i} 
                      className="flex flex-col items-center justify-center py-3 flex-shrink-0"
                      style={{ width: `${COL_WIDTH}px` }}
                    >
                      <span className="text-[9px] font-black text-gray-400 dark:text-white/20 uppercase tracking-tighter">
                        {format(d, 'EEE', { locale: es })}
                      </span>
                      <span className={cn(
                        "text-[13px] font-black mt-0.5 w-7 h-7 flex items-center justify-center rounded-full transition-colors",
                        isToday ? "bg-green-500 text-white shadow-lg shadow-green-500/30" : "text-gray-900 dark:text-white/80"
                      )}>
                        {d.getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Project Rows Area */}
            <div className="relative">
              {timelineData.map((row) => (
                <div 
                  key={row.id} 
                  className="group relative flex items-center border-b border-gray-50 dark:border-white/[0.02] hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                  style={{ height: `${ROW_H}px` }}
                >
                  {/* Left Sticky Sidebar Column */}
                  <div 
                    onClick={() => {
                      setActiveProject(row.id);
                      pushView({ level: 'project', id: row.id });
                    }}
                    className="sticky left-0 z-[70] w-[220px] h-full flex items-center px-6 bg-white dark:bg-[#0a0a0c] border-r border-gray-100 dark:border-white/5 cursor-pointer group-hover:bg-gray-50 dark:group-hover:bg-white/[0.04] transition-colors"
                  >
                    <div className={cn("w-1.5 h-1.5 rounded-full mr-3", row.colorClass.split(' ')[0])} />
                    <span className="text-[11px] font-bold uppercase text-gray-900 dark:text-white/80 truncate tracking-tight">
                      {row.name}
                    </span>
                  </div>

                  {/* Timeline Lane */}
                  <div className="relative flex-1 h-full">
                    {/* Project Capsule */}
                    <div 
                      className={cn(
                        "absolute h-9 rounded-xl flex items-center border transition-all z-[50] group-hover:shadow-lg overflow-hidden top-1/2 -translate-y-1/2",
                        row.capsuleColor,
                        row.isProjectDone ? "opacity-30" : "",
                        dragState?.projectId === row.id ? "ring-2 ring-white/50 opacity-90 z-[60]" : ""
                      )}
                      style={{ 
                        left: `${row.startOff * COL_WIDTH + 8}px`,
                        width: `${((dragState?.projectId === row.id ? (dragState?.currentEndOff ?? row.endOff) : row.endOff) - row.startOff + 1) * COL_WIDTH - 16}px`
                      }}
                    >
                      {/* Inner Tasks Micro-Capsules */}
                      <div className="flex-1 flex px-2 relative h-full items-center">
                        {Object.entries(row.tasks).map(([offStr, dayProjections]) => {
                          const off = parseInt(offStr);
                          const localOff = off - row.startOff;
                          if (localOff < 0) return null;
                          
                          return (
                            <div 
                              key={off}
                              className="absolute flex flex-col gap-0.5 items-start justify-center group/task"
                              style={{ 
                                left: `${localOff * COL_WIDTH + 4}px`,
                                width: `${COL_WIDTH - 8}px`
                              }}
                            >
                              <Tooltip.Provider delayDuration={200}>
                              {dayProjections.map((pj) => (
                                <Tooltip.Root key={pj.id}>
                                  <Tooltip.Trigger asChild>
                                    <div 
                                      onClick={(e) => { e.stopPropagation(); openModal({ type: 'task', id: pj.id }); }}
                                      className={cn(
                                        "w-full h-6 rounded-md px-2 flex items-center gap-1.5 border backdrop-blur-sm cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md active:scale-95",
                                        DONE_STATES.has(pj.task.estado) ? "bg-white/20 border-white/30" : "bg-black/10 border-black/5",
                                        pj.isBumped && !DONE_STATES.has(pj.task.estado) ? "border-dashed border-orange-500/50" : ""
                                      )}
                                    >
                                      <div className={cn(
                                        "w-1.5 h-1.5 rounded-full",
                                        pj.task.prioridad === "Alta" ? "bg-red-400 shadow-[0_0_5px_rgba(248,113,113,0.5)]" : "bg-white/40"
                                      )} />
                                      <span className={cn(
                                        "text-[9px] font-bold truncate tracking-tight",
                                        DONE_STATES.has(pj.task.estado) ? "text-white/60 line-through" : "text-gray-900 dark:text-white/80"
                                      )}>
                                        {pj.task.titulo}
                                      </span>
                                    </div>
                                  </Tooltip.Trigger>
                                  <Tooltip.Portal>
                                    <Tooltip.Content 
                                      className="z-[200] max-w-xs bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-xs font-medium px-3 py-2 rounded-xl shadow-xl animate-in fade-in zoom-in duration-200"
                                      sideOffset={5}
                                    >
                                      <p className="font-bold mb-1">{pj.task.titulo}</p>
                                      <p className="opacity-80 text-[10px]">Estado: {pj.task.estado}</p>
                                      <p className="opacity-80 text-[10px]">Fecha Proyectada: {pj.projectedDate}</p>
                                      <Tooltip.Arrow className="fill-gray-900 dark:fill-white" />
                                    </Tooltip.Content>
                                  </Tooltip.Portal>
                                </Tooltip.Root>
                              ))}
                              </Tooltip.Provider>
                            </div>
                          );
                        })}
                      </div>

                      {/* Drag Handle (Right) */}
                      <div 
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          const startX = e.clientX;
                          const initialEndOff = row.endOff;
                          setDragState({ projectId: row.id, originalEndOff: initialEndOff, currentEndOff: initialEndOff });

                          const onMouseMove = (moveEvent: MouseEvent) => {
                            const deltaX = moveEvent.clientX - startX;
                            const deltaDays = Math.round(deltaX / COL_WIDTH);
                            setDragState({ projectId: row.id, originalEndOff: initialEndOff, currentEndOff: Math.max(row.startOff, initialEndOff + deltaDays) });
                          };

                          const onMouseUp = async (upEvent: MouseEvent) => {
                            window.removeEventListener("mousemove", onMouseMove);
                            window.removeEventListener("mouseup", onMouseUp);
                            
                            const deltaX = upEvent.clientX - startX;
                            const deltaDays = Math.round(deltaX / COL_WIDTH);
                            const finalEndOff = Math.max(row.startOff, initialEndOff + deltaDays);
                            
                            setDragState(null);

                            if (finalEndOff !== initialEndOff) {
                              const newFechaFin = format(addDays(startDate, finalEndOff), 'yyyy-MM-dd');
                              await updateProject.mutateAsync({ id: row.id, fechaFin: newFechaFin } as any);
                            }
                          };

                          window.addEventListener("mousemove", onMouseMove);
                          window.addEventListener("mouseup", onMouseUp);
                        }}
                        className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/20 flex items-center justify-center transition-colors active:bg-white/30"
                      >
                        <div className="w-[2px] h-4 bg-white/50 rounded-full shadow-sm" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 4. Current Time Indicator */}
            {(() => {
                const today = new Date();
                const off = differenceInDays(today, startDate);
                if (off < 0 || off >= days.length) return null;
                return (
                  <div 
                    className="absolute top-0 bottom-0 z-[80] w-[2px] bg-green-500/40 pointer-events-none"
                    style={{ left: `${off * COL_WIDTH + (COL_WIDTH / 2) + 220}px` }}
                  >
                    <div className="sticky top-[48px] w-3 h-3 -ml-[5px] rounded-full bg-green-500 border-2 border-white dark:border-[#0a0a0c] shadow-lg shadow-green-500/50" />
                  </div>
                );
            })()}

          </div>
        </div>
      </div>
    </div>
  );
}
