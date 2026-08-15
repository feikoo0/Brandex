"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  DollarSign, 
  TrendingUp, 
  Wallet, 
  Receipt, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowUpRight, 
  Clock, 
  Zap, 
  Building2, 
  ChevronRight, 
  CreditCard,
  Plus,
  Send
} from "lucide-react";
import { useClientsV3 } from "@/hooks/useClientsV3";
import { useEntitySessionStats } from "@/hooks/useSessions";
import type { Client } from "@/lib/types";
import { playSound } from "../utils/audio";

interface FinanzasGlobalesDashboardProps {
  onSelectClient?: (clientId: string) => void;
  className?: string;
}

export function FinanzasGlobalesDashboard({
  onSelectClient,
  className = "",
}: FinanzasGlobalesDashboardProps) {
  const { clients, isLoading } = useClientsV3();
  const [selectedTimeframe, setSelectedTimeframe] = useState<"mes" | "año" | "todo">("mes");
  const [notifiedClientId, setNotifiedClientId] = useState<string | null>(null);

  // Financial aggregates
  const stats = useMemo(() => {
    let totalContratado = 0;
    let totalPagado = 0;
    let totalPendiente = 0;
    let overdueCount = 0;
    const planCounts: Record<string, number> = {
      impulso: 0,
      crecimiento: 0,
      estrategico: 0,
      alianza: 0,
    };

    clients.forEach((c) => {
      const monto = c.finanzas?.monto_contrato ?? Number(c.totalBudget?.replace(/[^0-9.-]+/g, "")) ?? 0;
      const pagado = c.finanzas?.total_pagado ?? Number(c.paidAmount?.replace(/[^0-9.-]+/g, "")) ?? 0;
      const pend = Math.max(0, monto - pagado);

      totalContratado += monto;
      totalPagado += pagado;
      totalPendiente += pend;

      const plan = (c.plan_contratado || "crecimiento").toLowerCase();
      if (planCounts[plan] !== undefined) {
        planCounts[plan]++;
      }

      // Check if any payment is overdue or pending
      const hasOverdue = (c.finanzas?.historial_pagos || []).some((p) => p.estado === "vencido");
      if (hasOverdue) overdueCount++;
    });

    return {
      totalContratado,
      totalPagado,
      totalPendiente,
      overdueCount,
      planCounts,
    };
  }, [clients]);

  // Clients with pending payments / next invoices
  const pendingInvoices = useMemo(() => {
    const list: {
      client: Client;
      amount: number;
      dueDate: string;
      isOverdue: boolean;
    }[] = [];

    clients.forEach((c) => {
      const monto = c.finanzas?.monto_contrato ?? Number(c.totalBudget?.replace(/[^0-9.-]+/g, "")) ?? 0;
      const pagado = c.finanzas?.total_pagado ?? Number(c.paidAmount?.replace(/[^0-9.-]+/g, "")) ?? 0;
      const pend = Math.max(0, monto - pagado);

      if (pend > 0) {
        const nextDate = c.finanzas?.proxima_factura || "2026-09-01";
        const isOverdue = new Date(nextDate).getTime() < Date.now();
        list.push({
          client: c,
          amount: pend,
          dueDate: nextDate,
          isOverdue,
        });
      }
    });

    return list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [clients]);

  const handleSendReminder = (clientId: string) => {
    setNotifiedClientId(clientId);
    playSound('pop');
    setTimeout(() => setNotifiedClientId(null), 3000);
  };

  return (
    <div className={`flex flex-col h-full p-6 overflow-y-auto custom-scrollbar bg-transparent text-[#ffffffd6] ${className}`}>
      {/* ── 1. GLOBAL FINANCE KPIS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Contratado */}
        <div className="p-5 rounded-[24px] bg-[#181818] border border-white/10 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffffff6b]">
              Facturación Contratada
            </span>
            <Wallet className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-[#ffffffd6] mt-2">
            ${stats.totalContratado.toLocaleString()}
          </div>
          <span className="text-xs text-[#ffffff6b] mt-1">Total acumulado en contratos</span>
        </div>

        {/* Total Cobrado */}
        <div className="p-5 rounded-[24px] bg-emerald-500/[0.04] border border-emerald-500/20 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/80">
              Total Recaudado
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-emerald-400 mt-2">
            ${stats.totalPagado.toLocaleString()}
          </div>
          <span className="text-xs text-emerald-400/60 mt-1">
            {stats.totalContratado > 0 ? `${Math.round((stats.totalPagado / stats.totalContratado) * 100)}% de cobro efectivo` : "0%"}
          </span>
        </div>

        {/* Balance Pendiente */}
        <div className="p-5 rounded-[24px] bg-amber-500/[0.04] border border-amber-500/20 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400/80">
              Cuentas por Cobrar
            </span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-amber-400 mt-2">
            ${stats.totalPendiente.toLocaleString()}
          </div>
          <span className="text-xs text-amber-400/60 mt-1">
            En {pendingInvoices.length} clientes activos
          </span>
        </div>

        {/* Rentabilidad Media por Hora */}
        <div className="p-5 rounded-[24px] bg-[#181818] border border-white/10 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffffff6b]">
              Rentabilidad Global
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-emerald-400 mt-2">
            +65% Margen
          </div>
          <span className="text-xs text-[#ffffff6b] mt-1">Promedio estimado por proyecto</span>
        </div>
      </div>

      {/* ── 2. TWO-COLUMN ANALYTICS & INVOICING ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6 flex-1">
        {/* Left Column (8 Cols): Cuentas por Cobrar & Facturación Próxima */}
        <div className="lg:col-span-8 flex flex-col p-6 rounded-[28px] bg-[#181818] border border-white/10 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
            <div>
              <h3 className="text-base font-bold text-[#ffffffd6]">Cuentas por Cobrar & Vencimientos</h3>
              <p className="text-xs text-[#ffffff6b]">Próximas facturas programadas a 30 días</p>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-[#ffffff6b]">
              {pendingInvoices.length} pendientes
            </span>
          </div>

          <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar flex-1 pr-1">
            {pendingInvoices.length > 0 ? (
              pendingInvoices.map(({ client, amount, dueDate, isOverdue }) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-[#121212] hover:bg-[#1a1a1a] border border-white/5 hover:border-white/15 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#222222] border border-white/10 flex items-center justify-center font-bold text-blue-400 shrink-0">
                      {client.logo || client.nombre.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-[#ffffffd6] truncate">
                        {client.nombre}
                      </span>
                      <span className="text-xs text-[#ffffff6b] truncate">
                        Plan {client.plan_contratado || "Crecimiento"} · Vence {dueDate}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-bold text-[#ffffffd6]">
                        ${amount.toLocaleString()}
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          isOverdue ? "text-rose-400" : "text-amber-400"
                        }`}
                      >
                        {isOverdue ? "Vencido" : "Programado"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSendReminder(client.id)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#ffffff6b] hover:text-white border border-white/10 transition-colors"
                      title="Enviar recordatorio de pago"
                    >
                      {notifiedClientId === client.id ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border border-dashed border-white/5 rounded-2xl">
                <CheckCircle2 className="w-10 h-10 text-emerald-400/40 mb-2" />
                <span className="text-sm font-semibold text-[#ffffffd6]">Todas las facturas están al día</span>
                <span className="text-xs text-[#ffffff6b] mt-0.5">No hay pagos pendientes en este momento.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 Cols): Distribución por Planes de Contrato */}
        <div className="lg:col-span-4 flex flex-col p-6 rounded-[28px] bg-[#181818] border border-white/10 shadow-xl justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-5">
              <div>
                <h3 className="text-base font-bold text-[#ffffffd6]">Planes Contratados</h3>
                <p className="text-xs text-[#ffffff6b]">Distribución de clientes por tier</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {/* Plan Alianza */}
              <div className="p-3.5 rounded-2xl bg-purple-500/[0.04] border border-purple-500/20 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-purple-400">Plan Alianza ($60k - $80k+)</span>
                  <span className="font-bold text-purple-400">{stats.planCounts.alianza} clientes</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-purple-400 rounded-full"
                    style={{ width: `${Math.min(100, (stats.planCounts.alianza / Math.max(clients.length, 1)) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Plan Estratégico */}
              <div className="p-3.5 rounded-2xl bg-blue-500/[0.04] border border-blue-500/20 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-400">Plan Estratégico ($40k - $60k)</span>
                  <span className="font-bold text-blue-400">{stats.planCounts.estrategico} clientes</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-blue-400 rounded-full"
                    style={{ width: `${Math.min(100, (stats.planCounts.estrategico / Math.max(clients.length, 1)) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Plan Crecimiento */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/20 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-400">Plan Crecimiento ($25k - $40k)</span>
                  <span className="font-bold text-emerald-400">{stats.planCounts.crecimiento} clientes</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full"
                    style={{ width: `${Math.min(100, (stats.planCounts.crecimiento / Math.max(clients.length, 1)) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Plan Impulso */}
              <div className="p-3.5 rounded-2xl bg-amber-500/[0.04] border border-amber-500/20 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-400">Plan Impulso ($15k - $25k)</span>
                  <span className="font-bold text-amber-400">{stats.planCounts.impulso} clientes</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full"
                    style={{ width: `${Math.min(100, (stats.planCounts.impulso / Math.max(clients.length, 1)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 text-[11px] text-[#ffffff6b] flex items-center justify-between mt-4">
            <span>Ticket Promedio Agencia:</span>
            <strong className="text-white font-bold">
              ${clients.length > 0 ? Math.round(stats.totalContratado / clients.length).toLocaleString() : "0"}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}
