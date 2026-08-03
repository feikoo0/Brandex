"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ProjectStatusIconProps {
  status?: string;
  className?: string;
}

export function ProjectStatusIcon({ status = "", className = "w-4 h-4" }: ProjectStatusIconProps) {
  const norm = (status || "").toLowerCase().trim();

  // 1. Planificación (círculo hecho con dots)
  if (norm.includes("planif")) {
    return (
      <svg className={cn("shrink-0", className)} viewBox="0 0 24 24" fill="none" stroke="#bf5af2" strokeWidth="2.2" strokeDasharray="3 3">
        <circle cx="12" cy="12" r="9" />
      </svg>
    );
  }

  // 2. En Proceso (círculo naranja con medio círculo dentro)
  if (norm.includes("proceso") || norm.includes("progreso")) {
    return (
      <svg className={cn("shrink-0", className)} viewBox="0 0 24 24" fill="none" stroke="#ff9f0a" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3a9 9 0 0 1 0 18V3z" fill="#ff9f0a" />
      </svg>
    );
  }

  // 3. En Revisión (círculo morado con ojo en medio)
  if (norm.includes("revisi")) {
    return (
      <svg className={cn("shrink-0", className)} viewBox="0 0 24 24" fill="none" stroke="#bf5af2" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8.5c-2.5 0-4.5 3.5-4.5 3.5s2 3.5 4.5 3.5 4.5-3.5 4.5-3.5-2-3.5-4.5-3.5z" stroke="#bf5af2" strokeWidth="1.6" fill="none" />
        <circle cx="12" cy="12" r="1.5" fill="#bf5af2" />
      </svg>
    );
  }

  // 4. Completado (círculo completo relleno con palomita)
  if (norm.includes("complet") || norm.includes("hecho") || norm.includes("finaliz") || norm.includes("aprob")) {
    return (
      <svg className={cn("shrink-0", className)} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9.5" fill="#30d158" />
        <path d="M7.8 12.2l2.7 2.7 5.7-5.7" stroke="#121212" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // Fallback (Planificación)
  return (
    <svg className={cn("shrink-0", className)} viewBox="0 0 24 24" fill="none" stroke="#bf5af2" strokeWidth="2.2" strokeDasharray="3 3">
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

export default ProjectStatusIcon;
