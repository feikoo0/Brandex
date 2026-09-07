"use client";

import React from "react";
import { Undo2, Redo2, Maximize2, Plus, Minus } from "lucide-react";
import { playSound } from "@/app/taski/utils/audio";

interface BoardBottomLeftToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onFitToScreen: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

export function BoardBottomLeftToolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onFitToScreen,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}: BoardBottomLeftToolbarProps) {
  const percentage = Math.round(zoom * 100);

  return (
    <div className="absolute bottom-5 left-5 z-40 flex flex-col items-center bg-[#1c1c1e] border border-white/10 rounded-2xl p-1 shadow-2xl shadow-black/80 backdrop-blur-xl gap-0.5 select-none">
      {/* 1. Undo */}
      <button
        type="button"
        disabled={!canUndo}
        onClick={() => {
          if (canUndo) {
            onUndo();
            playSound("click");
          }
        }}
        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
          canUndo
            ? "text-white/80 hover:text-white hover:bg-white/10 active:bg-white/15"
            : "text-white/20 cursor-not-allowed"
        }`}
        title="Deshacer (Cmd+Z)"
      >
        <Undo2 className="w-4 h-4" />
      </button>

      {/* 2. Redo */}
      <button
        type="button"
        disabled={!canRedo}
        onClick={() => {
          if (canRedo) {
            onRedo();
            playSound("click");
          }
        }}
        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
          canRedo
            ? "text-white/80 hover:text-white hover:bg-white/10 active:bg-white/15"
            : "text-white/20 cursor-not-allowed"
        }`}
        title="Rehacer (Cmd+Shift+Z)"
      >
        <Redo2 className="w-4 h-4" />
      </button>

      {/* Separador */}
      <div className="w-5 h-px bg-white/10 my-1" />

      {/* 3. Fit to screen */}
      <button
        type="button"
        onClick={() => {
          onFitToScreen();
          playSound("click");
        }}
        className="w-9 h-9 rounded-xl flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 active:bg-white/15 transition-colors cursor-pointer"
        title="Ajustar a la pantalla (Fit to view)"
      >
        <Maximize2 className="w-4 h-4" />
      </button>

      {/* Separador */}
      <div className="w-5 h-px bg-white/10 my-1" />

      {/* 4. Zoom In (+) */}
      <button
        type="button"
        onClick={() => {
          onZoomIn();
          playSound("click");
        }}
        className="w-9 h-9 rounded-xl flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 active:bg-white/15 transition-colors cursor-pointer"
        title="Acercar (+)"
      >
        <Plus className="w-4 h-4" />
      </button>

      {/* 5. Porcentaje */}
      <button
        type="button"
        onClick={() => {
          onResetZoom();
          playSound("click");
        }}
        className="w-9 py-1 text-center text-[11px] font-bold text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
        title="Restablecer zoom al 100%"
      >
        {percentage}%
      </button>

      {/* 6. Zoom Out (-) */}
      <button
        type="button"
        onClick={() => {
          onZoomOut();
          playSound("click");
        }}
        className="w-9 h-9 rounded-xl flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 active:bg-white/15 transition-colors cursor-pointer"
        title="Alejar (-)"
      >
        <Minus className="w-4 h-4" />
      </button>
    </div>
  );
}
