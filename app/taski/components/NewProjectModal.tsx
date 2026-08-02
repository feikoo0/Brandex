"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playSound } from "../utils/audio";
import {
  X,
  Plus,
  ChevronLeft,
  Check,
  ChevronDown,
  Layers,
  Flag,
  Tag,
  Calendar,
  Target,
  DollarSign,
  Sparkles,
  Trash2,
  Building2,
  LayoutGrid,
  Clock,
  User,
  Users,
  Zap,
  Paperclip,
  Maximize2,
  Minimize2,
  MoreHorizontal
} from "lucide-react";
import FormatoShape from "./FormatoShape";
import { FORMATOS_ESTANDAR, getFormato } from "../utils/formatos";
import { Project } from "./ProjectDashboard";
import ProjectCoverFormats from "./ProjectCoverFormats";
import CreateClientModal, { ClientItem } from "./CreateClientModal";
import CreateTemplateModal, { ProjectTemplateItem } from "./CreateTemplateModal";
import CreateTemplateForm from "./CreateTemplateForm";
import CreateProjectTypeModal, { ProjectTypeItem } from "./CreateProjectTypeModal";
import LinearDropdownPopover, { PopoverOption } from "./LinearDropdownPopover";
import LinearDatePopover from "./LinearDatePopover";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PROJECT_COLOR_PALETTE, getSingleSourceProjectColor } from "@/lib/utils";

export interface Task {
  id: number;
  title: string;
  desc: string;
  format: string;
  formato?: string | null;
  time: string;
  status: 'Planificado' | 'En Proceso' | 'En Revisión' | 'Completado';
  statusColor: string;
  subtasks: { id: number; text: string; done: boolean }[];
  attachmentUrl?: string;
  deadline?: string;
  fecha_limite?: string;
  fecha_programada?: string;
  fecha_creacion?: string;
  kanbanOrders?: Record<string, number>;
  color?: string;
}

export interface TeamMemberItem {
  id: string;
  nombre: string;
  rol: string;
  color?: string;
}

export interface ProjectData {
  title: string;
  client: string;
  package: string;
  desc: string;
  status: string;
  priority: string;
  cost: string;
  startDate: string;
  deadline: string;
  deadlineRaw?: string;
  daysRemaining: string;
  burnRate: string;
  tasks: Task[];
  gradient: string;
  glow: string;
  customColor?: { h: number; s: number; l: number };
  customGradientStyle?: string;
  customGlowStyle?: string;
  team?: { name: string; color: string }[];
  asignado_ids?: string[];
  asignado?: string;
}

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (project: ProjectData) => void;
  onUpdateProject?: (projectId: string | number, updatedData: Partial<ProjectData> & { tasks?: Task[] }) => void;
  onDeleteProject?: (projectId: string | number) => void;
  editingProject?: Project | null;
  onSelectProject?: (projectId: string | number) => void;
  isNightMode?: boolean;
  isNeumorphic?: boolean;
  projects?: Project[];
}

const PRESET_GRADIENTS = PROJECT_COLOR_PALETTE.map((item) => ({
  name: item.name,
  gradient: item.gradient,
  glow: item.glow,
  color: item.hslStr,
  solidColor: item.solidColor
}));

function resolveProjectBgColor(p: Project): string {
  return getSingleSourceProjectColor(p).hslCss;
}

const DEFAULT_CLIENT_NAMES = [
  "Apple Inc.",
  "Nike",
  "Tesla",
  "Airbnb",
  "OpenAI",
  "Stripe",
  "Brandex",
  "Codigo Distinto",
  "PMG"
];

const DEFAULT_TEMPLATES: ProjectTemplateItem[] = [
  { id: "t1", name: "Estratégico", category: "Estratégico", desc: "Planificación estratégica y Roadmap de producto" },
  { id: "t2", name: "Branding Complete", category: "Branding Complete", desc: "Identidad visual completa, logo y guía de estilo" },
  { id: "t3", name: "Desarrollo Web", category: "Desarrollo Web", desc: "Sitio web profesional responsive y SEO optimizado" },
  { id: "t4", name: "UI/UX Design", category: "UI/UX Design", desc: "Diseño de interfaz de usuario y prototipos navegables" },
  { id: "t5", name: "Marketing Digital", category: "Marketing Digital", desc: "Campaña de redes sociales y embudos de venta" }
];

const PACKAGE_OPTIONS = [
  "Estratégico",
  "Branding Complete",
  "Desarrollo Web",
  "UI/UX Design",
  "Marketing Digital"
];

const formatDateToInput = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatDateToFriendly = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const month = months[date.getMonth()];
  return `${day} ${month}`;
};

const formatTimeAgo = (dateInput?: string | Date | number): string => {
  if (!dateInput) return "hace un momento";
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
    if (!str || str === "-") return "hace un momento";

    if (str.includes("T") || str.includes("Z")) {
      const d = new Date(str);
      if (!isNaN(d.getTime())) date = d;
    } else if (str.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const d = new Date(`${str}T00:00:00`);
      if (!isNaN(d.getTime())) date = d;
    } else {
      // Handle friendly dates like "24 Jun" or "15 May" without year
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
          // JS Date default fallback for short dates without year (e.g. year 2001)
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

  if (!date) return "hace un momento";

  const diffMs = now.getTime() - date.getTime();

  if (diffMs <= 0 || diffMs < 60000) {
    return "hace un momento";
  }

  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 60) {
    return `hace ${diffMins} min`;
  }

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return `hace ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `hace ${diffDays} ${diffDays === 1 ? "día" : "días"}`;
  }

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) {
    return `hace ${diffWeeks} ${diffWeeks === 1 ? "semana" : "semanas"}`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `hace ${diffMonths} ${diffMonths === 1 ? "mes" : "meses"}`;
  }

  const diffYears = Math.floor(diffDays / 365);
  return `hace ${diffYears} ${diffYears === 1 ? "año" : "años"}`;
};

const DEFAULT_TEAM_MEMBERS: TeamMemberItem[] = [
  { id: "w1", nombre: "Carlos R.", rol: "UI/UX Designer", color: "bg-purple-500" },
  { id: "w2", nombre: "Sofía M.", rol: "Dev Lead", color: "bg-blue-500" },
  { id: "w3", nombre: "Feiko", rol: "Growth & Admin", color: "bg-emerald-500" },
  { id: "w4", nombre: "Ana B.", rol: "Content Manager", color: "bg-amber-500" },
];

export default function NewProjectModal({
  isOpen,
  onClose,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  editingProject,
  onSelectProject,
  isNightMode = true,
  projects = []
}: NewProjectModalProps) {
  const [activeEditingProject, setActiveEditingProject] = useState<Project | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("Explorar");
  const [viewMode, setViewMode] = useState<"templates" | "create_form">("templates");
  const [isCreatingTemplateView, setIsCreatingTemplateView] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Dynamic Clients, Templates, Project Types & Team Members state
  const [clientList, setClientList] = useState<string[]>(DEFAULT_CLIENT_NAMES);
  const [templateList, setTemplateList] = useState<ProjectTemplateItem[]>(DEFAULT_TEMPLATES);
  const [packageList, setPackageList] = useState<string[]>(PACKAGE_OPTIONS);
  const [teamMemberList, setTeamMemberList] = useState<TeamMemberItem[]>(DEFAULT_TEAM_MEMBERS);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [showAllClients, setShowAllClients] = useState(false);
  const [showAllTemplates, setShowAllTemplates] = useState(false);

  // Creation Sub-Modals & Active Popovers
  const [isCreateClientOpen, setIsCreateClientOpen] = useState(false);
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [isCreateTypeOpen, setIsCreateTypeOpen] = useState(false);
  const [activePopover, setActivePopover] = useState<"status" | "priority" | "client" | "type" | "assignee" | "date" | "header_client" | null>(null);

  // Create Form State
  const [createMore, setCreateMore] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [summary, setSummary] = useState("");
  const [client, setClient] = useState("Brandex");
  const [packageStr, setPackageStr] = useState("Desarrollo Web");
  const [desc, setDesc] = useState("");
  const [status, setStatus] = useState("Planificación");
  const [priority, setPriority] = useState("Media");
  const [cost, setCost] = useState("2,500");

  const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, "");
    if (!rawValue) {
      setCost("");
      return;
    }
    const formatted = Number(rawValue).toLocaleString("en-US");
    setCost(formatted);
  };
  const [startDateRaw, setStartDateRaw] = useState(() => formatDateToInput(new Date()));
  const [deadlineRaw, setDeadlineRaw] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return formatDateToInput(d);
  });
  const [selectedGradientIdx, setSelectedGradientIdx] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isCreatingFormTask, setIsCreatingFormTask] = useState(false);
  const [formTaskTitle, setFormTaskTitle] = useState("");
  const [formTaskTime, setFormTaskTime] = useState("30 min");
  const [formTaskFormatoKey, setFormTaskFormatoKey] = useState<string | null>(null);
  const [formTaskFormatoName, setFormTaskFormatoName] = useState("");
  const [activeTimeTaskRowId, setActiveTimeTaskRowId] = useState<number | null>(null);
  const [activeTaskPopover, setActiveTaskPopover] = useState<{ taskId: number; type: "format" | "time" } | null>(null);
  const [draftTaskPopover, setDraftTaskPopover] = useState<"format" | "time" | null>(null);

  const handleConfirmFormTask = () => {
    if (!formTaskTitle.trim()) return;
    playSound("pop");
    const today = new Date();
    const fecha_creacion = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const newTask: Task = {
      id: Date.now(),
      title: formTaskTitle.trim(),
      desc: "",
      format: formTaskFormatoName || "Sin formato",
      formato: formTaskFormatoKey || null,
      time: formTaskTime.trim() || "30 min",
      status: "Planificado",
      statusColor: "bg-slate-500/20 border-slate-500/30 text-slate-300",
      subtasks: [],
      fecha_creacion,
      fecha_limite: deadlineRaw || undefined,
      deadline: deadlineRaw || undefined
    };
    setTasks((prev) => [...prev, newTask]);
    setIsCreatingFormTask(false);
    setFormTaskTitle("");
    setFormTaskTime("30 min");
    setFormTaskFormatoKey(null);
    setFormTaskFormatoName("");
  };

  const handleCancelFormTask = () => {
    setIsCreatingFormTask(false);
    setFormTaskTitle("");
    setFormTaskTime("30 min");
    setFormTaskFormatoKey(null);
    setFormTaskFormatoName("");
  };

  const handleDeleteFormTask = (taskId: number) => {
    playSound("trash");
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const titleInputRef = useRef<HTMLInputElement>(null);

  // Helper to generate synchronized unique project title (Nuevo proyecto, Nuevo proyecto (2), etc.)
  const generateUniqueTitle = () => {
    const baseTitle = "Nuevo proyecto";
    const existingTitles = new Set(projects.map((p) => p.title.trim().toLowerCase()));

    if (!existingTitles.has(baseTitle.toLowerCase())) {
      return baseTitle;
    }

    let counter = 2;
    while (existingTitles.has(`${baseTitle.toLowerCase()} (${counter})`)) {
      counter++;
    }
    return `${baseTitle} (${counter})`;
  };

  const [isDetailsCollapsed, setIsDetailsCollapsed] = useState(true);
  const [activeHeaderColor, setActiveHeaderColor] = useState<string | null>(null);

  const populateFromProject = (p: Project) => {
    setActiveEditingProject(p);
    setTitle(p.title || "");
    setClient(p.client || "Brandex");
    setPackageStr(p.package || "Desarrollo Web");
    setDesc(p.briefCore || p.desc || "");
    setStatus(p.status || "Planificación");
    const rawCostDigits = p.cost ? p.cost.replace(/[^0-9]/g, "") : "2500";
    setCost(rawCostDigits ? Number(rawCostDigits).toLocaleString("en-US") : "2,500");
    setTasks(p.tasks ? [...p.tasks] : []);
    if (p.team && p.team.length > 0) {
      const matchedIds = teamMemberList
        .filter((m) => p.team?.some((t) => t.name === m.nombre))
        .map((m) => m.id);
      setSelectedWorkerIds(matchedIds.length > 0 ? matchedIds : teamMemberList.slice(0, 2).map(m => m.id));
    } else if (p.asignado_ids && p.asignado_ids.length > 0) {
      setSelectedWorkerIds(p.asignado_ids);
    }
    setIsDetailsCollapsed(true);

    const projectColor = resolveProjectBgColor(p);
    setActiveHeaderColor(projectColor);

    const presetIdx = PRESET_GRADIENTS.findIndex(
      (preset) => preset.gradient === p.gradient || preset.color === projectColor
    );
    if (presetIdx !== -1) {
      setSelectedGradientIdx(presetIdx);
    }
    setViewMode("create_form");
  };

  const openEditForm = (p: Project) => {
    playSound("click");
    populateFromProject(p);
  };

  // Load clients, project types and team members from Firestore if available
  useEffect(() => {
    if (!isOpen) return;

    if (editingProject) {
      populateFromProject(editingProject);
    } else {
      setActiveEditingProject(null);
      setActiveHeaderColor(null);
      setViewMode("templates");
      setIsCreatingTemplateView(false);
      setIsMoreMenuOpen(false);
      setSelectedCategory("Explorar");
      setTitle("");
      setIsEditingTitle(false);
      setSummary("");
      setClient("Brandex");
      setPackageStr("Desarrollo Web");
      setDesc("");
      setStatus("Planificación");
      setPriority("Media");
      setCost("$2,500");
      setSelectedWorkerIds([]);
      setTasks([]);
      setIsDetailsCollapsed(false);
      setShowAllClients(false);
      setShowAllTemplates(false);
    }

    // Cargar plantillas locales de forma inmediata antes de la consulta a la red
    try {
      const saved = localStorage.getItem("taski_v3_templates");
      if (saved) {
        const localTemplates: ProjectTemplateItem[] = JSON.parse(saved);
        if (localTemplates.length > 0) {
          const allTemplatesMap = new Map<string, ProjectTemplateItem>();
          DEFAULT_TEMPLATES.forEach((t) => allTemplatesMap.set(t.name.toLowerCase(), t));
          localTemplates.forEach((t) => allTemplatesMap.set(t.name.toLowerCase(), t));
          setTemplateList(Array.from(allTemplatesMap.values()));
        }
      }
    } catch (e) {}

    const loadData = async () => {
      try {
        if (db) {
          // 1. Clients (v3_clients primario + clients fallback)
          const v3ClientSnap = await getDocs(collection(db, "v3_clients"));
          if (!v3ClientSnap.empty) {
            const firestoreNames = v3ClientSnap.docs.map((d) => d.data().name || d.data().nombre).filter(Boolean);
            const combinedClients = Array.from(new Set([...firestoreNames, ...DEFAULT_CLIENT_NAMES]));
            setClientList(combinedClients);
          } else {
            const fallbackSnap = await getDocs(collection(db, "clients"));
            if (!fallbackSnap.empty) {
              const firestoreNames = fallbackSnap.docs.map((d) => d.data().nombre || d.data().name).filter(Boolean);
              const combinedClients = Array.from(new Set([...firestoreNames, ...DEFAULT_CLIENT_NAMES]));
              setClientList(combinedClients);
            }
          }

          // 2. Project Types
          const typeSnap = await getDocs(collection(db, "v3_project_types"));
          if (!typeSnap.empty) {
            const firestoreTypes = typeSnap.docs.map((d) => d.data().name).filter(Boolean);
            const combinedTypes = Array.from(new Set([...firestoreTypes, ...PACKAGE_OPTIONS]));
            setPackageList(combinedTypes);
          }

          // 3. Team Members (v3_team / trabajadores)
          const teamSnap = await getDocs(collection(db, "v3_team"));
          if (!teamSnap.empty) {
            const firestoreTeam: TeamMemberItem[] = teamSnap.docs.map((d) => ({
              id: d.id,
              nombre: d.data().nombre || d.data().name,
              rol: d.data().rol || d.data().role || "Miembro",
              color: d.data().color
            })).filter((m) => m.nombre);
            if (firestoreTeam.length > 0) {
              setTeamMemberList(firestoreTeam);
            }
          } else {
            const trabSnap = await getDocs(collection(db, "trabajadores"));
            if (!trabSnap.empty) {
              const firestoreTeam: TeamMemberItem[] = trabSnap.docs.map((d) => ({
                id: d.id,
                nombre: d.data().nombre,
                rol: d.data().rol || "Miembro",
                color: d.data().color
              })).filter((m) => m.nombre);
              if (firestoreTeam.length > 0) {
                setTeamMemberList(firestoreTeam);
              }
            }
          }

          // 4. Plantillas (v3_templates + localStorage)
          let firestoreTemplates: ProjectTemplateItem[] = [];
          try {
            const tmplSnap = await getDocs(collection(db, "v3_templates"));
            if (!tmplSnap.empty) {
              firestoreTemplates = tmplSnap.docs.map((d) => ({
                id: d.id,
                name: d.data().name,
                category: d.data().category || "General",
                desc: d.data().desc || "",
                gradient: d.data().gradient,
                tasksCount: d.data().tasksCount,
                isCustom: d.data().isCustom,
                tasks: d.data().tasks
              })).filter((t) => t.name);
            } else {
              const fallbackSnap = await getDocs(collection(db, "templates"));
              if (!fallbackSnap.empty) {
                firestoreTemplates = fallbackSnap.docs.map((d) => ({
                  id: d.id,
                  name: d.data().name,
                  category: d.data().category || "General",
                  desc: d.data().desc || "",
                  gradient: d.data().gradient,
                  tasksCount: d.data().tasksCount,
                  isCustom: d.data().isCustom,
                  tasks: d.data().tasks
                })).filter((t) => t.name);
              }
            }
          } catch (e) {
            console.error("Failed to load templates from Firestore:", e);
          }

          let localTemplates: ProjectTemplateItem[] = [];
          try {
            const saved = localStorage.getItem("taski_v3_templates");
            if (saved) {
              localTemplates = JSON.parse(saved);
            }
          } catch (e) {}

          const allTemplatesMap = new Map<string, ProjectTemplateItem>();
          DEFAULT_TEMPLATES.forEach((t) => allTemplatesMap.set(t.name.toLowerCase(), t));
          firestoreTemplates.forEach((t) => allTemplatesMap.set(t.name.toLowerCase(), t));
          localTemplates.forEach((t) => allTemplatesMap.set(t.name.toLowerCase(), t));

          setTemplateList(Array.from(allTemplatesMap.values()));
        }
      } catch (err) {
        console.error("Failed to load clients, types, templates or team members in NewProjectModal:", err);
      }
    };

    loadData();
  }, [isOpen, editingProject?.id]);

  if (!isOpen) return null;

  // Handle client creation callback
  const handleClientCreated = (newClient: ClientItem) => {
    setClientList((prev) => {
      if (prev.includes(newClient.name)) return prev;
      return [newClient.name, ...prev];
    });
    setSelectedCategory(`cliente:${newClient.name}`);
    setClient(newClient.name);
  };

  // Handle template creation callback
  const handleTemplateCreated = (newTmpl: ProjectTemplateItem) => {
    try {
      if (db) {
        setDoc(doc(db, "v3_templates", newTmpl.id), newTmpl).catch((err) =>
          console.error("Error async saving template to Firestore:", err)
        );
      }
    } catch (err) {
      console.error("Error saving template to Firestore:", err);
    }

    try {
      const saved = localStorage.getItem("taski_v3_templates");
      const existing: ProjectTemplateItem[] = saved ? JSON.parse(saved) : [];
      const updated = [newTmpl, ...existing.filter((t) => t.id !== newTmpl.id)];
      localStorage.setItem("taski_v3_templates", JSON.stringify(updated));
    } catch (e) {}

    setTemplateList((prev) => [newTmpl, ...prev.filter((t) => t.id !== newTmpl.id)]);
    setSelectedCategory(`plantilla:${newTmpl.name}`);
    setPackageStr(newTmpl.category || "Desarrollo Web");
  };

  // Handle project type creation callback
  const handleTypeCreated = (newType: ProjectTypeItem) => {
    setPackageList((prev) => {
      if (prev.includes(newType.name)) return prev;
      return [...prev, newType.name];
    });
    setPackageStr(newType.name);
  };

  // Open creation form pre-filled with active selection
  const openCreateForm = () => {
    playSound("click");
    setActiveEditingProject(null);
    setTitle("");
    setIsEditingTitle(false);
    setTasks([]);

    if (selectedCategory.startsWith("cliente:")) {
      const activeClientName = selectedCategory.replace("cliente:", "").trim();
      setClient(activeClientName);
    } else {
      setClient("Brandex");
    }

    if (selectedCategory.startsWith("plantilla:")) {
      const activeTmplName = selectedCategory.replace("plantilla:", "").trim();
      const matchedTmpl = templateList.find((t) => t.name === activeTmplName);
      if (matchedTmpl) {
        setPackageStr(matchedTmpl.category);
        if (matchedTmpl.desc) setDesc(matchedTmpl.desc);
        
        if (matchedTmpl.tasks && matchedTmpl.tasks.length > 0) {
          setTasks(matchedTmpl.tasks.map((t, idx) => ({
            id: Date.now() + idx,
            title: t.title,
            desc: "",
            formato: t.formato || undefined,
            format: t.format || "Sin formato",
            time: t.time || "1 hora",
            status: "Planificado",
            statusColor: "#5e6ad2",
            subtasks: [],
            fecha_limite: (t as any).fecha_limite || deadlineRaw || undefined,
            deadline: (t as any).deadline || deadlineRaw || undefined,
          })));
        } else {
          const DEFAULT_TEMPLATE_TASKS: Record<string, { title: string; format: string; time: string }[]> = {
            "Estratégico": [
              { title: "Definición de Objetivos y OKRs", format: "Sin formato", time: "1 hora" },
              { title: "Investigación de Mercado y Competencia", format: "Sin formato", time: "2 horas" },
              { title: "Roadmap Estratégico de Lanzamiento", format: "Sin formato", time: "1 hora" }
            ],
            "Branding Complete": [
              { title: "Investigación e Identidad de Marca", format: "Sin formato", time: "2 horas" },
              { title: "Diseño de Logotipo y Variaciones", format: "Sin formato", time: "3 horas" },
              { title: "Manual de Identidad y Paleta de Color", format: "Sin formato", time: "1 hora" }
            ],
            "Desarrollo Web": [
              { title: "Diseño de Wireframes y Mockups UI", format: "Sin formato", time: "2 horas" },
              { title: "Maquetación Frontend y Responsividad", format: "Sin formato", time: "3 horas" },
              { title: "Integración SEO y Optimización", format: "Sin formato", time: "1 hora" }
            ],
            "UI/UX Design": [
              { title: "User Research & User Personas", format: "Sin formato", time: "1 hora" },
              { title: "Wireframing y Flujos de Navegación", format: "Sin formato", time: "2 horas" },
              { title: "Prototipado Interactivo Figma", format: "Sin formato", time: "2 horas" }
            ],
            "Marketing Digital": [
              { title: "Estrategia de Contenidos y Copywriting", format: "Sin formato", time: "1 hora" },
              { title: "Diseño de Creativos y Banners", format: "Sin formato", time: "2 horas" },
              { title: "Configuración de Campañas de Anuncios", format: "Sin formato", time: "1 hora" }
            ]
          };

          const tmplKey = matchedTmpl.category || matchedTmpl.name;
          if (DEFAULT_TEMPLATE_TASKS[tmplKey]) {
            setTasks(DEFAULT_TEMPLATE_TASKS[tmplKey].map((t, idx) => ({
              id: Date.now() + idx,
              title: t.title,
              desc: "",
              formato: undefined,
              format: t.format,
              time: t.time,
              status: "Planificado",
              statusColor: "#5e6ad2",
              subtasks: [],
              fecha_limite: deadlineRaw || undefined,
              deadline: deadlineRaw || undefined,
            })));
          }
        }
      }
    }

    setViewMode("create_form");
  };

  // Filter and sort app projects (most recently created / updated first) based on selected category / client / template
  const filteredProjects = [...projects]
    .sort((a, b) => {
      const pA = a as Record<string, any>;
      const pB = b as Record<string, any>;
      const timeA = pA.fecha_creacion ? new Date(pA.fecha_creacion).getTime() : 0;
      const timeB = pB.fecha_creacion ? new Date(pB.fecha_creacion).getTime() : 0;
      if (timeA && timeB && timeA !== timeB) {
        return timeB - timeA;
      }
      const idA = typeof a.id === "number" ? a.id : parseInt(String(a.id).replace(/\D/g, ""), 10) || 0;
      const idB = typeof b.id === "number" ? b.id : parseInt(String(b.id).replace(/\D/g, ""), 10) || 0;
      return idB - idA;
    })
    .filter((p) => {
      if (selectedCategory === "Explorar") return true;

      if (selectedCategory.startsWith("cliente:")) {
        const clientName = selectedCategory.replace("cliente:", "").trim().toLowerCase();
        if (!p.client) return false;
        const pClient = p.client.trim().toLowerCase();
        return pClient.includes(clientName) || clientName.includes(pClient);
      }

      if (selectedCategory.startsWith("plantilla:")) {
        const tmplName = selectedCategory.replace("plantilla:", "").trim().toLowerCase();
        const pkg = p.package?.trim().toLowerCase() || "";
        const titleLower = p.title?.trim().toLowerCase() || "";
        return pkg.includes(tmplName) || tmplName.includes(pkg) || titleLower.includes(tmplName);
      }

      return true;
    });

  const handleFormSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalTitle = title.trim();
    const finalClient = client.trim();
    if (!finalTitle || !finalClient) {
      return;
    }

    // Auto-commit any active in-progress draft task before saving
    let finalTasks = [...tasks];
    if (formTaskTitle.trim()) {
      const draftTask: Task = {
        id: Date.now(),
        title: formTaskTitle.trim(),
        desc: "",
        formato: formTaskFormatoKey || undefined,
        format: formTaskFormatoName && formTaskFormatoName !== "Sin formato" ? formTaskFormatoName : "Sin formato",
        time: formTaskTime || "Sin tiempo",
        status: "Planificado",
        statusColor: "#5e6ad2",
        subtasks: [],
        fecha_limite: deadlineRaw || undefined,
        deadline: deadlineRaw || undefined
      };
      finalTasks.push(draftTask);
    }

    // Default all project tasks to the project's deadline date if not explicitly set
    finalTasks = finalTasks.map((t) => ({
      ...t,
      fecha_limite: t.fecha_limite || deadlineRaw || undefined,
      deadline: t.deadline || deadlineRaw || undefined
    }));

    playSound("pop");
    const selectedPreset = PRESET_GRADIENTS[selectedGradientIdx] || PRESET_GRADIENTS[0];
    const startFriendly = startDateRaw ? formatDateToFriendly(new Date(startDateRaw + "T00:00:00")) : "Hoy";
    const deadlineFriendly = deadlineRaw ? formatDateToFriendly(new Date(deadlineRaw + "T00:00:00")) : "Sin Fecha";

    const hslMatch = selectedPreset.color.match(/hsl\((\d+),\s*(\d+)%?,\s*(\d+)%?\)/i);
    const h = hslMatch ? parseInt(hslMatch[1], 10) : 217;
    const s = hslMatch ? parseInt(hslMatch[2], 10) : 91;
    const l = hslMatch ? parseInt(hslMatch[3], 10) : 60;

    const selectedMembers = teamMemberList.filter((m) => selectedWorkerIds.includes(m.id));
    const teamPayload = selectedMembers.map((m, idx) => ({
      name: m.nombre,
      color: m.color || (idx % 2 === 0 ? "bg-purple-500" : "bg-blue-500")
    }));

    const payload: ProjectData = {
      title: finalTitle,
      client: finalClient,
      package: packageStr,
      desc: summary ? `${summary}\n\n${desc}`.trim() : desc,
      status,
      priority,
      cost,
      startDate: startFriendly,
      deadline: deadlineFriendly,
      deadlineRaw: deadlineRaw,
      daysRemaining: "14 días",
      burnRate: "0h / 40h",
      tasks: finalTasks,
      gradient: selectedPreset.gradient,
      glow: selectedPreset.glow,
      customColor: { h, s, l },
      customGradientStyle: selectedPreset.color,
      customGlowStyle: selectedPreset.color,
      team: teamPayload,
      asignado_ids: selectedWorkerIds,
      asignado: selectedMembers.map((m) => m.nombre).join(", ")
    };

    const targetProject = activeEditingProject || editingProject;

    if (targetProject && onUpdateProject) {
      onUpdateProject(targetProject.id, payload);
      onClose();
    } else {
      onCreateProject(payload);
      if (createMore) {
        setTitle("");
        setDesc("");
        setTasks([]);
        playSound("pop");
      } else {
        onClose();
      }
    }
  };

  const clientsToShow = showAllClients ? clientList : clientList.slice(0, 5);
  const templatesToShow = showAllTemplates ? templateList : templateList.slice(0, 5);

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              playSound("click");
              onClose();
            }}
            className="absolute inset-0 bg-black/75 transition-opacity"
          />

          {/* Figma Sites Template Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="modal--defaultSize--H1LAQ modal--smallSize--q-xsG sites_template_modal--templateModal--QDA0u modal--modal--exm2q modal--modal---V9ch modal--modalBare--lHd21 relative pointer-events-auto shadow-2xl rounded-[24px] overflow-hidden outline-none"
            data-testid="sites-template-modal"
            style={{ minWidth: "900px", maxWidth: "900px" }}
          >
            <div className="cx_overflowHidden---fxjU rounded-[24px]" style={{ height: "600px" }}>
              <div className={`site_templates_view--container--V7GbF flex flex-col h-full rounded-[24px] ${isNightMode ? "bg-[#1f1f1f] text-white" : "bg-[#fffce2] text-slate-900"}`}>
                
                {/* Header (Only rendered when exploring templates) */}
                {viewMode === "templates" && (
                  <div className="site_templates_view--header--oGRQz site_templates_view--separator--sreRS flex items-center justify-between px-4 py-3 border-none shrink-0">
                    <div className="site_templates_view--titleTextContainer--6E-7M flex items-center gap-2">
                      <div className="site_templates_view--templateTitleText--Iawgi text-[14px] text--_fontBase--Qq3Bi ellipsis--ellipsis--IdJAr font-semibold text-white/90">
                        Crear un nuevo proyecto
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="Cerrar"
                      onClick={() => {
                        playSound("click");
                        onClose();
                      }}
                      className="text-white/60 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                )}

                {/* Main Body: Sidebar + Right Content Area (Cards Grid or Direct Creation Form) */}
                <div className="site_templates_view--content--p1fnK flex-1 flex overflow-hidden">
                  
                  {/* Sidebar (Visible only when exploring templates) */}
                  {viewMode === "templates" && (
                    <div
                      className="x78zum5 xdt5ytf x1jnr06f x4qgb6o xkj4a21 x1odjw0f x1giekp1 x30g6up x5lhr3w xs1s249 x32b0ac xu3tg80 shrink-0 border-r border-white/10 p-2.5 space-y-1 overflow-y-auto custom-scrollbar"
                      data-testid="template-picker-sidebar"
                      style={{ width: "210px" }}
                    >
                      {/* Explorar */}
                      <button
                        onClick={() => {
                          playSound("click");
                          setIsCreatingTemplateView(false);
                          setSelectedCategory("Explorar");
                        }}
                        className={`picker_modal_sidebar--sidebarItemBase--8eObg w-full flex items-center h-10 px-3 rounded-xl text-[14px] transition-all duration-200 select-none ${
                          selectedCategory === "Explorar"
                            ? "site_templates_sidebar--selectedSidebarItem--VUUI8 bg-white/10 text-[#ffffffd6] font-medium"
                            : "text-[#ffffffd6] hover:bg-white/5"
                        }`}
                      >
                        <div role="option" aria-selected={selectedCategory === "Explorar"}>
                          Explorar
                        </div>
                      </button>

                      <div className="picker_modal_sidebar--itemDivider--7bNdk my-2 border-b border-white/10" data-testid="sidebar-divider"></div>

                      {/* SECTION 1: CLIENTE */}
                      <div className="picker_modal_sidebar--sidebarSectionHeader--dd25I flex items-center justify-between text-[14px] font-semibold text-[#ffffff6b] uppercase tracking-wider px-3 py-1">
                        <span>Cliente</span>
                        <button
                          type="button"
                          onClick={() => {
                            playSound("click");
                            setIsCreateClientOpen(true);
                          }}
                          className="p-0.5 rounded hover:bg-white/10 text-white/60 hover:text-emerald-400 transition-colors"
                          title="Crear nuevo cliente"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Top 5 Clients list */}
                      {clientsToShow.map((clientName) => {
                        const catKey = `cliente:${clientName}`;
                        const isSelected = selectedCategory === catKey;
                        return (
                          <button
                            key={clientName}
                            onClick={() => {
                              playSound("click");
                              setIsCreatingTemplateView(false);
                              setSelectedCategory(catKey);
                            }}
                            className={`picker_modal_sidebar--sidebarItemBase--8eObg w-full flex items-center h-10 px-3 rounded-xl text-[14px] transition-all duration-200 truncate select-none ${
                              isSelected
                                ? "site_templates_sidebar--selectedSidebarItem--VUUI8 bg-white/10 text-[#ffffffd6] font-medium"
                                : "text-[#ffffffd6] hover:bg-white/5"
                            }`}
                          >
                            <div role="option" aria-selected={isSelected} className="truncate">
                              {clientName}
                            </div>
                          </button>
                        );
                      })}

                      {/* Link to show all clients */}
                      {clientList.length > 5 && (
                        <button
                          type="button"
                          onClick={() => {
                            playSound("click");
                            setShowAllClients(!showAllClients);
                          }}
                          className="w-full text-left px-3 py-1.5 text-[12px] text-white/60 hover:text-white transition-colors font-medium cursor-pointer flex items-center justify-between group"
                        >
                          <span>{showAllClients ? "Ver menos" : "Ver todos los clientes"}</span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 text-white/50 group-hover:text-white ${showAllClients ? "rotate-180" : ""}`} />
                        </button>
                      )}

                      <div className="picker_modal_sidebar--itemDivider--7bNdk my-2 border-b border-white/10" data-testid="sidebar-divider"></div>

                      {/* SECTION 2: PLANTILLA */}
                      <div className="picker_modal_sidebar--sidebarSectionHeader--dd25I flex items-center justify-between text-[14px] font-semibold text-[#ffffff6b] uppercase tracking-wider px-3 py-1">
                        <span>Plantilla</span>
                        <button
                          type="button"
                          onClick={() => {
                            playSound("click");
                            setIsCreatingTemplateView(true);
                          }}
                          className="p-0.5 rounded hover:bg-white/10 text-white/60 hover:text-sky-400 transition-colors"
                          title="Crear nueva plantilla"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Templates list */}
                      {templatesToShow.map((tmpl) => {
                        const catKey = `plantilla:${tmpl.name}`;
                        const isSelected = selectedCategory === catKey;
                        return (
                          <button
                            key={tmpl.id || tmpl.name}
                            onClick={() => {
                              playSound("click");
                              setIsCreatingTemplateView(false);
                              setSelectedCategory(catKey);
                            }}
                            className={`picker_modal_sidebar--sidebarItemBase--8eObg w-full flex items-center h-10 px-3 rounded-xl text-[14px] transition-all duration-200 truncate select-none ${
                              isSelected
                                ? "site_templates_sidebar--selectedSidebarItem--VUUI8 bg-white/10 text-[#ffffffd6] font-medium"
                                : "text-[#ffffffd6] hover:bg-white/5"
                            }`}
                          >
                            <div role="option" aria-selected={isSelected} className="truncate">
                              {tmpl.name}
                            </div>
                          </button>
                        );
                      })}

                      {/* Link to show all templates */}
                      {templateList.length > 5 && (
                        <button
                          type="button"
                          onClick={() => {
                            playSound("click");
                            setShowAllTemplates(!showAllTemplates);
                          }}
                          className="w-full text-left px-3 py-1.5 text-[12px] text-sky-400/80 hover:text-sky-300 transition-colors font-medium cursor-pointer"
                        >
                          {showAllTemplates ? "Ver menos" : "Ver todas las plantillas"}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Right Content Panel */}
                  <div className="flex-1 flex flex-col overflow-hidden relative">
                    {viewMode === "templates" ? (
                      isCreatingTemplateView ? (
                        <CreateTemplateForm
                          onClose={() => setIsCreatingTemplateView(false)}
                          onTemplateCreated={(newTmpl) => {
                            handleTemplateCreated(newTmpl);
                            setIsCreatingTemplateView(false);
                          }}
                          packageList={packageList}
                          onAddNewCategory={() => setIsCreateTypeOpen(true)}
                        />
                      ) : (
                        /* Project Cards Grid Container */
                        <div
                          className="site_templates_view--scrollContainer--2h5pL scroll_container--clipContainer--8JS9Y flex-1 overflow-y-auto p-4 custom-scrollbar"
                        data-fullscreen-no-mod-wheel-event-capture="false"
                        data-fullscreen-wheel-event-capture="true"
                        data-non-interactive="true"
                      >
                        <div className="scroll_container--scrollContainer--gtaSy scroll_container--full--WLHH3" data-non-interactive="true">
                          <div className="scroll_container--full--WLHH3" data-non-interactive="true">
                            <div data-non-interactive="true">
                              <div
                                className="sites_template_selection_tile_grid--templatesGrid--nFm-3 grid grid-cols-3 gap-4"
                                data-testid="community-template-tile-grid"
                              >
                                {/* First Tile: Nuevo proyecto */}
                                <button
                                  onClick={openCreateForm}
                                  className="sites_blank_site_tile--blankSiteTileContainer--vKC-I group relative flex flex-col items-center justify-center p-4 rounded-xl border border-solid border-[#ffffff1f] bg-transparent hover:bg-white/[0.03] hover:border-white/25 transition-all h-[210px] cursor-pointer"
                                >
                                  <div className="sites_blank_site_tile--blankSiteTile---3-lT flex items-center justify-center w-12 h-12 rounded-full bg-white/5 group-hover:bg-white/10 group-hover:scale-105 transition-all mb-3" data-testid="start-from-scratch">
                                    <span className="sites_blank_site_tile--blankSiteTileIcon--Y7-7F text-[#ffffffd6] group-hover:text-white">
                                      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" data-fpl-icon-size="24L" style={{ width: "28px", height: "28px" }}>
                                        <path
                                          fill="currentColor"
                                          fillRule="evenodd"
                                          d="M11.5 6a.5.5 0 0 1 .5.5V11h4.5a.5.5 0 0 1 0 1H12v4.5a.5.5 0 0 1-1 0V12H6.5a.5.5 0 0 1 0-1H11V6.5a.5.5 0 0 1 .5-.5"
                                          clipRule="evenodd"
                                        ></path>
                                      </svg>
                                    </span>
                                  </div>
                                  <div className="sites_blank_site_tile--blankSiteTileText--VEuZE text-[14px] font-normal text-[#ffffffd6] group-hover:text-white text-center">
                                    {selectedCategory.startsWith("cliente:")
                                      ? `Nuevo proyecto (${selectedCategory.replace("cliente:", "").trim()})`
                                      : selectedCategory.startsWith("plantilla:")
                                      ? `Usar plantilla ${selectedCategory.replace("plantilla:", "").trim()}`
                                      : "Nuevo proyecto"}
                                  </div>
                                </button>

                                {/* App Real Project Cards */}
                                {filteredProjects.map((p) => {
                                  const cardBgColor = resolveProjectBgColor(p);

                                  return (
                                    <div
                                      key={p.id}
                                      onClick={() => {
                                        playSound("click");
                                        if (onSelectProject) {
                                          onSelectProject(p.id);
                                        } else {
                                          openEditForm(p);
                                        }
                                      }}
                                      className="community_cards--cardLayoutContainer---uHXy sites_template_tile--cardLayout--8zlpT group relative flex flex-col bg-[#262626] border border-white/10 hover:border-white/25 rounded-xl overflow-hidden shadow-lg transition-all h-[210px] cursor-pointer"
                                      data-testid="sitesTemplateCoverTile"
                                    >
                                      {/* Card Background Visual / Solid HSL Color */}
                                      <div
                                        className="flex-1 relative overflow-hidden p-3 flex flex-col justify-start"
                                        style={{ backgroundColor: cardBgColor }}
                                      >
                                        {/* Project Cover Formats (Bento Mosaic / Single Shape / Neutral Icon) */}
                                        <div className="absolute inset-0 flex items-center justify-center p-3 pointer-events-none z-0">
                                          <ProjectCoverFormats tasks={p.tasks} />
                                        </div>

                                        {/* Hover Overlay - Edit Project Form */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-3 z-20">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openEditForm(p);
                                            }}
                                            className="bg-white hover:bg-slate-100 text-slate-950 font-semibold px-4 py-1.5 rounded-full text-xs shadow-xl active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                                          >
                                            <span>Editar proyecto</span>
                                          </button>
                                        </div>
                                      </div>

                                      {/* Card Footer Metadata (Título 14px, Cliente 12px + • hace... 12px a la derecha del cliente, Total de tareas 12px abajo) */}
                                      <div className={`sites_template_tile--templateCoverBottomRow--3TUmT p-3 ${isNightMode ? "bg-[#1f1f1f]" : "bg-[#fffce2]"} border-t border-white/5 shrink-0 flex flex-col justify-center min-h-[64px]`}>
                                        <div className="text-[14px] font-bold text-white/95 truncate" title={p.title}>
                                          {p.title}
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                                          <span className="text-[12px] font-medium text-white/50 truncate" title={p.client || "Brandex"}>
                                            {p.client || "Brandex"}
                                          </span>
                                          <span className="text-[12px] text-white/50 shrink-0">
                                            • {formatTimeAgo(p.fecha_creacion || (p as any).createdAt || (p as any).created_at || p.startDate)}
                                          </span>
                                        </div>
                                        <div className="text-[12px] text-white/60 mt-0.5">
                                          {p.tasks?.length || 0} {p.tasks?.length === 1 ? "tarea" : "tareas"}
                                        </div>
                                      </div>
                                    </div>
                                  );
                               })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                    ) : (
                      /* FAST CREATE MODAL ESTILO LINEAR EXACTO */
                      <div className={`flex-1 flex flex-col ${isNightMode ? "bg-[#1f1f1f] text-[#f7f7f8]" : "bg-[#fffce2] text-slate-900"} overflow-hidden rounded-[24px] rounded-b-[24px] border-none`}>
                        
                        {/* MAIN FORM */}
                        <form onSubmit={handleFormSubmit} className="flex-1 flex flex-col justify-between overflow-hidden">
                          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
                            
                            {/* TITLE, DESCRIPTION & HEADER INTEGRATED ROUNDED CONTAINER */}
                            {(() => {
                              const activePreset = PRESET_GRADIENTS[selectedGradientIdx] || PRESET_GRADIENTS[0];
                              return (
                                <div
                                  className="p-4 rounded-xl transition-all duration-300 border-none space-y-3 shadow-none"
                                  style={{
                                    backgroundColor: activePreset.color,
                                    border: "none"
                                  }}
                                >
                              {/* TOP INTEGRATED HEADER ROW */}
                              <div className="flex items-center justify-between text-xs select-none">
                                {/* Left: Client Pill + Breadcrumb */}
                                <div className="flex items-center gap-2">
                                  <div className="relative">
                                    <button
                                      type="button"
                                      role="combobox"
                                      onClick={() => {
                                        playSound("click");
                                        setActivePopover(activePopover === "header_client" ? null : "header_client");
                                      }}
                                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all cursor-pointer border-none outline-none ${
                                        activePopover === "header_client"
                                          ? "bg-white text-black font-bold"
                                          : "bg-white/20 hover:bg-white/30 text-white"
                                      }`}
                                    >
                                      <User className={`w-3.5 h-3.5 shrink-0 ${activePopover === "header_client" ? "text-black" : "text-white"}`} />
                                      <span>{client}</span>
                                    </button>
                                    <LinearDropdownPopover
                                      isOpen={activePopover === "header_client"}
                                      onClose={() => setActivePopover(null)}
                                      placeholder="Cambiar cliente…"
                                      shortcutKey="C"
                                      selectedValue={client}
                                      onSelect={(val) => setClient(val)}
                                      options={clientList.map((c, i) => ({
                                        id: c,
                                        label: c,
                                        shortcut: String(i + 1)
                                      }))}
                                      onAddNew={() => setIsCreateClientOpen(true)}
                                      addNewLabel="Crear nuevo cliente"
                                    />
                                  </div>
                                  <span className="text-white/70 font-medium">›</span>
                                  <span className="text-white/90 font-semibold">
                                    {(activeEditingProject || editingProject) ? "Editar proyecto" : "Nuevo proyecto"}
                                  </span>
                                </div>

                                {/* Right: Window Controls */}
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      playSound("click");
                                      setIsExpanded(!isExpanded);
                                    }}
                                    className="p-1 rounded text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                                    title="Expandir"
                                  >
                                    <Maximize2 className="w-3.5 h-3.5 text-white" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={onClose}
                                    className="p-1 rounded text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                                    title="Cerrar"
                                  >
                                    <X className="w-4 h-4 text-white" />
                                  </button>

                                  {/* 3 Dots Menu Button to the right of X */}
                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        playSound("click");
                                        setIsMoreMenuOpen(!isMoreMenuOpen);
                                      }}
                                      className={`p-1 rounded transition-colors cursor-pointer ${
                                        isMoreMenuOpen
                                          ? "bg-white/30 text-white"
                                          : "text-white/80 hover:text-white hover:bg-white/20"
                                      }`}
                                      title="Opciones del proyecto"
                                    >
                                      <MoreHorizontal className="w-4 h-4 text-white" />
                                    </button>

                                    <AnimatePresence>
                                      {isMoreMenuOpen && (
                                        <>
                                          <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setIsMoreMenuOpen(false)}
                                          />
                                          <motion.div
                                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                            transition={{ duration: 0.15 }}
                                            className="absolute right-0 top-full mt-1.5 z-50 w-48 rounded-xl bg-[#1d1d22] border border-[#2e2e38] shadow-2xl p-1 overflow-hidden select-none"
                                          >
                                            <button
                                              type="button"
                                              onClick={() => {
                                                playSound("trash");
                                                setIsMoreMenuOpen(false);
                                                const targetProj = activeEditingProject || editingProject;
                                                if (targetProj && onDeleteProject) {
                                                  onDeleteProject(targetProj.id);
                                                }
                                                onClose();
                                              }}
                                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/15 rounded-lg transition-colors cursor-pointer text-left"
                                            >
                                              <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                              <span>Eliminar proyecto</span>
                                            </button>
                                          </motion.div>
                                        </>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </div>
                              </div>

                              {/* ISSUE / PROJECT TITLE */}
                              <input
                                ref={titleInputRef}
                                type="text"
                                autoFocus
                                placeholder="Nuevo proyecto"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-transparent text-[19px] font-bold text-white placeholder-white/70 border-none outline-none ring-0 focus:outline-none focus:ring-0 focus:border-none focus-visible:outline-none focus-visible:ring-0 caret-white p-0 shadow-none focus:shadow-none"
                              />

                              {/* ISSUE / PROJECT DESCRIPTION */}
                              <textarea
                                rows={3}
                                placeholder="Añadir descripción…"
                                value={desc}
                                onChange={(e) => setDesc(e.target.value)}
                                className="w-full bg-transparent text-[13px] text-white/90 placeholder-white/70 border-none outline-none ring-0 focus:outline-none focus:ring-0 focus:border-none focus-visible:outline-none focus-visible:ring-0 caret-white resize-none leading-relaxed p-0 min-h-[75px] shadow-none focus:shadow-none"
                              />
                            </div>
                          );
                        })()}

                            {/* PROPERTY BUTTONS ROW */}
                            <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-[#222226]">
                              
                              {/* Status button + Popover */}
                              <div className="relative">
                                <button
                                  type="button"
                                  role="combobox"
                                  onClick={() => {
                                    playSound("click");
                                    setActivePopover(activePopover === "status" ? null : "status");
                                  }}
                                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                                    activePopover === "status" ? "bg-[#32323e] border border-[#484856] text-white" : "bg-[#1d1d21] hover:bg-[#27272f] border border-[#2e2e36] hover:border-[#444450] text-[#f4f4f5]"
                                  }`}
                                >
                                  <svg width="13" height="13" viewBox="0 0 14 14" fill="#ffffff" className="shrink-0">
                                    <path d="M13.9408 7.91426L11.9576 7.65557C11.9855 7.4419 12 7.22314 12 7C12 6.77686 11.9855 6.5581 11.9576 6.34443L13.9408 6.08573C13.9799 6.38496 14 6.69013 14 7C14 7.30987 13.9799 7.61504 13.9408 7.91426Z" />
                                  </svg>
                                  <span>{status || "Estado"}</span>
                                </button>
                                <LinearDropdownPopover
                                  isOpen={activePopover === "status"}
                                  onClose={() => setActivePopover(null)}
                                  placeholder="Cambiar estado…"
                                  shortcutKey="S"
                                  selectedValue={status}
                                  onSelect={(val) => setStatus(val)}
                                  options={[
                                    { id: "Backlog", label: "Backlog", shortcut: "1" },
                                    { id: "Planificación", label: "Planificación", shortcut: "2" },
                                    { id: "Activo", label: "Activo", shortcut: "3" },
                                    { id: "En Proceso", label: "En Proceso", shortcut: "4" },
                                    { id: "En Revisión", label: "En Revisión", shortcut: "5" },
                                    { id: "Completado", label: "Completado", shortcut: "6" }
                                  ]}
                                />
                              </div>

                              {/* Priority button + Popover */}
                              <div className="relative">
                                <button
                                  type="button"
                                  role="combobox"
                                  onClick={() => {
                                    playSound("click");
                                    setActivePopover(activePopover === "priority" ? null : "priority");
                                  }}
                                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                                    activePopover === "priority" ? "bg-[#32323e] border border-[#484856] text-white" : "bg-[#1d1d21] hover:bg-[#27272f] border border-[#2e2e36] hover:border-[#444450] text-[#f4f4f5]"
                                  }`}
                                >
                                  <Flag className="w-3 h-3 text-white shrink-0" />
                                  <span>{priority && priority !== "No Priority" ? priority : "Prioridad"}</span>
                                </button>
                                <LinearDropdownPopover
                                  isOpen={activePopover === "priority"}
                                  onClose={() => setActivePopover(null)}
                                  placeholder="Cambiar prioridad…"
                                  shortcutKey="P"
                                  selectedValue={priority}
                                  onSelect={(val) => setPriority(val)}
                                  options={[
                                    { id: "No Priority", label: "Sin prioridad", shortcut: "1" },
                                    { id: "Urgente", label: "Urgente", shortcut: "2" },
                                    { id: "Alta", label: "Alta", shortcut: "3" },
                                    { id: "Media", label: "Media", shortcut: "4" },
                                    { id: "Baja", label: "Baja", shortcut: "5" }
                                  ]}
                                />
                              </div>

                              {/* Type button + Popover */}
                              <div className="relative">
                                <button
                                  type="button"
                                  role="combobox"
                                  onClick={() => {
                                    playSound("click");
                                    setActivePopover(activePopover === "type" ? null : "type");
                                  }}
                                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                                    activePopover === "type" ? "bg-[#32323e] border border-[#484856] text-white" : "bg-[#1d1d21] hover:bg-[#27272f] border border-[#2e2e36] hover:border-[#444450] text-[#f4f4f5]"
                                  }`}
                                >
                                  <Tag className="w-3 h-3 text-white shrink-0" />
                                  <span>{packageStr || "Tipo"}</span>
                                </button>
                                <LinearDropdownPopover
                                  isOpen={activePopover === "type"}
                                  onClose={() => setActivePopover(null)}
                                  placeholder="Cambiar tipo…"
                                  shortcutKey="T"
                                  selectedValue={packageStr}
                                  onSelect={(val) => setPackageStr(val)}
                                  options={packageList.map((pkg, i) => ({
                                    id: pkg,
                                    label: pkg,
                                    shortcut: String(i + 1)
                                  }))}
                                  onAddNew={() => setIsCreateTypeOpen(true)}
                                  addNewLabel="Crear nuevo tipo"
                                />
                              </div>

                              {/* Assignee button + Popover */}
                              <div className="relative">
                                <button
                                  type="button"
                                  role="combobox"
                                  onClick={() => {
                                    playSound("click");
                                    setActivePopover(activePopover === "assignee" ? null : "assignee");
                                  }}
                                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                                    activePopover === "assignee" ? "bg-[#32323e] border border-[#484856] text-white" : "bg-[#1d1d21] hover:bg-[#27272f] border border-[#2e2e36] hover:border-[#444450] text-[#f4f4f5]"
                                  }`}
                                >
                                  <User className="w-3 h-3 text-white shrink-0" />
                                  <span>
                                    {selectedWorkerIds.length > 0
                                      ? teamMemberList.find((m) => selectedWorkerIds.includes(m.id))?.nombre || "Asignado"
                                      : "Asignado"}
                                  </span>
                                </button>
                                <LinearDropdownPopover
                                  isOpen={activePopover === "assignee"}
                                  onClose={() => setActivePopover(null)}
                                  placeholder="Cambiar asignado…"
                                  shortcutKey="A"
                                  selectedValue={selectedWorkerIds[0] || ""}
                                  onSelect={(val) => setSelectedWorkerIds(val ? [val] : [])}
                                  options={teamMemberList.map((m, i) => ({
                                    id: m.id,
                                    label: m.nombre,
                                    badge: m.rol,
                                    shortcut: String(i + 1)
                                  }))}
                                />
                              </div>

                              {/* Cost input pill */}
                              <div className="flex items-center gap-1.5 rounded-full px-3 py-1 bg-[#1d1d21] hover:bg-[#27272f] border border-[#2e2e36] hover:border-[#444450] text-[11px] text-[#f4f4f5] transition-all">
                                <DollarSign className="w-3 h-3 text-white shrink-0" />
                                <input
                                  type="text"
                                  value={cost}
                                  onChange={handleCostChange}
                                  placeholder="Precio"
                                  className="w-16 bg-transparent text-[11px] text-[#f4f4f5] font-bold outline-none ring-0 focus:outline-none"
                                />
                              </div>

                              {/* Date Popover Button Pill */}
                              <div className="relative">
                                <button
                                  type="button"
                                  role="combobox"
                                  onClick={() => {
                                    playSound("click");
                                    setActivePopover(activePopover === "date" ? null : "date");
                                  }}
                                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                                    activePopover === "date" ? "bg-[#32323e] border border-[#484856] text-white" : "bg-[#1d1d21] hover:bg-[#27272f] border border-[#2e2e36] hover:border-[#444450] text-[#f4f4f5]"
                                  }`}
                                >
                                  <Calendar className="w-3 h-3 text-white shrink-0" />
                                  <span>
                                    {startDateRaw && deadlineRaw
                                      ? `${startDateRaw} → ${deadlineRaw}`
                                      : "Fechas"}
                                  </span>
                                </button>
                                <LinearDatePopover
                                  isOpen={activePopover === "date"}
                                  onClose={() => setActivePopover(null)}
                                  startDate={startDateRaw}
                                  deadline={deadlineRaw}
                                  onSelectDates={(start, end) => {
                                    setStartDateRaw(start);
                                    setDeadlineRaw(end);
                                  }}
                                />
                              </div>
                            </div>

                            {/* COLOR PICKER ROW */}
                            <div className="flex items-center justify-between pt-2.5 border-t border-[#222226]">
                              <span className="text-[11px] font-medium text-[#71717a]">Color del proyecto</span>
                              <div className="flex items-center gap-2">
                                {PRESET_GRADIENTS.map((preset, idx) => {
                                  const isSelected = selectedGradientIdx === idx;
                                  return (
                                    <button
                                      key={preset.name}
                                      type="button"
                                      title={preset.name}
                                      onClick={() => {
                                        playSound("click");
                                        setSelectedGradientIdx(idx);
                                        setActiveHeaderColor(preset.color);
                                      }}
                                      className={`w-4 h-4 rounded-full bg-gradient-to-br ${preset.gradient} transition-all cursor-pointer border ${
                                        isSelected ? "border-white scale-125 shadow-md shadow-emerald-500/20" : "border-transparent opacity-60 hover:opacity-100"
                                      }`}
                                    />
                                  );
                                })}
                              </div>
                            </div>

                            {/* PROJECT TASKS SECTION */}
                            <div className="pt-3 border-t border-[#222226] space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-[#a1a1aa]">Tareas del proyecto ({tasks.length})</span>
                              </div>

                              <div className="flex flex-col gap-1.5">
                                <AnimatePresence>
                                  {tasks.map((task) => {
                                    const fmtObj = getFormato(task.formato || task.format);
                                    const isFmtOpen = activeTaskPopover?.taskId === task.id && activeTaskPopover?.type === "format";
                                    const isTimeOpen = activeTaskPopover?.taskId === task.id && activeTaskPopover?.type === "time";

                                    return (
                                      <motion.div
                                        layout
                                        key={task.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="w-full rounded-full border-none bg-[#1d1d21] p-1.5 px-4 flex items-center justify-between gap-3 transition-all relative shadow-sm hover:bg-[#232328]"
                                      >
                                        <input
                                          type="text"
                                          value={task.title}
                                          onChange={(e) => {
                                            const newTitle = e.target.value;
                                            setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, title: newTitle } : t)));
                                          }}
                                          className="flex-1 bg-transparent text-xs font-semibold text-[#f4f4f5] outline-none border-none ring-0 focus:outline-none focus:ring-0 focus:border-none focus-visible:outline-none focus-visible:ring-0 p-0 ml-1 shadow-none focus:shadow-none"
                                        />

                                        <div className="flex items-center gap-2 shrink-0">
                                          {/* Formato Popover Trigger */}
                                          <div className="relative">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                playSound("click");
                                                setActiveTaskPopover(
                                                  isFmtOpen ? null : { taskId: task.id, type: "format" }
                                                );
                                              }}
                                              className="px-3 py-1 rounded-full bg-white hover:bg-[#e4e4e7] text-[10px] font-bold text-[#09090b] border-none outline-none transition-colors cursor-pointer"
                                            >
                                              <span>{fmtObj?.nombre || task.format || "Formato"}</span>
                                            </button>
                                            <LinearDropdownPopover
                                              isOpen={isFmtOpen}
                                              onClose={() => setActiveTaskPopover(null)}
                                              placeholder="Change format…"
                                              shortcutKey="F"
                                              selectedValue={fmtObj?.key || task.format || ""}
                                              position="top"
                                              align="right"
                                              onSelect={(val) => {
                                                const selFmt = getFormato(val);
                                                setTasks((prev) =>
                                                  prev.map((t) =>
                                                    t.id === task.id
                                                      ? { ...t, formato: val, format: selFmt?.nombre || val }
                                                      : t
                                                  )
                                                );
                                              }}
                                              options={Object.values(FORMATOS_ESTANDAR).map((f, idx) => ({
                                                id: f.key,
                                                label: f.nombre,
                                                badge: f.proporcion,
                                                shortcut: String(idx + 1),
                                                icon: <FormatoShape formatoObj={f} size="sm" />
                                              }))}
                                            />
                                          </div>

                                          {/* Tiempo Popover Trigger */}
                                          <div className="relative">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                playSound("click");
                                                setActiveTaskPopover(
                                                  isTimeOpen ? null : { taskId: task.id, type: "time" }
                                                );
                                              }}
                                              className="px-3 py-1 rounded-full bg-white hover:bg-[#e4e4e7] text-[10px] font-bold text-[#09090b] border-none outline-none transition-colors cursor-pointer"
                                            >
                                              {task.time || "30 min"}
                                            </button>
                                            <LinearDropdownPopover
                                              isOpen={isTimeOpen}
                                              onClose={() => setActiveTaskPopover(null)}
                                              placeholder="Change duration…"
                                              shortcutKey="D"
                                              selectedValue={task.time || "30 min"}
                                              position="top"
                                              align="right"
                                              onSelect={(val) => {
                                                setTasks((prev) =>
                                                  prev.map((t) => (t.id === task.id ? { ...t, time: val } : t))
                                                );
                                              }}
                                              options={[
                                                { id: "15 min", label: "15 min", shortcut: "1" },
                                                { id: "30 min", label: "30 min", shortcut: "2" },
                                                { id: "45 min", label: "45 min", shortcut: "3" },
                                                { id: "1 hora", label: "1 hora", shortcut: "4" },
                                                { id: "2 horas", label: "2 horas", shortcut: "5" },
                                                { id: "3 horas", label: "3 horas", shortcut: "6" }
                                              ]}
                                            />
                                          </div>

                                          <button
                                            type="button"
                                            onClick={() => handleDeleteFormTask(task.id)}
                                            className="p-1 text-[#71717a] hover:text-rose-400 transition-colors cursor-pointer"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </motion.div>
                                    );
                                  })}
                                </AnimatePresence>

                                {!isCreatingFormTask ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      playSound("click");
                                      setIsCreatingFormTask(true);
                                      setFormTaskTitle("");
                                      setFormTaskTime("Sin tiempo");
                                      setFormTaskFormatoKey(null);
                                      setFormTaskFormatoName("Sin formato");
                                    }}
                                    className="w-full rounded-full border border-dashed border-[#33333e] hover:border-[#4f4f5e] p-2.5 text-xs font-medium text-[#a1a1aa] hover:text-[#f4f4f5] flex items-center justify-center gap-2 bg-transparent hover:bg-[#1a1a1e]/40 transition-all cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5 text-[#a1a1aa] shrink-0" />
                                    <span>Añadir tarea al proyecto</span>
                                  </button>
                                ) : (
                                  <motion.div
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="w-full rounded-full border-none bg-[#1d1d21] p-1.5 px-4 flex items-center justify-between gap-3 transition-all relative shadow-sm"
                                  >
                                    <input
                                      type="text"
                                      autoFocus
                                      placeholder="Nombre de la tarea…"
                                      value={formTaskTitle}
                                      onChange={(e) => setFormTaskTitle(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleConfirmFormTask();
                                        if (e.key === "Escape") handleCancelFormTask();
                                      }}
                                      className="flex-1 bg-transparent text-xs font-semibold text-[#f4f4f5] placeholder-[#686873] outline-none border-none ring-0 focus:outline-none focus:ring-0 focus:border-none focus-visible:outline-none focus-visible:ring-0 p-0 ml-1 shadow-none focus:shadow-none"
                                    />

                                    <div className="flex items-center gap-2 shrink-0">
                                      {/* Draft Formato Selector */}
                                      <div className="relative">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            playSound("click");
                                            setDraftTaskPopover(draftTaskPopover === "format" ? null : "format");
                                          }}
                                          className="px-3 py-1 rounded-full bg-white hover:bg-[#e4e4e7] border-none outline-none text-[10px] font-bold text-[#09090b] cursor-pointer transition-colors"
                                        >
                                          <span>{formTaskFormatoName || "Sin formato"}</span>
                                        </button>
                                        <LinearDropdownPopover
                                          isOpen={draftTaskPopover === "format"}
                                          onClose={() => setDraftTaskPopover(null)}
                                          placeholder="Select format…"
                                          shortcutKey="F"
                                          selectedValue={formTaskFormatoKey || ""}
                                          position="top"
                                          align="right"
                                          onSelect={(val) => {
                                            const fmt = getFormato(val);
                                            setFormTaskFormatoKey(val);
                                            setFormTaskFormatoName(fmt?.nombre || val);
                                          }}
                                          options={Object.values(FORMATOS_ESTANDAR).map((f, idx) => ({
                                            id: f.key,
                                            label: f.nombre,
                                            badge: f.proporcion,
                                            shortcut: String(idx + 1),
                                            icon: <FormatoShape formatoObj={f} size="sm" />
                                          }))}
                                        />
                                      </div>

                                      {/* Draft Duration Selector */}
                                      <div className="relative">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            playSound("click");
                                            setDraftTaskPopover(draftTaskPopover === "time" ? null : "time");
                                          }}
                                          className="px-3 py-1 rounded-full bg-white hover:bg-[#e4e4e7] border-none outline-none text-[10px] font-bold text-[#09090b] cursor-pointer transition-colors"
                                        >
                                          <span>{formTaskTime || "Sin tiempo"}</span>
                                        </button>
                                        <LinearDropdownPopover
                                          isOpen={draftTaskPopover === "time"}
                                          onClose={() => setDraftTaskPopover(null)}
                                          placeholder="Select duration…"
                                          shortcutKey="D"
                                          selectedValue={formTaskTime}
                                          position="top"
                                          align="right"
                                          onSelect={(val) => setFormTaskTime(val)}
                                          options={[
                                            { id: "15 min", label: "15 min", shortcut: "1" },
                                            { id: "30 min", label: "30 min", shortcut: "2" },
                                            { id: "45 min", label: "45 min", shortcut: "3" },
                                            { id: "1 hora", label: "1 hora", shortcut: "4" },
                                            { id: "2 horas", label: "2 horas", shortcut: "5" },
                                            { id: "3 horas", label: "3 horas", shortcut: "6" }
                                          ]}
                                        />
                                      </div>

                                      <button
                                        type="button"
                                        onClick={handleConfirmFormTask}
                                        disabled={!formTaskTitle.trim()}
                                        className="p-1 text-emerald-400 hover:text-emerald-300 disabled:opacity-40 disabled:hover:text-emerald-400 transition-colors cursor-pointer"
                                        title="Guardar tarea (Enter)"
                                      >
                                        <Check className="w-4 h-4" />
                                      </button>

                                      <button
                                        type="button"
                                        onClick={handleCancelFormTask}
                                        className="p-1 text-[#71717a] hover:text-rose-400 transition-colors cursor-pointer"
                                        title="Cancelar (Esc)"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
                              </div>
                            </div>

                          </div>

                          {/* FOOTER BAR */}
                          <div className={`flex items-center justify-between px-4 py-2.5 border-none ${isNightMode ? "bg-[#1f1f1f]" : "bg-[#fffce2]"} shrink-0 text-xs`}>
                            {/* Left: Paperclip Icon */}
                            <div className="flex items-center gap-1 text-[#71717a]">
                              <button
                                type="button"
                                aria-label="Attach images, files, or videos"
                                className="p-1 rounded hover:bg-[#222226] hover:text-[#f4f4f5] transition-colors cursor-pointer"
                              >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                  <path d="M12.6429 7.69048L8.92925 11.4041C7.48164 12.8517 5.34347 13.0101 4.16667 11.8333C2.98733 10.654 3.14447 8.52219 4.59216 7.07451L8.00206 3.66461C8.93557 2.73109 10.2976 2.63095 11.0333 3.36667C11.7681 4.10139 11.6658 5.4675 10.7361 6.39727L7.32363 9.8097C6.90202 10.2313 6.32171 10.2741 6.02381 9.97619C5.72651 9.6789 5.76949 9.09718 6.1989 8.66776L9.29048 5.57619C9.56662 5.30005 9.56662 4.85233 9.29048 4.57619C9.01433 4.30005 8.56662 4.30005 8.29048 4.57619L5.1989 7.66776C4.24737 8.6193 4.13865 10.091 5.02381 10.9762C5.9095 11.8619 7.37984 11.7535 8.32363 10.8097L11.7361 7.39727C13.1876 5.94573 13.3564 3.68975 12.0333 2.36667C10.7099 1.04326 8.45782 1.20884 7.00206 2.66461L3.59216 6.07451C1.62229 8.04437 1.39955 11.0662 3.16667 12.8333C4.93146 14.5981 7.9596 14.3737 9.92925 12.4041L13.6429 8.69048C13.919 8.41433 13.919 7.96662 13.6429 7.69048C13.3667 7.41433 12.919 7.41433 12.6429 7.69048Z"></path>
                                </svg>
                              </button>
                            </div>

                            {/* Right: Submit Button Pill */}
                            <div className="flex items-center gap-3">
                              <button
                                type="submit"
                                className="bg-white hover:bg-[#e4e4e7] text-[#09090b] text-xs font-bold px-4 py-1.5 rounded-full transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95"
                              >
                                {(activeEditingProject || editingProject) ? "Guardar Cambios" : "Crear Proyecto"}
                              </button>
                            </div>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Sub-Modals for Creating Client, Template and Project Type */}
      <CreateClientModal
        isOpen={isCreateClientOpen}
        onClose={() => setIsCreateClientOpen(false)}
        onClientCreated={handleClientCreated}
      />

      <CreateTemplateModal
        isOpen={isCreateTemplateOpen}
        onClose={() => setIsCreateTemplateOpen(false)}
        onTemplateCreated={handleTemplateCreated}
      />

      <CreateProjectTypeModal
        isOpen={isCreateTypeOpen}
        onClose={() => setIsCreateTypeOpen(false)}
        onTypeCreated={handleTypeCreated}
      />
    </>
  );
}
