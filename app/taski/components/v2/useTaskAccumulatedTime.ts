"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { parseTimeToHours } from "@/lib/utils";
import type { SessionDoc } from "@/lib/types";
import { EFFORT_THRESHOLDS, GaugeSeverity } from "./EffortGaugeRing";

export interface TaskAccumulatedTimeResult {
  /** Minutos totales acumulados en sesiones */
  accumulatedMins: number;
  /** Horas totales acumuladas en sesiones */
  accumulatedHours: number;
  /** Minutos estimados fijos de la tarea */
  estimatedMins: number;
  /** Horas estimadas fijas de la tarea */
  estimatedHours: number;
  /** Ratio de consumo (acumulado / estimado) entre 0 y 1+ */
  consumptionPercent: number;
  /** Severidad semafórica según umbrales de esfuerzo */
  effortSeverity: GaugeSeverity;
  /** Tiempo acumulado formateado (ej. '25m', '1h 30m') */
  formattedAccumulatedTime: string;
  /** Tiempo estimado formateado (ej. '1h', '45m') */
  formattedEstimatedTime: string;
  /** Comparativa tiempo formateada (ej. '25m / 1h') */
  formattedComparison: string;
  /** Indica si hay una sesión activa en este momento */
  hasActiveSession: boolean;
}

/** Formatea minutos a representación concisa tipo timecode/monospace (ej. '1h 15m' o '45m') */
export function formatMinutesConcise(totalMins: number): string {
  if (!totalMins || totalMins <= 0) return "0m";
  const h = Math.floor(totalMins / 60);
  const m = Math.round(totalMins % 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

/**
 * Hook para calcular y sincronizar en tiempo real el tiempo acumulado en sesiones para una tarea específica.
 * @param taskId ID de la tarea (puede tener prefijo kt- o ser numérico)
 * @param timeStr String de tiempo estimado (ej. '1h', '30 min', etc.)
 * @param externalSessions Lista opcional de sesiones ya cargadas por el padre para evitar queries redundantes
 */
export function useTaskAccumulatedTime(
  taskId: string | number | null | undefined,
  timeStr?: string | null,
  externalSessions?: SessionDoc[] | null
): TaskAccumulatedTimeResult {
  const [internalSessions, setInternalSessions] = useState<SessionDoc[]>([]);

  const rawId = String(taskId || "");
  const cleanId = rawId.startsWith("kt-") ? rawId.split("-").slice(2).join("-") : rawId;

  // Si no se pasaron externalSessions, escuchamos en tiempo real la colección /sessions de Firestore
  useEffect(() => {
    if (externalSessions !== undefined && externalSessions !== null) {
      return;
    }
    if (!cleanId) {
      setInternalSessions([]);
      return;
    }

    try {
      const idsToMatch = Array.from(new Set([cleanId, rawId].filter(Boolean)));
      const q = query(
        collection(db, "sessions"),
        where("task_id", "in", idsToMatch)
      );

      const unsubscribe = onSnapshot(
        q,
        (snap) => {
          const list: SessionDoc[] = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          } as SessionDoc));
          setInternalSessions(list);
        },
        (err) => {
          console.warn("useTaskAccumulatedTime: Error en snapshot de sesiones:", err);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn("useTaskAccumulatedTime: Fallback query error:", err);
    }
  }, [cleanId, rawId, externalSessions]);

  // Selección de lista de sesiones activa
  const activeSessions = externalSessions ?? internalSessions;

  // Cálculo memoizado de minutos acumulados y ratios
  return useMemo(() => {
    // 1. Filtrar sesiones de la tarea
    const taskSessions = (activeSessions || []).filter((s) => {
      const sTaskId = String(s.task_id || (s as any).taskId || "");
      return sTaskId === cleanId || sTaskId === rawId;
    });

    let hasActive = false;
    const accumulatedMins = taskSessions.reduce((sum, s) => {
      if (s.status === "en_curso") {
        hasActive = true;
        const startMs = s.startTime?.toMillis
          ? s.startTime.toMillis()
          : new Date(s.startTime).getTime();
        const elapsed = Math.max(1, Math.round((Date.now() - startMs) / 60000));
        return sum + elapsed;
      }
      const mins =
        s.durationMins ||
        (s as any).durationSeconds
          ? Math.round((s as any).durationSeconds / 60)
          : (s as any).hours
          ? Math.round((s as any).hours * 60)
          : 0;
      return sum + (mins || 0);
    }, 0);

    // 2. Estimados fijos
    const estimatedHours = parseTimeToHours(timeStr);
    const estimatedMins = Math.round(estimatedHours * 60);

    // 3. Ratio de consumo
    const effectiveEstimatedMins = estimatedMins > 0 ? estimatedMins : 60; // 1h base si no está definido
    const consumptionPercent = accumulatedMins / effectiveEstimatedMins;

    // 4. Severidad de semáforo
    let effortSeverity: GaugeSeverity = "low";
    if (consumptionPercent >= EFFORT_THRESHOLDS.mid) {
      effortSeverity = "high";
    } else if (consumptionPercent >= EFFORT_THRESHOLDS.low) {
      effortSeverity = "mid";
    }

    // 5. Textos formateados
    const formattedAccumulatedTime = formatMinutesConcise(accumulatedMins);
    const formattedEstimatedTime = estimatedMins > 0 ? formatMinutesConcise(estimatedMins) : "1h";

    const formattedComparison =
      accumulatedMins > 0
        ? `${formattedAccumulatedTime} / ${formattedEstimatedTime}`
        : `${formattedEstimatedTime} est.`;

    return {
      accumulatedMins,
      accumulatedHours: accumulatedMins / 60,
      estimatedMins,
      estimatedHours,
      consumptionPercent,
      effortSeverity,
      formattedAccumulatedTime,
      formattedEstimatedTime,
      formattedComparison,
      hasActiveSession: hasActive,
    };
  }, [activeSessions, cleanId, rawId, timeStr]);
}

export default useTaskAccumulatedTime;
