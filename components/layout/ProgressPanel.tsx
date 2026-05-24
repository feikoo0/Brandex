"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { addDays } from "date-fns";
import { useData, useUpdateTask, useUpdateProject, useCreateTask } from "@/hooks/useData";
import { useUIStore, useAuthStore } from "@/lib/store";
import { statusColor, cn } from "@/lib/utils";
import {
  DONE_STATES, TASK_ESTADO_OPTS, PROJ_STATUS_OPTS, TASK_PRIO_OPTS, PROJ_PRIO_OPTS,
  PRIORITY_COLORS, FORMATOS, ESFUERZOS,
} from "@/lib/constants";
import {
  Loader2, X, Plus, Search, Check, ArrowUpRight,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Clock,
  Flame, FolderOpen, CheckSquare, GripVertical, Layers,
  Copy, Unlink
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DragEndEvent, DragStartEvent, DragOverlay } from "@dnd-kit/core";
import {
  arrayMove, SortableContext, verticalListSortingStrategy, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type FocusPin = { id: string; type: "task" | "project" };
type FilterType = "all" | "task" | "project";

export function ProgressPanel() {
  const { data } = useData();
  const openCreator = useUIStore((s) => s.openCreator);
  const role        = useAuthStore((s) => s.role);
  const updateProject = useUpdateProject();

  const [filterType, setFilterType] = useState<FilterType>("all");

  const [focusPins, setFocusPins]           = useState<FocusPin[]>([]);
  const [visibleProjectIds, setVisibleProjectIds] = useState<string[]>([]);
  const [excludedProjectIds, setExcludedProjectIds] = useState<string[]>([]);
  const [manualTaskIds, setManualTaskIds]   = useState<string[]>([]);
  const [todoOrder, setTodoOrder]           = useState<Array<{ id: string; type: "task" | "project" }>>([]);
  const [removeConfirm, setRemoveConfirm]   = useState<string | null>(null);
  const [activeTodoDragId, setActiveTodoDragId] = useState<string | null>(null);
  const [projectOrder, setProjectOrder]     = useState<string[]>([]);
  const [activeDragId, setActiveDragId]     = useState<string | null>(null);
  const [activeFocusDragId, setActiveFocusDragId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<{ type: "task" | "project"; id: string } | null>(null);
  const [subDetailId, setSubDetailId] = useState<string | null>(null);
  const [newTaskProjectId, setNewTaskProjectId] = useState<string | null>(null);

  const [showSearch, setShowSearch]       = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [searchQuery, setSearchQuery]     = useState("");
  const [searchType, setSearchType]       = useState<"all" | "task" | "project">("all");
  const [searchSort, setSearchSort]       = useState<"recent" | "old">("recent");
  const searchRef  = useRef<HTMLDivElement>(null);
  const createRef  = useRef<HTMLDivElement>(null);

  // Load from server for focus
  useEffect(() => {
    const loadFocus = () => {
      fetch("/api/focus", { cache: "no-store" })
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            setFocusPins(prev => {
              if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
              return data;
            });
          }
        })
        .catch(() => {
          const fp = localStorage.getItem("focus-pins");
          if (fp && focusPins.length === 0) setFocusPins(JSON.parse(fp));
        });
    };

    loadFocus();
    const interval = setInterval(loadFocus, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  // Other local storages
  useEffect(() => {
    const po = localStorage.getItem("project-order");
    if (po) setProjectOrder(JSON.parse(po));
    const vp = localStorage.getItem("progress-visible-projects");
    if (vp) setVisibleProjectIds(JSON.parse(vp));
    const ep = localStorage.getItem("progress-excluded-projects");
    if (ep) setExcludedProjectIds(JSON.parse(ep));
    const mt = localStorage.getItem("progress-manual-tasks");
    if (mt) setManualTaskIds(JSON.parse(mt));
    const oldTodo = localStorage.getItem("todo-items");
    const newTodo = localStorage.getItem("progress-todo-order");
    if (oldTodo && !newTodo) {
      const parsed = JSON.parse(oldTodo);
      setTodoOrder(parsed);
      localStorage.setItem("progress-todo-order", JSON.stringify(parsed));
      localStorage.removeItem("todo-items");
    } else if (newTodo) {
      setTodoOrder(JSON.parse(newTodo));
    }
  }, []);

  // Listen for timeline X-button → show remove project dialog
  useEffect(() => {
    const handler = (e: Event) => {
      const projectId = (e as CustomEvent).detail?.id;
      if (projectId) initiateRemoveProject(projectId);
    };
    window.addEventListener("timeline-remove-project", handler);
    return () => window.removeEventListener("timeline-remove-project", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for new items created via QuickCreate → auto-add to progress panel
  useEffect(() => {
    const handler = (e: Event) => {
      const { type, id } = (e as CustomEvent).detail ?? {};
      if (id) addToProgressRef.current(id, type === "project" ? "project" : "task");
    };
    window.addEventListener("item-created", handler);
    return () => window.removeEventListener("item-created", handler);
  }, []);

  // Auto-sync search type when filter tab changes
  useEffect(() => {
    if (filterType === "project") setSearchType("project");
    else if (filterType === "task") setSearchType("task");
    else setSearchType("all");
  }, [filterType]);

  // Click outside closes search
  useEffect(() => {
    if (!showSearch) return;
    function onOut(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false);
    }
    document.addEventListener("mousedown", onOut);
    return () => document.removeEventListener("mousedown", onOut);
  }, [showSearch]);

  // Click outside closes create menu
  useEffect(() => {
    if (!showCreateMenu) return;
    function onOut(e: MouseEvent) {
      if (createRef.current && !createRef.current.contains(e.target as Node)) setShowCreateMenu(false);
    }
    document.addEventListener("mousedown", onOut);
    return () => document.removeEventListener("mousedown", onOut);
  }, [showCreateMenu]);

  // Reset sub-detail and new-task column whenever the main detail item changes
  useEffect(() => { setSubDetailId(null); setNewTaskProjectId(null); }, [detailItem]);
  // Opening sub-detail closes new-task column (they share column 3/4 space)
  useEffect(() => { if (subDetailId) setNewTaskProjectId(null); }, [subDetailId]);

  // Listen for timeline bar clicks → open detail column
  useEffect(() => {
    const handler = (e: Event) => {
      const { type, id } = (e as CustomEvent).detail ?? {};
      if (id && type) setDetailItem({ type, id });
    };
    window.addEventListener("panel-open-detail", handler);
    return () => window.removeEventListener("panel-open-detail", handler);
  }, []);

  // ── Focus pin management ──────────────────────────────────────────────────
  const syncFocusToServer = async (next: FocusPin[]) => {
    localStorage.setItem("focus-pins", JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("focus-pins-changed"));
    try {
      await fetch("/api/focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
        cache: "no-store"
      });
    } catch (e) { console.error("Focus sync failed:", e); }
  };

  const pinToFocus = (id: string, type: "task" | "project") => {
    setFocusPins(prev => {
      const already = prev.find(p => p.id === id);
      if (already) return prev;
      const next = prev.length >= 5 ? [...prev.slice(1), { id, type }] : [...prev, { id, type }];
      syncFocusToServer(next);
      return next;
    });
  };

  const removeFromFocus = (id: string) => {
    setFocusPins(prev => {
      const next = prev.filter(p => p.id !== id);
      syncFocusToServer(next);
      return next;
    });
  };

  const toggleFocus = (id: string, type: "task" | "project") => {
    if (focusPins.some(p => p.id === id)) removeFromFocus(id);
    else pinToFocus(id, type);
  };

  const moveFocusPin = (id: string, direction: "up" | "down") => {
    setFocusPins(prev => {
      const idx = prev.findIndex(p => p.id === id);
      if (idx === -1) return prev;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = arrayMove(prev, idx, newIdx);
      syncFocusToServer(next);
      return next;
    });
  };

  // ── Progress management ───────────────────────────────────────────────────
  const addProjectToProgress = useCallback(async (projectId: string) => {
    // 1. Un-exclude if was previously hidden in progress panel
    setExcludedProjectIds(prev => {
      if (!prev.includes(projectId)) return prev;
      const next = prev.filter(id => id !== projectId);
      localStorage.setItem("progress-excluded-projects", JSON.stringify(next));
      return next;
    });
    // 2. Mark as manually visible
    setVisibleProjectIds(prev => {
      if (prev.includes(projectId)) return prev;
      const next = [...prev, projectId];
      localStorage.setItem("progress-visible-projects", JSON.stringify(next));
      return next;
    });
    // 3. Add to todo order
    setTodoOrder(prev => {
      if (prev.some(i => i.id === projectId)) return prev;
      const next = [...prev, { id: projectId, type: "project" as const }];
      localStorage.setItem("progress-todo-order", JSON.stringify(next));
      return next;
    });
    // 4. Un-hide from timeline (in case it was removed before)
    const existingHidden: string[] = JSON.parse(localStorage.getItem("timeline-hidden") || "[]");
    if (existingHidden.includes(projectId)) {
      const newHidden = existingHidden.filter(id => id !== projectId);
      localStorage.setItem("timeline-hidden", JSON.stringify(newHidden));
      window.dispatchEvent(new CustomEvent("timeline-hidden-changed"));
    }
    // 5. Auto-schedule if project has no dates (always, not just for new projects)
    const project = data?.proyectos.find(p => p.id === projectId);
    if (project && (!project.fechaInicio || !project.fechaFin)) {
      const today     = new Date();
      const fechaInicio = today.toISOString().split("T")[0];
      const fechaFin    = addDays(today, 7).toISOString().split("T")[0];
      try {
        await updateProject.mutateAsync({ id: projectId, fechaInicio, fechaFin });
        window.dispatchEvent(new CustomEvent("timeline-hidden-changed"));
      } catch (e) {
        console.error("Auto-schedule failed:", e);
      }
    } else {
      // Project already has dates — just make sure timeline knows to show it
      window.dispatchEvent(new CustomEvent("timeline-hidden-changed"));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, updateProject]);

  const addTaskToProgress = useCallback((taskId: string) => {
    if (!data) return;
    const task = data.tareas.find((t: any) => t.id === taskId);
    if (!task) return;
    const hasProject = (task as any).proyecto_ids?.length > 0;
    setManualTaskIds(prev => {
      if (prev.includes(taskId)) return prev;
      const next = [...prev, taskId];
      localStorage.setItem("progress-manual-tasks", JSON.stringify(next));
      return next;
    });
    if (!hasProject) {
      setTodoOrder(prev => {
        if (prev.some(i => i.id === taskId)) return prev;
        const next = [...prev, { id: taskId, type: "task" as const }];
        localStorage.setItem("progress-todo-order", JSON.stringify(next));
        return next;
      });
    }
  }, [data]);

  const addToProgress = useCallback((id: string, type: "task" | "project") => {
    if (type === "project") addProjectToProgress(id);
    else addTaskToProgress(id);
  }, [addProjectToProgress, addTaskToProgress]);

  // Keep a ref to the latest addToProgress so the event listener never goes stale
  const addToProgressRef = useRef(addToProgress);
  useEffect(() => { addToProgressRef.current = addToProgress; }, [addToProgress]);

  const removeManualTask = (taskId: string) => {
    setManualTaskIds(prev => {
      const next = prev.filter(id => id !== taskId);
      localStorage.setItem("progress-manual-tasks", JSON.stringify(next));
      return next;
    });
    setTodoOrder(prev => {
      const next = prev.filter(i => i.id !== taskId);
      localStorage.setItem("progress-todo-order", JSON.stringify(next));
      return next;
    });
  };

  const initiateRemoveProject = (projectId: string) => setRemoveConfirm(projectId);

  const confirmRemoveProject = (projectId: string, alsoRemoveTasks: boolean) => {
    setRemoveConfirm(null);
    setVisibleProjectIds(prev => {
      const next = prev.filter(id => id !== projectId);
      localStorage.setItem("progress-visible-projects", JSON.stringify(next));
      return next;
    });
    setExcludedProjectIds(prev => {
      if (prev.includes(projectId)) return prev;
      const next = [...prev, projectId];
      localStorage.setItem("progress-excluded-projects", JSON.stringify(next));
      return next;
    });
    setTodoOrder(prev => {
      const next = prev.filter(i => i.id !== projectId);
      localStorage.setItem("progress-todo-order", JSON.stringify(next));
      return next;
    });
    const existingHidden: string[] = JSON.parse(localStorage.getItem("timeline-hidden") || "[]");
    if (!existingHidden.includes(projectId)) {
      const newHidden = [...existingHidden, projectId];
      localStorage.setItem("timeline-hidden", JSON.stringify(newHidden));
      window.dispatchEvent(new CustomEvent("timeline-hidden-changed"));
    }
    if (alsoRemoveTasks && data) {
      const projTaskIds = new Set(
        data.tareas.filter((t: any) => (t as any).proyecto_ids?.includes(projectId)).map((t: any) => t.id)
      );
      setManualTaskIds(prev => {
        const next = prev.filter(id => !projTaskIds.has(id));
        localStorage.setItem("progress-manual-tasks", JSON.stringify(next));
        return next;
      });
    }
  };

  // ── Memos ─────────────────────────────────────────────────────────────────
  const todoDisplayItems = useMemo(() => {
    if (!data) return [] as any[];
    const excludedSet = new Set(excludedProjectIds);
    const timelineIds = new Set(
      data.proyectos.filter((p: any) => p.fechaInicio && p.fechaFin && !excludedSet.has(p.id)).map((p: any) => p.id)
    );
    const allProjectIds = new Set([...visibleProjectIds.filter(id => !excludedSet.has(id)), ...timelineIds]);
    const seen = new Set<string>();
    const result: any[] = [];
    for (const item of todoOrder) {
      if (seen.has(item.id)) continue;
      if (item.type === "project") {
        const p = data.proyectos.find((p: any) => p.id === item.id);
        if (p && !excludedSet.has(p.id)) { seen.add(item.id); result.push({ ...p, _type: "project" as const }); }
      } else {
        const t = data.tareas.find((t: any) => t.id === item.id);
        if (!t || (t as any).proyecto_ids?.length > 0) continue;
        seen.add(item.id); result.push({ ...t, _type: "task" as const });
      }
    }
    for (const p of data.proyectos) {
      if (allProjectIds.has(p.id) && !seen.has(p.id)) {
        seen.add(p.id); result.push({ ...p, _type: "project" as const });
      }
    }
    return result;
  }, [data, todoOrder, visibleProjectIds, excludedProjectIds]);

  const taskDisplayItems = useMemo(() => {
    if (!data) return [] as any[];
    const excludedSet = new Set(excludedProjectIds);
    const timelineIds = data.proyectos
      .filter((p: any) => p.fechaInicio && p.fechaFin && !excludedSet.has(p.id)).map((p: any) => p.id);
    const projSet = new Set([...visibleProjectIds.filter(id => !excludedSet.has(id)), ...timelineIds]);
    const seen = new Set<string>();
    const result: any[] = [];
    for (const id of manualTaskIds) {
      const t = data.tareas.find((t: any) => t.id === id);
      if (t && !seen.has(id)) { seen.add(id); result.push({ ...t, _type: "task" as const, _source: "manual" }); }
    }
    for (const t of data.tareas) {
      const tid = (t as any).id;
      if (!seen.has(tid) && (t as any).proyecto_ids?.some((pid: string) => projSet.has(pid))) {
        seen.add(tid); result.push({ ...t, _type: "task" as const, _source: "project" });
      }
    }
    return result;
  }, [data, visibleProjectIds, manualTaskIds, excludedProjectIds]);

  const projectDisplayItems = useMemo(() => {
    if (!data) return [] as any[];
    const excludedSet = new Set(excludedProjectIds);
    const timelineIds = new Set(data.proyectos.filter((p: any) => p.fechaInicio && p.fechaFin).map((p: any) => p.id));
    const allIds = new Set([...visibleProjectIds, ...timelineIds]);
    for (const id of excludedSet) allIds.delete(id);
    const visible = data.proyectos.filter((p: any) => allIds.has(p.id));
    const incomplete = visible.filter((p: any) => !DONE_STATES.has(p.estadoProyecto));
    const complete   = visible.filter((p: any) =>  DONE_STATES.has(p.estadoProyecto));
    const sortGroup  = (group: any[]) =>
      [...group].sort((a, b) => {
        const ai = projectOrder.indexOf(a.id), bi = projectOrder.indexOf(b.id);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1; if (bi !== -1) return 1; return 0;
      });
    return [...sortGroup(incomplete), ...sortGroup(complete)].map((p: any) => ({
      ...p, _type: "project" as const,
      _isManual: visibleProjectIds.includes(p.id), _isTimeline: timelineIds.has(p.id),
    }));
  }, [data, visibleProjectIds, excludedProjectIds, projectOrder]);

  const displayItems = useMemo(() => {
    if (filterType === "all")  return todoDisplayItems;
    if (filterType === "task") return taskDisplayItems;
    return projectDisplayItems;
  }, [filterType, todoDisplayItems, taskDisplayItems, projectDisplayItems]);

  const projectIds = useMemo(() => projectDisplayItems.map(i => i.id), [projectDisplayItems]);

  const searchResults = useMemo(() => {
    if (!data) return [];
    const q = searchQuery.toLowerCase().trim();
    const tasks = (searchType === "all" || searchType === "task")
      ? data.tareas.filter(t => !q || t.titulo?.toLowerCase().includes(q) || t.contenido?.toLowerCase().includes(q))
          .map((t: any) => ({ ...t, _type: "task" as const }))
      : [];
    const projects = (searchType === "all" || searchType === "project")
      ? data.proyectos.filter(p => !q || p.nombre?.toLowerCase().includes(q) || p.descripcion?.toLowerCase().includes(q))
          .map((p: any) => ({ ...p, _type: "project" as const }))
      : [];
    return [...tasks, ...projects]
      .sort((a, b) => {
        const aDate = new Date((a as any).created || 0).getTime();
        const bDate = new Date((b as any).created || 0).getTime();
        return searchSort === "recent" ? bDate - aDate : aDate - bDate;
      })
      .slice(0, 30);
  }, [data, searchQuery, searchType, searchSort]);

  const focusStats = useMemo(() => {
    if (!data) return {};
    const stats: Record<string, { progress?: number; time?: string }> = {};
    focusPins.forEach(pin => {
      if (pin.type === "project") {
        const projTasks = data.tareas.filter(t => t.proyecto_ids?.includes(pin.id));
        const total = projTasks.length;
        const done = projTasks.filter(t => DONE_STATES.has(t.estado)).length;
        const effortMins = projTasks.reduce((s, t) => s + parseEsfuerzoMins(t.esfuerzo || ""), 0);
        stats[pin.id] = {
          progress: total > 0 ? (done / total) * 100 : 0,
          time: fmtMins(effortMins)
        };
      } else {
        const task = data.tareas.find(t => t.id === pin.id);
        if (task) {
          stats[pin.id] = {
            time: task.esfuerzo || undefined
          };
        }
      }
    });
    return stats;
  }, [data, focusPins]);

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const handleTodoDragStart = (e: DragStartEvent) => setActiveTodoDragId(e.active.id as string);
  const handleTodoDragEnd = (e: DragEndEvent) => {
    setActiveTodoDragId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    
    setTodoOrder(prev => {
      // Re-calculate indices using the freshest possible list (prev)
      const displayIds = prev.map(i => i.id);
      const oldIdx = displayIds.indexOf(active.id as string);
      const newIdx = displayIds.indexOf(over.id as string);
      
      if (oldIdx === -1 || newIdx === -1) return prev;
      
      const next = arrayMove(prev, oldIdx, newIdx);
      localStorage.setItem("progress-todo-order", JSON.stringify(next));
      return next;
    });
  };

  const handleFocusDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    
    setFocusPins(prev => {
      const activeId = active.id.toString();
      const overId = over.id.toString();
      
      const oldIdx = prev.findIndex(p => p.id === activeId);
      const newIdx = prev.findIndex(p => p.id === overId);
      
      if (oldIdx === -1 || newIdx === -1) return prev;
      
      const next = arrayMove(prev, oldIdx, newIdx);
      syncFocusToServer(next);
      return next;
    });
  };

  const handleDragStart = (event: DragStartEvent) => setActiveDragId(event.active.id as string);
  const handleFocusDragOver = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    
    const type = active.data.current?.type;
    if (type !== "focus-pin") return;

    setFocusPins(prev => {
      const activeId = active.id.toString();
      const overId = over.id.toString();
      const oldIdx = prev.findIndex(p => p.id === activeId);
      const newIdx = prev.findIndex(p => p.id === overId);
      if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
        const next = arrayMove(prev, oldIdx, newIdx);
        // Persist immediately for cross-component sync
        syncFocusToServer(next);
        return next;
      }
      return prev;
    });
  };

  const handleDragEnd   = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setProjectOrder(prev => {
        const currentOrder = prev.length > 0 ? prev : projectIds; 
        const aIdx = currentOrder.indexOf(active.id as string);
        const oIdx = currentOrder.indexOf(over.id as string);
        
        if (aIdx === -1 || oIdx === -1) return prev;
        
        const next = arrayMove(currentOrder, aIdx, oIdx);
        localStorage.setItem("project-order", JSON.stringify(next));
        return next;
      });
    }
  };
  // ── Stable refs for handlers to avoid stale closures ──
  const handlersRef = useRef({ handleTodoDragStart, handleTodoDragEnd, handleFocusDragEnd, handleFocusDragOver, handleDragStart, handleDragEnd, focusPins, todoDisplayItems, projectIds });
  useEffect(() => {
    handlersRef.current = { handleTodoDragStart, handleTodoDragEnd, handleFocusDragEnd, handleFocusDragOver, handleDragStart, handleDragEnd, focusPins, todoDisplayItems, projectIds };
  }, [focusPins, todoDisplayItems, projectIds]);

  // ── Listen to global drag events ──
  useEffect(() => {
    const onDragStart = (e: Event) => {
      const ev = (e as CustomEvent).detail;
      const type = ev.active.data.current?.type;
      
      if (type === "focus-pin") setActiveFocusDragId(ev.active.id);
      else if (filterType === "all") handlersRef.current.handleTodoDragStart(ev);
      else if (filterType === "project") handlersRef.current.handleDragStart(ev);
    };
    const onDragOver = (e: Event) => {
      const ev = (e as CustomEvent).detail;
      const type = ev.active.data.current?.type;
      if (type === "focus-pin") handlersRef.current.handleFocusDragOver(ev);
    };
    const onDragEnd = (e: Event) => {
      const ev = (e as CustomEvent).detail;
      const type = ev.active.data.current?.type;
      
      setActiveFocusDragId(null);
      if (type === "focus-pin") {
        handlersRef.current.handleFocusDragEnd(ev);
      } else if (filterType === "all") {
        handlersRef.current.handleTodoDragEnd(ev);
      } else if (filterType === "project") {
        handlersRef.current.handleDragEnd(ev);
      }
    };
    window.addEventListener("global-drag-start", onDragStart);
    window.addEventListener("global-drag-over", onDragOver);
    window.addEventListener("global-drag-end", onDragEnd);
    return () => {
      window.removeEventListener("global-drag-start", onDragStart);
      window.removeEventListener("global-drag-over", onDragOver);
      window.removeEventListener("global-drag-end", onDragEnd);
    };
  }, [filterType]);

  const [isExpanded, setIsExpanded] = useState(false);

  if (!data) return (
    <div className="w-[320px] flex-shrink-0 h-screen border-l border-white/[0.06] flex items-center justify-center">
      <Loader2 className="w-5 h-5 animate-spin text-white/30" />
    </div>
  );

  const pinCount  = focusPins.length;
  const emptySlots = pinCount === 5 ? 0 : pinCount >= 3 ? 1 : 3 - pinCount;

  if (!isExpanded) {
    return (
      <div 
        onClick={() => setIsExpanded(true)}
        className="w-10 flex-shrink-0 h-screen border-l border-white/[0.06] flex flex-col items-center justify-center bg-[#0a0a0c] cursor-pointer hover:bg-white/5 transition-colors group z-50"
      >
        <div className="w-6 h-12 rounded-full border border-white/10 flex items-center justify-center bg-white/5 group-hover:bg-blue-500 group-hover:border-blue-500 transition-colors shadow-lg">
          <ChevronLeft className="w-4 h-4 text-white/40 group-hover:text-white" />
        </div>
        <div className="mt-6 text-[10px] font-black tracking-[0.2em] text-white/20 uppercase" style={{ writingMode: 'vertical-rl' }}>
          Panel de Trabajo
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-row flex-shrink-0 h-screen relative">
      {/* Botón flotante para colapsar (minimizar) */}
      <button 
        onClick={() => setIsExpanded(false)}
        className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-12 rounded-l-xl bg-[#0e0e11] border-y border-l border-white/10 flex items-center justify-center shadow-[-5px_0_15px_rgba(0,0,0,0.5)] hover:bg-white/5 transition-colors z-50 cursor-pointer"
      >
        <ChevronRight className="w-4 h-4 text-white/60 hover:text-white" />
      </button>

      {/* ── Column 1: Main list (always visible) ── */}
      <div className="w-[300px] flex-shrink-0 h-screen flex flex-col border-l border-white/[0.06] overflow-hidden" style={{ background: "#0e0e11" }}>

            {/* ── STICKY HEADER AREA ── */}
            <div className="flex-shrink-0 flex flex-col z-20 shadow-xl" style={{ background: "#0e0e11" }}>
              {/* Filter pills */}
              <div className="px-4 pt-3 pb-3 border-b border-white/[0.06] flex justify-center">
                <div className="flex gap-1 bg-white/5 p-1 rounded-full border border-white/10">
                  {(["all", "task", "project"] as const).map(f => (
                    <button key={f} onClick={() => setFilterType(f)}
                      className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all",
                        filterType === f ? "bg-white text-black" : "text-white/40 hover:text-white/60"
                      )}>
                      {f === "all" ? "Todo" : f === "task" ? "Tareas" : "Proyectos"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Focus section (now sticky) */}
              <div className="px-4 py-3 flex flex-col gap-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-2 px-1">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-[11px] font-black tracking-widest text-white/60 uppercase">FOCUS</span>
                  <span className="text-[10px] font-black text-white/20 ml-auto">{pinCount}/5</span>
                </div>
                <div className="flex flex-col gap-2 max-h-[240px] overflow-y-auto pr-1 custom-scrollbar">
                  <SortableContext items={focusPins.map(p => p.id)} strategy={verticalListSortingStrategy}>
                    <AnimatePresence>
                      {focusPins.map((pin, idx) => {
                        const item = pin.type === "task"
                          ? data.tareas.find((t: any) => t.id === pin.id)
                          : data.proyectos.find((p: any) => p.id === pin.id);
                        if (!item) return null;
                        const title  = pin.type === "task" ? (item as any).titulo : (item as any).nombre;
                        const status = pin.type === "task" ? (item as any).estado : (item as any).estadoProyecto;
                        const stats = focusStats[pin.id] || {};
                        return (
                          <SortableFocusCard key={pin.id} id={pin.id} type={pin.type} title={title} status={status}
                            progress={stats.progress} time={stats.time}
                            onRemove={() => removeFromFocus(pin.id)}
                            onOpen={() => setDetailItem({ type: pin.type, id: pin.id })}
                            onMoveUp={idx > 0 ? () => moveFocusPin(pin.id, "up") : undefined}
                            onMoveDown={idx < focusPins.length - 1 ? () => moveFocusPin(pin.id, "down") : undefined}
                          />
                        );
                      })}
                    </AnimatePresence>
                  </SortableContext>
                  {Array.from({ length: emptySlots }).map((_, i) => (
                    <div key={`empty-${i}`}
                      className="h-9 rounded-xl border-2 border-dashed border-white/[0.06] flex items-center justify-center gap-1.5 text-white/20 text-[10px] font-bold">
                      <Flame className="w-3 h-3" /> Anclar elemento
                    </div>
                  ))}
                </div>
              </div>

              {/* Search and Create Buttons (now sticky) */}
              <div ref={searchRef} className="px-4 py-3 flex flex-col gap-3 border-b border-white/[0.06]">
                <div className="flex gap-2">
                  <button onClick={() => setShowSearch(!showSearch)}
                    className={cn(
                      "flex-1 h-10 rounded-full border flex items-center justify-center gap-2 text-xs font-bold transition-all",
                      showSearch ? "bg-blue-600/20 border-blue-500/40 text-blue-300" : "border-white/10 text-white/30 hover:border-white/20 hover:bg-white/5"
                    )}>
                    <Search className="w-3.5 h-3.5" />
                    {showSearch ? "Cerrar búsqueda" : "Buscar"}
                  </button>
                  {role === "admin" && (
                    <div ref={createRef} className="relative">
                      <button
                        onClick={() => setShowCreateMenu(v => !v)}
                        className={cn(
                          "w-10 h-10 rounded-full border flex items-center justify-center transition-all",
                          showCreateMenu
                            ? "bg-blue-600/20 border-blue-500/40 text-blue-400"
                            : "border-white/10 text-white/30 hover:bg-white/5 hover:text-white"
                        )}>
                        <Plus className="w-4 h-4" />
                      </button>
                      <AnimatePresence>
                        {showCreateMenu && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.92, y: 6 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.92, y: 6 }}
                            transition={{ duration: 0.12 }}
                            className="absolute bottom-full right-0 mb-2 flex flex-col gap-1 bg-[#1a1a1e] border border-white/10 rounded-xl p-1.5 shadow-2xl z-50 min-w-[160px]"
                          >
                            <button
                              onClick={() => { setShowCreateMenu(false); openCreator("task"); }}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-white/60 hover:bg-blue-600/15 hover:text-blue-300 transition-all text-left whitespace-nowrap">
                              <CheckSquare className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                              Crear tarea
                            </button>
                            <button
                              onClick={() => { setShowCreateMenu(false); openCreator("project"); }}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-white/60 hover:bg-purple-600/15 hover:text-purple-300 transition-all text-left whitespace-nowrap">
                              <Layers className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                              Crear proyecto
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {showSearch && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                      <div className="bg-[#1a1a1e] border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                          <input autoFocus type="text" placeholder="Buscar tareas o proyectos..."
                            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-blue-500" />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(["all", "task", "project"] as const).map(t => (
                            <button key={t} onClick={() => setSearchType(t)}
                              className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase border transition-all",
                                searchType === t ? "bg-blue-600 border-blue-500 text-white" : "border-white/10 text-white/30 hover:border-white/20")}>
                              {t === "all" ? "Todos" : t === "task" ? "Tareas" : "Proyectos"}
                            </button>
                          ))}
                          <div className="w-px h-4 bg-white/10 self-center mx-1" />
                          {(["recent", "old"] as const).map(s => (
                            <button key={s} onClick={() => setSearchSort(s)}
                              className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase border transition-all",
                                searchSort === s ? "bg-white/15 border-white/30 text-white" : "border-white/10 text-white/30 hover:border-white/20")}>
                              {s === "recent" ? "Recientes" : "Antiguos"}
                            </button>
                          ))}
                        </div>
                        <div className="flex flex-col gap-1.5 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                          {searchResults.length === 0
                            ? <p className="text-center text-xs text-white/20 italic py-4">
                                {searchQuery ? `Sin resultados para "${searchQuery}"` : "No hay elementos."}
                              </p>
                            : searchResults.map(item => (
                                <SearchResultCard key={item.id} item={item}
                                  onPin={() => { addToProgress(item.id, item._type === "task" ? "task" : "project"); setShowSearch(false); }}
                                  onOpen={() => { setDetailItem({ type: item._type === "task" ? "task" : "project", id: item.id }); setShowSearch(false); }}
                                  clientes={data.clientes || []}
                                />
                              ))
                          }
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ── MAIN SCROLLABLE LIST ── */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 custom-scrollbar">

              {/* ── Items List ── */}
              <div className="flex flex-col gap-2">

                {/* TODO mixed list */}
                {filterType === "all" && (
                  <>
                    <SortableContext items={todoDisplayItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                      {todoDisplayItems.map(item => (
                        <SortableMixedCard key={item.id} item={item} allTasks={data.tareas}
                          onRemove={item._type === "project" ? () => initiateRemoveProject(item.id) : () => removeManualTask(item.id)}
                          onPin={() => toggleFocus(item.id, item._type === "task" ? "task" : "project")}
                          onOpen={() => setDetailItem({ type: item._type === "task" ? "task" : "project", id: item.id })}
                          clientes={data.clientes || []}
                          isPinned={focusPins.some(p => p.id === item.id)}
                        />
                      ))}
                      {todoDisplayItems.length === 0 && (
                        <div className="h-40 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-white/5 rounded-[2rem] text-xs text-white/20 italic p-6 text-center">
                          <Plus className="w-5 h-5 opacity-50" />
                          <span>Usa <strong className="font-black not-italic text-white/30">Buscar</strong> para agregar elementos.</span>
                        </div>
                      )}
                    </SortableContext>
                  </>
                )}

                {/* TASKS only */}
                {filterType === "task" && (
                  <>
                    {displayItems.map(item => (
                      <SlimTaskCard key={item.id} task={item}
                        onPin={() => toggleFocus(item.id, "task")}
                        onOpen={() => setDetailItem({ type: "task", id: item.id })}
                        onRemove={item._source === "manual" ? () => removeManualTask(item.id) : undefined}
                        isFromProject={item._source === "project"}
                        isPinned={focusPins.some(p => p.id === item.id)}
                        clientes={data.clientes || []}
                      />
                    ))}
                    {displayItems.length === 0 && (
                      <div className="h-40 flex items-center justify-center border-2 border-dashed border-white/5 rounded-[2rem] text-xs text-white/20 italic">
                        Sin tareas disponibles.
                      </div>
                    )}
                  </>
                )}

                {/* PROJECTS only (sortable) */}
                {filterType === "project" && (
                  <>
                    <SortableContext items={projectIds} strategy={verticalListSortingStrategy}>
                      {displayItems.map(item => (
                        <SortableProjectCard key={item.id} project={item} allTasks={data.tareas}
                          onPin={() => toggleFocus(item.id, "project")}
                          onOpen={() => setDetailItem({ type: "project", id: item.id })}
                          onRemove={() => initiateRemoveProject(item.id)}
                          isPinned={focusPins.some(p => p.id === item.id)}
                          clientes={data.clientes || []}
                        />
                      ))}
                      {displayItems.length === 0 && (
                        <div className="h-40 flex items-center justify-center border-2 border-dashed border-white/5 rounded-[2rem] text-xs text-white/20 italic">
                          Sin proyectos para mostrar.
                        </div>
                      )}
                    </SortableContext>
                  </>
                )}
              </div>

              <div className="h-6 flex-shrink-0" />
            </div>{/* end scrollable body */}
        </div>{/* end Column 1 */}

      {/* Drag Overlay for smooth sorting feedback */}
      <DragOverlay dropAnimation={null}>
        {activeFocusDragId && (() => {
          const pin = focusPins.find(p => p.id === activeFocusDragId);
          if (!pin) return null;
          const item = pin.type === "task"
            ? data.tareas.find((t: any) => t.id === pin.id)
            : data.proyectos.find((p: any) => p.id === pin.id);
          if (!item) return null;
          const title = pin.type === "task" ? (item as any).titulo : (item as any).nombre;
          const status = pin.type === "task" ? (item as any).estado : (item as any).estadoProyecto;
          const stats = focusStats[pin.id] || {};
          return (
            <div className="w-[260px] opacity-90 shadow-2xl">
              <FocusCardUI id={pin.id} type={pin.type} title={title} status={status} 
                progress={stats.progress} time={stats.time}
                onRemove={() => {}} onOpen={() => {}} />
            </div>
          );
        })()}
      </DragOverlay>

      {/* ── Column 2: Detail pane (slides in) ── */}
      <AnimatePresence>
        {detailItem && (
          <motion.div
            key={`detail-${detailItem.id}`}
            className="flex-shrink-0 h-screen overflow-hidden border-l border-white/[0.06]"
            style={{ background: "#0e0e11" }}
            initial={{ width: 0 }}
            animate={{ width: 300 }}
            exit={{ width: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="w-[300px] h-full flex flex-col">
              <DetailPane
                type={detailItem.type}
                id={detailItem.id}
                data={data}
                onBack={() => setDetailItem(null)}
                onTaskSelect={(taskId) => { setSubDetailId(taskId); setNewTaskProjectId(null); }}
                onNewTask={() => { setSubDetailId(null); setNewTaskProjectId(detailItem.id); }}
                activeSubTaskId={subDetailId}
                isNewTaskOpen={newTaskProjectId !== null}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Column 3: Sub-task detail (slides in for project → task drill-down) ── */}
      <AnimatePresence>
        {detailItem?.type === "project" && subDetailId && (() => {
          const st   = data.tareas.find((t: any) => t.id === subDetailId);
          const proj = data.proyectos.find((p: any) => p.id === detailItem.id);
          if (!st) return null;
          return (
            <motion.div
              key={`subtask-${subDetailId}`}
              className="flex-shrink-0 h-screen overflow-hidden border-l border-white/[0.06]"
              style={{ background: "#0e0e11" }}
              initial={{ width: 0 }}
              animate={{ width: 300 }}
              exit={{ width: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="w-[300px] h-full flex flex-col">
                <SubTaskDetail
                  task={st}
                  projectName={proj?.nombre || "Proyecto"}
                  data={data}
                  onBack={() => setSubDetailId(null)}
                />
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── Column 4: New task creation pane (slides in from project detail) ── */}
      <AnimatePresence>
        {detailItem?.type === "project" && newTaskProjectId && (() => {
          const proj   = data.proyectos.find((p: any) => p.id === newTaskProjectId);
          const client = data.clientes?.find((c: any) => c.id === proj?.cliente_ids?.[0]);
          return (
            <motion.div
              key="new-task-col"
              className="flex-shrink-0 h-screen overflow-hidden border-l border-white/[0.06]"
              style={{ background: "#0e0e11" }}
              initial={{ width: 0 }} animate={{ width: 300 }} exit={{ width: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="w-[300px] h-full flex flex-col">
                <NewTaskPane
                  projectId={newTaskProjectId}
                  projectName={proj?.nombre || "Proyecto"}
                  clienteIds={proj?.cliente_ids || []}
                  clienteName={client?.nombre || ""}
                  trabajadores={data.trabajadores || []}
                  onBack={() => setNewTaskProjectId(null)}
                />
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── Remove Project Confirmation Dialog ── */}
      <AnimatePresence>
        {removeConfirm && (() => {
          const proj = data?.proyectos.find((p: any) => p.id === removeConfirm);
          if (!proj) return null;
          const projTaskCount = data?.tareas.filter((t: any) => (t as any).proyecto_ids?.includes(removeConfirm)).length || 0;
          return (
            <motion.div key="remove-confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center p-4"
              style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
              onClick={() => setRemoveConfirm(null)}>
              <motion.div initial={{ scale: 0.92, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 10 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                className="bg-[#1a1a1e] border border-white/15 rounded-2xl p-6 shadow-2xl w-full max-w-sm"
                onClick={e => e.stopPropagation()}>
                <div className="flex items-start gap-3 mb-4">
                  <FolderOpen className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-black text-white leading-snug">{(proj as any).nombre}</p>
                    <p className="text-xs text-white/40 mt-1">
                      {projTaskCount} tarea{projTaskCount !== 1 ? "s" : ""} vinculadas.
                    </p>
                  </div>
                </div>
                <p className="text-xs text-white/50 mb-5">
                  Se ocultará del <strong className="text-white/70">Timeline</strong>.{" "}
                  ¿Ocultar también sus tareas?
                </p>
                <div className="flex flex-col gap-2">
                  <button onClick={() => confirmRemoveProject(removeConfirm, true)}
                    className="w-full py-2.5 px-4 bg-red-500/15 border border-red-500/25 text-red-400 text-xs font-black rounded-xl hover:bg-red-500/25 transition-all text-left flex items-center gap-2">
                    <X className="w-3.5 h-3.5" /> Quitar proyecto y ocultar sus tareas
                  </button>
                  <button onClick={() => confirmRemoveProject(removeConfirm, false)}
                    className="w-full py-2.5 px-4 bg-white/5 border border-white/10 text-white/60 text-xs font-black rounded-xl hover:bg-white/10 transition-all text-left flex items-center gap-2">
                    <X className="w-3.5 h-3.5" /> Quitar solo el proyecto
                  </button>
                  <button onClick={() => setRemoveConfirm(null)}
                    className="w-full py-2 px-4 text-white/20 text-xs font-bold hover:text-white/40 transition-all">
                    Cancelar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

// ── Focus Card ────────────────────────────────────────────────────────────────
// ── Focus Card Components ───────────────────────────────────────────────────

function FocusCardUI({ 
  type, title, status, progress, time, onRemove, onOpen, onMoveUp, onMoveDown, 
  isDragging, dragAttributes, dragListeners, nodeRef, style 
}: any) {
  const color = statusColor(status);
  
  return (
    <div ref={nodeRef} style={style}
      className={cn(
        "flex flex-col gap-1.5 p-3 bg-[#1c1c21] border border-white/[0.06] rounded-xl group hover:bg-[#252528] transition-colors cursor-grab active:cursor-grabbing",
        isDragging ? "border-blue-500/50 bg-blue-500/10 opacity-60" : "opacity-100"
      )}
      onClick={onOpen}
      {...dragAttributes}
      {...dragListeners}
    >
      <div className="flex items-center gap-2.5">
        <div className="text-white/10 group-hover:text-white/30 transition-colors flex-shrink-0">
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        {type === "task"
          ? <CheckSquare className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          : <FolderOpen className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
        }
        <span className="flex-1 text-xs font-bold text-white/80 truncate min-w-0">{title}</span>
        
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
          {onMoveUp && (
            <button onClick={e => { e.stopPropagation(); onMoveUp(); }}
              className="w-5 h-5 rounded-md hover:bg-white/10 flex items-center justify-center transition-all">
              <ChevronUp className="w-3 h-3 text-white/40 hover:text-white" />
            </button>
          )}
          {onMoveDown && (
            <button onClick={e => { e.stopPropagation(); onMoveDown(); }}
              className="w-5 h-5 rounded-md hover:bg-white/10 flex items-center justify-center transition-all">
              <ChevronDown className="w-3 h-3 text-white/40 hover:text-white" />
            </button>
          )}
          <button onClick={e => { e.stopPropagation(); onRemove(); }}
            className="w-5 h-5 rounded-full hover:bg-red-500/20 flex items-center justify-center transition-all">
            <X className="w-3 h-3 text-white/50 hover:text-red-400" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2 flex-1">
          {progress !== undefined && (
            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all duration-500", progress === 100 ? "bg-green-500" : "bg-blue-500")}
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          {progress !== undefined && (
            <span className="text-[9px] font-black text-white/30">{Math.round(progress)}%</span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {time && (
            <span className="flex items-center gap-1 text-[9px] font-bold text-white/30">
              <Clock className="w-2.5 h-2.5" />
              {time}
            </span>
          )}
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md flex-shrink-0" style={{ background: `${color}20`, color }}>{status}</span>
        </div>
      </div>
    </div>
  );
}

function SortableFocusCard(props: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.id,
    data: { type: "focus-pin" }
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <FocusCardUI 
      {...props} 
      nodeRef={setNodeRef} 
      style={style} 
      isDragging={isDragging}
      dragAttributes={attributes}
      dragListeners={listeners}
    />
  );
}

// ── Search Result Card ────────────────────────────────────────────────────────
function SearchResultCard({ item, onPin, onOpen, clientes }: any) {
  const isTask  = item._type === "task";
  const cliente = clientes.find((c: any) => c.id === item.cliente_ids?.[0]);
  return (
    <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/[0.08] transition-all group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={cn("text-[8px] font-black uppercase px-1.5 py-0.5 rounded",
            isTask ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400")}>
            {isTask ? "Tarea" : "Proyecto"}
          </span>
          {cliente && <span className="text-[9px] text-white/30 truncate">{cliente.nombre}</span>}
        </div>
        <p className="text-xs font-bold text-white/80 truncate">{isTask ? item.titulo : item.nombre}</p>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <button onClick={onPin} className="w-6 h-6 rounded-full bg-white/5 hover:bg-blue-500/20 flex items-center justify-center transition-all" title="Agregar">
          <Plus className="w-3 h-3 text-white/50 hover:text-blue-400 transition-colors" />
        </button>
        <button onClick={onOpen} className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/20 flex items-center justify-center transition-all">
          <ArrowUpRight className="w-3 h-3 text-white/50" />
        </button>
      </div>
    </div>
  );
}

// ── Slim Task Card ────────────────────────────────────────────────────────────
function SlimTaskCard({ task, onPin, onOpen, onRemove, isFromProject, isPinned, clientes, nodeRef, dragStyle, dragListeners, dragAttributes }: any) {
  const color = statusColor(task.estado || "");
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await createTask.mutateAsync({
      titulo: `${task.titulo} (Copia)`,
      estado: task.estado,
      prioridad: task.prioridad,
      formato: task.formato,
      esfuerzo: task.esfuerzo,
      proyecto_ids: task.proyecto_ids,
      cliente_ids: task.cliente_ids,
      fechaProg: task.fechaProg,
      fechaEntrega: task.fechaEntrega
    });
  };

  const handleUnlink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("¿Estás seguro de que quieres quitar esta tarea de su proyecto y cliente actual?")) {
      return;
    }
    await updateTask.mutateAsync({
      id: task.id,
      proyecto_ids: [],
      cliente_ids: []
    } as any);
  };

  return (
    <motion.div ref={nodeRef} style={dragStyle} {...(dragAttributes || {})}
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
      className="bg-[#1c1c21] border border-white/[0.06] rounded-xl overflow-hidden cursor-pointer group"
      onClick={onOpen}>
      {/* Header: drag + icon + title */}
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1 group-hover:bg-white/[0.03] transition-colors">
        {dragListeners && (
          <div {...dragListeners} onClick={e => e.stopPropagation()} className="flex-shrink-0 cursor-grab active:cursor-grabbing">
            <GripVertical className="w-3.5 h-3.5 text-white/20" />
          </div>
        )}
        <CheckSquare className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
        {isFromProject && <FolderOpen className="w-3 h-3 text-purple-400/40 flex-shrink-0" />}
        <span className="flex-1 text-xs font-bold text-white/80 leading-snug min-w-0 break-words">{task.titulo || "Sin título"}</span>
      </div>
      {/* Action strip */}
      <div className="flex items-center gap-1 px-3 pb-2.5" onClick={e => e.stopPropagation()}>
        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md mr-auto flex-shrink-0" style={{ background: `${color}20`, color }}>
          {task.estado || "—"}
        </span>
        <button onClick={e => { e.stopPropagation(); onPin(); }}
          className={cn("w-6 h-6 rounded-full flex items-center justify-center transition-all",
            isPinned ? "text-orange-400 bg-orange-500/10" : "text-white/20 hover:text-orange-400 hover:bg-orange-500/10")} title="Fijar en Focus">
          <Flame className={cn("w-3 h-3", isPinned && "fill-orange-400")} />
        </button>
        <button onClick={handleDuplicate} title="Duplicar tarea"
          className="w-6 h-6 rounded-full flex items-center justify-center text-white/20 hover:text-white hover:bg-white/10 transition-all">
          <Copy className="w-3 h-3" />
        </button>
        <button onClick={handleUnlink} title="Quitar la vinculación con el proyecto y cliente"
          className="w-6 h-6 rounded-full flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all">
          <Unlink className="w-3 h-3" />
        </button>
        {onRemove && (
          <button onClick={e => { e.stopPropagation(); onRemove(); }}
            className="w-6 h-6 rounded-full flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ── Sortable Mixed Card ───────────────────────────────────────────────────────
function SortableMixedCard({ item, allTasks, onRemove, onPin, onOpen, clientes, isPinned }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const dragStyle = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 };
  if (item._type === "task") {
    return <SlimTaskCard task={item} onPin={onPin} onOpen={onOpen} onRemove={onRemove} isPinned={isPinned}
      clientes={clientes} nodeRef={setNodeRef} dragStyle={dragStyle} dragListeners={listeners} dragAttributes={attributes} />;
  }
  return <ProjectCard project={item} allTasks={allTasks} onPin={onPin} onOpen={onOpen} onRemove={onRemove}
    isPinned={isPinned} clientes={clientes} nodeRef={setNodeRef} dragStyle={dragStyle} dragListeners={listeners} dragAttributes={attributes} />;
}

// ── Sortable Project Card ─────────────────────────────────────────────────────
function SortableProjectCard(props: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.project.id });
  return <ProjectCard {...props} nodeRef={setNodeRef}
    dragStyle={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }}
    dragListeners={listeners} dragAttributes={attributes} />;
}

// ── Project Card ──────────────────────────────────────────────────────────────
function ProjectCard({ project, allTasks, onPin, onOpen, onRemove, isPinned, clientes, nodeRef, dragStyle, dragListeners, dragAttributes }: any) {
  const updateTask = useUpdateTask();
  const [locallyDone, setLocallyDone]   = useState<Set<string>>(new Set());
  const [pendingCheck, setPendingCheck] = useState<string | null>(null);

  const projBareId   = (project?.id || "").replace(/-/g, "");
  const projectTasks = (allTasks || []).filter((t: any) =>
    (t.proyecto_ids || []).some((pid: string) => pid.replace(/-/g, "") === projBareId));
  const totalTasks   = projectTasks.length;
  const doneTasks    = projectTasks.filter((t: any) => DONE_STATES.has(t.estado) || locallyDone.has(t.id)).length;
  const pendingTasks = projectTasks.filter((t: any) => !DONE_STATES.has(t.estado) && !locallyDone.has(t.id));
  const checklistItems  = pendingTasks.slice(0, 4);
  const progressPercent = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;
  const isDone          = project ? DONE_STATES.has(project.estadoProyecto) : false;
  const showChecklist   = checklistItems.length > 0 || totalTasks === 0;

  const handleCheckTask = (taskId: string) => setPendingCheck(taskId);

  const confirmCheckTask = async (taskId: string) => {
    setPendingCheck(null);
    setLocallyDone(prev => new Set([...prev, taskId]));
    try { await updateTask.mutateAsync({ id: taskId, estado: "Hecho" }); }
    catch { setLocallyDone(prev => { const n = new Set(prev); n.delete(taskId); return n; }); }
  };

  if (!project) return null;

  return (
    <motion.div ref={nodeRef} style={dragStyle} {...(dragAttributes || {})}
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
      className={cn("bg-[#1c1c21] border border-white/[0.06] rounded-2xl overflow-hidden cursor-pointer group",
        isDone && "border-green-500/[0.15]")}
      onClick={onOpen}>

      {/* Header: drag + icon + title */}
      <div className="flex items-center gap-2 px-3 py-2.5 group-hover:bg-white/[0.03] transition-colors">
        <div {...(dragListeners || {})} onClick={e => e.stopPropagation()} className="flex-shrink-0 cursor-grab active:cursor-grabbing">
          <GripVertical className="w-3.5 h-3.5 text-white/20" />
        </div>
        <FolderOpen className={cn("w-4 h-4 flex-shrink-0", isDone ? "text-green-400" : "text-purple-400")} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-1.5 flex-wrap">
            <span className="text-sm font-black text-white leading-snug break-words min-w-0">{project.nombre || "Sin nombre"}</span>
            {isDone && <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 flex-shrink-0 mt-0.5">Listo</span>}
          </div>
          {totalTasks > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full", progressPercent === 100 ? "bg-green-500" : "bg-gradient-to-r from-[#3a7bd5] to-[#0a84ff]")}
                  style={{ width: `${progressPercent}%` }} />
              </div>
              <span className="text-[9px] text-white/30 flex-shrink-0">{doneTasks}/{totalTasks}</span>
            </div>
          )}
        </div>
      </div>
      {/* Action strip */}
      <div className="flex items-center gap-1 px-3 pb-2.5" onClick={e => e.stopPropagation()}>
        <button onClick={e => { e.stopPropagation(); onPin(); }}
          className={cn("w-6 h-6 rounded-full flex items-center justify-center transition-all",
            isPinned ? "text-orange-400 bg-orange-500/10" : "text-white/20 hover:text-orange-400 hover:bg-orange-500/10")}>
          <Flame className={cn("w-3 h-3", isPinned && "fill-orange-400")} />
        </button>
        {onRemove && (
          <button onClick={e => { e.stopPropagation(); onRemove(); }}
            className="w-6 h-6 rounded-full flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Checklist */}
      {showChecklist && (
        <div onClick={e => e.stopPropagation()}>
          <div className="h-px bg-white/5 mx-3" />
          <div className="px-3 pb-2.5 pt-2 flex flex-col gap-1.5">
            {checklistItems.map((t: any) => {
              const isDone    = locallyDone.has(t.id);
              const isPending = pendingCheck === t.id && !isDone;
              return (
                <div key={t.id} className="flex items-center gap-2 min-w-0">
                  <button onClick={() => handleCheckTask(t.id)}
                    className={cn("w-4 h-4 rounded border flex items-center justify-center transition-all flex-shrink-0",
                      isDone    ? "bg-green-500 border-green-500"
                      : isPending ? "bg-cyan-500/20 border-cyan-400"
                      : "border-white/20 hover:border-white/50")}>
                    {isDone    && <Check className="w-2.5 h-2.5 text-white" />}
                    {isPending && <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
                  </button>
                  <span className={cn("text-[11px] leading-tight flex-1 min-w-0 break-words",
                    isDone    ? "text-white/20 line-through"
                    : isPending ? "text-cyan-300/80"
                    : "text-white/60")}>
                    {t.titulo || "Sin título"}
                  </span>
                </div>
              );
            })}
            {pendingTasks.length === 0 && totalTasks > 0 && <span className="text-green-400 text-[10px] italic">✓ Todo completado</span>}
            {totalTasks === 0 && <span className="text-white/20 text-[10px] italic">Sin tareas asignadas</span>}
          </div>
        </div>
      )}

      {/* Task confirm bar */}
      <AnimatePresence>
        {pendingCheck && (() => {
          const t = checklistItems.find((t: any) => t.id === pendingCheck);
          return (
            <motion.div key="confirm-bar" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-2 px-3 py-2 border-t border-[#00f2ff]/15"
              style={{ background: "linear-gradient(90deg, rgba(0,242,255,0.07), rgba(10,132,255,0.10))" }}
              onClick={e => e.stopPropagation()}>
              <span className="flex-1 text-[10px] font-bold truncate" style={{ color: "#00d4ff" }}>{t?.titulo || "¿Marcar como hecho?"}</span>
              <button onClick={() => setPendingCheck(null)}
                className="px-2 py-1 rounded-lg bg-white/5 text-[10px] font-bold text-white/40 hover:bg-white/10 flex-shrink-0">Cancelar</button>
              <button onClick={() => confirmCheckTask(pendingCheck)}
                className="px-2 py-1 rounded-lg text-[10px] font-black text-white flex-shrink-0"
                style={{ background: "linear-gradient(90deg, #00c6ff, #0a84ff)" }}>✓ Confirmar</button>
            </motion.div>
          );
        })()}
      </AnimatePresence>

    </motion.div>
  );
}

// ── Time helpers ──────────────────────────────────────────────────────────────
function parseEsfuerzoMins(esfuerzo: string): number {
  if (!esfuerzo) return 0;
  const s = esfuerzo.toLowerCase();
  const h = s.match(/(\d+)\s*h/);
  const m = s.match(/(\d+)\s*min/);
  let t = 0;
  if (h) t += parseInt(h[1]) * 60;
  if (m) t += parseInt(m[1]);
  if (t) return t;
  if (s.includes("flash"))                               return 15;
  if (s.includes("rápido") || s.includes("rapido"))     return 30;
  if (s.includes("muy largo") || s.includes("xl"))      return 240;
  if (s.includes("largo"))                              return 120;
  if (s.includes("medio") || s.includes("normal"))     return 60;
  return 0;
}
function fmtMins(mins: number): string {
  if (!mins) return "—";
  const h = Math.floor(mins / 60), m = mins % 60;
  return h > 0 ? `${h}h${m ? ` ${m}min` : ""}` : `${m}min`;
}

// ── Detail Pane ────────────────────────────────────────────────────────────────
function DetailPane({ type, id, data, onBack, onTaskSelect, onNewTask, activeSubTaskId, isNewTaskOpen }: {
  type: "task" | "project";
  id: string;
  data: any;
  onBack: () => void;
  onTaskSelect: (taskId: string) => void;
  onNewTask: () => void;
  activeSubTaskId?: string | null;
  isNewTaskOpen?: boolean;
}) {
  const updateTask    = useUpdateTask();
  const updateProject = useUpdateProject();
  const createTask    = useCreateTask();

  const [draft, setDraft]       = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [locallyDone, setLocallyDone] = useState<Set<string>>(new Set());

  const isTask = type === "task";
  // Normalize IDs to bare hex (no dashes) for reliable comparison —
  // Notion sometimes returns relation IDs without dashes while top-level
  // page IDs come with dashes, causing includes() to silently miss matches.
  const bareId = id.replace(/-/g, "");
  const bareIds = (ids: string[] | undefined) =>
    (ids || []).map((x: string) => x.replace(/-/g, ""));

  const item   = isTask
    ? data.tareas.find((t: any) => t.id.replace(/-/g, "") === bareId)
    : data.proyectos.find((p: any) => p.id.replace(/-/g, "") === bareId);

  const projectTasks = isTask
    ? []
    : (data.tareas || []).filter((t: any) => bareIds(t.proyecto_ids).includes(bareId));
  const doneTasks    = projectTasks.filter((t: any) => DONE_STATES.has(t.estado) || locallyDone.has(t.id));
  const pendingTasks = projectTasks.filter((t: any) => !DONE_STATES.has(t.estado) && !locallyDone.has(t.id));
  const progressPct  = projectTasks.length > 0 ? (doneTasks.length / projectTasks.length) * 100 : 0;
  const pendingMins  = pendingTasks.reduce((s: number, t: any) => s + parseEsfuerzoMins(t.esfuerzo || ""), 0);

  const linkedProjects = isTask
    ? (data.proyectos || []).filter((p: any) =>
        bareIds((item as any)?.proyecto_ids).includes(p.id.replace(/-/g, "")))
    : [];

  const clientId = (item as any)?.cliente_ids?.[0];
  const client   = data.clientes?.find((c: any) => c.id === clientId);
  const title    = isTask ? (item as any)?.titulo : (item as any)?.nombre;
  const status   = isTask ? (item as any)?.estado : (item as any)?.estadoProyecto;
  const col      = statusColor(status || "");

  const base = isTask
    ? { titulo: (item as any)?.titulo || "",
        estado: (item as any)?.estado || "", prioridad: (item as any)?.prioridad || "Media",
        formato: (item as any)?.formato || "", esfuerzo: (item as any)?.esfuerzo || "",
        fechaProg: (item as any)?.fechaProg || "", fechaEntrega: (item as any)?.fechaEntrega || "",
        contenido: (item as any)?.contenido || "",
        asignado_ids: (item as any)?.asignado_ids || [] }
    : { nombre: (item as any)?.nombre || "",
        estadoProyecto: (item as any)?.estadoProyecto || "", prioridad: (item as any)?.prioridad || "MODERADO",
        fechaInicio: (item as any)?.fechaInicio || "", fechaFin: (item as any)?.fechaFin || "",
        descripcion: (item as any)?.descripcion || "",
        cliente_ids: (item as any)?.cliente_ids || [] };
  const current = draft || base;

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto';
      titleRef.current.style.height = titleRef.current.scrollHeight + 'px';
    }
  }, [current.titulo, current.nombre]);

  useEffect(() => {
    if (descRef.current) {
      descRef.current.style.height = 'auto';
      descRef.current.style.height = descRef.current.scrollHeight + 'px';
    }
  }, [current.contenido, current.descripcion]);

  const handleEdit = (field: string, val: string) =>
    setDraft((prev: any) => ({ ...(prev || base), [field]: val }));

  const handleSave = async () => {
    if (!draft || isSaving) return;
    setIsSaving(true);
    try {
      if (isTask) {
        await updateTask.mutateAsync({ id, ...draft });
      } else {
        await updateProject.mutateAsync({ id, ...draft });
      }
      setDraft(null);
    } catch { /* noop */ } finally { setIsSaving(false); }
  };

  const handleDuplicateSubtask = async (e: React.MouseEvent, t: any) => {
    e.stopPropagation();
    await createTask.mutateAsync({
      titulo: `${t.titulo} (Copia)`,
      estado: t.estado,
      prioridad: t.prioridad,
      formato: t.formato,
      esfuerzo: t.esfuerzo,
      proyecto_ids: t.proyecto_ids,
      cliente_ids: t.cliente_ids,
      fechaProg: t.fechaProg,
      fechaEntrega: t.fechaEntrega
    });
  };

  const handleUnlinkSubtask = async (e: React.MouseEvent, t: any) => {
    e.stopPropagation();
    if (!window.confirm("¿Estás seguro de que quieres quitar esta tarea del proyecto?\n\n(Esto solo la desvinculará, no la eliminará permanentemente de tu Notion.)")) {
      return;
    }
    await updateTask.mutateAsync({
      id: t.id,
      proyecto_ids: [],
      cliente_ids: []
    } as any);
  };


  if (!item) return (
    <div className="flex-1 flex items-center justify-center text-white/20 text-xs">
      Elemento no encontrado.
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* ── Back header ── */}
      <div className="flex-shrink-0 flex items-center gap-2 px-3 pt-3 pb-3 border-b border-white/[0.06]" style={{ background: "#0e0e11" }}>
        <button onClick={onBack}
          className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all flex-shrink-0">
          <ChevronLeft className="w-4 h-4 text-white/60" />
        </button>
        <span className={cn("text-[8px] font-black uppercase px-2 py-1 rounded-full flex-shrink-0",
          isTask ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400")}>
          {isTask ? "Tarea" : "Proyecto"}
        </span>
        <span className="text-[9px] font-black px-2 py-0.5 rounded-md flex-shrink-0"
          style={{ background: `${col}20`, color: col }}>
          {status || "—"}
        </span>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4" style={{ scrollbarWidth: "thin" }}>

        {/* Title (Editable & Centered) */}
        <div className="flex flex-col items-center">
          <textarea
            ref={titleRef}
            value={isTask ? current.titulo : current.nombre}
            onChange={e => handleEdit(isTask ? "titulo" : "nombre", e.target.value)}
            rows={1}
            placeholder={isTask ? "Título de la tarea" : "Nombre del proyecto"}
            className="w-full bg-transparent text-base font-black text-white text-center leading-tight break-words border-none outline-none resize-none focus:ring-0 p-0 placeholder-white/20 hover:bg-white/[0.03] rounded transition-colors overflow-hidden"
            onInput={(e: any) => {
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
          />
        </div>

        {/* Description (Editable & Centered) */}
        <div className="flex flex-col items-center px-2">
          <textarea
            ref={descRef}
            value={isTask ? current.contenido : current.descripcion}
            onChange={e => handleEdit(isTask ? "contenido" : "descripcion", e.target.value)}
            rows={1}
            placeholder={isTask ? "Escribe una descripción…" : "Sin descripción…"}
            className="w-full bg-transparent text-[11px] text-white/50 text-center leading-relaxed break-words border-none outline-none resize-none focus:ring-0 p-0 placeholder-white/10 hover:bg-white/[0.03] rounded transition-colors italic overflow-hidden"
            onInput={(e: any) => {
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
          />
        </div>

        {/* Client row */}
        {!isTask ? (
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-white/20 uppercase">Cliente</label>
            <select
              value={current.cliente_ids?.[0] || ""}
              onChange={e => handleEdit("cliente_ids", [e.target.value] as any)}
              className="w-full bg-white/5 border border-white/5 text-[11px] font-bold px-2 py-1.5 rounded-lg focus:outline-none appearance-none text-white/70">
              <option value="" className="bg-[#111]">Sin cliente</option>
              {(data.clientes || []).map((c: any) => (
                <option key={c.id} value={c.id} className="bg-[#111]">{c.nombre}</option>
              ))}
            </select>
          </div>
        ) : client && (
          <div className="flex items-center justify-center gap-2">
            <div className="w-6 h-6 rounded-full bg-purple-500/15 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-black text-purple-400">{client.nombre?.[0]?.toUpperCase()}</span>
            </div>
            <span className="text-xs font-bold text-white/40">{client.nombre}</span>
          </div>
        )}

        {isTask && (
          <div className="flex flex-col gap-2">
            <label className="text-[9px] font-black text-white/20 uppercase">Asignado a</label>
            <div className="flex flex-wrap gap-2">
              {(data.trabajadores || []).map((w: any) => {
                const isSelected = (current.asignado_ids || []).includes(w.id);
                return (
                  <button
                    key={w.id}
                    onClick={() => {
                      const next = isSelected 
                        ? current.asignado_ids.filter((id: string) => id !== w.id)
                        : [...(current.asignado_ids || []), w.id];
                      handleEdit("asignado_ids", next);
                    }}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-xl border transition-all",
                      isSelected 
                        ? "bg-blue-500/20 border-blue-500/40 text-blue-300" 
                        : "bg-white/5 border-transparent text-white/30 hover:bg-white/10"
                    )}
                  >
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[8px] font-black">
                      {w.nombre?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-[10px] font-bold">{w.nombre}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Project progress + time */}
        {!isTask && projectTasks.length > 0 && (
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Progreso</span>
              <span className="text-[10px] text-white/40">{doneTasks.length}/{projectTasks.length} tareas</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500",
                  progressPct === 100 ? "bg-green-500" : "bg-gradient-to-r from-[#3a7bd5] to-[#0a84ff]")}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {pendingMins > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                <Clock className="w-3 h-3 text-blue-400/60" />
                <span><span className="font-black text-white/60">{fmtMins(pendingMins)}</span> estimado restante</span>
              </div>
            )}
          </div>
        )}

        {/* Linked projects (tasks only) */}
        {isTask && linkedProjects.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-black text-white/20 uppercase">Proyectos vinculados</span>
            <div className="flex flex-wrap gap-1.5">
              {linkedProjects.map((p: any) => (
                <span key={p.id} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  {p.nombre}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Status + Priority */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-white/20 uppercase">Estado</label>
            <select
              value={isTask ? current.estado : current.estadoProyecto}
              onChange={e => handleEdit(isTask ? "estado" : "estadoProyecto", e.target.value)}
              className="w-full bg-white/5 border border-white/5 text-[11px] font-bold px-2 py-1.5 rounded-lg focus:outline-none appearance-none"
              style={{ color: statusColor(isTask ? current.estado : current.estadoProyecto) }}>
              {(isTask ? TASK_ESTADO_OPTS : PROJ_STATUS_OPTS).map(o =>
                <option key={o} value={o} className="bg-[#111]">{o}</option>
              )}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-white/20 uppercase">Prioridad</label>
            <select
              value={current.prioridad}
              onChange={e => handleEdit("prioridad", e.target.value)}
              className="w-full bg-white/5 border border-white/5 text-[11px] font-bold px-2 py-1.5 rounded-lg focus:outline-none appearance-none"
              style={{ color: PRIORITY_COLORS[current.prioridad] || "inherit" }}>
              {(isTask ? TASK_PRIO_OPTS : PROJ_PRIO_OPTS).map(o =>
                <option key={o} value={o} className="bg-[#111]">{o}</option>
              )}
            </select>
          </div>
        </div>

        {/* Task: formato + esfuerzo */}
        {isTask && (
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black text-white/20 uppercase">Formato</label>
              <select value={current.formato} onChange={e => handleEdit("formato", e.target.value)}
                className="w-full bg-white/5 border border-white/5 text-[11px] font-bold px-2 py-1.5 rounded-lg focus:outline-none appearance-none text-white/70">
                <option value="" className="bg-[#111]">Sin formato</option>
                {FORMATOS.map(o => <option key={o} value={o} className="bg-[#111]">{o}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black text-white/20 uppercase flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />Esfuerzo
              </label>
              <select value={current.esfuerzo} onChange={e => handleEdit("esfuerzo", e.target.value)}
                className="w-full bg-white/5 border border-white/5 text-[11px] font-bold px-2 py-1.5 rounded-lg focus:outline-none appearance-none text-white/60">
                <option value="" className="bg-[#111]">Sin estimado</option>
                {ESFUERZOS.map(o => <option key={o} value={o} className="bg-[#111]">{o}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-white/20 uppercase">
              {isTask ? "Fecha Prog" : "Inicio"}
            </label>
            <input type="date"
              value={isTask ? current.fechaProg : current.fechaInicio}
              onChange={e => handleEdit(isTask ? "fechaProg" : "fechaInicio", e.target.value)}
              className="w-full bg-white/5 border border-white/5 text-[11px] font-bold px-2 py-1.5 rounded-lg focus:outline-none text-white/70"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-white/20 uppercase">Entrega</label>
            <input type="date"
              value={isTask ? current.fechaEntrega : current.fechaFin}
              onChange={e => handleEdit(isTask ? "fechaEntrega" : "fechaFin", e.target.value)}
              className="w-full bg-white/5 border border-white/5 text-[11px] font-bold px-2 py-1.5 rounded-lg focus:outline-none text-white/70"
            />
          </div>
        </div>

        {/* Project description - Moved to top */}

        {/* Save button */}
        <AnimatePresence>
          {draft && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-2.5 rounded-xl text-xs font-black text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{ background: isTask ? "linear-gradient(135deg,#3a7bd5,#0a84ff)" : "linear-gradient(135deg,#7c3aed,#a855f7)" }}>
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Guardar cambios
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Project tasks section ── */}
        {!isTask && (
          <>
            <div className="h-px bg-white/[0.06] -mx-4" />

            {/* Header row with + button */}
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">
                Tareas · {pendingTasks.length} pendientes
              </span>
              <button
                onClick={onNewTask}
                title="Nueva tarea"
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center transition-all text-sm font-black",
                  isNewTaskOpen
                    ? "bg-blue-600 text-white"
                    : "bg-white/5 text-white/30 hover:bg-blue-600/20 hover:text-blue-400"
                )}>
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Task list — each row clickable → sub-task detail */}
            <div className="flex flex-col gap-1.5">
              {projectTasks.length === 0 && (
                <p className="text-xs text-white/20 italic text-center py-4">Sin tareas asignadas</p>
              )}
              {projectTasks.map((t: any) => {
                const isDoneTask      = DONE_STATES.has(t.estado) || locallyDone.has(t.id);
                const isActiveSubTask = activeSubTaskId === t.id;
                const tCol  = statusColor(t.estado);
                const tMins = parseEsfuerzoMins(t.esfuerzo || "");
                const pCol  = PRIORITY_COLORS[t.prioridad as string] || "rgba(255,255,255,0.3)";
                return (
                  <div key={t.id}
                    onClick={() => onTaskSelect(t.id)}
                    className={cn(
                      "flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer",
                      isDoneTask
                        ? "bg-white/[0.02] border-white/[0.04] opacity-50"
                        : isActiveSubTask
                          ? "bg-blue-600/10 border-blue-500/30"
                          : "bg-white/[0.04] border-white/[0.07] hover:bg-white/[0.09] hover:border-white/[0.12]"
                    )}>
                    {/* Checkbox */}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (isDoneTask) return;
                        setLocallyDone(prev => new Set([...prev, t.id]));
                        try { await updateTask.mutateAsync({ id: t.id, estado: "Hecho" }); }
                        catch { setLocallyDone(prev => { const n = new Set(prev); n.delete(t.id); return n; }); }
                      }}
                      className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
                        isDoneTask ? "bg-green-500 border-green-500" : "border-white/20 hover:border-blue-400 hover:bg-blue-500/10"
                      )}>
                      {isDoneTask && <Check className="w-2.5 h-2.5 text-white" />}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <span className={cn("text-[11px] leading-snug break-words block",
                        isDoneTask ? "line-through text-white/20" : "text-white/70")}>
                        {t.titulo || "Sin título"}
                      </span>
                      {/* Property badges row */}
                      {!isDoneTask && (
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {/* Estado */}
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded"
                            style={{ background: `${tCol}20`, color: tCol }}>
                            {t.estado || "—"}
                          </span>
                          {/* Prioridad */}
                          {t.prioridad && (
                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded"
                              style={{ background: `${pCol}18`, color: pCol }}>
                              {t.prioridad}
                            </span>
                          )}
                          {/* Formato */}
                          {t.formato && (
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-white/40">
                              {t.formato}
                            </span>
                          )}
                          {/* Esfuerzo */}
                          {tMins > 0 && (
                            <span className="text-[8px] text-white/30 flex items-center gap-0.5">
                              <Clock className="w-2 h-2" />{fmtMins(tMins)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
                      <button onClick={(e) => handleDuplicateSubtask(e, t)} title="Duplicar tarea"
                        className="w-6 h-6 rounded hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => handleUnlinkSubtask(e, t)} title="Quitar tarea del proyecto"
                        className="w-6 h-6 rounded hover:bg-red-500/20 flex items-center justify-center text-white/60 hover:text-red-400 transition-all">
                        <Unlink className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className={cn("w-3 h-3 ml-1", isActiveSubTask ? "text-blue-400" : "text-white/15")} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* bottom breathing room */}
        <div className="h-4 flex-shrink-0" />
      </div>
    </div>
  );
}

// ── New Task Pane ─────────────────────────────────────────────────────────────
function NewTaskPane({ projectId, projectName, clienteIds, clienteName, trabajadores, onBack }: {
  projectId: string;
  projectName: string;
  clienteIds: string[];
  clienteName: string;
  trabajadores: any[];
  onBack: () => void;
}) {
  const createTask = useCreateTask();

  const [titulo, setTitulo]       = useState("");
  const [contenido, setContenido] = useState("");
  const [asignado_ids, setAsignadoIds] = useState<string[]>([]);
  const [estado, setEstado]       = useState("Pendiente");
  const [prioridad, setPrioridad] = useState("Media");
  const [formato, setFormato]     = useState("");
  const [esfuerzo, setEsfuerzo]   = useState("");
  const [fechaProg, setFechaProg] = useState("");
  const [fechaFin, setFechaFin]   = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError]           = useState("");

  const handleCreate = async () => {
    const raw = titulo.trim();
    if (!raw || isCreating) return;
    const fullTitle = `${raw} - ${projectName}`;
    setIsCreating(true);
    setError("");
    try {
      await createTask.mutateAsync({
        titulo:       fullTitle,
        contenido,
        asignado_ids,
        estado,
        prioridad,
        formato,
        esfuerzo,
        proyecto_ids: [projectId],
        cliente_ids:  clienteIds,
        fechaProg,
        fechaEntrega: fechaFin,
      });
      onBack();
    } catch (e: any) {
      setError(e?.message || "Error al crear la tarea");
      setIsCreating(false);
    }
  };

  const toggleAssignee = (id: string) => {
    setAsignadoIds(prev => prev.includes(id) ? prev.filter(aid => aid !== id) : [...prev, id]);
  };

  const priCol = PRIORITY_COLORS[prioridad] || "rgba(255,255,255,0.5)";

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center gap-2 px-3 pt-3 pb-3 border-b border-white/[0.06]" style={{ background: "#0e0e11" }}>
        <button onClick={onBack}
          className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all flex-shrink-0">
          <ChevronLeft className="w-4 h-4 text-white/60" />
        </button>
        <span className="text-[8px] font-black uppercase px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 flex-shrink-0">
          Nueva Tarea
        </span>
        <span className="text-[9px] text-white/25 truncate flex-1 min-w-0">{projectName}</span>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4" style={{ scrollbarWidth: "thin" }}>

        {/* ── Título ── */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] font-black text-white/20 uppercase tracking-widest">Título</label>
          <input
            autoFocus
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            placeholder="Nombre de la tarea…"
            className="w-full bg-white/5 border border-white/10 text-xs font-bold text-white px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/40 placeholder-white/20"
          />
        </div>

        {/* ── Descripción ── */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] font-black text-white/20 uppercase tracking-widest">Descripción (Contenido)</label>
          <textarea
            value={contenido}
            onChange={e => setContenido(e.target.value)}
            rows={3}
            placeholder="Escribe la descripción aquí…"
            className="w-full bg-white/5 border border-white/10 text-xs text-white/70 px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/30 placeholder-white/20 resize-none"
          />
        </div>

        {/* ── Asignados ── */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] font-black text-white/20 uppercase tracking-widest">Asignar a</label>
          <div className="flex flex-wrap gap-2">
            {trabajadores.map(w => {
              const isSelected = asignado_ids.includes(w.id);
              return (
                <button
                  key={w.id}
                  onClick={() => toggleAssignee(w.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all",
                    isSelected 
                      ? "bg-blue-500/20 border-blue-500/40 text-blue-300" 
                      : "bg-white/5 border-white/5 text-white/30 hover:bg-white/10"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black",
                    isSelected ? "bg-blue-500 text-white" : "bg-white/10 text-white/40"
                  )}>
                    {w.nombre[0].toUpperCase()}
                  </div>
                  <span className="text-[10px] font-bold">{w.nombre.split(" ")[0]}</span>
                  {isSelected && <Check className="w-2.5 h-2.5" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-white/[0.06]" />

        {/* ── Estado + Prioridad ── */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-white/20 uppercase">Estado</label>
            <select value={estado} onChange={e => setEstado(e.target.value)}
              className="w-full bg-white/5 border border-white/5 text-[11px] font-bold px-2 py-2 rounded-xl focus:outline-none appearance-none"
              style={{ color: statusColor(estado) }}>
              {TASK_ESTADO_OPTS.map(o => <option key={o} value={o} className="bg-[#111]">{o}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-white/20 uppercase">Prioridad</label>
            <select value={prioridad} onChange={e => setPrioridad(e.target.value)}
              className="w-full bg-white/5 border border-white/5 text-[11px] font-bold px-2 py-2 rounded-xl focus:outline-none appearance-none"
              style={{ color: priCol }}>
              {TASK_PRIO_OPTS.map(o => <option key={o} value={o} className="bg-[#111]">{o}</option>)}
            </select>
          </div>
        </div>

        {/* ── Formato + Esfuerzo ── */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-white/20 uppercase">Formato</label>
            <select value={formato} onChange={e => setFormato(e.target.value)}
              className="w-full bg-white/5 border border-white/5 text-[11px] font-bold px-2 py-2 rounded-xl focus:outline-none appearance-none text-white/60">
              <option value="" className="bg-[#111]">Sin formato</option>
              {FORMATOS.map(o => <option key={o} value={o} className="bg-[#111]">{o}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-white/20 uppercase flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />Esfuerzo
            </label>
            <select value={esfuerzo} onChange={e => setEsfuerzo(e.target.value)}
              className="w-full bg-white/5 border border-white/5 text-[11px] font-bold px-2 py-2 rounded-xl focus:outline-none appearance-none text-white/60">
              <option value="" className="bg-[#111]">Sin estimado</option>
              {ESFUERZOS.map(o => <option key={o} value={o} className="bg-[#111]">{o}</option>)}
            </select>
          </div>
        </div>

        {/* ── Fechas ── */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-white/20 uppercase">Fecha inicio</label>
            <input type="date" value={fechaProg} onChange={e => setFechaProg(e.target.value)}
              className="w-full bg-white/5 border border-white/5 text-[11px] font-bold px-2 py-2 rounded-xl focus:outline-none text-white/60" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-white/20 uppercase">Entrega</label>
            <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)}
              className="w-full bg-white/5 border border-white/5 text-[11px] font-bold px-2 py-2 rounded-xl focus:outline-none text-white/60" />
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <div className="h-2 flex-shrink-0" />
      </div>

      {/* ── Create button (fixed at bottom) ── */}
      <div className="flex-shrink-0 p-3 border-t border-white/[0.06]" style={{ background: "#0e0e11" }}>
        <button
          onClick={handleCreate}
          disabled={!titulo.trim() || isCreating}
          className="w-full py-2.5 rounded-xl text-xs font-black text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-all hover:brightness-110"
          style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)" }}>
          {isCreating
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Creando…</>
            : <><Plus className="w-3.5 h-3.5" />Crear tarea en Notion</>
          }
        </button>
      </div>
    </div>
  );
}

// ── Sub-Task Detail (project → task drill-down) ───────────────────────────────
function SubTaskDetail({ task, projectName, data, onBack }: {
  task: any; projectName: string; data: any; onBack: () => void;
}) {
  const updateTask = useUpdateTask();
  const [draft, setDraft]       = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const status = task?.estado || "";
  const col    = statusColor(status);
  const client = data.clientes?.find((c: any) => c.id === task?.cliente_ids?.[0]);

  const base = {
    titulo:       task?.titulo       || "",
    estado:       task?.estado       || "",
    prioridad:    task?.prioridad     || "Media",
    formato:      task?.formato       || "",
    esfuerzo:     task?.esfuerzo      || "",
    fechaProg:    task?.fechaProg     || "",
    fechaEntrega: task?.fechaEntrega  || "",
    contenido:    task?.contenido     || "",
    asignado_ids: task?.asignado_ids  || [],
  };
  const current = draft || base;

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto';
      titleRef.current.style.height = titleRef.current.scrollHeight + 'px';
    }
  }, [current.titulo]);

  useEffect(() => {
    if (descRef.current) {
      descRef.current.style.height = 'auto';
      descRef.current.style.height = descRef.current.scrollHeight + 'px';
    }
  }, [current.contenido]);

  const handleEdit = (field: string, val: string) =>
    setDraft((prev: any) => ({ ...(prev || base), [field]: val }));

  const handleSave = async () => {
    if (!draft || isSaving) return;
    setIsSaving(true);
    try {
      await updateTask.mutateAsync({ id: task.id, ...draft });
      setDraft(null);
    } catch { /* noop */ } finally { setIsSaving(false); }
  };

  const tMins = parseEsfuerzoMins(task?.esfuerzo || "");

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb header */}
      <div className="flex-shrink-0 flex items-center gap-2 px-3 pt-3 pb-3 border-b border-white/[0.06]" style={{ background: "#0e0e11" }}>
        <button onClick={onBack}
          className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all flex-shrink-0">
          <ChevronLeft className="w-4 h-4 text-white/60" />
        </button>
        <span className="text-[9px] font-black text-purple-400/60 truncate flex-1">{projectName}</span>
        <span className="text-[9px] font-black px-2 py-0.5 rounded-md flex-shrink-0"
          style={{ background: `${col}20`, color: col }}>
          {status || "—"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4" style={{ scrollbarWidth: "thin" }}>

        {/* Title (Editable & Centered) */}
        <div className="flex flex-col items-center">
          <textarea
            ref={titleRef}
            value={current.titulo}
            onChange={e => handleEdit("titulo", e.target.value)}
            rows={1}
            placeholder="Título de la tarea"
            className="w-full bg-transparent text-base font-black text-white text-center leading-tight break-words border-none outline-none resize-none focus:ring-0 p-0 placeholder-white/20 hover:bg-white/[0.03] rounded transition-colors overflow-hidden"
            onInput={(e: any) => {
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
          />
        </div>

        {/* Description (Editable & Centered) */}
        <div className="flex flex-col items-center px-2">
          <textarea
            ref={descRef}
            value={current.contenido}
            onChange={e => handleEdit("contenido", e.target.value)}
            rows={1}
            placeholder="Escribe una descripción…"
            className="w-full bg-transparent text-[11px] text-white/50 text-center leading-relaxed break-words border-none outline-none resize-none focus:ring-0 p-0 placeholder-white/10 hover:bg-white/[0.03] rounded transition-colors italic overflow-hidden"
            onInput={(e: any) => {
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
          />
        </div>

        {client && (
          <div className="flex items-center justify-center gap-2">
            <div className="w-6 h-6 rounded-full bg-purple-500/15 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-black text-purple-400">{client.nombre?.[0]?.toUpperCase()}</span>
            </div>
            <span className="text-xs font-bold text-white/40">{client.nombre}</span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="text-[9px] font-black text-white/20 uppercase">Asignado a</label>
          <div className="flex flex-wrap gap-2">
            {(data.trabajadores || []).map((w: any) => {
              const isSelected = (current.asignado_ids || []).includes(w.id);
              return (
                <button
                  key={w.id}
                  onClick={() => {
                    const next = isSelected 
                      ? current.asignado_ids.filter((id: string) => id !== w.id)
                      : [...(current.asignado_ids || []), w.id];
                    handleEdit("asignado_ids", next);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-xl border transition-all",
                    isSelected 
                      ? "bg-blue-500/20 border-blue-500/40 text-blue-300" 
                      : "bg-white/5 border-transparent text-white/30 hover:bg-white/10"
                  )}
                >
                  <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[8px] font-black">
                    {w.nombre?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-[10px] font-bold">{w.nombre}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time badge */}
        {tMins > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] text-white/50">
            <Clock className="w-3.5 h-3.5 text-blue-400/60" />
            <span className="font-black text-white/70">{fmtMins(tMins)}</span>
            <span>estimado</span>
          </div>
        )}

        {/* Status + Priority */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-white/20 uppercase">Estado</label>
            <select value={current.estado} onChange={e => handleEdit("estado", e.target.value)}
              className="w-full bg-white/5 border border-white/5 text-[11px] font-bold px-2 py-1.5 rounded-lg focus:outline-none appearance-none"
              style={{ color: statusColor(current.estado) }}>
              {TASK_ESTADO_OPTS.map(o => <option key={o} value={o} className="bg-[#111]">{o}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-white/20 uppercase">Prioridad</label>
            <select value={current.prioridad} onChange={e => handleEdit("prioridad", e.target.value)}
              className="w-full bg-white/5 border border-white/5 text-[11px] font-bold px-2 py-1.5 rounded-lg focus:outline-none appearance-none"
              style={{ color: PRIORITY_COLORS[current.prioridad] || "inherit" }}>
              {TASK_PRIO_OPTS.map(o => <option key={o} value={o} className="bg-[#111]">{o}</option>)}
            </select>
          </div>
        </div>

        {/* Formato + Esfuerzo */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-white/20 uppercase">Formato</label>
            <select value={current.formato} onChange={e => handleEdit("formato", e.target.value)}
              className="w-full bg-white/5 border border-white/5 text-[11px] font-bold px-2 py-1.5 rounded-lg focus:outline-none appearance-none text-white/70">
              <option value="" className="bg-[#111]">Sin formato</option>
              {FORMATOS.map(o => <option key={o} value={o} className="bg-[#111]">{o}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-white/20 uppercase flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />Esfuerzo
            </label>
            <select value={current.esfuerzo} onChange={e => handleEdit("esfuerzo", e.target.value)}
              className="w-full bg-white/5 border border-white/5 text-[11px] font-bold px-2 py-1.5 rounded-lg focus:outline-none appearance-none text-white/60">
              <option value="" className="bg-[#111]">Sin estimado</option>
              {ESFUERZOS.map(o => <option key={o} value={o} className="bg-[#111]">{o}</option>)}
            </select>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-white/20 uppercase">Fecha Prog</label>
            <input type="date" value={current.fechaProg} onChange={e => handleEdit("fechaProg", e.target.value)}
              className="w-full bg-white/5 border border-white/5 text-[11px] font-bold px-2 py-1.5 rounded-lg focus:outline-none text-white/70" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-white/20 uppercase">Entrega</label>
            <input type="date" value={current.fechaEntrega} onChange={e => handleEdit("fechaEntrega", e.target.value)}
              className="w-full bg-white/5 border border-white/5 text-[11px] font-bold px-2 py-1.5 rounded-lg focus:outline-none text-white/70" />
          </div>
        </div>

        {/* Save */}
        <AnimatePresence>
          {draft && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}>
              <button onClick={handleSave} disabled={isSaving}
                className="w-full py-2.5 rounded-xl text-xs font-black text-white flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#3a7bd5,#0a84ff)" }}>
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Guardar cambios
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="h-6 flex-shrink-0" />
      </div>
    </div>
  );
}
