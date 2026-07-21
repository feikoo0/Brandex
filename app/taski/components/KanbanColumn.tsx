"use client";

import React from "react";
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
      className={`h-full relative flex flex-col gap-2.5 transition-all duration-300 ${
        draggingTaskId
          ? isHovered
            ? "z-50 shadow-[0_20px_50px_rgba(0,0,0,0.35)] border border-dashed border-sky-500/40 bg-sky-500/[0.02] p-2 rounded-[13px]"
            : "z-10 border border-dashed border-white/[0.04] p-2 rounded-[13px]"
          : "border border-transparent p-0"
      }`}
      style={{
        overflow: draggingTaskId || isAnyDropdownOpen ? "visible" : "hidden",
      }}
    >
      {children}
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
        activeTimeDropdownCardId !== null
      }
    >
      {/* Header of Column */}
      <div className="flex items-center gap-2.5 px-0 pt-1 pb-1 shrink-0">
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
          ref={(el) => {
            if (el) {
              if (!draggingTaskId) {
                setTimeout(() => {
                  updateVisibleCards(el);
                }, 0);
              }
            }
          }}
          className={`task-list-scroll relative h-[506px] hide-scrollbar flex flex-col gap-2.5 px-0 py-0 overflow-y-auto ${
            draggingTaskId
              ? `${isHovered ? "z-50" : "z-10"} hover-disabled`
              : "z-10"
          }`}
          style={{
            overflowX: draggingTaskId ? "visible" : "hidden",
          }}
          onScroll={(e) => {
            const container = e.currentTarget;
            if ((container as any)._ignoreScrollCollapse) {
              return;
            }
            container.classList.add("is-scrolling", "hover-disabled");
            setExpandedCardId(null);

            const scrollTimeout = (container as any)._scrollTimeout;
            if (scrollTimeout) clearTimeout(scrollTimeout);

            const cooldownTimeout = (container as any)._cooldownTimeout;
            if (cooldownTimeout) clearTimeout(cooldownTimeout);

            (container as any)._scrollTimeout = setTimeout(() => {
              container.classList.remove("is-scrolling");
              updateVisibleCards(container);

              const topIndex = Math.round(container.scrollTop / 172);
              setColumnScrollIndices((prev) => {
                if (prev[col.id] === topIndex) return prev;
                return { ...prev, [col.id]: topIndex };
              });

              (container as any)._cooldownTimeout = setTimeout(() => {
                container.classList.remove("hover-disabled");
              }, 250);
            }, 150);
          }}
        >
          {colTasks.map((t) => {
            const colTopIndex = columnScrollIndices[col.id] || 0;
            const isColumnExpanded = colTasks.some(
              (tk) => tk.id === expandedCardId
            );

            const tasksIdx = colTasks.findIndex((tk) => tk.id === t.id);
            const relativeIndex = tasksIdx - colTopIndex;

            let extraClass = "";
            if (isColumnExpanded) {
              const expandedIdx = colTasks.findIndex(
                (tk) => tk.id === expandedCardId
              );
              const expandedRelativeIndex = expandedIdx - colTopIndex;

              if (t.id === expandedCardId) {
                extraClass = "is-expanded-double";
              } else if (relativeIndex < 0) {
                extraClass = "";
              } else {
                extraClass = "is-hidden-sibling";
                if (expandedRelativeIndex === 0 && relativeIndex === 1) {
                  extraClass = "is-shrunk-sibling";
                } else if (expandedRelativeIndex === 1 && relativeIndex === 2) {
                  extraClass = "is-shrunk-sibling";
                } else if (expandedRelativeIndex === 2 && relativeIndex === 1) {
                  extraClass = "is-shrunk-sibling";
                }
              }
            }

            return (
              <SortableTaskCard
                key={t.id}
                t={t}
                extraClass={extraClass}
                colId={col.id}
                draggingTaskId={draggingTaskId}
                isDropdownOpen={
                  activeStatusDropdownCardId === t.id ||
                  activeFormatDropdownCardId === t.id ||
                  activeTimeDropdownCardId === t.id ||
                  activeColorSelectorCardId === t.id
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
