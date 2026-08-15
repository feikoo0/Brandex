"use client";

import React, { useState } from "react";
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  ArrowUpRight,
  Receipt,
  Plus,
  Zap,
  Percent
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Client, Member, Project, PaymentHistoryItem } from "@/lib/types";
import { useEntitySessionStats } from "@/hooks/useSessions";
import { playSound } from "@/app/taski/utils/audio";

interface EntityFinancesInsightsProps {
  entity: Client | Member;
  type: "client" | "member" | "user";
  projects: any[];
  onUpdateFinances?: (updatedFinances: any) => Promise<void> | void;
  className?: string;
}

export function EntityFinancesInsights({
  entity,
  type,
  projects = [],
  onUpdateFinances,
  className = "",
}: EntityFinancesInsightsProps) {
  const [activeSubTab, setActiveSubTab] = useState<"finanzas" | "insights">("finanzas");
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [newPayAmount, setNewPayAmount] = useState("");
  const [newPayDate, setNewPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [newPayStatus, setNewPayStatus] = useState<"pagado" | "pendiente" | "vencido">("pagado");

  // Dynamic session stats calculation from /sessions
  const { totalHours, totalSessions } = useEntitySessionStats(type, entity.id);

  // Financial values resolution with safe fallbacks
  const finanzas = (entity as Client).finanzas || {
    monto_contrato: 30000,
    total_pagado: 20000,
    proxima_factura: "2026-09-01",
    historial_pagos: [
      { id: "p-1", fecha: "2026-07-01", monto: 10000, estado: "pagado" },
      { id: "p-2", fecha: "2026-08-01", monto: 10000, estado: "pagado" },
      { id: "p-3", fecha: "2026-09-01", monto: 10000, estado: "pendiente" },
    ],
  };

  const montoContrato = finanzas.monto_contrato || 30000;
  const totalPagado = finanzas.total_pagado || 0;
  const balancePendiente = Math.max(0, montoContrato - totalPagado);
  const planContratado = (entity as Client).plan_contratado || "crecimiento";

  // Insights calculations
  const totalProjects = projects.length;
  const completedProjects = projects.filter((p) => {
    const st = p.estadoProyecto || p.estado || "";
    return st.includes("Completado") || st.includes("Hecho") || st.includes("Concluido");
  }).length;
  const activeProjects = totalProjects - completedProjects;
  const percentCompleted = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;

  // Valor por hora real (Monto total contratado / Horas invertidas de sesiones)
  const effectiveHours = Math.max(totalHours, 1);
  const valorPorHora = Math.round(montoContrato / effectiveHours);

  const handleAddPayment = async () => {
    if (!newPayAmount || isNaN(Number(newPayAmount))) return;
    const amount = Number(newPayAmount);
    const newPayment: PaymentHistoryItem = {
      id: "pay-" + Date.now(),
      fecha: newPayDate,
      monto: amount,
      estado: newPayStatus,
    };

    const newHistory = [newPayment, ...(finanzas.historial_pagos || [])];
    const newTotalPagado = newPayStatus === "pagado" ? totalPagado + amount : totalPagado;

    if (onUpdateFinances) {
      await onUpdateFinances({
        ...finanzas,
        total_pagado: newTotalPagado,
        historial_pagos: newHistory,
      });
    }

    setNewPayAmount("");
    setIsAddingPayment(false);
    playSound('pop');
  };

  return (
    <div className={`flex flex-col justify-between p-5 rounded-[24px] bg-[#181818] border border-white/10 shadow-xl text-[#ffffffd6] h-full ${className}`}>
      <div>
        {/* Header & Sub-Tab Switcher */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#121212] border border-white/10">
            <button
              type="button"
              onClick={() => setActiveSubTab("finanzas")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === "finanzas" ? "bg-white/10 text-white shadow-sm" : "text-[#ffffff6b] hover:text-white"
              }`}
            >
              Finanzas
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("insights")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === "insights" ? "bg-white/10 text-white shadow-sm" : "text-[#ffffff6b] hover:text-white"
              }`}
            >
              Insights & Rentabilidad
            </button>
          </div>

          <span className="text-[11px] font-bold uppercase tracking-wider text-[#ffffff40]">
            {type === "client" ? `Plan ${planContratado}` : "Métricas de Rendimiento"}
          </span>
        </div>

        {/* ── SUB-TAB 1: FINANZAS ── */}
        {activeSubTab === "finanzas" && (
          <div className="flex flex-col gap-4">
            {/* KPI Cards Row */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-2xl bg-[#121212] border border-white/5 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#ffffff6b]">Total Contrato</span>
                <div className="text-base font-bold text-[#ffffffd6] mt-1">
                  ${montoContrato.toLocaleString()}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-500/[0.05] border border-emerald-500/20 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">Total Pagado</span>
                <div className="text-base font-bold text-emerald-400 mt-1">
                  ${totalPagado.toLocaleString()}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-500/[0.05] border border-amber-500/20 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/80">Pendiente</span>
                <div className="text-base font-bold text-amber-400 mt-1">
                  ${balancePendiente.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Next Invoice Banner */}
            {finanzas.proxima_factura && (
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-white/[0.025] border border-white/5 text-xs">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[#ffffff6b]">Próxima fecha de factura:</span>
                  <strong className="text-[#ffffffd6]">{finanzas.proxima_factura}</strong>
                </div>
                <span className="text-[11px] font-bold text-blue-400">Programada</span>
              </div>
            )}

            {/* Payment History Section */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#ffffff6b]">
                  Historial de Pagos & Facturas
                </span>
                {!isAddingPayment && (
                  <button
                    type="button"
                    onClick={() => setIsAddingPayment(true)}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Registrar pago</span>
                  </button>
                )}
              </div>

              {isAddingPayment && (
                <div className="p-3 rounded-2xl bg-[#121212] border border-white/15 flex flex-col gap-2">
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      value={newPayAmount}
                      onChange={(e) => setNewPayAmount(e.target.value)}
                      placeholder="Monto ($)"
                      className="px-3 py-1.5 text-xs rounded-xl bg-[#222222] border border-white/10 text-white outline-none"
                    />
                    <input
                      type="date"
                      value={newPayDate}
                      onChange={(e) => setNewPayDate(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-xl bg-[#222222] border border-white/10 text-white outline-none"
                    />
                    <select
                      value={newPayStatus}
                      onChange={(e) => setNewPayStatus(e.target.value as any)}
                      className="px-2 py-1.5 text-xs rounded-xl bg-[#222222] border border-white/10 text-white outline-none"
                    >
                      <option value="pagado">Pagado</option>
                      <option value="pendiente">Pendiente</option>
                      <option value="vencido">Vencido</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingPayment(false)}
                      className="px-3 py-1 text-xs rounded-lg bg-white/5 text-[#ffffff6b]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleAddPayment}
                      className="px-3 py-1 text-xs font-bold rounded-lg bg-blue-600 text-white"
                    >
                      Guardar Pago
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5 max-h-[110px] overflow-y-auto pr-1 custom-scrollbar">
                {(finanzas.historial_pagos || []).map((pay) => (
                  <div
                    key={pay.id}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Receipt className="w-3.5 h-3.5 text-[#ffffff40]" />
                      <span className="text-[#ffffffd6] font-medium">${pay.monto.toLocaleString()}</span>
                      <span className="text-[#ffffff40]">· {pay.fecha}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        pay.estado === "pagado"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                          : pay.estado === "pendiente"
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                          : "bg-rose-500/20 text-rose-400 border-rose-500/40"
                      }`}
                    >
                      {pay.estado}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── SUB-TAB 2: INSIGHTS & RENTABILIDAD ── */}
        {activeSubTab === "insights" && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Horas de sesiones */}
              <div className="p-3.5 rounded-2xl bg-[#121212] border border-white/10 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-[#ffffff6b]">
                  <span>Horas Invertidas</span>
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="text-xl font-bold text-[#ffffffd6] mt-2">
                  {totalHours}h
                </div>
                <span className="text-[10px] text-[#ffffff40] mt-1">
                  En {totalSessions} sesiones de trabajo
                </span>
              </div>

              {/* Valor por hora real */}
              <div className="p-3.5 rounded-2xl bg-blue-500/[0.05] border border-blue-500/20 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-blue-400">
                  <span>Valor / Hora Real</span>
                  <Zap className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="text-xl font-bold text-blue-400 mt-2">
                  ${valorPorHora}/h
                </div>
                <span className="text-[10px] text-blue-400/60 mt-1">
                  Monto contrato ÷ horas dedicadas
                </span>
              </div>
            </div>

            {/* Project Delivery Breakdown */}
            <div className="p-3.5 rounded-2xl bg-[#121212] border border-white/5 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#ffffff6b]">Avance de Proyectos:</span>
                <strong className="text-[#ffffffd6]">{completedProjects} de {totalProjects} listos ({percentCompleted}%)</strong>
              </div>

              {/* Segmented bar */}
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden flex">
                <div
                  className="h-full bg-emerald-400 transition-all duration-500"
                  style={{ width: `${percentCompleted}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#ffffff40] pt-1">
                <span>Tiempo promedio de entrega: <strong>4.2 días</strong></span>
                <span>Proyectos activos: <strong>{activeProjects}</strong></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Summary */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-[#ffffff6b]">
        <span>Rentabilidad estimada:</span>
        <strong className="text-emerald-400 font-bold">+68% margen operativo</strong>
      </div>
    </div>
  );
}
