import { doc, setDoc, updateDoc } from "firebase/firestore";
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
    const docRef = doc(db, "v3_projects", String(projectId));
    await setDoc(docRef, cleanData, { merge: true });

    try {
      const nativeRef = doc(db, "projects", String(projectId));
      const nativeData: Record<string, any> = {};
      if (cleanData.title) { nativeData.nombre = cleanData.title; nativeData.title = cleanData.title; }
      if (cleanData.client) { nativeData.cliente = cleanData.client; nativeData.client = cleanData.client; }
      if (cleanData.package) { nativeData.package = cleanData.package; nativeData.tipo_proyecto = cleanData.package; }
      if (cleanData.desc) { nativeData.desc = cleanData.desc; }
      if (cleanData.status) { nativeData.status = cleanData.status; nativeData.estado = cleanData.status; }
      if (cleanData.cost) { nativeData.cost = cleanData.cost; nativeData.precio = cleanData.cost; }

      if (Object.keys(nativeData).length > 0) {
        await setDoc(nativeRef, nativeData, { merge: true });
      }

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
              done: t.done || false
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
