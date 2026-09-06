"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { subscribeSaveStatus, SaveStatus } from "../utils/persist";

export const SaveStatusBadge: React.FC<{ isNightMode?: boolean }> = ({ isNightMode = true }) => {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | undefined>();

  useEffect(() => {
    return subscribeSaveStatus((s, err) => {
      setStatus(s);
      setErrorMsg(err);
    });
  }, []);

  // Modo Silencioso: Durante guardado normal ('idle', 'saving', 'saved') se mantiene invisible
  // para evitar ruido visual constante. Solo se muestra si ocurre un error real.
  if (status !== "error") return null;

  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all duration-300 shadow-sm animate-pulse ${
        isNightMode
          ? "bg-rose-500/15 border border-rose-500/30 text-rose-300"
          : "bg-rose-50 border border-rose-200 text-rose-700"
      }`}
    >
      <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
      <span title={errorMsg || "Error al sincronizar con Firestore"}>
        Error al guardar
      </span>
    </div>
  );
};
