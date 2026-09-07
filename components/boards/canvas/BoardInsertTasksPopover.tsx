"use client";

import React, { useState, useMemo } from "react";
import { ChevronDown, Plus, Search, Layers, X, ChevronsUpDown, Loader2 } from "lucide-react";
import { useData, useCreateTask } from "@/hooks/useData";
import { getSingleSourceProjectColor } from "@/lib/utils";
import { playSound } from "@/app/taski/utils/audio";

interface BoardInsertTasksPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertTask: (taskData: {
    taskId: string;
    projectId: string;
    title: string;
    projectName: string;
    projectColor: string;
  }) => void;
}

export function BoardInsertTasksPopover({
  isOpen,
  onClose,
  onInsertTask,
}: BoardInsertTasksPopoverProps) {
  const { data } = useData();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedProjects, setExpandedProjects] = useState<{ [id: string]: boolean }>({});

  const isSearching = searchQuery.trim().length > 0;

  // Agrupar tareas por proyecto (incluyendo tareas sin proyecto)
  const { groupedProjects, totalTasksCount } = useMemo(() => {
    const projects = data?.proyectos || [];
    const tasks = data?.tareas || [];

    const matchedTaskIds = new Set<string>();

    // 1. Grupos de proyectos existentes
    const projectGroups = projects.map((p) => {
      const projColor = getSingleSourceProjectColor(p).hslCss;
      const projTasks = tasks.filter((t: any) => {
        if (!t) return false;
        const match =
          String(t.proyecto_id) === String(p.id) ||
          String(t.project_id) === String(p.id) ||
          (Array.isArray(t.proyecto_ids) && t.proyecto_ids.map(String).includes(String(p.id))) ||
          (Array.isArray(t.project_ids) && t.project_ids.map(String).includes(String(p.id)));

        if (match) matchedTaskIds.add(String(t.id));
        return match;
      });

      return {
        id: String(p.id),
        nombre: p.nombre || (p as any).name || "Proyecto",
        projColor,
        tasks: projTasks,
      };
    });

    // 2. Tareas sin proyecto asignado (si existen)
    const unassignedTasks = tasks.filter((t: any) => t && !matchedTaskIds.has(String(t.id)));
    if (unassignedTasks.length > 0) {
      projectGroups.push({
        id: "no_project",
        nombre: "Sin proyecto asignado",
        projColor: "hsl(215, 14%, 45%)",
        tasks: unassignedTasks,
      });
    }

    // Calcular total de tareas encontradas
    const totalCount = projectGroups.reduce((acc, g) => acc + g.tasks.length, 0);

    // Filtrar según el término de búsqueda
    const filtered = projectGroups.filter((group) => {
      if (!isSearching) return true;
      const q = searchQuery.toLowerCase();
      const matchProj = group.nombre.toLowerCase().includes(q);
      const matchTask = group.tasks.some(
        (t: any) => (t.titulo || t.title || "").toLowerCase().includes(q)
      );
      return matchProj || matchTask;
    });

    return { groupedProjects: filtered, totalTasksCount: totalCount };
  }, [data?.proyectos, data?.tareas, searchQuery, isSearching]);

  // Alternar colapsado de un proyecto
  const toggleProject = (id: string) => {
    setExpandedProjects((prev) => {
      const currentVal = prev[id] ?? false;
      return {
        ...prev,
        [id]: !currentVal,
      };
    });
    playSound("click");
  };

  // Alternar Expandir / Colapsar todos
  const areAllExpanded = useMemo(() => {
    if (groupedProjects.length === 0) return false;
    return groupedProjects.every((g) => expandedProjects[g.id] === true);
  }, [groupedProjects, expandedProjects]);

  const toggleAllProjects = () => {
    const nextState = !areAllExpanded;
    const nextMap: { [id: string]: boolean } = {};
    groupedProjects.forEach((g) => {
      nextMap[g.id] = nextState;
    });
    setExpandedProjects(nextMap);
    playSound("click");
  };
  const [activeNewTaskProjectId, setActiveNewTaskProjectId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const createTaskMutation = useCreateTask();

  const handleCreateAndInsert = async (group: typeof groupedProjects[0]) => {
    const title = newTaskTitle.trim() || "Nueva Tarea";
    setIsCreatingTask(true);
    try {
      const projectObj = data?.proyectos?.find((p) => String(p.id) === String(group.id));
      const newTaskDoc = await createTaskMutation.mutateAsync({
        titulo: title,
        proyecto_id: group.id !== "no_project" ? group.id : undefined,
        proyecto_ids: group.id !== "no_project" ? [group.id] : [],
        cliente_ids: projectObj?.cliente_ids || ((projectObj as any)?.cliente_id ? [String((projectObj as any).cliente_id)] : []),
        estado: "Planificado",
        prioridad: "Media",
        formato: "story",
      });

      onInsertTask({
        taskId: String(newTaskDoc.id),
        projectId: group.id !== "no_project" ? group.id : "",
        title: newTaskDoc.titulo,
        projectName: group.nombre,
        projectColor: group.projColor,
      });
      playSound("pop");
      setNewTaskTitle("");
      setActiveNewTaskProjectId(null);
    } catch (err) {
      console.error("Error creating task:", err);
    } finally {
      setIsCreatingTask(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      data-prevent-canvas-scroll="true"
      onWheel={(e) => e.stopPropagation()}
      className="board-popover absolute bottom-20 right-1/2 translate-x-1/2 md:translate-x-0 md:right-8 z-50 w-[360px] h-[520px] max-h-[calc(100vh-140px)] flex flex-col bg-[#1c1c1e] border border-white/10 rounded-2xl p-3.5 shadow-2xl shadow-black/90 backdrop-blur-xl select-none animate-in fade-in zoom-in-95 duration-150"
    >
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-white/70" />
          <span className="text-[14px] font-bold text-white tracking-tight">
            Insertar Tareas
          </span>
          <span className="text-[11px] font-medium text-white/40 ml-1">
            ({totalTasksCount})
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-6 h-6 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── BARRA DE BÚSQUEDA & CONTROL EXPANDIR/COLAPSAR ── */}
      <div className="flex items-center gap-2 my-2.5 shrink-0">
        <div className="relative flex-1 flex items-center">
          <Search className="absolute left-2.5 w-3.5 h-3.5 text-white/40 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar tareas o proyectos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-3 rounded-xl bg-white/[0.05] border border-white/10 text-[12px] text-white placeholder-white/40 outline-none focus:border-white/25 transition-colors"
          />
        </div>

        {/* Botón para expandir/colapsar todos */}
        <button
          type="button"
          onClick={toggleAllProjects}
          className="h-8 px-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/60 hover:text-white text-[11px] font-medium flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
          title={areAllExpanded ? "Colapsar todos" : "Expandir todos"}
        >
          <ChevronsUpDown className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {areAllExpanded ? "Colapsar" : "Expandir"}
          </span>
        </button>
      </div>

      {/* ── LISTA SCROLLEABLE DE PROYECTOS Y TAREAS (flex-1 min-h-0) ── */}
      <div
        data-prevent-canvas-scroll="true"
        onWheel={(e) => e.stopPropagation()}
        className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col gap-2.5 pr-1"
      >
        {groupedProjects.map((group) => {
          // Si el usuario está buscando, se expande automáticamente el grupo para ver las tareas
          const isExpanded = isSearching ? true : (expandedProjects[group.id] ?? false);

          // Si estamos buscando, podemos filtrar tareas específicas que coincidan
          const displayTasks = isSearching
            ? group.tasks.filter((t: any) => {
                const q = searchQuery.toLowerCase();
                const matchTask = (t.titulo || t.title || "").toLowerCase().includes(q);
                const matchProj = group.nombre.toLowerCase().includes(q);
                return matchTask || matchProj;
              })
            : group.tasks;

          return (
            <div
              key={group.id}
              className="flex flex-col rounded-xl bg-white/[0.03] border border-white/[0.08] overflow-hidden shrink-0 transition-colors"
            >
              {/* Cabecera del Proyecto (Colapsable) */}
              <button
                type="button"
                onClick={() => toggleProject(group.id)}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/[0.05] transition-colors cursor-pointer text-left shrink-0"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: group.projColor }}
                  />
                  <span className="text-[13px] font-semibold text-white/90 truncate">
                    {group.nombre}
                  </span>
                  <span className="text-[11px] font-medium text-white/40 shrink-0">
                    ({group.tasks.length})
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <ChevronDown
                    className={`w-4 h-4 text-white/40 transition-transform duration-200 ${
                      isExpanded ? "rotate-180 text-white/80" : ""
                    }`}
                  />
                </div>
              </button>

              {/* Tareas del Proyecto (Píldoras Redondeadas con el color del proyecto) */}
              {isExpanded && (
                <div className="p-2.5 pt-0 flex flex-col gap-1.5 shrink-0 border-t border-white/[0.04]">
                  {displayTasks.map((task: any) => {
                    const taskTitle = task.titulo || task.title || "Tarea sin título";
                    const format = task.formato || task.format;

                    return (
                      <div
                        key={task.id}
                        className="group flex items-center justify-between px-3 py-2 rounded-xl transition-all border border-white/15 hover:border-white/30 shadow-sm select-none shrink-0 min-h-[38px]"
                        style={{ backgroundColor: group.projColor }}
                      >
                        <div className="flex items-center gap-1.5 min-w-0 pr-2">
                          {format && (
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-black/30 text-white/90 shrink-0 tracking-wider">
                              {format}
                            </span>
                          )}
                          <span className="text-[12px] font-semibold text-white truncate">
                            {taskTitle}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            onInsertTask({
                              taskId: String(task.id),
                              projectId: group.id,
                              title: taskTitle,
                              projectName: group.nombre,
                              projectColor: group.projColor,
                            });
                            playSound("pop");
                          }}
                          className="h-6 px-2.5 rounded-lg bg-black/40 hover:bg-black/70 text-white text-[11px] font-bold flex items-center gap-1 transition-all shrink-0 cursor-pointer shadow-sm active:scale-95"
                          title="Añadir al canvas"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Añadir</span>
                        </button>
                      </div>
                    );
                  })}

                  {displayTasks.length === 0 && (
                    <div className="py-2.5 text-center text-[11px] text-white/30 italic">
                      Sin tareas en este proyecto
                    </div>
                  )}

                  {/* ── RECTÁNGULO REDONDEADO VACÍO: + Nueva Tarea ── */}
                  {group.id !== "no_project" && (
                    activeNewTaskProjectId === group.id ? (
                      <div className="flex items-center justify-between px-3 py-1.5 rounded-xl border border-dashed border-white/40 bg-white/[0.06] shadow-sm select-none shrink-0 min-h-[38px] gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: group.projColor }}
                          />
                          <input
                            type="text"
                            autoFocus
                            placeholder="Nombre de la nueva tarea..."
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleCreateAndInsert(group);
                              } else if (e.key === "Escape") {
                                setActiveNewTaskProjectId(null);
                                setNewTaskTitle("");
                              }
                            }}
                            className="bg-transparent text-[12px] font-semibold text-white placeholder-white/40 outline-none w-full"
                          />
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={isCreatingTask}
                            onClick={() => handleCreateAndInsert(group)}
                            className="h-6 px-2.5 rounded-lg bg-white text-black hover:bg-neutral-200 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                          >
                            {isCreatingTask ? (
                              <Loader2 className="w-3 h-3 animate-spin text-black" />
                            ) : (
                              <>
                                <Plus className="w-3 h-3 stroke-[2.5]" />
                                <span>Crear</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveNewTaskProjectId(null);
                              setNewTaskTitle("");
                            }}
                            className="w-6 h-6 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveNewTaskProjectId(group.id);
                          setNewTaskTitle("");
                          playSound("click");
                        }}
                        className="group/btn flex items-center justify-between px-3 py-2 rounded-xl transition-all border border-dashed border-white/20 hover:border-white/40 bg-transparent hover:bg-white/[0.03] select-none shrink-0 min-h-[38px] cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Plus className="w-3.5 h-3.5 text-white/40 group-hover/btn:text-white/80 transition-colors shrink-0" />
                          <span className="text-[12px] font-medium text-white/50 group-hover/btn:text-white/90 transition-colors">
                            Nueva Tarea
                          </span>
                        </div>

                        <span className="text-[10px] font-medium text-white/30 group-hover/btn:text-white/60 transition-colors bg-white/[0.04] px-1.5 py-0.5 rounded">
                          + Crear
                        </span>
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}

        {groupedProjects.length === 0 && (
          <div className="py-12 text-center text-[12px] text-white/40">
            No se encontraron proyectos ni tareas
          </div>
        )}
      </div>
    </div>
  );
}
