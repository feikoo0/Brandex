"use client";

import React from "react";
import { Play, Layers, Type, Image as ImageIcon } from "lucide-react";
import { getFormato, FormatoConfig } from "../utils/formatos";

interface FormatoShapeProps {
  formatoKey?: string | null;
  formatoObj?: FormatoConfig | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  isNightMode?: boolean;
}

export default function FormatoShape({
  formatoKey,
  formatoObj,
  size = "sm",
  className = "",
  isNightMode = true,
}: FormatoShapeProps) {
  const formato = formatoObj || getFormato(formatoKey);

  if (!formato) return null;

  // Aspect ratio class selection (mantiene la geometría exacta)
  let aspectClass = "aspect-[1/1]";
  if (formato.proporcion === "9:16") aspectClass = "aspect-[9/16]";
  else if (formato.proporcion === "4:5") aspectClass = "aspect-[4/5]";
  else if (formato.proporcion === "1:1") aspectClass = "aspect-[1/1]";
  else if (formato.proporcion === "16:9") aspectClass = "aspect-[16/9]";

  // Dimensiones basadas en altura fija con mayor margen interior (padding) para el icono
  let sizeClasses = "h-8 w-auto";
  let iconSizeClass = "w-3 h-3";

  if (size === "sm") {
    sizeClasses = "h-8 w-auto";
    iconSizeClass = "w-3 h-3";
  } else if (size === "md") {
    sizeClasses = "h-12 w-auto";
    iconSizeClass = "w-4 h-4";
  } else if (size === "lg") {
    sizeClasses = "h-16 w-auto";
    iconSizeClass = "w-6 h-6";
  } else if (size === "xl") {
    sizeClasses = "h-22 w-auto";
    iconSizeClass = "w-8 h-8";
  }

  const iconColorClass = isNightMode ? "text-white" : "text-amber-950";

  // Renderizado del icono en solo trazo con grosor uniforme de 1.8px y opacidad 100%
  const renderIcon = () => {
    const iconType = formato.icono || formato.tipo_medio;
    const strokeWidth = 1.8;

    switch (iconType) {
      case "play":
      case "video":
        return (
          <Play
            strokeWidth={strokeWidth}
            className={`${iconSizeClass} ${iconColorClass} fill-none translate-x-[0.5px]`}
          />
        );
      case "carrusel":
        return (
          <Layers
            strokeWidth={strokeWidth}
            className={`${iconSizeClass} ${iconColorClass}`}
          />
        );
      case "texto":
        return (
          <Type
            strokeWidth={strokeWidth}
            className={`${iconSizeClass} ${iconColorClass}`}
          />
        );
      case "imagen":
      default:
        return (
          <ImageIcon
            strokeWidth={strokeWidth}
            className={`${iconSizeClass} ${iconColorClass}`}
          />
        );
    }
  };

  const roundedClass =
    size === "xl"
      ? "rounded-xl"
      : size === "lg"
      ? "rounded-lg"
      : size === "md"
      ? "rounded-md"
      : "rounded-[5px]";

  const containerThemeClass = isNightMode
    ? `border-[1.5px] border-white/70 bg-white/15 ${roundedClass}`
    : `bg-amber-200/80 ${roundedClass}`;

  return (
    <div
      title={`${formato.nombre} (${formato.proporcion})`}
      className={`relative flex items-center justify-center backdrop-blur-sm transition-all shrink-0 p-1 ${containerThemeClass} ${aspectClass} ${sizeClasses} ${className}`}
    >
      {renderIcon()}
    </div>
  );
}
