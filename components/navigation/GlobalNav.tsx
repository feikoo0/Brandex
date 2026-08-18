"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home, 
  Kanban, 
  Folder, 
  DollarSign, 
  Briefcase, 
  Users, 
  Database, 
  Settings, 
  Search, 
  X, 
  Bell, 
  Plus, 
  ChevronRight,
  MoreHorizontal,
  User,
  Layers
} from "lucide-react";
import { playSound } from "@/app/taski/utils/audio";

export interface NavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface GlobalNavProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  title?: string;
  subtitle?: string;
  searchQuery?: string;
  onSearchQueryChange?: (q: string) => void;
  isSearchActive?: boolean;
  onToggleSearch?: (active: boolean) => void;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  notificationCount?: number;
  onOpenNotifications?: () => void;
  userName?: string;
  isNightMode?: boolean;
  className?: string;
}

export function GlobalNav({
  activeTab,
  onTabChange,
  title,
  subtitle,
  searchQuery = "",
  onSearchQueryChange,
  isSearchActive = false,
  onToggleSearch,
  primaryAction,
  notificationCount = 0,
  onOpenNotifications,
  userName = "Feiko",
  isNightMode = true,
  className = "",
}: GlobalNavProps) {
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close more menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isSearchActive && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchActive]);

  const primaryTabs: NavItem[] = [
    { id: "inicio", label: "Inicio" },
    { id: "home", label: "Work" },
    { id: "home_v2", label: "Work v2" },
    { id: "proyectos", label: "Proyectos" },
    { id: "clientes", label: "Clientes" },
    { id: "equipo", label: "Equipo" },
    { id: "finanzas", label: "Finanzas" },
  ];

  const secondaryTabs: NavItem[] = [
    { id: "recursos", label: "Recursos" },
    { id: "ajustes", label: "Ajustes" },
  ];

  const getIcon = (id: string, isActive: boolean) => {
    const strokeWidth = isActive ? 2 : 1.75;
    const iconClass = "w-3.5 h-3.5 shrink-0 transition-colors";

    switch (id) {
      case "inicio": return <Home className={iconClass} strokeWidth={strokeWidth} />;
      case "home": return <Kanban className={iconClass} strokeWidth={strokeWidth} />;
      case "home_v2": return <Kanban className={iconClass} strokeWidth={strokeWidth} />;
      case "proyectos": return <Folder className={iconClass} strokeWidth={strokeWidth} />;
      case "clientes": return <Briefcase className={iconClass} strokeWidth={strokeWidth} />;
      case "equipo": return <Users className={iconClass} strokeWidth={strokeWidth} />;
      case "finanzas": return <DollarSign className={iconClass} strokeWidth={strokeWidth} />;
      case "recursos": return <Database className={iconClass} strokeWidth={strokeWidth} />;
      case "ajustes": return <Settings className={iconClass} strokeWidth={strokeWidth} />;
      default: return null;
    }
  };

  // Resolved dynamic titles if not provided
  const resolvedTitle = title || (
    activeTab === "inicio" ? "Inicio" :
    activeTab === "home" ? "Work" :
    activeTab === "home_v2" ? "Work v2" :
    activeTab === "proyectos" ? "Panel de Proyectos" :
    activeTab === "clientes" ? "Directorio de Clientes" :
    activeTab === "equipo" ? "Espacio de Equipo" :
    activeTab === "finanzas" ? "Métricas Financieras" :
    activeTab === "recursos" ? "Biblioteca de Recursos" :
    activeTab === "ajustes" ? "Ajustes del Sistema" : "Taski"
  );

  const resolvedSubtitle = subtitle || (
    activeTab === "home" ? "flujo y entregables activos" :
    activeTab === "home_v2" ? "flujo y entregables activos (v2)" :
    activeTab === "proyectos" ? "catálogo general de entregas" :
    activeTab === "clientes" ? "marcas asociadas y contratos" :
    activeTab === "equipo" ? "colaboradores y carga de trabajo" :
    activeTab === "finanzas" ? "facturación y margen operativo" :
    activeTab === "recursos" ? "repositorio de assets y guías" :
    activeTab === "ajustes" ? "preferencias del sistema" : undefined
  );

  return (
    <header className={`h-[64px] flex items-center justify-between gap-4 select-none px-6 z-40 bg-transparent ${className}`}>
      {/* ── 1. LEFT ZONE: Title & Subtitle ── */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <motion.div
          animate={{ opacity: isSearchActive ? 0.3 : 1 }}
          transition={{ duration: 0.2 }}
          className="flex items-baseline gap-2.5 truncate"
        >
          <h1 className="text-xl md:text-2xl font-medium tracking-tight text-[#ffffffd6] truncate">
            {resolvedTitle}
          </h1>
          {resolvedSubtitle && (
            <span className="text-base md:text-lg font-normal tracking-tight text-[#ffffff6b] hidden sm:inline truncate">
              {resolvedSubtitle}
            </span>
          )}
        </motion.div>
      </div>

      {/* ── 2. CENTER ZONE: Persistent Navigation Pill + Global Search ── */}
      <div className="flex items-center justify-center">
        <motion.div 
          layout
          className="flex items-center rounded-full p-1 bg-[#121212] border border-[#ffffff1f] shadow-lg shadow-black/40 relative"
        >
          {/* Close Search Button when active */}
          <AnimatePresence>
            {isSearchActive && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, width: 0, marginRight: 0 }}
                animate={{ opacity: 1, scale: 1, width: 28, marginRight: 4 }}
                exit={{ opacity: 0, scale: 0.8, width: 0, marginRight: 0 }}
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
                type="button"
                onClick={() => {
                  if (onToggleSearch) onToggleSearch(false);
                  if (onSearchQueryChange) onSearchQueryChange("");
                  playSound('click');
                }}
                className="flex items-center justify-center h-7 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white cursor-pointer shrink-0 ml-1"
                title="Cerrar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Search Input Button / Expanded Pill */}
          <motion.div
            layout
            animate={{ width: isSearchActive ? 260 : "auto" }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className={`relative flex items-center h-8 rounded-full px-2.5 transition-colors ${
              isSearchActive 
                ? "bg-[#1f1f1f] border border-white/15" 
                : "hover:bg-white/5 cursor-pointer text-[#ffffff6b] hover:text-[#ffffffd6]"
            }`}
            onClick={() => {
              if (!isSearchActive && onToggleSearch) {
                onToggleSearch(true);
                playSound('click');
              }
            }}
          >
            <Search className="w-3.5 h-3.5 shrink-0 text-[#ffffff6b]" />
            {isSearchActive ? (
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange && onSearchQueryChange(e.target.value)}
                placeholder="Buscar tareas, proyectos, marcas..."
                className="ml-2 w-full bg-transparent text-xs text-[#ffffffd6] placeholder:text-[#ffffff40] outline-none"
              />
            ) : (
              <span className="text-xs font-medium ml-1.5 hidden md:inline">Buscar</span>
            )}
          </motion.div>

          <div className="h-4 w-px bg-white/10 mx-1 shrink-0" />

          {/* Primary Navigation Tabs */}
          {!isSearchActive && (
            <div className="flex items-center gap-0.5">
              {primaryTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const isHovered = hoveredTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onMouseEnter={() => setHoveredTab(tab.id)}
                    onMouseLeave={() => setHoveredTab(null)}
                    onClick={() => {
                      onTabChange(tab.id);
                      playSound('click');
                    }}
                    className={`relative box-border inline-flex h-8 items-center justify-center rounded-full px-3 text-xs font-medium transition-colors duration-200 select-none gap-1.5 ${
                      isActive 
                        ? "text-[#ffffffd6]" 
                        : isHovered 
                          ? "text-[#ffffffd6]" 
                          : "text-[#ffffff6b] hover:text-[#ffffffd6]"
                    }`}
                  >
                    {/* Active Background Pill */}
                    {isActive && (
                      <motion.span
                        layoutId="activeGlobalNavIndicator"
                        className="absolute inset-0 rounded-full bg-[#1f1f1f] border border-[#ffffff1f] shadow-sm"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}

                    {/* Hover Background Pill */}
                    {!isActive && isHovered && (
                      <motion.span
                        layoutId="hoverGlobalNavIndicator"
                        className="absolute inset-0 rounded-full bg-white/5 border border-white/10"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}

                    <span className="relative z-10 flex items-center gap-1.5">
                      {getIcon(tab.id, isActive)}
                      <span>{tab.label}</span>
                    </span>
                  </button>
                );
              })}

              {/* More Menu Dropdown */}
              <div ref={moreMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsMoreMenuOpen((prev) => !prev)}
                  className={`h-8 w-8 flex items-center justify-center rounded-full transition-colors text-[#ffffff6b] hover:text-[#ffffffd6] hover:bg-white/5 ${
                    isMoreMenuOpen ? "bg-white/10 text-white" : ""
                  }`}
                  title="Más vistas"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                <AnimatePresence>
                  {isMoreMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 z-50 min-w-[170px] p-1.5 rounded-2xl bg-[#181818] border border-white/15 shadow-2xl shadow-black/80 flex flex-col gap-0.5"
                    >
                      {secondaryTabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                              onTabChange(tab.id);
                              setIsMoreMenuOpen(false);
                              playSound('click');
                            }}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-colors w-full text-left ${
                              isActive 
                                ? "bg-white/10 text-[#ffffffd6] font-semibold" 
                                : "text-[#ffffff6b] hover:text-[#ffffffd6] hover:bg-white/5"
                            }`}
                          >
                            {getIcon(tab.id, isActive)}
                            <span>{tab.label}</span>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── 3. RIGHT ZONE: Actions & Profile ── */}
      <div className="flex items-center gap-2.5 justify-end flex-1">
        {/* Primary Action Button (Contextual) */}
        {primaryAction && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => {
              primaryAction.onClick();
              playSound('click');
            }}
            className="flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-white/10 hover:bg-white/15 active:bg-white/20 text-[#ffffffd6] border border-[#ffffff1f] text-xs font-semibold shadow-sm transition-all select-none"
          >
            {primaryAction.icon || <Plus className="w-3.5 h-3.5 text-blue-400 stroke-[2.5]" />}
            <span>{primaryAction.label}</span>
          </motion.button>
        )}

        {/* Alerts / Notification Bell */}
        {onOpenNotifications && (
          <button
            type="button"
            onClick={() => {
              onOpenNotifications();
              playSound('click');
            }}
            className="relative h-8 w-8 rounded-full flex items-center justify-center bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-[#ffffff6b] hover:text-[#ffffffd6] transition-colors"
            title="Notificaciones y alertas"
          >
            <Bell className="w-3.5 h-3.5" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-[#121212]" />
            )}
          </button>
        )}

        {/* User Profile Pill */}
        <div 
          onClick={() => onTabChange("ajustes")}
          className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 cursor-pointer transition-colors"
          title="Perfil y ajustes"
        >
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-violet-600 via-indigo-500 to-sky-400 p-[1px] flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-[#181817] flex items-center justify-center">
              <User className="w-3 h-3 text-[#ffffffd6]" />
            </div>
          </div>
          <span className="text-xs font-medium text-[#ffffffd6] hidden sm:inline max-w-[90px] truncate">
            {userName}
          </span>
        </div>
      </div>
    </header>
  );
}
