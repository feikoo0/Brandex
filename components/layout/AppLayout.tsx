"use client";

import React, { ReactNode, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ResizableDivider } from "@/components/ui/ResizableDivider";

interface AppLayoutProps {
  sidebar: ReactNode;
  topbar?: ReactNode;
  children: ReactNode;
  sidePanel?: ReactNode;
  modals?: ReactNode;
  isNightMode?: boolean;
  className?: string;
  contentClassName?: string;
  headerWrapperClassName?: string;
}

/**
 * AppLayout — Layout Fijo al Viewport (Native Web App Architecture)
 * 
 * Estructura de capas:
 * - Layer 0 (Fondo Base): #0f0f0f (w-screen h-screen overflow-hidden flex p-2.5 gap-2.5)
 * - Sidebar: Columna de navegación izquierda con ancho fijo/animado y scroll confinado
 * - Layer 1 (Lienzo Principal): #0d0d0d (flex-1 min-w-0 h-full overflow-hidden flex flex-col rounded-[24px] border-white/[0.08])
 * - SidePanel: Panel lateral derecho hermano en Layer 0 (compacta suavemente el lienzo principal)
 * - Topbar: Header superior fijo de 64px (h-[64px] shrink-0)
 * - Content Area: Área de contenido dinámico (flex-1 min-h-0 min-w-0 overflow-hidden relative)
 */
export function AppLayout({
  sidebar,
  topbar,
  children,
  sidePanel,
  modals,
  isNightMode = true,
  className,
  contentClassName,
  headerWrapperClassName,
}: AppLayoutProps) {
  const [sidePanelWidth, setSidePanelWidth] = useState<number>(315);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("taski_task_sidepanel_width");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 315) {
          setSidePanelWidth(parsed);
        }
      }
    }
  }, []);

  const handleSidePanelResize = (deltaX: number) => {
    setSidePanelWidth((prev) => {
      const maxW = typeof window !== "undefined" ? Math.floor(window.innerWidth * 0.45) : 600;
      // Arrastrar a la izquierda (deltaX negativo) aumenta el ancho del panel derecho
      return Math.min(Math.max(prev - deltaX, 315), maxW);
    });
  };

  const handleSidePanelResizeEnd = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("taski_task_sidepanel_width", String(sidePanelWidth));
    }
  };

  return (
    <div
      className={cn(
        "relative w-screen h-screen h-[100dvh] overflow-hidden overflow-x-hidden select-none font-sans flex p-2.5 gap-2.5 transition-colors duration-500",
        isNightMode ? "bg-[#0f0f0f] text-neutral-100" : "bg-[#dce1e8] text-slate-900",
        className
      )}
    >
      {/* 1. Sidebar / Rail de Navegación */}
      <aside className="shrink-0 h-full flex flex-col justify-between overflow-hidden z-40 relative">
        {sidebar}
      </aside>

      {/* 2. Main Wrapper — Lienzo de Trabajo Principal (Layer 1) */}
      <div
        className={cn(
          "flex-1 min-w-0 h-full flex flex-col overflow-hidden rounded-[1.5rem] border transition-all duration-300 relative z-30 shadow-sm",
          isNightMode
            ? "bg-[#0d0d0d] border-white/[0.08]"
            : "bg-[#fffce2] border-slate-300/70"
        )}
      >
        {/* Header / Barra Superior (Bajado con pt-[2.0625rem] para alinearse con el logo) */}
        {topbar && (
          <header
            className={cn(
              "pt-[2.0625rem] pb-[0.625rem] min-h-[5.1875rem] shrink-0 w-full flex items-center px-6 z-50 relative",
              headerWrapperClassName
            )}
          >
            {topbar}
          </header>
        )}

        {/* Content Area — Área de Contenido Dinámico con Scroll Confinado */}
        <main
          className={cn(
            "flex-1 min-h-0 min-w-0 overflow-hidden relative px-6 pb-5 pt-0",
            contentClassName
          )}
        >
          {children}
        </main>
      </div>

      {/* Divisor Interactivo al Nivel del Borde del Rectángulo Contenedor */}
      {sidePanel && (
        <div className="shrink-0 h-full flex items-center justify-center -mx-1.5 z-40">
          <ResizableDivider
            side="left"
            ariaLabel="Redimensionar panel lateral de tarea"
            onResize={handleSidePanelResize}
            onResizeEnd={handleSidePanelResizeEnd}
            className="h-full"
          />
        </div>
      )}

      {/* 3. Task Side Panel / Panel Lateral Derecho */}
      <AnimatePresence mode="wait">
        {sidePanel && (
          <motion.div
            key="task-side-panel-container"
            initial={{ opacity: 0, x: 40, width: 0 }}
            animate={{ opacity: 1, x: 0, width: sidePanelWidth }}
            exit={{ opacity: 0, x: 40, width: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="shrink-0 h-full flex flex-col overflow-hidden z-40 relative"
            style={{ width: `${sidePanelWidth}px` }}
          >
            {sidePanel}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Slot de Modales y Portales Globales */}
      {modals}
    </div>
  );
}
