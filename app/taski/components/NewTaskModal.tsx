"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
  Sparkles,
  UserCheck,
  PenTool,
  Send,
  ChevronDown
} from "lucide-react";
import FormatoShape from "./FormatoShape";
import { FORMATOS_ESTANDAR, getFormato } from "../utils/formatos";
import { Project } from "./ProjectDashboard";
import type { Task, Client } from "@/lib/types";
import CreateClientModal from "./CreateClientModal";
import { ProjectStatusIcon } from "@/components/common/ProjectStatusIcon";
import LinearDropdownPopover, { PopoverOption } from "./LinearDropdownPopover";
import LinearDatePopover from "./LinearDatePopover";
import { SmoothInput, SmoothTextarea } from "@/components/ui/SmoothInput";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PROJECT_COLOR_PALETTE, getSingleSourceProjectColor, formatProjectCreatedDate } from "@/lib/utils";
import { useAuthStore } from "@/lib/store";
import { useMembers, INITIAL_MEMBERS } from "@/hooks/useMembers";
import { useSessions } from "@/hooks/useSessions";
import { TaskCardSessions } from "@/components/modals/TaskCardSessions";
import { Portal } from "@/components/ui/Portal";
import { RichNoteToolbar, ActiveFormatsState } from "@/components/notes/RichNoteToolbar";
import { NoteSquircleCard } from "@/components/notes/NoteSquircleCard";
import { NoteExpandedModal } from "@/components/notes/NoteExpandedModal";
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote } from "@/hooks/useNotes";
import type { NoteDoc } from "@/lib/types";

function convertLegacyMarkdownToHtml(text: string): string {
  if (!text || text.trim() === "" || text === "<p><br></p>") {
    return "";
  }
  if (/<(p|h1|h2|h3|ul|ol|li|b|strong|i|em|u|s|blockquote|div|span)[^>]*>/i.test(text)) {
    return text;
  }
  return text
    .replace(/^#\s+(.*)$/gm, "<h1>$1</h1>")
    .replace(/^##\s+(.*)$/gm, "<h2>$1</h2>")
    .replace(/^###\s+(.*)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
    .replace(/\*(.*?)\*/g, "<i>$1</i>")
    .replace(/^-\s+(.*)$/gm, "<li>$1</li>")
    .replace(/^>\s+(.*)$/gm, "<blockquote>$1</blockquote>")
    .replace(/\n/g, "<br>");
}

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
  asignado_id?: string;
  asignado_ids?: string[];
  asignado?: string;
  copywriting?: {
    gancho?: string;
    cuerpo?: string;
    cta?: string;
  };
  copy?: string;
  fechaPublicacion?: string;
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
  editingTask?: {
    id?: string | number;
    title?: string;
    titulo?: string;
    desc?: string;
    descripcion?: string;
    contenido?: string;
    format?: string;
    formato?: string | null;
    formatoKey?: string;
    time?: string;
    esfuerzo?: string;
    status?: string;
    estado?: string;
    priority?: string;
    prioridad?: string;
    deadline?: string;
    deadlineRaw?: string;
    fecha_limite?: string;
    fechaEntrega?: string;
    fechaFin?: string;
    startDate?: string;
    startDateRaw?: string;
    fecha_programada?: string;
    fechaInicio?: string;
    fechaProg?: string;
    fechaPublicacion?: string;
    fecha_creacion?: string;
    projectId?: string | number;
    proyecto_id?: string;
    proyecto_ids?: string[];
    projectName?: string;
    client?: string;
    cliente?: string;
    cliente_ids?: string[];
    asignado?: string;
    asignado_id?: string;
    asignado_ids?: string[];
    area?: string;
    worker?: string;
    copywriting?: {
      gancho?: string;
      cuerpo?: string;
      cta?: string;
    };
    copy?: string;
    subtasks?: SubtaskItem[];
    attachmentUrl?: string;
    recursosDrive?: string;
    drive_link?: string;
    color?: string;
  } | null;
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
    "status" | "priority" | "format" | "project" | "assignee" | "primary_assignee" | "time" | "date" | "pub_date" | "area" | "header_client" | null
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
  const [asignadoId, setAsignadoId] = useState<string>("");
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [startDateRaw, setStartDateRaw] = useState(() => formatDateToInput(new Date()));
  const [deadlineRaw, setDeadlineRaw] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return formatDateToInput(d);
  });
  const [fechaPublicacionRaw, setFechaPublicacionRaw] = useState("");
  const [copyGancho, setCopyGancho] = useState("");
  const [copyCuerpo, setCopyCuerpo] = useState("");
  const [copyCta, setCopyCta] = useState("");
  const [recursosDrive, setRecursosDrive] = useState("");

  // Editor WYSIWYG para el documento / brief de la tarea
  const taskEditorRef = useRef<HTMLDivElement>(null);
  const [taskBlockType, setTaskBlockType] = useState<"p" | "h1" | "h2" | "ul" | "ol" | "blockquote">("p");
  const [taskActiveFormats, setTaskActiveFormats] = useState<ActiveFormatsState>({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    list: false,
    numbered: false,
    quote: false,
  });

  const updateTaskActiveStyles = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || !selection.anchorNode || !taskEditorRef.current) return;

    let node: Node | null = selection.anchorNode;
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }

    let detectedBlock: "p" | "h1" | "h2" | "ul" | "ol" | "blockquote" = "p";
    let curr: Node | null = node;
    while (curr && curr !== taskEditorRef.current) {
      const tag = (curr as HTMLElement).tagName?.toLowerCase();
      if (tag === "h1") {
        detectedBlock = "h1";
        break;
      }
      if (tag === "h2" || tag === "h3") {
        detectedBlock = "h2";
        break;
      }
      if (tag === "ul" || (tag === "li" && curr.parentElement?.tagName.toLowerCase() === "ul")) {
        detectedBlock = "ul";
        break;
      }
      if (tag === "ol" || (tag === "li" && curr.parentElement?.tagName.toLowerCase() === "ol")) {
        detectedBlock = "ol";
        break;
      }
      if (tag === "blockquote") {
        detectedBlock = "blockquote";
        break;
      }
      curr = curr.parentNode;
    }
    setTaskBlockType(detectedBlock);

    try {
      setTaskActiveFormats({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        strikeThrough: document.queryCommandState("strikeThrough"),
        list: detectedBlock === "ul",
        numbered: detectedBlock === "ol",
        quote: detectedBlock === "blockquote",
      });
    } catch {
      // ignore
    }
  }, []);

  const handleTaskFormatClick = (format: "bold" | "italic" | "underline" | "strikeThrough" | "list" | "numbered" | "quote") => {
    if (!taskEditorRef.current) return;
    taskEditorRef.current.focus();

    switch (format) {
      case "bold":
        document.execCommand("bold", false);
        break;
      case "italic":
        document.execCommand("italic", false);
        break;
      case "underline":
        document.execCommand("underline", false);
        break;
      case "strikeThrough":
        document.execCommand("strikeThrough", false);
        break;
      case "list":
        document.execCommand("insertUnorderedList", false);
        break;
      case "numbered":
        document.execCommand("insertOrderedList", false);
        break;
      case "quote":
        document.execCommand("formatBlock", false, "<blockquote>");
        break;
    }

    const newHtml = taskEditorRef.current.innerHTML;
    setDesc(newHtml);
    setCopyCuerpo(newHtml);
    setTimeout(updateTaskActiveStyles, 50);
  };

  const handleTaskBlockTypeChange = (type: "p" | "h1" | "h2" | "ul" | "ol" | "blockquote") => {
    if (!taskEditorRef.current) return;
    taskEditorRef.current.focus();
    setTaskBlockType(type);

    if (type === "ul") {
      document.execCommand("insertUnorderedList", false);
    } else if (type === "ol") {
      document.execCommand("insertOrderedList", false);
    } else if (type === "blockquote") {
      document.execCommand("formatBlock", false, "<blockquote>");
    } else if (type === "h1") {
      document.execCommand("formatBlock", false, "<h1>");
    } else if (type === "h2") {
      document.execCommand("formatBlock", false, "<h2>");
    } else {
      document.execCommand("formatBlock", false, "<p>");
    }

    const newHtml = taskEditorRef.current.innerHTML;
    setDesc(newHtml);
    setCopyCuerpo(newHtml);
    setTimeout(updateTaskActiveStyles, 50);
  };

  const handleTaskEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      const selection = window.getSelection();
      if (selection && selection.anchorNode && taskEditorRef.current) {
        let node: Node | null = selection.anchorNode;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
        let blockTag = "";
        let curr: Node | null = node;
        while (curr && curr !== taskEditorRef.current) {
          const tag = (curr as HTMLElement).tagName?.toLowerCase();
          if (tag === "h1" || tag === "h2" || tag === "h3") {
            blockTag = tag;
            break;
          }
          curr = curr.parentNode;
        }

        if (blockTag === "h1" || blockTag === "h2" || blockTag === "h3") {
          e.preventDefault();
          document.execCommand("insertParagraph", false);
          document.execCommand("formatBlock", false, "<p>");
          setTaskBlockType("p");
          const newHtml = taskEditorRef.current.innerHTML;
          setDesc(newHtml);
          setCopyCuerpo(newHtml);
          setTimeout(updateTaskActiveStyles, 50);
          return;
        }
      }
    }

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      handleTaskFormatClick("bold");
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
      e.preventDefault();
      handleTaskFormatClick("italic");
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "u") {
      e.preventDefault();
      handleTaskFormatClick("underline");
    }
  };

  // Notas vinculadas desde Firestore
  const { data: allNotes = [] } = useNotes();
  const createNoteMutation = useCreateNote();
  const updateNoteMutation = useUpdateNote();
  const deleteNoteMutation = useDeleteNote();
  const [activeTaskNoteDoc, setActiveTaskNoteDoc] = useState<NoteDoc | null>(null);

  const linkedNotes = useMemo(() => {
    if (!editingTask?.id) return [];
    const editIdStr = String(editingTask.id);
    return allNotes.filter((n) => String(n.taskId) === editIdStr);
  }, [allNotes, editingTask?.id]);

  // Subtasks State
  const [subtasks, setSubtasks] = useState<SubtaskItem[]>([]);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [newSubtaskText, setNewSubtaskText] = useState("");

  const titleInputRef = useRef<HTMLInputElement>(null);
  const projectsRef = useRef(projects);
  projectsRef.current = projects;
  const liveMembersRef = useRef(liveMembers);
  liveMembersRef.current = liveMembers;

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

  // Escape key handler to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        playSound("click");
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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

    const curProjects = projectsRef.current;
    const curLiveMembers = liveMembersRef.current;

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

      const foundProj = curProjects.find(p => String(p.id) === String(pId));
      setClient(editingTask.client || editingTask.cliente || foundProj?.client || (foundProj as any)?.cliente || "Brandex");

      setAsignadoId((editingTask as any).asignado_id || "");

      const rawWorkerIds = (editingTask as any).asignado_ids || [];
      if (rawWorkerIds.length > 0) {
        setSelectedWorkerIds(rawWorkerIds);
      } else if (editingTask.asignado || (editingTask as any).worker) {
        const name = editingTask.asignado || (editingTask as any).worker;
        const matched = curLiveMembers.find(m => m.nombre === name || m.name === name);
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

      setFechaPublicacionRaw(toYyyyMmDd((editingTask as any).fechaPublicacion) || "");

      const rawDesc = (editingTask as any).desc || (editingTask as any).descripcion || "";
      const cleanDesc = rawDesc.replace(/<[^>]*>/g, "").trim();
      setDesc(cleanDesc);

      const initialCuerpo = (editingTask as any).copywriting?.cuerpo || (editingTask as any).copy || (editingTask as any).cuerpo || (editingTask as any).desc || "";
      const htmlCuerpo = convertLegacyMarkdownToHtml(initialCuerpo);
      setCopyGancho((editingTask as any).copywriting?.gancho || "");
      setCopyCuerpo(htmlCuerpo);
      setCopyCta((editingTask as any).copywriting?.cta || "");
      if (taskEditorRef.current) {
        taskEditorRef.current.innerHTML = htmlCuerpo;
      }
      setTimeout(updateTaskActiveStyles, 60);

      setSubtasks(editingTask.subtasks ? [...editingTask.subtasks] : []);
      setRecursosDrive((editingTask as any).attachmentUrl || (editingTask as any).recursosDrive || (editingTask as any).drive_link || "");
    } else {
      // Creation Mode
      setTitle("");
      setDesc("");
      setCopyCuerpo("");
      if (taskEditorRef.current) {
        taskEditorRef.current.innerHTML = "";
      }
      setTimeout(updateTaskActiveStyles, 60);
      setStatus("Planificado");
      setPriority("Media");
      setFormatoKey("story_ig");
      setFormatName("Story Imagen");
      setArea("Diseño");
      setTime("1 hora");

      const initProjId = defaultProjectId || (curProjects[0]?.id ? String(curProjects[0].id) : "");
      setProjectId(initProjId);

      const foundProj = curProjects.find(p => String(p.id) === String(initProjId));
      setClient(foundProj?.client || (foundProj as any)?.cliente || "Brandex");

      setAsignadoId("");

      const today = new Date();
      const d7 = new Date();
      d7.setDate(today.getDate() + 7);
      setStartDateRaw(formatDateToInput(today));
      setDeadlineRaw(formatDateToInput(d7));
      setFechaPublicacionRaw("");

      setCopyGancho("");
      setCopyCta("");

      setSelectedWorkerIds([]);
      setSubtasks([]);
      setRecursosDrive("");
    }

    setIsExpanded(false);
    setIsMoreMenuOpen(false);
    setShowDriveInput(false);
    setIsAddingSubtask(false);
    setNewSubtaskText("");

    // Only focus title once when modal is first opened
    setTimeout(() => {
      if (
        document.activeElement?.tagName !== "TEXTAREA" &&
        !taskEditorRef.current?.contains(document.activeElement) &&
        document.activeElement !== taskEditorRef.current
      ) {
        titleInputRef.current?.focus();
      }
    }, 100);
  }, [isOpen, editingTask?.id, defaultProjectId]);

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
      asignado_id: asignadoId || undefined,
      asignado_ids: selectedWorkerIds,
      asignado: matchedWorker?.nombre || matchedWorker?.name,
      copywriting: {
        gancho: copyGancho.trim() || undefined,
        cuerpo: copyCuerpo.trim() || undefined,
        cta: copyCta.trim() || undefined,
      },
      copy: copyCuerpo.trim() || undefined,
      fechaPublicacion: fechaPublicacionRaw || undefined,
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

  const completedSubtasksCount = subtasks.filter((s) => s.done).length;
  const subtasksProgress = subtasks.length > 0 ? Math.round((completedSubtasksCount / subtasks.length) * 100) : 0;

  const lastOriginRectRef = useRef(originRect);
  if (originRect) {
    lastOriginRectRef.current = originRect;
  }
  const effectiveOriginRect = originRect || lastOriginRectRef.current;

  const targetWidth = isExpanded
    ? (typeof window !== 'undefined' ? Math.min(1280, window.innerWidth * 0.97) : 1280)
    : (typeof window !== 'undefined' ? Math.min(1160, window.innerWidth * 0.96) : 1160);
  const initialScale = effectiveOriginRect ? Math.max(effectiveOriginRect.width / targetWidth, 0.28) : 0.65;
  const initialX = effectiveOriginRect && typeof window !== 'undefined'
    ? effectiveOriginRect.x + effectiveOriginRect.width / 2 - window.innerWidth / 2
    : 0;
  const initialY = effectiveOriginRect && typeof window !== 'undefined'
    ? effectiveOriginRect.y + effectiveOriginRect.height / 2 - window.innerHeight / 2
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
      borderRadius: "24px",
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
      scale: initialScale,
      x: initialX,
      y: initialY,
      filter: "blur(12px)",
      borderRadius: "16px",
      transition: {
        duration: 0.32,
        ease: [0.305, 0.206, 0.3, 1] as const,
        opacity: { duration: 0.22, ease: [0.56, 0.27, 0, 1] as const },
        filter: { duration: 0.24, ease: [0.37, 0.35, 0, 1] as const },
        borderRadius: { duration: 0.28, ease: [0.56, 0.27, 0, 1] as const }
      }
    }
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="new-task-modal-backdrop-wrap"
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 select-none pointer-events-auto"
          >
            {/* Backdrop (Dark overlay with full click interception) */}
            <motion.div
              key="new-task-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.56, 0.27, 0, 1] as const }}
              onClick={() => {
                playSound("click");
                onClose();
              }}
              className="fixed inset-0 bg-black/75 z-40 transition-opacity pointer-events-auto cursor-pointer"
            />

            {/* Modal Container */}
            <motion.div
              key="new-task-dialog"
              variants={modalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              className={`relative z-50 pointer-events-auto flex flex-col rounded-[1.5rem] ${
                isNightMode ? "bg-[#121212] text-white" : "bg-[#f4f4f5] text-black"
              } border border-white/[0.08] shadow-2xl overflow-hidden transition-all duration-300 ${
                isExpanded ? "w-[min(80rem,97vw)] max-w-[97vw] h-[min(60rem,92vh)]" : "w-[min(72.5rem,96vw)] max-w-[96vw] h-[min(51.25rem,86vh)] max-h-[86vh]"
              }`}
            >
              <div className="flex flex-col h-full overflow-hidden">
                
                {/* ── 3 COLUMNS WORKSPACE (HORIZONTAL GRID) ── */}
                <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-white/[0.08]">
                  
                  {/* ────────────────────────────────────────────────────────── */}
                  {/* ── 1. COLUMNA IZQUIERDA: ENCABEZADO, PORTADA & PROPIEDADES ── */}
                  {/* ────────────────────────────────────────────────────────── */}
                  <div className="w-full md:w-[23.125rem] lg:w-[24.375rem] shrink-0 flex flex-col overflow-y-auto custom-scrollbar p-5 space-y-4">
                    
                    {/* Top Meta Line: Client Pill + Breadcrumbs + Window Controls */}
                    <div className="flex items-center justify-between text-xs select-none pb-1">
                      {/* Left: Client Pill + Project / Creation Date */}
                      <div className="flex items-center gap-1.5 flex-wrap">
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
                                : "bg-white/10 hover:bg-white/20 text-white"
                            }`}
                          >
                            <User className={`w-3.5 h-3.5 shrink-0 ${activePopover === "header_client" ? "text-black" : "text-white"}`} />
                            <span className="truncate max-w-[100px]">{client || "Sin cliente"}</span>
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

                        <span className="text-white/40 font-medium">›</span>

                        {/* Project Name or Creation Date */}
                        <span className="text-white/90 text-[11px] font-medium truncate max-w-[110px]">
                          {currentProject?.title || (currentProject as any)?.nombre || "Independiente"}
                        </span>

                        <span className="text-white/40 text-[11px]">
                          • {editingTask ? "Editando" : "Nueva"}
                        </span>
                      </div>

                      {/* Right: Window Controls */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            playSound("click");
                            setIsExpanded(!isExpanded);
                          }}
                          className="p-1 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                          title={isExpanded ? "Restaurar tamaño" : "Expandir ventana"}
                        >
                          {isExpanded ? <Minimize2 className="w-3.5 h-3.5 text-white" /> : <Maximize2 className="w-3.5 h-3.5 text-white" />}
                        </button>
                        <button
                          type="button"
                          onClick={onClose}
                          className="p-1 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
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
                              isMoreMenuOpen ? "bg-white/20 text-white" : "text-white/70 hover:text-white hover:bg-white/10"
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

                    {/* Portada / Rectángulo Redondeado de Color del Proyecto */}
                    <div
                      style={{ backgroundColor: projectColor }}
                      className="w-full p-4 rounded-2xl flex flex-col gap-2.5 transition-colors duration-300 relative shadow-sm border border-white/10"
                    >
                      {/* Task Title Input */}
                      <SmoothInput
                        ref={titleInputRef}
                        type="text"
                        unstyled
                        placeholder="Título de la tarea..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        wrapperClassName="w-full"
                        caretClassName="bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]"
                        className="text-[17px] font-bold text-white placeholder-white/70"
                      />

                      {/* Task Description / Brief Textarea */}
                      <SmoothTextarea
                        rows={2}
                        unstyled
                        placeholder="Escribe el core brief, notas o contexto de la tarea aquí..."
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        wrapperClassName="w-full min-h-[46px]"
                        caretClassName="bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                        className="text-[12px] text-white/90 placeholder-white/70 leading-relaxed"
                      />
                    </div>

                    {/* ── PROPIEDADES AGRUPADAS SEGÚN FLUJO NATURAL DE TAREA ── */}
                    <div className="space-y-3.5 pt-1 select-none">
                      
                      {/* 1. ¿QUÉ ES ESTO? → FORMATO & PROYECTO */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-1">
                          1. Formato & Definición
                        </span>

                        <div className="bg-[#181818] border border-white/10 rounded-2xl p-1.5 flex flex-col gap-0.5 shadow-sm">
                          {/* Fila: Formato */}
                          <div className="flex items-center justify-between gap-2 p-1.5 px-2 rounded-xl hover:bg-white/[0.03] transition-colors">
                            <span className="text-[12px] font-medium text-white/60 flex items-center gap-2 shrink-0">
                              <FormatoShape formatoObj={getFormato(formatoKey)} size="sm" />
                              <span>Formato</span>
                            </span>
                            <div className="relative">
                              <button
                                type="button"
                                role="combobox"
                                onClick={() => {
                                  playSound("click");
                                  setActivePopover(activePopover === "format" ? null : "format");
                                }}
                                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer border ${
                                  activePopover === "format"
                                    ? "bg-[#2c2c34] border-white/30 text-white"
                                    : "bg-white/5 hover:bg-white/10 border-white/10 text-white"
                                }`}
                              >
                                <span>{formatName || "Formato"}</span>
                                <ChevronDown className="w-3 h-3 text-white/40" />
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
                          </div>

                          {/* Fila: Proyecto */}
                          <div className="flex items-center justify-between gap-2 p-1.5 px-2 rounded-xl hover:bg-white/[0.03] transition-colors">
                            <span className="text-[12px] font-medium text-white/60 flex items-center gap-2 shrink-0">
                              <Folder className="w-3.5 h-3.5 text-white/50 shrink-0" />
                              <span>Proyecto</span>
                            </span>
                            <div className="relative">
                              <button
                                type="button"
                                role="combobox"
                                onClick={() => {
                                  playSound("click");
                                  setActivePopover(activePopover === "project" ? null : "project");
                                }}
                                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer border max-w-[170px] ${
                                  activePopover === "project"
                                    ? "bg-[#2c2c34] border-white/30 text-white"
                                    : "bg-white/5 hover:bg-white/10 border-white/10 text-white"
                                }`}
                              >
                                <span className="truncate">{currentProject?.title || (currentProject as any)?.nombre || "Sin proyecto"}</span>
                                <ChevronDown className="w-3 h-3 text-white/40 shrink-0" />
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
                          </div>

                          {/* Fila: Área */}
                          <div className="flex items-center justify-between gap-2 p-1.5 px-2 rounded-xl hover:bg-white/[0.03] transition-colors">
                            <span className="text-[12px] font-medium text-white/60 flex items-center gap-2 shrink-0">
                              <Tag className="w-3.5 h-3.5 text-white/50 shrink-0" />
                              <span>Área</span>
                            </span>
                            <div className="relative">
                              <button
                                type="button"
                                role="combobox"
                                onClick={() => {
                                  playSound("click");
                                  setActivePopover(activePopover === "area" ? null : "area");
                                }}
                                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer border ${
                                  activePopover === "area"
                                    ? "bg-[#2c2c34] border-white/30 text-white"
                                    : "bg-white/5 hover:bg-white/10 border-white/10 text-white"
                                }`}
                              >
                                <span>{area || "Área"}</span>
                                <ChevronDown className="w-3 h-3 text-white/40" />
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

                          {/* Fila: Tiempo / Duración Estimada */}
                          <div className="flex items-center justify-between gap-2 p-1.5 px-2 rounded-xl hover:bg-white/[0.03] transition-colors">
                            <span className="text-[12px] font-medium text-white/60 flex items-center gap-2 shrink-0">
                              <Clock className="w-3.5 h-3.5 text-white/50 shrink-0" />
                              <span>Tiempo Estimado</span>
                            </span>
                            <div className="relative">
                              <button
                                type="button"
                                role="combobox"
                                onClick={() => {
                                  playSound("click");
                                  setActivePopover(activePopover === "time" ? null : "time");
                                }}
                                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer border ${
                                  activePopover === "time"
                                    ? "bg-[#2c2c34] border-white/30 text-white"
                                    : "bg-white/5 hover:bg-white/10 border-white/10 text-white"
                                }`}
                              >
                                <span>{time || "1 hora"}</span>
                                <ChevronDown className="w-3 h-3 text-white/40" />
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
                          </div>
                        </div>
                      </div>

                      {/* 2. ¿PARA CUÁNDO? → CRONOGRAMA & FECHAS */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-1">
                          2. Cronograma & Plazos
                        </span>

                        <div className="bg-[#181818] border border-white/10 rounded-2xl p-1.5 flex flex-col gap-0.5 shadow-sm">
                          {/* Fila: Plazos (Fecha Programada / Límite) */}
                          <div className="flex items-center justify-between gap-2 p-1.5 px-2 rounded-xl hover:bg-white/[0.03] transition-colors">
                            <span className="text-[12px] font-medium text-white/60 flex items-center gap-2 shrink-0">
                              <Calendar className="w-3.5 h-3.5 text-white/50 shrink-0" />
                              <span>Plazos</span>
                            </span>
                            <div className="relative">
                              <button
                                type="button"
                                role="combobox"
                                onClick={() => {
                                  playSound("click");
                                  setActivePopover(activePopover === "date" ? null : "date");
                                }}
                                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer border ${
                                  activePopover === "date"
                                    ? "bg-[#2c2c34] border-white/30 text-white"
                                    : "bg-white/5 hover:bg-white/10 border-white/10 text-white"
                                }`}
                              >
                                <span>
                                  {startDateRaw && deadlineRaw
                                    ? `${formatDateToFriendly(parseAnyDate(startDateRaw) || new Date())} → ${formatDateToFriendly(parseAnyDate(deadlineRaw) || new Date())}`
                                    : deadlineRaw
                                    ? formatDateToFriendly(parseAnyDate(deadlineRaw) || new Date())
                                    : startDateRaw
                                    ? formatDateToFriendly(parseAnyDate(startDateRaw) || new Date())
                                    : "Fechas"}
                                </span>
                                <ChevronDown className="w-3 h-3 text-white/40" />
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

                          {/* Fila: Fecha de Publicación */}
                          <div className="flex items-center justify-between gap-2 p-1.5 px-2 rounded-xl hover:bg-white/[0.03] transition-colors">
                            <span className="text-[12px] font-medium text-white/60 flex items-center gap-2 shrink-0">
                              <Send className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span>Publicación</span>
                            </span>
                            <div className="relative">
                              <button
                                type="button"
                                role="combobox"
                                onClick={() => {
                                  playSound("click");
                                  setActivePopover(activePopover === "pub_date" ? null : "pub_date");
                                }}
                                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer border ${
                                  activePopover === "pub_date"
                                    ? "bg-blue-500/20 border-blue-500/50 text-blue-200"
                                    : "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20 text-blue-300"
                                }`}
                              >
                                <span>
                                  {fechaPublicacionRaw
                                    ? formatDateToFriendly(parseAnyDate(fechaPublicacionRaw) || new Date())
                                    : "Sin programar"}
                                </span>
                                <ChevronDown className="w-3 h-3 text-blue-400/60" />
                              </button>
                              <LinearDatePopover
                                isOpen={activePopover === "pub_date"}
                                onClose={() => setActivePopover(null)}
                                startDate={fechaPublicacionRaw}
                                deadline={fechaPublicacionRaw}
                                onSelectDates={(start) => {
                                  setFechaPublicacionRaw(start);
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 3. ¿QUIÉN LA HACE? → ASIGNADO & EQUIPO */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-1">
                          3. Equipo & Asignación
                        </span>

                        <div className="bg-[#181818] border border-white/10 rounded-2xl p-1.5 flex flex-col gap-0.5 shadow-sm">
                          {/* Fila: Responsable Primario */}
                          <div className="flex items-center justify-between gap-2 p-1.5 px-2 rounded-xl hover:bg-white/[0.03] transition-colors">
                            <span className="text-[12px] font-medium text-white/60 flex items-center gap-2 shrink-0">
                              <UserCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                              <span>Responsable</span>
                            </span>
                            <div className="relative">
                              <button
                                type="button"
                                role="combobox"
                                onClick={() => {
                                  playSound("click");
                                  setActivePopover(activePopover === "primary_assignee" ? null : "primary_assignee");
                                }}
                                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer border ${
                                  activePopover === "primary_assignee"
                                    ? "bg-purple-500/20 border-purple-500/50 text-purple-200"
                                    : "bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20 text-purple-300"
                                }`}
                              >
                                <span>
                                  {asignadoId
                                    ? liveMembers.find((m) => String(m.id) === String(asignadoId))?.nombre || "Asignado Primario"
                                    : "Sin asignar"}
                                </span>
                                <ChevronDown className="w-3 h-3 text-purple-400/60" />
                              </button>
                              <LinearDropdownPopover
                                isOpen={activePopover === "primary_assignee"}
                                onClose={() => setActivePopover(null)}
                                placeholder="Asignar responsable primario…"
                                shortcutKey="U"
                                selectedValue={asignadoId}
                                onSelect={(val) => setAsignadoId(val)}
                                options={[
                                  { id: "", label: "Sin asignar (Primario)", shortcut: "0" },
                                  ...liveMembers.map((m, i) => ({
                                    id: m.id,
                                    label: m.nombre,
                                    badge: m.rol,
                                    shortcut: String(i + 1)
                                  }))
                                ]}
                              />
                            </div>
                          </div>

                          {/* Fila: Colaboradores */}
                          <div className="flex items-center justify-between gap-2 p-1.5 px-2 rounded-xl hover:bg-white/[0.03] transition-colors">
                            <span className="text-[12px] font-medium text-white/60 flex items-center gap-2 shrink-0">
                              <Users className="w-3.5 h-3.5 text-white/50 shrink-0" />
                              <span>Colaboradores</span>
                            </span>
                            <div className="relative">
                              <button
                                type="button"
                                role="combobox"
                                onClick={() => {
                                  playSound("click");
                                  setActivePopover(activePopover === "assignee" ? null : "assignee");
                                }}
                                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer border ${
                                  activePopover === "assignee"
                                    ? "bg-[#2c2c34] border-white/30 text-white"
                                    : "bg-white/5 hover:bg-white/10 border-white/10 text-white"
                                }`}
                              >
                                <span>
                                  {selectedWorkerIds.length > 0
                                    ? `${selectedWorkerIds.length} miembros`
                                    : "Colaboradores"}
                                </span>
                                <ChevronDown className="w-3 h-3 text-white/40" />
                              </button>
                              <LinearDropdownPopover
                                isOpen={activePopover === "assignee"}
                                onClose={() => setActivePopover(null)}
                                placeholder="Cambiar colaboradores…"
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
                          </div>
                        </div>
                      </div>

                      {/* 4. ¿EN QUÉ VA? → ESTADO & PRIORIDAD */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-1">
                          4. Estado & Prioridad
                        </span>

                        <div className="bg-[#181818] border border-white/10 rounded-2xl p-1.5 flex flex-col gap-0.5 shadow-sm">
                          {/* Fila: Estado */}
                          <div className="flex items-center justify-between gap-2 p-1.5 px-2 rounded-xl hover:bg-white/[0.03] transition-colors">
                            <span className="text-[12px] font-medium text-white/60 flex items-center gap-2 shrink-0">
                              <ProjectStatusIcon status={status} className="w-3.5 h-3.5 shrink-0" />
                              <span>Estado</span>
                            </span>
                            <div className="relative">
                              <button
                                type="button"
                                role="combobox"
                                onClick={() => {
                                  playSound("click");
                                  setActivePopover(activePopover === "status" ? null : "status");
                                }}
                                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer border ${
                                  activePopover === "status"
                                    ? "bg-[#2c2c34] border-white/30 text-white"
                                    : "bg-white/5 hover:bg-white/10 border-white/10 text-white"
                                }`}
                              >
                                <span>{status || "Estado"}</span>
                                <ChevronDown className="w-3 h-3 text-white/40" />
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
                          </div>

                          {/* Fila: Prioridad */}
                          <div className="flex items-center justify-between gap-2 p-1.5 px-2 rounded-xl hover:bg-white/[0.03] transition-colors">
                            <span className="text-[12px] font-medium text-white/60 flex items-center gap-2 shrink-0">
                              <Flag className="w-3.5 h-3.5 text-white/50 shrink-0" />
                              <span>Prioridad</span>
                            </span>
                            <div className="relative">
                              <button
                                type="button"
                                role="combobox"
                                onClick={() => {
                                  playSound("click");
                                  setActivePopover(activePopover === "priority" ? null : "priority");
                                }}
                                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer border ${
                                  activePopover === "priority"
                                    ? "bg-[#2c2c34] border-white/30 text-white"
                                    : "bg-white/5 hover:bg-white/10 border-white/10 text-white"
                                }`}
                              >
                                <span>{priority && priority !== "No Priority" ? priority : "Prioridad"}</span>
                                <ChevronDown className="w-3 h-3 text-white/40" />
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
                          </div>
                        </div>
                      </div>

                    </div>

                  </div>

                  {/* ────────────────────────────────────────────────────────── */}
                  {/* ── 2. COLUMNA CENTRAL: DOCUMENTO DE ENTREGA & NOTAS ── */}
                  {/* ────────────────────────────────────────────────────────── */}
                  <div className="flex-1 min-w-[21.25rem] flex flex-col overflow-y-auto custom-scrollbar p-5 space-y-4">
                    
                    {/* BARRA DE FORMATO WYSIWYG (Sin botón de vincular) */}
                    <RichNoteToolbar
                      currentBlockType={taskBlockType}
                      onBlockTypeChange={handleTaskBlockTypeChange}
                      onFormatClick={handleTaskFormatClick}
                      activeFormats={taskActiveFormats}
                      isNightMode={true}
                    />

                    {/* LIENZO DE ESCRITURA WYSIWYG PURO */}
                    <div
                      ref={taskEditorRef}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={(e) => {
                        const newHtml = e.currentTarget.innerHTML;
                        setCopyCuerpo(newHtml);
                        updateTaskActiveStyles();
                      }}
                      onKeyDown={handleTaskEditorKeyDown}
                      onKeyUp={updateTaskActiveStyles}
                      onMouseUp={updateTaskActiveStyles}
                      onSelect={updateTaskActiveStyles}
                      className="w-full min-h-[180px] bg-transparent outline-none border-none ring-0 shadow-none focus:outline-none focus:ring-0 focus:border-none focus:shadow-none select-text text-[14px] leading-relaxed p-0 text-[#ffffffd6] [&_h1]:text-[22px] [&_h1]:font-bold [&_h1]:text-white [&_h1]:my-2 [&_h2]:text-[18px] [&_h2]:font-semibold [&_h2]:text-white/90 [&_h2]:my-1.5 [&_h3]:text-[16px] [&_h3]:font-medium [&_h3]:text-white/80 [&_p]:my-1 [&_p]:text-[14px] [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1 [&_blockquote]:border-l-2 [&_blockquote]:border-white/30 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:my-2 [&_blockquote]:text-white/70"
                      data-placeholder="Escribe los detalles, contenido, brief o notas de la entrega…"
                    />

                    <div className="h-px bg-white/5 my-1" />

                    {/* SUBTASKS / CHECKLIST SECTION */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#a1a1aa] flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
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
                        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mb-1">
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
                            <SmoothInput
                              type="text"
                              autoFocus
                              unstyled
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
                              wrapperClassName="flex-1 ml-1"
                              className="text-xs font-semibold text-[#f4f4f5] placeholder-[#686873]"
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

                    <div className="h-px bg-white/5 my-1" />

                    {/* 📝 NOTAS Y APUNTES VINCULADOS A ESTA TAREA */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-semibold text-white/70 flex items-center gap-1.5">
                          <span>Notas de esta tarea ({linkedNotes.length})</span>
                        </span>

                        <button
                          type="button"
                          onClick={async () => {
                            playSound("pop");
                            const newDoc = await createNoteMutation.mutateAsync({
                              title: `Nota: ${title || "Entregable"}`,
                              content: "",
                              subtasks: [],
                              taskId: editingTask?.id ? String(editingTask.id) : null,
                              taskTitle: title || "Entregable",
                              projectId: projectId ? String(projectId) : null,
                              projectTitle: currentProject?.title || null,
                            });
                            if (newDoc) {
                              setActiveTaskNoteDoc(newDoc as NoteDoc);
                            }
                          }}
                          className="text-[12px] font-bold px-3 py-1 rounded-xl bg-white text-black hover:bg-white/90 flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Nueva Nota</span>
                        </button>
                      </div>

                      {linkedNotes.length > 0 ? (
                        <div className="grid grid-cols-1 gap-1.5 pt-1">
                          {linkedNotes.map((ln) => (
                            <NoteSquircleCard
                              key={ln.id}
                              note={ln}
                              onSelect={(n) => setActiveTaskNoteDoc(n)}
                              onDelete={(id) => deleteNoteMutation.mutate(id)}
                              onToggleComplete={(id, isCompleted) => {
                                updateNoteMutation.mutate({ id, isCompleted });
                              }}
                              isNightMode={true}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-[12px] text-white/30 italic py-1">
                          No hay notas ancladas a esta tarea. Haz clic en "+ Nueva Nota" para agregar una.
                        </p>
                      )}
                    </div>

                  </div>

                  {/* MODAL DE NOTA VINCULADA EXPANDIDA */}
                  <NoteExpandedModal
                    isOpen={!!activeTaskNoteDoc}
                    onClose={() => setActiveTaskNoteDoc(null)}
                    note={activeTaskNoteDoc}
                    onUpdateNote={(id, updates) => {
                      updateNoteMutation.mutate({ id, ...updates });
                      if (activeTaskNoteDoc && activeTaskNoteDoc.id === id) {
                        setActiveTaskNoteDoc({ ...activeTaskNoteDoc, ...updates });
                      }
                    }}
                    onDeleteNote={(id) => {
                      deleteNoteMutation.mutate(id);
                      setActiveTaskNoteDoc(null);
                    }}
                    projects={projects}
                    isNightMode={true}
                  />

                  {/* ────────────────────────────────────────────────────────── */}
                  {/* ── 3. COLUMNA DERECHA: HISTORIAL DE SESIONES & TIEMPO ── */}
                  {/* ────────────────────────────────────────────────────────── */}
                  <div className="w-full md:w-[370px] lg:w-[390px] shrink-0 flex flex-col overflow-y-auto custom-scrollbar p-5 space-y-4">
                    {editingTask?.id ? (
                      <TaskCardSessions
                        taskId={String(editingTask.id)}
                        projectId={String(projectId || "1")}
                        clientId={client}
                        workerId={asignadoId}
                      />
                    ) : (
                      <div className="p-5 rounded-2xl bg-[#1d1d21] border border-white/5 flex flex-col items-center justify-center text-center space-y-3 py-14">
                        <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                          <Clock className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">Historial de Sesiones</h4>
                          <p className="text-[11px] text-white/40 max-w-[220px] mt-1.5 leading-relaxed">
                            Guarda la tarea para comenzar a registrar sesiones en tiempo real con el cronómetro de trabajo.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                {/* ── 4. FOOTER BAR INFERIOR ── */}
                <div className={`flex items-center justify-between px-5 py-3 border-t border-white/[0.08] ${isNightMode ? "bg-[#121212]" : "bg-[#f4f4f5]"} shrink-0 text-xs`}>
                  {/* Left: Paperclip Icon & Drive Link */}
                  <div className="flex items-center gap-2 text-[#71717a]">
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
                    
                    {showDriveInput ? (
                      <div className="flex items-center gap-2 p-1.5 px-3 rounded-xl bg-[#1d1d21] border border-white/10 text-xs">
                        <LinkIcon className="w-3.5 h-3.5 text-white/60 shrink-0" />
                        <SmoothInput
                          type="url"
                          unstyled
                          placeholder="Enlace de Drive, Figma o recurso..."
                          value={recursosDrive}
                          onChange={(e) => setRecursosDrive(e.target.value)}
                          wrapperClassName="w-[280px]"
                          className="text-xs text-white placeholder-white/40"
                        />
                        {recursosDrive && (
                          <a
                            href={recursosDrive}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-0.5 rounded text-cyan-400 hover:text-cyan-300"
                            title="Abrir enlace"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    ) : recursosDrive ? (
                      <span className="text-[11px] text-cyan-400 font-medium truncate max-w-[240px]">
                        {recursosDrive}
                      </span>
                    ) : null}
                  </div>

                  {/* Right: Submit Button Pill */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSubmit}
                      className="bg-white hover:bg-[#e4e4e7] text-[#09090b] text-xs font-bold px-6 py-2 rounded-full transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95"
                    >
                      {editingTask ? "Guardar Cambios" : "Crear Tarea"}
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

      {/* Sub-Modal for Creating Client */}
      <CreateClientModal
        isOpen={isCreateClientOpen}
        onClose={() => setIsCreateClientOpen(false)}
        onClientCreated={handleClientCreated}
      />
    </Portal>
  );
}
