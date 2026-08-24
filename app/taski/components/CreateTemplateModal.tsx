"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playSound } from "../utils/audio";
import CreateTemplateForm from "./CreateTemplateForm";

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
  if (!isOpen) return null;

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
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative bg-[#141416] border border-white/10 rounded-2xl w-full max-w-2xl h-[85vh] max-h-[720px] shadow-2xl overflow-hidden z-10 text-white flex flex-col"
        >
          <CreateTemplateForm
            onClose={onClose}
            onTemplateCreated={onTemplateCreated}
            packageList={packageList}
            onAddNewCategory={onAddNewCategory}
          />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
