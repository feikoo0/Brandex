"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "framer-motion";
import { cn } from "@/lib/utils";
import type { SessionDoc } from "@/lib/types";

export type ContributionLevel = 0 | 1 | 2 | 3 | 4;

export type Contribution = {
  date: string;
  count: number;
  hours: number;
  level: ContributionLevel;
  sessionCount: number;
  isFuture?: boolean;
};

export type RepoContribution = {
  name: string;
  count: string | number;
  color?: string;
  logo?: React.ReactNode;
  href?: string;
};

const DEFAULT_ACCENT = "#3b82f6";
const DEFAULT_CELL_SIZE = 13;
const DEFAULT_LABEL = "Top proyectos con sesiones:";
const DEFAULT_MONTHS = 4;
const STACK_LIMIT = 3;

const gapFor = (cellSize: number) => Math.max(3, Math.round(cellSize / 3.4));

const useIsoLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const SPRING = { type: "spring", bounce: 0.2, duration: 0.62 } as const;
const HEADER_SPRING = { ...SPRING, bounce: 0.45 } as const;
const ROW_SPRING = { ...SPRING, bounce: 0.26, delay: 0.08 } as const;
const ROW_OFFSET = 16;
const CELL_FADE = { duration: 0.2, ease: EASE_OUT } as const;
const TOOLTIP_FADE = { duration: 0.14, ease: EASE_OUT } as const;
const TOOLTIP_EDGE = 8;
const COLUMN_STAGGER = 0.012;
const LABEL_BLUR = 6;
const LABEL_REVEAL = { duration: 0.45, ease: EASE_OUT } as const;

const LEVELS = [0, 1, 2, 3, 4] as const;

const MONTH_NAMES_ES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

function formatDateToLocalKey(dateInput: any): string | null {
  if (!dateInput) return null;
  try {
    let dateObj: Date;
    if (typeof dateInput.toDate === "function") {
      dateObj = dateInput.toDate();
    } else if (dateInput instanceof Date) {
      dateObj = dateInput;
    } else if (typeof dateInput === "string") {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) return dateInput;
      dateObj = new Date(dateInput);
    } else if (dateInput.seconds) {
      dateObj = new Date(dateInput.seconds * 1000);
    } else if (typeof dateInput === "number") {
      dateObj = new Date(dateInput);
    } else {
      return null;
    }

    if (isNaN(dateObj.getTime())) return null;
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return null;
  }
}

function formatDisplayDate(dateStr: string): string {
  try {
    const parts = dateStr.split("-").map(Number);
    if (parts.length === 3) {
      const [y, m, d] = parts;
      const monthLabel = MONTH_NAMES_ES[m - 1] || "";
      return `${d} ${monthLabel} ${y}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

const LEVEL_OPACITY: Record<ContributionLevel, number> = {
  0: 0.08,
  1: 0.32,
  2: 0.55,
  3: 0.8,
  4: 1,
};

type LevelStyle = { backgroundColor: string; opacity: number };
type HoveredDay = { day: Contribution; x: number; y: number };

function describeDay({ hours, sessionCount, date }: Contribution) {
  if (hours > 0 || sessionCount > 0) {
    return `${hours}h (${sessionCount} ${sessionCount === 1 ? "sesión" : "sesiones"}) el ${formatDisplayDate(date)}`;
  }
  return `Sin sesiones el ${formatDisplayDate(date)}`;
}

/**
 * Genera semanas de calendario exacto (Lunes a Domingo) con algoritmo anti-colisión de meses
 */
function buildCalendarWeeks(
  numWeeks = 16,
  sessions?: SessionDoc[],
  tasks?: any[]
): { weeks: Contribution[][]; monthLabels: (string | null)[] } {
  const today = new Date();
  const todayStr = formatDateToLocalKey(today) || "";

  // 1. Recopilar métricas reales de sesiones
  const dailyMetrics: Record<string, { hours: number; sessionCount: number }> = {};

  if (sessions && Array.isArray(sessions)) {
    sessions.forEach((s) => {
      const dateKey = formatDateToLocalKey(s.startTime || s.created || s.createdAt);
      if (!dateKey) return;
      if (!dailyMetrics[dateKey]) dailyMetrics[dateKey] = { hours: 0, sessionCount: 0 };
      const durationHours = (s.durationMins && s.durationMins > 0) ? s.durationMins / 60 : 0.5;
      dailyMetrics[dateKey].hours += durationHours;
      dailyMetrics[dateKey].sessionCount += 1;
    });
  }

  if (tasks && Array.isArray(tasks)) {
    tasks.forEach((t) => {
      if (t.sessions && Array.isArray(t.sessions)) {
        t.sessions.forEach((ts: { date?: string; hours?: number }) => {
          const dateKey = formatDateToLocalKey(ts.date);
          if (!dateKey) return;
          if (!dailyMetrics[dateKey]) dailyMetrics[dateKey] = { hours: 0, sessionCount: 0 };
          dailyMetrics[dateKey].hours += (ts.hours || 0);
          dailyMetrics[dateKey].sessionCount += 1;
        });
      }
    });
  }

  const hasAnyRealActivity = Object.keys(dailyMetrics).length > 0;

  // 2. Calcular fecha final: Domingo de la semana actual
  const currentDayOfWeek = (today.getDay() + 6) % 7; // Lunes = 0, ..., Domingo = 6
  const endSunday = new Date(today);
  endSunday.setDate(today.getDate() + (6 - currentDayOfWeek));

  // 3. Calcular fecha inicial: Lunes de hace (numWeeks - 1) semanas
  const startMonday = new Date(endSunday);
  startMonday.setDate(endSunday.getDate() - (numWeeks * 7 - 1));

  const weeks: Contribution[][] = [];
  const rawMonthMap: { weekIdx: number; monthName: string }[] = [];

  for (let w = 0; w < numWeeks; w++) {
    const weekDays: Contribution[] = [];

    for (let d = 0; d < 7; d++) {
      const currDate = new Date(startMonday);
      currDate.setDate(startMonday.getDate() + (w * 7 + d));
      const dateStr = formatDateToLocalKey(currDate) || "";
      const isFuture = dateStr > todayStr;

      const metric = dailyMetrics[dateStr];
      let totalHours = metric ? metric.hours : 0;
      let sessionCount = metric ? metric.sessionCount : 0;
      let level: ContributionLevel = 0;

      if (!isFuture) {
        if (totalHours > 0 || sessionCount > 0) {
          if (totalHours <= 1.5) level = 1;
          else if (totalHours <= 3.5) level = 2;
          else if (totalHours <= 5.5) level = 3;
          else level = 4;
        }
      }

      // Registrar inicio de mes
      if (currDate.getDate() === 1) {
        rawMonthMap.push({
          weekIdx: w,
          monthName: MONTH_NAMES_ES[currDate.getMonth()],
        });
      }

      weekDays.push({
        date: dateStr,
        count: sessionCount,
        hours: Math.round(totalHours * 10) / 10,
        level,
        sessionCount,
        isFuture,
      });
    }

    weeks.push(weekDays);
  }

  // 4. Algoritmo Anti-Colisión de Rótulos de Meses
  const monthLabels: (string | null)[] = new Array(numWeeks).fill(null);
  let lastLabeledIndex = -999;

  // Si la primera semana no tiene etiqueta pero hay espacio antes del primer día 1, agregar primer mes
  if (rawMonthMap.length > 0 && rawMonthMap[0].weekIdx >= 3) {
    monthLabels[0] = MONTH_NAMES_ES[startMonday.getMonth()];
    lastLabeledIndex = 0;
  }

  for (const item of rawMonthMap) {
    if (item.weekIdx - lastLabeledIndex >= 3 && item.weekIdx < numWeeks - 1) {
      monthLabels[item.weekIdx] = item.monthName;
      lastLabeledIndex = item.weekIdx;
    }
  }

  return { weeks, monthLabels };
}

function extractTopProjects(
  projects?: any[],
  sessions?: SessionDoc[]
): RepoContribution[] {
  if (!projects || !Array.isArray(projects) || projects.length === 0) {
    return [];
  }

  const projectHours: Record<string, { name: string; hours: number; color?: string }> = {};

  projects.forEach((p) => {
    projectHours[p.id] = {
      name: p.nombre || p.name || `Proyecto #${p.id}`,
      hours: 0,
      color: p.color || (p.customColor ? "#3b82f6" : "#39d353"),
    };
    if (p.tasks && Array.isArray(p.tasks)) {
      p.tasks.forEach((t: any) => {
        if (t.sessions && Array.isArray(t.sessions)) {
          t.sessions.forEach((s: any) => {
            projectHours[p.id].hours += (s.hours || 0);
          });
        }
      });
    }
  });

  if (sessions && Array.isArray(sessions)) {
    sessions.forEach((s) => {
      if (s.project_id && projectHours[s.project_id]) {
        const h = (s.durationMins && s.durationMins > 0) ? s.durationMins / 60 : 0.5;
        projectHours[s.project_id].hours += h;
      }
    });
  }

  return Object.values(projectHours)
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5)
    .map((p) => ({
      name: p.name,
      count: `${Math.round(p.hours * 10) / 10}h registradas`,
      color: p.color || "#3b82f6",
    }));
}

function toScale(accent: string | string[]): LevelStyle[] {
  if (typeof accent === "string") {
    return LEVELS.map((level) => ({
      backgroundColor: accent,
      opacity: LEVEL_OPACITY[level],
    }));
  }

  const colors = accent.length > 4 ? accent : ["transparent", ...accent];
  return LEVELS.map((level) => {
    const color = colors[level] ?? colors.at(-1) ?? "transparent";
    return { backgroundColor: color, opacity: color === "transparent" ? 0.08 : 1 };
  });
}

const Tooltip = ({
  hovered,
  reduceMotion,
}: {
  hovered: HoveredDay;
  reduceMotion: boolean | null;
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [left, setLeft] = React.useState(hovered.x);

  useIsoLayoutEffect(() => {
    const half = (ref.current?.offsetWidth ?? 0) / 2;
    const edge = TOOLTIP_EDGE + half;
    setLeft(Math.min(Math.max(hovered.x, edge), window.innerWidth - edge));
  }, [hovered]);

  return createPortal(
    <div
      className="pointer-events-none fixed z-50"
      style={{
        left,
        top: hovered.y,
        transform: "translate(-50%, calc(-100% - 8px))",
      }}
    >
      <motion.div
        ref={ref}
        className="whitespace-nowrap rounded-lg bg-[#121212] border border-white/15 px-2.5 py-1 text-[11px] font-sans font-medium text-[#ffffffd6] shadow-2xl backdrop-blur-md"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
        transition={reduceMotion ? { duration: 0 } : TOOLTIP_FADE}
      >
        {describeDay(hovered.day)}
      </motion.div>
    </div>,
    document.body,
  );
};

const ContributionGrid = ({
  weeks,
  monthLabels,
  scale,
  cellSize,
  label,
  reduceMotion,
}: {
  weeks: Contribution[][];
  monthLabels: (string | null)[];
  scale: LevelStyle[];
  cellSize: number;
  label: string;
  reduceMotion: boolean | null;
}) => {
  const gap = gapFor(cellSize);
  const [hovered, setHovered] = React.useState<HoveredDay>();

  const todayStr = React.useMemo(() => formatDateToLocalKey(new Date()), []);
  const sweepEnd = (weeks.length - 1) * COLUMN_STAGGER + CELL_FADE.duration;

  const hover = (day: Contribution) => (event: React.PointerEvent) => {
    if (day.isFuture) return;
    const cell = event.currentTarget.getBoundingClientRect();
    setHovered({ day, x: cell.left + cell.width / 2, y: cell.top });
  };

  return (
    <div
      data-slot="github-activity-grid"
      role="img"
      aria-label={label}
      className="relative w-fit mx-auto flex flex-col items-center justify-center select-none"
    >
      {/* Month Labels aligned to the exact week containing the 1st of the month */}
      <motion.div
        className="flex justify-start w-full mb-2.5 h-4"
        style={{ gap }}
        initial={
          reduceMotion
            ? false
            : { opacity: 0, filter: `blur(${LABEL_BLUR}px)` }
        }
        animate={{ opacity: 1, filter: "blur(0px)" }}
        transition={{
          ...LABEL_REVEAL,
          delay: reduceMotion ? 0 : sweepEnd,
        }}
      >
        {monthLabels.map((month, index) => (
          <div
            key={index}
            className="relative h-4 shrink-0 flex justify-start"
            style={{ width: cellSize }}
          >
            {month && (
              <span className="absolute left-0 top-0 text-[12px] font-medium font-sans leading-none text-[#ffffff6b] select-none whitespace-nowrap">
                {month}
              </span>
            )}
          </div>
        ))}
      </motion.div>

      {/* Grid of Weeks (Monday to Sunday) with overflow visible */}
      <div
        className="flex justify-start overflow-visible w-full py-0.5"
        style={{ gap }}
        onPointerLeave={() => setHovered(undefined)}
      >
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col shrink-0" style={{ gap }}>
            {week.map((day) => {
              const isToday = day.date === todayStr;

              if (day.isFuture) {
                return (
                  <div
                    key={day.date}
                    className="shrink-0 rounded-[3px] opacity-10 bg-white/5 pointer-events-none"
                    style={{ width: cellSize, height: cellSize }}
                  />
                );
              }

              return (
                <motion.div
                  key={day.date}
                  onPointerEnter={hover(day)}
                  className={cn(
                    "shrink-0 rounded-[3px] transition-all cursor-pointer relative",
                    isToday ? "border-2 border-white ring-1.5 ring-white/60 shadow-[0_0_8px_rgba(255,255,255,0.45)] z-10" : "border-0"
                  )}
                  style={{ width: cellSize, height: cellSize }}
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.4 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.35, zIndex: 20 }}
                  transition={{
                    ...CELL_FADE,
                    delay: reduceMotion ? 0 : weekIndex * COLUMN_STAGGER,
                  }}
                >
                  <div
                    className="h-full w-full rounded-[2px]"
                    style={scale[day.level] ?? scale[0]}
                  />
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {hovered && (
          <Tooltip
            key="tooltip"
            hovered={hovered}
            reduceMotion={reduceMotion}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const Avatar = ({
  repo,
  layoutId,
  transition,
  className,
}: {
  repo: RepoContribution;
  layoutId: string;
  transition: Transition;
  className?: string;
}) => (
  <motion.span
    layoutId={layoutId}
    transition={transition}
    className={cn(
      "grid size-5 shrink-0 place-items-center overflow-hidden rounded-full text-[9px] font-bold uppercase text-white ring-1.5 ring-[#181818]",
      className,
    )}
    style={{ backgroundColor: repo.color || "#3b82f6" }}
  >
    {repo.name.charAt(0)}
  </motion.span>
);

const RepoRow = ({
  repo,
  layoutId,
  transition,
}: {
  repo: RepoContribution;
  layoutId: string;
  transition: Transition;
}) => {
  const className =
    "flex items-center gap-2.5 rounded-lg mx-0.5 px-2 py-1.5 transition-colors hover:bg-white/5";

  const content = (
    <>
      <Avatar repo={repo} layoutId={layoutId} transition={transition} />
      <span className="flex-1 truncate text-xs font-medium text-[#ffffffd6]">
        {repo.name}
      </span>
      <span className="text-xs tabular-nums text-[#ffffff6b]">
        {repo.count}
      </span>
    </>
  );

  return <div className={className}>{content}</div>;
};

const Chevron = ({
  open,
  transition,
}: {
  open: boolean;
  transition: Transition;
}) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    className="size-5 text-[#ffffff6b]"
    initial={false}
    animate={{ rotate: open ? 180 : 0 }}
    transition={transition}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="m16 10-4 4-4-4" />
  </motion.svg>
);

export type GitHubActivityProps = React.ComponentProps<"div"> & {
  username?: string;
  sessions?: SessionDoc[];
  tasks?: any[];
  projects?: any[];
  contributions?: Contribution[];
  repos?: RepoContribution[];
  year?: number;
  accent?: string | string[];
  cellSize?: number;
  months?: number;
  showMonths?: boolean;
  label?: string;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  noContainer?: boolean;
};

const GitHubActivity = ({
  className,
  sessions,
  tasks,
  projects,
  contributions: contributionsProp,
  repos: reposProp,
  year,
  accent = DEFAULT_ACCENT,
  cellSize = DEFAULT_CELL_SIZE,
  months = DEFAULT_MONTHS,
  showMonths = true,
  label = DEFAULT_LABEL,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  noContainer = false,
  style,
  ...props
}: GitHubActivityProps) => {
  const reduceMotion = useReducedMotion();
  const uid = React.useId();
  const [openState, setOpenState] = React.useState(defaultOpen);

  const open = openProp ?? openState;
  const toggle = () => {
    if (openProp === undefined) setOpenState(!open);
    onOpenChange?.(!open);
  };

  // Fijar 16 semanas exactas (~3.8 meses) para holgura matemática perfecta sin desbordamiento
  const numWeeks = 16;

  const { weeks, monthLabels } = React.useMemo(() => {
    return buildCalendarWeeks(numWeeks, sessions, tasks);
  }, [numWeeks, sessions, tasks]);

  const repos = React.useMemo(() => {
    if (reposProp && reposProp.length > 0) return reposProp;
    return extractTopProjects(projects, sessions);
  }, [reposProp, projects, sessions]);

  const scale = React.useMemo(() => toScale(accent), [accent]);
  const transition = reduceMotion ? { duration: 0 } : SPRING;
  const headerTransition = reduceMotion ? { duration: 0 } : HEADER_SPRING;
  const rowTransition = reduceMotion ? { duration: 0 } : ROW_SPRING;

  const kick = reduceMotion ? {} : { x: ROW_OFFSET, y: ROW_OFFSET };
  const listMotion = {
    initial: { opacity: 0, ...kick },
    animate: { opacity: 1, x: 0, y: 0 },
    exit: { opacity: 0, ...kick },
  };

  const totalHours = React.useMemo(() => {
    return weeks.reduce(
      (sum, week) =>
        sum + week.reduce((wSum, day) => (!day.isFuture ? wSum + (day.hours || 0) : wSum), 0),
      0
    );
  }, [weeks]);

  const totalSessions = React.useMemo(() => {
    return weeks.reduce(
      (sum, week) =>
        sum + week.reduce((wSum, day) => (!day.isFuture ? wSum + (day.sessionCount || 0) : wSum), 0),
      0
    );
  }, [weeks]);

  const heading = `${Math.round(totalHours)}h registradas (${totalSessions} sesiones)`;

  // Ancho exacto calculado con 16 columnas + holgura simétrica
  const gap = gapFor(cellSize);
  const gridWidth = weeks.length * (cellSize + gap) - gap;

  return (
    <div
      data-slot="github-activity"
      className={cn(
        noContainer
          ? "relative w-full h-full flex flex-col justify-between select-none font-sans p-0 bg-transparent border-0"
          : "relative w-full h-full overflow-hidden rounded-[28px] bg-[#181818] border border-white/10 p-4 sm:p-5 text-white flex flex-col justify-between select-none font-sans",
        className,
      )}
      style={style}
      {...props}
    >
      {/* Header */}
      <div className="mb-2 flex items-baseline justify-between px-1 shrink-0">
        <p className="text-[13px] font-medium text-[#ffffffd6]">
          {heading}
        </p>
        <span className="text-[11px] font-normal text-[#ffffff6b]">
          Últimos {Math.round(months)} meses
        </span>
      </div>

      {/* Grid Container with Balanced Symmetric Padding */}
      <div className="flex-1 flex flex-col justify-center items-center rounded-[22px] bg-[#121212] border border-white/[0.06] px-5 py-4 sm:px-6 sm:py-5 mb-2.5 overflow-visible w-full">
        <ContributionGrid
          weeks={weeks}
          monthLabels={monthLabels}
          scale={scale}
          cellSize={cellSize}
          label={heading}
          reduceMotion={reduceMotion}
        />
      </div>

      {/* Bottom Panel */}
      {repos.length > 0 && (
        <div className="relative shrink-0 w-full">
          <motion.div
            layout
            id={`${uid}-panel`}
            data-slot="github-activity-panel"
            data-state={open ? "open" : "closed"}
            className={cn(
              "overflow-hidden bg-[#1f1f1f] border border-white/10 backdrop-blur-xl rounded-[14px]",
              open ? "absolute inset-x-0 bottom-0 top-auto z-30 shadow-2xl bg-[#1f1f1f]/98" : "relative"
            )}
            transition={transition}
          >
            <motion.div
              layout="position"
              transition={headerTransition}
              className="flex items-center justify-between gap-2 py-1.5 px-3"
            >
              <span className="truncate text-[11px] font-medium text-[#ffffffb3]">{label}</span>

              <div className="flex items-center gap-1.5">
                {!open && (
                  <div className="flex items-center">
                    {repos.slice(0, STACK_LIMIT).map((repo, index) => (
                      <Avatar
                        key={index}
                        repo={repo}
                        layoutId={`${uid}-${index}`}
                        transition={transition}
                        className="-ml-1 first:ml-0"
                      />
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={toggle}
                  aria-expanded={open}
                  aria-controls={`${uid}-panel`}
                  aria-label={
                    open ? "Ocultar proyectos" : "Mostrar proyectos"
                  }
                  className="grid size-5 shrink-0 place-items-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <Chevron open={open} transition={transition} />
                </button>
              </div>
            </motion.div>

            <AnimatePresence initial={false} mode="popLayout">
              {open && (
                <motion.ul
                  key="list"
                  layout="position"
                  {...listMotion}
                  transition={rowTransition}
                  className="px-1 pb-1.5 space-y-0.5 overflow-y-auto max-h-[160px]"
                >
                  {repos.map((repo, index) => (
                    <li key={index}>
                      <RepoRow
                        repo={repo}
                        layoutId={`${uid}-${index}`}
                        transition={transition}
                      />
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export { GitHubActivity };
export default GitHubActivity;
