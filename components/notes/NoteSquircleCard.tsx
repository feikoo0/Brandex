"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Pin, Check, X } from "lucide-react";
import type { NoteDoc } from "@/lib/types";
import { playSound } from "@/app/taski/utils/audio";
import { getSingleSourceProjectColor } from "@/lib/utils";
import { useData } from "@/hooks/useData";

interface NoteSquircleCardProps {
  note: NoteDoc;
  onSelect: (note: NoteDoc) => void;
  onDelete?: (id: string, e: React.MouseEvent) => void;
  onTogglePin?: (id: string, e: React.MouseEvent) => void;
  onToggleComplete?: (id: string, isCompleted: boolean, e: React.MouseEvent) => void;
  isNightMode?: boolean;
  isActive?: boolean;
  className?: string;
  projects?: any[];
}

export function NoteSquircleCard({
  note,
  onSelect,
  onDelete,
  onTogglePin,
  onToggleComplete,
  isNightMode = true,
  isActive = false,
  className = "",
  projects,
}: NoteSquircleCardProps) {
  const isDone = !!note.isCompleted;
  const { data } = useData();

  const allProjects = projects || data?.proyectos || [];

  const project = useMemo(() => {
    if (!note.projectId && !note.projectTitle) return null;
    return (
      allProjects.find((p: any) => String(p.id) === String(note.projectId)) ||
      allProjects.find(
        (p: any) =>
          (p.nombre || p.title)?.toLowerCase().trim() ===
          note.projectTitle?.toLowerCase().trim()
      ) ||
      (note.projectTitle ? { nombre: note.projectTitle, color: note.clientColor } : null)
    );
  }, [allProjects, note.projectId, note.projectTitle, note.clientColor]);

  const projectColor = useMemo(() => {
    if (!project) return null;
    return getSingleSourceProjectColor(project);
  }, [project]);

  const hasSolidColor = !!projectColor && !isDone && !isActive;

  const dynamicCardStyle = useMemo(() => {
    if (!hasSolidColor || !projectColor) return undefined;
    return {
      backgroundColor: projectColor.hslCss,
      border: "none",
      boxShadow: "0 4px 14px rgba(0, 0, 0, 0.18)",
    };
  }, [hasSolidColor, projectColor]);

  const attachedDisplayTitle = note.projectTitle || note.taskTitle;

  return (
    <motion.div
      layout
      whileTap={{ scale: 0.99 }}
      onClick={() => {
        onSelect(note);
        playSound("pop");
      }}
      style={dynamicCardStyle}
      className={`group relative w-full p-2.5 px-3.5 rounded-2xl transition-all duration-150 cursor-pointer select-none flex items-center gap-2.5 ${
        isActive
          ? "bg-[#202022] shadow-md"
          : isDone
          ? isNightMode
            ? "bg-[#141416]/80 opacity-70 hover:opacity-100"
            : "bg-slate-100 opacity-70 hover:opacity-100"
          : hasSolidColor
          ? "hover:brightness-105"
          : isNightMode
          ? "bg-[#181818] hover:bg-[#1e1e1e]"
          : "bg-white hover:bg-slate-50 shadow-sm"
      } ${className}`}
    >
      {/* 1. Botón de Fijar Nota (Pin) a la izquierda del Check - Ahora en blanco */}
      {onTogglePin && (
        <button
          type="button"
          data-no-dnd="true"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(note.id, e);
            playSound("click");
          }}
          title={note.isPinned ? "Desfijar nota" : "Fijar nota"}
          className={`p-0.5 -ml-1 rounded-md transition-all cursor-pointer shrink-0 ${
            note.isPinned
              ? "opacity-100 text-white hover:text-white/80"
              : hasSolidColor
              ? "opacity-0 group-hover:opacity-100 text-white/70 hover:text-white"
              : "opacity-0 group-hover:opacity-100 text-white/40 hover:text-white"
          }`}
        >
          <Pin className={`w-3.5 h-3.5 ${note.isPinned ? "fill-white text-white" : ""}`} />
        </button>
      )}

      {/* 2. Marcador Squircle para seleccionar nota completada */}
      <button
        type="button"
        data-no-dnd="true"
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete?.(note.id, !isDone, e);
          playSound(isDone ? "pop" : "click");
        }}
        title={isDone ? "Marcar como pendiente" : "Marcar como completada"}
        className={`w-4 h-4 rounded-[6px] flex items-center justify-center transition-all cursor-pointer shrink-0 ${
          isDone
            ? "bg-white text-slate-950 border border-white shadow-sm"
            : hasSolidColor
            ? "border border-white/70 bg-white/10 text-white hover:bg-white/25 hover:border-white hover:scale-105"
            : isNightMode
            ? "border border-white/40 bg-white/5 hover:border-white text-white hover:scale-105"
            : "border border-slate-400 hover:border-slate-800 hover:scale-105"
        }`}
      >
        {isDone && <Check className="w-2.5 h-2.5 stroke-[3] text-slate-950" />}
      </button>

      {/* 3. Contenido Central: Título + Nombre del Proyecto a la derecha en 12px regular */}
      <div className="flex-1 min-w-0 flex items-center gap-2 pointer-events-none overflow-hidden">
        <h4
          className={`text-[15px] font-bold leading-snug truncate shrink-0 max-w-[65%] ${
            isDone
              ? "line-through text-white/40"
              : hasSolidColor
              ? "text-white drop-shadow-sm"
              : isNightMode
              ? "text-[#ffffffd6] group-hover:text-white"
              : "text-slate-900"
          }`}
        >
          {note.title || "Nota sin título"}
        </h4>

        {attachedDisplayTitle && (
          <span
            className={`text-[12px] font-normal truncate tracking-normal ${
              isDone
                ? "line-through text-white/30"
                : hasSolidColor
                ? "text-white/80"
                : isNightMode
                ? "text-white/45"
                : "text-slate-500"
            }`}
            title={`Proyecto: ${attachedDisplayTitle}`}
          >
            {attachedDisplayTitle}
          </span>
        )}
      </div>

      {/* 4. Botón circular con 'X' a la derecha para eliminar nota */}
      {onDelete && (
        <button
          type="button"
          data-no-dnd="true"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(note.id, e);
            playSound("trash");
          }}
          title="Eliminar nota"
          className={`w-5 h-5 rounded-full flex items-center justify-center transition-all cursor-pointer opacity-0 group-hover:opacity-100 shrink-0 ${
            hasSolidColor
              ? "bg-black/25 hover:bg-black/45 text-white/80 hover:text-white border-0"
              : isNightMode
              ? "bg-white/10 hover:bg-rose-500/20 text-white/50 hover:text-rose-400 border border-white/10 hover:border-rose-500/30"
              : "bg-slate-200 hover:bg-rose-100 text-slate-500 hover:text-rose-600 border border-slate-300 hover:border-rose-300"
          }`}
        >
          <X className="w-3 h-3 stroke-[2.5]" />
        </button>
      )}
    </motion.div>
  );
}

