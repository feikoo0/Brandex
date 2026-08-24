"use client";

import React, { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Project, Task } from "./ProjectDashboard";
import { SynthesizedTask } from "./KanbanColumn";

export interface TaskTableViewProps {
  projects: Project[];
  kanbanTasks: SynthesizedTask[];
  headerBgStyle: string;
  cardBgStyle: string;
  onSelectTab: (tab: string) => void;
  onSelectProject?: (projectId: string | number) => void;
  onSelectTask?: (task: Task, projectId: string | number) => void;
}

export const TaskTableView: React.FC<TaskTableViewProps> = ({
  projects,
  kanbanTasks,
  headerBgStyle,
  cardBgStyle,
  onSelectTab,
  onSelectProject,
  onSelectTask,
}) => {
  const [dbSubView, setDbSubView] = useState<"proyectos" | "tareas">("proyectos");

  return (
    <div className="w-full h-full flex flex-col gap-3 pt-1 animate-fadeIn overflow-hidden">
      {/* Sub-view Switcher Toggle */}
      <div className="flex items-center gap-2 mb-1 shrink-0">
        <button
          onClick={() => setDbSubView("proyectos")}
          className={`text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all ${
            dbSubView === "proyectos"
              ? "bg-white/10 border-white/20 text-white"
              : "bg-transparent border-white/5 text-slate-400 hover:text-slate-200"
          }`}
        >
          Proyectos
        </button>
        <button
          onClick={() => setDbSubView("tareas")}
          className={`text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all ${
            dbSubView === "tareas"
              ? "bg-white/10 border-white/20 text-white"
              : "bg-transparent border-white/5 text-slate-400 hover:text-slate-200"
          }`}
        >
          Tareas
        </button>
      </div>

      {dbSubView === "proyectos" ? (
        <div className="w-full h-[500px] overflow-y-auto hide-scrollbar flex flex-col gap-2">
          {/* Table Header */}
          <div
            className={`w-full h-9 rounded-xl ${headerBgStyle} px-4 flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0`}
          >
            <div className="w-2/5">Proyecto</div>
            <div className="w-1/5 text-center">Estado</div>
            <div className="w-1/5 text-center">Presupuesto</div>
            <div className="w-1/5 text-center">Progreso</div>
            <div className="w-10 shrink-0 text-right">Detalle</div>
          </div>

          {/* Project Rows */}
          {projects.map((p) => {
            const isCompleted = p.status === "Completado";
            const isPausado = p.status === "Pausado";
            const statusColor = isCompleted
              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
              : isPausado
              ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
              : "bg-amber-500/20 text-amber-400 border-amber-500/30";

            const dotColor = isCompleted
              ? "bg-emerald-400"
              : isPausado
              ? "bg-rose-400"
              : "bg-amber-400";

            return (
              <div
                key={p.id}
                className={`w-full h-12 rounded-xl ${cardBgStyle} px-4 flex items-center text-xs border border-white/5 shrink-0`}
              >
                <div className="w-2/5 flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0`} />
                  <span className="font-bold text-slate-200 truncate">{p.title}</span>
                </div>
                <div className="w-1/5 flex justify-center">
                  <span
                    className={`text-[8px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${statusColor}`}
                  >
                    {p.status}
                  </span>
                </div>
                <div className="w-1/5 text-center font-mono font-bold text-slate-300">
                  {p.cost || "$0"}
                </div>
                <div className="w-1/5 flex flex-col gap-1 items-center px-2">
                  <span className="text-[9px] text-slate-400 font-bold">
                    {p.percent || "0%"}
                  </span>
                  <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-400"
                      style={{ width: p.percent || "0%" }}
                    />
                  </div>
                </div>
                <div className="w-10 shrink-0 flex justify-end">
                  <button
                    onClick={() => {
                      onSelectProject?.(p.id);
                      onSelectTab("proyectos");
                    }}
                    className="text-slate-400 hover:text-white transition-colors p-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="w-full h-[500px] overflow-y-auto hide-scrollbar flex flex-col gap-2">
          {/* Tasks Header */}
          <div
            className={`w-full h-9 rounded-xl ${headerBgStyle} px-4 flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0`}
          >
            <div className="w-2/5">Tarea</div>
            <div className="w-1/5">Proyecto</div>
            <div className="w-1/5 text-center">Formato</div>
            <div className="w-1/5 text-center">Tiempo</div>
            <div className="w-1/5 text-center">Estado</div>
            <div className="w-10 shrink-0 text-right">Ir</div>
          </div>

          {/* Task Rows */}
          {kanbanTasks.map((t) => {
            const isCompleted = t.status === "Completado";
            const isProcess = t.status === "En Proceso";
            const statusBadge = isCompleted
              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
              : isProcess
              ? "bg-amber-500/25 text-amber-400 border-amber-500/20"
              : "bg-white/5 text-slate-400 border-white/5";

            return (
              <div
                key={t.id}
                onClick={() => {
                  const proj = projects.find(p => p.id === t.projectId);
                  const matchedTask = proj?.tasks?.find(tk => String(tk.id) === String(t.id) || `kt-${t.projectId}-${tk.id}` === t.id);
                  if (matchedTask) {
                    onSelectTask?.(matchedTask, t.projectId);
                  } else {
                    onSelectTask?.({
                      id: Number(t.id) || Date.now(),
                      title: t.taskTitle,
                      desc: t.desc || "",
                      format: t.format || "Sin formato",
                      time: t.time || "1 hora",
                      status: (t.status as any) || "Planificado",
                      statusColor: "",
                      subtasks: []
                    }, t.projectId);
                  }
                }}
                className={`w-full h-12 rounded-xl ${cardBgStyle} px-4 flex items-center text-xs border border-white/5 shrink-0 cursor-pointer hover:border-white/20 transition-all`}
              >
                <div className="w-2/5 font-bold text-slate-200 truncate pr-2">
                  {t.taskTitle}
                </div>
                <div className="w-1/5 text-slate-400 truncate pr-2">
                  {t.projectName}
                </div>
                <div className="w-1/5 text-center text-slate-400 font-semibold uppercase text-[9px]">
                  {t.format || "-"}
                </div>
                <div className="w-1/5 text-center font-mono text-slate-300 font-semibold">
                  {t.time || "-"}
                </div>
                <div className="w-1/5 flex justify-center">
                  <span
                    className={`text-[8px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${statusBadge}`}
                  >
                    {t.status}
                  </span>
                </div>
                <div className="w-10 shrink-0 flex justify-end">
                  <button
                    onClick={() => {
                      onSelectProject?.(t.projectId);
                      onSelectTab("proyectos");
                    }}
                    className="text-slate-400 hover:text-white transition-colors p-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TaskTableView;
