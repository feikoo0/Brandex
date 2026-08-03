"use client";

import React from "react";
import { Folder, Sparkles } from "lucide-react";
import { Task } from "./ProjectDashboard";
import FormatoShape from "./FormatoShape";
import { getFormato, FormatoConfig } from "../utils/formatos";

interface ProjectCoverFormatsProps {
  tasks?: Task[];
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  layout?: "bento" | "horizontal";
}

export default function ProjectCoverFormats({ 
  tasks = [], 
  className = "", 
  size = "xl",
  layout = "bento"
}: ProjectCoverFormatsProps) {
  // Extract all valid formats from tasks
  const validTaskFormats: { task: Task; config: FormatoConfig }[] = [];

  tasks.forEach((t) => {
    // Check t.formato first, then fallback to t.format if it matches a preset key
    const cfg = getFormato(t.formato || t.format);
    if (cfg) {
      validTaskFormats.push({ task: t, config: cfg });
    }
  });

  // Scenario 0: No tasks have a valid formato
  if (validTaskFormats.length === 0) {
    return (
      <div className={`flex items-center justify-center text-white/50 ${className}`}>
        <Folder className="w-5 h-5 stroke-[1.5] opacity-70" />
      </div>
    );
  }

  // Extraer formatos únicos para evitar duplicados en la fila horizontal
  const uniqueFormats: FormatoConfig[] = [];
  const seenKeys = new Set<string>();

  validTaskFormats.forEach((item) => {
    if (!seenKeys.has(item.config.key)) {
      seenKeys.add(item.config.key);
      uniqueFormats.push(item.config);
    }
  });

  // Modo Horizontal: Alineación limpia de formas de formato en una sola fila
  if (layout === "horizontal") {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        {uniqueFormats.slice(0, 4).map((fmtConfig) => (
          <FormatoShape key={fmtConfig.key} formatoObj={fmtConfig} size={size} />
        ))}
      </div>
    );
  }

  // Check if all share the exact same format
  const firstKey = validTaskFormats[0].config.key;
  const allSame = validTaskFormats.every((item) => item.config.key === firstKey);

  // Scenario 1: Only 1 task OR all tasks share the exact same formato
  if (validTaskFormats.length === 1 || allSame) {
    return (
      <div className={`flex items-center justify-center w-full h-full ${className}`}>
        <FormatoShape formatoObj={validTaskFormats[0].config} size={size} />
      </div>
    );
  }

  // Scenario 2: 2+ tasks with mixed formats -> Bento Mosaic Layout
  const getVerticalityRank = (prop: string) => {
    if (prop === "9:16") return 4;
    if (prop === "4:5") return 3;
    if (prop === "1:1") return 2;
    return 1;
  };

  const sortedFormats = [...validTaskFormats].sort(
    (a, b) => getVerticalityRank(b.config.proporcion) - getVerticalityRank(a.config.proporcion)
  );

  const mainTile = sortedFormats[0];
  const sideTiles = sortedFormats.slice(1);
  const maxSideVisible = 2;
  const totalCount = validTaskFormats.length;
  const overflowCount = totalCount > 3 ? totalCount - 2 : 0;

  return (
    <div className={`flex items-center justify-center gap-2.5 p-1.5 w-full h-full ${className}`}>
      {/* Primary Vertical Column Tile */}
      <div className="flex items-center justify-center shrink-0">
        <FormatoShape formatoObj={mainTile.config} size={size === "xl" ? "lg" : "md"} />
      </div>

      {/* Side Column Stack */}
      <div className="flex flex-col gap-1.5 shrink-0 justify-center">
        {sideTiles.slice(0, overflowCount > 0 ? 1 : maxSideVisible).map((item, idx) => (
          <FormatoShape key={idx} formatoObj={item.config} size="md" />
        ))}

        {overflowCount > 0 && (
          <div className="w-8 h-8 rounded-md border-[1.5px] border-white/70 bg-black/40 backdrop-blur-sm flex items-center justify-center text-xs font-black text-white shrink-0">
            +{overflowCount}
          </div>
        )}
      </div>
    </div>
  );
}
