"use client";

import { useState } from "react";
import { useData } from "@/hooks/useData";
import { Loader2, Plus, Building2, Search, LayoutGrid, Table } from "lucide-react";
import { useUIStore } from "@/lib/store";
import { ClientCardItem, ClientListItem } from "./ClientCard";
import { cn } from "@/lib/utils";

export function ClientsView() {
  const { data, isLoading } = useData();
  const openModal = useUIStore((s) => s.openModal);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [cardVariant, setCardVariant] = useState<"cover" | "full">("cover");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#ffffff6b]" />
      </div>
    );
  }

  const clientes = (data?.clientes ?? []).filter(c => 
    (c.nombre || c.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.potencial || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.status || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden text-[#ffffffd6]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#ffffffd6]">Directorio de Clientes</h2>
          <p className="text-xs text-[#ffffff6b] mt-1">
            Gestiona marcas asociadas, contratos y proyectos activos
          </p>
        </div>
        <button 
          onClick={() => openModal({ type: "client", id: "new" })}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all bg-white hover:bg-white/90 text-black shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Registrar Cliente
        </button>
      </div>

      {/* Filters & switchers bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ffffff6b]" />
          <input 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o estado..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#181818] border border-white/10 text-xs font-semibold text-[#ffffffd6] placeholder:text-[#ffffff40] outline-none focus:border-white/30 transition-all"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Switcher Portada / Color */}
          <div className="flex items-center rounded-xl p-1 bg-[#181818] border border-white/10 text-xs font-bold">
            <button 
              onClick={() => setCardVariant("cover")}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-colors text-[11px]",
                cardVariant === "cover" ? "bg-white/15 text-white" : "text-[#ffffff6b] hover:text-white"
              )}
            >
              Portada
            </button>
            <button 
              onClick={() => setCardVariant("full")}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-colors text-[11px]",
                cardVariant === "full" ? "bg-white/15 text-white" : "text-[#ffffff6b] hover:text-white"
              )}
            >
              Color
            </button>
          </div>

          {/* Switcher Grid / Lista */}
          <div className="flex items-center rounded-xl p-1 bg-[#181818] border border-white/10">
            <button 
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1.5 rounded-lg text-xs transition-colors",
                viewMode === "grid" ? "bg-white/15 text-white" : "text-[#ffffff6b] hover:text-white"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode("list")}
              className={cn(
                "p-1.5 rounded-lg text-xs transition-colors",
                viewMode === "list" ? "bg-white/15 text-white" : "text-[#ffffff6b] hover:text-white"
              )}
            >
              <Table className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {clientes.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-0">
              {clientes.map((c) => (
                <ClientCardItem 
                  key={c.id}
                  client={c}
                  cardStyle={cardVariant}
                  onOpenDetail={() => openModal({ type: "client", id: c.id })}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {clientes.map((c) => (
                <ClientListItem 
                  key={c.id}
                  client={c}
                  onOpenDetail={() => openModal({ type: "client", id: c.id })}
                />
              ))}
            </div>
          )
        ) : (
          <div className="py-24 flex flex-col items-center justify-center text-center opacity-40">
            <Building2 className="w-14 h-14 mb-4 text-[#ffffff6b]" />
            <h4 className="text-xl font-bold text-[#ffffffd6]">Sin resultados</h4>
            <p className="text-xs text-[#ffffff6b] mt-1">No encontramos clientes que coincidan con la búsqueda.</p>
          </div>
        )}
      </div>
    </div>
  );
}
