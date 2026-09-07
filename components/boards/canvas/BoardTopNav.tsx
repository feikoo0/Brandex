"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Pencil, Check, Plus, Search, Loader2, LayoutDashboard } from "lucide-react";
import { playSound } from "@/app/taski/utils/audio";
import type { Board } from "@/lib/types/board";

interface BoardTopNavProps {
  board: Board;
  boards: Board[];
  onSelectBoard: (boardId: string) => void;
  onCreateBoard: () => void;
  onUpdateTitle: (newTitle: string) => void;
  onBackToCatalog: () => void;
  saveStatus?: "saved" | "saving" | "error";
}

function getInitials(text: string): string {
  if (!text) return "ST";
  const words = text.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return text.slice(0, 2).toUpperCase();
}

export function BoardTopNav({
  board,
  boards,
  onSelectBoard,
  onCreateBoard,
  onUpdateTitle,
  onBackToCatalog,
  saveStatus = "saved",
}: BoardTopNavProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(board.title || "Sin título");
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempTitle(board.title || "Sin título");
  }, [board.title]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

  useEffect(() => {
    if (isEditingTitle && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleFinishTitleEdit = () => {
    setIsEditingTitle(false);
    const trimmed = tempTitle.trim() || "Sin título";
    if (trimmed !== board.title) {
      onUpdateTitle(trimmed);
      playSound("pop");
    }
  };

  const filteredBoards = boards.filter((b) =>
    (b.title || "Sin título").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="absolute top-[2.0625rem] left-6 z-50 flex items-center gap-2 select-none">
      {/* Rectángulo Contenedor del Título del Tablero */}
      <div ref={dropdownRef} className="relative flex items-center">
        {isEditingTitle ? (
          <div className="flex items-center px-3 py-1.5 h-10 rounded-xl bg-[#222222] border border-white/20 shadow-lg">
            <input
              ref={inputRef}
              type="text"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={handleFinishTitleEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleFinishTitleEdit();
                if (e.key === "Escape") {
                  setTempTitle(board.title || "Sin título");
                  setIsEditingTitle(false);
                }
              }}
              className="bg-transparent text-[14px] font-semibold text-white outline-none w-48"
            />
          </div>
        ) : (
          <div className="group relative flex items-center">
            <button
              type="button"
              onClick={() => {
                setIsDropdownOpen((prev) => !prev);
                playSound("click");
              }}
              className="h-10 px-3.5 rounded-xl bg-[#1c1c1e] hover:bg-white/10 border border-white/10 flex items-center gap-2 text-white/90 hover:text-white transition-all duration-150 shadow-lg cursor-pointer"
            >
              <span className="text-[14px] font-semibold tracking-tight max-w-[200px] truncate">
                {board.title || "Sin título"}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-white/50 transition-transform duration-200 ${
                  isDropdownOpen ? "rotate-180 text-white" : ""
                }`}
              />
            </button>

            {/* Lápiz para editar inline al hacer hover */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingTitle(true);
                playSound("click");
              }}
              className="opacity-0 group-hover:opacity-100 -ml-2 mr-1 w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-opacity"
              title="Renombrar tablero"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 3. Indicador | Guardado */}
        <div className="flex items-center gap-2 pl-3 text-[13px] font-normal text-white/40">
          <span className="text-white/20">|</span>
          {saveStatus === "saving" ? (
            <span className="flex items-center gap-1.5 text-amber-400/80">
              <Loader2 className="w-3 h-3 animate-spin" />
              Guardando...
            </span>
          ) : (
            <span className="text-white/40">Guardado</span>
          )}
        </div>

        {/* 4. Dropdown "Buscar tableros" (Idéntico a la Imagen 2) */}
        <AnimatePresence>
          {isDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute top-12 left-0 w-[280px] bg-[#1c1c1e] border border-white/10 rounded-2xl p-2 shadow-2xl shadow-black/80 backdrop-blur-xl z-50 flex flex-col gap-1.5"
            >
              {/* Input buscador */}
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 w-4 h-4 text-white/40 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar tableros"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-xl bg-white/[0.05] border border-white/10 text-[13px] text-white placeholder-white/40 outline-none focus:border-white/25 transition-colors"
                />
              </div>

              {/* Lista de tableros */}
              <div className="max-h-[200px] overflow-y-auto custom-scrollbar flex flex-col gap-0.5 py-1">
                {filteredBoards.map((b) => {
                  const isSelected = b.id === board.id;
                  const initials = getInitials(b.title);

                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        onSelectBoard(b.id);
                        setIsDropdownOpen(false);
                        playSound("click");
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer select-none text-left ${
                        isSelected ? "bg-white/10 text-white" : "hover:bg-white/5 text-white/80"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Avatar cuadrado con iniciales */}
                        <div className="w-7 h-7 rounded-lg bg-[#d97706] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <span className="text-[13px] font-medium truncate">
                          {b.title || "Sin título"}
                        </span>
                      </div>

                      {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                    </button>
                  );
                })}

                {filteredBoards.length === 0 && (
                  <div className="py-4 text-center text-[12px] text-white/40">
                    No se encontraron tableros
                  </div>
                )}
              </div>

              <div className="w-full h-px bg-white/10 my-0.5" />

              {/* Botón "Ver todos los tableros" */}
              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  onBackToCatalog();
                  playSound("click");
                }}
                className="w-full h-9 flex items-center gap-2 px-2.5 rounded-xl text-[13px] font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4 text-white/50" />
                <span>Ver todos los tableros</span>
              </button>

              {/* Botón "+ Nuevo tablero" */}
              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  onCreateBoard();
                  playSound("pop");
                }}
                className="w-full h-9 flex items-center gap-2 px-2.5 rounded-xl text-[13px] font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 text-white/60" />
                <span>Nuevo tablero</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
