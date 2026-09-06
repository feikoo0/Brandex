// ─────────────────────────────────────────────────────────────────────────────
//  Brandex OS / Taski — Timeline Utilities & Lane Assignment Engine
//  Algoritmo Greedy de Asignación de Carriles + Mapeo Espacio-Temporal
// ─────────────────────────────────────────────────────────────────────────────

import { Project, Task } from "./types";

export type TimelineZoomLevel = "dia" | "semana" | "mes";

export const ZOOM_CONFIG: Record<TimelineZoomLevel, { dayWidth: number; daysInView: number; label: string; subLabel: string }> = {
  dia: {
    dayWidth: 380,
    daysInView: 3,
    label: "3 Días",
    subLabel: "Vista de enfoque anclada (3 días)",
  },
  semana: {
    dayWidth: 160,
    daysInView: 7,
    label: "Semana",
    subLabel: "Vista semanal anclada (7 días)",
  },
  mes: {
    dayWidth: 0,
    daysInView: 0,
    label: "Mes",
    subLabel: "Calendario mensual clásico (7 columnas)",
  },
};

export const LANE_HEIGHT = 40; // Altura de cada carril de tarea
export const LANE_GAP = 8;     // Separación vertical entre carriles
export const ROW_PADDING_TOP = 12;
export const ROW_PADDING_BOTTOM = 12;
export const MIN_VISIBLE_LANES = 2; // Altura mínima de 2 carriles por fila (~112px)

// ── 1. Utilidades Puras de Fecha ──────────────────────────────────────────────

const SPANISH_MONTH_MAP: Record<string, number> = {
  ene: 0, enero: 0,
  feb: 1, febrero: 1,
  mar: 2, marzo: 2,
  abr: 3, abril: 3,
  may: 4, mayo: 4,
  jun: 5, junio: 5,
  jul: 6, julio: 6,
  ago: 7, agosto: 7,
  sep: 8, sept: 8, septiembre: 8,
  oct: 9, octubre: 9,
  nov: 10, noviembre: 10,
  dic: 11, diciembre: 11,
};

export function tryParseDate(input?: string | number | Date | null, fallbackYear?: number): Date | null {
  if (!input) return null;

  if (input instanceof Date) {
    const d = new Date(input);
    d.setHours(0, 0, 0, 0);
    return isNaN(d.getTime()) || d.getFullYear() < 2020 || d.getFullYear() > 2035 ? null : d;
  }

  if (typeof input === "number") {
    const ms = input < 10_000_000_000 ? input * 1000 : input;
    const d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    return isNaN(d.getTime()) || d.getFullYear() < 2020 || d.getFullYear() > 2035 ? null : d;
  }

  const cleanStr = String(input).trim();
  if (!cleanStr || cleanStr === "0" || cleanStr === "undefined" || cleanStr === "null") {
    return null;
  }

  // 1. ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
    const [y, m, d] = cleanStr.split("-").map(Number);
    if (y < 2020 || y > 2035) return null;
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }

  // 2. Formato español corto o largo: "10 Ago", "31 Jul", "12 Ago", "08 Sep", "15 Sep", "31 de Julio", etc.
  const spanishMatch = cleanStr.match(/^(\d{1,2})\s+(?:de\s+)?([a-zA-ZáéíóúÁÉÍÓÚ]{3,10})(?:\s+(?:de\s+)?(\d{4}))?$/i);
  if (spanishMatch) {
    const day = Number(spanishMatch[1]);
    const normalizedMonth = spanishMatch[2].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").slice(0, 3);
    const monthIdx = SPANISH_MONTH_MAP[normalizedMonth];
    if (monthIdx !== undefined) {
      const year = spanishMatch[3] ? Number(spanishMatch[3]) : (fallbackYear || new Date().getFullYear());
      return new Date(year, monthIdx, day, 0, 0, 0, 0);
    }
  }

  // 3. Formato DD/MM/YYYY o DD-MM-YYYY
  const slashMatch = cleanStr.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const month = Number(slashMatch[2]) - 1;
    const year = Number(slashMatch[3]);
    if (year >= 2020 && year <= 2035 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      return new Date(year, month, day, 0, 0, 0, 0);
    }
  }

  // 4. Timestamp en milisegundos
  if (/^\d{9,13}$/.test(cleanStr)) {
    const num = Number(cleanStr);
    const ms = num < 10_000_000_000 ? num * 1000 : num;
    const d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    return isNaN(d.getTime()) || d.getFullYear() < 2020 || d.getFullYear() > 2035 ? null : d;
  }

  // 5. Parse estándar Date()
  const parsed = new Date(cleanStr.includes("T") ? cleanStr : cleanStr + "T00:00:00");
  if (isNaN(parsed.getTime()) || parsed.getFullYear() < 2020 || parsed.getFullYear() > 2035) {
    return null;
  }
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

export function parseDateSafe(input?: string | number | Date | null): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return tryParseDate(input) || today;
}

export function formatDateIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function diffInDays(end: Date, start: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const utc1 = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const utc2 = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((utc2 - utc1) / msPerDay);
}

export function addDays(date: Date, days: number): Date {
  const res = new Date(date);
  res.setDate(res.getDate() + days);
  res.setHours(0, 0, 0, 0);
  return res;
}

export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Domingo, 6 = Sábado
}

// ── 2. Resolución Canónica de Buckets Kanban a Fechas Exactas (§6.1 RFC) ────────

export function resolveBucketDate(bucket: string, existingDateStr?: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (bucket === "hoy") {
    return formatDateIso(today);
  }

  if (bucket === "manana") {
    return formatDateIso(addDays(today, 1));
  }

  if (bucket === "semana") {
    // La columna "Esta Semana" corresponde exactamente a tareas con 1 < diff <= 7
    if (existingDateStr) {
      const existingDate = parseDateSafe(existingDateStr);
      const diff = diffInDays(existingDate, today);
      if (diff > 1 && diff <= 7) {
        return formatDateIso(existingDate);
      }
    }
    // Ancla por defecto dentro del rango válido (1 < diff <= 7):
    const currentDayOfWeek = today.getDay(); // 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab
    const distToFriday = 5 - (currentDayOfWeek === 0 ? 7 : currentDayOfWeek);
    if (distToFriday > 1 && distToFriday <= 7) {
      return formatDateIso(addDays(today, distToFriday));
    }
    return formatDateIso(addDays(today, 3));
  }

  if (bucket === "mes") {
    // La columna "Este Mes" corresponde a tareas con diff > 7
    if (existingDateStr) {
      const existingDate = parseDateSafe(existingDateStr);
      const diff = diffInDays(existingDate, today);
      if (diff > 7) {
        return formatDateIso(existingDate);
      }
    }
    // Ancla por defecto dentro del rango válido (> 7 días):
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    lastDayOfMonth.setHours(0, 0, 0, 0);
    if (diffInDays(lastDayOfMonth, today) > 7) {
      while (isWeekend(lastDayOfMonth) && diffInDays(lastDayOfMonth, today) > 7) {
        lastDayOfMonth.setDate(lastDayOfMonth.getDate() - 1);
      }
      return formatDateIso(lastDayOfMonth);
    }
    return formatDateIso(addDays(today, 14));
  }

  return formatDateIso(today);
}

// ── 3. Algoritmo Greedy de Asignación de Carriles / Stacking Vertical (§4 RFC) ───

export interface PositionedTimelineTask {
  task: any;
  projectId: string | number;
  startDate: Date;
  endDate: Date;
  durationDays: number;
  laneIndex: number;
  leftPx: number;
  widthPx: number;
  topPx: number;
}

export interface ProjectTimelineRowData {
  project: any;
  projectId: string | number;
  tasks: PositionedTimelineTask[];
  totalLanes: number;
  rowHeight: number;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Asigna a cada tarea el primer carril vertical (laneIndex) libre sin solapamiento temporal.
 * Algoritmo Greedy Interval Assignment (mismo patrón que Google Calendar y FullCalendar).
 */
export function calculateProjectLanes(
  tasks: any[],
  projectId: string | number,
  timelineStartDate: Date,
  dayWidth: number
): { positionedTasks: PositionedTimelineTask[]; totalLanes: number; rowHeight: number } {
  if (!tasks || tasks.length === 0) {
    const totalLanes = MIN_VISIBLE_LANES;
    const rowHeight = totalLanes * LANE_HEIGHT + (totalLanes - 1) * LANE_GAP + ROW_PADDING_TOP + ROW_PADDING_BOTTOM;
    return { positionedTasks: [], totalLanes, rowHeight };
  }

  // 1. Extraer y normalizar rango de fechas de cada tarea
  const rawItems = tasks.map((task) => {
    const rawProg = task.fecha_programada || task.fechaProg || task.fecha_limite || task.fechaEntrega || (task as any).deadline;
    const rawLimit = task.fecha_limite || task.fechaEntrega || (task as any).deadline || rawProg;

    const startDate = parseDateSafe(rawProg);
    const endDateCandidate = parseDateSafe(rawLimit);
    // Garantizar que la fecha fin sea >= fecha inicio
    const endDate = endDateCandidate < startDate ? startDate : endDateCandidate;
    const durationDays = diffInDays(endDate, startDate) + 1;

    return {
      task,
      startDate,
      endDate,
      durationDays,
    };
  });

  // 2. Ordenar por fecha de inicio ascendente, luego por mayor duración
  rawItems.sort((a, b) => {
    const timeA = a.startDate.getTime();
    const timeB = b.startDate.getTime();
    if (timeA !== timeB) return timeA - timeB;
    return b.durationDays - a.durationDays;
  });

  // 3. Asignación Greedy a carriles
  // laneEndDates[i] guarda la fecha fin de la última tarea asignada al carril i
  const laneEndDates: Date[] = [];
  const positionedTasks: PositionedTimelineTask[] = [];

  for (const item of rawItems) {
    let assignedLane = -1;

    for (let lane = 0; lane < laneEndDates.length; lane++) {
      const prevEnd = laneEndDates[lane];
      // Si la tarea actual empieza después de que termine la anterior en este carril (sin solapamiento)
      if (item.startDate > prevEnd) {
        assignedLane = lane;
        laneEndDates[lane] = item.endDate;
        break;
      }
    }

    if (assignedLane === -1) {
      // Necesita un nuevo carril
      assignedLane = laneEndDates.length;
      laneEndDates.push(item.endDate);
    }

    const startOffsetDays = diffInDays(item.startDate, timelineStartDate);
    const leftPx = startOffsetDays * dayWidth;
    const widthPx = Math.max(dayWidth - 8, item.durationDays * dayWidth - 8);
    const topPx = ROW_PADDING_TOP + assignedLane * (LANE_HEIGHT + LANE_GAP);

    positionedTasks.push({
      task: item.task,
      projectId,
      startDate: item.startDate,
      endDate: item.endDate,
      durationDays: item.durationDays,
      laneIndex: assignedLane,
      leftPx,
      widthPx,
      topPx,
    });
  }

  const activeLanesCount = laneEndDates.length;
  const totalLanes = Math.max(MIN_VISIBLE_LANES, activeLanesCount);
  const rowHeight = totalLanes * LANE_HEIGHT + (totalLanes - 1) * LANE_GAP + ROW_PADDING_TOP + ROW_PADDING_BOTTOM;

  return { positionedTasks, totalLanes, rowHeight };
}

// ── 4. Posicionamiento Fecha <-> Píxeles (§5.1 & §5.2 RFC) ────────────────────

export function dateToOffsetX(date: Date, timelineStartDate: Date, dayWidth: number): number {
  const days = diffInDays(date, timelineStartDate);
  return days * dayWidth;
}

export function pixelToDate(offsetX: number, timelineStartDate: Date, dayWidth: number): Date {
  const days = Math.round(offsetX / dayWidth);
  return addDays(timelineStartDate, days);
}

// ── 5. Generador de Rango de Calendario para el Eje Temporal ───────────────────

export interface TimelineDayHeader {
  date: Date;
  dateStr: string;
  dayNumber: number;
  dayNameShort: string;
  isToday: boolean;
  isWeekend: boolean;
  isFirstOfMonth: boolean;
  monthName: string;
  year: number;
  leftPx: number;
}

export function generateTimelineDays(
  startDate: Date,
  totalDays: number,
  dayWidth: number
): { days: TimelineDayHeader[]; totalWidth: number } {
  const days: TimelineDayHeader[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  for (let i = 0; i < totalDays; i++) {
    const current = addDays(startDate, i);
    const dateStr = formatDateIso(current);
    const dayNumber = current.getDate();
    const dayOfWeek = current.getDay();
    const isFirstOfMonth = dayNumber === 1 || i === 0;

    days.push({
      date: current,
      dateStr,
      dayNumber,
      dayNameShort: dayNames[dayOfWeek],
      isToday: isSameDay(current, today),
      isWeekend: isWeekend(current),
      isFirstOfMonth,
      monthName: monthNames[current.getMonth()],
      year: current.getFullYear(),
      leftPx: i * dayWidth,
    });
  }

  const totalWidth = totalDays * dayWidth;
  return { days, totalWidth };
}
