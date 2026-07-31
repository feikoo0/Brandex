"use client";

import React, { useState, useEffect, useCallback } from "react";

export function useTaskCardInteractions() {
  const [activeStatusDropdownCardId, setActiveStatusDropdownCardId] = useState<string | null>(null);
  const [activeFormatDropdownCardId, setActiveFormatDropdownCardId] = useState<string | null>(null);
  const [activeTimeDropdownCardId, setActiveTimeDropdownCardId] = useState<string | null>(null);
  const [activeColorSelectorCardId, setActiveColorSelectorCardId] = useState<string | null>(null);
  const [activeCardMenuId, setActiveCardMenuId] = useState<string | null>(null);

  const [editingTaskField, setEditingTaskField] = useState<{ taskId: string; field: "title" | "desc" } | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const [hoveredStatusOptionCard, setHoveredStatusOptionCard] = useState<{ taskId: string; status: string } | null>(null);
  const [hoveredFormatOptionCard, setHoveredFormatOptionCard] = useState<{ taskId: string; format: string } | null>(null);

  const [isAddingNewFormat, setIsAddingNewFormat] = useState<boolean>(false);
  const [newFormatValue, setNewFormatValue] = useState<string>("");
  const [isAddingCustomTime, setIsAddingCustomTime] = useState<boolean>(false);
  const [customTimeValue, setCustomTimeValue] = useState<string>("");

  const closeAllPopovers = useCallback(() => {
    setActiveStatusDropdownCardId(null);
    setActiveFormatDropdownCardId(null);
    setActiveTimeDropdownCardId(null);
    setActiveColorSelectorCardId(null);
    setActiveCardMenuId(null);
    setIsAddingNewFormat(false);
    setIsAddingCustomTime(false);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        activeStatusDropdownCardId !== null ||
        activeFormatDropdownCardId !== null ||
        activeTimeDropdownCardId !== null ||
        activeColorSelectorCardId !== null ||
        activeCardMenuId !== null
      ) {
        if (
          !target.closest("[data-dropdown-container]") &&
          !target.closest(".pill-portal-panel") &&
          !target.closest(".task-card-menu-popover")
        ) {
          closeAllPopovers();
        }
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [
    activeStatusDropdownCardId,
    activeFormatDropdownCardId,
    activeTimeDropdownCardId,
    activeColorSelectorCardId,
    activeCardMenuId,
    closeAllPopovers,
  ]);

  const getStatusPillConfig = useCallback((st: string) => {
    switch (st) {
      case "Completado":
        return {
          activeBgClass: "bg-[#10b981] border-none",
          hoverBgClass: "bg-[#34d399] border-none",
          textActiveColor: "text-emerald-100 font-bold",
          textHoverColor: "text-emerald-50 font-bold",
          dotClass: "bg-emerald-100",
        };
      case "En Proceso":
        return {
          activeBgClass: "bg-[#f59e0b] border-none",
          hoverBgClass: "bg-[#fbbf24] border-none",
          textActiveColor: "text-amber-100 font-bold",
          textHoverColor: "text-amber-50 font-bold",
          dotClass: "bg-amber-100",
        };
      case "En Revisión":
      case "Revisión":
        return {
          activeBgClass: "bg-[#8b5cf6] border-none",
          hoverBgClass: "bg-[#a78bfa] border-none",
          textActiveColor: "text-purple-100 font-bold",
          textHoverColor: "text-purple-50 font-bold",
          dotClass: "bg-purple-100",
        };
      case "Planificado":
      case "Pendiente":
      default:
        return {
          activeBgClass: "bg-slate-600 border-none",
          hoverBgClass: "bg-slate-500 border-none",
          textActiveColor: "text-slate-100 font-bold",
          textHoverColor: "text-slate-50 font-bold",
          dotClass: "bg-slate-100",
        };
    }
  }, []);

  const getFormatPillConfig = useCallback((fmt: string, index: number) => {
    const colors = [
      { active: "bg-indigo-500", hover: "bg-indigo-400", text: "text-indigo-100", dot: "bg-indigo-100" },
      { active: "bg-violet-500", hover: "bg-violet-400", text: "text-violet-100", dot: "bg-violet-100" },
      { active: "bg-teal-500", hover: "bg-teal-400", text: "text-teal-100", dot: "bg-teal-100" },
      { active: "bg-sky-500", hover: "bg-sky-400", text: "text-sky-100", dot: "bg-sky-100" },
      { active: "bg-pink-500", hover: "bg-pink-400", text: "text-pink-100", dot: "bg-pink-100" },
    ];
    const c = colors[Math.abs(index) % colors.length];
    return {
      activeBgClass: `${c.active} border-none`,
      hoverBgClass: `${c.hover} border-none`,
      textActiveColor: `${c.text} font-bold`,
      textHoverColor: `${c.text} font-bold`,
      dotClass: c.dot,
    };
  }, []);

  return {
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
    editingTaskField,
    setEditingTaskField,
    editingValue,
    setEditingValue,
    expandedCardId,
    setExpandedCardId,
    hoveredStatusOptionCard,
    setHoveredStatusOptionCard,
    hoveredFormatOptionCard,
    setHoveredFormatOptionCard,
    isAddingNewFormat,
    setIsAddingNewFormat,
    newFormatValue,
    setNewFormatValue,
    isAddingCustomTime,
    setIsAddingCustomTime,
    customTimeValue,
    setCustomTimeValue,
    closeAllPopovers,
    getStatusPillConfig,
    getFormatPillConfig,
  };
}
