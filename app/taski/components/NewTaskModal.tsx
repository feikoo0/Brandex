"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playSound } from "../utils/audio";
import {
  X,
  Plus,
  Check,
  Flag,
  Tag,
  Calendar,
  Trash2,
  Clock,
  User,
  Users,
  Paperclip,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Layers,
  Folder,
  ExternalLink,
  Play,
  Square,
  CheckCircle2,
  Circle,
  Copy,
  Link as LinkIcon,
  AlertTriangle,
  Loader2,
  Sparkles
} from "lucide-react";
import FormatoShape from "./FormatoShape";
import { FORMATOS_ESTANDAR, getFormato } from "../utils/formatos";
import { Project, Task } from "./ProjectDashboard";
import CreateClientModal from "./CreateClientModal";
import { ProjectStatusIcon } from "@/components/common/ProjectStatusIcon";
import LinearDropdownPopover, { PopoverOption } from "./LinearDropdownPopover";
import LinearDatePopover from "./LinearDatePopover";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PROJECT_COLOR_PALETTE, getSingleSourceProjectColor, formatProjectCreatedDate } from "@/lib/utils";
import { useAuthStore } from "@/lib/store";
import { useMembers, INITIAL_MEMBERS } from "@/hooks/useMembers";
import { useSessions } from "@/hooks/useSessions";

export interface SubtaskItem {
  id: number;
  text: string;
  done: boolean;
}

export interface TaskData {
  id?: number | string;
  title: string;
  desc: string;
  status: 'Planificado' | 'En Proceso' | 'En Revisión' | 'Completado';
  priority: string;
  format: string;
  formato?: string | null;
  area?: string;
  time: string;
  startDate?: string;
  deadline?: string;
  startDateRaw?: string;
  deadlineRaw?: string;
  fecha_programada?: string;
  fecha_limite?: string;
  fecha_creacion?: string;
  projectId?: string | number;
  projectName?: string;
  client?: string;
  clientId?: string;
  asignado_ids?: string[];
  asignado?: string;
  color?: string;
  subtasks: SubtaskItem[];
  attachmentUrl?: string;
  recursosDrive?: string;
}

export interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTask?: (taskData: TaskData) => void;
  onUpdateTask?: (taskId: string | number, updatedData: Partial<TaskData>, projectId?: string | number) => void;
  onDeleteTask?: (taskId: string | number, projectId?: string | number) => void;
  editingTask?: (Partial<Task> & {
    projectId?: string | number;
    projectName?: string;
    client?: string;
    cliente?: string;
    cliente_ids?: string[];
    priority?: string;
    prioridad?: string;
    asignado?: string;
    asignado_ids?: string[];
    area?: string;
  }) | null;
  projects?: Project[];
  defaultProjectId?: string | number;
  originRect?: { x: number; y: number; width: number; height: number } | null;
  isNightMode?: boolean;
}

const PRESET_GRADIENTS = PROJECT_COLOR_PALETTE.map((item) => ({
  name: item.name,
  gradient: item.gradient,
  glow: item.glow,
  color: item.hslStr,
  solidColor: item.solidColor
}));

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

const AREA_OPTIONS = [
  "Diseño",
  "Video",
  "Desarrollo Web",
  "Copywriting",
  "Estrategia",
  "3D / Motion",
  "UI/UX"
];

const TIME_OPTIONS = [
  { id: "15 min", label: "15 min", shortcut: "1" },
  { id: "30 min", label: "30 min", shortcut: "2" },
  { id: "45 min", label: "45 min", shortcut: "3" },
  { id: "1 hora", label: "1 hora", shortcut: "4" },
  { id: "2 horas", label: "2 horas", shortcut: "5" },
  { id: "3 horas", label: "3 horas", shortcut: "6" },
  { id: "5 horas", label: "5 horas", shortcut: "7" },
  { id: "8 horas", label: "8 horas", shortcut: "8" }
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

const parseAnyDate = (s?: any): Date | null => {
  if (!s) return null;
  if (s instanceof Date) return isNaN(s.getTime()) ? null : s;
  if (typeof s === "object" && s.toDate && typeof s.toDate === "function") {
    try { return s.toDate(); } catch {}
  }
  const str = String(s).trim();
  if (!str || str.toLowerCase() === "sin fecha" || str.toLowerCase() === "hoy") return null;

  const currentYear = new Date().getFullYear();

  // 1. Formato YYYY-MM-DD o ISO
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const d = parseInt(isoMatch[3], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d);
    }
  }

  // 2. Formato DD/MM/YYYY
  const latamMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (latamMatch) {
    const d = parseInt(latamMatch[1], 10);
    const m = parseInt(latamMatch[2], 10) - 1;
    const y = parseInt(latamMatch[3], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d);
    }
  }

  // 3. Formato amigable en español (ej: "17 Ago", "3 Ene", "25 Dic")
  const spanishMonths: Record<string, number> = {
    ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
    jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11
  };

  const friendlyMatch = str.match(/^(\d{1,2})\s+([a-zA-Z]{3,4})/i);
  if (friendlyMatch) {
    const day = parseInt(friendlyMatch[1], 10);
    const monthKey = friendlyMatch[2].toLowerCase().substring(0, 3);
    if (!isNaN(day) && spanishMonths[monthKey] !== undefined) {
      return new Date(currentYear, spanishMonths[monthKey], day);
    }
  }

  const fallback = new Date(str);
  if (!isNaN(fallback.getTime())) {
    if (fallback.getFullYear() < 2015 && !str.includes("20") && !str.includes("19")) {
      fallback.setFullYear(currentYear);
    }
    return fallback;
  }

  return null;
};

const toYyyyMmDd = (val?: any): string => {
  if (!val) return "";
  const d = parseAnyDate(val);
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function NewTaskModal({
  isOpen,
  onClose,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  editingTask = null,
  projects = [],
  defaultProjectId,
  originRect = null,
  isNightMode = true
}: NewTaskModalProps) {
  const workspaceId = useAuthStore((s) => s.workspaceId);
  const isMaster = workspaceId === "brandex-master" || workspaceId === "159789" || workspaceId === "ws_159789";

  const { members: liveMembers } = useMembers();
  const { activeSession, startSession, endSession } = useSessions();

  // State
  const [clientList, setClientList] = useState<string[]>(isMaster ? DEFAULT_CLIENT_NAMES : []);
  const [isCreateClientOpen, setIsCreateClientOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [showDriveInput, setShowDriveInput] = useState(false);

  // Active Popovers
  const [activePopover, setActivePopover] = useState<
    "status" | "priority" | "format" | "project" | "assignee" | "time" | "date" | "area" | "header_client" | null
  >(null);

  // Task Form Fields
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [status, setStatus] = useState<'Planificado' | 'En Proceso' | 'En Revisión' | 'Completado'>("Planificado");
  const [priority, setPriority] = useState("Media");
  const [formatoKey, setFormatoKey] = useState<string>("story_ig");
  const [formatName, setFormatName] = useState("Story Imagen");
  const [area, setArea] = useState("Diseño");
  const [time, setTime] = useState("1 hora");
  const [projectId, setProjectId] = useState<string | number>(defaultProjectId || "");
  const [client, setClient] = useState("Brandex");
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [startDateRaw, setStartDateRaw] = useState(() => formatDateToInput(new Date()));
  const [deadlineRaw, setDeadlineRaw] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return formatDateToInput(d);
  });
  const [recursosDrive, setRecursosDrive] = useState("");

  // Subtasks State
  const [subtasks, setSubtasks] = useState<SubtaskItem[]>([]);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [newSubtaskText, setNewSubtaskText] = useState("");

  const titleInputRef = useRef<HTMLInputElement>(null);

  // Resolve active project and dynamic project color
  const currentProject = useMemo(() => {
    return projects.find((p) => String(p.id) === String(projectId));
  }, [projects, projectId]);

  const projectColor = useMemo(() => {
    if (currentProject) {
      return getSingleSourceProjectColor(currentProject).hslCss;
    }
    return PRESET_GRADIENTS[0].color;
  }, [currentProject]);

  // Load clients
  useEffect(() => {
    if (!isOpen) return;

    const loadClients = async () => {
      try {
        if (db && workspaceId) {
          const clientsColName = isMaster ? "clients" : `ws_${workspaceId}_clients`;
          const clientSnap = await getDocs(collection(db, clientsColName));
          let firestoreNames: string[] = [];
          if (!clientSnap.empty) {
            firestoreNames = clientSnap.docs.map((d) => d.data().nombre || d.data().name).filter(Boolean);
          } else if (isMaster) {
            const v3Fallback = await getDocs(collection(db, "v3_clients"));
            if (!v3Fallback.empty) {
              firestoreNames = v3Fallback.docs.map((d) => d.data().nombre || d.data().name).filter(Boolean);
            }
          }
          const finalClients = isMaster
            ? Array.from(new Set([...firestoreNames, ...DEFAULT_CLIENT_NAMES]))
            : firestoreNames;
          setClientList(finalClients);
        }
      } catch (err) {
        console.error("Error loading clients for Task Modal:", err);
      }
    };
    loadClients();
  }, [isOpen, workspaceId, isMaster]);

  // Populate data when opening
  useEffect(() => {
    if (!isOpen) return;

    if (editingTask) {
      setTitle(editingTask.title || (editingTask as any).titulo || "");
      setDesc(editingTask.desc || (editingTask as any).descripcion || (editingTask as any).contenido || "");
      setStatus((editingTask.status as any) || (editingTask as any).estado || "Planificado");
      setPriority(editingTask.priority || (editingTask as any).prioridad || "Media");
      
      const rawFmt = editingTask.formato || editingTask.format || (editingTask as any).formatoKey || "story_ig";
      const fmtObj = getFormato(rawFmt);
      setFormatoKey(fmtObj?.key || rawFmt);
      setFormatName(fmtObj?.nombre || editingTask.format || "Story Imagen");

      setArea((editingTask as any).area || "Diseño");
      setTime(editingTask.time || (editingTask as any).esfuerzo || "1 hora");

      const pId = editingTask.projectId || (editingTask as any).proyecto_id || (editingTask as any).proyecto_ids?.[0] || defaultProjectId || "";
      setProjectId(pId);

      const foundProj = projects.find(p => String(p.id) === String(pId));
      setClient(editingTask.client || editingTask.cliente || foundProj?.client || (foundProj as any)?.cliente || "Brandex");

      const rawWorkerIds = (editingTask as any).asignado_ids || [];
      if (rawWorkerIds.length > 0) {
        setSelectedWorkerIds(rawWorkerIds);
      } else if (editingTask.asignado || (editingTask as any).worker) {
        const name = editingTask.asignado || (editingTask as any).worker;
        const matched = liveMembers.find(m => m.nombre === name || m.name === name);
        setSelectedWorkerIds(matched ? [matched.id] : []);
      } else {
        setSelectedWorkerIds([]);
      }

      const sRaw = toYyyyMmDd((editingTask as any).startDateRaw || (editingTask as any).fecha_programada || (editingTask as any).fechaInicio || (editingTask as any).fechaProg);
      const dRaw = toYyyyMmDd(editingTask.deadline || (editingTask as any).fecha_limite || (editingTask as any).fechaFin || (editingTask as any).fechaEntrega || (editingTask as any).deadlineRaw);

      if (sRaw) setStartDateRaw(sRaw);
      else setStartDateRaw(formatDateToInput(new Date()));

      if (dRaw) setDeadlineRaw(dRaw);
      else {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        setDeadlineRaw(formatDateToInput(d));
      }

      setSubtasks(editingTask.subtasks ? [...editingTask.subtasks] : []);
      setRecursosDrive((editingTask as any).attachmentUrl || (editingTask as any).recursosDrive || (editingTask as any).drive_link || "");
    } else {
      // Creation Mode
      setTitle("");
      setDesc("");
      setStatus("Planificado");
      setPriority("Media");
      setFormatoKey("story_ig");
      setFormatName("Story Imagen");
      setArea("Diseño");
      setTime("1 hora");

      const initProjId = defaultProjectId || (projects[0]?.id ? String(projects[0].id) : "");
      setProjectId(initProjId);

      const foundProj = projects.find(p => String(p.id) === String(initProjId));
      setClient(foundProj?.client || (foundProj as any)?.cliente || "Brandex");

      const today = new Date();
      const d7 = new Date();
      d7.setDate(today.getDate() + 7);
      setStartDateRaw(formatDateToInput(today));
      setDeadlineRaw(formatDateToInput(d7));

      setSelectedWorkerIds([]);
      setSubtasks([]);
      setRecursosDrive("");
    }

    setIsExpanded(false);
    setIsMoreMenuOpen(false);
    setShowDriveInput(false);
    setIsAddingSubtask(false);
    setNewSubtaskText("");

    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 100);
  }, [isOpen, editingTask, defaultProjectId, projects, liveMembers]);

  // When project changes, update client
  const handleSelectProject = (newProjId: string | number) => {
    setProjectId(newProjId);
    const found = projects.find((p) => String(p.id) === String(newProjId));
    if (found) {
      if (found.client || (found as any).cliente) {
        setClient(found.client || (found as any).cliente);
      }
    }
  };

  const handleClientCreated = (newClient: { name: string }) => {
    setClientList((prev) => Array.from(new Set([newClient.name, ...prev])));
    setClient(newClient.name);
    setIsCreateClientOpen(false);
    playSound("pop");
  };

  // Subtasks Handlers
  const handleAddSubtask = () => {
    if (!newSubtaskText.trim()) return;
    playSound("pop");
    const newItem: SubtaskItem = {
      id: Date.now(),
      text: newSubtaskText.trim(),
      done: false
    };
    setSubtasks((prev) => [...prev, newItem]);
    setNewSubtaskText("");
    setIsAddingSubtask(false);
  };

  const handleToggleSubtask = (subtaskId: number) => {
    playSound("click");
    setSubtasks((prev) =>
      prev.map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s))
    );
  };

  const handleDeleteSubtask = (subtaskId: number) => {
    playSound("trash");
    setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
  };

  const handleUpdateSubtaskText = (subtaskId: number, text: string) => {
    setSubtasks((prev) =>
      prev.map((s) => (s.id === subtaskId ? { ...s, text } : s))
    );
  };

  // Live session helper
  const isCurrentTaskRunningSession = activeSession?.task_id === String(editingTask?.id);

  const handleToggleLiveSession = async () => {
    if (!editingTask?.id) return;
    playSound("click");
    if (isCurrentTaskRunningSession) {
      await endSession();
    } else {
      await startSession({
        taskId: String(editingTask.id),
        projectId: String(projectId || "1"),
        clientId: client,
        workerId: selectedWorkerIds[0] || null,
        origin: "manual"
      });
    }
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    playSound("pop");

    const matchedWorker = liveMembers.find((m) => selectedWorkerIds.includes(m.id));
    const finalData: TaskData = {
      id: editingTask?.id,
      title: title.trim(),
      desc: desc.trim(),
      status,
      priority,
      format: formatName,
      formato: formatoKey,
      area,
      time,
      startDate: startDateRaw,
      deadline: deadlineRaw,
      startDateRaw,
      deadlineRaw,
      fecha_programada: startDateRaw,
      fecha_limite: deadlineRaw,
      fecha_creacion: (editingTask as any)?.fecha_creacion || formatDateToInput(new Date()),
      projectId: projectId || undefined,
      projectName: currentProject?.title || (currentProject as any)?.nombre,
      client,
      asignado_ids: selectedWorkerIds,
      asignado: matchedWorker?.nombre || matchedWorker?.name,
      color: projectColor,
      subtasks,
      attachmentUrl: recursosDrive.trim() || undefined,
      recursosDrive: recursosDrive.trim() || undefined
    };

    if (editingTask && editingTask.id && onUpdateTask) {
      onUpdateTask(editingTask.id, finalData, projectId);
    } else if (onCreateTask) {
      onCreateTask(finalData);
    }

    onClose();
  };

  if (!isOpen) return null;

  const completedSubtasksCount = subtasks.filter((s) => s.done).length;
  const subtasksProgress = subtasks.length > 0 ? Math.round((completedSubtasksCount / subtasks.length) * 100) : 0;

  const targetWidth = isExpanded
    ? (typeof window !== 'undefined' ? Math.min(940, window.innerWidth * 0.95) : 940)
    : 640;
  const initialScale = originRect ? Math.max(originRect.width / targetWidth, 0.28) : 0.65;
  const initialX = originRect && typeof window !== 'undefined'
    ? originRect.x + originRect.width / 2 - window.innerWidth / 2
    : 0;
  const initialY = originRect && typeof window !== 'undefined'
    ? originRect.y + originRect.height / 2 - window.innerHeight / 2
    : 25;

  const modalVariants = {
    initial: {
      opacity: 0,
      scale: initialScale,
      x: initialX,
      y: initialY,
      filter: "blur(12px)",
      borderRadius: "16px"
    },
    animate: {
      opacity: 1,
      scale: 1,
      x: 0,
      y: 0,
      filter: "blur(0px)",
      borderRadius: "28px",
      transition: {
        duration: 0.38,
        ease: [0.305, 0.206, 0.3, 1] as const, // PrettyModal custom cubic-bezier
        opacity: { duration: 0.24, ease: [0.56, 0.27, 0, 1] as const },
        filter: { duration: 0.26, ease: [0.56, 0.27, 0, 1] as const },
        borderRadius: { duration: 0.35, ease: [0.56, 0.27, 0, 1] as const }
      }
    },
    exit: {
      opacity: 0,
      scale: initialScale * 0.85,
      x: initialX,
      y: initialY,
      filter: "blur(24px)",
      borderRadius: "400px", // PrettyModal closing border-radius morph
      transition: {
        duration: 0.32,
        ease: [0.37, 0.35, 0, 1] as const, // PrettyModal closing curve
        opacity: { duration: 0.22, ease: [0.56, 0.27, 0, 1] as const },
        filter: { duration: 0.24, ease: [0.37, 0.35, 0, 1] as const },
        borderRadius: { duration: 0.28, ease: [0.56, 0.27, 0, 1] as const }
      }
    }
  };

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          {/* Backdrop (Dark overlay without background blur) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.56, 0.27, 0, 1] as const }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 z-40 transition-opacity"
          />

          {/* Modal Container */}
          <motion.div
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={`relative z-50 flex flex-col ${
              isNightMode ? "bg-[#181817] text-white" : "bg-[#f4f4f5] text-black"
            } border border-white/10 shadow-2xl overflow-hidden transition-all duration-300 ${
              isExpanded ? "w-[940px] max-w-[95vw] h-[90vh]" : "w-[640px] max-w-[95vw] max-h-[90vh]"
            }`}
          >
            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                
                {/* ── 1. PORTADA / BANNER HERO DE COLOR SÓLIDO (ANCLADO AL PROYECTO) ── */}
                <div
                  style={{ backgroundColor: projectColor }}
                  className="w-full px-5 pt-4 pb-5 rounded-t-[28px] flex flex-col gap-3 transition-colors duration-300 relative"
                >
                  {/* Top Meta Line: Client Pill + Breadcrumbs + Window Controls */}
                  <div className="flex items-center justify-between text-xs select-none">
                    {/* Left: Client Pill + Project / Creation Date */}
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
                          <span>{client || "Sin cliente"}</span>
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

                      {/* Project Name or Creation Date */}
                      <span className="text-white/90 text-[11px] font-medium truncate max-w-[200px]">
                        {currentProject?.title || (currentProject as any)?.nombre || "Tarea independiente"}
                      </span>

                      <span className="text-white/60 text-[11px]">
                        • {editingTask ? "Editando tarea" : "Nueva tarea"}
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
                        title={isExpanded ? "Restaurar tamaño" : "Expandir ventana"}
                      >
                        {isExpanded ? <Minimize2 className="w-3.5 h-3.5 text-white" /> : <Maximize2 className="w-3.5 h-3.5 text-white" />}
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                        title="Cerrar"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>

                      {/* 3 Dots Menu Button */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            playSound("click");
                            setIsMoreMenuOpen(!isMoreMenuOpen);
                          }}
                          className={`p-1 rounded transition-colors cursor-pointer ${
                            isMoreMenuOpen ? "bg-white/30 text-white" : "text-white/80 hover:text-white hover:bg-white/20"
                          }`}
                          title="Opciones de la tarea"
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
                                {editingTask && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      playSound("pop");
                                      setIsMoreMenuOpen(false);
                                      if (onCreateTask) {
                                        onCreateTask({
                                          title: `${title} (Copia)`,
                                          desc,
                                          status,
                                          priority,
                                          format: formatName,
                                          formato: formatoKey,
                                          area,
                                          time,
                                          startDate: startDateRaw,
                                          deadline: deadlineRaw,
                                          projectId,
                                          client,
                                          asignado_ids: selectedWorkerIds,
                                          color: projectColor,
                                          subtasks: subtasks.map(s => ({ ...s, id: Date.now() + Math.random() }))
                                        });
                                      }
                                      onClose();
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-left"
                                  >
                                    <Copy className="w-3.5 h-3.5 text-white/60 shrink-0" />
                                    <span>Duplicar tarea</span>
                                  </button>
                                )}

                                {editingTask && onDeleteTask && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      playSound("trash");
                                      setIsMoreMenuOpen(false);
                                      if (editingTask.id) {
                                        onDeleteTask(editingTask.id, projectId);
                                      }
                                      onClose();
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/15 rounded-lg transition-colors cursor-pointer text-left"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                    <span>Eliminar tarea</span>
                                  </button>
                                )}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* Task Title Input */}
                  <input
                    ref={titleInputRef}
                    type="text"
                    placeholder="Título de la tarea..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-transparent text-[19px] font-bold text-white placeholder-white/70 border-none outline-none ring-0 focus:outline-none focus:ring-0 focus:border-none caret-white p-0 shadow-none"
                  />

                  {/* Task Description / Brief Textarea */}
                  <textarea
                    rows={2}
                    placeholder="Escribe el core brief, notas o contexto de la tarea aquí..."
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    className="w-full bg-transparent text-[13px] text-white/90 placeholder-white/70 border-none outline-none ring-0 focus:outline-none focus:ring-0 focus:border-none caret-white resize-none leading-relaxed p-0 min-h-[50px] shadow-none"
                  />
                </div>

                {/* ── 2. CUERPO MODAL: PROPIEDADES, SUBTAREAS & RECURSOS ── */}
                <div className="p-5 space-y-4">
                  
                  {/* PROPERTY BUTTONS ROW */}
                  <div className="flex flex-wrap items-center gap-2">
                    
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
                          activePopover === "status"
                            ? "bg-[#32323e] border border-[#484856] text-white"
                            : "bg-[#1d1d21] hover:bg-[#27272f] border border-[#2e2e36] hover:border-[#444450] text-[#f4f4f5]"
                        }`}
                      >
                        <ProjectStatusIcon status={status} className="w-3.5 h-3.5 shrink-0" />
                        <span>{status || "Estado"}</span>
                      </button>
                      <LinearDropdownPopover
                        isOpen={activePopover === "status"}
                        onClose={() => setActivePopover(null)}
                        placeholder="Cambiar estado…"
                        shortcutKey="S"
                        selectedValue={status}
                        onSelect={(val) => setStatus(val as any)}
                        options={[
                          { id: "Planificado", label: "Planificado", icon: <ProjectStatusIcon status="Planificado" className="w-3.5 h-3.5" />, shortcut: "1" },
                          { id: "En Proceso", label: "En Proceso", icon: <ProjectStatusIcon status="En Proceso" className="w-3.5 h-3.5" />, shortcut: "2" },
                          { id: "En Revisión", label: "En Revisión", icon: <ProjectStatusIcon status="En Revisión" className="w-3.5 h-3.5" />, shortcut: "3" },
                          { id: "Completado", label: "Completado", icon: <ProjectStatusIcon status="Completado" className="w-3.5 h-3.5" />, shortcut: "4" }
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
                          activePopover === "priority"
                            ? "bg-[#32323e] border border-[#484856] text-white"
                            : "bg-[#1d1d21] hover:bg-[#27272f] border border-[#2e2e36] hover:border-[#444450] text-[#f4f4f5]"
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
                          { id: "Sin prioridad", label: "Sin prioridad", shortcut: "1" },
                          { id: "Urgente", label: "Urgente", shortcut: "2" },
                          { id: "Alta", label: "Alta", shortcut: "3" },
                          { id: "Media", label: "Media", shortcut: "4" },
                          { id: "Baja", label: "Baja", shortcut: "5" }
                        ]}
                      />
                    </div>

                    {/* Format button + Popover */}
                    <div className="relative">
                      <button
                        type="button"
                        role="combobox"
                        onClick={() => {
                          playSound("click");
                          setActivePopover(activePopover === "format" ? null : "format");
                        }}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                          activePopover === "format"
                            ? "bg-[#32323e] border border-[#484856] text-white"
                            : "bg-[#1d1d21] hover:bg-[#27272f] border border-[#2e2e36] hover:border-[#444450] text-[#f4f4f5]"
                        }`}
                      >
                        <FormatoShape formatoObj={getFormato(formatoKey)} size="sm" />
                        <span>{formatName || "Formato"}</span>
                      </button>
                      <LinearDropdownPopover
                        isOpen={activePopover === "format"}
                        onClose={() => setActivePopover(null)}
                        placeholder="Cambiar formato…"
                        shortcutKey="F"
                        selectedValue={formatoKey}
                        onSelect={(val) => {
                          const fmt = getFormato(val);
                          setFormatoKey(val);
                          setFormatName(fmt?.nombre || val);
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

                    {/* Project button + Popover */}
                    <div className="relative">
                      <button
                        type="button"
                        role="combobox"
                        onClick={() => {
                          playSound("click");
                          setActivePopover(activePopover === "project" ? null : "project");
                        }}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                          activePopover === "project"
                            ? "bg-[#32323e] border border-[#484856] text-white"
                            : "bg-[#1d1d21] hover:bg-[#27272f] border border-[#2e2e36] hover:border-[#444450] text-[#f4f4f5]"
                        }`}
                      >
                        <Folder className="w-3 h-3 text-white shrink-0" />
                        <span>{currentProject?.title || (currentProject as any)?.nombre || "Sin proyecto"}</span>
                      </button>
                      <LinearDropdownPopover
                        isOpen={activePopover === "project"}
                        onClose={() => setActivePopover(null)}
                        placeholder="Asignar proyecto…"
                        shortcutKey="O"
                        selectedValue={String(projectId)}
                        onSelect={(val) => handleSelectProject(val)}
                        options={[
                          { id: "", label: "Sin proyecto (Independiente)", shortcut: "0" },
                          ...projects.map((p, i) => ({
                            id: String(p.id),
                            label: p.title || (p as any).nombre,
                            badge: p.client || (p as any).cliente,
                            shortcut: String(i + 1)
                          }))
                        ]}
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
                          activePopover === "assignee"
                            ? "bg-[#32323e] border border-[#484856] text-white"
                            : "bg-[#1d1d21] hover:bg-[#27272f] border border-[#2e2e36] hover:border-[#444450] text-[#f4f4f5]"
                        }`}
                      >
                        <User className="w-3 h-3 text-white shrink-0" />
                        <span>
                          {selectedWorkerIds.length > 0
                            ? liveMembers.find((m) => selectedWorkerIds.includes(m.id))?.nombre || "Asignado"
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
                        options={liveMembers.map((m, i) => ({
                          id: m.id,
                          label: m.nombre,
                          badge: m.rol,
                          shortcut: String(i + 1)
                        }))}
                      />
                    </div>

                    {/* Effort / Duration Button + Popover */}
                    <div className="relative">
                      <button
                        type="button"
                        role="combobox"
                        onClick={() => {
                          playSound("click");
                          setActivePopover(activePopover === "time" ? null : "time");
                        }}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                          activePopover === "time"
                            ? "bg-[#32323e] border border-[#484856] text-white"
                            : "bg-[#1d1d21] hover:bg-[#27272f] border border-[#2e2e36] hover:border-[#444450] text-[#f4f4f5]"
                        }`}
                      >
                        <Clock className="w-3 h-3 text-white shrink-0" />
                        <span>{time || "1 hora"}</span>
                      </button>
                      <LinearDropdownPopover
                        isOpen={activePopover === "time"}
                        onClose={() => setActivePopover(null)}
                        placeholder="Cambiar duración…"
                        shortcutKey="D"
                        selectedValue={time}
                        onSelect={(val) => setTime(val)}
                        options={TIME_OPTIONS}
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
                          activePopover === "date"
                            ? "bg-[#32323e] border border-[#484856] text-white"
                            : "bg-[#1d1d21] hover:bg-[#27272f] border border-[#2e2e36] hover:border-[#444450] text-[#f4f4f5]"
                        }`}
                      >
                        <Calendar className="w-3 h-3 text-white shrink-0" />
                        <span>
                          {startDateRaw && deadlineRaw
                            ? `${formatDateToFriendly(parseAnyDate(startDateRaw) || new Date())} → ${formatDateToFriendly(parseAnyDate(deadlineRaw) || new Date())}`
                            : deadlineRaw
                            ? formatDateToFriendly(parseAnyDate(deadlineRaw) || new Date())
                            : startDateRaw
                            ? formatDateToFriendly(parseAnyDate(startDateRaw) || new Date())
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

                    {/* Area button + Popover */}
                    <div className="relative">
                      <button
                        type="button"
                        role="combobox"
                        onClick={() => {
                          playSound("click");
                          setActivePopover(activePopover === "area" ? null : "area");
                        }}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                          activePopover === "area"
                            ? "bg-[#32323e] border border-[#484856] text-white"
                            : "bg-[#1d1d21] hover:bg-[#27272f] border border-[#2e2e36] hover:border-[#444450] text-[#f4f4f5]"
                        }`}
                      >
                        <Tag className="w-3 h-3 text-white shrink-0" />
                        <span>{area || "Área"}</span>
                      </button>
                      <LinearDropdownPopover
                        isOpen={activePopover === "area"}
                        onClose={() => setActivePopover(null)}
                        placeholder="Cambiar área…"
                        shortcutKey="R"
                        selectedValue={area}
                        onSelect={(val) => setArea(val)}
                        options={AREA_OPTIONS.map((a, i) => ({
                          id: a,
                          label: a,
                          shortcut: String(i + 1)
                        }))}
                      />
                    </div>

                  </div>

                  {/* SUBTASKS / CHECKLIST SECTION */}
                  <div className="pt-3 border-t border-[#222226] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#a1a1aa]">
                        Subtareas del entregable ({subtasks.length})
                      </span>
                      {subtasks.length > 0 && (
                        <span className="text-[10px] font-bold text-white/50">
                          {completedSubtasksCount} de {subtasks.length} ({subtasksProgress}%)
                        </span>
                      )}
                    </div>

                    {/* Subtasks Progress Bar */}
                    {subtasks.length > 0 && (
                      <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden mb-2">
                        <div
                          className="h-full bg-emerald-400 transition-all duration-300"
                          style={{ width: `${subtasksProgress}%` }}
                        />
                      </div>
                    )}

                    {/* Subtasks List */}
                    <div className="flex flex-col gap-1.5">
                      <AnimatePresence>
                        {subtasks.map((st) => (
                          <motion.div
                            layout
                            key={st.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full rounded-full border-none bg-[#1d1d21] p-1.5 px-3 flex items-center justify-between gap-3 transition-all relative shadow-sm hover:bg-[#232328]"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <button
                                type="button"
                                onClick={() => handleToggleSubtask(st.id)}
                                className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                                  st.done
                                    ? "bg-emerald-500 text-black"
                                    : "border border-white/30 hover:border-white/60"
                                }`}
                              >
                                {st.done && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </button>

                              <input
                                type="text"
                                value={st.text}
                                onChange={(e) => handleUpdateSubtaskText(st.id, e.target.value)}
                                className={`flex-1 bg-transparent text-xs font-semibold outline-none border-none ring-0 focus:outline-none p-0 ${
                                  st.done ? "line-through text-white/40" : "text-[#f4f4f5]"
                                }`}
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteSubtask(st.id)}
                              className="p-1 text-[#71717a] hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                              title="Eliminar subtarea"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {/* Add Subtask Button / Form */}
                      {!isAddingSubtask ? (
                        <button
                          type="button"
                          onClick={() => {
                            playSound("click");
                            setIsAddingSubtask(true);
                          }}
                          className="w-full rounded-full border border-dashed border-[#33333e] hover:border-[#4f4f5e] p-2 text-xs font-medium text-[#a1a1aa] hover:text-[#f4f4f5] flex items-center justify-center gap-2 bg-transparent hover:bg-[#1a1a1e]/40 transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#a1a1aa] shrink-0" />
                          <span>Añadir subtarea al entregable</span>
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
                            placeholder="Descripción de la subtarea..."
                            value={newSubtaskText}
                            onChange={(e) => setNewSubtaskText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddSubtask();
                              if (e.key === "Escape") {
                                setIsAddingSubtask(false);
                                setNewSubtaskText("");
                              }
                            }}
                            className="flex-1 bg-transparent text-xs font-semibold text-[#f4f4f5] placeholder-[#686873] outline-none border-none ring-0 focus:outline-none p-0 ml-1"
                          />

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={handleAddSubtask}
                              disabled={!newSubtaskText.trim()}
                              className="p-1 text-emerald-400 hover:text-emerald-300 disabled:opacity-40 transition-colors cursor-pointer"
                              title="Guardar subtarea (Enter)"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingSubtask(false);
                                setNewSubtaskText("");
                              }}
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

                  {/* MAKER MODE LIVE SESSION CONTROL (IF TASK EXISTS) */}
                  {editingTask?.id && (
                    <div className="pt-3 border-t border-[#222226] flex items-center justify-between p-2.5 rounded-2xl bg-[#1d1d21]">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2.5 h-2.5 rounded-full ${isCurrentTaskRunningSession ? "bg-cyan-400 animate-ping" : "bg-white/30"}`} />
                        <div>
                          <p className="text-[10px] uppercase font-extrabold tracking-wider text-white/50">
                            {isCurrentTaskRunningSession ? "Sesión Activa en Curso" : "Cronómetro de Trabajo"}
                          </p>
                          <p className="text-xs font-bold text-white">
                            Estimado: {time}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleToggleLiveSession}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          isCurrentTaskRunningSession
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30"
                            : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30"
                        }`}
                      >
                        {isCurrentTaskRunningSession ? (
                          <>
                            <Square className="w-3.5 h-3.5 fill-current" />
                            <span>Pausar Sesión</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Iniciar Sesión</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* DRIVE / ATTACHMENT URL ROW */}
                  {showDriveInput && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pt-2"
                    >
                      <div className="flex items-center gap-2 p-2 px-3 rounded-xl bg-[#1d1d21] border border-white/10 text-xs">
                        <LinkIcon className="w-3.5 h-3.5 text-white/60 shrink-0" />
                        <input
                          type="url"
                          placeholder="Enlace de Drive, Figma o recurso de entrega..."
                          value={recursosDrive}
                          onChange={(e) => setRecursosDrive(e.target.value)}
                          className="flex-1 bg-transparent text-xs text-white placeholder-white/40 outline-none border-none"
                        />
                        {recursosDrive && (
                          <a
                            href={recursosDrive}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded text-cyan-400 hover:text-cyan-300"
                            title="Abrir enlace"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </motion.div>
                  )}

                </div>
              </div>

              {/* ── 3. FOOTER BAR ── */}
              <div className={`flex items-center justify-between px-5 py-3 border-t border-white/5 ${isNightMode ? "bg-[#181817]" : "bg-[#f4f4f5]"} shrink-0 text-xs`}>
                {/* Left: Paperclip Icon */}
                <div className="flex items-center gap-1 text-[#71717a]">
                  <button
                    type="button"
                    onClick={() => setShowDriveInput(!showDriveInput)}
                    aria-label="Adjuntar enlace de drive o entrega"
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      showDriveInput || recursosDrive ? "bg-cyan-500/20 text-cyan-300" : "hover:bg-[#222226] hover:text-[#f4f4f5]"
                    }`}
                    title="Vincular carpeta o entregable"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  {recursosDrive && (
                    <span className="text-[11px] text-cyan-400 font-medium truncate max-w-[200px]">
                      Enlace adjuntado
                    </span>
                  )}
                </div>

                {/* Right: Submit Button Pill */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="bg-white hover:bg-[#e4e4e7] text-[#09090b] text-xs font-bold px-5 py-2 rounded-full transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95"
                  >
                    {editingTask ? "Guardar Cambios" : "Crear Tarea"}
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Sub-Modal for Creating Client */}
      <CreateClientModal
        isOpen={isCreateClientOpen}
        onClose={() => setIsCreateClientOpen(false)}
        onClientCreated={handleClientCreated}
      />
    </>
  );
}
