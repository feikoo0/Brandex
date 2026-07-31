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
 * Hook reactivo unificado para obtener todos los datos, agregados y cliente resolviendo `cliente_id`
 * de cualquier proyecto en las colecciones nativas de Firestore.
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
        clientName: "Proyecto no encontrado",
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

    // Resolver cliente vía cliente_id relacional
    let client: Client | null = null;
    const clientId = (project as any).cliente_id || (project.cliente_ids && project.cliente_ids[0]);
    if (clientId) {
      client = data.clientes.find((c) => c.id === clientId) || null;
    }

    const clientName = client?.nombre || (project as any).cliente || "Sin cliente";

    // Resolver tareas hijas vía proyecto_id
    const tasks = data.tareas.filter((t) => {
      if ((t as any).proyecto_id) return (t as any).proyecto_id === idStr;
      if (t.proyecto_ids && t.proyecto_ids.length > 0) return t.proyecto_ids.includes(idStr);
      return false;
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => {
      const st = (t.estado || "").toLowerCase();
      return st === "completado" || st === "hecho" || st === "aprobado";
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
      status: project.estado || (project as any).estadoProyecto || "Activo",
      area: project.area || "",
      prioridad: project.prioridad || "Media",
      esfuerzo: project.esfuerzo || "Medio",
      tiempoEstimado: (project as any).tiempoEstimado || "1h",
      fechaInicio: project.fechaInicio || "",
      fechaFin: project.fechaFin || "",
      costo: typeof project.costo === "number" ? project.costo : 0,
      isLoading,
    };
  }, [projectId, data, isLoading]);
}
