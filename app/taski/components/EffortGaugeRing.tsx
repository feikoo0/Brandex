"use client";

import React from "react";

export const EFFORT_THRESHOLDS = {
  low: 0.4,   // < 40% del tiempo estimado consumido
  mid: 0.75,  // 40% - 75% del tiempo estimado consumido
} as const;

export const DELIVERY_THRESHOLDS = {
  low: 3,     // > 3 días restantes
  mid: 1,     // 1 a 3 días restantes
} as const;

export type GaugeVariant = "dashed" | "partial" | "solid";
export type GaugeSeverity = "low" | "mid" | "high";

export interface EffortGaugeRingProps {
  /** Valor de progreso normalizado (0 a 1, o > 1 si está sobrepasado) */
  progress?: number;
  /** Variante visual de llenado del aro */
  variant?: GaugeVariant;
  /** Color semafórico personalizado (si no se define, se calcula según severidad) */
  color?: string;
  /** Nivel de severidad para coloreado automático */
  severity?: GaugeSeverity;
  /** Diámetro del indicador en píxeles (default: 16) */
  size?: number;
  /** Grosor del trazo del aro (default: 2) */
  strokeWidth?: number;
  /** Mostrar punto/círculo central (default: true) */
  showCenterDot?: boolean;
  /** Clase CSS adicional para el contenedor SVG */
  className?: string;
  /** Título accesible o tooltip */
  title?: string;
}

const SEVERITY_COLORS: Record<GaugeSeverity, string> = {
  low: "#10b981",  // Verde Esmeralda (Bajo consumo / lejos de entrega)
  mid: "#eab308",  // Amarillo Ámbar (Consumo medio / entrega cercana)
  high: "#f43f5e", // Rojo Rosa (Sobrepasado / entrega hoy o vencida)
};

export const EffortGaugeRing: React.FC<EffortGaugeRingProps> = ({
  progress = 0,
  variant,
  color,
  severity = "low",
  size = 16,
  strokeWidth = 2,
  showCenterDot = true,
  className = "",
  title,
}) => {
  // 1. Determinar color final (prioridad: prop color > SEVERITY_COLORS[severity])
  const activeColor = color || SEVERITY_COLORS[severity];

  // 2. Determinar variante final si no se pasó explícitamente
  const activeVariant: GaugeVariant = variant || (
    severity === "high" || progress >= 1.0
      ? "solid"
      : severity === "mid" || progress >= EFFORT_THRESHOLDS.low
      ? "partial"
      : "dashed"
  );

  // 3. Geometría SVG
  const center = size / 2;
  const radius = Math.max(1, center - strokeWidth);
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.max(0, Math.min(progress, 1));
  const strokeDashoffset = circumference - clampedProgress * circumference;

  // Radio del punto central (proporcional al tamaño)
  const dotRadius = Math.max(1.5, size * 0.15);

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
      title={title}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
      >
        {/* Caso 1: Sólido completo (Sobrepasado / Vencido) */}
        {activeVariant === "solid" ? (
          <>
            {/* Círculo de fondo tenue */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill={`${activeColor}26`} // 15% opacidad
              stroke={activeColor}
              strokeWidth={strokeWidth}
            />
            {/* Punto o disco central brillante */}
            {showCenterDot && (
              <circle
                cx={center}
                cy={center}
                r={dotRadius + 0.5}
                fill={activeColor}
              />
            )}
          </>
        ) : activeVariant === "partial" ? (
          <>
            {/* Aro base/track */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth={strokeWidth}
            />
            {/* Arco de progreso continuo */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={activeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${center} ${center})`}
              className="transition-all duration-300"
            />
            {/* Punto central */}
            {showCenterDot && (
              <circle
                cx={center}
                cy={center}
                r={dotRadius}
                fill={activeColor}
              />
            )}
          </>
        ) : (
          <>
            {/* Caso 3: Dashed / Punteado (Bajo consumo / lejos de la fecha) */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth={strokeWidth}
            />
            {/* Aro segmentado/punteado con el color activo */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={activeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={`${circumference * 0.15} ${circumference * 0.1}`}
              strokeDashoffset={0}
              strokeLinecap="round"
              transform={`rotate(-90 ${center} ${center})`}
              className="transition-all duration-300 opacity-80"
            />
            {/* Punto central */}
            {showCenterDot && (
              <circle
                cx={center}
                cy={center}
                r={dotRadius}
                fill={activeColor}
              />
            )}
          </>
        )}
      </svg>
    </div>
  );
};

export default EffortGaugeRing;
