"use client";

import React, { forwardRef } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassPanelProps extends HTMLMotionProps<"div"> {
  elevation?: "base" | "elevated";
  hoverable?: boolean;
  glowColor?: string; // e.g. "rgba(58,123,213,0.15)"
}

const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  (
    {
      children,
      className,
      elevation = "base",
      hoverable = false,
      glowColor,
      style,
      ...props
    },
    ref
  ) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          elevation === "elevated" ? "liquid-glass-elevated" : "liquid-glass",
          "rounded-2xl overflow-hidden transition-all duration-300 relative",
          hoverable && "hover:border-white/10 hover:bg-white/[0.03]",
          className
        )}
        style={{
          ...style,
          ...(glowColor
            ? {
                boxShadow: `${
                  elevation === "elevated"
                    ? "inset 0 1px 0 rgba(255, 255, 255, 0.08)"
                    : "inset 0 1px 0 rgba(255, 255, 255, 0.05)"
                }, 0 16px 64px rgba(0, 0, 0, 0.6), 0 0 30px ${glowColor}`,
              }
            : {}),
        }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

GlassPanel.displayName = "GlassPanel";

export default GlassPanel;
