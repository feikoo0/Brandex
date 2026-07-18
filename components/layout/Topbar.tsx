"use client";

import { 
  RefreshCw, LogOut, LayoutDashboard, Layout, 
  Calendar, Users, LineChart, Folder, 
  CheckSquare, Database, Key, DollarSign, BarChart,
  UserCircle, Plus, Bell
} from "lucide-react";
import { useAuthStore, useUIStore } from "@/lib/store";
import { useSync, useData } from "@/hooks/useData";
import { ADMIN_NAV, WORKER_NAV, CLIENT_NAV, DONE_STATES } from "@/lib/constants";
import { cn, greeting } from "@/lib/utils";
import type { AdminTab } from "@/lib/types";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useMemo } from "react";
import GodMakerToggle from "../spatial/GodMakerToggle";

// Map tabs to icons
function getIconForTab(tab: string) {
  switch(tab) {
    case "pulse": return <LayoutDashboard className="w-3.5 h-3.5 flex-shrink-0" />;
    case "engine": return <Layout className="w-3.5 h-3.5 flex-shrink-0" />;
    case "timeline": return <Calendar className="w-3.5 h-3.5 flex-shrink-0" />;
    case "clientes": return <Users className="w-3.5 h-3.5 flex-shrink-0" />;
    case "pipeline": return <LineChart className="w-3.5 h-3.5 flex-shrink-0" />;
    case "proyectos": return <Folder className="w-3.5 h-3.5 flex-shrink-0" />;
    case "tareas": return <CheckSquare className="w-3.5 h-3.5 flex-shrink-0" />;
    case "talent": return <Users className="w-3.5 h-3.5 flex-shrink-0" />;
    case "analytics": return <BarChart className="w-3.5 h-3.5 flex-shrink-0" />;
    case "recursos": return <Database className="w-3.5 h-3.5 flex-shrink-0" />;
    case "calendario": return <Calendar className="w-3.5 h-3.5 flex-shrink-0" />;
    case "finanzas": return <DollarSign className="w-3.5 h-3.5 flex-shrink-0" />;
    case "accesos": return <Key className="w-3.5 h-3.5 flex-shrink-0" />;
    default: return <LayoutDashboard className="w-3.5 h-3.5 flex-shrink-0" />;
  }
}

function parseEsfuerzoMins(esfuerzo: string): number {
  if (!esfuerzo) return 0;
  const s = esfuerzo.toLowerCase();
  const h = s.match(/(\d+)\s*h/);
  const m = s.match(/(\d+)\s*min/);
  let t = 0;
  if (h) t += parseInt(h[1]) * 60;
  if (m) t += parseInt(m[1]);
  if (t) return t;
  if (s.includes("flash")) return 15;
  if (s.includes("corto")) return 30;
  if (s.includes("medio")) return 60;
  if (s.includes("largo")) return 120;
  return 0;
}

export function Topbar() {
  const role     = useAuthStore((s) => s.role);
  const userName = useAuthStore((s) => s.userName);
  const logout   = useAuthStore((s) => s.logout);
  const activeTab = useUIStore((s) => s.activeTab);
  const setTab    = useUIStore((s) => s.setTab);
  const router    = useRouter();

  const navItems =
    role === "admin" ? ADMIN_NAV :
    role === "diseno" ? WORKER_NAV :
    CLIENT_NAV;

  // Filter out Proyectos and Tareas as requested
  const filteredNavItems = navItems.filter((item: any) => 
    item.tab !== "proyectos" && item.tab !== "tareas"
  );

  return (
    <header className="h-20 flex items-center justify-between px-10 bg-[#0a0a0c] border-b border-white/[0.05] relative z-50">
      {/* Left: Larger Logo */}
      <div className="flex items-center">
        <Image src="/taski-logo.png" alt="Brandex" width={100} height={40} className="object-contain" />
      </div>

      {/* Right: Navigation & User */}
      <div className="flex items-center gap-8">
        {/* Navigation Pills (Aligned Right) */}
        <nav className="flex items-center gap-1 bg-white/[0.02] p-1 rounded-full border border-white/5">
          {filteredNavItems.map((item: any) => {
            if (item.sep) return <div key={item.sep} className="w-px h-3 bg-white/5 mx-0.5" />;
            
            const isActive = activeTab === item.tab;
            
            return (
              <button
                key={item.tab}
                onClick={() => setTab(item.tab as AdminTab)}
                className={cn(
                  "relative flex items-center gap-1.5 px-4 py-2 rounded-full transition-all duration-300",
                  isActive
                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                    : "text-white/30 hover:text-white/70 hover:bg-white/[0.08] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                )}
              >
                {getIconForTab(item.tab)}
                <span className="text-[10px] font-black uppercase tracking-normal">{item.label}</span>
                {isActive && (
                  <motion.div 
                    layoutId="top-active-dot"
                    className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-0.5 h-0.5 bg-blue-500 rounded-full"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {activeTab === "pulse" && <GodMakerToggle />}

        {/* User profile */}
        <div className="flex items-center gap-3 pl-6 border-l border-white/10">
          <button 
            onClick={() => { logout(); router.push("/"); }}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500/20 to-red-600/20 border border-orange-500/30 text-orange-400 flex items-center justify-center group overflow-hidden"
          >
            <span className="text-sm font-black group-hover:hidden transition-all">{userName?.[0]?.toUpperCase() || <UserCircle className="w-5 h-5" />}</span>
            <LogOut className="w-4 h-4 hidden group-hover:block transition-all" />
          </button>
        </div>
      </div>
    </header>
  );
}
