"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  Layers,
  Sparkles,
  Trash2,
  Maximize2,
  Check,
  Tag
} from "lucide-react";
import { playSound } from "../utils/audio";
import FormatoShape from "./FormatoShape";
import { FORMATOS_ESTANDAR, getFormato } from "../utils/formatos";
import LinearDropdownPopover from "./LinearDropdownPopover";
import { PROJECT_COLOR_PALETTE } from "@/lib/utils";
import { ProjectTemplateItem } from "./CreateTemplateModal";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface TemplateTaskItem {
  id: number;
  title: string;
  format: string;
  formato?: string | null;
  time: string;
}

interface CreateTemplateFormProps {
  onClose: () => void;
  onTemplateCreated: (template: ProjectTemplateItem) => void;
  packageList?: string[];
  onAddNewCategory?: () => void;
}

const PRESET_GRADIENTS = PROJECT_COLOR_PALETTE.map((item) => ({
  name: item.name,
  gradient: item.gradient,
  glow: item.glow,
  color: item.hslStr,
  solidColor: item.solidColor
}));

export default function CreateTemplateForm({
  onClose,
  onTemplateCreated,
  packageList = [
    "Desarrollo Web",
    "UI/UX Design",
    "Branding Complete",
    "Estratégico",
    "Marketing Digital"
  ],
  onAddNewCategory
}: CreateTemplateFormProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Desarrollo Web");
  const [desc, setDesc] = useState("");
  const [selectedGradientIdx, setSelectedGradientIdx] = useState(0);

  // Template Tasks State
  const [tasks, setTasks] = useState<TemplateTaskItem[]>([
    {
      id: 1,
      title: "Investigación inicial y levantamiento de requerimientos",
      format: "Sin formato",
      formato: null,
      time: "1 hora"
    },
    {
      id: 2,
      title: "Diseño de estructura y prototipos clave",
      format: "Sin formato",
      formato: null,
      time: "2 horas"
    }
  ]);

  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskTime, setTaskTime] = useState("1 hora");
  const [taskFormatoKey, setTaskFormatoKey] = useState<string | null>(null);
  const [taskFormatoName, setTaskFormatoName] = useState("Sin formato");

  const [activePopover, setActivePopover] = useState<"category" | "gradient" | null>(null);
  const [activeTaskPopover, setActiveTaskPopover] = useState<{ taskId: number; type: "format" | "time" } | null>(null);
  const [draftTaskPopover, setDraftTaskPopover] = useState<"format" | "time" | null>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);

  const handleConfirmTask = () => {
    if (!taskTitle.trim()) return;
    playSound("pop");
    const newTask: TemplateTaskItem = {
      id: Date.now(),
      title: taskTitle.trim(),
      format: taskFormatoName || "Sin formato",
      formato: taskFormatoKey || null,
      time: taskTime || "1 hora"
    };
    setTasks((prev) => [...prev, newTask]);
    setIsCreatingTask(false);
    setTaskTitle("");
    setTaskTime("1 hora");
    setTaskFormatoKey(null);
    setTaskFormatoName("Sin formato");
  };

  const handleCancelTask = () => {
    setIsCreatingTask(false);
    setTaskTitle("");
    setTaskTime("1 hora");
    setTaskFormatoKey(null);
    setTaskFormatoName("Sin formato");
  };

  const handleDeleteTask = (taskId: number) => {
    playSound("trash");
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalName = name.trim();
    if (!finalName) {
      playSound("click");
      if (titleInputRef.current) titleInputRef.current.focus();
      return;
    }

    playSound("pop");

    // Auto-commit active draft task if any
    let finalTasks = [...tasks];
    if (taskTitle.trim()) {
      finalTasks.push({
        id: Date.now(),
        title: taskTitle.trim(),
        format: taskFormatoName || "Sin formato",
        formato: taskFormatoKey || null,
        time: taskTime || "1 hora"
      });
    }

    const selectedPreset = PRESET_GRADIENTS[selectedGradientIdx] || PRESET_GRADIENTS[0];

    const newTemplate: ProjectTemplateItem = {
      id: `tmpl-${Date.now()}`,
      name: finalName,
      category: category.trim() || "General",
      desc: desc.trim() || "Plantilla personalizada de proyecto.",
      gradient: selectedPreset.gradient,
      tasksCount: finalTasks.length,
      isCustom: true,
      tasks: finalTasks.map((t) => ({
        title: t.title,
        format: t.format,
        formato: t.formato,
        time: t.time
      }))
    };

    // 1. Guardar en Firestore (v3_templates)
    try {
      if (db) {
        setDoc(doc(db, "v3_templates", newTemplate.id), newTemplate).catch((err) =>
          console.error("Error async saving template to Firestore:", err)
        );
      }
    } catch (err) {
      console.error("Error saving template to Firestore:", err);
    }

    // 2. Guardar en localStorage para persistencia local inmediata
    try {
      const saved = localStorage.getItem("taski_v3_templates");
      const existing: ProjectTemplateItem[] = saved ? JSON.parse(saved) : [];
      const updated = [newTemplate, ...existing.filter((t) => t.id !== newTemplate.id)];
      localStorage.setItem("taski_v3_templates", JSON.stringify(updated));
    } catch (e) {
      console.error("Error saving template to localStorage:", e);
    }

    onTemplateCreated(newTemplate);
  };

  const activePreset = PRESET_GRADIENTS[selectedGradientIdx] || PRESET_GRADIENTS[0];

  return (
    <div className="flex-1 flex flex-col bg-[#141416] text-[#f7f7f8] overflow-hidden rounded-b-xl border-t border-[#222226]">
      {/* MAIN TEMPLATE FORM */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-hidden">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
          
          {/* HEADER INTEGRATED CONTAINER WITH COLOR PRESET BACKGROUND */}
          <div
            className="p-4 rounded-xl transition-all duration-300 border-none space-y-3 shadow-lg"
            style={{
              backgroundColor: activePreset.color,
              border: "none"
            }}
          >
            {/* TOP HEADER ROW */}
            <div className="flex items-center justify-between text-xs select-none">
              {/* Left: Category Pill + Breadcrumb */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    role="combobox"
                    onClick={() => {
                      playSound("click");
                      setActivePopover(activePopover === "category" ? null : "category");
                    }}
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all cursor-pointer border-none outline-none ${
                      activePopover === "category"
                        ? "bg-white text-black font-bold"
                        : "bg-white/20 hover:bg-white/30 text-white"
                    }`}
                  >
                    <Layers className={`w-3.5 h-3.5 shrink-0 ${activePopover === "category" ? "text-black" : "text-white"}`} />
                    <span>{category}</span>
                  </button>
                  <LinearDropdownPopover
                    isOpen={activePopover === "category"}
                    onClose={() => setActivePopover(null)}
                    placeholder="Categoría de plantilla…"
                    shortcutKey="C"
                    selectedValue={category}
                    onSelect={(val) => setCategory(val)}
                    options={packageList.map((cat, i) => ({
                      id: cat,
                      label: cat,
                      shortcut: String(i + 1)
                    }))}
                    onAddNew={onAddNewCategory}
                    addNewLabel="Crear nuevo tipo"
                  />
                </div>
                <span className="text-white/70 font-medium">›</span>
                <span className="text-white/90 font-semibold">Crear plantilla</span>
              </div>

              {/* Right: Window Controls / Close */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    onClose();
                  }}
                  className="p-1 rounded text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                  title="Volver a tarjetas"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* TEMPLATE TITLE INPUT */}
            <input
              ref={titleInputRef}
              type="text"
              autoFocus
              placeholder="Nombre de la plantilla…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent text-[19px] font-bold text-white placeholder-white/70 border-none outline-none ring-0 focus:outline-none focus:ring-0 focus:border-none focus-visible:outline-none focus-visible:ring-0 caret-white p-0 shadow-none focus:shadow-none"
            />

            {/* TEMPLATE DESCRIPTION TEXTAREA */}
            <textarea
              rows={3}
              placeholder="Añadir descripción u objetivos de la plantilla…"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full bg-transparent text-[13px] text-white/90 placeholder-white/70 border-none outline-none ring-0 focus:outline-none focus:ring-0 focus:border-none focus-visible:outline-none focus-visible:ring-0 caret-white resize-none leading-relaxed p-0 min-h-[75px] shadow-none focus:shadow-none"
            />
          </div>

          {/* PROPERTY BUTTONS ROW */}
          <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-[#222226]">
            
            {/* Color Accent Picker */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1d1d21] border border-[#2e2e36] text-[11px] font-semibold text-[#f4f4f5]">
              <span className="text-white/60 mr-1">Color:</span>
              <div className="flex items-center gap-1.5">
                {PRESET_GRADIENTS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      playSound("click");
                      setSelectedGradientIdx(idx);
                    }}
                    className={`w-4 h-4 rounded-full transition-all cursor-pointer border ${
                      selectedGradientIdx === idx
                        ? "scale-125 border-white ring-2 ring-sky-400/40"
                        : "border-transparent opacity-75 hover:opacity-100 hover:scale-110"
                    }`}
                    style={{ backgroundColor: preset.color }}
                    title={preset.name}
                  />
                ))}
              </div>
            </div>

            {/* Total Tasks Badge */}
            <div className="flex items-center gap-1.5 rounded-full px-3 py-1 bg-[#1d1d21] border border-[#2e2e36] text-[11px] font-semibold text-[#f4f4f5]">
              <Tag className="w-3 h-3 text-sky-400 shrink-0" />
              <span>{tasks.length} {tasks.length === 1 ? "tarea predefinida" : "tareas predefinidas"}</span>
            </div>
          </div>

          {/* TEMPLATE TASKS LIST BUILDER */}
          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#f4f4f5] tracking-wide">
                Tareas de la plantilla
              </span>
              <span className="text-[11px] text-white/50">
                Se incluirán automáticamente al crear un proyecto con esta plantilla
              </span>
            </div>

            {/* List of existing tasks */}
            <div className="space-y-2">
              <AnimatePresence>
                {tasks.map((t) => {
                  const isFmtOpen = activeTaskPopover?.taskId === t.id && activeTaskPopover?.type === "format";
                  const isTimeOpen = activeTaskPopover?.taskId === t.id && activeTaskPopover?.type === "time";
                  const fmtObj = getFormato(t.formato || t.format);

                  return (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="w-full rounded-full border-none bg-[#1d1d21] p-1.5 px-4 flex items-center justify-between gap-3 transition-all relative shadow-sm hover:bg-[#232328]"
                    >
                      <input
                        type="text"
                        value={t.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTasks((prev) =>
                            prev.map((item) => (item.id === t.id ? { ...item, title: val } : item))
                          );
                        }}
                        className="flex-1 bg-transparent text-xs font-semibold text-[#f4f4f5] outline-none border-none ring-0 focus:outline-none focus:ring-0 focus:border-none focus-visible:outline-none focus-visible:ring-0 p-0 ml-1"
                      />

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Formato Popover Trigger */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              playSound("click");
                              setActiveTaskPopover(
                                isFmtOpen ? null : { taskId: t.id, type: "format" }
                              );
                            }}
                            className="px-3 py-1 rounded-full bg-white hover:bg-[#e4e4e7] border-none outline-none text-[10px] font-bold text-[#09090b] cursor-pointer transition-colors flex items-center gap-1.5"
                          >
                            {fmtObj && <FormatoShape formatoObj={fmtObj} size="sm" />}
                            <span>{fmtObj?.nombre || t.format || "Sin formato"}</span>
                          </button>
                          <LinearDropdownPopover
                            isOpen={isFmtOpen}
                            onClose={() => setActiveTaskPopover(null)}
                            placeholder="Cambiar formato…"
                            shortcutKey="F"
                            selectedValue={fmtObj?.key || t.format || ""}
                            position="top"
                            align="right"
                            onSelect={(val) => {
                              const selFmt = getFormato(val);
                              setTasks((prev) =>
                                prev.map((item) =>
                                  item.id === t.id
                                    ? { ...item, formato: val, format: selFmt?.nombre || val }
                                    : item
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
                                isTimeOpen ? null : { taskId: t.id, type: "time" }
                              );
                            }}
                            className="px-3 py-1 rounded-full bg-white hover:bg-[#e4e4e7] text-[10px] font-bold text-[#09090b] border-none outline-none transition-colors cursor-pointer"
                          >
                            {t.time || "1 hora"}
                          </button>
                          <LinearDropdownPopover
                            isOpen={isTimeOpen}
                            onClose={() => setActiveTaskPopover(null)}
                            placeholder="Cambiar duración…"
                            shortcutKey="D"
                            selectedValue={t.time || "1 hora"}
                            position="top"
                            align="right"
                            onSelect={(val) => {
                              setTasks((prev) =>
                                prev.map((item) => (item.id === t.id ? { ...item, time: val } : item))
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
                          onClick={() => handleDeleteTask(t.id)}
                          className="p-1 text-[#71717a] hover:text-rose-400 transition-colors cursor-pointer"
                          title="Eliminar tarea"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Add task inline form / trigger */}
              {!isCreatingTask ? (
                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setIsCreatingTask(true);
                    setTaskTitle("");
                    setTaskTime("1 hora");
                    setTaskFormatoKey(null);
                    setTaskFormatoName("Sin formato");
                  }}
                  className="w-full rounded-full border border-dashed border-[#33333e] hover:border-[#4f4f5e] p-2.5 text-xs font-medium text-[#a1a1aa] hover:text-[#f4f4f5] flex items-center justify-center gap-2 bg-transparent hover:bg-[#1a1a1e]/40 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#a1a1aa] shrink-0" />
                  <span>Añadir tarea a la plantilla</span>
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
                    placeholder="Nombre de la tarea de plantilla…"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleConfirmTask();
                      if (e.key === "Escape") handleCancelTask();
                    }}
                    className="flex-1 bg-transparent text-xs font-semibold text-[#f4f4f5] placeholder-[#686873] outline-none border-none ring-0 focus:outline-none focus:ring-0 focus:border-none focus-visible:outline-none focus-visible:ring-0 p-0 ml-1"
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
                        className="px-3 py-1 rounded-full bg-white hover:bg-[#e4e4e7] border-none outline-none text-[10px] font-bold text-[#09090b] cursor-pointer transition-colors flex items-center gap-1"
                      >
                        <span>{taskFormatoName || "Sin formato"}</span>
                      </button>
                      <LinearDropdownPopover
                        isOpen={draftTaskPopover === "format"}
                        onClose={() => setDraftTaskPopover(null)}
                        placeholder="Seleccionar formato…"
                        shortcutKey="F"
                        selectedValue={taskFormatoKey || ""}
                        position="top"
                        align="right"
                        onSelect={(val) => {
                          const fmt = getFormato(val);
                          setTaskFormatoKey(val);
                          setTaskFormatoName(fmt?.nombre || val);
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

                    {/* Draft Time Selector */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          playSound("click");
                          setDraftTaskPopover(draftTaskPopover === "time" ? null : "time");
                        }}
                        className="px-3 py-1 rounded-full bg-white hover:bg-[#e4e4e7] border-none outline-none text-[10px] font-bold text-[#09090b] cursor-pointer transition-colors"
                      >
                        <span>{taskTime || "1 hora"}</span>
                      </button>
                      <LinearDropdownPopover
                        isOpen={draftTaskPopover === "time"}
                        onClose={() => setDraftTaskPopover(null)}
                        placeholder="Duración…"
                        shortcutKey="D"
                        selectedValue={taskTime}
                        position="top"
                        align="right"
                        onSelect={(val) => setTaskTime(val)}
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
                      onClick={handleConfirmTask}
                      className="px-3 py-1 rounded-full bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-[10px] cursor-pointer transition-all active:scale-95"
                    >
                      Añadir
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelTask}
                      className="p-1 text-[#71717a] hover:text-[#f4f4f5] transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="p-3 px-5 border-t border-[#222226] bg-[#141416] flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2 text-[11px] text-[#71717a]">
            <span>Guardar plantilla reutilizable</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                playSound("click");
                onClose();
              }}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold px-4 py-1.5 rounded-lg text-xs shadow-[0_4px_14px_rgba(56,189,248,0.3)] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-950 shrink-0" />
              <span>Crear plantilla</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
