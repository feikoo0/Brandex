"use client";

import React, { useState, useRef } from "react";
import { useSortable, defaultAnimateLayoutChanges } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { Project, Task } from "./ProjectDashboard";
import TaskCardPopovers, { TaskCardMenuPopover } from "./TaskCardPopovers";
import { playSound } from "../utils/audio";
import { getCardColorTheme, CARD_COLOR_KEYS, getSingleSourceProjectColor } from "@/lib/utils";
import FormatoShape from "./FormatoShape";
import { EffortGaugeRing, DELIVERY_THRESHOLDS, GaugeSeverity } from "./EffortGaugeRing";
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

export interface TaskCardProps {
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

export const TaskCardContent: React.FC<TaskCardProps> = ({
  taskId,
  projectId,
  projectName,
  taskTitle,
  completedTasks,
  totalTasks,
  taskIndex,
  desc,
  columnId,
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
  sortBy = "visto",
  setSortBy,
  sortOrder = "desc",
  setSortOrder,
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
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const project = projects.find(p => String(p.id) === String(projectId));
  const clientName = project?.client || "Cliente";
  const projName = project?.title || projectName;
  const task = project?.tasks?.find(t => `kt-${projectId}-${t.id}` === taskId || String(t.id) === String(taskId));

  // Hook reactivo para el tiempo acumulado en vivo y semáforo de esfuerzo (Uso A)
  const timeData = useTaskAccumulatedTime(taskId, task?.time, undefined, task?.sessions);

  if (!task) return null;

  const projectTasks = project?.tasks || [];
  const realTotalTasks = projectTasks.length > 0 ? projectTasks.length : (totalTasks || 1);
  const foundIndex = projectTasks.findIndex(t => `kt-${projectId}-${t.id}` === taskId || String(t.id) === String(task.id));
  const rawIndex = foundIndex !== -1 ? foundIndex + 1 : (taskIndex !== undefined ? (taskIndex < realTotalTasks ? taskIndex + 1 : taskIndex) : ((task as any)?.taskIndex !== undefined ? (task as any).taskIndex + 1 : 1));
  const displayTaskIndex = Math.min(Math.max(1, rawIndex), realTotalTasks);

  // 2. Entrega (Deadline) Date
  const limitDate = (task.fecha_limite ? new Date(task.fecha_limite + "T00:00:00") : (task.deadline ? new Date(task.deadline + "T00:00:00") : (() => {
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
  })()));

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

  // Creation date
  const creationDateObj = (task as any).fecha_creacion ? new Date((task as any).fecha_creacion + "T00:00:00") : new Date();
  const formattedCreationDateShort = creationDateObj.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  const diffCreationDays = getCalendarDaysDiff(creationDateObj);
  let relativeCreationLabel = "";
  if (diffCreationDays === 0) relativeCreationLabel = "Hoy";
  else if (diffCreationDays === -1) relativeCreationLabel = "Ayer";
  else relativeCreationLabel = `Hace ${Math.abs(diffCreationDays)} días`;

  const parentProject = projects.find(p => String(p.id) === String(projectId));
  const taskBgColor = parentProject ? getProjectBgColor(parentProject) : undefined;
  const taskColor = task.color || (parentProject as any)?.color || "Predeterminado";
  const currentTheme = getCardColorTheme(taskColor, isNightMode);
  const isExpanded = (expandedCardId === taskId) && !forceCollapsed;

  return (
    <div 
      onMouseEnter={() => playSound('click')}
      className={`group/card ${
        isNightMode ? "bg-[#121212]" : "bg-white"
      } rounded-2xl pointer-events-auto relative font-sans flex flex-col justify-between h-full w-full p-1.5 overflow-hidden select-none`}
    >
      {/* Rectángulo claro que se expande del centro hacia afuera en hover por detrás */}
      <div 
        className={`absolute inset-0 rounded-2xl pointer-events-none z-0 transition-all duration-300 ease-out origin-center transform scale-75 opacity-0 group-hover/card:scale-100 group-hover/card:opacity-100 ${
          isNightMode ? "bg-[#222226]" : "bg-slate-100"
        }`} 
      />

      {/* ── 1. PORTADA / CONTENEDOR RECTANGULAR SÓLIDO CON COLOR DE PROYECTO ── */}
      <div
        style={taskBgColor ? { backgroundColor: taskBgColor } : {}}
        className={`w-full flex-1 min-h-0 rounded-xl relative z-10 flex flex-col justify-between overflow-hidden border border-white/10 px-3.5 pt-2 pb-2 transition-all duration-300 ${
          taskBgColor ? "" : currentTheme.bg
        }`}
      >
        {/* Delete button in edit mode */}
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
              playSound('click');
            }}
            className="absolute top-2.5 right-2.5 z-50 flex items-center justify-center w-5.5 h-5.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white shadow-md active:scale-90 transition-all cursor-pointer pointer-events-auto"
            title="Eliminar tarea"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}

        {/* Top Group: Format Icon + (Client Name & 3-dots + Task Title + Project Name) */}
        <div className="flex flex-col relative z-10">
          {/* Task Card Menu Popover (Figma-Style) */}
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

          {/* Task Title & Meta Header */}
          {isHomeEditMode ? (
            <div className="flex flex-col min-w-0 w-full gap-1">
              <span className="text-[12px] font-medium select-none truncate text-white/90">
                {projName}
              </span>
              <input
                type="text"
                defaultValue={taskTitle || ""}
                onBlur={(e) => {
                  const newTitle = e.target.value.trim();
                  if (!newTitle) return;
                  setProjects((prev) => {
                    return prev.map((p) => {
                      if (p.id === projectId) {
                        const updatedTasks = (p.tasks || []).map(t => {
                          if (t.id === task.id) {
                            return { ...t, title: newTitle };
                          }
                          return t;
                        });
                        return { ...p, tasks: updatedTasks };
                      }
                      return p;
                    });
                  });
                }}
                className={`task-card-title text-[16px] font-bold bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 focus:border-amber-500 focus:outline-none w-full pointer-events-auto z-40 text-left ${currentTheme.title}`}
              />
              {clientName && (
                <span className="text-[12px] font-medium leading-snug text-white truncate select-none">
                  {clientName}
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col min-w-0 w-full">
              {/* Top Meta Line: Project Name & 3 dots */}
              <div className="flex items-center justify-between w-full leading-none">
                <span className="text-[12px] font-medium select-none truncate text-white/80 leading-none">
                  {projName}
                </span>
                {!isHomeEditMode && (
                  <div className="relative shrink-0" data-dropdown-container>
                    <button
                      ref={threeDotsRef}
                      type="button"
                      data-no-dnd="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        playSound('click');
                        setActiveCardMenuId?.((prev) => (prev === taskId ? null : taskId));
                      }}
                      className={`p-0.5 -mr-1 -mt-1 rounded-md hover:bg-white/15 transition-colors cursor-pointer shrink-0 text-white/70 hover:text-white ${
                        activeCardMenuId === taskId ? "bg-white/20 text-white" : ""
                      }`}
                      title="Opciones de la tarjeta"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Task Title */}
              <h4 
                className={`task-card-title text-[14px] font-bold tracking-normal leading-tight line-clamp-2 transition-all select-none mt-0.5 ${currentTheme.title}`}
              >
                {taskTitle}
              </h4>

              {/* Client Name */}
              {clientName && (
                <span className="text-[12px] font-medium leading-tight text-white/90 truncate select-none mt-0.5">
                  {clientName}
                </span>
              )}
            </div>
          )}

          {/* Description visible on hover */}
          <div className="task-card-details flex flex-col mt-2 select-none pointer-events-auto relative z-20">
            {/* Description line */}
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
                className={`task-card-desc text-[12px] bg-white/5 border border-white/10 rounded-xl p-2 focus:outline-none focus:border-amber-500 w-full pointer-events-auto z-45 resize-none ${currentTheme.desc}`}
                rows={2}
              />
            ) : task.desc || desc ? (
              <p 
                data-no-dnd="true"
                onClick={(e) => {
                  e.stopPropagation();
                  playSound('click');
                  setEditingTaskField({ taskId, field: "desc" });
                  setEditingValue(task.desc || desc || "");
                  setDragDisabledProp?.(true);
                }}
                onMouseEnter={() => setDragDisabledProp?.(true)}
                onMouseLeave={() => {
                  if (editingTaskField?.taskId !== taskId) {
                    setDragDisabledProp?.(false);
                  }
                }}
                className={`task-card-desc text-[12px] leading-snug transition-all pointer-events-auto line-clamp-3 cursor-text hover:opacity-80 ${currentTheme.desc}`}
                title="Haz clic para editar descripción"
              >
                {task.desc || desc}
              </p>
            ) : (
              <p 
                data-no-dnd="true"
                onClick={(e) => {
                  e.stopPropagation();
                  playSound('click');
                  setEditingTaskField({ taskId, field: "desc" });
                  setEditingValue("");
                  setDragDisabledProp?.(true);
                }}
                onMouseEnter={() => setDragDisabledProp?.(true)}
                onMouseLeave={() => {
                  if (editingTaskField?.taskId !== taskId) {
                    setDragDisabledProp?.(false);
                  }
                }}
                className={`task-card-desc text-[12px] italic cursor-text hover:opacity-80 transition-all pointer-events-auto opacity-60 ${currentTheme.desc}`}
                title="Haz clic para agregar descripción"
              >
                Agregar descripción...
              </p>
            )}
          </div>
        </div>

        {/* Footer inside the project color box: Task Index & Progress Bar */}
        <div className="mt-auto flex flex-col gap-1 pt-1 border-t border-white/[0.04] shrink-0 w-full">
          <div className="flex items-center justify-between leading-none">
            <span className={`text-[12px] font-medium select-none ${currentTheme.title}`}>
              Tarea {displayTaskIndex} de {realTotalTasks}
            </span>
          </div>

          {/* Segmented Progress Bar */}
          <div className="w-full flex items-center gap-1 h-1 my-0.5">
            {Array.from({ length: Math.max(1, realTotalTasks) }).map((_, idx) => {
              const isCompleted = idx < completedTasks;
              const isInProcess = !isCompleted && task.status === "En Proceso" && idx === completedTasks;
              
              return (
                <div
                  key={idx}
                  className={`h-full flex-1 rounded-full transition-all duration-300 ${
                    isCompleted
                      ? "bg-white"
                      : isInProcess
                      ? "bg-white/60"
                      : "bg-white/20"
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 2. CUERPO INFERIOR (Propiedades en el contenedor de fondo: Entrega y Tiempo con Sesiones) ── */}
      <div className="h-[24px] px-1.5 pt-[8px] flex items-center justify-between gap-2 bg-transparent min-w-0 pointer-events-auto shrink-0 select-none relative z-10">
        {/* Izquierda: Entrega (Uso B) */}
        <div className="flex items-center gap-1.5 text-[#ffffff6b] font-normal min-w-0">
          <EffortGaugeRing
            severity={deliverySeverity}
            size={13}
            strokeWidth={1.75}
            showCenterDot={true}
            className="shrink-0"
          />
          <span
            className={`text-[13px] font-normal leading-none whitespace-nowrap ${
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

        {/* Derecha: Tiempo acumulado vs estimado sincronizado con sesiones (Uso A) */}
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
            className="shrink-0"
          />
          <span
            className={`text-[13px] font-medium leading-none whitespace-nowrap transition-colors ${
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
  );
};

export interface SortableTaskCardProps {
  t: any;
  extraClass: string;
  colId: string;
  draggingTaskId: string | null;
  isDropdownOpen?: boolean;
  isEditing?: boolean;
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

export const SortableTaskCard: React.FC<SortableTaskCardProps> = (props) => {
  const { t, extraClass, colId, draggingTaskId, isDropdownOpen, isEditing } = props;
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
      colId
    },
    animateLayoutChanges,
    transition: {
      duration: 250,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    },
    disabled: dragDisabled || isEditing,
  });

  const style = {
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
      className={`task-card-wrapper relative shrink-0 ${
        isDragging 
          ? 'opacity-0 pointer-events-none' 
          : ''
      } ${
        isAnyCardDragging && !isCurrentDragging
          ? 'pointer-events-none'
          : ''
      } ${isDropdownOpen ? 'z-50' : ''} ${
        isEditing ? 'is-editing-card z-[45]' : ''
      } ${extraClass}`}
      data-task-id={taskIdComposite}
    >
      {/* inner-card-clip: always overflow-hidden + rounded — never disturbed by dropdown z-index changes on the wrapper */}
      <div className="inner-card-clip w-full h-full overflow-hidden rounded-2xl">
        <TaskCardContent
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

export default SortableTaskCard;
