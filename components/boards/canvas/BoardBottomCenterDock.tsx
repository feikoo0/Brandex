"use client";

import React from "react";
import {
  MousePointer2,
  Hand,
  Pen,
  StickyNote,
  Frame,
  Type,
  MoveUpRight,
  Library,
  Plus,
} from "lucide-react";
import { playSound } from "@/app/taski/utils/audio";
import type { BoardTool, BoardTextSize } from "@/lib/types/board";
import { BoardContextualToolbar } from "./BoardContextualToolbar";

interface BoardBottomCenterDockProps {
  activeTool: BoardTool;
  onSelectTool: (tool: BoardTool) => void;
  // Marker / Arrow properties
  strokeColor: string;
  onStrokeColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (w: number) => void;
  // Sticky properties
  stickyColor: string;
  onStickyColorChange: (color: string) => void;
  // Text properties
  textSize: BoardTextSize;
  onTextSizeChange: (s: BoardTextSize) => void;
  textColor: string;
  onTextColorChange: (c: string) => void;
  // Frame properties
  frameColor: string;
  onFrameColorChange: (c: string) => void;
  onFrameTidy?: () => void;
  // Selected element if any
  selectedElement?: any;
  // Plus button toggle
  onToggleInsertTasks: () => void;
  isInsertTasksOpen: boolean;
}

export function BoardBottomCenterDock({
  activeTool,
  onSelectTool,
  strokeColor,
  onStrokeColorChange,
  strokeWidth,
  onStrokeWidthChange,
  stickyColor,
  onStickyColorChange,
  textSize,
  onTextSizeChange,
  textColor,
  onTextColorChange,
  frameColor,
  onFrameColorChange,
  onFrameTidy,
  selectedElement,
  onToggleInsertTasks,
  isInsertTasksOpen,
}: BoardBottomCenterDockProps) {
  // Herramientas del dock
  const tools: { id: BoardTool; label: string; icon: React.ReactNode; shortcut?: string }[] = [
    { id: "select", label: "Seleccionar (V)", icon: <MousePointer2 className="w-4 h-4" /> },
    { id: "hand", label: "Mano / Pan (H)", icon: <Hand className="w-4 h-4" /> },
    { id: "marker", label: "Marker / Pincel (M)", icon: <Pen className="w-4 h-4" />, shortcut: "M" },
    { id: "sticky", label: "Sticky Note (S)", icon: <StickyNote className="w-4 h-4" /> },
    { id: "frame", label: "Frame (#)", icon: <Frame className="w-4 h-4" /> },
    { id: "text", label: "Texto (T)", icon: <Type className="w-4 h-4" /> },
    { id: "arrow", label: "Flecha (A)", icon: <MoveUpRight className="w-4 h-4" /> },
  ];

  // ¿Debemos mostrar la barra contextual flotante directamente arriba del dock?
  const showDockContextual =
    activeTool === "marker" ||
    activeTool === "arrow" ||
    activeTool === "text";

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 select-none">
      {/* ── BARRA CONTEXTUAL FLOTANTE (Acoplada justo arriba del dock) ── */}
      {showDockContextual && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-150">
          <BoardContextualToolbar
            activeTool={activeTool}
            selectedElement={selectedElement}
            strokeColor={strokeColor}
            onStrokeColorChange={onStrokeColorChange}
            strokeWidth={strokeWidth}
            onStrokeWidthChange={onStrokeWidthChange}
            stickyColor={stickyColor}
            onStickyColorChange={onStickyColorChange}
            textSize={textSize}
            onTextSizeChange={onTextSizeChange}
            textColor={textColor}
            onTextColorChange={onTextColorChange}
            frameColor={frameColor}
            onFrameColorChange={onFrameColorChange}
            onFrameTidy={onFrameTidy}
          />
        </div>
      )}

      {/* ── DOCK HORIZONTAL PRINCIPAL ── */}
      <div className="flex items-center gap-1 px-2 py-1.5 rounded-full bg-[#1c1c1e] border border-white/10 shadow-2xl shadow-black/90 backdrop-blur-xl">
        {tools.map((t) => {
          const isActive = activeTool === t.id;

          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                onSelectTool(t.id);
                playSound("click");
              }}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
                isActive
                  ? "bg-white/20 text-white shadow-sm"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
              title={t.label}
            >
              {t.icon}
            </button>
          );
        })}

        {/* Separador vertical */}
        <div className="w-px h-5 bg-white/15 mx-1" />

        {/* Biblioteca / Recursos */}
        <button
          type="button"
          onClick={() => {
            playSound("click");
          }}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Biblioteca de recursos"
        >
          <Library className="w-4 h-4" />
        </button>

        {/* Botón Circular Blanco Plus (+) */}
        <button
          type="button"
          onClick={() => {
            onToggleInsertTasks();
            playSound("pop");
          }}
          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-black transition-all cursor-pointer ml-0.5 shadow-md ${
            isInsertTasksOpen
              ? "bg-white ring-2 ring-white/50 scale-105"
              : "bg-white hover:bg-neutral-200 active:scale-95"
          }`}
          title="Añadir tareas o proyectos al canvas"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}
