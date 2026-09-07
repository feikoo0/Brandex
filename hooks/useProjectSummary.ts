"use client";

import { useMemo, useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/lib/store";
import { getWorkspaceScopedCol, isTaskActive } from "@/lib/utils";
import { useData } from "./useData";
import { useClients } from "./useClients";
import { getFormato } from "@/app/taski/utils/formatos";
import { evaluateProjectStatusFromTasks } from "@/lib/projectStateEngine";
import type { Project, Task, Client, SessionDoc } from "@/lib/types";

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
  presupuesto: number;
  presupuestoBase?: number;
  tareasExtrasPrecio?: number;
  tareasCostoDelegado?: number;
  costoSesiones?: number;
  costoReal: number;
  margen: number | null;
  margenDinero?: number;
  sessionsSinTarifa: number;
  isLoading: boolean;
}

function getSessionsColName(workspaceId?: string | null): string {
  if (!workspaceId) {
    return "sessions_unauthorized";
  }
  const isMaster = workspaceId === "brandex-master" || workspaceId === "ws_159789" || workspaceId === "159789";
  return getWorkspaceScopedCol("sessions", workspaceId, isMaster);
}

/**
 * Hook reactivo unificado para obtener todos los datos, agregados y cliente resolviendo `cliente_id`,
 * `cliente_ids`, o `cliente` (texto plano) de cualquier proyecto en las colecciones de Taski.
 */
export function useProjectSummary(projectId: string | number | null | undefined): ProjectSummary {
  const { data, isLoading } = useData();
  const { clients: firestoreClients } = useClients();
  const workspaceId = useAuthStore((s) => s.workspaceId);
  const colName = getSessionsColName(workspaceId);

  // Escucha en tiempo real de las sesiones del proyecto para rollups financieros
  const [projectSessions, setProjectSessions] = useState<SessionDoc[]>([]);

  useEffect(() => {
    if (!projectId) {
      setProjectSessions([]);
      return;
    }
    const q = query(
      collection(db, colName),
      where("project_id", "==", String(projectId))
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: SessionDoc[] = [];
        snapshot.forEach((d) => {
          const docData = { id: d.id, ...d.data() } as SessionDoc;
          // Excluir sesiones borradas y sesiones que todavía están 'en_curso' (sin duración final cerrada)
          if (docData.isDeleted || docData.status === "deleted" || docData.status === "en_curso") {
            return;
          }
          // Incluir trabajo ya terminado: 'completada', 'completada_forzada' o con duración minutos positiva
          if (
            docData.status === "completada" ||
            docData.status === "completada_forzada" ||
            (typeof docData.durationMins === "number" && docData.durationMins > 0)
          ) {
            list.push(docData);
          }
        });
        setProjectSessions(list);
      },
      (err) => {
        console.error("Error fetching sessions for project summary:", err);
        setProjectSessions([]);
      }
    );
    return () => unsubscribe();
  }, [projectId, colName]);

  // Consolidar clientes de Firestore con los de cache
  const allClients = useMemo(() => {
    const map = new Map<string, Client>();
    (firestoreClients || []).forEach((c) => {
      if (c && c.id) {
        map.set(String(c.id), {
          ...c,
          nombre: c.nombre || c.name || "Cliente sin nombre",
          name: c.nombre || c.name || "Cliente sin nombre",
        });
      }
    });
    (data?.clientes || []).forEach((c) => {
      if (c && c.id && !map.has(String(c.id))) {
        map.set(String(c.id), {
          ...c,
          nombre: c.nombre || c.name || "Cliente sin nombre",
          name: c.nombre || c.name || "Cliente sin nombre",
        });
      }
    });
    return Array.from(map.values());
  }, [firestoreClients, data?.clientes]);

  return useMemo(() => {
    if (!projectId || !data) {
      return {
        project: null,
        client: null,
        clientName: "Sin proyecto",
        tasks: [],
        totalTasks: 0,
        completedTasks: 0,
        progressPercent: 0,
        formatos: [],
        totalRealMins: 0,
        burnRateText: "0h",
        status: "Planificación",
        area: "General",
        prioridad: "Media",
        esfuerzo: "Medio",
        tiempoEstimado: "0h",
        fechaInicio: "",
        fechaFin: "",
        costo: 0,
        presupuesto: 0,
        costoReal: 0,
        margen: null,
        sessionsSinTarifa: 0,
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
        burnRateText: "0h",
        status: "Planificación",
        area: "General",
        prioridad: "Media",
        esfuerzo: "Medio",
        tiempoEstimado: "0h",
        fechaInicio: "",
        fechaFin: "",
        costo: 0,
        presupuesto: 0,
        costoReal: 0,
        margen: null,
        sessionsSinTarifa: 0,
        isLoading,
      };
    }

    const rawProject = project as any;

    // ── RESOLUCIÓN ROBUSTA DEL CLIENTE ──
    let client: Client | null = null;
    const possibleClientIds = new Set<string>();

    if (rawProject.cliente_id) possibleClientIds.add(String(rawProject.cliente_id));
    if (rawProject.clienteId) possibleClientIds.add(String(rawProject.clienteId));
    if (Array.isArray(rawProject.cliente_ids)) {
      rawProject.cliente_ids.forEach((id: any) => id && possibleClientIds.add(String(id)));
    }

    // 1. Buscar por ID en la lista unificada de clientes
    if (possibleClientIds.size > 0) {
      client = allClients.find((c) => possibleClientIds.has(String(c.id))) || null;
    }

    // 2. Buscar por coincidencia de nombre si no se encontró por ID
    const directClientName = rawProject.cliente || rawProject.client || rawProject.clientName || rawProject.clienteNombre;

    if (!client && directClientName) {
      client = allClients.find(
        (c) => (c?.nombre || c?.name || "").toLowerCase().trim() === String(directClientName).toLowerCase().trim()
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
          client = allClients.find(
            (c) => String(c.id) === String(tClientId) || (c?.nombre || c?.name || "").toLowerCase().trim() === String(tClientId).toLowerCase().trim()
          ) || null;
          if (client) break;
        }
      }
    }

    // Nombre final resuelto del cliente
    const clientName = client?.nombre || client?.name || directClientName || (tasks[0] as any)?.cliente || "Sin cliente";

    const totalTasks = tasks.length;
    // Cálculo canónico usando isTaskActive helper
    const completedTasks = tasks.filter((t) => !isTaskActive(t.estado)).length;
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

    // ── ROLLUPS FINANCIEROS Y COSTO REAL EN VIVO ──
    const members = data.miembros || [];
    let costoSesiones = 0;
    let sessionsSinTarifa = 0;

    projectSessions.forEach((s) => {
      const workerId = s.worker_id;
      const member = workerId ? members.find((m) => String(m.id) === String(workerId)) : null;
      const tarifa = member?.tarifa_hora ?? (member as any)?.tarifa;

      if (tarifa !== undefined && tarifa !== null && typeof tarifa === "number" && tarifa > 0) {
        const durMins = s.durationMins || 0;
        costoSesiones += (durMins / 60) * tarifa;
      } else {
        sessionsSinTarifa++;
      }
    });

    costoSesiones = Math.round(costoSesiones * 100) / 100;

    // Costo de delegación asignado a cada tarea individual
    const tareasCostoDelegado = tasks.reduce((sum, t) => sum + (Number((t as any).costo) || 0), 0);
    const costoReal = Math.round((costoSesiones + tareasCostoDelegado) * 100) / 100;

    const rawPresupuesto = project.presupuesto ?? (project as any).costo ?? 0;
    const presupuestoBase = typeof rawPresupuesto === "number" && !isNaN(rawPresupuesto) ? rawPresupuesto : 0;
    const tareasExtrasPrecio = tasks.reduce((sum, t) => sum + (Number((t as any).precio) || 0), 0);
    const presupuestoNum = presupuestoBase + tareasExtrasPrecio;
    const margenDinero = presupuestoNum - costoReal;
    const margen: number | null = presupuestoNum > 0 ? Math.round(((presupuestoNum - costoReal) / presupuestoNum) * 1000) / 10 : null;

    // Evaluación dinámica pura del estado del proyecto en base al avance real de sus tareas
    const rawProjectStatus = project.estadoProyecto || project.estado || "Planificación";
    const { newStatus } = evaluateProjectStatusFromTasks(rawProjectStatus, tasks);

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
      status: newStatus,
      area: project.area || "",
      prioridad: project.prioridad || "Media",
      esfuerzo: project.esfuerzo || "Medio",
      tiempoEstimado: (project as any).tiempoEstimado || "1h",
      fechaInicio,
      fechaFin,
      costo: typeof project.costo === "number" ? project.costo : presupuestoNum,
      presupuesto: presupuestoNum,
      presupuestoBase,
      tareasExtrasPrecio,
      tareasCostoDelegado,
      costoSesiones,
      costoReal,
      margen,
      margenDinero,
      sessionsSinTarifa,
      isLoading,
    };
  }, [projectId, data, isLoading, allClients, projectSessions]);
}
