"use client";

import React, { useState } from "react";
import { 
  Layers, Database, Globe, Cpu, Shield, 
  ExternalLink, Code2, Sparkles, CheckCircle2,
  Info, ArrowRight, Server, Smartphone, Laptop
} from "lucide-react";

interface NodeDetail {
  id: string;
  title: string;
  category: "Client / Presentation" | "Realtime & State" | "API / Serverless" | "Database & Storage" | "External Services";
  description: string;
  keyFiles: string[];
  protocols: string[];
  guarantees: string[];
  color: string;
}

const NODES_DATA: Record<string, NodeDetail> = {
  nextjs: {
    id: "nextjs",
    title: "Next.js 14 App Router (React 18)",
    category: "Client / Presentation",
    description: "Capa de presentación y enrutamiento estructurada en rutas de roles segmentadas: /admin, /equipo, /cliente con renderizado híbrido cliente/servidor.",
    keyFiles: ["app/(dashboard)/admin/page.tsx", "app/(dashboard)/equipo/page.tsx", "app/(dashboard)/cliente/page.tsx", "app/(dashboard)/layout.tsx"],
    protocols: ["Next.js App Router", "Server & Client Components", "Framer Motion View Transitions"],
    guarantees: ["Cero latencia de cambio de vistas con ViewTransition", "Aislamiento de sesiones por rol", "Design System Protocol oficial"],
    color: "#3a7bd5"
  },
  state_management: {
    id: "state_management",
    title: "Zustand Global Store & Local State",
    category: "Realtime & State",
    description: "Almacenamiento reactivo en memoria para autenticación (useAuthStore), navegación/pestañas activas (useUIStore) y configuración de espacio de trabajo.",
    keyFiles: ["lib/store.ts", "lib/types.ts", "lib/constants.ts"],
    protocols: ["Zustand Middleware", "Persistent Session LocalStorage", "Reactive Selectors"],
    guarantees: ["Sincronización instantánea de UI", "Recuperación de sesión en recarga", "Desacoplamiento limpio de componentes"],
    color: "#8b5cf6"
  },
  tanstack_query: {
    id: "tanstack_query",
    title: "TanStack React Query Cache Layer",
    category: "Realtime & State",
    description: "Capa de caché unificada que consume snapshots directos de Firestore, maneja invalidación reactiva, actualizaciones optimistas y deduplicación.",
    keyFiles: ["hooks/useData.ts", "app/providers.tsx"],
    protocols: ["QueryClient", "Optimistic Mutations", "Cache Invalidation on Mutation"],
    guarantees: ["Cero peticiones redundantes", "Refresco instantáneo en mutaciones", "Persistencia de estado caliente"],
    color: "#ec4899"
  },
  realtime_hooks: {
    id: "realtime_hooks",
    title: "Hooks Oficiales Single Source of Truth",
    category: "Realtime & State",
    description: "Conjunto de hooks personalizados para suscripción a colecciones y resolución de entidades dependientes con resolución HSL de marca.",
    keyFiles: ["hooks/useClients.ts", "hooks/useMembers.ts", "hooks/useSessions.ts", "hooks/useProjectSummary.ts"],
    protocols: ["Firestore onSnapshot", "Single Source Color Resolvers", "Dynamic Project Summary Rollup"],
    guarantees: ["Actualización reactiva < 100ms", "Cálculo en vivo de tareas (X de Y)", "Resolución determinista de color"],
    color: "#10b981"
  },
  api_routes: {
    id: "api_routes",
    title: "Next.js Edge / Serverless API Routes",
    category: "API / Serverless",
    description: "Rutas de backend serverless para autenticación, creación de workspaces multi-tenant y orquestación del chat con agentes inteligentes.",
    keyFiles: ["app/api/agent/chat/route.ts", "app/api/login/route.ts", "app/api/workspace/create/route.ts"],
    protocols: ["HTTP POST JSON", "Token Verification", "Serverless Streaming & Execution"],
    guarantees: ["Aislamiento de claves secretas en servidor", "Validación estricta de esquemas", "Compatibilidad Edge"],
    color: "#f59e0b"
  },
  firestore_db: {
    id: "firestore_db",
    title: "Google Cloud Firestore Native DB",
    category: "Database & Storage",
    description: "Base de datos NoSQL documental y en tiempo real como Fuente Única de Verdad (Single Source of Truth). Colecciones: clients, members, projects, tasks, sessions.",
    keyFiles: ["lib/firestore.ts", "SCHEMA.md", "firestore.rules"],
    protocols: ["Firestore Web SDK v12", "serverTimestamp() triggers", "Composite Indexes"],
    guarantees: ["Persistencia atómica", "Timestamps universales (createdAt, updatedAt)", "Escucha de cambios en tiempo real"],
    color: "#f97316"
  },
  external_services: {
    id: "external_services",
    title: "Ecosistema de Integraciones Externas",
    category: "External Services",
    description: "Conexión directa con Google Identity (Auth), carpetas maestras en Google Drive para entregables y Figma REST API para lectura de tokens y layouts.",
    keyFiles: ["components/common/DriveButton.tsx", ".env.local", "lib/auth.ts"],
    protocols: ["OAuth2 Google Auth", "Google Drive Direct URLs", "Figma REST API v1"],
    guarantees: ["Acceso seguro a recursos corporativos", "Sincronización de activos en la nube", "Extracción visual de Figma"],
    color: "#06b6d4"
  }
};

export function SystemArchitectureDiagram() {
  const [selectedNode, setSelectedNode] = useState<string>("nextjs");
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const activeNode = NODES_DATA[selectedNode] || NODES_DATA.nextjs;

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full h-full p-4 lg:p-6 overflow-y-auto">
      {/* ── DIAGRAM CANVAS (SVG EDITORIAL) ── */}
      <div className="flex-1 flex flex-col bg-[#141414] border border-white/10 rounded-[20px] p-5 relative overflow-hidden">
        {/* Header bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/5 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3a7bd5]" />
              <h3 className="font-bold text-sm tracking-wide text-[#ffffffd6]">
                TOPOLOGÍA DE ARQUITECTURA GENERAL TASKI
              </h3>
            </div>
            <p className="text-[11px] text-[#ffffff6b] mt-0.5 font-mono">
              Next.js 14 • React Query • Firestore Single Source of Truth • Realtime Streams
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/10 text-white/60">
              Estándar Editorial diagram-design
            </span>
          </div>
        </div>

        {/* Interactive SVG Schematic */}
        <div className="flex-1 min-h-[460px] flex items-center justify-center relative w-full overflow-x-auto">
          <svg
            viewBox="0 0 880 500"
            className="w-full h-full max-h-[500px] select-none"
            style={{ minWidth: "700px" }}
          >
            <defs>
              <pattern id="grid-dots" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="rgba(255,255,255,0.03)" />
              </pattern>
            </defs>

            <rect width="880" height="500" fill="url(#grid-dots)" />

            {/* ── TIERS BACKGROUND BOUNDARIES ── */}
            {/* Tier 1: Client & Presentation */}
            <rect
              x="20" y="20" width="840" height="110" rx="10"
              fill="rgba(58, 123, 213, 0.03)"
              stroke="rgba(58, 123, 213, 0.20)"
              strokeDasharray="4,4"
              strokeWidth="1"
            />
            <text x="35" y="42" fill="#3a7bd5" fontSize="10" fontFamily="Geist Mono, monospace" fontWeight="600" letterSpacing="1">
              TIER 1 — CLIENT & PRESENTATION LAYER (APP ROUTER / REACT 18)
            </text>

            {/* Tier 2: Realtime & Cache */}
            <rect
              x="20" y="150" width="840" height="110" rx="10"
              fill="rgba(16, 185, 129, 0.03)"
              stroke="rgba(16, 185, 129, 0.20)"
              strokeDasharray="4,4"
              strokeWidth="1"
            />
            <text x="35" y="172" fill="#10b981" fontSize="10" fontFamily="Geist Mono, monospace" fontWeight="600" letterSpacing="1">
              TIER 2 — REALTIME SYNC & REACTIVE CACHE LAYER (SINGLE SOURCE OF TRUTH)
            </text>

            {/* Tier 3: API & Database & Cloud */}
            <rect
              x="20" y="280" width="840" height="190" rx="10"
              fill="rgba(245, 158, 11, 0.03)"
              stroke="rgba(245, 158, 11, 0.20)"
              strokeDasharray="4,4"
              strokeWidth="1"
            />
            <text x="35" y="302" fill="#f59e0b" fontSize="10" fontFamily="Geist Mono, monospace" fontWeight="600" letterSpacing="1">
              TIER 3 — FIRESTORE NATIVE STORAGE, SERVERLESS API & CLOUD ECOSYSTEM
            </text>

            {/* ── CONNECTION LINES ── */}
            {/* Nextjs -> Zustand */}
            <path d="M 160 110 L 160 185" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" fill="none" />
            <path d="M 440 110 L 440 185" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" fill="none" />
            <path d="M 720 110 L 720 185" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" fill="none" />

            {/* Realtime Hooks -> Firestore */}
            <path d="M 720 240 L 720 330" stroke="#10b981" strokeWidth="2" strokeDasharray="4,2" fill="none" />
            
            {/* TanStack Query -> Firestore */}
            <path d="M 440 240 L 440 330" stroke="#3a7bd5" strokeWidth="2" fill="none" />

            {/* API Routes -> Firestore */}
            <path d="M 240 387 L 330 387" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" fill="none" />

            {/* Firestore -> External */}
            <path d="M 570 387 L 640 387" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="3,3" fill="none" />

            {/* ── TIER 1 NODES ── */}
            {/* Node 1A: /admin (Dashboard) */}
            <g
              onClick={() => setSelectedNode("nextjs")}
              onMouseEnter={() => setHoveredNode("nextjs")}
              onMouseLeave={() => setHoveredNode(null)}
              className="cursor-pointer transition-all duration-200"
            >
              <rect
                x="40" y="55" width="240" height="55" rx="8"
                fill={selectedNode === "nextjs" ? "rgba(58,123,213,0.18)" : "#1c1c20"}
                stroke={selectedNode === "nextjs" ? "#3a7bd5" : "rgba(255,255,255,0.12)"}
                strokeWidth={selectedNode === "nextjs" ? "2" : "1"}
              />
              <text x="55" y="78" fill="#ffffffd6" fontSize="12" fontWeight="600" fontFamily="Geist, sans-serif">
                Admin Dashboard (/admin)
              </text>
              <text x="55" y="95" fill="#ffffff6b" fontSize="9" fontFamily="Geist Mono, monospace">
                PulseView • Engine • Finanzas • Talent
              </text>
            </g>

            {/* Node 1B: /equipo & /cliente */}
            <g
              onClick={() => setSelectedNode("nextjs")}
              onMouseEnter={() => setHoveredNode("nextjs")}
              onMouseLeave={() => setHoveredNode(null)}
              className="cursor-pointer transition-all duration-200"
            >
              <rect
                x="320" y="55" width="240" height="55" rx="8"
                fill={selectedNode === "nextjs" ? "rgba(58,123,213,0.18)" : "#1c1c20"}
                stroke={selectedNode === "nextjs" ? "#3a7bd5" : "rgba(255,255,255,0.12)"}
                strokeWidth={selectedNode === "nextjs" ? "2" : "1"}
              />
              <text x="335" y="78" fill="#ffffffd6" fontSize="12" fontWeight="600" fontFamily="Geist, sans-serif">
                Equipo (/equipo) & Cliente (/cliente)
              </text>
              <text x="335" y="95" fill="#ffffff6b" fontSize="9" fontFamily="Geist Mono, monospace">
                Maker Mode • TaskCards • Aprobaciones
              </text>
            </g>

            {/* Node 1C: Modals & Portals */}
            <g
              onClick={() => setSelectedNode("nextjs")}
              onMouseEnter={() => setHoveredNode("nextjs")}
              onMouseLeave={() => setHoveredNode(null)}
              className="cursor-pointer transition-all duration-200"
            >
              <rect
                x="600" y="55" width="240" height="55" rx="8"
                fill={selectedNode === "nextjs" ? "rgba(58,123,213,0.18)" : "#1c1c20"}
                stroke={selectedNode === "nextjs" ? "#3a7bd5" : "rgba(255,255,255,0.12)"}
                strokeWidth={selectedNode === "nextjs" ? "2" : "1"}
              />
              <text x="615" y="78" fill="#ffffffd6" fontSize="12" fontWeight="600" fontFamily="Geist, sans-serif">
                Entity Modals & FullScreen Views
              </text>
              <text x="615" y="95" fill="#ffffff6b" fontSize="9" fontFamily="Geist Mono, monospace">
                ProjectModal • TaskModal • Radix UI
              </text>
            </g>

            {/* ── TIER 2 NODES ── */}
            {/* Node 2A: Zustand Store */}
            <g
              onClick={() => setSelectedNode("state_management")}
              onMouseEnter={() => setHoveredNode("state_management")}
              onMouseLeave={() => setHoveredNode(null)}
              className="cursor-pointer transition-all duration-200"
            >
              <rect
                x="40" y="185" width="240" height="55" rx="8"
                fill={selectedNode === "state_management" ? "rgba(139,92,246,0.18)" : "#1c1c20"}
                stroke={selectedNode === "state_management" ? "#8b5cf6" : "rgba(255,255,255,0.12)"}
                strokeWidth={selectedNode === "state_management" ? "2" : "1"}
              />
              <text x="55" y="208" fill="#ffffffd6" fontSize="12" fontWeight="600" fontFamily="Geist, sans-serif">
                Zustand (useAuthStore / useUIStore)
              </text>
              <text x="55" y="225" fill="#ffffff6b" fontSize="9" fontFamily="Geist Mono, monospace">
                activeTab • viewStack • isSmartMode
              </text>
            </g>

            {/* Node 2B: TanStack Query Cache */}
            <g
              onClick={() => setSelectedNode("tanstack_query")}
              onMouseEnter={() => setHoveredNode("tanstack_query")}
              onMouseLeave={() => setHoveredNode(null)}
              className="cursor-pointer transition-all duration-200"
            >
              <rect
                x="320" y="185" width="240" height="55" rx="8"
                fill={selectedNode === "tanstack_query" ? "rgba(236,72,153,0.18)" : "#1c1c20"}
                stroke={selectedNode === "tanstack_query" ? "#ec4899" : "rgba(255,255,255,0.12)"}
                strokeWidth={selectedNode === "tanstack_query" ? "2" : "1"}
              />
              <text x="335" y="208" fill="#ffffffd6" fontSize="12" fontWeight="600" fontFamily="Geist, sans-serif">
                TanStack Query (useData / useSync)
              </text>
              <text x="335" y="225" fill="#ffffff6b" fontSize="9" fontFamily="Geist Mono, monospace">
                Optimistic Updates • Unified Data Cache
              </text>
            </g>

            {/* Node 2C: Realtime Hooks */}
            <g
              onClick={() => setSelectedNode("realtime_hooks")}
              onMouseEnter={() => setHoveredNode("realtime_hooks")}
              onMouseLeave={() => setHoveredNode(null)}
              className="cursor-pointer transition-all duration-200"
            >
              <rect
                x="600" y="185" width="240" height="55" rx="8"
                fill={selectedNode === "realtime_hooks" ? "rgba(16,185,129,0.18)" : "#1c1c20"}
                stroke={selectedNode === "realtime_hooks" ? "#10b981" : "rgba(255,255,255,0.12)"}
                strokeWidth={selectedNode === "realtime_hooks" ? "2" : "1"}
              />
              <text x="615" y="208" fill="#ffffffd6" fontSize="12" fontWeight="600" fontFamily="Geist, sans-serif">
                Hooks Single Source of Truth
              </text>
              <text x="615" y="225" fill="#ffffff6b" fontSize="9" fontFamily="Geist Mono, monospace">
                useClients • useMembers • useSessions
              </text>
            </g>

            {/* ── TIER 3 NODES ── */}
            {/* Node 3A: Next API Routes */}
            <g
              onClick={() => setSelectedNode("api_routes")}
              onMouseEnter={() => setHoveredNode("api_routes")}
              onMouseLeave={() => setHoveredNode(null)}
              className="cursor-pointer transition-all duration-200"
            >
              <rect
                x="40" y="330" width="200" height="115" rx="8"
                fill={selectedNode === "api_routes" ? "rgba(245,158,11,0.18)" : "#18181b"}
                stroke={selectedNode === "api_routes" ? "#f59e0b" : "rgba(255,255,255,0.12)"}
                strokeWidth={selectedNode === "api_routes" ? "2" : "1"}
              />
              <text x="55" y="355" fill="#f59e0b" fontSize="11" fontWeight="700" fontFamily="Geist Mono, monospace">
                API SERVERLESS
              </text>
              <text x="55" y="375" fill="#ffffffd6" fontSize="11" fontWeight="600" fontFamily="Geist, sans-serif">
                /api/agent/chat
              </text>
              <text x="55" y="395" fill="#ffffffd6" fontSize="11" fontWeight="600" fontFamily="Geist, sans-serif">
                /api/login
              </text>
              <text x="55" y="415" fill="#ffffffd6" fontSize="11" fontWeight="600" fontFamily="Geist, sans-serif">
                /api/workspace/create
              </text>
            </g>

            {/* Node 3B: Google Cloud Firestore Native DB */}
            <g
              onClick={() => setSelectedNode("firestore_db")}
              onMouseEnter={() => setHoveredNode("firestore_db")}
              onMouseLeave={() => setHoveredNode(null)}
              className="cursor-pointer transition-all duration-200"
            >
              <rect
                x="330" y="330" width="240" height="115" rx="8"
                fill={selectedNode === "firestore_db" ? "rgba(249,115,22,0.18)" : "#1c1917"}
                stroke={selectedNode === "firestore_db" ? "#f97316" : "rgba(255,255,255,0.12)"}
                strokeWidth={selectedNode === "firestore_db" ? "2" : "1"}
              />
              <text x="345" y="355" fill="#f97316" fontSize="11" fontWeight="700" fontFamily="Geist Mono, monospace">
                FIRESTORE NATIVE DB
              </text>
              <text x="345" y="375" fill="#ffffffd6" fontSize="11" fontWeight="500" fontFamily="Geist, sans-serif">
                • clients &bull; members
              </text>
              <text x="345" y="395" fill="#ffffffd6" fontSize="11" fontWeight="500" fontFamily="Geist, sans-serif">
                • projects &bull; tasks
              </text>
              <text x="345" y="415" fill="#ffffffd6" fontSize="11" fontWeight="500" fontFamily="Geist, sans-serif">
                • sessions &bull; workspaces
              </text>
              <text x="345" y="433" fill="#ffffff6b" fontSize="9" fontFamily="Geist Mono, monospace">
                Single Source of Truth
              </text>
            </g>

            {/* Node 3C: External Services */}
            <g
              onClick={() => setSelectedNode("external_services")}
              onMouseEnter={() => setHoveredNode("external_services")}
              onMouseLeave={() => setHoveredNode(null)}
              className="cursor-pointer transition-all duration-200"
            >
              <rect
                x="640" y="330" width="200" height="115" rx="8"
                fill={selectedNode === "external_services" ? "rgba(6,182,212,0.18)" : "#18181b"}
                stroke={selectedNode === "external_services" ? "#06b6d4" : "rgba(255,255,255,0.12)"}
                strokeWidth={selectedNode === "external_services" ? "2" : "1"}
              />
              <text x="655" y="355" fill="#06b6d4" fontSize="11" fontWeight="700" fontFamily="Geist Mono, monospace">
                EXTERNAL CLOUD
              </text>
              <text x="655" y="375" fill="#ffffffd6" fontSize="11" fontWeight="600" fontFamily="Geist, sans-serif">
                Google Identity / Auth
              </text>
              <text x="655" y="395" fill="#ffffffd6" fontSize="11" fontWeight="600" fontFamily="Geist, sans-serif">
                Google Drive Storage
              </text>
              <text x="655" y="415" fill="#ffffffd6" fontSize="11" fontWeight="600" fontFamily="Geist, sans-serif">
                Figma REST API Token
              </text>
            </g>
          </svg>
        </div>

        {/* Bottom indicator */}
        <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-[#ffffff6b]">
          <span>Haz clic sobre cualquier bloque para inspeccionar su código fuente, garantías y protocolo.</span>
          <span className="font-mono text-white/40">7 Componentes Clave Mapeados</span>
        </div>
      </div>

      {/* ── INSPECTOR SIDEBAR ── */}
      <div className="w-full lg:w-96 flex flex-col bg-[#181818] border border-white/10 rounded-[20px] p-5">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#3a7bd5]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#ffffffd6]">
              Inspector de Componente
            </h4>
          </div>
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `${activeNode.color}20`,
              color: activeNode.color,
              border: `1px solid ${activeNode.color}40`
            }}
          >
            {activeNode.category}
          </span>
        </div>

        <h3 className="text-base font-bold text-[#ffffffd6] mb-2">
          {activeNode.title}
        </h3>
        <p className="text-xs leading-relaxed text-[#ffffff6b] mb-5">
          {activeNode.description}
        </p>

        {/* Key Files */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#ffffffd6] mb-2">
            <Code2 className="w-3.5 h-3.5 text-white/60" />
            <span>Archivos y Módulos Clave:</span>
          </div>
          <div className="space-y-1.5">
            {activeNode.keyFiles.map((f, i) => (
              <div
                key={i}
                className="px-2.5 py-1.5 rounded-lg bg-[#222222] border border-white/5 text-[11px] font-mono text-white/80 truncate"
              >
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Protocols */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#ffffffd6] mb-2">
            <Cpu className="w-3.5 h-3.5 text-white/60" />
            <span>Protocolos y Mecanismos:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {activeNode.protocols.map((p, i) => (
              <span
                key={i}
                className="px-2 py-1 rounded-md bg-white/[0.04] border border-white/10 text-[10px] font-mono text-[#ffffffd6]"
              >
                {p}
              </span>
            ))}
          </div>
        </div>

        {/* Guarantees */}
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#ffffffd6] mb-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Garantías Arquitectónicas:</span>
          </div>
          <div className="space-y-1.5">
            {activeNode.guarantees.map((g, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px] text-[#ffffff6b] leading-tight">
                <span className="text-emerald-400 mt-0.5">•</span>
                <span>{g}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
