import { differenceInDays, addDays, format } from "date-fns";
import { DONE_STATES } from "./constants";
import { parseEsfuerzoMins } from "./utils";

export interface ProjectedTask {
  id: string;
  originalDate: string | null;
  projectedDate: string;
  isBumped: boolean;
  mins: number;
  project_id: string;
  task: any;
}

export const DAILY_CAPACITY_MINS = 8 * 60; // 8 hours

export function calculateProjections(data: any) {
  if (!data) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Separate Done and Pending tasks
  const doneTasks = data.tareas.filter((t: any) => {
    const isDone = DONE_STATES.has(t.estado);
    const hasProject = t.proyecto_ids && t.proyecto_ids.length > 0;
    return isDone && hasProject;
  });
  
  const pendingTasks = data.tareas.filter((t: any) => {
    const isPending = !DONE_STATES.has(t.estado);
    const hasProject = t.proyecto_ids && t.proyecto_ids.length > 0;
    return isPending && hasProject;
  });

  const projections: ProjectedTask[] = [];

  // 2. Map Done tasks (they stay where they are)
  doneTasks.forEach((t: any) => {
    const d = t.fechaEntrega || t.fechaProg || format(today, 'yyyy-MM-dd');
    projections.push({
      id: t.id,
      originalDate: d,
      projectedDate: d,
      isBumped: false,
      mins: parseEsfuerzoMins(t.esfuerzo || "0h"),
      project_id: String(t.proyecto_ids[0]),
      task: t
    });
  });


  // 3. Sort Pending tasks by Priority and Due Date
  const sortedPending = [...pendingTasks].sort((a: any, b: any) => {
    // Priority first
    const prioScore: Record<string, number> = { "Urgente": 4, "Alta": 3, "Media": 2, "Baja": 1 };
    const scoreA = prioScore[a.prioridad] || 0;
    const scoreB = prioScore[b.prioridad] || 0;
    if (scoreA !== scoreB) return scoreB - scoreA;

    // Then due date
    const dateA = a.fechaEntrega || "9999-12-31";
    const dateB = b.fechaEntrega || "9999-12-31";
    return dateA.localeCompare(dateB);
  });

  // 4. Assign Pending tasks to days starting from TODAY
  const dayLoads: Record<string, number> = {}; // YYYY-MM-DD -> mins used

  sortedPending.forEach((t: any) => {
    const mins = parseEsfuerzoMins(t.esfuerzo || "1h");
    const originalDateStr = t.fechaEntrega || t.fechaProg;
    const originalDate = originalDateStr ? new Date(originalDateStr + 'T12:00:00') : today;
    
    // Start searching for a slot from max(today, originalDate)
    // Actually, user wants to avoid "lying" about the past, so if it's pending, 
    // it MUST be today or later.
    let searchDate = today > originalDate ? today : originalDate;
    
    let assigned = false;
    let iterations = 0;
    while (!assigned && iterations < 365) {
      const dateKey = format(searchDate, 'yyyy-MM-dd');
      const currentLoad = dayLoads[dateKey] || 0;

      if (currentLoad + mins <= DAILY_CAPACITY_MINS) {
        dayLoads[dateKey] = currentLoad + mins;
        projections.push({
          id: t.id,
          originalDate: originalDateStr,
          projectedDate: dateKey,
          isBumped: dateKey !== originalDateStr,
          mins,
          project_id: String(t.proyecto_ids[0]),
          task: t
        });
        assigned = true;
      } else {
        searchDate = addDays(searchDate, 1);
        iterations++;
      }
    }
  });

  return projections;
}
