"use client";

import React from "react";

export interface ProgressBarMinimalProps {
  /** Cantidad de tareas completadas */
  completedTasks: number;
  /** Cantidad total de tareas del proyecto */
  totalTasks: number;
  /** Estado de la tarea actual para indicar si está en proceso */
  currentTaskStatus?: string;
  /** Clase CSS adicional para el contenedor de la barra */
  className?: string;
}

export const ProgressBarMinimal: React.FC<ProgressBarMinimalProps> = ({
  completedTasks,
  totalTasks,
  currentTaskStatus,
  className = "",
}) => {
  const segmentsCount = Math.max(1, totalTasks || 1);

  return (
    <div
      className={`w-full flex items-center gap-1 h-1 my-0.5 select-none ${className}`}
      role="progressbar"
      aria-valuenow={completedTasks}
      aria-valuemin={0}
      aria-valuemax={segmentsCount}
    >
      {Array.from({ length: segmentsCount }).map((_, idx) => {
        const isCompleted = idx < completedTasks;
        const isInProcess =
          !isCompleted &&
          (currentTaskStatus === "En Proceso" || currentTaskStatus === "En Proceso ") &&
          idx === completedTasks;

        return (
          <div
            key={idx}
            className={`h-full flex-1 rounded-full transition-all duration-300 ${
              isCompleted
                ? "bg-white"
                : isInProcess
                ? "bg-white/60"
                : "bg-white/20"
            }`}
          />
        );
      })}
    </div>
  );
};

export default ProgressBarMinimal;
