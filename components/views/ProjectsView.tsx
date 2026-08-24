"use client";

import { useState, useMemo, useCallback } from "react";
import { 
  ArrowLeft, Briefcase, Calendar, CheckCircle2, Clock, DollarSign, 
  ExternalLink, FolderKanban, LayoutGrid, Loader2, Plus, Search, 
  Sparkles, Table, Target, Users, AlertTriangle, FileText, Layers, 
  ChevronRight, X, Tag, SlidersHorizontal, Check, RefreshCw, Eye, 
  BarChart3, Filter, ListFilter, ArrowUpDown, ChevronDown, MoreHorizontal,
  Maximize2, Paperclip, Flag, Trash2, User
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { useData, useUpdateProject, useCreateProject, useUpdateTask, useCreateTask } from "@/hooks/useData";
import { useProjectSummary } from "@/hooks/useProjectSummary";
import { useDebouncedSave } from "@/hooks/useDebouncedSave";
import { useTemplates } from "@/hooks/useTemplates";
import CreateTemplateModal from "@/app/taski/components/CreateTemplateModal";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { cn, parseEsfuerzoMins, avatarOf, getSingleSourceProjectColor, PROJECT_COLOR_PALETTE } from "@/lib/utils";
import { DONE_STATES, PROJ_PRIO_OPTS, PROJ_STATUS_OPTS, STATUS_COLORS } from "@/lib/constants";
import { useUIStore } from "@/lib/store";
import ProjectCoverFormats from "@/app/taski/components/ProjectCoverFormats";
import FormatoShape from "@/app/taski/components/FormatoShape";
import { FORMATOS_ESTANDAR, getFormato } from "@/app/taski/utils/formatos";
import LinearDropdownPopover from "@/app/taski/components/LinearDropdownPopover";
import LinearDatePopover from "@/app/taski/components/LinearDatePopover";
import { playSound } from "@/app/taski/utils/audio";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ProjectCardItem, ProjectListItem } from "./ProjectCard";
import ProjectFullScreenView from "./ProjectFullScreenView";


export interface ProjectsViewProps {
  onCreateProject?: (originRect?: { x: number; y: number; width: number; height: number }) => void;
}

// ── 4. COMPONENTE PRINCIPAL PROJECTS VIEW ────────────────────────────────────
export function ProjectsView({ onCreateProject }: ProjectsViewProps = {}) {
  const { data, isLoading } = useData();
  const { templates, createTemplate } = useTemplates();
  const openModal = useUIStore((s) => s.openModal);

  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [sortBy, setSortBy] = useState<"recientes" | "nombre" | "progreso" | "costo">("recientes");
  const [displayMode, setDisplayMode] = useState<"grid" | "list">("grid");
  const [cardVariant, setCardVariant] = useState<"cover" | "full">("cover");
  const [isCreateTemplateModalOpen, setIsCreateTemplateModalOpen] = useState(false);

  const projects = data?.proyectos ?? [];

  // Filtrado y ordenamiento de proyectos
  const filteredProjects = useMemo(() => {
    return projects
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
        onBack={() => setActiveProjectId(null)} 
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 bg-transparent">
        <Loader2 className="w-8 h-8 animate-spin text-[#ffffff6b]" />
        <p className="text-xs font-bold text-[#ffffff6b]">Cargando proyectos...</p>
      </div>
    );
  }

  // Cálculos KPIs globales
  const totalProjects = projects.length;
  const activeCount = projects.filter((p) => !DONE_STATES.has(p.estadoProyecto || p.estado)).length;
  const completedCount = projects.filter((p) => DONE_STATES.has(p.estadoProyecto || p.estado)).length;
  const totalBudget = projects.reduce((acc, p) => acc + (p.costo || 0), 0);

  return (
    <div className="p-6 h-full flex flex-col overflow-y-auto custom-scrollbar bg-transparent text-[#ffffffd6]">
      
      {/* 12-Column Grid Container (Idéntico a Work / HomeDashboard) */}
      <div className="w-full grid grid-cols-12 gap-5 items-stretch max-w-full">
        
        {/* Left Section (3 Columns): Rectángulo Reservado de Control & Resumen */}
        <div className="col-span-3 flex flex-col min-h-[900px] rounded-[28px] bg-[#121212] border border-white/[0.08] shadow-sm overflow-hidden">
          {/* Métricas KPI de Ancho Total (Monocromático, Limpio y Sin Íconos) */}
          <div className="w-full flex flex-col">
            <div className="w-full px-5 py-4 border-b border-white/10 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffffff6b]">Activos</span>
              <div className="text-3xl font-bold text-[#ffffffd6] mt-1">{activeCount}</div>
            </div>

            <div className="w-full px-5 py-4 border-b border-white/10 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffffff6b]">Completados</span>
              <div className="text-3xl font-bold text-[#ffffffd6] mt-1">{completedCount}</div>
            </div>

            <div className="w-full px-5 py-4 border-b border-white/10 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffffff6b]">Presupuesto Total</span>
              <div className="text-3xl font-bold text-[#ffffffd6] mt-1">
                ${totalBudget.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Sección de Plantillas Sincronizadas en Tiempo Real */}
          <div className="p-5 flex flex-col gap-3 flex-1 overflow-y-auto custom-scrollbar border-t border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffffff6b]">Plantillas</span>
              <button
                type="button"
                onClick={() => {
                  setIsCreateTemplateModalOpen(true);
                  playSound("click");
                }}
                className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#ffffff6b] hover:text-white transition-colors text-[10px] font-bold flex items-center gap-1 cursor-pointer border border-white/10"
                title="Crear nueva plantilla"
              >
                <Plus className="w-3 h-3" />
                <span>Nueva</span>
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              {templates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={(e) => {
                    playSound("click");
                    const rect = e.currentTarget.getBoundingClientRect();
                    if (onCreateProject) {
                      onCreateProject({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
                    } else {
                      openModal({ type: "proyecto", id: "new" });
                    }
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/[0.025] hover:bg-white/[0.06] border border-white/[0.05] hover:border-white/15 transition-all cursor-pointer group shadow-sm select-none"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-white/70 group-hover:text-white group-hover:scale-105 transition-all">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-[#ffffffd6] group-hover:text-white truncate">
                        {tmpl.name}
                      </span>
                      <span className="text-[10px] text-[#ffffff6b] truncate">
                        {tmpl.category || "General"}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-white/50 group-hover:text-white/80 shrink-0">
                    {tmpl.tasks?.length || tmpl.tasksCount || 3} tareas
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Section (9 Columns): Catálogo de Proyectos */}
        <div className="col-span-9 flex flex-col">
          {/* ── CATALOGO DE PROYECTOS (VISTA EN GRID) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0">
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
      </div>

      {/* Modal de Creación de Plantilla Sincronizado */}
      <CreateTemplateModal
        isOpen={isCreateTemplateModalOpen}
        onClose={() => setIsCreateTemplateModalOpen(false)}
        onTemplateCreated={async (newTmpl) => {
          await createTemplate(newTmpl);
          setIsCreateTemplateModalOpen(false);
          playSound("pop");
        }}
      />
    </div>
  );
}
