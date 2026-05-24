"use client";

import { Loader2, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface SaveIndicatorProps {
  status: SaveStatus;
  className?: string;
  compact?: boolean;
}

export function SaveIndicator({ status, className, compact = false }: SaveIndicatorProps) {
  if (status === "idle") return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.15 }}
        className={cn("flex items-center gap-1.5", className)}
      >
        {status === "saving" && (
          <>
            <Loader2 className={cn("animate-spin text-blue-400", compact ? "w-3 h-3" : "w-3.5 h-3.5")} />
            {!compact && <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">Guardando</span>}
          </>
        )}
        {status === "saved" && (
          <>
            <Check className={cn("text-green-400", compact ? "w-3 h-3" : "w-3.5 h-3.5")} />
            {!compact && <span className="text-[9px] font-black uppercase tracking-widest text-green-400">Guardado</span>}
          </>
        )}
        {status === "error" && (
          <>
            <AlertCircle className={cn("text-red-400", compact ? "w-3 h-3" : "w-3.5 h-3.5")} />
            {!compact && <span className="text-[9px] font-black uppercase tracking-widest text-red-400">Error</span>}
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
