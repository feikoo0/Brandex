"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, AlertTriangle, Trash2, Folder, Check } from "lucide-react";
import { playSound } from "../utils/audio";

export interface DeleteModalConfig {
  isOpen: boolean;
  step: 1 | 2;
  projectId: number;
  projectTitle: string;
  taskId: number;
  taskTitle: string;
  targetType?: "task" | "project";
}

export interface DeleteConfirmModalProps {
  isOpen: boolean;
  isNightMode?: boolean;
  
  // 2-Step Config Flow (HomeDashboard)
  config?: DeleteModalConfig | null;
  onClose?: () => void;
  onSetStep?: (step: 1 | 2, targetType?: "task" | "project") => void;
  onConfirmTaskDelete?: (projectId: number, taskId: number) => void;
  onConfirmProjectDelete?: (projectId: number) => void;

  // Generic Direct Mode
  itemName?: string;
  itemType?: "tarea" | "proyecto";
  onConfirm?: () => void;
  onCancel?: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  isNightMode = true,
  config,
  onClose,
  onSetStep,
  onConfirmTaskDelete,
  onConfirmProjectDelete,
  itemName,
  itemType = "tarea",
  onConfirm,
  onCancel,
}) => {
  const handleClose = () => {
    playSound("click");
    if (onClose) onClose();
    if (onCancel) onCancel();
  };

  const isConfigMode = Boolean(config);
  const currentStep = config?.step ?? 2;
  const currentTargetType = config?.targetType ?? (itemType === "proyecto" ? "project" : "task");
  const taskTitle = config?.taskTitle || (itemType === "tarea" ? itemName : "");
  const projectTitle = config?.projectTitle || (itemType === "proyecto" ? itemName : "");

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          {/* Blur backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
          />

          {/* Modal Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className={`relative w-full max-w-md overflow-hidden rounded-[32px] border shadow-2xl p-6 z-10 flex flex-col gap-5 ${
              isNightMode
                ? "bg-slate-900/95 border-white/10 text-white shadow-black/80"
                : "bg-white border-slate-200 text-slate-800 shadow-slate-200/50"
            }`}
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              className={`absolute top-4 right-4 p-1.5 rounded-full transition-all ${
                isNightMode
                  ? "hover:bg-white/10 text-slate-400 hover:text-white"
                  : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"
              }`}
            >
              <X className="w-4 h-4" />
            </button>

            {currentStep === 1 && isConfigMode ? (
              <>
                {/* Step 1: Choose Task or Project */}
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    <AlertTriangle className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-lg font-extrabold tracking-tight leading-tight">
                      Opciones de Eliminación
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      Selecciona qué deseas remover del sistema.
                    </p>
                  </div>
                </div>

                <div className="mt-1 flex flex-col gap-3">
                  {/* Option A: Task */}
                  <button
                    onClick={() => {
                      if (onSetStep) onSetStep(2, "task");
                      playSound("click");
                    }}
                    className={`group w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                      isNightMode
                        ? "bg-white/[0.02] border-white/5 hover:bg-rose-500/10 hover:border-rose-500/20"
                        : "bg-slate-50 border-slate-150 hover:bg-rose-50 hover:border-rose-200"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl transition-all ${
                        isNightMode
                          ? "bg-rose-500/10 text-rose-400 group-hover:bg-rose-500/20"
                          : "bg-rose-100 text-rose-600 group-hover:bg-rose-200"
                      }`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="block text-xs font-bold uppercase tracking-wider text-rose-400">
                        Eliminar Tarea
                      </span>
                      <span
                        className={`block text-sm font-bold truncate mt-0.5 ${
                          isNightMode ? "text-white" : "text-slate-900"
                        }`}
                      >
                        "{taskTitle}"
                      </span>
                      <span className="block text-[11px] text-slate-400 mt-1">
                        Solo se removerá esta tarea individual de su proyecto.
                      </span>
                    </div>
                  </button>

                  {/* Option B: Project */}
                  <button
                    onClick={() => {
                      if (onSetStep) onSetStep(2, "project");
                      playSound("click");
                    }}
                    className={`group w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                      isNightMode
                        ? "bg-white/[0.02] border-white/5 hover:bg-rose-600/15 hover:border-rose-600/25"
                        : "bg-slate-50 border-slate-150 hover:bg-rose-100/50 hover:border-rose-300"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl transition-all ${
                        isNightMode
                          ? "bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20"
                          : "bg-amber-100 text-amber-600 group-hover:bg-amber-200"
                      }`}
                    >
                      <Folder className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="block text-xs font-bold uppercase tracking-wider text-amber-400">
                        Eliminar Proyecto Completo
                      </span>
                      <span
                        className={`block text-sm font-bold truncate mt-0.5 ${
                          isNightMode ? "text-white" : "text-slate-900"
                        }`}
                      >
                        "{projectTitle}"
                      </span>
                      <span className="block text-[11px] text-slate-400 mt-1">
                        ⚠️ Eliminará el proyecto completo junto con todas sus tareas asociadas.
                      </span>
                    </div>
                  </button>
                </div>

                <button
                  onClick={handleClose}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all text-center ${
                    isNightMode
                      ? "bg-white/5 hover:bg-white/10 text-slate-300"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  }`}
                >
                  Cancelar
                </button>
              </>
            ) : (
              <>
                {/* Step 2: Confirm Action */}
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="p-4 rounded-full bg-rose-500/15 text-rose-500 border border-rose-500/25">
                    <Trash2 className="w-8 h-8 animate-pulse" />
                  </div>

                  <h3 className="text-xl font-extrabold tracking-tight text-rose-500">
                    ¿Confirmar Acción?
                  </h3>

                  <p
                    className={`text-sm mt-1 leading-relaxed px-1 ${
                      isNightMode ? "text-slate-300" : "text-slate-600"
                    }`}
                  >
                    {currentTargetType === "task" ? (
                      <>
                        ¿Estás completamente seguro de que deseas eliminar la tarea{" "}
                        <span
                          className={`font-extrabold ${
                            isNightMode ? "text-white" : "text-slate-950"
                          }`}
                        >
                          "{taskTitle}"
                        </span>
                        ? Esta acción la removerá permanentemente del proyecto{" "}
                        <span className="font-bold">{projectTitle}</span>.
                      </>
                    ) : (
                      <>
                        ¡Atención! Estás a punto de eliminar el proyecto{" "}
                        <span
                          className={`font-extrabold ${
                            isNightMode ? "text-white" : "text-slate-950"
                          }`}
                        >
                          "{projectTitle}"
                        </span>{" "}
                        y todas las tareas que contiene.
                        <span className="block mt-2 text-rose-500 font-extrabold text-xs uppercase tracking-wider">
                          ⚠️ Esta acción es irreversible.
                        </span>
                      </>
                    )}
                  </p>
                </div>

                <div className="flex flex-col gap-2.5 mt-3">
                  {/* Confirm Button */}
                  <button
                    onClick={() => {
                      playSound("trash");
                      if (isConfigMode && config) {
                        if (currentTargetType === "task") {
                          onConfirmTaskDelete?.(config.projectId, config.taskId);
                        } else {
                          onConfirmProjectDelete?.(config.projectId);
                        }
                      } else if (onConfirm) {
                        onConfirm();
                      }
                      if (onClose) onClose();
                    }}
                    className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-500/10 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Sí, eliminar definitivamente</span>
                  </button>

                  <div className="flex gap-2 w-full">
                    {/* Go Back Button (if 2-step config) */}
                    {isConfigMode && onSetStep && (
                      <button
                        onClick={() => {
                          onSetStep(1, undefined);
                          playSound("click");
                        }}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all text-center border ${
                          isNightMode
                            ? "bg-white/5 border-white/5 hover:bg-white/10 text-slate-300"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600"
                        }`}
                      >
                        Atrás
                      </button>
                    )}

                    {/* Cancel Button */}
                    <button
                      onClick={handleClose}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all text-center ${
                        isNightMode
                          ? "bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DeleteConfirmModal;
