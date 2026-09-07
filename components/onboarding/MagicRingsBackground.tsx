"use client";

import React from "react";
import MagicRings from "@/app/taski/components/MagicRings";

interface MagicRingsBackgroundProps {
  className?: string;
  speed?: number;
  opacity?: number;
  rotation?: number;
  baseRadius?: number;
  radiusStep?: number;
  scaleRate?: number;
  ringCount?: number;
  attenuation?: number;
  lineThickness?: number;
}

export function MagicRingsBackground({
  className = "",
  speed = 0.65,
  opacity = 0.9,
  rotation = 90,
  baseRadius = 0.45,
  radiusStep = 0.18,
  scaleRate = 0.16,
  ringCount = 8,
  attenuation = 5,
  lineThickness = 2,
}: MagicRingsBackgroundProps) {
  return (
    <div
      className={`absolute -inset-4 w-[calc(100%+32px)] h-[calc(100%+32px)] pointer-events-none overflow-hidden select-none z-0 ${className}`}
      aria-hidden="true"
    >
      <MagicRings
        color="#555555"
        colorTwo="#2a2a2a"
        ringCount={ringCount}
        speed={speed}
        attenuation={attenuation}
        lineThickness={lineThickness}
        baseRadius={baseRadius}
        radiusStep={radiusStep}
        scaleRate={scaleRate}
        opacity={opacity}
        blur={0}
        noiseAmount={0.02}
        rotation={rotation}
        ringGap={1.35}
        fadeIn={0.7}
        fadeOut={0.4}
        followMouse={true}
        mouseInfluence={0.12}
        hoverScale={1.15}
        parallax={0.04}
        clickBurst={false}
      />
    </div>
  );
}
