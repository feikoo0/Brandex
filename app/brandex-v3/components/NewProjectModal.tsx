"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playSound } from "../utils/audio";
import { X, Plus, Calendar, DollarSign, Clock, Flag, ClipboardList, Trash2, CheckCircle2 } from "lucide-react";

export interface Task {
  id: number;
  title: string;
  desc: string;
  format: string;
  time: string;
  status: 'Pendiente' | 'En Proceso' | 'Completado';
  statusColor: string;
  subtasks: { id: number; text: string; done: boolean }[];
  attachmentUrl?: string;
  kanbanOrders?: Record<string, number>;
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
}

const PRESET_GRADIENTS = [
  { name: "Sky Cobalt", gradient: "from-sky-500 to-indigo-600", glow: "bg-sky-500" },
  { name: "Emerald Forest", gradient: "from-emerald-500 to-teal-700", glow: "bg-emerald-500" },
  { name: "Sunset Gold", gradient: "from-amber-400 to-rose-600", glow: "bg-amber-500" },
  { name: "Violet Electric", gradient: "from-purple-600 to-pink-600", glow: "bg-purple-500" },
  { name: "Charcoal Steel", gradient: "from-slate-600 to-slate-800", glow: "bg-slate-500" }
];

export default function NewProjectModal({
  isOpen,
  onClose,
  onCreateProject,
  isNightMode,
  isNeumorphic
}: NewProjectModalProps) {
  // Project Info States
  const [title, setTitle] = useState("Nuevo Proyecto");
  const [client, setClient] = useState("Cliente");
  const [packageStr, setPackageStr] = useState("Estratégico");
  const [desc, setDesc] = useState("");
  const [status, setStatus] = useState("Activo");
  const [priority, setPriority] = useState("Media");
  const [cost, setCost] = useState("$2,500");
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const day = today.getDate().toString().padStart(2, '0');
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const month = months[today.getMonth()];
    return `${day} ${month}`;
  });
  const [deadline, setDeadline] = useState("Sin Fecha");
  const [daysRemaining, setDaysRemaining] = useState("-");
  const [burnRate, setBurnRate] = useState("0h / 0h");
  const [selectedGradientIdx, setSelectedGradientIdx] = useState(0);

  // Tasks List States
  const [tasks, setTasks] = useState<Task[]>([]);

  // Reset inputs when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle("Nuevo Proyecto");
      setClient("Cliente");
      setPackageStr("Estratégico");
      setDesc("");
      setStatus("Activo");
      setPriority("Media");
      setCost("$2,500");
      
      const today = new Date();
      const day = today.getDate().toString().padStart(2, '0');
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const month = months[today.getMonth()];
      setStartDate(`${day} ${month}`);
      
      setDeadline("Sin Fecha");
      setDaysRemaining("-");
      setBurnRate("0h / 0h");
      setTasks([]);
      setSelectedGradientIdx(0);
      playSound('pop');
    }
  }, [isOpen]);

  const handleAddDraftTask = () => {
    playSound('pop');
    const newTaskNum = tasks.length + 1;
    const newTask: Task = {
      id: Date.now(),
      title: `Tarea ${newTaskNum}`,
      desc: "Descripción de la tarea...",
      format: "Formato Web",
      time: "2h",
      status: "Pendiente",
      statusColor: "bg-white/5 border border-white/10 text-white/60",
      subtasks: [
        { id: 1, text: "Primer paso", done: false },
        { id: 2, text: "Verificación final", done: false }
      ]
    };
    setTasks(prev => [...prev, newTask]);
  };

  const handleRemoveDraftTask = (id: number) => {
    playSound('trash');
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleUpdateTaskField = (taskId: number, field: keyof Task, val: any) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      return { ...t, [field]: val };
    }));
  };

  const handleUpdateSubtaskText = (taskId: number, subtaskId: number, newText: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const updated = t.subtasks.map(s => {
        if (s.id !== subtaskId) return s;
        return { ...s, text: newText };
      });
      return { ...t, subtasks: updated };
    }));
  };

  const handleToggleSubtask = (taskId: number, subtaskId: number) => {
    playSound('click');
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const updated = t.subtasks.map(s => {
        if (s.id !== subtaskId) return s;
        return { ...s, done: !s.done };
      });
      return { ...t, subtasks: updated };
    }));
  };

  const handleAddSubtask = (taskId: number) => {
    playSound('pop');
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const newSubId = Math.max(...t.subtasks.map(s => s.id), 0) + 1;
      const newSub = { id: newSubId, text: `Nueva subtarea ${newSubId}`, done: false };
      return { ...t, subtasks: [...t.subtasks, newSub] };
    }));
  };

  const handleRemoveSubtask = (taskId: number, subtaskId: number) => {
    playSound('trash');
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      return { ...t, subtasks: t.subtasks.filter(s => s.id !== subtaskId) };
    }));
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      playSound('click');
      alert("Por favor ingresa un nombre para el proyecto.");
      return;
    }
    
    playSound('click');
    const selectedPreset = PRESET_GRADIENTS[selectedGradientIdx];
    onCreateProject({
      title,
      client,
      package: packageStr,
      desc,
      status,
      priority,
      cost,
      startDate,
      deadline,
      daysRemaining,
      burnRate,
      tasks,
      gradient: selectedPreset.gradient,
      glow: selectedPreset.glow
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden">
        {/* Backdrop overlay with blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => { playSound('click'); onClose(); }}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className={`relative w-full max-w-[1150px] max-h-[90vh] overflow-y-auto flex flex-col rounded-[24px] border pointer-events-auto shadow-2xl p-6 md:p-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${
            isNightMode
              ? "bg-[#16181d]/95 border-white/5 text-neutral-100 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
              : "bg-white/95 border-slate-200 text-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.15)]"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-dashed border-neutral-700/20">
            <div>
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] leading-none ${isNightMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                Creación del Espacio
              </span>
              <h2 className="text-2xl font-extralight tracking-tight mt-1 flex items-center gap-2">
                Nuevo Proyecto Integrado
              </h2>
            </div>
            <button
              onClick={() => { playSound('click'); onClose(); }}
              className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${
                isNightMode
                  ? "bg-white/5 border-white/10 hover:bg-white/10 text-white"
                  : "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-800"
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex flex-col gap-6 mt-6">
            {/* Row 1: Title Input (Huge font) */}
            <div className="flex flex-col gap-1.5">
              <label className={`text-[10px] font-bold uppercase tracking-wider ${isNightMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                Nombre del Proyecto
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nombre del proyecto..."
                className={`text-3xl font-extralight tracking-tight bg-transparent border-b border-dashed outline-none py-1 w-full focus:border-sky-500 transition-colors ${
                  isNightMode
                    ? "text-zinc-100 border-white/20"
                    : "text-slate-900 border-slate-350"
                }`}
              />
            </div>

            {/* Grid for parameters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Col 1 */}
              <div className="flex flex-col gap-4">
                {/* Cliente */}
                <div className="flex flex-col gap-1.5">
                  <label className={`text-[10px] font-bold uppercase tracking-wider ${isNightMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                    Cliente
                  </label>
                  <input
                    type="text"
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    className={`px-3.5 py-2 rounded-xl text-sm font-semibold border bg-transparent outline-none focus:ring-1 focus:ring-sky-500/50 transition-all ${
                      isNightMode
                        ? "border-white/10 text-white"
                        : "border-slate-250 text-slate-800"
                    }`}
                  />
                </div>

                {/* Paquete */}
                <div className="flex flex-col gap-1.5">
                  <label className={`text-[10px] font-bold uppercase tracking-wider ${isNightMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                    Paquete / Alcance
                  </label>
                  <select
                    value={packageStr}
                    onChange={(e) => setPackageStr(e.target.value)}
                    className={`px-3.5 py-2 rounded-xl text-sm font-semibold border bg-transparent outline-none focus:ring-1 focus:ring-sky-500/50 transition-all ${
                      isNightMode
                        ? "border-white/10 text-white bg-[#1a1c23]"
                        : "border-slate-250 text-slate-800 bg-white"
                    }`}
                  >
                    <option value="Estratégico">Estratégico</option>
                    <option value="Creativo">Creativo</option>
                    <option value="Digital">Digital</option>
                    <option value="Branding">Branding</option>
                    <option value="Campaña">Campaña Completa</option>
                  </select>
                </div>
              </div>

              {/* Col 2 */}
              <div className="flex flex-col gap-4">
                {/* Costo */}
                <div className="flex flex-col gap-1.5">
                  <label className={`text-[10px] font-bold uppercase tracking-wider ${isNightMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                    Presupuesto
                  </label>
                  <div className="relative flex items-center">
                    <span className={`absolute left-3 text-sm font-bold ${isNightMode ? 'text-zinc-500' : 'text-slate-450'}`}>$</span>
                    <input
                      type="text"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      className={`pl-8 pr-3.5 py-2 rounded-xl text-sm font-semibold border bg-transparent outline-none w-full focus:ring-1 focus:ring-sky-500/50 transition-all ${
                        isNightMode
                          ? "border-white/10 text-white"
                          : "border-slate-250 text-slate-800"
                      }`}
                    />
                  </div>
                </div>

                {/* Prioridad */}
                <div className="flex flex-col gap-1.5">
                  <label className={`text-[10px] font-bold uppercase tracking-wider ${isNightMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                    Prioridad
                  </label>
                  <div className="flex items-center gap-2">
                    {["Baja", "Media", "Alta", "Urgente"].map((prio) => {
                      const isActive = priority === prio;
                      const colors = {
                        Baja: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
                        Media: "bg-amber-500/10 text-amber-500 border-amber-500/30",
                        Alta: "bg-orange-500/10 text-orange-500 border-orange-500/30",
                        Urgente: "bg-rose-500/10 text-rose-500 border-rose-500/30"
                      }[prio as "Baja" | "Media" | "Alta" | "Urgente"];

                      return (
                        <button
                          key={prio}
                          onClick={() => { playSound('click'); setPriority(prio); }}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            isActive
                              ? `${colors} scale-105 shadow-sm`
                              : isNightMode
                                ? "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10"
                                : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                          }`}
                        >
                          {prio}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Col 3 */}
              <div className="flex flex-col gap-4">
                {/* Fechas */}
                <div className="flex flex-col gap-1.5">
                  <label className={`text-[10px] font-bold uppercase tracking-wider ${isNightMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                    Línea Temporal (Creado • Límite)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      placeholder="Inicio (ex. 24 Jun)"
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border bg-transparent outline-none focus:ring-1 focus:ring-sky-500/50 transition-all ${
                        isNightMode
                          ? "border-white/10 text-white"
                          : "border-slate-250 text-slate-800"
                      }`}
                    />
                    <input
                      type="text"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      placeholder="Límite (ex. 15 Jul)"
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border bg-transparent outline-none focus:ring-1 focus:ring-sky-500/50 transition-all ${
                        isNightMode
                          ? "border-white/10 text-white"
                          : "border-slate-250 text-slate-800"
                      }`}
                    />
                  </div>
                </div>

                {/* Días restantes & BurnRate */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1.5">
                    <label className={`text-[9px] font-bold uppercase tracking-wider ${isNightMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                      Días Restantes
                    </label>
                    <input
                      type="text"
                      value={daysRemaining}
                      onChange={(e) => setDaysRemaining(e.target.value)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border bg-transparent outline-none focus:ring-1 focus:ring-sky-500/50 transition-all ${
                        isNightMode
                          ? "border-white/10 text-white"
                          : "border-slate-250 text-slate-800"
                      }`}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={`text-[9px] font-bold uppercase tracking-wider ${isNightMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                      Horas Presupuesto
                    </label>
                    <input
                      type="text"
                      value={burnRate}
                      onChange={(e) => setBurnRate(e.target.value)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border bg-transparent outline-none focus:ring-1 focus:ring-sky-500/50 transition-all ${
                        isNightMode
                          ? "border-white/10 text-white"
                          : "border-slate-250 text-slate-800"
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: Description / Brief */}
            <div className="flex flex-col gap-1.5">
              <label className={`text-[10px] font-bold uppercase tracking-wider ${isNightMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                Descripción / Core Brief del Proyecto
              </label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Escribe los detalles principales del proyecto, objetivos y entregables clave..."
                rows={3}
                className={`px-4 py-3 rounded-2xl text-sm leading-relaxed border bg-transparent outline-none focus:ring-1 focus:ring-sky-500/50 transition-all resize-none ${
                  isNightMode
                    ? "border-white/10 text-white"
                    : "border-slate-250 text-slate-800"
                }`}
              />
            </div>

            {/* Gradient Preset Selector */}
            <div className="flex flex-col gap-2">
              <label className={`text-[10px] font-bold uppercase tracking-wider ${isNightMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                Estilo Visual (Gradiente)
              </label>
              <div className="flex items-center gap-3.5 flex-wrap">
                {PRESET_GRADIENTS.map((preset, idx) => {
                  const isSel = idx === selectedGradientIdx;
                  return (
                    <button
                      key={preset.name}
                      onClick={() => { playSound('click'); setSelectedGradientIdx(idx); }}
                      className={`h-9 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r ${preset.gradient} relative transition-all duration-300 ${
                        isSel
                          ? "ring-2 ring-offset-2 ring-sky-500 scale-105 shadow-md"
                          : "opacity-60 hover:opacity-100"
                      }`}
                      style={{ outlineOffset: 2 }}
                    >
                      {preset.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divisor */}
            <div className={`w-full h-px my-2 ${isNightMode ? 'bg-neutral-800' : 'bg-slate-200'}`} />

            {/* Tasks Section */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] leading-none ${isNightMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                    Control de Operaciones
                  </span>
                  <h3 className="text-lg font-bold tracking-tight mt-1 flex items-center gap-2">
                    Tarjetas de Tareas ({tasks.length})
                  </h3>
                </div>
                <button
                  onClick={handleAddDraftTask}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-sky-500 hover:bg-sky-600 active:scale-95 text-white shadow-md shadow-sky-500/20 transition-all"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Añadir Tarea</span>
                </button>
              </div>

              {/* Tasks Horizontal Scroll */}
              <div className="flex items-start gap-5 pt-2 pb-6 overflow-x-auto w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {tasks.map((task) => {
                  return (
                    <div
                      key={task.id}
                      className={`relative w-[340px] h-[340px] shrink-0 rounded-2xl p-4 flex flex-col border transition-all shadow-sm ${
                        isNightMode
                          ? "bg-neutral-900/60 border-neutral-800 text-neutral-50"
                          : "bg-slate-50 border-slate-200 text-slate-900"
                      }`}
                    >
                      {/* Delete Task Button */}
                      <button
                        onClick={() => handleRemoveDraftTask(task.id)}
                        className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-all hover:scale-105 z-50 ${
                          isNightMode
                            ? "bg-neutral-805 border border-white/10 text-rose-450 hover:bg-neutral-700"
                            : "bg-white border border-slate-200 text-rose-500 hover:bg-slate-100"
                        }`}
                        title="Eliminar tarea"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      {/* Card Content Header (Format / Title / Description) */}
                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-center gap-2 justify-between">
                          <input
                            type="text"
                            value={task.format}
                            onChange={(e) => handleUpdateTaskField(task.id, "format", e.target.value)}
                            placeholder="Formato..."
                            className={`px-2 py-0.5 rounded border text-[8px] font-extrabold uppercase tracking-widest leading-none outline-none focus:border-sky-500 w-[120px] ${
                              isNightMode
                                ? "border-neutral-800 bg-neutral-950 text-neutral-300"
                                : "border-slate-200 bg-slate-100 text-slate-700"
                            }`}
                          />
                          <input
                            type="text"
                            value={task.time}
                            onChange={(e) => handleUpdateTaskField(task.id, "time", e.target.value)}
                            placeholder="Horas (e.g. 2h)"
                            className={`text-[9px] font-black text-right bg-transparent border-b border-transparent outline-none focus:border-sky-500/40 w-[60px] ${
                              isNightMode ? "text-neutral-400" : "text-slate-500"
                            }`}
                          />
                        </div>

                        {/* Title input */}
                        <input
                          type="text"
                          value={task.title}
                          onChange={(e) => handleUpdateTaskField(task.id, "title", e.target.value)}
                          placeholder="Título de la tarea..."
                          className={`font-bold text-[14px] tracking-wide bg-transparent border-b border-transparent outline-none focus:border-sky-500/40 py-0.5 w-full ${
                            isNightMode ? "text-neutral-50" : "text-slate-900"
                          }`}
                        />

                        {/* Description input */}
                        <textarea
                          value={task.desc}
                          onChange={(e) => handleUpdateTaskField(task.id, "desc", e.target.value)}
                          placeholder="Descripción breve..."
                          rows={2}
                          className={`text-[11.5px] leading-relaxed bg-transparent border border-transparent outline-none focus:border-sky-500/20 py-0.5 rounded resize-none w-full ${
                            isNightMode ? "text-neutral-400" : "text-slate-600"
                          }`}
                        />
                      </div>

                      {/* Subtasks checklist area */}
                      <div className="flex-1 mt-3 flex flex-col min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] border-t border-dashed border-neutral-700/25 pt-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-[9px] font-extrabold tracking-widest uppercase ${isNightMode ? 'text-neutral-500' : 'text-slate-400'}`}>
                            Subtareas de control
                          </span>
                          <button
                            onClick={() => handleAddSubtask(task.id)}
                            className={`w-4 h-4 rounded-full flex items-center justify-center border transition-colors ${
                              isNightMode
                                ? "bg-white/5 border-white/15 text-neutral-400 hover:text-white"
                                : "bg-slate-100 border-slate-250 text-slate-650 hover:text-slate-900"
                            }`}
                            title="Añadir subtarea"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        <div className="flex flex-col gap-2">
                          {task.subtasks.map((sub) => (
                            <div
                              key={sub.id}
                              className="flex items-center gap-2 group/sub relative pr-6"
                            >
                              <button
                                onClick={() => handleToggleSubtask(task.id, sub.id)}
                                className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
                                  sub.done
                                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-500'
                                    : isNightMode
                                      ? 'border-neutral-700 hover:border-neutral-500'
                                      : 'border-slate-350 hover:border-slate-500'
                                }`}
                              >
                                {sub.done && (
                                  <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z"/>
                                  </svg>
                                )}
                              </button>

                              <input
                                type="text"
                                value={sub.text}
                                onChange={(e) => handleUpdateSubtaskText(task.id, sub.id, e.target.value)}
                                className={`text-[11px] bg-transparent border-b border-transparent outline-none focus:border-sky-500/30 flex-1 py-0.5 truncate ${
                                  sub.done
                                    ? isNightMode ? 'text-neutral-500 line-through' : 'text-slate-400 line-through'
                                    : isNightMode ? 'text-neutral-200 font-medium' : 'text-slate-800 font-medium'
                                }`}
                              />

                              <button
                                onClick={() => handleRemoveSubtask(task.id, sub.id)}
                                className="absolute right-0 opacity-0 group-hover/sub:opacity-100 text-rose-500 hover:scale-105 transition-all"
                                title="Eliminar subtarea"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Empty State placeholder cards */}
                {tasks.length === 0 && (
                  <div
                    onClick={handleAddDraftTask}
                    className={`w-[340px] h-[340px] shrink-0 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] ${
                      isNightMode
                        ? "border-neutral-800 bg-neutral-900/20 text-neutral-400 hover:text-neutral-200"
                        : "border-slate-300 bg-slate-50/50 text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <Plus className="w-8 h-8 opacity-60" strokeWidth={1.5} />
                    <span className="text-xs font-bold uppercase tracking-widest">
                      Añadir primera tarea
                    </span>
                    <span className="text-[10px] opacity-60 max-w-[200px] text-center leading-normal">
                      Crea tarjetas de tareas editables directamente en el proyecto
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-neutral-700/25">
            <button
              onClick={() => { playSound('click'); onClose(); }}
              className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all ${
                isNightMode
                  ? "bg-white/5 hover:bg-white/10 text-neutral-350"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-650"
              }`}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="px-6 py-2.5 rounded-full text-xs font-bold bg-white text-slate-950 hover:bg-slate-100 active:scale-95 shadow-md shadow-white/10 transition-all border border-transparent"
              style={{
                background: !isNightMode ? "#0f172a" : "white",
                color: !isNightMode ? "white" : "#0f172a"
              }}
            >
              Crear Proyecto →
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
