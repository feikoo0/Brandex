"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

type CursorMode = "default" | "pointer" | "text" | "col-resize" | "grab" | "grabbing";

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<CursorMode>("default");
  const [isVisible, setIsVisible] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Position tracking using refs to avoid React re-renders on mousemove
  const mousePosRef = useRef({ x: -100, y: -100 });
  const ringPosRef = useRef({ x: -100, y: -100 });
  const lastTargetRef = useRef<EventTarget | null>(null);
  const isMouseDownRef = useRef(false);
  const animationFrameIdRef = useRef<number | null>(null);

  // Detect cursor mode based on hovered element
  const detectMode = useCallback((target: HTMLElement | null): CursorMode => {
    if (!target) return "default";

    // 1. Check body-level cursor override (e.g. while dragging a ResizableDivider)
    if (
      document.body.style.cursor === "col-resize" ||
      document.body.style.cursor === "ew-resize"
    ) {
      return "col-resize";
    }

    // 2. Check for ResizableDivider or col-resize elements
    if (
      target.closest('[role="separator"]') ||
      target.closest(".cursor-col-resize") ||
      target.closest(".cursor-ew-resize")
    ) {
      return "col-resize";
    }

    // 3. Text inputs, textareas, and contenteditable areas
    const tagName = target.tagName?.toLowerCase();
    if (
      tagName === "input" ||
      tagName === "textarea" ||
      target.isContentEditable ||
      target.getAttribute("contenteditable") === "true" ||
      target.closest('[contenteditable="true"]')
    ) {
      const inputType = (target as HTMLInputElement).type;
      if (
        !inputType ||
        ["text", "search", "password", "email", "number", "tel", "url"].includes(inputType)
      ) {
        return "text";
      }
    }

    // 4. Grabbing / Grab states
    if (
      target.closest(".cursor-grabbing") ||
      (isMouseDownRef.current && target.closest(".cursor-grab"))
    ) {
      return "grabbing";
    }
    if (
      target.closest(".cursor-grab") ||
      target.getAttribute("draggable") === "true"
    ) {
      return isMouseDownRef.current ? "grabbing" : "grab";
    }

    // 5. Interactive clickable elements
    if (
      tagName === "button" ||
      tagName === "a" ||
      target.closest("button") ||
      target.closest("a") ||
      target.closest('[role="button"]') ||
      target.closest('[role="tab"]') ||
      target.closest('[role="menuitem"]') ||
      target.closest(".cursor-pointer")
    ) {
      return "pointer";
    }

    // Check computed style cursor as fallback
    try {
      const computedCursor = window.getComputedStyle(target).cursor;
      if (computedCursor === "col-resize" || computedCursor === "ew-resize") {
        return "col-resize";
      }
      if (computedCursor === "text") {
        return "text";
      }
      if (computedCursor === "pointer") {
        return "pointer";
      }
      if (computedCursor === "grab") {
        return isMouseDownRef.current ? "grabbing" : "grab";
      }
      if (computedCursor === "grabbing") {
        return "grabbing";
      }
    } catch {
      // Fallback
    }

    return "default";
  }, []);

  useEffect(() => {
    // Check if device is touch-primary
    const isTouch =
      window.matchMedia("(pointer: coarse)").matches ||
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0;

    if (isTouch) {
      setIsTouchDevice(true);
      return;
    }

    // Enable custom cursor class on body
    document.body.classList.add("custom-cursor-active");

    const onMouseMove = (e: MouseEvent) => {
      mousePosRef.current.x = e.clientX;
      mousePosRef.current.y = e.clientY;

      if (!isVisible) {
        setIsVisible(true);
        ringPosRef.current.x = e.clientX;
        ringPosRef.current.y = e.clientY;
      }

      // Update dot position instantly (hardware accelerated, zero-latency)
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }

      // Evaluate mode only if the hovered target changed to avoid layout thrashing
      if (e.target !== lastTargetRef.current) {
        lastTargetRef.current = e.target;
        const newMode = detectMode(e.target as HTMLElement);
        setMode(newMode);
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      setIsMouseDown(true);
      isMouseDownRef.current = true;
      const currentMode = detectMode(e.target as HTMLElement);
      setMode(currentMode);
    };

    const onMouseUp = (e: MouseEvent) => {
      setIsMouseDown(false);
      isMouseDownRef.current = false;
      const currentMode = detectMode(e.target as HTMLElement);
      setMode(currentMode);
    };

    const onMouseLeave = () => {
      setIsVisible(false);
      document.body.classList.remove("custom-cursor-active");
    };

    const onMouseEnter = () => {
      setIsVisible(true);
      document.body.classList.add("custom-cursor-active");
    };

    // Smooth animation loop for the follower ring (lerp factor ~0.24)
    const animate = () => {
      const lerp = 0.24;
      ringPosRef.current.x += (mousePosRef.current.x - ringPosRef.current.x) * lerp;
      ringPosRef.current.y += (mousePosRef.current.y - ringPosRef.current.y) * lerp;

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringPosRef.current.x}px, ${ringPosRef.current.y}px, 0)`;
      }

      animationFrameIdRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mousedown", onMouseDown, { passive: true });
    window.addEventListener("mouseup", onMouseUp, { passive: true });
    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("mouseenter", onMouseEnter);

    animationFrameIdRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mouseenter", onMouseEnter);
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      document.body.classList.remove("custom-cursor-active");
    };
  }, [detectMode, isVisible]);

  // Don't render on touch screens or when not yet visible
  if (isTouchDevice || !isVisible) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-[9999999] overflow-hidden select-none"
    >
      {/* 1. Precision Center Dot (Zero Latency - Centered via flex-anchor) */}
      <div
        ref={dotRef}
        className="absolute top-0 left-0 w-0 h-0 flex items-center justify-center pointer-events-none transition-opacity duration-150 ease-out"
        style={{
          opacity: mode === "text" || mode === "col-resize" ? 0 : 1,
        }}
      >
        <div
          className={`w-[5px] h-[5px] shrink-0 rounded-full bg-white transition-transform duration-150 ${
            isMouseDown ? "scale-75" : "scale-100"
          } shadow-[0_0_4px_rgba(255,255,255,0.7)]`}
        />
      </div>

      {/* 2. Fluid Follower Ring & Contextual Morphism */}
      <div
        ref={ringRef}
        className="absolute top-0 left-0 w-0 h-0 flex items-center justify-center pointer-events-none"
      >
        {/* State: Text / Input (Vertical I-Beam Capsule) */}
        {mode === "text" && (
          <div className="w-[2px] h-[18px] shrink-0 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.85)] animate-pulse transition-all duration-150" />
        )}

        {/* State: Column Resizer (Dual Arrow Badge ‹ | ›) */}
        {mode === "col-resize" && (
          <div
            className={`w-8 h-8 shrink-0 rounded-full bg-[#181818]/95 border border-white/30 backdrop-blur-md shadow-2xl flex items-center justify-center transition-all duration-150 ${
              isMouseDown ? "scale-90 bg-white/20 border-white/50" : "scale-100"
            }`}
          >
            <div className="flex items-center justify-center gap-0.5 text-white/90">
              <svg
                width="8"
                height="8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <div className="w-[1.5px] h-3 bg-white/40 rounded-full" />
              <svg
                width="8"
                height="8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>
        )}

        {/* State: Clickable Pointer (Halo Focus) */}
        {mode === "pointer" && (
          <div
            className={`w-9 h-9 shrink-0 rounded-full border border-white/35 bg-white/[0.08] backdrop-blur-[0.5px] transition-all duration-200 ease-out ${
              isMouseDown ? "scale-85 bg-white/[0.15] border-white/50" : "scale-100"
            }`}
          />
        )}

        {/* State: Grab (Grip Dots) */}
        {mode === "grab" && (
          <div className="w-7 h-7 shrink-0 rounded-full border border-white/30 bg-white/5 flex items-center justify-center gap-1 transition-all duration-150">
            <div className="flex flex-col gap-1">
              <div className="w-1 h-1 rounded-full bg-white/80" />
              <div className="w-1 h-1 rounded-full bg-white/80" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="w-1 h-1 rounded-full bg-white/80" />
              <div className="w-1 h-1 rounded-full bg-white/80" />
            </div>
          </div>
        )}

        {/* State: Grabbing (Contracted Grip Ring) */}
        {mode === "grabbing" && (
          <div className="w-5 h-5 shrink-0 rounded-full border border-white/60 bg-white/30 scale-90 transition-all duration-150" />
        )}

        {/* State: Default (Smooth Circle Ring) */}
        {mode === "default" && (
          <div
            className={`w-6 h-6 shrink-0 rounded-full border border-white/30 transition-all duration-150 ease-out ${
              isMouseDown ? "scale-75 border-white/50 bg-white/10" : "scale-100"
            }`}
          />
        )}
      </div>
    </div>
  );
}
