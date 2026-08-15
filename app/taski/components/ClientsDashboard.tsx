"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Search, 
  Plus, 
  Filter, 
  DollarSign, 
  Briefcase, 
  CheckCircle2, 
  ArrowUpRight,
  FolderPlus,
  Loader2
} from 'lucide-react';
import { Project } from './ProjectDashboard';
import { EntityCard } from '@/components/common/EntityCard';
import { EntityDetailView } from '@/components/views/EntityDetailView';
import CreateClientModal from './CreateClientModal';
import { useClientsV3, INITIAL_V3_CLIENTS } from '@/hooks/useClientsV3';
import type { Client } from '@/lib/types';
import { playSound } from '../utils/audio';

export type ClientItem = Client;
export const INITIAL_CLIENTS = INITIAL_V3_CLIENTS;

export interface ClientsDashboardProps {
  projects: Project[];
  onUpdateProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  onSelectProject?: (projectId: number | string) => void;
  isNeumorphic?: boolean;
  isNightMode?: boolean;
}

export function ClientsDashboard({
  projects = [],
  onUpdateProjects,
  onSelectProject,
  isNeumorphic = false,
  isNightMode = true,
}: ClientsDashboardProps) {
  const { clients, isLoading, createClient, updateClient } = useClientsV3();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Todos");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const filterTabs = ["Todos", "VIP", "Activo", "Pausa", "Prospecto"];

  // Filtered clients list
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const matchSearch = 
        c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
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

  // If a client is selected, render the 4-Zone Detail View
  if (selectedClient) {
    return (
      <EntityDetailView
        entity={selectedClient}
        entityType="client"
        allProjects={projects}
        onBack={() => {
          setSelectedClientId(null);
          playSound('click');
        }}
        onOpenProject={(projId) => {
          if (onSelectProject) onSelectProject(projId);
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
      {/* ── 1. KPI SUMMARY BAR ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-[#181818] border border-white/10 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffffff6b]">Marcas Registradas</span>
          <div className="text-2xl font-bold text-[#ffffffd6] mt-1.5">{totalClients} clientes</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-white/10 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/80">Clientes Activos</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1.5">{activeClientsCount} en operación</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-white/10 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400/80">Valor de Cartera</span>
          <div className="text-2xl font-bold text-blue-400 mt-1.5">${totalContractRevenue.toLocaleString()}</div>
        </div>
      </div>

      {/* ── 2. CONTROLS BAR: Search & Filter Tabs ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        {/* Left: Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-[#181818] border border-white/10">
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
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-white/10 text-[#ffffffd6] shadow-sm"
                    : "text-[#ffffff6b] hover:text-[#ffffffd6]"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Right: Search & Create Button */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-[#ffffff40] absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar marca o industria..."
              className="pl-8 pr-3 py-1.5 rounded-full bg-[#181818] border border-white/10 text-xs text-[#ffffffd6] placeholder:text-[#ffffff40] outline-none focus:border-white/20 w-48 sm:w-64 transition-all"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setIsCreateModalOpen(true);
              playSound('click');
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Registrar Cliente</span>
          </button>
        </div>
      </div>

      {/* ── 3. CLIENT CARDS GRID ── */}
      {filteredClients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClients.map((client) => {
            const clientProjects = projects.filter((p) => {
              const pClientId = String((p as any).cliente_ids?.[0] || (p as any).cliente_id || (p as any).client || "");
              return pClientId === String(client.id) || (p as any).client?.toLowerCase() === client.nombre.toLowerCase();
            });

            const activeProjects = clientProjects.filter((p) => !["Completado", "Hecho", "Concluido"].includes((p as any).estadoProyecto || (p as any).estado || (p as any).status || "")).length;
            const completedProjects = clientProjects.length - activeProjects;

            const monto = client.finanzas?.monto_contrato ?? Number(client.totalBudget?.replace(/[^0-9.-]+/g, "")) ?? 0;
            const pend = monto - (client.finanzas?.total_pagado ?? Number(client.paidAmount?.replace(/[^0-9.-]+/g, "")) ?? 0);

            return (
              <EntityCard
                key={client.id}
                id={client.id}
                type="client"
                name={client.nombre}
                subtitle={client.industria || client.industry || "Cliente"}
                avatar={client.logo || client.nombre.slice(0, 1).toUpperCase()}
                status={client.status || "Activo"}
                activeProjectsCount={activeProjects}
                completedProjectsCount={completedProjects}
                totalProjectsCount={clientProjects.length}
                driveLinksCount={client.drive_links?.length || 0}
                financialHighlight={`$${monto.toLocaleString()} contratado`}
                badgeText={client.plan_contratado ? `Plan ${client.plan_contratado}` : undefined}
                onClick={() => {
                  setSelectedClientId(client.id);
                  playSound('click');
                }}
              />
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center rounded-3xl border border-dashed border-white/10 bg-[#181818]/50">
          <Building2 className="w-12 h-12 text-[#ffffff20] mb-3" />
          <h4 className="text-base font-semibold text-[#ffffffd6]">No se encontraron clientes</h4>
          <p className="text-xs text-[#ffffff6b] mt-1 max-w-sm">
            {searchQuery
              ? `No hay clientes que coincidan con "${searchQuery}".`
              : "Registra tu primera marca cliente para comenzar a gestionar sus proyectos y finanzas."}
          </p>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-4 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all"
          >
            + Registrar Nuevo Cliente
          </button>
        </div>
      )}

      {/* Create Client Modal */}
      <CreateClientModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onClientCreated={async (newCli) => {
          await createClient({
            nombre: newCli.name,
            industria: newCli.industry,
            contacto: {
              persona: newCli.contactPerson,
              email: newCli.email,
              telefono: newCli.phone,
              whatsapp: newCli.phone,
            },
            status: newCli.status,
            notas_internas: newCli.notes,
            website: newCli.website,
          });
          setIsCreateModalOpen(false);
          playSound('pop');
        }}
      />
    </div>
  );
}
