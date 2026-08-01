"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Home, Folder, Users, Briefcase, DollarSign, Settings, TrendingUp, ArrowUpRight, Wallet, Activity, Sun, Moon, Search, LayoutGrid, Table, CalendarDays, SquarePen, SlidersHorizontal, Archive, Layers, ChevronDown, Bell, Plus, Trash2, Loader2, X, PanelLeftOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { collection, getDocs, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { ProjectDashboard, Project, Task } from "./components/ProjectDashboard";
import NewProjectModal, { ProjectData } from "./components/NewProjectModal";
import { playSound } from "./utils/audio";
import { INITIAL_PROJECTS, getDynamicProgress, autoEvaluateProjectStatus } from "./utils/data";
import TimeHeatmap from "./components/TimeHeatmap";
import { TeamDashboard } from "./components/TeamDashboard";
import { ClientsDashboard } from "./components/ClientsDashboard";
import { ClientV2Dashboard } from "./components/ClientV2Dashboard";
import { HomeDashboard } from "./components/HomeDashboard";
import { ProjectsV2Dashboard } from "./components/ProjectsV2Dashboard";
import { SaveStatusBadge } from "./components/SaveStatusBadge";
import { persistProjectUpdate } from "./utils/persist";
import { getSingleSourceProjectColor, PROJECT_COLOR_PALETTE, getDynamicGreeting } from "@/lib/utils";
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
  const [activeTab, setActiveTab] = useState("home");
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
  const currentUserName = authUserName || "Feiko";

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Initialize from localStorage on mount
  useEffect(() => {
    setIsClient(true);

    const dynamicGreeting = getDynamicGreeting(currentUserName);
    setSessionGreetingObj(dynamicGreeting);

    const loadFromFirestore = async () => {
      try {
        // 1. Cargar proyectos y tareas de Firestore
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
          const v3ClientsSnap = await getDocs(collection(db, "v3_clients"));
          const clientsSnap = !v3ClientsSnap.empty ? v3ClientsSnap : await getDocs(collection(db, "clients"));
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
          }
        }
        setIsLoaded(true);
      } catch (err) {
        console.error("Firestore load error:", err);
        setProjects(seedProjectsWithSessions(INITIAL_PROJECTS).map(autoEvaluateProjectStatus));
        setIsLoaded(true);
      }
    };

    loadFromFirestore();
  }, []);

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
      // 1. Delete from Firestore v3_projects and native projects collection
      await deleteDoc(doc(db, "v3_projects", projIdStr));
      await deleteDoc(doc(db, "projects", projIdStr)).catch(() => {});

      // 2. Delete associated tasks from native tasks collection
      try {
        const tasksSnap = await getDocs(collection(db, "tasks"));
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
      await setDoc(doc(db, "v3_projects", String(newId)), newProject);

      // Dual write to native /projects collection
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
        gradient: newProject.gradient
      };
      await setDoc(doc(db, "projects", String(newId)), nativeProject);

      // Dual write tasks to native /tasks collection
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
            fecha_creacion: new Date().toISOString()
          };
          await setDoc(doc(db, "tasks", String(t.id)), nativeTask);
        }
      }
    } catch (e) {
      console.error("Error creating project in Firestore:", e);
    }
    
    setShowNewProjectModal(false);
    playSound('pop');
  };

  const menuItems = [
    { id: "home", label: "Inicio", path: "/" },
    { id: "proyectos", label: "Proyectos", path: "/proyectos" },
    { id: "proyectos_v2", label: "Proyectos V2", path: "/proyectos-v2" },
    { id: "equipo", label: "Equipo", path: "/equipo" },
    { id: "clientes", label: "Clientes", path: "/cliente" },
    { id: "cliente_v2", label: "Panel Cliente V2", path: "/cliente-v2" },
    { id: "finanzas", label: "Finanzas", path: "/admin" },
    { id: "ajustes", label: "Ajustes", path: "#" },
  ];

  // Map icon component manually for typing compatibility and style outlines vs solid fills
  const getIcon = (id: string, isActive: boolean) => {
    const fill = isActive ? "currentColor" : "none";
    const strokeWidth = isActive ? 1.5 : 1.75;
    const className = "w-[13.55px] h-[13.55px] transition-all duration-300 shrink-0 text-[#ffffffd6] opacity-100";

    switch (id) {
      case "home": return <Home className={className} fill={fill} strokeWidth={strokeWidth} />;
      case "proyectos": return <Folder className={className} fill={fill} strokeWidth={strokeWidth} />;
      case "proyectos_v2": return <Layers className={className} fill={fill} strokeWidth={strokeWidth} />;
      case "equipo": return <Users className={className} fill={fill} strokeWidth={strokeWidth} />;
      case "clientes": return <Briefcase className={className} fill={fill} strokeWidth={strokeWidth} />;
      case "cliente_v2": return <Briefcase className={className} fill={fill} strokeWidth={strokeWidth} />;
      case "finanzas": return <DollarSign className={className} fill={fill} strokeWidth={strokeWidth} />;
      case "ajustes": return <Settings className={className} fill={fill} strokeWidth={strokeWidth} />;
      default: return null;
    }
  };

  const activeProjectData = projects.find(p => p.id === activeProject);



  return (
    <main className={`relative w-full max-w-full h-screen overflow-hidden overflow-x-hidden select-none font-sans transition-colors duration-500 ${isNightMode ? 'bg-[#181817] text-neutral-100' : 'bg-[#dce1e8] text-slate-900'}`}>


      {/* Background Container */}
      <div className="absolute inset-0 overflow-hidden z-0 bg-transparent pointer-events-none">
        <div className={`absolute inset-0 transition-colors duration-500 ${isNightMode ? 'bg-[#181817]' : 'bg-[#dce1e8]'}`} />
      </div>

      {/* ── Unified Logo Button (always same position) ── */}
      <div 
        className="absolute top-[43px] left-[17px] z-[60] pointer-events-auto"
        onMouseEnter={() => setIsLogoHovered(true)}
        onMouseLeave={() => setIsLogoHovered(false)}
      >
        <button
          type="button"
          onClick={() => {
            if (isMenuOpen) {
              setIsMenuOpen(false);
              setIsSidebarHovered(false);
            } else {
              setIsMenuOpen(true);
            }
            playSound('click');
          }}
          className="relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 hover:bg-white/10 cursor-pointer group"
          title={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
        >
          <AnimatePresence mode="popLayout">
            {isLogoHovered ? (
              <motion.div
                key={isMenuOpen ? "close-icon" : "expand-icon"}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-center"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`object-contain ${isNightMode ? 'text-white' : 'text-slate-800'}`}>
                  <rect width="18" height="18" x="3" y="3" rx="5" />
                  <path d="M9 3v18" />
                  <path d={isMenuOpen ? "m16 9-3 3 3 3" : "m14 9 3 3-3 3"} />
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

      {/* Left Sidebar Menu when Menu is OPEN */}
      {isMenuOpen && (
        <div className="absolute left-[16px] top-[114px] bottom-0 z-50 flex flex-col items-start pointer-events-none">
          <div
            onMouseLeave={() => setHoveredMenuItem(null)}
            className="flex flex-col gap-0 pointer-events-auto bg-transparent border-transparent"
          >
            <nav className="flex flex-col gap-0 items-start">
              {menuItems.map((item) => {
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
                    animate={{ width: 160 }}
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
                    <div className="flex items-center justify-center shrink-0 w-10 h-10">
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
            </nav>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <motion.div 
        animate={{ left: isMenuOpen ? 196 : 6 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className={`absolute top-[10px] bottom-[10px] right-[6px] z-30 rounded-[24px] border overflow-hidden pointer-events-auto transition-colors duration-500 ${
          isNightMode 
            ? 'bg-[#121212] border-white/[0.08]' 
            : 'bg-[#fffce2] border-slate-300/70'
        }`}
      >
        {/* Dynamic Header Wrapper aligned with the 12-column grid */}
        <div className="absolute top-5 left-6 right-6 h-[64px] grid grid-cols-12 gap-5 items-center z-50 pointer-events-auto">
        <div className="col-span-9 flex items-center h-full gap-2">
          {/* Spacer for unified logo */}
          <div className="w-9 shrink-0" />

          {/* LEFT ZONE: Title */}
          <div className="flex-1 basis-0 flex items-center min-w-0">
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
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: -6, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: 6, filter: "blur(4px)" }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-row items-center h-[64px] gap-2.5 leading-tight shrink-0 select-none"
                >
                  <span className={`text-xl md:text-2xl font-extrabold tracking-tight transition-colors duration-500 ${
                    isNightMode ? 'text-slate-50' : 'text-slate-900'
                  }`}>
                    {activeTab === "proyectos" ? "Panel de Proyectos" :
                     activeTab === "proyectos_v2" ? "Panel de Proyectos" :
                     activeTab === "equipo" ? "Espacio de Equipo" :
                     activeTab === "clientes" ? "Directorio de Clientes" :
                     activeTab === "cliente_v2" ? "Panel Cliente V2" :
                     activeTab === "finanzas" ? "Métricas Financieras" :
                     activeTab === "ajustes" ? "Ajustes del Sistema" : sessionGreetingObj.title}
                  </span>
                  {activeTab !== "proyectos_v2" && (
                    <span className={`text-xl md:text-2xl font-medium tracking-tight transition-colors duration-500 ${
                      isNightMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      {activeTab === "proyectos" ? "flujo y entregables activos" :
                       activeTab === "equipo" ? "colaboradores y carga de trabajo" :
                       activeTab === "clientes" ? "marcas asociadas y contratos" :
                       activeTab === "cliente_v2" ? "visión 360° de marca y proyectos" :
                       activeTab === "finanzas" ? "facturación y margen operativo" :
                       activeTab === "ajustes" ? "configuración y preferencias" : sessionGreetingObj.subtitle}
                    </span>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>

          {/* CENTER ZONE: View Switcher — always geometrically centered in col-span-9 */}
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
          {(activeTab === "home" || activeTab === "proyectos_v2") && (
            <motion.div 
              layout
              className="flex items-center rounded-full bg-[oklch(0.55_0.01_286_/_4%)] dark:bg-[oklch(0.55_0.01_286_/_6%)] border border-white/5 p-1 w-fit shrink-0"
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
                    ? isNightMode ? "text-white px-3" : "text-slate-900 px-3"
                    : isNightMode ? "text-slate-400 hover:text-slate-200 cursor-pointer px-0" : "text-slate-600 hover:text-slate-900 cursor-pointer px-0"
                }`}
                style={{
                  display: "inline-flex",
                }}
              >
                {homeView === "buscar" && (
                  <motion.span
                    layoutId="activeViewIndicator"
                    className={`absolute inset-0 rounded-full border ${isNightMode ? "bg-white/10 dark:bg-white/[0.08] border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.2)]" : "bg-white border-slate-200 shadow-sm"}`}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                {!isSearchActive && hoveredTab === "buscar" && (
                  <motion.span
                    layoutId="hoverViewIndicator"
                    className={`absolute inset-0 rounded-full border ${isNightMode ? "bg-white/5 dark:bg-white/[0.04] border-white/5" : "bg-slate-100 border-slate-200/60"}`}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Search className={`w-4 h-4 shrink-0 relative z-10 ${isNightMode ? "text-slate-400" : "text-slate-900"}`} />
                {isSearchActive ? (
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Buscar proyectos o tareas..."
                    className={`bg-transparent border-none outline-none text-xs w-full relative z-10 ${isNightMode ? "text-white placeholder:text-slate-500" : "text-slate-900 font-semibold placeholder:text-slate-400"}`}
                    autoFocus
                  />
                ) : (
                  <span className="relative z-10">Search</span>
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
                    ? isNightMode ? "text-white" : "text-slate-900"
                    : isNightMode ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {homeView === "kanban" && (
                  <motion.span
                    layoutId="activeViewIndicator"
                    className={`absolute inset-0 rounded-full border ${isNightMode ? "bg-white/10 dark:bg-white/[0.08] border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.2)]" : "bg-white border-slate-200 shadow-sm"}`}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                {hoveredTab === "kanban" && (
                  <motion.span
                    layoutId="hoverViewIndicator"
                    className={`absolute inset-0 rounded-full border ${isNightMode ? "bg-white/5 dark:bg-white/[0.04] border-white/5" : "bg-slate-100 border-slate-200/60"}`}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <LayoutGrid className={`w-4 h-4 shrink-0 relative z-10 ${isNightMode ? (homeView === "kanban" ? "text-white" : "text-slate-400") : (homeView === "kanban" ? "text-slate-900" : "text-slate-700")}`} />
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
                    ? isNightMode ? "text-white" : "text-slate-900"
                    : isNightMode ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {homeView === "tabla" && (
                  <motion.span
                    layoutId="activeViewIndicator"
                    className={`absolute inset-0 rounded-full border ${isNightMode ? "bg-white/10 dark:bg-white/[0.08] border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.2)]" : "bg-white border-slate-200 shadow-sm"}`}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                {hoveredTab === "tabla" && (
                  <motion.span
                    layoutId="hoverViewIndicator"
                    className={`absolute inset-0 rounded-full border ${isNightMode ? "bg-white/5 dark:bg-white/[0.04] border-white/5" : "bg-slate-100 border-slate-200/60"}`}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Table className={`w-4 h-4 shrink-0 relative z-10 ${isNightMode ? (homeView === "tabla" ? "text-white" : "text-slate-400") : (homeView === "tabla" ? "text-slate-900" : "text-slate-700")}`} />
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
                    ? isNightMode ? "text-white" : "text-slate-900"
                    : isNightMode ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {homeView === "timeline" && (
                  <motion.span
                    layoutId="activeViewIndicator"
                    className={`absolute inset-0 rounded-full border ${isNightMode ? "bg-white/10 dark:bg-white/[0.08] border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.2)]" : "bg-white border-slate-200 shadow-sm"}`}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                {hoveredTab === "timeline" && (
                  <motion.span
                    layoutId="hoverViewIndicator"
                    className={`absolute inset-0 rounded-full border ${isNightMode ? "bg-white/5 dark:bg-white/[0.04] border-white/5" : "bg-slate-100 border-slate-200/60"}`}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <CalendarDays className={`w-4 h-4 shrink-0 relative z-10 ${isNightMode ? (homeView === "timeline" ? "text-white" : "text-slate-400") : (homeView === "timeline" ? "text-slate-900" : "text-slate-700")}`} />
                <span className="relative z-10">Timeline</span>
              </motion.button>
            </motion.div>
          )}
          </div>{/* END CENTER ZONE */}

          {/* RIGHT ZONE: Action Buttons */}
          <div className="flex-1 basis-0 flex items-center justify-end">
          {(activeTab === "home" || activeTab === "proyectos_v2") && (
            <div className="flex items-center gap-3 shrink-0">


              {/* 2. Agrupar Dropdown Button next to pencil */}
              <div className="relative">
                <button
                  onClick={() => {
                    playSound('click');
                    setGroupDropdownOpen(!groupDropdownOpen);
                  }}
                  title="Agrupar y ordenar"
                  className={`flex items-center justify-center h-8 w-8 rounded-full border transition-all duration-200 shrink-0 shadow-sm active:scale-95 ${
                    isNightMode
                      ? "bg-[oklch(0.55_0.01_286_/_6%)] border-white/5 text-slate-350 hover:text-white hover:border-white/10"
                      : "bg-[oklch(0.55_0.01_286_/_4%)] border-slate-200 text-slate-750 hover:text-slate-900 hover:border-slate-300"
                  }`}
                >
                  <Layers className={`w-4 h-4 ${isNightMode ? "text-slate-400" : "text-slate-700"}`} />
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

              {/* Modo Claro Toggle Button */}
              <button
                onClick={toggleNightMode}
                title={isNightMode ? "Activar modo claro" : "Activar modo oscuro"}
                className={`flex items-center justify-center h-8 w-8 rounded-full border transition-all duration-200 shrink-0 shadow-sm active:scale-95 ${
                  isNightMode
                    ? "bg-[oklch(0.55_0.01_286_/_6%)] border-white/5 text-slate-350 hover:text-white hover:border-white/10"
                    : "bg-[oklch(0.55_0.01_286_/_4%)] border-slate-200 text-slate-750 hover:text-slate-900 hover:border-slate-300"
                }`}
              >
                {isNightMode ? (
                  <Sun className="w-4 h-4 text-slate-400 stroke-[2]" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-700 stroke-[2]" />
                )}
              </button>

              {/* 4. Nuevo Proyecto Button (High Contrast White) */}
              <button
                onClick={() => {
                  playSound('click');
                  setShowNewProjectModal(true);
                }}
                className="flex items-center justify-center h-8 rounded-full px-4 text-xs font-bold gap-1.5 bg-white text-slate-950 hover:bg-slate-100 active:scale-95 shadow-[0_2px_8px_rgba(255,255,255,0.15)] transition-all duration-200 shrink-0"
              >
                <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
                <span>Nuevo proyecto</span>
              </button>
            </div>
          )}
          </div>{/* END RIGHT ZONE */}
        </div>
      </div>

      {/* Top Right Controls: SaveStatusBadge */}
      <div className="absolute top-5 right-6 z-[100] flex items-center gap-2.5 pointer-events-auto select-none">
        <SaveStatusBadge isNightMode={isNightMode} />
      </div>

      {/* Column Header Pill */}
      {activeTab === "proyectos" && (
        <div className="absolute top-[80px] left-6 z-50 pointer-events-auto">
          <div className={`relative px-4 py-1.5 rounded-full text-[11px] font-bold tracking-widest uppercase flex items-center justify-center w-fit overflow-hidden border shadow-md cursor-default select-none transition-all duration-300 ${
            isNeumorphic 
              ? 'bg-[#e6eef8] text-slate-800 shadow-[3px_3px_6px_#b8c4d9,-3px_-3px_6px_#ffffff] border-white/40' 
              : 'liquid-glass-btn text-white/95 border-white/10'
          }`}>
            {!isNeumorphic && <div className="absolute -top-4 -left-4 w-12 h-12 bg-white opacity-10 rounded-full blur-[10px] pointer-events-none" />}
            <span className="relative z-10">Proyectos</span>
          </div>
        </div>
      )}

      {/* Info Cards Column */}
      {activeTab === "proyectos" && (
        <div 
          onScroll={handleScroll}
          className="absolute top-[124px] left-6 w-[280px] bottom-4 overflow-y-auto hide-scrollbar z-30 pb-20 pt-2 pointer-events-auto snap-y snap-mandatory"
          style={{
            maskImage: 'linear-gradient(to bottom, transparent 0px, transparent 16px, black 36px, black 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0px, transparent 16px, black 36px, black 100%)'
          }}
        >


        <div className="flex flex-col gap-6 relative z-10">
          {projects.map((card) => {
            const isActiveProject = activeProject === card.id;
            const dynamicProgress = getDynamicProgress(card);
            const isEditingColor = editingColorProjectId === card.id;
            const { h, s } = getProjectHSL(card);
            
            return (
            <div 
              key={card.id}
              onMouseEnter={() => playSound('click')}
              onClick={() => {
                if (isEditingColor) return;
                setActiveProject(card.id);
                setEditingProjectModal(card);
                setShowNewProjectModal(true);
                playSound('click');
              }}
              style={{ backgroundColor: getProjectBgColor(card) }}
              className={`relative w-[280px] h-[140px] rounded-[20px] p-4 flex flex-col shrink-0 cursor-pointer transition-all duration-300 pointer-events-auto snap-start border border-white/10 overflow-hidden shadow-lg ${
                isActiveProject ? "ring-2 ring-white/40 scale-[1.02]" : "hover:scale-[1.02]"
              }`}
            >
              {/* Soft White Radial Highlight (Light overlay on top corner for depth) */}
              <div className="absolute inset-0 rounded-[20px] overflow-hidden pointer-events-none">
                <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/15 rounded-full blur-[20px]" />
              </div>
              
              {/* Header: Logo + Title/Client + Pill */}
              <div className="relative z-10 flex items-center gap-3 w-full">
                  <div className="relative flex-shrink-0 group/logo">
                    <motion.div 
                      onClick={(e) => {
                        e.stopPropagation();
                        playSound('pop');
                        setEditingColorProjectId(isEditingColor ? null : card.id);
                      }}
                      animate={{ rotate: isEditingColor ? 360 : 0 }}
                      transition={{ type: "spring", stiffness: 100, damping: 15 }}
                      className="w-9 h-9 rounded-full bg-black/20 border border-white/5 flex items-center justify-center shadow-inner cursor-pointer hover:scale-105 active:scale-95 hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_12px_rgba(255,255,255,0.15)] transition-all duration-300"
                    >
                      <Image src="/taski-icon.png?v=3" alt="Taski Icon" width={20} height={20} className="object-contain opacity-90" />
                    </motion.div>
                    
                    {/* Tooltip for hover affordance (placed outside the rotating motion.div) */}
                    {!isEditingColor && (
                      <div className="absolute bottom-11 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg opacity-0 pointer-events-none group-hover/logo:opacity-100 transition-opacity duration-200 whitespace-nowrap text-[9px] font-black uppercase tracking-wider text-white z-50 shadow-xl">
                        Cambiar Color
                      </div>
                    )}
                  </div>
                  
                  {isEditingColor ? (
                    <h3 className={`${isNightMode ? 'text-zinc-100' : isNeumorphic ? 'text-slate-800' : 'text-white/90'} font-bold text-[13px] tracking-wide leading-tight`}>
                      Elige un color
                    </h3>
                  ) : (
                    <div className="flex flex-col min-w-0 flex-1">
                      {/* Title and Priority Pill Row */}
                      <div className="flex items-center justify-between gap-2 w-full">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          {/* Quick delete trash icon */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`¿Estás seguro de que deseas eliminar el proyecto "${card.title}" y todas sus tareas?`)) {
                                deleteProject(card.id);
                              }
                            }}
                            className="p-1 rounded-full text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 transition-colors duration-200 shrink-0"
                            title="Eliminar Proyecto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <h3 className={`${isNightMode ? 'text-zinc-100' : isNeumorphic ? 'text-slate-800' : 'text-white/90'} font-bold text-[13px] truncate tracking-wide leading-tight`} title={card.title}>
                            {card.title}
                          </h3>
                        </div>
                        
                        {/* Priority Pill with Dropdown */}
                        <div className="relative flex-shrink-0">
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              playSound('pop');
                              setOpenDropdownId(openDropdownId === card.id ? null : card.id);
                            }}
                            className={`px-2 py-[2px] rounded-full border text-[8px] font-black uppercase tracking-[0.1em] cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-lg leading-none flex items-center justify-center ${
                              card.priority === "Urgente" ? "bg-rose-500/20 border-rose-500/40 text-rose-400" : 
                              card.priority === "Alta" ? "bg-orange-500/20 border-orange-500/40 text-orange-400" : 
                              card.priority === "Media" ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-400" : "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                            }`}
                          >
                            {card.priority}
                          </div>
                          
                          {/* Dropdown Menu (Escapes the card) */}
                          {openDropdownId === card.id && (
                            <div className="absolute top-0 left-full ml-4 w-[75px] z-[100] flex flex-col gap-1.5">
                              {[
                                { label: 'Urgente', classes: 'bg-rose-500/20 border-rose-500/40 text-rose-400' },
                                { label: 'Alta', classes: 'bg-orange-500/20 border-orange-500/40 text-orange-400' },
                                { label: 'Media', classes: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400' },
                                { label: 'Baja', classes: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' }
                              ].filter(p => p.label !== card.priority).map(p => (
                                  <div 
                                    key={p.label} 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      playSound('pop');
                                      updatePriority(card.id, p.label);
                                      setOpenDropdownId(null);
                                    }}
                                  className={`px-2 py-[3px] rounded-full border text-[7.5px] font-black uppercase tracking-[0.1em] cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-lg leading-none flex items-center justify-center backdrop-blur-xl ${p.classes}`}
                                >
                                  {p.label}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Client Subtitle */}
                      <span className={`${isNightMode ? 'text-zinc-400' : isNeumorphic ? 'text-slate-400' : 'text-white/40'} text-[9px] font-bold uppercase tracking-widest truncate mt-0.5`} title={card.client}>
                        Cliente: {card.client}
                      </span>
                    </div>
                  )}
              </div>

              {isEditingColor ? (
                <div className="relative z-10 flex flex-col w-full min-h-0 flex-1 justify-center">
                  {/* Preset color selection carousel */}
                  <div className="flex items-center gap-1.5 w-full mt-1.5 select-none overflow-hidden flex-shrink-0">
                    <div 
                      className="w-5 h-5 rounded-full border border-white/40 shadow-inner flex-shrink-0 relative"
                      style={{
                        backgroundColor: `hsl(${h}, ${s}%, 55%)`
                      }}
                      title="Color Personalizado"
                    >
                      <div className="absolute inset-0 rounded-full border border-black/20" />
                    </div>

                    <div className="w-px h-4 bg-white/15 flex-shrink-0" />

                    <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar flex-1 py-0.5 mask-linear-right">
                      {COLOR_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            playSound('pop');
                            updateProjectColor(card.id, preset.h, preset.s, preset.l);
                          }}
                          className={`w-5 h-5 rounded-full border cursor-pointer hover:scale-110 active:scale-95 transition-all flex-shrink-0 relative flex items-center justify-center ${
                            Math.abs(preset.h - h) < 3 && Math.abs(preset.s - s) < 3 
                              ? 'border-white/60 scale-105 shadow-[0_0_8px_rgba(255,255,255,0.2)]' 
                              : 'border-white/10 hover:border-white/30'
                          }`}
                          style={{
                            backgroundColor: `hsl(${preset.h}, ${preset.s}%, 55%)`
                          }}
                          title={preset.name}
                        >
                          <div className="absolute inset-0 rounded-full border border-black/10" />
                          {Math.abs(preset.h - h) < 3 && Math.abs(preset.s - s) < 3 && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dual Sliders: Hue and Saturation */}
                  <div className="flex flex-col gap-1 mt-1.5 w-full">
                    {/* Hue Slider */}
                    <div className="relative w-full h-1">
                      <input 
                        type="range" 
                        min="0" 
                        max="360" 
                        value={h}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          updateProjectColor(card.id, val, s);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full h-1 rounded-full appearance-none outline-none cursor-pointer color-picker-slider relative z-10"
                        style={{
                          background: "linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)"
                        }}
                      />
                    </div>

                    {/* Saturation Slider */}
                    <div className="relative w-full h-1">
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={s}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          updateProjectColor(card.id, h, val);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full h-1 rounded-full appearance-none outline-none cursor-pointer color-picker-slider relative z-10"
                        style={{
                          background: `linear-gradient(to right, hsl(${h}, 0%, 50%), hsl(${h}, 100%, 50%))`
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Progress Bars */}
                  <div className="relative z-10 mt-3 flex flex-col gap-1.5">
                    <div className={`flex items-center justify-between text-[8px] font-black tracking-[0.15em] uppercase ${isNightMode ? 'text-zinc-400' : isNeumorphic ? 'text-slate-500' : 'text-white/60'}`}>
                      <span>Progreso del Proyecto</span>
                      <span className={isNightMode ? 'text-zinc-200 font-bold' : isNeumorphic ? 'text-slate-700' : 'text-white/80'}>{dynamicProgress.progress}</span>
                    </div>
                    <div className={`w-full h-2 rounded-full overflow-hidden shadow-inner ${isNightMode ? 'bg-zinc-900 border border-white/5' : isNeumorphic ? 'bg-slate-200' : 'bg-black/40'}`}>
                      <div 
                        className="h-full rounded-full transition-all duration-500 ease-out" 
                        style={{ 
                          width: dynamicProgress.percent,
                          backgroundColor: getProjectBgColor(card)
                        }} 
                      />
                    </div>
                  </div>

                  {/* Bottom Metadata: Cost | Days Remaining */}
                  <div className="relative z-10 mt-auto flex items-center justify-between w-full">
                    {/* Cost */}
                    <div className="flex items-baseline gap-1">
                      <span className={`${isNightMode ? 'text-zinc-400' : isNeumorphic ? 'text-slate-400' : 'text-white/40'} text-[10px] font-bold`}>$</span>
                      <span className={`${isNightMode ? 'text-zinc-100 font-black' : isNeumorphic ? 'text-slate-800' : 'text-white/90'} text-[13px] font-black tracking-wide`}>{card.cost?.replace('$', '')}</span>
                    </div>
                    
                    <div className={`w-px h-4 ${isNightMode ? 'bg-zinc-800' : isNeumorphic ? 'bg-slate-300' : 'bg-white/20'}`} />

                    {/* Days Remaining */}
                    <span className={`${isNightMode ? 'text-zinc-400' : isNeumorphic ? 'text-slate-500' : 'text-white/50'} text-[8.5px] font-bold uppercase tracking-widest truncate text-right`}>
                      Termina en <span className={isNightMode ? 'text-zinc-200 font-bold' : isNeumorphic ? 'text-slate-700' : 'text-white/90'}>{card.daysRemaining}</span>
                    </span>
                  </div>
                </>
              )}
            </div>
            );
          })}
          
          {/* Botón Nuevo Proyecto */}
          <div 
            onClick={() => {
              playSound('click');
              setShowNewProjectModal(true);
            }}
            className={`relative w-[280px] h-[60px] rounded-[20px] p-4 flex items-center justify-center shrink-0 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 pointer-events-auto snap-start border border-dashed group ${
              isNeumorphic
                ? "border-slate-400 text-slate-500 hover:text-slate-800 bg-transparent shadow-[inset_3px_3px_6px_#b8c4d9,inset_-3px_-3px_6px_#ffffff]"
                : "liquid-glass-btn border-white/20 hover:border-white/50 text-white/50 hover:text-white"
            }`}
          >
            <span className="text-[12px] font-bold uppercase tracking-widest flex items-center gap-2 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Proyecto
            </span>
          </div>
        </div>
      </div>
      )}

      {/* Scroll Fade Overlay (Bottom) */}
      {activeTab === "proyectos" && (
        <div className={`absolute bottom-4 left-6 w-[280px] h-24 bg-gradient-to-t pointer-events-none z-50 transition-all duration-500 ${
          isNightMode
            ? "from-[#121212] via-[#121212]/90 to-transparent"
            : isNeumorphic
              ? "from-[#e6eef8] via-[#e6eef8]/90 to-transparent"
              : "from-[#fffce2] via-[#fffce2]/90 to-transparent"
        }`} />
      )}

      {/* Selected Project Dashboard */}
      {activeTab === "proyectos" && (
        <ProjectDashboard 
          project={projects.find(p => p.id === activeProject) || null} 
          onUpdateTitle={updateTitle}
          onUpdateBriefCore={updateBriefCore}
          onUpdateDates={updateDates}
          onUpdateTasks={updateTasks}
          onUpdateClient={updateClient}
          onUpdatePackage={updatePackage}
          onUpdateCost={updateCost}
          onUpdateBurnRate={updateBurnRate}
          onUpdateStatus={updateStatus}
          onUpdatePriority={updatePriority}
          onUpdateDaysRemaining={updateDaysRemaining}
          onSelectTask={(taskId) => setActiveTaskId(taskId)}
          onDeleteProject={deleteProject}
          onSelectProject={(projId) => {
            const targetProject = projects.find((p) => String(p.id) === String(projId));
            if (targetProject) {
              setActiveProject(targetProject.id);
              setEditingProjectModal(targetProject);
              setShowNewProjectModal(true);
              playSound('click');
            }
          }}
          isNeumorphic={isNeumorphic}
          isNightMode={isNightMode}
          isSidebarHovered={isSidebarHovered}
        />
      )}

      {/* Empty Canvas View */}
      <AnimatePresence mode="wait">
        {activeTab !== "proyectos" && (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -15, filter: "blur(8px)" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute top-[80px] left-6 right-6 bottom-4 z-30 pointer-events-auto flex flex-col gap-6 overflow-x-hidden"
          >
            {/* Render Home Dashboard */}
            {activeTab === "home" && (
              <HomeDashboard
                projects={projects}
                onSelectTab={(tab) => setActiveTab(tab)}
                onSelectProject={(projectId) => {
                  const targetProject = projects.find((p) => String(p.id) === String(projectId));
                  if (targetProject) {
                    setActiveProject(targetProject.id);
                    setEditingProjectModal(targetProject);
                    setShowNewProjectModal(true);
                    playSound('click');
                  } else {
                    setActiveProject(projectId);
                    setActiveTab("proyectos");
                  }
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

            {/* Render Projects V2 Dashboard */}
            {activeTab === "proyectos_v2" && (
              <ProjectsV2Dashboard
                projects={projects}
                onSelectProject={(projId) => {
                  const targetProject = projects.find((p) => String(p.id) === String(projId));
                  if (targetProject) {
                    setActiveProject(targetProject.id);
                    setActiveTab("proyectos");
                    playSound('click');
                  } else {
                    setActiveProject(Number(projId));
                    setActiveTab("proyectos");
                  }
                }}
                onEditProject={(proj) => {
                  setActiveProject(proj.id);
                  setEditingProjectModal(proj);
                  setShowNewProjectModal(true);
                  playSound('click');
                }}
                onNewProject={() => {
                  setEditingProjectModal(null);
                  setShowNewProjectModal(true);
                  playSound('click');
                }}
                isNeumorphic={isNeumorphic}
                isNightMode={isNightMode}
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
                isNeumorphic={isNeumorphic}
                isNightMode={isNightMode}
              />
            )}

            {/* Render Client V2 Dashboard */}
            {activeTab === "cliente_v2" && (
              <ClientV2Dashboard 
                projects={projects}
                onUpdateProjects={setProjects}
                onSelectProject={(projId) => {
                  const targetProject = projects.find((p) => String(p.id) === String(projId));
                  if (targetProject) {
                    setActiveProject(targetProject.id);
                    setEditingProjectModal(targetProject);
                    setShowNewProjectModal(true);
                    playSound('click');
                  } else {
                    setActiveProject(Number(projId));
                    setActiveTab("proyectos");
                  }
                }}
                isNeumorphic={isNeumorphic}
                isNightMode={isNightMode}
              />
            )}

            {/* Tab Header Pill & Details (For Finanzas & Ajustes) */}
            {(activeTab === "finanzas" || activeTab === "ajustes") && (
              <div className="flex flex-col gap-1">
                <div className={`relative px-4 py-1.5 rounded-full text-[11px] font-bold tracking-widest uppercase flex items-center justify-center w-fit overflow-hidden border shadow-lg cursor-default select-none transition-all duration-500 ${
                  isNeumorphic 
                    ? "bg-slate-100/80 border-slate-200 text-slate-700 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.05)]" 
                    : "liquid-glass-btn border-white/10 text-white/95"
                }`}>
                  {!isNeumorphic && <div className="absolute -top-4 -left-4 w-12 h-12 bg-white opacity-10 rounded-full blur-[10px] pointer-events-none" />}
                  <span className="relative z-10">
                    {activeTab === "finanzas" ? "Finanzas" : "Ajustes"}
                  </span>
                </div>
                
                <h1 className={`text-4xl md:text-5xl font-extralight tracking-tight mt-3 transition-colors duration-500 ${
                  isNeumorphic ? 'text-slate-800' : 'text-white/95'
                }`}>
                  {activeTab === "finanzas" ? "Métricas Financieras" : "Ajustes del Sistema"}
                </h1>
                <p className={`text-[14px] font-light max-w-xl mt-2 leading-relaxed transition-colors duration-500 ${
                  isNeumorphic ? 'text-slate-500' : 'text-white/50'
                }`}>
                  {activeTab === "finanzas" ? "Supervisa presupuestos, costos operativos, facturación y márgenes de ganancia." : 
                   "Ajustes de personalización, conexiones de bases de datos, integraciones de API y preferencias del sistema."}
                </p>
              </div>
            )}

            {/* Canvas Body (For Finanzas & Ajustes) */}
            {(activeTab === "finanzas" || activeTab === "ajustes") && (
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
                      {activeTab === "finanzas" ? <DollarSign className="w-8 h-8" strokeWidth={1} /> :
                       <Settings className="w-8 h-8" strokeWidth={1} />}
                    </motion.div>
                    <span className={`text-[11px] font-black uppercase tracking-[0.2em] transition-colors duration-500 ${
                      isNeumorphic ? "text-slate-700" : "text-white/70"
                    }`}>Lienzo en Construcción</span>
                    <span className={`text-[13px] font-extralight max-w-sm mt-1.5 leading-relaxed transition-colors duration-500 ${
                      isNeumorphic ? "text-slate-500" : "text-white/40"
                    }`}>
                      Módulo interactivo listo para conectar con tu base de datos de Notion y servicios de IA.
                    </span>
                  </div>
                </div>

                {/* Subtle status/metadata line */}
                <div className={`flex items-center justify-between text-[9px] uppercase tracking-[0.15em] font-bold mt-4 transition-colors duration-500 ${
                  isNeumorphic ? "text-slate-400" : "text-white/30"
                }`}>
                  <span>Taski Engine v1.0.0</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Lienzo Listo</span>
                  </div>
                </div>
              </div>
            )}


          </motion.div>
        )}
      </AnimatePresence>
      </motion.div>

      <NewProjectModal
        isOpen={showNewProjectModal}
        onClose={() => {
          setShowNewProjectModal(false);
          setEditingProjectModal(null);
        }}
        onCreateProject={addNewProjectFromModal}
        onDeleteProject={deleteProject}
        editingProject={editingProjectModal}
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
                percent: evalProj.percent
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
    </main>
  );
}
