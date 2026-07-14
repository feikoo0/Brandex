"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Home, Folder, Users, Briefcase, DollarSign, Settings, TrendingUp, ArrowUpRight, Wallet, Activity, Sun, Moon, Search, LayoutGrid, Table, CalendarDays, SquarePen, SlidersHorizontal, Archive, Layers, ChevronDown, Bell, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { ProjectDashboard, Project, Task } from "./components/ProjectDashboard";
import NewProjectModal, { ProjectData } from "./components/NewProjectModal";
import { playSound } from "./utils/audio";
import { INITIAL_PROJECTS, getDynamicProgress } from "./utils/data";
import TimeHeatmap from "./components/TimeHeatmap";
import { TeamDashboard } from "./components/TeamDashboard";
import { ClientsDashboard } from "./components/ClientsDashboard";
import { HomeDashboard } from "./components/HomeDashboard";

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

const COLOR_PRESETS = [
  { name: "Azul Eléctrico", h: 217, s: 91, l: 60 },
  { name: "Naranja", h: 25, s: 95, l: 50 },
  { name: "Púrpura", h: 271, s: 91, l: 65 },
  { name: "Esmeralda", h: 142, s: 70, l: 45 },
  { name: "Amarillo Neón", h: 65, s: 95, l: 50 },
  { name: "Rosa Neón", h: 328, s: 95, l: 55 },
  { name: "Cyan Brillante", h: 180, s: 90, l: 50 },
  { name: "Blanco Puro", h: 0, s: 0, l: 100 },
];

function getInitialHSL(gradient: string): { h: number; s: number; l: number } {
  if (gradient.includes("blue-600")) return { h: 217, s: 91, l: 60 };
  if (gradient.includes("orange-600")) return { h: 25, s: 95, l: 50 };
  if (gradient.includes("purple-600")) return { h: 271, s: 91, l: 65 };
  if (gradient.includes("emerald-700")) return { h: 142, s: 70, l: 45 };
  if (gradient.includes("slate-600")) return { h: 0, s: 0, l: 50 };
  if (gradient.includes("indigo-600")) return { h: 239, s: 84, l: 55 };
  if (gradient.includes("fuchsia-600")) return { h: 297, s: 90, l: 60 };
  if (gradient.includes("teal-700")) return { h: 174, s: 80, l: 45 };
  return { h: 210, s: 80, l: 55 };
}

function getProjectHSL(project: Project): { h: number; s: number; l: number } {
  if (project.customColor) {
    return project.customColor;
  }
  return getInitialHSL(project.gradient);
}

export default function BrandexV3Page() {
  const [activeTab, setActiveTab] = useState("home");
  const [homeView, setHomeView] = useState<"buscar" | "kanban" | "tabla" | "timeline">("kanban");
  const [viewFilterMode, setViewFilterMode] = useState<"mio" | "equipo">("equipo");
  const [groupingMode, setGroupingMode] = useState<"fecha" | "cliente" | "prioridad" | "estado">("fecha");
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(3);
  const [isNightMode, setIsNightMode] = useState(true);
  const isNeumorphic = true;
  const [activeProject, setActiveProject] = useState(1);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const lastScrollIndexRef = useRef<number>(0);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);

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

  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [isClient, setIsClient] = useState(false);
  const [sessionGreeting, setSessionGreeting] = useState<string>("Buenos días, bienvenido de nuevo");
  const [hoveredMenuItem, setHoveredMenuItem] = useState<string | null>(null);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  // Initialize from localStorage on mount
  useEffect(() => {
    setIsClient(true);

    const hourVal = new Date().getHours();
    const morningGreetings = [
      "Buenos días, bienvenido de nuevo",
      "Hola, comenzando la jornada de hoy",
      "Hola, que tengas un excelente día"
    ];

    const afternoonGreetings = [
      "Buenas tardes, bienvenido de nuevo",
      "Hola, tu espacio está listo para continuar",
      "Hola, revisemos el progreso de la tarde"
    ];

    const nightGreetings = [
      "Buenas noches, bienvenido de nuevo",
      "Hola, hora de revisar el balance de hoy",
      "Hola, cerrando las metas del día"
    ];

    const lateNightGreetings = [
      "Buenas noches, la estación sigue activa",
      "Hola, trabajando en el turno nocturno",
      "Hola, el lienzo nocturno está listo"
    ];

    let pool = morningGreetings;
    if (hourVal >= 6 && hourVal < 12) {
      pool = morningGreetings;
    } else if (hourVal >= 12 && hourVal < 18) {
      pool = afternoonGreetings;
    } else if (hourVal >= 18 && hourVal < 23) {
      pool = nightGreetings;
    } else {
      pool = lateNightGreetings;
    }

    const randomGreeting = pool[Math.floor(Math.random() * pool.length)];
    setSessionGreeting(randomGreeting);

    const loadFromFirestore = async () => {
      try {
        const colRef = collection(db, "v3_projects");
        const snap = await getDocs(colRef);
        
        if (snap.empty) {
          console.log("Firestore v3_projects is empty. Seeding INITIAL_PROJECTS.");
          const seedData = seedProjectsWithSessions(INITIAL_PROJECTS);
          const seedPromises = seedData.map(p => {
            return setDoc(doc(db, "v3_projects", String(p.id)), p);
          });
          await Promise.all(seedPromises);
          setProjects(seedData);
        } else {
          const list: Project[] = [];
          snap.forEach(docSnap => {
            list.push(docSnap.data() as Project);
          });
          list.sort((a, b) => Number(a.id) - Number(b.id));
          setProjects(list);
        }
      } catch (err) {
        console.error("Firestore load error, falling back to localStorage:", err);
        const savedProjects = localStorage.getItem('brandex_v3_projects');
        if (savedProjects) {
          try {
            const parsed = JSON.parse(savedProjects);
            const isNotionData = parsed.some((p: any) => typeof p.id === 'string');
            if (isNotionData) {
              localStorage.removeItem('brandex_v3_projects');
              setProjects(seedProjectsWithSessions(INITIAL_PROJECTS));
            } else {
              setProjects(seedProjectsWithSessions(parsed));
            }
          } catch (e) {
            setProjects(seedProjectsWithSessions(INITIAL_PROJECTS));
          }
        } else {
          setProjects(seedProjectsWithSessions(INITIAL_PROJECTS));
        }
      }
    };

    loadFromFirestore();
  }, []);

  // Save to Firestore and localStorage when projects change
  useEffect(() => {
    if (isClient && projects.length > 0) {
      localStorage.setItem('brandex_v3_projects', JSON.stringify(projects));
      
      // Save each project to Firestore asynchronously
      projects.forEach(async (p) => {
        try {
          await setDoc(doc(db, "v3_projects", String(p.id)), p);
        } catch (err) {
          console.error("Error saving project to Firestore:", err);
        }
      });
    }
  }, [projects, isClient]);

  const updatePriority = (id: number, priority: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, priority } : p));
  };

  const [editingColorProjectId, setEditingColorProjectId] = useState<number | null>(null);

  const updateProjectColor = (id: number, h: number, s: number, l: number = 55) => {
    setProjects(prev => prev.map(p => {
      if (p.id === id) {
        const customGradientStyle = `linear-gradient(135deg, hsl(${h}, ${s}%, 55%) 0%, hsl(${(h + 40) % 360}, ${Math.max(s - 10, 0)}%, 45%) 100%)`;
        const customGlowStyle = `hsl(${h}, ${s}%, 50%)`;
        return {
          ...p,
          customColor: { h, s, l },
          customGradientStyle,
          customGlowStyle
        };
      }
      return p;
    }));
  };

  const updateTitle = (id: number, title: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, title } : p));
  };

  const updateBriefCore = (id: number, briefCore: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, briefCore } : p));
  };

  const updateDates = (id: number, startDate: string, deadline: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, startDate, deadline } : p));
  };

  const updateTasks = (id: number, tasks: Task[]) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, tasks } : p));
  };

  const updateClient = (id: number, client: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, client } : p));
  };

  const updatePackage = (id: number, packageStr: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, package: packageStr } : p));
  };

  const updateCost = (id: number, cost: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, cost } : p));
  };

  const updateDaysRemaining = (id: number, daysRemaining: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, daysRemaining } : p));
  };

  const updateBurnRate = (id: number, burnRate: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, burnRate } : p));
  };

  const updateStatus = (id: number, status: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status } : p));
  };

  const addProject = () => {
    const newId = Math.max(...projects.map(p => p.id), 0) + 1;
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
  };

  const addNewProjectFromModal = (data: ProjectData) => {
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
      deadline: data.deadline,
      daysRemaining: data.daysRemaining,
      briefCore: data.desc || "Escribe el core brief aquí.",
      priority: data.priority,
      cost: data.cost,
      tasks: data.tasks.map(t => ({
        ...t,
        statusColor: t.status === "Completado" 
          ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
          : t.status === "En Proceso"
            ? "bg-amber-500/20 border-amber-500/30 text-amber-400"
            : "bg-white/5 border border-white/10 text-white/60"
      }))
    };
    
    setProjects(prev => [newProject, ...prev]);
    setActiveProject(newId);
    setShowNewProjectModal(false);
    playSound('pop');
  };

  const menuItems = [
    { id: "home", label: "Home", path: "/" },
    { id: "proyectos", label: "Proyectos", path: "/proyectos" },
    { id: "equipo", label: "Equipo", path: "/equipo" },
    { id: "clientes", label: "Clientes", path: "/cliente" },
    { id: "finanzas", label: "Finanzas", path: "/admin" },
    { id: "ajustes", label: "Ajustes", path: "#" },
  ];

  // Map icon component manually for typing compatibility and style outlines vs solid fills
  const getIcon = (id: string, isActive: boolean) => {
    const fill = isActive ? "currentColor" : "none";
    const strokeWidth = isActive ? 1.5 : 1.75;
    const className = `w-[20px] h-[20px] transition-all duration-300 shrink-0 ${
      isNightMode
        ? isActive ? "text-white opacity-100" : "text-neutral-500 group-hover:text-white"
        : isActive ? "text-slate-900 opacity-100" : "text-slate-500 group-hover:text-slate-800"
    }`;

    switch (id) {
      case "home": return <Home className={className} fill={fill} strokeWidth={strokeWidth} />;
      case "proyectos": return <Folder className={className} fill={fill} strokeWidth={strokeWidth} />;
      case "equipo": return <Users className={className} fill={fill} strokeWidth={strokeWidth} />;
      case "clientes": return <Briefcase className={className} fill={fill} strokeWidth={strokeWidth} />;
      case "finanzas": return <DollarSign className={className} fill={fill} strokeWidth={strokeWidth} />;
      case "ajustes": return <Settings className={className} fill={fill} strokeWidth={strokeWidth} />;
      default: return null;
    }
  };

  const activeProjectData = projects.find(p => p.id === activeProject);



  return (
    <main className={`relative w-screen h-screen overflow-hidden select-none font-sans transition-colors duration-500 ${isNightMode ? 'bg-[#111113] text-neutral-100' : 'bg-[#f8fafc] text-slate-900'}`}>
      {/* Background Container */}
      <div className="absolute inset-0 overflow-hidden z-0 bg-transparent pointer-events-none">
        <div className={`absolute inset-0 transition-colors duration-500 ${isNightMode ? 'bg-[#111113]' : 'bg-[#f8fafc]'}`} />
      </div>

      {/* Top Left Logo Wrapper */}
      <div className="absolute top-[28px] left-3.5 w-10 h-14 flex items-center justify-center z-50">
        <Link href="/" className="group flex items-center justify-center">
          <Image 
            src="/BRANDEX%20ICON.png?v=2" 
            alt="Brandex Icon" 
            width={28} 
            height={28} 
            className={`object-contain opacity-90 group-hover:opacity-100 transition-all duration-300 ${isNightMode ? 'filter brightness-125' : 'filter invert-[0.15]'}`}
          />
        </Link>
      </div>

      {/* Dynamic 2-line Title next to Logo + Home KPIs & TimeHeatmap */}
      {/* Dynamic Header Wrapper aligned with the 12-column grid */}
      <div className="absolute top-[20px] left-[216px] right-[40px] h-[64px] grid grid-cols-12 gap-5 items-center z-50 pointer-events-auto">
        <div className="col-span-9 flex items-center justify-between h-full relative">
          {/* Title on the left */}
          <div className="flex items-center shrink-0">
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
                   activeTab === "equipo" ? "Espacio de Equipo" :
                   activeTab === "clientes" ? "Directorio de Clientes" :
                   activeTab === "finanzas" ? "Métricas Financieras" :
                   activeTab === "ajustes" ? "Ajustes del Sistema" : "Buenos días"}
                </span>
                <span className={`text-xl md:text-2xl font-medium tracking-tight transition-colors duration-500 ${
                  isNightMode ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  {activeTab === "proyectos" ? "flujo y entregables activos" :
                   activeTab === "equipo" ? "colaboradores y carga de trabajo" :
                   activeTab === "clientes" ? "marcas asociadas y contratos" :
                   activeTab === "finanzas" ? "facturación y margen operativo" :
                   activeTab === "ajustes" ? "configuración y preferencias" : "bienvenido de nuevo"}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* View Switcher centered inside col-span-9 */}
          {activeTab === "home" && (
            <div className="relative flex items-center rounded-full bg-[oklch(0.55_0.01_286_/_4%)] dark:bg-[oklch(0.55_0.01_286_/_6%)] border border-white/5 p-1 w-fit shrink-0">
              {/* Search Tab */}
              <button
                type="button"
                onClick={() => setHomeView("buscar")}
                className={`relative z-10 box-border inline-flex h-8 items-center justify-center rounded-full whitespace-nowrap select-none gap-1.5 px-8 text-xs font-bold transition-colors duration-200 ${
                  homeView === "buscar"
                    ? "text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {homeView === "buscar" && (
                  <motion.span
                    layoutId="activeViewIndicator"
                    className="absolute inset-0 rounded-full bg-white/10 dark:bg-white/[0.08] shadow-[0_1px_3px_rgba(0,0,0,0.2)] border border-white/10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Search className="w-4 h-4 shrink-0" />
                <span>Search</span>
              </button>

              {/* Kanban Tab */}
              <button
                type="button"
                onClick={() => setHomeView("kanban")}
                className={`relative z-10 box-border inline-flex h-8 items-center justify-center rounded-full whitespace-nowrap select-none gap-1.5 px-4 text-xs font-bold transition-colors duration-200 ${
                  homeView === "kanban"
                    ? "text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {homeView === "kanban" && (
                  <motion.span
                    layoutId="activeViewIndicator"
                    className="absolute inset-0 rounded-full bg-white/10 dark:bg-white/[0.08] shadow-[0_1px_3px_rgba(0,0,0,0.2)] border border-white/10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <LayoutGrid className="w-4 h-4 shrink-0" />
                <span>Kanban</span>
              </button>

              {/* Base de Datos Tab */}
              <button
                type="button"
                onClick={() => setHomeView("tabla")}
                className={`relative z-10 box-border inline-flex h-8 items-center justify-center rounded-full whitespace-nowrap select-none gap-1.5 px-4 text-xs font-bold transition-colors duration-200 ${
                  homeView === "tabla"
                    ? "text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {homeView === "tabla" && (
                  <motion.span
                    layoutId="activeViewIndicator"
                    className="absolute inset-0 rounded-full bg-white/10 dark:bg-white/[0.08] shadow-[0_1px_3px_rgba(0,0,0,0.2)] border border-white/10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Table className="w-4 h-4 shrink-0" />
                <span>Base de datos</span>
              </button>

              {/* Timeline Tab */}
              <button
                type="button"
                onClick={() => setHomeView("timeline")}
                className={`relative z-10 box-border inline-flex h-8 items-center justify-center rounded-full whitespace-nowrap select-none gap-1.5 px-4 text-xs font-bold transition-colors duration-200 ${
                  homeView === "timeline"
                    ? "text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {homeView === "timeline" && (
                  <motion.span
                    layoutId="activeViewIndicator"
                    className="absolute inset-0 rounded-full bg-white/10 dark:bg-white/[0.08] shadow-[0_1px_3px_rgba(0,0,0,0.2)] border border-white/10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <CalendarDays className="w-4 h-4 shrink-0" />
                <span>Timeline</span>
              </button>
            </div>
          )}

          {/* Quick Action Buttons on the right side of col-span-9 */}
          {activeTab === "home" && (
            <div className="flex items-center gap-3 shrink-0">
              {/* 1. Agrupar Dropdown Button */}
              <div className="relative">
                <button
                  onClick={() => {
                    playSound('click');
                    setGroupDropdownOpen(!groupDropdownOpen);
                  }}
                  className={`flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs font-bold transition-all duration-200 shadow-sm ${
                    isNightMode
                      ? "bg-[oklch(0.55_0.01_286_/_6%)] border-white/5 text-slate-350 hover:text-white hover:border-white/10"
                      : "bg-[oklch(0.55_0.01_286_/_4%)] border-slate-200 text-slate-750 hover:text-slate-900 hover:border-slate-300"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>
                    {
                      groupingMode === "fecha" ? "Fecha" :
                      groupingMode === "cliente" ? "Cliente" :
                      groupingMode === "prioridad" ? "Prioridad" : "Estado"
                    }
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
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
                        onClick={() => { setGroupingMode("fecha"); setGroupDropdownOpen(false); }}
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
                        onClick={() => { setGroupingMode("cliente"); setGroupDropdownOpen(false); }}
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
                        onClick={() => { setGroupingMode("prioridad"); setGroupDropdownOpen(false); }}
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
                        onClick={() => { setGroupingMode("estado"); setGroupDropdownOpen(false); }}
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
        </div>
      </div>

      {/* Top Right Controls: Notification Bell, User Profile Pill & Single Circular Day ☀️ / Night 🌙 Toggle Button */}
      <div className="absolute top-[20px] right-8 z-[100] flex items-center gap-2.5 pointer-events-auto select-none">
        {/* Notification Bell Icon Button with Red Badge */}
        {activeTab === "home" && (
          <button
            onClick={() => {
              playSound('pop');
              setNotificationCount(prev => prev > 0 ? 0 : 3);
            }}
            className={`relative flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-300 shadow-sm shrink-0 ${
              isNightMode
                ? "bg-[oklch(0.55_0.01_286_/_6%)] border-white/5 text-slate-350 hover:text-white hover:border-white/10"
                : "bg-[oklch(0.55_0.01_286_/_4%)] border-slate-200 text-slate-750 hover:text-slate-900 hover:border-slate-300"
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            {notificationCount > 0 && (
              <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse" />
            )}
          </button>
        )}

        {/* User Profile Pill */}
        <div className={`flex items-center h-8 gap-2.5 px-3.5 rounded-full border transition-all duration-300 shadow-sm ${
          isNightMode 
            ? "bg-slate-900 border-slate-800 text-slate-100" 
            : "bg-white border-slate-200 text-slate-900"
        }`}>
          <div className="relative w-5 h-5 rounded-full overflow-hidden flex-shrink-0 border border-slate-400/30 bg-slate-950 flex items-center justify-center">
            <Image 
              src="/BRANDEX%20ICON.png" 
              alt="User Profile" 
              width={14} 
              height={14} 
              className="object-contain opacity-90"
            />
            <span className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-1 ring-white" />
          </div>
          <span className="text-[12px] font-bold tracking-tight">
            Brandex Admin
          </span>
        </div>

        {/* Single Circular Day/Night Toggle Button */}
        <button
          onClick={() => {
            setIsNightMode(!isNightMode);
            playSound('click');
          }}
          title={isNightMode ? "Cambiar a Modo Día" : "Cambiar a Modo Noche"}
          className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 cursor-pointer shadow-sm ${
            isNightMode
              ? "bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800 hover:border-slate-700"
              : "bg-white border-slate-200 text-indigo-600 hover:bg-slate-100 hover:border-slate-300"
          }`}
        >
          {isNightMode ? (
            <Sun className="w-3.5 h-3.5 fill-amber-400/20" />
          ) : (
            <Moon className="w-3.5 h-3.5 fill-indigo-600/20" />
          )}
        </button>
      </div>

      {/* Column Header Pill */}
      {activeTab === "proyectos" && (
        <div className="absolute top-[140px] left-[216px] z-50 pointer-events-auto">
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
          className="absolute top-[235px] left-[216px] w-[500px] bottom-12 overflow-y-auto hide-scrollbar z-30 pb-20 px-8 pt-12 -ml-8 -mt-12 pointer-events-auto snap-y snap-mandatory scroll-pt-12"
          style={{
            maskImage: 'linear-gradient(to bottom, transparent 0px, transparent 24px, black 48px, black 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0px, transparent 24px, black 48px, black 100%)'
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
              onClick={() => {
                if (isEditingColor) return;
                setActiveProject(card.id);
                playSound('click');
              }}
              className={`relative w-[280px] h-[140px] rounded-[20px] p-4 flex flex-col shrink-0 cursor-pointer transition-all duration-300 pointer-events-auto snap-start ${
                isNightMode
                  ? isActiveProject
                    ? "neu-dark-inset border border-white/5 text-zinc-100 shadow-inner"
                    : "neu-dark-flat border border-white/5 text-zinc-300 hover:scale-[1.02]"
                  : isActiveProject
                    ? "neu-inset border border-white/30 text-slate-900 shadow-inner"
                    : "neu-flat border border-white/50 text-slate-700 hover:scale-[1.02]"
              }`}
            >
              {/* Radial Glow (Clipped to card shape) */}
              {!isNeumorphic && (
                <div className="absolute inset-0 rounded-[20px] overflow-hidden pointer-events-none">
                  <div 
                    className={`absolute -top-8 -left-8 w-28 h-28 ${card.customGlowStyle ? '' : card.glow} opacity-20 rounded-full blur-[25px] transition-opacity duration-300 ${isActiveProject ? 'opacity-40' : ''}`}
                    style={card.customGlowStyle ? { backgroundColor: card.customGlowStyle } : {}}
                  />
                </div>
              )}
              
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
                      <Image src="/BRANDEX%20ICON.png?v=2" alt="Brandex Icon" width={20} height={20} className="object-contain opacity-90" />
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
                        <h3 className={`${isNightMode ? 'text-zinc-100' : isNeumorphic ? 'text-slate-800' : 'text-white/90'} font-bold text-[13px] truncate tracking-wide leading-tight`} title={card.title}>
                          {card.title}
                        </h3>
                        
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
                        className={`h-full ${card.customGradientStyle ? '' : `bg-gradient-to-r ${card.gradient}`} rounded-full transition-all duration-500 ease-out`} 
                        style={{ 
                          width: dynamicProgress.percent,
                          ...(card.customGradientStyle ? { backgroundImage: card.customGradientStyle } : {})
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
        <div className={`absolute bottom-12 left-[216px] w-[280px] h-32 bg-gradient-to-t pointer-events-none z-50 transition-all duration-500 ${
          isNightMode
            ? "from-[#16181d] via-[#16181d]/90 to-transparent"
            : isNeumorphic
              ? "from-[#e6eef8] via-[#e6eef8]/90 to-transparent"
              : "from-[#08080a] via-[#08080a]/90 to-transparent"
        }`} />
      )}


      {/* Left Sidebar Menu Container (Instagram Web Style) */}
      <div className="absolute left-3.5 top-0 bottom-0 z-40 flex flex-col items-start justify-center pointer-events-none">
        {/* Background gradient of the sidebar - radial vertical mask */}
        {!isNeumorphic && (
          <div 
            className="absolute inset-y-0 -left-3.5 w-36 pointer-events-none transition-opacity duration-500"
            style={{
              background: "radial-gradient(ellipse 65px 340px at center, rgba(8, 8, 10, 1) 20%, rgba(8, 8, 10, 0.75) 55%, rgba(8, 8, 10, 0) 100%)",
            }}
          />
        )}

        {/* Vertically centered navigation icons wrapper */}
        <div
          onMouseEnter={() => setIsSidebarHovered(true)}
          onMouseLeave={() => {
            setIsSidebarHovered(false);
            setHoveredMenuItem(null);
          }}
          className="flex flex-col gap-1.5 pointer-events-auto bg-transparent border-transparent"
        >
          <nav className="flex flex-col gap-1 items-start">
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
                  animate={{ width: isSidebarHovered ? 160 : 40 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className={`relative flex items-center h-10 rounded-xl cursor-pointer select-none overflow-hidden transition-all duration-300 border-0 ${
                    isNightMode
                      ? isActive
                        ? "bg-white/10 text-white"
                        : isHovered
                          ? "bg-white/5 text-neutral-200"
                          : "bg-transparent"
                      : isActive
                        ? "bg-slate-200/80 text-slate-900"
                        : isHovered
                          ? "bg-slate-100 text-slate-800"
                          : "bg-transparent"
                  }`}
                >
                  {/* Icon - Fixed 40px width container on the far left (NEVER shifts) */}
                  <div className="flex items-center justify-center shrink-0 w-10 h-10">
                    {getIcon(item.id, isActive)}
                  </div>

                  {/* Text label - Silky smooth blur fade-in & fade-out without clipping */}
                  <AnimatePresence>
                    {isSidebarHovered && (
                      <motion.span
                        initial={{ opacity: 0, x: -6, filter: "blur(4px)" }}
                        animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, x: -6, filter: "blur(4px)" }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className={`text-[11px] uppercase tracking-widest whitespace-nowrap select-none pr-3 ${
                          isActive 
                            ? isNightMode ? "font-black opacity-100 text-indigo-400" : "font-black opacity-100 text-slate-900" 
                            : isNightMode ? "font-semibold opacity-70 text-zinc-400" : "font-semibold opacity-60 text-slate-600"
                        }`}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </nav>
        </div>
      </div>

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
          isNeumorphic={isNeumorphic}
          isNightMode={isNightMode}
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
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute top-[92px] left-[216px] right-[40px] bottom-4 z-30 pointer-events-auto flex flex-col gap-6"
          >
            {/* Render Home Dashboard */}
            {activeTab === "home" && (
              <HomeDashboard
                projects={projects}
                onSelectTab={(tab) => setActiveTab(tab)}
                onSelectProject={(projectId) => setActiveProject(projectId)}
                isNeumorphic={isNeumorphic}
                isNightMode={isNightMode}
                activeView={homeView}
                onViewChange={setHomeView}
                viewFilterMode={viewFilterMode}
                groupingMode={groupingMode}
                onUpdateProjects={setProjects}
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
                  <span>Brandex Engine v3.0.0</span>
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

      <NewProjectModal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        onCreateProject={addNewProjectFromModal}
        isNightMode={isNightMode}
        isNeumorphic={isNeumorphic}
      />
    </main>
  );
}
