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


// ── 4. COMPONENTE PRINCIPAL PROJECTS VIEW ────────────────────────────────────
export function ProjectsView() {
  const { data, isLoading } = useData();
  const openModal = useUIStore((s) => s.openModal);

  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [sortBy, setSortBy] = useState<"recientes" | "nombre" | "progreso" | "costo">("recientes");
  const [displayMode, setDisplayMode] = useState<"grid" | "list">("grid");
  const [cardVariant, setCardVariant] = useState<"cover" | "full">("cover");

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
      
      {/* ── CABECERA KPI BAR (Superficies Sólidas #181818 & Trazos Finos) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-5 rounded-2xl bg-[#181818] border border-white/10 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffffff6b]">Proyectos Registrados</span>
            <FolderKanban className="w-4 h-4 text-[#ffffff6b]" />
          </div>
          <div className="text-3xl font-bold text-[#ffffffd6] mt-2">{totalProjects}</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#181818] border border-white/10 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffffff6b]">Proyectos Activos</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-emerald-400 mt-2">{activeCount}</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#181818] border border-white/10 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffffff6b]">Completados</span>
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-cyan-400 mt-2">{completedCount}</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#181818] border border-white/10 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffffff6b]">Presupuesto Global</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-[#ffffffd6] mt-2">
            ${totalBudget.toLocaleString()}
          </div>
        </div>
      </div>

      {/* ── BARRA DE BÚSQUEDA & FILTROS ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        
        {/* Buscador Integrado */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#ffffff6b]" />
          <input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar proyectos..."
            className="w-full bg-[#181818] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-[#ffffffd6] outline-none focus:border-white/30 shadow-sm"
          />
        </div>

        {/* Filtros, Selector de Estilo de Tarjeta & Botón Nuevo */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          
          {/* Switcher de Estilo de Tarjeta (Portada vs Color Completo) */}
          <div className="flex items-center rounded-xl p-1 bg-[#181818] border border-white/10 text-xs font-bold">
            <button 
              onClick={() => setCardVariant("cover")}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-colors text-[11px]",
                cardVariant === "cover" ? "bg-white/15 text-white" : "text-[#ffffff6b] hover:text-white"
              )}
              title="Estilo Portada (Imagen 1)"
            >
              Portada
            </button>
            <button 
              onClick={() => setCardVariant("full")}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-colors text-[11px]",
                cardVariant === "full" ? "bg-white/15 text-white" : "text-[#ffffff6b] hover:text-white"
              )}
              title="Estilo Color Completo (Imagen 2)"
            >
              Color
            </button>
          </div>

          {/* Switcher de Vista Grid / Lista */}
          <div className="flex items-center rounded-xl p-1 bg-[#181818] border border-white/10">
            <button 
              onClick={() => setDisplayMode("grid")}
              className={cn(
                "p-1.5 rounded-lg text-xs transition-colors",
                displayMode === "grid" ? "bg-white/15 text-white" : "text-[#ffffff6b] hover:text-white"
              )}
              title="Vista de Cuadrícula Bento"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setDisplayMode("list")}
              className={cn(
                "p-1.5 rounded-lg text-xs transition-colors",
                displayMode === "list" ? "bg-white/15 text-white" : "text-[#ffffff6b] hover:text-white"
              )}
              title="Vista Compacta de Lista"
            >
              <Table className="w-4 h-4" />
            </button>
          </div>

          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#181818] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#ffffffd6] outline-none shadow-sm cursor-pointer"
          >
            <option value="Todos">Todos los Estatus</option>
            {PROJ_STATUS_OPTS.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>

          {/* Botón Nuevo Proyecto */}
          <button 
            onClick={() => openModal({ type: "proyecto", id: "new" })}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-white/90 text-black text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Proyecto</span>
          </button>
        </div>
      </div>

      {/* ── CATALOGO DE PROYECTOS (VISTA EN GRID DE 5 COLUMNAS O TABLA) ── */}
      {displayMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-0">
          {filteredProjects.map((p) => (
            <ProjectCardItem 
              key={p.id} 
              projectId={p.id} 
              onOpenFullScreen={(id) => setActiveProjectId(id)}
              cardStyle={cardVariant}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredProjects.map((p) => (
            <ProjectListItem 
              key={p.id}
              projectId={p.id}
              onOpenFullScreen={(id) => setActiveProjectId(id)}
            />
          ))}
        </div>
      )}

      {/* Estado Vacío */}
      {filteredProjects.length === 0 && (
        <div className="py-24 flex flex-col items-center justify-center text-center opacity-40">
          <Briefcase className="w-14 h-14 mb-4 text-[#ffffff6b]" />
          <h4 className="text-xl font-bold text-[#ffffffd6]">No se encontraron proyectos</h4>
          <p className="text-xs text-[#ffffff6b] mt-1 max-w-sm">
            Prueba ajustando los filtros de búsqueda o crea un nuevo proyecto de marca.
          </p>
        </div>
      )}
    </div>
  );
}
