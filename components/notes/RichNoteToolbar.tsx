"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  RotateCcw,
  ChevronDown,
  Check,
  Heading1,
  Heading2,
  Pilcrow
} from "lucide-react";
import { playSound } from "@/app/taski/utils/audio";

export interface ActiveFormatsState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeThrough: boolean;
  list: boolean;
  numbered: boolean;
  quote: boolean;
}

export interface RichNoteToolbarProps {
  currentBlockType?: "p" | "h1" | "h2" | "ul" | "ol" | "blockquote";
  onBlockTypeChange?: (type: "p" | "h1" | "h2" | "ul" | "ol" | "blockquote") => void;
  noteType?: any;
  onNoteTypeChange?: (type: any) => void;
  onFormatClick?: (format: "bold" | "italic" | "underline" | "strikeThrough" | "list" | "numbered" | "quote") => void;
  activeFormats?: Partial<ActiveFormatsState>;
  onResetNote?: () => void;
  onAiAction?: (actionType: any) => void;
  isNightMode?: boolean;
  className?: string;
  rightSlot?: React.ReactNode;
}

export function RichNoteToolbar({
  currentBlockType = "p",
  onBlockTypeChange,
  noteType,
  onNoteTypeChange,
  onFormatClick,
  activeFormats = {},
  onResetNote,
  isNightMode = true,
  className = "",
  rightSlot,
}: RichNoteToolbarProps) {
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const blockOptions: { id: "p" | "h1" | "h2" | "ul" | "ol" | "blockquote"; label: string; icon: React.ReactNode }[] = [
    { id: "p", label: "Texto", icon: <Pilcrow className="w-4 h-4 text-white/70" /> },
    { id: "h1", label: "Título", icon: <Heading1 className="w-4 h-4 text-white/70" /> },
    { id: "h2", label: "Subtítulo", icon: <Heading2 className="w-4 h-4 text-white/70" /> },
    { id: "ul", label: "Lista de viñetas", icon: <List className="w-4 h-4 text-white/70" /> },
    { id: "ol", label: "Lista numerada", icon: <ListOrdered className="w-4 h-4 text-white/70" /> },
    { id: "blockquote", label: "Cita", icon: <Quote className="w-4 h-4 text-white/70" /> },
  ];

  const currentBlockLabel = blockOptions.find((t) => t.id === currentBlockType)?.label || "Texto";

  return (
    <div
      className={`w-full flex items-center gap-1.5 flex-nowrap py-1 text-[13px] ${className}`}
    >
      {/* 1. Selector de Estilo de Bloque (Texto, Título, Subtítulo, etc.) */}
      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => {
            setIsTypeDropdownOpen(!isTypeDropdownOpen);
            playSound("pop");
          }}
          className={`h-7 px-2.5 rounded-lg border text-[13px] font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
            isNightMode
              ? "bg-white/5 border-white/10 text-[#ffffffd6] hover:bg-white/10"
              : "bg-white border-slate-300 text-slate-800 hover:bg-slate-50"
          }`}
        >
          <span>{currentBlockLabel}</span>
          <ChevronDown className="w-3 h-3 text-white/40" />
        </button>

        {isTypeDropdownOpen && (
          <div
            className={`absolute left-0 top-full mt-1.5 z-50 w-48 p-1 rounded-2xl border shadow-2xl backdrop-blur-xl animate-fadeIn ${
              isNightMode ? "bg-[#1c1c1f] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            {blockOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onBlockTypeChange?.(opt.id);
                  onNoteTypeChange?.(opt.id);
                  setIsTypeDropdownOpen(false);
                  playSound("click");
                }}
                className={`w-full px-3 py-2 rounded-xl text-[13px] font-medium flex items-center justify-between transition-colors cursor-pointer ${
                  currentBlockType === opt.id
                    ? isNightMode
                      ? "bg-white/10 text-white font-bold"
                      : "bg-slate-100 text-slate-900 font-bold"
                    : isNightMode
                    ? "hover:bg-white/5 text-white/70 hover:text-white"
                    : "hover:bg-slate-50 text-slate-600 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2">
                  {opt.icon}
                  <span>{opt.label}</span>
                </div>
                {currentBlockType === opt.id && <Check className="w-4 h-4 text-white" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={`h-4 w-px mx-0.5 shrink-0 ${isNightMode ? "bg-white/10" : "bg-slate-300"}`} />

      {/* 2. Botones de Formato WYSIWYG */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          title="Negrita (Cmd+B)"
          onClick={() => {
            onFormatClick?.("bold");
            playSound("click");
          }}
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
            activeFormats.bold
              ? "bg-white/20 text-white font-bold"
              : isNightMode
              ? "hover:bg-white/10 text-white/70 hover:text-white"
              : "hover:bg-slate-200 text-slate-700"
          }`}
        >
          <Bold className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>

        <button
          type="button"
          title="Cursiva (Cmd+I)"
          onClick={() => {
            onFormatClick?.("italic");
            playSound("click");
          }}
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
            activeFormats.italic
              ? "bg-white/20 text-white"
              : isNightMode
              ? "hover:bg-white/10 text-white/70 hover:text-white"
              : "hover:bg-slate-200 text-slate-700"
          }`}
        >
          <Italic className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>

        <button
          type="button"
          title="Subrayado (Cmd+U)"
          onClick={() => {
            onFormatClick?.("underline");
            playSound("click");
          }}
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
            activeFormats.underline
              ? "bg-white/20 text-white"
              : isNightMode
              ? "hover:bg-white/10 text-white/70 hover:text-white"
              : "hover:bg-slate-200 text-slate-700"
          }`}
        >
          <Underline className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>

        <button
          type="button"
          title="Tachado"
          onClick={() => {
            onFormatClick?.("strikeThrough");
            playSound("click");
          }}
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
            activeFormats.strikeThrough
              ? "bg-white/20 text-white"
              : isNightMode
              ? "hover:bg-white/10 text-white/70 hover:text-white"
              : "hover:bg-slate-200 text-slate-700"
          }`}
        >
          <Strikethrough className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>

        <button
          type="button"
          title="Lista con viñetas"
          onClick={() => {
            onFormatClick?.("list");
            playSound("click");
          }}
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
            activeFormats.list
              ? "bg-white/20 text-white"
              : isNightMode
              ? "hover:bg-white/10 text-white/70 hover:text-white"
              : "hover:bg-slate-200 text-slate-700"
          }`}
        >
          <List className="w-3.5 h-3.5 stroke-[2.2]" />
        </button>

        <button
          type="button"
          title="Lista numerada"
          onClick={() => {
            onFormatClick?.("numbered");
            playSound("click");
          }}
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
            activeFormats.numbered
              ? "bg-white/20 text-white"
              : isNightMode
              ? "hover:bg-white/10 text-white/70 hover:text-white"
              : "hover:bg-slate-200 text-slate-700"
          }`}
        >
          <ListOrdered className="w-3.5 h-3.5 stroke-[2.2]" />
        </button>

        <button
          type="button"
          title="Cita"
          onClick={() => {
            onFormatClick?.("quote");
            playSound("click");
          }}
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
            activeFormats.quote
              ? "bg-white/20 text-white"
              : isNightMode
              ? "hover:bg-white/10 text-white/70 hover:text-white"
              : "hover:bg-slate-200 text-slate-700"
          }`}
        >
          <Quote className="w-3.5 h-3.5 stroke-[2.2]" />
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1 min-w-[8px]" />

      {/* Right Slot (e.g. Botón de vinculación a tarea/proyecto) */}
      {rightSlot}

      {/* 3. Reset opcional si existe */}
      {onResetNote && (
        <button
          type="button"
          onClick={() => {
            onResetNote();
            playSound("pop");
          }}
          title="Vaciar nota y empezar de nuevo"
          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
            isNightMode ? "hover:bg-white/10 text-white/50 hover:text-white" : "hover:bg-slate-200 text-slate-500 hover:text-slate-900"
          }`}
        >
          <RotateCcw className="w-4 h-4 stroke-[2.2]" />
        </button>
      )}
    </div>
  );
}
