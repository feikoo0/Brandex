"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Loader2, Handshake, FileText, Database } from "lucide-react";
import { collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { Project, Task } from "./components/ProjectDashboard";
import NewProjectModal, { ProjectData } from "./components/NewProjectModal";
import NewTaskModal, { TaskData } from "./components/NewTaskModal";
import { playSound } from "./utils/audio";
import { autoEvaluateProjectStatus } from "./utils/data";
import { TeamDashboard } from "./components/TeamDashboard";
import { ClientsDashboard } from "./components/ClientsDashboard";
import { HomeDashboard } from "./components/HomeDashboard";
import { InicioDashboard } from "./components/InicioDashboard";
import { ProjectsView } from "@/components/views/ProjectsView";
import { SuperAdminView } from "@/components/views/SuperAdminView";
import { DiagramsView } from "@/components/views/DiagramsView";
import { PlaceholderView } from "@/components/views/PlaceholderView";
import { useSystemFeatures } from "@/hooks/useSystemFeatures";
import { FinanzasGlobalesDashboard } from "./components/FinanzasGlobalesDashboard";
import { persistProjectUpdate } from "./utils/persist";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useData, useCreateTask, useUpdateTask, useDeleteTask } from "@/hooks/useData";
import { getSingleSourceProjectColor, getDynamicGreeting, getWorkspaceScopedCol, extractCleanTaskId } from "@/lib/utils";
import { useAuthStore } from "@/lib/store";

import { AppLayout } from "@/components/layout/AppLayout";
import { TaskiSidebar } from "@/components/layout/TaskiSidebar";
import { TaskiTopbar } from "@/components/layout/TaskiTopbar";
import { TaskSidePanel } from "@/components/task-detail/TaskSidePanel";

interface TaskSession {
  id: number;
  date: string;
  hours: number;
}

function getInitialHSL(gradient: string): { h: number; s: number; l: number } {
  const { h, s, l } = getSingleSourceProjectColor({ gradient });
  return { h, s, l };
}

export default function BrandexV3Page() {
  const router = useRouter();
  const role = useAuthStore((s) => s.role);
  const token = useAuthStore((s) => s.token);
  const workspaceId = useAuthStore((s) => s.workspaceId);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isMaster = workspaceId === "brandex-master" || workspaceId === "ws_159789" || workspaceId === "159789";

  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    // Si ya tenemos token y workspaceId cargados, el acceso está listo inmediatamente
    if (token && workspaceId) {
      setIsAuthReady(true);
      return;
    }

    // Solo si terminó de hidratar Zustand y definitivamente no existe sesión, redirigir a /
    if (hasHydrated) {
      if (!token || !workspaceId) {
        router.replace("/");
      }
    }
  }, [role, token, workspaceId, hasHydrated, router]);

  const [activeTab, setActiveTab] = useState(() => (isMaster ? "inicio" : "home"));
  const [homeView, setHomeView] = useState<"buscar" | "kanban" | "tabla" | "timeline">("kanban");
  const [previousHomeView, setPreviousHomeView] = useState<"kanban" | "tabla" | "timeline">("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewFilterMode, setViewFilterMode] = useState<"mio" | "equipo">("equipo");
  const [groupingMode, setGroupingMode] = useState<"fecha" | "cliente" | "prioridad" | "estado">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("taski_grouping_mode");
      if (saved && ["fecha", "cliente", "prioridad", "estado"].includes(saved)) {
        return saved as any;
      }
    }
    return "fecha";
  });

  const handleSetGroupingMode = (mode: "fecha" | "cliente" | "prioridad" | "estado") => {
    setGroupingMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("taski_grouping_mode", mode);
    }
  };

  const [isHomeEditMode, setIsHomeEditMode] = useState(false);
  const [isNightMode, setIsNightMode] = useState(true);

  useEffect(() => {
    const savedMode = localStorage.getItem("taski_is_night_mode");
    if (savedMode !== null) {
      setIsNightMode(savedMode === "true");
    }
  }, []);

  const isNeumorphic = true;
  const [activeProject, setActiveProject] = useState<string | number | null>(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [editingProjectModal, setEditingProjectModal] = useState<Project | null>(null);
  const [projectModalOriginRect, setProjectModalOriginRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [editingTaskModal, setEditingTaskModal] = useState<(Partial<Task> & { projectId?: string | number; projectName?: string; client?: string }) | null>(null);
  const [activeSideTask, setActiveSideTask] = useState<(Partial<Task> & { projectId?: string | number; projectName?: string; client?: string }) | null>(null);
  const [newTaskDefaultProjectId, setNewTaskDefaultProjectId] = useState<string | number | undefined>(undefined);
  const [taskModalOriginRect, setTaskModalOriginRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const authUserName = useAuthStore((s) => s.userName);
  const currentUserName =
    authUserName && authUserName.toLowerCase() !== "malebar"
      ? authUserName
      : (isMaster ? "Feiko" : "Usuario");

  const [projects, setProjects] = useState<Project[]>([]);
  const [sessionGreetingObj, setSessionGreetingObj] = useState<{ title: string; subtitle: string }>({
    title: `Buenos días, ${currentUserName}`,
    subtitle: "bienvenido de nuevo",
  });
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [copiedKey, setCopiedKey] = useState(false);
  const logout = useAuthStore((s) => s.logout);
  const { isFeatureVisible } = useSystemFeatures();
  const qc = useQueryClient();

  const { data: firestoreData } = useData();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  // Sincronizar reactivamente activeSideTask cuando projects cambie desde Kanban, Sesiones o Firestore
  useEffect(() => {
    if (!activeSideTask?.id) return;
    const currentTaskId = String(activeSideTask.id);
    const cleanCurrentId = extractCleanTaskId(currentTaskId);

    for (const p of projects) {
      const match = (p.tasks || []).find((t) => {
        const rawId = String(t.id);
        return rawId === currentTaskId || extractCleanTaskId(rawId) === cleanCurrentId;
      });
      if (match) {
        setActiveSideTask((prev) => {
          if (!prev) return null;
          const isSame =
            prev.status === match.status &&
            prev.estado === (match as any).estado &&
            prev.title === match.title &&
            prev.titulo === (match as any).titulo &&
            prev.priority === match.priority &&
            prev.time === match.time &&
            prev.format === match.format &&
            prev.formato === (match as any).formato &&
            prev.fecha_limite === match.fecha_limite &&
            prev.asignado_id === match.asignado_id;
          if (isSame) return prev;
          return { ...prev, ...match };
        });
        break;
      }
    }
  }, [projects, activeSideTask?.id]);

  const [timelineHideCompleted, setTimelineHideCompleted] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("taski_timeline_hide_completed") === "true";
    }
    return false;
  });

  const [timelineSortBy, setTimelineSortBy] = useState<"recientes" | "urgentes" | "alfabetico">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("taski_timeline_sort_by");
      if (saved && ["recientes", "urgentes", "alfabetico"].includes(saved)) {
        return saved as any;
      }
    }
    return "recientes";
  });

  const handleToggleTimelineHideCompleted = useCallback(() => {
    setTimelineHideCompleted((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("taski_timeline_hide_completed", String(next));
      }
      return next;
    });
  }, []);

  const handleSetTimelineSortBy = useCallback((sort: "recientes" | "urgentes" | "alfabetico") => {
    setTimelineSortBy(sort);
    if (typeof window !== "undefined") {
      localStorage.setItem("taski_timeline_sort_by", sort);
    }
  }, []);

  const handleLogout = () => {
    playSound('pop');
    logout();
    router.replace("/");
  };

  const handleCopyWorkspaceKey = () => {
    try {
      const keyToCopy = isMaster ? "159789" : (workspaceId?.replace("ws_", "") || "000000");
      navigator.clipboard.writeText(keyToCopy);
      playSound('click');
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch {}
  };

  // Sincronización reactiva en tiempo real desde TanStack Query useData (Single Source of Truth)
  useEffect(() => {
    if (!firestoreData) return;

    const { clientes = [], proyectos = [], tareas = [] } = firestoreData;
    const clientMap = new Map<string, string>();
    clientes.forEach((c) => {
      if (c && c.id) {
        clientMap.set(String(c.id), c.nombre || (c as any).name || "Sin Cliente");
      }
    });

    if (proyectos.length === 0) {
      if (!isMaster) {
        setProjects([]);
      }
      return;
    }

    const mappedProjects: Project[] = proyectos.map((data: any) => {
      const rootProjTasks = tareas.filter((t: any) => {
        if (!t) return false;
        if (String(t.proyecto_id) === String(data.id)) return true;
        if (String(t.project_id) === String(data.id)) return true;
        if (Array.isArray(t.proyecto_ids) && t.proyecto_ids.map(String).includes(String(data.id))) return true;
        if (Array.isArray(t.project_ids) && t.project_ids.map(String).includes(String(data.id))) return true;
        return false;
      });

      const embeddedTasks = Array.isArray(data.tasks) ? data.tasks : [];
      const rootTaskIds = new Set(rootProjTasks.map((t: any) => String(t.id)));
      const combinedRawTasks = [
        ...rootProjTasks,
        ...embeddedTasks.filter((et: any) => et && !rootTaskIds.has(String(et.id)))
      ];

      const projColorObj = getSingleSourceProjectColor(data);

      const projTasks = combinedRawTasks.map((t: any, index: number) => {
        const rawStatus = t.estado || t.status || "Planificado";
        let statusColor = t.statusColor;
        if (!statusColor || statusColor.includes("white/5") || statusColor === "bg-white") {
          if (rawStatus === "Completado" || rawStatus === "Completada") statusColor = "bg-emerald-500/20 border-emerald-500/30 text-emerald-400";
          else if (rawStatus === "En Proceso") statusColor = "bg-amber-500/20 border-amber-500/30 text-amber-400";
          else if (rawStatus === "En Revisión" || rawStatus === "Revisión") statusColor = "bg-purple-500/20 border-purple-500/30 text-purple-400";
          else statusColor = "bg-slate-500/20 border-slate-500/30 text-slate-300";
        }

        const projectDeadline = data.fechaFin || data.fecha_fin || data.deadline || data.deadlineRaw || data.dueDate || data.fechaEntrega || data.endDate;
        const projectStartDate = data.fechaInicio || data.fecha_inicio || data.startDate || data.fecha;

        const progDate = t.fecha_programada || t.fechaProg || t.fecha_limite || t.deadline || projectDeadline || projectStartDate || "";
        const limitDate = t.fecha_limite || t.fechaEntrega || t.deadline || projectDeadline || progDate || "";

        return {
          id: Number(t.id) || t.id || Date.now() + index,
          title: t.titulo || t.title || "Tarea sin título",
          desc: t.contenido || t.desc || t.descripcion || "",
          format: t.formato || t.format || "Post",
          formato: t.formato || t.format || "Post",
          time: t.esfuerzo || t.time || t.tiempoEstimado || "30 min",
          status: rawStatus as any,
          statusColor,
          subtasks: t.subtasks || [],
          sessions: t.sessions || [],
          fecha_programada: progDate,
          fechaProg: progDate,
          fecha_limite: limitDate,
          fechaEntrega: limitDate,
          deadline: limitDate,
          fecha_creacion: t.fecha_creacion || t.createdAt || t.created_at || t.created || "",
          color: t.color || projColorObj.hslCss,
          priority: t.prioridad || t.priority || "Media",
          asignado_id: t.asignado_id || (t.asignado_ids?.[0]),
          asignado_ids: t.asignado_ids || (t.asignado_id ? [t.asignado_id] : []),
          asignado: t.asignado,
          copywriting: t.copywriting,
          copy: t.copy,
          fechaPublicacion: t.fechaPublicacion,
          attachmentUrl: t.attachmentUrl || t.recursosDrive,
          recursosDrive: t.attachmentUrl || t.recursosDrive,
          kanbanOrders: t.kanbanOrders || {},
        } as Task;
      });

      let clientName = data.client || data.cliente || "Brandex";
      const possibleClientId = data.cliente_id || (data.cliente_ids && data.cliente_ids[0]);
      if (possibleClientId && clientMap.has(String(possibleClientId))) {
        clientName = clientMap.get(String(possibleClientId))!;
      }

      const rawPresupuesto = data.costo !== undefined && data.costo !== null
        ? Number(data.costo)
        : (data.presupuesto !== undefined ? Number(data.presupuesto) : 0);

      const resolvedCustomColor = (data.customColor && typeof data.customColor.h === "number")
        ? data.customColor
        : { h: projColorObj.h, s: projColorObj.s, l: projColorObj.l };

      return {
        ...data,
        id: data.id,
        title: data.nombre || data.name || data.title || "Sin título",
        client: clientName,
        cliente_id: possibleClientId || null,
        cliente_ids: data.cliente_ids || (possibleClientId ? [String(possibleClientId)] : []),
        desc: data.descripcion || data.desc || "",
        progress: "0%",
        percent: "0%",
        gradient: data.gradient || projColorObj.hslCss,
        glow: data.glow || projColorObj.hslCss,
        color: data.color || projColorObj.hslCss,
        customColor: resolvedCustomColor,
        customGradientStyle: data.customGradientStyle || projColorObj.hslCss,
        customGlowStyle: data.customGlowStyle || projColorObj.hslCss,
        package: data.area || data.tipo || data.paquete || "General",
        status: data.estadoProyecto || data.estado || data.status || "Planificación",
        estadoProyecto: data.estadoProyecto || data.estado || data.status || "Planificación",
        priority: data.prioridad || data.priority || "Media",
        cost: `$${rawPresupuesto}`,
        costo: rawPresupuesto,
        startDate: data.fechaInicio || data.startDate || "",
        deadline: data.fechaFin || data.deadlineRaw || data.deadline || "",
        fechaInicio: data.fechaInicio || data.startDate || "",
        fechaFin: data.fechaFin || data.deadlineRaw || data.deadline || "",
        tasks: projTasks,
      } as unknown as Project;
    });

    const evaluated = mappedProjects.map(autoEvaluateProjectStatus);
    setProjects(evaluated);
  }, [firestoreData, isMaster]);

  // Inicialización dinámica de saludo
  useEffect(() => {
    if (!isAuthReady || !role || !workspaceId) return;

    if (!isMaster) {
      setActiveTab("home");
    }

    const dynamicGreeting = getDynamicGreeting(currentUserName);
    setSessionGreetingObj(dynamicGreeting);
  }, [isAuthReady, role, workspaceId, isMaster, currentUserName]);

  const deleteProject = async (id: number | string) => {
    try {
      const projIdStr = String(id);
      const scopedProjectsCol = getWorkspaceScopedCol("projects", workspaceId, isMaster);
      const scopedV3Col = getWorkspaceScopedCol("v3_projects", workspaceId, isMaster);
      const scopedTasksCol = getWorkspaceScopedCol("tasks", workspaceId, isMaster);

      await deleteDoc(doc(db, scopedV3Col, projIdStr)).catch(() => {});
      await deleteDoc(doc(db, scopedProjectsCol, projIdStr)).catch(() => {});
      if (isMaster) {
        await deleteDoc(doc(db, "v3_projects", projIdStr)).catch(() => {});
        await deleteDoc(doc(db, "projects", projIdStr)).catch(() => {});
      }

      try {
        const tasksSnap = await getDocs(collection(db, scopedTasksCol));
        const deletePromises: Promise<void>[] = [];
        tasksSnap.docs.forEach((tDoc) => {
          const tData = tDoc.data();
          if (String(tData.project_id) === projIdStr || String(tData.proyecto_id) === projIdStr) {
            deletePromises.push(deleteDoc(tDoc.ref));
          }
        });
        await Promise.all(deletePromises);
      } catch (tErr) {
        console.error("Error purging associated tasks from Firestore:", tErr);
      }

      qc.invalidateQueries({ queryKey: ["taski-firestore-data"] });
      
      setProjects(prev => {
        const next = prev.filter(p => p.id !== id);
        if (activeProject === id) {
          if (next.length > 0) {
            setActiveProject(next[0].id);
          } else {
            setActiveProject("");
          }
        }
        localStorage.setItem('taski_projects', JSON.stringify(next));
        return next;
      });
      playSound('trash');
    } catch (err) {
      console.error("Error deleting project from Firestore:", err);
    }
  };

  const addNewProjectFromModal = async (data: ProjectData) => {
    const newId = Math.max(...projects.map(p => p.id), 0) + 1;
    
    let statusColor = "bg-sky-500/10 border-sky-500/30 text-sky-500";
    if (data.status === "Activo") statusColor = "bg-violet-500/10 border-violet-500/30 text-violet-400";
    else if (data.status === "Revisión") statusColor = "bg-amber-500/10 border-amber-500/30 text-amber-400";
    else if (data.status === "Completado") statusColor = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
    else if (data.status === "Pausado") statusColor = "bg-rose-500/10 border-rose-500/30 text-rose-400";
    
    const totalTasks = data.tasks.length;
    const completedTasks = data.tasks.filter(t => t.status === "Completado").length;
    const progress = `${completedTasks} de ${totalTasks} tareas`;
    const percent = totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}%` : "0%";
    
    const newProject: Project = {
      id: newId,
      title: data.title,
      client: data.client,
      package: data.package,
      desc: data.desc,
      progress,
      percent,
      gradient: data.gradient,
      glow: data.glow,
      status: data.status,
      statusColor,
      burnRate: data.burnRate,
      startDate: data.startDate,
      deadline: data.deadline,
      startDateRaw: data.startDateRaw,
      deadlineRaw: data.deadlineRaw,
      fechaInicio: data.fechaInicio || data.startDateRaw,
      fechaFin: data.fechaFin || data.deadlineRaw,
      daysRemaining: data.daysRemaining,
      briefCore: data.desc || "Escribe el core brief aquí.",
      priority: data.priority,
      cost: data.cost,
      customColor: data.customColor || getInitialHSL(data.gradient),
      customGradientStyle: data.customGradientStyle || (() => { const { h, s, l } = getInitialHSL(data.gradient); return `hsl(${h}, ${s}%, ${l}%)`; })(),
      customGlowStyle: data.customGlowStyle || (() => { const { h, s, l } = getInitialHSL(data.gradient); return `hsl(${h}, ${s}%, ${l}%)`; })(),
      tasks: data.tasks.map(t => ({
        ...t,
        fecha_limite: t.fecha_limite || data.deadlineRaw || (data.deadline && /^\d{4}-\d{2}-\d{2}$/.test(data.deadline) ? data.deadline : undefined),
        deadline: t.deadline || data.deadlineRaw || (data.deadline && /^\d{4}-\d{2}-\d{2}$/.test(data.deadline) ? data.deadline : undefined),
        statusColor: t.status === "Completado" 
          ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
          : t.status === "En Proceso"
            ? "bg-amber-500/20 border-amber-500/30 text-amber-400"
            : t.status === "En Revisión" || (t.status as any) === "Revisión"
              ? "bg-purple-500/20 border-purple-500/30 text-purple-400"
              : "bg-slate-500/20 border-slate-500/30 text-slate-300"
      }))
    };
    
    setProjects(prev => [newProject, ...prev]);
    setActiveProject(newId);

    try {
      const scopedProjectsCol = getWorkspaceScopedCol("projects", workspaceId, isMaster);
      const scopedV3Col = getWorkspaceScopedCol("v3_projects", workspaceId, isMaster);
      const scopedTasksCol = getWorkspaceScopedCol("tasks", workspaceId, isMaster);

      await setDoc(doc(db, scopedV3Col, String(newId)), newProject);

      const nativeProject = {
        id: String(newId),
        nombre: newProject.title,
        title: newProject.title,
        client: newProject.client,
        cliente: newProject.client,
        package: newProject.package || "",
        tipo_proyecto: newProject.package || "",
        desc: newProject.desc || "",
        status: newProject.status || "Activo",
        estado: newProject.status || "Activo",
        cost: newProject.cost || "",
        precio: newProject.cost || "",
        startDate: newProject.startDate || "Hoy",
        deadline: newProject.deadline || "Sin Fecha",
        fecha_creacion: new Date().toISOString(),
        customColor: newProject.customColor,
        gradient: newProject.gradient,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };
      await setDoc(doc(db, scopedProjectsCol, String(newId)), nativeProject);
      if (isMaster) {
        await setDoc(doc(db, "projects", String(newId)), nativeProject).catch(() => {});
      }

      if (newProject.tasks && newProject.tasks.length > 0) {
        for (const t of newProject.tasks) {
          const nativeTask = {
            id: String(t.id),
            title: t.title || (t as any).text || "Tarea sin título",
            nombre: t.title || (t as any).text || "Tarea sin título",
            project_id: String(newId),
            proyecto_id: String(newId),
            client: newProject.client,
            cliente: newProject.client,
            format: t.format || "Sin formato",
            formato: t.formato || t.format || "Sin formato",
            time: t.time || "Sin tiempo",
            duracion: t.time || "Sin tiempo",
            status: t.status || "Planificado",
            estado: t.status || "Planificado",
            done: (t as any).done || false,
            fecha_creacion: new Date().toISOString(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
          };
          await setDoc(doc(db, scopedTasksCol, String(t.id)), nativeTask);
          if (isMaster) {
            await setDoc(doc(db, "tasks", String(t.id)), nativeTask).catch(() => {});
          }
        }
      }

      qc.invalidateQueries({ queryKey: ["taski-firestore-data"] });
    } catch (e) {
      console.error("Error creating project in Firestore:", e);
    }
    
    setShowNewProjectModal(false);
    playSound('pop');
  };

  const getProjectTimestamp = (p: Project): number => {
    const dateStr = p.fecha_creacion || (p as any).createdAt || (p as any).created_at || p.startDate;
    if (!dateStr) return typeof p.id === "number" ? p.id : 0;
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.getTime();
    return typeof p.id === "number" ? p.id : 0;
  };

  const sortedProjects = [...projects].sort((a, b) => getProjectTimestamp(b) - getProjectTimestamp(a));

  if (!isAuthReady) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#181817] text-white select-none">
        <div className="w-10 h-10 relative flex items-center justify-center mb-4 animate-pulse">
          <Image src="/taski-icon.png" alt="Taski" width={40} height={40} className="object-contain" priority />
        </div>
        <div className="flex items-center gap-2 text-xs text-white/40">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#3a7bd5]" />
          <span>Verificando acceso al workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      isNightMode={isNightMode}
      sidebar={
        <TaskiSidebar
          isMenuOpen={isMenuOpen}
          setIsMenuOpen={setIsMenuOpen}
          activeTab={activeTab}
          onSelectTab={(tab) => {
            if (tab === "proyectos") {
              setActiveProject(null);
            }
            setActiveTab(tab);
            playSound("click");
          }}
          onNewProject={(originRect) => {
            setProjectModalOriginRect(originRect || null);
            setEditingProjectModal(null);
            setShowNewProjectModal(true);
            playSound("click");
          }}
          recentProjects={sortedProjects}
          onSelectProject={(projId) => {
            setActiveProject(projId);
            setActiveTab("proyectos");
          }}
          userName={currentUserName}
          workspaceId={workspaceId || ""}
          isMaster={isMaster}
          onLogout={handleLogout}
          onCopyWorkspaceKey={handleCopyWorkspaceKey}
          copiedKey={copiedKey}
          isFeatureVisible={isFeatureVisible}
        />
      }
      topbar={
        <TaskiTopbar
          activeTab={activeTab}
          greetingTitle={sessionGreetingObj.title}
          greetingSubtitle={sessionGreetingObj.subtitle}
          isNightMode={isNightMode}
          homeView={homeView}
          setHomeView={setHomeView}
          previousHomeView={previousHomeView}
          setPreviousHomeView={setPreviousHomeView}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          groupingMode={groupingMode}
          onSetGroupingMode={handleSetGroupingMode}
          timelineHideCompleted={timelineHideCompleted}
          onToggleTimelineHideCompleted={handleToggleTimelineHideCompleted}
          timelineSortBy={timelineSortBy}
          onSetTimelineSortBy={handleSetTimelineSortBy}
        />
      }
      sidePanel={
        activeSideTask ? (
          <TaskSidePanel
            task={activeSideTask}
            projects={projects}
            isOpen={!!activeSideTask}
            onClose={() => setActiveSideTask(null)}
            onSelectTask={(nextTask) => {
              setActiveSideTask(nextTask);
              setEditingTaskModal(nextTask);
            }}
            onSelectProject={(projId) => {
              setActiveProject(projId);
              setActiveTab("proyectos");
              setActiveSideTask(null);
              playSound("click");
            }}
            onNewTask={(projId) => {
              setEditingTaskModal(null);
              setNewTaskDefaultProjectId(projId);
              setShowNewTaskModal(true);
              playSound('pop');
            }}
            onCreateTask={(newTask, targetProjId) => {
              setProjects((prev) =>
                prev.map((p) => {
                  if (String(p.id) !== String(targetProjId)) return p;
                  const updatedTasks = [...(p.tasks || []), newTask];
                  const evalProj = autoEvaluateProjectStatus({ ...p, tasks: updatedTasks });
                  persistProjectUpdate(p.id, {
                    tasks: evalProj.tasks,
                    status: evalProj.status,
                    progress: evalProj.progress,
                    percent: evalProj.percent,
                  });
                  return evalProj;
                })
              );
            }}
            onUpdateTask={(taskId, updatedData, pId) => {
              playSound('pop');
              setActiveSideTask((prev) => {
                if (!prev) return null;
                const prevId = String(prev.id);
                const tId = String(taskId);
                if (prevId !== tId && extractCleanTaskId(prevId) !== extractCleanTaskId(tId)) return prev;
                return {
                  ...prev,
                  ...updatedData,
                };
              });

              setProjects((prev) =>
                prev.map((p) => {
                  const hasTask = (p.tasks || []).some((t) => String(t.id) === String(taskId));
                  if (!hasTask && String(p.id) !== String(pId)) return p;

                  const updatedTasks = (p.tasks || []).map((t) => {
                    if (String(t.id) !== String(taskId)) return t;
                    const nextStatus = updatedData.status || (updatedData as any).estado || t.status;
                    return {
                      ...t,
                      ...updatedData,
                      status: nextStatus as any,
                      estado: nextStatus as any,
                    };
                  });

                  const evalProj = autoEvaluateProjectStatus({ ...p, tasks: updatedTasks });
                  persistProjectUpdate(p.id, {
                    tasks: evalProj.tasks,
                    status: evalProj.status,
                    progress: evalProj.progress,
                    percent: evalProj.percent,
                  });
                  return evalProj;
                })
              );
            }}
            onDeleteTask={async (taskId, pId) => {
              playSound('trash');
              setProjects((prev) =>
                prev.map((p) => {
                  const hasTask = (p.tasks || []).some((t) => String(t.id) === String(taskId));
                  if (!hasTask && String(p.id) !== String(pId)) return p;

                  const updatedTasks = (p.tasks || []).filter((t) => String(t.id) !== String(taskId));
                  const evalProj = autoEvaluateProjectStatus({ ...p, tasks: updatedTasks });
                  persistProjectUpdate(p.id, {
                    tasks: evalProj.tasks,
                    status: evalProj.status,
                    progress: evalProj.progress,
                    percent: evalProj.percent,
                  });
                  return evalProj;
                })
              );

              try {
                await deleteTask.mutateAsync(String(taskId));
              } catch (e) {
                console.error("Error deleting task in Firestore:", e);
              }
              setActiveSideTask(null);
            }}
            isNightMode={isNightMode}
          />
        ) : undefined
      }
      modals={
        <>
          <NewProjectModal
            isOpen={showNewProjectModal}
            onClose={() => {
              setShowNewProjectModal(false);
            }}
            onCreateProject={addNewProjectFromModal}
            onDeleteProject={deleteProject}
            editingProject={editingProjectModal}
            originRect={projectModalOriginRect}
            onUpdateProject={(projId, updatedData) => {
              setProjects((prev) =>
                prev.map((p) => {
                  if (String(p.id) !== String(projId)) return p;
                  const updatedTasks = updatedData.tasks !== undefined ? updatedData.tasks : p.tasks;
                  const evalProj = autoEvaluateProjectStatus({
                    ...p,
                    ...updatedData,
                    tasks: updatedTasks
                  });
                  const cObj = getSingleSourceProjectColor(evalProj);
                  persistProjectUpdate(p.id, {
                    title: evalProj.title,
                    client: evalProj.client,
                    package: evalProj.package,
                    desc: evalProj.briefCore || evalProj.desc,
                    status: evalProj.status,
                    tasks: evalProj.tasks,
                    color: (updatedData as any).color || (evalProj as any).color || cObj.hslCss,
                    colorName: (updatedData as any).colorName,
                    gradient: evalProj.gradient,
                    glow: evalProj.glow,
                    customColor: evalProj.customColor || { h: cObj.h, s: cObj.s, l: cObj.l },
                    customGradientStyle: evalProj.customGradientStyle || cObj.hslCss,
                    customGlowStyle: evalProj.customGlowStyle || cObj.hslCss,
                    statusColor: evalProj.statusColor,
                    progress: evalProj.progress,
                    percent: evalProj.percent,
                    startDate: evalProj.startDate,
                    deadline: evalProj.deadline,
                    startDateRaw: (evalProj as any).startDateRaw,
                    deadlineRaw: (evalProj as any).deadlineRaw,
                    fechaInicio: (evalProj as any).fechaInicio || (evalProj as any).startDateRaw,
                    fechaFin: (evalProj as any).fechaFin || (evalProj as any).deadlineRaw
                  } as any);
                  return evalProj;
                })
              );
              setShowNewProjectModal(false);
              playSound('pop');
            }}
            projects={projects}
            onSelectProject={(projId) => {
              setActiveProject(projId);
              setActiveTab("proyectos");
              setShowNewProjectModal(false);
              playSound('click');
            }}
            isNightMode={isNightMode}
            isNeumorphic={isNeumorphic}
          />

          <NewTaskModal
            isOpen={showNewTaskModal}
            onClose={() => {
              setShowNewTaskModal(false);
            }}
            onCreateTask={async (taskData) => {
              playSound('pop');
              const targetProjId = taskData.projectId || (projects[0]?.id ? String(projects[0].id) : undefined);
              if (!targetProjId) return;

              const newTask: Task = {
                id: typeof taskData.id === "number" ? taskData.id : Date.now(),
                title: taskData.title,
                desc: taskData.desc || "",
                format: taskData.format || "Sin formato",
                formato: taskData.formato || null,
                time: taskData.time || "1 hora",
                status: taskData.status || "Planificado",
                statusColor: "bg-slate-500/20 border-slate-500/30 text-slate-300",
                subtasks: taskData.subtasks || [],
                deadline: taskData.deadline,
                fecha_limite: taskData.fecha_limite || taskData.deadline,
                fecha_programada: taskData.fecha_programada || taskData.startDate,
                fecha_creacion: taskData.fecha_creacion || new Date().toISOString().split("T")[0],
                color: taskData.color,
                asignado_id: taskData.asignado_id,
                asignado_ids: taskData.asignado_ids,
                asignado: taskData.asignado,
                copywriting: taskData.copywriting,
                copy: taskData.copy,
                fechaPublicacion: taskData.fechaPublicacion,
                attachmentUrl: taskData.attachmentUrl || taskData.recursosDrive
              };

              setProjects(prev =>
                prev.map(p => {
                  if (String(p.id) !== String(targetProjId)) return p;
                  const updatedTasks = [...(p.tasks || []), newTask];
                  const evalProj = autoEvaluateProjectStatus({ ...p, tasks: updatedTasks });
                  persistProjectUpdate(p.id, {
                    tasks: evalProj.tasks,
                    status: evalProj.status,
                    progress: evalProj.progress,
                    percent: evalProj.percent
                  });
                  return evalProj;
                })
              );

              try {
                await createTask.mutateAsync({
                  titulo: taskData.title,
                  descripcion: taskData.desc || "",
                  formato: taskData.formato || taskData.format || "Post",
                  esfuerzo: taskData.time || "1h",
                  estado: taskData.status || "Planificado",
                  prioridad: (taskData as any).priority || "Media",
                  proyecto_id: targetProjId,
                  proyecto_ids: [targetProjId],
                  asignado_id: taskData.asignado_id,
                  asignado_ids: taskData.asignado_ids,
                  fecha_programada: taskData.fecha_programada || taskData.startDate,
                  fecha_limite: taskData.fecha_limite || taskData.deadline,
                  subtasks: taskData.subtasks || [],
                } as any);
              } catch (e) {
                console.error("Error creating task in Firestore:", e);
              }

              setShowNewTaskModal(false);
            }}
            onUpdateTask={async (taskId, updatedData, pId) => {
              playSound('pop');
              setProjects(prev =>
                prev.map(p => {
                  const hasTask = (p.tasks || []).some(t => String(t.id) === String(taskId));
                  if (!hasTask && String(p.id) !== String(pId)) return p;

                  const updatedTasks = (p.tasks || []).map(t => {
                    if (String(t.id) !== String(taskId)) return t;
                    return {
                      ...t,
                      title: updatedData.title !== undefined ? updatedData.title : t.title,
                      desc: updatedData.desc !== undefined ? updatedData.desc : t.desc,
                      format: updatedData.format !== undefined ? updatedData.format : t.format,
                      formato: updatedData.formato !== undefined ? updatedData.formato : t.formato,
                      time: updatedData.time !== undefined ? updatedData.time : t.time,
                      status: updatedData.status !== undefined ? updatedData.status : t.status,
                      priority: updatedData.priority !== undefined ? updatedData.priority : t.priority,
                      deadline: updatedData.deadline !== undefined ? updatedData.deadline : t.deadline,
                      fecha_limite: updatedData.fecha_limite !== undefined ? updatedData.fecha_limite : t.fecha_limite,
                      fecha_programada: updatedData.fecha_programada !== undefined ? updatedData.fecha_programada : t.fecha_programada,
                      color: updatedData.color !== undefined ? updatedData.color : t.color,
                      asignado_id: updatedData.asignado_id !== undefined ? updatedData.asignado_id : t.asignado_id,
                      asignado_ids: updatedData.asignado_ids !== undefined ? updatedData.asignado_ids : t.asignado_ids,
                      asignado: updatedData.asignado !== undefined ? updatedData.asignado : t.asignado,
                      copywriting: updatedData.copywriting !== undefined ? updatedData.copywriting : t.copywriting,
                      copy: updatedData.copy !== undefined ? updatedData.copy : t.copy,
                      fechaPublicacion: updatedData.fechaPublicacion !== undefined ? updatedData.fechaPublicacion : t.fechaPublicacion,
                      subtasks: updatedData.subtasks !== undefined ? updatedData.subtasks : t.subtasks,
                      attachmentUrl: updatedData.attachmentUrl !== undefined ? updatedData.attachmentUrl : t.attachmentUrl,
                      recursosDrive: updatedData.recursosDrive !== undefined ? updatedData.recursosDrive : t.recursosDrive
                    };
                  });

                  const evalProj = autoEvaluateProjectStatus({ ...p, tasks: updatedTasks });
                  persistProjectUpdate(p.id, {
                    tasks: evalProj.tasks,
                    status: evalProj.status,
                    progress: evalProj.progress,
                    percent: evalProj.percent
                  });
                  return evalProj;
                })
              );

              try {
                await updateTask.mutateAsync({
                  id: String(taskId),
                  ...(updatedData.title !== undefined ? { titulo: updatedData.title } : {}),
                  ...(updatedData.desc !== undefined ? { descripcion: updatedData.desc } : {}),
                  ...(updatedData.status !== undefined ? { estado: updatedData.status, status: updatedData.status } : {}),
                  ...(updatedData.priority !== undefined ? { prioridad: updatedData.priority } : {}),
                  ...(updatedData.formato !== undefined || updatedData.format !== undefined ? { formato: updatedData.formato || updatedData.format } : {}),
                  ...(updatedData.time !== undefined ? { esfuerzo: updatedData.time } : {}),
                  ...(updatedData.fecha_programada !== undefined ? { fechaProg: updatedData.fecha_programada } : {}),
                  ...(updatedData.fecha_limite !== undefined ? { fechaEntrega: updatedData.fecha_limite } : {}),
                  ...(updatedData.asignado_id !== undefined ? { asignado_id: updatedData.asignado_id } : {}),
                  ...(updatedData.asignado_ids !== undefined ? { asignado_ids: updatedData.asignado_ids } : {}),
                  ...(updatedData.subtasks !== undefined ? { subtasks: updatedData.subtasks } : {}),
                } as any);
              } catch (e) {
                console.error("Error updating task in Firestore:", e);
              }

              setShowNewTaskModal(false);
            }}
            onDeleteTask={async (taskId, pId) => {
              playSound('trash');
              setProjects(prev =>
                prev.map(p => {
                  const hasTask = (p.tasks || []).some(t => String(t.id) === String(taskId));
                  if (!hasTask && String(p.id) !== String(pId)) return p;

                  const updatedTasks = (p.tasks || []).filter(t => String(t.id) !== String(taskId));
                  const evalProj = autoEvaluateProjectStatus({ ...p, tasks: updatedTasks });
                  persistProjectUpdate(p.id, {
                    tasks: evalProj.tasks,
                    status: evalProj.status,
                    progress: evalProj.progress,
                    percent: evalProj.percent
                  });
                  return evalProj;
                })
              );

              try {
                await deleteTask.mutateAsync(String(taskId));
              } catch (e) {
                console.error("Error deleting task in Firestore:", e);
              }

              setShowNewTaskModal(false);
            }}
            editingTask={editingTaskModal}
            projects={projects}
            defaultProjectId={newTaskDefaultProjectId}
            originRect={taskModalOriginRect}
            isNightMode={isNightMode}
          />
        </>
      }
    >
      {/* Dynamic Active Tab Content — Bloqueado y con Scroll Localizado */}
      <div className="w-full h-full min-h-0 min-w-0 overflow-hidden relative">
        {activeTab === "inicio" && <InicioDashboard />}

        {activeTab === "home" && (
          <HomeDashboard
            projects={projects}
            onSelectTab={(tab) => setActiveTab(tab)}
            onSelectProject={(projectId, originRect) => {
              const targetProject = projects.find((p) => String(p.id) === String(projectId));
              if (targetProject) {
                setActiveProject(targetProject.id);
                setEditingProjectModal(targetProject);
                setProjectModalOriginRect(originRect || null);
                setShowNewProjectModal(true);
                playSound('click');
              } else {
                setActiveProject(projectId);
                setActiveTab("proyectos");
              }
            }}
            onSelectTask={(task, projectId, originRect) => {
              const parentProj = projects.find((p) => String(p.id) === String(projectId));
              const fullTaskData = {
                ...task,
                projectId: projectId || (task as any).projectId || parentProj?.id,
                projectName: parentProj?.title || (task as any).projectName,
                client: parentProj?.client || (task as any).client || "Brandex",
              };
              setActiveSideTask(fullTaskData);
              setEditingTaskModal(fullTaskData);
              setTaskModalOriginRect(originRect || null);
              playSound('click');
            }}
            isNeumorphic={isNeumorphic}
            isNightMode={isNightMode}
            activeView={homeView}
            onViewChange={setHomeView}
            viewFilterMode={viewFilterMode}
            groupingMode={groupingMode}
            onUpdateProjects={setProjects}
            isHomeEditMode={isHomeEditMode}
            onDeleteProject={deleteProject}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            timelineHideCompleted={timelineHideCompleted}
            onToggleTimelineHideCompleted={handleToggleTimelineHideCompleted}
            timelineSortBy={timelineSortBy}
            onSetTimelineSortBy={handleSetTimelineSortBy}
          />
        )}

        {activeTab === "proyectos" && (
          <ProjectsView
            selectedProjectId={activeProject}
            onClearSelectedProject={() => setActiveProject(null)}
            onCreateProject={(originRect) => {
              setEditingProjectModal(null);
              setProjectModalOriginRect(originRect || null);
              setShowNewProjectModal(true);
              playSound('click');
            }}
          />
        )}

        {activeTab === "equipo" && (
          <TeamDashboard 
            projects={projects}
            onUpdateProjects={setProjects}
            isNeumorphic={isNeumorphic}
            isNightMode={isNightMode}
          />
        )}

        {activeTab === "clientes" && (
          <ClientsDashboard 
            projects={projects}
            onUpdateProjects={setProjects}
            defaultToFirstClient={false}
            onSelectProject={(projId) => {
              const targetProject = projects.find((p) => String(p.id) === String(projId));
              if (targetProject) {
                setActiveProject(targetProject.id);
                setEditingProjectModal(targetProject);
                setShowNewProjectModal(true);
                playSound('click');
              } else {
                setActiveProject(projId);
                setActiveTab("proyectos");
              }
            }}
            onCreateProject={(preselectedClientId) => {
              setEditingProjectModal(null);
              setShowNewProjectModal(true);
              playSound('pop');
            }}
            isNeumorphic={isNeumorphic}
            isNightMode={isNightMode}
          />
        )}

        {activeTab === "finanzas" && (
          <FinanzasGlobalesDashboard 
            onSelectClient={(clientId) => {
              setActiveTab("clientes");
              playSound('click');
            }}
          />
        )}

        {activeTab === "recursos" && (
          <PlaceholderView
            title="Biblioteca de Recursos"
            icon={Database}
            description="Repositorio central de assets de marca, guías maestras y bases de conocimiento."
          />
        )}

        {activeTab === "crm" && (
          <PlaceholderView
            title="Gestión CRM"
            icon={Handshake}
            description="Seguimiento de prospectos, clientes potenciales y pipeline comercial."
          />
        )}

        {activeTab === "propuestas" && (
          <PlaceholderView
            title="Propuestas Comerciales"
            icon={FileText}
            description="Módulo de cotizaciones, presupuestos y pitches estratégicos para clientes."
          />
        )}

        {activeTab === "diagramas" && <DiagramsView />}

        {activeTab === "superadmin" && <SuperAdminView />}
      </div>
    </AppLayout>
  );
}
