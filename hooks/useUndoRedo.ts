"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Taski — useUndoRedo Hook
// ─────────────────────────────────────────────────────────────────────────────

import { useUndoStore, UndoCommand } from "@/lib/undoManager";

export function useUndoRedo() {
  const past = useUndoStore((s) => s.past);
  const future = useUndoStore((s) => s.future);
  const isExecuting = useUndoStore((s) => s.isExecuting);
  const toastNotice = useUndoStore((s) => s.toastNotice);
  const recordAction = useUndoStore((s) => s.recordAction);
  const undo = useUndoStore((s) => s.undo);
  const redo = useUndoStore((s) => s.redo);
  const clearToast = useUndoStore((s) => s.clearToast);
  const clearHistory = useUndoStore((s) => s.clearHistory);

  const canUndo = past.length > 0 && !isExecuting;
  const canRedo = future.length > 0 && !isExecuting;
  const lastAction = past.length > 0 ? past[past.length - 1] : null;
  const nextRedoAction = future.length > 0 ? future[future.length - 1] : null;

  return {
    past,
    future,
    canUndo,
    canRedo,
    isExecuting,
    lastAction,
    nextRedoAction,
    toastNotice,
    recordAction,
    undo,
    redo,
    clearToast,
    clearHistory,
  };
}
