"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Layers } from "lucide-react";
import { playSound } from "../utils/audio";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Portal } from "@/components/ui/Portal";

export interface ProjectTypeItem {
  id: string;
  name: string;
  desc?: string;
}

interface CreateProjectTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTypeCreated: (typeItem: ProjectTypeItem) => void;
}

export default function CreateProjectTypeModal({
  isOpen,
  onClose,
  onTypeCreated,
}: CreateProjectTypeModalProps) {
  const [typeName, setTypeName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeName.trim()) {
      playSound("click");
      alert("Por favor ingresa el nombre del tipo de proyecto.");
      return;
    }

    setIsSaving(true);
    playSound("pop");

    const cleanName = typeName.trim();
    const typeId = cleanName.toLowerCase().replace(/\s+/g, "_");

    const newTypeItem: ProjectTypeItem = {
      id: typeId,
      name: cleanName,
    };

    try {
      if (db) {
        await setDoc(doc(db, "v3_project_types", typeId), newTypeItem);
      }
    } catch (err) {
      console.error("Error saving project type to Firestore:", err);
    } finally {
      setIsSaving(false);
      onTypeCreated(newTypeItem);
      setTypeName("");
      onClose();
    }
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="create-type-backdrop-wrap"
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-auto select-none"
          >
            <motion.div
              key="create-type-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.56, 0.27, 0, 1] }}
              onClick={() => {
                playSound("click");
                onClose();
              }}
              className="absolute inset-0 bg-black/70 pointer-events-auto cursor-pointer"
            />

            <motion.div
              key="create-type-dialog"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.305, 0.206, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm bg-[#1f1f1f] border border-white/10 rounded-2xl p-5 shadow-2xl z-10 text-white pointer-events-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold">Nuevo Tipo de Proyecto</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    onClose();
                  }}
                  className="p-1 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/60 mb-1.5">
                    Nombre del Tipo
                  </label>
                  <input
                    type="text"
                    value={typeName}
                    onChange={(e) => setTypeName(e.target.value)}
                    placeholder="Ej. Campaña Publicitaria, Branding..."
                    className="w-full bg-[#121212] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      playSound("click");
                      onClose();
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs text-white/60 hover:text-white hover:bg-white/5 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-white text-black hover:bg-white/90 disabled:opacity-50 transition-all"
                  >
                    {isSaving ? "Guardando..." : "Crear Tipo"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
