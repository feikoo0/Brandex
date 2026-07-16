"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useData, useSync } from "@/hooks/useData";
import { useUIStore, useAuthStore } from "@/lib/store";
import { DONE_STATES } from "@/lib/constants";
import CosmicBackground from "./CosmicBackground";
import KPICard from "./KPICard";
import ProjectPill from "./ProjectPill";
import GlassPanel from "./GlassPanel";
import MakerModeView from "./MakerModeView";
import FocusLane from "./FocusLane";
import Scratchpad from "./Scratchpad";
import TensionMap from "./TensionMap";
import FrictionTracker from "./FrictionTracker";
import { RefreshCw, Users, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SpatialDashboard() {
  const { data, isLoading, error } = useData();
  const syncData = useSync();
  const { dashboardMode } = useUIStore();
  const { role, userId, userName } = useAuthStore();
  
  // Greeting State
  const [greetingWord, setGreetingWord] = useState("Buenos días");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) {
      setGreetingWord("Buenos días");
    } else if (hour >= 12 && hour < 19) {
      setGreetingWord("Buenas tardes");
    } else {
      setGreetingWord("Buenas noches");
    }
  }, []);

  // Filter projects
  const activeProjects = useMemo(() => {
    if (!data?.proyectos) return [];
    return data.proyectos.filter((p) => !DONE_STATES.has(p.estadoProyecto));
  }, [data?.proyectos]);

  const pendingTasks = useMemo(() => {
    if (!data?.tareas) return [];
    return data.tareas.filter((t) => !DONE_STATES.has(t.estado));
  }, [data?.tareas]);

  // Derived cognitive load capacity mapping for designers
  const teamCapacity = useMemo(() => {
    if (!data?.trabajadores || !data?.tareas) return [];
    
    // Base designers list
    const designers = data.trabajadores;

    return designers.map((w) => {
      // Calculate cognitive load based on assigned tasks:
      // - Deep Work (branding, redesign, design brief) -> 30% load
      // - Shallow Work (export, resize, edits) -> 10% load
      const activeMemberTasks = data.tareas.filter(
        (t) => t.asignado_ids?.includes(w.id) && !DONE_STATES.has(t.estado)
      );

      let load = 0;
      activeMemberTasks.forEach((t) => {
        const title = t.titulo.toLowerCase();
        const effort = t.esfuerzo?.toLowerCase() || "";
        
        // Deep vs Shallow classification
        if (
          title.includes("logo") ||
          title.includes("branding") ||
          title.includes("rediseño") ||
          title.includes("brief") ||
          effort.includes("largo") ||
          effort.includes("3 h")
        ) {
          load += 30; // Deep work
        } else {
          load += 10; // Shallow work
        }
      });

      // Clamp load between 0 and 100
      const finalLoad = Math.min(Math.max(load, 0), 100);

      // Status configuration
      const isSaturated = finalLoad > 80;
      const statusText = isSaturated ? "Saturación" : finalLoad >= 50 ? "Media" : "Óptima";
      const color = isSaturated ? "stroke-rose-500" : finalLoad >= 50 ? "stroke-amber-500" : "stroke-cyan-500";
      const textColor = isSaturated ? "text-rose-400" : finalLoad >= 50 ? "text-amber-400" : "text-cyan-400";
      
      return {
        id: w.id,
        nombre: w.nombre,
        capacity: finalLoad,
        statusText,
        color,
        textColor,
        isSaturated,
      };
    }).sort((a, b) => b.capacity - a.capacity);
  }, [data?.trabajadores, data?.tareas]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#060608] text-white">
        <CosmicBackground />
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-3" />
        <p className="text-xs uppercase tracking-widest text-neutral-500 font-bold select-none animate-pulse">
          Cargando entorno espacial...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#060608] text-white p-6">
        <CosmicBackground />
        <RefreshCw className="w-10 h-10 text-rose-500 mb-3" />
        <p className="text-sm font-bold">Error al cargar datos del dashboard.</p>
        <button
          onClick={() => syncData.mutate()}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all"
        >
          Reintentar sincronización
        </button>
      </div>
    );
  }

  const clientList = data?.clientes || [];
  const taskList = data?.tareas || [];
  const workerList = data?.trabajadores || [];

  return (
    <div className="w-full h-full flex flex-col min-h-0 overflow-hidden bg-transparent relative">
      <CosmicBackground />

      {/* Main viewport constrained layout */}
      <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden px-8 py-5">
        
        {/* Dynamic Mode Switch View */}
        {dashboardMode === "maker" ? (
          /* Maker Mode View (Personal Space) */
          <MakerModeView
            tasks={taskList}
            workers={workerList}
            userId={userId}
            userName={userName}
          />
        ) : (
          /* God Mode View (Agency View) */
          <>
            {/* Greeting Header */}
            <div className="flex items-center justify-between select-none">
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">
                  {greetingWord}, {userName || "Feiko"}
                </h1>
                <p className="text-xs text-neutral-500 font-bold mt-1 uppercase tracking-wider">
                  Hoy tienes {activeProjects.length} proyectos en curso y {pendingTasks.length} tareas pendientes.
                </p>
              </div>
              <button
                onClick={() => syncData.mutate()}
                disabled={syncData.isPending}
                className="p-2 rounded-full bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.1] text-neutral-400 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                title="Sincronizar Base de Datos"
              >
                <RefreshCw className={cn("w-4 h-4", syncData.isPending && "animate-spin")} />
              </button>
            </div>

            {/* Metrics Row (5 cards) */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 flex-shrink-0">
              <KPICard
                label="MRR Activo"
                value="$11,550"
                subtext="8.2% este mes"
                trend="up"
                trendColor="green"
                glowColor="rgba(58, 123, 213, 0.12)"
              />
              <KPICard
                label="Clientes Activos"
                value={clientList.length || 8}
                subtext="Sin variaciones"
                trend="neutral"
                trendColor="neutral"
              />
              <KPICard
                label="Proyectos Abiertos"
                value={activeProjects.length || 12}
                subtext="1 cerrado hoy"
                trend="down"
                trendColor="red"
              />
              <KPICard
                label="Entregas Semana"
                value={taskList.filter(t => !DONE_STATES.has(t.estado)).length || 9}
                subtext="4 completadas"
                trend="up"
                trendColor="green"
              />
              <KPICard
                label="Carga Cognitiva"
                value="74%"
                subtext="Edwin 82% (Saturado)"
                trend="up"
                trendColor="amber"
                glowColor="rgba(255, 159, 10, 0.08)"
              />
            </div>

            {/* Main Content Grid (Projects on Left, Stats on Right) */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4">
              
              {/* Left Column: Focus Lane -> Ambient Zone -> Projects (62% width equivalent = 8 columns) */}
              <div className="lg:col-span-8 flex flex-col gap-4 min-h-0 overflow-y-auto pr-1.5">
                {/* Focus Lane Section */}
                <FocusLane tasks={taskList} workers={workerList} />

                {/* Section: Projects in Course (Flat layout) */}
                <div className="flex flex-col gap-2.5 mt-2">
                  <div className="flex items-center gap-2 select-none">
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                    <h2 className="text-xs font-black uppercase text-neutral-400 tracking-wider">
                      Proyectos en Curso
                    </h2>
                    <span className="ml-auto text-[10px] font-black bg-white/[0.04] border border-white/[0.06] text-neutral-400 px-2 py-0.5 rounded-md">
                      {activeProjects.length} activos
                    </span>
                  </div>
                  
                  {/* List of Projects */}
                  <div className="flex flex-col gap-3">
                    {activeProjects.map((project) => (
                      <ProjectPill
                        key={project.id}
                        project={project}
                        allTasks={taskList}
                        clients={clientList}
                        workers={workerList}
                        role={role}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Scratchpad, Capacity, Friction, Tension (38% width equivalent = 4 columns) */}
              <div className="lg:col-span-4 flex flex-col gap-4 min-h-0 overflow-y-auto pr-1.5">
                
                {/* Section: Scratchpad */}
                <Scratchpad projects={activeProjects} />

                {/* Section: Bandwidth Creativo (Carga Cognitiva) */}
                <GlassPanel className="p-4 flex flex-col min-h-[200px] bg-white/[0.01]">
                  <div className="flex items-center gap-2 mb-3.5 select-none">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs font-black uppercase text-white tracking-wider">
                      Bandwidth Creativo (Carga Cognitiva)
                    </h3>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3.5">
                    {teamCapacity.slice(0, 4).map((member) => {
                      const r = 16;
                      const circ = 2 * Math.PI * r;
                      const strokeDashoffset = circ - (member.capacity / 100) * circ;
                      
                      return (
                        <div key={member.id} className="flex items-center gap-3.5 select-none">
                          {/* Circular SVG avatar ring */}
                          <div className="relative w-11 h-11 flex-shrink-0 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle
                                cx="22"
                                cy="22"
                                r={r}
                                fill="transparent"
                                stroke="rgba(255, 255, 255, 0.04)"
                                strokeWidth="2.5"
                              />
                              <circle
                                cx="22"
                                cy="22"
                                r={r}
                                fill="transparent"
                                stroke={member.isSaturated ? "#ff2d55" : "#32d2f5"}
                                strokeWidth="2.5"
                                strokeDasharray={circ}
                                strokeDashoffset={strokeDashoffset}
                                className="transition-all duration-700 ease-out"
                                strokeLinecap="round"
                              />
                            </svg>
                            {/* Avatar Initials */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-[10px] font-black text-white/95 uppercase">
                                {member.nombre.substring(0, 2)}
                              </span>
                            </div>
                          </div>

                          {/* Member load details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline">
                              <h4 className="text-[11px] font-extrabold text-white">
                                {member.nombre}
                              </h4>
                              <span className={cn("text-[10px] font-black", member.textColor)}>
                                {member.capacity}%
                              </span>
                            </div>
                            <p className="text-[9px] font-bold text-neutral-400 mt-0.5 uppercase tracking-wider">
                              {member.isSaturated ? "⚠️ En saturación. No asignar Deep Work" : "🟢 Disponible para enfoque profundo"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </GlassPanel>

                {/* Section: Friction Tracker (Bottlenecks) */}
                <FrictionTracker tasks={taskList} clients={clientList} />

                {/* Section: Weekly Tension Map */}
                <TensionMap tasks={taskList} />

              </div>

            </div>
          </>
        )}

      </div>
    </div>
  );
}
