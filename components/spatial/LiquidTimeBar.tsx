"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LiquidTimeBarProps {
  estimatedHours: number;
  spentHours: number;
  showLabels?: boolean;
  className?: string;
}

export default function LiquidTimeBar({
  estimatedHours,
  spentHours,
  showLabels = true,
  className,
}: LiquidTimeBarProps) {
  const safeEst = estimatedHours || 1; // avoid divide by zero
  const safeSpent = spentHours || 0;
  const ratio = safeSpent / safeEst;
  const percentage = Math.min(ratio * 100, 100);
  const isExceeded = ratio > 1;
  const overflowPercentage = isExceeded ? Math.min(((safeSpent - safeEst) / safeEst) * 100, 100) : 0;

  return (
    <div className={cn("w-full flex flex-col gap-1.5 select-none", className)}>
      {showLabels && (
        <div className="flex justify-between items-center text-[11px] font-bold text-neutral-400">
          <div className="flex items-center gap-1">
            <span>Esfuerzo:</span>
            <span className={cn("font-extrabold", isExceeded ? "text-rose-400" : "text-white")}>
              {safeSpent}h
            </span>
            <span className="text-neutral-600">/</span>
            <span>{safeEst}h est.</span>
          </div>
          {isExceeded && (
            <span className="text-rose-400 font-extrabold animate-pulse">
              Excedido +{safeSpent - safeEst}h ({Math.round(ratio * 100)}%)
            </span>
          )}
        </div>
      )}

      {/* Bar container */}
      <div className="relative w-full h-2.5 rounded-full bg-white/[0.04] border border-white/[0.05] overflow-hidden backdrop-blur-sm">
        {/* Under-budget / Active flow bar */}
        {!isExceeded ? (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full relative overflow-hidden"
            style={{
              background: "linear-gradient(90deg, #3a7bd5 0%, #32d2f5 50%, #34c759 100%)",
              backgroundSize: "200% 100%",
            }}
          >
            {/* Animated shimmer flow */}
            <motion.div
              className="absolute inset-0 w-full h-full"
              style={{
                background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)",
                backgroundSize: "200% 100%",
              }}
              animate={{
                backgroundPosition: ["200% 0%", "-200% 0%"],
              }}
              transition={{
                repeat: Infinity,
                duration: 3,
                ease: "linear",
              }}
            />
          </motion.div>
        ) : (
          /* Over-budget (Exceeded) bar */
          <div className="flex w-full h-full">
            {/* 100% full base bar (red) */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 0.5 }}
              className="h-full bg-rose-600 rounded-full animate-pulse relative"
            >
              {/* Highlight flash */}
              <div 
                className="absolute inset-0 w-full h-full" 
                style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
                  animation: "cosmic-pulse 2s ease-in-out infinite",
                }}
              />
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
