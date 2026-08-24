"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Home, Folder, Users, Briefcase, DollarSign, Settings, TrendingUp, ArrowUpRight, Wallet, Activity, Sun, Moon, Search, LayoutGrid, Table, CalendarDays, SquarePen, SlidersHorizontal, Archive, Layers, ChevronDown, Bell, Plus, Trash2, Loader2, X, PanelLeftOpen, Kanban, ListFilter, Database, ChevronRight, ChevronLeft, MoreHorizontal, ArrowRight, User, LogOut, KeyRound, Check, ShieldAlert, Rocket } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { collection, getDocs, doc, setDoc, deleteDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { ProjectDashboard, Project, Task } from "./components/ProjectDashboard";
import NewProjectModal, { ProjectData } from "./components/NewProjectModal";
import NewTaskModal, { TaskData } from "./components/NewTaskModal";
import { playSound } from "./utils/audio";
import { INITIAL_PROJECTS, getDynamicProgress, autoEvaluateProjectStatus } from "./utils/data";
import TimeHeatmap from "./components/TimeHeatmap";
import { TeamDashboard } from "./components/TeamDashboard";
import { ClientsDashboard } from "./components/ClientsDashboard";
import { HomeDashboard } from "./components/HomeDashboard";
import { InicioDashboard } from "./components/InicioDashboard";
import { ProjectsView } from "@/components/views/ProjectsView";
import { SuperAdminView } from "@/components/views/SuperAdminView";
import { useSystemFeatures } from "@/hooks/useSystemFeatures";
import { GlobalNav } from "@/components/navigation/GlobalNav";
import { FinanzasGlobalesDashboard } from "./components/FinanzasGlobalesDashboard";
import { SaveStatusBadge } from "./components/SaveStatusBadge";
import { persistProjectUpdate } from "./utils/persist";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { getSingleSourceProjectColor, PROJECT_COLOR_PALETTE, getDynamicGreeting, getWorkspaceScopedCol } from "@/lib/utils";
import { useAuthStore } from "@/lib/store";

interface TaskSession {
  id: number;
  date: string;
  hours: number;
}

const seedSessionsForTasks = (tasksList: Task[]): Task[] => {
  return tasksList.map((task) => {
    if (task.sessions && task.sessions.length > 0) {
      return task;
    }
    
    const sessions: TaskSession[] = [];
    let sessionId = 1;
    
    // Generate dates for the past 30 days
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const hash = (task.id * 17 + i * 31) % 100;
      const probability = task.status === 'Completado' ? 45 : task.status === 'En Proceso' ? 35 : 8;
      
      if (hash < probability) {
        const hours = Math.round((0.5 + ((hash % 9) * 0.5)) * 10) / 10;
        sessions.push({
          id: sessionId++,
          date: dateStr,
          hours
        });
      }
    }
    return { ...task, sessions };
  });
};

const seedProjectsWithSessions = (projectsList: Project[]): Project[] => {
  return projectsList.map((project) => {
    const tasks = project.tasks || [];
    const tasksWithSessions = seedSessionsForTasks(tasks);
    
    const totalSpentHours = tasksWithSessions.reduce((acc: number, t: Task) => {
      const taskSessionsSum = t.sessions?.reduce((sum: number, s: TaskSession) => sum + s.hours, 0) || 0;
      return acc + taskSessionsSum;
    }, 0);
    
    let plannedHours = 40;
    if (project.burnRate) {
      const parts = project.burnRate.split('/');
      if (parts.length > 1) {
        const plannedMatch = parts[1].match(/(\d+)/);
        if (plannedMatch) {
          plannedHours = parseInt(plannedMatch[1], 10);
        }
      }
    }
    
    const newBurnRate = `${Math.round(totalSpentHours)}h / ${plannedHours}h`;
    
    return {
      ...project,
      tasks: tasksWithSessions,
      burnRate: newBurnRate
    };
  });
};

const COLOR_PRESETS = PROJECT_COLOR_PALETTE.map((item) => ({
  name: item.name,
  h: item.h,
  s: item.s,
  l: item.l
}));

function getInitialHSL(gradient: string): { h: number; s: number; l: number } {
  const { h, s, l } = getSingleSourceProjectColor({ gradient });
  return { h, s, l };
}

function getProjectHSL(project: Project): { h: number; s: number; l: number } {
  const { h, s, l } = getSingleSourceProjectColor(project);
  return { h, s, l };
}

function getProjectBgColor(project: Project): string {
  return getSingleSourceProjectColor(project).hslCss;
}

export default function BrandexV3Page() {
  const router = useRouter();
  const role = useAuthStore((s) => s.role);
  const token = useAuthStore((s) => s.token);
  const workspaceId = useAuthStore((s) => s.workspaceId);
  const isMaster = workspaceId === "brandex-master" || workspaceId === "ws_159789" || workspaceId === "159789";

  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    if (!role || !token || !workspaceId) {
      router.replace("/");
      return;
    }
    setIsAuthReady(true);
  }, [role, token, workspaceId, router]);

  const [activeTab, setActiveTab] = useState(() => (isMaster ? "inicio" : "home"));
  const [isMoreExpanded, setIsMoreExpanded] = useState(false);
  const [homeView, setHomeView] = useState<"buscar" | "kanban" | "tabla" | "timeline">("kanban");
  const [previousHomeView, setPreviousHomeView] = useState<"kanban" | "tabla" | "timeline">("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
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
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);
  const [isHomeEditMode, setIsHomeEditMode] = useState(false);
  const [notificationCount, setNotificationCount] = useState(3);
  const [isNightMode, setIsNightMode] = useState(true);

  useEffect(() => {
    const savedMode = localStorage.getItem("taski_is_night_mode");
    if (savedMode !== null) {
      setIsNightMode(savedMode === "true");
    }
  }, []);

  const toggleNightMode = () => {
    playSound('click');
    const nextMode = !isNightMode;
    setIsNightMode(nextMode);
    localStorage.setItem("taski_is_night_mode", String(nextMode));
  };
  const isNeumorphic = true;
  const isSearchActive = activeTab === "home" && homeView === "buscar";
  const [activeProject, setActiveProject] = useState<string | number>(1);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const lastScrollIndexRef = useRef<number>(0);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [editingProjectModal, setEditingProjectModal] = useState<Project | null>(null);
  const [projectModalOriginRect, setProjectModalOriginRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [editingTaskModal, setEditingTaskModal] = useState<(Partial<Task> & { projectId?: string | number; projectName?: string; client?: string }) | null>(null);
  const [newTaskDefaultProjectId, setNewTaskDefaultProjectId] = useState<string | number | undefined>(undefined);
  const [taskModalOriginRect, setTaskModalOriginRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    // Each card is 140px height + 24px gap = 164px total
    const index = Math.round(scrollTop / 164);
    if (index !== lastScrollIndexRef.current) {
      lastScrollIndexRef.current = index;
      playSound('tick');
    }
  };

  useEffect(() => {
    setCurrentTime(new Date());
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);



  // Format date and time
  const dateStr = currentTime ? currentTime.toLocaleDateString("es-ES", { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).replace(/,/g, '') : "";
  const timeStr = currentTime ? currentTime.toLocaleTimeString("es-ES", { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "";

  // Greeting based on hour
  const hour = currentTime?.getHours() || 12;
  let greeting = "Buenos días";
  if (hour >= 12 && hour < 19) greeting = "Buenas tardes";
  else if (hour >= 19) greeting = "Buenas noches";

  const authUserName = useAuthStore((s) => s.userName);
  const currentUserName =
    authUserName && authUserName.toLowerCase() !== "malebar"
      ? authUserName
      : (isMaster ? "Feiko" : "Usuario");

  const [projects, setProjects] = useState<Project[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [sessionGreetingObj, setSessionGreetingObj] = useState<{ title: string; subtitle: string }>({
    title: `Buenos días, ${currentUserName}`,
    subtitle: "bienvenido de nuevo",
  });
  const [hoveredMenuItem, setHoveredMenuItem] = useState<string | null>(null);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [showAllProjectsList, setShowAllProjectsList] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const logout = useAuthStore((s) => s.logout);
  const { isFeatureVisible } = useSystemFeatures();
  const qc = useQueryClient();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    if (isUserMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUserMenuOpen]);

  const handleLogout = () => {
    playSound('pop');
    logout();
    setIsUserMenuOpen(false);
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

  // Initialize from localStorage on mount
  useEffect(() => {
    if (!isAuthReady || !role || !workspaceId) return;

    setIsClient(true);
    if (!isMaster) {
      setActiveTab("home");
    }

    const dynamicGreeting = getDynamicGreeting(currentUserName);
    setSessionGreetingObj(dynamicGreeting);

    const loadFromFirestore = async () => {
      try {
        if (!isMaster) {
          // En modo aislado / usuario nuevo, solo cargamos los proyectos creados en su workspace
          const wsProjCol = getWorkspaceScopedCol("projects", workspaceId, isMaster);
          const wsTasksCol = getWorkspaceScopedCol("tasks", workspaceId, isMaster);
          const wsProjSnap = await getDocs(collection(db, wsProjCol));
          const wsTasksSnap = await getDocs(collection(db, wsTasksCol));
          
          if (!wsProjSnap.empty) {
            const nativeTasks = wsTasksSnap.docs.map((d) => d.data());
            const list: Project[] = [];
            wsProjSnap.forEach((docSnap) => {
              const pData = docSnap.data() as Project;
              const extraTasks = nativeTasks
                .filter(
                  (nt) =>
                    String(nt.project_id) === String(pData.id) ||
                    String(nt.proyecto_id) === String(pData.id)
                )
                .map((nt) => ({
                  id: Number(nt.id) || Date.now(),
                  title: nt.title || nt.nombre || nt.titulo || "Tarea sin título",
                  desc: nt.desc || nt.contenido || "",
                  format: nt.format || nt.formato || "Sin formato",
                  formato: nt.formato || nt.format || "Sin formato",
                  time: nt.time || nt.duracion || nt.tiempoEstimado || "Sin tiempo",
                  status: (nt.status || nt.estado || "Planificado") as any,
                  statusColor: "",
                  subtasks: []
                }));

              const existingTaskIds = new Set((pData.tasks || []).map((t) => String(t.id)));
              const mergedTasks = [
                ...(pData.tasks || []),
                ...extraTasks.filter((nt) => !existingTaskIds.has(String(nt.id)))
              ];

              list.push({
                ...pData,
                tasks: mergedTasks
              });
            });
            const evaluated = list.map(autoEvaluateProjectStatus);
            setProjects(evaluated);
          } else {
            setProjects([]);
          }
          setIsLoaded(true);
          return;
        }

        // 1. Cargar proyectos y tareas de Firestore (Master)
        const v3ProjectsSnap = await getDocs(collection(db, "v3_projects"));
        const tasksSnap = await getDocs(collection(db, "tasks"));
        const nativeTasks = tasksSnap.docs.map((d) => d.data());

        if (!v3ProjectsSnap.empty) {
          const list: Project[] = [];
          v3ProjectsSnap.forEach((docSnap) => {
            const pData = docSnap.data() as Project;
            const extraTasks = nativeTasks
              .filter(
                (nt) =>
                  String(nt.project_id) === String(pData.id) ||
                  String(nt.proyecto_id) === String(pData.id)
              )
              .map((nt) => ({
                id: Number(nt.id) || Date.now(),
                title: nt.title || nt.nombre || nt.titulo || "Tarea sin título",
                desc: nt.desc || nt.contenido || "",
                format: nt.format || nt.formato || "Sin formato",
                formato: nt.formato || nt.format || "Sin formato",
                time: nt.time || nt.duracion || nt.tiempoEstimado || "Sin tiempo",
                status: (nt.status || nt.estado || "Planificado") as any,
                statusColor: "",
                subtasks: []
              }));

            const existingTaskIds = new Set((pData.tasks || []).map((t) => String(t.id)));
            const mergedTasks = [
              ...(pData.tasks || []),
              ...extraTasks.filter((nt) => !existingTaskIds.has(String(nt.id)))
            ];

            list.push({
              ...pData,
              tasks: mergedTasks
            });
          });
          const evaluated = list.map(autoEvaluateProjectStatus);
          setProjects(evaluated);
        } else {
          // 2. Fallback a colecciones nativas si v3_projects está vacía
          const projectsSnap = await getDocs(collection(db, "projects"));
          const primaryClientsSnap = await getDocs(collection(db, "clients"));
          const clientsSnap = !primaryClientsSnap.empty ? primaryClientsSnap : await getDocs(collection(db, "v3_clients"));
          const tasksSnap = await getDocs(collection(db, "tasks"));
          
          if (!projectsSnap.empty) {
            const clientMap = new Map(clientsSnap.docs.map(d => [d.id, d.data().nombre || d.data().name]));

            const tasksList = tasksSnap.docs.map(d => {
              const t = d.data();
              return {
                id: t.id,
                title: t.titulo || "Sin título",
                desc: t.contenido || "",
                format: t.formato || "post_imagen",
                formato: t.formato || "post_imagen",
                time: t.tiempoEstimado || "1h",
                status: t.estado || "Pendiente",
                statusColor: "",
                subtasks: [],
                proyecto_id: t.proyecto_id,
                fecha_programada: t.fechaProg || t.fecha_programada || "",
                fecha_limite: t.fechaEntrega || t.fecha_limite || ""
              };
            });

            const list: Project[] = projectsSnap.docs.map(docSnap => {
              const data = docSnap.data();
              const projTasks = tasksList.filter(t => t.proyecto_id === data.id);
              const clientName = data.cliente_id ? (clientMap.get(data.cliente_id) || "Sin Cliente") : "Sin Cliente";

              return {
                id: data.id,
                title: data.nombre || "Sin título",
                client: clientName,
                cliente_id: data.cliente_id || null,
                desc: data.descripcion || "",
                progress: "0%",
                percent: "0%",
                gradient: "bg-blue-600",
                glow: "bg-blue-600",
                package: data.area || "General",
                status: data.estado || "Activo",
                priority: data.prioridad || "Media",
                cost: `$${data.costo || 0}`,
                startDate: data.fechaInicio || "",
                deadline: data.fechaFin || "",
                tasks: projTasks
              } as unknown as Project;
            });

            const evaluated = list.map(autoEvaluateProjectStatus);
            setProjects(evaluated);
          } else if (isMaster) {
            setProjects(seedProjectsWithSessions(INITIAL_PROJECTS).map(autoEvaluateProjectStatus));
          } else {
            setProjects([]);
          }
        }
        setIsLoaded(true);
      } catch (err) {
        console.error("Firestore load error:", err);
        if (isMaster) {
          setProjects(seedProjectsWithSessions(INITIAL_PROJECTS).map(autoEvaluateProjectStatus));
        } else {
          setProjects([]);
        }
        setIsLoaded(true);
      }
    };

    loadFromFirestore();
  }, [isAuthReady, role, workspaceId, isMaster, currentUserName]);

  const updatePriority = (id: number, priority: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, priority } : p));
    persistProjectUpdate(id, { priority });
  };

  const [editingColorProjectId, setEditingColorProjectId] = useState<number | null>(null);

  const updateProjectColor = (id: number | string, h: number, s: number, l: number = 55) => {
    const solidColorStr = `hsl(${h}, ${s}%, ${l}%)`;
    const customGradientStyle = solidColorStr;
    const customGlowStyle = solidColorStr;
    const customColor = { h, s, l };

    setProjects(prev => prev.map(p => {
      if (String(p.id) === String(id)) {
        return {
          ...p,
          gradient: solidColorStr,
          customColor,
          customGradientStyle,
          customGlowStyle
        };
      }
      return p;
    }));
    persistProjectUpdate(id, { gradient: solidColorStr, customColor, customGradientStyle, customGlowStyle });
  };

  const updateTitle = (id: number, title: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, title } : p));
    persistProjectUpdate(id, { title });
  };

  const updateBriefCore = (id: number, briefCore: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, briefCore } : p));
    persistProjectUpdate(id, { briefCore });
  };

  const updateDates = (id: number, startDate: string, deadline: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, startDate, deadline } : p));
    persistProjectUpdate(id, { startDate, deadline });
  };

  const updateTasks = (id: number, tasks: Task[]) => {
    let updatedPartial: Partial<Project> | null = null;
    setProjects(prev => prev.map(p => {
      if (p.id === id) {
        const evalProj = autoEvaluateProjectStatus({ ...p, tasks });
        updatedPartial = {
          tasks: evalProj.tasks,
          status: evalProj.status,
          statusColor: evalProj.statusColor,
          progress: evalProj.progress,
          percent: evalProj.percent
        };
        return evalProj;
      }
      return p;
    }));
    if (updatedPartial) {
      persistProjectUpdate(id, updatedPartial);
    }
  };

  const updateClient = (id: number, client: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, client } : p));
    persistProjectUpdate(id, { client });
  };

  const updatePackage = (id: number, packageStr: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, package: packageStr } : p));
    persistProjectUpdate(id, { package: packageStr });
  };

  const updateCost = (id: number, cost: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, cost } : p));
    persistProjectUpdate(id, { cost });
  };

  const updateDaysRemaining = (id: number, daysRemaining: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, daysRemaining } : p));
    persistProjectUpdate(id, { daysRemaining });
  };

  const updateBurnRate = (id: number, burnRate: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, burnRate } : p));
    persistProjectUpdate(id, { burnRate });
  };

  const updateStatus = (id: number, status: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    persistProjectUpdate(id, { status });
  };

  const deleteProject = async (id: number | string) => {
    try {
      const projIdStr = String(id);
      const scopedProjectsCol = getWorkspaceScopedCol("projects", workspaceId, isMaster);
      const scopedV3Col = getWorkspaceScopedCol("v3_projects", workspaceId, isMaster);
      const scopedTasksCol = getWorkspaceScopedCol("tasks", workspaceId, isMaster);

      // 1. Delete from Firestore scoped projects collections
      await deleteDoc(doc(db, scopedV3Col, projIdStr)).catch(() => {});
      await deleteDoc(doc(db, scopedProjectsCol, projIdStr)).catch(() => {});
      if (isMaster) {
        await deleteDoc(doc(db, "v3_projects", projIdStr)).catch(() => {});
        await deleteDoc(doc(db, "projects", projIdStr)).catch(() => {});
      }

      // 2. Delete associated tasks from scoped tasks collection
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
      
      // 3. Update local state & localStorage
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

  const addProject = async () => {
    const newId = Math.max(...projects.map(p => p.id), 0) + 1;
    const today = new Date();
    const dayStr = today.getDate().toString().padStart(2, '0');
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthStr = months[today.getMonth()];
    const startDateFormatted = `${dayStr} ${monthStr}`;

    const newProject: Project = {
      id: newId,
      title: "Nuevo Proyecto",
      client: "Cliente",
      package: "Estratégico",
      desc: "Descripción del proyecto...",
      progress: "0 de 0 tareas",
      percent: "0%",
      gradient: "from-slate-600 to-slate-400",
      glow: "bg-slate-500",
      status: "En Revisión Interna",
      statusColor: "bg-yellow-500/10 border-yellow-500/30 text-yellow-500",
      burnRate: "0h / 0h",
      startDate: startDateFormatted,
      deadline: "Sin Fecha",
      daysRemaining: "-",
      briefCore: "Escribe el core brief aquí.",
      priority: "Media",
      cost: "$0",
      tasks: []
    };
    setProjects(prev => [newProject, ...prev]);
    setActiveProject(newId);
    playSound('pop');

    try {
      await setDoc(doc(db, "v3_projects", String(newId)), newProject);
    } catch (e) {
      console.error("Error creating project in Firestore:", e);
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
      // Use HSL color provided by modal or fallback to getInitialHSL
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

      // Dual write to native projects collection
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

      // Dual write tasks to native tasks collection
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

  const primaryMenuItems = [
    { id: "inicio", label: "Inicio", path: "/inicio" },
    { id: "home", label: "Work", path: "/" },
    { id: "proyectos", label: "Proyectos", path: "/proyectos" },
    { id: "clientes", label: "Clientes", path: "/cliente" },
  ];

  const secondaryMenuItems = [
    { id: "equipo", label: "Equipo", path: "/equipo" },
    { id: "finanzas", label: "Finanzas", path: "/admin" },
    { id: "recursos", label: "Recursos", path: "/recursos" },
    ...(isMaster ? [{ id: "superadmin", label: "SuperAdmin", path: "/superadmin" }] : []),
  ];

  const visiblePrimaryItems = primaryMenuItems.filter((item) => isFeatureVisible(item.id, isMaster, !isMaster));
  const visibleSecondaryItems = secondaryMenuItems.filter((item) => isFeatureVisible(item.id, isMaster, !isMaster));

  useEffect(() => {
    if (secondaryMenuItems.some((item) => item.id === activeTab)) {
      setIsMoreExpanded(true);
    }
  }, [activeTab]);

  // Map icon component manually for typing compatibility and style outlines vs solid fills
  const getIcon = (id: string, isActive: boolean) => {
    const fill = isActive ? "currentColor" : "none";
    const strokeWidth = isActive ? 1.5 : 1.75;
    const className = "w-[13.55px] h-[13.55px] transition-all duration-300 shrink-0 text-[#ffffffd6] opacity-100";

    switch (id) {
      case "inicio": return <Home className={className} fill={fill} strokeWidth={strokeWidth} />;
      case "home": return <Kanban className={className} fill={fill} strokeWidth={strokeWidth} />;
      case "proyectos": return <Folder className={className} fill={fill} strokeWidth={strokeWidth} />;
      case "proyectos_v2": return <Layers className={className} fill={fill} strokeWidth={strokeWidth} />;
      case "equipo": return <Users className={className} fill={fill} strokeWidth={strokeWidth} />;
      case "clientes": return <Briefcase className={className} fill={fill} strokeWidth={strokeWidth} />;
      case "finanzas": return <DollarSign className={className} fill={fill} strokeWidth={strokeWidth} />;
      case "recursos": return <Database className={className} fill={fill} strokeWidth={strokeWidth} />;
      case "superadmin": return <ShieldAlert className={className} fill={fill} strokeWidth={strokeWidth} />;
      case "ajustes": return <Settings className={className} fill={fill} strokeWidth={strokeWidth} />;
      default: return null;
    }
  };

  const activeProjectData = projects.find(p => p.id === activeProject);

  const getProjectTimestamp = (p: Project): number => {
    const dateStr = p.fecha_creacion || (p as any).createdAt || (p as any).created_at || p.startDate;
    if (!dateStr) return typeof p.id === "number" ? p.id : 0;
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.getTime();
    return typeof p.id === "number" ? p.id : 0;
  };

  const sortedProjects = [...projects].sort((a, b) => getProjectTimestamp(b) - getProjectTimestamp(a));
  const recentProjects = showAllProjectsList ? sortedProjects : sortedProjects.slice(0, 5);

  const getRelativeTimeString = (dateInput?: string | Date | number): string => {
    if (!dateInput) return "Hace un momento";
    const now = new Date();
    const currentYear = now.getFullYear();

    let date: Date | null = null;

    if (dateInput instanceof Date) {
      date = isNaN(dateInput.getTime()) ? null : dateInput;
    } else if (typeof dateInput === "number") {
      const d = new Date(dateInput);
      date = isNaN(d.getTime()) ? null : d;
    } else {
      const str = String(dateInput).trim();
      if (!str || str === "-") return "Hace un momento";

      if (str.includes("T") || str.includes("Z")) {
        const d = new Date(str);
        if (!isNaN(d.getTime())) date = d;
      } else if (str.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const d = new Date(`${str}T00:00:00`);
        if (!isNaN(d.getTime())) date = d;
      } else {
        const friendlyMatch = str.match(/^(\d{1,2})\s+([A-Za-z]{3,4})$/i);
        if (friendlyMatch) {
          const day = friendlyMatch[1];
          const monthStr = friendlyMatch[2];
          const d = new Date(`${day} ${monthStr} ${currentYear}`);
          if (!isNaN(d.getTime())) {
            if (d.getTime() > now.getTime() + 86400000) {
              d.setFullYear(currentYear - 1);
            }
            date = d;
          }
        }

        if (!date) {
          let d = new Date(str);
          if (!isNaN(d.getTime())) {
            if (d.getFullYear() < 2015 && !str.includes("20") && !str.includes("19")) {
              d.setFullYear(currentYear);
              if (d.getTime() > now.getTime() + 86400000) {
                d.setFullYear(currentYear - 1);
              }
            }
            date = d;
          }
        }
      }
    }

    if (!date) return "Hace un momento";

    const diffMs = now.getTime() - date.getTime();
    if (diffMs <= 0 || diffMs < 60000) {
      return "Hace un momento";
    }

    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 60) {
      return `Hace ${diffMins} ${diffMins === 1 ? "minuto" : "minutos"}`;
    }

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `Hace ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`;
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
      return `Hace ${diffDays} ${diffDays === 1 ? "día" : "días"}`;
    }

    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 4) {
      return `Hace ${diffWeeks} ${diffWeeks === 1 ? "semana" : "semanas"}`;
    }

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) {
      return `Hace ${diffMonths} ${diffMonths === 1 ? "mes" : "meses"}`;
    }

    const diffYears = Math.floor(diffDays / 365);
    return `Hace ${diffYears} ${diffYears === 1 ? "año" : "años"}`;
  };

  const getStatusTextColor = (status?: string): string => {
    if (!status) return "text-[#ffffff6b]";
    const lower = status.toLowerCase();
    if (lower.includes("completad") || lower.includes("terminad") || lower.includes("listo") || lower.includes("aprobad")) {
      return "text-emerald-400 font-medium";
    }
    if (lower.includes("proceso") || lower.includes("curso") || lower.includes("activ")) {
      return "text-sky-400 font-medium";
    }
    if (lower.includes("revis")) {
      return "text-amber-400 font-medium";
    }
    if (lower.includes("paus") || lower.includes("deten")) {
      return "text-rose-400 font-medium";
    }
    if (lower.includes("planif") || lower.includes("pendient")) {
      return "text-violet-400 font-medium";
    }
    return "text-[#ffffff6b] font-medium";
  };

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
    <main className={`relative w-full max-w-full h-screen overflow-hidden overflow-x-hidden select-none font-sans transition-colors duration-500 ${isNightMode ? 'bg-[#181817] text-neutral-100' : 'bg-[#dce1e8] text-slate-900'}`}>


      {/* Background Container */}
      <div className="absolute inset-0 overflow-hidden z-0 bg-transparent pointer-events-none">
        <div className={`absolute inset-0 transition-colors duration-500 ${isNightMode ? 'bg-[#181817]' : 'bg-[#dce1e8]'}`} />
      </div>

      {/* ── Unified Logo & Sidebar Toggle Header ── */}
      {!isMenuOpen ? (
        <div 
          className="absolute top-[43px] left-[17px] z-[60] pointer-events-auto"
          onMouseEnter={() => setIsLogoHovered(true)}
          onMouseLeave={() => setIsLogoHovered(false)}
        >
          <button
            type="button"
            onClick={() => {
              setIsMenuOpen(true);
              playSound('click');
            }}
            className="relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 hover:bg-white/10 cursor-pointer group"
            title="Abrir menú"
          >
            <AnimatePresence mode="popLayout">
              {isLogoHovered ? (
                <motion.div
                  key="expand-icon"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center justify-center"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="object-contain text-[#ffffff6b] transition-colors duration-200">
                    <rect width="18" height="18" x="3" y="3" rx="5" />
                    <path d="M9 3v18" />
                    <path d="m14 9 3 3-3 3" />
                  </svg>
                </motion.div>
              ) : (
                <motion.div
                  key="logo-icon"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center justify-center"
                >
                  <Image 
                    src="/taski-icon.png?v=3" 
                    alt="Taski Icon" 
                    width={28} 
                    height={28} 
                    referrerPolicy="no-referrer"
                    className={`object-contain opacity-90 group-hover:opacity-100 transition-all duration-300 ${isNightMode ? 'brightness-125' : 'invert-[0.15]'}`}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      ) : (
        <div className="absolute top-[43px] left-[11px] w-[232px] z-[60] pointer-events-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5 pl-1.5">
            <Image 
              src="/taski-icon.png?v=3" 
              alt="Taski Icon" 
              width={24} 
              height={24} 
              referrerPolicy="no-referrer"
              className={`object-contain opacity-90 transition-all duration-300 ${isNightMode ? 'brightness-125' : 'invert-[0.15]'}`}
            />
            <span className={`text-[28px] font-medium tracking-wide select-none ${isNightMode ? 'text-white/90' : 'text-slate-800'}`}>
              Taski
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsMenuOpen(false);
              setIsSidebarHovered(false);
              playSound('click');
            }}
            className="relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 hover:bg-white/10 text-[#ffffff6b] hover:text-white cursor-pointer group"
            title="Contraer menú"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="object-contain text-[#ffffff6b] group-hover:text-white transition-colors duration-200">
              <rect width="18" height="18" x="3" y="3" rx="5" />
              <path d="M9 3v18" />
              <path d="m16 9-3 3 3 3" />
            </svg>
          </button>
        </div>
      )}

      {/* Left Sidebar Menu when Menu is OPEN */}
      {isMenuOpen && (
        <div className="absolute left-[10px] top-[94px] bottom-[20px] z-50 flex flex-col justify-between items-start pointer-events-none">
          <div
            onMouseLeave={() => setHoveredMenuItem(null)}
            className="flex flex-col gap-0 pointer-events-auto bg-transparent border-transparent overflow-y-auto max-h-[calc(100vh-175px)] p-1.5 -m-1.5 custom-scrollbar"
          >
            <nav className="flex flex-col gap-0 items-start p-1">
              {/* Botón "Nuevo proyecto" */}
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1, width: 232 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setProjectModalOriginRect({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
                  setEditingProjectModal(null);
                  setShowNewProjectModal(true);
                  playSound('click');
                }}
                className="mb-[10px] group relative flex items-center h-9 w-[232px] rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 text-[#ffffffd6] cursor-pointer select-none overflow-hidden transition-all duration-300 border border-[#ffffff1f] shadow-sm shrink-0"
              >
                <div className="flex items-center justify-center shrink-0 w-8 h-9">
                  <Plus className="w-[13.55px] h-[13.55px] text-[#ffffffd6] stroke-[2.25] shrink-0" />
                </div>
                <span className="text-[13px] font-normal whitespace-nowrap select-none pr-3 transition-all duration-200 text-[#ffffffd6] -translate-x-[2px] -translate-y-[1px]">
                  Nuevo proyecto
                </span>
              </motion.button>

              {visiblePrimaryItems.map((item) => {
                const isActive = activeTab === item.id;
                const isHovered = hoveredMenuItem === item.id;

                return (
                  <motion.div
                    key={item.id}
                    onMouseEnter={() => setHoveredMenuItem(item.id)}
                    onClick={() => {
                      setActiveTab(item.id);
                      playSound('click');
                    }}
                    animate={{ width: 232 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className={`group relative flex items-center h-10 rounded-xl cursor-pointer select-none overflow-hidden transition-all duration-300 border-0 ${
                      isActive
                        ? "bg-white/10 text-[#ffffffd6]"
                        : isHovered
                          ? "bg-white/5 text-[#ffffffd6]"
                          : "bg-transparent text-[#ffffffd6]"
                    }`}
                  >
                    {/* Icon */}
                    <div className="flex items-center justify-center shrink-0 w-8 h-10">
                      {getIcon(item.id, isActive)}
                    </div>

                    {/* Text label */}
                    <span
                      className="text-[14px] font-normal whitespace-nowrap select-none pr-3 transition-all duration-200 text-[#ffffffd6]"
                    >
                      {item.label}
                    </span>
                  </motion.div>
                );
              })}

              {/* Botón "Más" / "Contraer" */}
              <motion.div
                onMouseEnter={() => setHoveredMenuItem("more_toggle")}
                onClick={() => {
                  setIsMoreExpanded((prev) => !prev);
                  playSound('click');
                }}
                animate={{ width: 232 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className={`group relative flex items-center justify-between h-10 rounded-xl cursor-pointer select-none overflow-hidden transition-all duration-300 border-0 ${
                  hoveredMenuItem === "more_toggle"
                    ? "bg-white/5 text-[#ffffffd6]"
                    : "bg-transparent text-[#ffffffd6]"
                }`}
              >
                <div className="flex items-center gap-0 min-w-0">
                  <div className="flex items-center justify-center shrink-0 w-8 h-10">
                    <MoreHorizontal
                      className={`w-[13.55px] h-[13.55px] transition-colors duration-200 ${
                        isMoreExpanded ? "text-[#ffffff6b]" : "text-[#ffffffd6]"
                      }`}
                    />
                  </div>
                  <span
                    className={`text-[14px] font-normal whitespace-nowrap select-none transition-colors duration-200 ${
                      isMoreExpanded ? "text-[#ffffff6b]" : "text-[#ffffffd6]"
                    }`}
                  >
                    {isMoreExpanded ? "Contraer" : "Más"}
                  </span>
                </div>

                {/* Flecha a la derecha dentro del contenedor en hover */}
                <div className="pr-3 flex items-center justify-center transition-all duration-200 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5">
                  <ChevronRight
                    className={`w-3.5 h-3.5 transition-all duration-300 ${
                      isMoreExpanded ? "text-[#ffffff6b] rotate-90" : "text-[#ffffffd6]"
                    }`}
                  />
                </div>
              </motion.div>

              {/* Secondary Menu Items (Clientes, Equipo, Recursos, SuperAdmin) when Expanded */}
              <AnimatePresence initial={false}>
                {isMoreExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col gap-0 overflow-hidden w-full"
                  >
                    {visibleSecondaryItems.map((item) => {
                      const isActive = activeTab === item.id;
                      const isHovered = hoveredMenuItem === item.id;

                      return (
                        <motion.div
                          key={item.id}
                          onMouseEnter={() => setHoveredMenuItem(item.id)}
                          onClick={() => {
                            setActiveTab(item.id);
                            playSound('click');
                          }}
                          animate={{ width: 232 }}
                          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                          className={`group relative flex items-center h-10 rounded-xl cursor-pointer select-none overflow-hidden transition-all duration-300 border-0 ${
                            isActive
                              ? "bg-white/10 text-[#ffffffd6]"
                              : isHovered
                                ? "bg-white/5 text-[#ffffffd6]"
                                : "bg-transparent text-[#ffffffd6]"
                          }`}
                        >
                          <div className="flex items-center justify-center shrink-0 w-8 h-10">
                            {getIcon(item.id, isActive)}
                          </div>
                          <span className="text-[14px] font-normal whitespace-nowrap select-none pr-3 transition-all duration-200 text-[#ffffffd6]">
                            {item.label}
                          </span>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Sección "Recientes" + Botón "Mostrar más" / "Mostrar menos" (Texto e icono con el mismo color exacto #ffffff6b) */}
              <div className="group/recentHeader mt-4 mb-2 px-2 w-[232px] flex items-center justify-between text-[14px] font-normal text-[#ffffff6b] select-none shrink-0">
                <span className="leading-none text-[#ffffff6b]">Recientes</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowAllProjectsList((prev) => !prev);
                    playSound('click');
                  }}
                  className="flex items-center gap-1.5 text-[#ffffff6b] cursor-pointer select-none leading-none"
                  title={showAllProjectsList ? "Mostrar menos" : "Mostrar más"}
                >
                  <span className="text-[14px] font-normal leading-none text-[#ffffff6b] opacity-0 group-hover/recentHeader:opacity-100 max-w-0 group-hover/recentHeader:max-w-[110px] overflow-hidden whitespace-nowrap transition-all duration-200">
                    {showAllProjectsList ? "Mostrar menos" : "Mostrar más"}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#ffffff6b] transition-transform duration-300 ${showAllProjectsList ? "rotate-180" : ""}`} />
                </button>
              </div>

              {/* Lista de proyectos recientes / extendida con scroll elevado sin tapar con tarjeta de usuario */}
              <div className="flex flex-col gap-0 w-full max-h-[calc(100vh-480px)] min-h-[60px] overflow-y-auto custom-scrollbar pr-1 pb-3 mb-2">
                {recentProjects.length > 0 ? (
                  recentProjects.map((project) => (
                    <motion.div
                      key={project.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setActiveProject(project.id);
                        setActiveTab("proyectos");
                        playSound('click');
                      }}
                      className="group relative flex flex-col justify-between px-3 py-3 h-[60px] w-[232px] rounded-2xl cursor-pointer select-none overflow-hidden transition-all duration-300 border-0 bg-transparent hover:bg-white/[0.05] shrink-0"
                    >
                      {/* Arriba: Título del proyecto */}
                      <span className="text-[14px] font-medium text-[#ffffffd6] truncate leading-tight">
                        {project.title}
                      </span>

                      {/* Abajo: Tiempo relativo y Estado juntos separados por ' • ' */}
                      <div className="flex items-center gap-1.5 text-[12px] select-none leading-none text-[#ffffff6b] truncate">
                        <span className="truncate">
                          {getRelativeTimeString(project.fecha_creacion || (project as any).createdAt || (project as any).created_at || project.startDate)}
                        </span>
                        {project.status && (
                          <>
                            <span className="text-[#ffffff40] shrink-0">•</span>
                            <span className={`shrink-0 ${getStatusTextColor(project.status)}`}>
                              {project.status}
                            </span>
                          </>
                        )}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col justify-center px-3.5 h-[60px] w-[232px] rounded-2xl border-0 bg-white/[0.02] text-[#ffffff40]">
                    <span className="text-[12px] font-normal">No hay proyectos</span>
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* Tarjeta de Usuario y Menú Desplegable con Cerrar Sesión */}
          <div ref={userMenuRef} className="relative mt-auto w-[232px] pointer-events-auto">
            <AnimatePresence>
              {isUserMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute bottom-[46px] left-0 w-[232px] bg-[#181818] border border-white/10 rounded-2xl p-1.5 shadow-2xl shadow-black/90 backdrop-blur-xl flex flex-col gap-0.5 z-[70]"
                >
                  {/* Encabezado del usuario */}
                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.03]">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-violet-600 via-indigo-500 to-sky-400 p-[1.5px] shrink-0">
                      <div className="w-full h-full rounded-full bg-[#181817] flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-[#ffffffd6]" />
                      </div>
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-semibold text-[#ffffffd6] truncate">
                        {currentUserName}
                      </span>
                      <span className="text-[10px] text-[#ffffff6b] truncate">
                        {isMaster ? "Llave Maestra • Brandex" : `Workspace ${workspaceId?.replace("ws_", "")}`}
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-px bg-white/10 my-1" />

                  {/* Copiar Llave de Acceso */}
                  <button
                    type="button"
                    onClick={handleCopyWorkspaceKey}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium text-[#ffffffd6] hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-3.5 h-3.5 text-[#3a7bd5]" />
                      <span>Copiar llave de acceso</span>
                    </div>
                    {copiedKey && (
                      <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Copiada</span>
                      </span>
                    )}
                  </button>

                  {/* Ajustes */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("ajustes");
                      setIsUserMenuOpen(false);
                      playSound('click');
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium text-[#ffffffd6] hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-[#ffffff6b]" />
                    <span>Ajustes de espacio</span>
                  </button>

                  {/* Consola SuperAdmin (Exclusivo Master) */}
                  {isMaster && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("superadmin");
                        setIsUserMenuOpen(false);
                        playSound('click');
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                      <span>Consola SuperAdmin</span>
                    </button>
                  )}

                  <div className="w-full h-px bg-white/10 my-1" />

                  {/* Cerrar Sesión */}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span>Cerrar sesión</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tarjeta de Usuario Trigger */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setIsUserMenuOpen((prev) => !prev);
                playSound('click');
              }}
              className={`group relative flex items-center justify-between h-10 w-[232px] px-2 rounded-xl cursor-pointer select-none overflow-hidden transition-all duration-300 border-0 ${
                isUserMenuOpen ? "bg-white/10 text-white" : "bg-transparent hover:bg-white/5 text-[#ffffffd6]"
              } shrink-0`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Círculo para foto de perfil a la izquierda */}
                <div className="relative w-7 h-7 rounded-full bg-gradient-to-tr from-violet-600 via-indigo-500 to-sky-400 p-[1.5px] shrink-0 shadow-sm flex items-center justify-center">
                  <div className="w-full h-full rounded-full bg-[#181817] flex items-center justify-center overflow-hidden">
                    <User className="w-3.5 h-3.5 text-[#ffffffd6] group-hover:scale-110 transition-transform duration-200" />
                  </div>
                </div>

                {/* Nombre de usuario dinámico */}
                <span className="text-[14px] font-normal text-[#ffffffd6] group-hover:text-white truncate leading-none">
                  {currentUserName}
                </span>
              </div>

              <ChevronDown
                className={`w-3.5 h-3.5 text-[#ffffff6b] group-hover:text-white transition-transform duration-200 mr-1 ${
                  isUserMenuOpen ? "rotate-180 text-white" : ""
                }`}
              />
            </motion.div>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <motion.div 
        animate={{ left: isMenuOpen ? 258 : 6 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className={`absolute top-[10px] bottom-[10px] right-[6px] z-30 rounded-[24px] border overflow-hidden pointer-events-auto transition-colors duration-500 ${
          isNightMode 
            ? 'bg-[#121212] border-white/[0.08]' 
            : 'bg-[#fffce2] border-slate-300/70'
        }`}
      >
        {/* Dynamic Header Wrapper aligned with the 12-column grid */}
        <div className="absolute top-5 left-6 right-6 h-[64px] grid grid-cols-12 gap-5 items-center z-50 pointer-events-auto">
          {activeTab === "home" ? (
            <>
              {/* Left Column (3 cols) above Sessions Column: Logo Spacer + Dynamic Title */}
              <div className="col-span-3 flex items-center h-full gap-2 min-w-0">
                <div className="w-9 shrink-0" />
                {/* LEFT ZONE: Title */}
                <motion.div 
                  animate={{ 
                    opacity: isSearchActive ? 0 : 1,
                  }}
                  style={{
                    pointerEvents: isSearchActive ? "none" : "auto",
                    display: isSearchActive ? "none" : "flex"
                  }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center shrink-0 overflow-hidden"
                >
                  <div className="flex flex-row items-center h-[64px] gap-2.5 leading-tight shrink-0 select-none whitespace-nowrap">
                    <span className={`text-xl md:text-2xl font-medium tracking-tight transition-colors duration-500 ${
                      isNightMode ? 'text-[#FFFFFFD6]' : 'text-slate-900'
                    }`}>
                      {sessionGreetingObj.title}
                    </span>
                    <span className={`text-xl md:text-2xl font-normal tracking-tight transition-colors duration-500 ${
                      isNightMode ? 'text-[#ffffff6b]' : 'text-slate-600'
                    }`}>
                      {sessionGreetingObj.subtitle}
                    </span>
                  </div>
                </motion.div>
              </div>

              {/* Right Column (9 cols) directly centered over Kanban */}
              <div className="col-span-9 flex items-center h-full gap-2">
                {/* Left placeholder to balance right action buttons and keep View Switcher centered */}
                <div className="flex-1 basis-0" />

                {/* CENTER ZONE: View Switcher — always geometrically centered in col-span-9 over Kanban */}
                <div className="flex-none flex items-center justify-center">
                  {/* Close Search Button */}
                  <AnimatePresence>
                    {isSearchActive && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8, width: 0, marginRight: 0 }}
                        animate={{ opacity: 1, scale: 1, width: 32, marginRight: 8 }}
                        exit={{ opacity: 0, scale: 0.8, width: 0, marginRight: 0 }}
                        transition={{ type: "spring", stiffness: 350, damping: 28 }}
                        type="button"
                        onClick={() => {
                          setHomeView(previousHomeView);
                          playSound('click');
                        }}
                        className="flex items-center justify-center h-8 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 cursor-pointer shrink-0 z-50"
                        style={{ overflow: "hidden" }}
                        title="Cerrar búsqueda"
                      >
                        <X className="w-4 h-4 shrink-0" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                  
                  <motion.div 
                    layout
                    className={`flex items-center rounded-full p-1 w-fit shrink-0 border transition-colors duration-300 ${
                      isNightMode ? "bg-[#121212] border-[#ffffff1f]" : "bg-slate-100 border-slate-200"
                    }`}
                  >
                    {/* Search Tab */}
                    <motion.button
                      layout
                      type="button"
                      onHoverStart={() => !isSearchActive && setHoveredTab("buscar")}
                      onHoverEnd={() => setHoveredTab(null)}
                      onClick={() => {
                        if (homeView !== "buscar") {
                          setPreviousHomeView(homeView);
                        }
                        setHomeView("buscar");
                        playSound('click');
                      }}
                      animate={{
                        width: isSearchActive ? 320 : (hoveredTab === "buscar" ? 135 : 100),
                      }}
                      transition={{ type: "spring", stiffness: 350, damping: 28 }}
                      className={`relative z-10 box-border inline-flex h-8 items-center justify-center rounded-full whitespace-nowrap select-none gap-1.5 text-xs font-bold transition-colors duration-200 ${
                        isSearchActive
                          ? isNightMode ? "text-[#ffffffd6] px-3" : "text-slate-900 px-3"
                          : isNightMode ? "text-[#ffffffd6] hover:text-white cursor-pointer px-0" : "text-slate-600 hover:text-slate-900 cursor-pointer px-0"
                      }`}
                      style={{
                        display: "inline-flex",
                      }}
                    >
                      {homeView === "buscar" && (
                        <motion.span
                          layoutId="activeViewIndicator"
                          className={`absolute inset-0 rounded-full border ${isNightMode ? "bg-[#1f1f1f] border-[#ffffff1f] shadow-sm" : "bg-white border-slate-200 shadow-sm"}`}
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      {!isSearchActive && hoveredTab === "buscar" && (
                        <motion.span
                          layoutId="hoverViewIndicator"
                          className={`absolute inset-0 rounded-full border ${isNightMode ? "bg-[#282828] border-white/10" : "bg-slate-100 border-slate-200/60"}`}
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      <Search className={`w-[13.55px] h-[13.55px] shrink-0 relative z-10 ${isNightMode ? "text-[#ffffffd6]" : "text-slate-900"}`} />
                      {isSearchActive ? (
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Buscar proyectos o tareas..."
                          className={`bg-transparent border-none outline-none text-xs w-full relative z-10 ${isNightMode ? "text-[#ffffffd6] placeholder:text-[#ffffff6b]" : "text-slate-900 font-semibold placeholder:text-slate-400"}`}
                          autoFocus
                        />
                      ) : (
                        <span className={`relative z-10 ${isNightMode ? "text-[#ffffffd6]" : ""}`}>Search</span>
                      )}
                    </motion.button>

                    {/* Kanban Tab */}
                    <motion.button
                      layout
                      type="button"
                      onHoverStart={() => setHoveredTab("kanban")}
                      onHoverEnd={() => setHoveredTab(null)}
                      onClick={() => {
                        setHomeView("kanban");
                        playSound('click');
                      }}
                      transition={{ type: "spring", stiffness: 350, damping: 28 }}
                      className={`relative z-10 box-border inline-flex h-8 items-center justify-center rounded-full whitespace-nowrap select-none gap-1.5 px-4 text-xs font-bold transition-colors duration-200 ${
                        homeView === "kanban"
                          ? isNightMode ? "text-[#ffffffd6]" : "text-slate-900"
                          : isNightMode ? "text-[#ffffffd6] hover:text-white" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {homeView === "kanban" && (
                        <motion.span
                          layoutId="activeViewIndicator"
                          className={`absolute inset-0 rounded-full border ${isNightMode ? "bg-[#1f1f1f] border-[#ffffff1f] shadow-sm" : "bg-white border-slate-200 shadow-sm"}`}
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      {hoveredTab === "kanban" && (
                        <motion.span
                          layoutId="hoverViewIndicator"
                          className={`absolute inset-0 rounded-full border ${isNightMode ? "bg-[#282828] border-white/10" : "bg-slate-100 border-slate-200/60"}`}
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      <LayoutGrid className={`w-[13.55px] h-[13.55px] shrink-0 relative z-10 ${isNightMode ? "text-[#ffffffd6]" : (homeView === "kanban" ? "text-slate-900" : "text-slate-700")}`} />
                      <span className="relative z-10">Kanban</span>
                    </motion.button>

                    {/* Base de Datos Tab */}
                    <motion.button
                      layout
                      type="button"
                      onHoverStart={() => setHoveredTab("tabla")}
                      onHoverEnd={() => setHoveredTab(null)}
                      onClick={() => {
                        setHomeView("tabla");
                        playSound('click');
                      }}
                      transition={{ type: "spring", stiffness: 350, damping: 28 }}
                      className={`relative z-10 box-border inline-flex h-8 items-center justify-center rounded-full whitespace-nowrap select-none gap-1.5 px-4 text-xs font-bold transition-colors duration-200 ${
                        homeView === "tabla"
                          ? isNightMode ? "text-[#ffffffd6]" : "text-slate-900"
                          : isNightMode ? "text-[#ffffffd6] hover:text-white" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {homeView === "tabla" && (
                        <motion.span
                          layoutId="activeViewIndicator"
                          className={`absolute inset-0 rounded-full border ${isNightMode ? "bg-[#1f1f1f] border-[#ffffff1f] shadow-sm" : "bg-white border-slate-200 shadow-sm"}`}
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      {hoveredTab === "tabla" && (
                        <motion.span
                          layoutId="hoverViewIndicator"
                          className={`absolute inset-0 rounded-full border ${isNightMode ? "bg-[#282828] border-white/10" : "bg-slate-100 border-slate-200/60"}`}
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      <Table className={`w-[13.55px] h-[13.55px] shrink-0 relative z-10 ${isNightMode ? "text-[#ffffffd6]" : (homeView === "tabla" ? "text-slate-900" : "text-slate-700")}`} />
                      <span className="relative z-10">Base de datos</span>
                    </motion.button>

                    {/* Timeline Tab */}
                    <motion.button
                      layout
                      type="button"
                      onHoverStart={() => setHoveredTab("timeline")}
                      onHoverEnd={() => setHoveredTab(null)}
                      onClick={() => {
                        setHomeView("timeline");
                        playSound('click');
                      }}
                      transition={{ type: "spring", stiffness: 350, damping: 28 }}
                      className={`relative z-10 box-border inline-flex h-8 items-center justify-center rounded-full whitespace-nowrap select-none gap-1.5 px-4 text-xs font-bold transition-colors duration-200 ${
                        homeView === "timeline"
                          ? isNightMode ? "text-[#ffffffd6]" : "text-slate-900"
                          : isNightMode ? "text-[#ffffffd6] hover:text-white" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {homeView === "timeline" && (
                        <motion.span
                          layoutId="activeViewIndicator"
                          className={`absolute inset-0 rounded-full border ${isNightMode ? "bg-[#1f1f1f] border-[#ffffff1f] shadow-sm" : "bg-white border-slate-200 shadow-sm"}`}
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      {hoveredTab === "timeline" && (
                        <motion.span
                          layoutId="hoverViewIndicator"
                          className={`absolute inset-0 rounded-full border ${isNightMode ? "bg-[#282828] border-white/10" : "bg-slate-100 border-slate-200/60"}`}
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      <CalendarDays className={`w-[13.55px] h-[13.55px] shrink-0 relative z-10 ${isNightMode ? "text-[#ffffffd6]" : (homeView === "timeline" ? "text-slate-900" : "text-slate-700")}`} />
                      <span className="relative z-10">Timeline</span>
                    </motion.button>
                  </motion.div>
                </div>

                {/* RIGHT ZONE: Action Buttons */}
                <div className="flex-1 basis-0 flex items-center justify-end">
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Agrupar Dropdown Button */}
                    <div className="relative">
                      <button
                        onClick={() => {
                          playSound('click');
                          setGroupDropdownOpen(!groupDropdownOpen);
                        }}
                        title="Agrupar y ordenar"
                        className={`flex items-center justify-center h-8 w-8 rounded-full border transition-all duration-200 shrink-0 shadow-sm active:scale-95 ${
                          isNightMode
                            ? "bg-[#1f1f1f] border-[#ffffff1f] text-[#ffffffd6] hover:bg-[#282828] hover:text-white"
                            : "bg-[oklch(0.55_0.01_286_/_4%)] border-slate-200 text-slate-750 hover:text-slate-900 hover:border-slate-300"
                        }`}
                      >
                        <ListFilter className={`w-[13.55px] h-[13.55px] ${isNightMode ? "text-[#ffffffd6]" : "text-slate-700"}`} />
                      </button>

                      {/* Dropdown Menu */}
                      <AnimatePresence>
                        {groupDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            transition={{ duration: 0.15 }}
                            className={`absolute right-0 mt-2.5 w-52 rounded-2xl border backdrop-blur-md shadow-2xl z-[150] p-2 flex flex-col gap-0.5 ${
                              isNightMode
                                ? "bg-slate-950/90 border-white/10 text-slate-350 shadow-black/80"
                                : "bg-white/95 border-slate-200/80 text-slate-700 shadow-slate-200/50"
                            }`}
                          >
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2.5 py-1 select-none">
                              Agrupar por
                            </div>
                            
                            <button
                              onClick={() => { handleSetGroupingMode("fecha"); setGroupDropdownOpen(false); }}
                              className={`text-left px-2.5 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-between transition-all duration-150 ${
                                groupingMode === "fecha"
                                  ? isNightMode ? "bg-white/10 text-white shadow-sm" : "bg-slate-100 text-slate-950 font-bold"
                                  : isNightMode ? "hover:bg-white/[0.04] hover:text-slate-200" : "hover:bg-slate-50 hover:text-slate-900"
                              }`}
                            >
                              <span>Fecha de entrega</span>
                              {groupingMode === "fecha" && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                            </button>

                            <button
                              onClick={() => { handleSetGroupingMode("cliente"); setGroupDropdownOpen(false); }}
                              className={`text-left px-2.5 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-between transition-all duration-150 ${
                                groupingMode === "cliente"
                                  ? isNightMode ? "bg-white/10 text-white shadow-sm" : "bg-slate-100 text-slate-950 font-bold"
                                  : isNightMode ? "hover:bg-white/[0.04] hover:text-slate-200" : "hover:bg-slate-50 hover:text-slate-900"
                              }`}
                            >
                              <span>Cliente</span>
                              {groupingMode === "cliente" && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                            </button>

                            <button
                              onClick={() => { handleSetGroupingMode("prioridad"); setGroupDropdownOpen(false); }}
                              className={`text-left px-2.5 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-between transition-all duration-150 ${
                                groupingMode === "prioridad"
                                  ? isNightMode ? "bg-white/10 text-white shadow-sm" : "bg-slate-100 text-slate-950 font-bold"
                                  : isNightMode ? "hover:bg-white/[0.04] hover:text-slate-200" : "hover:bg-slate-50 hover:text-slate-900"
                              }`}
                            >
                              <span>Prioridad</span>
                              {groupingMode === "prioridad" && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                            </button>

                            <button
                              onClick={() => { handleSetGroupingMode("estado"); setGroupDropdownOpen(false); }}
                              className={`text-left px-2.5 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-between transition-all duration-150 ${
                                groupingMode === "estado"
                                  ? isNightMode ? "bg-white/10 text-white shadow-sm" : "bg-slate-100 text-slate-950 font-bold"
                                  : isNightMode ? "hover:bg-white/[0.04] hover:text-slate-200" : "hover:bg-slate-50 hover:text-slate-900"
                              }`}
                            >
                              <span>Estado de tarea</span>
                              {groupingMode === "estado" && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                            </button>

                            <div className={`h-px my-1.5 ${isNightMode ? "bg-white/5" : "bg-slate-100"}`} />
                            
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2.5 py-1 select-none">
                              Ordenar por
                            </div>
                            
                            <button
                              onClick={() => { setGroupDropdownOpen(false); }}
                              className={`text-left px-2.5 py-1.5 text-xs font-semibold rounded-xl transition-all duration-150 ${
                                isNightMode ? "hover:bg-white/[0.04] hover:text-slate-200" : "hover:bg-slate-50 hover:text-slate-900"
                              }`}
                            >
                              <span>Fecha límite</span>
                            </button>

                            <button
                              onClick={() => { setGroupDropdownOpen(false); }}
                              className={`text-left px-2.5 py-1.5 text-xs font-semibold rounded-xl transition-all duration-150 ${
                                isNightMode ? "hover:bg-white/[0.04] hover:text-slate-200" : "hover:bg-slate-50 hover:text-slate-900"
                              }`}
                            >
                              <span>Porcentaje de avance</span>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="col-span-12 flex items-center justify-between h-full gap-2">
              <div className="flex items-center gap-4">
                <div className="w-9 shrink-0" />
                {activeTab !== "inicio" && (
                  <>
                    <span className={`text-xl md:text-2xl font-medium tracking-tight ${
                      isNightMode ? 'text-[#FFFFFFD6]' : 'text-slate-900'
                    }`}>
                      {activeTab === "proyectos" ? "Panel de Proyectos" :
                       activeTab === "equipo" ? "Espacio de Equipo" :
                       activeTab === "clientes" ? "Directorio de Clientes" :
                       activeTab === "finanzas" ? "Métricas Financieras" :
                       activeTab === "recursos" ? "Biblioteca de Recursos" :
                       activeTab === "superadmin" ? "Consola SuperAdmin" :
                       activeTab === "ajustes" ? "Ajustes del Sistema" : sessionGreetingObj.title}
                    </span>
                    <span className={`text-xl md:text-2xl font-normal tracking-tight ${
                      isNightMode ? 'text-[#ffffff6b]' : 'text-slate-600'
                    }`}>
                      {activeTab === "proyectos" ? "flujo y entregables activos" :
                       activeTab === "equipo" ? "colaboradores y carga de trabajo" :
                       activeTab === "clientes" ? "marcas asociadas y contratos" :
                       activeTab === "finanzas" ? "facturación y margen operativo" :
                       activeTab === "recursos" ? "repositorio de assets y documentación" :
                       activeTab === "superadmin" ? "control de lanzamientos y usuarios beta" :
                       activeTab === "ajustes" ? "configuración y preferencias" : sessionGreetingObj.subtitle}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

      {/* Top Right Controls: SaveStatusBadge */}
      <div className="absolute top-5 right-6 z-[100] flex items-center gap-2.5 pointer-events-auto select-none">
        <SaveStatusBadge isNightMode={isNightMode} />
      </div>

      {/* Render Projects View (Catálogo & Fullscreen) */}
      {activeTab === "proyectos" && (
        <div className="absolute top-[75px] left-6 right-6 bottom-4 z-[70] pointer-events-auto">
          <ProjectsView
            onCreateProject={(originRect) => {
              setEditingProjectModal(null);
              setProjectModalOriginRect(originRect || null);
              setShowNewProjectModal(true);
              playSound('click');
            }}
          />
        </div>
      )}

      {/* Render SuperAdmin View (Consola de Control) */}
      {activeTab === "superadmin" && (
        <div className="absolute top-[75px] left-6 right-6 bottom-4 z-[70] pointer-events-auto rounded-3xl overflow-hidden">
          <SuperAdminView />
        </div>
      )}

      {/* Empty Canvas View */}
      {activeTab !== "proyectos" && activeTab !== "superadmin" && (
        <div
          key={activeTab}
          className={`absolute z-30 pointer-events-auto overflow-x-hidden ${
            activeTab === "inicio"
              ? "top-[75px] left-6 right-6 bottom-4 flex flex-col items-center justify-center"
              : "top-[80px] left-6 right-6 bottom-4 flex flex-col gap-6"
          }`}
        >
          {/* Render Inicio Page (Chat Copilot) */}
          {activeTab === "inicio" && (
            <InicioDashboard />
          )}

          {/* Render Home Dashboard (Work) */}
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
                setEditingTaskModal({
                  ...task,
                  projectId: projectId || (task as any).projectId || parentProj?.id,
                  projectName: parentProj?.title || (task as any).projectName,
                  client: parentProj?.client || (task as any).client || "Brandex"
                });
                setTaskModalOriginRect(originRect || null);
                setShowNewTaskModal(true);
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
            />
          )}

          {/* Render Team Dashboard */}
          {activeTab === "equipo" && (
            <TeamDashboard 
              projects={projects}
              onUpdateProjects={setProjects}
              isNeumorphic={isNeumorphic}
              isNightMode={isNightMode}
            />
          )}

          {/* Render Clients Dashboard */}
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

          {/* Render Finanzas Globales Dashboard */}
          {activeTab === "finanzas" && (
            <FinanzasGlobalesDashboard 
              onSelectClient={(clientId) => {
                setActiveTab("clientes");
                playSound('click');
              }}
            />
          )}

          {/* Tab Header Pill & Details (For Recursos & Ajustes) */}
          {(activeTab === "ajustes" || activeTab === "recursos") && (
            <div className="flex flex-col gap-1">
              <div className={`relative px-4 py-1.5 rounded-full text-[11px] font-bold tracking-widest uppercase flex items-center justify-center w-fit overflow-hidden border shadow-lg cursor-default select-none transition-all duration-500 ${
                isNeumorphic 
                  ? "bg-slate-100/80 border-slate-200 text-slate-700 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.05)]" 
                  : "liquid-glass-btn border-white/10 text-white/95"
              }`}>
                {!isNeumorphic && <div className="absolute -top-4 -left-4 w-12 h-12 bg-white opacity-10 rounded-full blur-[10px] pointer-events-none" />}
                <span className="relative z-10">
                  {activeTab === "recursos" ? "Recursos" : "Ajustes"}
                </span>
              </div>
              
              <h1 className={`text-4xl md:text-5xl font-extralight tracking-tight mt-3 transition-colors duration-500 ${
                isNeumorphic ? 'text-slate-800' : 'text-white/95'
              }`}>
                {activeTab === "recursos" ? "Biblioteca de Recursos" : "Ajustes del Sistema"}
              </h1>
              <p className={`text-[14px] font-light max-w-xl mt-2 leading-relaxed transition-colors duration-500 ${
                isNeumorphic ? 'text-slate-500' : 'text-white/50'
              }`}>
                {activeTab === "recursos" ? "Repositorio central de assets de diseño, plantillas de marca, guías y documentos compartidos." :
                 "Ajustes de personalización, conexiones de bases de datos, integraciones de API y preferencias del sistema."}
              </p>
            </div>
          )}

          {/* Canvas Body (For Recursos & Ajustes) */}
          {(activeTab === "ajustes" || activeTab === "recursos") && (
            <div className={`flex-1 w-full relative rounded-[32px] overflow-hidden p-8 flex flex-col justify-between transition-all duration-500 ${
              isNightMode
                ? "neu-dark-flat border border-white/5 shadow-2xl"
                : "neu-flat border border-white/60 shadow-2xl"
            }`}>
              {/* Blueprint Grid / Wireframe Placeholder */}
              <div className={`flex-1 rounded-[20px] flex items-center justify-center relative overflow-hidden transition-all duration-500 ${
                isNightMode
                  ? "neu-dark-inset border border-white/5"
                  : "neu-inset border border-white/40"
              }`}>
                {/* Dot Matrix Pattern */}
                <div className={`absolute inset-0 opacity-[0.04] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] ${
                  isNeumorphic ? "bg-[radial-gradient(#000_1px,transparent_1px)] opacity-[0.03]" : ""
                }`} />
                
                {/* Tech crosshair markings */}
                <div className={`absolute top-4 left-4 w-4 h-4 border-t border-l ${isNeumorphic ? "border-slate-400/30" : "border-white/20"}`} />
                <div className={`absolute top-4 right-4 w-4 h-4 border-t border-r ${isNeumorphic ? "border-slate-400/30" : "border-white/20"}`} />
                <div className={`absolute bottom-4 left-4 w-4 h-4 border-b border-l ${isNeumorphic ? "border-slate-400/30" : "border-white/20"}`} />
                <div className={`absolute bottom-4 right-4 w-4 h-4 border-b border-r ${isNeumorphic ? "border-slate-400/30" : "border-white/20"}`} />

                <div className="flex flex-col items-center text-center px-4 relative z-10">
                  <motion.div 
                    animate={{ 
                      y: [0, -6, 0],
                      rotate: [0, 2, -2, 0]
                    }}
                    transition={{ 
                      duration: 5, 
                      repeat: Infinity,
                      ease: "easeInOut" 
                    }}
                    className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg backdrop-blur-md mb-4 transition-all duration-500 ${
                      isNeumorphic
                        ? "bg-[#e6eef8] border border-white/70 text-slate-500 shadow-[4px_4px_10px_#b8c4d9,-4px_-4px_10px_#ffffff]"
                        : "bg-white/[0.04] border border-white/10 text-white/40"
                    }`}
                  >
                    {activeTab === "recursos" ? <Database className="w-8 h-8" strokeWidth={1} /> :
                     <Settings className="w-8 h-8" strokeWidth={1} />}
                  </motion.div>
                  <span className={`text-[11px] font-black uppercase tracking-[0.2em] transition-colors duration-500 ${
                    isNeumorphic ? "text-slate-700" : "text-white/70"
                  }`}>Lienzo en Construcción</span>
                  <span className={`text-[13px] font-extralight max-w-sm mt-1.5 leading-relaxed transition-colors duration-500 ${
                    isNeumorphic ? "text-slate-500" : "text-white/40"
                  }`}>
                    {activeTab === "recursos" 
                      ? "Repositorio central de assets de diseño, manuales de marca y archivos compartidos."
                      : "Módulo interactivo listo para conectar con tu base de datos de Notion y servicios de IA."}
                  </span>
                </div>
              </div>

              {/* Subtle status/metadata line */}
              <div className={`flex items-center justify-between text-[9px] uppercase tracking-[0.15em] font-bold mt-4 transition-colors duration-500 ${
                isNeumorphic ? "text-slate-400" : "text-white/30"
              }`}>
                <span>Taski 1.5</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Lienzo Listo</span>
                </div>
              </div>
            </div>
          )}


        </div>
      )}
      </motion.div>

      <NewProjectModal
        isOpen={showNewProjectModal}
        onClose={() => {
          setShowNewProjectModal(false);
          setEditingProjectModal(null);
          setProjectModalOriginRect(null);
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
              persistProjectUpdate(p.id, {
                title: evalProj.title,
                client: evalProj.client,
                package: evalProj.package,
                desc: evalProj.briefCore || evalProj.desc,
                status: evalProj.status,
                tasks: evalProj.tasks,
                gradient: evalProj.gradient,
                glow: evalProj.glow,
                customColor: evalProj.customColor,
                customGradientStyle: evalProj.customGradientStyle,
                customGlowStyle: evalProj.customGlowStyle,
                statusColor: evalProj.statusColor,
                progress: evalProj.progress,
                percent: evalProj.percent,
                startDate: evalProj.startDate,
                deadline: evalProj.deadline,
                startDateRaw: (evalProj as any).startDateRaw,
                deadlineRaw: (evalProj as any).deadlineRaw,
                fechaInicio: (evalProj as any).fechaInicio || (evalProj as any).startDateRaw,
                fechaFin: (evalProj as any).fechaFin || (evalProj as any).deadlineRaw
              });
              return evalProj;
            })
          );
          setShowNewProjectModal(false);
          setEditingProjectModal(null);
          playSound('pop');
        }}
        projects={projects}
        onSelectProject={(projId) => {
          setActiveProject(projId);
          setActiveTab("proyectos");
          setShowNewProjectModal(false);
          setEditingProjectModal(null);
          playSound('click');
        }}
        isNightMode={isNightMode}
        isNeumorphic={isNeumorphic}
      />

      <NewTaskModal
        isOpen={showNewTaskModal}
        onClose={() => {
          setShowNewTaskModal(false);
          setEditingTaskModal(null);
        }}
        onCreateTask={(taskData) => {
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

          setShowNewTaskModal(false);
          setEditingTaskModal(null);
        }}
        onUpdateTask={(taskId, updatedData, pId) => {
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
                  priority: updatedData.priority !== undefined ? updatedData.priority : (t as any).priority,
                  deadline: updatedData.deadline !== undefined ? updatedData.deadline : t.deadline,
                  fecha_limite: updatedData.fecha_limite !== undefined ? updatedData.fecha_limite : t.fecha_limite,
                  fecha_programada: updatedData.fecha_programada !== undefined ? updatedData.fecha_programada : t.fecha_programada,
                  color: updatedData.color !== undefined ? updatedData.color : t.color,
                  subtasks: updatedData.subtasks !== undefined ? updatedData.subtasks : t.subtasks,
                  attachmentUrl: updatedData.attachmentUrl !== undefined ? updatedData.attachmentUrl : t.attachmentUrl,
                  recursosDrive: updatedData.recursosDrive !== undefined ? updatedData.recursosDrive : (t as any).recursosDrive
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

          setShowNewTaskModal(false);
          setEditingTaskModal(null);
        }}
        onDeleteTask={(taskId, pId) => {
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

          setShowNewTaskModal(false);
          setEditingTaskModal(null);
        }}
        editingTask={editingTaskModal}
        projects={projects}
        defaultProjectId={newTaskDefaultProjectId}
        originRect={taskModalOriginRect}
        isNightMode={isNightMode}
      />
    </main>
  );
}
