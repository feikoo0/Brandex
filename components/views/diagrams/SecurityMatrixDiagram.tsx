"use client";

import React, { useState } from "react";
import { Shield, Lock, Check, X, AlertTriangle, Eye, Edit3, Trash2, Key } from "lucide-react";

interface MatrixRow {
  module: string;
  action: string;
  admin: "allow" | "deny" | "read_only" | "conditional";
  worker: "allow" | "deny" | "read_only" | "conditional";
  client: "allow" | "deny" | "read_only" | "conditional";
  notes: string;
}

const SECURITY_MATRIX: MatrixRow[] = [
  {
    module: "Rutas & Vistas",
    action: "Acceso a /admin (Panel de Control Global)",
    admin: "allow",
    worker: "deny",
    client: "deny",
    notes: "Redirige automáticamente a /equipo o /cliente si el rol no es admin"
  },
  {
    module: "Rutas & Vistas",
    action: "Acceso a /equipo (Maker Mode y Tareas Asignadas)",
    admin: "allow",
    worker: "allow",
    client: "deny",
    notes: "Vista optimizada para diseñadores, editores y project managers"
  },
  {
    module: "Rutas & Vistas",
    action: "Acceso a /cliente (Portal de Marca y Aprobaciones)",
    admin: "allow",
    worker: "deny",
    client: "allow",
    notes: "Filtrado automático estricto por cliente_id de la sesión del cliente"
  },
  {
    module: "Finanzas & Facturación",
    action: "Ver y Editar Contratos, Pagos y Balances (FinanzasView)",
    admin: "allow",
    worker: "deny",
    client: "conditional",
    notes: "El cliente solo ve sus propios balances pagados/pendientes; el colaborador no tiene acceso"
  },
  {
    module: "Proyectos",
    action: "Crear, Editar y Eliminar Proyectos (ProjectModal)",
    admin: "allow",
    worker: "conditional",
    client: "deny",
    notes: "El diseñador solo puede editar campos operativos; el admin tiene control total"
  },
  {
    module: "Tareas & Entregables",
    action: "Crear y Asignar Tareas",
    admin: "allow",
    worker: "allow",
    client: "deny",
    notes: "El cliente solicita cambios, pero la creación formal es del equipo/admin"
  },
  {
    module: "Tareas & Entregables",
    action: "Mover Estados (Pendiente $\to$ En Proceso $\to$ Revisión)",
    admin: "allow",
    worker: "allow",
    client: "deny",
    notes: "El colaborador mueve a Revisión para solicitar feedback"
  },
  {
    module: "Tareas & Entregables",
    action: "Aprobar Entregables (Aprobado / Hecho)",
    admin: "allow",
    worker: "deny",
    client: "allow",
    notes: "Aprobación formal reservada para el cliente o admin"
  },
  {
    module: "Notas & Privacidad",
    action: "Ver y Editar 'adminNotes' (Instrucciones Confidenciales)",
    admin: "allow",
    worker: "allow",
    client: "deny",
    notes: "Completamente oculto en la vista del cliente"
  },
  {
    module: "Notas & Privacidad",
    action: "Ver y Editar 'notasCliente' (Feedback Público)",
    admin: "allow",
    worker: "allow",
    client: "allow",
    notes: "Canal bidireccional de comunicación con la marca"
  },
  {
    module: "Sesiones de Tiempo",
    action: "Iniciar Cronómetro y Registrar Horas (useSessions)",
    admin: "allow",
    worker: "allow",
    client: "deny",
    notes: "Registra horas reales vinculadas a worker_id"
  }
];

export function SecurityMatrixDiagram() {
  const [filterModule, setFilterModule] = useState<string>("all");

  const modules = ["all", ...Array.from(new Set(SECURITY_MATRIX.map(r => r.module)))];
  const filteredRows = filterModule === "all" 
    ? SECURITY_MATRIX 
    : SECURITY_MATRIX.filter(r => r.module === filterModule);

  function renderStatusBadge(val: "allow" | "deny" | "read_only" | "conditional") {
    switch (val) {
      case "allow":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
            <Check className="w-3 h-3" /> Permitido
          </span>
        );
      case "deny":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-mono">
            <X className="w-3 h-3" /> Bloqueado
          </span>
        );
      case "read_only":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono">
            <Eye className="w-3 h-3" /> Solo Lectura
          </span>
        );
      case "conditional":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono">
            <AlertTriangle className="w-3 h-3" /> Restringido
          </span>
        );
    }
  }

  return (
    <div className="flex flex-col w-full h-full p-4 lg:p-6 overflow-y-auto bg-[#141414] border border-white/10 rounded-[20px]">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/5 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#3a7bd5]" />
            <h3 className="font-bold text-sm tracking-wide text-[#ffffffd6]">
              MATRIZ DE PERMISOS & SEGURIDAD RBAC (DATA PLATFORM SECURITY)
            </h3>
          </div>
          <p className="text-[11px] text-[#ffffff6b] mt-0.5 font-mono">
            Control de Acceso Basado en Roles • admin vs diseno vs cliente • Aislamiento de Finanzas y Notas
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {modules.map(mod => (
            <button
              key={mod}
              onClick={() => setFilterModule(mod)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono capitalize transition-colors ${
                filterModule === mod
                  ? "bg-[#3a7bd5]/20 border border-[#3a7bd5]/40 text-[#3a7bd5]"
                  : "bg-white/[0.03] border border-white/5 text-[#ffffff6b] hover:bg-white/[0.06]"
              }`}
            >
              {mod === "all" ? "Todos los Módulos" : mod}
            </button>
          ))}
        </div>
      </div>

      {/* Table Matrix */}
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left border-collapse" style={{ minWidth: "750px" }}>
          <thead>
            <tr className="border-b border-white/10 text-[11px] font-mono text-white/50 uppercase tracking-wider">
              <th className="pb-3 pr-4 font-semibold">Módulo & Acción</th>
              <th className="pb-3 px-4 font-semibold text-center text-[#3a7bd5]">Admin</th>
              <th className="pb-3 px-4 font-semibold text-center text-[#8b5cf6]">Diseñador (Equipo)</th>
              <th className="pb-3 px-4 font-semibold text-center text-[#10b981]">Cliente (Marca)</th>
              <th className="pb-3 pl-4 font-semibold">Detalle & Restricción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs">
            {filteredRows.map((row, idx) => (
              <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 pr-4">
                  <div className="text-[10px] font-mono text-white/40 mb-0.5">{row.module}</div>
                  <div className="font-semibold text-[#ffffffd6]">{row.action}</div>
                </td>
                <td className="py-3.5 px-4 text-center">
                  {renderStatusBadge(row.admin)}
                </td>
                <td className="py-3.5 px-4 text-center">
                  {renderStatusBadge(row.worker)}
                </td>
                <td className="py-3.5 px-4 text-center">
                  {renderStatusBadge(row.client)}
                </td>
                <td className="py-3.5 pl-4 text-[11px] text-[#ffffff6b] leading-relaxed">
                  {row.notes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
