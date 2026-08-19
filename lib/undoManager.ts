"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Taski — Universal Undo / Redo Engine (Command Pattern)
//
//  Gestor atómico para reversión y reaplicación de acciones en Firestore
//  (tareas, sesiones de tiempo, proyectos, clientes, miembros)
// ─────────────────────────────────────────────────────────────────────────────

import { create } from "zustand";

export type UndoEntityType = "task" | "session" | "project" | "client" | "member" | "custom";
export type UndoActionType = "update" | "create" | "delete" | "status_change" | "session_end" | "session_start";

export interface UndoCommand {
  id: string;
  timestamp: number;
  description: string;          // Ej: "Completar tarea: 'Master UI Kit'"
  undoDescription?: string;      // Ej: "Tarea restaurada a 'En Proceso'"
  redoDescription?: string;      // Ej: "Tarea completada nuevamente"
  entityType: UndoEntityType;
  entityId: string;
  actionType: UndoActionType;
  executeUndo: () => Promise<void> | void;
  executeRedo: () => Promise<void> | void;
}

export interface UndoToastNotice {
  id: string;
  message: string;
  subMessage?: string;
  type: "action" | "undo" | "redo";
  actionId?: string;
  timestamp: number;
}

interface UndoStoreState {
  past: UndoCommand[];
  future: UndoCommand[];
  isExecuting: boolean;
  toastNotice: UndoToastNotice | null;

  // Actions
  recordAction: (cmd: Omit<UndoCommand, "id" | "timestamp"> & { id?: string }) => void;
  undo: () => Promise<boolean>;
  redo: () => Promise<boolean>;
  clearToast: () => void;
  clearHistory: () => void;
}

const MAX_HISTORY_LENGTH = 50;

export const useUndoStore = create<UndoStoreState>()((set, get) => ({
  past: [],
  future: [],
  isExecuting: false,
  toastNotice: null,

  recordAction: (cmd) => {
    // Si estamos ejecutando un undo/redo en este instante, no grabamos la mutación inversa como nueva acción
    if (get().isExecuting) return;

    const command: UndoCommand = {
      ...cmd,
      id: cmd.id || `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    };

    set((state) => {
      const newPast = [...state.past, command];
      if (newPast.length > MAX_HISTORY_LENGTH) {
        newPast.shift(); // Elimina la más antigua si supera la cuota de memoria
      }

      return {
        past: newPast,
        future: [], // Toda nueva acción de usuario descarta la pila de futuro (redo)
        toastNotice: {
          id: `toast-${Date.now()}`,
          message: command.description,
          subMessage: "Presiona ⌘Z para deshacer",
          type: "action",
          actionId: command.id,
          timestamp: Date.now(),
        },
      };
    });
  },

  undo: async () => {
    const { past, future, isExecuting } = get();
    if (isExecuting || past.length === 0) return false;

    const commandToUndo = past[past.length - 1];
    const remainingPast = past.slice(0, -1);

    set({ isExecuting: true });

    try {
      await commandToUndo.executeUndo();

      set({
        past: remainingPast,
        future: [...future, commandToUndo],
        isExecuting: false,
        toastNotice: {
          id: `toast-undo-${Date.now()}`,
          message: commandToUndo.undoDescription || `Deshecho: ${commandToUndo.description}`,
          subMessage: "Presiona ⌘⇧Z para rehacer",
          type: "undo",
          actionId: commandToUndo.id,
          timestamp: Date.now(),
        },
      });
      return true;
    } catch (err) {
      console.error("[Taski Undo] Error al deshacer comando:", err);
      set({ isExecuting: false });
      return false;
    }
  },

  redo: async () => {
    const { past, future, isExecuting } = get();
    if (isExecuting || future.length === 0) return false;

    const commandToRedo = future[future.length - 1];
    const remainingFuture = future.slice(0, -1);

    set({ isExecuting: true });

    try {
      await commandToRedo.executeRedo();

      set({
        past: [...past, commandToRedo],
        future: remainingFuture,
        isExecuting: false,
        toastNotice: {
          id: `toast-redo-${Date.now()}`,
          message: commandToRedo.redoDescription || `Rehecho: ${commandToRedo.description}`,
          subMessage: "Presiona ⌘Z para deshacer",
          type: "redo",
          actionId: commandToRedo.id,
          timestamp: Date.now(),
        },
      });
      return true;
    } catch (err) {
      console.error("[Taski Undo] Error al rehacer comando:", err);
      set({ isExecuting: false });
      return false;
    }
  },

  clearToast: () => set({ toastNotice: null }),

  clearHistory: () => set({ past: [], future: [], toastNotice: null }),
}));

/**
 * Acceso directo a funciones del gestor fuera de componentes React
 */
export const recordUndoAction = (cmd: Omit<UndoCommand, "id" | "timestamp"> & { id?: string }) => {
  useUndoStore.getState().recordAction(cmd);
};

export const executeUndo = () => useUndoStore.getState().undo();
export const executeRedo = () => useUndoStore.getState().redo();
