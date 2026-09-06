"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Brandex OS / Taski — useTaskScheduling & useTaskStatusTracking Hooks
//  Vía única y unificada de escritura para fechas planeadas y fechas reales
// ─────────────────────────────────────────────────────────────────────────────

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/lib/store";
import { getWorkspaceScopedCol, cleanFirestorePayload } from "@/lib/utils";
import { getFirestoreQueryKey, QUERY_KEY_PREFIX } from "@/hooks/useData";
import { recordUndoAction } from "@/lib/undoManager";
import { autoEvaluateProjectStatus } from "@/app/taski/utils/data";
import { persistProjectUpdate } from "@/app/taski/utils/persist";
import type { BraindexData, Task, Project } from "@/lib/types";

export interface UpdateTaskScheduleArgs {
  taskId: string | number;
  projectId?: string | number;
  fecha_programada: string;
  fecha_limite: string;
  previousSchedule?: {
    fecha_programada?: string;
    fecha_limite?: string;
  };
}

/**
 * Hook maestro de scheduling de tareas:
 * Fuente de verdad unificada para Timeline y Kanban (agrupado por fecha).
 */
export function useTaskScheduling() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      projectId,
      fecha_programada,
      fecha_limite,
      previousSchedule,
    }: UpdateTaskScheduleArgs) => {
      const { workspaceId } = useAuthStore.getState();
      const isMaster =
        workspaceId === "brandex-master" ||
        workspaceId === "ws_159789" ||
        workspaceId === "159789";

      const taskIdStr = String(taskId).replace(/^kt-[^-]+-/, "");
      const tasksCol = getWorkspaceScopedCol("tasks", workspaceId, isMaster);
      const queryKey = getFirestoreQueryKey(workspaceId);
      const currentCache = qc.getQueryData<BraindexData>(queryKey);

      const prevTask = currentCache?.tareas?.find((t) => String(t.id) === taskIdStr);

      const prevProg =
        previousSchedule?.fecha_programada ||
        prevTask?.fecha_programada ||
        prevTask?.fechaProg ||
        "";
      const prevLimit =
        previousSchedule?.fecha_limite ||
        prevTask?.fecha_limite ||
        prevTask?.fechaEntrega ||
        prevTask?.deadline ||
        "";

      // 1. Payload normalizado para Firestore
      const taskUpdatePayload = cleanFirestorePayload({
        fecha_programada,
        fechaProg: fecha_programada,
        fecha_limite,
        fechaEntrega: fecha_limite,
        deadline: fecha_limite,
        updatedAt: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      // 2. Persistencia en /tasks
      const taskDocRef = doc(db, tasksCol, taskIdStr);
      await updateDoc(taskDocRef, taskUpdatePayload);

      // 3. Actualización optimista en caché de TanStack Query
      if (currentCache) {
        const updatedTareas = (currentCache.tareas || []).map((t) => {
          if (String(t.id) !== taskIdStr) return t;
          return {
            ...t,
            fecha_programada,
            fechaProg: fecha_programada,
            fecha_limite,
            fechaEntrega: fecha_limite,
            deadline: fecha_limite,
          } as Task;
        });

        const targetProjId =
          projectId ||
          prevTask?.proyecto_id ||
          (prevTask?.proyecto_ids && prevTask.proyecto_ids[0]);

        const updatedProyectos = (currentCache.proyectos || []).map((p) => {
          if (String(p.id) !== String(targetProjId)) return p;
          const currentProjTasks = (Array.isArray(p.tasks) ? p.tasks : []).map((t) => {
            if (String(t.id) !== taskIdStr) return t;
            return {
              ...t,
              fecha_programada,
              fechaProg: fecha_programada,
              fecha_limite,
              fechaEntrega: fecha_limite,
              deadline: fecha_limite,
            } as Task;
          });

          return {
            ...p,
            tasks: currentProjTasks,
          } as Project;
        });

        qc.setQueryData(queryKey, {
          ...currentCache,
          tareas: updatedTareas,
          proyectos: updatedProyectos,
        });
      }

      // 4. Registro en el gestor de Undo/Redo
      const taskTitle = prevTask?.titulo || "Tarea";
      recordUndoAction({
        entityType: "task",
        entityId: taskIdStr,
        actionType: "update",
        description: `Mover cronograma de "${taskTitle}" (${fecha_programada} – ${fecha_limite})`,
        undoDescription: `Fechas de "${taskTitle}" restauradas a (${prevProg} – ${prevLimit})`,
        redoDescription: `Fechas de "${taskTitle}" actualizadas a (${fecha_programada} – ${fecha_limite})`,
        executeUndo: async () => {
          const ref = doc(db, tasksCol, taskIdStr);
          await updateDoc(ref, {
            fecha_programada: prevProg,
            fechaProg: prevProg,
            fecha_limite: prevLimit,
            fechaEntrega: prevLimit,
            deadline: prevLimit,
            updatedAt: serverTimestamp(),
            updated_at: serverTimestamp(),
          });
          qc.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] });
        },
        executeRedo: async () => {
          const ref = doc(db, tasksCol, taskIdStr);
          await updateDoc(ref, {
            fecha_programada,
            fechaProg: fecha_programada,
            fecha_limite,
            fechaEntrega: fecha_limite,
            deadline: fecha_limite,
            updatedAt: serverTimestamp(),
            updated_at: serverTimestamp(),
          });
          qc.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] });
        },
      });

      return { ok: true, taskId: taskIdStr, fecha_programada, fecha_limite };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] });
    },
  });
}

/**
 * Hook para tracking de estados y fechas reales (§6.3 RFC):
 * Registra fecha_inicio_real al arrancar y fecha_completado_real al terminar.
 */
export function useTaskStatusTracking() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      newStatus,
      projectId,
    }: {
      taskId: string | number;
      newStatus: string;
      projectId?: string | number;
    }) => {
      const { workspaceId } = useAuthStore.getState();
      const isMaster =
        workspaceId === "brandex-master" ||
        workspaceId === "ws_159789" ||
        workspaceId === "159789";

      const taskIdStr = String(taskId).replace(/^kt-[^-]+-/, "");
      const tasksCol = getWorkspaceScopedCol("tasks", workspaceId, isMaster);
      const queryKey = getFirestoreQueryKey(workspaceId);
      const currentCache = qc.getQueryData<BraindexData>(queryKey);

      const prevTask = currentCache?.tareas?.find((t) => String(t.id) === taskIdStr);

      const nowIso = new Date().toISOString();
      const isCompleted = newStatus === "Completado" || newStatus === "Hecho";
      const isInProgress = newStatus === "En curso" || newStatus === "En Proceso" || newStatus === "En progreso";

      const patch: any = {
        estado: newStatus,
        status: newStatus,
        updatedAt: serverTimestamp(),
        updated_at: serverTimestamp(),
      };

      // Si pasa a En Progreso por primera vez y no tiene fecha_inicio_real
      if (isInProgress && !prevTask?.fecha_inicio_real) {
        patch.fecha_inicio_real = nowIso;
      }

      // Si se completa
      if (isCompleted) {
        patch.fecha_completado_real = nowIso;
        patch.fecha_hora_completado = nowIso;
      } else {
        // Si se reabre, se limpia o se mantiene según caso
        patch.fecha_completado_real = null;
        patch.fecha_hora_completado = null;
      }

      const taskDocRef = doc(db, tasksCol, taskIdStr);
      await updateDoc(taskDocRef, cleanFirestorePayload(patch));

      return { ok: true, taskId: taskIdStr, newStatus };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] });
    },
  });
}
