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

const QUERY_KEY = ["taski-firestore-data"];

// ── Full data directly from pure Firestore collections ─────────────────────────
export function useData() {
  return useQuery<BraindexData>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
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

      // 3. Proyectos (colección 'projects')
      let projectsList: Project[] = [];
      try {
        const projSnap = await getDocs(collection(db, "projects"));
        if (!projSnap.empty) {
          projectsList = projSnap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
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
              fechaInicio: data.fechaInicio || "",
              fechaFin: data.fechaFin || "",
              recursosDrive: data.recursosDrive || "",
              costo: data.costo !== undefined ? Number(data.costo) : 0,
              tarea_ids: data.tarea_ids || [],
              descripcion: data.descripcion || "",
              url: data.url || "",
              createdAt: data.createdAt || data.created_at || null,
              updatedAt: data.updatedAt || data.updated_at || null,
              created_at: data.created_at || data.createdAt || null,
              updated_at: data.updated_at || data.updatedAt || null,
              ...data,
            } as Project;
          });
        }
      } catch (e) {
        console.error("Error reading projects from Firestore:", e);
      }

      // 4. Tareas (colección 'tasks')
      let tasksList: Task[] = [];
      try {
        const tasksSnap = await getDocs(collection(db, "tasks"));
        if (!tasksSnap.empty) {
          tasksList = tasksSnap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              titulo: data.titulo || data.title || "Tarea",
              estado: data.estado || data.status || "Pendiente",
              area: data.area || "",
              asignado: data.asignado || "",
              formato: data.formato || data.format || "",
              esfuerzo: data.esfuerzo || "1h",
              prioridad: data.prioridad || "Media",
              plataformas: data.plataformas || [],
              contenido: data.contenido || "",
              copy: data.copy || "",
              adminNotes: data.adminNotes || "",
              notasCliente: data.notasCliente || "",
              fechaProg: data.fechaProg || "",
              fechaEntrega: data.fechaEntrega || "",
              asignado_ids: data.asignado_ids || [],
              proyecto_ids: data.proyecto_ids || (data.proyecto_id ? [String(data.proyecto_id)] : []),
              cliente_ids: data.cliente_ids || (data.cliente_id ? [String(data.cliente_id)] : []),
              created: data.created || new Date().toISOString(),
              url: data.url || "",
              createdAt: data.createdAt || data.created_at || null,
              updatedAt: data.updatedAt || data.updated_at || null,
              created_at: data.created_at || data.createdAt || null,
              updated_at: data.updated_at || data.updatedAt || null,
              ...data,
            } as Task;
          });
        }
      } catch (e) {
        console.error("Error reading tasks from Firestore:", e);
      }

      return {
        clientes:     clientsList,
        proyectos:    projectsList,
        tareas:       tasksList,
        trabajadores: workersList,
        recursos:     [],
      };
    },
    staleTime:    10 * 1000,       // 10s freshness
    gcTime:       5 * 60 * 1000,   // 5 min cache
    refetchOnWindowFocus: true,
  });
}

// ── Manual sync trigger ────────────────────────────────────────────────────────
export function useSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await qc.invalidateQueries({ queryKey: QUERY_KEY });
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

// ── Task mutations ─────────────────────────────────────────────────────────────
export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Task> & { titulo: string }) => {
      const newId = "task-" + Date.now();
      const taskDoc = {
        ...data,
        id: newId,
        titulo: data.titulo.trim(),
        estado: data.estado || "Pendiente",
        prioridad: data.prioridad || "Media",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };
      await setDoc(doc(db, "tasks", newId), taskDoc);

      recordUndoAction({
        entityType: "task",
        entityId: newId,
        actionType: "create",
        description: `Crear tarea: "${taskDoc.titulo}"`,
        undoDescription: `Tarea "${taskDoc.titulo}" eliminada`,
        redoDescription: `Tarea "${taskDoc.titulo}" recreada`,
        executeUndo: async () => {
          await deleteDoc(doc(db, "tasks", newId));
          qc.invalidateQueries({ queryKey: QUERY_KEY });
        },
        executeRedo: async () => {
          await setDoc(doc(db, "tasks", newId), taskDoc);
          qc.invalidateQueries({ queryKey: QUERY_KEY });
        },
      });

      return taskDoc;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
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
      // Snapshot previo desde caché
      const currentCache = qc.getQueryData<BraindexData>(QUERY_KEY);
      const prevTask = currentCache?.tareas?.find((t) => String(t.id) === String(data.id));

      const taskRef = doc(db, "tasks", String(data.id));
      await updateDoc(taskRef, {
        ...data,
        updatedAt: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

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
            const ref = doc(db, "tasks", String(data.id));
            await updateDoc(ref, {
              ...prevSnapshot,
              updatedAt: serverTimestamp(),
              updated_at: serverTimestamp(),
            });
            qc.invalidateQueries({ queryKey: QUERY_KEY });
          },
          executeRedo: async () => {
            const ref = doc(db, "tasks", String(data.id));
            await updateDoc(ref, {
              ...data,
              updatedAt: serverTimestamp(),
              updated_at: serverTimestamp(),
            });
            qc.invalidateQueries({ queryKey: QUERY_KEY });
          },
        });
      }

      return { ok: true, id: data.id };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const currentCache = qc.getQueryData<BraindexData>(QUERY_KEY);
      const prevTask = currentCache?.tareas?.find((t) => String(t.id) === String(taskId));

      await deleteDoc(doc(db, "tasks", String(taskId)));

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
            await setDoc(doc(db, "tasks", String(taskId)), {
              ...prevTask,
              updatedAt: serverTimestamp(),
              updated_at: serverTimestamp(),
            });
            qc.invalidateQueries({ queryKey: QUERY_KEY });
          },
          executeRedo: async () => {
            await deleteDoc(doc(db, "tasks", String(taskId)));
            qc.invalidateQueries({ queryKey: QUERY_KEY });
          },
        });
      }

      return { ok: true, id: taskId };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

// ── Project mutations ──────────────────────────────────────────────────────────
export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Project> & { nombre: string }) => {
      const newId = "proj-" + Date.now();
      const projectDoc = {
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
      await setDoc(doc(db, "projects", newId), projectDoc);

      recordUndoAction({
        entityType: "project",
        entityId: newId,
        actionType: "create",
        description: `Crear proyecto: "${projectDoc.nombre}"`,
        undoDescription: `Proyecto "${projectDoc.nombre}" eliminado`,
        redoDescription: `Proyecto "${projectDoc.nombre}" recreado`,
        executeUndo: async () => {
          await deleteDoc(doc(db, "projects", newId));
          qc.invalidateQueries({ queryKey: QUERY_KEY });
        },
        executeRedo: async () => {
          await setDoc(doc(db, "projects", newId), projectDoc);
          qc.invalidateQueries({ queryKey: QUERY_KEY });
        },
      });

      return projectDoc;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
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
      const currentCache = qc.getQueryData<BraindexData>(QUERY_KEY);
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
            qc.invalidateQueries({ queryKey: QUERY_KEY });
          },
          executeRedo: async () => {
            await persistProjectUpdate(data.id, data as any);
            qc.invalidateQueries({ queryKey: QUERY_KEY });
          },
        });
      }

      return { ok: true, id: data.id };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string) => {
      const currentCache = qc.getQueryData<BraindexData>(QUERY_KEY);
      const prevProject = currentCache?.proyectos?.find((p) => String(p.id) === String(projectId));

      await deleteDoc(doc(db, "projects", String(projectId)));
      await deleteDoc(doc(db, "v3_projects", String(projectId))).catch(() => {});

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
            await setDoc(doc(db, "projects", String(projectId)), {
              ...prevProject,
              updatedAt: serverTimestamp(),
              updated_at: serverTimestamp(),
            });
            await setDoc(doc(db, "v3_projects", String(projectId)), {
              ...prevProject,
              updatedAt: serverTimestamp(),
              updated_at: serverTimestamp(),
            }).catch(() => {});
            qc.invalidateQueries({ queryKey: QUERY_KEY });
          },
          executeRedo: async () => {
            await deleteDoc(doc(db, "projects", String(projectId)));
            await deleteDoc(doc(db, "v3_projects", String(projectId))).catch(() => {});
            qc.invalidateQueries({ queryKey: QUERY_KEY });
          },
        });
      }

      return { ok: true, id: projectId };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

// ── Client mutations ───────────────────────────────────────────────────────────
export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Client> & { nombre: string }) => {
      const newId = "cli-" + Date.now();
      const clientDoc = {
        ...data,
        id: newId,
        nombre: data.nombre.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };
      await setDoc(doc(db, "clients", newId), clientDoc);

      recordUndoAction({
        entityType: "client",
        entityId: newId,
        actionType: "create",
        description: `Crear cliente: "${clientDoc.nombre}"`,
        undoDescription: `Cliente "${clientDoc.nombre}" eliminado`,
        redoDescription: `Cliente "${clientDoc.nombre}" recreado`,
        executeUndo: async () => {
          await deleteDoc(doc(db, "clients", newId));
          qc.invalidateQueries({ queryKey: QUERY_KEY });
        },
        executeRedo: async () => {
          await setDoc(doc(db, "clients", newId), clientDoc);
          qc.invalidateQueries({ queryKey: QUERY_KEY });
        },
      });

      return clientDoc;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Client> & { id: string }) => {
      const currentCache = qc.getQueryData<BraindexData>(QUERY_KEY);
      const prevClient = currentCache?.clientes?.find((c) => String(c.id) === String(data.id));

      const clientRef = doc(db, "clients", String(data.id));
      await updateDoc(clientRef, {
        ...data,
        updatedAt: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

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
            const ref = doc(db, "clients", String(data.id));
            await updateDoc(ref, {
              ...prevSnapshot,
              updatedAt: serverTimestamp(),
              updated_at: serverTimestamp(),
            });
            qc.invalidateQueries({ queryKey: QUERY_KEY });
          },
          executeRedo: async () => {
            const ref = doc(db, "clients", String(data.id));
            await updateDoc(ref, {
              ...data,
              updatedAt: serverTimestamp(),
              updated_at: serverTimestamp(),
            });
            qc.invalidateQueries({ queryKey: QUERY_KEY });
          },
        });
      }

      return { ok: true, id: data.id };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

// ── Worker mutations ───────────────────────────────────────────────────────────
export function useUpdateWorker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Worker> & { id: string }) => {
      const currentCache = qc.getQueryData<BraindexData>(QUERY_KEY);
      const prevWorker = currentCache?.trabajadores?.find((w) => String(w.id) === String(data.id));

      const memberRef = doc(db, "members", String(data.id));
      await updateDoc(memberRef, {
        ...data,
        updatedAt: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

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
            const ref = doc(db, "members", String(data.id));
            await updateDoc(ref, {
              ...prevSnapshot,
              updatedAt: serverTimestamp(),
              updated_at: serverTimestamp(),
            });
            qc.invalidateQueries({ queryKey: QUERY_KEY });
          },
          executeRedo: async () => {
            const ref = doc(db, "members", String(data.id));
            await updateDoc(ref, {
              ...data,
              updatedAt: serverTimestamp(),
              updated_at: serverTimestamp(),
            });
            qc.invalidateQueries({ queryKey: QUERY_KEY });
          },
        });
      }

      return { ok: true, id: data.id };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
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
