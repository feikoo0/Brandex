"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Briefcase, CheckCircle2, Clock, Star, Mail, Award, Plus, 
  ChevronRight, Play, Pause, FolderPlus, Sparkles, Filter, ShieldCheck, Tag
} from 'lucide-react';
import { Project, Task } from './ProjectDashboard';
import { playSound } from '../utils/audio';

export interface TeamMember {
  id: number;
  name: string;
  role: string;
  specialty: "Diseño" | "Video" | "Animación" | "Marketing" | "Desarrollo";
  avatar: string;
  email: string;
  status: "Disponible" | "En Proyecto" | "Carga Máxima";
  statusColor: string;
  rating: string;
  completedTasks: number;
  totalHoursLogged: number;
  workloadPercent: number;
  skills: string[];
  bio: string;
}

export const INITIAL_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 1,
    name: "Carlos Mendoza",
    role: "Lead UI/UX & Spatial Design",
    specialty: "Diseño",
    avatar: "CM",
    email: "carlos.mendoza@brandex.io",
    status: "En Proyecto",
    statusColor: "bg-blue-500/10 border-blue-500/30 text-blue-400",
    rating: "4.9",
    completedTasks: 42,
    totalHoursLogged: 168,
    workloadPercent: 85,
    skills: ["Figma", "Spatial UI", "Glassmorphism", "Design Systems"],
    bio: "Especialista en interfaces tridimensionales, glassmorphism y micro-interacciones espaciales."
  },
  {
    id: 2,
    name: "Sofía Valenzuela",
    role: "Motion Director & 3D Artist",
    specialty: "Animación",
    avatar: "SV",
    email: "sofia.valenzuela@brandex.io",
    status: "En Proyecto",
    statusColor: "bg-purple-500/10 border-purple-500/30 text-purple-400",
    rating: "5.0",
    completedTasks: 38,
    totalHoursLogged: 210,
    workloadPercent: 92,
    skills: ["After Effects", "Blender", "Three.js", "WebGL", "Framer"],
    bio: "Directora de animación y shaders 3D. Creación de renders hiper-realistas para web."
  },
  {
    id: 3,
    name: "Mateo Ríos",
    role: "Video Producer & Editor",
    specialty: "Video",
    avatar: "MR",
    email: "mateo.rios@brandex.io",
    status: "Disponible",
    statusColor: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    rating: "4.8",
    completedTasks: 29,
    totalHoursLogged: 135,
    workloadPercent: 45,
    skills: ["Premiere Pro", "DaVinci Resolve", "Color Grading", "Sound Design"],
    bio: "Edición cinematográfica, etalonaje digital de alta gama y composición sonora."
  },
  {
    id: 4,
    name: "Elena Rostova",
    role: "Growth & Campaign Strategist",
    specialty: "Marketing",
    avatar: "ER",
    email: "elena.rostova@brandex.io",
    status: "En Proyecto",
    statusColor: "bg-amber-500/10 border-amber-500/30 text-amber-400",
    rating: "4.9",
    completedTasks: 51,
    totalHoursLogged: 195,
    workloadPercent: 78,
    skills: ["Brand Strategy", "SEO/SEM", "Conversion Funnels", "Analytics"],
    bio: "Especialista en estrategia de posicionamiento de marca y embudos de alta conversión."
  },
  {
    id: 5,
    name: "Lucas Silva",
    role: "Senior Frontend Engineer",
    specialty: "Desarrollo",
    avatar: "LS",
    email: "lucas.silva@brandex.io",
    status: "Carga Máxima",
    statusColor: "bg-rose-500/10 border-rose-500/30 text-rose-400",
    rating: "5.0",
    completedTasks: 64,
    totalHoursLogged: 240,
    workloadPercent: 98,
    skills: ["Next.js", "TypeScript", "Tailwind CSS", "GLSL Shaders"],
    bio: "Arquitecto frontend apasionado por el rendimiento a 60fps y código limpio."
  }
];

interface TeamDashboardProps {
  projects: Project[];
  onUpdateProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  isNeumorphic?: boolean;
  isNightMode?: boolean;
}

export const TeamDashboard: React.FC<TeamDashboardProps> = ({
  projects,
  onUpdateProjects,
  isNeumorphic = true,
  isNightMode = false
}) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(INITIAL_TEAM_MEMBERS);
  const [activeMemberId, setActiveMemberId] = useState<number>(1);
  const [filterSpecialty, setFilterSpecialty] = useState<string>("Todos");
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedProjectIdToAssign, setSelectedProjectIdToAssign] = useState<number | null>(null);

  const activeMember = teamMembers.find(m => m.id === activeMemberId) || teamMembers[0];

  // Projects assigned to active team member (matching skills or client/description)
  const memberProjects = projects.filter(p => {
    if (activeMember.id === 1) return p.id % 2 === 1; // Carlos
    if (activeMember.id === 2) return p.id === 2 || p.id === 7; // Sofía
    if (activeMember.id === 3) return p.id === 4; // Mateo
    if (activeMember.id === 4) return p.id === 2 || p.id === 5; // Elena
    return p.id === 3 || p.id === 6 || p.id === 8; // Lucas
  });

  // Extract assigned tasks
  const memberTasks = memberProjects.flatMap(p => 
    (p.tasks || []).map(t => ({ ...t, projectName: p.title, projectId: p.id }))
  );

  const filteredMembers = teamMembers.filter(m => 
    filterSpecialty === "Todos" || m.specialty === filterSpecialty
  );

  const handleAssignProject = () => {
    if (!selectedProjectIdToAssign) return;
    playSound('pop');
    setIsAssignModalOpen(false);
    setSelectedProjectIdToAssign(null);
  };

  const getSpecialtyBadgeColor = (spec: string) => {
    switch (spec) {
      case "Diseño": return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
      case "Animación": return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "Video": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "Marketing": return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      default: return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    }
  };

  return (
    <div className="w-full h-full flex gap-6 relative select-none">
      {/* LEFT COLUMN: Vertical Team Member Cards */}
      <div className="w-[300px] shrink-0 flex flex-col gap-4 h-full pb-16">
        {/* Header & Specialty Filter Bar */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className={`w-4 h-4 ${isNeumorphic ? 'text-slate-700' : 'text-cyan-400'}`} />
              <span className={`text-[12px] font-black uppercase tracking-widest ${isNeumorphic ? 'text-slate-800' : 'text-white'}`}>
                Equipo ({teamMembers.length})
              </span>
            </div>
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
              Tarjetas Verticales
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1">
            {["Todos", "Diseño", "Animación", "Video", "Marketing", "Desarrollo"].map(spec => (
              <button
                key={spec}
                onClick={() => {
                  setFilterSpecialty(spec);
                  playSound('click');
                }}
                className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap border ${
                  filterSpecialty === spec
                    ? isNeumorphic
                      ? "bg-slate-800 text-white border-slate-700 shadow-sm"
                      : "bg-white text-black border-white shadow-md"
                    : isNeumorphic
                      ? "bg-[#e6eef8] text-slate-600 border-white/40 hover:text-slate-900"
                      : "bg-white/5 text-white/60 border-white/10 hover:text-white"
                }`}
              >
                {spec}
              </button>
            ))}
          </div>
        </div>

        {/* Vertical Cards Container */}
        <div className="flex flex-col gap-3.5 overflow-y-auto hide-scrollbar pr-1 pb-12">
          {filteredMembers.map(member => {
            const isSelected = member.id === activeMemberId;

            return (
              <motion.div
                key={member.id}
                onClick={() => {
                  setActiveMemberId(member.id);
                  playSound('click');
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`p-4 rounded-2xl cursor-pointer transition-all duration-300 relative border flex flex-col gap-3 ${
                  isNightMode
                    ? isSelected
                      ? "bg-transparent border-neutral-100 text-neutral-50"
                      : "bg-transparent border-neutral-800 text-neutral-300 hover:border-neutral-700"
                    : isSelected
                      ? "bg-transparent border-slate-900 text-slate-900"
                      : "bg-transparent border-slate-200 text-slate-700 hover:border-slate-400"
                }`}
              >
                {/* Member Header Card */}
                <div className="flex items-center gap-3">
                  {/* Initials Avatar */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border ${
                    isNightMode
                      ? "bg-transparent text-neutral-200 border-neutral-800"
                      : "bg-transparent text-slate-800 border-slate-200"
                  }`}>
                    {member.avatar}
                  </div>

                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-bold text-[13px] leading-tight truncate">
                      {member.name}
                    </span>
                    <span className={`text-[10px] font-medium leading-tight truncate mt-0.5 ${
                      isNightMode ? 'text-neutral-400' : 'text-slate-500'
                    }`}>
                      {member.role}
                    </span>
                  </div>
                </div>

                {/* Badges Row */}
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${getSpecialtyBadgeColor(member.specialty)}`}>
                    {member.specialty}
                  </span>

                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span className="text-[10px] font-black">{member.rating}</span>
                  </div>
                </div>

                {/* Workload Progress Bar */}
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex justify-between items-center text-[9px] font-bold">
                    <span className={isNightMode ? 'text-neutral-400' : 'text-slate-500'}>Carga de Trabajo</span>
                    <span className={member.workloadPercent > 90 ? 'text-rose-400 font-black' : 'text-emerald-400'}>
                      {member.workloadPercent}%
                    </span>
                  </div>
                  <div className={`w-full h-1.5 rounded-full overflow-hidden ${isNightMode ? 'bg-neutral-800' : 'bg-slate-200'}`}>
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        member.workloadPercent > 90 
                          ? 'bg-rose-500' 
                          : member.workloadPercent > 75 
                            ? 'bg-amber-400' 
                            : 'bg-emerald-400'
                      }`}
                      style={{ width: `${member.workloadPercent}%` }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* RIGHT CANVAS: Active Team Member Dashboard */}
      <div className="flex-1 flex flex-col gap-6 h-full pb-16 pt-2 px-1 overflow-y-auto hide-scrollbar">
        {/* Profile Banner */}
        <motion.div 
          key={activeMember.id}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`p-6 rounded-3xl border relative ${
            isNightMode
              ? "bg-transparent border-neutral-800 text-neutral-50"
              : "bg-transparent border-slate-200 text-slate-800"
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold border shrink-0 ${
                isNightMode
                  ? "bg-transparent text-neutral-50 border-neutral-800"
                  : "bg-transparent text-slate-800 border-slate-200"
              }`}>
                {activeMember.avatar}
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className={`text-2xl md:text-3xl font-bold tracking-tight leading-normal ${isNightMode ? 'text-neutral-50' : 'text-slate-800'}`}>{activeMember.name}</h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shrink-0 ${activeMember.statusColor}`}>
                    {activeMember.status}
                  </span>
                </div>
                <p className={`text-[12px] font-medium mt-0.5 ${isNightMode ? 'text-neutral-300' : 'text-slate-600'}`}>
                  {activeMember.role} • <span className="font-mono">{activeMember.email}</span>
                </p>
                <p className={`text-[11px] mt-2 max-w-xl leading-relaxed ${isNightMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                  {activeMember.bio}
                </p>
              </div>
            </div>

            {/* Action Button: Assign Project */}
            <button
              onClick={() => {
                setIsAssignModalOpen(true);
                playSound('click');
              }}
              className={`px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all border shrink-0 ${
                isNightMode
                  ? "bg-transparent border-neutral-700 text-neutral-200 hover:border-neutral-500"
                  : "bg-transparent border-slate-300 text-slate-800 hover:border-slate-500"
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Asignar Proyecto</span>
            </button>
          </div>

          {/* Skills Tags */}
          <div className="flex items-center gap-2 mt-5 pt-4 border-t border-neutral-800/40 flex-wrap">
            <Tag className="w-3.5 h-3.5 opacity-40" />
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Especialidades:</span>
            {activeMember.skills.map(skill => (
              <span 
                key={skill}
                className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${
                  isNightMode
                    ? "bg-transparent text-neutral-300 border-neutral-800"
                    : "bg-transparent text-slate-700 border-slate-200"
                }`}
              >
                {skill}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-4 rounded-xl border flex flex-col gap-1 ${
            isNightMode ? "bg-transparent border-neutral-800 text-neutral-50" : "bg-transparent border-slate-200 text-slate-900"
          }`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Proyectos Activos</span>
            <span className="text-2xl font-black mt-1">{memberProjects.length}</span>
            <span className="text-[10px] text-emerald-500 font-bold">Actualmente en desarrollo</span>
          </div>

          <div className={`p-4 rounded-xl border flex flex-col gap-1 ${
            isNightMode ? "bg-transparent border-neutral-800 text-neutral-50" : "bg-transparent border-slate-200 text-slate-900"
          }`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Tareas Completadas</span>
            <span className="text-2xl font-black mt-1">{activeMember.completedTasks}</span>
            <span className="text-[10px] text-sky-500 font-bold">En entregables activos</span>
          </div>

          <div className={`p-4 rounded-xl border flex flex-col gap-1 ${
            isNightMode ? "bg-transparent border-neutral-800 text-neutral-50" : "bg-transparent border-slate-200 text-slate-900"
          }`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Horas Registradas</span>
            <span className="text-2xl font-black mt-1">{activeMember.totalHoursLogged}h</span>
            <span className="text-[10px] text-purple-500 font-bold">Tiempo total en plataforma</span>
          </div>

          <div className={`p-4 rounded-xl border flex flex-col gap-1 ${
            isNightMode ? "bg-transparent border-neutral-800 text-neutral-50" : "bg-transparent border-slate-200 text-slate-900"
          }`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Calificación / Rating</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-black">{activeMember.rating}</span>
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            </div>
            <span className="text-[10px] text-amber-500 font-bold">Basado en 15 entregas</span>
          </div>
        </div>

        {/* Projects List Assigned to this Member (Signature Task Card Style) */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className={`text-[12px] font-extrabold uppercase tracking-widest ${isNightMode ? 'text-neutral-50' : 'text-slate-900'}`}>
              Proyectos Asignados a {activeMember.name.split(' ')[0]} ({memberProjects.length})
            </h3>
          </div>

          <div className="flex items-center gap-5 overflow-x-auto pb-4 pt-1 pr-4 hide-scrollbar">
            {memberProjects.length === 0 ? (
              <div className={`w-full p-8 rounded-2xl border text-center text-xs ${
                isNightMode ? "bg-transparent border-neutral-800 text-neutral-400" : "bg-transparent border-slate-200 text-slate-600"
              }`}>
                No hay proyectos asignados a este miembro de equipo.
              </div>
            ) : (
              memberProjects.map(project => (
                <motion.div
                  key={project.id}
                  whileHover={{ scale: 1.015, y: -2 }}
                  whileTap={{ scale: 0.985 }}
                  className={`rounded-2xl p-5 flex flex-col justify-between shrink-0 select-none cursor-pointer transition-all duration-200 relative w-[340px] h-[320px] group/card border ${
                    isNightMode
                      ? "bg-transparent border-neutral-800 text-neutral-50"
                      : "bg-transparent border-slate-200 text-slate-900"
                  }`}
                >
                  {/* Top Row: Thumbnail + Title + Status Pill */}
                  <div className="flex items-start justify-between gap-3 relative z-10">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-bold text-base border ${
                        isNightMode
                          ? "bg-transparent text-neutral-50 border-neutral-800"
                          : "bg-transparent text-slate-900 border-slate-200"
                      }`}>
                        {project.title.substring(0, 2).toUpperCase()}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className={`font-bold text-[14px] tracking-tight leading-tight truncate ${isNightMode ? 'text-neutral-50' : 'text-slate-900'}`}>
                          {project.title}
                        </span>
                        <span className={`text-[10px] font-mono mt-0.5 truncate ${isNightMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                          {project.client}
                        </span>
                      </div>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border shrink-0 ${project.statusColor}`}>
                      {project.status}
                    </span>
                  </div>

                  {/* Middle Description */}
                  <p className={`text-[12px] font-normal leading-relaxed line-clamp-2 relative z-10 ${
                    isNightMode ? 'text-neutral-300' : 'text-slate-600'
                  }`}>
                    {project.desc || project.briefCore}
                  </p>

                  {/* Key Badges Row */}
                  <div className="flex items-center gap-2 flex-wrap relative z-10">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold border ${
                      isNightMode ? 'bg-transparent text-neutral-200 border-neutral-800' : 'bg-transparent text-slate-900 border-slate-200'
                    }`}>
                      {project.cost}
                    </span>
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-mono border ${
                      isNightMode ? 'bg-transparent text-neutral-300 border-neutral-800' : 'bg-transparent text-slate-700 border-slate-200'
                    }`}>
                      {project.burnRate}
                    </span>
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-mono border ${
                      isNightMode ? 'bg-transparent text-neutral-300 border-neutral-800' : 'bg-transparent text-slate-700 border-slate-200'
                    }`}>
                      {project.deadline}
                    </span>
                  </div>

                  {/* Bottom Progress Section */}
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-neutral-800 relative z-10">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className={isNightMode ? 'text-neutral-400' : 'text-slate-500'}>
                        {project.progress}
                      </span>
                      <span className={isNightMode ? 'text-neutral-100 font-bold' : 'text-slate-800 font-bold'}>
                        {project.percent}
                      </span>
                    </div>
                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${isNightMode ? 'bg-neutral-800' : 'bg-slate-200'}`}>
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${isNightMode ? 'bg-indigo-400' : 'bg-slate-800'}`}
                        style={{ width: project.percent }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Assigned Tasks Table */}
        <div className="flex flex-col gap-3 mt-2 pb-10">
          <h3 className={`text-[12px] font-black uppercase tracking-widest ${isNightMode ? 'text-neutral-50' : 'text-slate-900'}`}>
            Tareas Específicas del Miembro ({memberTasks.length})
          </h3>

          <div className={`rounded-2xl border overflow-hidden ${
            isNightMode 
              ? "bg-transparent border-neutral-800 text-neutral-50" 
              : "bg-transparent border-slate-200 text-slate-900"
          }`}>
            {memberTasks.length === 0 ? (
              <div className="p-8 text-center text-xs opacity-60">No hay tareas asignadas en este momento.</div>
            ) : (
              <div className="divide-y divide-white/10">
                {memberTasks.map(task => (
                  <div key={task.id} className="p-4 flex items-center justify-between gap-4 hover:bg-white/5 transition-colors">
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-[13px] ${isNightMode ? 'text-zinc-100' : ''}`}>{task.title}</span>
                        <span className={`text-[10px] font-mono ${isNightMode ? 'text-zinc-400' : 'opacity-50'}`}>• {task.projectName}</span>
                      </div>
                      <span className={`text-[11px] line-clamp-1 ${isNightMode ? 'text-zinc-400' : 'opacity-60'}`}>{task.desc}</span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-[10px] font-mono ${isNightMode ? 'text-zinc-400' : 'opacity-60'}`}>{task.time}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${task.statusColor}`}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: Assign Project */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl flex flex-col gap-5 ${
              isNightMode
                ? "neu-dark-flat text-zinc-100 border-white/10 shadow-2xl"
                : isNeumorphic
                  ? "bg-[#e6eef8] text-slate-800 border-white/80"
                  : "bg-[#0c0c0e] text-white border-white/20"
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Asignar Proyecto a {activeMember.name}</h3>
              <button 
                onClick={() => setIsAssignModalOpen(false)}
                className="text-xs opacity-50 hover:opacity-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs opacity-60">
              Selecciona un proyecto existente de la lista para vincular a este miembro de equipo.
            </p>

            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto hide-scrollbar">
              {projects.map(p => (
                <div
                  key={p.id}
                  onClick={() => setSelectedProjectIdToAssign(p.id)}
                  className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between text-xs transition-all ${
                    selectedProjectIdToAssign === p.id
                      ? "border-cyan-400 bg-cyan-500/10 font-bold"
                      : "border-white/10 hover:border-white/30"
                  }`}
                >
                  <span>{p.title} ({p.client})</span>
                  <span className="opacity-50">{p.status}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold opacity-60 hover:opacity-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleAssignProject}
                disabled={!selectedProjectIdToAssign}
                className="px-5 py-2 rounded-xl text-xs font-black uppercase bg-cyan-500 text-black shadow-lg disabled:opacity-40 cursor-pointer"
              >
                Confirmar Asignación
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
