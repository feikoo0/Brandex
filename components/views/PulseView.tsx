"use client";

import { useState, useEffect } from "react";
import { ProjectTimeline } from "./ProjectTimeline";
import { DailyPlan } from "./DailyPlan";
import { ProjectCanvas } from "./ProjectCanvas";
import { TaskCanvas } from "./TaskCanvas";
import { AllProjectsCanvas } from "./AllProjectsCanvas";
import { AllTasksCanvas } from "./AllTasksCanvas";
import { AgentCanvas } from "./AgentCanvas";
import { NewProjectCanvas } from "./NewProjectCanvas";
import { NewTaskCanvas } from "./NewTaskCanvas";
import { useUIStore } from "@/lib/store";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import SpatialDashboard from "../spatial/SpatialDashboard";

// Topbar height is 80px (h-20 in Topbar.tsx)
const TOPBAR_H = 80;

export function PulseView() {
  const viewStack = useUIStore(s => s.viewStack);
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(false);

  // Load persistence client-side
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("taski_timeline_collapsed");
      if (saved !== null) {
        setIsTimelineCollapsed(saved === "true");
      }
    }
  }, []);

  const toggleTimeline = () => {
    const nextVal = !isTimelineCollapsed;
    setIsTimelineCollapsed(nextVal);
    localStorage.setItem("taski_timeline_collapsed", String(nextVal));
  };

  const currentView = viewStack[viewStack.length - 1];
  const isHome = currentView.level === "home";
  const hideTimeline = isHome || isTimelineCollapsed;

  return (
    // ocupa todo el espacio disponible debajo del topbar
    <div
      className="flex flex-col overflow-hidden bg-[#0a0a0c] relative"
      style={{ height: `calc(100vh - ${TOPBAR_H}px)` }}
    >

      {/* ── CANVAS RECTANGLE (top 58% or 100%) ── */}
      <div
        className={cn(
          "flex-shrink-0 flex flex-col overflow-hidden transition-all duration-500 ease-in-out",
          isHome ? "px-0 pt-0 pb-0 h-full" : "px-5 pt-4 pb-2"
        )}
        style={{ height: hideTimeline ? "100%" : "58%" }}
      >
        <div
          className={cn(
            "w-full h-full overflow-hidden flex flex-col",
            isHome 
              ? "bg-transparent border-0 shadow-none" 
              : "rounded-[20px] border border-white/[0.07] shadow-[0_4px_48px_rgba(0,0,0,0.7)]"
          )}
          style={!isHome ? {
            background:
              "radial-gradient(ellipse 70% 55% at 50% 35%, rgba(255,255,255,0.035) 0%, transparent 65%), " +
              "linear-gradient(175deg, #17171b 0%, #111113 55%, #0d0d10 100%)",
          } : undefined}
        >
          {/* Breadcrumbs bar with timeline toggle */}
          {!isHome && (
            <div className="flex-shrink-0 px-7 pt-4 pb-2 border-b border-white/[0.05] flex items-center justify-between gap-4">
              <Breadcrumbs />
              <button
                onClick={toggleTimeline}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all text-[9px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95",
                  isTimelineCollapsed 
                    ? "bg-[#4ade80]/10 border-[#4ade80]/20 text-[#4ade80] hover:bg-[#4ade80]/20" 
                    : "border-white/5 bg-white/[0.02] hover:bg-white/5 text-white/40 hover:text-white/80"
                )}
                title={isTimelineCollapsed ? "Mostrar timeline" : "Ocultar timeline (Modo Foco)"}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{isTimelineCollapsed ? "Mostrar Timeline" : "Modo Foco"}</span>
              </button>
            </div>
          )}

          {/* Animated view — fills the rest of the rectangle */}
          <div className="flex-1 relative overflow-hidden">
            <AnimatePresence mode="wait">
              {(() => {
                const viewKey = currentView.id
                  ? `${currentView.level}-${currentView.id}`
                  : currentView.level;

                return (
                  <motion.div
                    key={viewKey}
                    initial={{ opacity: 0, x: 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -14 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    // Must be absolute inset-0 so it doesn't expand the flex parent
                    className="absolute inset-0"
                  >
                    {(() => {
                      switch (currentView.level) {
                        case "home":         return <SpatialDashboard />;
                        case "project":      return <ProjectCanvas projectId={currentView.id!} />;
                        case "task":         return <TaskCanvas taskId={currentView.id!} />;
                        case "all_projects": return <AllProjectsCanvas />;
                        case "all_tasks":    return <AllTasksCanvas />;
                        case "agent":        return <AgentCanvas />;
                        case "new_project":  return <NewProjectCanvas />;
                        case "new_task":     return <NewTaskCanvas />;
                        default:             return null;
                      }
                    })()}
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── PROJECT TIMELINE (bottom 42%) ── */}
      <div
        className={cn(
          "flex-shrink-0 overflow-hidden px-5 pb-3 transition-all duration-500 ease-in-out border-t border-white/[0.05]",
          hideTimeline ? "h-0 opacity-0 pointer-events-none py-0 border-t-0" : "h-[42%] opacity-100"
        )}
      >
        <div className="w-full h-full overflow-hidden">
          <ProjectTimeline />
        </div>
      </div>

    </div>
  );
}
