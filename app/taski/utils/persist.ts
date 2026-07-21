import { doc, updateDoc } from "firebase/firestore";
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
    const docRef = doc(db, "v3_projects", String(projectId));
    await updateDoc(docRef, partialData as any);
    
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
