"use client";

import React, { useMemo } from "react";
import Image from "next/image";

export interface AuroraPalette {
  id: string;
  name: string;
  baseColor: string;
  backgroundCss: string;
  textColor: string;
  subtleGlow: string;
}

export const AURORA_PALETTES: AuroraPalette[] = [
  {
    id: "sunset-rose",
    name: "Sunset Rose",
    baseColor: "#ffe4d6",
    // Réplica exacta de la referencia: base melocotón suave, mancha rosa/fucsia en esquina superior izquierda,
    // destello ámbar dorado en el lateral derecho y rubor cálido inferior
    backgroundCss: `
      radial-gradient(circle at 18% 22%, #ff2a85 0%, rgba(255, 42, 133, 0.55) 30%, transparent 62%),
      radial-gradient(circle at 86% 58%, #f59e0b 0%, rgba(245, 158, 11, 0.45) 28%, transparent 58%),
      radial-gradient(circle at 45% 88%, #fb7185 0%, rgba(251, 113, 133, 0.35) 25%, transparent 55%),
      linear-gradient(135deg, #ffd8c7 0%, #fee2e2 50%, #fef3c7 100%)
    `,
    textColor: "#9f1239", // Tono vino carmesí saturado idéntico a la referencia
    subtleGlow: "rgba(255, 42, 133, 0.25)",
  },
  {
    id: "cosmic-lavender",
    name: "Cosmic Lavender",
    baseColor: "#ede9fe",
    backgroundCss: `
      radial-gradient(circle at 20% 20%, #8b5cf6 0%, rgba(139, 92, 246, 0.55) 32%, transparent 60%),
      radial-gradient(circle at 82% 65%, #06b6d4 0%, rgba(6, 182, 212, 0.45) 30%, transparent 58%),
      radial-gradient(circle at 50% 90%, #ec4899 0%, rgba(236, 72, 153, 0.35) 25%, transparent 55%),
      linear-gradient(135deg, #e0e7ff 0%, #ede9fe 50%, #fce7f3 100%)
    `,
    textColor: "#4c1d95", // Violeta real profundo
    subtleGlow: "rgba(139, 92, 246, 0.25)",
  },
  {
    id: "emerald-citrus",
    name: "Emerald Citrus",
    baseColor: "#dcfce7",
    backgroundCss: `
      radial-gradient(circle at 22% 20%, #10b981 0%, rgba(16, 185, 129, 0.55) 32%, transparent 60%),
      radial-gradient(circle at 84% 60%, #eab308 0%, rgba(234, 179, 8, 0.45) 30%, transparent 58%),
      radial-gradient(circle at 48% 88%, #14b8a6 0%, rgba(20, 184, 166, 0.35) 25%, transparent 55%),
      linear-gradient(135deg, #d1fae5 0%, #ecfdf5 50%, #fef9c3 100%)
    `,
    textColor: "#064e3b", // Verde bosque esmeralda profundo
    subtleGlow: "rgba(16, 185, 129, 0.25)",
  },
  {
    id: "ocean-breeze",
    name: "Ocean Breeze",
    baseColor: "#e0f2fe",
    backgroundCss: `
      radial-gradient(circle at 20% 22%, #0284c7 0%, rgba(2, 132, 199, 0.55) 32%, transparent 60%),
      radial-gradient(circle at 84% 62%, #38bdf8 0%, rgba(56, 189, 248, 0.45) 30%, transparent 58%),
      radial-gradient(circle at 45% 88%, #6366f1 0%, rgba(99, 102, 241, 0.35) 25%, transparent 55%),
      linear-gradient(135deg, #bae6fd 0%, #e0f2fe 50%, #e0e7ff 100%)
    `,
    textColor: "#0c4a6e", // Azul marino cerúleo
    subtleGlow: "rgba(2, 132, 199, 0.25)",
  },
  {
    id: "solar-citrus",
    name: "Solar Citrus",
    baseColor: "#fef3c7",
    backgroundCss: `
      radial-gradient(circle at 20% 20%, #f97316 0%, rgba(249, 115, 22, 0.55) 32%, transparent 60%),
      radial-gradient(circle at 82% 60%, #e11d48 0%, rgba(225, 29, 72, 0.45) 30%, transparent 58%),
      radial-gradient(circle at 50% 88%, #fbbf24 0%, rgba(251, 191, 36, 0.35) 25%, transparent 55%),
      linear-gradient(135deg, #fde68a 0%, #fed7aa 50%, #fecdd3 100%)
    `,
    textColor: "#7c2d12", // Ámbar ocre profundo
    subtleGlow: "rgba(249, 115, 22, 0.25)",
  },
  {
    id: "ultra-violet",
    name: "Ultra Violet",
    baseColor: "#fae8ff",
    backgroundCss: `
      radial-gradient(circle at 22% 20%, #d946ef 0%, rgba(217, 70, 239, 0.55) 32%, transparent 60%),
      radial-gradient(circle at 84% 62%, #3b82f6 0%, rgba(59, 130, 246, 0.45) 30%, transparent 58%),
      radial-gradient(circle at 46% 88%, #f43f5e 0%, rgba(244, 63, 94, 0.35) 25%, transparent 55%),
      linear-gradient(135deg, #f5d0fe 0%, #fae8ff 50%, #dbeafe 100%)
    `,
    textColor: "#701a75", // Ciruela magenta profundo
    subtleGlow: "rgba(217, 70, 239, 0.25)",
  },
  {
    id: "arctic-glacier",
    name: "Arctic Glacier",
    baseColor: "#ccfbf1",
    backgroundCss: `
      radial-gradient(circle at 20% 20%, #0d9488 0%, rgba(13, 148, 136, 0.55) 32%, transparent 60%),
      radial-gradient(circle at 82% 62%, #3b82f6 0%, rgba(59, 130, 246, 0.45) 30%, transparent 58%),
      radial-gradient(circle at 48% 88%, #2dd4bf 0%, rgba(45, 212, 191, 0.35) 25%, transparent 55%),
      linear-gradient(135deg, #99f6e4 0%, #ccfbf1 50%, #dbeafe 100%)
    `,
    textColor: "#134e4a", // Océano turquesa profundo
    subtleGlow: "rgba(13, 148, 136, 0.25)",
  },
  {
    id: "volcano-ember",
    name: "Volcano Ember",
    baseColor: "#fee2e2",
    backgroundCss: `
      radial-gradient(circle at 20% 20%, #dc2626 0%, rgba(220, 38, 38, 0.55) 32%, transparent 60%),
      radial-gradient(circle at 82% 62%, #f97316 0%, rgba(249, 115, 22, 0.45) 30%, transparent 58%),
      radial-gradient(circle at 48% 88%, #fbbf24 0%, rgba(251, 191, 36, 0.35) 25%, transparent 55%),
      linear-gradient(135deg, #fecaca 0%, #fee2e2 50%, #ffedd5 100%)
    `,
    textColor: "#7f1d1d", // Rojo rubí oscuro
    subtleGlow: "rgba(220, 38, 38, 0.25)",
  },
  {
    id: "cyber-lime",
    name: "Cyber Lime",
    baseColor: "#f7fee7",
    backgroundCss: `
      radial-gradient(circle at 20% 20%, #84cc16 0%, rgba(132, 204, 22, 0.55) 32%, transparent 60%),
      radial-gradient(circle at 84% 60%, #06b6d4 0%, rgba(6, 182, 212, 0.45) 30%, transparent 58%),
      radial-gradient(circle at 48% 88%, #22c55e 0%, rgba(34, 197, 94, 0.35) 25%, transparent 55%),
      linear-gradient(135deg, #d9f99d 0%, #ecfccb 50%, #cffafe 100%)
    `,
    textColor: "#365314", // Pino lima profundo
    subtleGlow: "rgba(132, 204, 22, 0.25)",
  },
  {
    id: "obsidian-titanium",
    name: "Obsidian Titanium",
    baseColor: "#f1f5f9",
    backgroundCss: `
      radial-gradient(circle at 20% 20%, #475569 0%, rgba(71, 85, 105, 0.55) 32%, transparent 60%),
      radial-gradient(circle at 82% 62%, #1e293b 0%, rgba(30, 41, 59, 0.45) 30%, transparent 58%),
      radial-gradient(circle at 48% 88%, #94a3b8 0%, rgba(148, 163, 184, 0.35) 25%, transparent 55%),
      linear-gradient(135deg, #e2e8f0 0%, #f1f5f9 50%, #cbd5e1 100%)
    `,
    textColor: "#0f172a", // Carbón titanio
    subtleGlow: "rgba(71, 85, 105, 0.25)",
  },
];

/**
 * Función de hashing determinista djb2 para asociar de manera consistente
 * cada usuario a una de las 10 paletas de gradiente Aurora Mesh.
 */
export function getAvatarPalette(seed?: string, forcedPaletteId?: string): AuroraPalette {
  if (forcedPaletteId) {
    const found = AURORA_PALETTES.find((p) => p.id === forcedPaletteId);
    if (found) return found;
  }

  if (!seed || seed.trim() === "") {
    return AURORA_PALETTES[0]; // Sunset Rose por defecto
  }

  let hash = 5381;
  const str = seed.trim().toLowerCase();
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }

  const index = Math.abs(hash) % AURORA_PALETTES.length;
  return AURORA_PALETTES[index];
}

/**
 * Extrae la letra inicial en mayúscula de un nombre o correo.
 */
export function getAvatarInitial(name?: string, email?: string): string {
  const cleanName = (name || "").trim();
  if (cleanName && cleanName.toLowerCase() !== "usuario") {
    return cleanName[0].toUpperCase();
  }

  const cleanEmail = (email || "").trim();
  if (cleanEmail) {
    return cleanEmail[0].toUpperCase();
  }

  return "A";
}

export interface TaskiAvatarProps {
  name?: string;
  email?: string;
  src?: string | null;
  size?: number; // en píxeles (default: 32)
  paletteId?: string; // id forzado o aleatorio
  className?: string;
  title?: string;
}

/**
 * TaskiAvatar — Squircle avatar con gradiente Aurora Mesh y tipografía armónica adaptada.
 * Cumple fielmente con el diseño de referencia:
 * - Curvatura squircle continua (~28% del ancho).
 * - Trazo fino perimetral (border-white/20 con inset highlight).
 * - Gradientes suaves difuminados con puntos de luz orgánica.
 * - Tipografía armónica con mix-blend-mode: multiply para máxima integración y contraste.
 */
export function TaskiAvatar({
  name,
  email,
  src,
  size = 32,
  paletteId,
  className = "",
  title,
}: TaskiAvatarProps) {
  // Obtener la paleta calculada a partir de email o nombre
  const palette = useMemo(() => {
    const seed = email || name || "Taski";
    return getAvatarPalette(seed, paletteId);
  }, [name, email, paletteId]);

  // Inicial
  const initial = useMemo(() => {
    return getAvatarInitial(name, email);
  }, [name, email]);

  // Radio squircle continuo proporcional (~28%)
  const borderRadius = Math.max(6, Math.round(size * 0.28));
  // Tamaño tipográfico proporcional al avatar
  const fontSize = Math.max(10, Math.round(size * 0.44));

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none overflow-hidden transition-transform duration-200 ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${borderRadius}px`,
        background: palette.backgroundCss,
        boxShadow: `0 2px 8px -2px ${palette.subtleGlow}, inset 0 0 0 1px rgba(255, 255, 255, 0.25)`,
      }}
      title={title || name || email || "Usuario"}
    >
      {/* Trazo fino nítido exterior */}
      <div
        className="absolute inset-0 pointer-events-none border border-black/10"
        style={{ borderRadius: `${borderRadius}px` }}
      />

      {src ? (
        <Image
          src={src}
          alt={name || "Avatar"}
          width={size}
          height={size}
          className="w-full h-full object-cover"
        />
      ) : (
        /* Letra adaptada armónicamente al fondo */
        <span
          className="font-bold tracking-tight leading-none text-center transform translate-y-[0.5px]"
          style={{
            fontSize: `${fontSize}px`,
            color: palette.textColor,
            // mix-blend-mode: multiply hace que la letra se fusione orgánicamente
            // absorbiendo la luz del fondo aurora mesh exactamente como en la imagen de referencia
            mixBlendMode: "multiply",
            filter: "drop-shadow(0 0.5px 1px rgba(0, 0, 0, 0.12))",
          }}
        >
          {initial}
        </span>
      )}
    </div>
  );
}

export default TaskiAvatar;
