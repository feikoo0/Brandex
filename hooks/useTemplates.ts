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
import { useAuthStore } from "@/lib/store";
import { getWorkspaceScopedCol } from "@/lib/utils";

export const DEFAULT_TEMPLATES: ProjectTemplateItem[] = [
  { id: "t1", name: "Estratégico", category: "Estratégico", desc: "Planificación estratégica y Roadmap de producto" },
  { id: "t2", name: "Branding Complete", category: "Branding Complete", desc: "Identidad visual completa, logo y guía de estilo" },
  { id: "t3", name: "Desarrollo Web", category: "Desarrollo Web", desc: "Sitio web profesional responsive y SEO optimizado" },
  { id: "t4", name: "UI/UX Design", category: "UI/UX Design", desc: "Diseño de interfaz de usuario y prototipos navegables" },
  { id: "t5", name: "Marketing Digital", category: "Marketing Digital", desc: "Campaña de redes sociales y embudos de venta" }
];

function getInitialTemplates(): ProjectTemplateItem[] {
  const allTemplatesMap = new Map<string, ProjectTemplateItem>();
  DEFAULT_TEMPLATES.forEach((t) => allTemplatesMap.set(t.name.toLowerCase(), t));
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("taski_v3_templates");
      if (saved) {
        const parsed: ProjectTemplateItem[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach((t) => {
            if (t && t.name) {
              allTemplatesMap.set(t.name.toLowerCase(), t);
            }
          });
        }
      }
    } catch (e) {}
  }
  return Array.from(allTemplatesMap.values());
}

export function useTemplates() {
  const workspaceId = useAuthStore((s) => s.workspaceId);
  const isMaster = workspaceId === "brandex-master" || workspaceId === "ws_159789" || workspaceId === "159789";

  const [templates, setTemplates] = useState<ProjectTemplateItem[]>(getInitialTemplates);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!db) return;
    const colName = isMaster ? "v3_templates" : getWorkspaceScopedCol("templates", workspaceId, isMaster);
    const colRef = collection(db, colName);

    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const allTemplatesMap = new Map<string, ProjectTemplateItem>();

      // Base default templates
      DEFAULT_TEMPLATES.forEach((t) => allTemplatesMap.set(t.name.toLowerCase(), t));

      // Local storage fallback
      try {
        const saved = localStorage.getItem("taski_v3_templates");
        if (saved) {
          const parsed: ProjectTemplateItem[] = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            parsed.forEach((t) => {
              if (t && t.name) allTemplatesMap.set(t.name.toLowerCase(), t);
            });
          }
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

      const merged = Array.from(allTemplatesMap.values());
      setTemplates(merged);
      try {
        localStorage.setItem("taski_v3_templates", JSON.stringify(merged));
      } catch (e) {}
      setIsLoading(false);
    }, (error) => {
      console.error("Error listening to templates in Firestore:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [workspaceId, isMaster]);

  const createTemplate = useCallback(async (newTemplate: ProjectTemplateItem) => {
    try {
      const colName = isMaster ? "v3_templates" : getWorkspaceScopedCol("templates", workspaceId, isMaster);
      const docRef = doc(db, colName, newTemplate.id || String(Date.now()));
      await setDoc(docRef, {
        ...newTemplate,
        id: docRef.id,
        isCustom: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update local storage and reactive state
      try {
        const saved = localStorage.getItem("taski_v3_templates");
        const existing: ProjectTemplateItem[] = saved ? JSON.parse(saved) : [];
        const updated = [newTemplate, ...existing.filter(t => t.id !== newTemplate.id)];
        localStorage.setItem("taski_v3_templates", JSON.stringify(updated));
      } catch (e) {}
      setTemplates((prev) => [newTemplate, ...prev.filter((t) => t.id !== newTemplate.id)]);
    } catch (err) {
      console.error("Error creating template in Firestore:", err);
    }
  }, [workspaceId, isMaster]);

  const deleteTemplate = useCallback(async (templateId: string) => {
    try {
      const colName = isMaster ? "v3_templates" : getWorkspaceScopedCol("templates", workspaceId, isMaster);
      await deleteDoc(doc(db, colName, templateId));
      try {
        const saved = localStorage.getItem("taski_v3_templates");
        if (saved) {
          const existing: ProjectTemplateItem[] = JSON.parse(saved);
          const updated = existing.filter(t => t.id !== templateId);
          localStorage.setItem("taski_v3_templates", JSON.stringify(updated));
        }
      } catch (e) {}
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    } catch (err) {
      console.error("Error deleting template in Firestore:", err);
    }
  }, [workspaceId, isMaster]);

  return {
    templates,
    isLoading,
    createTemplate,
    deleteTemplate
  };
}
