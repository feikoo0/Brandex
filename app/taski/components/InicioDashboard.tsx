"use client";

import React, { useRef, useState, useCallback } from "react";

export function InicioDashboard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pointerPos, setPointerPos] = useState({ x: "50%", y: "50%" });
  const [isHovered, setIsHovered] = useState(false);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPointerPos({ x: `${x}px`, y: `${y}px` });
    if (!isHovered) setIsHovered(true);
  }, [isHovered]);

  const handlePointerLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative w-full h-full overflow-hidden select-none"
      style={
        {
          "--agent-root-hero-pointer-x": pointerPos.x,
          "--agent-root-hero-pointer-y": pointerPos.y,
          "--agent-root-hero-hover-opacity": isHovered ? "0.6" : "0",
          "--color-sc-hero-dot": "rgba(255, 255, 255, 0.2)",
        } as React.CSSProperties
      }
    >
      {/* Background container requested by user */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {/* Layer 1: Base dark background */}
        <div className="absolute inset-0 bg-[#0f1012]" />

        {/* Layer 2: Static masked dot grid */}
        <div
          className="absolute inset-0 opacity-45"
          style={{
            maskImage:
              "linear-gradient(to right, transparent calc(50% - 24rem), black calc(50% - 15rem), black calc(50% + 15rem), transparent calc(50% + 24rem))",
            WebkitMaskImage:
              "linear-gradient(to right, transparent calc(50% - 24rem), black calc(50% - 15rem), black calc(50% + 15rem), transparent calc(50% + 24rem))",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle, var(--color-sc-hero-dot, rgba(255, 255, 255, 0.2)) 0.0625rem, transparent 0.0625rem), radial-gradient(circle, var(--color-sc-hero-dot, rgba(255, 255, 255, 0.2)) 0.0625rem, transparent 0.0625rem)",
              backgroundPosition: "0px 0px, 0.368rem 0.736rem",
              backgroundSize: "0.736rem 1.472rem",
              maskImage: "linear-gradient(black 0%, black 16%, rgba(0, 0, 0, 0.72) 30%, transparent 58%)",
              WebkitMaskImage: "linear-gradient(black 0%, black 16%, rgba(0, 0, 0, 0.72) 30%, transparent 58%)",
            }}
          />
        </div>

        {/* Layer 3: Interactive hover spotlight dot grid */}
        <div
          className="absolute inset-0 transition-opacity duration-150 ease-[ease] motion-reduce:transition-none [@media(hover:none)]:hidden"
          style={{
            backgroundImage:
              "radial-gradient(circle, var(--color-sc-hero-dot, rgba(255, 255, 255, 0.2)) 0.0625rem, transparent 0.0625rem), radial-gradient(circle, var(--color-sc-hero-dot, rgba(255, 255, 255, 0.2)) 0.0625rem, transparent 0.0625rem)",
            backgroundPosition: "0px 0px, 0.368rem 0.736rem",
            backgroundSize: "0.736rem 1.472rem",
            maskImage:
              "radial-gradient(circle 8rem at var(--agent-root-hero-pointer-x, 50%) var(--agent-root-hero-pointer-y, 50%), black 0%, rgb(0 0 0 / 0.5) 42%, transparent 76%)",
            WebkitMaskImage:
              "radial-gradient(circle 8rem at var(--agent-root-hero-pointer-x, 50%) var(--agent-root-hero-pointer-y, 50%), black 0%, rgb(0 0 0 / 0.5) 42%, transparent 76%)",
            opacity: "var(--agent-root-hero-hover-opacity, 0)",
          }}
        />

        {/* Layer 4: Ambient glow pill at top */}
        <div className="absolute left-[calc(50%-6.25rem)] top-[-6.625rem] h-[19.25rem] w-[26.8125rem] rotate-[32deg] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.045)_0%,rgba(255,255,255,0.018)_38%,transparent_72%)] blur-3xl" />

        {/* Layer 5: Top subtle linear gradient */}
        <div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.015),transparent)]" />
      </div>
    </div>
  );
}
