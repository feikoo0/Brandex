"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ChevronUp, LogOut, RefreshCw, UserCircle,
  LayoutDashboard, Layout, Calendar,
  Users, DollarSign, Folder, CheckSquare,
  Key, Database, LineChart, BarChart, Moon, Sun, Sparkles
} from "lucide-react";
import { useAuthStore, useUIStore } from "@/lib/store";
import { useSync } from "@/hooks/useData";
import { ADMIN_NAV, WORKER_NAV, CLIENT_NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { AdminTab } from "@/lib/types";
import { motion } from "framer-motion";
import Image from "next/image";

// ── Types ──────────────────────────────────────────────────────────────────────
type NavItem =
  | { tab: string; label: string; sep?: never }
  | { sep: string; tab?: never; label?: never };

// Map tabs to icons
function getIconForTab(tab: string) {
  switch(tab) {
    case "pulse": return <LayoutDashboard className="w-5 h-5 flex-shrink-0" />;
    case "engine": return <Layout className="w-5 h-5 flex-shrink-0" />;
    case "timeline": return <Calendar className="w-5 h-5 flex-shrink-0" />;
    case "clientes": return <Users className="w-5 h-5 flex-shrink-0" />;
    case "pipeline": return <LineChart className="w-5 h-5 flex-shrink-0" />;
    case "proyectos": return <Folder className="w-5 h-5 flex-shrink-0" />;
    case "tareas": return <CheckSquare className="w-5 h-5 flex-shrink-0" />;
    case "talent": return <Users className="w-5 h-5 flex-shrink-0" />;
    case "analytics": return <BarChart className="w-5 h-5 flex-shrink-0" />;
    case "recursos": return <Database className="w-5 h-5 flex-shrink-0" />;
    case "calendario": return <Calendar className="w-5 h-5 flex-shrink-0" />;
    case "finanzas": return <DollarSign className="w-5 h-5 flex-shrink-0" />;
    case "accesos": return <Key className="w-5 h-5 flex-shrink-0" />;
    default: return <LayoutDashboard className="w-5 h-5 flex-shrink-0" />;
  }
}

// ── Component ──────────────────────────────────────────────────────────────────
export function AppSidebar() {
  const role     = useAuthStore((s) => s.role);
  const logout   = useAuthStore((s) => s.logout);
  const activeTab = useUIStore((s) => s.activeTab);
  const setTab    = useUIStore((s) => s.setTab);
  const isSmartMode = useUIStore((s) => s.isSmartMode);
  const toggleSmartMode = useUIStore((s) => s.toggleSmartMode);
  const sync      = useSync();
  const router    = useRouter();
  
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems: NavItem[] =
    role === "admin" ? (ADMIN_NAV as unknown as NavItem[]) :
    role === "diseno" ? (WORKER_NAV as unknown as NavItem[]) :
    (CLIENT_NAV as unknown as NavItem[]);

  return (
    <aside
      className={cn(
        "h-screen bg-[var(--bg)] border-r border-white/5 flex flex-col items-center transition-all duration-300 ease-in-out relative z-40 dark:bg-[#0a0a0c] bg-white",
      )}
      style={{ width: "70px" }}
    >
      {/* Sync */}
      <div className="w-full flex justify-center py-6">
        <button
          onClick={() => sync()}
          className="w-10 h-10 rounded-full flex justify-center items-center group transition-colors relative dark:bg-white/[0.04] bg-black/[0.04] dark:border-white/5 border-black/5 dark:text-white/50 text-black/50 hover:text-black dark:hover:text-white"
        >
          <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-visible px-4 space-y-4 pt-2">
        {navItems.map((item, i) => {
          if ("sep" in item && item.sep) {
            return <div key={`sep-${i}`} className="w-full h-px dark:bg-white/10 bg-black/10 my-2" />;
          }

          const isActive = activeTab === item.tab;
          
          return (
            <div key={item.tab} className="w-12 h-12 relative">
              <button
                onClick={() => setTab(item.tab as AdminTab)}
                className={cn(
                  "absolute left-0 top-0 h-12 flex items-center rounded-full transition-all duration-300 overflow-hidden cursor-pointer group hover:w-[200px]",
                  isActive
                    ? "bg-blue-600/20 border border-blue-500/30 text-blue-500 dark:text-blue-400 w-12 hover:bg-blue-600/30 shadow-lg"
                    : "bg-transparent dark:text-white/50 text-black/50 dark:hover:bg-white/[0.08] hover:bg-black/[0.06] dark:hover:text-white hover:text-black dark:hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] w-12"
                )}
                style={{ zIndex: 100 }}
              >
                <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center relative">
                  {isActive && (
                    <motion.div layoutId="activeDot" className="absolute top-1/2 -translate-y-1/2 left-0 w-1 h-6 bg-blue-500 rounded-r-full" />
                  )}
                  {getIconForTab(item.tab || "")}
                </div>
                <span className="whitespace-nowrap font-semibold text-[13px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 block pr-6">
                  {item.label}
                </span>
              </button>
            </div>
          );
        })}
      </nav>

      {/* Toggles */}
      <div className="w-full flex flex-col items-center pb-4 gap-3">
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-10 h-10 rounded-full flex justify-center items-center transition-colors dark:bg-white/5 bg-black/5 dark:text-white/50 text-black/50 dark:hover:bg-white/10 hover:bg-black/10 dark:hover:text-white hover:text-black"
            title={theme === "dark" ? "Modo Claro" : "Modo Oscuro"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        )}
        
        <button
          onClick={toggleSmartMode}
          className={cn(
            "w-10 h-10 rounded-full flex justify-center items-center transition-colors",
            isSmartMode 
              ? "bg-blue-500/20 text-blue-500 dark:text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)] border border-blue-500/30" 
              : "dark:bg-white/5 bg-black/5 dark:text-white/50 text-black/50 dark:hover:bg-white/10 hover:bg-black/10 dark:hover:text-white hover:text-black"
          )}
          title={isSmartMode ? "Modo Inteligente ON" : "Modo Inteligente OFF"}
        >
          <Sparkles className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Log out */}
      <div className="w-full flex justify-center pb-6">
        <button
          onClick={() => { logout(); router.push("/"); }}
          className="w-10 h-10 rounded-full flex justify-center items-center transition-colors bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-500 hover:text-white group relative"
          title="Cerrar sesión"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}

