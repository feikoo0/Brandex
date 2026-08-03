// ─────────────────────────────────────────────────────────────────────────────
//  Braindex OS — Constants (Audited with Notion Schema & NewProjectModal)
// ─────────────────────────────────────────────────────────────────────────────

// --- TAREAS (Matriz) ---
export const TASK_ESTADO_OPTS = [
  "Pendiente",
  "Aprobado",
  "En proceso",
  "Por hacer",
  "Revision",
  "Modificar",
  "Hecho",
  "Por publicar",
  "Publicado",
  "Cancelado",
] as const;

export const TASK_PRIO_OPTS = ["Baja", "Media", "Alta", "Urgente"] as const;

export const ESFUERZOS = [
  "⚡Flash (15 min)",
  "🔋Corto (30 min)",
  "🔥Medio (1 h)",
  "🧠Largo (2 h)",
  "🚀 +3 h (Maratón)",
] as const;

export const FORMATOS = [
  "Logotipo",
  "🖼️ Post",
  "🎨 Portada",
  "🤳 Historia",
  "📢 Flyer",
  "🎬 Reel",
  "📺 Video",
  "🎡 Carrusel",
  "📦 Otros",
] as const;

export const AREAS = [
  "Pendiente",
  "DISEÑO",
  "COMMUNITY",
] as const;

// --- PROYECTOS (Alineado exactamente con NewProjectModal) ---
export const PROJ_STATUS_OPTS = [
  "Planificación",
  "En Proceso",
  "En Revisión",
  "Completado"
] as const;

export const PROJ_PRIO_OPTS = [
  "Baja",
  "Media",
  "Alta",
  "Urgente"
] as const;

export const PROJ_CICLO_OPTS = [
  "Proximamente",
  "Bloqueado",
  "En proceso",
  "Hecho"
] as const;

// --- CLIENTES ---
export const POTENCIAL_OPTS = ["Sin empezar", "En curso", "Listo"] as const;
export const FUENTE_OPTS = ["Facebook", "Instagram", "Otro", "WhatsApp", "Referido", "Web"] as const;

// --- EQUIPO ---
export const ROL_OPTS = ["Admin", "Project Manager", "Ads Manager", "Diseñador", "Copywriter", "Video Editor", "Fotógrafo"] as const;
export const DISPO_OPTS = ["Disponible", "Ocupado", "Vacaciones", "Inactivo"] as const;

// --- UI Logic ---
export const ACTIVE_STATES = new Set([
  "Pendiente",
  "En proceso",
  "Por hacer",
  "Revision",
  "Modificar",
  "Activo",
  "Backlog",
  "Planificación",
  "Planificacion",
  "En Proceso",
  "En Revisión",
  "En Revision"
]);

export const DONE_STATES = new Set([
  "Hecho",
  "Publicado",
  "Completado",
  "Aprobado"
]);

export const STATUS_COLORS: Record<string, string> = {
  // General
  "Pendiente":      "#3a7bd5",
  "En proceso":     "#0a84ff",
  "Por hacer":      "#3a7bd5",
  "Revision":       "#ff9f0a",
  "Modificar":      "#ff453a",
  "Hecho":          "#34c759",
  "Por publicar":   "#ff9f0a",
  "Publicado":      "#30d158",
  "Cancelado":      "#ff453a",
  // Projects specific
  "Backlog":        "#8e8e93",
  "Planificación":  "#bf5af2",
  "Planificacion":  "#bf5af2",
  "Activo":         "#34c759",
  "En Proceso":     "#0a84ff",
  "En Revisión":    "#ff9f0a",
  "En Revision":    "#ff9f0a",
  "Completado":     "#30d158",
  "Pausado":        "#ff9f0a",
  "En espera":      "#ff9f0a",
};

export const PRIORITY_COLORS: Record<string, string> = {
  "Urgente":           "#ff453a",
  "Alta":              "#ff9f0a",
  "Media":             "#0a84ff",
  "Baja":              "#636366",
  "No Priority":       "#636366",
  "Sin prioridad":     "#636366",
  "🔥 U R G E N T E 🔥": "#ff453a",
  "⚠️IMPORTANTE":       "#ff9f0a",
  "MODERADO":           "#0a84ff",
};

// Legacy alias for compatibility
export const ESTADO_OPTS = TASK_ESTADO_OPTS;
export const PRIO_OPTS = TASK_PRIO_OPTS;
export const PROJ_ESTADO_OPTS = PROJ_STATUS_OPTS;

export const ADMIN_NAV = [
  { tab: "pulse",     label: "Inicio" },
  { tab: "engine",    label: "Kanban" },
  { tab: "timeline",  label: "Timeline" },
  { sep: "GESTIÓN" },
  { tab: "proyectos", label: "Proyectos" },
  { tab: "clientes",  label: "Clientes" },
  { tab: "equipo",    label: "Equipo" },
  { tab: "accesos",   label: "Accesos" },
];

export const WORKER_NAV = [
  { tab: "pulse",    label: "Mis Tareas" },
  { tab: "engine",   label: "Kanban" },
  { tab: "timeline", label: "Timeline" },
];

export const CLIENT_NAV = [
  { tab: "pulse",    label: "Mi Marca" },
  { tab: "timeline", label: "Aprobaciones" },
];

export const PROJECT_COLORS = [
  "#3a7bd5",
  "#9b51e0",
  "#27ae60",
  "#e67e22",
  "#e74c3c",
  "#1abc9c",
  "#f1c40f",
  "#34495e",
];

export const CAPSULE_COLORS: Record<string, string> = {
  "Pendiente": "#3a7bd5",
  "En proceso": "#0a84ff",
  "Revision": "#ff9f0a",
  "Hecho": "#34c759",
};
