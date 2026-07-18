"use client";

import { useState } from "react";
import { useData } from "@/hooks/useData";
import { Loader2, Plus, User, Search, LayoutGrid, List } from "lucide-react";
import { useUIStore } from "@/lib/store";
import { PACKAGES } from "@/lib/taski-data";

export function ClientsView() {
  const { data, isLoading } = useData();
  const openModal = useUIStore((s) => s.openModal);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const clientes = (data?.clientes ?? []).filter(c => 
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    c.potencial.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Clientes</h2>
          <p className="text-sm" style={{ color: "var(--txt3)" }}>
            Gestiona tu cartera de clientes y leads activos
          </p>
        </div>
        <button 
          onClick={() => openModal({ type: "client", id: "new" })}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: "var(--blue)", color: "#fff" }}
        >
          <Plus className="w-4 h-4" />
          Registrar Cliente
        </button>
      </div>

      {/* Filters bar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o estado..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass text-sm font-medium outline-none focus:border-white/20 transition-all"
          />
        </div>
        <div className="flex items-center glass p-1 rounded-xl">
          <button 
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-white/10 text-white" : "text-white/20 hover:text-white/40"}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-white/10 text-white" : "text-white/20 hover:text-white/40"}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientes.map((c) => (
              <div 
                key={c.id}
                onClick={() => openModal({ type: "client", id: c.id })}
                className="group relative p-5 rounded-2xl glass hover:border-white/20 transition-all cursor-pointer overflow-hidden"
              >
                {/* Visual accent */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-3xl -mr-12 -mt-12 group-hover:bg-blue-500/10 transition-all" />

                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-full glass border-white/5 flex items-center justify-center text-sm font-black text-blue-400">
                    {c.nombre[0].toUpperCase()}
                  </div>
                  <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                    c.potencial === "Cliente activo" ? "bg-green-500/10 text-green-400 border border-green-500/20" : 
                    "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                  }`}>
                    {c.potencial || "Lead"}
                  </div>
                </div>

                <h3 className="text-lg font-black tracking-tight mb-1 group-hover:text-blue-400 transition-colors">
                  {c.nombre}
                </h3>
                <p className="text-xs mb-4" style={{ color: "var(--txt3)" }}>
                  {c.fuente ? `Origen: ${c.fuente}` : "Sin origen especificado"}
                </p>

                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                  <div className="flex-1">
                    <div className="text-[10px] uppercase tracking-widest font-black mb-1" style={{ color: "var(--txt3)" }}>
                      Proyectos
                    </div>
                    <div className="text-sm font-bold">
                      {data?.proyectos.filter(p => p.cliente_ids?.includes(c.id)).length || 0} activos
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] uppercase tracking-widest font-black mb-1" style={{ color: "var(--txt3)" }}>
                      Inversión
                    </div>
                    <div className="text-sm font-bold">
                      ${((data?.proyectos.filter(p => p.cliente_ids?.includes(c.id)).reduce((sum, p) => sum + (p.costo || 0), 0) ?? 0) / 1000).toFixed(0)}k
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/5">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Cliente</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Estado</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Fuente</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Instagram</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {clientes.map((c) => (
                  <tr 
                    key={c.id} 
                    onClick={() => openModal({ type: "client", id: c.id })}
                    className="hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full glass flex items-center justify-center text-xs font-bold text-blue-400">
                          {c.nombre[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-bold group-hover:text-blue-400 transition-colors">{c.nombre}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        c.potencial === "Cliente activo" ? "text-green-400" : "text-orange-400"
                      }`}>
                        {c.potencial}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-white/40">{c.fuente}</td>
                    <td className="px-6 py-4 text-xs font-medium text-blue-400 underline">{c.instagram}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {clientes.length === 0 && !isLoading && (
          <div className="py-24 flex flex-col items-center justify-center text-center opacity-30">
            <User className="w-12 h-12 mb-4" />
            <h4 className="text-xl font-black">Sin resultados</h4>
            <p className="text-sm">No encontramos clientes que coincidan con la búsqueda.</p>
          </div>
        )}
      </div>
    </div>
  );
}
