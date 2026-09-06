"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  LayoutGrid,
  Table,
  CalendarDays,
  ListFilter,
  X
} from "lucide-react";
import { SaveStatusBadge } from "@/app/taski/components/SaveStatusBadge";
import { playSound } from "@/app/taski/utils/audio";

type HomeView = "buscar" | "kanban" | "tabla" | "timeline";
type GroupingMode = "fecha" | "cliente" | "prioridad" | "estado";

interface TaskiTopbarProps {
  activeTab: string;
  greetingTitle: string;
  greetingSubtitle: string;
  isNightMode?: boolean;
  homeView?: HomeView;
  setHomeView?: (view: HomeView) => void;
  previousHomeView?: "kanban" | "tabla" | "timeline";
  setPreviousHomeView?: (view: "kanban" | "tabla" | "timeline") => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  groupingMode?: GroupingMode;
  onSetGroupingMode?: (mode: GroupingMode) => void;
  timelineHideCompleted?: boolean;
  onToggleTimelineHideCompleted?: () => void;
  timelineSortBy?: "recientes" | "urgentes" | "alfabetico";
  onSetTimelineSortBy?: (sort: "recientes" | "urgentes" | "alfabetico") => void;
}

export function TaskiTopbar({
  activeTab,
  greetingTitle,
  greetingSubtitle,
  isNightMode = true,
  homeView = "kanban",
  setHomeView,
  previousHomeView = "kanban",
  setPreviousHomeView,
  searchQuery = "",
  setSearchQuery,
  groupingMode = "fecha",
  onSetGroupingMode,
  timelineHideCompleted = false,
  onToggleTimelineHideCompleted,
  timelineSortBy = "recientes",
  onSetTimelineSortBy,
}: TaskiTopbarProps) {
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);

  const isSearchActive = activeTab === "home" && homeView === "buscar";

  const getTabTitle = () => {
    switch (activeTab) {
      case "proyectos":
        return { title: "Proyectos", subtitle: "" };
      case "equipo":
        return { title: "Espacio de Equipo", subtitle: "colaboradores y carga de trabajo" };
      case "clientes":
        return { title: "Directorio de Clientes", subtitle: "marcas asociadas y contratos" };
      case "crm":
        return { title: "Gestión CRM", subtitle: "pipeline comercial y prospectos" };
      case "propuestas":
        return { title: "Propuestas Comerciales", subtitle: "cotizaciones, presupuestos y pitches" };
      case "finanzas":
        return { title: "Métricas Financieras", subtitle: "facturación y margen operativo" };
      case "recursos":
        return { title: "Biblioteca de Recursos", subtitle: "repositorio de assets y documentación" };
      case "diagramas":
        return { title: "Centro de Diagramas & Arquitectura", subtitle: "documentación visual interactiva y esquemas del sistema" };
      case "superadmin":
        return { title: "Consola SuperAdmin", subtitle: "control de lanzamientos y usuarios beta" };
      case "ajustes":
        return { title: "Ajustes del Sistema", subtitle: "configuración y preferencias" };
      default:
        return { title: greetingTitle, subtitle: greetingSubtitle };
    }
  };

  const currentHeaderInfo = getTabTitle();

  return (
    <div className="w-full h-full grid grid-cols-12 gap-5 items-center">
      {activeTab === "home" ? (
        <>
          {/* Left Column (3 cols) above Sessions Column: Dynamic Title */}
          <div className="col-span-3 flex items-center h-full min-w-0">
            <motion.div
              animate={{ opacity: isSearchActive ? 0 : 1 }}
              style={{
                pointerEvents: isSearchActive ? "none" : "auto",
                display: isSearchActive ? "none" : "flex",
              }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center shrink-0 overflow-hidden"
            >
              <div className="flex flex-row items-center gap-3.5 leading-tight shrink-0 select-none whitespace-nowrap">
                <span
                  className={`text-2xl md:text-[26px] font-medium tracking-tight transition-colors duration-500 ${
                    isNightMode ? "text-[#FFFFFFD6]" : "text-slate-900"
                  }`}
                >
                  {currentHeaderInfo.title}
                </span>
                <span
                  className={`text-2xl md:text-[26px] font-normal tracking-tight transition-colors duration-500 ${
                    isNightMode ? "text-[#ffffff6b]" : "text-slate-600"
                  }`}
                >
                  {currentHeaderInfo.subtitle}
                </span>
              </div>
            </motion.div>
          </div>

          {/* Right Column (9 cols) centered over Kanban */}
          <div className="col-span-9 flex items-center h-full gap-2">
            <div className="flex-1 basis-0" />

            {/* CENTER: View Switcher */}
            {setHomeView && (
              <div className="flex-none flex items-center justify-center">
                {/* Close Search Button */}
                <AnimatePresence>
                  {isSearchActive && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8, width: 0, marginRight: 0 }}
                      animate={{ opacity: 1, scale: 1, width: 32, marginRight: 8 }}
                      exit={{ opacity: 0, scale: 0.8, width: 0, marginRight: 0 }}
                      transition={{ type: "spring", stiffness: 350, damping: 28 }}
                      type="button"
                      onClick={() => {
                        setHomeView(previousHomeView);
                        playSound("click");
                      }}
                      className="flex items-center justify-center h-8 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 cursor-pointer shrink-0 z-50 overflow-hidden"
                      title="Cerrar búsqueda"
                    >
                      <X className="w-4 h-4 shrink-0" />
                    </motion.button>
                  )}
                </AnimatePresence>

                <motion.div
                  layout
                  className={`flex items-center rounded-full p-1 w-fit shrink-0 border transition-colors duration-300 ${
                    isNightMode
                      ? "bg-[#121212] border-[#ffffff1f]"
                      : "bg-slate-100 border-slate-200"
                  }`}
                >
                  {/* Search Tab */}
                  <motion.button
                    layout
                    type="button"
                    onHoverStart={() => !isSearchActive && setHoveredTab("buscar")}
                    onHoverEnd={() => setHoveredTab(null)}
                    onClick={() => {
                      if (homeView !== "buscar" && setPreviousHomeView) {
                        setPreviousHomeView(homeView);
                      }
                      setHomeView("buscar");
                      playSound("click");
                    }}
                    animate={{
                      width: isSearchActive ? 300 : hoveredTab === "buscar" ? 125 : 95,
                    }}
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                    className={`relative z-10 box-border inline-flex h-8 items-center justify-center rounded-full whitespace-nowrap select-none gap-1.5 text-xs font-bold transition-colors duration-200 ${
                      isSearchActive
                        ? isNightMode
                          ? "text-[#ffffffd6] px-3"
                          : "text-slate-900 px-3"
                        : isNightMode
                        ? "text-[#ffffffd6] hover:text-white cursor-pointer px-0"
                        : "text-slate-600 hover:text-slate-900 cursor-pointer px-0"
                    }`}
                  >
                    {homeView === "buscar" && (
                      <motion.span
                        layoutId="activeViewIndicator"
                        className={`absolute inset-0 rounded-full border ${
                          isNightMode
                            ? "bg-[#1f1f1f] border-[#ffffff1f] shadow-sm"
                            : "bg-white border-slate-200 shadow-sm"
                        }`}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    {!isSearchActive && hoveredTab === "buscar" && (
                      <motion.span
                        layoutId="hoverViewIndicator"
                        className={`absolute inset-0 rounded-full border ${
                          isNightMode
                            ? "bg-[#282828] border-white/10"
                            : "bg-slate-100 border-slate-200/60"
                        }`}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Search
                      className={`w-[13.55px] h-[13.55px] shrink-0 relative z-10 ${
                        isNightMode ? "text-[#ffffffd6]" : "text-slate-900"
                      }`}
                    />
                    {isSearchActive ? (
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Buscar proyectos o tareas..."
                        className={`bg-transparent border-none outline-none text-xs w-full relative z-10 ${
                          isNightMode
                            ? "text-[#ffffffd6] placeholder:text-[#ffffff6b]"
                            : "text-slate-900 font-semibold placeholder:text-slate-400"
                        }`}
                        autoFocus
                      />
                    ) : (
                      <span className={`relative z-10 ${isNightMode ? "text-[#ffffffd6]" : ""}`}>
                        Search
                      </span>
                    )}
                  </motion.button>

                  {/* Kanban Tab */}
                  <motion.button
                    layout
                    type="button"
                    onHoverStart={() => setHoveredTab("kanban")}
                    onHoverEnd={() => setHoveredTab(null)}
                    onClick={() => {
                      setHomeView("kanban");
                      playSound("click");
                    }}
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                    className={`relative z-10 box-border inline-flex h-8 items-center justify-center rounded-full whitespace-nowrap select-none gap-1.5 px-4 text-xs font-bold transition-colors duration-200 ${
                      homeView === "kanban"
                        ? isNightMode
                          ? "text-[#ffffffd6]"
                          : "text-slate-900"
                        : isNightMode
                        ? "text-[#ffffffd6] hover:text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {homeView === "kanban" && (
                      <motion.span
                        layoutId="activeViewIndicator"
                        className={`absolute inset-0 rounded-full border ${
                          isNightMode
                            ? "bg-[#1f1f1f] border-[#ffffff1f] shadow-sm"
                            : "bg-white border-slate-200 shadow-sm"
                        }`}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    {hoveredTab === "kanban" && (
                      <motion.span
                        layoutId="hoverViewIndicator"
                        className={`absolute inset-0 rounded-full border ${
                          isNightMode
                            ? "bg-[#282828] border-white/10"
                            : "bg-slate-100 border-slate-200/60"
                        }`}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <LayoutGrid
                      className={`w-[13.55px] h-[13.55px] shrink-0 relative z-10 ${
                        isNightMode
                          ? "text-[#ffffffd6]"
                          : homeView === "kanban"
                          ? "text-slate-900"
                          : "text-slate-700"
                      }`}
                    />
                    <span className="relative z-10">Kanban</span>
                  </motion.button>

                  {/* Tabla Tab */}
                  <motion.button
                    layout
                    type="button"
                    onHoverStart={() => setHoveredTab("tabla")}
                    onHoverEnd={() => setHoveredTab(null)}
                    onClick={() => {
                      setHomeView("tabla");
                      playSound("click");
                    }}
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                    className={`relative z-10 box-border inline-flex h-8 items-center justify-center rounded-full whitespace-nowrap select-none gap-1.5 px-4 text-xs font-bold transition-colors duration-200 ${
                      homeView === "tabla"
                        ? isNightMode
                          ? "text-[#ffffffd6]"
                          : "text-slate-900"
                        : isNightMode
                        ? "text-[#ffffffd6] hover:text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {homeView === "tabla" && (
                      <motion.span
                        layoutId="activeViewIndicator"
                        className={`absolute inset-0 rounded-full border ${
                          isNightMode
                            ? "bg-[#1f1f1f] border-[#ffffff1f] shadow-sm"
                            : "bg-white border-slate-200 shadow-sm"
                        }`}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    {hoveredTab === "tabla" && (
                      <motion.span
                        layoutId="hoverViewIndicator"
                        className={`absolute inset-0 rounded-full border ${
                          isNightMode
                            ? "bg-[#282828] border-white/10"
                            : "bg-slate-100 border-slate-200/60"
                        }`}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Table
                      className={`w-[13.55px] h-[13.55px] shrink-0 relative z-10 ${
                        isNightMode
                          ? "text-[#ffffffd6]"
                          : homeView === "tabla"
                          ? "text-slate-900"
                          : "text-slate-700"
                      }`}
                    />
                    <span className="relative z-10">Base de datos</span>
                  </motion.button>

                  {/* Timeline Tab */}
                  <motion.button
                    layout
                    type="button"
                    onHoverStart={() => setHoveredTab("timeline")}
                    onHoverEnd={() => setHoveredTab(null)}
                    onClick={() => {
                      setHomeView("timeline");
                      playSound("click");
                    }}
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                    className={`relative z-10 box-border inline-flex h-8 items-center justify-center rounded-full whitespace-nowrap select-none gap-1.5 px-4 text-xs font-bold transition-colors duration-200 ${
                      homeView === "timeline"
                        ? isNightMode
                          ? "text-[#ffffffd6]"
                          : "text-slate-900"
                        : isNightMode
                        ? "text-[#ffffffd6] hover:text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {homeView === "timeline" && (
                      <motion.span
                        layoutId="activeViewIndicator"
                        className={`absolute inset-0 rounded-full border ${
                          isNightMode
                            ? "bg-[#1f1f1f] border-[#ffffff1f] shadow-sm"
                            : "bg-white border-slate-200 shadow-sm"
                        }`}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    {hoveredTab === "timeline" && (
                      <motion.span
                        layoutId="hoverViewIndicator"
                        className={`absolute inset-0 rounded-full border ${
                          isNightMode
                            ? "bg-[#282828] border-white/10"
                            : "bg-slate-100 border-slate-200/60"
                        }`}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <CalendarDays
                      className={`w-[13.55px] h-[13.55px] shrink-0 relative z-10 ${
                        isNightMode
                          ? "text-[#ffffffd6]"
                          : homeView === "timeline"
                          ? "text-slate-900"
                          : "text-slate-700"
                      }`}
                    />
                    <span className="relative z-10">Timeline</span>
                  </motion.button>
                </motion.div>
              </div>
            )}

            {/* RIGHT: Actions */}
            <div className="flex-1 basis-0 flex items-center justify-end gap-3">
              {onSetGroupingMode && (
                <div className="relative">
                  <button
                    onClick={() => {
                      playSound("click");
                      setGroupDropdownOpen(!groupDropdownOpen);
                    }}
                    title="Agrupar y ordenar"
                    className={`flex items-center justify-center h-8 w-8 rounded-full border transition-all duration-200 shrink-0 shadow-sm active:scale-95 ${
                      isNightMode
                        ? "bg-[#1f1f1f] border-[#ffffff1f] text-[#ffffffd6] hover:bg-[#282828] hover:text-white"
                        : "bg-[oklch(0.55_0.01_286_/_4%)] border-slate-200 text-slate-750 hover:text-slate-900 hover:border-slate-300"
                    }`}
                  >
                    <ListFilter
                      className={`w-[13.55px] h-[13.55px] ${
                        isNightMode ? "text-[#ffffffd6]" : "text-slate-700"
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {groupDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute right-0 mt-2.5 w-52 rounded-2xl border backdrop-blur-md shadow-2xl z-[150] p-2 flex flex-col gap-0.5 ${
                          isNightMode
                            ? "bg-slate-950/90 border-white/10 text-slate-350 shadow-black/80"
                            : "bg-white/95 border-slate-200/80 text-slate-700 shadow-slate-200/50"
                        }`}
                      >
                        {homeView === "timeline" ? (
                          <>
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2.5 py-1 select-none">
                              Filtros de Timeline
                            </div>

                            <button
                              onClick={() => {
                                onToggleTimelineHideCompleted?.();
                                playSound("click");
                              }}
                              className={`text-left px-2.5 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-between transition-all duration-150 ${
                                timelineHideCompleted
                                  ? isNightMode
                                    ? "bg-white/10 text-white shadow-sm"
                                    : "bg-slate-100 text-slate-950 font-bold"
                                  : isNightMode
                                  ? "hover:bg-white/[0.04] hover:text-slate-200"
                                  : "hover:bg-slate-50 hover:text-slate-900"
                              }`}
                            >
                              <span>Ocultar completados</span>
                              {timelineHideCompleted && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              )}
                            </button>

                            <div className="h-px bg-white/10 my-1" />

                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2.5 py-1 select-none">
                              Ordenar proyectos
                            </div>

                            <button
                              onClick={() => {
                                onSetTimelineSortBy?.("recientes");
                                setGroupDropdownOpen(false);
                                playSound("click");
                              }}
                              className={`text-left px-2.5 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-between transition-all duration-150 ${
                                timelineSortBy === "recientes"
                                  ? isNightMode
                                    ? "bg-white/10 text-white shadow-sm"
                                    : "bg-slate-100 text-slate-950 font-bold"
                                  : isNightMode
                                  ? "hover:bg-white/[0.04] hover:text-slate-200"
                                  : "hover:bg-slate-50 hover:text-slate-900"
                              }`}
                            >
                              <span>Más recientes primero</span>
                              {timelineSortBy === "recientes" && (
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                              )}
                            </button>

                            <button
                              onClick={() => {
                                onSetTimelineSortBy?.("urgentes");
                                setGroupDropdownOpen(false);
                                playSound("click");
                              }}
                              className={`text-left px-2.5 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-between transition-all duration-150 ${
                                timelineSortBy === "urgentes"
                                  ? isNightMode
                                    ? "bg-white/10 text-white shadow-sm"
                                    : "bg-slate-100 text-slate-950 font-bold"
                                  : isNightMode
                                  ? "hover:bg-white/[0.04] hover:text-slate-200"
                                  : "hover:bg-slate-50 hover:text-slate-900"
                              }`}
                            >
                              <span>Atrasados / Urgentes</span>
                              {timelineSortBy === "urgentes" && (
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                              )}
                            </button>

                            <button
                              onClick={() => {
                                onSetTimelineSortBy?.("alfabetico");
                                setGroupDropdownOpen(false);
                                playSound("click");
                              }}
                              className={`text-left px-2.5 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-between transition-all duration-150 ${
                                timelineSortBy === "alfabetico"
                                  ? isNightMode
                                    ? "bg-white/10 text-white shadow-sm"
                                    : "bg-slate-100 text-slate-950 font-bold"
                                  : isNightMode
                                  ? "hover:bg-white/[0.04] hover:text-slate-200"
                                  : "hover:bg-slate-50 hover:text-slate-900"
                              }`}
                            >
                              <span>Alfabético (A - Z)</span>
                              {timelineSortBy === "alfabetico" && (
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                              )}
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2.5 py-1 select-none">
                              Agrupar por
                            </div>

                            <button
                              onClick={() => {
                                onSetGroupingMode("fecha");
                                setGroupDropdownOpen(false);
                              }}
                              className={`text-left px-2.5 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-between transition-all duration-150 ${
                                groupingMode === "fecha"
                                  ? isNightMode
                                    ? "bg-white/10 text-white shadow-sm"
                                    : "bg-slate-100 text-slate-950 font-bold"
                                  : isNightMode
                                  ? "hover:bg-white/[0.04] hover:text-slate-200"
                                  : "hover:bg-slate-50 hover:text-slate-900"
                              }`}
                            >
                              <span>Fecha de entrega</span>
                              {groupingMode === "fecha" && (
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                              )}
                            </button>

                            <button
                              onClick={() => {
                                onSetGroupingMode("cliente");
                                setGroupDropdownOpen(false);
                              }}
                              className={`text-left px-2.5 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-between transition-all duration-150 ${
                                groupingMode === "cliente"
                                  ? isNightMode
                                    ? "bg-white/10 text-white shadow-sm"
                                    : "bg-slate-100 text-slate-950 font-bold"
                                  : isNightMode
                                  ? "hover:bg-white/[0.04] hover:text-slate-200"
                                  : "hover:bg-slate-50 hover:text-slate-900"
                              }`}
                            >
                              <span>Cliente</span>
                              {groupingMode === "cliente" && (
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                              )}
                            </button>

                            <button
                              onClick={() => {
                                onSetGroupingMode("prioridad");
                                setGroupDropdownOpen(false);
                              }}
                              className={`text-left px-2.5 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-between transition-all duration-150 ${
                                groupingMode === "prioridad"
                                  ? isNightMode
                                    ? "bg-white/10 text-white shadow-sm"
                                    : "bg-slate-100 text-slate-950 font-bold"
                                  : isNightMode
                                  ? "hover:bg-white/[0.04] hover:text-slate-200"
                                  : "hover:bg-slate-50 hover:text-slate-900"
                              }`}
                            >
                              <span>Prioridad</span>
                              {groupingMode === "prioridad" && (
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                              )}
                            </button>

                            <button
                              onClick={() => {
                                onSetGroupingMode("estado");
                                setGroupDropdownOpen(false);
                              }}
                              className={`text-left px-2.5 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-between transition-all duration-150 ${
                                groupingMode === "estado"
                                  ? isNightMode
                                    ? "bg-white/10 text-white shadow-sm"
                                    : "bg-slate-100 text-slate-950 font-bold"
                                  : isNightMode
                                  ? "hover:bg-white/[0.04] hover:text-slate-200"
                                  : "hover:bg-slate-50 hover:text-slate-900"
                              }`}
                            >
                              <span>Estado de tarea</span>
                              {groupingMode === "estado" && (
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                              )}
                            </button>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <SaveStatusBadge isNightMode={isNightMode} />
            </div>
          </div>
        </>
      ) : (
        <div className="col-span-12 flex items-center justify-between h-full">
          <div className="flex items-center">
            {activeTab !== "inicio" && (
              <div className="flex flex-row items-center gap-3.5 leading-tight shrink-0 select-none whitespace-nowrap">
                <span
                  className={`text-2xl md:text-[26px] font-medium tracking-tight transition-colors duration-500 ${
                    isNightMode ? "text-[#FFFFFFD6]" : "text-slate-900"
                  }`}
                >
                  {currentHeaderInfo.title}
                </span>
                {currentHeaderInfo.subtitle && (
                  <span
                    className={`text-2xl md:text-[26px] font-normal tracking-tight transition-colors duration-500 ${
                      isNightMode ? "text-[#ffffff6b]" : "text-slate-600"
                    }`}
                  >
                    {currentHeaderInfo.subtitle}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5 pointer-events-auto">
            <SaveStatusBadge isNightMode={isNightMode} />
          </div>
        </div>
      )}
    </div>
  );
}
