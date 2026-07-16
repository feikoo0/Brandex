"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Braindex OS — Data Hooks (TanStack Query)
//
//  useData()  → full sync, cached 3 min, background refetch
//  useSync()  → manual trigger (Sync button)
// ─────────────────────────────────────────────────────────────────────────────

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  syncAll,
  createTask,
  updateTask,
  createProject,
  updateProject,
  createClient,
  updateClient,
  updateWorker,
} from "@/lib/api";
import type {
  BraindexData,
  Task,
  Project,
  Client,
  Worker,
} from "@/lib/types";

const QUERY_KEY = ["braindex-data"];

// ── Full data (auto-refreshed every 3 minutes) ─────────────────────────────────
export function useData() {
  return useQuery<BraindexData>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await syncAll();
      if ("error" in res && res.error) throw new Error(res.error);
      return {
        clientes:     res.clientes     ?? [],
        proyectos:    res.proyectos    ?? [],
        tareas:       res.tareas       ?? [],
        trabajadores: res.trabajadores ?? [],
        recursos:     res.recursos     ?? [],
      };
    },
    staleTime:    3 * 60 * 1000,   // 3 min before refetch
    gcTime:       10 * 60 * 1000,  // 10 min cache
    refetchOnWindowFocus: false,
  });
}

// ── Manual sync trigger ────────────────────────────────────────────────────────
export function useSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => syncAll(true),
    onSuccess: (res) => {
      qc.setQueryData(QUERY_KEY, {
        clientes:     res.clientes     ?? [],
        proyectos:    res.proyectos    ?? [],
        tareas:       res.tareas       ?? [],
        trabajadores: res.trabajadores ?? [],
        recursos:     res.recursos     ?? [],
      });
    },
  });
}

// ── Task mutations ─────────────────────────────────────────────────────────────
export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Task> & { titulo: string }) => createTask(data),
    onMutate: async (newTaskParams) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const previousData = qc.getQueryData<BraindexData>(QUERY_KEY);

      // Create a temporary task to inject into the cache
      const tempId = "temp-" + Date.now();
      const proyectoIds = newTaskParams.proyecto_ids || ((newTaskParams as any).proyecto_id ? [(newTaskParams as any).proyecto_id] : []);
      const clienteIds = newTaskParams.cliente_ids || ((newTaskParams as any).cliente_id ? [(newTaskParams as any).cliente_id] : []);
      if (previousData) {
        qc.setQueryData<BraindexData>(QUERY_KEY, {
          ...previousData,
          tareas: [
            ...previousData.tareas,
            {
              id: tempId,
              titulo: newTaskParams.titulo,
              asignado_ids: newTaskParams.asignado_ids || [],
              estado: newTaskParams.estado || "Pendiente",
              prioridad: newTaskParams.prioridad || "Media",
              formato: newTaskParams.formato || "",
              esfuerzo: newTaskParams.esfuerzo || "",
              proyecto_ids: proyectoIds,
              cliente_ids: clienteIds,
              fechaProg: newTaskParams.fechaProg || "",
              fechaEntrega: newTaskParams.fechaEntrega || "",
              _type: "task",
              // fill with minimal mock data
              plataformas: [],
              area: "",
              asignado: "",
              contenido: newTaskParams.contenido || "",
              copy: "",
              adminNotes: "",
              proyecto: "", 
              cliente: "",  
              created: new Date().toISOString(),
              url: "",
              notasCliente: "",
            } as Task
          ]
        });
      }
      return { previousData };
    },
    onError: (err, newTaskParams, context) => {
      if (context?.previousData) {
        qc.setQueryData(QUERY_KEY, context.previousData);
      }
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      // Notify ProgressPanel so the new task auto-appears in the panel
      if (result?.id) {
        window.dispatchEvent(new CustomEvent("item-created", { detail: { type: "task", id: result.id } }));
      }
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Task> & { id: string }) => updateTask(data),
    onMutate: async (updatedTaskParams) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const previousData = qc.getQueryData<BraindexData>(QUERY_KEY);

      if (previousData) {
        qc.setQueryData<BraindexData>(QUERY_KEY, {
          ...previousData,
          tareas: previousData.tareas.map((t) =>
            t.id === updatedTaskParams.id ? { ...t, ...updatedTaskParams } : t
          ),
        });
      }
      return { previousData };
    },
    onError: (err, newTaskParams, context) => {
      if (context?.previousData) {
        qc.setQueryData(QUERY_KEY, context.previousData);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

// ── Project mutations ──────────────────────────────────────────────────────────
export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Project> & { nombre: string }) => createProject(data),
    onMutate: async (newProjectParams) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const previousData = qc.getQueryData<BraindexData>(QUERY_KEY);

      const tempId = "temp-project-" + Date.now();
      if (previousData) {
        qc.setQueryData<BraindexData>(QUERY_KEY, {
          ...previousData,
          proyectos: [
            ...previousData.proyectos,
            {
              id: tempId,
              nombre: newProjectParams.nombre,
              cliente_ids: newProjectParams.cliente_ids || [],
              estadoProyecto: newProjectParams.estadoProyecto || "🧠 Planificacion",
              estado: newProjectParams.estado || "",
              area: newProjectParams.area || "",
              formato: newProjectParams.formato || "",
              prioridad: newProjectParams.prioridad || "MODERADO",
              ciclo: newProjectParams.ciclo || "",
              esfuerzo: newProjectParams.esfuerzo || "",
              plataformas: newProjectParams.plataformas || [],
              fechaInicio: newProjectParams.fechaInicio || "",
              fechaFin: newProjectParams.fechaFin || "",
              recursosDrive: newProjectParams.recursosDrive || "",
              costo: newProjectParams.costo || 0,
              tarea_ids: [],
              descripcion: newProjectParams.descripcion || "",
              url: "",
            } as Project,
          ],
        });
      }
      return { previousData };
    },
    onError: (err, newProjectParams, context) => {
      if (context?.previousData) {
        qc.setQueryData(QUERY_KEY, context.previousData);
      }
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      // Notify ProgressPanel so the new project auto-appears in the panel
      if (result?.id) {
        window.dispatchEvent(new CustomEvent("item-created", { detail: { type: "project", id: result.id } }));
      }
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Project> & { id: string }) => updateProject(data),
    onMutate: async (updatedProjectParams) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const previousData = qc.getQueryData<BraindexData>(QUERY_KEY);

      if (previousData) {
        qc.setQueryData<BraindexData>(QUERY_KEY, {
          ...previousData,
          proyectos: previousData.proyectos.map((p) =>
            p.id === updatedProjectParams.id ? { ...p, ...updatedProjectParams } : p
          ),
        });
      }
      return { previousData };
    },
    onError: (err, newParams, context) => {
      if (context?.previousData) {
        qc.setQueryData(QUERY_KEY, context.previousData);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

// ── Client mutations ───────────────────────────────────────────────────────────
export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Client> & { nombre: string }) => createClient(data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Client> & { id: string }) => updateClient(data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

// ── Worker mutations ───────────────────────────────────────────────────────────
export function useUpdateWorker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Worker> & { id: string }) => updateWorker(data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
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
