"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Taski — Undo / Redo Toast HUD Component
//  Diseño alineado al Protocolo Oficial: Layer 2B (#181818), border-white/10,
//  rounded-2xl, tipografía text-[#ffffffd6], sombras suaves y feedback táctil.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Undo2, Redo2, Check, AlertCircle, X, Sparkles } from "lucide-react";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { cn } from "@/lib/utils";

const TOAST_DURATION_MS = 4500;

export function UndoToastHUD() {
  const { toastNotice, canUndo, canRedo, undo, redo, clearToast, isExecuting } = useUndoRedo();
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isMac = typeof window !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const undoKey = isMac ? "⌘Z" : "Ctrl+Z";
  const redoKey = isMac ? "⌘⇧Z" : "Ctrl+Y";

  useEffect(() => {
    if (!toastNotice) {
      setProgress(100);
      return;
    }

    setProgress(100);

    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    const startTime = Date.now();
    const endTime = startTime + TOAST_DURATION_MS;

    progressIntervalRef.current = setInterval(() => {
      if (isHovered) return;
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      const pct = (remaining / TOAST_DURATION_MS) * 100;
      setProgress(pct);
      if (pct <= 0) {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      }
    }, 50);

    timerRef.current = setTimeout(() => {
      if (!isHovered) {
        clearToast();
      }
    }, TOAST_DURATION_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [toastNotice, isHovered, clearToast]);

  if (!toastNotice) return null;

  const isUndoToast = toastNotice.type === "undo";
  const isRedoToast = toastNotice.type === "redo";
  const isActionToast = toastNotice.type === "action";

  return (
    <AnimatePresence>
      {toastNotice && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1001] pointer-events-auto">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="relative flex flex-col overflow-hidden rounded-2xl bg-[#181818] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.65)] backdrop-blur-xl min-w-[320px] max-w-[460px]"
          >
            {/* Contenido principal */}
            <div className="flex items-center gap-3.5 px-4 py-3">
              {/* Icono temático */}
              <div
                className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border",
                  isUndoToast
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : isRedoToast
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                )}
              >
                {isUndoToast ? (
                  <Undo2 className="w-4 h-4" />
                ) : isRedoToast ? (
                  <Redo2 className="w-4 h-4" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
              </div>

              {/* Mensaje descriptivo */}
              <div className="flex-1 min-w-0 pr-1">
                <p className="text-xs font-bold text-[#ffffffd6] truncate leading-tight">
                  {toastNotice.message}
                </p>
                <p className="text-[10px] font-medium text-[#ffffff6b] truncate mt-0.5">
                  {toastNotice.subMessage || (isUndoToast ? `Rehacer con ${redoKey}` : `Deshacer con ${undoKey}`)}
                </p>
              </div>

              {/* Botón de acción interactiva */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {isActionToast && canUndo && (
                  <button
                    onClick={async () => {
                      await undo();
                    }}
                    disabled={isExecuting}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 border border-white/10 text-xs font-black text-[#ffffffd6] transition-all"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>Deshacer</span>
                    <span className="ml-0.5 text-[9px] px-1 py-0.2 rounded bg-white/10 text-white/60 font-mono">
                      {undoKey}
                    </span>
                  </button>
                )}

                {isUndoToast && canRedo && (
                  <button
                    onClick={async () => {
                      await redo();
                    }}
                    disabled={isExecuting}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 active:scale-95 border border-blue-500/30 text-xs font-black text-blue-300 transition-all"
                  >
                    <Redo2 className="w-3.5 h-3.5" />
                    <span>Rehacer</span>
                    <span className="ml-0.5 text-[9px] px-1 py-0.2 rounded bg-blue-500/20 text-blue-200 font-mono">
                      {redoKey}
                    </span>
                  </button>
                )}

                {isRedoToast && canUndo && (
                  <button
                    onClick={async () => {
                      await undo();
                    }}
                    disabled={isExecuting}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 border border-white/10 text-xs font-black text-[#ffffffd6] transition-all"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>Deshacer</span>
                    <span className="ml-0.5 text-[9px] px-1 py-0.2 rounded bg-white/10 text-white/60 font-mono">
                      {undoKey}
                    </span>
                  </button>
                )}

                {/* Botón cerrar */}
                <button
                  onClick={clearToast}
                  className="p-1 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors"
                  aria-label="Cerrar notificación"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Barra de progreso de auto-cierre */}
            <div className="h-[2px] w-full bg-white/5">
              <motion.div
                className={cn(
                  "h-full transition-all ease-linear",
                  isUndoToast
                    ? "bg-amber-400/50"
                    : isRedoToast
                    ? "bg-blue-400/50"
                    : "bg-emerald-400/50"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
