"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, RotateCw, Check, ArrowRight } from "lucide-react";
import { playSound } from "../utils/audio";

import LinearCalendarModal from "./LinearCalendarModal";

interface LinearDatePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: string;
  deadline: string;
  onSelectDates: (startDate: string, deadline: string) => void;
}

export default function LinearDatePopover({
  isOpen,
  onClose,
  startDate,
  deadline,
  onSelectDates
}: LinearDatePopoverProps) {
  const [localStart, setLocalStart] = useState(startDate);
  const [localEnd, setLocalEnd] = useState(deadline);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setLocalStart(startDate);
      setLocalEnd(deadline);
    }
  }, [isOpen, startDate, deadline]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        if (!isCalendarModalOpen) {
          onClose();
        }
      }
    }
    if (isOpen && !isCalendarModalOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, isCalendarModalOpen, onClose]);

  const formatDateStr = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const applyPreset = (daysFromToday: number) => {
    playSound("click");
    const today = new Date();
    const target = new Date();
    target.setDate(today.getDate() + daysFromToday);
    const startStr = formatDateStr(today);
    const endStr = formatDateStr(target);
    onSelectDates(startStr, endStr);
    onClose();
  };

  const handleApplyCustom = () => {
    playSound("click");
    onSelectDates(localStart, localEnd);
    onClose();
  };

  if (!isOpen && !isCalendarModalOpen) return null;

  return (
    <>
      {isOpen && (
        <AnimatePresence>
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="absolute z-[600] mt-1.5 min-w-[220px] w-64 bg-[#18181c] border border-[#2b2b32] shadow-2xl rounded-xl overflow-hidden text-xs text-[#f4f4f5] select-none left-0"
          >
            {/* Quick Date Presets */}
            <div className="p-1 space-y-0.5">
              <div
                onClick={() => applyPreset(0)}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-[#a1a1aa] hover:text-white hover:bg-[#24242c]"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-white" />
                  <span className="font-medium text-xs">Hoy</span>
                </div>
                <kbd className="px-1 py-0.2 rounded text-[9px] font-mono text-[#686873] bg-[#222226]">1</kbd>
              </div>

              <div
                onClick={() => applyPreset(1)}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-[#a1a1aa] hover:text-white hover:bg-[#24242c]"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-white" />
                  <span className="font-medium text-xs">Mañana</span>
                </div>
                <kbd className="px-1 py-0.2 rounded text-[9px] font-mono text-[#686873] bg-[#222226]">2</kbd>
              </div>

              <div
                onClick={() => applyPreset(7)}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-[#a1a1aa] hover:text-white hover:bg-[#24242c]"
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-white" />
                  <span className="font-medium text-xs">En 1 semana</span>
                </div>
                <kbd className="px-1 py-0.2 rounded text-[9px] font-mono text-[#686873] bg-[#222226]">3</kbd>
              </div>

              <div
                onClick={() => applyPreset(14)}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-[#a1a1aa] hover:text-white hover:bg-[#24242c]"
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-white" />
                  <span className="font-medium text-xs">En 2 semanas</span>
                </div>
                <kbd className="px-1 py-0.2 rounded text-[9px] font-mono text-[#686873] bg-[#222226]">4</kbd>
              </div>

              <div
                onClick={() => applyPreset(30)}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-[#a1a1aa] hover:text-white hover:bg-[#24242c]"
              >
                <div className="flex items-center gap-2">
                  <RotateCw className="w-3.5 h-3.5 text-white" />
                  <span className="font-medium text-xs">En 1 mes</span>
                </div>
                <kbd className="px-1 py-0.2 rounded text-[9px] font-mono text-[#686873] bg-[#222226]">5</kbd>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-[#24242a] my-1" />

            {/* Interactive Calendar Trigger Option */}
            <div className="p-1 bg-[#141416]">
              <button
                type="button"
                onClick={() => {
                  playSound("click");
                  setIsCalendarModalOpen(true);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white hover:bg-[#20202e] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-white" />
                  <span>Calendario interactivo…</span>
                </div>
                <kbd className="px-1 py-0.2 rounded text-[9px] font-mono text-[#71717a] bg-[#222226]">⌘D</kbd>
              </button>
            </div>

            {/* Divider */}
            <div className="border-t border-[#24242a] my-1" />

            {/* Custom Range Picker Form */}
            <div className="p-2.5 space-y-2 bg-[#141416]">
              <span className="text-[10px] font-semibold tracking-wide uppercase text-[#71717a]">
                Rango de fechas
              </span>

              <div className="space-y-1.5">
                <div>
                  <label className="text-[10px] text-[#a1a1aa] block mb-0.5">Fecha inicio</label>
                  <input
                    type="date"
                    value={localStart}
                    onChange={(e) => setLocalStart(e.target.value)}
                    className="w-full bg-[#18181c] border border-[#2b2b32] rounded-md px-2 py-1 text-xs text-[#f4f4f5] outline-none focus:border-[#5e6ad2]"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#a1a1aa] block mb-0.5">Fecha entrega (Due Date)</label>
                  <input
                    type="date"
                    value={localEnd}
                    onChange={(e) => setLocalEnd(e.target.value)}
                    className="w-full bg-[#18181c] border border-[#2b2b32] rounded-md px-2 py-1 text-xs text-[#f4f4f5] outline-none focus:border-[#5e6ad2]"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleApplyCustom}
                className="w-full mt-1.5 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-[#5e6ad2] hover:bg-[#4b55c4] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Aplicar fechas</span>
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Set Due Date Interactive Calendar Modal Dialog */}
      <LinearCalendarModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        startDate={startDate}
        deadline={deadline}
        onSaveDates={(start, end) => {
          onSelectDates(start, end);
          setIsCalendarModalOpen(false);
          onClose();
        }}
      />
    </>
  );
}
