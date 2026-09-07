"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Folder,
  Users,
  Briefcase,
  DollarSign,
  Settings,
  ChevronDown,
  Plus,
  User,
  LogOut,
  ShieldAlert,
  Network,
  Kanban,
  Database,
  Layers,
  Handshake,
  FileText,
  Sparkles,
  LayoutDashboard,
} from "lucide-react";
import { playSound } from "@/app/taski/utils/audio";
import { Project } from "@/app/taski/components/ProjectDashboard";
import { TaskiAvatar, AURORA_PALETTES } from "@/components/ui/TaskiAvatar";

interface TaskiSidebarProps {
  isMenuOpen: boolean;
  setIsMenuOpen: (val: boolean) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onNewProject: (originRect?: { x: number; y: number; width: number; height: number }) => void;
  recentProjects?: Project[];
  onSelectProject?: (projId: string | number) => void;
  userName?: string;
  userEmail?: string;
  workspaceId?: string;
  isMaster?: boolean;
  onLogout?: () => void;
  onCopyWorkspaceKey?: () => void;
  copiedKey?: boolean;
  isFeatureVisible?: (featureId: string, isMaster: boolean, isBeta: boolean) => boolean;
}

export function TaskiSidebar({
  isMenuOpen,
  setIsMenuOpen,
  activeTab,
  onSelectTab,
  onNewProject,
  recentProjects = [],
  onSelectProject,
  userName = "Usuario",
  userEmail,
  workspaceId,
  isMaster = false,
  onLogout,
  onCopyWorkspaceKey,
  copiedKey = false,
  isFeatureVisible = () => true,
}: TaskiSidebarProps) {
  const [activePaletteIndex, setActivePaletteIndex] = useState<number | null>(null);
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const [hoveredMenuItem, setHoveredMenuItem] = useState<string | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    if (isUserMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isUserMenuOpen]);

  const menuGroups = [
    {
      id: "general",
      title: "General",
      items: [
        { id: "inicio", label: "Inicio" },
        { id: "home", label: "Work" },
      ],
    },
    {
      id: "operacion",
      title: "Operación",
      items: [
        { id: "proyectos", label: "Proyectos" },
        { id: "tableros", label: "Tableros" },
        { id: "equipo", label: "Equipo" },
        { id: "recursos", label: "Recursos" },
        { id: "diagramas", label: "Diagramas" },
      ],
    },
    {
      id: "negocio",
      title: "Negocio",
      items: [
        { id: "clientes", label: "Clientes" },
        { id: "crm", label: "CRM" },
        { id: "propuestas", label: "Propuestas" },
        { id: "finanzas", label: "Finanzas" },
      ],
    },
    ...(isMaster
      ? [
          {
            id: "admin",
            title: "Admin",
            items: [{ id: "superadmin", label: "SuperAdmin" }],
          },
        ]
      : []),
  ];

  const visibleGroups = menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        isFeatureVisible(item.id, isMaster, !isMaster)
      ),
    }))
    .filter((group) => group.items.length > 0);

  const getIcon = (id: string, isActive: boolean) => {
    const fill = isActive ? "currentColor" : "none";
    const strokeWidth = isActive ? 1.6 : 1.75;
    const className =
      "w-[15px] h-[15px] transition-all duration-200 shrink-0 text-[#ffffffd6] opacity-100";

    switch (id) {
      case "inicio":
        return <Home className={className} fill={fill} strokeWidth={strokeWidth} />;
      case "home":
        return <Briefcase className={className} fill={fill} strokeWidth={strokeWidth} />;
      case "proyectos":
        return <Folder className={className} fill={fill} strokeWidth={strokeWidth} />;
      case "tableros":
        return <LayoutDashboard className={className} fill={fill} strokeWidth={strokeWidth} />;
      case "proyectos_v2":
        return <Layers className={className} fill={fill} strokeWidth={strokeWidth} />;
      case "equipo":
        return <Users className={className} fill={fill} strokeWidth={strokeWidth} />;
      case "recursos":
        return <Database className={className} fill={fill} strokeWidth={strokeWidth} />;
      case "diagramas":
        return <Network className={className} fill={fill} strokeWidth={strokeWidth} />;
      case "clientes":
        return <User className={className} fill={fill} strokeWidth={strokeWidth} />;
      case "crm":
        return <Handshake className={className} fill={fill} strokeWidth={strokeWidth} />;
      case "propuestas":
        return <FileText className={className} fill={fill} strokeWidth={strokeWidth} />;
      case "finanzas":
        return <DollarSign className={className} fill={fill} strokeWidth={strokeWidth} />;
      case "superadmin":
        return <ShieldAlert className={className} fill={fill} strokeWidth={strokeWidth} />;
      case "ajustes":
        return <Settings className={className} fill={fill} strokeWidth={strokeWidth} />;
      default:
        return null;
    }
  };



  return (
    <div
      className={`h-full flex flex-col justify-between pt-[2.0625rem] pb-[0.625rem] px-0.5 transition-all duration-300 ease-in-out ${
        isMenuOpen ? "w-[14.5rem]" : "w-[2.75rem]"
      }`}
    >
      {/* ── TOP: Logo & Sidebar Collapse/Expand Header ── */}
      <div className="h-10 shrink-0 flex items-center justify-between mb-7">
        {!isMenuOpen ? (
          <div
            onMouseEnter={() => setIsLogoHovered(true)}
            onMouseLeave={() => setIsLogoHovered(false)}
            className="w-full flex justify-center items-center h-full"
          >
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(true);
                playSound("click");
              }}
              className="relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 hover:bg-white/10 cursor-pointer group"
              title="Abrir menú"
            >
              <AnimatePresence mode="popLayout">
                {isLogoHovered ? (
                  <motion.div
                    key="expand-icon"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center justify-center"
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="object-contain text-[#ffffff6b] transition-colors duration-200"
                    >
                      <rect width="18" height="18" x="3" y="3" rx="5" />
                      <path d="M9 3v18" />
                      <path d="m14 9 3 3-3 3" />
                    </svg>
                  </motion.div>
                ) : (
                  <motion.div
                    key="logo-icon"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center justify-center"
                  >
                    <Image
                      src="/brandex-icon.svg"
                      alt="Brandex Icon"
                      width={28}
                      height={28}
                      referrerPolicy="no-referrer"
                      className="object-contain opacity-90 group-hover:opacity-100 transition-all duration-300"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        ) : (
          <div className="w-full flex items-center justify-between pl-1 h-full">
            <div className="flex items-center h-10">
              <Image
                src="/brandex-logo.svg"
                alt="Brandex"
                width={130}
                height={30}
                priority
                className="object-contain object-left h-7 w-auto select-none opacity-90 hover:opacity-100 transition-opacity"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                playSound("click");
              }}
              className="relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 hover:bg-white/10 text-[#ffffff6b] hover:text-white cursor-pointer group"
              title="Contraer menú"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="object-contain text-[#ffffff6b] group-hover:text-white transition-colors duration-200"
              >
                <rect width="18" height="18" x="3" y="3" rx="5" />
                <path d="M9 3v18" />
                <path d="m16 9-3 3 3 3" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* ── CENTER: Navigation List & Recent Projects (Scrollable) ── */}
      <div
        onMouseLeave={() => setHoveredMenuItem(null)}
        className={`flex-1 min-h-0 flex flex-col overflow-y-auto custom-scrollbar ${
          isMenuOpen ? "pr-0.5" : "pr-0 items-center w-full"
        }`}
      >
        {/* Botón "Nuevo proyecto" */}
        <button
          type="button"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            onNewProject({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
            playSound("click");
          }}
          className={`mb-[10px] group relative flex items-center justify-center h-10 rounded-xl bg-white hover:bg-[#e4e4e4] active:bg-[#d8d8d8] text-[#121212] cursor-pointer select-none overflow-hidden transition-colors duration-150 shadow-sm shrink-0 ${
            isMenuOpen ? "w-full gap-1" : "w-10 mx-auto"
          }`}
          title="Nuevo proyecto"
        >
          <Plus className="w-[14px] h-[14px] text-[#121212] stroke-[2.5] shrink-0" />
          {isMenuOpen && (
            <span className="text-[14px] font-medium whitespace-nowrap select-none text-[#121212] leading-none">
              Nuevo proyecto
            </span>
          )}
        </button>

        {/* Navigation Groups */}
        <div className={`flex flex-col gap-0.5 ${!isMenuOpen ? "w-full items-center" : ""}`}>
          {visibleGroups.map((group, groupIdx) => (
            <div key={group.id} className={`flex flex-col gap-0.5 ${!isMenuOpen ? "w-full items-center" : ""}`}>
              {/* Group Header / Separator (Refined Gestalt spacing matching reference) */}
              {groupIdx > 0 && (
                isMenuOpen ? (
                  <div className="pt-4 pb-1 pl-3.5 shrink-0 flex items-center">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#ffffff6b] select-none">
                      {group.title}
                    </span>
                  </div>
                ) : (
                  <div className="h-6 w-full flex items-center justify-center shrink-0">
                    <div className="w-5 h-px bg-white/10" />
                  </div>
                )
              )}

              {/* Group Items */}
              {group.items.map((item) => {
                const isActive = activeTab === item.id;
                const isHovered = hoveredMenuItem === item.id;

                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    onMouseEnter={() => setHoveredMenuItem(item.id)}
                    onClick={() => {
                      onSelectTab(item.id);
                      playSound("click");
                    }}
                    className={`group relative flex items-center h-10 rounded-xl cursor-pointer select-none overflow-hidden transition-all duration-200 border-0 ${
                      isMenuOpen ? "w-full" : "w-10 justify-center mx-auto"
                    } ${
                      isActive
                        ? "bg-white/10 text-[#ffffffd6]"
                        : isHovered
                        ? "bg-white/5 text-[#ffffffd6]"
                        : "bg-transparent text-[#ffffffd6]"
                    }`}
                    title={!isMenuOpen ? item.label : undefined}
                  >
                    <div className="flex items-center justify-center shrink-0 w-10 h-10">
                      {getIcon(item.id, isActive)}
                    </div>
                    {isMenuOpen && (
                      <span className="text-[14px] font-normal whitespace-nowrap select-none pr-3 text-[#ffffffd6]">
                        {item.label}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── BOTTOM: Tarjeta de Usuario y Menú Desplegable ── */}
      <div ref={userMenuRef} className={`relative mt-2 shrink-0 ${!isMenuOpen ? "w-full flex justify-center" : ""}`}>
        <AnimatePresence>
          {isUserMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className={`absolute bottom-[56px] ${
                isMenuOpen ? "left-0 w-[232px]" : "left-0 w-[210px]"
              } bg-[#181818] border border-white/10 rounded-2xl p-1.5 shadow-2xl shadow-black/90 backdrop-blur-xl flex flex-col gap-1 z-[70]`}
            >
              {/* Encabezado: Avatar + Nombre + Correo */}
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.03]">
                <TaskiAvatar
                  name={userName}
                  email={userEmail || (isMaster ? "contacto.milenial@gmail.com" : "colaborador@taski.app")}
                  size={34}
                  paletteId={activePaletteIndex !== null ? AURORA_PALETTES[activePaletteIndex].id : undefined}
                />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[14px] font-bold text-[#ffffffd6] truncate leading-tight">
                    {userName}
                  </span>
                  <span
                    className="text-[11px] font-medium text-[#ffffff80] truncate leading-tight mt-0.5"
                    title={userEmail || (isMaster ? "contacto.milenial@gmail.com" : "colaborador@taski.app")}
                  >
                    {userEmail || (isMaster ? "contacto.milenial@gmail.com" : "colaborador@taski.app")}
                  </span>
                </div>
              </div>

              {/* Selector / Randomizer de fondos Aurora Mesh */}
              <div className="px-2 py-1.5 flex items-center justify-between gap-1.5 rounded-lg bg-white/[0.02]">
                <span className="text-[11px] font-semibold text-[#ffffff6b] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Fondo Aurora
                </span>
                <button
                  type="button"
                  onClick={() => {
                    playSound("pop");
                    setActivePaletteIndex((prev) => {
                      const next = (prev === null ? 0 : prev + 1) % AURORA_PALETTES.length;
                      return next;
                    });
                  }}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/15 text-white/90 transition-all cursor-pointer"
                >
                  {activePaletteIndex !== null ? AURORA_PALETTES[activePaletteIndex].name : "Estilo"} ↻
                </button>
              </div>

              <div className="w-full h-px bg-white/10 my-0.5" />

              {/* Cerrar Sesión */}
              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full h-10 flex items-center rounded-xl text-[#ffffffd6] hover:bg-rose-500/10 hover:text-rose-400 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-center shrink-0 w-8 h-10">
                    <LogOut className="w-[13.55px] h-[13.55px] text-[#ffffff6b] group-hover:text-rose-400 transition-colors shrink-0" />
                  </div>
                  <span className="text-[14px] font-bold whitespace-nowrap select-none pr-3">
                    Cerrar sesión
                  </span>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trigger */}
        {isMenuOpen ? (
          <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setIsUserMenuOpen((prev) => !prev);
              playSound("click");
            }}
            className={`group relative flex items-center justify-between h-12 w-full rounded-xl cursor-pointer select-none overflow-hidden transition-all duration-200 border-0 ${
              isUserMenuOpen
                ? "bg-white/10 text-white"
                : "bg-transparent hover:bg-white/5 text-[#ffffffd6]"
            }`}
          >
            <div className="flex items-center min-w-0 h-full">
              <div className="w-10 h-12 flex items-center justify-center shrink-0">
                <TaskiAvatar
                  name={userName}
                  email={userEmail || (isMaster ? "contacto.milenial@gmail.com" : "colaborador@taski.app")}
                  size={30}
                  paletteId={activePaletteIndex !== null ? AURORA_PALETTES[activePaletteIndex].id : undefined}
                />
              </div>
              <div className="flex flex-col min-w-0 text-left pl-1">
                <span className="text-[14px] font-bold text-[#ffffffd6] group-hover:text-white truncate leading-tight">
                  {userName}
                </span>
                <span
                  className="text-[11px] font-medium text-[#ffffff80] truncate leading-tight mt-0.5"
                  title={userEmail || (isMaster ? "contacto.milenial@gmail.com" : "colaborador@taski.app")}
                >
                  {userEmail || (isMaster ? "contacto.milenial@gmail.com" : "colaborador@taski.app")}
                </span>
              </div>
            </div>

            <div className="pr-2.5 flex items-center shrink-0">
              <ChevronDown
                className={`w-4 h-4 text-[#ffffff6b] group-hover:text-white transition-transform duration-200 ${
                  isUserMenuOpen ? "rotate-180 text-white" : ""
                }`}
              />
            </div>
          </motion.div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setIsUserMenuOpen((prev) => !prev);
              playSound("click");
            }}
            className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer hover:scale-105 transition-transform mx-auto"
            title={`${userName} (${userEmail || (isMaster ? "contacto.milenial@gmail.com" : "colaborador@taski.app")})`}
          >
            <TaskiAvatar
              name={userName}
              email={userEmail || (isMaster ? "contacto.milenial@gmail.com" : "colaborador@taski.app")}
              size={30}
              paletteId={activePaletteIndex !== null ? AURORA_PALETTES[activePaletteIndex].id : undefined}
            />
          </button>
        )}
      </div>
    </div>
  );
}
