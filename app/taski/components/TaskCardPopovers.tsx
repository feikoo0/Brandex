"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus, Trash2, FolderOpen, Palette, PlusCircle, Paintbrush } from "lucide-react";
import { Task } from "./ProjectDashboard";
import { playSound } from "../utils/audio";
import FormatoShape from "./FormatoShape";
import {
  FORMATOS_ESTANDAR,
  FORMATOS_CUSTOM,
  getFormato,
  addCustomFormato,
  ProporcionFormat,
  TipoMedioFormat,
} from "../utils/formatos";

import { getDarkProjectPillVars } from "@/lib/utils";

import StatusSelectorDropdown from "./StatusSelectorDropdown";
import FormatSelectorDropdown from "./FormatSelectorDropdown";
import PillPortalDropdown from "./PillPortalDropdown";

export interface TaskCardPopoversProps {
  taskId: string;
  projectId: string | number;
  project?: any;
  task: Task;
  availableFormats: string[];
  activeStatusDropdownCardId: string | null;
  setActiveStatusDropdownCardId: React.Dispatch<React.SetStateAction<string | null>>;
  activeFormatDropdownCardId: string | null;
  setActiveFormatDropdownCardId: React.Dispatch<React.SetStateAction<string | null>>;
  activeTimeDropdownCardId: string | null;
  setActiveTimeDropdownCardId: React.Dispatch<React.SetStateAction<string | null>>;
  hoveredStatusOptionCard: { taskId: string; status: string } | null;
  setHoveredStatusOptionCard: React.Dispatch<React.SetStateAction<{ taskId: string; status: string } | null>>;
  hoveredFormatOptionCard: { taskId: string; format: string } | null;
  setHoveredFormatOptionCard: React.Dispatch<React.SetStateAction<{ taskId: string; format: string } | null>>;
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
  isNightMode: boolean;
  type: "status-format" | "tiempo";
  isInteractive?: boolean;
  panelBgClass?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// TaskCardPopovers — main exported component
// ─────────────────────────────────────────────────────────────────────────────
export const TaskCardPopovers: React.FC<TaskCardPopoversProps> = ({
  taskId,
  projectId,
  project,
  task,
  availableFormats,
  activeStatusDropdownCardId,
  setActiveStatusDropdownCardId,
  activeFormatDropdownCardId,
  setActiveFormatDropdownCardId,
  activeTimeDropdownCardId,
  setActiveTimeDropdownCardId,
  hoveredStatusOptionCard,
  setHoveredStatusOptionCard,
  hoveredFormatOptionCard,
  setHoveredFormatOptionCard,
  getStatusPillConfig,
  getFormatPillConfig,
  updateTaskProperty,
  isNightMode,
  type,
  isInteractive = true,
  panelBgClass = 'bg-[#0a0a0c]',
}) => {
  const [isAddingCustomTime, setIsAddingCustomTime] = useState(false);
  const [customTimeValue, setCustomTimeValue] = useState("");

  const pillVars = getDarkProjectPillVars(project || { id: projectId });

  // ── Tiempo popover via portal ──
  if (type === "tiempo") {
    const isTimeOpen = activeTimeDropdownCardId === taskId;
    const currentTime = task.time || "Tiempo";
    const defaultTimeOpts = ["15 min", "30 min", "1 hora", "2 horas", "3 horas o más"];
    const timeOptionsToRender = [
      ...(task.time ? [task.time] : []),
      ...defaultTimeOpts.filter(t => t.toLowerCase() !== (task.time || "").toLowerCase())
    ];

    return (
      <PillPortalDropdown
        isOpen={isTimeOpen}
        isInteractive={isInteractive}
        isDimmed={false}
        pillLabel={currentTime}
        pillClassName={`w-full flex items-center justify-center gap-1.5 h-5.5 px-2.5 rounded-full ${pillVars.className} text-[12px] font-bold transition-all duration-150 select-none cursor-pointer capitalize`}
        pillStyle={pillVars.style}
        panelBgClass={panelBgClass}
        onToggle={(e) => {
          e.stopPropagation();
          setActiveTimeDropdownCardId(prev => prev === taskId ? null : taskId);
          setActiveStatusDropdownCardId(null);
          setActiveFormatDropdownCardId(null);
          setIsAddingCustomTime(false);
        }}
        onClose={() => {
          setActiveTimeDropdownCardId(null);
          setIsAddingCustomTime(false);
        }}
      >
        <div className="max-h-48 overflow-y-auto hide-scrollbar flex flex-col gap-1">
          {timeOptionsToRender.map((tOpt, i) => {
            const isSelected = (task.time || "").toLowerCase() === tOpt.toLowerCase();
            return (
              <motion.button
                key={tOpt}
                type="button"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => {
                  e.stopPropagation();
                  updateTaskProperty(projectId, task.id, "time", tOpt);
                  setActiveTimeDropdownCardId(null);
                }}
                className={`w-full flex items-center justify-center gap-1.5 h-5.5 px-2.5 rounded-full text-[12px] font-bold transition-colors duration-150 select-none cursor-pointer border-none capitalize ${
                  isSelected
                    ? "bg-[var(--pill-bg)] text-[var(--pill-color)] border border-[var(--pill-border)]"
                    : isNightMode ? "text-slate-400 hover:text-slate-200 hover:bg-white/5" : "text-slate-600 hover:text-slate-900 hover:bg-black/5"
                }`}
              >
                <span className="truncate">{tOpt}</span>
              </motion.button>
            );
          })}

          <div className="border-t border-white/10 my-0.5" />

          {isAddingCustomTime ? (
            <div className="px-2 py-1 flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <input
                type="text"
                autoFocus
                value={customTimeValue}
                onChange={(e) => setCustomTimeValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customTimeValue.trim()) {
                    e.stopPropagation();
                    updateTaskProperty(projectId, task.id, "time", customTimeValue.trim());
                    setCustomTimeValue("");
                    setIsAddingCustomTime(false);
                    setActiveTimeDropdownCardId(null);
                  } else if (e.key === "Escape") {
                    setIsAddingCustomTime(false);
                  }
                }}
                placeholder="Ej. 45 min..."
                className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-sky-400 w-full"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setIsAddingCustomTime(true); }}
              className="w-full flex items-center justify-center gap-1 h-5.5 px-2 text-[11px] font-bold text-sky-400 hover:bg-sky-500/10 rounded-full transition-colors select-none cursor-pointer border-none"
            >
              <Plus className="w-3 h-3" />
              <span>Personalizar</span>
            </button>
          )}
        </div>
      </PillPortalDropdown>
    );
  }

  // ── Status + Format pills via portal ──
  const isStatusOpen = activeStatusDropdownCardId === taskId;
  const isFormatOpen = activeFormatDropdownCardId === taskId;

  const pillBase = "w-full flex items-center justify-center gap-1.5 h-5.5 px-2.5 rounded-full text-[12px] font-bold transition-all duration-150 select-none cursor-pointer";

  return (
    <div className="flex items-center gap-2 w-full" data-dropdown-container>
      {/* ── Status ── */}
      <StatusSelectorDropdown
        isOpen={isStatusOpen}
        isInteractive={isInteractive}
        isDimmed={isFormatOpen}
        pillLabel={task.status}
        pillClassName={`${pillBase} ${pillVars.className}`}
        pillStyle={pillVars.style}
        panelBgClass={panelBgClass}
        task={task}
        projectId={projectId}
        hoveredStatusOptionCard={hoveredStatusOptionCard}
        setHoveredStatusOptionCard={setHoveredStatusOptionCard}
        getStatusPillConfig={getStatusPillConfig}
        updateTaskProperty={updateTaskProperty}
        isNightMode={isNightMode}
        onToggle={(e) => {
          e.stopPropagation();
          setActiveStatusDropdownCardId(prev => prev === taskId ? null : taskId);
          setActiveFormatDropdownCardId(null);
        }}
        onClose={() => setActiveStatusDropdownCardId(null)}
      />

      {/* ── Format ── */}
      <FormatSelectorDropdown
        isOpen={isFormatOpen}
        isInteractive={isInteractive}
        isDimmed={isStatusOpen}
        pillLabel={task.format || "Formato"}
        pillClassName={`${pillBase} capitalize ${pillVars.className}`}
        pillStyle={pillVars.style}
        panelBgClass={panelBgClass}
        task={task}
        projectId={projectId}
        updateTaskProperty={updateTaskProperty}
        onToggle={(e) => {
          e.stopPropagation();
          setActiveFormatDropdownCardId(prev => prev === taskId ? null : taskId);
          setActiveStatusDropdownCardId(null);
        }}
        onClose={() => setActiveFormatDropdownCardId(null)}
      />
    </div>
  );
};

export interface TaskCardMenuPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onOpenTask?: () => void;
  onOpenProject?: () => void;
  onChangeProjectColor?: () => void;
  onAddTaskToProject?: () => void;
  onCustomizeCardColor?: () => void;
  onDeleteTask?: () => void;
}

export const TaskCardMenuPopover: React.FC<TaskCardMenuPopoverProps> = ({
  isOpen,
  onClose,
  triggerRef,
  onOpenTask,
  onOpenProject,
  onChangeProjectColor,
  onAddTaskToProject,
  onCustomizeCardColor,
  onDeleteTask,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuWidth = 145;
      let left = rect.right - menuWidth;
      if (left < 10) left = 10;
      if (left + menuWidth > window.innerWidth - 10) {
        left = Math.max(10, window.innerWidth - menuWidth - 10);
      }
      let top = rect.bottom + 4;
      if (top + 200 > window.innerHeight - 10) {
        top = Math.max(10, rect.top - 200);
      }
      setPos({ top, left });
    }
  }, [isOpen, triggerRef]);

  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = () => onClose();
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      onClose();
    };

    window.addEventListener("scroll", handleScroll, true);
    const t = setTimeout(() => document.addEventListener("mousedown", handleOutside, true), 60);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      document.removeEventListener("mousedown", handleOutside, true);
      clearTimeout(t);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen || !pos || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      data-dropdown-container="true"
      data-fpl-component=""
      data-fullscreen-prevent-event-capture="true"
      data-fullscreen-prevent-event-capture-keys="true"
      data-fullscreen-wheel-event-capture="true"
      className="menu-primitive__container__5lt-5 menu__container__ZmSkT menu__dark__crKxV menu__allowsIndent__1tnRp figma-card-menu animate-fadeIn"
      data-is-positioned="true"
      data-floating-ui-focusable=""
      data-fpl-menu-container="true"
      style={{
        position: "fixed",
        left: `${pos.left}px`,
        top: `${pos.top}px`,
        maxWidth: "145px",
        maxHeight: "625.781px",
        zIndex: 99999,
      }}
    >
      <div data-editor-theme="design" data-preferred-theme="dark" style={{ display: "contents" }}>
        <ul
          data-fpl-component="primitive"
          className="menu-primitive__list__i3VRn"
          tabIndex={-1}
          data-floating-ui-focusable=""
          role="menu"
          aria-orientation="vertical"
        >
          {/* Task Actions */}
          <ul data-fpl-component="" role="group" className="menu__group__KwU4I">
            {/* 0. Abrir / Editar tarea */}
            <li
              data-fpl-component=""
              role="menuitem"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                playSound("click");
                onOpenTask?.();
                onClose();
              }}
              className="menu__item__Tl2MO menu__selectItem__I9GzL font-bold"
            >
              <span className="menu__itemText__qcxtq menu__selectItemText__m9o3C">
                <span>Editar tarea</span>
              </span>
            </li>
          </ul>

          {/* Project Actions */}
          <ul data-fpl-component="" role="group" className="menu__group__KwU4I">
            {/* 1. Abrir proyecto */}
            <li
              data-fpl-component=""
              role="menuitem"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                playSound("click");
                onOpenProject?.();
                onClose();
              }}
              className="menu__item__Tl2MO menu__selectItem__I9GzL"
            >
              <span className="menu__itemText__qcxtq menu__selectItemText__m9o3C">
                <span>Abrir proyecto</span>
              </span>
            </li>

            {/* 2. Color de proyecto */}
            <li
              data-fpl-component=""
              role="menuitem"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                playSound("click");
                onChangeProjectColor?.();
                onClose();
              }}
              className="menu__item__Tl2MO menu__selectItem__I9GzL"
            >
              <span className="menu__itemText__qcxtq menu__selectItemText__m9o3C">
                <span>Color de proyecto</span>
              </span>
            </li>

            {/* 3. Nueva tarea */}
            <li
              data-fpl-component=""
              role="menuitem"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                playSound("click");
                onAddTaskToProject?.();
                onClose();
              }}
              className="menu__item__Tl2MO menu__selectItem__I9GzL"
            >
              <span className="menu__itemText__qcxtq menu__selectItemText__m9o3C">
                <span>Nueva tarea</span>
              </span>
            </li>
          </ul>

          {/* Task Actions */}
          <ul data-fpl-component="" role="group" className="menu__group__KwU4I">
            {/* 4. Eliminar tarea */}
            <li
              data-fpl-component=""
              role="menuitem"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                playSound("click");
                onDeleteTask?.();
                onClose();
              }}
              className="menu__item__Tl2MO menu__selectItem__I9GzL hover:!bg-rose-500/20 hover:!text-rose-300"
            >
              <span className="menu__itemText__qcxtq menu__selectItemText__m9o3C text-rose-400">
                <span>Eliminar tarea</span>
              </span>
            </li>
          </ul>
        </ul>
      </div>
    </div>,
    document.body
  );
};

export default TaskCardPopovers;
