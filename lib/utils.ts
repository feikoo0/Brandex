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
