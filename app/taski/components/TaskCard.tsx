"use client";

import React, { useState, useRef } from "react";
import { useSortable, defaultAnimateLayoutChanges } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MoreHorizontal, Trash2, Maximize2 } from "lucide-react";
import { Project, Task } from "./ProjectDashboard";
import TaskCardPopovers, { TaskCardMenuPopover } from "./TaskCardPopovers";
import { playSound } from "../utils/audio";
import { getCardColorTheme, CARD_COLOR_KEYS, getSingleSourceProjectColor, parseAnyDate, getCalendarDaysDiff as getCalendarDaysDiffUtil } from "@/lib/utils";
import FormatoShape from "./FormatoShape";
import { EffortGaugeRing } from "./EffortGaugeRing";
import { useTaskAccumulatedTime } from "./useTaskAccumulatedTime";
import { SmoothInput } from "@/components/ui/SmoothInput";

let lastHoverSoundTime = 0;
function playDebouncedHoverSound() {
  const now = Date.now();
  if (now - lastHoverSoundTime > 120) {
    lastHoverSoundTime = now;
    playSound('click');
  }
}

export interface GhostTaskCardProps {
  totalTasks?: number;
  completedTasks?: number;
}

export const GhostTaskCard: React.FC<GhostTaskCardProps> = ({
  totalTasks = 3,
  completedTasks = 0,
}) => {
  const realTotal = Math.max(1, totalTasks || 1);
  return (
    <div className="w-full h-full rounded-2xl pointer-events-none select-none relative font-sans flex flex-col justify-between p-1.5 overflow-hidden bg-[#181818]/60 border border-white/10 backdrop-blur-sm transition-all duration-200">
      {/* 1. Portada Squircle Esqueleto */}
      <div className="w-full flex-1 min-h-0 squircle-project-box rounded-[15px] [corner-smoothing:continuous] [-webkit-corner-smoothing:continuous] relative flex flex-col justify-between overflow-hidden border border-white/[0.08] px-3.5 pt-2 pb-2 bg-white/[0.025]">
        {/* Top: Pill de cliente y 3 puntos skeleton */}
        <div className="flex flex-col gap-1.5 w-full">
          <div className="flex items-center justify-between w-full">
            <div className="h-3 w-16 bg-white/10 rounded-full animate-pulse" />
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" />
            </div>
          </div>

          {/* Título de tarea skeleton */}
          <div className="flex flex-col gap-1.5 mt-0.5">
            <div className="h-4 w-4/5 bg-white/15 rounded-md animate-pulse" />
            <div className="h-3.5 w-1/2 bg-white/10 rounded-md animate-pulse" />
          </div>
        </div>

        {/* Footer interior: Proyecto y barra de progreso */}
        <div className="mt-auto flex flex-col gap-1 pt-1 border-t border-white/[0.04] shrink-0 w-full">
          <div className="flex items-center justify-between leading-none gap-2">
            <div className="h-3 w-20 bg-white/10 rounded-full" />
            <div className="h-2.5 w-14 bg-white/10 rounded-full" />
          </div>

          {/* Segmented Progress Bar Skeleton */}
          <div className="w-full flex items-center gap-1 h-1 my-0.5">
            {Array.from({ length: realTotal }).map((_, idx) => (
              <div
                key={idx}
                className={`h-full flex-1 rounded-full ${
                  idx < completedTasks ? "bg-white/25" : "bg-white/10"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 2. Cuerpo inferior métricas skeleton (Tiempo y Entrega) */}
      <div className="h-[24px] px-1.5 pt-[8px] flex items-center justify-between gap-2 bg-transparent min-w-0 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-white/10 border border-white/10" />
          <div className="h-2.5 w-12 bg-white/10 rounded-full animate-pulse" />
        </div>
        <div className="flex items-center">
          <div className="h-2.5 w-16 bg-white/10 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
};

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
  onSelectProject?: (projectId: string | number, originRect?: { x: number; y: number; width: number; height: number }) => void;
  onSelectTask?: (task: Task, projectId: string | number, originRect?: { x: number; y: number; width: number; height: number }) => void;
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
  sessions?: any[];
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
  onSelectTask,
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
  sessions,
}) => {
  const threeDotsRef = useRef<HTMLButtonElement>(null);
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const project = projects.find(p => String(p.id) === String(projectId));
  const clientName = project?.client || "Cliente";
  const projName = project?.title || projectName;
  const task = project?.tasks?.find(t => `kt-${projectId}-${t.id}` === taskId || String(t.id) === String(taskId));

  // Hook reactivo para el tiempo acumulado en vivo y semáforo de esfuerzo (Uso A)
  const timeData = useTaskAccumulatedTime(
    taskId,
    task?.time || (task as any)?.esfuerzo,
    sessions,
    task?.sessions,
    task?.id,
    projectId
  );

  if (!task) return null;

  const projectTasks = project?.tasks || [];
  const realTotalTasks = projectTasks.length > 0 ? projectTasks.length : (totalTasks || 1);
  const foundIndex = projectTasks.findIndex(t => `kt-${projectId}-${t.id}` === taskId || String(t.id) === String(task.id));
  const rawIndex = foundIndex !== -1 ? foundIndex + 1 : (taskIndex !== undefined ? (taskIndex < realTotalTasks ? taskIndex + 1 : taskIndex) : ((task as any)?.taskIndex !== undefined ? (task as any).taskIndex + 1 : 1));
  const displayTaskIndex = Math.min(Math.max(1, rawIndex), realTotalTasks);

  const parentProject = projects.find(p => String(p.id) === String(projectId)) || project;

  // 2. Entrega (Deadline) Date - Sincronizada con la fecha del calendario del proyecto o de la tarea
  const rawTaskLimit = 
    task.fecha_limite || 
    task.deadline || 
    task.dueDate || 
    task.fechaEntrega || 
    task.fecha_programada || 
    task.fechaFin || 
    (task as any).fecha_fin;

  const rawProjectLimit = 
    (parentProject as any)?.fechaFin || 
    (parentProject as any)?.fecha_fin || 
    (parentProject as any)?.deadline || 
    (parentProject as any)?.deadlineRaw || 
    (parentProject as any)?.dueDate || 
    (parentProject as any)?.fecha_limite || 
    (parentProject as any)?.fechaEntrega || 
    (parentProject as any)?.endDate || 
    (parentProject as any)?.fechaInicio || 
    (parentProject as any)?.fecha_inicio || 
    (parentProject as any)?.startDate || 
    (parentProject as any)?.fecha;

  // La fecha del calendario del proyecto es la autoridad principal para todas sus tareas
  const limitDate = parseAnyDate(rawProjectLimit) || parseAnyDate(rawTaskLimit);

  let deliveryPrefix = "";
  let deliveryHighlight = "Sin fecha";
  let deliveryHighlightColor = "text-[#ffffff6b]";

  if (limitDate) {
    const diffLimitDays = getCalendarDaysDiff(limitDate);

    if (diffLimitDays < 0) {
      const overdue = Math.abs(diffLimitDays);
      deliveryPrefix = "Atrasada ";
      deliveryHighlight = `${overdue} ${overdue === 1 ? "día" : "días"}`;
      deliveryHighlightColor = "text-rose-400 font-medium";
    } else if (diffLimitDays === 0) {
      deliveryPrefix = "Entrega ";
      deliveryHighlight = "hoy";
      deliveryHighlightColor = "text-amber-400 font-medium";
    } else if (diffLimitDays === 1) {
      deliveryPrefix = "Entrega ";
      deliveryHighlight = "mañana";
      deliveryHighlightColor = "text-[#ffffffd6] font-medium";
    } else {
      deliveryPrefix = "Entrega en ";
      deliveryHighlight = `${diffLimitDays} ${diffLimitDays === 1 ? "día" : "días"}`;
      deliveryHighlightColor = "text-[#ffffffd6] font-medium";
    }
  }

  // Creation date
  const creationDateObj = (task as any).fecha_creacion ? new Date((task as any).fecha_creacion + "T00:00:00") : new Date();
  const formattedCreationDateShort = creationDateObj.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  const diffCreationDays = getCalendarDaysDiff(creationDateObj);
  let relativeCreationLabel = "";
  if (diffCreationDays === 0) relativeCreationLabel = "Hoy";
  else if (diffCreationDays === -1) relativeCreationLabel = "Ayer";
  else relativeCreationLabel = `Hace ${Math.abs(diffCreationDays)} días`;

  const projectColorObj = getSingleSourceProjectColor(parentProject || task);
  const taskBgColor = parentProject ? getProjectBgColor(parentProject) : projectColorObj.hslCss;
  const taskColor = task.color || (parentProject as any)?.color || "Predeterminado";
  const currentTheme = getCardColorTheme(taskColor, isNightMode);
  const isExpanded = (expandedCardId === taskId) && !forceCollapsed;

  // Tono adaptativo ambiental para el chasis exterior (estilo YouTube)
  const chasisBgColor = isNightMode
    ? `hsl(${projectColorObj.h}, ${Math.min(Math.round(projectColorObj.s * 0.42), 38)}%, 15%)`
    : `hsl(${projectColorObj.h}, ${Math.min(Math.round(projectColorObj.s * 0.45), 45)}%, 92%)`;

  const handleOpenTaskModal = (e: React.MouseEvent) => {
    if (!isHomeEditMode && onSelectTask) {
      e.stopPropagation();
      playSound('click');
      const cardEl = (e.currentTarget.closest(".task-card-wrapper") || e.currentTarget) as HTMLElement;
      const rect = cardEl.getBoundingClientRect();
      onSelectTask(task, projectId, { x: rect.x, y: rect.y, width: rect.width, height: rect.height });
    }
  };

  return (
    <div 
      onMouseEnter={playDebouncedHoverSound}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (
          target.closest("button") ||
          target.closest("input") ||
          target.closest("textarea") ||
          target.closest("[data-dropdown-container]") ||
          target.closest("[data-no-card-click='true']")
        ) {
          return;
        }
        handleOpenTaskModal(e);
      }}
      className="group/card cursor-pointer bg-transparent rounded-[22px] pointer-events-auto relative font-sans flex flex-col justify-between h-full w-full p-0.5 select-none"
    >
      {/* Chasis exterior interactivo animado: adaptado al tono del proyecto/tarea, concéntrico con la tarjeta, sin trazo ni sombra, expansión fluida que casi toca las tarjetas vecinas */}
      <div 
        className="absolute -inset-1.5 rounded-[22px] [corner-smoothing:continuous] [-webkit-corner-smoothing:continuous] pointer-events-none z-0 transform origin-center scale-95 opacity-0 group-hover/card:scale-100 group-hover/card:opacity-100 transition-all duration-260 ease-out" 
        style={{
          backgroundColor: chasisBgColor,
          transition: "transform 260ms cubic-bezier(0.16, 1, 0.3, 1), opacity 260ms ease-out, background-color 260ms ease-out",
        }}
      />

      {/* ── 1. PORTADA / CONTENEDOR RECTANGULAR SÓLIDO CON COLOR DE PROYECTO ── */}
      <div
        style={taskBgColor ? { backgroundColor: taskBgColor } : {}}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (
            target.closest("button") ||
            target.closest("input") ||
            target.closest("textarea") ||
            target.closest("[data-dropdown-container]") ||
            target.closest("[data-no-card-click='true']")
          ) {
            return;
          }
          handleOpenTaskModal(e);
        }}
        className={`w-full flex-1 min-h-0 squircle-project-box rounded-[14px] [corner-smoothing:continuous] [-webkit-corner-smoothing:continuous] relative z-10 flex flex-col justify-between overflow-hidden border border-white/10 px-3.5 pt-2 pb-2 transition-all duration-260 cursor-pointer ${
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
              onOpenTask={() => {
                const cardEl = threeDotsRef.current?.closest(".task-card-wrapper") || threeDotsRef.current;
                const rect = cardEl ? cardEl.getBoundingClientRect() : undefined;
                onSelectTask?.(task, projectId, rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : undefined);
                setActiveCardMenuId?.(null);
              }}
              onOpenProject={() => {
                const cardEl = threeDotsRef.current?.closest(".task-card-wrapper") || threeDotsRef.current;
                const rect = cardEl ? cardEl.getBoundingClientRect() : undefined;
                onSelectProject?.(projectId, rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : undefined);
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
              <span className="text-[14px] font-medium select-none truncate text-white/90">
                {clientName || "Sin cliente"}
              </span>
              <SmoothInput
                type="text"
                unstyled
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
                wrapperClassName="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 focus-within:border-amber-500 pointer-events-auto z-40 transition-colors"
                className={`task-card-title text-[16px] font-bold text-left ${currentTheme.title}`}
              />
            </div>
          ) : (
            <div className="flex flex-col min-w-0 w-full">
              {/* Top Meta Line: Client Name & Action Buttons (Expand + 3 dots) */}
              <div className="flex items-center justify-between w-full leading-none">
                <span className="text-[14px] font-medium select-none truncate text-white/80 leading-none mr-2">
                  {clientName || "Sin cliente"}
                </span>
                {!isHomeEditMode && (
                  <div 
                    className={`flex items-center gap-0.5 shrink-0 -mr-1 -mt-1 transition-opacity duration-200 ${
                      activeCardMenuId === taskId ? "opacity-100" : "opacity-0 group-hover/card:opacity-100"
                    }`}
                    data-no-dnd="true"
                  >
                    {/* Botón de expandir para abrir la ventana de tarea */}
                    <button
                      type="button"
                      data-no-dnd="true"
                      onClick={handleOpenTaskModal}
                      className="p-1 rounded-md hover:bg-white/20 transition-colors cursor-pointer shrink-0 text-white/70 hover:text-white"
                      title="Abrir ventana de la tarea"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Botón de 3 puntos (Menú contextual) */}
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
                        className={`p-1 rounded-md hover:bg-white/20 transition-colors cursor-pointer shrink-0 text-white/70 hover:text-white ${
                          activeCardMenuId === taskId ? "bg-white/25 text-white" : ""
                        }`}
                        title="Opciones de la tarjeta"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Task Title */}
              <h4 
                data-no-dnd="true"
                onClick={handleOpenTaskModal}
                className={`task-card-title text-[16px] font-bold tracking-normal leading-tight line-clamp-2 transition-all select-none mt-0.5 cursor-pointer hover:opacity-85 ${currentTheme.title}`}
                title="Haz clic para editar la tarea"
              >
                {taskTitle}
              </h4>
            </div>
          )}
        </div>

        {/* Footer inside the project color box: Project Name, Task Index & Progress Bar */}
        <div className="mt-auto flex flex-col gap-1 pt-1 border-t border-white/[0.04] shrink-0 w-full">
          <div className="flex items-center justify-between leading-none gap-2">
            <span className={`text-[14px] font-medium select-none truncate text-white/90 leading-none ${currentTheme.title}`} title={projName}>
              {projName}
            </span>
            <span className={`text-[12px] font-medium select-none shrink-0 leading-none text-white/80 ${currentTheme.title}`}>
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

      {/* ── 2. CUERPO INFERIOR (Propiedades en el contenedor de fondo: Tiempo de Elaboración y Entrega) ── */}
      <div className="h-[24px] px-1.5 pt-[8px] flex items-center justify-between gap-2 bg-transparent min-w-0 pointer-events-auto shrink-0 select-none relative z-10">
        {/* Izquierda: Tiempo acumulado vs estimado sincronizado con sesiones (Tiempo de elaboración) */}
        <div
          className="flex items-center gap-1.5 min-w-0 select-none"
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

        {/* Derecha: Entrega (Sin icono, días coloreados o en blanco) */}
        <div className="flex items-center text-[#ffffff6b] font-normal shrink-0 min-w-0 select-none">
          <span className="text-[13px] font-normal leading-none whitespace-nowrap">
            {deliveryPrefix}
            <span className={deliveryHighlightColor}>{deliveryHighlight}</span>
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
  sessions?: any[];
}

export const SortableTaskCard: React.FC<SortableTaskCardProps> = (props) => {
  const { t, extraClass, colId, draggingTaskId, isDropdownOpen, isEditing, sessions } = props;
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

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`task-card-wrapper relative shrink-0 ${extraClass}`}
        data-task-id={taskIdComposite}
      >
        <div className="inner-card-clip w-full h-full overflow-hidden rounded-2xl">
          <GhostTaskCard
            totalTasks={t.totalTasks}
            completedTasks={t.completedTasks}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(dragDisabled || isEditing ? {} : listeners)}
      className={`task-card-wrapper w-full relative shrink-0 hover:z-20 transition-[z-index] duration-150 ${
        isAnyCardDragging && !isCurrentDragging
          ? 'pointer-events-none'
          : ''
      } ${isDropdownOpen ? 'z-50' : ''} ${
        isEditing ? 'is-editing-card z-[45]' : ''
      } ${extraClass}`}
      data-task-id={taskIdComposite}
    >
      {/* inner-card-clip: rounded-[22px] relative overflow-visible */}
      <div className="inner-card-clip w-full h-full rounded-[22px] relative overflow-visible">
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
          sessions={sessions}
        />
      </div>
    </div>
  );
};

export default SortableTaskCard;
