"use client";

import { useData } from "@/hooks/useData";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
import { STATUS_COLORS } from "@/lib/constants";
import { useUIStore } from "@/lib/store";

export function CalendarView() {
  const { data, isLoading } = useData();
  const [currMonth, setCurrMonth] = useState(new Date());
  const openModal = useUIStore((s) => s.openModal);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const tasks = data?.tareas ?? [];
  const monthStart = startOfMonth(currMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const nextMonth = () => setCurrMonth(new Date(currMonth.setMonth(currMonth.getMonth() + 1)));
  const prevMonth = () => setCurrMonth(new Date(currMonth.setMonth(currMonth.getMonth() - 1)));

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black tracking-tight capitalize">
            {format(currMonth, "MMMM yyyy", { locale: es })}
          </h2>
          <p className="text-sm" style={{ color: "var(--txt3)" }}>
            Calendario de contenidos y entregas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={prevMonth}
            className="p-2 rounded-xl glass border-white/5 hover:bg-white/10 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setCurrMonth(new Date())}
            className="px-4 py-2 rounded-xl glass border-white/5 hover:bg-white/10 text-xs font-bold transition-all"
          >
            Hoy
          </button>
          <button 
            onClick={nextMonth}
            className="p-2 rounded-xl glass border-white/5 hover:bg-white/10 transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 glass rounded-3xl overflow-hidden border-white/5 flex flex-col">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-white/5 bg-white/2">
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
            <div key={d} className="py-3 text-center text-[10px] font-black uppercase tracking-widest text-white/30">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto custom-scrollbar">
          {days.map((day, i) => {
            const dayTasks = tasks.filter(t => t.fechaEntrega && isSameDay(new Date(t.fechaEntrega), day));
            const isCurrentMonth = day.getMonth() === currMonth.getMonth();
            
            return (
              <div 
                key={i} 
                className={`min-h-[100px] p-2 border-r border-b border-white/5 flex flex-col transition-colors ${
                  !isCurrentMonth ? "opacity-20" : "opacity-100"
                } ${isToday(day) ? "bg-blue-500/5" : ""}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-md ${
                    isToday(day) ? "bg-blue-500 text-white" : "text-white/40"
                  }`}>
                    {format(day, "d")}
                  </span>
                </div>

                <div className="space-y-1 overflow-y-auto custom-scrollbar pr-0.5 max-h-[120px]">
                  {dayTasks.map((t) => (
                    <div 
                      key={t.id}
                      onClick={() => openModal({ type: "task", id: t.id })}
                      className="px-2 py-1 rounded-lg bg-white/5 border border-white/5 hover:border-white/20 transition-all cursor-pointer truncate"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[t.estado] || "#333" }} />
                        <span className="text-[10px] font-bold truncate text-white/70">{t.titulo}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
