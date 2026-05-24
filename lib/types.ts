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
}

export interface Project {
  id: string;
  nombre: string;
  cliente_ids: string[];
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

export interface Client {
  id: string;
  nombre: string;
  email: string;
  tel: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  web: string;
  whatsapp: string;
  telefono: string;
  celular: string;
  redes: string;
  industria: string;
  potencial: string;
  fuente: string;
  obs: string;
  token: string;
  drive: string;
  url: string;
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
