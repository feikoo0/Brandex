"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Layers } from "lucide-react";
import { playSound } from "../utils/audio";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

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

  if (!isOpen) return null;

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
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            playSound("click");
            onClose();
          }}
          className="absolute inset-0 bg-black/70"
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-sm bg-[#1f1f1f] border border-white/10 rounded-2xl p-5 shadow-2xl z-10 text-white"
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
              className="p-1 text-white/50 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Nombre del tipo</label>
              <input
                type="text"
                autoFocus
                placeholder="Ej. Producción 3D, Social Media, SEO..."
                value={typeName}
                onChange={(e) => setTypeName(e.target.value)}
                className="w-full bg-white/5 text-sm text-white placeholder:text-zinc-500 px-3 py-2 rounded-xl outline-none border border-white/10 focus:border-sky-500/50"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  playSound("click");
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white bg-white/5 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-950 bg-sky-400 hover:bg-sky-300 active:scale-95 transition-all shadow-md disabled:opacity-50"
              >
                {isSaving ? "Guardando..." : "Guardar Tipo"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
