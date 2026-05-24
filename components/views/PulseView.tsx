"use client";

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

// Topbar height is 80px (h-20 in Topbar.tsx)
// We split the remaining viewport into: canvas 58% + timeline 42%
const TOPBAR_H = 80;

export function PulseView() {
  const viewStack = useUIStore(s => s.viewStack);

  return (
    // ocupa todo el espacio disponible debajo del topbar
    <div
      className="flex flex-col overflow-hidden bg-[#0a0a0c]"
      style={{ height: `calc(100vh - ${TOPBAR_H}px)` }}
    >

      {/* ── CANVAS RECTANGLE (top 58%) ── */}
      <div
        className="flex-shrink-0 px-5 pt-4 pb-2 flex flex-col overflow-hidden"
        style={{ height: "58%" }}
      >
        <div
          className="w-full h-full rounded-[20px] border border-white/[0.07] overflow-hidden flex flex-col shadow-[0_4px_48px_rgba(0,0,0,0.7)]"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 50% 35%, rgba(255,255,255,0.035) 0%, transparent 65%), " +
              "linear-gradient(175deg, #17171b 0%, #111113 55%, #0d0d10 100%)",
          }}
        >
          {/* Breadcrumbs bar */}
          <div className="flex-shrink-0 px-7 pt-4 pb-2 border-b border-white/[0.05]">
            <Breadcrumbs />
          </div>

          {/* Animated view — fills the rest of the rectangle */}
          <div className="flex-1 relative overflow-hidden">
            <AnimatePresence mode="wait">
              {(() => {
                const currentView = viewStack[viewStack.length - 1];
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
                        case "home":         return <DailyPlan />;
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
        className="flex-shrink-0 border-t border-white/[0.05] overflow-hidden px-5 pb-3"
        style={{ height: "42%" }}
      >
        <div className="w-full h-full overflow-hidden">
          <ProjectTimeline />
        </div>
      </div>

    </div>
  );
}
