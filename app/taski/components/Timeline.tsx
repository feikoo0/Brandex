"use client";

import React, { useState, useEffect, useRef } from "react";
import { playSound } from "../utils/audio";

interface TimelineProps {
  projectName?: string;
}

export default function Timeline({ projectName = "Taski" }: TimelineProps) {
  // Helper to get current minutes since midnight
  const getMinutesNow = () => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  };

  const [currentTime, setCurrentTime] = useState(getMinutesNow());
  
  // Snap task boundaries to 15 minutes on mount to avoid initial jump
  const getSnappedTime = (mins: number) => {
    return Math.round(mins / 15) * 15;
  };

  const [taskStart, setTaskStart] = useState(() => {
    const now = getMinutesNow();
    return getSnappedTime(now - 15);
  });
  const [taskEnd, setTaskEnd] = useState(() => {
    const now = getMinutesNow();
    return getSnappedTime(now + 15);
  });
  
  // View mode interval: 5 minutes or 15 minutes
  const [viewInterval, setViewInterval] = useState<5 | 15>(5);

  // Visible timeline boundaries: 10 intervals to show exactly 11 time labels
  const getOptimalRangeForTask = (start: number, end: number) => {
    const duration = end - start;
    const minRange = Math.max(50, duration * 1.5); // Ensure task has padding
    
    // Standard time intervals to keep clean times (5m, 10m, 15m, 30m, 60m, etc)
    const intervals = [5, 10, 15, 30, 60, 120, 240, 480, 720];
    let bestInterval = intervals[intervals.length - 1];
    
    for (const int of intervals) {
      if (int * 10 >= minRange) {
        bestInterval = int;
        break;
      }
    }
    // 10 intervals = 11 labels exactly
    return bestInterval * 10;
  };

  const [visibleStart, setVisibleStart] = useState(() => {
    const now = getMinutesNow();
    const ts = getSnappedTime(now - 15);
    const te = getSnappedTime(now + 15);
    const range = getOptimalRangeForTask(ts, te);
    return Math.round(now - range / 2);
  });
  const [visibleEnd, setVisibleEnd] = useState(() => {
    const now = getMinutesNow();
    const ts = getSnappedTime(now - 15);
    const te = getSnappedTime(now + 15);
    const range = getOptimalRangeForTask(ts, te);
    return Math.round(now + range / 2);
  });
  
  // Track manual scrolling / panning state
  const [isManualControl, setIsManualControl] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // State refs to bypass React stale closures in event listeners
  const taskStartRef = useRef(taskStart);
  const taskEndRef = useRef(taskEnd);
  const visibleStartRef = useRef(visibleStart);
  const visibleEndRef = useRef(visibleEnd);

  useEffect(() => {
    taskStartRef.current = taskStart;
  }, [taskStart]);

  useEffect(() => {
    taskEndRef.current = taskEnd;
  }, [taskEnd]);

  useEffect(() => {
    visibleStartRef.current = visibleStart;
  }, [visibleStart]);

  useEffect(() => {
    visibleEndRef.current = visibleEnd;
  }, [visibleEnd]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({
    type: "" as "move" | "left" | "right" | "pan" | "",
    startX: 0,
    startTaskStart: 0,
    startTaskEnd: 0,
    startVisibleStart: 0,
    startVisibleEnd: 0,
  });

  // Animation frame ref for smooth zoom resets
  const animationFrameRef = useRef<number | null>(null);

  // Refs for tracking audio tick boundaries during dragging
  const lastTickValueRef = useRef<number | null>(null);
  const lastCenterTickRef = useRef<number | null>(null);
  const lastSoundTimeRef = useRef(0);

  // Track exact client width of the active timeline area
  const [timelineWidth, setTimelineWidth] = useState(500);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (timelineRef.current) {
      setTimelineWidth(timelineRef.current.clientWidth);
    }
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setTimelineWidth(entry.contentRect.width);
      }
    });
    if (timelineRef.current) {
      observer.observe(timelineRef.current);
    }
    return () => observer.disconnect();
  }, []);

  // Play skeuomorphic tick click sound using shared audio utility
  const playTickSound = () => {
    const now = performance.now();
    if (now - lastSoundTimeRef.current < 45) return;
    lastSoundTimeRef.current = now;
    playSound('tick');
  };

  // Update current time in real-time
  useEffect(() => {
    const updateTime = () => {
      const mins = getMinutesNow();
      setCurrentTime(mins);
      
      // Auto-follow current time if not in manual control and not active dragging
      if (!isDraggingRef.current && !isManualControl) {
        const range = visibleEndRef.current - visibleStartRef.current;
        setVisibleStart(Math.round(mins - range / 2));
        setVisibleEnd(Math.round(mins + range / 2));
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [isManualControl]);



  // Smooth easing animation to sync visible range and task boundaries
  const animateTimeline = ({
    targetVisibleStart,
    targetVisibleEnd,
    targetTaskStart,
    targetTaskEnd,
  }: {
    targetVisibleStart: number;
    targetVisibleEnd: number;
    targetTaskStart?: number;
    targetTaskEnd?: number;
  }) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const duration = 400; 
    const startTime = performance.now();
    
    const startVS = visibleStartRef.current;
    const startVE = visibleEndRef.current;
    const startTS = taskStartRef.current;
    const startTE = taskEndRef.current;

    playTickSound();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      
      const ease = 1 - Math.pow(1 - progress, 5);
      
      const nextVS = startVS + (targetVisibleStart - startVS) * ease;
      const nextVE = startVE + (targetVisibleEnd - startVE) * ease;
      setVisibleStart(nextVS);
      setVisibleEnd(nextVE);

      if (targetTaskStart !== undefined) {
        setTaskStart(startTS + (targetTaskStart - startTS) * ease);
      }
      if (targetTaskEnd !== undefined) {
        setTaskEnd(startTE + (targetTaskEnd - startTE) * ease);
      }
      
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
      } else {
        animationFrameRef.current = null;
      }
    };
    animationFrameRef.current = requestAnimationFrame(step);
  };

  const handleDragStart = (
    e: React.MouseEvent,
    type: "move" | "left" | "right" | "pan"
  ) => {
    e.preventDefault();
    isDraggingRef.current = true;
    setIsDragging(true);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    playTickSound();

    dragStartRef.current = {
      type,
      startX: e.clientX,
      startTaskStart: taskStartRef.current,
      startTaskEnd: taskEndRef.current,
      startVisibleStart: visibleStartRef.current,
      startVisibleEnd: visibleEndRef.current,
    };

    lastTickValueRef.current = null;
    lastCenterTickRef.current = null;

    document.addEventListener("mousemove", handleDragMove);
    document.addEventListener("mouseup", handleDragEnd);
  };

  const handleDragMove = (e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    
    const { type, startX, startTaskStart, startTaskEnd, startVisibleStart, startVisibleEnd } = dragStartRef.current;
    
    const deltaX = e.clientX - startX;
    const currentRange = startVisibleEnd - startVisibleStart;
    
    const trackWidth = timelineWidth - 48;
    const deltaMins = (deltaX / trackWidth) * currentRange;
    
    if (type === "pan") {
      const newVisibleStart = startVisibleStart - deltaMins;
      const newVisibleEnd = startVisibleEnd - deltaMins;
      
      setVisibleStart(newVisibleStart);
      setVisibleEnd(newVisibleEnd);
      setIsManualControl(true);

      const currentCenter = (newVisibleStart + newVisibleEnd) / 2;
      const roundedCenter = Math.round(currentCenter / 5) * 5;
      if (roundedCenter !== lastCenterTickRef.current) {
        lastCenterTickRef.current = roundedCenter;
        playTickSound();
      }
    } else if (type === "move") {
      const newStart = startTaskStart + deltaMins;
      const duration = startTaskEnd - startTaskStart;
      const newEnd = newStart + duration;
      
      setTaskStart(newStart);
      setTaskEnd(newEnd);
      
      const roundedStart = Math.round(newStart / 5) * 5;
      if (roundedStart !== lastTickValueRef.current) {
        lastTickValueRef.current = roundedStart;
        playTickSound();
      }
    } else if (type === "left") {
      const newStart = startTaskStart + deltaMins;
      const finalStart = Math.min(newStart, startTaskEnd - 5);
      setTaskStart(finalStart);

      const roundedStart = Math.round(newStart / 5) * 5;
      if (roundedStart !== lastTickValueRef.current) {
        lastTickValueRef.current = roundedStart;
        playTickSound();
      }

      const newDuration = startTaskEnd - finalStart;
      let newRange = currentRange;
      
      const rightPct = (startTaskEnd - startVisibleStart) / currentRange;
      const maxWidthPct = rightPct - 0.15; 
      
      if (maxWidthPct > 0.05 && newDuration > maxWidthPct * currentRange) {
        newRange = newDuration / maxWidthPct;
      }
      
      newRange = Math.min(2880, Math.max(30, newRange));
      
      const newVisibleStart = startTaskEnd - rightPct * newRange;
      const newVisibleEnd = newVisibleStart + newRange;
      
      setVisibleStart(newVisibleStart);
      setVisibleEnd(newVisibleEnd);
      setIsManualControl(true);
      
    } else if (type === "right") {
      const newEnd = startTaskEnd + deltaMins;
      const finalEnd = Math.max(newEnd, startTaskStart + 5);
      setTaskEnd(finalEnd);

      const roundedEnd = Math.round(newEnd / 5) * 5;
      if (roundedEnd !== lastTickValueRef.current) {
        lastTickValueRef.current = roundedEnd;
        playTickSound();
      }

      const newDuration = finalEnd - startTaskStart;
      let newRange = currentRange;
      
      const leftPct = (startTaskStart - startVisibleStart) / currentRange;
      const maxWidthPct = (1.0 - 0.15) - leftPct;

      if (maxWidthPct > 0.05 && newDuration > maxWidthPct * currentRange) {
        newRange = newDuration / maxWidthPct;
      }
      
      newRange = Math.min(2880, Math.max(30, newRange));
      
      const newVisibleStart = startTaskStart - leftPct * newRange;
      const newVisibleEnd = newVisibleStart + newRange;
      
      setVisibleStart(newVisibleStart);
      setVisibleEnd(newVisibleEnd);
      setIsManualControl(true);
    }
  };

  const handleDragEnd = () => {
    isDraggingRef.current = false;
    setIsDragging(false);
    
    document.removeEventListener("mousemove", handleDragMove);
    document.removeEventListener("mouseup", handleDragEnd);

    const { type } = dragStartRef.current;
    if (type === "left" || type === "right" || type === "move") {
      const currentStart = taskStartRef.current;
      const currentEnd = taskEndRef.current;
      
      let snappedStart = Math.round(currentStart / 5) * 5;
      let snappedEnd = Math.round(currentEnd / 5) * 5;
      
      if (snappedEnd - snappedStart < 5) {
        if (type === "left") snappedStart = snappedEnd - 5;
        else snappedEnd = snappedStart + 5;
      }
      
      // Auto-snap background to exactly 7 labels (6 intervals) perfectly framing the task
      const targetRange = getOptimalRangeForTask(snappedStart, snappedEnd);
      const taskCenter = (snappedStart + snappedEnd) / 2;
      const targetVisibleStart = taskCenter - targetRange / 2;
      const targetVisibleEnd = taskCenter + targetRange / 2;
      
      animateTimeline({
        targetVisibleStart,
        targetVisibleEnd,
        targetTaskStart: snappedStart,
        targetTaskEnd: snappedEnd,
      });
    }
  };

  const formatTimeLabel = (mins: number) => {
    const totalMins = (Math.floor(mins) + 1440) % 1440;
    const hours24 = Math.floor(totalMins / 60);
    const m = Math.floor(totalMins % 60);
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    const padM = m.toString().padStart(2, "0");
    return `${hours12}:${padM}`;
  };

  const formatDuration = (mins: number) => {
    const total = Math.round(mins);
    if (total < 60) return `${total}m`;
    const h = Math.floor(total / 60);
    const m = total % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  // Find the exact interval to enforce 11 labels (10 steps)
  const getDynamicInterval = (range: number) => {
    const exactStep = range / 10; 
    const intervals = [5, 10, 15, 30, 60, 120, 240, 480, 720];
    let bestInterval = intervals[0];
    let minDiff = Math.abs(exactStep - bestInterval);
    for (let i = 1; i < intervals.length; i++) {
      const diff = Math.abs(exactStep - intervals[i]);
      if (diff < minDiff) {
        minDiff = diff;
        bestInterval = intervals[i];
      }
    }
    return bestInterval;
  };

  const currentRange = visibleEnd - visibleStart;
  const activeInterval = getDynamicInterval(currentRange);

  const ticks: number[] = [];
  const startTick = Math.ceil(visibleStart / activeInterval) * activeInterval;
  const endTick = Math.floor(visibleEnd / activeInterval) * activeInterval;
  for (let t = startTick; t <= endTick; t += activeInterval) {
    ticks.push(t);
  }

  const getXPercent = (mins: number) => {
    if (currentRange <= 0) return 0;
    return ((mins - visibleStart) / currentRange) * 100;
  };

  const taskLeft = Math.max(0, Math.min(100, getXPercent(taskStart)));
  const taskRight = Math.max(0, Math.min(100, getXPercent(taskEnd)));
  const taskWidth = Math.max(0, taskRight - taskLeft);
  const nowX = getXPercent(currentTime);

  const tickSpacing = (timelineWidth - 48) / (ticks.length || 1);
  const showLabelsStep = tickSpacing < 28 ? (activeInterval === 5 ? 3 : 2) : 1;

  // Trackpad horizontal scrolling
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault(); 
        
        setIsManualControl(true);
        const currentRange = visibleEndRef.current - visibleStartRef.current;
        const trackWidth = timelineRef.current ? timelineRef.current.clientWidth - 48 : 452;
        
        // Convert trackpad delta to timeline minutes
        const deltaMins = (e.deltaX / trackWidth) * currentRange * 0.8;
        
        const newVisibleStart = visibleStartRef.current + deltaMins;
        const newVisibleEnd = visibleEndRef.current + deltaMins;
        
        setVisibleStart(newVisibleStart);
        setVisibleEnd(newVisibleEnd);

        const currentCenter = (newVisibleStart + newVisibleEnd) / 2;
        const roundedCenter = Math.round(currentCenter / 5) * 5;
        if (roundedCenter !== lastCenterTickRef.current) {
          lastCenterTickRef.current = roundedCenter;
          playTickSound();
        }
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const increaseDuration = () => {
    const newEnd = taskEnd + 15;
    playTickSound();
    
    const targetRange = getOptimalRangeForTask(taskStart, newEnd);
    const taskCenter = (taskStart + newEnd) / 2;
    animateTimeline({
      targetVisibleStart: taskCenter - targetRange / 2,
      targetVisibleEnd: taskCenter + targetRange / 2,
      targetTaskEnd: newEnd,
    });
  };

  const decreaseDuration = () => {
    if (taskEnd - taskStart <= 15) return; // Prevent less than 15 mins
    const newEnd = taskEnd - 15;
    playTickSound();

    const targetRange = getOptimalRangeForTask(taskStart, newEnd);
    const taskCenter = (taskStart + newEnd) / 2;
    animateTimeline({
      targetVisibleStart: taskCenter - targetRange / 2,
      targetVisibleEnd: taskCenter + targetRange / 2,
      targetTaskEnd: newEnd,
    });
  };

  return (
    <div className="flex items-center gap-3">
      {/* Minus / Plus Duration Control Pill */}
      <div className="flex items-center h-14 rounded-[20px] liquid-glass-btn overflow-hidden">
        <button 
          onClick={decreaseDuration}
          className="h-full w-14 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 active:bg-white/10 transition-colors"
        >
          <span className="text-2xl font-light leading-none mb-1">-</span>
        </button>
        <div className="w-[1px] h-6 bg-white/10" /> {/* Divider */}
        <button 
          onClick={increaseDuration}
          className="h-full w-14 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 active:bg-white/10 transition-colors"
        >
          <span className="text-2xl font-light leading-none mb-1">+</span>
        </button>
      </div>

      {/* Main Timeline Capsule Container (Background is draggable to pan) */}
      <div
        ref={containerRef}
        className="relative w-[680px] md:w-[700px] h-14 bg-[#0a0a0d] rounded-[20px] border border-neutral-900 shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex items-center select-none overflow-hidden cursor-grab active:cursor-grabbing overscroll-x-none touch-pan-y"
        onMouseDown={(e) => {
          // Trigger panning only if user clicked on background, not on handles or task block
          if ((e.target as HTMLElement).closest(".pointer-events-auto") === null) {
            handleDragStart(e, "pan");
          }
        }}
      >
        {/* Active Timeline viewport area */}
        <div ref={timelineRef} className="relative flex-1 h-full px-6 flex items-center pointer-events-none">
          
          {/* INNER ABSOLUTE TRACK - Aligns layers 1, 2, and 3 exactly to the padded content area */}
          <div className="absolute inset-x-6 top-0 bottom-0 pointer-events-none">

            {/* Layer 1: Selection Rectangle (z-10) */}
            {taskWidth > 0 && (
              <div
                className="absolute top-1 bottom-1.5 rounded-[12px] border border-blue-500/80 z-10 pointer-events-auto"
                style={{
                  left: `${taskLeft}%`,
                  width: `${taskWidth}%`,
                  minWidth: "32px",
                  // Radial glow background
                  background:
                    "radial-gradient(circle at center, rgba(37, 99, 235, 0.45) 0%, rgba(29, 78, 216, 0.15) 60%, rgba(13, 13, 17, 0.5) 100%)",
                }}
              >
                {/* Main draggable center area */}
                <div
                  className="absolute inset-0 cursor-grab active:cursor-grabbing"
                  onMouseDown={(e) => handleDragStart(e, "move")}
                />
              </div>
            )}

            {/* Layer 2: Time Labels (z-20) */}
            <div className="absolute inset-0 pointer-events-none z-20">
              {ticks.map((tick, index) => {
                const x = getXPercent(tick);
                if (x < 0 || x > 100) return null;

                const showLabel = index % showLabelsStep === 0;

                return (
                  <div
                    key={tick}
                    className="absolute flex flex-col items-center justify-end h-full pb-1"
                    style={{ left: `${x}%`, transform: "translateX(-50%)" }}
                  >
                    {/* Time label text - Only rendered on labeled intervals to keep it clean */}
                    {showLabel && (
                      <>
                        <span className="text-[10px] font-sans font-normal text-white/85 select-none mb-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                          {formatTimeLabel(tick)}
                        </span>
                        <div className="w-[1.5px] h-1.5 bg-white/40 rounded-full" />
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Layer 3: Extenders / Project Badge (z-30) */}
            {taskWidth > 0 && (
              <div
                className="absolute top-1 bottom-1.5 pointer-events-none z-30"
                style={{
                  left: `${taskLeft}%`,
                  width: `${taskWidth}%`,
                  minWidth: "32px",
                }}
              >
                {/* Project Badge overlay & Duration Wrapper */}
                <div className="absolute top-[-3px] left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-1">
                  <div className="px-2 py-0.5 bg-[#f43f5e] rounded-full text-white text-[8px] font-black tracking-wider uppercase shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
                    {projectName}
                  </div>
                  <div className="px-1.5 py-0.5 bg-neutral-800/80 backdrop-blur-md rounded-full border border-neutral-700 text-white/90 text-[7px] font-bold tracking-widest shadow-[0_2px_4px_rgba(0,0,0,0.4)] transition-all">
                    {formatDuration(taskEnd - taskStart)}
                  </div>
                </div>

                {/* Left resize handle */}
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-3 bg-white rounded-full cursor-ew-resize pointer-events-auto shadow-[0_1px_3px_rgba(0,0,0,0.5)] border border-neutral-300"
                  onMouseDown={(e) => handleDragStart(e, "left")}
                />

                {/* Right resize handle */}
                <div
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-1.5 h-3 bg-white rounded-full cursor-ew-resize pointer-events-auto shadow-[0_1px_3px_rgba(0,0,0,0.5)] border border-neutral-300"
                  onMouseDown={(e) => handleDragStart(e, "right")}
                />
              </div>
            )}



            {/* Real-time "NOW" marker line */}
            {nowX >= 0 && nowX <= 100 && (
              <div
                className="absolute top-0 bottom-0 w-[1px] pointer-events-none z-30 flex flex-col justify-end"
                style={{
                  left: `${nowX}%`,
                }}
              >
                <div className="w-full h-full bg-cyan-400/50 shadow-[0_0_4px_rgba(34,211,238,0.4)]" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-cyan-400 text-[6px] leading-none mb-[2px]">
                  ▲
                </div>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
