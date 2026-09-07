"use client";

import { useState, useMemo, useEffect } from "react";
import { Briefcase, Loader2, Plus } from "lucide-react";
import { useData } from "@/hooks/useData";
import { useUIStore } from "@/lib/store";
import { playSound } from "@/app/taski/utils/audio";
import { ProjectCardItem } from "./ProjectCard";
import ProjectFullScreenView from "./ProjectFullScreenView";


export interface ProjectsViewProps {
  onCreateProject?: (originRect?: { x: number; y: number; width: number; height: number }) => void;
  selectedProjectId?: string | number | null;
  onClearSelectedProject?: () => void;
  onSelectTask?: (task: any, projectId?: string | number, originRect?: any) => void;
}

// ── 4. COMPONENTE PRINCIPAL PROJECTS VIEW ────────────────────────────────────
export function ProjectsView({ onCreateProject, selectedProjectId, onClearSelectedProject, onSelectTask }: ProjectsViewProps = {}) {
  const { data, isLoading } = useData();
  const openModal = useUIStore((s) => s.openModal);

  const [activeProjectId, setActiveProjectId] = useState<string | null>(
    selectedProjectId ? String(selectedProjectId) : null
  );
  const [searchQuery] = useState("");
  const [statusFilter] = useState("Todos");
  const [sortBy] = useState<"recientes" | "nombre" | "progreso" | "costo">("recientes");
  const [cardVariant] = useState<"cover" | "full">("cover");

  useEffect(() => {
    if (selectedProjectId) {
      setActiveProjectId(String(selectedProjectId));
    }
  }, [selectedProjectId]);

  const projects = data?.proyectos;

  // Filtrado y ordenamiento de proyectos
  const filteredProjects = useMemo(() => {
    const list = projects ?? [];
    return list
      .filter((p) => {
        const matchesSearch = 
          p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.descripcion && p.descripcion.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const matchesStatus = statusFilter === "Todos" || p.estadoProyecto === statusFilter || p.estado === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "nombre") return a.nombre.localeCompare(b.nombre);
        if (sortBy === "costo") return (b.costo || 0) - (a.costo || 0);
        return 0;
      });
  }, [projects, searchQuery, statusFilter, sortBy]);

  // Si hay un proyecto activo seleccionado, renderizar la vista A PANTALLA COMPLETA
  if (activeProjectId) {
    return (
      <ProjectFullScreenView 
        projectId={activeProjectId} 
        onBack={() => {
          setActiveProjectId(null);
          onClearSelectedProject?.();
        }} 
        onSelectTask={onSelectTask}
      />
    );
  }

  if (isLoading && (!projects || projects.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 bg-transparent">
        <Loader2 className="w-8 h-8 animate-spin text-[#ffffff6b]" />
        <p className="text-xs font-bold text-[#ffffff6b]">Cargando proyectos...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex-1 flex flex-col min-h-0 min-w-0 overflow-y-auto custom-scrollbar pr-1 bg-transparent text-[#ffffffd6]">
      {/* ── CATÁLOGO DE PROYECTOS (VISTA EN GRID) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-0">
        {/* Tarjeta / Botón Nuevo Proyecto */}
        <div className="p-2 h-[220px]">
          <div
            onClick={(e) => {
              playSound("click");
              const rect = e.currentTarget.getBoundingClientRect();
              if (onCreateProject) {
                onCreateProject({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
              } else {
                openModal({ type: "proyecto", id: "new" });
              }
            }}
            className="w-full h-full relative flex flex-col items-center justify-center p-5 rounded-2xl border border-dashed border-white/20 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/40 transition-all cursor-pointer group select-none shadow-sm"
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 group-hover:bg-white/20 group-hover:scale-110 transition-all mb-3 text-white">
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="text-[14px] font-semibold text-white/90 group-hover:text-white text-center">
              Nuevo proyecto
            </div>
            <p className="text-[12px] text-white/40 mt-1 text-center font-normal">Crear desde plantilla o en blanco</p>
          </div>
        </div>

        {filteredProjects.map((p) => (
          <ProjectCardItem 
            key={p.id} 
            projectId={p.id} 
            onOpenFullScreen={(id) => setActiveProjectId(id)}
            cardStyle={cardVariant}
          />
        ))}
      </div>

      {/* Estado Vacío */}
      {filteredProjects.length === 0 && (
        <div className="py-24 flex flex-col items-center justify-center text-center opacity-40">
          <Briefcase className="w-14 h-14 mb-4 text-[#ffffff6b]" />
          <h4 className="text-xl font-bold text-[#ffffffd6]">No se encontraron proyectos</h4>
          <p className="text-xs text-[#ffffff6b] mt-1 max-w-sm">
            {searchQuery
              ? `No hay proyectos que coincidan con "${searchQuery}".`
              : "Prueba ajustando los filtros de búsqueda o crea un nuevo proyecto de marca."}
          </p>
          <button
            type="button"
            onClick={() => {
              if (onCreateProject) {
                onCreateProject();
              } else {
                openModal({ type: "proyecto", id: "new" });
              }
            }}
            className="mt-4 px-5 py-2.5 rounded-xl bg-white hover:bg-white/90 text-black text-xs font-bold uppercase tracking-wider transition-all"
          >
            + Crear Nuevo Proyecto
          </button>
        </div>
      )}
    </div>
  );
}
