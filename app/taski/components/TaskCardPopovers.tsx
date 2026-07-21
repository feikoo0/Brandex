"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus } from "lucide-react";
import { Task } from "./ProjectDashboard";

export interface TaskCardPopoversProps {
  taskId: string;
  projectId: string | number;
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
  updateTaskProperty: (projectId: string | number, taskId: string, property: string, value: any) => void;
  isNightMode: boolean;
  type: "status-format" | "tiempo";
  panelBgClass?: string;
}

const STATUS_OPTIONS = ["Planificado", "En Proceso", "En Revisión", "Completado"] as const;

// ─────────────────────────────────────────────────────────────────────────────
// PillPortalDropdown — renders its panel at document.body via createPortal.
// The trigger pill stays in-place; the floating panel never affects card layout.
// ─────────────────────────────────────────────────────────────────────────────
interface PillPortalProps {
  isOpen: boolean;
  onToggle: (e: React.MouseEvent) => void;
  onClose: () => void;
  pillClassName: string;
  pillLabel: string;
  isDimmed: boolean;
  panelBgClass: string;
  children: React.ReactNode;
}

const PillPortalDropdown: React.FC<PillPortalProps> = ({
  isOpen,
  onToggle,
  onClose,
  pillClassName,
  pillLabel,
  isDimmed,
  panelBgClass,
  children,
}) => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [portalMounted, setPortalMounted] = useState(false);

  // Open: measure trigger position and mount portal
  // Panel wraps around the trigger pill — starts at trigger top with padding
  const PANEL_PAD = 3; // px of breathing room around pills
  useEffect(() => {
    if (isOpen) {
      setPortalMounted(true);
      if (triggerRef.current) {
        // Measure the parent flex-1 wrapper for true alignment (button is w-full inside it)
        const el = triggerRef.current.parentElement ?? triggerRef.current;
        const rect = el.getBoundingClientRect();
        setPanelPos({
          top: rect.top - PANEL_PAD,
          left: rect.left - PANEL_PAD,
          width: rect.width + PANEL_PAD * 2,
        });
      }
    }
  }, [isOpen]);

  // While open: close on outside click or scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = () => onClose();
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      onClose();
    };

    window.addEventListener("scroll", handleScroll, true);
    // Small delay so the opening click doesn't immediately close
    const t = setTimeout(() => document.addEventListener("mousedown", handleOutside, true), 60);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      document.removeEventListener("mousedown", handleOutside, true);
      clearTimeout(t);
    };
  }, [isOpen, onClose]);

  return (
    <div className="relative flex-1">
      {/* Trigger pill — always visible; panel renders on top and covers it */}
      <button
        ref={triggerRef}
        type="button"
        onClick={onToggle}
        className={`${pillClassName} ${
          isDimmed ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        <span className="truncate">{pillLabel}</span>
      </button>

      {/* Panel rendered at document.body — zero layout impact on the card */}
      {portalMounted && panelPos && typeof document !== "undefined" && createPortal(
        <AnimatePresence onExitComplete={() => { setPortalMounted(false); setPanelPos(null); }}>
          {isOpen && (
            <motion.div
              ref={panelRef}
              key="pill-panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.08, ease: "easeOut" }}
              style={{
                position: "fixed",
                top: panelPos.top,
                left: panelPos.left,
                width: panelPos.width,
                zIndex: 99999,
              }}
              className={`${panelBgClass} rounded-2xl p-1.5 flex flex-col gap-1`}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TaskCardPopovers — main exported component
// ─────────────────────────────────────────────────────────────────────────────
export const TaskCardPopovers: React.FC<TaskCardPopoversProps> = ({
  taskId,
  projectId,
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
  panelBgClass = 'bg-[#0a0a0c]',
}) => {
  const [isAddingCustomTime, setIsAddingCustomTime] = useState(false);
  const [customTimeValue, setCustomTimeValue] = useState("");

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
        isDimmed={false}
        pillLabel={currentTime}
        pillClassName="w-full flex items-center justify-center gap-1.5 h-5.5 px-2.5 rounded-full border border-sky-400/20 bg-sky-500/15 text-sky-100 hover:bg-sky-500/25 text-[12px] font-bold transition-all duration-150 select-none cursor-pointer capitalize"
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
                    ? "bg-sky-500/30 text-sky-200"
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

  const currentStatusCfg = getStatusPillConfig(task.status);
  const currentFmtIdx = availableFormats.findIndex(f => f.toLowerCase() === (task.format || "").toLowerCase());
  const currentFmtCfg = getFormatPillConfig(task.format || "Formato", currentFmtIdx >= 0 ? currentFmtIdx : 0);

  const pillBase = "w-full flex items-center justify-center gap-1.5 h-5.5 px-2.5 rounded-full border-none text-[12px] font-bold transition-all duration-150 select-none cursor-pointer";

  return (
    <div className="flex items-center gap-2 w-full" data-dropdown-container>

      {/* ── Status ── */}
      <PillPortalDropdown
        isOpen={isStatusOpen}
        isDimmed={isFormatOpen}
        pillLabel={task.status}
        pillClassName={`${pillBase} ${currentStatusCfg.activeBgClass} ${currentStatusCfg.textActiveColor}`}
        panelBgClass={panelBgClass}
        onToggle={(e) => {
          e.stopPropagation();
          setActiveStatusDropdownCardId(prev => prev === taskId ? null : taskId);
          setActiveFormatDropdownCardId(null);
        }}
        onClose={() => setActiveStatusDropdownCardId(null)}
      >
        {/* Selected option always first, others below */}
        {[task.status, ...STATUS_OPTIONS.filter(s => s !== task.status)].map((st, i) => {
          const isSelected = task.status === st;
          const isHov = hoveredStatusOptionCard?.taskId === taskId && hoveredStatusOptionCard?.status === st;
          const cfg = getStatusPillConfig(st);
          return (
            <motion.button
              key={st}
              type="button"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, delay: i * 0.055, ease: [0.16, 1, 0.3, 1] }}
              onHoverStart={() => setHoveredStatusOptionCard({ taskId, status: st })}
              onHoverEnd={() => setHoveredStatusOptionCard(null)}
              onClick={(e) => {
                e.stopPropagation();
                updateTaskProperty(projectId, task.id, "status", st);
                setActiveStatusDropdownCardId(null);
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
      </PillPortalDropdown>

      {/* ── Format ── */}
      <PillPortalDropdown
        isOpen={isFormatOpen}
        isDimmed={isStatusOpen}
        pillLabel={task.format || "Formato"}
        pillClassName={`${pillBase} capitalize ${currentFmtCfg.activeBgClass} ${currentFmtCfg.textActiveColor}`}
        panelBgClass={panelBgClass}
        onToggle={(e) => {
          e.stopPropagation();
          setActiveFormatDropdownCardId(prev => prev === taskId ? null : taskId);
          setActiveStatusDropdownCardId(null);
        }}
        onClose={() => setActiveFormatDropdownCardId(null)}
      >
        {/* Selected format first, others below */}
        <div className="max-h-48 overflow-y-auto hide-scrollbar flex flex-col gap-1">
          {[
            task.format || availableFormats[0],
            ...availableFormats.filter(f => f.toLowerCase() !== (task.format || "").toLowerCase()),
          ].map((fmt, idx) => {
            const isSelected = (task.format || "").toLowerCase() === fmt.toLowerCase();
            const isHov = hoveredFormatOptionCard?.taskId === taskId && hoveredFormatOptionCard?.format === fmt;
            const origIdx = availableFormats.findIndex(f => f.toLowerCase() === fmt.toLowerCase());
            const cfg = getFormatPillConfig(fmt, origIdx >= 0 ? origIdx : idx);
            return (
              <motion.button
                key={fmt}
                type="button"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, delay: idx * 0.055, ease: [0.16, 1, 0.3, 1] }}
                onHoverStart={() => setHoveredFormatOptionCard({ taskId, format: fmt })}
                onHoverEnd={() => setHoveredFormatOptionCard(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  updateTaskProperty(projectId, task.id, "format", fmt);
                  setActiveFormatDropdownCardId(null);
                }}
                className={`${pillBase} capitalize ${
                  isSelected
                    ? `${cfg.activeBgClass} ${cfg.textActiveColor}`
                    : isHov
                    ? `${cfg.hoverBgClass} ${cfg.textHoverColor}`
                    : isNightMode ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span className="truncate">{fmt}</span>
              </motion.button>
            );
          })}
        </div>
      </PillPortalDropdown>

    </div>
  );
};

export default TaskCardPopovers;
