"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { EntityProfileVertical } from "./entity-detail/EntityProfileVertical";
import { EntityProjectsKanban } from "./entity-detail/EntityProjectsKanban";
import { EntityPropertiesGoals } from "./entity-detail/EntityPropertiesGoals";
import { EntityFinancesInsights } from "./entity-detail/EntityFinancesInsights";
import type { Client, Member, Project } from "@/lib/types";

export interface EntityDetailViewProps {
  entity: Client | Member;
  entityType: "client" | "member" | "user";
  allProjects: any[];
  onBack: () => void;
  onOpenProject: (projectId: string | number) => void;
  onCreateProject?: () => void;
  onUpdateEntity: (updated: Partial<Client | Member>) => Promise<void> | void;
  className?: string;
}

export function EntityDetailView({
  entity,
  entityType,
  allProjects = [],
  onBack,
  onOpenProject,
  onCreateProject,
  onUpdateEntity,
  className = "",
}: EntityDetailViewProps) {
  // Filter projects belonging to this entity
  const entityProjects = useMemo(() => {
    const entIdStr = String(entity.id);
    const entNameLower = (entity.nombre || (entity as any).name || "").toLowerCase();

    return allProjects.filter((p) => {
      if (entityType === "client") {
        // Match by client_id, cliente_ids or client name
        const matchId = 
          String(p.cliente_ids?.[0] || "") === entIdStr || 
          String((p as any).cliente_id || "") === entIdStr ||
          String((p as any).client || "") === entIdStr;
        const matchName = (p as any).client?.toLowerCase() === entNameLower || (p as any).cliente?.toLowerCase() === entNameLower;
        return matchId || matchName;
      } else {
        // Match by assigned worker ID or name
        const matchId = (p.asignado_ids || []).map(String).includes(entIdStr);
        const matchName = p.asignado?.toLowerCase().includes(entNameLower);
        return matchId || matchName;
      }
    });
  }, [allProjects, entity, entityType]);

  const handleUpdateProjectStatus = async (projId: string | number, newStatus: string) => {
    // Project status updater callback
    console.log(`Updated project ${projId} status to ${newStatus}`);
  };

  const handleUpdateFinances = async (updatedFinances: any) => {
    await onUpdateEntity({
      finanzas: updatedFinances,
    } as any);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`h-full flex flex-col p-6 overflow-y-auto custom-scrollbar bg-transparent ${className}`}
    >
      {/* 4-Zone Master Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[700px] flex-1">
        {/* ── TOP-LEFT: ZONE 1 (Perfil Vertical) ── */}
        <div className="lg:col-span-4 flex flex-col">
          <EntityProfileVertical
            entity={entity}
            type={entityType}
            onBack={onBack}
            onUpdateEntity={onUpdateEntity}
            className="flex-1"
          />
        </div>

        {/* ── TOP-RIGHT: ZONE 2 (Kanban de Proyectos) ── */}
        <div className="lg:col-span-8 flex flex-col">
          <EntityProjectsKanban
            projects={entityProjects}
            entityId={entity.id}
            entityName={entity.nombre || (entity as any).name || "Entidad"}
            onOpenProject={onOpenProject}
            onCreateProject={onCreateProject}
            onUpdateProjectStatus={handleUpdateProjectStatus}
            className="flex-1"
          />
        </div>

        {/* ── BOTTOM-LEFT: ZONE 3 (Propiedades y Metas) ── */}
        <div className="lg:col-span-4 flex flex-col">
          <EntityPropertiesGoals
            entity={entity}
            type={entityType}
            onUpdateEntity={onUpdateEntity}
            className="flex-1"
          />
        </div>

        {/* ── BOTTOM-RIGHT: ZONE 4 (Finanzas + Insights) ── */}
        <div className="lg:col-span-8 flex flex-col">
          <EntityFinancesInsights
            entity={entity}
            type={entityType}
            projects={entityProjects}
            onUpdateFinances={handleUpdateFinances}
            className="flex-1"
          />
        </div>
      </div>
    </motion.div>
  );
}
