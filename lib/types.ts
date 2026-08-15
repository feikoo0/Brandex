// ─────────────────────────────────────────────────────────────────────────────
//  Braindex OS — Core TypeScript Types
//  Mirrors the shapes returned by server.py parse_* functions
// ─────────────────────────────────────────────────────────────────────────────

// ── Roles ─────────────────────────────────────────────────────────────────────
export type Role = "admin" | "diseno" | "cliente";

// ── Entities ──────────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  titulo: string;
  estado: string;
  area: string;
  asignado: string;
  formato: string;
  esfuerzo: string;
  prioridad: string;
  plataformas: string[];
  contenido: string;
  copy: string;
  adminNotes: string;
  notasCliente: string;
  tiempoRealMins?: number;
  fechaProg: string;
  fechaEntrega: string;
  asignado_ids: string[];
  proyecto_ids: string[];
  cliente_ids: string[];
  created: string;
  url: string;
  color?: string;
}

export interface Project {
  id: string;
  nombre: string;
  cliente_ids: string[];
  asignado_ids?: string[];
  asignado?: string;
  estadoProyecto: string;
  estado: string;
  area: string;
  formato: string;
  prioridad: string;
  ciclo: string;
  esfuerzo: string;
  plataformas: string[];
  fechaInicio: string;
  fechaFin: string;
  recursosDrive: string;
  costo: number;
  tarea_ids: string[];
  descripcion: string;
  url: string;
}

// ── Drive & Finance Sub-types ────────────────────────────────────────────────
export interface DriveLink {
  id: string;
  label: string;
  url: string;
}

export interface PaymentHistoryItem {
  id: string;
  fecha: string;
  monto: number;
  estado: "pagado" | "pendiente" | "vencido";
  comprobante_url?: string;
}

export interface ClientFinanzas {
  monto_contrato: number;
  total_pagado: number;
  proxima_factura?: any; // Timestamp or ISO string
  historial_pagos: PaymentHistoryItem[];
}

export type ClientPlan = "impulso" | "crecimiento" | "estrategico" | "alianza";
export type ClientRelationshipStatus = "activo" | "pausa" | "prospecto" | "cerrado";

export interface Client {
  id: string;
  nombre: string;
  name?: string; // Compatibility alias
  logo?: string;
  email?: string;
  tel?: string;
  telefono?: string;
  celular?: string;
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  web?: string;
  redes?: string;
  fuente?: string;
  contacto?: {
    persona?: string;
    telefono?: string;
    email?: string;
    whatsapp?: string;
  };
  contactPerson?: string;
  industria?: string;
  industry?: string;
  plan_contratado?: ClientPlan;
  estado_relacion?: ClientRelationshipStatus;
  status?: string;
  statusColor?: string;
  fecha_inicio?: any;
  sinceDate?: string;
  drive_links?: DriveLink[];
  notas_internas?: string;
  notes?: string;
  finanzas?: ClientFinanzas;
  totalBudget?: string;
  paidAmount?: string;
  pendingBalance?: string;
  website?: string;
  potencial?: string;
  obs?: string;
  token?: string;
  drive?: string;
  url?: string;
}

export interface Member {
  id: string;
  nombre: string;
  name?: string; // Compatibility alias
  rol: string;
  role?: string; // Compatibility alias
  email: string;
  avatar?: string;
  specialty?: "Diseño" | "Video" | "Animación" | "Marketing" | "Desarrollo" | string;
  skills: string[];
  proyectos_asignados: string[]; // Project IDs
  drive_links: DriveLink[];
  disponibilidad: "Disponible" | "En Proyecto" | "Carga Máxima" | "Carga Maxima" | "Vacaciones" | string;
  status?: string;
  statusColor?: string;
  notas_internas: string;
  bio?: string;
  telefono?: string;
  tarifa_hora?: number;
  rating?: string;
  completedTasks?: number;
  totalHoursLogged?: number;
  workloadPercent?: number;
  created_at?: any;
  updated_at?: any;
}

export interface Worker {
  id: string;
  nombre: string;
  rol: string;
  disponibilidad: string;
  tarifa: number;
  especialidad: string[];
  email: string;
  telefono: string;
  contrato: string;
  portfolio: string;
  notas: string;
  token: string;
  url: string;
  created: string;
}

// ── Session Types ─────────────────────────────────────────────────────────────
export type SessionOrigin = "manual" | "agent_self" | "agent_research" | "agent_qa_visual";
export type SessionStatus = "en_curso" | "completada" | "completada_forzada";

export interface SessionDoc {
  id: string;
  task_id: string;
  project_id: string;
  client_id: string | null;
  worker_id: string | null;
  origin: SessionOrigin;
  status: SessionStatus;
  startTime: any; // Firestore Timestamp
  endTime: any | null; // Firestore Timestamp
  lastHeartbeat: any; // Firestore Timestamp
  durationMins: number;
  summary?: string;
  created: any;
  updatedAt: any;
}

// ── Data Store Shape ───────────────────────────────────────────────────────────
export interface BraindexData {
  clientes:    Client[];
  proyectos:   Project[];
  tareas:      Task[];
  trabajadores: Worker[];
  recursos:    unknown[];
}

// ── API Response Shapes ────────────────────────────────────────────────────────
export interface SyncResponse extends BraindexData {
  ok?: boolean;
  error?: string;
}

export interface ApiResponse {
  ok: boolean;
  id?: string;
  error?: string;
}

export interface LoginResponse {
  ok: boolean;
  role?: Role;
  id?: string;
  nombre?: string;
  token?: string;
  error?: string;
}

// ── UI State ──────────────────────────────────────────────────────────────────
export type AdminTab =
  | "pulse" | "engine" | "timeline" | "pipeline"
  | "clientes" | "proyectos" | "tareas" | "talent"
  | "analytics" | "recursos" | "calendario" | "finanzas" | "accesos";

export type CalView = "day" | "week";

export interface ModalEntry {
  type: "task" | "proyecto" | "client" | "worker";
  id: string;
  parentId?: string;
}

// ── Deadline / Upcoming Events ─────────────────────────────────────────────────
export interface Deadline {
  entity: "task" | "project";
  id: string;
  name: string;
  days: number;
  date: string;
}

// ── Kanban Column ─────────────────────────────────────────────────────────────
export interface KanbanColumn {
  id: string;
  label: string;
  tasks: Task[];
  color: string;
}
