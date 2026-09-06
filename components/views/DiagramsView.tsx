"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Network, Database, GitBranch, Zap, Clock, 
  Shield, Sparkles, BookOpen, Download, Share2, 
  Code2, Check, ExternalLink, HelpCircle
} from "lucide-react";
import { SystemArchitectureDiagram } from "./diagrams/SystemArchitectureDiagram";
import { FirestoreDataModelDiagram } from "./diagrams/FirestoreDataModelDiagram";
import { DeliverableLifecycleDiagram } from "./diagrams/DeliverableLifecycleDiagram";
import { RealtimeSyncFlowDiagram } from "./diagrams/RealtimeSyncFlowDiagram";
import { SessionsEngineDiagram } from "./diagrams/SessionsEngineDiagram";
import { SecurityMatrixDiagram } from "./diagrams/SecurityMatrixDiagram";
import { AIAgentPipelineDiagram } from "./diagrams/AIAgentPipelineDiagram";
import { DiagramDesignCheatsheet } from "./diagrams/DiagramDesignCheatsheet";

type DiagramTabKey = 
  | "arquitectura" 
  | "datos" 
  | "ciclo_vida" 
  | "sincronizacion" 
  | "sesiones" 
  | "seguridad" 
  | "agentes" 
  | "catalogo";

interface DiagramTabMeta {
  key: DiagramTabKey;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  badge?: string;
  color: string;
}

const DIAGRAM_TABS: DiagramTabMeta[] = [
  { key: "arquitectura", label: "Topología General", icon: Network, color: "#3a7bd5" },
  { key: "datos", label: "Colecciones & Modelo", icon: Database, color: "#8b5cf6" },
  { key: "ciclo_vida", label: "Ciclo de Tareas", icon: GitBranch, color: "#10b981" },
  { key: "sincronizacion", label: "Flujo Reactivo", icon: Zap, color: "#06b6d4" },
  { key: "sesiones", label: "Motor Maker Mode", icon: Clock, color: "#f59e0b" },
  { key: "seguridad", label: "Matriz RBAC", icon: Shield, color: "#ec4899" },
  { key: "agentes", label: "Agentes & GodMaker", icon: Sparkles, color: "#a855f7" },
  { key: "catalogo", label: "Diagram-Design 39", icon: BookOpen, badge: "Skill", color: "#3b82f6" },
];

export function DiagramsView() {
  const [activeTab, setActiveTab] = useState<DiagramTabKey>("arquitectura");
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyArchitecturePrompt = () => {
    const summary = `Arquitectura Oficial de Taski (Single Source of Truth en Firestore):
- Capa Cliente: Next.js 14 App Router + Zustand + TanStack Query
- Base de Datos: Google Cloud Firestore Native (/clients, /members, /projects, /tasks, /sessions)
- Tiempo Real: onSnapshot listeners reactivos + serverTimestamp()
- Sesiones: Motor Maker Mode con heartbeats de 30s y rollup a tiempoRealMins
- RBAC: admin vs diseno vs cliente con aislamiento estricto de notas internas y finanzas
- Estilo: Protocolo Taski Layer 0 (#181817), Layer 1 (#121212), Layer 2 (#181818) + cathrynlavery/diagram-design SVG`;

    navigator.clipboard.writeText(summary);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-[#121212] p-4 lg:p-6 space-y-4">
      {/* ── TOP HEADER & SUBMENU ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-[20px] bg-[#181818] border border-white/10 shadow-sm flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3a7bd5]" />
            <h1 className="text-base font-bold tracking-tight text-[#ffffffd6]">
              Centro de Arquitectura & Diagramas de Taski
            </h1>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400">
              diagram-design v2.6
            </span>
          </div>
          <p className="text-xs text-[#ffffff6b] mt-0.5">
            Documentación visual interactiva y esquemas estructurales del sistema Taski con estándar editorial SVG.
          </p>
        </div>

        {/* Action Tools */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyArchitecturePrompt}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#222222] hover:bg-[#282828] border border-white/10 text-xs font-medium text-[#ffffffd6] transition-colors"
            title="Copiar resumen técnico de la arquitectura"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">¡Copiado!</span>
              </>
            ) : (
              <>
                <Code2 className="w-3.5 h-3.5 text-white/60" />
                <span>Copiar Especificación</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── TAB SELECTOR BAR ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-shrink-0 scrollbar-none">
        {DIAGRAM_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-[#1f1f1f] text-[#ffffffd6] border shadow-sm"
                  : "bg-[#181818]/60 hover:bg-[#181818] text-[#ffffff6b] hover:text-[#ffffffd6] border border-white/5"
              }`}
              style={{
                borderColor: isActive ? tab.color : undefined
              }}
            >
              <Icon
                className="w-4 h-4"
                style={{ color: isActive ? tab.color : "rgba(255,255,255,0.4)" }}
              />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── DIAGRAM CONTENT AREA (ANIMATED) ── */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="w-full h-full"
          >
            {activeTab === "arquitectura" && <SystemArchitectureDiagram />}
            {activeTab === "datos" && <FirestoreDataModelDiagram />}
            {activeTab === "ciclo_vida" && <DeliverableLifecycleDiagram />}
            {activeTab === "sincronizacion" && <RealtimeSyncFlowDiagram />}
            {activeTab === "sesiones" && <SessionsEngineDiagram />}
            {activeTab === "seguridad" && <SecurityMatrixDiagram />}
            {activeTab === "agentes" && <AIAgentPipelineDiagram />}
            {activeTab === "catalogo" && <DiagramDesignCheatsheet />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
