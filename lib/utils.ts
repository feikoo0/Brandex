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
export function greeting(name: string = ""): string {
  const h = new Date().getHours();
  let timeOfDay = "";
  let variations: string[] = [];

  if (h < 12) {
    timeOfDay = "Buenos días";
    variations = [`¡Buen día, ${name}!`, `¡Hola, ${name}! Qué gusto verte.`, `¡Buenos días, ${name}! Empecemos con todo.`];
  } else if (h < 18) {
    timeOfDay = "Buenas tardes";
    variations = [`¡Buenas tardes, ${name}!`, `¿Cómo va tu tarde, ${name}?`, `¡Hola, ${name}! Seguimos avanzando.`];
  } else {
    timeOfDay = "Buenas noches";
    variations = [`¡Buenas noches, ${name}!`, `¡Hola, ${name}! Cerrando el día.`, `¿Qué tal la noche, ${name}?`];
  }

  // Pick a random variation
  const rand = Math.floor(Math.random() * variations.length);
  return variations[rand];
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
        bg: "bg-[#ea580c] border border-orange-400/30 shadow-md",
        panelBg: "bg-[#9a3412]",
        title: "text-white font-bold",
        desc: "text-white/90 font-normal",
        muted: "text-white/70",
        dot: "bg-[#ea580c]",
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
