"use client";

import React from "react";
import { LayoutGrid } from "lucide-react";
import { playSound } from "@/app/taski/utils/audio";
import type { BoardTool, BoardTextSize } from "@/lib/types/board";

export const MARKER_COLORS = [
  "#FFFFFF", // Blanco
  "#3B82F6", // Azul
  "#8B5CF6", // Púrpura
  "#EC4899", // Rosa
  "#F59E0B", // Amarillo
  "#10B981", // Verde
  "#EF4444", // Coral
];

export const STICKY_COLORS = [
  "#FCD34D", // Amarillo pastel
  "#FCA5A5", // Coral pastel
  "#A7F3D0", // Menta pastel
  "#BAE6FD", // Azul cielo pastel
  "#DDD6FE", // Lavanda pastel
  "#FBCFE8", // Rosa pastel
  "#E5E7EB", // Gris claro
];

export const FRAME_COLORS = [
  "rgba(255, 255, 255, 0.05)",
  "rgba(59, 130, 246, 0.12)",
  "rgba(139, 92, 246, 0.12)",
  "rgba(236, 72, 153, 0.12)",
  "rgba(245, 158, 11, 0.12)",
  "rgba(16, 185, 129, 0.12)",
];

export const FRAME_SWATCHES = [
  { bg: "rgba(255, 255, 255, 0.15)", val: "rgba(255, 255, 255, 0.05)" },
  { bg: "#3B82F6", val: "rgba(59, 130, 246, 0.12)" },
  { bg: "#8B5CF6", val: "rgba(139, 92, 246, 0.12)" },
  { bg: "#EC4899", val: "rgba(236, 72, 153, 0.12)" },
  { bg: "#F59E0B", val: "rgba(245, 158, 11, 0.12)" },
  { bg: "#10B981", val: "rgba(16, 185, 129, 0.12)" },
];

export const TEXT_SIZES: { size: BoardTextSize; label: string; textClass: string }[] = [
  { size: "sm", label: "Aa", textClass: "text-[11px] font-normal" },
  { size: "md", label: "Aa", textClass: "text-[13px] font-bold" },
  { size: "lg", label: "Aa", textClass: "text-[16px] font-semibold" },
  { size: "xl", label: "Aa", textClass: "text-[19px] font-extrabold" },
];

interface BoardContextualToolbarProps {
  activeTool: BoardTool;
  selectedElement?: any;
  // Marker / Arrow
  strokeColor: string;
  onStrokeColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (w: number) => void;
  // Sticky
  stickyColor: string;
  onStickyColorChange: (color: string) => void;
  // Text
  textSize: BoardTextSize;
  onTextSizeChange: (size: BoardTextSize) => void;
  textColor: string;
  onTextColorChange: (color: string) => void;
  // Frame
  frameColor: string;
  onFrameColorChange: (color: string) => void;
  onFrameTidy?: () => void;
}

export function BoardContextualToolbar({
  activeTool,
  selectedElement,
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
}: BoardContextualToolbarProps) {
  // Determinar qué barra contextual mostrar según la herramienta activa o el elemento seleccionado
  const mode = selectedElement?.type || (activeTool === "marker" || activeTool === "arrow" ? "stroke" : activeTool === "text" ? "text" : null);

  if (!mode) return null;

  // 1. Barra para Marker o Flecha
  if (mode === "stroke" || mode === "arrow") {
    const currentColor = selectedElement?.color || strokeColor;
    const currentWidth = selectedElement?.strokeWidth || strokeWidth;

    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1c1c1e] border border-white/10 shadow-2xl shadow-black/80 backdrop-blur-xl select-none">
        {/* Swatches de color */}
        <div className="flex items-center gap-1.5">
          {MARKER_COLORS.map((c) => {
            const isSelected = currentColor.toLowerCase() === c.toLowerCase();
            return (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onStrokeColorChange(c);
                  playSound("pop");
                }}
                className={`w-5 h-5 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                  isSelected ? "scale-110 ring-2 ring-white/60 ring-offset-2 ring-offset-[#1c1c1e]" : "hover:scale-105"
                }`}
                style={{ backgroundColor: c }}
              />
            );
          })}
        </div>

        {/* Separador */}
        <div className="w-px h-4 bg-white/15 mx-1" />

        {/* 3 Grosores de trazo */}
        <div className="flex items-center gap-2">
          {/* Fino */}
          <button
            type="button"
            onClick={() => {
              onStrokeWidthChange(2);
              playSound("click");
            }}
            className={`w-5 h-5 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
              currentWidth === 2 ? "bg-white/20" : "hover:bg-white/10"
            }`}
            title="Trazo fino (2px)"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
          </button>

          {/* Medio */}
          <button
            type="button"
            onClick={() => {
              onStrokeWidthChange(4);
              playSound("click");
            }}
            className={`w-5 h-5 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
              currentWidth === 4 ? "bg-white/20" : "hover:bg-white/10"
            }`}
            title="Trazo medio (4px)"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-white" />
          </button>

          {/* Grueso */}
          <button
            type="button"
            onClick={() => {
              onStrokeWidthChange(8);
              playSound("click");
            }}
            className={`w-5 h-5 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
              currentWidth === 8 ? "bg-white/20" : "hover:bg-white/10"
            }`}
            title="Trazo grueso (8px)"
          >
            <span className="w-3.5 h-3.5 rounded-full bg-white" />
          </button>
        </div>
      </div>
    );
  }

  // 2. Barra para Sticky Note
  if (mode === "sticky") {
    const currentColor = selectedElement?.color || stickyColor;

    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1c1c1e] border border-white/10 shadow-2xl shadow-black/80 backdrop-blur-xl select-none">
        {STICKY_COLORS.map((c) => {
          const isSelected = currentColor.toLowerCase() === c.toLowerCase();
          return (
            <button
              key={c}
              type="button"
              onClick={() => {
                onStickyColorChange(c);
                playSound("pop");
              }}
              className={`w-5 h-5 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                isSelected ? "scale-110 ring-2 ring-white/60 ring-offset-2 ring-offset-[#1c1c1e]" : "hover:scale-105"
              }`}
              style={{ backgroundColor: c }}
            />
          );
        })}
      </div>
    );
  }

  // 3. Barra para Frame
  if (mode === "frame") {
    const currentColor = selectedElement?.backgroundColor || frameColor;

    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1c1c1e] border border-white/10 shadow-2xl shadow-black/80 backdrop-blur-xl select-none">
        {/* Colores de Frame */}
        <div className="flex items-center gap-1.5">
          {FRAME_SWATCHES.map((swatch) => {
            const isSelected = currentColor === swatch.val;
            return (
              <button
                key={swatch.val}
                type="button"
                onClick={() => {
                  onFrameColorChange(swatch.val);
                  playSound("pop");
                }}
                className={`w-5 h-5 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                  isSelected ? "scale-110 ring-2 ring-white/60 ring-offset-2 ring-offset-[#1c1c1e]" : "hover:scale-105"
                }`}
                style={{ backgroundColor: swatch.bg }}
              />
            );
          })}
        </div>

        {/* Separador */}
        <div className="w-px h-4 bg-white/15 mx-1" />

        {/* Botón Tidy */}
        <button
          type="button"
          onClick={() => {
            onFrameTidy?.();
            playSound("click");
          }}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors text-[12px] font-medium cursor-pointer"
          title="Auto-organizar elementos dentro del frame"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Tidy</span>
        </button>
      </div>
    );
  }

  // 4. Barra para Texto (4 tamaños Aa + 7 colores)
  if (mode === "text") {
    const currentSize = selectedElement?.fontSize || textSize;
    const currentColor = selectedElement?.color || textColor;

    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1c1c1e] border border-white/10 shadow-2xl shadow-black/80 backdrop-blur-xl select-none">
        {/* 4 Tamaños Aa */}
        <div className="flex items-center gap-1">
          {TEXT_SIZES.map((opt) => {
            const isSelected = currentSize === opt.size;
            return (
              <button
                key={opt.size}
                type="button"
                onClick={() => {
                  onTextSizeChange(opt.size);
                  playSound("click");
                }}
                className={`px-1.5 py-0.5 rounded-lg cursor-pointer transition-colors ${opt.textClass} ${
                  isSelected ? "bg-white/20 text-white" : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
                title={`Tamaño ${opt.size.toUpperCase()}`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Separador */}
        <div className="w-px h-4 bg-white/15 mx-1" />

        {/* 7 Colores */}
        <div className="flex items-center gap-1.5">
          {MARKER_COLORS.map((c) => {
            const isSelected = currentColor.toLowerCase() === c.toLowerCase();
            return (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onTextColorChange(c);
                  playSound("pop");
                }}
                className={`w-5 h-5 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                  isSelected ? "scale-110 ring-2 ring-white/60 ring-offset-2 ring-offset-[#1c1c1e]" : "hover:scale-105"
                }`}
                style={{ backgroundColor: c }}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
