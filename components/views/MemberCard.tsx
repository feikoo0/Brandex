"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoreHorizontal, ChevronRight, User, Trash2, Eye, Mail } from "lucide-react";
import { useData } from "@/hooks/useData";
import { cn, avatarOf, getSingleSourceMemberColor, getMemberLastActivityText } from "@/lib/utils";
import { STATUS_COLORS } from "@/lib/constants";
import ProjectCoverFormats from "@/app/taski/components/ProjectCoverFormats";
import { ProjectStatusIcon } from "@/components/common/ProjectStatusIcon";
import { playSound } from "@/app/taski/utils/audio";
import type { Member } from "@/lib/types";

export interface MemberCardItemProps {
  member: Member;
  onOpenDetail: (member: Member) => void;
  onDeleteMember?: (member: Member) => void | Promise<void>;
  cardStyle?: "cover" | "full";
  memberProjects?: any[];
}

export function MemberCardItem({
  member,
  onOpenDetail,
  onDeleteMember,
  cardStyle = "cover",
  memberProjects,
}: MemberCardItemProps) {
  const { data } = useData();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const memberColor = getSingleSourceMemberColor(member).hslCss;

  // Proyectos asignados al colaborador
  const projects = React.useMemo(() => {
    if (memberProjects && memberProjects.length > 0) return memberProjects;
    if (!data?.proyectos) return [];
    const memberIdStr = String(member.id);
    const memberNameLower = (member.nombre || member.name || "").toLowerCase();
    const assignedProjIds = (member.proyectos_asignados || []).map(String);

    return data.proyectos.filter((p) => {
      const pIdStr = String(p.id);
      const matchProjList = assignedProjIds.includes(pIdStr);
      const matchId = ((p as any).asignado_ids || []).map(String).includes(memberIdStr);
      const matchName = (p as any).asignado?.toLowerCase().includes(memberNameLower);
      return matchProjList || matchId || matchName;
    });
  }, [memberProjects, data?.proyectos, member]);

  // Tareas asignadas al colaborador
  const memberTasks = React.useMemo(() => {
    if (!data?.tareas) return [];
    const memberIdStr = String(member.id);
    const memberNameLower = (member.nombre || member.name || "").toLowerCase();
    const projectIds = new Set(projects.map((p) => String(p.id)));

    return data.tareas.filter((t) => {
      const matchId = (t.asignado_ids || []).map(String).includes(memberIdStr);
      const matchName = t.asignado?.toLowerCase().includes(memberNameLower);
      const matchProj = (t.proyecto_ids || []).some((pid: string) => projectIds.has(String(pid)));
      return matchId || matchName || matchProj;
    });
  }, [data?.tareas, member, projects]);

  // Formatos para el mosaico superior (con fallback por especialidad)
  const taskFormats = React.useMemo(() => {
    const rawFormats = memberTasks
      .filter((t) => t.formato || (t as any).format)
      .map((t) => ({
        ...t,
        id: t.id,
        title: t.titulo || "",
        format: t.formato || (t as any).format || "",
        formato: t.formato || (t as any).format || "",
        status: t.estado || "Pendiente",
      }));

    if (rawFormats.length > 0) return rawFormats;

    // Fallback estándar de formatos según la especialidad del colaborador
    const spec = (member.specialty || member.rol || "").toLowerCase();
    if (spec.includes("video") || spec.includes("editor")) {
      return [
        { id: "f-1", formato: "reel", format: "reel", title: "Reel", status: "Completado" },
        { id: "f-2", formato: "video_horizontal", format: "video_horizontal", title: "Video", status: "Pendiente" },
      ];
    } else if (spec.includes("animaci") || spec.includes("motion") || spec.includes("3d")) {
      return [
        { id: "f-1", formato: "reel", format: "reel", title: "Reel 3D", status: "Completado" },
        { id: "f-2", formato: "carrusel", format: "carrusel", title: "Carrusel", status: "Pendiente" },
      ];
    } else if (spec.includes("dise") || spec.includes("ui") || spec.includes("ux")) {
      return [
        { id: "f-1", formato: "carrusel", format: "carrusel", title: "Carrusel", status: "Completado" },
        { id: "f-2", formato: "post_imagen", format: "post_imagen", title: "Post", status: "Pendiente" },
      ];
    } else if (spec.includes("market") || spec.includes("growth")) {
      return [
        { id: "f-1", formato: "story", format: "story", title: "Story", status: "Completado" },
        { id: "f-2", formato: "carrusel", format: "carrusel", title: "Carrusel", status: "Pendiente" },
      ];
    }
    return [
      { id: "f-1", formato: "post_imagen", format: "post_imagen", title: "Post", status: "Completado" },
      { id: "f-2", formato: "reel", format: "reel", title: "Reel", status: "Pendiente" },
    ];
  }, [memberTasks, member.specialty, member.rol]);

  // Texto "Última actividad hace X"
  const lastActivityText = getMemberLastActivityText(projects, memberTasks);

  // Proyectos completados vs activos
  const activeProjectsCount = projects.filter((p) => {
    const st = (p.estadoProyecto || p.estado || (p as any).status || "").toLowerCase();
    return !st.includes("complet") && !st.includes("hecho") && !st.includes("concluid");
  }).length;
  const completedProjectsCount = projects.length - activeProjectsCount;
  const totalProjectsCount = projects.length;

  const totalSegments = Math.max(totalProjectsCount > 0 ? totalProjectsCount : memberTasks.length, 1);
  const completedSegments = totalProjectsCount > 0 ? completedProjectsCount : (member.completedTasks || 0);

  const memberStatus = member.disponibilidad || member.status || "Disponible";

  // Clientes asociados al colaborador a través de sus proyectos
  const associatedClients = React.useMemo(() => {
    const clientNames = new Set<string>();
    projects.forEach((p) => {
      const cName = (p as any).client || (p as any).cliente || "";
      if (cName) clientNames.add(cName);
    });
    return Array.from(clientNames);
  }, [projects]);

  const workload = member.workloadPercent ?? Math.min(100, Math.round((memberTasks.length / 8) * 100));
  const rateText = member.tarifa_hora ? `$${member.tarifa_hora}/h` : null;

  // ── ESTILO 2: TARJETA DE COLOR COMPLETO ──
  if (cardStyle === "full") {
    return (
      <div
        onClick={() => onOpenDetail(member)}
        className={cn(
          "p-4 rounded-2xl border-none transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-sm hover:shadow-md relative text-white h-[210px]",
          isMenuOpen ? "z-50" : "z-10"
        )}
        style={{ backgroundColor: memberColor }}
      >
        <div>
          {/* Fila Superior: Especialidad / Rol • Disponibilidad + 3 Puntos */}
          <div className="flex items-center justify-between mb-2.5 text-[11px] font-semibold text-white/90 relative z-30">
            <span
              className="truncate max-w-[170px] bg-black/20 px-2 py-0.5 rounded-full"
              title={member.specialty || member.rol || "Especialista"}
            >
              {member.specialty || member.rol || "Especialista"} • {memberStatus}
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
                title="Opciones del colaborador"
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
                      className="absolute right-0 top-full mt-1.5 z-[100] w-48 p-1.5 rounded-2xl bg-[#1f1f1f] border border-white/15 shadow-2xl shadow-black/90 flex flex-col gap-0.5 text-xs text-[#ffffffd6]"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMenuOpen(false);
                          onOpenDetail(member);
                          playSound("click");
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-white/10 text-[#ffffffd6] hover:text-white transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                        <span>Ver Perfil</span>
                      </button>

                      {member.email && (
                        <a
                          href={`mailto:${member.email}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsMenuOpen(false);
                          }}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-white/10 text-[#ffffffd6] hover:text-white transition-colors cursor-pointer"
                        >
                          <Mail className="w-3.5 h-3.5 text-white/60" />
                          <span>Enviar Correo</span>
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
                              `¿Estás seguro de que deseas eliminar a "${member.nombre}"? Esta acción no se puede deshacer.`
                            )
                          ) {
                            playSound("trash");
                            if (onDeleteMember) {
                              await onDeleteMember(member);
                            }
                          }
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar Colaborador</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Fila Principal: Nombre + Estatus y Última Actividad */}
          <div className="flex flex-col min-w-0 mb-3 relative z-10">
            <h3 className="text-base font-medium text-white tracking-tight line-clamp-2 mt-2.5 translate-y-[6px]">
              {member.nombre}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 text-[14px] text-[#ffffff6b] font-normal">
              <ProjectStatusIcon status={memberStatus} className="w-3.5 h-3.5 translate-y-[1.5px]" />
              <span className="font-medium text-white">{memberStatus}</span>
              <span className="text-white/40">•</span>
              <span>{lastActivityText}</span>
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
      onClick={() => onOpenDetail(member)}
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
          style={{ backgroundColor: memberColor }}
        >
          {/* Fila Superior: Mosaico de Formatos + Menú de 3 Puntos */}
          <div className="z-30 flex items-center justify-between h-6 shrink-0 pointer-events-auto relative">
            <div className="flex items-center justify-start pointer-events-none">
              <ProjectCoverFormats tasks={taskFormats as any} size="xs" layout="horizontal" />
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
                title="Opciones del colaborador"
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
                      className="absolute right-0 top-full mt-1.5 z-[100] w-48 p-1.5 rounded-2xl bg-[#1f1f1f] border border-white/15 shadow-2xl shadow-black/90 flex flex-col gap-0.5 text-xs text-[#ffffffd6]"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMenuOpen(false);
                          onOpenDetail(member);
                          playSound("click");
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-white/10 text-[#ffffffd6] hover:text-white transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                        <span>Ver Perfil</span>
                      </button>

                      {member.email && (
                        <a
                          href={`mailto:${member.email}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsMenuOpen(false);
                          }}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-white/10 text-[#ffffffd6] hover:text-white transition-colors cursor-pointer"
                        >
                          <Mail className="w-3.5 h-3.5 text-white/60" />
                          <span>Enviar Correo</span>
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
                              `¿Estás seguro de que deseas eliminar a "${member.nombre}"? Esta acción no se puede deshacer.`
                            )
                          ) {
                            playSound("trash");
                            if (onDeleteMember) {
                              await onDeleteMember(member);
                            }
                          }
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar Colaborador</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Contenido en la parte inferior de la portada: Nombre + Proyectos • Rol + Barra */}
          <div className="z-0 mt-auto flex flex-col gap-1.5 pointer-events-none">
            {/* Nombre del colaborador */}
            <h3 className="text-base font-medium text-white tracking-tight line-clamp-1 leading-snug mt-2.5 translate-y-[6px]">
              {member.nombre}
            </h3>

            {/* Subtítulo: Cantidad de proyectos • Rol o Especialidad */}
            <div className="text-[14px] font-medium text-white/90 flex items-center gap-1.5 line-clamp-1">
              <span>
                {totalProjectsCount > 0
                  ? `${totalProjectsCount} ${totalProjectsCount === 1 ? "Proyecto" : "Proyectos"}`
                  : memberTasks.length > 0
                  ? `${memberTasks.length} ${memberTasks.length === 1 ? "Tarea" : "Tareas"}`
                  : "0 Proyectos"}
              </span>
              <span className="text-white/60">•</span>
              <span
                className="truncate font-normal"
                title={member.rol || member.role || member.specialty || "Especialista"}
              >
                {member.rol || member.role || member.specialty || "Especialista"}
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

        {/* 2. CUERPO INFERIOR OSCURO (Disponibilidad • Última Actividad • Clientes/Carga) */}
        <div className="pt-2 px-1 pb-0.5 flex items-center justify-between gap-2 bg-transparent min-w-0 pointer-events-auto relative z-10">
          {/* Disponibilidad + Última actividad */}
          <div className="flex items-center gap-1.5 text-[#ffffff6b] font-normal min-w-0 flex-wrap">
            <ProjectStatusIcon status={memberStatus} className="w-3.5 h-3.5 translate-y-[1.5px]" />
            <span className="text-[14px] font-medium text-[#ffffffd6] whitespace-nowrap">{memberStatus}</span>
            <span className="text-[#ffffff6b]">•</span>
            <span className="text-[14px] font-normal text-[#ffffff6b] whitespace-nowrap">{lastActivityText}</span>
          </div>

          {/* Clientes asignados / Carga de trabajo */}
          <div className="flex items-center gap-2 shrink-0">
            {associatedClients.length > 0 ? (
              <div className="flex -space-x-1.5">
                {associatedClients.slice(0, 3).map((cName) => (
                  <div
                    key={cName}
                    className="w-4.5 h-4.5 rounded-full bg-[#222222] border border-white/20 flex items-center justify-center text-[6.5px] font-bold text-[#ffffffd6]"
                    title={`Cliente: ${cName}`}
                  >
                    {cName.slice(0, 1).toUpperCase()}
                  </div>
                ))}
              </div>
            ) : workload > 0 ? (
              <span className="text-[10px] font-semibold text-[#ffffffd6] px-2 py-0.5 rounded-full bg-white/10 border border-white/10">
                {workload}% carga
              </span>
            ) : rateText ? (
              <span className="text-[10px] font-semibold text-[#ffffff6b] px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
                {rateText}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── 2. VISTA COMPACTA DE TABLA / LISTA ─────────────────────────────────────────
export function MemberListItem({
  member,
  onOpenDetail,
  memberProjects,
}: {
  member: Member;
  onOpenDetail: (member: Member) => void;
  memberProjects?: any[];
}) {
  const { data } = useData();

  const memberColor = getSingleSourceMemberColor(member).hslCss;
  const statusColor = STATUS_COLORS[member.disponibilidad || member.status || "Disponible"] || "#ffffffd6";

  const projects = React.useMemo(() => {
    if (memberProjects && memberProjects.length > 0) return memberProjects;
    if (!data?.proyectos) return [];
    const memberIdStr = String(member.id);
    const memberNameLower = (member.nombre || member.name || "").toLowerCase();
    const assignedProjIds = (member.proyectos_asignados || []).map(String);

    return data.proyectos.filter((p) => {
      const pIdStr = String(p.id);
      const matchProjList = assignedProjIds.includes(pIdStr);
      const matchId = ((p as any).asignado_ids || []).map(String).includes(memberIdStr);
      const matchName = (p as any).asignado?.toLowerCase().includes(memberNameLower);
      return matchProjList || matchId || matchName;
    });
  }, [memberProjects, data?.proyectos, member]);

  const memberTasks = React.useMemo(() => {
    if (!data?.tareas) return [];
    const memberIdStr = String(member.id);
    const memberNameLower = (member.nombre || member.name || "").toLowerCase();
    const projectIds = new Set(projects.map((p) => String(p.id)));

    return data.tareas.filter((t) => {
      const matchId = (t.asignado_ids || []).map(String).includes(memberIdStr);
      const matchName = t.asignado?.toLowerCase().includes(memberNameLower);
      const matchProj = (t.proyecto_ids || []).some((pid: string) => projectIds.has(String(pid)));
      return matchId || matchName || matchProj;
    });
  }, [data?.tareas, member, projects]);

  const lastActivityText = getMemberLastActivityText(projects, memberTasks);

  const activeProjectsCount = projects.filter((p) => {
    const st = (p.estadoProyecto || p.estado || (p as any).status || "").toLowerCase();
    return !st.includes("complet") && !st.includes("hecho") && !st.includes("concluid");
  }).length;
  const completedProjectsCount = projects.length - activeProjectsCount;
  const totalProjectsCount = projects.length;
  const progressPercent = totalProjectsCount > 0 ? Math.round((completedProjectsCount / totalProjectsCount) * 100) : 0;

  const associatedClients = React.useMemo(() => {
    const clientNames = new Set<string>();
    projects.forEach((p) => {
      const cName = (p as any).client || (p as any).cliente || "";
      if (cName) clientNames.add(cName);
    });
    return Array.from(clientNames);
  }, [projects]);

  const memberStatus = member.disponibilidad || member.status || "Disponible";

  return (
    <div
      onClick={() => onOpenDetail(member)}
      className="flex items-center justify-between p-3.5 rounded-xl bg-[#1f1f1f] hover:bg-[#262626] transition-all cursor-pointer group"
    >
      <div className="flex items-center gap-3 min-w-[200px]">
        <span
          className="w-3 h-3 rounded-full shrink-0 border border-white/20 shadow-sm"
          style={{ backgroundColor: memberColor }}
        />
        <div className="flex flex-col">
          <h4 className="text-xs font-medium text-[#ffffffd6] group-hover:text-white transition-colors">
            {member.nombre}
          </h4>
          <span className="text-[10px] text-[#ffffff6b]">
            {member.rol || member.role || member.specialty || "Especialista"}
          </span>
        </div>
      </div>

      {/* Estatus Pill */}
      <div
        className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider bg-[#222222] border border-white/10 flex items-center gap-1.5"
        style={{ color: statusColor }}
      >
        <ProjectStatusIcon status={memberStatus} className="w-3.5 h-3.5 translate-y-[0.5px]" />
        {memberStatus}
      </div>

      {/* Última Actividad */}
      <div className="flex items-center gap-1.5 text-xs text-[#ffffff6b] font-normal w-40 shrink-0">
        <span>{lastActivityText}</span>
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

      {/* Clientes & Chevron */}
      <div className="flex items-center gap-3">
        {associatedClients.length > 0 ? (
          <div className="flex -space-x-2">
            {associatedClients.slice(0, 3).map((cName) => (
              <div
                key={cName}
                className="w-5 h-5 rounded-full bg-[#222222] border border-white/10 flex items-center justify-center text-[7px] font-bold text-[#ffffffd6]"
                title={`Cliente: ${cName}`}
              >
                {cName.slice(0, 1).toUpperCase()}
              </div>
            ))}
          </div>
        ) : member.tarifa_hora ? (
          <span className="text-[10px] font-semibold text-[#ffffff6b] px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
            ${member.tarifa_hora}/h
          </span>
        ) : null}
        <ChevronRight className="w-3.5 h-3.5 text-[#ffffff6b] group-hover:text-[#ffffffd6] transition-colors" />
      </div>
    </div>
  );
}

export default MemberCardItem;
