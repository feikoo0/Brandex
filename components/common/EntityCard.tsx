"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  Building2, 
  User, 
  Briefcase, 
  FolderKanban, 
  Clock, 
  ExternalLink, 
  ChevronRight, 
  FolderGit2,
  DollarSign,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface EntityCardProps {
  id: string | number;
  type: "client" | "member" | "user";
  name: string;
  subtitle?: string; // Industry, Role, or Company
  avatar?: string;
  status: string;
  statusColor?: string; // Custom semantic pill class
  activeProjectsCount: number;
  completedProjectsCount: number;
  totalProjectsCount?: number;
  driveLinksCount?: number;
  financialHighlight?: string; // e.g. "$45,000 / $13,000 pend." for client, or workload% for member
  badgeText?: string; // e.g. "Plan Crecimiento", "Senior UI/UX"
  onClick: () => void;
  className?: string;
}

export function EntityCard({
  id,
  type,
  name,
  subtitle,
  avatar,
  status,
  statusColor,
  activeProjectsCount,
  completedProjectsCount,
  totalProjectsCount,
  driveLinksCount = 0,
  financialHighlight,
  badgeText,
  onClick,
  className = "",
}: EntityCardProps) {
  const total = totalProjectsCount !== undefined ? totalProjectsCount : (activeProjectsCount + completedProjectsCount);
  const safeTotal = Math.max(total, 1);
  const percentCompleted = total > 0 ? Math.round((completedProjectsCount / total) * 100) : 0;

  // Semantic status pills standard
  const getStatusPillClass = (statusStr: string) => {
    if (statusColor) return statusColor;
    const lower = statusStr.toLowerCase();
    if (lower.includes("vip") || lower.includes("alianza")) {
      return "bg-purple-500/20 text-purple-400 border-purple-500/40";
    }
    if (lower.includes("activo") || lower.includes("disponible") || lower.includes("completado")) {
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
    }
    if (lower.includes("pausa") || lower.includes("en proyecto") || lower.includes("prospecto")) {
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/40";
    }
    if (lower.includes("maxima") || lower.includes("máxima") || lower.includes("cerrado") || lower.includes("urgente")) {
      return "bg-rose-500/20 text-rose-400 border-rose-500/40";
    }
    return "bg-white/10 text-[#ffffffd6] border-white/15";
  };

  const statusClass = getStatusPillClass(status);

  // Avatar initials fallback
  const getInitials = (str: string) => {
    if (!str) return "?";
    const parts = str.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return str.slice(0, 2).toUpperCase();
  };

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={cn(
        "group relative flex flex-col justify-between p-5 rounded-[24px] bg-[#181818] hover:bg-[#1c1c1c] border border-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-xl hover:shadow-black/40 overflow-hidden select-none",
        className
      )}
    >
      {/* Visual Accent Glow on top-right */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.02] group-hover:bg-blue-500/[0.05] rounded-full blur-3xl pointer-events-none transition-colors duration-500 -mr-12 -mt-12" />

      {/* Top Row: Avatar + Status Pill + Drive indicator */}
      <div className="flex items-start justify-between gap-3 mb-4 relative z-10">
        <div className="flex items-center gap-3">
          {/* Avatar Container */}
          <div className="relative w-11 h-11 rounded-2xl bg-[#222222] border border-white/10 flex items-center justify-center text-sm font-bold text-[#ffffffd6] group-hover:border-white/25 transition-colors shrink-0 shadow-inner">
            {avatar && avatar.length <= 3 ? (
              <span className="font-black text-xs tracking-wider text-blue-400">{avatar}</span>
            ) : avatar && (avatar.startsWith("http") || avatar.startsWith("/")) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt={name} className="w-full h-full object-cover rounded-2xl" />
            ) : type === "client" ? (
              <Building2 className="w-5 h-5 text-blue-400" />
            ) : (
              <User className="w-5 h-5 text-violet-400" />
            )}
          </div>

          {/* Name & Badge/Subtitle */}
          <div className="flex flex-col min-w-0">
            <h3 className="text-[15px] font-semibold text-[#ffffffd6] group-hover:text-white truncate tracking-tight leading-tight">
              {name}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              {badgeText ? (
                <span className="text-[11px] font-medium text-blue-400/90 truncate">
                  {badgeText}
                </span>
              ) : subtitle ? (
                <span className="text-[12px] font-normal text-[#ffffff6b] truncate">
                  {subtitle}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-1.5 shrink-0">
          {driveLinksCount > 0 && (
            <div 
              className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-[#ffffff6b]"
              title={`${driveLinksCount} enlace(s) de Drive`}
            >
              <FolderGit2 className="w-3 h-3 text-blue-400" />
            </div>
          )}
          <span className={cn("px-2.5 py-1 rounded-full text-[11px] font-semibold border tracking-wide leading-none", statusClass)}>
            {status}
          </span>
        </div>
      </div>

      {/* Middle Row: Highlights / Meta */}
      <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-white/[0.025] border border-white/5 mb-4 relative z-10">
        <div className="flex items-center gap-2 text-xs text-[#ffffff6b]">
          <FolderKanban className="w-3.5 h-3.5 text-[#ffffff40]" />
          <span>
            <strong className="text-[#ffffffd6] font-semibold">{activeProjectsCount}</strong> {activeProjectsCount === 1 ? "activo" : "activos"}
          </span>
          {completedProjectsCount > 0 && (
            <span className="text-[#ffffff40]">· {completedProjectsCount} listos</span>
          )}
        </div>

        {financialHighlight && (
          <div className="text-xs font-semibold text-[#ffffffd6] flex items-center gap-1">
            <span className="truncate max-w-[150px]">{financialHighlight}</span>
          </div>
        )}
      </div>

      {/* Bottom Row: Segmented Progress Bar & Footer */}
      <div className="pt-2 border-t border-white/5 flex flex-col gap-1.5 relative z-10">
        <div className="flex items-center justify-between text-[11px] text-[#ffffff6b] font-medium">
          <span>{total > 0 ? `${percentCompleted}% proyectos entregados` : "Sin proyectos activos"}</span>
          <div className="flex items-center gap-1 text-[#ffffff40] group-hover:text-[#ffffffd6] transition-colors">
            <span>Ver perfil</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Progress Bar Segments */}
        <div className="flex items-center gap-1 w-full h-1 mt-0.5">
          {total > 0 ? (
            Array.from({ length: Math.min(safeTotal, 12) }).map((_, idx) => {
              const segmentStep = total / Math.min(safeTotal, 12);
              const isFilled = (idx + 1) * segmentStep <= completedProjectsCount + 0.5;
              return (
                <div
                  key={idx}
                  className={cn(
                    "h-full flex-1 rounded-full transition-all duration-300",
                    isFilled ? "bg-emerald-400" : "bg-white/10"
                  )}
                />
              );
            })
          ) : (
            <div className="h-full w-full rounded-full bg-white/5" />
          )}
        </div>
      </div>
    </motion.div>
  );
}
