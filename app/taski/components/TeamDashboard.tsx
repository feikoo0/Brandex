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
  Check
} from 'lucide-react';
import { Project } from './ProjectDashboard';
import { EntityCard } from '@/components/common/EntityCard';
import { EntityDetailView } from '@/components/views/EntityDetailView';
import { useMembers } from '@/hooks/useMembers';
import type { Member } from '@/lib/types';
import { playSound } from '../utils/audio';

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
  const { members, isLoading, createMember, updateMember } = useMembers();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState<string>("Todos");
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  // New member form state
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("Lead Designer");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberSpecialty, setNewMemberSpecialty] = useState<string>("Diseño");

  const specialties = ["Todos", "Diseño", "Animación", "Video", "Marketing", "Desarrollo"];

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchSearch =
        m.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.rol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchSpecialty =
        specialtyFilter === "Todos" ||
        m.specialty?.toLowerCase() === specialtyFilter.toLowerCase() ||
        m.rol.toLowerCase().includes(specialtyFilter.toLowerCase());

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

    await createMember({
      nombre: newMemberName.trim(),
      name: newMemberName.trim(),
      rol: newMemberRole.trim(),
      role: newMemberRole.trim(),
      email: newMemberEmail.trim(),
      specialty: newMemberSpecialty,
      avatar: newMemberName.slice(0, 2).toUpperCase(),
      skills: [newMemberSpecialty],
      disponibilidad: "Disponible",
      status: "Disponible",
    });

    setNewMemberName("");
    setNewMemberRole("Lead Designer");
    setNewMemberEmail("");
    setIsAddMemberOpen(false);
    playSound('pop');
  };

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto custom-scrollbar bg-transparent text-[#ffffffd6]">
      {/* ── 1. KPI SUMMARY BAR ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-[#181818] border border-white/10 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffffff6b]">Equipo Interno</span>
          <div className="text-2xl font-bold text-[#ffffffd6] mt-1.5">{totalMembers} especialistas</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-white/10 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/80">Disponibles</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1.5">{availableMembers} listos para asignar</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-white/10 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400/80">Proyectos Asignados</span>
          <div className="text-2xl font-bold text-blue-400 mt-1.5">{activeProjsAssigned} en curso</div>
        </div>
      </div>

      {/* ── 2. CONTROLS BAR: Specialty Filter & Search ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        {/* Left: Specialty Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-[#181818] border border-white/10">
          {specialties.map((spec) => {
            const isActive = specialtyFilter === spec;
            return (
              <button
                key={spec}
                type="button"
                onClick={() => {
                  setSpecialtyFilter(spec);
                  playSound('click');
                }}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-white/10 text-[#ffffffd6] shadow-sm"
                    : "text-[#ffffff6b] hover:text-[#ffffffd6]"
                }`}
              >
                {spec}
              </button>
            );
          })}
        </div>

        {/* Right: Search & Add Member */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-[#ffffff40] absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o skill..."
              className="pl-8 pr-3 py-1.5 rounded-full bg-[#181818] border border-white/10 text-xs text-[#ffffffd6] placeholder:text-[#ffffff40] outline-none focus:border-white/20 w-48 sm:w-64 transition-all"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setIsAddMemberOpen(true);
              playSound('click');
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Añadir Miembro</span>
          </button>
        </div>
      </div>

      {/* ── 3. MEMBER CARDS GRID ── */}
      {filteredMembers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMembers.map((member) => {
            const memberProjects = projects.filter((p) => {
              const matchId = ((p as any).asignado_ids || []).map(String).includes(String(member.id));
              const matchName = (p as any).asignado?.toLowerCase().includes(member.nombre.toLowerCase());
              return matchId || matchName;
            });

            const activeProjects = memberProjects.filter((p) => !["Completado", "Hecho", "Concluido"].includes((p as any).estadoProyecto || (p as any).estado || (p as any).status || "")).length;
            const completedProjects = memberProjects.length - activeProjects;

            return (
              <EntityCard
                key={member.id}
                id={member.id}
                type="member"
                name={member.nombre}
                subtitle={member.rol}
                avatar={member.avatar || member.nombre.slice(0, 2).toUpperCase()}
                status={member.disponibilidad || member.status || "Disponible"}
                activeProjectsCount={activeProjects}
                completedProjectsCount={completedProjects}
                totalProjectsCount={memberProjects.length}
                driveLinksCount={member.drive_links?.length || 0}
                financialHighlight={member.tarifa_hora ? `$${member.tarifa_hora}/h tarifa` : undefined}
                badgeText={member.specialty || undefined}
                onClick={() => {
                  setSelectedMemberId(member.id);
                  playSound('click');
                }}
              />
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center rounded-3xl border border-dashed border-white/10 bg-[#181818]/50">
          <Users className="w-12 h-12 text-[#ffffff20] mb-3" />
          <h4 className="text-base font-semibold text-[#ffffffd6]">No se encontraron colaboradores</h4>
          <p className="text-xs text-[#ffffff6b] mt-1 max-w-sm">
            {searchQuery
              ? `No hay miembros que coincidan con "${searchQuery}".`
              : "Registra a tu equipo creativo para comenzar a asignar proyectos y calcular rentabilidad."}
          </p>
        </div>
      )}

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
