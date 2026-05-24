// ─────────────────────────────────────────────────────────────────────────────
//  Braindex OS — Constants (Audited with Notion Schema)
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

// --- PROYECTOS ---
export const PROJ_STATUS_OPTS = [
  "🧠 Planificacion",
  "🟢 Activos",
  "👁️ En Revision",
  "✅ Completado",
  "Activo",
  "Completado"
] as const;

export const PROJ_PRIO_OPTS = [
  "MODERADO",
  "⚠️IMPORTANTE",
  "🔥 U R G E N T E 🔥"
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
  "🟢 Activos",
  "🧠 Planificacion"
]);

export const DONE_STATES = new Set([
  "Hecho",
  "Publicado",
  "✅ Completado",
  "Completado"
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
  "🧠 Planificacion": "#bf5af2",
  "🟢 Activos":       "#34c759",
  "👁️ En Revision":   "#ff9f0a",
  "✅ Completado":    "#30d158",
  "Activo":          "#34c759",
  "Completado":      "#30d158",
  "Pausado":         "#ff9f0a",
  "En espera":       "#ff9f0a",
};

export const PRIORITY_COLORS: Record<string, string> = {
  // Task style
  "Urgente": "#ff453a",
  "Alta":    "#ff9f0a",
  "Media":   "#0a84ff",
  "Baja":    "#636366",
  // Project style
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
  { tab: "clientes",  label: "Clientes" },
  { tab: "pipeline",  label: "Pipeline" },
  { tab: "proyectos", label: "Proyectos" },
  { tab: "tareas",    label: "Tareas" },
  { sep: "EQUIPO & DATA" },
  { tab: "talent",    label: "Equipo" },
  { tab: "analytics", label: "Analytics" },
  { tab: "recursos",  label: "Recursos" },
  { sep: "SISTEMA" },
  { tab: "calendario", label: "Calendario" },
  { tab: "finanzas",   label: "Finanzas" },
  { tab: "accesos",    label: "Accesos" },
] as const;

export const WORKER_NAV = [
  { tab: "mis-tareas",   label: "Mis Tareas" },
  { tab: "mis-proyectos",label: "Mis Proyectos" },
  { tab: "calendario",   label: "Calendario" },
] as const;

export const CLIENT_NAV = [
  { tab: "mis-proyectos", label: "Mis Proyectos" },
  { tab: "calendario",    label: "Calendario" },
] as const;

// --- Project Colors (Timeline & Dots) ---
export const PROJECT_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-orange-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-yellow-500",
];

export const CAPSULE_COLORS = [
  "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "bg-purple-500/10 text-purple-500 border-purple-500/20",
  "bg-pink-500/10 text-pink-500 border-pink-500/20",
  "bg-orange-500/10 text-orange-500 border-orange-500/20",
  "bg-teal-500/10 text-teal-500 border-teal-500/20",
  "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
];
