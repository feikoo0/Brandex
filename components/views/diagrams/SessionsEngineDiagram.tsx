"use client";

import React, { useState } from "react";
import { 
  Clock, Play, Pause, Square, Activity, 
  DollarSign, CheckCircle2, Cpu, User, Sparkles
} from "lucide-react";

export function SessionsEngineDiagram() {
  const [selectedOrigin, setSelectedOrigin] = useState<string>("manual");

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full h-full p-4 lg:p-6 overflow-y-auto">
      {/* ── MAIN ENGINE SCHEMATIC (LEFT) ── */}
      <div className="flex-1 flex flex-col bg-[#141414] border border-white/10 rounded-[20px] p-5">
        <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#f59e0b]" />
              <h3 className="font-bold text-sm tracking-wide text-[#ffffffd6]">
                MOTOR DE SESIONES & MAKER MODE (LIVE TIME TRACKING)
              </h3>
            </div>
            <p className="text-[11px] text-[#ffffff6b] mt-0.5 font-mono">
              Cronometrador en Vivo • Heartbeats Periódicos (30s) • Acumulación Atómica a tiempoRealMins
            </p>
          </div>
          <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400">
            useSessions() Hook
          </span>
        </div>

        {/* SVG Process Diagram */}
        <div className="flex-1 min-h-[360px] flex items-center justify-center relative w-full overflow-x-auto bg-[#101012] rounded-xl border border-white/5 p-4 mb-4">
          <svg viewBox="0 0 820 300" className="w-full h-full max-h-[320px] select-none" style={{ minWidth: "680px" }}>
            <defs>
              <marker id="arrow-amber" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#f59e0b" />
              </marker>
              <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#10b981" />
              </marker>
            </defs>

            {/* Connecting lines */}
            <path d="M 160 80 L 230 80" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrow-amber)" fill="none" />
            <path d="M 410 80 L 480 80" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrow-amber)" fill="none" />
            <path d="M 640 80 L 700 80" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrow-green)" fill="none" />
            <path d="M 560 120 L 560 180" stroke="#10b981" strokeWidth="2" strokeDasharray="3,3" fill="none" />

            {/* Step 1: Disparo de Inicio */}
            <g className="cursor-pointer">
              <rect x="20" y="45" width="140" height="70" rx="8" fill="#18181b" stroke="#f59e0b" strokeWidth="1.5" />
              <text x="90" y="72" fill="#ffffffd6" fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="Geist">1. Start Session</text>
              <text x="90" y="90" fill="#ffffff6b" fontSize="8" textAnchor="middle" fontFamily="Geist Mono">status: &quot;en_curso&quot;</text>
              <text x="90" y="103" fill="#f59e0b" fontSize="7" textAnchor="middle" fontFamily="Geist Mono">startTime = now()</text>
            </g>

            {/* Step 2: Heartbeat Ticker */}
            <g className="cursor-pointer">
              <rect x="230" y="45" width="180" height="70" rx="8" fill="#18181b" stroke="#f59e0b" strokeWidth="2" />
              <text x="320" y="72" fill="#ffffffd6" fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="Geist">2. Heartbeat Loop (30s)</text>
              <text x="320" y="90" fill="#ffffff6b" fontSize="8" textAnchor="middle" fontFamily="Geist Mono">lastHeartbeat: Timestamp</text>
              <text x="320" y="103" fill="#3a7bd5" fontSize="7" textAnchor="middle" fontFamily="Geist Mono">Auto-cleanup de huérfanas</text>
            </g>

            {/* Step 3: Complete / Stop */}
            <g className="cursor-pointer">
              <rect x="480" y="45" width="160" height="70" rx="8" fill="#18181b" stroke="#10b981" strokeWidth="2" />
              <text x="560" y="72" fill="#ffffffd6" fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="Geist">3. Stop / Finish</text>
              <text x="560" y="90" fill="#ffffff6b" fontSize="8" textAnchor="middle" fontFamily="Geist Mono">status: &quot;completada&quot;</text>
              <text x="560" y="103" fill="#10b981" fontSize="7" textAnchor="middle" fontFamily="Geist Mono">durationMins = End - Start</text>
            </g>

            {/* Step 4: Rollup to Task */}
            <g className="cursor-pointer">
              <rect x="700" y="45" width="100" height="70" rx="8" fill="#18181b" stroke="#10b981" strokeWidth="1.5" />
              <text x="750" y="72" fill="#ffffffd6" fontSize="10" fontWeight="700" textAnchor="middle" fontFamily="Geist">Rollup</text>
              <text x="750" y="90" fill="#ffffff6b" fontSize="8" textAnchor="middle" fontFamily="Geist Mono">tiempoRealMins</text>
              <text x="750" y="103" fill="#10b981" fontSize="7" textAnchor="middle" fontFamily="Geist Mono">task.updated</text>
            </g>

            {/* Step 5: Financial Impact Bottom Block */}
            <g className="cursor-pointer">
              <rect x="420" y="180" width="280" height="70" rx="8" fill="rgba(16,185,129,0.08)" stroke="#10b981" strokeWidth="1.5" />
              <text x="560" y="208" fill="#ffffffd6" fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="Geist">Cálculo de Rentabilidad y Horas</text>
              <text x="560" y="225" fill="#ffffff6b" fontSize="8" textAnchor="middle" fontFamily="Geist Mono">costo_real = total_horas * worker.tarifa_hora</text>
              <text x="560" y="238" fill="#10b981" fontSize="7" textAnchor="middle" fontFamily="Geist Mono">Alimenta FinanzasView y TalentView</text>
            </g>
          </svg>
        </div>

        {/* Origin Selector Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: "manual", label: "Manual (Diseñador)", desc: "Iniciado por el usuario desde la tarjeta o topbar" },
            { id: "agent_self", label: "Agent Self", desc: "Sesión ejecutada automáticamente por el agente autónomo" },
            { id: "agent_research", label: "Agent Research", desc: "Sesión de investigación y extracción de assets" },
            { id: "agent_qa_visual", label: "Agent QA Visual", desc: "Auditoría automatizada de diseño y accesibilidad" }
          ].map(orig => (
            <button
              key={orig.id}
              onClick={() => setSelectedOrigin(orig.id)}
              className={`p-2.5 rounded-lg border text-left transition-colors ${
                selectedOrigin === orig.id
                  ? "bg-[#222222] border-amber-500/40 text-amber-400"
                  : "bg-[#181818] border-white/5 text-[#ffffff6b] hover:bg-[#1c1c1c]"
              }`}
            >
              <div className="font-mono text-[10px] font-bold truncate">{orig.label}</div>
              <div className="text-[9px] text-white/50 mt-0.5 line-clamp-1">{orig.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── METRICS & SPECIFICATION (RIGHT) ── */}
      <div className="w-full lg:w-96 flex flex-col bg-[#181818] border border-white/10 rounded-[20px] p-5">
        <div className="flex items-center gap-2 pb-3 border-b border-white/10 mb-4">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#ffffffd6]">
            Especificación del Motor
          </h4>
        </div>

        <div className="space-y-4 text-xs text-[#ffffff6b] leading-relaxed">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="font-bold text-white/90 block mb-1">Heartbeat de Recuperación (30s)</span>
            Si el navegador se cierra abruptamente, el hook useSessions detecta discrepancias entre el timestamp actual y el lastHeartbeat para forzar el cierre con status: &quot;completada_forzada&quot;.
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="font-bold text-white/90 block mb-1">Múltiples Orígenes (origin)</span>
            Las sesiones pueden ser disparadas manualmente por diseñadores humanos o por agentes autónomos de IA en segundo plano (agent_self, agent_research, agent_qa_visual).
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="font-bold text-white/90 block mb-1">Rollup Atómico</span>
            Al cerrar una sesión, se ejecuta un incremento atómico sobre el documento de la tarea, consolidando el tiempo real sin recargar la página.
          </div>
        </div>
      </div>
    </div>
  );
}
