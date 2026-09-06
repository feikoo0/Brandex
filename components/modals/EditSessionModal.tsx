"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, 
  X, 
  Sparkles, 
  Check, 
  AlertTriangle, 
  Calendar, 
  Timer
} from "lucide-react";
import { useSessions } from "@/hooks/useSessions";
import type { SessionDoc } from "@/lib/types";
import { playSound } from "@/app/taski/utils/audio";

interface EditSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: SessionDoc | null;
  task?: any;
  project?: any;
  isNightMode?: boolean;
  onSuccess?: () => void;
}

const PRESET_MINUTES = [15, 30, 45, 60, 90, 120, 180];

function formatTimeInput(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export default function EditSessionModal({
  isOpen,
  onClose,
  session,
  task,
  project,
  isNightMode = true,
  onSuccess,
}: EditSessionModalProps) {
  const { updateSession } = useSessions();
  const [activeTab, setActiveTab] = useState<"duration" | "range">("duration");
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [hours, setHours] = useState<number>(0);
  const [minutes, setMinutes] = useState<number>(0);
  const [startTimeStr, setStartTimeStr] = useState<string>("09:00");
  const [endTimeStr, setEndTimeStr] = useState<string>("10:00");
  const [summary, setSummary] = useState<string>("");

  // Base dates derived from session
  const sessionStartDate = useMemo(() => {
    if (!session?.startTime) return new Date();
    return session.startTime.toDate ? session.startTime.toDate() : new Date(session.startTime);
  }, [session]);

  const sessionEndDate = useMemo(() => {
    if (!session?.endTime) {
      const durM = session?.durationMins || 30;
      return new Date(sessionStartDate.getTime() + durM * 60 * 1000);
    }
    return session.endTime.toDate ? session.endTime.toDate() : new Date(session.endTime);
  }, [session, sessionStartDate]);

  // Initial load when modal opens
  useEffect(() => {
    if (!session) return;
    const durMins = session.durationMins || Math.round((session.durationSeconds || 0) / 60) || 0;
    setHours(Math.floor(durMins / 60));
    setMinutes(durMins % 60);
    setStartTimeStr(formatTimeInput(sessionStartDate));
    setEndTimeStr(formatTimeInput(sessionEndDate));
    setSummary(session.summary || "");
  }, [session, sessionStartDate, sessionEndDate, isOpen]);

  // Detect potential forgotten session (> 150 mins or status completada_forzada)
  const isLikelyForgotten = useMemo(() => {
    if (!session) return false;
    const durMins = session.durationMins || Math.round((session.durationSeconds || 0) / 60) || 0;
    return durMins >= 150 || session.status === "completada_forzada";
  }, [session]);

  // Parse task estimated effort in minutes if available
  const taskEstimatedMins = useMemo(() => {
    const rawTime = task?.esfuerzo || task?.duracion || task?.time;
    if (!rawTime) return null;
    const str = String(rawTime).toLowerCase();
    const numMatch = str.match(/\d+(\.\d+)?/);
    if (!numMatch) return null;
    const val = parseFloat(numMatch[0]);
    if (str.includes("hora") || str.includes("hr") || str.includes("h")) {
      return Math.round(val * 60);
    }
    if (str.includes("min") || str.includes("m")) {
      return Math.round(val);
    }
    return Math.round(val * 60); // default to hours
  }, [task]);

  // Handle Range Changes -> sync duration
  const handleRangeChange = (newStartStr: string, newEndStr: string) => {
    setStartTimeStr(newStartStr);
    setEndTimeStr(newEndStr);

    const [sH, sM] = newStartStr.split(":").map(Number);
    const [eH, eM] = newEndStr.split(":").map(Number);

    if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return;

    const startMinutes = sH * 60 + sM;
    let endMinutes = eH * 60 + eM;
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60; // next day crossing
    }

    const diff = Math.max(1, endMinutes - startMinutes);
    setHours(Math.floor(diff / 60));
    setMinutes(diff % 60);
  };

  const handleApplyPreset = (totalM: number) => {
    setHours(Math.floor(totalM / 60));
    setMinutes(totalM % 60);

    // Sync end time string
    const [sH, sM] = startTimeStr.split(":").map(Number);
    if (!isNaN(sH) && !isNaN(sM)) {
      const endTotalM = (sH * 60 + sM + totalM) % (24 * 60);
      const eH = String(Math.floor(endTotalM / 60)).padStart(2, "0");
      const eM = String(endTotalM % 60).padStart(2, "0");
      setEndTimeStr(`${eH}:${eM}`);
    }
    playSound("tick");
  };

  const handleSave = async () => {
    if (!session?.id) return;
    setIsSaving(true);

    try {
      const totalMins = Math.max(1, (Number(hours) || 0) * 60 + (Number(minutes) || 0));
      const totalSecs = totalMins * 60;

      let finalStartDate = new Date(sessionStartDate);
      if (activeTab === "range") {
        const [sH, sM] = startTimeStr.split(":").map(Number);
        finalStartDate.setHours(sH, sM, 0, 0);
      }

      const finalEndDate = new Date(finalStartDate.getTime() + totalSecs * 1000);

      await updateSession(session.id, {
        durationMins: totalMins,
        durationSeconds: totalSecs,
        startTime: finalStartDate,
        endTime: finalEndDate,
        summary: summary.trim(),
      });

      playSound("pop");
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Error al guardar edición de sesión:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !session) return null;

  const totalCurrentMins = (Number(hours) || 0) * 60 + (Number(minutes) || 0);
  const taskTitle = task?.titulo || task?.title || session.summary || "Sesión de Trabajo";
  const projectName = project?.nombre || project?.title || "Proyecto";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 14 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className={`relative w-full max-w-md rounded-[24px] border shadow-2xl overflow-hidden z-10 ${
            isNightMode 
              ? "bg-[#181818] border-white/10 text-white shadow-black/80" 
              : "bg-white border-slate-200 text-slate-900 shadow-slate-300/50"
          }`}
        >
          {/* Header */}
          <div className={`p-5 border-b flex items-start justify-between gap-3 ${
            isNightMode ? "border-white/5 bg-white/[0.02]" : "border-slate-100 bg-slate-50/50"
          }`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 text-cyan-400">
                <Timer className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    Editar Sesión
                  </span>
                  <span className={`text-xs truncate ${isNightMode ? "text-white/40" : "text-slate-400"}`}>
                    {sessionStartDate.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                  </span>
                </div>
                <h3 className={`text-sm font-black truncate mt-1 ${
                  isNightMode ? "text-[#ffffffd6]" : "text-slate-900"
                }`}>
                  {taskTitle}
                </h3>
                <p className={`text-[11px] truncate ${isNightMode ? "text-white/50" : "text-slate-500"}`}>
                  {projectName}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${
                isNightMode ? "hover:bg-white/10 text-white/50 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
            {/* Smart Assist Banner if likely forgotten */}
            {isLikelyForgotten && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2.5"
              >
                <div className="flex items-center gap-2 text-amber-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-black tracking-tight">
                    ¿Olvidaste terminar esta sesión?
                  </span>
                </div>
                <p className="text-[11px] text-amber-200/70 leading-relaxed">
                  Esta sesión registró una duración extensa ({Math.floor(session.durationMins / 60)}h {session.durationMins % 60}m). Puedes recortarla rápidamente:
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {taskEstimatedMins && (
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(taskEstimatedMins)}
                      className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      Ajustar a esfuerzo ({Math.floor(taskEstimatedMins / 60)}h {taskEstimatedMins % 60 ? `${taskEstimatedMins % 60}m` : ""})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(30)}
                    className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 transition-all"
                  >
                    30 min
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(60)}
                    className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 transition-all"
                  >
                    1 hora
                  </button>
                </div>
              </motion.div>
            )}

            {/* Mode Switch Tabs */}
            <div className={`p-1 rounded-xl flex gap-1 ${
              isNightMode ? "bg-[#222222] border border-white/5" : "bg-slate-100"
            }`}>
              <button
                type="button"
                onClick={() => setActiveTab("duration")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "duration"
                    ? isNightMode 
                      ? "bg-white/10 text-white shadow-sm border border-white/10" 
                      : "bg-white text-slate-900 shadow-sm"
                    : isNightMode ? "text-white/40 hover:text-white/70" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Duración Total
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("range")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "range"
                    ? isNightMode 
                      ? "bg-white/10 text-white shadow-sm border border-white/10" 
                      : "bg-white text-slate-900 shadow-sm"
                    : isNightMode ? "text-white/40 hover:text-white/70" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Rango Horario
              </button>
            </div>

            {/* Main Duration Inputs */}
            {activeTab === "duration" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-3.5 rounded-2xl border ${
                    isNightMode ? "bg-[#222222] border-white/10" : "bg-slate-50 border-slate-200"
                  }`}>
                    <label className={`block text-[10px] font-extrabold uppercase tracking-wider mb-1.5 ${
                      isNightMode ? "text-white/40" : "text-slate-400"
                    }`}>
                      Horas
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={24}
                      value={hours}
                      onChange={(e) => setHours(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className={`w-full text-2xl font-black bg-transparent outline-none ${
                        isNightMode ? "text-white" : "text-slate-900"
                      }`}
                    />
                  </div>

                  <div className={`p-3.5 rounded-2xl border ${
                    isNightMode ? "bg-[#222222] border-white/10" : "bg-slate-50 border-slate-200"
                  }`}>
                    <label className={`block text-[10px] font-extrabold uppercase tracking-wider mb-1.5 ${
                      isNightMode ? "text-white/40" : "text-slate-400"
                    }`}>
                      Minutos
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={minutes}
                      onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))}
                      className={`w-full text-2xl font-black bg-transparent outline-none ${
                        isNightMode ? "text-white" : "text-slate-900"
                      }`}
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div>
                  <label className={`block text-[10px] font-extrabold uppercase tracking-wider mb-2 ${
                    isNightMode ? "text-white/40" : "text-slate-400"
                  }`}>
                    Presets Rápidos
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_MINUTES.map((m) => {
                      const label = m < 60 ? `${m}m` : m % 60 === 0 ? `${m / 60}h` : `${Math.floor(m / 60)}h ${m % 60}m`;
                      const isSelected = totalCurrentMins === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleApplyPreset(m)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${
                            isSelected
                              ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm"
                              : isNightMode
                                ? "bg-white/5 hover:bg-white/10 text-white/70 border-white/10"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-3.5 rounded-2xl border ${
                    isNightMode ? "bg-[#222222] border-white/10" : "bg-slate-50 border-slate-200"
                  }`}>
                    <label className={`block text-[10px] font-extrabold uppercase tracking-wider mb-1.5 ${
                      isNightMode ? "text-white/40" : "text-slate-400"
                    }`}>
                      Hora de Inicio
                    </label>
                    <input
                      type="time"
                      value={startTimeStr}
                      onChange={(e) => handleRangeChange(e.target.value, endTimeStr)}
                      className={`w-full text-lg font-black bg-transparent outline-none ${
                        isNightMode ? "text-white" : "text-slate-900"
                      }`}
                    />
                  </div>

                  <div className={`p-3.5 rounded-2xl border ${
                    isNightMode ? "bg-[#222222] border-white/10" : "bg-slate-50 border-slate-200"
                  }`}>
                    <label className={`block text-[10px] font-extrabold uppercase tracking-wider mb-1.5 ${
                      isNightMode ? "text-white/40" : "text-slate-400"
                    }`}>
                      Hora de Fin
                    </label>
                    <input
                      type="time"
                      value={endTimeStr}
                      onChange={(e) => handleRangeChange(startTimeStr, e.target.value)}
                      className={`w-full text-lg font-black bg-transparent outline-none ${
                        isNightMode ? "text-white" : "text-slate-900"
                      }`}
                    />
                  </div>
                </div>

                <div className={`p-3 rounded-xl flex items-center justify-between text-xs font-bold ${
                  isNightMode ? "bg-white/5 text-white/70" : "bg-slate-100 text-slate-600"
                }`}>
                  <span>Duración calculada:</span>
                  <span className={`font-black ${isNightMode ? "text-cyan-300" : "text-cyan-600"}`}>
                    {hours > 0 ? `${hours}h ` : ""}{minutes}m ({totalCurrentMins * 60}s)
                  </span>
                </div>
              </div>
            )}

            {/* Note / Summary field */}
            <div className={`p-3.5 rounded-2xl border ${
              isNightMode ? "bg-[#222222] border-white/10" : "bg-slate-50 border-slate-200"
            }`}>
              <label className={`block text-[10px] font-extrabold uppercase tracking-wider mb-1.5 ${
                isNightMode ? "text-white/40" : "text-slate-400"
              }`}>
                Nota o Resumen de Actividad
              </label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="¿Qué avanzaste durante esta sesión? (opcional)"
                rows={2}
                className={`w-full text-xs font-medium bg-transparent outline-none resize-none placeholder:text-white/20 ${
                  isNightMode ? "text-white" : "text-slate-900 placeholder:text-slate-400"
                }`}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className={`p-4 border-t flex items-center justify-end gap-2.5 ${
            isNightMode ? "border-white/5 bg-white/[0.02]" : "border-slate-100 bg-slate-50"
          }`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                isNightMode ? "hover:bg-white/5 text-white/50 hover:text-white" : "hover:bg-slate-200 text-slate-600"
              }`}
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={isSaving || totalCurrentMins <= 0}
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <span>Guardando...</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
