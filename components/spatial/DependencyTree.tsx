"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

interface DependencyTreeProps {
  parentId: string;
  childIds: string[];
}

interface PathLine {
  id: string;
  d: string;
}

export default function DependencyTree({ parentId, childIds }: DependencyTreeProps) {
  const containerRef = useRef<SVGSVGElement>(null);
  const [lines, setLines] = useState<PathLine[]>([]);

  useEffect(() => {
    const updateCoordinates = () => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const parentEl = document.getElementById(`project-pill-${parentId}`);
      if (!parentEl) return;

      const parentRect = parentEl.getBoundingClientRect();
      // Start connection point from the bottom-left area of the parent pill
      const startX = parentRect.left - containerRect.left + 24;
      const startY = parentRect.bottom - containerRect.top;

      const newLines: PathLine[] = [];

      childIds.forEach((childId) => {
        const childEl = document.getElementById(`child-task-${childId}`);
        if (!childEl) return;

        const childRect = childEl.getBoundingClientRect();
        // End connection point at the center-left of the child card
        const endX = childRect.left - containerRect.left;
        const endY = childRect.top - containerRect.top + childRect.height / 2;

        // Draw a smooth bezier curve with horizontal control points
        const controlX1 = startX;
        const controlY1 = startY + (endY - startY) * 0.4;
        const controlX2 = startX + (endX - startX) * 0.3;
        const controlY2 = endY;

        const d = `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;
        newLines.push({ id: childId, d });
      });

      setLines(newLines);
    };

    // Update coordinates on mount and on changes
    updateCoordinates();

    // Loop coordinates updating briefly to handle Framer Motion expansion transitions
    let frameId: number;
    let count = 0;
    const animate = () => {
      updateCoordinates();
      count++;
      if (count < 60) { // Keep updating for about 1 second of expansion animation
        frameId = requestAnimationFrame(animate);
      }
    };
    frameId = requestAnimationFrame(animate);

    // Event listeners
    window.addEventListener("resize", updateCoordinates);
    window.addEventListener("scroll", updateCoordinates, true);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updateCoordinates);
      window.removeEventListener("scroll", updateCoordinates, true);
    };
  }, [parentId, childIds]);

  if (childIds.length === 0) return null;

  return (
    <svg
      ref={containerRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      style={{ minHeight: "100%" }}
    >
      <defs>
        <linearGradient id="tree-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(58, 123, 213, 0.4)" />
          <stop offset="100%" stopColor="rgba(50, 210, 245, 0.1)" />
        </linearGradient>
      </defs>
      {lines.map((line) => (
        <motion.path
          key={line.id}
          d={line.d}
          fill="none"
          stroke="url(#tree-grad)"
          strokeWidth="1.5"
          strokeDasharray="4,4"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      ))}
    </svg>
  );
}
