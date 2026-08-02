"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Layers, Plus, Trash2, Sparkles } from "lucide-react";
import { playSound } from "../utils/audio";

export interface ProjectTemplateItem {
  id: string;
  name: string;
  category: string;
  desc: string;
  gradient?: string;
  tasksCount?: number;
  isCustom?: boolean;
  tasks?: { title: string; format: string; formato?: string | null; time: string }[];
}

interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateCreated: (template: ProjectTemplateItem) => void;
}

export default function CreateTemplateModal({
  isOpen,
  onClose,
  onTemplateCreated,
}: CreateTemplateModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Desarrollo Web");
  const [desc, setDesc] = useState("");
  const [taskInputs, setTaskInputs] = useState<string[]>(["Fase 1: Investigacion y Wireframes", "Fase 2: Diseño UI & Componentes"]);

  if (!isOpen) return null;

  const handleAddTaskInput = () => {
    playSound("pop");
    setTaskInputs((prev) => [...prev, ""]);
  };

  const handleRemoveTaskInput = (index: number) => {
    playSound("click");
    setTaskInputs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTaskChange = (index: number, val: string) => {
    setTaskInputs((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      playSound("click");
      alert("Por favor ingresa el nombre de la plantilla.");
      return;
    }

    playSound("pop");

    const validTasks = taskInputs.filter((t) => t.trim().length > 0);

    const newTemplate: ProjectTemplateItem = {
      id: `tmpl-${Date.now()}`,
      name: name.trim(),
      category: category.trim() || "General",
      desc: desc.trim() || "Plantilla personalizada de proyecto.",
      tasksCount: validTasks.length || 1,
      isCustom: true,
    };

    onTemplateCreated(newTemplate);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            playSound("click");
            onClose();
          }}
          className="absolute inset-0 bg-black/80"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative bg-[#1f1f1f] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden z-10 text-white"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Crear nueva plantilla</h3>
                <p className="text-[11px] text-white/50">Guarda una estructura reutilizable para nuevos proyectos</p>
              </div>
            </div>
            <button
              onClick={() => {
                playSound("click");
                onClose();
              }}
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1">
                Nombre de la plantilla <span className="text-sky-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Rediseño Web MVP, Sistema de Diseño UI..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 focus:border-sky-500/50 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-white/30 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1">Categoría / Tipo de proyecto</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#262626] border border-white/10 focus:border-sky-500/50 rounded-xl px-3 py-2 text-xs text-white outline-none"
              >
                <option value="Desarrollo Web">Desarrollo Web</option>
                <option value="UI/UX Design">UI/UX Design</option>
                <option value="Branding Complete">Branding Complete</option>
                <option value="Estratégico">Estratégico</option>
                <option value="Marketing Digital">Marketing Digital</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1">Descripción / Objetivos</label>
              <textarea
                rows={2}
                placeholder="Indica de qué trata esta plantilla y cuándo usarla..."
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full bg-white/5 border border-white/10 focus:border-sky-500/50 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none resize-none"
              />
            </div>

            {/* Task Presets */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-white/70">Tareas predefinidas</label>
                <button
                  type="button"
                  onClick={handleAddTaskInput}
                  className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 bg-sky-500/10 px-2 py-0.5 rounded-lg border border-sky-500/20"
                >
                  <Plus className="w-3 h-3" />
                  <span>Agregar tarea</span>
                </button>
              </div>

              <div className="space-y-2">
                {taskInputs.map((taskStr, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Tarea ${idx + 1}...`}
                      value={taskStr}
                      onChange={(e) => handleTaskChange(idx, e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 focus:border-sky-500/50 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-white/30 outline-none"
                    />
                    {taskInputs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTaskInput(idx)}
                        className="p-1 text-white/40 hover:text-rose-400 rounded-lg hover:bg-white/5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10 mt-4">
              <button
                type="button"
                onClick={() => {
                  playSound("click");
                  onClose();
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-sky-400 hover:bg-sky-300 active:scale-95 transition-all shadow-[0_4px_14px_rgba(56,189,248,0.3)]"
              >
                Guardar plantilla
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
