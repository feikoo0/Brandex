"use client";

import React, { useState } from "react";
import { BookOpen, Copy, Check, ExternalLink, Sparkles, Layers, Search } from "lucide-react";

interface DiagramTypeItem {
  id: string;
  name: string;
  category: "Architecture & Systems" | "Flows & Logic" | "Hierarchy & Data" | "Quantitative & Charts" | "Strategy & Security";
  description: string;
  recommendedFor: string;
  templateFile: string;
}

const DIAGRAM_TYPES: DiagramTypeItem[] = [
  {
    id: "architecture",
    name: "Architecture",
    category: "Architecture & Systems",
    description: "Componentes y conexiones en un sistema en capas o distribuido.",
    recommendedFor: "Topología de microservicios, frontend/backend, cloud stacks",
    templateFile: "type-architecture.md"
  },
  {
    id: "high-level",
    name: "High-Level System",
    category: "Architecture & Systems",
    description: "Stack de datos end-to-end sobre clúster de contenedores.",
    recommendedFor: "Pipelines de procesamiento masivo, infraestructuras globales",
    templateFile: "type-high-level.md"
  },
  {
    id: "deployment",
    name: "Deployment Topology",
    category: "Architecture & Systems",
    description: "Dónde corre el software: zonas, hosts, puertos, réplicas.",
    recommendedFor: "Kubernetes pods, cloud functions, CDNs y edge locations",
    templateFile: "type-deployment.md"
  },
  {
    id: "dp-integration",
    name: "Data Platform Integration",
    category: "Architecture & Systems",
    description: "Topología de integración: Fuentes $\to$ Core $\to$ Consumidores.",
    recommendedFor: "ETL / ELT pipelines, datalakes, data mesh",
    templateFile: "type-dp-integration.md"
  },
  {
    id: "medallion",
    name: "Medallion Architecture",
    category: "Architecture & Systems",
    description: "Almacenamiento multi-nivel con calidad Bronce, Plata y Oro.",
    recommendedFor: "Data lakehouse, analítica de datos estructurados",
    templateFile: "type-medallion.md"
  },
  {
    id: "flowchart",
    name: "Flowchart",
    category: "Flows & Logic",
    description: "Lógica de decisión con ramificaciones y evaluaciones de condición.",
    recommendedFor: "Árboles de decisión, algoritmos de asignación, aprobaciones",
    templateFile: "type-flowchart.md"
  },
  {
    id: "sequence",
    name: "Sequence Diagram",
    category: "Flows & Logic",
    description: "Mensajes ordenados en el tiempo entre múltiples actores.",
    recommendedFor: "Flujos de autenticación OAuth, peticiones HTTP/gRPC, WebSockets",
    templateFile: "type-sequence.md"
  },
  {
    id: "state",
    name: "State Machine",
    category: "Flows & Logic",
    description: "Estados, transiciones válidas y guardas de seguridad.",
    recommendedFor: "Ciclos de vida de entregables, sesiones de tiempo, pagos",
    templateFile: "type-state.md"
  },
  {
    id: "swimlane",
    name: "Swimlane Process",
    category: "Flows & Logic",
    description: "Procesos interfuncionales con traspasos entre roles o departamentos.",
    recommendedFor: "Flujos de trabajo diseño-cliente, embudos comerciales",
    templateFile: "type-swimlane.md"
  },
  {
    id: "process",
    name: "Multi-Actor Process",
    category: "Flows & Logic",
    description: "Proceso secuencial multi-actor con traspaso de artefactos durables.",
    recommendedFor: "Publicación de contenido, QA, facturación mensual",
    templateFile: "type-process.md"
  },
  {
    id: "data-flow",
    name: "Data Flow (Role-Scoped)",
    category: "Flows & Logic",
    description: "Quién hace qué en cada paso del pipeline de datos.",
    recommendedFor: "Flujos de información sensible, auditorías de permisos",
    templateFile: "type-data-flow.md"
  },
  {
    id: "er",
    name: "ER / Data Model",
    category: "Hierarchy & Data",
    description: "Entidades, campos, tipos y relaciones foráneas.",
    recommendedFor: "Colecciones de Firestore, bases de datos relacionales/NoSQL",
    templateFile: "type-er.md"
  },
  {
    id: "db-schema",
    name: "Database Physical Schema",
    category: "Hierarchy & Data",
    description: "Tablas físicas: tipos SQL/NoSQL, índices, constraints, FKs.",
    recommendedFor: "Documentación técnica de esquemas y migraciones",
    templateFile: "type-db-schema.md"
  },
  {
    id: "nested",
    name: "Nested Containers",
    category: "Hierarchy & Data",
    description: "Jerarquía a través de contención visual y alcance de bloques.",
    recommendedFor: "Dominios de producto, módulos de código, multi-tenancy",
    templateFile: "type-nested.md"
  },
  {
    id: "tree",
    name: "Tree Hierarchy",
    category: "Hierarchy & Data",
    description: "Relaciones Padre $\to$ Hijos estrictas y sin ciclos.",
    recommendedFor: "Estructuras de directorios, taxonomías, categorías",
    templateFile: "type-tree.md"
  },
  {
    id: "org-chart",
    name: "Org Chart",
    category: "Hierarchy & Data",
    description: "Estructura de equipo, propiedad, reporte y escalamiento.",
    recommendedFor: "Organigramas de agencia, equipos de proyecto",
    templateFile: "type-org-chart.md"
  },
  {
    id: "layer-stack",
    name: "Layer Stack",
    category: "Hierarchy & Data",
    description: "Niveles apilados de abstracción o capas de seguridad compensatorias.",
    recommendedFor: "Capas OSI, capas de software, capas de control de riesgos",
    templateFile: "type-layers.md"
  },
  {
    id: "dependency",
    name: "Dependency Graph",
    category: "Hierarchy & Data",
    description: "Qué depende de qué, con fan-in y ciclos complejos.",
    recommendedFor: "Grafos de paquetes npm, dependencias de entregables",
    templateFile: "type-dependency.md"
  },
  {
    id: "kanban",
    name: "Kanban State Board",
    category: "Hierarchy & Data",
    description: "Trabajo en progreso por estado con límites WIP y bloqueos.",
    recommendedFor: "Tableros operativos, gestión ágil de tareas",
    templateFile: "type-kanban.md"
  },
  {
    id: "dp-security-matrix",
    name: "Security Access Matrix",
    category: "Strategy & Security",
    description: "Matriz de permisos de acceso por rol y por componente.",
    recommendedFor: "RBAC, políticas de privacidad, control de acceso",
    templateFile: "type-dp-security-matrix.md"
  },
  {
    id: "quadrant",
    name: "Quadrant Matrix",
    category: "Strategy & Security",
    description: "Priorización y posicionamiento en dos ejes (Impacto vs Esfuerzo).",
    recommendedFor: "Matriz Eisenhower, roadmap de features",
    templateFile: "type-quadrant.md"
  },
  {
    id: "wardley",
    name: "Wardley Map",
    category: "Strategy & Security",
    description: "Cadena de valor contra evolución tecnológica (Génesis $\to$ Commodity).",
    recommendedFor: "Estrategia técnica, decisiones de build vs buy",
    templateFile: "type-wardley.md"
  },
  {
    id: "journey",
    name: "User Journey Map",
    category: "Strategy & Security",
    description: "Qué experimenta un usuario a través de los puntos de contacto.",
    recommendedFor: "Experiencia del cliente, onboarding, retención",
    templateFile: "type-journey.md"
  },
  {
    id: "timeline",
    name: "Timeline & Roadmap",
    category: "Quantitative & Charts",
    description: "Eventos e hitos posicionados cronológicamente.",
    recommendedFor: "Lanzamientos, cronogramas de campañas",
    templateFile: "type-timeline.md"
  },
  {
    id: "gantt",
    name: "Gantt Chart",
    category: "Quantitative & Charts",
    description: "Tareas, dependencias y fases a lo largo del tiempo.",
    recommendedFor: "Planificación de proyectos complejos, solapamiento de tareas",
    templateFile: "type-gantt.md"
  },
  {
    id: "radar",
    name: "Radar / Spider Chart",
    category: "Quantitative & Charts",
    description: "Evaluación multidimensional de entidades en 3-6 criterios.",
    recommendedFor: "Evaluación de competencias de talento, madurez de marca",
    templateFile: "type-radar.md"
  },
  {
    id: "sankey",
    name: "Sankey Flow",
    category: "Quantitative & Charts",
    description: "Cantidades dividiéndose y fusionándose entre etapas continuas.",
    recommendedFor: "Distribución de presupuestos, flujo de caja, conversión de leads",
    templateFile: "type-sankey.md"
  },
  {
    id: "treemap",
    name: "Treemap",
    category: "Quantitative & Charts",
    description: "Parte-del-todo donde el área visual representa la magnitud relativa.",
    recommendedFor: "Distribución de ingresos por cliente, tiempo por diseñador",
    templateFile: "type-treemap.md"
  }
];

export function DiagramDesignCheatsheet() {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = ["all", "Architecture & Systems", "Flows & Logic", "Hierarchy & Data", "Quantitative & Charts", "Strategy & Security"];

  const filtered = DIAGRAM_TYPES.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          d.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          d.recommendedFor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || d.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCopyPrompt = (d: DiagramTypeItem) => {
    const promptText = `Genera un diagrama editorial SVG de tipo "${d.name}" (${d.templateFile}) siguiendo la guía de estilo de cathrynlavery/diagram-design:
- Fondo oscuro #181818, bordes finos rgba(255,255,255,0.10)
- Tipografía Geist Sans para etiquetas y Geist Mono para datos técnicos
- Sin sombras pesadas ni degradados borrosos
- Acento coral/azul puntual (máximo 1-2 nodos focales)`;
    
    navigator.clipboard.writeText(promptText);
    setCopiedId(d.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col w-full h-full p-4 lg:p-6 overflow-y-auto bg-[#141414] border border-white/10 rounded-[20px]">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/5 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#3a7bd5]" />
            <h3 className="font-bold text-sm tracking-wide text-[#ffffffd6]">
              CATÁLOGO EDITORIAL DE DIAGRAM-DESIGN (39 TIPOS)
            </h3>
          </div>
          <p className="text-[11px] text-[#ffffff6b] mt-0.5 font-mono">
            Integrado desde cathrynlavery/diagram-design • HTML + SVG Autónomo • Cero Sombras &quot;Slop&quot;
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Buscar tipo o caso de uso..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#1c1c1c] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#3a7bd5]"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-lg text-[10px] font-mono transition-colors ${
              selectedCategory === cat
                ? "bg-[#3a7bd5]/20 border border-[#3a7bd5]/40 text-[#3a7bd5]"
                : "bg-white/[0.03] border border-white/5 text-[#ffffff6b] hover:bg-white/[0.06]"
            }`}
          >
            {cat === "all" ? "Todos los Tipos (39)" : cat}
          </button>
        ))}
      </div>

      {/* Grid of Diagram Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 flex-1 overflow-y-auto pr-1">
        {filtered.map(item => (
          <div
            key={item.id}
            className="p-4 rounded-xl bg-[#181818] border border-white/5 hover:border-white/15 transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-[#3a7bd5] border border-[#3a7bd5]/20">
                  {item.category}
                </span>
                <span className="text-[9px] font-mono text-white/40">
                  {item.templateFile}
                </span>
              </div>
              <h4 className="text-sm font-bold text-[#ffffffd6] mb-1">
                {item.name}
              </h4>
              <p className="text-xs text-[#ffffff6b] mb-3 leading-relaxed">
                {item.description}
              </p>
              <div className="text-[11px] text-white/70 mb-4">
                <span className="font-semibold text-white/40 block text-[10px] uppercase font-mono mb-0.5">Recomendado para:</span>
                {item.recommendedFor}
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] font-mono text-emerald-400">
                Standalone SVG
              </span>
              <button
                onClick={() => handleCopyPrompt(item)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.10] border border-white/10 text-[10px] font-mono text-white/90 transition-colors"
                title="Copiar prompt para generar este diagrama con IA"
              >
                {copiedId === item.id ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-white/60" />
                    <span>Copiar Prompt</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
