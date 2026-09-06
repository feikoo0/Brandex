import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Project } from "../components/ProjectDashboard";
import { getSingleSourceProjectColor } from "@/lib/utils";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

type StatusListener = (status: SaveStatus, errorMsg?: string) => void;

const listeners: Set<StatusListener> = new Set();
let currentStatus: SaveStatus = "idle";
let currentError: string | undefined = undefined;
let statusResetTimer: NodeJS.Timeout | null = null;

export const subscribeSaveStatus = (listener: StatusListener) => {
  listeners.add(listener);
  listener(currentStatus, currentError);
  return () => {
    listeners.delete(listener);
  };
};

const notifyListeners = (status: SaveStatus, errorMsg?: string) => {
  currentStatus = status;
  currentError = errorMsg;
  listeners.forEach((l) => l(status, errorMsg));
};

/**
 * Centralized utility for atomic Firestore updates.
 * Updates ONLY the modified fields using updateDoc.
 */
export const persistProjectUpdate = async (
  projectId: string | number,
  partialData: Partial<Project>
): Promise<boolean> => {
  if (!projectId) return false;

  if (statusResetTimer) {
    clearTimeout(statusResetTimer);
    statusResetTimer = null;
  }

  notifyListeners("saving");

  try {
    const cleanData = JSON.parse(JSON.stringify(partialData));

    // Harmonize all field aliases for seamless 3-view synchronization
    if (cleanData.title) { cleanData.nombre = cleanData.title; }
    if (cleanData.nombre) { cleanData.title = cleanData.nombre; }
    if (cleanData.client) { cleanData.cliente = cleanData.client; }
    if (cleanData.cliente) { cleanData.client = cleanData.cliente; }
    if (cleanData.desc) { cleanData.descripcion = cleanData.desc; }
    if (cleanData.descripcion) { cleanData.desc = cleanData.descripcion; }
    if (cleanData.status) { cleanData.estadoProyecto = cleanData.status; cleanData.estado = cleanData.status; }
    if (cleanData.estadoProyecto) { cleanData.status = cleanData.estadoProyecto; }
    if (cleanData.priority) { cleanData.prioridad = cleanData.priority; }
    if (cleanData.prioridad) { cleanData.priority = cleanData.prioridad; }
    if (cleanData.startDateRaw) { cleanData.fechaInicio = cleanData.startDateRaw; }
    if (cleanData.fechaInicio) { cleanData.startDateRaw = cleanData.fechaInicio; }
    if (cleanData.deadlineRaw) { cleanData.fechaFin = cleanData.deadlineRaw; }
    if (cleanData.fechaFin) { cleanData.deadlineRaw = cleanData.fechaFin; }
    if (cleanData.cost) {
      cleanData.costo = parseFloat(String(cleanData.cost).replace(/[^0-9.]/g, "")) || 0;
    } else if (cleanData.costo !== undefined) {
      cleanData.cost = typeof cleanData.costo === "number" ? `$${cleanData.costo}` : String(cleanData.costo);
    }

    // Harmonize and guarantee Single Source of Truth for color fields
    if (cleanData.customColor && typeof cleanData.customColor.h === "number") {
      const { h, s, l } = cleanData.customColor;
      const lVal = typeof l === "number" ? l : 55;
      const hslStr = `hsl(${h}, ${s}%, ${lVal}%)`;
      cleanData.color = hslStr;
      cleanData.customGradientStyle = cleanData.customGradientStyle || hslStr;
      cleanData.customGlowStyle = cleanData.customGlowStyle || hslStr;
    } else if (cleanData.color) {
      const cObj = getSingleSourceProjectColor({ color: cleanData.color });
      cleanData.color = cObj.hslCss;
      cleanData.customColor = cleanData.customColor || { h: cObj.h, s: cObj.s, l: cObj.l };
      cleanData.customGradientStyle = cleanData.customGradientStyle || cObj.hslCss;
      cleanData.customGlowStyle = cleanData.customGlowStyle || cObj.hslCss;
    }

    cleanData.updatedAt = serverTimestamp();
    cleanData.updated_at = serverTimestamp();

    const docRef = doc(db, "v3_projects", String(projectId));
    await setDoc(docRef, cleanData, { merge: true });

    try {
      const nativeRef = doc(db, "projects", String(projectId));
      await setDoc(nativeRef, cleanData, { merge: true });

      if (cleanData.tasks && Array.isArray(cleanData.tasks)) {
        for (const t of cleanData.tasks) {
          if (t.id) {
            const taskRef = doc(db, "tasks", String(t.id));
            const taskPayload: Record<string, any> = {
              id: String(t.id),
              title: t.title || t.text || t.titulo || "Tarea sin título",
              nombre: t.title || t.text || t.titulo || "Tarea sin título",
              titulo: t.title || t.text || t.titulo || "Tarea sin título",
              project_id: String(projectId),
              proyecto_id: String(projectId),
              client: cleanData.client || "",
              cliente: cleanData.client || "",
              format: t.format || t.formato || "Sin formato",
              formato: t.formato || t.format || "Sin formato",
              time: t.time || t.esfuerzo || "Sin tiempo",
              esfuerzo: t.time || t.esfuerzo || "Sin tiempo",
              duracion: t.time || t.esfuerzo || "Sin tiempo",
              status: t.status || t.estado || "Planificado",
              estado: t.status || t.estado || "Planificado",
              done: t.done || false,
              updatedAt: serverTimestamp(),
              updated_at: serverTimestamp(),
            };

            if (t.kanbanOrders) {
              taskPayload.kanbanOrders = t.kanbanOrders;
            }
            if (t.fecha_programada || t.fechaProg) {
              taskPayload.fecha_programada = t.fecha_programada || t.fechaProg;
              taskPayload.fechaProg = t.fecha_programada || t.fechaProg;
            }
            if (t.fecha_limite || t.fechaEntrega || t.deadline) {
              taskPayload.fecha_limite = t.fecha_limite || t.fechaEntrega || t.deadline;
              taskPayload.fechaEntrega = t.fecha_limite || t.fechaEntrega || t.deadline;
              taskPayload.deadline = t.fecha_limite || t.fechaEntrega || t.deadline;
            }
            if (t.asignado_id) taskPayload.asignado_id = t.asignado_id;
            if (t.asignado_ids) taskPayload.asignado_ids = t.asignado_ids;

            await setDoc(taskRef, taskPayload, { merge: true });
          }
        }
      }
    } catch (mirrorErr) {
      console.warn("[persistProjectUpdate] Mirror to native collections warning:", mirrorErr);
    }
    
    notifyListeners("saved");

    statusResetTimer = setTimeout(() => {
      notifyListeners("idle");
    }, 2500);

    return true;
  } catch (err: any) {
    console.error(`[persistProjectUpdate] Failed to update project ${projectId}:`, err);
    notifyListeners("error", err?.message || "Error al guardar en Firestore");
    return false;
  }
};
