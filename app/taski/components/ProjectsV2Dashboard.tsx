"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FolderKanban, Search, Plus, Filter, Calendar, DollarSign, 
  CheckCircle2, Clock, Users, ArrowUpRight, Sparkles, Layers,
  ChevronRight, AlertCircle, Briefcase, Tag, TrendingUp
} from "lucide-react";
import { Project } from "./ProjectDashboard";
import ProjectCoverFormats from "./ProjectCoverFormats";
import { getSingleSourceProjectColor } from "@/lib/utils";

interface ProjectsV2DashboardProps {
  projects: Project[];
  onSelectProject: (projectId: number | string) => void;
  onEditProject?: (project: Project) => void;
  onNewProject?: () => void;
  isNightMode?: boolean;
  isNeumorphic?: boolean;
}

const formatTimeAgo = (dateInput?: string | Date | number): string => {
  if (!dateInput) return "hace un momento";
  const now = new Date();
  const currentYear = now.getFullYear();

  let date: Date | null = null;

  if (dateInput instanceof Date) {
    date = isNaN(dateInput.getTime()) ? null : dateInput;
  } else if (typeof dateInput === "number") {
    const d = new Date(dateInput);
    date = isNaN(d.getTime()) ? null : d;
  } else {
    const str = String(dateInput).trim();
    if (!str || str === "-") return "hace un momento";

    if (str.includes("T") || str.includes("Z")) {
      const d = new Date(str);
      if (!isNaN(d.getTime())) date = d;
    } else if (str.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const d = new Date(`${str}T00:00:00`);
      if (!isNaN(d.getTime())) date = d;
    } else {
      const friendlyMatch = str.match(/^(\d{1,2})\s+([A-Za-z]{3,4})$/i);
      if (friendlyMatch) {
        const day = friendlyMatch[1];
        const monthStr = friendlyMatch[2];
        const d = new Date(`${day} ${monthStr} ${currentYear}`);
        if (!isNaN(d.getTime())) {
          if (d.getTime() > now.getTime() + 86400000) {
            d.setFullYear(currentYear - 1);
          }
          date = d;
        }
      }

      if (!date) {
        let d = new Date(str);
        if (!isNaN(d.getTime())) {
          if (d.getFullYear() < 2015 && !str.includes("20") && !str.includes("19")) {
            d.setFullYear(currentYear);
            if (d.getTime() > now.getTime() + 86400000) {
              d.setFullYear(currentYear - 1);
            }
          }
          date = d;
        }
      }
    }
  }

  if (!date) return "hace un momento";

  const diffMs = now.getTime() - date.getTime();

  if (diffMs <= 0 || diffMs < 60000) {
    return "hace un momento";
  }

  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 60) {
    return `hace ${diffMins} min`;
  }

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return `hace ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `hace ${diffDays} ${diffDays === 1 ? "día" : "días"}`;
  }

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) {
    return `hace ${diffWeeks} ${diffWeeks === 1 ? "semana" : "semanas"}`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `hace ${diffMonths} ${diffMonths === 1 ? "mes" : "meses"}`;
  }

  const diffYears = Math.floor(diffDays / 365);
  return `hace ${diffYears} ${diffYears === 1 ? "año" : "años"}`;
};

export function ProjectsV2Dashboard({
  projects,
  onSelectProject,
  onEditProject,
  onNewProject,
  isNightMode = true,
  isNeumorphic = true,
}: ProjectsV2DashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Todos");
  const [sortBy, setSortBy] = useState<"recientes" | "nombre" | "progreso" | "costo">("recientes");

  // Extract unique statuses for filter pills
  const availableStatuses = useMemo(() => {
    const statuses = new Set<string>();
    projects.forEach((p) => {
      if (p.status) statuses.add(p.status);
    });
    return ["Todos", ...Array.from(statuses)];
  }, [projects]);

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) => {
        const matchesSearch =
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.desc && p.desc.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesStatus =
          statusFilter === "Todos" || p.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "nombre") {
          return a.title.localeCompare(b.title);
        }
        if (sortBy === "progreso") {
          const percA = parseInt(a.percent || "0", 10);
          const percB = parseInt(b.percent || "0", 10);
          return percB - percA;
        }
        if (sortBy === "costo") {
          const costA = parseFloat((a.cost || "0").replace(/[^0-9.]/g, "")) || 0;
          const costB = parseFloat((b.cost || "0").replace(/[^0-9.]/g, "")) || 0;
          return costB - costA;
        }
        return 0;
      });
  }, [projects, searchQuery, statusFilter, sortBy]);

  // Overall metrics calculation
  const totalProjects = projects.length;
  const activeCount = projects.filter((p) => p.status !== "Completado" && p.status !== "✅ Completado").length;
  const completedCount = projects.filter((p) => p.status === "Completado" || p.status === "✅ Completado").length;
  const avgProgress = useMemo(() => {
    if (!projects.length) return 0;
    const total = projects.reduce((acc, p) => acc + (parseInt(p.percent || "0", 10) || 0), 0);
    return Math.round(total / projects.length);
  }, [projects]);

  return (
    <div className="w-full h-full flex flex-col min-h-0 overflow-y-auto custom-scrollbar px-8 py-6 pb-24">
      {/* ── HEADER KPI BAR ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className={`p-5 rounded-2xl border transition-all ${
          isNightMode 
            ? "bg-white/[0.03] border-white/10 hover:border-white/20" 
            : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Proyectos Totales</span>
            <FolderKanban className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-black">{totalProjects}</div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Campaña global registrada</p>
        </div>

        <div className={`p-5 rounded-2xl border transition-all ${
          isNightMode 
            ? "bg-white/[0.03] border-white/10 hover:border-white/20" 
            : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Activos</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400">{activeCount}</div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">En ejecucion / producción</p>
        </div>

        <div className={`p-5 rounded-2xl border transition-all ${
          isNightMode 
            ? "bg-white/[0.03] border-white/10 hover:border-white/20" 
            : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Completados</span>
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-black text-purple-400">{completedCount}</div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Entregados satisfactoriamente</p>
        </div>

        <div className={`p-5 rounded-2xl border transition-all ${
          isNightMode 
            ? "bg-white/[0.03] border-white/10 hover:border-white/20" 
            : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Progreso Medio</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-400">{avgProgress}%</div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Avance global de marca</p>
        </div>
      </div>

      {/* ── CONTROLS & FILTER BAR ── */}
      <div className={`p-4 rounded-2xl border mb-8 flex flex-col md:flex-row items-center justify-between gap-4 ${
        isNightMode ? "bg-white/[0.02] border-white/10" : "bg-white border-slate-200 shadow-sm"
      }`}>
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar proyecto o cliente..."
            className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs font-bold outline-none border transition-all ${
              isNightMode 
                ? "bg-white/5 border-white/10 text-white focus:border-blue-500/50" 
                : "bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500"
            }`}
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto py-1 hide-scrollbar">
          {availableStatuses.map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold uppercase tracking-wider transition-all border whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? "bg-blue-600/20 text-blue-400 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                  : isNightMode
                    ? "bg-white/5 text-slate-400 border-white/5 hover:text-white hover:bg-white/10"
                    : "bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Sort & Action */}
        <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-end">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className={`px-3 py-2 rounded-xl text-xs font-extrabold outline-none border cursor-pointer ${
              isNightMode 
                ? "bg-white/5 border-white/10 text-slate-300" 
                : "bg-slate-50 border-slate-200 text-slate-800"
            }`}
          >
            <option value="recientes">Ordenar: Más Recientes</option>
            <option value="progreso">Ordenar: Mayor Progreso</option>
            <option value="nombre">Ordenar: Nombre (A-Z)</option>
            <option value="costo">Ordenar: Presupuesto</option>
          </select>

          {onNewProject && (
            <button
              onClick={onNewProject}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-blue-600 text-white hover:bg-blue-500 transition-all shadow-lg hover:shadow-blue-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Proyecto</span>
            </button>
          )}
        </div>
      </div>

      {/* ── PROJECT CARDS GRID (ESTILO VENTANA CREAR PROYECTO) ── */}
      {filteredProjects.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
          <FolderKanban className="w-12 h-12 mb-3" />
          <h4 className="text-lg font-black">No se encontraron proyectos</h4>
          <p className="text-xs">Prueba ajustando el filtro de búsqueda o estado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProjects.map((p) => {
            const cardBgColor = getSingleSourceProjectColor(p).hslCss;
            const tasksList = p.tasks || [];
            const taskCount = tasksList.length;

            return (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                onClick={() => onSelectProject(p.id)}
                className="group relative flex flex-col bg-[#262626] border border-white/10 hover:border-white/25 rounded-2xl overflow-hidden shadow-xl transition-all h-[240px] cursor-pointer hover:shadow-2xl hover:-translate-y-1"
              >
                {/* Visual Cover Top - HSL Color & Format Mosaic */}
                <div
                  className="flex-1 relative overflow-hidden p-3 flex flex-col justify-start min-h-[140px]"
                  style={{ backgroundColor: cardBgColor }}
                >
                  {/* Status Overlay Badge */}
                  <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {p.status || "Activo"}
                    </span>
                  </div>

                  {/* Formats Bento Cover Mosaic */}
                  <div className="absolute inset-0 flex items-center justify-center p-3 pointer-events-none z-0">
                    <ProjectCoverFormats tasks={p.tasks} />
                  </div>

                  {/* Hover Overlay Action Buttons */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-3 z-20 gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProject(p.id);
                      }}
                      className="bg-white hover:bg-slate-100 text-slate-950 font-bold px-4 py-1.5 rounded-full text-xs shadow-xl active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Ver proyecto</span>
                    </button>
                    {onEditProject && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditProject(p);
                        }}
                        className="bg-white/20 hover:bg-white/30 text-white font-bold px-3.5 py-1.5 rounded-full text-xs backdrop-blur-md border border-white/20 active:scale-95 transition-all cursor-pointer"
                      >
                        <span>Editar</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Footer Metadata */}
                <div className="p-3.5 bg-[#1e1e1e] border-t border-white/5 shrink-0 flex flex-col justify-center min-h-[76px]">
                  <div className="text-[14px] font-bold text-white/95 truncate" title={p.title}>
                    {p.title}
                  </div>
                  <div className="flex items-center justify-between mt-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <span className="text-[12px] font-medium text-white/50 truncate" title={p.client || "Brandex"}>
                        {p.client || "Brandex"}
                      </span>
                      <span className="text-[12px] text-white/40 shrink-0">
                        • {formatTimeAgo(p.fecha_creacion || (p as any).createdAt || p.startDate)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[12px] text-white/60">
                    <span className="font-semibold text-slate-400">
                      {taskCount} {taskCount === 1 ? "tarea" : "tareas"}
                    </span>
                    {p.cost && (
                      <span className="font-black text-emerald-400">
                        {p.cost}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
