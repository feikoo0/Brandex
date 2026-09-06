"use client";

import React, { useState } from "react";
import { 
  Zap, RefreshCw, Layers, ArrowRight, 
  CheckCircle2, Flame, ShieldAlert, Cpu, ArrowDown
} from "lucide-react";

interface StepDetail {
  stepNumber: number;
  title: string;
  actor: string;
  sourceFiles: string[];
  latency: string;
  description: string;
  technicalGuarantee: string;
  color: string;
}

const FLOW_STEPS: StepDetail[] = [
  {
    stepNumber: 1,
    title: "1. Acción de Usuario en la UI (Mutación)",
    actor: "Client UI (React / Dnd-Kit)",
    sourceFiles: ["KanbanBoard.tsx", "TaskModal.tsx", "ProjectFullScreenView.tsx"],
    latency: "0 ms (Inmediato)",
    description: "El usuario arrastra una tarea entre columnas, edita una nota o inicia un cronómetro en Maker Mode.",
    technicalGuarantee: "Feedback háptico y visual instantáneo sin bloquear el hilo principal de React.",
    color: "#3a7bd5"
  },
  {
    stepNumber: 2,
    title: "2. Mutación Optimista en Caché Local",
    actor: "TanStack Query / Zustand Store",
    sourceFiles: ["hooks/useData.ts", "lib/store.ts"],
    latency: "< 5 ms",
    description: "TanStack Query aplica la mutación optimista en el caché en memoria antes de que la petición de red regrese.",
    technicalGuarantee: "La UI responde a 60 FPS sin esperar confirmación del servidor remoto.",
    color: "#8b5cf6"
  },
  {
    stepNumber: 3,
    title: "3. Escritura Atómica con serverTimestamp()",
    actor: "Firestore Web SDK v12",
    sourceFiles: ["lib/firestore.ts", "SCHEMA.md"],
    latency: "~40 - 80 ms",
    description: "Se ejecuta updateDoc() o setDoc() adjuntando updatedAt: serverTimestamp() como reloj universal de Firestore.",
    technicalGuarantee: "Persistencia atómica y resolución de conflictos por último timestamp del servidor de Google.",
    color: "#f59e0b"
  },
  {
    stepNumber: 4,
    title: "4. Disparo de Snapshot Stream en Tiempo Real",
    actor: "Google Cloud Firestore Backend",
    sourceFiles: ["lib/firestore.ts", "hooks/useData.ts"],
    latency: "~20 - 50 ms",
    description: "Firestore propaga el evento de cambio por WebSockets/gRPC a todos los clientes suscritos (Admin, Diseñador, Cliente).",
    technicalGuarantee: "Cero intermediarios (Sin Notion, sin servidores Python externos). Pure Firestore.",
    color: "#10b981"
  },
  {
    stepNumber: 5,
    title: "5. Re-render Reactivo & Resincronización",
    actor: "Hooks Oficiales (useProjectSummary / useSessions)",
    sourceFiles: ["hooks/useProjectSummary.ts", "hooks/useClients.ts"],
    latency: "< 10 ms",
    description: "Los hooks recalcularán el % de progreso del proyecto, las formas vectoriales en portada y las métricas financieras.",
    technicalGuarantee: "Consistencia visual global garantizada entre todas las pestañas y navegadores abiertos.",
    color: "#06b6d4"
  }
];

export function RealtimeSyncFlowDiagram() {
  const [activeStepIdx, setActiveStepIdx] = useState<number>(0);
  const activeStep = FLOW_STEPS[activeStepIdx];

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full h-full p-4 lg:p-6 overflow-y-auto">
      {/* ── FLOW PIPELINE (LEFT) ── */}
      <div className="flex-1 flex flex-col bg-[#141414] border border-white/10 rounded-[20px] p-5">
        <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#3a7bd5]" />
              <h3 className="font-bold text-sm tracking-wide text-[#ffffffd6]">
                PIPELINE DE SINCRONIZACIÓN EN TIEMPO REAL
              </h3>
            </div>
            <p className="text-[11px] text-[#ffffff6b] mt-0.5 font-mono">
              Arquitectura Single Source of Truth • Mutación Optimista $\to$ serverTimestamp $\to$ Snapshot Broadcast
            </p>
          </div>
          <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            Pure Firestore 100%
          </span>
        </div>

        {/* Interactive Step Chain */}
        <div className="flex-1 space-y-3 mb-6">
          {FLOW_STEPS.map((step, idx) => {
            const isSelected = idx === activeStepIdx;
            return (
              <button
                key={idx}
                onClick={() => setActiveStepIdx(idx)}
                className={`w-full p-4 rounded-xl border text-left transition-all duration-200 flex items-center justify-between ${
                  isSelected
                    ? "bg-[#1f1f1f] shadow-lg"
                    : "bg-[#181818] hover:bg-[#1a1a1a]"
                }`}
                style={{
                  borderColor: isSelected ? step.color : "rgba(255, 255, 255, 0.10)"
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs"
                    style={{
                      backgroundColor: `${step.color}20`,
                      color: step.color,
                      border: `1px solid ${step.color}40`
                    }}
                  >
                    0{step.stepNumber}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#ffffffd6]">
                      {step.title}
                    </h4>
                    <span className="text-[10px] font-mono text-[#ffffff6b]">
                      Actor: {step.actor}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-white/60 border border-white/5">
                    {step.latency}
                  </span>
                  <ArrowRight className="w-4 h-4 text-white/40" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Prohibited Legacy Architecture Alert Banner */}
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-rose-300 leading-relaxed">
            <span className="font-bold">Regla de Arquitectura Estricta:</span> Queda estrictamente prohibido reintroducir sincronizadores de Notion o servidores intermediarios en Python. Todo el flujo opera de forma pura sobre Google Cloud Firestore.
          </div>
        </div>
      </div>

      {/* ── STEP INSPECTOR PANEL (RIGHT) ── */}
      <div className="w-full lg:w-96 flex flex-col bg-[#181818] border border-white/10 rounded-[20px] p-5">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeStep.color }} />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#ffffffd6]">
              Detalle del Paso {activeStep.stepNumber}
            </h4>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] text-white/60">
            {activeStep.latency}
          </span>
        </div>

        <h3 className="text-base font-bold text-[#ffffffd6] mb-1">
          {activeStep.title}
        </h3>
        <span className="text-[11px] font-mono text-[#3a7bd5] mb-3 block">
          Actor: {activeStep.actor}
        </span>

        <p className="text-xs leading-relaxed text-[#ffffff6b] mb-4">
          {activeStep.description}
        </p>

        {/* Source Files */}
        <div className="mb-4">
          <div className="text-[11px] font-semibold text-[#ffffffd6] mb-2">
            Módulos que Intervienen:
          </div>
          <div className="space-y-1.5">
            {activeStep.sourceFiles.map((f, i) => (
              <div
                key={i}
                className="px-2.5 py-1.5 rounded-lg bg-[#222222] border border-white/5 text-[11px] font-mono text-white/80"
              >
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Technical Guarantee */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 mb-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Garantía Técnica:</span>
          </div>
          <p className="text-xs text-[#ffffff6b] leading-relaxed">
            {activeStep.technicalGuarantee}
          </p>
        </div>
      </div>
    </div>
  );
}
