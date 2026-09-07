"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { MoreHorizontal, Trash2, Copy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { Board, BoardElement } from "@/lib/types/board";
import { parseAnyDate } from "@/lib/utils";

interface BoardCardProps {
  board: Board;
  onOpen: (boardId: string) => void;
  onDelete?: (boardId: string) => void;
}

// ── Miniatura SVG Abstracta y Ultra-Ligera (Cero impacto en rendimiento) ──
function BoardMiniaturePreview({ elements }: { elements: BoardElement[] }) {
  // Calcular bounding box mínimo para centrar los elementos en la miniatura
  const bounds = useMemo(() => {
    if (!elements || elements.length === 0) return { minX: 0, minY: 0, width: 800, height: 500 };

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const el of elements) {
      const elX = el.x || 0;
      const elY = el.y || 0;
      const elW = el.width || (el.type === "sticky" ? 200 : el.type === "frame" ? 300 : 100);
      const elH = el.height || (el.type === "sticky" ? 160 : el.type === "frame" ? 200 : 60);

      minX = Math.min(minX, elX);
      minY = Math.min(minY, elY);
      maxX = Math.max(maxX, elX + elW);
      maxY = Math.max(maxY, elY + elH);
    }

    if (!isFinite(minX)) return { minX: 0, minY: 0, width: 800, height: 500 };
    
    // Añadir margen
    const pad = 60;
    const width = Math.max(maxX - minX + pad * 2, 400);
    const height = Math.max(maxY - minY + pad * 2, 280);

    return { minX: minX - pad, minY: minY - pad, width, height };
  }, [elements]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#141416] flex items-center justify-center select-none pointer-events-none">
      {/* Patrón de cuadrícula de puntos estático miniatura */}
      <svg className="absolute inset-0 w-full h-full opacity-30">
        <defs>
          <pattern id="dot-pattern-card" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.75" fill="rgba(255,255,255,0.3)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dot-pattern-card)" />
      </svg>

      {/* Renderizador SVG Vectorial a Escala Automática */}
      <svg
        viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
        className="w-full h-full relative z-10 p-2"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* 1. Frames primero (capa inferior) */}
        {elements
          .filter((el) => el.type === "frame")
          .map((el: any) => (
            <g key={el.id}>
              <rect
                x={el.x}
                y={el.y}
                width={el.width || 320}
                height={el.height || 220}
                rx="14"
                fill={el.backgroundColor || "rgba(255, 255, 255, 0.05)"}
                stroke={el.borderColor || "rgba(255, 255, 255, 0.15)"}
                strokeWidth="2"
              />
              <text
                x={el.x + 12}
                y={el.y - 8}
                fill="rgba(255, 255, 255, 0.5)"
                fontSize="14"
                fontWeight="500"
              >
                {el.title || "Frame"}
              </text>
            </g>
          ))}

        {/* 2. Flechas */}
        {elements
          .filter((el) => el.type === "arrow")
          .map((el: any) => (
            <line
              key={el.id}
              x1={el.startX || el.x}
              y1={el.startY || el.y}
              x2={el.endX || el.x + 100}
              y2={el.endY || el.y + 60}
              stroke={el.color || "#3B82F6"}
              strokeWidth={Math.max(el.strokeWidth || 3, 2)}
              strokeLinecap="round"
            />
          ))}

        {/* 3. Trazos libres (Marker) */}
        {elements
          .filter((el) => el.type === "stroke")
          .map((el: any) => {
            if (!el.points || el.points.length < 2) return null;
            const pathData = el.points.reduce((acc: string, pt: any, i: number) => {
              return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
            }, "");
            return (
              <path
                key={el.id}
                d={pathData}
                fill="none"
                stroke={el.color || "#3B82F6"}
                strokeWidth={el.strokeWidth || 4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}

        {/* 4. Sticky Notes */}
        {elements
          .filter((el) => el.type === "sticky")
          .map((el: any) => (
            <g key={el.id}>
              <rect
                x={el.x}
                y={el.y}
                width={el.width || 180}
                height={el.height || 140}
                rx="8"
                fill={el.color || "#FCD34D"}
              />
              {/* Líneas simuladas de texto en la nota */}
              <rect x={el.x + 12} y={el.y + 16} width={(el.width || 180) * 0.6} height="6" rx="2" fill="rgba(0,0,0,0.15)" />
              <rect x={el.x + 12} y={el.y + 28} width={(el.width || 180) * 0.75} height="6" rx="2" fill="rgba(0,0,0,0.15)" />
              <rect x={el.x + 12} y={el.y + 40} width={(el.width || 180) * 0.45} height="6" rx="2" fill="rgba(0,0,0,0.15)" />
            </g>
          ))}

        {/* 5. Tareas (Task Pills) */}
        {elements
          .filter((el) => el.type === "task_pill")
          .map((el: any) => (
            <g key={el.id}>
              <rect
                x={el.x}
                y={el.y}
                width={el.width || 160}
                height={el.height || 36}
                rx="10"
                fill={el.projectColor || "#3B82F6"}
              />
              <text
                x={el.x + 12}
                y={el.y + 22}
                fill="#ffffff"
                fontSize="12"
                fontWeight="600"
              >
                {el.title ? el.title.slice(0, 16) : "Tarea"}
              </text>
            </g>
          ))}

        {/* 6. Textos */}
        {elements
          .filter((el) => el.type === "text")
          .map((el: any) => (
            <text
              key={el.id}
              x={el.x}
              y={el.y + 20}
              fill={el.color || "#ffffff"}
              fontSize={el.fontSize === "xl" ? 28 : el.fontSize === "lg" ? 22 : el.fontSize === "sm" ? 14 : 18}
              fontWeight="600"
            >
              {el.text || "Texto"}
            </text>
          ))}
      </svg>
    </div>
  );
}

// ── Tarjeta de Tablero Oficial de Taski ──
export function BoardCard({ board, onOpen, onDelete }: BoardCardProps) {
  const formattedDate = useMemo(() => {
    const rawDate = board.updatedAt || board.createdAt;
    const parsed = parseAnyDate(rawDate);
    if (!parsed) return "Modificado recientemente";

    try {
      return `Modificado ${formatDistanceToNow(parsed, { addSuffix: true, locale: es })}`;
    } catch {
      return "Modificado recientemente";
    }
  }, [board.updatedAt, board.createdAt]);

  return (
    <motion.div
      onClick={() => onOpen(board.id)}
      className="relative cursor-pointer h-[220px] p-2 select-none"
      initial="initial"
      whileHover="hover"
    >
      {/* Rectángulo de fondo interactivo con fade in y elevación idéntico a la tarjeta de proyectos */}
      <motion.div
        variants={{
          initial: { opacity: 0, scale: 0.92 },
          hover: { opacity: 1, scale: 1 },
        }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0 rounded-2xl bg-[#26262a] border border-white/20 pointer-events-none z-0 shadow-2xl shadow-black/70"
      />

      {/* Contenido de la tarjeta */}
      <div className="relative z-10 flex flex-col justify-between h-full w-full pointer-events-none">
        {/* 1. CONTENEDOR RECTANGULAR INTERIOR (Miniatura visual del tablero) */}
        <div className="flex-1 w-full rounded-xl relative overflow-hidden border border-white/10 pointer-events-auto shadow-inner">
          <BoardMiniaturePreview elements={board.elements} />

          {/* Menú de acciones en esquina superior derecha de la tarjeta */}
          {onDelete && (
            <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(board.id);
                }}
                className="w-7 h-7 rounded-lg bg-black/60 hover:bg-rose-500/20 hover:text-rose-400 text-white/70 border border-white/10 flex items-center justify-center transition-colors shadow-sm"
                title="Eliminar tablero"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* 2. CUERPO EXTERIOR: Título del tablero + Cuándo se modificó por última vez */}
        <div className="pt-2.5 px-1 pb-0.5 flex flex-col gap-0.5 bg-transparent min-w-0 pointer-events-auto">
          <h3 className="text-[14px] font-medium text-[#ffffffd6] tracking-tight truncate leading-tight">
            {board.title || "Sin título"}
          </h3>
          <span className="text-[12px] font-normal text-[#ffffff6b] truncate">
            {formattedDate}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
