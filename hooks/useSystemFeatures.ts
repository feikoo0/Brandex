"use client";

import { useState, useEffect, useCallback } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type FeatureAudience = "master" | "beta" | "all";

export interface FeatureFlag {
  id: string;
  label: string;
  description: string;
  category: "modulos" | "ia" | "herramientas" | "experimento";
  audience: FeatureAudience; // "master" = Solo Llave Maestra | "beta" = Usuarios Beta + Master | "all" = Público General
  enabled: boolean;
  updatedAt?: string;
}

export const DEFAULT_FEATURES: Record<string, FeatureFlag> = {
  inicio: {
    id: "inicio",
    label: "Copilot IA en Inicio",
    description: "Asistente inteligente para análisis de proyectos y generación de entregables.",
    category: "ia",
    audience: "master",
    enabled: true,
  },
  home: {
    id: "home",
    label: "Work (Lienzo & Kanban)",
    description: "Tablero principal de proyectos, entregables, calendario y sesiones.",
    category: "modulos",
    audience: "all",
    enabled: true,
  },
  proyectos: {
    id: "proyectos",
    label: "Catálogo de Proyectos",
    description: "Vista de galería y fichas fullscreen de proyectos activos.",
    category: "modulos",
    audience: "all",
    enabled: true,
  },
  clientes: {
    id: "clientes",
    label: "Directorio de Clientes",
    description: "Directorio de marcas asociadas, contratos y enlaces de Drive.",
    category: "modulos",
    audience: "all",
    enabled: true,
  },
  equipo: {
    id: "equipo",
    label: "Espacio de Equipo",
    description: "Gestión de colaboradores, habilidades y balance de carga de trabajo.",
    category: "modulos",
    audience: "beta",
    enabled: true,
  },
  finanzas: {
    id: "finanzas",
    label: "Métricas Financieras",
    description: "Facturación global, costos de nómina y margen operativo por cliente.",
    category: "modulos",
    audience: "master",
    enabled: true,
  },
  recursos: {
    id: "recursos",
    label: "Biblioteca de Recursos",
    description: "Repositorio de plantillas, formatos vectoriales y documentación.",
    category: "herramientas",
    audience: "all",
    enabled: true,
  },
  cronometro: {
    id: "cronometro",
    label: "Cronómetro Flotante & Sesiones",
    description: "Registro de tiempo en vivo y cálculo de esfuerzo acumulado.",
    category: "herramientas",
    audience: "all",
    enabled: true,
  },
};

export function useSystemFeatures() {
  const [features, setFeatures] = useState<Record<string, FeatureFlag>>(DEFAULT_FEATURES);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const configDocRef = doc(db, "system_config", "features");

    const unsubscribe = onSnapshot(
      configDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const merged: Record<string, FeatureFlag> = { ...DEFAULT_FEATURES };

          Object.keys(DEFAULT_FEATURES).forEach((key) => {
            if (data[key]) {
              merged[key] = {
                ...DEFAULT_FEATURES[key],
                ...data[key],
              };
            }
          });

          // Agregar flags extras creados dinámicamente si los hay
          Object.keys(data).forEach((key) => {
            if (!merged[key]) {
              merged[key] = data[key] as FeatureFlag;
            }
          });

          setFeatures(merged);
        } else {
          // Inicializar por primera vez en Firestore
          setDoc(configDocRef, DEFAULT_FEATURES).catch((err) =>
            console.error("Error al inicializar system_config/features:", err)
          );
          setFeatures(DEFAULT_FEATURES);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("Error escuchando system_config/features:", error);
        setFeatures(DEFAULT_FEATURES);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const updateFeatureAudience = useCallback(
    async (featureId: string, audience: FeatureAudience, enabled?: boolean) => {
      try {
        const configDocRef = doc(db, "system_config", "features");
        const current = features[featureId] || DEFAULT_FEATURES[featureId];
        if (!current) return;

        const updated: FeatureFlag = {
          ...current,
          audience,
          enabled: typeof enabled === "boolean" ? enabled : current.enabled,
          updatedAt: new Date().toISOString(),
        };

        await setDoc(
          configDocRef,
          {
            [featureId]: updated,
          },
          { merge: true }
        );
      } catch (err) {
        console.error("Error al actualizar feature flag:", err);
        throw err;
      }
    },
    [features]
  );

  const toggleFeatureEnabled = useCallback(
    async (featureId: string) => {
      const current = features[featureId];
      if (!current) return;
      await updateFeatureAudience(featureId, current.audience, !current.enabled);
    },
    [features, updateFeatureAudience]
  );

  /**
   * Determina si una funcionalidad está visible para el usuario actual
   * @param featureId ID de la funcionalidad
   * @param isMaster Si el usuario actual es la Llave Maestra (Brandex)
   * @param isBetaUser Si el usuario actual es un espacio beta registrado
   */
  const isFeatureVisible = useCallback(
    (featureId: string, isMaster: boolean, isBetaUser: boolean = false): boolean => {
      const flag = features[featureId];
      if (!flag) return true; // Si no está configurada, permitir por defecto
      if (!flag.enabled) return isMaster; // Si está apagada totalmente, solo el master puede verla para desarrollo

      if (isMaster) return true; // Llave Maestra siempre tiene acceso completo

      if (flag.audience === "all") return true;
      if (flag.audience === "beta") return isBetaUser;
      if (flag.audience === "master") return isMaster;

      return false;
    },
    [features]
  );

  return {
    features,
    isLoading,
    updateFeatureAudience,
    toggleFeatureEnabled,
    isFeatureVisible,
  };
}
