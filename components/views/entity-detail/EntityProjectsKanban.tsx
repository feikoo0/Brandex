"use client";

import React, { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import { FolderKanban, Plus, Clock, CheckCircle2, ChevronRight, MoreHorizontal, Layers } from "lucide-react";
import { motion } from "framer-motion";
import type { Project } from "@/lib/types";
import { getSingleSourceProjectColor, cn } from "@/lib/utils";
import { playSound } from "@/app/taski/utils/audio";
import ProjectCoverFormats from "@/app/taski/components/ProjectCoverFormats";

interface EntityProjectsKanbanProps {
  projects: any[];
  entityId: string | number;
  entityName: string;
  onOpenProject: (projectId: string | number) => void;
  onCreateProject?: () => void;
  onUpdateProjectStatus?: (projectId: string | number, newStatus: string) => Promise<void> | void;
  className?: string;
}

const COLUMNS = [
  { id: "Planificado", label: "Planificado", color: "border-slate-500/30 text-slate-400" },
  { id: "En Proceso", label: "En Proceso", color: "border-blue-500/30 text-blue-400" },
  { id: "En Revisión", label: "En Revisión", color: "border-yellow-500/30 text-yellow-400" },
  { id: "Completado", label: "Completado", color: "border-emerald-500/30 text-emerald-400" },
];

export function EntityProjectsKanban({
  projects = [],
  entityId,
  entityName,
  onOpenProject,
  onCreateProject,
  onUpdateProjectStatus,
  className = "",
}: EntityProjectsKanbanProps) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  // Group projects by column status
  const groupedProjects = useMemo(() => {
    const map: Record<string, Project[]> = {
      Planificado: [],
      "En Proceso": [],
      "En Revisión": [],
      Completado: [],
    };

    projects.forEach((p) => {
      const st = p.estadoProyecto || p.estado || "Planificado";
      if (st.includes("Completado") || st.includes("Hecho") || st.includes("Concluido")) {
        map["Completado"].push(p);
      } else if (st.includes("Revisión") || st.includes("Revision") || st.includes("Feedback")) {
        map["En Revisión"].push(p);
      } else if (st.includes("Proceso") || st.includes("Curso") || st.includes("Desarrollo")) {
        map["En Proceso"].push(p);
      } else {
        map["Planificado"].push(p);
      }
    });

    return map;
  }, [projects]);

  const activeProject = useMemo(() => {
    if (!activeDragId) return null;
    return projects.find((p) => String(p.id) === activeDragId) || null;
  }, [activeDragId, projects]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
    playSound('pop');
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over) return;

    const targetColumnId = String(over.id);
    const draggedProjectId = String(active.id);

    if (onUpdateProjectStatus) {
      await onUpdateProjectStatus(draggedProjectId, targetColumnId);
      playSound('click');
    }
  };

  return (
    <div className={`flex flex-col p-5 rounded-[24px] bg-[#181818] border border-white/10 shadow-xl overflow-hidden text-[#ffffffd6] h-full ${className}`}>
      {/* Kanban Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <FolderKanban className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-[#ffffffd6]">
              Proyectos Asociados
            </h3>
            <p className="text-[11px] text-[#ffffff6b]">
              {projects.length} proyecto(s) vinculados a {entityName}
            </p>
          </div>
        </div>

        {onCreateProject && (
          <button
            type="button"
            onClick={onCreateProject}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-[#ffffffd6] transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" />
            <span>Nuevo Proyecto</span>
          </button>
        )}
      </div>

      {/* DndContext Columns Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 flex-1 min-h-[300px] overflow-y-auto custom-scrollbar p-1">
          {COLUMNS.map((col) => {
            const colProjects = groupedProjects[col.id] || [];

            return (
              <div
                key={col.id}
                id={col.id}
                className="flex flex-col rounded-2xl bg-[#121212] border border-white/[0.06] p-3 min-h-[220px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#ffffffd6]">{col.label}</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-[#ffffff6b]">
                      {colProjects.length}
                    </span>
                  </div>
                </div>

                {/* Project Cards List */}
                <div className="flex flex-col gap-2.5 flex-1 overflow-y-auto pr-0.5">
                  {colProjects.length > 0 ? (
                    colProjects.map((p) => {
                      const projColor = getSingleSourceProjectColor(p).hslCss;
                      const taskCount = p.tarea_ids?.length || (p as any).tasks?.length || 0;
                      const completedCount = (p as any).tasks?.filter((t: any) => t.status === "Completado").length || 0;
                      const deadline = p.fechaFin || p.fechaInicio || (p as any).deadline || "Sin fecha";

                      return (
                        <div
                          key={p.id}
                          id={String(p.id)}
                          onClick={() => onOpenProject(p.id)}
                          className="group relative flex flex-col p-3 rounded-xl bg-[#1a1a1a] hover:bg-[#222222] border border-white/10 hover:border-white/20 transition-all cursor-pointer shadow-sm select-none"
                        >
                          {/* Top Color Strip */}
                          <div
                            className="w-full h-1.5 rounded-full mb-2.5"
                            style={{ backgroundColor: projColor }}
                          />

                          {/* Title & Format */}
                          <h4 className="text-xs font-semibold text-[#ffffffd6] group-hover:text-white line-clamp-2 leading-snug mb-2">
                            {p.nombre || (p as any).title}
                          </h4>

                          {/* Meta: Deadline & Tasks Progress */}
                          <div className="flex items-center justify-between text-[11px] text-[#ffffff6b] mt-auto pt-2 border-t border-white/5">
                            <span className="truncate max-w-[100px]">{deadline}</span>
                            <span className="font-medium text-[#ffffffd6]">
                              {taskCount > 0 ? `${completedCount}/${taskCount} tareas` : "0 tareas"}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex-1 flex items-center justify-center border border-dashed border-white/5 rounded-xl text-[11px] text-[#ffffff40] p-4 text-center">
                      Sin proyectos
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeProject ? (
            <div className="p-3 rounded-xl bg-[#222222] border border-white/30 shadow-2xl scale-105 opacity-90">
              <span className="text-xs font-bold text-white">
                {activeProject.nombre || (activeProject as any).title}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
