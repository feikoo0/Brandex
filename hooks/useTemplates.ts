"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  serverTimestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ProjectTemplateItem } from "@/app/taski/components/CreateTemplateModal";

export const DEFAULT_TEMPLATES: ProjectTemplateItem[] = [
  { id: "t1", name: "Estratégico", category: "Estratégico", desc: "Planificación estratégica y Roadmap de producto" },
  { id: "t2", name: "Branding Complete", category: "Branding Complete", desc: "Identidad visual completa, logo y guía de estilo" },
  { id: "t3", name: "Desarrollo Web", category: "Desarrollo Web", desc: "Sitio web profesional responsive y SEO optimizado" },
  { id: "t4", name: "UI/UX Design", category: "UI/UX Design", desc: "Diseño de interfaz de usuario y prototipos navegables" },
  { id: "t5", name: "Marketing Digital", category: "Marketing Digital", desc: "Campaña de redes sociales y embudos de venta" }
];

export function useTemplates() {
  const [templates, setTemplates] = useState<ProjectTemplateItem[]>(DEFAULT_TEMPLATES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Escuchar Firestore v3_templates en tiempo real
    const colRef = collection(db, "v3_templates");
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const allTemplatesMap = new Map<string, ProjectTemplateItem>();

      // Base default templates
      DEFAULT_TEMPLATES.forEach((t) => allTemplatesMap.set(t.name.toLowerCase(), t));

      // Local storage fallback
      try {
        const saved = localStorage.getItem("taski_v3_templates");
        if (saved) {
          const parsed: ProjectTemplateItem[] = JSON.parse(saved);
          parsed.forEach((t) => allTemplatesMap.set(t.name.toLowerCase(), t));
        }
      } catch (e) {}

      // Firestore realtime templates
      snapshot.docs.forEach((d) => {
        const data = d.data();
        if (data.name) {
          allTemplatesMap.set(data.name.toLowerCase(), {
            id: d.id,
            name: data.name,
            category: data.category || "General",
            desc: data.desc || "",
            gradient: data.gradient,
            tasksCount: data.tasksCount,
            isCustom: data.isCustom ?? true,
            tasks: data.tasks
          });
        }
      });

      setTemplates(Array.from(allTemplatesMap.values()));
      setIsLoading(false);
    }, (error) => {
      console.error("Error listening to v3_templates in Firestore:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const createTemplate = useCallback(async (newTemplate: ProjectTemplateItem) => {
    try {
      const docRef = doc(db, "v3_templates", newTemplate.id || String(Date.now()));
      await setDoc(docRef, {
        ...newTemplate,
        id: docRef.id,
        isCustom: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update local storage
      try {
        const saved = localStorage.getItem("taski_v3_templates");
        const existing: ProjectTemplateItem[] = saved ? JSON.parse(saved) : [];
        const updated = [newTemplate, ...existing.filter(t => t.id !== newTemplate.id)];
        localStorage.setItem("taski_v3_templates", JSON.stringify(updated));
      } catch (e) {}
    } catch (err) {
      console.error("Error creating template in Firestore:", err);
    }
  }, []);

  const deleteTemplate = useCallback(async (templateId: string) => {
    try {
      await deleteDoc(doc(db, "v3_templates", templateId));
      try {
        const saved = localStorage.getItem("taski_v3_templates");
        if (saved) {
          const existing: ProjectTemplateItem[] = JSON.parse(saved);
          localStorage.setItem("taski_v3_templates", JSON.stringify(existing.filter(t => t.id !== templateId)));
        }
      } catch (e) {}
    } catch (err) {
      console.error("Error deleting template in Firestore:", err);
    }
  }, []);

  return {
    templates,
    isLoading,
    createTemplate,
    deleteTemplate
  };
}
