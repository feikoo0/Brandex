"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { parseTimeToMinutes, parseTimeToHours, extractCleanTaskId, getTaskCandidateIds, getWorkspaceScopedCol } from "@/lib/utils";
import type { SessionDoc } from "@/lib/types";
import { GaugeSeverity } from "./EffortGaugeRing";
import { useAuthStore } from "@/lib/store";
import { useSessions } from "@/hooks/useSessions";

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
  /** Tiempo acumulado formateado (ej. '0h', '1h', '1h 30m', '45m', '0m') */
  formattedAccumulatedTime: string;
  /** Tiempo estimado formateado (ej. '3h', '1h', '30m') */
  formattedEstimatedTime: string;
  /** Comparativa de tiempo formateada (ej. '1h / 3h', '0m / 30m', '45m / 30m') */
  formattedComparison: string;
  /** Indica si hay una sesión activa en este momento para esta tarea */
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
 * @param taskRealId ID puro de la tarea si viene de un objeto Task (task.id)
 * @param projectId ID del proyecto padre para extracción contextual
 */
export function useTaskAccumulatedTime(
  taskId: string | number | null | undefined,
  timeStr?: string | null,
  externalSessions?: SessionDoc[] | null,
  embeddedSessions?: Array<{ id?: number | string; date?: string; hours?: number; durationMins?: number }> | null,
  taskRealId?: string | number | null,
  projectId?: string | number | null
): TaskAccumulatedTimeResult {
  const workspaceId = useAuthStore((s) => s.workspaceId) || "brandex-master";
  const isMaster = workspaceId === "brandex-master" || workspaceId === "ws_159789" || workspaceId === "159789";
  const colName = getWorkspaceScopedCol("sessions", workspaceId, isMaster);

  const { activeSession } = useSessions();
  const [internalSessions, setInternalSessions] = useState<SessionDoc[]>([]);
  const [liveTick, setLiveTick] = useState<number>(0);

  // Lista de candidatos de IDs para matching exacto
  const candidateIds = useMemo(() => {
    return getTaskCandidateIds(taskId, { id: taskRealId }, projectId);
  }, [taskId, taskRealId, projectId]);

  // Escuchar en tiempo real la colección de sesiones de Firestore para esta tarea (fallback si no hay externalSessions)
  useEffect(() => {
    if (externalSessions !== undefined && externalSessions !== null) {
      return;
    }
    if (!candidateIds || candidateIds.length === 0) {
      setInternalSessions([]);
      return;
    }

    try {
      const q = query(
        collection(db, colName),
        where("task_id", "in", candidateIds.slice(0, 10))
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
  }, [candidateIds, colName, externalSessions]);

  // Selección de lista de sesiones activa
  const activeSessions = externalSessions ?? internalSessions;

  // Cálculo memoizado de minutos acumulados y ratios
  const result = useMemo(() => {
    // Usar liveTick para forzar el recálculo periódico del tiempo transcurrido en vivo
    const _now = liveTick ? Date.now() : Date.now();
    const candidateSet = new Set(candidateIds);

    // 1. Filtrar sesiones válidas asociadas a la tarea
    const taskSessions = (activeSessions || []).filter((s) => {
      if (s.isDeleted || s.status === "deleted") return false;
      const sTaskId = String(s.task_id || (s as any).taskId || "");
      if (candidateSet.has(sTaskId)) return true;

      const cleanSTaskId = extractCleanTaskId(sTaskId, projectId || s.project_id || (s as any).projectId);
      if (cleanSTaskId && candidateSet.has(cleanSTaskId)) return true;

      return false;
    });

    let hasActive = false;
    let fsSecs = 0;
    const seenSessionIds = new Set<string>();

    taskSessions.forEach((s) => {
      seenSessionIds.add(s.id);
      if (s.status === "en_curso") {
        hasActive = true;
        const startMs = s.startTime?.toMillis
          ? s.startTime.toMillis()
          : new Date(s.startTime).getTime();
        const elapsedSecs = isNaN(startMs) ? 0 : Math.max(0, Math.round((Date.now() - startMs) / 1000));
        fsSecs += elapsedSecs;
      } else {
        let secs = 0;
        if (typeof (s as any).durationSeconds === "number" && (s as any).durationSeconds >= 0) {
          secs = (s as any).durationSeconds;
        } else if (s.startTime && s.endTime) {
          const sMs = s.startTime?.toMillis ? s.startTime.toMillis() : new Date(s.startTime).getTime();
          const eMs = s.endTime?.toMillis ? s.endTime.toMillis() : new Date(s.endTime).getTime();
          if (!isNaN(sMs) && !isNaN(eMs) && eMs > sMs) {
            secs = Math.round((eMs - sMs) / 1000);
          }
        } else if (typeof s.durationMins === "number" && s.durationMins >= 0) {
          secs = s.durationMins * 60;
        } else if (typeof (s as any).hours === "number" && (s as any).hours >= 0) {
          secs = Math.round((s as any).hours * 3600);
        }
        fsSecs += secs;
      }
    });

    // 2. Si hay una sesión activa global vinculada a esta tarea que no esté aún en el feed
    if (activeSession && !activeSession.isDeleted && activeSession.status !== "deleted") {
      const activeTaskId = String(activeSession.task_id || (activeSession as any).taskId || "");
      const cleanActiveTaskId = extractCleanTaskId(activeTaskId, projectId || activeSession.project_id || (activeSession as any).projectId);

      if (candidateSet.has(activeTaskId) || (cleanActiveTaskId && candidateSet.has(cleanActiveTaskId))) {
        if (!seenSessionIds.has(activeSession.id)) {
          hasActive = true;
          const startMs = activeSession.startTime?.toMillis
            ? activeSession.startTime.toMillis()
            : new Date(activeSession.startTime).getTime();
          const elapsedSecs = isNaN(startMs) ? 0 : Math.max(0, Math.round((Date.now() - startMs) / 1000));
          fsSecs += elapsedSecs;
        }
      }
    }

    // 3. Si no hay sesiones en Firestore pero hay embeddedSessions en el objeto task.sessions
    let embeddedSecs = 0;
    if (taskSessions.length === 0 && embeddedSessions && embeddedSessions.length > 0) {
      embeddedSecs = embeddedSessions.reduce((acc, es) => {
        const secs = (es.durationMins ? es.durationMins * 60 : 0) || (es.hours ? Math.round(es.hours * 3600) : 0);
        return acc + secs;
      }, 0);
    }

    const totalSeconds = fsSecs + embeddedSecs;
    const accumulatedMins = Math.round(totalSeconds / 60);
    const accumulatedHours = totalSeconds / 3600;

    // 4. Estimados fijos de la tarea
    const estimatedMins = parseTimeToMinutes(timeStr);
    const estimatedHours = parseTimeToHours(timeStr);

    // 5. Ratio de consumo (sobre 60 min base si no se especificó tiempo estimado)
    const effectiveEstimatedMins = estimatedMins > 0 ? estimatedMins : 60;
    const consumptionPercent = accumulatedMins / effectiveEstimatedMins;

    // 6. Exceso y severidad semafórica
    const isExceeded = estimatedMins > 0 && accumulatedMins > estimatedMins;
    const overrunMins = isExceeded ? accumulatedMins - estimatedMins : 0;

    let effortSeverity: GaugeSeverity = "low";
    if (isExceeded || consumptionPercent >= 1.0) {
      effortSeverity = "high"; // Rojo / Rosa al 100%+ o sobrepasado
    } else if (consumptionPercent >= 0.8) {
      effortSeverity = "mid";  // Ámbar al 80%-99%
    } else {
      effortSeverity = "low";  // Verde o neutro < 80%
    }

    // 7. Textos formateados
    const unitFallback = estimatedMins > 0 && estimatedMins < 60 ? "m" : "h";
    const formattedAccumulatedTime = formatMinutesConcise(accumulatedMins, unitFallback);
    const formattedEstimatedTime = estimatedMins > 0 ? formatMinutesConcise(estimatedMins, unitFallback) : (unitFallback === "m" ? "30m" : "1h");

    const formattedComparison = `${formattedAccumulatedTime} / ${formattedEstimatedTime}`;

    return {
      accumulatedMins,
      accumulatedHours,
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
  }, [candidateIds, activeSessions, activeSession, embeddedSessions, timeStr, projectId, liveTick]);

  // Intervalo en vivo si hay una sesión activa para incrementar los minutos en tiempo real
  useEffect(() => {
    if (!result.hasActiveSession) return;
    const interval = setInterval(() => {
      setLiveTick((t) => t + 1);
    }, 10000); // Ticker cada 10 segundos

    return () => clearInterval(interval);
  }, [result.hasActiveSession]);

  return result;
}

export default useTaskAccumulatedTime;
