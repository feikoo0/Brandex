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
      
      {/* 12-Column Grid Container (Idéntico a Work / HomeDashboard y Proyectos) */}
      <div className="w-full grid grid-cols-12 gap-5 items-stretch max-w-full">
        
        {/* Left Section (3 Columns): Rectángulo Reservado de Control & Resumen */}
        <div className="col-span-3 flex flex-col min-h-[900px] rounded-[28px] bg-[#121212] border border-white/[0.08] shadow-sm overflow-hidden">
          {/* Métricas KPI de Ancho Total (Monocromático, Limpio y Sin Íconos) */}
          <div className="w-full flex flex-col">
            <div className="w-full px-5 py-4 border-b border-white/10 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffffff6b]">Clientes Activos</span>
              <div className="text-3xl font-bold text-[#ffffffd6] mt-1">{activeClientsCount}</div>
            </div>

            <div className="w-full px-5 py-4 border-b border-white/10 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffffff6b]">Valor de Cartera</span>
              <div className="text-3xl font-bold text-[#ffffffd6] mt-1">
                ${totalContractRevenue.toLocaleString()}
              </div>
            </div>

            <div className="w-full px-5 py-4 border-b border-white/10 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffffff6b]">Total Marcas</span>
              <div className="text-3xl font-bold text-[#ffffffd6] mt-1">{totalClients}</div>
            </div>
          </div>

          {/* Filtros Rápidos por Estado */}
          <div className="p-5 flex flex-col gap-2 mt-auto">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#ffffff6b] px-1">Filtrar por Estado</span>
            <div className="flex flex-col gap-1">
              {filterTabs.map((tab) => {
                const isSelected = statusFilter === tab;
                const count = tab === "Todos"
                  ? clients.length
                  : clients.filter((c) => (c.status || "").toLowerCase().includes(tab.toLowerCase()) || (c.estado_relacion || "").toLowerCase().includes(tab.toLowerCase())).length;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setStatusFilter(tab);
                      playSound('click');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                      isSelected
                        ? "bg-white/10 text-white font-semibold"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span>{tab}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-white/50">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Section (9 Columns): Catálogo de Clientes */}
        <div className="col-span-9 flex flex-col">
          {/* ── CLIENT CARDS GRID ── */}
          {filteredClients.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0">
                {/* Tarjeta / Botón Registrar Cliente */}
                <div className="p-2 h-[220px]">
                  <div
                    onClick={() => {
                      playSound("click");
                      setIsCreateModalOpen(true);
                    }}
                    className="w-full h-full relative flex flex-col items-center justify-center p-5 rounded-2xl border border-dashed border-white/20 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/40 transition-all cursor-pointer group select-none shadow-sm"
                  >
                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 group-hover:bg-white/20 group-hover:scale-110 transition-all mb-3 text-white">
                      <Plus className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    <div className="text-[14px] font-semibold text-white/90 group-hover:text-white text-center">
                      Registrar cliente
                    </div>
                    <p className="text-[12px] text-white/40 mt-1 text-center font-normal">Agregar nueva marca cliente</p>
                  </div>
                </div>

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
        </div>
      </div>

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
