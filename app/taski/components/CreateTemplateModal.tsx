"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playSound } from "../utils/audio";
import CreateTemplateForm from "./CreateTemplateForm";
import { Portal } from "@/components/ui/Portal";

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
  packageList?: string[];
  onAddNewCategory?: () => void;
}

export default function CreateTemplateModal({
  isOpen,
  onClose,
  onTemplateCreated,
  packageList,
  onAddNewCategory,
}: CreateTemplateModalProps) {
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

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="create-template-backdrop-wrap"
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 overflow-hidden pointer-events-auto select-none"
          >
            {/* Backdrop */}
            <motion.div
              key="create-template-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.56, 0.27, 0, 1] }}
              onClick={() => {
                playSound("click");
                onClose();
              }}
              className="absolute inset-0 bg-black/80 pointer-events-auto cursor-pointer"
            />

            {/* Modal Window */}
            <motion.div
              key="create-template-dialog"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25, ease: [0.305, 0.206, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-[#141416] border border-white/10 rounded-2xl w-full max-w-2xl h-[85vh] max-h-[720px] shadow-2xl overflow-hidden z-10 text-white flex flex-col pointer-events-auto"
            >
              <CreateTemplateForm
                onClose={onClose}
                onTemplateCreated={onTemplateCreated}
                packageList={packageList}
                onAddNewCategory={onAddNewCategory}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
