import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { playSound } from '../utils/audio';

interface DateRangePickerProps {
  startDateStr?: string;
  endDateStr?: string;
  onUpdate: (start: string, end: string) => void;
  children?: React.ReactNode;
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const FULL_MONTHS: Record<string, string> = {
  'Ene': 'Enero', 'Feb': 'Febrero', 'Mar': 'Marzo', 'Abr': 'Abril', 'May': 'Mayo', 'Jun': 'Junio',
  'Jul': 'Julio', 'Ago': 'Agosto', 'Sep': 'Septiembre', 'Oct': 'Octubre', 'Nov': 'Noviembre', 'Dic': 'Diciembre'
};
const DAYS_OF_WEEK = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function parseDateString(str: string | undefined): Date | null {
  if (!str) return null;
  const parts = str.trim().split(' ');
  if (parts.length < 2) return null;
  const day = parseInt(parts[0], 10);
  const monthIdx = MONTHS.findIndex(m => m.toLowerCase() === parts[1].toLowerCase());
  if (isNaN(day) || monthIdx === -1) return null;
  const year = new Date().getFullYear();
  return new Date(year, monthIdx, day);
}

function formatDateString(d: Date): string {
  const day = d.getDate().toString().padStart(2, '0');
  const month = MONTHS[d.getMonth()];
  return `${day} ${month}`;
}

function formatFullDateText(str?: string): string {
  if (!str) return "";
  const parts = str.trim().split(' ');
  if (parts.length < 2) return str;
  const day = parseInt(parts[0], 10);
  const month = FULL_MONTHS[parts[1]] || parts[1];
  return `${day} de ${month}`;
}

export default function DateRangePicker({ startDateStr, endDateStr, onUpdate, children }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
  
  const [startDate, setStartDate] = useState<Date | null>(parseDateString(startDateStr));
  const [endDate, setEndDate] = useState<Date | null>(parseDateString(endDateStr));
  
  const [viewDate, setViewDate] = useState<Date>(() => {
    return startDate || new Date();
  });

  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update dates if props change
  useEffect(() => {
    setStartDate(parseDateString(startDateStr));
    setEndDate(parseDateString(endDateStr));
  }, [startDateStr, endDateStr]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const popoverEl = document.getElementById('daterange-picker-popover');
      const clickedTrigger = triggerRef.current && triggerRef.current.contains(event.target as Node);
      const clickedPopover = popoverEl && popoverEl.contains(event.target as Node);
      
      if (!clickedTrigger && !clickedPopover) {
        if (isOpen) {
          setIsOpen(false);
          playSound('whoosh');
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const togglePicker = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTriggerRect(rect);
    playSound(isOpen ? 'whoosh' : 'click');
    setIsOpen(!isOpen);
  };

  const handlePrevMonth = () => {
    playSound('tick');
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    playSound('tick');
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const clickedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    
    playSound('pop');

    if (!startDate) {
      setStartDate(clickedDate);
    } else if (startDate && !endDate) {
      if (clickedDate < startDate) {
        setStartDate(clickedDate);
      } else {
        setEndDate(clickedDate);
        onUpdate(formatDateString(startDate), formatDateString(clickedDate));
        setTimeout(() => {
          setIsOpen(false);
          playSound('whoosh');
        }, 500);
      }
    } else if (startDate && endDate) {
      setStartDate(clickedDate);
      setEndDate(null);
    }
  };

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: startOffset }, (_, i) => i);

  let buttonText = "Seleccionar fecha";
  if (startDateStr && endDateStr) {
    buttonText = `${formatFullDateText(startDateStr)} - ${formatFullDateText(endDateStr)}`;
  } else if (startDateStr) {
    buttonText = formatFullDateText(startDateStr);
  }

  return (
    <>
      {children ? (
        <div ref={triggerRef} onClick={togglePicker} className="cursor-pointer flex-shrink-0">
          {children}
        </div>
      ) : (
        <div ref={triggerRef} className="relative flex items-center">
          <button 
            onClick={togglePicker}
            className="px-4 py-1.5 rounded-full liquid-glass-btn border border-white/10 hover:bg-white/5 hover:border-white/20 transition-all group flex items-center z-[9990]"
          >
            <span className="text-[13px] font-medium text-white/80 whitespace-nowrap">
              {buttonText}
            </span>
          </button>
        </div>
      )}

      {mounted && createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div 
              id="daterange-picker-popover"
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="fixed w-[320px] rounded-[32px] liquid-glass-btn border border-white/10 shadow-2xl overflow-hidden p-6 z-[9999] backdrop-blur-xl"
              style={{
                top: triggerRect ? triggerRect.bottom + 8 : 0,
                left: triggerRect ? triggerRect.left : 0,
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <button onClick={handlePrevMonth} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                  <svg className="w-4 h-4 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h3 className="text-[15px] font-medium text-white/90">
                  {FULL_MONTHS[MONTHS[viewDate.getMonth()]]} {viewDate.getFullYear()}
                </h3>
                <button onClick={handleNextMonth} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                  <svg className="w-4 h-4 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Days Header */}
              <div className="grid grid-cols-7 mb-4">
                {DAYS_OF_WEEK.map(day => (
                  <div key={day} className="text-center text-[10px] font-bold text-white/30 uppercase tracking-widest">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-y-2">
                {blanks.map(i => (
                  <div key={`blank-${i}`} className="w-full h-10" />
                ))}
                
                {days.map(day => {
                  const currentDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                  
                  const isStart = startDate && currentDate.getTime() === startDate.getTime();
                  const isEnd = endDate && currentDate.getTime() === endDate.getTime();
                  const isBetween = startDate && endDate && currentDate > startDate && currentDate < endDate;

                  return (
                    <div key={day} className="relative w-full h-10 flex items-center justify-center cursor-pointer group" onClick={() => handleDayClick(day)}>
                      
                      {isBetween && (
                        <div className="absolute inset-0 bg-white/5" />
                      )}
                      {isStart && endDate && (
                        <div className="absolute inset-y-0 right-0 w-1/2 bg-white/5" />
                      )}
                      {isEnd && startDate && (
                        <div className="absolute inset-y-0 left-0 w-1/2 bg-white/5" />
                      )}

                      <div className={`relative z-10 w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200
                        ${(isStart || isEnd) ? 'liquid-glass-btn border border-white/20 text-white shadow-lg scale-110' : 
                          isBetween ? 'text-white/90 font-medium' : 
                          'text-white/60 hover:text-white hover:bg-white/5 font-light'
                        }
                      `}>
                        <span className={isStart || isEnd ? 'text-[14px] font-semibold' : 'text-[13px]'}>{day}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
