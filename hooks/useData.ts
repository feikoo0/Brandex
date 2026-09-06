"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Taski — Data Hooks (Pure Firebase Firestore + TanStack Query)
//
//  useData()  → queries Firestore collections: clients, projects, tasks, members
//  useSync()  → invalidates cache and triggers background re-read
// ─────────────────────────────────────────────────────────────────────────────

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { INITIAL_CLIENTS } from "./useClients";
import { INITIAL_MEMBERS } from "./useMembers";
import { persistProjectUpdate } from "@/app/taski/utils/persist";
import { recordUndoAction } from "@/lib/undoManager";
import type {
  BraindexData,
  Task,
  Project,
  Client,
  Worker,
} from "@/lib/types";

import { useAuthStore } from "@/lib/store";
import { getWorkspaceScopedCol, isTaskActive, isProjectActive, cleanFirestorePayload } from "@/lib/utils";
import { evaluateProjectStatusFromTasks, syncProjectStatusInFirestore } from "@/lib/projectStateEngine";

export const QUERY_KEY_PREFIX = "taski-firestore-data";
export const getFirestoreQueryKey = (workspaceId?: string | null) => [QUERY_KEY_PREFIX, workspaceId || "none"];

export function normalizeTaskStatus(rawStatus?: string): string {
  if (!rawStatus) return "Planificado";
  const s = rawStatus.trim().toLowerCase();
  if (s === "completado" || s === "completada" || s === "hecho" || s === "publicado" || s === "aprobado") return "Completado";
  if (s === "en proceso" || s === "en_curso" || s === "en desarrollo") return "En Proceso";
  if (s === "en revisión" || s === "en revision" || s === "revisión" || s === "revision" || s === "modificar") return "En Revisión";
  return "Planificado";
}

export function normalizeTaskPriority(rawPriority?: string): string {
  if (!rawPriority) return "Media";
  const p = rawPriority.trim().toLowerCase();
  if (p.includes("urgente")) return "Urgente";
  if (p === "alta") return "Alta";
  if (p === "baja" || p === "sin prioridad" || p === "no priority") return "Baja";
  return "Media";
}

// ── Full data directly from pure Firestore collections ─────────────────────────
export function useData() {
  const workspaceId = useAuthStore((s) => s.workspaceId);
  const isMaster = workspaceId === "brandex-master" || workspaceId === "ws_159789" || workspaceId === "159789";

  return useQuery<BraindexData>({
    queryKey: getFirestoreQueryKey(workspaceId),
    queryFn: async () => {
      if (!workspaceId) {
        return {
          clientes: [],
          proyectos: [],
          tareas: [],
          miembros: [],
          recursos: [],
        };
      }

      // 0. Si es un workspace aislado (no master), leer solo sus colecciones particionadas
      if (!isMaster) {
        try {
          const clientsCol = getWorkspaceScopedCol("clients", workspaceId, isMaster);
          const membersCol = getWorkspaceScopedCol("members", workspaceId, isMaster);
          const projCol = getWorkspaceScopedCol("projects", workspaceId, isMaster);
          const tasksCol = getWorkspaceScopedCol("tasks", workspaceId, isMaster);

          const [clientsSnap, membersSnap, projSnap, tasksSnap] = await Promise.all([
            getDocs(collection(db, clientsCol)).catch(() => ({ empty: true, docs: [] as any[] })),
            getDocs(collection(db, membersCol)).catch(() => ({ empty: true, docs: [] as any[] })),
            getDocs(collection(db, projCol)).catch(() => ({ empty: true, docs: [] as any[] })),
            getDocs(collection(db, tasksCol)).catch(() => ({ empty: true, docs: [] as any[] })),
          ]);

          const clientsList: Client[] = clientsSnap.empty
            ? []
            : clientsSnap.docs.map((d: any) => ({ ...d.data(), id: d.id } as Client));
          const workersList: any[] = membersSnap.empty
            ? []
            : membersSnap.docs.map((d: any) => ({ ...d.data(), id: d.id }));
          const projectsList: Project[] = projSnap.empty
            ? []
            : projSnap.docs.map((d: any) => {
                const data = d.data();
                return {
                  id: d.id,
                  nombre: data.nombre || data.name || data.title || "Proyecto",
                  cliente_ids: data.cliente_ids || (data.cliente_id ? [String(data.cliente_id)] : (data.client ? [String(data.client)] : [])),
                  asignado_ids: data.asignado_ids || [],
                  asignado: data.asignado || "",
                  estadoProyecto: data.estadoProyecto || data.estado || data.status || "Planificación",
                  estado: data.estado || data.estadoProyecto || data.status || "Planificación",
                  area: data.area || "",
                  formato: data.formato || "",
                  prioridad: data.prioridad || "Media",
                  ciclo: data.ciclo || "",
                  esfuerzo: data.esfuerzo || "Medio",
                  plataformas: data.plataformas || [],
                  fechaInicio: data.fechaInicio || data.startDate || "",
                  fechaFin: data.fechaFin || data.deadline || "",
                  recursosDrive: data.recursosDrive || "",
                  costo: data.costo !== undefined ? Number(data.costo) : (Number(String(data.cost || 0).replace(/[^0-9]/g, "")) || 0),
                  tarea_ids: data.tarea_ids || [],
                  descripcion: data.descripcion || data.desc || "",
                  url: data.url || "",
                  createdAt: data.createdAt || data.created_at || null,
                  updatedAt: data.updatedAt || data.updated_at || null,
                  created_at: data.created_at || data.createdAt || null,
                  updated_at: data.updated_at || data.updatedAt || null,
                  ...data,
                } as Project;
              });
          const tasksList: Task[] = tasksSnap.empty
            ? []
            : tasksSnap.docs.map((d: any) => {
                const data = d.data();
                const normStatus = normalizeTaskStatus(data.estado || data.status);
                const normPrio = normalizeTaskPriority(data.prioridad || data.priority);
                return {
                  id: d.id,
                  titulo: data.titulo || data.title || "Tarea",
                  estado: normStatus,
                  status: normStatus,
                  area: data.area || "",
                  asignado: data.asignado || "",
                  formato: data.formato || data.format || "",
                  esfuerzo: data.esfuerzo || data.time || "1h",
                  prioridad: normPrio,
                  priority: normPrio,
                  plataformas: data.plataformas || [],
                  contenido: data.contenido || "",
                  copy: data.copy || "",
                  adminNotes: data.adminNotes || "",
                  notasCliente: data.notasCliente || "",
                  fechaProg: data.fechaProg || "",
                  fechaEntrega: data.fechaEntrega || data.deadline || "",
                  asignado_ids: data.asignado_ids || [],
                  proyecto_ids: data.proyecto_ids || (data.proyecto_id ? [String(data.proyecto_id)] : (data.project_id ? [String(data.project_id)] : [])),
                  cliente_ids: data.cliente_ids || (data.cliente_id ? [String(data.cliente_id)] : (data.client ? [String(data.client)] : [])),
                  created: data.created || new Date().toISOString(),
                  url: data.url || "",
                  createdAt: data.createdAt || data.created_at || null,
                  updatedAt: data.updatedAt || data.updated_at || null,
                  created_at: data.created_at || data.createdAt || null,
                  updated_at: data.updated_at || data.updatedAt || null,
                  ...data,
                } as Task;
              });

          return {
            clientes: clientsList,
            proyectos: projectsList,
            tareas: tasksList,
            miembros: workersList,
            recursos: [],
          };
        } catch (e) {
          console.error("Error reading isolated workspace data:", e);
          return {
            clientes: [],
            proyectos: [],
            tareas: [],
            miembros: [],
            recursos: [],
          };
        }
      }

      // 1. Clientes (colección 'clients' con fallback de 'v3_clients')
      let clientsList: Client[] = [];
      try {
        const clientsSnap = await getDocs(collection(db, "clients"));
        if (!clientsSnap.empty) {
          clientsList = clientsSnap.docs.map((d) => ({ ...d.data(), id: d.id } as Client));
        } else {
          const v3Snap = await getDocs(collection(db, "v3_clients"));
          if (!v3Snap.empty) {
            clientsList = v3Snap.docs.map((d) => ({ ...d.data(), id: d.id } as Client));
          } else {
            clientsList = INITIAL_CLIENTS;
          }
        }
      } catch (e) {
        console.error("Error reading clients from Firestore:", e);
        clientsList = INITIAL_CLIENTS;
      }

      // 2. Miembros / Trabajadores (colección 'members' con fallback de 'v3_members')
      let workersList: any[] = [];
      try {
        const membersSnap = await getDocs(collection(db, "members"));
        if (!membersSnap.empty) {
          workersList = membersSnap.docs.map((d) => ({ ...d.data(), id: d.id }));
        } else {
          const v3MemSnap = await getDocs(collection(db, "v3_members"));
          if (!v3MemSnap.empty) {
            workersList = v3MemSnap.docs.map((d) => ({ ...d.data(), id: d.id }));
          } else {
            workersList = INITIAL_MEMBERS;
          }
        }
      } catch (e) {
        console.error("Error reading members from Firestore:", e);
        workersList = INITIAL_MEMBERS;
      }

      // 3. Proyectos (colección 'projects' con fallback / merge de 'v3_projects')
      let projectsList: Project[] = [];
      try {
        const projSnap = await getDocs(collection(db, "projects")).catch(() => ({ empty: true, docs: [] as any[] }));
        const v3ProjSnap = await getDocs(collection(db, "v3_projects")).catch(() => ({ empty: true, docs: [] as any[] }));
        
        const projMap = new Map<string, any>();
        if (!v3ProjSnap.empty) {
          v3ProjSnap.docs.forEach((d) => projMap.set(d.id, { ...d.data(), id: d.id }));
        }
        if (!projSnap.empty) {
          projSnap.docs.forEach((d) => projMap.set(d.id, { ...d.data(), id: d.id }));
        }

        projectsList = Array.from(projMap.values()).map((data: any) => ({
          id: data.id,
          nombre: data.nombre || data.name || data.title || "Proyecto",
          cliente_ids: data.cliente_ids || (data.cliente_id ? [String(data.cliente_id)] : []),
          asignado_ids: data.asignado_ids || [],
          asignado: data.asignado || "",
          estadoProyecto: data.estadoProyecto || data.estado || "Planificación",
          estado: data.estado || data.estadoProyecto || "Planificación",
          area: data.area || "",
          formato: data.formato || "",
          prioridad: data.prioridad || "Media",
          ciclo: data.ciclo || "",
          esfuerzo: data.esfuerzo || "Medio",
          plataformas: data.plataformas || [],
          fechaInicio: data.fechaInicio || data.startDate || "",
          fechaFin: data.fechaFin || data.deadline || "",
          recursosDrive: data.recursosDrive || "",
          costo: data.costo !== undefined ? Number(data.costo) : 0,
          tarea_ids: data.tarea_ids || [],
          descripcion: data.descripcion || data.desc || "",
          url: data.url || "",
          tasks: data.tasks || [],
          createdAt: data.createdAt || data.created_at || null,
          updatedAt: data.updatedAt || data.updated_at || null,
          created_at: data.created_at || data.createdAt || null,
          updated_at: data.updated_at || data.updatedAt || null,
          ...data,
        } as Project));
      } catch (e) {
        console.error("Error reading projects from Firestore:", e);
      }

      // 4. Tareas (colección 'tasks' + extracción de tareas embebidas)
      let tasksList: Task[] = [];
      try {
        const tasksSnap = await getDocs(collection(db, "tasks")).catch(() => ({ empty: true, docs: [] as any[] }));
        if (!tasksSnap.empty) {
          tasksList = tasksSnap.docs.map((d) => {
            const data = d.data();
            const normStatus = normalizeTaskStatus(data.estado || data.status);
            const normPrio = normalizeTaskPriority(data.prioridad || data.priority);
            return {
              id: d.id,
              titulo: data.titulo || data.title || "Tarea",
              estado: normStatus,
              status: normStatus,
              area: data.area || "",
              asignado: data.asignado || "",
              formato: data.formato || data.format || "",
              esfuerzo: data.esfuerzo || data.time || "1h",
              prioridad: normPrio,
              priority: normPrio,
              plataformas: data.plataformas || [],
              contenido: data.contenido || data.desc || "",
              copy: data.copy || "",
              adminNotes: data.adminNotes || "",
              notasCliente: data.notasCliente || "",
              fechaProg: data.fechaProg || data.fecha_programada || "",
              fechaEntrega: data.fechaEntrega || data.fecha_limite || data.deadline || "",
              asignado_id: data.asignado_id,
              asignado_ids: data.asignado_ids || (data.asignado_id ? [data.asignado_id] : []),
              proyecto_ids: data.proyecto_ids || (data.proyecto_id ? [String(data.proyecto_id)] : (data.project_id ? [String(data.project_id)] : [])),
              proyecto_id: data.proyecto_id || data.project_id || (data.proyecto_ids?.[0]) || undefined,
              cliente_ids: data.cliente_ids || (data.cliente_id ? [String(data.cliente_id)] : (data.client ? [String(data.client)] : [])),
              cliente_id: data.cliente_id || data.client || (data.cliente_ids?.[0]) || undefined,
              created: data.created || new Date().toISOString(),
              url: data.url || "",
              subtasks: data.subtasks || [],
              createdAt: data.createdAt || data.created_at || null,
              updatedAt: data.updatedAt || data.updated_at || null,
              created_at: data.created_at || data.createdAt || null,
              updated_at: data.updated_at || data.updatedAt || null,
              ...data,
            } as Task;
          });
        }

        // Incorporar tareas embebidas en los proyectos si no existen en tasksList
        const existingTaskIds = new Set(tasksList.map((t) => String(t.id)));
        projectsList.forEach((p: any) => {
          if (Array.isArray(p.tasks)) {
            p.tasks.forEach((t: any) => {
              if (t && t.id && !existingTaskIds.has(String(t.id))) {
                existingTaskIds.add(String(t.id));
                tasksList.push({
                  id: String(t.id),
                  titulo: t.title || t.titulo || "Tarea",
                  estado: t.status || t.estado || "Planificado",
                  status: t.status || t.estado || "Planificado",
                  formato: t.formato || t.format || "Post",
                  esfuerzo: t.time || t.esfuerzo || "30 min",
                  prioridad: t.priority || t.prioridad || "Media",
                  proyecto_ids: [String(p.id)],
                  proyecto_id: String(p.id),
                  cliente_ids: p.cliente_ids || [],
                  fechaProg: t.fecha_programada || t.fechaProg || "",
                  fechaEntrega: t.fecha_limite || t.deadline || t.fechaEntrega || "",
                  subtasks: t.subtasks || [],
                  ...t,
                } as Task);
              }
            });
          }
        });
      } catch (e) {
        console.error("Error reading tasks from Firestore:", e);
      }

      // ── ROLLUPS DERIVADOS EN VIVO (EN MEMORIA) ──
      const enrichedMiembros = workersList.map((m) => {
        const memberActiveTasks = tasksList.filter((t) => {
          const isAssignee = t.asignado_id
            ? String(t.asignado_id) === String(m.id)
            : (Array.isArray(t.asignado_ids) && t.asignado_ids.length > 0
                ? String(t.asignado_ids[0]) === String(m.id)
                : false);
          return isAssignee && isTaskActive(t.estado);
        });

        let totalEsfuerzoMins = 0;
        let tareasSinEstimar = 0;

        memberActiveTasks.forEach((t) => {
          if (typeof t.esfuerzoMinutos === "number" && !isNaN(t.esfuerzoMinutos) && t.esfuerzoMinutos > 0) {
            totalEsfuerzoMins += t.esfuerzoMinutos;
          } else {
            tareasSinEstimar++;
          }
        });

        const carga_horas_actual = Math.round((totalEsfuerzoMins / 60) * 10) / 10;
        const capacidad_semanal = m.capacidad_semanal || 40;
        const workloadPercent = Math.round((carga_horas_actual / capacidad_semanal) * 100);

        let semaforo: any = "disponible";
        if (workloadPercent > 100) {
          semaforo = "sobrecargado";
        } else if (workloadPercent >= 80) {
          semaforo = "al_limite";
        }

        return {
          ...m,
          capacidad_semanal,
          carga_horas_actual,
          workloadPercent,
          semaforo,
          tareasSinEstimar,
        };
      });

      const enrichedClientes = clientsList.map((c) => {
        const activeProjects = projectsList.filter((p) => {
          const clientIds = p.cliente_ids || ((p as any).cliente_id ? [String((p as any).cliente_id)] : []);
          return clientIds.map(String).includes(String(c.id)) && isProjectActive(p.estadoProyecto || p.estado);
        });

        const ltv_calculado = (c.finanzas?.historial_pagos || [])
          .filter((p) => (p.estado || "").toLowerCase() === "pagado")
          .reduce((sum, p) => sum + (Number(p.monto) || 0), 0);

        return {
          ...c,
          proyectos_activos: activeProjects,
          proyectos_activos_count: activeProjects.length,
          ltv_calculado,
        };
      });

      return {
        clientes:     enrichedClientes,
        proyectos:    projectsList,
        tareas:       tasksList,
        miembros:     enrichedMiembros,
        recursos:     [],
      };
    },
    staleTime:    2 * 1000,        // 2s freshness
    gcTime:       5 * 60 * 1000,   // 5 min cache
    refetchOnWindowFocus: true,
    refetchInterval: 3000,         // Auto-sync every 3s
  });
}

// ── Manual sync trigger ────────────────────────────────────────────────────────
export function useSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await qc.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] });
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] });
    },
  });
}

// ── Task Project Status Sync Helper ──────────────────────────────────────────
function getTaskProjectId(task: any): string | null {
  if (!task) return null;
  if (Array.isArray(task.proyecto_ids) && task.proyecto_ids.length > 0 && task.proyecto_ids[0]) {
    return String(task.proyecto_ids[0]);
  }
  if (task.proyecto_id) return String(task.proyecto_id);
  if (task.project_id) return String(task.project_id);
  return null;
}

async function checkAndSyncProjectStatus({
  projectId,
  tasks,
  projects,
  workspaceId,
  isMaster,
}: {
  projectId?: string | null;
  tasks?: Task[];
  projects?: Project[];
  workspaceId?: string | null;
  isMaster: boolean;
}) {
  if (!projectId || !tasks) return;
  const projectTasks = tasks.filter((t) => getTaskProjectId(t) === String(projectId));
  const project = projects?.find((p) => String(p.id) === String(projectId));
  const currentStatus = project?.estadoProyecto || project?.estado || "Planificación";

  const { newStatus, hasChanged } = evaluateProjectStatusFromTasks(currentStatus, projectTasks);
  if (hasChanged) {
    await syncProjectStatusInFirestore({
      projectId: String(projectId),
      newStatus,
      workspaceId,
      isMaster,
    });
  }
}

// ── Task mutations ─────────────────────────────────────────────────────────────
export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Task> & { titulo: string }) => {
      const { workspaceId } = useAuthStore.getState();
      const isMaster = workspaceId === "brandex-master" || workspaceId === "ws_159789" || workspaceId === "159789";
      const tasksCol = getWorkspaceScopedCol("tasks", workspaceId, isMaster);

      const queryKey = getFirestoreQueryKey(workspaceId);
      const currentCache = qc.getQueryData<BraindexData>(queryKey);

      const newId = "task-" + Date.now();
      const rawTaskDoc = {
        ...data,
        id: newId,
        titulo: data.titulo.trim(),
        estado: data.estado || "Planificado",
        status: data.estado || "Planificado",
        prioridad: data.prioridad || "Media",
        proyecto_ids: data.proyecto_ids || ((data as any).proyecto_id ? [String((data as any).proyecto_id)] : ((data as any).project_id ? [String((data as any).project_id)] : [])),
        proyecto_id: (data as any).proyecto_id || (data as any).project_id || (data.proyecto_ids?.[0]) || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };
      const taskDoc = cleanFirestorePayload(rawTaskDoc);
      await setDoc(doc(db, tasksCol, newId), taskDoc);

      // Reevaluar estado del proyecto si la tarea fue vinculada a uno
      const projId = getTaskProjectId(taskDoc);
      if (projId && currentCache) {
        const updatedTasks = [...(currentCache.tareas || []), taskDoc as any];
        await checkAndSyncProjectStatus({
          projectId: projId,
          tasks: updatedTasks,
          projects: currentCache.proyectos,
          workspaceId,
          isMaster,
        });
      }

      // Actualización optimista inmediata en caché local
      if (currentCache) {
        const optimisticTask = taskDoc as unknown as Task;
        const updatedTasksList = [...(currentCache.tareas || []), optimisticTask];

        const targetProjId = getTaskProjectId(taskDoc);
        const updatedProjectsList = (currentCache.proyectos || []).map((p) => {
          if (String(p.id) === String(targetProjId)) {
            const currentProjTasks = Array.isArray(p.tasks) ? p.tasks : [];
            const newTasksForProj = [...currentProjTasks, optimisticTask];
            const evalResult = evaluateProjectStatusFromTasks(p.estadoProyecto || p.estado || "Planificación", newTasksForProj);
            return {
              ...p,
              tasks: newTasksForProj,
              estadoProyecto: evalResult.newStatus,
              estado: evalResult.newStatus,
            };
          }
          return p;
        });

        qc.setQueryData(queryKey, {
          ...currentCache,
          tareas: updatedTasksList,
          proyectos: updatedProjectsList,
        });
      }

      recordUndoAction({
        entityType: "task",
        entityId: newId,
        actionType: "create",
        description: `Crear tarea: "${taskDoc.titulo}"`,
        undoDescription: `Tarea "${taskDoc.titulo}" eliminada`,
        redoDescription: `Tarea "${taskDoc.titulo}" recreada`,
        executeUndo: async () => {
          await deleteDoc(doc(db, tasksCol, newId));
          qc.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] });
        },
        executeRedo: async () => {
          await setDoc(doc(db, tasksCol, newId), taskDoc);
          qc.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] });
        },
      });

      return taskDoc;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] });
      if (result?.id) {
        window.dispatchEvent(new CustomEvent("item-created", { detail: { type: "task", id: result.id } }));
      }
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Task> & { id: string }) => {
      const { workspaceId } = useAuthStore.getState();
      const isMaster = workspaceId === "brandex-master" || workspaceId === "ws_159789" || workspaceId === "159789";
      const tasksCol = getWorkspaceScopedCol("tasks", workspaceId, isMaster);

      // Snapshot previo desde caché
      const queryKey = getFirestoreQueryKey(workspaceId);
      const currentCache = qc.getQueryData<BraindexData>(queryKey);
      const prevTask = currentCache?.tareas?.find((t) => String(t.id) === String(data.id));

      const { id: taskId, ...restData } = data;
      const cleanUpdateData = cleanFirestorePayload({
        ...restData,
        updatedAt: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      const taskRef = doc(db, tasksCol, String(taskId));
      await updateDoc(taskRef, cleanUpdateData);

      // Reevaluar y sincronizar automáticamente el estado del proyecto padre
      const targetProjId = getTaskProjectId(data) || getTaskProjectId(prevTask);
      if (targetProjId && currentCache) {
        const updatedTasks = (currentCache.tareas || []).map((t) =>
          String(t.id) === String(data.id) ? { ...t, ...data } : t
        );
        if (!updatedTasks.some((t) => String(t.id) === String(data.id))) {
          updatedTasks.push({ ...(prevTask || {}), ...data } as any);
        }
        await checkAndSyncProjectStatus({
          projectId: targetProjId,
          tasks: updatedTasks,
          projects: currentCache.proyectos,
          workspaceId,
          isMaster,
        });
      }

      // Actualización optimista inmediata en caché local
      if (currentCache) {
        const updatedTasksList = (currentCache.tareas || []).map((t) =>
          String(t.id) === String(data.id) ? ({ ...t, ...data } as Task) : t
        );
        const updatedProjectsList = (currentCache.proyectos || []).map((p) => {
          if (String(p.id) === String(targetProjId)) {
            const currentProjTasks = (Array.isArray(p.tasks) ? p.tasks : []).map((t) =>
              String(t.id) === String(data.id) ? ({ ...t, ...data } as Task) : t
            );
            const evalResult = evaluateProjectStatusFromTasks(p.estadoProyecto || p.estado || "Planificación", currentProjTasks);
            return {
              ...p,
              tasks: currentProjTasks,
              estadoProyecto: evalResult.newStatus,
              estado: evalResult.newStatus,
            };
          }
          return p;
        });

        qc.setQueryData(queryKey, {
          ...currentCache,
          tareas: updatedTasksList,
          proyectos: updatedProjectsList,
        });
      }

      if (prevTask) {
        const isStatusChange = data.estado && data.estado !== prevTask.estado;
        const taskTitle = prevTask.titulo || "Tarea";
        const desc = isStatusChange
          ? (data.estado === "Completado" || data.estado === "Hecho"
              ? `Completar tarea: "${taskTitle}"`
              : `Cambiar estado de "${taskTitle}" a ${data.estado}`)
          : `Modificar tarea: "${taskTitle}"`;

        const undoDesc = isStatusChange
          ? `Tarea "${taskTitle}" restaurada a "${prevTask.estado}"`
          : `Tarea "${taskTitle}" restaurada`;

        const prevSnapshot: any = {};
        for (const key of Object.keys(data)) {
          if (key === "id") continue;
          prevSnapshot[key] = (prevTask as any)[key] !== undefined ? (prevTask as any)[key] : null;
        }

        recordUndoAction({
          entityType: "task",
          entityId: String(data.id),
          actionType: isStatusChange ? "status_change" : "update",
          description: desc,
          undoDescription: undoDesc,
          redoDescription: desc,
          executeUndo: async () => {
            const ref = doc(db, tasksCol, String(data.id));
            await updateDoc(ref, {
              ...prevSnapshot,
              updatedAt: serverTimestamp(),
              updated_at: serverTimestamp(),
            });
            qc.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] });
          },
          executeRedo: async () => {
            const ref = doc(db, tasksCol, String(data.id));
            await updateDoc(ref, {
              ...data,
              updatedAt: serverTimestamp(),
              updated_at: serverTimestamp(),
            });
            qc.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] });
          },
        });
      }

      return { ok: true, id: data.id };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const { workspaceId } = useAuthStore.getState();
      const isMaster = workspaceId === "brandex-master" || workspaceId === "ws_159789" || workspaceId === "159789";
      const tasksCol = getWorkspaceScopedCol("tasks", workspaceId, isMaster);

      const queryKey = getFirestoreQueryKey(workspaceId);
      const currentCache = qc.getQueryData<BraindexData>(queryKey);
      const prevTask = currentCache?.tareas?.find((t) => String(t.id) === String(taskId));

      await deleteDoc(doc(db, tasksCol, String(taskId)));

      // Reevaluar y sincronizar el estado del proyecto con las tareas restantes
      const targetProjId = getTaskProjectId(prevTask);
      if (targetProjId && currentCache) {
        const remainingTasks = (currentCache.tareas || []).filter(
          (t) => String(t.id) !== String(taskId)
        );
        await checkAndSyncProjectStatus({
          projectId: targetProjId,
          tasks: remainingTasks,
          projects: currentCache.proyectos,
          workspaceId,
          isMaster,
        });
      }

      // Actualización optimista inmediata en caché local
      if (currentCache) {
        const remainingTasksList = (currentCache.tareas || []).filter((t) => String(t.id) !== String(taskId));
        const updatedProjectsList = (currentCache.proyectos || []).map((p) => {
          if (String(p.id) === String(targetProjId)) {
            const remainingProjTasks = (Array.isArray(p.tasks) ? p.tasks : []).filter((t) => String(t.id) !== String(taskId));
            const evalResult = evaluateProjectStatusFromTasks(p.estadoProyecto || p.estado || "Planificación", remainingProjTasks);
            return {
              ...p,
              tasks: remainingProjTasks,
              estadoProyecto: evalResult.newStatus,
              estado: evalResult.newStatus,
            };
          }
          return p;
        });

        qc.setQueryData(queryKey, {
          ...currentCache,
          tareas: remainingTasksList,
          proyectos: updatedProjectsList,
        });
      }

      if (prevTask) {
        const taskTitle = prevTask.titulo || "Tarea";
        recordUndoAction({
          entityType: "task",
          entityId: String(taskId),
          actionType: "delete",
          description: `Eliminar tarea: "${taskTitle}"`,
          undoDescription: `Tarea "${taskTitle}" restaurada`,
          redoDescription: `Tarea "${taskTitle}" eliminada`,
          executeUndo: async () => {
            await setDoc(doc(db, tasksCol, String(taskId)), {
              ...prevTask,
              updatedAt: serverTimestamp(),
              updated_at: serverTimestamp(),
            });
            qc.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] });
          },
          executeRedo: async () => {
            await deleteDoc(doc(db, tasksCol, String(taskId)));
            qc.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] });
          },
        });
      }

      return { ok: true, id: taskId };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] }),
  });
}

// ── Project mutations ──────────────────────────────────────────────────────────
export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Project> & { nombre: string }) => {
      const { workspaceId } = useAuthStore.getState();
      const isMaster = workspaceId === "brandex-master" || workspaceId === "ws_159789" || workspaceId === "159789";
      const projectsCol = getWorkspaceScopedCol("projects", workspaceId, isMaster);

      const newId = "proj-" + Date.now();
      const rawProjectDoc = {
        ...data,
        id: newId,
        nombre: data.nombre.trim(),
        estadoProyecto: data.estadoProyecto || "Planificación",
        prioridad: data.prioridad || "Media",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };
      const projectDoc = cleanFirestorePayload(rawProjectDoc);
      await setDoc(doc(db, projectsCol, newId), projectDoc);

      recordUndoAction({
        entityType: "project",
        entityId: newId,
        actionType: "create",
        description: `Crear proyecto: "${projectDoc.nombre}"`,
        undoDescription: `Proyecto "${projectDoc.nombre}" eliminado`,
        redoDescription: `Proyecto "${projectDoc.nombre}" recreado`,
        executeUndo: async () => {
          await deleteDoc(doc(db, projectsCol, newId));
          qc.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] });
        },
        executeRedo: async () => {
          await setDoc(doc(db, projectsCol, newId), projectDoc);
          qc.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] });
        },
      });

      return projectDoc;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] });
      if (result?.id) {
        window.dispatchEvent(new CustomEvent("item-created", { detail: { type: "project", id: result.id } }));
      }
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Project> & { id: string }) => {
      const { workspaceId } = useAuthStore.getState();
      const queryKey = getFirestoreQueryKey(workspaceId);
      const currentCache = qc.getQueryData<BraindexData>(queryKey);
      const prevProject = currentCache?.proyectos?.find((p) => String(p.id) === String(data.id));

      await persistProjectUpdate(data.id, data as any);

      if (prevProject) {
        const projName = prevProject.nombre || "Proyecto";
        const isStatusChange = (data.estadoProyecto && data.estadoProyecto !== prevProject.estadoProyecto) || 
                               (data.estado && data.estado !== prevProject.estado);
        const desc = isStatusChange 
          ? `Cambiar estado de "${projName}" a ${data.estadoProyecto || data.estado}` 
          : `Modificar proyecto: "${projName}"`;

        const prevSnapshot: any = {};
        for (const key of Object.keys(data)) {
          if (key === "id") continue;
          prevSnapshot[key] = (prevProject as any)[key] !== undefined ? (prevProject as any)[key] : null;
        }

        recordUndoAction({
          entityType: "project",
          entityId: String(data.id),
          actionType: isStatusChange ? "status_change" : "update",
          description: desc,
          undoDescription: `Proyecto "${projName}" restaurado`,
          redoDescription: desc,
          executeUndo: async () => {
            await persistProjectUpdate(data.id, prevSnapshot as any);
            qc.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] });
          },
          executeRedo: async () => {
            await persistProjectUpdate(data.id, data as any);
            qc.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] });
          },
        });
      }

      return { ok: true, id: data.id };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string) => {
      const { workspaceId } = useAuthStore.getState();
      const isMaster = workspaceId === "brandex-master" || workspaceId === "ws_159789" || workspaceId === "159789";
      const projectsCol = getWorkspaceScopedCol("projects", workspaceId, isMaster);
      const v3Col = getWorkspaceScopedCol("v3_projects", workspaceId, isMaster);

      const queryKey = getFirestoreQueryKey(workspaceId);
      const currentCache = qc.getQueryData<BraindexData>(queryKey);
      const prevProject = currentCache?.proyectos?.find((p) => String(p.id) === String(projectId));

      await deleteDoc(doc(db, projectsCol, String(projectId)));
      await deleteDoc(doc(db, v3Col, String(projectId))).catch(() => {});

      if (prevProject) {
        const projName = prevProject.nombre || "Proyecto";
        recordUndoAction({
          entityType: "project",
          entityId: String(projectId),
          actionType: "delete",
          description: `Eliminar proyecto: "${projName}"`,
          undoDescription: `Proyecto "${projName}" restaurado`,
          redoDescription: `Proyecto "${projName}" eliminado`,
          executeUndo: async () => {
            await setDoc(doc(db, projectsCol, String(projectId)), {
              ...prevProject,
              updatedAt: serverTimestamp(),
              updated_at: serverTimestamp(),
            });
            await setDoc(doc(db, v3Col, String(projectId)), {
              ...prevProject,
              updatedAt: serverTimestamp(),
              updated_at: serverTimestamp(),
            }).catch(() => {});
            qc.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] });
          },
          executeRedo: async () => {
            await deleteDoc(doc(db, projectsCol, String(projectId)));
            await deleteDoc(doc(db, v3Col, String(projectId))).catch(() => {});
            qc.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] });
          },
        });
      }

      return { ok: true, id: projectId };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] }),
  });
}

// ── Client mutations ───────────────────────────────────────────────────────────
export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Client> & { nombre: string }) => {
      const { workspaceId } = useAuthStore.getState();
      const isMaster = workspaceId === "brandex-master" || workspaceId === "ws_159789" || workspaceId === "159789";
      const clientsCol = getWorkspaceScopedCol("clients", workspaceId, isMaster);

      const newId = "cli-" + Date.now();
      const rawClientDoc = {
        ...data,
        id: newId,
        nombre: data.nombre.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };
      const clientDoc = cleanFirestorePayload(rawClientDoc);
      await setDoc(doc(db, clientsCol, newId), clientDoc);

      recordUndoAction({
        entityType: "client",
        entityId: newId,
        actionType: "create",
        description: `Crear cliente: "${clientDoc.nombre}"`,
        undoDescription: `Cliente "${clientDoc.nombre}" eliminado`,
        redoDescription: `Cliente "${clientDoc.nombre}" recreado`,
        executeUndo: async () => {
          await deleteDoc(doc(db, clientsCol, newId));
          qc.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] });
        },
        executeRedo: async () => {
          await setDoc(doc(db, clientsCol, newId), clientDoc);
          qc.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] });
        },
      });

      return clientDoc;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] }),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Client> & { id: string }) => {
      const { workspaceId } = useAuthStore.getState();
      const isMaster = workspaceId === "brandex-master" || workspaceId === "ws_159789" || workspaceId === "159789";
      const clientsCol = getWorkspaceScopedCol("clients", workspaceId, isMaster);

      const queryKey = getFirestoreQueryKey(workspaceId);
      const currentCache = qc.getQueryData<BraindexData>(queryKey);
      const prevClient = currentCache?.clientes?.find((c) => String(c.id) === String(data.id));

      const { id: clientId, ...restData } = data;
      const cleanUpdateData = cleanFirestorePayload({
        ...restData,
        updatedAt: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      const clientRef = doc(db, clientsCol, String(clientId));
      await updateDoc(clientRef, cleanUpdateData);

      if (prevClient) {
        const clientName = prevClient.nombre || "Cliente";
        const prevSnapshot: any = {};
        for (const key of Object.keys(data)) {
          if (key === "id") continue;
          prevSnapshot[key] = (prevClient as any)[key] !== undefined ? (prevClient as any)[key] : null;
        }

        recordUndoAction({
          entityType: "client",
          entityId: String(data.id),
          actionType: "update",
          description: `Modificar cliente: "${clientName}"`,
          undoDescription: `Cliente "${clientName}" restaurado`,
          redoDescription: `Cliente "${clientName}" modificado`,
          executeUndo: async () => {
            const ref = doc(db, clientsCol, String(data.id));
            await updateDoc(ref, cleanFirestorePayload({
              ...prevSnapshot,
              updatedAt: serverTimestamp(),
              updated_at: serverTimestamp(),
            }));
            qc.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] });
          },
          executeRedo: async () => {
            const ref = doc(db, clientsCol, String(data.id));
            await updateDoc(ref, cleanFirestorePayload({
              ...restData,
              updatedAt: serverTimestamp(),
              updated_at: serverTimestamp(),
            }));
            qc.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] });
          },
        });
      }

      return { ok: true, id: data.id };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] }),
  });
}

// ── Worker mutations ───────────────────────────────────────────────────────────
export function useUpdateWorker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Worker> & { id: string }) => {
      const { workspaceId } = useAuthStore.getState();
      const isMaster = workspaceId === "brandex-master" || workspaceId === "ws_159789" || workspaceId === "159789";
      const membersCol = getWorkspaceScopedCol("members", workspaceId, isMaster);

      const queryKey = getFirestoreQueryKey(workspaceId);
      const currentCache = qc.getQueryData<BraindexData>(queryKey);
      const prevWorker = currentCache?.miembros?.find((w) => String(w.id) === String(data.id));

      const { id: workerId, ...restData } = data;
      const cleanUpdateData = cleanFirestorePayload({
        ...restData,
        updatedAt: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      const memberRef = doc(db, membersCol, String(workerId));
      await updateDoc(memberRef, cleanUpdateData);

      if (prevWorker) {
        const workerName = prevWorker.nombre || "Miembro";
        const prevSnapshot: any = {};
        for (const key of Object.keys(data)) {
          if (key === "id") continue;
          prevSnapshot[key] = (prevWorker as any)[key] !== undefined ? (prevWorker as any)[key] : null;
        }

        recordUndoAction({
          entityType: "member",
          entityId: String(data.id),
          actionType: "update",
          description: `Modificar miembro: "${workerName}"`,
          undoDescription: `Miembro "${workerName}" restaurado`,
          redoDescription: `Miembro "${workerName}" modificado`,
          executeUndo: async () => {
            const ref = doc(db, membersCol, String(data.id));
            await updateDoc(ref, cleanFirestorePayload({
              ...prevSnapshot,
              updatedAt: serverTimestamp(),
              updated_at: serverTimestamp(),
            }));
            qc.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] });
          },
          executeRedo: async () => {
            const ref = doc(db, membersCol, String(data.id));
            await updateDoc(ref, cleanFirestorePayload({
              ...restData,
              updatedAt: serverTimestamp(),
              updated_at: serverTimestamp(),
            }));
            qc.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] });
          },
        });
      }

      if (prevWorker) {
        const workerName = prevWorker.nombre || "Miembro";
        const prevSnapshot: any = {};
        for (const key of Object.keys(data)) {
          if (key === "id") continue;
          prevSnapshot[key] = (prevWorker as any)[key] !== undefined ? (prevWorker as any)[key] : null;
        }

        recordUndoAction({
          entityType: "member",
          entityId: String(data.id),
          actionType: "update",
          description: `Modificar miembro: "${workerName}"`,
          undoDescription: `Miembro "${workerName}" restaurado`,
          redoDescription: `Miembro "${workerName}" modificado`,
          executeUndo: async () => {
            const ref = doc(db, membersCol, String(data.id));
            await updateDoc(ref, {
              ...prevSnapshot,
              updatedAt: serverTimestamp(),
              updated_at: serverTimestamp(),
            });
            qc.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] });
          },
          executeRedo: async () => {
            const ref = doc(db, membersCol, String(data.id));
            await updateDoc(ref, {
              ...data,
              updatedAt: serverTimestamp(),
              updated_at: serverTimestamp(),
            });
            qc.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] });
          },
        });
      }

      return { ok: true, id: data.id };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] }),
  });
}

// ── Derived selectors ──────────────────────────────────────────────────────────
export function useProjectTasks(projectId: string) {
  const { data } = useData();
  return (data?.tareas ?? []).filter(
    (t) => t.proyecto_ids?.includes(projectId)
  );
}

export function useClientProjects(clientId: string) {
  const { data } = useData();
  return (data?.proyectos ?? []).filter(
    (p) => p.cliente_ids?.includes(clientId)
  );
}
