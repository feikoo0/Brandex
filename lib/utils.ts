import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { STATUS_COLORS, PRIORITY_COLORS } from "./constants";

// shadcn/ui utility — merges tailwind classes safely
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Returns the dot/chip color for a given task/project status
export function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? "#636366";
}

// Returns the color for a priority level
export function priorityColor(priority: string): string {
  return PRIORITY_COLORS[priority] ?? "#636366";
}

// Returns initials avatar from a name (e.g. "Andres Perez" → "AP")
export function avatarOf(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// Format ISO date string → "14 Ene 2025"
// Uses local-time parsing to avoid UTC-midnight timezone shift (e.g. UTC-6 showing day-1)
export function fmtDate(iso: string): string {
  if (!iso) return "—";
  try {
    // "YYYY-MM-DD" only → parse as local date to avoid UTC shift
    const plain = iso.slice(0, 10);
    const [y, m, d] = plain.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

// Returns relative days from today to a date
export function daysUntil(iso: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const plain = iso.slice(0, 10);
  const [y, m, d] = plain.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  return Math.round((target.getTime() - now.getTime()) / 86_400_000);
}

// Greeting based on hour with randomized variations
export function greeting(name: string = "Feiko"): string {
  const user = name.trim() || "Feiko";
  const h = new Date().getHours();
  let variations: string[] = [];

  if (h >= 5 && h < 12) {
    variations = [
      `Buenos días, ${user}`,
      `¡Buen día, ${user}!`,
      `¡Hola, ${user}! Qué gusto verte.`,
      `¡Buenos días, ${user}! Empecemos con todo.`,
      `¡Excelente mañana, ${user}!`
    ];
  } else if (h >= 12 && h < 19) {
    variations = [
      `Buenas tardes, ${user}`,
      `¿Cómo va tu tarde, ${user}?`,
      `¡Hola, ${user}! Seguimos avanzando.`,
      `Buenas tardes, ${user}. En pleno flujo.`,
      `¡Excelente tarde, ${user}!`
    ];
  } else if (h >= 19 && h < 24) {
    variations = [
      `Buenas noches, ${user}`,
      `¡Hola, ${user}! Cerrando el día.`,
      `¿Qué tal la noche, ${user}?`,
      `Buenas noches, ${user}. Gran trabajo hoy.`,
      `¡Buenas noches, ${user}!`
    ];
  } else {
    variations = [
      `Turno nocturno, ${user}`,
      `Buenas noches, ${user}`,
      `¡Madrugada activa, ${user}!`,
      `¡Hola, ${user}! Inspiración nocturna.`
    ];
  }

  const rand = Math.floor(Math.random() * variations.length);
  return variations[rand];
}

export function getDynamicGreeting(name: string = "Feiko"): { title: string; subtitle: string } {
  const user = name.trim() || "Feiko";
  const h = new Date().getHours();

  let options: { title: string; subtitle: string }[] = [];

  if (h >= 5 && h < 12) {
    options = [
      { title: "Buenos días,", subtitle: user },
      { title: "¡Buen día,", subtitle: `${user}!` },
      { title: "¡Hola,", subtitle: `${user}!` },
      { title: "¡Excelente mañana,", subtitle: `${user}!` },
      { title: "¡A darle con todo,", subtitle: `${user}!` },
    ];
  } else if (h >= 12 && h < 19) {
    options = [
      { title: "Buenas tardes,", subtitle: user },
      { title: "¡Hola,", subtitle: `${user}!` },
      { title: "¿Qué tal tu tarde,", subtitle: `${user}?` },
      { title: "¡Seguimos en flujo,", subtitle: `${user}!` },
      { title: "¡Excelente tarde,", subtitle: `${user}!` },
    ];
  } else if (h >= 19 && h < 24) {
    options = [
      { title: "Buenas noches,", subtitle: user },
      { title: "¡Hola,", subtitle: `${user}!` },
      { title: "¿Qué tal la noche,", subtitle: `${user}?` },
      { title: "Cerrando el día,", subtitle: user },
      { title: "¡Gran trabajo hoy,", subtitle: `${user}!` },
    ];
  } else {
    options = [
      { title: "Turno nocturno,", subtitle: user },
      { title: "Buenas noches,", subtitle: user },
      { title: "¡Madrugada activa,", subtitle: `${user}!` },
      { title: "¡Hola,", subtitle: `${user}!` },
    ];
  }

  const index = Math.floor(Math.random() * options.length);
  return options[index];
}

export function parseEsfuerzoMins(esfuerzo: string): number {
  if (!esfuerzo) return 0;
  const s = esfuerzo.toLowerCase();
  const h = s.match(/(\d+)\s*h/);
  const m = s.match(/(\d+)\s*min/);
  let t = 0;
  if (h) t += parseInt(h[1]) * 60;
  if (m) t += parseInt(m[1]);
  if (t) return t;
  if (s.includes("flash")) return 15;
  if (s.includes("corto") || s.includes("rápido")) return 30;
  if (s.includes("medio") || s.includes("normal")) return 60;
  if (s.includes("largo")) return 120;
  if (s.includes("maratón") || s.includes("+3")) return 180;
  return 0;
}

export function parseTimeToHours(timeStr: string | undefined | null): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim().toLowerCase();
  
  // Handle formats like "15 min", "30 min"
  if (clean.includes("min")) {
    const minMatch = clean.match(/(\d+(?:\.\d+)?)/);
    if (minMatch) {
      return parseFloat(minMatch[1]) / 60;
    }
  }
  
  // Handle formats like "1.5h", "2h", "1 hora", "2 horas", "3 horas o más"
  const hrMatch = clean.match(/(\d+(?:\.\d+)?)/);
  if (hrMatch) {
    return parseFloat(hrMatch[1]);
  }
  
  return 0;
}

export interface CardColorTheme {
  bg: string;
  title: string;
  desc: string;
  muted: string;
  dot: string;
  label: string;
  panelBg: string;
}

export interface ColorPresetItem {
  name: string;
  key: string;
  h: number;
  s: number;
  l: number;
  hslStr: string;
  solidColor: string;
  gradient: string;
  glow: string;
}

export const PROJECT_COLOR_PALETTE: ColorPresetItem[] = [
  { name: "Azul Eléctrico", key: "Azul", h: 217, s: 91, l: 60, hslStr: "hsl(217, 91%, 60%)", solidColor: "#2563eb", gradient: "bg-blue-600", glow: "bg-blue-600" },
  { name: "Naranja Vibrante", key: "Naranja", h: 25, s: 95, l: 50, hslStr: "hsl(25, 95%, 50%)", solidColor: "#f97316", gradient: "bg-orange-500", glow: "bg-orange-500" },
  { name: "Rojo Pasión", key: "Rojo", h: 0, s: 90, l: 55, hslStr: "hsl(0, 90%, 55%)", solidColor: "#ef4444", gradient: "bg-red-500", glow: "bg-red-500" },
  { name: "Púrpura", key: "Morado", h: 271, s: 91, l: 65, hslStr: "hsl(271, 91%, 65%)", solidColor: "#9333ea", gradient: "bg-purple-600", glow: "bg-purple-600" },
  { name: "Violeta Índigo", key: "Índigo", h: 245, s: 85, l: 60, hslStr: "hsl(245, 85%, 60%)", solidColor: "#6366f1", gradient: "bg-indigo-500", glow: "bg-indigo-500" },
  { name: "Esmeralda", key: "Verde", h: 142, s: 70, l: 45, hslStr: "hsl(142, 70%, 45%)", solidColor: "#10b981", gradient: "bg-emerald-600", glow: "bg-emerald-600" },
  { name: "Verde Lima", key: "Lima", h: 90, s: 90, l: 48, hslStr: "hsl(90, 90%, 48%)", solidColor: "#84cc16", gradient: "bg-lime-500", glow: "bg-lime-500" },
  { name: "Amarillo Neón", key: "Amarillo", h: 65, s: 95, l: 50, hslStr: "hsl(65, 95%, 50%)", solidColor: "#eab308", gradient: "bg-amber-400", glow: "bg-amber-400" },
  { name: "Rosa Neón", key: "Rosa", h: 328, s: 95, l: 55, hslStr: "hsl(328, 95%, 55%)", solidColor: "#ec4899", gradient: "bg-pink-600", glow: "bg-pink-600" },
  { name: "Turquesa Menta", key: "Turquesa", h: 168, s: 85, l: 45, hslStr: "hsl(168, 85%, 45%)", solidColor: "#14b8a6", gradient: "bg-teal-500", glow: "bg-teal-500" },
  { name: "Cyan Brillante", key: "Cyan", h: 180, s: 90, l: 50, hslStr: "hsl(180, 90%, 50%)", solidColor: "#06b6d4", gradient: "bg-cyan-500", glow: "bg-cyan-500" },
  { name: "Gris Acero", key: "Gris", h: 215, s: 14, l: 40, hslStr: "hsl(215, 14%, 40%)", solidColor: "#475569", gradient: "bg-slate-700", glow: "bg-slate-500" },
];

export function parseAnyDate(s?: any): Date | null {
  if (!s) return null;
  if (s instanceof Date) return isNaN(s.getTime()) ? null : s;
  if (typeof s === "object" && s.toDate && typeof s.toDate === "function") {
    try { return s.toDate(); } catch {}
  }
  const str = String(s).trim();
  if (!str || str.toLowerCase() === "sin fecha" || str.toLowerCase() === "hoy") return null;

  const currentYear = new Date().getFullYear();

  // 1. Formato YYYY-MM-DD o ISO
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const d = parseInt(isoMatch[3], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d);
    }
  }

  // 2. Formato DD/MM/YYYY
  const latamMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (latamMatch) {
    const d = parseInt(latamMatch[1], 10);
    const m = parseInt(latamMatch[2], 10) - 1;
    const y = parseInt(latamMatch[3], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d);
    }
  }

  // 3. Formato amigable en español (ej: "17 Ago", "3 Ene", "25 Dic")
  const spanishMonths: Record<string, number> = {
    ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
    jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11
  };

  const friendlyMatch = str.match(/^(\d{1,2})\s+([a-zA-Z]{3,4})/i);
  if (friendlyMatch) {
    const day = parseInt(friendlyMatch[1], 10);
    const monthKey = friendlyMatch[2].toLowerCase().substring(0, 3);
    if (!isNaN(day) && spanishMonths[monthKey] !== undefined) {
      return new Date(currentYear, spanishMonths[monthKey], day);
    }
  }

  const fallback = new Date(str);
  if (!isNaN(fallback.getTime())) {
    if (fallback.getFullYear() < 2015 && !str.includes("20") && !str.includes("19")) {
      fallback.setFullYear(currentYear);
    }
    return fallback;
  }

  return null;
}

export function getClientLastProjectText(clientProjects: any[]): string {
  if (!clientProjects || clientProjects.length === 0) {
    return "Sin proyectos";
  }

  let latestTimestamp = 0;
  for (const p of clientProjects) {
    const raw = 
      p.fechaFin || 
      p.fechaInicio || 
      p.updated_at || 
      p.updatedAt || 
      p.created || 
      p.createdAt || 
      p.fechaEntrega || 
      p.fecha_entrega || 
      p.deadline || 
      p.fecha;

    const d = parseAnyDate(raw);
    if (d && d.getTime() > latestTimestamp) {
      latestTimestamp = d.getTime();
    }
  }

  if (latestTimestamp === 0) {
    return `${clientProjects.length} ${clientProjects.length === 1 ? "proyecto registrado" : "proyectos registrados"}`;
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.round((now.getTime() - latestTimestamp) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return "Último proyecto hoy";
  } else if (diffDays === 1) {
    return "Último proyecto hace 1 día";
  } else if (diffDays < 7) {
    return `Último proyecto hace ${diffDays} días`;
  } else if (diffDays < 30) {
    const weeks = Math.max(1, Math.floor(diffDays / 7));
    return `Último proyecto hace ${weeks} ${weeks === 1 ? "semana" : "semanas"}`;
  } else if (diffDays < 365) {
    const months = Math.max(1, Math.floor(diffDays / 30));
    return `Último proyecto hace ${months} ${months === 1 ? "mes" : "meses"}`;
  } else {
    const years = Math.max(1, Math.floor(diffDays / 365));
    return `Último proyecto hace ${years} ${years === 1 ? "año" : "años"}`;
  }
}

export function getSingleSourceColor(entity: any): { h: number; s: number; l: number; hslCss: string } {
  if (!entity) return { h: 217, s: 91, l: 60, hslCss: "hsl(217, 91%, 60%)" };

  if (entity.customColor && typeof entity.customColor.h === "number") {
    const { h, s, l } = entity.customColor;
    const lVal = typeof l === "number" ? l : 55;
    return { h, s, l: lVal, hslCss: `hsl(${h}, ${s}%, ${lVal}%)` };
  }

  const raw = entity.color || entity.customGradientStyle || entity.gradient || "";
  if (raw.includes("hsl(")) {
    const match = raw.match(/hsl\((\d+),\s*(\d+)%?,\s*(\d+)%?\)/i);
    if (match) {
      const h = parseInt(match[1], 10);
      const s = parseInt(match[2], 10);
      const l = parseInt(match[3], 10);
      return { h, s, l, hslCss: `hsl(${h}, ${s}%, ${l}%)` };
    }
  }

  // Preset match by colorName or colorKey or solidColor
  const foundPreset = PROJECT_COLOR_PALETTE.find(
    (p) =>
      p.name.toLowerCase() === (entity.colorName || raw).toLowerCase() ||
      p.key.toLowerCase() === (entity.colorKey || raw).toLowerCase() ||
      p.solidColor.toLowerCase() === raw.toLowerCase()
  );
  if (foundPreset) {
    return { h: foundPreset.h, s: foundPreset.s, l: foundPreset.l, hslCss: foundPreset.hslStr };
  }

  const lower = raw.toLowerCase();
  if (lower.includes("red") || lower.includes("rojo")) return { h: 0, s: 90, l: 55, hslCss: "hsl(0, 90%, 55%)" };
  if (lower.includes("orange") || lower.includes("naranja")) return { h: 25, s: 95, l: 50, hslCss: "hsl(25, 95%, 50%)" };
  if (lower.includes("amber") || lower.includes("amarillo")) return { h: 65, s: 95, l: 50, hslCss: "hsl(65, 95%, 50%)" };
  if (lower.includes("purple") || lower.includes("morado")) return { h: 271, s: 91, l: 65, hslCss: "hsl(271, 91%, 65%)" };
  if (lower.includes("indigo") || lower.includes("violeta")) return { h: 245, s: 85, l: 60, hslCss: "hsl(245, 85%, 60%)" };
  if (lower.includes("emerald") || lower.includes("verde")) return { h: 142, s: 70, l: 45, hslCss: "hsl(142, 70%, 45%)" };
  if (lower.includes("lime") || lower.includes("lima")) return { h: 90, s: 90, l: 48, hslCss: "hsl(90, 90%, 48%)" };
  if (lower.includes("slate") || lower.includes("zinc") || lower.includes("gray") || lower.includes("gris")) return { h: 215, s: 14, l: 40, hslCss: "hsl(215, 14%, 40%)" };
  if (lower.includes("pink") || lower.includes("rosa")) return { h: 328, s: 95, l: 55, hslCss: "hsl(328, 95%, 55%)" };
  if (lower.includes("cyan") || lower.includes("teal")) return { h: 180, s: 90, l: 50, hslCss: "hsl(180, 90%, 50%)" };

  // If no explicit color is set, hash deterministically by name or ID
  const seed = String(entity.nombre || entity.name || entity.id || "");
  if (seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % PROJECT_COLOR_PALETTE.length;
    const preset = PROJECT_COLOR_PALETTE[idx];
    return { h: preset.h, s: preset.s, l: preset.l, hslCss: preset.hslStr };
  }

  return { h: 217, s: 91, l: 60, hslCss: "hsl(217, 91%, 60%)" };
}

export function getSingleSourceProjectColor(project: any): { h: number; s: number; l: number; hslCss: string } {
  return getSingleSourceColor(project);
}

export function getSingleSourceClientColor(client: any): { h: number; s: number; l: number; hslCss: string } {
  return getSingleSourceColor(client);
}

export function getSingleSourceMemberColor(member: any): { h: number; s: number; l: number; hslCss: string } {
  return getSingleSourceColor(member);
}

export function getMemberLastActivityText(memberProjects: any[] = [], memberTasks: any[] = []): string {
  if ((!memberProjects || memberProjects.length === 0) && (!memberTasks || memberTasks.length === 0)) {
    return "Sin asignaciones";
  }

  let latestTimestamp = 0;

  for (const t of memberTasks) {
    const raw = t.fechaEntrega || t.fechaProg || t.updated_at || t.updatedAt || t.created || t.createdAt || t.fecha;
    const d = parseAnyDate(raw);
    if (d && d.getTime() > latestTimestamp) {
      latestTimestamp = d.getTime();
    }
  }

  for (const p of memberProjects) {
    const raw = p.fechaFin || p.fechaInicio || p.updated_at || p.updatedAt || p.created || p.createdAt || p.fechaEntrega || p.deadline || p.fecha;
    const d = parseAnyDate(raw);
    if (d && d.getTime() > latestTimestamp) {
      latestTimestamp = d.getTime();
    }
  }

  if (latestTimestamp === 0) {
    const totalCount = (memberTasks.length || 0) + (memberProjects.length || 0);
    return `${totalCount} ${totalCount === 1 ? "entrega asignada" : "entregas asignadas"}`;
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.round((now.getTime() - latestTimestamp) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return "Activo hoy";
  } else if (diffDays === 1) {
    return "Última actividad hace 1 día";
  } else if (diffDays < 7) {
    return `Última actividad hace ${diffDays} días`;
  } else if (diffDays < 30) {
    const weeks = Math.max(1, Math.floor(diffDays / 7));
    return `Última actividad hace ${weeks} ${weeks === 1 ? "semana" : "semanas"}`;
  } else if (diffDays < 365) {
    const months = Math.max(1, Math.floor(diffDays / 30));
    return `Última actividad hace ${months} ${months === 1 ? "mes" : "meses"}`;
  } else {
    const years = Math.max(1, Math.floor(diffDays / 365));
    return `Última actividad hace ${years} ${years === 1 ? "año" : "años"}`;
  }
}

export function getDarkProjectPillVars(projectOrColor: any) {
  const colorObj = (projectOrColor && typeof projectOrColor.h === "number")
    ? projectOrColor
    : getSingleSourceProjectColor(projectOrColor);

  const { h, s, l = 55 } = colorObj;
  const sat = Math.max(35, Math.min(s, 85));

  // Slightly darker than the project lightness (~8% darker), borderless / sin trazo
  const baseL = typeof l === "number" ? l : 55;
  const bgL = Math.max(32, Math.round(baseL - 8));
  const bgHoverL = Math.max(26, Math.round(baseL - 13));
  const textL = 98;

  return {
    style: {
      '--pill-bg': `hsl(${h}, ${sat}%, ${bgL}%)`,
      '--pill-bg-hover': `hsl(${h}, ${sat}%, ${bgHoverL}%)`,
      '--pill-color': `hsl(${h}, ${Math.min(sat, 80)}%, ${textL}%)`,
      backgroundColor: `var(--pill-bg)`,
      border: `none`,
      outline: `none`,
      color: `var(--pill-color)`,
    } as React.CSSProperties,
    className: "border-none outline-none bg-[var(--pill-bg)] hover:bg-[var(--pill-bg-hover)] text-[var(--pill-color)] shadow-sm font-bold"
  };
}


export const CARD_COLOR_KEYS = [
  "Predeterminado",
  "Gris",
  "Naranja",
  "Amarillo",
  "Verde",
  "Azul",
  "Morado",
  "Rosa",
  "Rojo",
] as const;

export function getCardColorTheme(colorName: string = "Predeterminado", _isNightMode: boolean = true): CardColorTheme {
  const key = colorName || "Predeterminado";

  switch (key) {
    case "Gris":
      return {
        bg: "bg-[#334155] border border-slate-400/30 shadow-md",
        panelBg: "bg-[#1e293b]",
        title: "text-white font-bold",
        desc: "text-white/90 font-normal",
        muted: "text-white/70",
        dot: "bg-[#334155]",
        label: "Gris"
      };
    case "Naranja":
      return {
        bg: "bg-[#f97316] border border-orange-400/30 shadow-md",
        panelBg: "bg-[#c2410c]",
        title: "text-white font-bold",
        desc: "text-white/90 font-normal",
        muted: "text-white/70",
        dot: "bg-[#f97316]",
        label: "Naranja"
      };
    case "Amarillo":
      return {
        bg: "bg-[#d97706] border border-amber-400/30 shadow-md",
        panelBg: "bg-[#92400e]",
        title: "text-white font-bold",
        desc: "text-white/90 font-normal",
        muted: "text-white/70",
        dot: "bg-[#d97706]",
        label: "Amarillo"
      };
    case "Verde":
      return {
        bg: "bg-[#059669] border border-emerald-400/30 shadow-md",
        panelBg: "bg-[#065f46]",
        title: "text-white font-bold",
        desc: "text-white/90 font-normal",
        muted: "text-white/70",
        dot: "bg-[#059669]",
        label: "Verde"
      };
    case "Azul":
      return {
        bg: "bg-[#2563eb] border border-blue-400/30 shadow-md",
        panelBg: "bg-[#1e40af]",
        title: "text-white font-bold",
        desc: "text-white/90 font-normal",
        muted: "text-white/70",
        dot: "bg-[#2563eb]",
        label: "Azul"
      };
    case "Morado":
      return {
        bg: "bg-[#7c3aed] border border-violet-400/30 shadow-md",
        panelBg: "bg-[#5b21b6]",
        title: "text-white font-bold",
        desc: "text-white/90 font-normal",
        muted: "text-white/70",
        dot: "bg-[#7c3aed]",
        label: "Morado"
      };
    case "Rosa":
      return {
        bg: "bg-[#db2777] border border-pink-400/30 shadow-md",
        panelBg: "bg-[#9d174d]",
        title: "text-white font-bold",
        desc: "text-white/90 font-normal",
        muted: "text-white/70",
        dot: "bg-[#db2777]",
        label: "Rosa"
      };
    case "Rojo":
      return {
        bg: "bg-[#dc2626] border border-red-400/30 shadow-md",
        panelBg: "bg-[#991b1b]",
        title: "text-white font-bold",
        desc: "text-white/90 font-normal",
        muted: "text-white/70",
        dot: "bg-[#dc2626]",
        label: "Rojo"
      };
    default: // Predeterminado
      return {
        bg: "bg-[#18181b] border border-zinc-700/70 shadow-md",
        panelBg: "bg-[#09090b]",
        title: "text-white font-bold",
        desc: "text-white/90 font-normal",
        muted: "text-white/70",
        dot: "bg-[#18181b]",
        label: "Predeterminado"
      };
  }
}
