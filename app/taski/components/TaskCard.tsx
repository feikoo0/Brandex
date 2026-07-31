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

  if (!task) return null;

  const projectTasks = project?.tasks || [];
  const realTotalTasks = projectTasks.length > 0 ? projectTasks.length : (totalTasks || 1);
  const foundIndex = projectTasks.findIndex(t => `kt-${projectId}-${t.id}` === taskId || String(t.id) === String(task.id));
  const rawIndex = foundIndex !== -1 ? foundIndex + 1 : (taskIndex !== undefined ? (taskIndex < realTotalTasks ? taskIndex + 1 : taskIndex) : ((task as any)?.taskIndex !== undefined ? (task as any).taskIndex + 1 : 1));
  const displayTaskIndex = Math.min(Math.max(1, rawIndex), realTotalTasks);

  // 1. Programada Date
  const progDate = (task.fecha_programada ? new Date(task.fecha_programada + "T00:00:00") : (() => {
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
  })());

  const formattedProgDate = progDate.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  const diffProgDays = getCalendarDaysDiff(progDate);
  let relativeProgLabel = "";
  if (diffProgDays === 0) relativeProgLabel = "Hoy";
  else if (diffProgDays === 1) relativeProgLabel = "Mañana";
  else if (diffProgDays === -1) relativeProgLabel = "Ayer";
  else if (diffProgDays < -1) relativeProgLabel = `Hace ${Math.abs(diffProgDays)} días`;
  else relativeProgLabel = `En ${diffProgDays} días`;

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
  let relativeLimitLabel = "";
  if (diffLimitDays === 0) relativeLimitLabel = "Hoy";
  else if (diffLimitDays === 1) relativeLimitLabel = "Mañana";
  else if (diffLimitDays === -1) relativeLimitLabel = "Ayer";
  else if (diffLimitDays < -1) relativeLimitLabel = `Hace ${Math.abs(diffLimitDays)} días`;
  else relativeLimitLabel = `En ${diffLimitDays} días`;

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
        
        // Prevent layout-induced scroll events from instantly closing the card
        const container = e.currentTarget.closest('.task-list-scroll');
        if (container) {
          (container as any)._ignoreScrollCollapse = true;
          setTimeout(() => {
            if (container) (container as any)._ignoreScrollCollapse = false;
          }, 400);
        }

        playSound("pop");
        setExpandedCardId?.((prev) => (prev === taskId ? null : taskId));
      }}
      onMouseEnter={() => playSound('click')}
      style={taskBgColor ? { backgroundColor: taskBgColor } : {}}
      className={`group/card border-none rounded-xl transition-all duration-300 pointer-events-auto relative font-sans flex flex-col h-full w-full ${taskBgColor ? '' : currentTheme.bg} px-3.5 pt-2.5 pb-2.5`}
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

      {/* Top Group: Project Title & Icon & Task Title */}
      <div className={`flex flex-col relative ${activeColorSelectorCardId === taskId || activeCardMenuId === taskId ? "z-[9999]" : (activeStatusDropdownCardId === taskId || activeFormatDropdownCardId === taskId) ? "z-auto" : "z-10"}`}>
        <div className="flex items-center justify-between w-full">
          <span className={`text-[12px] font-normal select-none truncate ${currentTheme.muted}`}>
            <span className="text-white font-medium">{clientName}</span> • Entrega {relativeLimitLabel.toLowerCase()}
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
                className={`p-0.5 -mr-1 rounded-md hover:bg-white/15 transition-colors cursor-pointer shrink-0 text-white/70 hover:text-white ${
                  activeCardMenuId === taskId ? "bg-white/20 text-white" : ""
                }`}
                title="Opciones de la tarjeta"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

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
        
        {/* Slide-Up Task Title + Format Icon */}
        {isHomeEditMode ? (
          <div className="flex flex-col gap-1 mt-1.5 w-full">
            <div className="flex items-center gap-2 w-full">
              <FormatoShape formatoKey={task.formato || task.format} size="sm" className="shrink-0" />
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
            </div>
            {projName && (
              <span className="text-[12px] font-medium leading-snug text-white truncate select-none pl-7">
                {projName}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-2 mt-1.5 relative w-full">
            <FormatoShape formatoKey={task.formato || task.format} size="sm" className="shrink-0 mt-0.5" />
            <div className="flex flex-col min-w-0 flex-1">
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
                  className={`task-card-title text-[14px] font-bold bg-transparent border-none p-0 focus:outline-none focus:ring-0 w-full pointer-events-auto z-45 text-left ${currentTheme.title}`}
                />
              ) : (
                <h4 
                  {...(isExpanded ? { "data-no-dnd": "true" } : {})}
                  onClick={isExpanded ? (e) => {
                    e.stopPropagation();
                    playSound('click');
                    setEditingTaskField({ taskId, field: "title" });
                    setEditingValue(taskTitle || "");
                    setDragDisabledProp?.(true);
                  } : undefined}
                  onMouseEnter={isExpanded ? () => setDragDisabledProp?.(true) : undefined}
                  onMouseLeave={isExpanded ? () => {
                    if (editingTaskField?.taskId !== taskId) {
                      setDragDisabledProp?.(false);
                    }
                  } : undefined}
                  className={`task-card-title text-[14px] font-bold tracking-normal leading-tight line-clamp-2 transition-all pointer-events-auto ${
                    isExpanded ? "cursor-text hover:opacity-80" : ""
                  } ${currentTheme.title}`}
                  title={isExpanded ? "Haz clic para editar título" : undefined}
                >
                  {taskTitle}
                </h4>
              )}
              {projName && (
                <span className="text-[12px] font-medium leading-snug text-white truncate select-none mt-0.5">
                  {projName}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Client & Project details & Description visible on hover / expanded */}
        <div className={`task-card-details flex flex-col gap-3 mt-3 select-none pointer-events-auto relative ${
          (activeStatusDropdownCardId === taskId || activeFormatDropdownCardId === taskId) ? "z-[9999] !overflow-visible" : "z-20"
        }`}>
          {/* Properties: Status and Format/Type via TaskCardPopovers */}
          <TaskCardPopovers
            type="status-format"
            isInteractive={isExpanded}
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

          {/* Description line */}
          {isExpanded && editingTaskField?.taskId === taskId && editingTaskField?.field === "desc" ? (
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
              rows={3}
            />
          ) : (
            task.desc || desc ? (
              <p 
                {...(isExpanded ? { "data-no-dnd": "true" } : {})}
                onClick={isExpanded ? (e) => {
                  e.stopPropagation();
                  playSound('click');
                  setEditingTaskField({ taskId, field: "desc" });
                  setEditingValue(task.desc || desc || "");
                  setDragDisabledProp?.(true);
                } : undefined}
                onMouseEnter={isExpanded ? () => setDragDisabledProp?.(true) : undefined}
                onMouseLeave={isExpanded ? () => {
                  if (editingTaskField?.taskId !== taskId) {
                    setDragDisabledProp?.(false);
                  }
                } : undefined}
                className={`task-card-desc text-[12px] leading-snug transition-all pointer-events-auto ${
                  isExpanded ? 'max-h-[72px] overflow-y-auto hide-scrollbar pr-1 cursor-text hover:opacity-80' : 'line-clamp-2'
                } ${currentTheme.desc}`}
                title={isExpanded ? "Haz clic para editar descripción" : undefined}
              >
                {task.desc || desc}
              </p>
            ) : (
              isExpanded ? (
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
                  className={`task-card-desc text-[14px] italic cursor-text hover:opacity-80 transition-all pointer-events-auto ${currentTheme.muted}`}
                  title="Haz clic para agregar descripción"
                >
                  Descripción de la tarea...
                </p>
              ) : null
            )
          )}
        </div>
      </div>

      {/* Dynamic task metadata properties block — always rendered, CSS-animated via .task-card-expanded-meta */}
      <div className={`task-card-expanded-meta mt-0 border-t border-white/[0.04] flex flex-col gap-1 text-[12px] pointer-events-auto relative ${(activeStatusDropdownCardId === taskId || activeFormatDropdownCardId === taskId) ? "z-auto" : "z-30"}`}>
        {/* Row 0: Tiempo */}
        <div className="flex justify-between items-center relative pt-2.5">
          <span className={`font-normal select-none ${currentTheme.muted}`}>Tiempo</span>
          <TaskCardPopovers
            type="tiempo"
            isInteractive={isExpanded}
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
        {/* Row 1: Programada */}
        <div className="flex justify-between items-center relative">
          <span className={`font-normal select-none ${currentTheme.muted}`}>Programada</span>
          <div className="relative">
            <input
              type="date"
              id={`date-picker-prog-${taskId}`}
              className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
              value={task.fecha_programada || formatLocalDate(progDate)}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                updateTaskProperty(projectId, task.id, "fecha_programada", e.target.value);
              }}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                const picker = document.getElementById(`date-picker-prog-${taskId}`) as HTMLInputElement;
                if (picker) {
                  if (typeof picker.showPicker === "function") picker.showPicker();
                  else picker.click();
                }
              }}
              className={`font-bold hover:underline cursor-pointer select-none transition-colors ${currentTheme.title}`}
              title="Cambiar fecha programada"
            >
              {relativeProgLabel} · {formattedProgDate}
            </button>
          </div>
        </div>

        {/* Row 2: Entrega */}
        <div className="flex justify-between items-center relative">
          <span className={`font-normal select-none ${currentTheme.muted}`}>Entrega</span>
          <div className="relative">
            <input
              type="date"
              id={`date-picker-limit-${taskId}`}
              className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
              value={task.fecha_limite || formatLocalDate(limitDate)}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                updateTaskProperty(projectId, task.id, "fecha_limite", e.target.value);
              }}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                const picker = document.getElementById(`date-picker-limit-${taskId}`) as HTMLInputElement;
                if (picker) {
                  if (typeof picker.showPicker === "function") picker.showPicker();
                  else picker.click();
                }
              }}
              className={`font-bold hover:underline cursor-pointer select-none transition-colors ${currentTheme.title}`}
              title="Cambiar fecha de entrega"
            >
              {relativeLimitLabel} · {formattedLimitDate}
            </button>
          </div>
        </div>

        {/* Creation Info Line */}
        <div className="flex justify-end items-center relative pt-0.5">
          <span className={`text-[11px] font-semibold select-none opacity-80 ${currentTheme.title}`}>
            Creado {relativeCreationLabel.toLowerCase()} · {formattedCreationDateShort}
          </span>
        </div>
      </div>

      {/* Footer Metadata: Task Index, Client Tag & Progress Bar */}
      <div className="mt-auto flex flex-col gap-1 pt-1.5 border-t border-white/[0.04] shrink-0 w-full">
        <div className="flex items-center justify-between leading-none">
          <span className={`text-[13px] font-medium select-none ${currentTheme.title}`}>
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
      <div className="inner-card-clip w-full h-full overflow-hidden rounded-xl">
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
