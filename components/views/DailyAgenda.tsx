"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import { format, addDays, isSameDay, setHours, setMinutes, parseISO, addMinutes, startOfToday } from "date-fns";
import { es } from "date-fns/locale";
import { useData, useUpdateTask } from "@/hooks/useData";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 90; // Exactly 4 hours fit in a 360px grid area

export function DailyAgenda() {
  const { data } = useData();
  const today = startOfToday();

  // 5 days: Yesterday, Today, +3
  const days = useMemo(() => [
    addDays(today, -1),
    today,
    addDays(today, 1),
    addDays(today, 2),
    addDays(today, 3),
  ], [today]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      const h = new Date().getHours();
      // Scroll to show current hour in context
      scrollRef.current.scrollTop = Math.max(0, (h - 1) * HOUR_HEIGHT);
      // Center "Today" column (each column is 220px + 64px axis)
      scrollRef.current.scrollLeft = 220 * 0.5;
    }
  }, []);

  if (!data) return null;

  const totalHeight = HOURS.length * HOUR_HEIGHT;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0a0a0c]">
      
      {/* ── HEADER (Days) ── */}
      <div ref={headerScrollRef} className="flex border-b border-white/10 flex-shrink-0 overflow-hidden bg-[#0a0a0c]">
        <div className="w-16 flex-shrink-0" /> 
        {days.map((d, i) => (
          <div key={i} className={cn(
            "min-w-[220px] border-l border-white/10 p-3 flex flex-col transition-colors",
            isSameDay(d, today) ? "bg-blue-500/[0.04]" : "bg-transparent"
          )}>
            <h3 className={cn(
              "text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2",
              isSameDay(d, today) ? "text-blue-400" : "text-white/40"
            )}>
              {isSameDay(d, today) && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
              {isSameDay(d, today) ? "Hoy" : format(d, "EEEE d", { locale: es })}
            </h3>
          </div>
        ))}
      </div>

      {/* ── SCROLLABLE GRID ── */}
      <div 
        ref={scrollRef} 
        onScroll={handleScroll}
        className="flex-1 overflow-auto custom-scrollbar flex relative"
      >
        {/* Time Axis (Sticky Left) */}
        <div className="w-16 flex-shrink-0 flex flex-col bg-[#0a0a0c] z-30 sticky left-0 border-r border-white/10 shadow-xl">
          {HOURS.map(h => (
            <div key={h} className="flex items-start justify-end pr-3 py-2" style={{ height: HOUR_HEIGHT }}>
              <span className="text-[10px] font-black text-white/20 uppercase tabular-nums">
                {format(setHours(startOfToday(), h), 'HH:00')}
              </span>
            </div>
          ))}
          {/* Bottom spacer */}
          <div className="h-10 w-full" />
        </div>

        {/* Columns Container */}
        <div className="flex relative" style={{ height: totalHeight + 40 }}>
          {/* Global Background Lines */}
          <div className="absolute inset-0 pointer-events-none flex flex-col z-0">
            {HOURS.map(h => (
              <div key={h} className="border-b border-white/[0.03] w-full" style={{ height: HOUR_HEIGHT }} />
            ))}
          </div>

          {/* Individual Day Columns */}
          {days.map((d, i) => (
            <DayColumn key={i} date={d} tasks={data.tareas} projects={data.proyectos} isToday={isSameDay(d, today)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DayColumn({ date, tasks, projects, isToday }: { date: Date, tasks: any[], projects: any[], isToday: boolean }) {
  const dateStr = format(date, "yyyy-MM-dd");
  const dayTasks = useMemo(() => {
    return tasks
      .filter(t => t.fechaProg && t.fechaProg.startsWith(dateStr) && t.estado !== "Completado" && t.estado !== "Hecho")
      .map(t => ({
        ...t,
        start: parseISO(t.fechaProg),
        duration: parseInt(t.duracionMins) || 60
      }));
  }, [tasks, dateStr]);

  const { setNodeRef, isOver } = useDroppable({ 
    id: `agenda-day-${dateStr}`, 
    data: { type: "agenda-day", date } 
  });

  const positionedTasks = useMemo(() => {
    const sorted = [...dayTasks].sort((a, b) => a.start.getTime() - b.start.getTime());
    const groups: any[][] = [];
    sorted.forEach(task => {
      let placed = false;
      for (const group of groups) {
        const lastInGroup = group[group.length - 1];
        const lastEnd = addMinutes(lastInGroup.start, lastInGroup.duration);
        if (task.start < lastEnd) { group.push(task); placed = true; break; }
      }
      if (!placed) groups.push([task]);
    });

    const results: any[] = [];
    groups.forEach(group => {
      const columns: any[][] = [];
      group.forEach(task => {
        let colIdx = 0;
        while (columns[colIdx]?.some(t => {
          const tEnd = addMinutes(t.start, t.duration);
          const taskEnd = addMinutes(task.start, task.duration);
          return (task.start < tEnd && taskEnd > t.start);
        })) { colIdx++; }
        if (!columns[colIdx]) columns[colIdx] = [];
        columns[colIdx].push(task);
        task.colIdx = colIdx;
      });
      
      const totalCols = columns.length;
      group.forEach(task => {
        const top = (task.start.getHours() * HOUR_HEIGHT) + (task.start.getMinutes() * (HOUR_HEIGHT / 60));
        const height = (task.duration * (HOUR_HEIGHT / 60));
        const width = 100 / totalCols;
        const left = task.colIdx * width;
        results.push({ ...task, style: { top: `${top}px`, height: `${height}px`, width: `${width}%`, left: `${left}%` } });
      });
    });
    return results;
  }, [dayTasks]);

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "min-w-[220px] relative border-r border-white/5 last:border-0 transition-colors z-10",
        isToday && "bg-blue-500/[0.01]",
        isOver && "bg-blue-500/[0.05]"
      )}
      style={{ height: HOURS.length * HOUR_HEIGHT }}
    >
      {isToday && <CurrentTimeIndicator />}
      {positionedTasks.map(task => (
        <AgendaTaskCard key={task.id} task={task} projects={projects} />
      ))}
    </div>
  );
}

function CurrentTimeIndicator() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const top = (now.getHours() * HOUR_HEIGHT) + (now.getMinutes() * (HOUR_HEIGHT / 60));
  return (
    <div className="absolute left-0 right-0 z-40 pointer-events-none flex items-center" style={{ top: `${top}px` }}>
      <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.25 shadow-[0_0_10px_rgba(239,68,68,1)]" />
      <div className="flex-1 h-[1.5px] bg-red-500" />
    </div>
  );
}

function AgendaTaskCard({ task, projects }: { task: any, projects: any[] }) {
  const updateTask = useUpdateTask();
  const proj = projects.find(p => task.proyecto_ids?.includes(p.id));
  const [isResizing, setIsResizing] = useState(false);
  const [currentHeight, setCurrentHeight] = useState(parseFloat(task.style.height));

  useEffect(() => {
    if (!isResizing) setCurrentHeight(parseFloat(task.style.height));
  }, [task.style.height, isResizing]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault(); setIsResizing(true);
    const startY = e.pageY; const startH = currentHeight;
    const onMove = (mv: MouseEvent) => {
      const delta = mv.pageY - startY;
      setCurrentHeight(Math.max(25, startH + delta));
    };
    const onUp = async () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      const newDur = Math.round(currentHeight / (HOUR_HEIGHT / 60));
      if (newDur !== task.duration) await updateTask.mutateAsync({ id: task.id, tiempoRealMins: newDur } as any);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  return (
    <div
      onClick={() => window.dispatchEvent(new CustomEvent("panel-open-detail", { detail: { type: "task", id: task.id } }))}
      style={{ ...task.style, height: `${currentHeight}px` }}
      className={cn(
        "absolute z-10 px-2 py-1.5 rounded-xl border flex flex-col group transition-all cursor-pointer shadow-2xl select-none overflow-hidden",
        isResizing ? "opacity-90 scale-[1.02] border-blue-400 z-50 ring-4 ring-blue-500/20" : "bg-[#1c1c24] border-white/10 hover:border-white/30"
      )}
    >
      <div className="flex items-center justify-between gap-1 mb-0.5">
        <span className="text-[8px] font-black text-blue-400 uppercase tracking-wider truncate">
          {proj?.nombre || "Sin Proyecto"}
        </span>
      </div>
      <h4 className="text-[10px] font-bold text-white/90 leading-tight line-clamp-2">
        {task.titulo}
      </h4>
      <div className="mt-auto flex items-center justify-between">
        <span className="text-[9px] font-black text-white/40 tabular-nums">
          {format(task.start, "HH:mm")}
        </span>
      </div>
      <div
        onMouseDown={handleResizeStart}
        className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-blue-500/20 border-t border-blue-500/40"
      >
        <div className="w-6 h-1 bg-white/30 rounded-full" />
      </div>
    </div>
  );
}
