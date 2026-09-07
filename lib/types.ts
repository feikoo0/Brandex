// ─────────────────────────────────────────────────────────────────────────────
//  Braindex OS / Taski — Core TypeScript Types (Schema v2)
//  Fuente Única de Verdad para entidades nativas de Firestore y UI
// ─────────────────────────────────────────────────────────────────────────────

// ── Roles ─────────────────────────────────────────────────────────────────────
export type Role = "admin" | "diseno" | "cliente";

// ── Enums & Tipos de Estado Auxiliares ─────────────────────────────────────────
export type ProjectHealthRAG = "verde" | "ambar" | "rojo";
export type ClientSLA = "standard" | "premium" | "enterprise";
export type MemberAvailabilityState = "activo" | "vacaciones" | "licencia" | "inactivo";
export type MemberWorkloadTrafficLight = "disponible" | "al_limite" | "sobrecargado";

export type ClientPlan = "impulso" | "crecimiento" | "estrategico" | "alianza";
export type ClientRelationshipStatus = "activo" | "pausa" | "prospecto" | "cerrado";

// ── Mapeo Fijo de Esfuerzo a Minutos ──────────────────────────────────────────
// Para tareas con esfuerzo en texto no mapeable o en rango, esfuerzoMinutos debe ser null (revisión manual)
export const ESFUERZO_MINUTOS_MAP: Record<string, number> = {
  "15 min": 15,
  "30 min": 30,
  "1 hora": 60,
  "2 horas": 120,
  "Medio día": 240,
  "Día completo": 480,
};

// ── Sub-estructuras ───────────────────────────────────────────────────────────

export interface TaskCopyStructure {
  gancho?: string;  // Primeros 3 segundos / Hook
  cuerpo?: string;  // Desarrollo / Mensaje central
  cta?: string;     // Llamado a la acción (Call To Action)
}

export interface SubtaskItem {
  id: string | number;
  text: string;
  done: boolean;
}

export interface DriveLink {
  id: string;
  label: string;
  url: string;
}

export interface BrandKit {
  logotipos_url?: string;
  manual_estilo_url?: string;
  brand_voice_guidelines?: string; // Tono de voz, reglas y directrices
  drive_folder_url?: string;
  archivos_clave?: DriveLink[];
}

export interface MemberMood {
  emoji: string;
  label: string;
  updatedAt?: any;
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

// ── 1. TAREAS (Task) ───────────────────────────────────────────────────────────

export interface Task {
  id: string;
  titulo: string;
  estado: string;                 // "Por hacer" | "En curso" | "Revisión" | "Completado"
  area: string;
  asignado?: string;              // Nombre del asignado principal (compatibilidad)
  formato: string;                // "Reel", "Post", "Banner", "Web", etc.
  
  // Esfuerzo y Estimación
  esfuerzo: string;               // Label display: "15 min", "30 min", "1 hora", "2 horas", "Medio día", "Día completo"
  esfuerzoMinutos?: number | null;// Minutos numéricos paralelos según ESFUERZO_MINUTOS_MAP. Null si no es mapeable.
  
  prioridad: string;
  plataformas: string[];
  contenido: string;
  
  // Estructura de Copywriting y Redacción
  copywriting?: TaskCopyStructure;// Estructura enriquecida: Gancho, Cuerpo, CTA
  copy?: string;                  // @deprecated - Texto plano legacy (fallback a copywriting.cuerpo)
  
  adminNotes: string;
  notasCliente: string;
  tiempoRealMins?: number;        // Rollup de sessions cronometradas
  
  // Fechas Clave (Modelo de 3 fechas + auditoría)
  fechaProg: string;              // Fecha agendada de trabajo interno (YYYY-MM-DD)
  fechaEntrega: string;           // Fecha límite de entrega / revisión interna (YYYY-MM-DD)
  deadline?: string;              // Compatibility alias de fecha_limite
  fecha_programada?: string;      // Fecha inicio planeada (alias canónico para Timeline & Kanban)
  fecha_limite?: string;          // Fecha fin planeada (alias canónico para Timeline & Kanban)
  fecha_inicio_real?: string;     // Cuándo la tarea arrancó en la práctica (automático al pasar a "En curso")
  fecha_completado_real?: string; // Cuándo la tarea se marcó como Hecho (timestamp de auditoría)
  fechaPublicacion?: string;      // Fecha de publicación en vivo en plataformas (YYYY-MM-DD)
  
  // Asignaciones y Relaciones
  asignado_id?: string;           // Asignado Primario (responsable directo de la fase actual, singular)
  asignado_ids: string[];         // Array de todos los colaboradores involucrados
  proyecto_ids: string[];
  proyecto_id?: string;           // Compatibility alias singular
  project_id?: string;            // Compatibility alias singular
  cliente_ids: string[];
  cliente_id?: string;            // Compatibility alias singular
  
  // Checklist / Subtareas
  subtasks?: SubtaskItem[];
  
  // Finanzas de la tarea
  precio?: number;                // Precio cotizado/facturado al cliente por esta tarea
  costo?: number;                 // Costo de delegación o producción asignado a la tarea
  utilidad?: number;              // Utilidad neta de la tarea (precio - costo)

  created: string;
  url: string;
  color?: string;
  createdAt?: any;
  updatedAt?: any;
  created_at?: any;
  updated_at?: any;
}

// ── 2. PROYECTOS (Project) ────────────────────────────────────────────────────

export interface Project {
  id: string;
  nombre: string;
  cliente_ids: string[];
  asignado_ids?: string[];
  asignado?: string;              // Compatibility display name
  
  // Responsable y Salud
  lead_id?: string;               // Relación con Member (Líder del proyecto global)
  salud?: ProjectHealthRAG;       // "verde" (En tiempo) | "ambar" (Riesgos) | "rojo" (Bloqueado/Crítico)
  
  // Estados y Fechas
  estadoProyecto: string;         // "En cola" | "Activo" | "Revisión" | "Completado" | "Pausa"
  estado: string;                 // Compatibility alias
  fechaInicio: string;            // YYYY-MM-DD
  fechaFin: string;               // YYYY-MM-DD (Fecha de entrega planeada)
  
  // Finanzas y Rentabilidad
  presupuesto: number;            // Presupuesto Asignado (BAC) en divisa (Requerido going-forward)
  costoReal?: number;             // Costo Real (AC) acumulado (vía sessions o manual)
  // Margen del Proyecto:
  // Lógica del cálculo en hook: presupuesto > 0 ? ((presupuesto - (costoReal || 0)) / presupuesto) * 100 : null
  margen?: number | null;
  
  // Metas de Negocio / OKRs
  metas_negocio?: string[];       // Lista de metas / OKRs clave del proyecto (o texto)
  
  // Compatibilidad & Legacy
  costo?: number;                 // @deprecated - Legacy alias de presupuesto (BAC)
  area: string;
  formato: string;
  prioridad: string;
  ciclo: string;
  esfuerzo: string;
  plataformas: string[];
  recursosDrive: string;
  tarea_ids: string[];
  descripcion: string;
  url: string;
  color?: string;
  colorName?: string;
  customColor?: { h: number; s: number; l: number };
  gradient?: string;
  tasks?: Task[];
  title?: string;
  createdAt?: any;
  updatedAt?: any;
  created_at?: any;
  updated_at?: any;
}

// ── 3. EQUIPO (Member) ────────────────────────────────────────────────────────

export interface Member {
  id: string;
  nombre: string;
  name?: string;                  // Compatibility alias
  rol: string;
  role?: string;                  // Compatibility alias
  email: string;
  avatar?: string;
  specialty?: "Diseño" | "Video" | "Animación" | "Marketing" | "Desarrollo" | string;
  skills: string[];
  proyectos_asignados: string[];  // Project IDs
  drive_links: DriveLink[];
  
  // Costos & Tarifas
  tarifa_hora?: number;           // Costo por hora
  costo_proyecto?: number;        // Tarifa fija por proyecto asignado
  costo_tarea?: number;           // Tarifa fija por tarea/entregable
  
  // Capacidad & Carga Laboral
  capacidad_semanal: number;      // Horas semanales disponibles (Requerido. Default recomendado: 40h para evitar división por 0/undefined en workloadPercent)
  carga_horas_actual?: number;    // Rollup calculado: Suma de ETC (horas) de tareas activas
  workloadPercent?: number;       // Rollup calculado: (carga_horas_actual / capacidad_semanal) * 100
  semaforo?: MemberWorkloadTrafficLight; // Rollup visual: "disponible" (<80%) | "al_limite" (80-100%) | "sobrecargado" (>100%)
  tareasSinEstimar?: number;      // Conteo de tareas activas asignadas sin esfuerzo numérico mapeable
  
  // Disponibilidad Administrativa & Bienestar
  disponibilidad: MemberAvailabilityState | "Disponible" | "En Proyecto" | "Carga Máxima" | "Carga Maxima" | "Vacaciones" | string;
  mood_semanal?: MemberMood;      // Bienestar / Emoji y estado semanal del colaborador
  
  // Metadatos y Compatibilidad
  status?: string;
  statusColor?: string;
  notas_internas: string;
  notas?: string;                 // Compatibility alias de notas_internas
  tarifa?: number;                // Compatibility alias de tarifa_hora
  especialidad?: string[];        // Compatibility alias de skills
  contrato?: string;
  portfolio?: string;
  token?: string;
  url?: string;
  created?: string;
  bio?: string;
  telefono?: string;
  rating?: string;
  completedTasks?: number;
  totalHoursLogged?: number;
  color?: string;
  colorName?: string;
  customColor?: { h: number; s: number; l: number };
  customGradientStyle?: string;
  gradient?: string;
  createdAt?: any;
  updatedAt?: any;
  created_at?: any;
  updated_at?: any;
}

// ── 4. CLIENTES (Client) ──────────────────────────────────────────────────────

export interface Client {
  id: string;
  nombre: string;
  name?: string;                  // Compatibility alias
  
  // Estado Canónico de la Relación
  estado_relacion?: ClientRelationshipStatus; // "activo" | "pausa" | "prospecto" | "cerrado"
  
  // Responsables y Servicio
  responsables_ids?: string[];    // Relación con Member[] (Account Lead / Equipo asignado)
  sla?: ClientSLA;                // "standard" | "premium" | "enterprise"
  
  // Identidad de Marca y Contenido
  brand_kit?: BrandKit;           // Kit de Marca, Drive y Brand Voice
  
  // Métricas Financieras y LTV
  // NOTA LTV: El LTV total mostrado en UI = (ltv_historico || 0) + (ltv_calculado || 0).
  // Nunca deben mezclarse en un solo campo en la base de datos.
  ltv_historico?: number;         // Manual: facturación acumulada previa al tracking en Taski
  ltv_calculado?: number;         // Rollup automático: suma de historial_pagos pagados en Taski
  proyectos_activos?: Project[];  // Rollup automático: proyectos activos vinculados al cliente
  proyectos_activos_count?: number;
  
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
  status?: string;                // @deprecated - Usar estado_relacion
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
  potencial?: string;             // @deprecated - Legacy Notion
  color?: string;
  colorName?: string;
  customColor?: { h: number; s: number; l: number };
  customGradientStyle?: string;
  gradient?: string;
  obs?: string;
  token?: string;
  drive?: string;
  url?: string;
  createdAt?: any;
  updatedAt?: any;
  created_at?: any;
  updated_at?: any;
}

// ── Trabajadores Legacy (Worker) ──────────────────────────────────────────────
// Worker es un alias de Member para compatibilidad con código legacy
export type Worker = Member;

// ── Session Types ─────────────────────────────────────────────────────────────
export type SessionOrigin = "manual" | "agent_self" | "agent_research" | "agent_qa_visual";
export type SessionStatus = "en_curso" | "completada" | "completada_forzada" | "deleted";

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
  durationSeconds?: number;
  durationMins: number;
  summary?: string;
  isDeleted?: boolean;
  deletedAt?: any; // Firestore Timestamp
  deleted_at?: any;
  created: any;
  createdAt?: any;
  updatedAt: any;
  created_at?: any;
  updated_at?: any;
}

// ── Data Store Shape ───────────────────────────────────────────────────────────
export interface BraindexData {
  clientes:  Client[];
  proyectos: Project[];
  tareas:    Task[];
  miembros:  Member[];
  recursos:  unknown[];
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
  workspaceId?: string;
  pin?: string;
  isNewUser?: boolean;
  email?: string;
  name?: string;
  googleUid?: string;
  error?: string;
}

export interface OnboardingSurveyData {
  name: string;
  companyName?: string;
  workspaceName?: string;
  brandName?: string;
  email?: string;
  googleUid?: string;
  specialty?: string;
  useCases?: string[];
  teamSize?: string;
  industry?: string;
  members?: string[];
  brandLinks?: string[];
  brandFiles?: { name: string; url?: string; size?: number }[];
}

// ── UI State ──────────────────────────────────────────────────────────────────
export type AdminTab =
  | "pulse" | "engine" | "timeline" | "pipeline"
  | "clientes" | "proyectos" | "tareas" | "talent" | "equipo"
  | "analytics" | "recursos" | "calendario" | "finanzas" | "accesos" | "diagramas";

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

// ── 6. NOTAS Y RECORDATORIOS (Notes) ──────────────────────────────────────────
export interface NoteSubtaskItem {
  id: string | number;
  text: string;
  done: boolean;
}

export interface NoteDoc {
  id: string;
  title: string;
  content: string;
  noteType?: "texto" | "titulo" | "lista" | "guion" | "cita";
  subtasks?: NoteSubtaskItem[];
  taskId?: string | number | null;
  taskTitle?: string | null;
  projectId?: string | number | null;
  projectTitle?: string | null;
  clientColor?: string | null;
  isPinned?: boolean;
  isCompleted?: boolean;
  order?: number;
  isDeleted?: boolean;
  deletedAt?: any;
  deleted_at?: any;
  daysRemaining?: number;
  workspaceId?: string;
  createdAt?: any;
  updatedAt?: any;
}

