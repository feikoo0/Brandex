"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playSound } from "../utils/audio";
import {
  X,
  Plus,
  Calendar,
  DollarSign,
  Clock,
  Flag,
  ChevronRight,
  Folder,
  User,
  Users,
  Tag,
  Check,
  Trash2,
  ChevronDown,
  Layers,
  Sparkles,
  Target
} from "lucide-react";

export interface Task {
  id: number;
  title: string;
  desc: string;
  format: string;
  time: string;
  status: 'Planificado' | 'En Proceso' | 'En Revisión' | 'Completado';
  statusColor: string;
  subtasks: { id: number; text: string; done: boolean }[];
  attachmentUrl?: string;
  fecha_creacion?: string;
  kanbanOrders?: Record<string, number>;
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
  daysRemaining: string;
  burnRate: string;
  tasks: Task[];
  gradient: string;
  glow: string;
}

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (project: ProjectData) => void;
  isNightMode: boolean;
  isNeumorphic: boolean;
  projects?: any[];
}

const PRESET_GRADIENTS = [
  { name: "Emerald Forest", gradient: "from-emerald-500 to-teal-700", glow: "bg-emerald-500", color: "#10b981" },
  { name: "Sky Cobalt", gradient: "from-sky-500 to-indigo-600", glow: "bg-sky-500", color: "#0284c7" },
  { name: "Sunset Gold", gradient: "from-amber-400 to-rose-600", glow: "bg-amber-500", color: "#f59e0b" },
  { name: "Violet Electric", gradient: "from-purple-600 to-pink-600", glow: "bg-purple-500", color: "#a855f7" },
  { name: "Charcoal Steel", gradient: "from-slate-600 to-slate-800", glow: "bg-slate-500", color: "#64748b" }
];

const STATUS_OPTIONS = [
  { label: "Backlog", color: "text-amber-500 border-amber-500/30 bg-amber-500/10" },
  { label: "Planificación", color: "text-blue-400 border-blue-400/30 bg-blue-400/10" },
  { label: "En Proceso", color: "text-purple-400 border-purple-400/30 bg-purple-400/10" },
  { label: "Activo", color: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10" },
  { label: "Completado", color: "text-zinc-400 border-zinc-400/30 bg-zinc-400/10" }
];

const PRIORITY_OPTIONS = [
  { label: "Sin prioridad", color: "text-zinc-400" },
  { label: "Baja", color: "text-sky-400" },
  { label: "Media", color: "text-amber-400" },
  { label: "Alta", color: "text-rose-400" },
  { label: "Urgente", color: "text-red-500 font-bold" }
];

const PACKAGE_OPTIONS = [
  "Estratégico",
  "Branding Complete",
  "Desarrollo Web",
  "UI/UX Design",
  "Marketing Digital",
  "Consultoría"
];

const formatDateToFriendly = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const month = months[date.getMonth()];
  return `${day} ${month}`;
};

const formatDateToInput = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const calculateDaysRemaining = (startStr: string, endStr: string): string => {
  if (!startStr || !endStr) return "-";
  const start = new Date(startStr + "T00:00:00");
  const end = new Date(endStr + "T00:00:00");
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (isNaN(diffDays)) return "-";
  if (diffDays < 0) return "Vencido";
  return `${diffDays} días`;
};

export default function NewProjectModal({
  isOpen,
  onClose,
  onCreateProject,
  isNightMode,
  isNeumorphic,
  projects
}: NewProjectModalProps) {
  // Main States
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [client, setClient] = useState("Brandex");
  const [packageStr, setPackageStr] = useState("Estratégico");
  const [desc, setDesc] = useState("");
  const [status, setStatus] = useState("Planificación");
  const [priority, setPriority] = useState("Media");
  const [cost, setCost] = useState("$2,500");
  const [startDateRaw, setStartDateRaw] = useState(() => formatDateToInput(new Date()));
  const [deadlineRaw, setDeadlineRaw] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 14);
    return formatDateToInput(tomorrow);
  });
  const [selectedGradientIdx, setSelectedGradientIdx] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showTasksSection, setShowTasksSection] = useState(false);

  // Dropdown States
  const [activeDropdown, setActiveDropdown] = useState<"client" | "status" | "priority" | "package" | "color" | null>(null);
  const [clientSearch, setClientSearch] = useState("");

  const modalRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const uniqueClients = React.useMemo(() => {
    const fromProps = projects ? projects.map((p: any) => p.client) : [];
    const defaults = ["Brandex", "Apple Inc.", "Nike", "Tesla", "Airbnb", "OpenAI", "Stripe", "OpenSea"];
    const combined = Array.from(new Set([...fromProps, ...defaults])).filter(Boolean);
    return combined;
  }, [projects]);

  // Reset inputs when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setSummary("");
      setClient("Brandex");
      setPackageStr("Estratégico");
      setDesc("");
      setStatus("Planificación");
      setPriority("Media");
      setCost("$2,500");

      const today = new Date();
      setStartDateRaw(formatDateToInput(today));

      const twoWeeks = new Date();
      twoWeeks.setDate(twoWeeks.getDate() + 14);
      setDeadlineRaw(formatDateToInput(twoWeeks));

      setTasks([]);
      setShowTasksSection(false);
      setSelectedGradientIdx(0);
      setActiveDropdown(null);
      setClientSearch("");
      playSound('pop');

      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleAddDraftTask = () => {
    playSound('pop');
    const newTaskNum = tasks.length + 1;
    const today = new Date();
    const fecha_creacion = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const newTask: Task = {
      id: Date.now(),
      title: `Hito / Tarea ${newTaskNum}`,
      desc: "Detalle del hito...",
      format: "Web",
      time: "4h",
      status: "Planificado",
      statusColor: "bg-white/5 border border-white/10 text-white/60",
      subtasks: [
        { id: 1, text: "Fase 1: Preparación", done: false },
        { id: 2, text: "Fase 2: Entrega", done: false }
      ],
      fecha_creacion
    };
    setTasks(prev => [...prev, newTask]);
  };

  const handleRemoveDraftTask = (id: number) => {
    playSound('trash');
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      playSound('click');
      alert("Por favor ingresa el nombre del proyecto.");
      return;
    }

    playSound('click');
    const selectedPreset = PRESET_GRADIENTS[selectedGradientIdx] || PRESET_GRADIENTS[0];
    const startFriendly = startDateRaw ? formatDateToFriendly(new Date(startDateRaw + "T00:00:00")) : "Hoy";
    const deadlineFriendly = deadlineRaw ? formatDateToFriendly(new Date(deadlineRaw + "T00:00:00")) : "Sin Fecha";
    const daysRem = startDateRaw && deadlineRaw ? calculateDaysRemaining(startDateRaw, deadlineRaw) : "-";

    onCreateProject({
      title: title.trim(),
      client,
      package: packageStr,
      desc: summary ? `${summary}\n\n${desc}`.trim() : desc,
      status,
      priority,
      cost,
      startDate: startFriendly,
      deadline: deadlineFriendly,
      daysRemaining: daysRem,
      burnRate: "0h / 0h",
      tasks,
      gradient: selectedPreset.gradient,
      glow: selectedPreset.glow
    });
  };

  if (!isOpen) return null;

  const activePreset = PRESET_GRADIENTS[selectedGradientIdx] || PRESET_GRADIENTS[0];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-hidden">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => { playSound('click'); onClose(); }}
          className="absolute inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        />

        {/* Linear-Style Fast Create Project Modal */}
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className={`relative w-full max-w-[720px] max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden pointer-events-auto ${
            isNightMode
              ? "bg-[#141519] border-white/10 text-zinc-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)]"
              : "bg-slate-900 border-slate-700 text-slate-100 shadow-2xl"
          }`}
        >
          <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[90vh]">
            
            {/* Header: Breadcrumb & Actions */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-white/5 select-none">
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                {/* Team / Client Picker Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveDropdown(activeDropdown === "client" ? null : "client")}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-emerald-400 font-semibold border border-emerald-500/20 transition-all text-xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{client}</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>

                  {activeDropdown === "client" && (
                    <div className="absolute top-full left-0 mt-1.5 w-56 rounded-xl bg-[#1d1f24] border border-white/10 shadow-xl py-1 z-50 overflow-hidden">
                      <div className="p-2 border-b border-white/5">
                        <input
                          type="text"
                          placeholder="Buscar o nuevo cliente..."
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          className="w-full bg-white/5 text-xs text-zinc-200 placeholder:text-zinc-500 px-2 py-1.5 rounded-md outline-none border border-white/10 focus:border-emerald-500/50"
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto py-1">
                        {uniqueClients
                          .filter(c => c.toLowerCase().includes(clientSearch.toLowerCase()))
                          .map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => {
                                setClient(c);
                                setActiveDropdown(null);
                              }}
                              className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-white/10 ${
                                client === c ? "text-emerald-400 font-semibold bg-emerald-500/10" : "text-zinc-300"
                              }`}
                            >
                              <span>{c}</span>
                              {client === c && <Check className="w-3 h-3 text-emerald-400" />}
                            </button>
                          ))}
                        {clientSearch && !uniqueClients.includes(clientSearch) && (
                          <button
                            type="button"
                            onClick={() => {
                              setClient(clientSearch);
                              setActiveDropdown(null);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-emerald-400 hover:bg-white/10 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Usar "{clientSearch}"
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <span className="text-zinc-600">›</span>
                <span className="text-zinc-200 font-medium">Nuevo proyecto</span>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => { playSound('click'); onClose(); }}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
              
              {/* Project Title Input */}
              <div className="flex flex-col w-full">
                  <input
                    ref={titleInputRef}
                    type="text"
                    placeholder="Nombre del proyecto"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-transparent text-xl sm:text-2xl font-semibold text-white placeholder:text-zinc-600 outline-none border-none p-0 focus:ring-0"
                  />
                  <input
                    type="text"
                    placeholder="Añade un resumen corto..."
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="w-full bg-transparent text-xs sm:text-sm text-zinc-300 placeholder:text-zinc-600 outline-none border-none p-0 mt-1 focus:ring-0"
                  />
                </div>

              {/* Linear-Style Property Badges / Controls Row */}
              <div className="flex flex-wrap items-center gap-2 py-3 border-y border-white/5 text-xs select-none">
                
                {/* 1. Estado (Status) Badge */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveDropdown(activeDropdown === "status" ? null : "status")}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300 transition-all"
                  >
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>{status}</span>
                  </button>

                  {activeDropdown === "status" && (
                    <div className="absolute top-full left-0 mt-1 w-44 rounded-xl bg-[#1d1f24] border border-white/10 shadow-xl py-1 z-50">
                      {STATUS_OPTIONS.map((st) => (
                        <button
                          key={st.label}
                          type="button"
                          onClick={() => {
                            setStatus(st.label);
                            setActiveDropdown(null);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-white/10 ${
                            status === st.label ? "text-white font-semibold bg-white/5" : "text-zinc-400"
                          }`}
                        >
                          <span className={st.color.split(' ')[0]}>{st.label}</span>
                          {status === st.label && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Prioridad (Priority) Badge */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveDropdown(activeDropdown === "priority" ? null : "priority")}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300 transition-all"
                  >
                    <Flag className="w-3.5 h-3.5 text-rose-400" />
                    <span>{priority}</span>
                  </button>

                  {activeDropdown === "priority" && (
                    <div className="absolute top-full left-0 mt-1 w-44 rounded-xl bg-[#1d1f24] border border-white/10 shadow-xl py-1 z-50">
                      {PRIORITY_OPTIONS.map((pr) => (
                        <button
                          key={pr.label}
                          type="button"
                          onClick={() => {
                            setPriority(pr.label);
                            setActiveDropdown(null);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-white/10 ${
                            priority === pr.label ? "text-white font-semibold bg-white/5" : "text-zinc-400"
                          }`}
                        >
                          <span className={pr.color}>{pr.label}</span>
                          {priority === pr.label && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Paquete / Servicio Badge */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveDropdown(activeDropdown === "package" ? null : "package")}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300 transition-all"
                  >
                    <Tag className="w-3.5 h-3.5 text-purple-400" />
                    <span>{packageStr}</span>
                  </button>

                  {activeDropdown === "package" && (
                    <div className="absolute top-full left-0 mt-1 w-48 rounded-xl bg-[#1d1f24] border border-white/10 shadow-xl py-1 z-50">
                      {PACKAGE_OPTIONS.map((pkg) => (
                        <button
                          key={pkg}
                          type="button"
                          onClick={() => {
                            setPackageStr(pkg);
                            setActiveDropdown(null);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-white/10 ${
                            packageStr === pkg ? "text-white font-semibold bg-white/5" : "text-zinc-400"
                          }`}
                        >
                          <span>{pkg}</span>
                          {packageStr === pkg && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Fecha Inicio Badge */}
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[11px] text-zinc-500 font-medium">Inicio:</span>
                  <input
                    type="date"
                    value={startDateRaw}
                    onChange={(e) => setStartDateRaw(e.target.value)}
                    className="bg-transparent text-xs text-zinc-200 outline-none p-0 border-none focus:ring-0 cursor-pointer"
                  />
                </div>

                {/* 5. Fecha Entrega / Deadline Badge */}
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] text-zinc-500 font-medium">Entrega:</span>
                  <input
                    type="date"
                    value={deadlineRaw}
                    onChange={(e) => setDeadlineRaw(e.target.value)}
                    className="bg-transparent text-xs text-zinc-200 outline-none p-0 border-none focus:ring-0 cursor-pointer"
                  />
                </div>

                {/* 6. Presupuesto Badge */}
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/5 text-zinc-300">
                  <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                  <input
                    type="text"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="Costo"
                    className="w-16 bg-transparent text-xs text-zinc-200 outline-none p-0 border-none focus:ring-0"
                  />
                </div>

              </div>

              {/* Rich Text Description Area */}
              <div className="pt-2">
                <textarea
                  rows={4}
                  placeholder="Escribe una descripción, el brief del proyecto o recopila ideas..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm text-zinc-300 placeholder:text-zinc-600 outline-none border-none resize-none p-0 focus:ring-0"
                />
              </div>

              {/* Milestones / Draft Tasks Optional Section */}
              <div className="pt-2 border-t border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={() => setShowTasksSection(!showTasksSection)}
                    className="text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Hitos / Tareas iniciales ({tasks.length})</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTasksSection ? "rotate-180" : ""}`} />
                  </button>

                  {showTasksSection && (
                    <button
                      type="button"
                      onClick={handleAddDraftTask}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20"
                    >
                      <Plus className="w-3 h-3" /> Agregar hito
                    </button>
                  )}
                </div>

                {showTasksSection && (
                  <div className="space-y-2 mt-2 max-h-48 overflow-y-auto pr-1">
                    {tasks.length === 0 ? (
                      <p className="text-xs text-zinc-600 italic">No hay hitos creados aún. Haz clic en "Agregar hito".</p>
                    ) : (
                      tasks.map((t) => (
                        <div key={t.id} className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-3 text-xs">
                          <input
                            type="text"
                            value={t.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTasks(prev => prev.map(item => item.id === t.id ? { ...item, title: val } : item));
                            }}
                            className="bg-transparent text-zinc-200 font-medium outline-none border-none p-0 focus:ring-0 flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveDraftTask(t.id)}
                            className="text-zinc-500 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 border-t border-white/5 bg-[#101114] flex items-center justify-between select-none">
              <span className="text-[11px] text-zinc-600 font-medium hidden sm:inline-block">
                Presiona <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-400 font-mono text-[10px]">Esc</kbd> para descartar
              </span>

              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={() => { playSound('click'); onClose(); }}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:scale-95 transition-all shadow-[0_4px_14px_rgba(16,185,129,0.3)]"
                >
                  Crear proyecto
                </button>
              </div>
            </div>

          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
