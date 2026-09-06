"use client";

import React, { useState } from "react";
import { Sparkles, Bot, Terminal, ArrowRight, Cpu, Database, CheckCircle2, Shield } from "lucide-react";

export function AIAgentPipelineDiagram() {
  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full h-full p-4 lg:p-6 overflow-y-auto">
      {/* ── AGENT ARCHITECTURE SCHEMATIC ── */}
      <div className="flex-1 flex flex-col bg-[#141414] border border-white/10 rounded-[20px] p-5">
        <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#8b5cf6]" />
              <h3 className="font-bold text-sm tracking-wide text-[#ffffffd6]">
                PIPELINE DE AGENTES IA & MODO GODMAKER
              </h3>
            </div>
            <p className="text-[11px] text-[#ffffff6b] mt-0.5 font-mono">
              Interacción Asistida • /api/agent/chat • Tool Calling sobre Firestore • Canvas Reactivo
            </p>
          </div>
          <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-400">
            AI Assistant Engine
          </span>
        </div>

        {/* SVG Pipeline */}
        <div className="flex-1 min-h-[360px] flex items-center justify-center relative w-full overflow-x-auto bg-[#101012] rounded-xl border border-white/5 p-4 mb-4">
          <svg viewBox="0 0 820 300" className="w-full h-full max-h-[320px] select-none" style={{ minWidth: "680px" }}>
            <defs>
              <marker id="arrow-purple" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#8b5cf6" />
              </marker>
              <marker id="arrow-blue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#3a7bd5" />
              </marker>
            </defs>

            {/* Paths */}
            <path d="M 160 80 L 230 80" stroke="#8b5cf6" strokeWidth="2" markerEnd="url(#arrow-purple)" fill="none" />
            <path d="M 400 80 L 470 80" stroke="#8b5cf6" strokeWidth="2" markerEnd="url(#arrow-purple)" fill="none" />
            <path d="M 640 80 L 700 80" stroke="#3a7bd5" strokeWidth="2" markerEnd="url(#arrow-blue)" fill="none" />
            <path d="M 550 125 L 550 180" stroke="#10b981" strokeWidth="2" strokeDasharray="3,3" fill="none" />

            {/* Node 1: User & GodMaker */}
            <g className="cursor-pointer">
              <rect x="20" y="45" width="140" height="70" rx="8" fill="#18181b" stroke="#8b5cf6" strokeWidth="1.5" />
              <text x="90" y="72" fill="#ffffffd6" fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="Geist">1. User & GodMaker</text>
              <text x="90" y="90" fill="#ffffff6b" fontSize="8" textAnchor="middle" fontFamily="Geist Mono">Prompt o Quick Action</text>
              <text x="90" y="103" fill="#8b5cf6" fontSize="7" textAnchor="middle" fontFamily="Geist Mono">GodMakerToggle.tsx</text>
            </g>

            {/* Node 2: /api/agent/chat */}
            <g className="cursor-pointer">
              <rect x="230" y="45" width="170" height="70" rx="8" fill="#18181b" stroke="#8b5cf6" strokeWidth="2" />
              <text x="315" y="72" fill="#ffffffd6" fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="Geist">2. /api/agent/chat</text>
              <text x="315" y="90" fill="#ffffff6b" fontSize="8" textAnchor="middle" fontFamily="Geist Mono">Serverless Edge Route</text>
              <text x="315" y="103" fill="#3a7bd5" fontSize="7" textAnchor="middle" fontFamily="Geist Mono">Auth & Context Inject</text>
            </g>

            {/* Node 3: LLM & Tool Calling */}
            <g className="cursor-pointer">
              <rect x="470" y="45" width="170" height="70" rx="8" fill="#18181b" stroke="#10b981" strokeWidth="2" />
              <text x="555" y="72" fill="#ffffffd6" fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="Geist">3. LLM Tool Calling</text>
              <text x="555" y="90" fill="#ffffff6b" fontSize="8" textAnchor="middle" fontFamily="Geist Mono">create_task • assign_proj</text>
              <text x="555" y="103" fill="#10b981" fontSize="7" textAnchor="middle" fontFamily="Geist Mono">Subagent Routing</text>
            </g>

            {/* Node 4: AgentCanvas HUD */}
            <g className="cursor-pointer">
              <rect x="700" y="45" width="100" height="70" rx="8" fill="#18181b" stroke="#3a7bd5" strokeWidth="1.5" />
              <text x="750" y="72" fill="#ffffffd6" fontSize="10" fontWeight="700" textAnchor="middle" fontFamily="Geist">Canvas</text>
              <text x="750" y="90" fill="#ffffff6b" fontSize="8" textAnchor="middle" fontFamily="Geist Mono">AgentCanvas</text>
              <text x="750" y="103" fill="#3a7bd5" fontSize="7" textAnchor="middle" fontFamily="Geist Mono">Live Stream</text>
            </g>

            {/* Bottom Node: Firestore Mutation */}
            <g className="cursor-pointer">
              <rect x="420" y="180" width="260" height="70" rx="8" fill="rgba(16,185,129,0.08)" stroke="#10b981" strokeWidth="1.5" />
              <text x="550" y="208" fill="#ffffffd6" fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="Geist">Mutación Directa en Firestore</text>
              <text x="550" y="225" fill="#ffffff6b" fontSize="8" textAnchor="middle" fontFamily="Geist Mono">Creación de tareas o proyectos</text>
              <text x="550" y="238" fill="#10b981" fontSize="7" textAnchor="middle" fontFamily="Geist Mono">Propagación instantánea a UI</text>
            </g>
          </svg>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="font-bold text-xs text-white/90 mb-1">GodMaker Mode</div>
            <p className="text-[11px] text-[#ffffff6b]">Modo omnipotente para administradores que permite crear campañas completas y asignar miembros con un solo prompt.</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="font-bold text-xs text-white/90 mb-1">Tool Calling Seguro</div>
            <p className="text-[11px] text-[#ffffff6b]">Validación de esquemas y permisos antes de cualquier mutación en las colecciones de Firestore.</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="font-bold text-xs text-white/90 mb-1">Streaming & Feedback</div>
            <p className="text-[11px] text-[#ffffff6b]">Renderizado en vivo de respuestas y sugerencias interactivas en el componente AgentCanvas.</p>
          </div>
        </div>
      </div>

      {/* ── SPECS PANEL (RIGHT) ── */}
      <div className="w-full lg:w-96 flex flex-col bg-[#181818] border border-white/10 rounded-[20px] p-5">
        <div className="flex items-center gap-2 pb-3 border-b border-white/10 mb-4">
          <Bot className="w-4 h-4 text-purple-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#ffffffd6]">
            Capacidades del Agente
          </h4>
        </div>

        <div className="space-y-3 text-xs text-[#ffffff6b]">
          <div className="p-3 rounded-xl bg-[#222222] border border-white/5">
            <span className="font-bold text-white/90 font-mono text-[11px] block mb-1">create_project_with_tasks</span>
            Genera un proyecto con sus entregables asociados en un solo paso atómico.
          </div>
          <div className="p-3 rounded-xl bg-[#222222] border border-white/5">
            <span className="font-bold text-white/90 font-mono text-[11px] block mb-1">rebalance_team_workload</span>
            Analiza la carga laboral en useMembers() y redistribuye tareas pendientes.
          </div>
          <div className="p-3 rounded-xl bg-[#222222] border border-white/5">
            <span className="font-bold text-white/90 font-mono text-[11px] block mb-1">audit_client_profitability</span>
            Cruza finanzas y sesiones de tiempo real para calcular margen neto por cuenta.
          </div>
        </div>
      </div>
    </div>
  );
}
