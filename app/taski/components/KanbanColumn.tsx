"use client";

import React, { useEffect, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import SortableTaskCard from "./TaskCard";

export interface SynthesizedTask {
  id: string;
  projectName: string;
  projectId: number;
  taskTitle: string;
  completedTasks: number;
  totalTasks: number;
  taskIndex: number;
  dueDate: Date;
  fecha_programada: string;
  fecha_limite: string;
  fecha_creacion: string;
  status?: string;
  format?: string;
  time?: string;
  desc?: string;
  priority?: string;
  prioridad?: string;
  kanbanOrders?: Record<string, number>;
}

export interface ColumnContainerProps {
  col: {
    id: string;
    name: string;
    colorClass: string;
    badgeBg: string;
    badgeText: string;
    tasks: SynthesizedTask[];
  };
  children: React.ReactNode;
  headerBgStyle: string;
  draggingTaskId: string | null;
  isHovered: boolean;
  isAnyDropdownOpen?: boolean;
}

export function ColumnContainer({
  col,
  children,
  headerBgStyle,
  draggingTaskId,
  isHovered,
  isAnyDropdownOpen,
}: ColumnContainerProps) {
  const { setNodeRef } = useDroppable({
    id: col.id,
  });

  return (
    <div
      ref={setNodeRef}
      data-column-id={col.id}
      className="h-full min-h-0 flex-1 relative flex flex-col gap-2.5 p-0"
      style={{
        overflow: "visible",
      }}
    >

      <div className="relative z-10 flex flex-col gap-2.5 h-full min-h-0 flex-1 w-full">
        {children}
      </div>
    </div>
  );
}

export interface KanbanColumnProps {
  col: {
    id: string;
    name: string;
    colorClass: string;
    badgeBg: string;
    badgeText: string;
    tasks: SynthesizedTask[];
  };
  headerBgStyle: string;
  draggingTaskId: string | null;
  isHovered: boolean;
  isNightMode: boolean;
  activeStatusDropdownCardId: string | null;
  activeFormatDropdownCardId: string | null;
  activeTimeDropdownCardId: string | null;
  activeColorSelectorCardId: string | null;
  editingTaskField: { taskId: string; field: "title" | "desc" } | null;
  expandedCardId: string | null;
  setExpandedCardId: React.Dispatch<React.SetStateAction<string | null>>;
  columnScrollIndices: Record<string, number>;
  setColumnScrollIndices: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  updateVisibleCards: (container: HTMLDivElement) => void;
  taskCardSharedProps: any;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  col,
  headerBgStyle,
  draggingTaskId,
  isHovered,
  isNightMode,
  activeStatusDropdownCardId,
  activeFormatDropdownCardId,
  activeTimeDropdownCardId,
  activeColorSelectorCardId,
  editingTaskField,
  expandedCardId,
  setExpandedCardId,
  columnScrollIndices,
  setColumnScrollIndices,
  updateVisibleCards,
  taskCardSharedProps,
}) => {
  const colTasks = col.tasks;
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const prevDraggingRef = useRef<string | null>(null);

  useEffect(() => {
    const wasDragging = prevDraggingRef.current !== null;
    const isNowIdle = draggingTaskId === null;
    prevDraggingRef.current = draggingTaskId;

    if (wasDragging && isNowIdle && scrollContainerRef.current) {
      scrollContainerRef.current.classList.remove("hover-disabled", "is-scrolling");
    }
  }, [draggingTaskId]);

  return (
    <ColumnContainer
      key={col.id}
      col={col}
      headerBgStyle={headerBgStyle}
      draggingTaskId={draggingTaskId}
      isHovered={isHovered}
      isAnyDropdownOpen={
        activeStatusDropdownCardId !== null ||
        activeFormatDropdownCardId !== null ||
        activeTimeDropdownCardId !== null ||
        taskCardSharedProps?.activeCardMenuId !== null
      }
    >
      {/* Header of Column */}
      <div className="flex items-center gap-2.5 px-1.5 pt-1 pb-1 shrink-0">
        <span
          className={`text-[13px] font-bold ${
            isNightMode ? "text-white" : "text-slate-900"
          }`}
        >
          {col.name}
        </span>
        <span
          className={`px-2.5 py-0.5 min-w-[24px] h-[20px] rounded-[13px] text-[11px] font-mono font-bold flex items-center justify-center shrink-0 ${
            isNightMode ? "bg-white/10 text-white" : "bg-slate-200 text-slate-800"
          }`}
        >
          {colTasks.length}
        </span>
      </div>

      <SortableContext
        id={col.id}
        items={colTasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={scrollContainerRef}
          className={`task-list-scroll relative flex-1 h-full min-h-0 flex flex-col gap-2 -mx-2 px-3.5 py-2 hide-scrollbar overflow-y-auto ${
            draggingTaskId
              ? `${isHovered ? "z-50" : "z-10"} hover-disabled`
              : "z-10"
          }`}
          style={{
            overflowX: draggingTaskId ? "visible" : "hidden",
          }}
        >
          {colTasks.map((t) => {
            return (
              <SortableTaskCard
                key={t.id}
                t={t}
                extraClass=""
                colId={col.id}
                draggingTaskId={draggingTaskId}
                isDropdownOpen={
                  activeStatusDropdownCardId === t.id ||
                  activeFormatDropdownCardId === t.id ||
                  activeTimeDropdownCardId === t.id ||
                  activeColorSelectorCardId === t.id ||
                  taskCardSharedProps?.activeCardMenuId === t.id
                }
                isEditing={
                  editingTaskField?.taskId ===
                  (t.id.startsWith("kt-") ? t.id : `kt-${t.projectId}-${t.id}`)
                }
                expandedCardId={expandedCardId}
                setExpandedCardId={setExpandedCardId}
                {...taskCardSharedProps}
              />
            );
          })}
        </div>
      </SortableContext>
    </ColumnContainer>
  );
};

export default KanbanColumn;
