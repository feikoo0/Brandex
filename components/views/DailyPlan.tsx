"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { useData, useCreateProject, useCreateTask, useUpdateTask } from "@/hooks/useData";
import { DONE_STATES, ESFUERZOS, FORMATOS, PROJECT_COLORS, PROJ_PRIO_OPTS, PROJ_STATUS_OPTS, TASK_PRIO_OPTS } from "@/lib/constants";
import { Check, ShieldAlert, Activity, RefreshCcw, UserMinus, Target, Sparkles, Plus, FolderPlus, X, ChevronDown, ChevronUp, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/store";
import { CanvasLayout } from "./CanvasLayout";
import { calculateProjections, DAILY_CAPACITY_MINS } from "@/lib/scheduler";

const HOME_PLAN_VISIBLE_TASKS = 3;

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
  const movePinnedProject = useUIStore(s => s.movePinnedProject);
  const [createMode, setCreateMode] = useState<"project" | "task" | "project-task" | null>(null);
  const [savingCreate, setSavingCreate] = useState(false);
  const [createError, setCreateError] = useState("");
  const [collapsedProjects, setCollapsedProjects] = useState<string[]>(() => readStoredArray("home-plan-collapsed-projects"));
  const [expandedProjects, setExpandedProjects] = useState<string[]>(() => readStoredArray("home-plan-expanded-projects"));
  const [taskOrderByProject, setTaskOrderByProject] = useState<Record<string, string[]>>(() => readStoredRecord("home-plan-task-order"));

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

  useEffect(() => {
    window.localStorage.setItem("home-plan-collapsed-projects", JSON.stringify(collapsedProjects));
  }, [collapsedProjects]);

  useEffect(() => {
    window.localStorage.setItem("home-plan-expanded-projects", JSON.stringify(expandedProjects));
  }, [expandedProjects]);

  useEffect(() => {
    window.localStorage.setItem("home-plan-task-order", JSON.stringify(taskOrderByProject));
  }, [taskOrderByProject]);

  const planData = useMemo(() => {
    if (!data) return null;

    const projections = calculateProjections(data);
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const pendingProjections = projections.filter(pj => 
      pinnedProjects.includes(pj.project_id)
    );

    const applyManualTaskOrder = (projectId: string, tasks: any[]) => {
      const order = taskOrderByProject[projectId] || [];
      if (order.length === 0) return tasks;
      return [...tasks].sort((a, b) => {
        const aIdx = order.indexOf(a.id);
        const bIdx = order.indexOf(b.id);
        if (aIdx === -1 && bIdx === -1) return 0;
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      });
    };

    const groupProjections = (items: typeof pendingProjections) => {
      const grouped: Record<string, { project: any, tasks: any[], totalMins: number, allDone: boolean }> = {};
      items.forEach(pj => {
        const projId = pj.project_id;
        const project = data.proyectos.find((p: any) => p.id === projId);
        if (!project) return;

        if (!grouped[projId]) {
          grouped[projId] = { project, tasks: [], totalMins: 0, allDone: true };
        }
        grouped[projId].tasks.push({ ...pj.task, projectedDate: pj.projectedDate });
        if (!DONE_STATES.has(pj.task.estado)) {
          grouped[projId].totalMins += pj.mins;
          grouped[projId].allDone = false;
        }
      });

      return pinnedProjects
        .map(id => {
          if (!grouped[id]) return null;
          const sortedTasks = applyManualTaskOrder(id, grouped[id].tasks).sort((a, b) => {
            const aDone = DONE_STATES.has(a.estado) ? 1 : 0;
            const bDone = DONE_STATES.has(b.estado) ? 1 : 0;
            return aDone - bDone;
          });
          return { ...grouped[id], tasks: sortedTasks };
        })
        .filter(Boolean) as { project: any, tasks: any[], totalMins: number, allDone: boolean }[];
    };

    const todayGroups = groupProjections(pendingProjections.filter(pj => pj.projectedDate === todayKey));

    const unifiedGroupsMap: Record<string, { project: any, tasks: any[], totalMins: number, nextDate: string, allDone: boolean }> = {};
    
    pinnedProjects.forEach(id => {
      const project = data.proyectos.find((p: any) => p.id === id);
      if (project) {
        unifiedGroupsMap[id] = { project, tasks: [], totalMins: 0, nextDate: "9999-12-31", allDone: true };
      }
    });

    [...pendingProjections]
      .sort((a, b) => a.projectedDate.localeCompare(b.projectedDate))
      .forEach(pj => {
      const projId = pj.project_id;
      if (!unifiedGroupsMap[projId]) return;

      unifiedGroupsMap[projId].tasks.push({ ...pj.task, projectedDate: pj.projectedDate });
      if (!DONE_STATES.has(pj.task.estado)) {
        unifiedGroupsMap[projId].totalMins += pj.mins;
        unifiedGroupsMap[projId].allDone = false;
      }
    });

    const unifiedGroups = pinnedProjects
      .map(id => {
        if (!unifiedGroupsMap[id]) return null;
        const sortedTasks = applyManualTaskOrder(id, unifiedGroupsMap[id].tasks).sort((a, b) => {
          const aDone = DONE_STATES.has(a.estado) ? 1 : 0;
          const bDone = DONE_STATES.has(b.estado) ? 1 : 0;
          return aDone - bDone;
        });
        return { ...unifiedGroupsMap[id], tasks: sortedTasks };
      })
      .filter(Boolean) as { project: any, tasks: any[], totalMins: number, nextDate: string, allDone: boolean }[];

    const sortGroups = (groups: any[]) => [...groups].sort((a, b) => {
      const aDone = a.allDone ? 1 : 0;
      const bDone = b.allDone ? 1 : 0;
      return aDone - bDone;
    });

    const topGroup = sortGroups(todayGroups).find(group => group.tasks.length > 0 && !group.allDone) || sortGroups(unifiedGroups).find(group => group.tasks.length > 0 && !group.allDone) || sortGroups(todayGroups)[0] || null;
    const allProposedGroups = sortGroups(unifiedGroups);
    
    const todayProjections = pendingProjections.filter(pj => pj.projectedDate === todayKey && !DONE_STATES.has(pj.task.estado));
    const todayTotalMins = todayProjections.reduce((acc, pj) => acc + pj.mins, 0);
    const focusToday = topGroup ? todayGroups.find(group => group.project.id === topGroup.project.id) : null;

    return {
      topGroup,
      allProposedGroups,
      todayTotalMins,
      todayTaskCount: todayProjections.length,
      focusTodayTaskCount: focusToday?.tasks.length || 0,
      focusTodayMins: focusToday?.totalMins || 0,
      hasTodayWork: todayGroups.length > 0,
      pinnedCount: pinnedProjects.length,
    };
  }, [data, pinnedProjects, taskOrderByProject]);

  if (!planData) return <div className="p-10 text-white/40 font-bold uppercase tracking-widest text-center">Iniciando sistema...</div>;

  const project = planData.topGroup?.project;
  const tasks = planData.topGroup?.tasks ?? [];
  const globalTotalMins = planData.todayTotalMins;
  const capacityPct = Math.min(100, (globalTotalMins / DAILY_CAPACITY_MINS) * 100);
  const globalTodayLabel = `${planData.todayTaskCount} tareas / ${formatMins(globalTotalMins)}`;
  const focusTodayLabel = `${planData.focusTodayTaskCount} hoy / ${formatMins(planData.focusTodayMins)}`;

  const handleCheckTask = async (taskId: string) => {
    updateTask.mutate({ id: taskId, estado: "Hecho" } as never);
  };

  const openCreateMode = (mode: "project" | "task" | "project-task") => {
    setCreateError("");
    setCreateMode(mode);
    const fallbackProject =
      project ||
      pinnedProjects.map(id => data?.proyectos.find(p => p.id === id)).find(Boolean) ||
      data?.proyectos.find(p => p.nombre);

    if (mode === "project-task" && project) {
      setTaskForm(prev => ({
        ...prev,
        proyectoId: project.id,
        clienteId: project.cliente_ids?.[0] || "",
      }));
    }
    if (mode === "task") {
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
      const selectedProject = data?.proyectos.find(p => p.id === taskForm.proyectoId);
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
        proyectoId: createMode === "project-task" && project ? project.id : "",
        clienteId: createMode === "project-task" && project ? project.cliente_ids?.[0] || "" : "",
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

  const toggleCollapsedProject = (projectId: string) => {
    setCollapsedProjects(prev => prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]);
  };

  const toggleExpandedProject = (projectId: string) => {
    setExpandedProjects(prev => prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]);
  };

  const moveVisualTask = (projectId: string, tasks: any[], taskId: string, direction: "up" | "down") => {
    const currentOrder = taskOrderByProject[projectId] || tasks.map(t => t.id);
    const taskIds = tasks.map(t => t.id);
    const normalized = [
      ...currentOrder.filter(id => taskIds.includes(id)),
      ...taskIds.filter(id => !currentOrder.includes(id)),
    ];
    const idx = normalized.indexOf(taskId);
    const nextIdx = direction === "up" ? idx - 1 : idx + 1;
    if (idx === -1 || nextIdx < 0 || nextIdx >= normalized.length) return;
    const next = [...normalized];
    [next[idx], next[nextIdx]] = [next[nextIdx], next[idx]];
    setTaskOrderByProject(prev => ({ ...prev, [projectId]: next }));
  };

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
      {project && (
        <button
          onClick={() => openCreateMode("project-task")}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#4ade80]/25 text-[#4ade80] text-[10px] font-black uppercase tracking-wider hover:bg-[#4ade80]/10 active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Tarea en proyecto
        </button>
      )}
    </div>
  );

  const leftBlock = (
    <div className="flex flex-col h-full justify-between relative">
      <div>
        <div className="flex items-center justify-between gap-4 mb-6">
          <h3 className="text-[10px] font-bold text-white/40 tracking-widest uppercase">Focus del Día</h3>
          {createActions}
        </div>
        
        {project ? (
          <div className="flex items-center gap-4 cursor-pointer group" onClick={() => pushView({ level: 'project', id: project.id })}>
            <div className="w-14 h-14 bg-[#4ade80] rounded-[16px] flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(74,222,128,0.2)] group-hover:scale-105 transition-transform">
              <Target className="w-7 h-7 text-[#10241b]" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white tracking-tight">{project.nombre}</h2>
                <span className="px-2 py-0.5 rounded-md border border-[#4ade80]/30 text-[#4ade80] text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 bg-[#4ade80]/5">
                  <Check className="w-2.5 h-2.5" /> Siguiente
                </span>
              </div>
              <p className="text-[#4ade80] text-xs font-medium opacity-90 mt-0.5">{project.area || "Proyecto activo"}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-wider text-white/55">
                  {focusTodayLabel}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-[#4ade80]/10 border border-[#4ade80]/20 text-[10px] font-black uppercase tracking-wider text-[#4ade80]">
                  Total hoy: {globalTodayLabel}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 border-dashed">
            <p className="text-sm font-bold text-white/70">No hay tareas pendientes en los proyectos fijados.</p>
            <p className="text-xs text-white/35 mt-2 leading-relaxed">Fija proyectos en el timeline o crea una tarea para poblar el plan inteligente.</p>
          </div>
        )}

        <div className="mt-10 flex flex-col gap-1">
           {tasks.length === 0 ? (
             <p className="text-sm text-white/40 italic">No hay tareas programadas para trabajar ahora.</p>
           ) : (
             tasks.map((t: any) => {
               const isDone = DONE_STATES.has(t.estado);
               return (
                 <div 
                   key={t.id} 
                   className={cn("flex items-center gap-4 py-3 border-b border-white/[0.03] group transition-all px-2 rounded-lg cursor-pointer", isDone ? "opacity-50" : "hover:bg-white/[0.02]")}
                   onClick={() => pushView({ level: 'task', id: t.id })}
                 >
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isDone) handleCheckTask(t.id);
                      }}
                      className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all", isDone ? "border-[#4ade80] bg-[#4ade80]/20" : "border-[#4ade80]/30 hover:border-[#4ade80]")}
                    >
                      <Check className={cn("w-3 h-3 text-[#4ade80] transition-opacity", isDone ? "opacity-100" : "opacity-0 group-hover:opacity-50")} />
                    </button>
                    <span className={cn("text-sm font-bold transition-colors", isDone ? "text-white/40 line-through" : "text-white/80 group-hover:text-white")}>{t.titulo}</span>
                 </div>
               );
             })
           )}
        </div>
      </div>

      <div className="mt-auto pt-10">
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-2">
          <span>Carga de hoy ({globalTotalMins}m / 8h)</span>
          <span>{Math.round(capacityPct)}%</span>
        </div>
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className={cn("h-full transition-all duration-1000", capacityPct > 90 ? "bg-red-500" : "bg-[#4ade80]")} style={{ width: `${capacityPct}%` }} />
        </div>
      </div>
    </div>
  );

  const createPanel = createMode && (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-[11px] font-black uppercase tracking-widest text-white">
            {createMode === "project" ? "Nuevo proyecto" : createMode === "project-task" ? "Nueva tarea en proyecto" : "Nueva tarea"}
          </h3>
          <p className="text-[11px] text-white/35 mt-1">
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
        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_.9fr] gap-4">
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
              {(data?.clientes ?? []).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
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
              rows={4}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-xs font-medium text-white outline-none focus:border-[#4ade80]/60 resize-none placeholder:text-white/20"
            />
          </label>

          <div className="xl:col-span-2 rounded-2xl border border-[#4ade80]/20 bg-[#4ade80]/5 p-4">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-[#4ade80]">Primer paso en timeline</p>
                <p className="text-[11px] text-white/40 mt-1">Este primer entregable hace que el proyecto nazca accionable, no sólo como barra vacía.</p>
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
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
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
                const selected = data?.proyectos.find(p => p.id === e.target.value);
                setTaskForm(prev => ({
                  ...prev,
                  proyectoId: e.target.value,
                  clienteId: selected?.cliente_ids?.[0] || prev.clienteId,
                }));
              }}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-xs font-bold text-white/70 outline-none disabled:opacity-60"
            >
              <option value="">Selecciona proyecto</option>
              {(data?.proyectos ?? []).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
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
              {(data?.clientes ?? []).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
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
            <div className="xl:col-span-2 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
              <p className="text-[11px] font-bold text-yellow-200/80 leading-relaxed">
                Para que esta tarea aparezca en el timeline de arriba necesita pertenecer a un proyecto.
              </p>
            </div>
          )}
        </div>
      )}

      {createError && <p className="text-xs font-bold text-red-400 mt-4">{createError}</p>}

      <div className="mt-auto pt-6 flex justify-end gap-3">
        <button
          onClick={() => setCreateMode(null)}
          className="px-4 py-2.5 rounded-xl bg-white/5 text-white/50 text-xs font-bold hover:bg-white/10 hover:text-white transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={createMode === "project" ? handleCreateProject : handleCreateTask}
          disabled={savingCreate || (createMode === "project" ? !projectForm.nombre.trim() : (!taskForm.titulo.trim() || !taskForm.proyectoId))}
          className="px-5 py-2.5 rounded-xl bg-[#4ade80] text-[#10241b] text-xs font-black uppercase tracking-wider disabled:opacity-40 hover:scale-[1.02] active:scale-95 transition-all"
        >
          {savingCreate ? "Creando..." : createMode === "project" ? "Crear proyecto" : "Crear tarea"}
        </button>
      </div>
    </div>
  );

  const centerBlock = createPanel || (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-[11px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
          Plan Inteligente <span className="text-white/30">•</span> <span className="text-[#4ade80]">{planData.hasTodayWork ? format(new Date(), "EEEE d MMM", { locale: es }) : "Próximo trabajo"}</span>
        </h3>
        <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all">
          <RefreshCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col gap-10">
        {planData.allProposedGroups.length === 0 ? (
          <div className="text-center py-20 opacity-20 flex flex-col items-center">
            <Sparkles className="w-12 h-12 mb-4" />
            <p className="text-sm font-bold uppercase tracking-widest">Nada pendiente para hoy</p>
          </div>
        ) : (
          planData.allProposedGroups.map((group) => {
            const colorIdx = pinnedProjects.indexOf(group.project.id);
            const colorClass = colorIdx !== -1 ? PROJECT_COLORS[colorIdx % PROJECT_COLORS.length] : "bg-gray-500";
            const isCollapsed = collapsedProjects.includes(group.project.id);
            const isExpanded = expandedProjects.includes(group.project.id);
            const visibleTasks = isCollapsed ? [] : (isExpanded ? group.tasks : group.tasks.slice(0, HOME_PLAN_VISIBLE_TASKS));
            const hiddenCount = Math.max(0, group.tasks.length - HOME_PLAN_VISIBLE_TASKS);
            
            return (
              <div key={group.project.id} className="flex flex-col gap-3 group/project">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <button
                    className="flex items-center gap-2 min-w-0 cursor-pointer hover:opacity-80 transition-opacity text-left"
                    onClick={() => pushView({ level: 'project', id: group.project.id })}
                  >
                    <div className={cn("w-2 h-2 rounded-full flex-shrink-0", colorClass)} />
                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider truncate">{group.project.nombre}</span>
                    <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[9px] font-black text-white/25 uppercase tracking-wider whitespace-nowrap">
                      {visibleTasks.length}/{group.tasks.length}
                    </span>
                  </button>

                  <div className="flex items-center gap-1 opacity-45 group-hover/project:opacity-100 transition-opacity">
                    <button
                      onClick={() => movePinnedProject(group.project.id, "up")}
                      disabled={colorIdx <= 0}
                      title="Subir proyecto"
                      className="w-7 h-7 rounded-lg text-white/30 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:hover:bg-transparent flex items-center justify-center transition-colors"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => movePinnedProject(group.project.id, "down")}
                      disabled={colorIdx < 0 || colorIdx >= pinnedProjects.length - 1}
                      title="Bajar proyecto"
                      className="w-7 h-7 rounded-lg text-white/30 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:hover:bg-transparent flex items-center justify-center transition-colors"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => toggleCollapsedProject(group.project.id)}
                      title={isCollapsed ? "Mostrar tareas" : "Ocultar tareas"}
                      className="w-7 h-7 rounded-lg text-white/35 hover:text-[#4ade80] hover:bg-[#4ade80]/10 flex items-center justify-center transition-colors"
                    >
                      {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                
                {!isCollapsed && (
                  <div className="flex flex-col gap-1">
                    {visibleTasks.length === 0 ? (
                      <p className="text-[10px] text-white/30 italic px-2 py-1">Sin tareas creadas o pendientes.</p>
                    ) : (
                      visibleTasks.map((t: any, taskIdx: number) => {
                      const isToday = t.projectedDate === format(new Date(), 'yyyy-MM-dd');
                      const isDone = DONE_STATES.has(t.estado);
                      return (
                        <div 
                          key={t.id} 
                          className={cn("flex items-center justify-between py-3 border-b border-white/[0.03] group/task transition-all px-2 rounded-lg cursor-pointer", isDone ? "opacity-40" : "hover:bg-white/[0.02]")}
                          onClick={() => pushView({ level: 'task', id: t.id })}
                        >
                          <div className="flex items-center gap-4">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isDone) handleCheckTask(t.id);
                              }}
                              className={cn(
                                "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                                isDone ? "border-[#4ade80] bg-[#4ade80]/20" : isToday ? "border-[#4ade80]/30 hover:border-[#4ade80]" : "border-white/10 hover:border-white/30"
                              )}
                            >
                              <Check className={cn("w-3 h-3 text-[#4ade80]", isDone ? "opacity-100" : "opacity-0 group-hover/task:opacity-50")} />
                            </button>
                            
                            <div className="flex flex-col">
                              <span className={cn("text-sm font-bold transition-colors leading-none", isDone ? "text-white/40 line-through" : "text-white/80 group-hover/task:text-white")}>{t.titulo}</span>
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-widest mt-1.5",
                                isToday && !isDone ? "text-[#4ade80]" : "text-white/20"
                              )}>
                                {isToday ? "Hoy" : format(new Date(t.projectedDate + 'T12:00:00'), 'd MMM', { locale: es })}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <div className="opacity-0 group-hover/task:opacity-100 transition-opacity flex items-center gap-0.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveVisualTask(group.project.id, group.tasks, t.id, "up");
                                }}
                                disabled={taskIdx === 0}
                                title="Subir tarea en esta vista"
                                className="w-6 h-6 rounded-md text-white/25 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:hover:bg-transparent flex items-center justify-center"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveVisualTask(group.project.id, group.tasks, t.id, "down");
                                }}
                                disabled={taskIdx >= visibleTasks.length - 1 && (!isExpanded || taskIdx >= group.tasks.length - 1)}
                                title="Bajar tarea en esta vista"
                                className="w-6 h-6 rounded-md text-white/25 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:hover:bg-transparent flex items-center justify-center"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="text-[10px] font-black text-white/20 uppercase group-hover/task:text-white/40 transition-colors bg-white/5 px-2 py-1 rounded-md border border-white/5">
                              {t.esfuerzo || "1h"}
                            </div>
                          </div>
                        </div>
                      );
                    }))}

                    {hiddenCount > 0 && (
                      <button
                        onClick={() => toggleExpandedProject(group.project.id)}
                        className="mt-2 self-start text-[10px] font-black uppercase tracking-widest text-[#4ade80]/80 hover:text-[#4ade80] bg-[#4ade80]/10 hover:bg-[#4ade80]/15 border border-[#4ade80]/15 rounded-lg px-3 py-1.5 transition-colors"
                      >
                        {isExpanded ? "Ocultar" : `Ver ${hiddenCount} más`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  const rightBlock = (
    <div className="flex flex-col gap-5 h-full overflow-y-auto custom-scrollbar">
      {/* System Health Summary */}
      <div className="flex flex-col gap-2">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2"><Activity className="w-3 h-3" /> Sistema</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/[0.03] border border-white/5 p-2.5 rounded-xl">
            <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest block">Proyectos</span>
            <span className="text-lg font-black text-white">{data?.proyectos.filter(p => !DONE_STATES.has(p.estadoProyecto)).length || 0}</span>
          </div>
          <div className="bg-red-500/[0.03] border border-red-500/10 p-2.5 rounded-xl">
            <span className="text-[9px] font-bold text-red-400/60 uppercase tracking-widest block">Vencidas</span>
            <span className="text-lg font-black text-red-400">
              {data?.tareas.filter(t => {
                if (DONE_STATES.has(t.estado) || !t.fechaEntrega) return false;
                const today = new Date(); today.setHours(0,0,0,0);
                const [y, m, d] = t.fechaEntrega.split('-').map(Number);
                return new Date(y, m - 1, d) < today;
              }).length || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="flex flex-col gap-2">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2"><Sparkles className="w-3 h-3" /> Insights</h3>
        <div className="space-y-2">
          {capacityPct > 100 ? (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-red-200/70 font-medium leading-relaxed">
                <span className="text-red-400 font-bold">Sobrecarga.</span> {globalTotalMins}m proyectados. Delega tareas.
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-[#4ade80]/10 border border-[#4ade80]/20 flex gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#4ade80] flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-green-200/70 font-medium leading-relaxed">
                <span className="text-[#4ade80] font-bold">Plan OK.</span> Carga manejable.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Team Workload (Compact) */}
      {data?.trabajadores && data.trabajadores.filter(w => w.rol !== "Admin").length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">Equipo</h3>
          <div className="flex flex-col gap-2">
            {data.trabajadores.filter(w => w.rol !== "Admin").slice(0, 4).map(w => {
              const wTasks = data.tareas.filter(t => t.asignado_ids?.includes(w.id) && !DONE_STATES.has(t.estado));
              const totalMins = wTasks.reduce((s, t) => s + (parseFloat(t.esfuerzo?.match(/\d+/)?.[0] || "0") * (t.esfuerzo?.includes("h") ? 60 : t.esfuerzo?.includes("min") ? 1 : 30)), 0);
              const pct = Math.round((totalMins / 480) * 100);
              return (
                <div key={w.id} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-black text-white/60 flex-shrink-0">
                    {w.nombre?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-[10px] font-bold text-white/60 truncate w-16">{w.nombre?.split(" ")[0]}</span>
                  <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", pct > 100 ? "bg-red-500" : pct > 70 ? "bg-orange-500" : "bg-emerald-500")} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <span className="text-[9px] font-black text-white/40 w-7 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Deliveries (Compact) */}
      {(() => {
        const today = new Date(); today.setHours(0,0,0,0);
        const upcoming = data?.proyectos
          .filter(p => !DONE_STATES.has(p.estadoProyecto) && p.fechaFin)
          .map(p => {
            const [y, m, d] = p.fechaFin.split('-').map(Number);
            const date = new Date(y, m - 1, d);
            return { ...p, date, daysLeft: Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) };
          })
          .sort((a, b) => a.date.getTime() - b.date.getTime())
          .slice(0, 3) || [];

        if (upcoming.length === 0) return null;
        return (
          <div className="flex flex-col gap-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">Entregas</h3>
            <div className="flex flex-col gap-1.5">
              {upcoming.map(p => (
                <div key={p.id} className="flex items-center gap-2 group/del cursor-pointer" onClick={() => pushView({ level: 'project', id: p.id })}>
                  <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0",
                    p.daysLeft < 0 ? "bg-red-500" : p.daysLeft <= 2 ? "bg-orange-500" : "bg-purple-500"
                  )} />
                  <span className="text-[10px] font-bold text-white/70 truncate flex-1 group-hover/del:text-white transition-colors">{p.nombre}</span>
                  <span className={cn("text-[9px] font-black uppercase",
                    p.daysLeft < 0 ? "text-red-400" : p.daysLeft <= 2 ? "text-orange-400" : "text-white/30"
                  )}>
                    {p.daysLeft < 0 ? `${Math.abs(p.daysLeft)}d atrás` : p.daysLeft === 0 ? "Hoy" : `${p.daysLeft}d`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );

  return <CanvasLayout leftBlock={leftBlock} centerBlock={centerBlock} rightBlock={rightBlock} />;
}

