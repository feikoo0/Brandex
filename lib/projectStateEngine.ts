import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getWorkspaceScopedCol } from "@/lib/utils";

// Estados reconocidos de tareas
export const DONE_TASK_STRINGS = new Set([
  "completado",
  "completada",
  "hecho",
  "publicado",
  "aprobado",
  "entregado",
  "done",
]);

export const IN_PROGRESS_TASK_STRINGS = new Set([
  "en proceso",
  "en_proceso",
  "en progreso",
  "revision",
  "revisión",
  "en revision",
  "en revisión",
  "modificar",
  "por publicar",
]);

export const INITIAL_TASK_STRINGS = new Set([
  "pendiente",
  "por hacer",
  "planificado",
  "planificacion",
  "planificación",
  "backlog",
  "sin empezar",
]);

export function isTaskCompleted(status?: string): boolean {
  if (!status) return false;
  return DONE_TASK_STRINGS.has(status.toLowerCase().trim());
}

export function isTaskInProgress(status?: string): boolean {
  if (!status) return false;
  return IN_PROGRESS_TASK_STRINGS.has(status.toLowerCase().trim());
}

export function isTaskInitial(status?: string): boolean {
  if (!status) return true;
  return INITIAL_TASK_STRINGS.has(status.toLowerCase().trim());
}

/**
 * Determina si al iniciar una sesión sobre una tarea, su estado debe promoverse a "En proceso".
 * Si la tarea está en estado inicial o no completado, debe promoverse.
 */
export function shouldPromoteTaskOnSessionStart(status?: string): boolean {
  if (!status) return true;
  return !isTaskCompleted(status);
}

export interface TaskLike {
  id?: string | number;
  estado?: string;
  status?: string;
}

/**
 * Evalúa de forma pura el nuevo estado que debería tener un proyecto
 * de acuerdo a la lista completa de sus tareas asociadas.
 *
 * Reglas:
 * 1. Si no hay tareas (0 tareas) -> Conserva el estado actual o "Planificación".
 * 2. Si todas las tareas están completadas (y total > 0) -> "Completado".
 * 3. Si hay al menos una tarea en proceso, o tareas parcialmente completadas -> "En Proceso".
 * 4. Si todas las tareas están en estado inicial -> "Planificación" (a menos que esté en "Pausado" o "Cancelado").
 */
export function evaluateProjectStatusFromTasks(
  currentProjectStatus: string = "Planificación",
  tasks: TaskLike[] = []
): {
  newStatus: "Planificación" | "En Proceso" | "Completado" | string;
  hasChanged: boolean;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  progressPercent: number;
} {
  const totalTasks = tasks.length;
  if (totalTasks === 0) {
    const fallback = currentProjectStatus || "Planificación";
    return {
      newStatus: fallback,
      hasChanged: false,
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      progressPercent: 0,
    };
  }

  let completedTasks = 0;
  let inProgressTasks = 0;

  for (const t of tasks) {
    const rawSt = t.estado || t.status || "";
    if (isTaskCompleted(rawSt)) {
      completedTasks++;
    } else if (isTaskInProgress(rawSt)) {
      inProgressTasks++;
    }
  }

  const progressPercent = Math.round((completedTasks / totalTasks) * 100);

  let newStatus: string = currentProjectStatus;

  // 1. Todas las tareas completadas
  if (completedTasks === totalTasks && totalTasks > 0) {
    newStatus = "Completado";
  }
  // 2. Al menos una en progreso o parcialmente completadas (ej. 1 de 3)
  else if (inProgressTasks > 0 || completedTasks > 0) {
    newStatus = "En Proceso";
  }
  // 3. Todas están en estado inicial
  else {
    const curLower = (currentProjectStatus || "").toLowerCase().trim();
    if (curLower === "pausado" || curLower === "cancelado") {
      newStatus = currentProjectStatus;
    } else {
      newStatus = "Planificación";
    }
  }

  // Comprobar si cambió
  const normalize = (s?: string) => (s || "").toLowerCase().replace(/[\s_-]+/g, "");
  const hasChanged = normalize(newStatus) !== normalize(currentProjectStatus);

  return {
    newStatus,
    hasChanged,
    totalTasks,
    completedTasks,
    inProgressTasks,
    progressPercent,
  };
}

/**
 * Persiste la actualización de estado de un proyecto en Firestore
 * de forma atómica en ambas colecciones (`projects` y `v3_projects`).
 */
export async function syncProjectStatusInFirestore({
  projectId,
  newStatus,
  workspaceId,
  isMaster = true,
}: {
  projectId: string;
  newStatus: string;
  workspaceId?: string | null;
  isMaster?: boolean;
}): Promise<boolean> {
  if (!projectId) return false;

  const projectsCol = getWorkspaceScopedCol("projects", workspaceId, isMaster);
  const v3ProjectsCol = getWorkspaceScopedCol("v3_projects", workspaceId, isMaster);

  const statusColor =
    newStatus === "Completado"
      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      : newStatus === "En Proceso"
      ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
      : newStatus === "En Revisión" || newStatus === "Revisión"
      ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
      : "bg-purple-500/20 text-purple-400 border-purple-500/30";

  const payload: any = {
    estadoProyecto: newStatus,
    estado: newStatus,
    status: newStatus,
    statusColor,
    updatedAt: serverTimestamp(),
    updated_at: serverTimestamp(),
  };

  try {
    const projRef = doc(db, projectsCol, String(projectId));
    await setDoc(projRef, payload, { merge: true });

    try {
      const v3Ref = doc(db, v3ProjectsCol, String(projectId));
      await setDoc(v3Ref, payload, { merge: true });
    } catch (v3Err) {
      // Ignore if v3 doesn't exist
    }

    return true;
  } catch (err) {
    console.error(`[syncProjectStatusInFirestore] Error updating project ${projectId}:`, err);
    return false;
  }
}
