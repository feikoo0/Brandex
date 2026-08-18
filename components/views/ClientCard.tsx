"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoreHorizontal, ChevronRight, Trash2, Eye, ExternalLink } from "lucide-react";
import { useData } from "@/hooks/useData";
import { cn, avatarOf, getSingleSourceClientColor, getClientLastProjectText } from "@/lib/utils";
import { STATUS_COLORS } from "@/lib/constants";
import ProjectCoverFormats from "@/app/taski/components/ProjectCoverFormats";
import { ProjectStatusIcon } from "@/components/common/ProjectStatusIcon";
import { playSound } from "@/app/taski/utils/audio";
import type { Client } from "@/lib/types";

export interface ClientCardItemProps {
  client: Client;
  onOpenDetail: (client: Client) => void;
  onDeleteClient?: (client: Client) => void | Promise<void>;
  cardStyle?: "cover" | "full";
  clientProjects?: any[];
}

export function ClientCardItem({
  client,
  onOpenDetail,
  onDeleteClient,
  cardStyle = "cover",
  clientProjects,
}: ClientCardItemProps) {
  const { data } = useData();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const clientColor = getSingleSourceClientColor(client).hslCss;

  // Rescatar proyectos pertenecientes a este cliente
  const projects = React.useMemo(() => {
    if (clientProjects) return clientProjects;
    if (!data?.proyectos) return [];
    const clientIdStr = String(client.id);
    const clientNameLower = (client.nombre || client.name || "").toLowerCase();

    return data.proyectos.filter((p) => {
      const matchId =
        String(p.cliente_ids?.[0] || "") === clientIdStr ||
        String((p as any).cliente_id || "") === clientIdStr ||
        String((p as any).client || "") === clientIdStr;
      const matchName =
        (p as any).client?.toLowerCase() === clientNameLower ||
        (p as any).cliente?.toLowerCase() === clientNameLower;
      return matchId || matchName;
    });
  }, [clientProjects, data?.proyectos, client]);

  // Texto "Último proyecto hace X"
  const lastProjectText = getClientLastProjectText(projects);

  // Formatos y tareas agregadas de los proyectos del cliente para el mosaico
  const clientTasks = React.useMemo(() => {
    const allTasks: any[] = [];
    projects.forEach((p) => {
      const pTasks = (data?.tareas || []).filter((t) => t.proyecto_ids?.includes(p.id));
      pTasks.forEach((t) => {
        if (t.formato || (t as any).format) {
          allTasks.push({
            ...t,
            id: t.id,
            title: t.titulo || "",
            format: t.formato || (t as any).format || "",
            formato: t.formato || (t as any).format || "",
            status: t.estado || "Pendiente",
          });
        }
      });
    });
    return allTasks;
  }, [projects, data?.tareas]);

  // Proyectos completados vs activos
  const activeProjectsCount = projects.filter((p) => {
    const st = (p.estadoProyecto || p.estado || (p as any).status || "").toLowerCase();
    return !st.includes("complet") && !st.includes("hecho") && !st.includes("concluid");
  }).length;
  const completedProjectsCount = projects.length - activeProjectsCount;
  const totalProjectsCount = projects.length;

  const totalSegments = Math.max(totalProjectsCount, 1);
  const completedSegments = completedProjectsCount;

  // Trabajadores asignados en los proyectos del cliente
  const assignedWorkers = React.useMemo(() => {
    const workerIds = new Set<string>();
    projects.forEach((p) => {
      (p.asignado_ids || []).forEach((id: string) => workerIds.add(String(id)));
    });

    let workers = Array.from(workerIds)
      .map((id) => data?.trabajadores.find((w) => String(w.id) === String(id)))
      .filter(Boolean);

    if (workers.length === 0) {
      const names = new Set<string>();
      projects.forEach((p) => {
        if (p.asignado) {
          p.asignado.split(",").forEach((n: string) => names.add(n.trim().toLowerCase()));
        }
      });
      workers = (data?.trabajadores || []).filter((w) =>
        Array.from(names).some((n) => n && (w.nombre || (w as any).name || "").toLowerCase().includes(n))
      );
    }
    return workers;
  }, [projects, data?.trabajadores]);

  // Resumen financiero
  const monto =
    client.finanzas?.monto_contrato ??
    Number(client.totalBudget?.replace(/[^0-9.-]+/g, "")) ??
    0;
  const financialAmount = monto > 0 ? `$${monto.toLocaleString()}` : null;

  const clientStatus = client.status || "Activo";

  // ── ESTILO 2: TARJETA DE COLOR COMPLETO ──
  if (cardStyle === "full") {
    return (
      <div
        onClick={() => onOpenDetail(client)}
        className={cn(
          "p-4 rounded-2xl border-none transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-sm hover:shadow-md relative text-white h-[210px]",
          isMenuOpen ? "z-50" : "z-10"
        )}
        style={{ backgroundColor: clientColor }}
      >
        <div>
          {/* Fila Superior: Plan / Industria • Estatus + 3 Puntos */}
          <div className="flex items-center justify-between mb-2.5 text-[11px] font-semibold text-white/90 relative z-30">
            <span
              className="truncate max-w-[170px] bg-black/20 px-2 py-0.5 rounded-full"
              title={client.plan_contratado ? `Plan ${client.plan_contratado}` : client.industria || "Cliente"}
            >
              {client.plan_contratado ? `Plan ${client.plan_contratado}` : client.industria || "Cliente"} • {clientStatus}
            </span>
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen((prev) => !prev);
                  playSound("click");
                }}
                className="p-1 rounded-lg hover:bg-black/20 text-white/80 hover:text-white transition-colors cursor-pointer"
                title="Opciones del cliente"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>

              <AnimatePresence>
                {isMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(false);
                      }}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.92, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.92, y: -4 }}
                      transition={{ duration: 0.15 }}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-full mt-1.5 z-[100] w-44 p-1.5 rounded-2xl bg-[#1f1f1f] border border-white/15 shadow-2xl shadow-black/90 flex flex-col gap-0.5 text-xs text-[#ffffffd6]"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMenuOpen(false);
                          onOpenDetail(client);
                          playSound("click");
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-white/10 text-[#ffffffd6] hover:text-white transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                        <span>Ver Perfil</span>
                      </button>

                      {client.website && (
                        <a
                          href={client.website.startsWith("http") ? client.website : `https://${client.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsMenuOpen(false);
                          }}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-white/10 text-[#ffffffd6] hover:text-white transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-white/60" />
                          <span>Sitio Web</span>
                        </a>
                      )}

                      <div className="h-px bg-white/10 my-0.5" />

                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          setIsMenuOpen(false);
                          if (
                            window.confirm(
                              `¿Estás seguro de que deseas eliminar a "${client.nombre}"? Esta acción no se puede deshacer.`
                            )
                          ) {
                            playSound("trash");
                            if (onDeleteClient) {
                              await onDeleteClient(client);
                            }
                          }
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar Cliente</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Fila Principal: Título + Estatus y Último Proyecto */}
          <div className="flex flex-col min-w-0 mb-3 relative z-10">
            <h3 className="text-base font-medium text-white tracking-tight line-clamp-2 mt-2.5 translate-y-[6px]">
              {client.nombre}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 text-[14px] text-[#ffffff6b] font-normal">
              <ProjectStatusIcon status={clientStatus} className="w-3.5 h-3.5 translate-y-[1.5px]" />
              <span className="font-medium text-white">{clientStatus}</span>
              <span className="text-white/40">•</span>
              <span>{lastProjectText}</span>
            </div>
          </div>
        </div>

        {/* Footer: Barra de Progreso Segmentada */}
        <div className="pt-2 border-t border-white/20 flex flex-col gap-1.5 mt-auto relative z-10">
          <div className="flex items-center gap-1 w-full">
            {Array.from({ length: totalSegments }).map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "h-1 flex-1 rounded-full transition-all",
                  idx < completedSegments ? "bg-white" : "bg-white/30"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── ESTILO 1: TARJETA CON PORTADA EN CONTENEDOR RECTÁNGULO REDONDEADO ──
  return (
    <motion.div
      onClick={() => onOpenDetail(client)}
      className={cn(
        "relative cursor-pointer h-[220px] p-2",
        isMenuOpen ? "z-50" : "z-10"
      )}
      initial="initial"
      whileHover="hover"
    >
      {/* Rectángulo contenedor de fondo con animación Fade In + Scale */}
      <motion.div
        variants={{
          initial: { opacity: 0, scale: 0.88 },
          hover: { opacity: 1, scale: 1 },
        }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0 rounded-2xl bg-[#26262a] border border-white/20 pointer-events-none z-0 shadow-2xl shadow-black/70"
      />

      {/* Contenido estático */}
      <div className="relative z-10 flex flex-col justify-between h-full w-full pointer-events-none">
        {/* 1. PORTADA SUPERIOR */}
        <div
          className="flex-1 w-full p-3.5 rounded-xl relative flex flex-col justify-between pointer-events-auto"
          style={{ backgroundColor: clientColor }}
        >
          {/* Fila Superior: Íconos de Formato o Logotipo / Isotipo del Cliente + Menú de 3 Puntos */}
          <div className="z-30 flex items-center justify-between h-6 shrink-0 pointer-events-auto relative">
            <div className="flex items-center justify-start pointer-events-none">
              {clientTasks.length > 0 ? (
                <ProjectCoverFormats tasks={clientTasks as any} size="xs" layout="horizontal" />
              ) : (
                <div className="w-6 h-6 rounded-lg bg-black/20 backdrop-blur-sm border border-white/20 flex items-center justify-center text-[10px] font-bold text-white uppercase shadow-sm">
                  {client.logo && client.logo.length <= 3
                    ? client.logo
                    : (client.nombre || "C").slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>

            {/* Menú de 3 Puntos en la Portada Superior Derecha */}
            <div className="relative pointer-events-auto">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen((prev) => !prev);
                  playSound("click");
                }}
                className="w-6 h-6 rounded-lg bg-black/20 hover:bg-black/40 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/80 hover:text-white transition-all shadow-sm cursor-pointer"
                title="Opciones del cliente"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>

              <AnimatePresence>
                {isMenuOpen && (
                  <>
                    {/* Backdrop para cerrar al hacer clic fuera */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(false);
                      }}
                    />

                    {/* Menú Flotante por encima de todo */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.92, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.92, y: -4 }}
                      transition={{ duration: 0.15 }}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-full mt-1.5 z-[100] w-44 p-1.5 rounded-2xl bg-[#1f1f1f] border border-white/15 shadow-2xl shadow-black/90 flex flex-col gap-0.5 text-xs text-[#ffffffd6]"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMenuOpen(false);
                          onOpenDetail(client);
                          playSound("click");
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-white/10 text-[#ffffffd6] hover:text-white transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                        <span>Ver Perfil</span>
                      </button>

                      {client.website && (
                        <a
                          href={client.website.startsWith("http") ? client.website : `https://${client.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsMenuOpen(false);
                          }}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-white/10 text-[#ffffffd6] hover:text-white transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-white/60" />
                          <span>Sitio Web</span>
                        </a>
                      )}

                      <div className="h-px bg-white/10 my-0.5" />

                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          setIsMenuOpen(false);
                          if (
                            window.confirm(
                              `¿Estás seguro de que deseas eliminar a "${client.nombre}"? Esta acción no se puede deshacer.`
                            )
                          ) {
                            playSound("trash");
                            if (onDeleteClient) {
                              await onDeleteClient(client);
                            }
                          }
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar Cliente</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Contenido en la parte inferior de la portada: Título + Proyectos • Plan/Industria + Barra */}
          <div className="z-0 mt-auto flex flex-col gap-1.5 pointer-events-none">
            {/* Título de la marca */}
            <h3 className="text-base font-medium text-white tracking-tight line-clamp-1 leading-snug mt-2.5 translate-y-[6px]">
              {client.nombre}
            </h3>

            {/* Subtítulo: Cantidad de proyectos • Industria o Plan */}
            <div className="text-[14px] font-medium text-white/90 flex items-center gap-1.5 line-clamp-1">
              <span>
                {totalProjectsCount} {totalProjectsCount === 1 ? "Proyecto" : "Proyectos"}
              </span>
              <span className="text-white/60">•</span>
              <span
                className="truncate font-normal"
                title={
                  client.plan_contratado
                    ? `Plan ${client.plan_contratado}`
                    : client.industria || client.industry || "Cliente"
                }
              >
                {client.plan_contratado
                  ? `Plan ${client.plan_contratado}`
                  : client.industria || client.industry || "Cliente"}
              </span>
            </div>

            {/* Barra de progreso segmentada */}
            <div className="flex items-center gap-1 w-full mt-0.5">
              {Array.from({ length: totalSegments }).map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-all",
                    idx < completedSegments ? "bg-white" : "bg-white/35"
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 2. CUERPO INFERIOR OSCURO (Estatus • Último Proyecto • Equipo) */}
        <div className="pt-2 px-1 pb-0.5 flex items-center justify-between gap-2 bg-transparent min-w-0 pointer-events-auto relative z-10">
          {/* Estatus + Último proyecto */}
          <div className="flex items-center gap-1.5 text-[#ffffff6b] font-normal min-w-0 flex-wrap">
            <ProjectStatusIcon status={clientStatus} className="w-3.5 h-3.5 translate-y-[1.5px]" />
            <span className="text-[14px] font-medium text-[#ffffffd6] whitespace-nowrap">{clientStatus}</span>
            <span className="text-[#ffffff6b]">•</span>
            <span className="text-[14px] font-normal text-[#ffffff6b] whitespace-nowrap">{lastProjectText}</span>
          </div>

          {/* Avatares del equipo / Inversión */}
          <div className="flex items-center gap-2 shrink-0">
            {assignedWorkers.length > 0 ? (
              <div className="flex -space-x-1.5">
                {assignedWorkers.slice(0, 3).map((w: any) => (
                  <div
                    key={w.id}
                    className="w-4.5 h-4.5 rounded-full bg-[#222222] border border-white/20 flex items-center justify-center text-[6.5px] font-bold text-[#ffffffd6]"
                    title={w.nombre}
                  >
                    {avatarOf(w.nombre)}
                  </div>
                ))}
              </div>
            ) : financialAmount ? (
              <span className="text-[10px] font-semibold text-[#ffffff6b] px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
                {financialAmount}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── 2. VISTA COMPACTA DE TABLA / LISTA ─────────────────────────────────────────
export function ClientListItem({
  client,
  onOpenDetail,
  clientProjects,
}: {
  client: Client;
  onOpenDetail: (client: Client) => void;
  clientProjects?: any[];
}) {
  const { data } = useData();

  const clientColor = getSingleSourceClientColor(client).hslCss;
  const statusColor = STATUS_COLORS[client.status || "Activo"] || "#ffffffd6";

  const projects = React.useMemo(() => {
    if (clientProjects) return clientProjects;
    if (!data?.proyectos) return [];
    const clientIdStr = String(client.id);
    const clientNameLower = (client.nombre || client.name || "").toLowerCase();

    return data.proyectos.filter((p) => {
      const matchId =
        String(p.cliente_ids?.[0] || "") === clientIdStr ||
        String((p as any).cliente_id || "") === clientIdStr ||
        String((p as any).client || "") === clientIdStr;
      const matchName =
        (p as any).client?.toLowerCase() === clientNameLower ||
        (p as any).cliente?.toLowerCase() === clientNameLower;
      return matchId || matchName;
    });
  }, [clientProjects, data?.proyectos, client]);

  const lastProjectText = getClientLastProjectText(projects);

  const activeProjectsCount = projects.filter((p) => {
    const st = (p.estadoProyecto || p.estado || (p as any).status || "").toLowerCase();
    return !st.includes("complet") && !st.includes("hecho") && !st.includes("concluid");
  }).length;
  const completedProjectsCount = projects.length - activeProjectsCount;
  const totalProjectsCount = projects.length;
  const progressPercent = totalProjectsCount > 0 ? Math.round((completedProjectsCount / totalProjectsCount) * 100) : 0;

  const assignedWorkers = React.useMemo(() => {
    const workerIds = new Set<string>();
    projects.forEach((p) => {
      (p.asignado_ids || []).forEach((id: string) => workerIds.add(String(id)));
    });

    return Array.from(workerIds)
      .map((id) => data?.trabajadores.find((w) => String(w.id) === String(id)))
      .filter(Boolean);
  }, [projects, data?.trabajadores]);

  return (
    <div
      onClick={() => onOpenDetail(client)}
      className="flex items-center justify-between p-3.5 rounded-xl bg-[#1f1f1f] hover:bg-[#262626] transition-all cursor-pointer group"
    >
      <div className="flex items-center gap-3 min-w-[200px]">
        <span
          className="w-3 h-3 rounded-full shrink-0 border border-white/20 shadow-sm"
          style={{ backgroundColor: clientColor }}
        />
        <div className="flex flex-col">
          <h4 className="text-xs font-medium text-[#ffffffd6] group-hover:text-white transition-colors">
            {client.nombre}
          </h4>
          <span className="text-[10px] text-[#ffffff6b]">
            {client.plan_contratado ? `Plan ${client.plan_contratado}` : client.industria || client.industry || "Cliente"}
          </span>
        </div>
      </div>

      {/* Estatus Pill */}
      <div
        className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider bg-[#222222] border border-white/10 flex items-center gap-1.5"
        style={{ color: statusColor }}
      >
        <ProjectStatusIcon status={client.status || "Activo"} className="w-3.5 h-3.5 translate-y-[0.5px]" />
        {client.status || "Activo"}
      </div>

      {/* Último Proyecto */}
      <div className="flex items-center gap-1.5 text-xs text-[#ffffff6b] font-normal w-40 shrink-0">
        <span>{lastProjectText}</span>
      </div>

      {/* Progreso de Proyectos */}
      <div className="flex items-center gap-2.5 w-36">
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-[11px] font-bold text-[#ffffffd6] shrink-0">
          {completedProjectsCount}/{totalProjectsCount}
        </span>
      </div>

      {/* Avatares & Chevron */}
      <div className="flex items-center gap-3">
        {assignedWorkers.length > 0 && (
          <div className="flex -space-x-2">
            {assignedWorkers.slice(0, 3).map((w: any) => (
              <div
                key={w.id}
                className="w-5 h-5 rounded-full bg-[#222222] border border-white/10 flex items-center justify-center text-[7px] font-bold text-[#ffffffd6]"
                title={w.nombre}
              >
                {avatarOf(w.nombre)}
              </div>
            ))}
          </div>
        )}
        <ChevronRight className="w-3.5 h-3.5 text-[#ffffff6b] group-hover:text-[#ffffffd6] transition-colors" />
      </div>
    </div>
  );
}

export default ClientCardItem;
