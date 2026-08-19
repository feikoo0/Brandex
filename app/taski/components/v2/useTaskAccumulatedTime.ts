"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { parseTimeToMinutes, parseTimeToHours } from "@/lib/utils";
import type { SessionDoc } from "@/lib/types";
import { GaugeSeverity } from "./EffortGaugeRing";

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
  /** Severidad semafórica: 'low' (<80%), 'mid' (80-99%), 'high' (>=100% o excedido) */
  effortSeverity: GaugeSeverity;
  /** Indica si se sobrepasó el tiempo presupuestado/estimado */
  isExceeded: boolean;
  /** Minutos excedidos (0 si no se ha sobrepasado) */
  overrunMins: number;
  /** Tiempo acumulado formateado (ej. '0h', '1h', '1h 30m', '45m') */
  formattedAccumulatedTime: string;
  /** Tiempo estimado formateado (ej. '3h', '1h', '30m') */
  formattedEstimatedTime: string;
  /** Comparativa de tiempo formateada (ej. '1h / 3h', '0h / 3h', '4h / 3h') */
  formattedComparison: string;
  /** Indica si hay una sesión activa en este momento */
  hasActiveSession: boolean;
}

/** Formatea minutos a representación concisa tipo timecode/monospace (ej. '1h 15m', '3h' o '45m') */
export function formatMinutesConcise(totalMins: number, fallbackUnit: "h" | "m" = "h"): string {
  if (!totalMins || totalMins <= 0) return fallbackUnit === "m" ? "0m" : "0h";
  const h = Math.floor(totalMins / 60);
  const m = Math.round(totalMins % 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

/**
 * Hook para calcular y sincronizar en tiempo real el tiempo acumulado en sesiones para una tarea específica.
 * @param taskId ID de la tarea (puede tener prefijo kt- o ser numérico)
 * @param timeStr String de tiempo estimado (ej. '3 horas', '3h', '30 min', etc.)
 * @param externalSessions Lista opcional de sesiones ya cargadas por el padre para evitar queries redundantes
 * @param embeddedSessions Sesiones locales adjuntas directamente al objeto tarea (t.sessions)
 */
export function useTaskAccumulatedTime(
  taskId: string | number | null | undefined,
  timeStr?: string | null,
  externalSessions?: SessionDoc[] | null,
  embeddedSessions?: Array<{ id?: number | string; date?: string; hours?: number; durationMins?: number }> | null
): TaskAccumulatedTimeResult {
  const [internalSessions, setInternalSessions] = useState<SessionDoc[]>([]);
  const [liveTick, setLiveTick] = useState<number>(0);

  const rawId = String(taskId || "").trim();
  const cleanId = rawId.startsWith("kt-") ? rawId.split("-").slice(2).join("-") : rawId;
  const numId = parseInt(cleanId, 10);

  // Escuchar en tiempo real la colección /sessions de Firestore para esta tarea
  useEffect(() => {
    if (externalSessions !== undefined && externalSessions !== null) {
      return;
    }
    if (!cleanId) {
      setInternalSessions([]);
      return;
    }

    try {
      const idsToMatch: (string | number)[] = Array.from(
        new Set([
          cleanId,
          rawId,
          ...(isNaN(numId) ? [] : [numId]),
          `task-${cleanId}`,
          `kt-${cleanId}`,
        ].filter(Boolean))
      );

      const q = query(
        collection(db, "sessions"),
        where("task_id", "in", idsToMatch.slice(0, 10))
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
  }, [cleanId, rawId, numId, externalSessions]);

  // Selección de lista de sesiones activa
  const activeSessions = externalSessions ?? internalSessions;

  // Cálculo memoizado de minutos acumulados y ratios
  const result = useMemo(() => {
    // 1. Filtrar sesiones de la tarea en Firestore / external
    const matchIds = new Set([
      cleanId,
      rawId,
      String(numId),
      `task-${cleanId}`,
      `kt-${cleanId}`,
    ]);

    const taskSessions = (activeSessions || []).filter((s) => {
      const sTaskId = String(s.task_id || (s as any).taskId || "");
      return matchIds.has(sTaskId) || sTaskId === cleanId || sTaskId === rawId;
    });

    let hasActive = false;
    let fsMins = 0;

    taskSessions.forEach((s) => {
      if (s.status === "en_curso") {
        hasActive = true;
        const startMs = s.startTime?.toMillis
          ? s.startTime.toMillis()
          : new Date(s.startTime).getTime();
        const elapsed = Math.max(1, Math.round((Date.now() - startMs) / 60000));
        fsMins += elapsed;
      } else {
        let mins = 0;
        if (typeof s.durationMins === "number") {
          mins = s.durationMins;
        } else if (typeof (s as any).durationSeconds === "number") {
          mins = Math.round((s as any).durationSeconds / 60);
        } else if (typeof (s as any).hours === "number") {
          mins = Math.round((s as any).hours * 60);
        } else if (s.startTime && s.endTime) {
          const sMs = s.startTime?.toMillis ? s.startTime.toMillis() : new Date(s.startTime).getTime();
          const eMs = s.endTime?.toMillis ? s.endTime.toMillis() : new Date(s.endTime).getTime();
          if (eMs > sMs) mins = Math.round((eMs - sMs) / 60000);
        }
        fsMins += mins;
      }
    });

    // 2. Si no hay sesiones en Firestore pero hay embeddedSessions en el objeto task.sessions
    let embeddedMins = 0;
    if (taskSessions.length === 0 && embeddedSessions && embeddedSessions.length > 0) {
      embeddedMins = embeddedSessions.reduce((acc, es) => {
        const mins = es.durationMins || (es.hours ? Math.round(es.hours * 60) : 0);
        return acc + mins;
      }, 0);
    }

    const accumulatedMins = fsMins + embeddedMins;

    // 3. Estimados fijos de la tarea
    const estimatedMins = parseTimeToMinutes(timeStr);
    const estimatedHours = parseTimeToHours(timeStr);

    // 4. Ratio de consumo (sobre 60 min base si no se especificó tiempo estimado)
    const effectiveEstimatedMins = estimatedMins > 0 ? estimatedMins : 60;
    const consumptionPercent = accumulatedMins / effectiveEstimatedMins;

    // 5. Exceso y severidad semafórica
    const isExceeded = estimatedMins > 0 && accumulatedMins > estimatedMins;
    const overrunMins = isExceeded ? accumulatedMins - estimatedMins : 0;

    let effortSeverity: GaugeSeverity = "low";
    if (isExceeded || consumptionPercent >= 1.0) {
      effortSeverity = "high"; // Rojo / Rosa (#f43f5e) al 100%+ o sobrepasado
    } else if (consumptionPercent >= 0.8) {
      effortSeverity = "mid";  // Ámbar (#eab308) al 80%-99%
    } else {
      effortSeverity = "low";  // Verde (#10b981) o neutro < 80%
    }

    // 6. Textos formateados
    const unitFallback = estimatedMins > 0 && estimatedMins < 60 ? "m" : "h";
    const formattedAccumulatedTime = formatMinutesConcise(accumulatedMins, unitFallback);
    const formattedEstimatedTime = estimatedMins > 0 ? formatMinutesConcise(estimatedMins, unitFallback) : "1h";

    const formattedComparison = `${formattedAccumulatedTime} / ${formattedEstimatedTime}`;

    return {
      accumulatedMins,
      accumulatedHours: accumulatedMins / 60,
      estimatedMins,
      estimatedHours,
      consumptionPercent,
      effortSeverity,
      isExceeded,
      overrunMins,
      formattedAccumulatedTime,
      formattedEstimatedTime,
      formattedComparison,
      hasActiveSession: hasActive,
    };
  }, [activeSessions, embeddedSessions, cleanId, rawId, numId, timeStr, liveTick]);

  // Intervalo en vivo si hay una sesión activa para incrementar los minutos en tiempo real
  useEffect(() => {
    if (!result.hasActiveSession) return;
    const interval = setInterval(() => {
      setLiveTick((t) => t + 1);
    }, 15000); // Ticker cada 15 segundos

    return () => clearInterval(interval);
  }, [result.hasActiveSession]);

  return result;
}

export default useTaskAccumulatedTime;
