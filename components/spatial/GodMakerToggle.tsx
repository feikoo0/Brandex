"use client";

import React from "react";
import { motion } from "framer-motion";
import { Eye, Hammer } from "lucide-react";
import { useUIStore } from "@/lib/store";

export default function GodMakerToggle() {
  const { dashboardMode, toggleDashboardMode } = useUIStore();

  return (
    <div className="relative flex items-center p-1 rounded-full bg-white/[0.03] border border-white/[0.06] backdrop-blur-md select-none w-[220px] h-[38px]">
      {/* Background pill selector */}
      <motion.div
        className="absolute top-1 bottom-1 rounded-full bg-white/[0.08] border border-white/[0.1] shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
        layoutId="toggle-pill"
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        style={{
          left: dashboardMode === "god" ? "4px" : "110px",
          width: "106px",
        }}
      />

      {/* God Mode Option */}
      <button
        onClick={() => dashboardMode !== "god" && toggleDashboardMode()}
        className="relative flex-1 flex items-center justify-center gap-1.5 text-xs font-bold transition-colors focus:outline-none h-full z-10"
        style={{
          color: dashboardMode === "god" ? "#ffffff" : "rgba(255, 255, 255, 0.45)",
        }}
      >
        <Eye className="w-3.5 h-3.5" />
        <span>GOD MODE</span>
      </button>

      {/* Maker Mode Option */}
      <button
        onClick={() => dashboardMode !== "maker" && toggleDashboardMode()}
        className="relative flex-1 flex items-center justify-center gap-1.5 text-xs font-bold transition-colors focus:outline-none h-full z-10"
        style={{
          color: dashboardMode === "maker" ? "#ffffff" : "rgba(255, 255, 255, 0.45)",
        }}
      >
        <Hammer className="w-3.5 h-3.5" />
        <span>MAKER</span>
      </button>
    </div>
  );
}
