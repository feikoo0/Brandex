import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Project } from "../components/ProjectDashboard";

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
            await setDoc(taskRef, {
              id: String(t.id),
              title: t.title || t.text || "Tarea sin título",
              nombre: t.title || t.text || "Tarea sin título",
              project_id: String(projectId),
              proyecto_id: String(projectId),
              client: cleanData.client || "",
              cliente: cleanData.client || "",
              format: t.format || "Sin formato",
              formato: t.formato || t.format || "Sin formato",
              time: t.time || "Sin tiempo",
              duracion: t.time || "Sin tiempo",
              status: t.status || "Planificado",
              estado: t.status || "Planificado",
              done: t.done || false,
              updatedAt: serverTimestamp(),
              updated_at: serverTimestamp(),
            }, { merge: true });
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
