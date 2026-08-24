"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Search, 
  Plus, 
  Filter, 
  DollarSign, 
  Briefcase, 
  CheckCircle2, 
  LayoutGrid,
  Table,
  Sparkles,
  Loader2
} from 'lucide-react';
import { Project } from './ProjectDashboard';
import { useClients, INITIAL_CLIENTS } from '@/hooks/useClients';
import { ClientCardItem, ClientListItem } from '@/components/views/ClientCard';
import { EntityDetailView } from '@/components/views/EntityDetailView';
import CreateClientModal from './CreateClientModal';
import type { Client } from '@/lib/types';
import { playSound } from '../utils/audio';
import { cn } from '@/lib/utils';

export type ClientItem = Client;
export { INITIAL_CLIENTS };

export interface ClientsDashboardProps {
  projects: Project[];
  onUpdateProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  onSelectProject?: (projectId: number | string) => void;
  onCreateProject?: (preselectedClientId?: string) => void;
  defaultToFirstClient?: boolean;
  isNeumorphic?: boolean;
  isNightMode?: boolean;
}

export function ClientsDashboard({
  projects = [],
  onUpdateProjects,
  onSelectProject,
  onCreateProject,
  defaultToFirstClient = false,
  isNeumorphic = false,
  isNightMode = true,
}: ClientsDashboardProps) {
  const { clients, isLoading, createClient, updateClient, deleteClient } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Todos");
  const [displayMode, setDisplayMode] = useState<"grid" | "list">("grid");
  const [cardVariant, setCardVariant] = useState<"cover" | "full">("cover");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Auto-seleccionar primer cliente si defaultToFirstClient está activo
  useEffect(() => {
    if (defaultToFirstClient && !selectedClientId && clients.length > 0) {
      setSelectedClientId(String(clients[0].id));
    }
  }, [defaultToFirstClient, selectedClientId, clients]);

  const filterTabs = ["Todos", "VIP", "Activo", "Pausa", "Prospecto"];

  // Filtered clients list
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const matchSearch = 
        (c.nombre || c.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.industria && c.industria.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.contacto?.persona && c.contacto.persona.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = 
        statusFilter === "Todos" || 
        (c.status && c.status.toLowerCase() === statusFilter.toLowerCase()) ||
        (c.estado_relacion && c.estado_relacion.toLowerCase() === statusFilter.toLowerCase());

      return matchSearch && matchStatus;
    });
  }, [clients, searchQuery, statusFilter]);

  // Selected client object
  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return clients.find((c) => String(c.id) === String(selectedClientId)) || null;
  }, [clients, selectedClientId]);

  // If a client is selected, render the Work 1-mirrored Clientes V2 Detail View
  if (selectedClient) {
    return (
      <EntityDetailView
        entity={selectedClient}
        entityType="client"
        allProjects={projects}
        allClients={clients}
        onSelectClient={(newClientId) => {
          setSelectedClientId(String(newClientId));
          playSound('click');
        }}
        onBack={() => {
          setSelectedClientId(null);
          playSound('click');
        }}
        onOpenProject={(projId) => {
          if (onSelectProject) onSelectProject(projId);
        }}
        onCreateProject={(cliId) => {
          if (onCreateProject) {
            onCreateProject(cliId);
          }
        }}
        onUpdateEntity={async (updated) => {
          await updateClient(selectedClient.id, updated);
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#ffffff6b]" />
        <span className="text-xs font-semibold text-[#ffffff6b]">Cargando clientes...</span>
      </div>
    );
  }

  // Summary Metrics
  const totalClients = clients.length;
  const activeClientsCount = clients.filter((c) => (c.status || "").toLowerCase().includes("activo") || (c.status || "").toLowerCase().includes("vip")).length;
  const totalContractRevenue = clients.reduce((acc, c) => {
    const monto = c.finanzas?.monto_contrato ?? Number(c.totalBudget?.replace(/[^0-9.-]+/g, "")) ?? 0;
    return acc + monto;
  }, 0);

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto custom-scrollbar bg-transparent text-[#ffffffd6]">
      {/* ── 1. KPI SUMMARY BAR (Superficies Sólidas #181818 & Trazos Finos) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="p-5 rounded-2xl bg-[#181818] border border-white/10 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffffff6b]">Marcas Registradas</span>
            <Building2 className="w-4 h-4 text-[#ffffff6b]" />
          </div>
          <div className="text-3xl font-bold text-[#ffffffd6] mt-2">{totalClients} clientes</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#181818] border border-white/10 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/80">Clientes Activos</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-emerald-400 mt-2">{activeClientsCount} en operación</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#181818] border border-white/10 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400/80">Valor de Cartera</span>
            <DollarSign className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-blue-400 mt-2">${totalContractRevenue.toLocaleString()}</div>
        </div>
      </div>

      {/* ── 2. CONTROLS BAR: Search, Filter Tabs & Switchers ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        {/* Left: Filter Tabs & Search */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Buscador Integrado */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#ffffff6b]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar marca o industria..."
              className="w-full bg-[#181818] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-[#ffffffd6] placeholder:text-[#ffffff40] outline-none focus:border-white/30 shadow-sm"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#181818] border border-white/10">
            {filterTabs.map((tab) => {
              const isActive = statusFilter === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab);
                    playSound('click');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-white/15 text-white shadow-sm"
                      : "text-[#ffffff6b] hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Switcher Portada/Color + Grid/List + Botón Registrar Cliente */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {/* Switcher de Estilo de Tarjeta (Portada vs Color Completo) */}
          <div className="flex items-center rounded-xl p-1 bg-[#181818] border border-white/10 text-xs font-bold">
            <button
              onClick={() => {
                setCardVariant("cover");
                playSound('click');
              }}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-colors text-[11px]",
                cardVariant === "cover" ? "bg-white/15 text-white" : "text-[#ffffff6b] hover:text-white"
              )}
              title="Estilo Portada (Tarjetas con cubierta superior)"
            >
              Portada
            </button>
            <button
              onClick={() => {
                setCardVariant("full");
                playSound('click');
              }}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-colors text-[11px]",
                cardVariant === "full" ? "bg-white/15 text-white" : "text-[#ffffff6b] hover:text-white"
              )}
              title="Estilo Color Completo"
            >
              Color
            </button>
          </div>

          {/* Switcher de Vista Grid / Lista */}
          <div className="flex items-center rounded-xl p-1 bg-[#181818] border border-white/10">
            <button
              onClick={() => {
                setDisplayMode("grid");
                playSound('click');
              }}
              className={cn(
                "p-1.5 rounded-lg text-xs transition-colors",
                displayMode === "grid" ? "bg-white/15 text-white" : "text-[#ffffff6b] hover:text-white"
              )}
              title="Vista de Cuadrícula Bento"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setDisplayMode("list");
                playSound('click');
              }}
              className={cn(
                "p-1.5 rounded-lg text-xs transition-colors",
                displayMode === "list" ? "bg-white/15 text-white" : "text-[#ffffff6b] hover:text-white"
              )}
              title="Vista Compacta de Lista"
            >
              <Table className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsCreateModalOpen(true);
              playSound('click');
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-white/90 text-black text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Cliente</span>
          </button>
        </div>
      </div>

      {/* ── 3. CLIENT CARDS GRID O LISTA (IDÉNTICO A PROYECTOS) ── */}
      {filteredClients.length > 0 ? (
        displayMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-0">
            {filteredClients.map((client) => {
              const clientNameLower = (client.nombre || client.name || "").toLowerCase();
              const clientProjects = projects.filter((p) => {
                const pClientId = String((p as any).cliente_ids?.[0] || (p as any).cliente_id || (p as any).client || "");
                return pClientId === String(client.id) || ((p as any).client && (p as any).client.toLowerCase() === clientNameLower);
              });

              return (
                <ClientCardItem
                  key={client.id}
                  client={client}
                  clientProjects={clientProjects}
                  cardStyle={cardVariant}
                  onOpenDetail={(c) => {
                    setSelectedClientId(c.id);
                    playSound('click');
                  }}
                  onDeleteClient={async (c) => {
                    await deleteClient(c.id);
                  }}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredClients.map((client) => {
              const clientNameLower = (client.nombre || client.name || "").toLowerCase();
              const clientProjects = projects.filter((p) => {
                const pClientId = String((p as any).cliente_ids?.[0] || (p as any).cliente_id || (p as any).client || "");
                return pClientId === String(client.id) || ((p as any).client && (p as any).client.toLowerCase() === clientNameLower);
              });

              return (
                <ClientListItem
                  key={client.id}
                  client={client}
                  clientProjects={clientProjects}
                  onOpenDetail={(c) => {
                    setSelectedClientId(c.id);
                    playSound('click');
                  }}
                />
              );
            })}
          </div>
        )
      ) : (
        <div className="py-24 flex flex-col items-center justify-center text-center opacity-40">
          <Building2 className="w-14 h-14 mb-4 text-[#ffffff6b]" />
          <h4 className="text-xl font-bold text-[#ffffffd6]">No se encontraron clientes</h4>
          <p className="text-xs text-[#ffffff6b] mt-1 max-w-sm">
            {searchQuery
              ? `No hay clientes que coincidan con "${searchQuery}".`
              : "Registra tu primera marca cliente para comenzar a gestionar sus proyectos y finanzas."}
          </p>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-4 px-5 py-2.5 rounded-xl bg-white hover:bg-white/90 text-black text-xs font-bold uppercase tracking-wider transition-all"
          >
            + Registrar Nuevo Cliente
          </button>
        </div>
      )}

      {/* Create Client Modal */}
      <CreateClientModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onClientCreated={(newCli) => {
          setIsCreateModalOpen(false);
          playSound('pop');
        }}
      />
    </div>
  );
}
