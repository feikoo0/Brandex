"use client";

import { useEffect, useState } from "react";
import { useUIStore } from "@/lib/store";
import { useData, useUpdateTask } from "@/hooks/useData";
import { Play, Square, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function TimeTracker() {
  const activeTimer = useUIStore(s => s.activeTimer);
  const stopTimer = useUIStore(s => s.stopTimer);
  const { data } = useData();
  const updateTask = useUpdateTask();

  const [elapsed, setElapsed] = useState(0); // seconds
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeTimer) {
      setElapsed(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - activeTimer.startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  if (!activeTimer) return null;

  const task = data?.tareas.find(t => t.id === activeTimer.taskId);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleStop = async () => {
    const result = stopTimer();
    if (!result || !task) return;
    
    setSaving(true);
    try {
      // Get current accumulated real time and add new duration
      const prevRealTime = (task as any).tiempoRealMins || 0;
      const newTotal = prevRealTime + result.durationMins;
      
      await updateTask.mutateAsync({
        id: task.id,
        tiempoRealMins: newTotal
      } as any);
    } catch (err) {
      console.error("Failed to save time:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[1000] flex items-center gap-4 bg-gray-900 text-white shadow-[0_20px_40px_rgba(0,0,0,0.4)] rounded-full pl-5 pr-2 py-2 border border-white/10 animate-in slide-in-from-bottom-10 fade-in duration-300">
      
      <div className="flex flex-col max-w-[200px]">
        <span className="text-[9px] uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          En progreso
        </span>
        <span className="text-sm font-black truncate">{task?.titulo || "Cargando..."}</span>
      </div>

      <div className="text-xl font-black font-mono w-[80px] text-center tracking-tighter">
        {formatTime(elapsed)}
      </div>

      <button 
        onClick={handleStop}
        disabled={saving}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center transition-all",
          saving ? "bg-white/10 text-white/50" : "bg-red-500 hover:bg-red-600 hover:scale-105 text-white"
        )}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4 fill-current" />}
      </button>

    </div>
  );
}
