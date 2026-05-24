"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { useData, useCreateProject, useCreateTask, useUpdateTask } from "@/hooks/useData";
import { DONE_STATES, ESFUERZOS, FORMATOS, PROJECT_COLORS, PROJ_PRIO_OPTS, PROJ_STATUS_OPTS, TASK_PRIO_OPTS } from "@/lib/constants";
import { Check, ShieldAlert, Activity, RefreshCcw, Target, Sparkles, Plus, FolderPlus, X, Pin, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/store";
import { calculateProjections, DAILY_CAPACITY_MINS } from "@/lib/scheduler";

function readStoredArray(key: string) {
  if (typeof window === "undefined") return [] as string[];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readStoredRecord(key: string) {
  if (typeof window === "undefined") return {} as Record<string, string[]>;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, string[]> : {};
  } catch {
    return {};
  }
}

// ── Automated Score Calculator ──────────────────────────────────────────────
const getProjectScore = (project: any, tasks: any[], clients: any[]) => {
  let urgency = 0;

  // 1. Urgency based on Priority
  if (project.prioridad === "🔥 U R G E N T E 🔥") urgency += 40;
  else if (project.prioridad === "⚠️IMPORTANTE") urgency += 25;
  else if (project.prioridad === "MODERADO") urgency += 10;

  // Deadline proximity points
  if (project.fechaFin) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [y, m, d] = project.fechaFin.split("-").map(Number);
    const deadline = new Date(y, m - 1, d);
    const diffMs = deadline.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      urgency += 50 + Math.abs(daysLeft) * 2; // Overdue gets high score
    } else if (daysLeft <= 3) {
      urgency += 40;
    } else if (daysLeft <= 7) {
      urgency += 25;
    } else if (daysLeft <= 14) {
      urgency += 10;
    }
  }

  // 2. Client Potential
  let clientScore = 0;
  if (project.cliente_ids && project.cliente_ids.length > 0) {
    const client = clients.find(c => project.cliente_ids.includes(c.id));
    if (client) {
      if (client.potencial === "Listo") clientScore += 30;
      else if (client.potencial === "En curso") clientScore += 20;
      else if (client.potencial === "Sin empezar") clientScore += 10;
    }
  }

  // 3. Progress (Percentage of tasks completed)
  let progressScore = 0;
  const projectTasks = tasks.filter(t => t.proyecto_ids?.includes(project.id));
  const totalTasks = projectTasks.length;
  if (totalTasks > 0) {
    const completedTasks = projectTasks.filter(t => DONE_STATES.has(t.estado)).length;
    const progressPct = completedTasks / totalTasks;
    progressScore = progressPct * 30; // Max 30 points
  }

  // 4. Inactivity (Days since last activity)
  let inactivityScore = 0;
  if (projectTasks.length > 0) {
    const dates = projectTasks
      .map(t => t.created || t.fechaProg || t.fechaEntrega || "")
      .filter(Boolean)
      .map(dStr => new Date(dStr).getTime());

    if (dates.length > 0) {
      const latestActivityTime = Math.max(...dates);
      const today = new Date().getTime();
      const diffDays = Math.max(0, Math.floor((today - latestActivityTime) / (1000 * 60 * 60 * 24)));
      inactivityScore = diffDays * 1.5; // Subtract 1.5 points per day of inactivity
    }
  }

  return urgency + clientScore + progressScore - inactivityScore;
};

// Helper for task date badges
const getTaskDateBadge = (task: any) => {
  const dateStr = task.fechaEntrega || task.fechaProg;
  if (!dateStr) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [y, m, d] = dateStr.split('-').map(Number);
  const taskDate = new Date(y, m - 1, d);
  const diffDays = Math.round((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return { text: "Hoy", style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
  } else if (diffDays === 1) {
    return { text: "Mañana", style: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
  } else if (diffDays < 0) {
    return { text: `Vencido (${Math.abs(diffDays)}d)`, style: "bg-rose-500/10 text-rose-400 border-rose-500/20" };
  } else {
    const formatted = format(taskDate, "d MMM", { locale: es });
    return { text: formatted, style: "bg-white/5 text-white/40 border-white/10" };
  }
};

function formatMins(mins: number) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function DailyPlan() {
  const { data } = useData();
  const createProject = useCreateProject();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const pushView = useUIStore(s => s.pushView);
  const pinnedProjects = useUIStore(s => s.pinnedProjects);
  const togglePinProject = useUIStore(s => s.togglePinProject);
  
  const [createMode, setCreateMode] = useState<"project" | "task" | "project-task" | null>(null);
  const [savingCreate, setSavingCreate] = useState(false);
  const [createError, setCreateError] = useState("");

  const [projectForm, setProjectForm] = useState({
    nombre: "",
    clienteId: "",
    estadoProyecto: "🧠 Planificacion",
    prioridad: "MODERADO",
    fechaInicio: format(new Date(), "yyyy-MM-dd"),
    fechaFin: "",
    descripcion: "",
    firstTaskTitle: "",
    firstTaskDate: format(new Date(), "yyyy-MM-dd"),
    firstTaskEffort: "🔋Corto (30 min)",
  });

  const [taskForm, setTaskForm] = useState({
    titulo: "",
    proyectoId: "",
    clienteId: "",
    prioridad: "Media",
    esfuerzo: "",
    formato: "",
    fechaEntrega: format(new Date(), "yyyy-MM-dd"),
  });

  // Calculate task efforts in minutes
  const getTaskMins = (eff: string) => {
    if (!eff) return 30;
    const match = eff.match(/\d+/);
    const num = match ? parseInt(match[0]) : 30;
    if (eff.includes("h")) return num * 60;
    return num;
  };

  // Determine sorted active projects based on score & pins
  const projectsWithScores = useMemo(() => {
    if (!data) return [];
    
    // Filter active projects
    const active = data.proyectos.filter(p => !DONE_STATES.has(p.estadoProyecto) && p.nombre);

    return active.map(p => {
      const score = getProjectScore(p, data.tareas, data.clientes);
      const isPinned = pinnedProjects.includes(p.id);
      const finalScore = score + (isPinned ? 100000 : 0); // Pin override boost
      
      return {
        project: p,
        score,
        finalScore,
        isPinned
      };
    }).sort((a, b) => b.finalScore - a.finalScore);
  }, [data, pinnedProjects]);

  const focusedProjectEntry = projectsWithScores[0];
  const focusedProject = focusedProjectEntry?.project;
  const otherProjectsEntries = projectsWithScores.slice(1);

  // Projections calculations for global capacity bar
  const projections = useMemo(() => {
    if (!data) return [];
    return calculateProjections(data);
  }, [data]);

  const planData = useMemo(() => {
    if (!data) return null;
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const todayPendingTasks = data.tareas.filter(t => !DONE_STATES.has(t.estado) && (t.fechaProg === todayKey || t.fechaEntrega === todayKey));
    
    // Calculate total minutes of today's work
    const todayTotalMins = todayPendingTasks.reduce((acc, t) => {
      const proj = projections.find(pj => pj.task.id === t.id);
      return acc + (proj ? proj.mins : getTaskMins(t.esfuerzo));
    }, 0);

    return {
      todayTotalMins,
      todayTaskCount: todayPendingTasks.length,
    };
  }, [data, projections]);

  // Pre-calculate focused project card metrics to avoid parsing issues inside JSX
  const focusedProjectCardData = useMemo(() => {
    if (!focusedProject || !data) return null;
    const client = data.clientes.find(c => focusedProject.cliente_ids?.includes(c.id));
    const pTasks = data.tareas.filter(t => t.proyecto_ids?.includes(focusedProject.id));
    const totalTasks = pTasks.length;
    const completedTasks = pTasks.filter(t => DONE_STATES.has(t.estado)).length;
    const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const isPinned = pinnedProjects.includes(focusedProject.id);

    // Get counts of pending tasks by priority for chips
    const urgentPending = pTasks.filter(t => t.prioridad === "Urgente" && !DONE_STATES.has(t.estado)).length;
    const highPending = pTasks.filter(t => t.prioridad === "Alta" && !DONE_STATES.has(t.estado)).length;
    const totalPending = pTasks.filter(t => !DONE_STATES.has(t.estado)).length;

    return {
      clientName: client?.nombre || "Sin cliente",
      totalTasks,
      completedTasks,
      pct,
      isPinned,
      urgentPending,
      highPending,
      totalPending
    };
  }, [focusedProject, data, pinnedProjects]);

  // Determine tasks for the active (focused) project
  const activeProjectTasks = useMemo(() => {
    if (!focusedProject || !data) return [];
    const pTasks = data.tareas.filter(t => t.proyecto_ids?.includes(focusedProject.id));
    
    // Sort so pending tasks appear first, completed tasks last
    return [...pTasks].sort((a, b) => {
      const aDone = DONE_STATES.has(a.estado) ? 1 : 0;
      const bDone = DONE_STATES.has(b.estado) ? 1 : 0;
      return aDone - bDone;
    });
  }, [data, focusedProject]);

  // Determine "today's tasks of other projects"
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const todayTasksOtherProjects = useMemo(() => {
    if (!data) return [];
    return data.tareas.filter(t => {
      const isPending = !DONE_STATES.has(t.estado);
      const isToday = t.fechaProg === todayKey || t.fechaEntrega === todayKey;
      const isNotFocusedProject = !focusedProject || !t.proyecto_ids?.includes(focusedProject.id);
      return isPending && isToday && isNotFocusedProject;
    });
  }, [data, focusedProject, todayKey]);

  // Overdue tasks count
  const overdueTasksCount = useMemo(() => {
    if (!data) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return data.tareas.filter(t => {
      if (DONE_STATES.has(t.estado) || !t.fechaEntrega) return false;
      const [y, m, d] = t.fechaEntrega.split('-').map(Number);
      return new Date(y, m - 1, d) < today;
    }).length;
  }, [data]);

  // Risk deliveries list (due in <= 5 days or overdue)
  const riskDeliveries = useMemo(() => {
    if (!data) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return data.proyectos
      .filter(p => !DONE_STATES.has(p.estadoProyecto) && p.fechaFin)
      .map(p => {
        const [y, m, d] = p.fechaFin.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        const daysLeft = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return { project: p, daysLeft };
      })
      .filter(item => item.daysLeft <= 5)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 4);
  }, [data]);

  // Return loading state if data or planData is null
  if (!data || !planData) {
    return <div className="p-10 text-white/40 font-bold uppercase tracking-widest text-center">Iniciando sistema...</div>;
  }

  const createActions = (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => openCreateMode("project")}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#4ade80] text-[#10241b] text-[10px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95 transition-all"
      >
        <FolderPlus className="w-3.5 h-3.5" /> Proyecto
      </button>
      <button
        onClick={() => openCreateMode("task")}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 text-white text-[10px] font-black uppercase tracking-wider hover:bg-white/15 active:scale-95 transition-all"
      >
        <Plus className="w-3.5 h-3.5" /> Tarea
      </button>
      {focusedProject && (
        <button
          onClick={() => openCreateMode("project-task")}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#4ade80]/25 text-[#4ade80] text-[10px] font-black uppercase tracking-wider hover:bg-[#4ade80]/10 active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Tarea en proyecto
        </button>
      )}
    </div>
  );

  const globalTotalMins = planData.todayTotalMins;
  const capacityPct = Math.min(100, (globalTotalMins / DAILY_CAPACITY_MINS) * 100);

  const handleCheckTask = async (taskId: string) => {
    updateTask.mutate({ id: taskId, estado: "Hecho" } as never);
  };

  const openCreateMode = (mode: "project" | "task" | "project-task") => {
    setCreateError("");
    setCreateMode(mode);
    
    const fallbackProject = focusedProject || data.proyectos[0];

    if (mode === "project-task" && focusedProject) {
      setTaskForm(prev => ({
        ...prev,
        proyectoId: focusedProject.id,
        clienteId: focusedProject.cliente_ids?.[0] || "",
      }));
    } else {
      setTaskForm(prev => ({
        ...prev,
        proyectoId: fallbackProject?.id || "",
        clienteId: fallbackProject?.cliente_ids?.[0] || "",
      }));
    }
  };

  const handleCreateProject = async () => {
    if (!projectForm.nombre.trim() || savingCreate) return;
    setSavingCreate(true);
    setCreateError("");
    try {
      const startDate = projectForm.fechaInicio || format(new Date(), "yyyy-MM-dd");
      const endDate = projectForm.fechaFin || format(addDays(new Date(`${startDate}T12:00:00`), 7), "yyyy-MM-dd");
      
      const result = await createProject.mutateAsync({
        nombre: projectForm.nombre.trim(),
        cliente_ids: projectForm.clienteId ? [projectForm.clienteId] : [],
        estadoProyecto: projectForm.estadoProyecto,
        prioridad: projectForm.prioridad,
        fechaInicio: startDate,
        fechaFin: endDate,
        descripcion: projectForm.descripcion || undefined,
      } as any);

      if (result?.id && !pinnedProjects.includes(result.id)) {
        togglePinProject(result.id);
      }

      if (result?.id && projectForm.firstTaskTitle.trim()) {
        await createTask.mutateAsync({
          titulo: projectForm.firstTaskTitle.trim(),
          estado: "Pendiente",
          prioridad: "Media",
          esfuerzo: projectForm.firstTaskEffort || undefined,
          proyecto_id: result.id,
          cliente_id: projectForm.clienteId || undefined,
          fechaEntrega: projectForm.firstTaskDate || startDate,
          fechaProg: projectForm.firstTaskDate || startDate,
        } as any);
      }

      setProjectForm({
        nombre: "",
        clienteId: "",
        estadoProyecto: "🧠 Planificacion",
        prioridad: "MODERADO",
        fechaInicio: format(new Date(), "yyyy-MM-dd"),
        fechaFin: "",
        descripcion: "",
        firstTaskTitle: "",
        firstTaskDate: format(new Date(), "yyyy-MM-dd"),
        firstTaskEffort: "🔋Corto (30 min)",
      });
      setCreateMode(null);
    } catch (err: any) {
      setCreateError(err?.message || "No se pudo crear el proyecto.");
    } finally {
      setSavingCreate(false);
    }
  };

  const handleCreateTask = async () => {
    if (!taskForm.titulo.trim() || savingCreate) return;
    if (!taskForm.proyectoId) {
      setCreateError("Elige un proyecto para que la tarea aparezca en el timeline.");
      return;
    }
    setSavingCreate(true);
    setCreateError("");
    try {
      const selectedProject = data.proyectos.find(p => p.id === taskForm.proyectoId);
      const clientId = taskForm.clienteId || selectedProject?.cliente_ids?.[0] || "";

      await createTask.mutateAsync({
        titulo: taskForm.titulo.trim(),
        estado: "Pendiente",
        prioridad: taskForm.prioridad,
        esfuerzo: taskForm.esfuerzo || undefined,
        formato: taskForm.formato || undefined,
        proyecto_id: taskForm.proyectoId || undefined,
        cliente_id: clientId || undefined,
        fechaEntrega: taskForm.fechaEntrega || undefined,
        fechaProg: taskForm.fechaEntrega || undefined,
      } as any);

      setTaskForm({
        titulo: "",
        proyectoId: createMode === "project-task" && focusedProject ? focusedProject.id : "",
        clienteId: createMode === "project-task" && focusedProject ? focusedProject.cliente_ids?.[0] || "" : "",
        prioridad: "Media",
        esfuerzo: "",
        formato: "",
        fechaEntrega: format(new Date(), "yyyy-MM-dd"),
      });
      setCreateMode(null);
    } catch (err: any) {
      setCreateError(err?.message || "No se pudo crear la tarea.");
    } finally {
      setSavingCreate(false);
    }
  };

  // ── renderLeftBlock (Left Column: 220px fixed) ──────────────────────────
  const renderLeftBlock = () => {
    return (
      <div className="flex flex-col gap-5 h-full">
        {/* Focus Project Hero Card */}
        {focusedProject && focusedProjectCardData ? (
          <div 
            className="bg-gradient-to-br from-[#1b1b22] to-[#121216] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-2xl p-4 relative overflow-hidden group cursor-pointer"
            onClick={() => pushView({ level: 'project', id: focusedProject.id })}
          >
            {/* Glowing decorative background blob */}
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-[#4ade80]/5 rounded-full blur-2xl pointer-events-none group-hover:bg-[#4ade80]/10 transition-all duration-300" />
            
            {/* Header: Title & Pin Override */}
            <div className="flex items-start justify-between gap-2">
              <span className="text-[9px] font-black text-[#4ade80] uppercase tracking-widest bg-[#4ade80]/10 border border-[#4ade80]/15 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Target className="w-2.5 h-2.5" /> En Foco
              </span>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePinProject(focusedProject.id);
                }}
                className={cn(
                  "w-6 h-6 rounded-lg flex items-center justify-center border transition-all",
                  focusedProjectCardData.isPinned 
                    ? "bg-[#4ade80]/10 border-[#4ade80]/30 text-[#4ade80]" 
                    : "border-white/5 text-white/30 hover:border-white/20 hover:text-white"
                )}
                title={focusedProjectCardData.isPinned ? "Quitar pin manual" : "Fijar foco manualmente"}
              >
                <Pin className="w-3 h-3 fill-current" />
              </button>
            </div>

            {/* Title & Client */}
            <div className="mt-3">
              <h3 className="text-base font-black text-white leading-tight truncate group-hover:text-[#4ade80] transition-colors">
                {focusedProject.nombre}
              </h3>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-1 truncate">
                💼 {focusedProjectCardData.clientName}
              </p>
            </div>

            {/* Numeric progress */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-[10px] font-black uppercase text-white/50 mb-1">
                <span>Progreso</span>
                <span>{focusedProjectCardData.completedTasks}/{focusedProjectCardData.totalTasks} Tareas ({focusedProjectCardData.pct}%)</span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#4ade80] rounded-full transition-all duration-500" style={{ width: `${focusedProjectCardData.pct}%` }} />
              </div>
            </div>

            {/* Task status chips */}
            <div className="flex flex-wrap gap-1.5 mt-4">
              {focusedProjectCardData.urgentPending > 0 && (
                <span className="text-[8px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-md">
                  {focusedProjectCardData.urgentPending} Urgentes
                </span>
              )}
              {focusedProjectCardData.highPending > 0 && (
                <span className="text-[8px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md">
                  {focusedProjectCardData.highPending} Alta
                </span>
              )}
              <span className="text-[8px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-md">
                {focusedProjectCardData.totalPending} Pendientes
              </span>
              {focusedProjectCardData.completedTasks > 0 && (
                <span className="text-[8px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                  {focusedProjectCardData.completedTasks} Listas
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 border-dashed text-center">
            <p className="text-xs font-bold text-white/50">No hay proyectos activos.</p>
          </div>
        )}

        {/* Compact List of Other Active Projects */}
        <div className="flex flex-col gap-2 flex-1 min-h-0">
          <h4 className="text-[9px] font-bold text-white/30 tracking-widest uppercase">Otros Proyectos Activos</h4>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {otherProjectsEntries.length === 0 ? (
              <p className="text-[10px] text-white/30 italic">No hay otros proyectos.</p>
            ) : (
              otherProjectsEntries.map(entry => {
                const colorIdx = data.proyectos.findIndex(p => p.id === entry.project.id);
                const colorClass = colorIdx !== -1 ? PROJECT_COLORS[colorIdx % PROJECT_COLORS.length] : "bg-gray-500";
                const pTasks = data.tareas.filter(t => t.proyecto_ids?.includes(entry.project.id));
                const done = pTasks.filter(t => DONE_STATES.has(t.estado)).length;
                const total = pTasks.length;
                const isPinned = entry.isPinned;

                return (
                  <div
                    key={entry.project.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-white/[0.01] hover:bg-white/[0.04] border border-transparent hover:border-white/[0.03] transition-all group cursor-pointer"
                    onClick={() => pushView({ level: 'project', id: entry.project.id })}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", colorClass)} />
                      <span className="text-[11px] font-bold text-white/60 truncate group-hover:text-white transition-colors">
                        {entry.project.nombre}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[9px] font-black text-white/30 group-hover:text-white/55">
                        {done}/{total}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePinProject(entry.project.id);
                        }}
                        className={cn(
                          "w-5 h-5 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border",
                          isPinned 
                            ? "bg-[#4ade80]/10 border-[#4ade80]/30 text-[#4ade80] opacity-100" 
                            : "border-white/5 text-white/30 hover:border-white/10 hover:text-white"
                        )}
                        title={isPinned ? "Quitar pin" : "Fijar en foco"}
                      >
                        <Pin className="w-2.5 h-2.5 fill-current" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── renderRightBlock (Right Column: 180px fixed) ─────────────────────────
  const renderRightBlock = () => {
    return (
      <div className="flex flex-col gap-5 h-full">
        {/* Two Metric Cards */}
        <div className="flex flex-col gap-2">
          <h4 className="text-[9px] font-bold text-white/30 tracking-widest uppercase flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-white/30" /> Métricas
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {/* Active Projects */}
            <div className="bg-white/[0.02] border border-white/5 p-2.5 rounded-xl">
              <span className="text-[8px] font-black text-white/30 uppercase tracking-widest block leading-tight">Activos</span>
              <span className="text-base font-black text-white mt-1 block">
                {projectsWithScores.length}
              </span>
            </div>
            
            {/* Overdue Tasks */}
            <div className={cn(
              "p-2.5 rounded-xl border transition-colors",
              overdueTasksCount > 0 
                ? "bg-rose-500/[0.03] border-rose-500/10 text-rose-400" 
                : "bg-white/[0.02] border-white/5 text-white/50"
            )}>
              <span className="text-[8px] font-black uppercase tracking-widest block leading-tight text-white/30">Vencidas</span>
              <span className={cn(
                "text-base font-black mt-1 block",
                overdueTasksCount > 0 ? "text-rose-400" : "text-white"
              )}>
                {overdueTasksCount}
              </span>
            </div>
          </div>
        </div>

        {/* Upcoming Deliveries in Risk */}
        <div className="flex flex-col gap-2 min-h-0">
          <h4 className="text-[9px] font-bold text-white/30 tracking-widest uppercase">Entregas en Riesgo</h4>
          <div className="space-y-1.5 overflow-y-auto max-h-[160px] pr-1 custom-scrollbar">
            {riskDeliveries.length === 0 ? (
              <p className="text-[10px] text-white/30 italic">Todo en orden por ahora.</p>
            ) : (
              riskDeliveries.map(item => (
                <div 
                  key={item.project.id} 
                  className="flex items-center justify-between p-2 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] transition-all group cursor-pointer"
                  onClick={() => pushView({ level: 'project', id: item.project.id })}
                >
                  <span className="text-[10px] font-bold text-white/70 truncate flex-1 pr-2 group-hover:text-white transition-colors">
                    {item.project.nombre}
                  </span>
                  <span className={cn(
                    "text-[8px] font-black uppercase px-2 py-0.5 rounded-md flex-shrink-0 tracking-wider",
                    item.daysLeft < 0 
                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/15 animate-pulse" 
                      : item.daysLeft <= 2 
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/15" 
                        : "bg-purple-500/10 text-purple-400 border border-purple-500/15"
                  )}>
                    {item.daysLeft < 0 ? `+${Math.abs(item.daysLeft)}d` : item.daysLeft === 0 ? "Hoy" : `${item.daysLeft}d`}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Insight Card */}
        <div className="flex flex-col gap-2 mt-auto">
          <h4 className="text-[9px] font-bold text-white/30 tracking-widest uppercase flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[#4ade80]" /> Inteligencia
          </h4>
          <div className="bg-gradient-to-br from-[#1b1b22] to-[#121216] border border-white/[0.05] p-3 rounded-xl relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-12 h-12 bg-purple-500/5 rounded-full blur-xl pointer-events-none" />
            <p className="text-[10px] text-white/60 leading-relaxed font-medium">
              {overdueTasksCount > 0 ? (
                <>
                  <span className="text-rose-400 font-bold block mb-1">⚠️ TAREAS RETRASADAS</span>
                  Tienes <strong className="text-white">{overdueTasksCount} tareas vencidas</strong>. Prioriza resolverlas hoy para no generar cuello de botella en los entregables.
                </>
              ) : globalTotalMins > 480 ? (
                <>
                  <span className="text-amber-400 font-bold block mb-1">⚡ CARGA ELEVADA</span>
                  Hoy tienes proyectados <strong className="text-white">{formatMins(globalTotalMins)}</strong> de trabajo. Considera delegar o reprogramar tareas menos críticas.
                </>
              ) : (
                <>
                  <span className="text-[#4ade80] font-bold block mb-1">✨ CRONOGRAMA SANO</span>
                  La carga de hoy está balanceada (<strong className="text-white">{formatMins(globalTotalMins)}</strong>). No hay alertas de sobrecarga activas. ¡Buen ritmo!
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // ── renderCreatePanel (Inline Form Column) ───────────────────────────────
  const renderCreatePanel = () => {
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-widest text-white">
              {createMode === "project" ? "Nuevo proyecto" : createMode === "project-task" ? "Nueva tarea en proyecto" : "Nueva tarea"}
            </h3>
            <p className="text-[10px] text-white/35 mt-1">
              {createMode === "project"
                ? "Se crea dentro del flujo principal y puede fijarse al timeline."
                : "Se guarda con fecha para entrar al plan inteligente."}
            </p>
          </div>
          <button
            onClick={() => setCreateMode(null)}
            className="w-8 h-8 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {createMode === "project" ? (
          <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_.9fr] gap-4 overflow-y-auto pr-1 max-h-[70vh] custom-scrollbar">
            <label className="flex flex-col gap-2 xl:col-span-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/35">Nombre *</span>
              <input
                autoFocus
                value={projectForm.nombre}
                onChange={(e) => setProjectForm(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Nombre del proyecto"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-[#4ade80]/60 placeholder:text-white/20"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/35">Cliente</span>
              <select
                value={projectForm.clienteId}
                onChange={(e) => setProjectForm(prev => ({ ...prev, clienteId: e.target.value }))}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-xs font-bold text-white/70 outline-none"
              >
                <option value="">Sin cliente</option>
                {(data.clientes ?? []).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/35">Prioridad</span>
              <select
                value={projectForm.prioridad}
                onChange={(e) => setProjectForm(prev => ({ ...prev, prioridad: e.target.value }))}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-xs font-bold text-white/70 outline-none"
              >
                {PROJ_PRIO_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/35">Estado</span>
              <select
                value={projectForm.estadoProyecto}
                onChange={(e) => setProjectForm(prev => ({ ...prev, estadoProyecto: e.target.value }))}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-xs font-bold text-white/70 outline-none"
              >
                {PROJ_STATUS_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/35">Inicio</span>
                <input
                  type="date"
                  value={projectForm.fechaInicio}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, fechaInicio: e.target.value, firstTaskDate: prev.firstTaskDate || e.target.value }))}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-xs font-bold text-white/70 outline-none"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/35">Fin</span>
                <input type="date" value={projectForm.fechaFin} onChange={(e) => setProjectForm(prev => ({ ...prev, fechaFin: e.target.value }))} className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-xs font-bold text-white/70 outline-none" />
              </label>
            </div>

            <label className="flex flex-col gap-2 xl:col-span-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/35">Contexto</span>
              <textarea
                value={projectForm.descripcion}
                onChange={(e) => setProjectForm(prev => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Objetivo, entregables y notas iniciales..."
                rows={3}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-xs font-medium text-white outline-none focus:border-[#4ade80]/60 resize-none placeholder:text-white/20"
              />
            </label>

            <div className="xl:col-span-2 rounded-2xl border border-[#4ade80]/20 bg-[#4ade80]/5 p-4">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#4ade80]">Primer paso en timeline</p>
                  <p className="text-[10px] text-white/40 mt-1">Este primer entregable hace que el proyecto nazca con tracción inmediata.</p>
                </div>
                <Sparkles className="w-4 h-4 text-[#4ade80] flex-shrink-0 mt-0.5" />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[1fr_150px] gap-3">
                <label className="flex flex-col gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/35">Tarea inicial</span>
                  <input
                    value={projectForm.firstTaskTitle}
                    onChange={(e) => setProjectForm(prev => ({ ...prev, firstTaskTitle: e.target.value }))}
                    placeholder="Ej: Definir brief y próximos pasos"
                    className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-[#4ade80]/60 placeholder:text-white/20"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/35">Fecha</span>
                  <input
                    type="date"
                    value={projectForm.firstTaskDate}
                    onChange={(e) => setProjectForm(prev => ({ ...prev, firstTaskDate: e.target.value }))}
                    className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2.5 text-xs font-bold text-white/70 outline-none"
                  />
                </label>

                <label className="flex flex-col gap-2 xl:col-span-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/35">Esfuerzo inicial</span>
                  <select
                    value={projectForm.firstTaskEffort}
                    onChange={(e) => setProjectForm(prev => ({ ...prev, firstTaskEffort: e.target.value }))}
                    className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2.5 text-xs font-bold text-white/70 outline-none"
                  >
                    <option value="">Sin estimar</option>
                    {ESFUERZOS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </label>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 overflow-y-auto pr-1 max-h-[70vh] custom-scrollbar">
            <label className="flex flex-col gap-2 xl:col-span-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/35">Título *</span>
              <input
                autoFocus
                value={taskForm.titulo}
                onChange={(e) => setTaskForm(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="Nombre de la tarea"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-[#4ade80]/60 placeholder:text-white/20"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/35">Proyecto</span>
              <select
                value={taskForm.proyectoId}
                disabled={createMode === "project-task"}
                onChange={(e) => {
                  const selected = data.proyectos.find(p => p.id === e.target.value);
                  setTaskForm(prev => ({
                    ...prev,
                    proyectoId: e.target.value,
                    clienteId: selected?.cliente_ids?.[0] || prev.clienteId,
                  }));
                }}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-xs font-bold text-white/70 outline-none disabled:opacity-60"
              >
                <option value="">Selecciona proyecto</option>
                {(data.proyectos ?? []).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/35">Cliente</span>
              <select
                value={taskForm.clienteId}
                onChange={(e) => setTaskForm(prev => ({ ...prev, clienteId: e.target.value }))}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-xs font-bold text-white/70 outline-none"
              >
                <option value="">Sin cliente</option>
                {(data.clientes ?? []).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/35">Prioridad</span>
              <select value={taskForm.prioridad} onChange={(e) => setTaskForm(prev => ({ ...prev, prioridad: e.target.value }))} className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-xs font-bold text-white/70 outline-none">
                {TASK_PRIO_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/35">Fecha</span>
              <input type="date" value={taskForm.fechaEntrega} onChange={(e) => setTaskForm(prev => ({ ...prev, fechaEntrega: e.target.value }))} className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-xs font-bold text-white/70 outline-none" />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/35">Esfuerzo</span>
              <select value={taskForm.esfuerzo} onChange={(e) => setTaskForm(prev => ({ ...prev, esfuerzo: e.target.value }))} className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-xs font-bold text-white/70 outline-none">
                <option value="">Sin estimar</option>
                {ESFUERZOS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/35">Formato</span>
              <select value={taskForm.formato} onChange={(e) => setTaskForm(prev => ({ ...prev, formato: e.target.value }))} className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-xs font-bold text-white/70 outline-none">
                <option value="">Sin formato</option>
                {FORMATOS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>

            {!taskForm.proyectoId && (
              <div className="xl:col-span-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                <p className="text-[10px] font-bold text-amber-200/80 leading-relaxed">
                  Para que esta tarea aparezca en el timeline de arriba necesita pertenecer a un proyecto.
                </p>
              </div>
            )}
          </div>
        )}

        {createError && <p className="text-xs font-bold text-rose-400 mt-4">{createError}</p>}

        <div className="mt-auto pt-6 flex justify-end gap-3">
          <button
            onClick={() => setCreateMode(null)}
            className="px-4 py-2 rounded-xl bg-white/5 text-white/50 text-xs font-bold hover:bg-white/10 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={createMode === "project" ? handleCreateProject : handleCreateTask}
            disabled={savingCreate || (createMode === "project" ? !projectForm.nombre.trim() : (!taskForm.titulo.trim() || !taskForm.proyectoId))}
            className="px-5 py-2 rounded-xl bg-[#4ade80] text-[#10241b] text-xs font-black uppercase tracking-wider disabled:opacity-40 hover:scale-[1.02] active:scale-95 transition-all"
          >
            {savingCreate ? "Creando..." : createMode === "project" ? "Crear proyecto" : "Crear tarea"}
          </button>
        </div>
      </div>
    );
  };

  // ── renderCenterBlock (Center Column: flex, occupies remaining space) ───────
  const renderCenterBlock = () => {
    if (createMode) {
      return renderCreatePanel();
    }

    return (
      <div className="flex flex-col h-full gap-5">
        {/* Header with name of the project in focus */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              {focusedProject ? (
                <>
                  <Target className="w-6 h-6 text-[#4ade80]" />
                  {focusedProject.nombre}
                </>
              ) : (
                "Plan Inteligente"
              )}
            </h2>
            {focusedProject && (
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">
                {focusedProject.area || "Proyecto en curso"} · {focusedProject.estadoProyecto || "Activo"}
              </p>
            )}
          </div>
          {createActions}
        </div>

        {/* Section 1: Active Project Tasks */}
        <div className="flex flex-col gap-2 min-h-0 flex-1 overflow-y-auto pr-1 custom-scrollbar">
          <h3 className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-1">
            Tareas del Proyecto Focado
          </h3>
          
          {!focusedProject ? (
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-white/40 italic">
              No hay ningún proyecto activo en foco en este momento.
            </div>
          ) : activeProjectTasks.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-white/40 italic">
              Sin tareas pendientes o creadas en este proyecto.
            </div>
          ) : (
            <div className="space-y-1.5">
              {activeProjectTasks.map(t => {
                const isDone = DONE_STATES.has(t.estado);
                const dateBadge = getTaskDateBadge(t);
                
                // Find assignee letters
                const assignedWorker = data.trabajadores.find(w => t.asignado_ids?.includes(w.id));
                const assigneeInitial = assignedWorker?.nombre?.[0] || t.asignado?.[0] || "";

                return (
                  <div 
                    key={t.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.03] hover:border-white/[0.06] transition-all group/task cursor-pointer shadow-sm",
                      isDone && "opacity-40"
                    )}
                    onClick={() => pushView({ level: 'task', id: t.id })}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCheckTask(t.id);
                        }}
                        disabled={isDone}
                        className={cn(
                          "w-5 h-5 rounded-md border flex items-center justify-center transition-all flex-shrink-0",
                          isDone 
                            ? "bg-[#4ade80]/20 border-[#4ade80] text-[#4ade80]" 
                            : "border-white/20 hover:border-[#4ade80] text-transparent hover:text-white/20"
                        )}
                      >
                        <Check className="w-3.5 h-3.5 text-[#4ade80]" />
                      </button>
                      
                      <span className={cn(
                        "text-xs font-bold text-white/80 group-hover/task:text-white transition-colors truncate",
                        isDone && "line-through text-white/40"
                      )}>
                        {t.titulo}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Date Badge */}
                      {dateBadge && (
                        <span className={cn(
                          "text-[9px] font-black uppercase px-2 py-0.5 rounded-md border tracking-wider",
                          dateBadge.style
                        )}>
                          {dateBadge.text}
                        </span>
                      )}

                      {/* Assignee Avatar */}
                      {assigneeInitial ? (
                        <div 
                          className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center text-[9px] font-black uppercase flex-shrink-0"
                          title={assignedWorker?.nombre || t.asignado}
                        >
                          {assigneeInitial}
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-white/5 bg-white/[0.02] flex items-center justify-center text-white/20 flex-shrink-0">
                          <User className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Separator */}
          <div className="border-t border-white/[0.05] my-5" />

          {/* Section 2: "tareas de hoy de otros proyectos" */}
          <h3 className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-1">
            Tareas de Hoy de Otros Proyectos
          </h3>

          {todayTasksOtherProjects.length === 0 ? (
            <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 border-dashed text-center text-white/25 text-[11px] italic">
              No hay tareas programadas de otros proyectos para hoy.
            </div>
          ) : (
            <div className="space-y-1.5 opacity-55 hover:opacity-100 transition-opacity duration-300">
              {todayTasksOtherProjects.map(t => {
                const isDone = DONE_STATES.has(t.estado);
                const dateBadge = getTaskDateBadge(t);
                const assignedWorker = data.trabajadores.find(w => t.asignado_ids?.includes(w.id));
                const assigneeInitial = assignedWorker?.nombre?.[0] || t.asignado?.[0] || "";

                return (
                  <div 
                    key={t.id}
                    className={cn(
                      "flex items-center justify-between p-2.5 rounded-xl bg-white/[0.01] border border-white/[0.02] transition-all group/task cursor-pointer"
                    )}
                    onClick={() => pushView({ level: 'task', id: t.id })}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCheckTask(t.id);
                        }}
                        disabled={isDone}
                        className="w-4 h-4 rounded-md border border-white/10 flex items-center justify-center transition-all flex-shrink-0 hover:border-[#4ade80]"
                      >
                        <Check className="w-2.5 h-2.5 text-transparent hover:text-[#4ade80]/40" />
                      </button>
                      
                      <span className="text-[11px] font-bold text-white/60 group-hover/task:text-white/90 transition-colors truncate">
                        {t.titulo}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Date Badge */}
                      {dateBadge && (
                        <span className={cn(
                          "text-[8px] font-black uppercase px-2 py-0.5 rounded-md border tracking-wider",
                          dateBadge.style
                        )}>
                          {dateBadge.text}
                        </span>
                      )}

                      {/* Assignee Avatar */}
                      {assigneeInitial ? (
                        <div 
                          className="w-4 h-4 rounded-full bg-white/5 text-white/40 border border-white/10 flex items-center justify-center text-[8px] font-black uppercase flex-shrink-0"
                          title={assignedWorker?.nombre || t.asignado}
                        >
                          {assigneeInitial}
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-white/5 bg-white/[0.01] flex items-center justify-center text-white/10 flex-shrink-0">
                          <User className="w-2 h-2" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Task Button */}
          <button
            onClick={() => openCreateMode(focusedProject ? "project-task" : "task")}
            className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-white/[0.08] bg-white/[0.01] hover:bg-white/[0.04] hover:border-white/20 text-white/50 hover:text-white text-xs font-bold transition-all"
          >
            <Plus className="w-4 h-4" /> Agregar tarea
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 flex flex-row overflow-hidden bg-[#0a0a0c]">
      {/* Columna Izquierda (220px fija) */}
      <div className="w-[220px] flex-shrink-0 flex flex-col overflow-hidden border-r border-white/[0.05] bg-black/[0.05]">
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 custom-scrollbar" style={{ scrollbarWidth: 'thin' }}>
          {renderLeftBlock()}
        </div>
      </div>

      {/* Columna Central (flex, ocupa el resto) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-5 custom-scrollbar" style={{ scrollbarWidth: 'thin' }}>
          {renderCenterBlock()}
        </div>
        
        {/* Dynamic Capacity/Workload Bar at the bottom of the center area */}
        <div className="flex-shrink-0 border-t border-white/[0.05] px-6 py-3 bg-black/[0.03]">
          <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-white/30 mb-1.5">
            <span>Carga de hoy ({globalTotalMins}m / 8h)</span>
            <span className={cn(capacityPct > 90 ? "text-rose-400" : "text-[#4ade80]")}>{Math.round(capacityPct)}%</span>
          </div>
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
            <div className={cn("h-full transition-all duration-1000", capacityPct > 90 ? "bg-rose-500" : "bg-[#4ade80]")} style={{ width: `${capacityPct}%` }} />
          </div>
        </div>
      </div>

      {/* Columna Derecha (180px fija) */}
      <div className="w-[180px] flex-shrink-0 flex flex-col overflow-hidden bg-black/[0.12] border-l border-white/[0.05]">
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 custom-scrollbar" style={{ scrollbarWidth: 'thin' }}>
          {renderRightBlock()}
        </div>
      </div>
    </div>
  );
}
