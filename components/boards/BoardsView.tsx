"use client";

import React, { useState, useMemo } from "react";
import { Plus, Search, LayoutDashboard, Loader2, ArrowUpDown } from "lucide-react";
import { useBoards } from "@/hooks/useBoards";
import { BoardCard } from "./BoardCard";
import { InfiniteCanvasBoard } from "./canvas/InfiniteCanvasBoard";
import { playSound } from "@/app/taski/utils/audio";

export function BoardsView() {
  const {
    boards,
    isLoading,
    activeBoardId,
    activeBoard,
    setActiveBoardId,
    createBoard,
    updateBoard,
    updateBoardElements,
    deleteBoard,
    saveStatus,
  } = useBoards();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recientes" | "nombre">("recientes");

  // Filtrado y ordenamiento de tableros
  const filteredBoards = useMemo(() => {
    return boards
      .filter((b) => (b.title || "Sin título").toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === "nombre") {
          return (a.title || "Sin título").localeCompare(b.title || "Sin título");
        }
        const tA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : new Date(a.updatedAt || 0).getTime();
        const tB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : new Date(b.updatedAt || 0).getTime();
        return tB - tA;
      });
  }, [boards, searchQuery, sortBy]);

  // Si hay un tablero activo, mostramos el Canvas Infinito a pantalla completa
  if (activeBoardId && activeBoard) {
    return (
      <InfiniteCanvasBoard
        board={activeBoard}
        boards={boards}
        onSelectBoard={(id) => setActiveBoardId(id)}
        onCreateBoard={async () => {
          const newId = await createBoard("Sin título");
          setActiveBoardId(newId);
        }}
        onUpdateTitle={(title) => updateBoard(activeBoard.id, { title })}
        onUpdateElements={(elements) => updateBoardElements(activeBoard.id, elements)}
        onBackToCatalog={() => setActiveBoardId(null)}
        saveStatus={saveStatus}
      />
    );
  }

  if (isLoading && boards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 bg-transparent">
        <Loader2 className="w-8 h-8 animate-spin text-[#ffffff6b]" />
        <p className="text-xs font-bold text-[#ffffff6b]">Cargando tableros...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full min-h-0 overflow-hidden bg-transparent text-[#ffffffd6] px-6 pt-[2.0625rem] pb-5">
      {/* ── BARRA SUPERIOR DE FILTROS & BÚSQUEDA ── */}
      <div className="flex items-center justify-between pb-4 shrink-0 px-2 select-none">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5 text-white/70" />
          <h1 className="text-xl font-bold tracking-tight text-[#ffffffd6]">
            Tableros
          </h1>
          <span className="text-[12px] font-medium text-white/40 ml-1">
            ({filteredBoards.length})
          </span>
        </div>

        {/* Buscador y selector de orden */}
        <div className="flex items-center gap-2.5">
          {/* Input de búsqueda */}
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-white/40 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar tableros..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-56 h-9 pl-9 pr-3 rounded-xl bg-white/[0.04] border border-white/10 text-[13px] text-white placeholder-white/40 outline-none focus:border-white/20 transition-all"
            />
          </div>

          {/* Ordenar */}
          <button
            type="button"
            onClick={() => {
              setSortBy((prev) => (prev === "recientes" ? "nombre" : "recientes"));
              playSound("click");
            }}
            className="h-9 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[12px] font-medium text-white/70 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Cambiar orden"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortBy === "recientes" ? "Recientes" : "Alfabético"}</span>
          </button>
        </div>
      </div>

      {/* ── CATÁLOGO DE TABLEROS EN CUADRÍCULA (12 COLUMNAS COMPLETAS) ── */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0">
          {/* Tarjeta de Acción: "+ Nuevo tablero" (Idéntica a la de proyectos) */}
          <div className="p-2 h-[220px]">
            <div
              onClick={async () => {
                playSound("click");
                const newId = await createBoard("Sin título");
                setActiveBoardId(newId);
              }}
              className="w-full h-full relative flex flex-col items-center justify-center p-5 rounded-2xl border border-dashed border-white/20 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/40 transition-all cursor-pointer group select-none shadow-sm"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 group-hover:bg-white/20 group-hover:scale-110 transition-all mb-3 text-white">
                <Plus className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div className="text-[14px] font-semibold text-white/90 group-hover:text-white text-center">
                Nuevo tablero
              </div>
              <p className="text-[12px] text-white/40 mt-1 text-center font-normal">
                Crear lienzo infinito en blanco
              </p>
            </div>
          </div>

          {/* Tarjetas de tableros existentes */}
          {filteredBoards.map((b) => (
            <BoardCard
              key={b.id}
              board={b}
              onOpen={(id) => {
                setActiveBoardId(id);
                playSound("click");
              }}
              onDelete={(id) => {
                deleteBoard(id);
                playSound("trash");
              }}
            />
          ))}
        </div>

        {/* Estado Vacío */}
        {filteredBoards.length === 0 && searchQuery && (
          <div className="py-24 flex flex-col items-center justify-center text-center opacity-40">
            <LayoutDashboard className="w-14 h-14 mb-4 text-[#ffffff6b]" />
            <h4 className="text-xl font-bold text-[#ffffffd6]">No se encontraron tableros</h4>
            <p className="text-xs text-[#ffffff6b] mt-1 max-w-sm">
              No hay tableros que coincidan con &quot;{searchQuery}&quot;.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
