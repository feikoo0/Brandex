"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { playSound } from "../utils/audio";

interface LinearCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: string; // YYYY-MM-DD
  deadline: string;  // YYYY-MM-DD
  onSaveDates: (startDate: string, deadline: string) => void;
}

export default function LinearCalendarModal({
  isOpen,
  onClose,
  startDate,
  deadline,
  onSaveDates
}: LinearCalendarModalProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedStart, setSelectedStart] = useState<Date | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<Date | null>(null);

  const parseISO = (str: string) => {
    if (!str) return null;
    const parts = str.split("-");
    if (parts.length !== 3) return null;
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  };

  const formatISO = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const formatPretty = (d: Date | null) => {
    if (!d) return "";
    return d.toLocaleDateString("es-MX", { month: "short", day: "numeric", year: "numeric" });
  };

  useEffect(() => {
    if (isOpen) {
      const s = parseISO(startDate) || new Date();
      const e = parseISO(deadline) || new Date(s.getTime() + 14 * 86400000);
      setSelectedStart(s);
      setSelectedEnd(e);
      setCurrentDate(new Date(s.getFullYear(), s.getMonth(), 1));
    }
  }, [isOpen, startDate, deadline]);

  const handleSave = () => {
    playSound("click");
    const sStr = selectedStart ? formatISO(selectedStart) : startDate;
    const eStr = selectedEnd ? formatISO(selectedEnd) : (selectedStart ? formatISO(selectedStart) : deadline);
    onSaveDates(sStr, eStr);
    onClose();
  };

  const nextMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);

  const handlePrevMonth = () => {
    playSound("click");
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    playSound("click");
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleDayClick = (dayDate: Date) => {
    playSound("click");
    if (!selectedStart || (selectedStart && selectedEnd)) {
      setSelectedStart(dayDate);
      setSelectedEnd(null);
    } else if (selectedStart && !selectedEnd) {
      if (dayDate.getTime() < selectedStart.getTime()) {
        setSelectedStart(dayDate);
        setSelectedEnd(null);
      } else {
        setSelectedEnd(dayDate);
      }
    }
  };

  const renderMonthGrid = (year: number, month: number, isRightMonth = false) => {
    const monthDate = new Date(year, month, 1);
    const monthName = monthDate.toLocaleDateString("es-MX", { month: "long", year: "numeric" });

    const firstDayIndex = (monthDate.getDay() + 6) % 7; // Monday = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return (
      <div className="flex-1 space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold capitalize text-[#f4f4f5]">{monthName}</span>
          <div className="flex items-center gap-1">
            {!isRightMonth && (
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded text-[#a1a1aa] hover:text-white hover:bg-[#24242c] transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}
            {isRightMonth && (
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded text-[#a1a1aa] hover:text-white hover:bg-[#24242c] transition-colors cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {["L", "M", "M", "J", "V", "S", "D"].map((d, idx) => (
            <span key={idx} className="text-[10px] font-bold text-[#71717a] py-1">
              {d}
            </span>
          ))}

          {days.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="h-7" />;
            }

            const dayDate = new Date(year, month, day);
            const isStart = selectedStart && dayDate.toDateString() === selectedStart.toDateString();
            const isEnd = selectedEnd && dayDate.toDateString() === selectedEnd.toDateString();
            const isInRange =
              selectedStart &&
              selectedEnd &&
              dayDate.getTime() > selectedStart.getTime() &&
              dayDate.getTime() < selectedEnd.getTime();
            const isToday = dayDate.toDateString() === new Date().toDateString();

            let bgClass = "hover:bg-[#27272a] text-[#f4f4f5]";
            if (isStart || isEnd) {
              bgClass = "bg-[#5e6ad2] text-white font-bold shadow-sm shadow-[#5e6ad2]/30";
            } else if (isInRange) {
              bgClass = "bg-[#5e6ad2]/20 text-[#a5b4fc]";
            }

            return (
              <button
                key={`day-${day}`}
                type="button"
                onClick={() => handleDayClick(dayDate)}
                className={`h-7 text-xs rounded-md flex items-center justify-center transition-colors cursor-pointer relative ${bgClass}`}
              >
                <span>{day}</span>
                {isToday && !isStart && !isEnd && (
                  <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-[#5e6ad2]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="linear-calendar-backdrop-wrap"
          className="fixed inset-0 z-[700] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            key="linear-calendar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.56, 0.27, 0, 1] }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60"
          />

          <motion.div
            key="linear-calendar-dialog"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, ease: [0.305, 0.206, 0.3, 1] }}
            className="relative z-10 w-full max-w-[562px] bg-[#18181c] border border-[#2b2b32] shadow-2xl rounded-2xl overflow-hidden text-[#f4f4f5]"
          >
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-[#24242a] bg-[#141416] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-white" />
                <span className="text-sm font-semibold text-white">Definir fecha de entrega</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-md text-white hover:bg-[#24242c] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Input & Help text */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#f4f4f5]">Rango de fechas de entrega</span>
                  <span className="text-[11px] text-[#71717a]">- El proyecto debe completarse para esta fecha</span>
                </div>
                <input
                  type="text"
                  readOnly
                  value={
                    selectedStart
                      ? `${formatPretty(selectedStart)} ${selectedEnd ? `→ ${formatPretty(selectedEnd)}` : ""}`
                      : "Seleccionar fechas"
                  }
                  className="w-full bg-[#141416] border border-[#2b2b32] rounded-lg px-3 py-2 text-xs font-semibold text-[#f4f4f5] outline-none"
                />
              </div>

              {/* Dual Calendar Month View */}
              <div className="flex flex-col sm:flex-row gap-6 pt-2">
                {renderMonthGrid(currentDate.getFullYear(), currentDate.getMonth(), false)}
                {renderMonthGrid(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), true)}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-[#24242a] bg-[#141416] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  setSelectedStart(today);
                  setSelectedEnd(new Date(today.getTime() + 14 * 86400000));
                }}
                className="text-xs text-white hover:underline font-medium cursor-pointer"
              >
                Restablecer a 2 semanas
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#a1a1aa] hover:text-white hover:bg-[#24242c] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#5e6ad2] hover:bg-[#4b55c4] text-white shadow-md shadow-[#5e6ad2]/20 transition-all cursor-pointer"
                >
                  Guardar fechas
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
