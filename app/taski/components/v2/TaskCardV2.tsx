"use client";

import React, { useState, useRef } from "react";
import { useSortable, defaultAnimateLayoutChanges } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { Project, Task } from "../ProjectDashboard";
import TaskCardPopovers, { TaskCardMenuPopover } from "../TaskCardPopovers";
import { playSound } from "../../utils/audio";
import { getCardColorTheme, CARD_COLOR_KEYS, getSingleSourceProjectColor } from "@/lib/utils";
import FormatoShape from "../FormatoShape";
import { EffortGaugeRing, DELIVERY_THRESHOLDS, GaugeSeverity } from "./EffortGaugeRing";
import { ProgressBarMinimal } from "./ProgressBarMinimal";
import { useTaskAccumulatedTime } from "./useTaskAccumulatedTime";

function getProjectBgColor(project: Project): string {
  return getSingleSourceProjectColor(project).hslCss;
}

function animateLayoutChanges(args: any) {
  const { isSorting, wasDragging } = args;
  if (isSorting || wasDragging) {
    return defaultAnimateLayoutChanges(args);
  }
  return true;
}

export interface TaskCardV2Props {
  taskId: string;
  projectId: string | number;
  projectName: string;
  taskTitle: string;
  completedTasks: number;
  totalTasks: number;
  taskIndex?: number;
  desc?: string;
  columnId?: string;
  forceCollapsed?: boolean;
  setDragDisabledProp?: (disabled: boolean) => void;
  expandedCardId?: string | null;
  setExpandedCardId?: React.Dispatch<React.SetStateAction<string | null>>;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  colorConfig: Record<string, { bg: string; title: string; desc: string; muted: string; dot: string; label: string; panelBg: string }>;
  getStatusPillConfig: (st: string) => {
    activeBgClass: string;
    hoverBgClass: string;
    textActiveColor: string;
    textHoverColor: string;
    dotClass: string;
  };
  getFormatPillConfig: (fmt: string, index: number) => {
    activeBgClass: string;
    hoverBgClass: string;
    textActiveColor: string;
    textHoverColor: string;
    dotClass: string;
  };
  updateTaskProperty: (projectId: string | number, taskId: string | number, property: string, value: any) => void;
  activeStatusDropdownCardId: string | null;
  setActiveStatusDropdownCardId: React.Dispatch<React.SetStateAction<string | null>>;
  activeFormatDropdownCardId: string | null;
  setActiveFormatDropdownCardId: React.Dispatch<React.SetStateAction<string | null>>;
  activeTimeDropdownCardId: string | null;
  setActiveTimeDropdownCardId: React.Dispatch<React.SetStateAction<string | null>>;
  activeColorSelectorCardId: string | null;
  setActiveColorSelectorCardId: React.Dispatch<React.SetStateAction<string | null>>;
  activeCardMenuId?: string | null;
  setActiveCardMenuId?: React.Dispatch<React.SetStateAction<string | null>>;
  onSelectProject?: (projectId: string | number) => void;
  onAddTaskToProject?: (projectId: string | number) => void;
  onChangeProjectColor?: (projectId: string | number) => void;
  sortBy?: "alfabetico" | "creacion" | "visto";
  setSortBy?: (val: "alfabetico" | "creacion" | "visto") => void;
  sortOrder?: "asc" | "desc";
  setSortOrder?: (val: "asc" | "desc") => void;
  hoveredStatusOptionCard: { taskId: string; status: string } | null;
  setHoveredStatusOptionCard: React.Dispatch<React.SetStateAction<{ taskId: string; status: string } | null>>;
  hoveredFormatOptionCard: { taskId: string; format: string } | null;
  setHoveredFormatOptionCard: React.Dispatch<React.SetStateAction<{ taskId: string; format: string } | null>>;
  availableFormats: string[];
  editingTaskField: { taskId: string; field: "title" | "desc" } | null;
  setEditingTaskField: React.Dispatch<React.SetStateAction<{ taskId: string; field: "title" | "desc" } | null>>;
  editingValue: string;
  setEditingValue: React.Dispatch<React.SetStateAction<string>>;
  saveEditing: (projectId: string | number, taskId: string | number) => void;
  isNightMode: boolean;
  isHomeEditMode: boolean;
  setDeleteModalConfig: (config: any) => void;
  getCalendarDaysDiff: (d: Date) => number;
  formatLocalDate: (d: Date) => string;
}

export const TaskCardV2Content: React.FC<TaskCardV2Props> = ({
  taskId,
  projectId,
  projectName,
  taskTitle,
  completedTasks,
  totalTasks,
  taskIndex,
  desc,
  forceCollapsed,
  setDragDisabledProp,
  expandedCardId,
  setExpandedCardId,
  projects,
  setProjects,
  colorConfig,
  getStatusPillConfig,
  getFormatPillConfig,
  updateTaskProperty,
  activeStatusDropdownCardId,
  setActiveStatusDropdownCardId,
  activeFormatDropdownCardId,
  setActiveFormatDropdownCardId,
  activeTimeDropdownCardId,
  setActiveTimeDropdownCardId,
  activeColorSelectorCardId,
  setActiveColorSelectorCardId,
  activeCardMenuId,
  setActiveCardMenuId,
  onSelectProject,
  onAddTaskToProject,
  onChangeProjectColor,
  hoveredStatusOptionCard,
  setHoveredStatusOptionCard,
  hoveredFormatOptionCard,
  setHoveredFormatOptionCard,
  availableFormats,
  editingTaskField,
  setEditingTaskField,
  editingValue,
  setEditingValue,
  saveEditing,
  isNightMode,
  isHomeEditMode,
  setDeleteModalConfig,
  getCalendarDaysDiff,
  formatLocalDate,
}) => {
  const threeDotsRef = useRef<HTMLButtonElement>(null);

  const project = projects.find((p) => String(p.id) === String(projectId));
  const clientName = project?.client || "Cliente";
  const projName = project?.title || projectName;
  const task = project?.tasks?.find(
    (t) => `kt-${projectId}-${t.id}` === taskId || String(t.id) === String(taskId)
  );

  // Hook reactivo para el tiempo acumulado en vivo y semáforo de esfuerzo (Uso A)
  const timeData = useTaskAccumulatedTime(taskId, task?.time, undefined, task?.sessions);

  if (!task) return null;

  const projectTasks = project?.tasks || [];
  const realTotalTasks = projectTasks.length > 0 ? projectTasks.length : totalTasks || 1;
  const foundIndex = projectTasks.findIndex(
    (t) => `kt-${projectId}-${t.id}` === taskId || String(t.id) === String(task.id)
  );
  const rawIndex =
    foundIndex !== -1
      ? foundIndex + 1
      : taskIndex !== undefined
      ? taskIndex < realTotalTasks
        ? taskIndex + 1
        : taskIndex
      : (task as any)?.taskIndex !== undefined
      ? (task as any).taskIndex + 1
      : 1;
  const displayTaskIndex = Math.min(Math.max(1, rawIndex), realTotalTasks);

  // 1. Fecha Programada
  const progDate = task.fecha_programada
    ? new Date(task.fecha_programada + "T00:00:00")
    : (() => {
        let offset = 0;
        if (task.status === "Completado") offset = 12;
        else if (task.status === "En Proceso") offset = 0;
        else {
          const numericId = parseInt(String(task.id).replace(/\D/g, ""), 10) || 0;
          if (numericId % 3 === 0) offset = 1;
          else if (numericId % 3 === 1) offset = 4;
          else offset = 15;
        }
        const d = new Date();
        d.setDate(d.getDate() + offset);
        return d;
      })();

  const formattedProgDate = progDate.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  const diffProgDays = getCalendarDaysDiff(progDate);
  let relativeProgLabel = "";
  if (diffProgDays === 0) relativeProgLabel = "Hoy";
  else if (diffProgDays === 1) relativeProgLabel = "Mañana";
  else if (diffProgDays === -1) relativeProgLabel = "Ayer";
  else if (diffProgDays < -1) relativeProgLabel = `Hace ${Math.abs(diffProgDays)} días`;
  else relativeProgLabel = `En ${diffProgDays} días`;

  // 2. Fecha de Entrega (Deadline / Uso B)
  const limitDate = task.fecha_limite
    ? new Date(task.fecha_limite + "T00:00:00")
    : task.deadline
    ? new Date(task.deadline + "T00:00:00")
    : (() => {
        let offset = 0;
        if (task.status === "Completado") offset = 12;
        else if (task.status === "En Proceso") offset = 0;
        else {
          const numericId = parseInt(String(task.id).replace(/\D/g, ""), 10) || 0;
          if (numericId % 3 === 0) offset = 1;
          else if (numericId % 3 === 1) offset = 4;
          else offset = 15;
        }
        const d = new Date();
        d.setDate(d.getDate() + offset);
        return d;
      })();

  const formattedLimitDate = limitDate.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  const diffLimitDays = getCalendarDaysDiff(limitDate);

  let deliveryLabel = "";
  let deliverySeverity: GaugeSeverity = "low";

  if (diffLimitDays < 0) {
    const overdue = Math.abs(diffLimitDays);
    deliveryLabel = `Atrasada ${overdue} ${overdue === 1 ? "día" : "días"}`;
    deliverySeverity = "high";
  } else if (diffLimitDays === 0) {
    deliveryLabel = "Entrega hoy";
    deliverySeverity = "high";
  } else if (diffLimitDays === 1) {
    deliveryLabel = "Entrega mañana";
    deliverySeverity = "mid";
  } else if (diffLimitDays <= DELIVERY_THRESHOLDS.low) {
    deliveryLabel = `Entrega en ${diffLimitDays} días`;
    deliverySeverity = "mid";
  } else {
    deliveryLabel = `Entrega en ${diffLimitDays} días`;
    deliverySeverity = "low";
  }

  const parentProject = projects.find((p) => String(p.id) === String(projectId));
  const taskBgColor = parentProject ? getProjectBgColor(parentProject) : undefined;
  const taskColor = task.color || (parentProject as any)?.color || "Predeterminado";
  const currentTheme = getCardColorTheme(taskColor, isNightMode);
  const isExpanded = expandedCardId === taskId && !forceCollapsed;

  const isDone = task.status === "Completado" || (task.status as any) === "Completada";

  return (
    <div
      onClick={(e) => {
        let el = e.target as HTMLElement | null;
        while (el && el !== e.currentTarget) {
          if (
            el.tagName === "BUTTON" ||
            el.tagName === "INPUT" ||
            el.tagName === "TEXTAREA" ||
            el.dataset?.noDnd === "true" ||
            el.dataset?.dropdownContainer !== undefined ||
            (isExpanded && (el.classList?.contains("task-card-title") || el.classList?.contains("task-card-desc")))
          ) {
            return;
          }
          el = el.parentElement;
        }

        const container = e.currentTarget.closest(".task-list-scroll");
        if (container) {
          (container as any)._ignoreScrollCollapse = true;
          setTimeout(() => {
            if (container) (container as any)._ignoreScrollCollapse = false;
          }, 400);
        }

        playSound("pop");
        setExpandedCardId?.((prev) => (prev === taskId ? null : taskId));
      }}
      onMouseEnter={() => playSound("click")}
      className="group/card relative cursor-pointer w-full p-1 h-full flex flex-col justify-between select-none pointer-events-auto font-sans overflow-hidden"
    >
      {/* Rectángulo contenedor de fondo en hover sin mover nada */}
      <div className="absolute inset-0 rounded-2xl bg-[#26262a] border border-white/20 pointer-events-none z-0 shadow-xl shadow-black/60 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200" />

      {/* Contenido principal de la tarjeta */}
      <div className="relative z-10 flex flex-col justify-between h-full w-full pointer-events-none">
        
        {/* ── 1. PORTADA SUPERIOR (Cuerpo Rectangular Sólido con Color de Proyecto) ── */}
        <div
          style={taskBgColor ? { backgroundColor: taskBgColor } : {}}
          className={`w-full ${
            isExpanded ? "flex-1 p-3 overflow-y-auto" : "h-[120px] p-2.5 overflow-hidden"
          } rounded-xl relative flex flex-col justify-between pointer-events-auto border transition-all ${
            taskBgColor ? "border-white/10" : `${currentTheme.bg} border-white/10`
          } ${isDone ? "opacity-75 hover:opacity-100" : "opacity-100"}`}
        >
          {/* Botón de eliminar en modo edición */}
          {isHomeEditMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteModalConfig({
                  isOpen: true,
                  projectId: Number(projectId),
                  projectTitle: projName,
                  taskId: task.id,
                  taskTitle: task.title,
                  targetType: undefined,
                });
                playSound("click");
              }}
              className="absolute top-2 right-2 z-50 flex items-center justify-center w-5 h-5 rounded-full bg-rose-500 hover:bg-rose-600 text-white shadow-md active:scale-90 transition-all cursor-pointer pointer-events-auto"
              title="Eliminar tarea"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}

          {/* Fila Superior dentro de la Portada: Formato a la izquierda + 3 puntos a la derecha */}
          <div className="z-10 flex items-center justify-between h-5 shrink-0 pointer-events-none">
            <div className="flex items-center gap-1.5 min-w-0 max-w-[170px]">
              <FormatoShape
                formatoKey={task.formato || task.format}
                size="xs"
                className="shrink-0"
              />
              <span className="text-[11px] font-medium text-white/85 tracking-tight truncate">
                {task.formato || task.format || "Tarea"}
              </span>
            </div>

            {!isHomeEditMode && (
              <div className="relative shrink-0 pointer-events-auto" data-dropdown-container>
                <button
                  ref={threeDotsRef}
                  type="button"
                  data-no-dnd="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    playSound("click");
                    setActiveCardMenuId?.((prev) => (prev === taskId ? null : taskId));
                  }}
                  className={`p-0.5 -mr-1 rounded-md hover:bg-white/20 transition-colors cursor-pointer text-white/80 hover:text-white ${
                    activeCardMenuId === taskId ? "bg-white/20 text-white" : ""
                  }`}
                  title="Opciones de la tarea"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Popover de Menú Contextual (3 Puntos) */}
          {activeCardMenuId === taskId && (
            <TaskCardMenuPopover
              isOpen={activeCardMenuId === taskId}
              onClose={() => setActiveCardMenuId?.(null)}
              triggerRef={threeDotsRef}
              onOpenProject={() => {
                onSelectProject?.(projectId);
                setActiveCardMenuId?.(null);
              }}
              onChangeProjectColor={() => {
                onChangeProjectColor?.(projectId);
                setActiveCardMenuId?.(null);
              }}
              onAddTaskToProject={() => {
                onAddTaskToProject?.(projectId);
                setActiveCardMenuId?.(null);
              }}
              onCustomizeCardColor={() => {
                setActiveColorSelectorCardId?.(taskId);
                setActiveCardMenuId?.(null);
              }}
              onDeleteTask={() => {
                setDeleteModalConfig?.({
                  isOpen: true,
                  projectId: Number(projectId),
                  projectTitle: projName,
                  taskId: task.id,
                  taskTitle: task.title,
                  targetType: undefined,
                });
                setActiveCardMenuId?.(null);
              }}
            />
          )}

          {/* Fila Inferior dentro de la Portada: Título, Cliente, Fila Proyecto + Tarea X de Y, Barra de progreso */}
          <div className="z-10 mt-auto flex flex-col gap-1 pt-1">
            {/* 1. Título de la tarea (Misma tipografía exacta que ProjectCard: text-base font-medium) */}
            {isExpanded && editingTaskField?.taskId === taskId && editingTaskField?.field === "title" ? (
              <input
                type="text"
                autoFocus
                data-no-dnd="true"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={() => {
                  saveEditing(projectId, task.id);
                  setDragDisabledProp?.(false);
                }}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    saveEditing(projectId, task.id);
                    setDragDisabledProp?.(false);
                  } else if (e.key === "Escape") {
                    setEditingTaskField(null);
                    setDragDisabledProp?.(false);
                  }
                }}
                className="task-card-title text-base font-medium bg-white/10 border border-white/20 rounded px-2 py-0.5 focus:outline-none focus:border-white w-full text-left text-white tracking-tight"
              />
            ) : (
              <h3
                {...(isExpanded ? { "data-no-dnd": "true" } : {})}
                onClick={
                  isExpanded
                    ? (e) => {
                        e.stopPropagation();
                        playSound("click");
                        setEditingTaskField({ taskId, field: "title" });
                        setEditingValue(taskTitle || "");
                        setDragDisabledProp?.(true);
                      }
                    : undefined
                }
                onMouseEnter={isExpanded ? () => setDragDisabledProp?.(true) : undefined}
                onMouseLeave={
                  isExpanded
                    ? () => {
                        if (editingTaskField?.taskId !== taskId) {
                          setDragDisabledProp?.(false);
                        }
                      }
                    : undefined
                }
                className={`task-card-title text-base font-medium text-white tracking-tight line-clamp-1 leading-snug ${
                  isExpanded ? "cursor-text hover:opacity-80" : ""
                }`}
                title={taskTitle}
              >
                {taskTitle}
              </h3>
            )}

            {/* 2. Abajo del título: Nombre del cliente */}
            <span className="text-[13px] font-normal text-white/80 line-clamp-1 truncate -mt-0.5" title={clientName}>
              {clientName}
            </span>

            {/* 3. Arriba de la barra de progreso: Nombre del proyecto (izq) y "tarea X de Y" (der) */}
            <div className="flex items-center justify-between gap-2 mt-0.5 text-[12px] leading-none">
              <span className="text-white/90 font-medium truncate max-w-[65%]" title={projName}>
                {projName}
              </span>
              <span className="font-mono text-white/90 font-medium shrink-0">
                tarea {displayTaskIndex} de {realTotalTasks}
              </span>
            </div>

            {/* 4. Barra de progreso segmentada */}
            <ProgressBarMinimal
              completedTasks={completedTasks}
              totalTasks={realTotalTasks}
              currentTaskStatus={task.status}
              className="mt-0.5"
            />
          </div>

          {/* Descripción editable y popovers interactivos si la tarjeta está expandida */}
          {isExpanded && (
            <div className="mt-2.5 pt-2 border-t border-white/10 pointer-events-auto">
              {editingTaskField?.taskId === taskId && editingTaskField?.field === "desc" ? (
                <textarea
                  autoFocus
                  data-no-dnd="true"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onBlur={() => {
                    saveEditing(projectId, task.id);
                    setDragDisabledProp?.(false);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      saveEditing(projectId, task.id);
                      setDragDisabledProp?.(false);
                    } else if (e.key === "Escape") {
                      setEditingTaskField(null);
                      setDragDisabledProp?.(false);
                    }
                  }}
                  placeholder="Escribe una descripción..."
                  className="task-card-desc text-[12px] bg-white/10 border border-white/20 rounded-lg p-2 focus:outline-none focus:border-white w-full text-white resize-none"
                  rows={3}
                />
              ) : task.desc || desc ? (
                <p
                  data-no-dnd="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    playSound("click");
                    setEditingTaskField({ taskId, field: "desc" });
                    setEditingValue(task.desc || desc || "");
                    setDragDisabledProp?.(true);
                  }}
                  className="task-card-desc text-[12px] leading-relaxed text-white/80 max-h-[80px] overflow-y-auto pr-1 cursor-text hover:text-white"
                  title="Haz clic para editar descripción"
                >
                  {task.desc || desc}
                </p>
              ) : (
                <p
                  data-no-dnd="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    playSound("click");
                    setEditingTaskField({ taskId, field: "desc" });
                    setEditingValue("");
                    setDragDisabledProp?.(true);
                  }}
                  className="task-card-desc text-[12px] italic text-white/40 cursor-text hover:text-white/70"
                >
                  Agregar descripción...
                </p>
              )}

              {/* Selectores de Estado / Formato / Fecha al expandir */}
              <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-col gap-2 relative z-30 pointer-events-auto">
                <TaskCardPopovers
                  type="status-format"
                  isInteractive={true}
                  taskId={taskId}
                  projectId={projectId}
                  project={parentProject || project}
                  task={task}
                  availableFormats={availableFormats}
                  activeStatusDropdownCardId={activeStatusDropdownCardId}
                  setActiveStatusDropdownCardId={setActiveStatusDropdownCardId}
                  activeFormatDropdownCardId={activeFormatDropdownCardId}
                  setActiveFormatDropdownCardId={setActiveFormatDropdownCardId}
                  activeTimeDropdownCardId={activeTimeDropdownCardId}
                  setActiveTimeDropdownCardId={setActiveTimeDropdownCardId}
                  hoveredStatusOptionCard={hoveredStatusOptionCard}
                  setHoveredStatusOptionCard={setHoveredStatusOptionCard}
                  hoveredFormatOptionCard={hoveredFormatOptionCard}
                  setHoveredFormatOptionCard={setHoveredFormatOptionCard}
                  getStatusPillConfig={getStatusPillConfig}
                  getFormatPillConfig={getFormatPillConfig}
                  updateTaskProperty={updateTaskProperty}
                  isNightMode={isNightMode}
                  panelBgClass={currentTheme.panelBg}
                />

                <div className="flex justify-between items-center relative pt-1 text-[12px]">
                  <span className="text-white/70">Tiempo</span>
                  <TaskCardPopovers
                    type="tiempo"
                    isInteractive={true}
                    taskId={taskId}
                    projectId={projectId}
                    project={parentProject || project}
                    task={task}
                    availableFormats={availableFormats}
                    activeStatusDropdownCardId={activeStatusDropdownCardId}
                    setActiveStatusDropdownCardId={setActiveStatusDropdownCardId}
                    activeFormatDropdownCardId={activeFormatDropdownCardId}
                    setActiveFormatDropdownCardId={setActiveFormatDropdownCardId}
                    activeTimeDropdownCardId={activeTimeDropdownCardId}
                    setActiveTimeDropdownCardId={setActiveTimeDropdownCardId}
                    hoveredStatusOptionCard={hoveredStatusOptionCard}
                    setHoveredStatusOptionCard={setHoveredStatusOptionCard}
                    hoveredFormatOptionCard={hoveredFormatOptionCard}
                    setHoveredFormatOptionCard={setHoveredFormatOptionCard}
                    getStatusPillConfig={getStatusPillConfig}
                    getFormatPillConfig={getFormatPillConfig}
                    updateTaskProperty={updateTaskProperty}
                    isNightMode={isNightMode}
                    panelBgClass={currentTheme.panelBg}
                  />
                </div>

                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-white/70">Programada</span>
                  <div className="relative">
                    <input
                      type="date"
                      id={`date-picker-prog-v2-${taskId}`}
                      className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
                      value={task.fecha_programada || formatLocalDate(progDate)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        updateTaskProperty(projectId, task.id, "fecha_programada", e.target.value);
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const picker = document.getElementById(`date-picker-prog-v2-${taskId}`) as HTMLInputElement;
                        if (picker) {
                          if (typeof picker.showPicker === "function") picker.showPicker();
                          else picker.click();
                        }
                      }}
                      className="font-medium text-white hover:underline cursor-pointer"
                    >
                      {relativeProgLabel} · {formattedProgDate}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-white/70">Entrega</span>
                  <div className="relative">
                    <input
                      type="date"
                      id={`date-picker-limit-v2-${taskId}`}
                      className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
                      value={task.fecha_limite || formatLocalDate(limitDate)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        updateTaskProperty(projectId, task.id, "fecha_limite", e.target.value);
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const picker = document.getElementById(`date-picker-limit-v2-${taskId}`) as HTMLInputElement;
                        if (picker) {
                          if (typeof picker.showPicker === "function") picker.showPicker();
                          else picker.click();
                        }
                      }}
                      className="font-medium text-white hover:underline cursor-pointer"
                    >
                      {formattedLimitDate}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── 2. CUERPO INFERIOR OSCURO (Propiedades Exteriores movidas abajo, Misma Tipografía que ProjectCard) ── */}
        <div className="h-[28px] px-1.5 flex items-center justify-between gap-2 bg-transparent min-w-0 pointer-events-auto shrink-0">
          {/* Izquierda: Entrega (Uso B) */}
          <div className="flex items-center gap-1.5 text-[#ffffff6b] font-normal min-w-0">
            <EffortGaugeRing
              severity={deliverySeverity}
              size={13}
              strokeWidth={1.75}
              showCenterDot={true}
            />
            <span
              className={`text-[14px] font-normal whitespace-nowrap ${
                deliverySeverity === "high"
                  ? "text-rose-400 font-medium"
                  : deliverySeverity === "mid"
                  ? "text-amber-400"
                  : "text-[#ffffff6b]"
              }`}
            >
              {deliveryLabel}
            </span>
          </div>

          {/* Derecha: Tiempo acumulado vs estimado (Uso A) */}
          <div
            className="flex items-center gap-1.5 shrink-0 select-none"
            title={`Consumo: ${Math.round(timeData.consumptionPercent * 100)}% (${timeData.formattedComparison})${timeData.isExceeded ? ' - ¡Tiempo excedido!' : ''}`}
          >
            <EffortGaugeRing
              progress={timeData.consumptionPercent}
              severity={timeData.effortSeverity}
              size={13}
              strokeWidth={1.75}
              showCenterDot={true}
            />
            <span
              className={`text-[14px] font-medium whitespace-nowrap transition-colors ${
                timeData.isExceeded
                  ? "text-rose-400 font-semibold"
                  : timeData.effortSeverity === "mid"
                  ? "text-amber-400"
                  : "text-[#ffffffd6]"
              }`}
            >
              {timeData.formattedComparison}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export interface SortableTaskCardV2Props extends TaskCardV2Props {
  t: any;
  extraClass?: string;
  colId: string;
  draggingTaskId: string | null;
  isDropdownOpen?: boolean;
  isEditing?: boolean;
}

export const SortableTaskCardV2: React.FC<SortableTaskCardV2Props> = (props) => {
  const { t, extraClass = "", colId, draggingTaskId, isDropdownOpen, isEditing, expandedCardId, setExpandedCardId } = props;
  const taskIdComposite = t.id.startsWith("kt-") ? t.id : `kt-${t.projectId}-${t.id}`;
  const [dragDisabled, setDragDisabled] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: taskIdComposite,
    data: {
      taskId: taskIdComposite,
      colId,
    },
    animateLayoutChanges,
    transition: {
      duration: 250,
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
    },
    disabled: dragDisabled || isEditing,
  });

  const style: React.CSSProperties = {
    transform: isDragging ? undefined : CSS.Translate.toString(transform),
    transition: isDragging ? undefined : transition,
  };

  const isAnyCardDragging = draggingTaskId !== null;
  const isCurrentDragging = draggingTaskId === taskIdComposite;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(dragDisabled || isEditing ? {} : listeners)}
      className={`task-card-wrapper relative shrink-0 w-full select-none ${
        isDragging ? "opacity-0 pointer-events-none" : ""
      } ${
        isAnyCardDragging && !isCurrentDragging ? "pointer-events-none" : ""
      } ${isDropdownOpen ? "z-50" : ""} ${
        isEditing ? "is-editing-card z-[45]" : ""
      } ${extraClass}`}
      data-task-id={taskIdComposite}
    >
      <div className="inner-card-clip w-full h-full overflow-hidden rounded-xl">
        <TaskCardV2Content
          {...props}
          taskId={taskIdComposite}
          projectId={t.projectId}
          projectName={t.projectName}
          taskTitle={t.taskTitle}
          completedTasks={t.completedTasks}
          totalTasks={t.totalTasks}
          taskIndex={t.taskIndex}
          desc={t.desc || ""}
          columnId={colId}
          forceCollapsed={false}
          setDragDisabledProp={setDragDisabled}
        />
      </div>
    </div>
  );
};

export default SortableTaskCardV2;
