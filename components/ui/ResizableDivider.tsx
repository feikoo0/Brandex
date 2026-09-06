"use client";

import React, { useEffect, useRef, useCallback } from "react";

interface ResizableDividerProps {
  onResize: (deltaX: number) => void;
  onResizeEnd?: () => void;
  className?: string;
  side?: "left" | "right";
  ariaLabel?: string;
}

export function ResizableDivider({
  onResize,
  onResizeEnd,
  className = "",
  side = "right",
  ariaLabel = "Redimensionar columna",
}: ResizableDividerProps) {
  const isDraggingRef = useRef<boolean>(false);
  const lastXRef = useRef<number>(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isDraggingRef.current = true;
      lastXRef.current = e.clientX;

      // Prevent selecting text while resizing
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    },
    []
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - lastXRef.current;
      lastXRef.current = e.clientX;
      onResize(deltaX);
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
        onResizeEnd?.();
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [onResize, onResizeEnd]);

  return (
    <div
      role="separator"
      aria-label={ariaLabel}
      aria-orientation="vertical"
      onMouseDown={handleMouseDown}
      className={`relative z-50 flex items-center justify-center cursor-col-resize select-none shrink-0 w-4 -mx-2 h-full bg-transparent ${className}`}
    />
  );
}
