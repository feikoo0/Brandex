"use client";

import React from "react";

export default function CosmicBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-50 bg-[#060608]">
      {/* Dynamic Cosmic Grid */}
      <div className="absolute inset-0 creative-grid opacity-25" />

      {/* Radiant Cosmic Orbs */}
      <div 
        className="absolute w-[600px] h-[600px] rounded-full blur-[140px] opacity-20 animate-cosmic-float-1"
        style={{
          background: "radial-gradient(circle, rgba(58, 123, 213, 0.4) 0%, rgba(191, 90, 242, 0.1) 70%, transparent 100%)",
          top: "-10%",
          left: "-10%",
        }}
      />
      
      <div 
        className="absolute w-[500px] h-[500px] rounded-full blur-[120px] opacity-15 animate-cosmic-float-2"
        style={{
          background: "radial-gradient(circle, rgba(255, 45, 85, 0.3) 0%, rgba(50, 210, 245, 0.15) 60%, transparent 100%)",
          bottom: "10%",
          right: "-5%",
        }}
      />

      <div 
        className="absolute w-[700px] h-[700px] rounded-full blur-[160px] opacity-10 animate-cosmic-pulse"
        style={{
          background: "radial-gradient(circle, rgba(191, 90, 242, 0.2) 0%, rgba(58, 123, 213, 0.05) 80%, transparent 100%)",
          top: "40%",
          left: "30%",
        }}
      />
    </div>
  );
}
