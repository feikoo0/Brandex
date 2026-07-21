"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Check, AlertCircle } from "lucide-react";
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

  if (status === "idle") return null;

  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all duration-300 shadow-sm ${
        status === "saving"
          ? isNightMode
            ? "bg-amber-500/10 border border-amber-500/20 text-amber-300"
            : "bg-amber-50 border border-amber-200 text-amber-700"
          : status === "saved"
          ? isNightMode
            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
            : "bg-emerald-50 border border-emerald-200 text-emerald-700"
          : isNightMode
          ? "bg-rose-500/15 border border-rose-500/30 text-rose-300"
          : "bg-rose-50 border border-rose-200 text-rose-700"
      }`}
    >
      {status === "saving" && (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
          <span>Guardando...</span>
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
          <span>Guardado ✓</span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="w-3 h-3 text-rose-400" />
          <span title={errorMsg}>Error al guardar</span>
        </>
      )}
    </div>
  );
};
