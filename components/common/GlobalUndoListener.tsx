"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Taski — Global Undo / Redo Keyboard Shortcut Listener
//  Escucha atajos universales: Cmd+Z, Cmd+Shift+Z, Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y
//  con aislamiento inteligente para no interferir en inputs de texto nativos.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from "react";
import { useUndoStore } from "@/lib/undoManager";

export function GlobalUndoListener() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (!isCmdOrCtrl) return;

      const key = e.key.toLowerCase();
      const isShift = e.shiftKey;

      // Detectar si el usuario está activamente editando texto dentro de un input o textarea
      const target = e.target as HTMLElement | null;
      const isTextInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      // Si está en un input de texto y presiona Cmd+Z / Cmd+Shift+Z, permitimos el undo nativo del navegador sobre el texto
      if (isTextInput) {
        return;
      }

      // 1. Deshacer: Cmd+Z / Ctrl+Z (sin Shift)
      if (key === "z" && !isShift) {
        e.preventDefault();
        e.stopPropagation();
        useUndoStore.getState().undo();
        return;
      }

      // 2. Rehacer: Cmd+Shift+Z / Ctrl+Shift+Z o Cmd+Y / Ctrl+Y
      if ((key === "z" && isShift) || (key === "y" && !isShift)) {
        e.preventDefault();
        e.stopPropagation();
        useUndoStore.getState().redo();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, []);

  return null;
}
