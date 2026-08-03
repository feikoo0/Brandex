"use client";

import { useMemo } from "react";
import { useData } from "./useData";
import { getFormato } from "@/app/taski/utils/formatos";
import type { Project, Task, Client } from "@/lib/types";

export interface FormatoAggregate {
  key: string;
  name: string;
  count: number;
  icon?: string;
  color?: string;
}

export interface ProjectSummary {
  project: Project | null;
  client: Client | null;
  clientName: string;
  tasks: Task[];
  totalTasks: number;
  completedTasks: number;
  progressPercent: number;
  formatos: FormatoAggregate[];
  totalRealMins: number;
  burnRateText: string;
  status: string;
  area: string;
  prioridad: string;
  esfuerzo: string;
  tiempoEstimado: string;
  fechaInicio: string;
  fechaFin: string;
  costo: number;
  isLoading: boolean;
}

/**
 * Hook reactivo unificado para obtener todos los datos, agregados y cliente resolviendo `cliente_id`,
 * `cliente_ids`, o `cliente` (texto plano) de cualquier proyecto en las colecciones de Taski.
 */
export function useProjectSummary(projectId: string | number | null | undefined): ProjectSummary {
  const { data, isLoading } = useData();

  return useMemo(() => {
    if (!projectId || !data) {
      return {
        project: null,
        client: null,
        clientName: "Sin cliente",
        tasks: [],
        totalTasks: 0,
        completedTasks: 0,
        progressPercent: 0,
        formatos: [],
        totalRealMins: 0,
        burnRateText: "0h / 40h",
        status: "Planificación",
        area: "",
        prioridad: "Media",
        esfuerzo: "Medio",
        tiempoEstimado: "1h",
        fechaInicio: "",
        fechaFin: "",
        costo: 0,
        isLoading,
      };
    }

    const idStr = String(projectId);
    const project = data.proyectos.find((p) => String(p.id) === idStr) || null;

    if (!project) {
      return {
        project: null,
        client: null,
        clientName: "Sin cliente",
        tasks: [],
        totalTasks: 0,
        completedTasks: 0,
        progressPercent: 0,
        formatos: [],
        totalRealMins: 0,
        burnRateText: "0h / 40h",
        status: "Planificación",
        area: "",
        prioridad: "Media",
        esfuerzo: "Medio",
        tiempoEstimado: "1h",
        fechaInicio: "",
        fechaFin: "",
        costo: 0,
        isLoading,
      };
    }

    const rawProject = project as any;

    // ── RESOLUCIÓN ROBUSTA DEL CLIENTE ──
    let client: Client | null = null;
    const possibleClientIds = new Set<string>();

    if (rawProject.cliente_id) possibleClientIds.add(String(rawProject.cliente_id));
    if (Array.isArray(rawProject.cliente_ids)) {
      rawProject.cliente_ids.forEach((id: any) => id && possibleClientIds.add(String(id)));
    }

    // 1. Buscar por ID en la lista de clientes
    if (possibleClientIds.size > 0) {
      client = data.clientes.find((c) => possibleClientIds.has(String(c.id))) || null;
    }

    // 2. Buscar por coincidencia de nombre si no se encontró por ID
    const directClientName = rawProject.cliente || rawProject.client || rawProject.clientName || rawProject.clienteNombre;

    if (!client && directClientName) {
      client = data.clientes.find(
        (c) => c.nombre.toLowerCase().trim() === String(directClientName).toLowerCase().trim()
      ) || null;
    }

    // 3. Si aún no se encuentra, revisar las tareas del proyecto por si tienen el cliente asignado
    const tasks = data.tareas.filter((t) => {
      if ((t as any).proyecto_id) return String((t as any).proyecto_id) === idStr;
      if (t.proyecto_ids && t.proyecto_ids.length > 0) return t.proyecto_ids.map(String).includes(idStr);
      return false;
    });

    if (!client) {
      for (const t of tasks) {
        const tClientId = (t as any).cliente_id || (t.cliente_ids && t.cliente_ids[0]);
        if (tClientId) {
          client = data.clientes.find(
            (c) => String(c.id) === String(tClientId) || c.nombre.toLowerCase().trim() === String(tClientId).toLowerCase().trim()
          ) || null;
          if (client) break;
        }
      }
    }

    // Nombre final resuelto del cliente
    const clientName = client?.nombre || directClientName || (tasks[0] as any)?.cliente || "Sin cliente";

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => {
      const st = (t.estado || "").toLowerCase();
      return st === "completado" || st === "hecho" || st === "aprobado" || st === "entregado";
    }).length;

    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Agregados de formatos para visuales bento
    const formatCountMap: Record<string, number> = {};
    let totalMins = 0;

    tasks.forEach((t) => {
      const fKey = (t.formato || "").trim().toLowerCase();
      const fConfig = getFormato(fKey);
      const normalizedKey = fConfig?.key || fKey || "post_imagen";
      formatCountMap[normalizedKey] = (formatCountMap[normalizedKey] || 0) + 1;

      if (typeof t.tiempoRealMins === "number") {
        totalMins += t.tiempoRealMins;
      }
    });

    const formatos: FormatoAggregate[] = Object.entries(formatCountMap).map(([key, count]) => {
      const config = getFormato(key);
      return {
        key,
        name: config?.nombre || key,
        count,
        icon: config?.icono,
      };
    });

    const spentHours = Math.round((totalMins / 60) * 10) / 10;
    const burnRateText = `${spentHours}h / 40h`;

    let fechaInicio = rawProject.fechaInicio || rawProject.fecha_inicio || rawProject.startDate || rawProject.start_date || rawProject.fechaCreacion || rawProject.fecha_creacion || rawProject.createdAt || rawProject.created_at || "";
    let fechaFin = rawProject.fechaFin || rawProject.fecha_fin || rawProject.endDate || rawProject.end_date || rawProject.deadline || rawProject.fechaEntrega || rawProject.fecha_entrega || rawProject.fecha || "";

    if (!fechaFin && tasks.length > 0) {
      const taskDates = tasks
        .map((t: any) => t.fechaEntrega || t.fecha_entrega || t.deadline || t.fechaProg || t.fecha)
        .filter(Boolean)
        .sort();
      if (taskDates.length > 0) {
        fechaFin = taskDates[taskDates.length - 1];
        if (!fechaInicio) {
          fechaInicio = taskDates[0];
        }
      }
    }

    return {
      project,
      client,
      clientName,
      tasks,
      totalTasks,
      completedTasks,
      progressPercent,
      formatos,
      totalRealMins: totalMins,
      burnRateText,
      status: project.estadoProyecto || project.estado || "Activo",
      area: project.area || "",
      prioridad: project.prioridad || "Media",
      esfuerzo: project.esfuerzo || "Medio",
      tiempoEstimado: (project as any).tiempoEstimado || "1h",
      fechaInicio,
      fechaFin,
      costo: typeof project.costo === "number" ? project.costo : 0,
      isLoading,
    };
  }, [projectId, data, isLoading]);
}
