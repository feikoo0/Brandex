"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

export interface PillPortalProps {
  isOpen: boolean;
  isInteractive?: boolean;
  onToggle: (e: React.MouseEvent) => void;
  onClose: () => void;
  pillClassName: string;
  pillStyle?: React.CSSProperties;
  pillLabel: string;
  isDimmed?: boolean;
  panelBgClass?: string;
  children: React.ReactNode;
}

export const PillPortalDropdown: React.FC<PillPortalProps> = ({
  isOpen,
  isInteractive = true,
  onToggle,
  onClose,
  pillClassName,
  pillStyle,
  pillLabel,
  isDimmed = false,
  panelBgClass = "bg-[#0a0a0c]",
  children,
}) => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [portalMounted, setPortalMounted] = useState(false);

  const PANEL_PAD = 3; // px breathing room around pills

  useEffect(() => {
    if (isOpen && isInteractive) {
      setPortalMounted(true);
      if (triggerRef.current) {
        const el = triggerRef.current.parentElement ?? triggerRef.current;
        const rect = el.getBoundingClientRect();
        setPanelPos({
          top: rect.top - PANEL_PAD,
          left: rect.left - PANEL_PAD,
          width: rect.width + PANEL_PAD * 2,
        });
      }
    }
  }, [isOpen, isInteractive]);

  useEffect(() => {
    if (!isOpen || !isInteractive) return;

    // Filter scroll events so scrolling inside the popover doesn't trigger onClose()
    const handleScroll = (e: Event) => {
      const target = e.target as Node | null;
      if (panelRef.current && target && panelRef.current.contains(target)) {
        return;
      }
      onClose();
    };

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
  }, [isOpen, isInteractive, onClose]);

  // Compute width and screen bounds so panel covers all content cleanly without overflow
  const popoverWidth = panelPos ? Math.max(panelPos.width, 270) : 270;
  const computedLeft = panelPos && typeof window !== "undefined"
    ? Math.min(Math.max(10, panelPos.left), window.innerWidth - popoverWidth - 10)
    : (panelPos?.left ?? 0);

  return (
    <div className="relative flex-1">
      {/* Trigger pill */}
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          if (!isInteractive) {
            e.stopPropagation();
            return;
          }
          onToggle(e);
        }}
        disabled={!isInteractive}
        style={pillStyle}
        className={`${pillClassName} ${
          !isInteractive
            ? "cursor-default pointer-events-none"
            : isDimmed
            ? "opacity-50 pointer-events-none"
            : ""
        }`}
      >
        <span className="truncate">{pillLabel}</span>
      </button>

      {/* Floating Panel on document.body */}
      {portalMounted && panelPos && isInteractive && typeof document !== "undefined" && createPortal(
        <AnimatePresence onExitComplete={() => { setPortalMounted(false); setPanelPos(null); }}>
          {isOpen && (
            <motion.div
              ref={panelRef}
              key="pill-panel"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.1, ease: "easeOut" }}
              style={{
                position: "fixed",
                top: panelPos.top,
                left: computedLeft,
                width: popoverWidth,
                zIndex: 999999, // Floating on top of all cards & modals
              }}
              data-dropdown-container="true"
              className={`${panelBgClass} rounded-2xl p-2.5 flex flex-col gap-1 pill-portal-panel shadow-[0_25px_60px_rgba(0,0,0,0.9)] border border-white/20 backdrop-blur-2xl box-border overflow-hidden`}
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

export default PillPortalDropdown;
