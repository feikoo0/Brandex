"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Search, 
  Plus, 
  Filter, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Star,
  Loader2,
  X,
  Check,
  LayoutGrid,
  Table
} from 'lucide-react';
import { Project } from './ProjectDashboard';
import { MemberCardItem, MemberListItem } from '@/components/views/MemberCard';
import { EntityDetailView } from '@/components/views/EntityDetailView';
import { useMembers } from '@/hooks/useMembers';
import type { Member } from '@/lib/types';
import { playSound } from '../utils/audio';
import { PROJECT_COLOR_PALETTE, cn } from '@/lib/utils';

export interface TeamDashboardProps {
  projects: Project[];
  onUpdateProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  onSelectProject?: (projectId: number | string) => void;
  isNeumorphic?: boolean;
  isNightMode?: boolean;
}

export function TeamDashboard({
  projects = [],
  onUpdateProjects,
  onSelectProject,
  isNeumorphic = false,
  isNightMode = true,
}: TeamDashboardProps) {
  const { members, isLoading, createMember, updateMember, deleteMember } = useMembers();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState<string>("Todos");
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  // Switcher states (Identical to Projects & Clients)
  const [cardVariant, setCardVariant] = useState<"cover" | "full">("cover");
  const [displayMode, setDisplayMode] = useState<"grid" | "list">("grid");

  // New member form state
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("Lead Designer");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberSpecialty, setNewMemberSpecialty] = useState<string>("Diseño");
  const [newMemberColorIdx, setNewMemberColorIdx] = useState(0);

  const specialties = ["Todos", "Diseño", "Animación", "Video", "Marketing", "Desarrollo"];

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const name = (m.nombre || m.name || "").toLowerCase();
      const role = (m.rol || m.role || "").toLowerCase();
      const matchSearch =
        name.includes(searchQuery.toLowerCase()) ||
        role.includes(searchQuery.toLowerCase()) ||
        (m.skills || []).some((s) => (s || "").toLowerCase().includes(searchQuery.toLowerCase()));

      const matchSpecialty =
        specialtyFilter === "Todos" ||
        (m.specialty && m.specialty.toLowerCase() === specialtyFilter.toLowerCase()) ||
        role.includes(specialtyFilter.toLowerCase());

      return matchSearch && matchSpecialty;
    });
  }, [members, searchQuery, specialtyFilter]);

  // Selected member object
  const selectedMember = useMemo(() => {
    if (!selectedMemberId) return null;
    return members.find((m) => String(m.id) === String(selectedMemberId)) || null;
  }, [members, selectedMemberId]);

  // If a member is selected, render 4-Zone Detail View
  if (selectedMember) {
    return (
      <EntityDetailView
        entity={selectedMember}
        entityType="member"
        allProjects={projects}
        onBack={() => {
          setSelectedMemberId(null);
          playSound('click');
        }}
        onOpenProject={(projId) => {
          if (onSelectProject) onSelectProject(projId);
        }}
        onUpdateEntity={async (updated) => {
          await updateMember(selectedMember.id, updated);
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#ffffff6b]" />
        <span className="text-xs font-semibold text-[#ffffff6b]">Cargando colaboradores...</span>
      </div>
    );
  }

  // KPIs
  const totalMembers = members.length;
  const availableMembers = members.filter((m) => (m.disponibilidad || m.status || "").toLowerCase().includes("disponible")).length;
  const activeProjsAssigned = projects.filter((p) => (p.asignado_ids || []).length > 0).length;

  const handleCreateNewMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    const chosenColor = PROJECT_COLOR_PALETTE[newMemberColorIdx] || PROJECT_COLOR_PALETTE[0];

    await createMember({
      nombre: newMemberName.trim(),
      name: newMemberName.trim(),
      rol: newMemberRole.trim(),
      role: newMemberRole.trim(),
      email: newMemberEmail.trim(),
      specialty: newMemberSpecialty,
      color: chosenColor.hslStr,
      colorName: chosenColor.name,
      avatar: newMemberName.slice(0, 2).toUpperCase(),
      skills: [newMemberSpecialty],
      disponibilidad: "Disponible",
      status: "Disponible",
    });

    setNewMemberName("");
    setNewMemberRole("Lead Designer");
    setNewMemberEmail("");
    setNewMemberColorIdx(0);
    setIsAddMemberOpen(false);
    playSound('pop');
  };

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto custom-scrollbar bg-transparent text-[#ffffffd6]">
      
      {/* 12-Column Grid Container (Idéntico a Work, Proyectos y Clientes) */}
      <div className="w-full grid grid-cols-12 gap-5 items-stretch max-w-full">
        
        {/* Left Section (3 Columns): Rectángulo Reservado de Control & Resumen */}
        <div className="col-span-3 flex flex-col min-h-[900px] rounded-[28px] bg-[#121212] border border-white/[0.08] shadow-sm overflow-hidden">
          {/* Métricas KPI de Ancho Total (Monocromático, Limpio y Sin Íconos) */}
          <div className="w-full flex flex-col">
            <div className="w-full px-5 py-4 border-b border-white/10 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffffff6b]">Disponibles</span>
              <div className="text-3xl font-bold text-[#ffffffd6] mt-1">{availableMembers}</div>
            </div>

            <div className="w-full px-5 py-4 border-b border-white/10 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffffff6b]">Proyectos Asignados</span>
              <div className="text-3xl font-bold text-[#ffffffd6] mt-1">{activeProjsAssigned}</div>
            </div>

            <div className="w-full px-5 py-4 border-b border-white/10 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffffff6b]">Especialistas</span>
              <div className="text-3xl font-bold text-[#ffffffd6] mt-1">{totalMembers}</div>
            </div>
          </div>

          {/* Filtros Rápidos por Especialidad */}
          <div className="p-5 flex flex-col gap-2 mt-auto">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#ffffff6b] px-1">Filtrar por Especialidad</span>
            <div className="flex flex-col gap-1">
              {specialties.map((spec) => {
                const isSelected = specialtyFilter === spec;
                const count = spec === "Todos"
                  ? members.length
                  : members.filter((m) => (m.specialty && m.specialty.toLowerCase() === spec.toLowerCase()) || (m.rol || m.role || "").toLowerCase().includes(spec.toLowerCase())).length;
                return (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => {
                      setSpecialtyFilter(spec);
                      playSound('click');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                      isSelected
                        ? "bg-white/10 text-white font-semibold"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span>{spec}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-white/50">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Section (9 Columns): Catálogo de Colaboradores */}
        <div className="col-span-9 flex flex-col">
          {/* ── MEMBER CARDS GRID ── */}
          {filteredMembers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0">
              {/* Tarjeta / Botón Registrar Colaborador */}
              <div className="p-2 h-[220px]">
                <div
                  onClick={() => {
                    playSound("click");
                    setIsAddMemberOpen(true);
                  }}
                  className="w-full h-full relative flex flex-col items-center justify-center p-5 rounded-2xl border border-dashed border-white/20 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/40 transition-all cursor-pointer group select-none shadow-sm"
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 group-hover:bg-white/20 group-hover:scale-110 transition-all mb-3 text-white">
                    <Plus className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div className="text-[14px] font-semibold text-white/90 group-hover:text-white text-center">
                    Registrar colaborador
                  </div>
                  <p className="text-[12px] text-white/40 mt-1 text-center font-normal">Añadir especialista al equipo</p>
                </div>
              </div>

              {filteredMembers.map((member) => {
                const memberNameLower = (member.nombre || member.name || "").toLowerCase();
                const memberProjects = projects.filter((p) => {
                  const pIdStr = String(p.id);
                  const matchProjList = (member.proyectos_asignados || []).map(String).includes(pIdStr);
                  const matchId = ((p as any).asignado_ids || []).map(String).includes(String(member.id));
                  const matchName = memberNameLower && (p as any).asignado ? (p as any).asignado.toLowerCase().includes(memberNameLower) : false;
                  return matchProjList || matchId || matchName;
                });

                return (
                  <MemberCardItem
                    key={member.id}
                    member={member}
                    cardStyle={cardVariant}
                    memberProjects={memberProjects}
                    onOpenDetail={(m) => {
                      setSelectedMemberId(m.id);
                      playSound('click');
                    }}
                    onDeleteMember={async (m) => {
                      await deleteMember(m.id);
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <div className="py-24 flex flex-col items-center justify-center text-center opacity-40">
              <Users className="w-14 h-14 mb-4 text-[#ffffff6b]" />
              <h4 className="text-xl font-bold text-[#ffffffd6]">No se encontraron colaboradores</h4>
              <p className="text-xs text-[#ffffff6b] mt-1 max-w-sm">
                {searchQuery
                  ? `No hay miembros que coincidan con "${searchQuery}".`
                  : "Registra a tu equipo creativo para comenzar a asignar proyectos y calcular rentabilidad."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      <AnimatePresence>
        {isAddMemberOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-6 rounded-[28px] bg-[#181818] border border-white/15 shadow-2xl flex flex-col gap-4 text-[#ffffffd6]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <h3 className="text-base font-bold">Añadir Nuevo Colaborador</h3>
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(false)}
                  className="p-1 rounded-lg text-[#ffffff6b] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateNewMember} className="flex flex-col gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#ffffff6b] block mb-1">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="ej. Mateo Ríos"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#222222] border border-white/10 text-xs text-[#ffffffd6] outline-none focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#ffffff6b] block mb-1">
                    Rol / Cargo
                  </label>
                  <input
                    type="text"
                    required
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    placeholder="ej. Motion Director & 3D Artist"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#222222] border border-white/10 text-xs text-[#ffffffd6] outline-none focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#ffffff6b] block mb-1">
                    Área de Especialidad
                  </label>
                  <select
                    value={newMemberSpecialty}
                    onChange={(e) => setNewMemberSpecialty(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#222222] border border-white/10 text-xs text-[#ffffffd6] outline-none focus:border-white/30"
                  >
                    <option value="Diseño">Diseño</option>
                    <option value="Animación">Animación</option>
                    <option value="Video">Video</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Desarrollo">Desarrollo</option>
                  </select>
                </div>

                {/* Color Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#ffffff6b] block">
                      Color del Colaborador
                    </label>
                    <span className="text-[10px] font-medium text-emerald-400">
                      {PROJECT_COLOR_PALETTE[newMemberColorIdx]?.name}
                    </span>
                  </div>
                  <div className="flex items-center flex-wrap gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10">
                    {PROJECT_COLOR_PALETTE.map((preset, idx) => {
                      const isSelected = newMemberColorIdx === idx;
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          title={preset.name}
                          onClick={() => {
                            setNewMemberColorIdx(idx);
                            playSound("click");
                          }}
                          className={cn(
                            "w-5 h-5 rounded-full bg-gradient-to-br transition-all cursor-pointer border",
                            preset.gradient,
                            isSelected
                              ? "border-white scale-125 shadow-md ring-2 ring-white/40"
                              : "border-transparent opacity-60 hover:opacity-100 hover:scale-110"
                          )}
                        />
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#ffffff6b] block mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="colaborador@taski.io"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#222222] border border-white/10 text-xs text-[#ffffffd6] outline-none focus:border-white/30"
                  />
                </div>

                <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsAddMemberOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 text-xs text-[#ffffff6b] hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm"
                  >
                    Guardar Colaborador
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
