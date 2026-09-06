"use client";

import React, { useState } from "react";
import { 
  GitBranch, CheckCircle2, AlertCircle, Clock, 
  ArrowRight, RefreshCw, Sparkles, UserCheck, ShieldCheck, Play
} from "lucide-react";

interface StateNode {
  id: string;
  name: string;
  category: "initial" | "active" | "review" | "done" | "canceled";
  color: string;
  bgRgba: string;
  borderRgba: string;
  allowedRoles: string[];
  description: string;
  triggers: string[];
  nextStates: string[];
}

const TASK_STATES: StateNode[] = [
  {
    id: "Pendiente",
    name: "Pendiente (Backlog)",
    category: "initial",
    color: "#3a7bd5",
    bgRgba: "rgba(58, 123, 213, 0.12)",
    borderRgba: "rgba(58, 123, 213, 0.40)",
    allowedRoles: ["Admin", "Project Manager"],
    description: "Tarea recién creada y asignada. Esperando a ser tomada por el diseñador o editor.",
    triggers: ["Creación en modal de tarea o proyecto", "Asignación de miembro del equipo"],
    nextStates: ["En proceso", "Cancelado"]
  },
  {
    id: "En proceso",
    name: "En Proceso (Maker Mode)",
    category: "active",
    color: "#0a84ff",
    bgRgba: "rgba(10, 132, 255, 0.12)",
    borderRgba: "rgba(10, 132, 255, 0.40)",
    allowedRoles: ["Diseñador", "Editor", "Admin"],
    description: "El diseñador inicia la ejecución activa o activa el cronómetro en Maker Mode.",
    triggers: ["Inicio de sesión de tiempo", "Arrastrar tarjeta en columna Kanban"],
    nextStates: ["Revision", "Pendiente"]
  },
  {
    id: "Revision",
    name: "En Revisión (Internal QA)",
    category: "review",
    color: "#ff9f0a",
    bgRgba: "rgba(255, 159, 10, 0.12)",
    borderRgba: "rgba(255, 159, 10, 0.40)",
    allowedRoles: ["Diseñador", "Project Manager", "Admin"],
    description: "Entregable completado preliminarmente con link a Drive o preview adjunto listo para QA.",
    triggers: ["Colaborador sube entregable y solicita revisión", "Notificación automática a Admin/Cliente"],
    nextStates: ["Aprobado", "Modificar"]
  },
  {
    id: "Modificar",
    name: "Por Modificar (Feedback Loop)",
    category: "review",
    color: "#ff453a",
    bgRgba: "rgba(255, 69, 58, 0.12)",
    borderRgba: "rgba(255, 69, 58, 0.40)",
    allowedRoles: ["Cliente", "Admin", "Project Manager"],
    description: "El cliente o admin rechazó el entregable solicitando correcciones o ajustes específicos.",
    triggers: ["Cliente presiona 'Solicitar Cambios' en portal /cliente", "Admin agrega notas internas"],
    nextStates: ["En proceso"]
  },
  {
    id: "Aprobado",
    name: "Aprobado (Cliente / Admin)",
    category: "done",
    color: "#34c759",
    bgRgba: "rgba(52, 199, 89, 0.12)",
    borderRgba: "rgba(52, 199, 89, 0.40)",
    allowedRoles: ["Cliente", "Admin"],
    description: "El entregable cumple con todos los estándares y ha sido formalmente aprobado.",
    triggers: ["Cliente pulsa 'Aprobar' en vista de cliente", "Admin aprueba en Kanban"],
    nextStates: ["Por publicar", "Publicado", "Hecho"]
  },
  {
    id: "Por publicar",
    name: "Por Publicar (Scheduled)",
    category: "done",
    color: "#ff9f0a",
    bgRgba: "rgba(255, 159, 10, 0.12)",
    borderRgba: "rgba(255, 159, 10, 0.40)",
    allowedRoles: ["Community Manager", "Admin"],
    description: "Programado en meta business o esperando fecha de parrilla de contenido.",
    triggers: ["Asignación de fecha de publicación en calendario"],
    nextStates: ["Publicado"]
  },
  {
    id: "Publicado",
    name: "Publicado / Hecho (Completado)",
    category: "done",
    color: "#30d158",
    bgRgba: "rgba(48, 209, 88, 0.15)",
    borderRgba: "rgba(48, 209, 88, 0.50)",
    allowedRoles: ["Admin", "Community Manager"],
    description: "Entregable finalizado y publicado en redes/sitio web. Suma al 100% del proyecto.",
    triggers: ["Marcado final", "Disparo del cálculo reactivo de progreso del proyecto"],
    nextStates: []
  },
  {
    id: "Cancelado",
    name: "Cancelado (Archivado)",
    category: "canceled",
    color: "#8e8e93",
    bgRgba: "rgba(142, 142, 147, 0.12)",
    borderRgba: "rgba(142, 142, 147, 0.40)",
    allowedRoles: ["Admin"],
    description: "Entregable descartado o reemplazado por la marca.",
    triggers: ["Cancelación explícita"],
    nextStates: []
  }
];

export function DeliverableLifecycleDiagram() {
  const [selectedStateId, setSelectedStateId] = useState<string>("En proceso");
  const activeState = TASK_STATES.find(s => s.id === selectedStateId) || TASK_STATES[1];

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full h-full p-4 lg:p-6 overflow-y-auto">
      {/* ── STATE MACHINE VISUAL PIPELINE ── */}
      <div className="flex-1 flex flex-col bg-[#141414] border border-white/10 rounded-[20px] p-5">
        <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-[#3a7bd5]" />
              <h3 className="font-bold text-sm tracking-wide text-[#ffffffd6]">
                MÁQUINA DE ESTADOS Y CICLO DE VIDA DE ENTREGABLES
              </h3>
            </div>
            <p className="text-[11px] text-[#ffffff6b] mt-0.5 font-mono">
              Flujo Transicional de Tareas • Aprobaciones Cliente/Admin • Rollup de Progreso Reactivo
            </p>
          </div>
          <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/10 text-white/60">
            8 Estados Oficiales
          </span>
        </div>

        {/* State Machine Flow Diagram (SVG Layout) */}
        <div className="flex-1 min-h-[360px] flex items-center justify-center relative w-full overflow-x-auto bg-[#101012] rounded-xl border border-white/5 p-4 mb-4">
          <svg viewBox="0 0 820 320" className="w-full h-full max-h-[340px] select-none" style={{ minWidth: "680px" }}>
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 8 5 L 0 9 z" fill="rgba(255,255,255,0.4)" />
              </marker>
              <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#34c759" />
              </marker>
              <marker id="arrow-red" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#ff453a" />
              </marker>
            </defs>

            {/* ── PATHS & TRANSITIONS ── */}
            {/* Pendiente -> En Proceso */}
            <path d="M 120 70 L 190 70" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
            {/* En Proceso -> Revision */}
            <path d="M 330 70 L 400 70" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
            {/* Revision -> Aprobado */}
            <path d="M 540 70 L 610 70" stroke="#34c759" strokeWidth="2" markerEnd="url(#arrow-green)" fill="none" />
            {/* Revision -> Modificar (downwards) */}
            <path d="M 470 100 L 470 180" stroke="#ff453a" strokeWidth="2" markerEnd="url(#arrow-red)" fill="none" />
            {/* Modificar -> En Proceso (loop back) */}
            <path d="M 400 210 L 260 210 L 260 105" stroke="#ff9f0a" strokeWidth="1.5" strokeDasharray="4,2" markerEnd="url(#arrow)" fill="none" />
            {/* Aprobado -> Publicado */}
            <path d="M 680 100 L 680 180" stroke="#34c759" strokeWidth="2" markerEnd="url(#arrow-green)" fill="none" />

            {/* ── NODES ── */}
            {/* 1. Pendiente */}
            <g onClick={() => setSelectedStateId("Pendiente")} className="cursor-pointer">
              <rect x="20" y="40" width="100" height="60" rx="8" fill={selectedStateId === "Pendiente" ? "rgba(58,123,213,0.3)" : "#18181b"} stroke="#3a7bd5" strokeWidth="1.5" />
              <text x="70" y="66" fill="#ffffffd6" fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="Geist">Pendiente</text>
              <text x="70" y="82" fill="#ffffff6b" fontSize="8" textAnchor="middle" fontFamily="Geist Mono">Backlog</text>
            </g>

            {/* 2. En Proceso */}
            <g onClick={() => setSelectedStateId("En proceso")} className="cursor-pointer">
              <rect x="190" y="40" width="140" height="60" rx="8" fill={selectedStateId === "En proceso" ? "rgba(10,132,255,0.3)" : "#18181b"} stroke="#0a84ff" strokeWidth="2" />
              <text x="260" y="66" fill="#ffffffd6" fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="Geist">En Proceso</text>
              <text x="260" y="82" fill="#ffffff6b" fontSize="8" textAnchor="middle" fontFamily="Geist Mono">Maker Mode Active</text>
            </g>

            {/* 3. Revision */}
            <g onClick={() => setSelectedStateId("Revision")} className="cursor-pointer">
              <rect x="400" y="40" width="140" height="60" rx="8" fill={selectedStateId === "Revision" ? "rgba(255,159,10,0.3)" : "#18181b"} stroke="#ff9f0a" strokeWidth="2" />
              <text x="470" y="66" fill="#ffffffd6" fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="Geist">En Revisión</text>
              <text x="470" y="82" fill="#ffffff6b" fontSize="8" textAnchor="middle" fontFamily="Geist Mono">QA / Review Gate</text>
            </g>

            {/* 4. Modificar (Bottom Branch) */}
            <g onClick={() => setSelectedStateId("Modificar")} className="cursor-pointer">
              <rect x="400" y="180" width="140" height="60" rx="8" fill={selectedStateId === "Modificar" ? "rgba(255,69,58,0.3)" : "#18181b"} stroke="#ff453a" strokeWidth="1.5" />
              <text x="470" y="206" fill="#ffffffd6" fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="Geist">Por Modificar</text>
              <text x="470" y="222" fill="#ffffff6b" fontSize="8" textAnchor="middle" fontFamily="Geist Mono">Feedback Rechazo</text>
            </g>

            {/* 5. Aprobado */}
            <g onClick={() => setSelectedStateId("Aprobado")} className="cursor-pointer">
              <rect x="610" y="40" width="140" height="60" rx="8" fill={selectedStateId === "Aprobado" ? "rgba(52,199,89,0.3)" : "#18181b"} stroke="#34c759" strokeWidth="2" />
              <text x="680" y="66" fill="#ffffffd6" fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="Geist">Aprobado</text>
              <text x="680" y="82" fill="#ffffff6b" fontSize="8" textAnchor="middle" fontFamily="Geist Mono">Cliente / Admin OK</text>
            </g>

            {/* 6. Publicado / Hecho */}
            <g onClick={() => setSelectedStateId("Publicado")} className="cursor-pointer">
              <rect x="610" y="180" width="140" height="60" rx="8" fill={selectedStateId === "Publicado" ? "rgba(48,209,88,0.3)" : "#18181b"} stroke="#30d158" strokeWidth="2" />
              <text x="680" y="206" fill="#ffffffd6" fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="Geist">Publicado / Hecho</text>
              <text x="680" y="222" fill="#30d158" fontSize="8" textAnchor="middle" fontFamily="Geist Mono">Progreso +100%</text>
            </g>
          </svg>
        </div>

        {/* Project Progress Formula Block */}
        <div className="bg-[#181818] border border-white/10 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#ffffffd6] mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#3a7bd5]" />
              <span>Fórmula Reactiva de Progreso de Proyecto (useProjectSummary):</span>
            </div>
            <div className="font-mono text-xs text-white/80 bg-black/40 px-3 py-1.5 rounded-md border border-white/5">
              Progreso = (tareas.filter(t =&gt; t.estado === &apos;Completado&apos; || t.estado === &apos;Hecho&apos; || t.estado === &apos;Publicado&apos;).length / tareas.length) * 100%
            </div>
          </div>
          <div className="flex items-center gap-3 text-right">
            <div>
              <div className="text-[10px] text-[#ffffff6b] uppercase font-mono">Cálculo en Portada</div>
              <div className="text-sm font-bold text-emerald-400 font-mono">Segmented Bar</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── STATE INSPECTOR PANEL ── */}
      <div className="w-full lg:w-96 flex flex-col bg-[#181818] border border-white/10 rounded-[20px] p-5">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeState.color }} />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#ffffffd6]">
              Detalle del Estado
            </h4>
          </div>
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: activeState.bgRgba,
              color: activeState.color,
              border: `1px solid ${activeState.borderRgba}`
            }}
          >
            {activeState.category.toUpperCase()}
          </span>
        </div>

        <h3 className="text-base font-bold text-[#ffffffd6] mb-2">
          {activeState.name}
        </h3>
        <p className="text-xs leading-relaxed text-[#ffffff6b] mb-4">
          {activeState.description}
        </p>

        {/* Allowed Roles */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#ffffffd6] mb-2">
            <UserCheck className="w-3.5 h-3.5 text-white/60" />
            <span>Roles con Permiso de Transición:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {activeState.allowedRoles.map((role, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-md bg-[#222222] border border-white/10 text-[10px] font-mono text-white/90"
              >
                {role}
              </span>
            ))}
          </div>
        </div>

        {/* Triggers */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#ffffffd6] mb-2">
            <Play className="w-3.5 h-3.5 text-amber-400" />
            <span>Disparadores (Triggers) de Entrada:</span>
          </div>
          <div className="space-y-1.5">
            {activeState.triggers.map((trig, i) => (
              <div key={i} className="p-2 rounded-lg bg-white/[0.02] border border-white/5 text-[11px] text-[#ffffff6b]">
                • {trig}
              </div>
            ))}
          </div>
        </div>

        {/* Next States */}
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#ffffffd6] mb-2">
            <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
            <span>Siguientes Estados Válidos:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {activeState.nextStates.length > 0 ? (
              activeState.nextStates.map((next, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedStateId(next)}
                  className="px-2.5 py-1 rounded-md bg-[#3a7bd5]/20 border border-[#3a7bd5]/40 text-[#3a7bd5] text-[10px] font-mono hover:bg-[#3a7bd5]/30 transition-colors"
                >
                  → {next}
                </button>
              ))
            ) : (
              <span className="text-[11px] text-white/40 italic">Estado terminal del flujo</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
