"use client";

import React from "react";
import { motion } from "framer-motion";
import { Task } from "./ProjectDashboard";
import PillPortalDropdown from "./PillPortalDropdown";

export interface StatusSelectorDropdownProps {
  isOpen: boolean;
  isInteractive?: boolean;
  isDimmed?: boolean;
  pillLabel: string;
  pillClassName: string;
  pillStyle?: React.CSSProperties;
  panelBgClass?: string;
  task: Task;
  projectId: string | number;
  hoveredStatusOptionCard?: { taskId: string; status: string } | null;
  setHoveredStatusOptionCard?: React.Dispatch<React.SetStateAction<{ taskId: string; status: string } | null>>;
  getStatusPillConfig: (st: string) => {
    activeBgClass: string;
    hoverBgClass: string;
    textActiveColor: string;
    textHoverColor: string;
    dotClass: string;
  };
  updateTaskProperty: (projectId: string | number, taskId: string | number, property: string, value: any) => void;
  onToggle: (e: React.MouseEvent) => void;
  onClose: () => void;
  isNightMode?: boolean;
}

const STATUS_OPTIONS = ["Planificado", "En Proceso", "En Revisión", "Completado"] as const;

export const StatusSelectorDropdown: React.FC<StatusSelectorDropdownProps> = ({
  isOpen,
  isInteractive = true,
  isDimmed = false,
  pillLabel,
  pillClassName,
  pillStyle,
  panelBgClass = "bg-[#0a0a0c]",
  task,
  projectId,
  hoveredStatusOptionCard,
  setHoveredStatusOptionCard,
  getStatusPillConfig,
  updateTaskProperty,
  onToggle,
  onClose,
  isNightMode = true,
}) => {
  const pillBase = "w-full flex items-center justify-center gap-1.5 h-5.5 px-2.5 rounded-full border-none text-[12px] font-bold transition-all duration-150 select-none cursor-pointer";

  return (
    <PillPortalDropdown
      isOpen={isOpen}
      isInteractive={isInteractive}
      isDimmed={isDimmed}
      pillLabel={pillLabel}
      pillClassName={pillClassName}
      pillStyle={pillStyle}
      panelBgClass={panelBgClass}
      onToggle={onToggle}
      onClose={onClose}
    >
      <div className="max-h-48 overflow-y-auto hide-scrollbar flex flex-col gap-1">
        {STATUS_OPTIONS.map((st) => {
          const isSelected = task.status === st;
          const isHov = hoveredStatusOptionCard?.taskId === String(task.id) && hoveredStatusOptionCard?.status === st;
          const cfg = getStatusPillConfig(st);
          return (
            <motion.button
              key={st}
              type="button"
              onHoverStart={() => setHoveredStatusOptionCard?.({ taskId: String(task.id), status: st })}
              onHoverEnd={() => setHoveredStatusOptionCard?.(null)}
              onClick={(e) => {
                e.stopPropagation();
                updateTaskProperty(projectId, task.id, "status", st);
                onClose();
              }}
              className={`${pillBase} ${
                isSelected
                  ? `${cfg.activeBgClass} ${cfg.textActiveColor}`
                  : isHov
                  ? `${cfg.hoverBgClass} ${cfg.textHoverColor}`
                  : isNightMode ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="truncate">{st}</span>
            </motion.button>
          );
        })}
      </div>
    </PillPortalDropdown>
  );
};

export default StatusSelectorDropdown;
