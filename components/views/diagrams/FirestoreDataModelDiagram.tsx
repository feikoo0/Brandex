"use client";

import React, { useState } from "react";
import { Database, Key, Link2, Sparkles, Clock, Hash, Tag, FileText, CheckCircle2 } from "lucide-react";

interface FieldDef {
  name: string;
  type: string;
  isPk?: boolean;
  isFk?: boolean;
  fkTarget?: string;
  desc: string;
  required?: boolean;
}

interface EntitySchema {
  id: string;
  collection: string;
  name: string;
  primaryKey: string;
  hook: string;
  description: string;
  color: string;
  fields: FieldDef[];
  relationships: { target: string; type: string; via: string; desc: string }[];
}

const SCHEMAS: EntitySchema[] = [
  {
    id: "clients",
    collection: "clients",
    name: "Clientes (Marcas)",
    primaryKey: "id (string / UUID)",
    hook: "useClients() / @/hooks/useClients",
    description: "Directorio de marcas corporativas y clientes. Define la identidad visual (color HSL), finanzas y carpetas maestras de Google Drive.",
    color: "#3a7bd5",
    fields: [
      { name: "id", type: "string", isPk: true, desc: "Identificador único de documento en Firestore" },
      { name: "nombre", type: "string", required: true, desc: "Nombre de la marca o empresa" },
      { name: "customColor", type: "{ h: number, s: number, l: number }", desc: "Color HSL base de la marca para portadas y badges" },
      { name: "color", type: "string", desc: "Color CSS en formato hex o hsl(...) fallback" },
      { name: "finanzas", type: "ClientFinanzas", desc: "monto_contrato, total_pagado, historial_pagos[]" },
      { name: "drive_links", type: "DriveLink[]", desc: "Enlaces estructurados a carpetas de Google Drive" },
      { name: "notas_internas", type: "string", desc: "Notas confidenciales de gestión de cuenta (Solo Admin)" },
      { name: "status", type: "string", desc: "Estado de la cuenta: activo | pausa | prospecto | cerrado" },
      { name: "industria", type: "string", desc: "Sector de mercado (Moda, Tech, Alimentos, etc.)" },
      { name: "createdAt", type: "FieldValue (serverTimestamp)", required: true, desc: "Timestamp oficial de creación en Firestore" },
      { name: "updatedAt", type: "FieldValue (serverTimestamp)", required: true, desc: "Timestamp oficial de última modificación" }
    ],
    relationships: [
      { target: "projects", type: "1 : N", via: "projects.cliente_ids[]", desc: "Un cliente posee múltiples proyectos y campañas" },
      { target: "tasks", type: "1 : N", via: "tasks.cliente_ids[]", desc: "Un cliente solicita múltiples entregables atómicos" },
      { target: "sessions", type: "1 : N", via: "sessions.client_id", desc: "Registra horas acumuladas e invertidas por cuenta" }
    ]
  },
  {
    id: "projects",
    collection: "projects",
    name: "Proyectos (Campañas)",
    primaryKey: "id (string / UUID)",
    hook: "useData() / useProjectSummary()",
    description: "Campañas, desarrollos web y proyectos agrupados. Agrega tareas, resuelve el porcentaje de avance reactivo y vincula colaboradores.",
    color: "#8b5cf6",
    fields: [
      { name: "id", type: "string", isPk: true, desc: "Identificador único del proyecto" },
      { name: "nombre", type: "string", required: true, desc: "Título del proyecto o campaña" },
      { name: "cliente_ids", type: "string[]", isFk: true, fkTarget: "clients.id", desc: "IDs de clientes a los que pertenece el proyecto" },
      { name: "asignado_ids", type: "string[]", isFk: true, fkTarget: "members.id", desc: "IDs de colaboradores asignados al proyecto" },
      { name: "tarea_ids", type: "string[]", isFk: true, fkTarget: "tasks.id", desc: "IDs de entregables contenidos en el proyecto" },
      { name: "estadoProyecto", type: "string", desc: "Planificación | En Proceso | En Revisión | Completado" },
      { name: "costo", type: "number", desc: "Valor financiero asignado al proyecto" },
      { name: "fechaInicio", type: "string (YYYY-MM-DD)", desc: "Fecha programada de inicio" },
      { name: "fechaFin", type: "string (YYYY-MM-DD)", desc: "Fecha límite de entrega (Deadline)" },
      { name: "color", type: "string", desc: "Color temático del proyecto o derivado del cliente" },
      { name: "createdAt", type: "FieldValue (serverTimestamp)", required: true, desc: "Timestamp oficial de creación" },
      { name: "updatedAt", type: "FieldValue (serverTimestamp)", required: true, desc: "Timestamp oficial de mutación" }
    ],
    relationships: [
      { target: "clients", type: "N : 1", via: "cliente_ids", desc: "Pertenece a uno o más clientes corporativos" },
      { target: "members", type: "N : M", via: "asignado_ids", desc: "Asigna múltiples miembros del equipo de diseño/dev" },
      { target: "tasks", type: "1 : N", via: "tarea_ids / tasks.proyecto_ids", desc: "Contiene la lista de entregables atómicos" }
    ]
  },
  {
    id: "tasks",
    collection: "tasks",
    name: "Tareas (Entregables Atómicos)",
    primaryKey: "id (string / UUID)",
    hook: "useData() / @/hooks/useData",
    description: "Entregables atómicos de diseño, video, código o copia. Alimenta las columnas del Kanban y las formas vectoriales en portada.",
    color: "#10b981",
    fields: [
      { name: "id", type: "string", isPk: true, desc: "Identificador único de la tarea" },
      { name: "titulo", type: "string", required: true, desc: "Título del entregable (ej. 'Reel Lanzamiento')" },
      { name: "formato", type: "string", desc: "Post | Reel | Video | Historia | Portada | Logotipo | Otros" },
      { name: "esfuerzo", type: "string", desc: "⚡Flash (15m) | 🔋Corto (30m) | 🔥Medio (1h) | 🧠Largo (2h) | 🚀+3h" },
      { name: "estado", type: "string", desc: "Pendiente | En proceso | Revision | Modificar | Aprobado | Publicado" },
      { name: "prioridad", type: "string", desc: "Baja | Media | Alta | Urgente" },
      { name: "proyecto_ids", type: "string[]", isFk: true, fkTarget: "projects.id", desc: "IDs de proyectos vinculados" },
      { name: "cliente_ids", type: "string[]", isFk: true, fkTarget: "clients.id", desc: "IDs de clientes dueños del entregable" },
      { name: "asignado_ids", type: "string[]", isFk: true, fkTarget: "members.id", desc: "IDs de diseñadores/editores asignados" },
      { name: "tiempoRealMins", type: "number", desc: "Minutos reales acumulados desde el motor de sesiones" },
      { name: "adminNotes", type: "string", desc: "Instrucciones y observaciones internas del admin" },
      { name: "notasCliente", type: "string", desc: "Feedback y observaciones visibles para el cliente" },
      { name: "createdAt", type: "FieldValue (serverTimestamp)", required: true, desc: "Timestamp de creación en Firestore" },
      { name: "updatedAt", type: "FieldValue (serverTimestamp)", required: true, desc: "Timestamp de actualización reactiva" }
    ],
    relationships: [
      { target: "projects", type: "N : 1", via: "proyecto_ids", desc: "Agrupada dentro de un proyecto o campaña" },
      { target: "members", type: "N : 1", via: "asignado_ids", desc: "Ejecutada por un colaborador asignado" },
      { target: "sessions", type: "1 : N", via: "sessions.task_id", desc: "Cronometrada por múltiples sesiones de tiempo" }
    ]
  },
  {
    id: "members",
    collection: "members",
    name: "Miembros (Talento & Equipo)",
    primaryKey: "id (string / UUID)",
    hook: "useMembers() / @/hooks/useMembers",
    description: "Directorio de talento, diseñadores, editores y administradores. Gestiona roles, disponibilidad, especialidades y carga laboral.",
    color: "#ec4899",
    fields: [
      { name: "id", type: "string", isPk: true, desc: "Identificador único del colaborador" },
      { name: "nombre", type: "string", required: true, desc: "Nombre completo del miembro del equipo" },
      { name: "rol", type: "string", desc: "Admin | Project Manager | Diseñador | Video Editor | Copywriter" },
      { name: "specialty", type: "string", desc: "Especialidad: Diseño | Video | Animación | Código | Marketing" },
      { name: "skills", type: "string[]", desc: "Habilidades técnicas (Figma, After Effects, Next.js, etc.)" },
      { name: "disponibilidad", type: "string", desc: "Disponible | En Proyecto | Carga Máxima | Vacaciones" },
      { name: "proyectos_asignados", type: "string[]", isFk: true, fkTarget: "projects.id", desc: "IDs de proyectos activos" },
      { name: "tarifa_hora", type: "number", desc: "Tarifa horaria para cálculo de costos operativos" },
      { name: "drive_links", type: "DriveLink[]", desc: "Enlaces a portafolios o carpetas de entrega" },
      { name: "createdAt", type: "FieldValue (serverTimestamp)", required: true, desc: "Timestamp oficial de registro" },
      { name: "updatedAt", type: "FieldValue (serverTimestamp)", required: true, desc: "Timestamp oficial de mutación" }
    ],
    relationships: [
      { target: "tasks", type: "1 : N", via: "tasks.asignado_ids", desc: "Ejecuta entregables y actualiza su estado en Kanban" },
      { target: "projects", type: "N : M", via: "projects.asignado_ids", desc: "Colabora en campañas asignadas" },
      { target: "sessions", type: "1 : N", via: "sessions.worker_id", desc: "Registra sesiones en vivo en Maker Mode" }
    ]
  },
  {
    id: "sessions",
    collection: "sessions",
    name: "Sesiones (Maker Mode Live Tracker)",
    primaryKey: "id (string / UUID)",
    hook: "useSessions() / @/hooks/useSessions",
    description: "Registro atómico de sesiones de tiempo reales. Monitorea el cronómetro con heartbeats periódicos y consolida la duración real.",
    color: "#f59e0b",
    fields: [
      { name: "id", type: "string", isPk: true, desc: "Identificador único de la sesión" },
      { name: "task_id", type: "string", isFk: true, fkTarget: "tasks.id", desc: "ID de la tarea que se está trabajando" },
      { name: "project_id", type: "string", isFk: true, fkTarget: "projects.id", desc: "ID del proyecto asociado" },
      { name: "client_id", type: "string | null", isFk: true, fkTarget: "clients.id", desc: "ID del cliente dueño de la tarea" },
      { name: "worker_id", type: "string | null", isFk: true, fkTarget: "members.id", desc: "ID del colaborador ejecutando el trabajo" },
      { name: "origin", type: "SessionOrigin", desc: "manual | agent_self | agent_research | agent_qa_visual" },
      { name: "status", type: "SessionStatus", desc: "en_curso | completada | completada_forzada | deleted" },
      { name: "startTime", type: "Timestamp", desc: "Momento exacto en que inició la sesión" },
      { name: "endTime", type: "Timestamp | null", desc: "Momento de finalización o pausa de la sesión" },
      { name: "lastHeartbeat", type: "Timestamp", desc: "Heartbeat periódico (cada 30s) para detectar sesiones huérfanas" },
      { name: "durationMins", type: "number", desc: "Duración neta calculada en minutos" },
      { name: "createdAt", type: "FieldValue (serverTimestamp)", required: true, desc: "Timestamp de creación de la sesión" },
      { name: "updatedAt", type: "FieldValue (serverTimestamp)", required: true, desc: "Timestamp de actualización de la sesión" }
    ],
    relationships: [
      { target: "tasks", type: "N : 1", via: "task_id", desc: "Suma minutos directos a task.tiempoRealMins" },
      { target: "members", type: "N : 1", via: "worker_id", desc: "Registra horas trabajadas por el colaborador" },
      { target: "clients", type: "N : 1", via: "client_id", desc: "Alimenta la auditoría de rentabilidad por cliente" }
    ]
  }
];

export function FirestoreDataModelDiagram() {
  const [selectedSchemaId, setSelectedSchemaId] = useState<string>("clients");
  const activeSchema = SCHEMAS.find(s => s.id === selectedSchemaId) || SCHEMAS[0];

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full h-full p-4 lg:p-6 overflow-y-auto">
      {/* ── ENTITY RELATIONS OVERVIEW & SELECTOR ── */}
      <div className="flex-1 flex flex-col bg-[#141414] border border-white/10 rounded-[20px] p-5">
        <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[#3a7bd5]" />
              <h3 className="font-bold text-sm tracking-wide text-[#ffffffd6]">
                MODELO DE DATOS Y COLECCIONES FIRESTORE
              </h3>
            </div>
            <p className="text-[11px] text-[#ffffff6b] mt-0.5 font-mono">
              Pure Firestore Single Source of Truth • Relaciones Array FK • Universal Timestamps
            </p>
          </div>
          <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/10 text-white/60">
            5 Colecciones Core
          </span>
        </div>

        {/* Interactive ER Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {SCHEMAS.map(schema => {
            const isSelected = schema.id === selectedSchemaId;
            return (
              <button
                key={schema.id}
                onClick={() => setSelectedSchemaId(schema.id)}
                className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                  isSelected
                    ? "bg-[#1f1f1f] shadow-lg"
                    : "bg-[#181818] hover:bg-[#1a1a1a]"
                }`}
                style={{
                  borderColor: isSelected ? schema.color : "rgba(255, 255, 255, 0.10)"
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-[#ffffffd6] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: schema.color }} />
                    {schema.collection}
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.05] text-white/50">
                    {schema.fields.length} campos
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-white/90 mb-1">
                  {schema.name}
                </h4>
                <p className="text-[10px] text-[#ffffff6b] line-clamp-2">
                  {schema.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Visual Cardinality Diagram Map */}
        <div className="bg-[#111111] border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="w-3.5 h-3.5 text-emerald-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#ffffffd6]">
              Mapa de Cardinalidad y Claves Foráneas (Array References)
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] font-mono">
            <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 space-y-1.5">
              <div className="text-[#3a7bd5] font-bold">CLIENTS (1) ───&lt; PROJECTS (N)</div>
              <div className="text-white/60 text-[10px]">Via: projects.cliente_ids[] $\to$ Un cliente posee múltiples proyectos</div>
            </div>
            <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 space-y-1.5">
              <div className="text-[#8b5cf6] font-bold">PROJECTS (1) ───&lt; TASKS (N)</div>
              <div className="text-white/60 text-[10px]">Via: tasks.proyecto_ids[] / projects.tarea_ids[] $\to$ Campaña contiene entregables</div>
            </div>
            <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 space-y-1.5">
              <div className="text-[#ec4899] font-bold">MEMBERS (1) ───&lt; TASKS (N)</div>
              <div className="text-white/60 text-[10px]">Via: tasks.asignado_ids[] $\to$ Diseñador ejecuta entregable</div>
            </div>
            <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 space-y-1.5">
              <div className="text-[#f59e0b] font-bold">TASKS (1) ───&lt; SESSIONS (N)</div>
              <div className="text-white/60 text-[10px]">Via: sessions.task_id $\to$ Cronometra horas en Maker Mode</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ACTIVE SCHEMA DETAIL TABLE ── */}
      <div className="w-full lg:w-[460px] flex flex-col bg-[#181818] border border-white/10 rounded-[20px] p-5 overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeSchema.color }} />
              <h3 className="text-sm font-bold text-[#ffffffd6]">
                Colección: <span className="font-mono text-white/90">/{activeSchema.collection}</span>
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#ffffff6b] block mt-0.5">
              {activeSchema.hook}
            </span>
          </div>
        </div>

        <p className="text-xs text-[#ffffff6b] mb-4 leading-relaxed">
          {activeSchema.description}
        </p>

        {/* Fields List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#ffffffd6] mb-2 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-white/60" />
            <span>Definición de Campos ({activeSchema.fields.length}):</span>
          </div>
          {activeSchema.fields.map((field, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-lg bg-[#222222] border border-white/5 hover:border-white/10 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono font-bold text-[#ffffffd6] flex items-center gap-1.5">
                  {field.isPk && <Key className="w-3 h-3 text-amber-400" />}
                  {field.isFk && <Link2 className="w-3 h-3 text-cyan-400" />}
                  {field.name}
                  {field.required && <span className="text-rose-400 text-[10px]">*</span>}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-white/60 border border-white/5">
                  {field.type}
                </span>
              </div>
              <p className="text-[11px] text-[#ffffff6b]">
                {field.desc}
              </p>
              {field.fkTarget && (
                <div className="mt-1 text-[10px] font-mono text-cyan-400 flex items-center gap-1">
                  <span>→ FK a:</span>
                  <span className="underline">{field.fkTarget}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Relationships list */}
        <div className="pt-3 border-t border-white/10">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#ffffffd6] mb-2 flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Relaciones Directas:</span>
          </div>
          <div className="space-y-1.5">
            {activeSchema.relationships.map((rel, idx) => (
              <div key={idx} className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-[11px]">
                <div className="flex items-center justify-between text-white/90 font-mono text-[10px] mb-0.5">
                  <span className="font-bold">{rel.target} ({rel.type})</span>
                  <span className="text-white/50">{rel.via}</span>
                </div>
                <p className="text-[10px] text-[#ffffff6b]">{rel.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
