"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  pointerWithin,
  closestCorners,
  defaultDropAnimation,
  DropAnimation,
  Modifier,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Project } from "./ProjectDashboard";
import { TaskCardContent } from "./TaskCard";
import KanbanColumn, { SynthesizedTask } from "./KanbanColumn";
import { playSound } from "../utils/audio";

class SmartMouseSensor extends MouseSensor {
  static activators = [
    {
      eventName: "onMouseDown" as const,
      handler: ({ nativeEvent: event }: { nativeEvent: MouseEvent }) => {
        let element = event.target as HTMLElement | null;
        while (element) {
          if (
            element.dataset?.noDnd === "true" ||
            element.dataset?.dropdownContainer !== undefined ||
            element.tagName === "BUTTON" ||
            element.tagName === "INPUT" ||
            element.tagName === "TEXTAREA" ||
            element.classList?.contains("task-card-desc") ||
            element.classList?.contains("task-card-title") ||
            element.getAttribute("contenteditable") === "true"
          ) {
            return false;
          }
          element = element.parentElement;
        }
        return true;
      },
    },
  ];
}

class SmartTouchSensor extends TouchSensor {
  static activators = [
    {
      eventName: "onTouchStart" as const,
      handler: ({ nativeEvent: event }: { nativeEvent: TouchEvent }) => {
        let element = event.target as HTMLElement | null;
        while (element) {
          if (
            element.dataset?.noDnd === "true" ||
            element.dataset?.dropdownContainer !== undefined ||
            element.tagName === "BUTTON" ||
            element.tagName === "INPUT" ||
            element.tagName === "TEXTAREA" ||
            element.classList?.contains("task-card-desc") ||
            element.classList?.contains("task-card-title") ||
            element.getAttribute("contenteditable") === "true"
          ) {
            return false;
          }
          element = element.parentElement;
        }
        return true;
      },
    },
  ];
}

const dropAnimation: DropAnimation = {
  ...defaultDropAnimation,
  duration: 220,
  easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
};

export interface KanbanBoardProps {
  projects: Project[];
  filteredKanbanTasks: SynthesizedTask[];
  groupingMode: "fecha" | "cliente" | "prioridad" | "estado";
  isNightMode: boolean;
  headerBgStyle: string;
  draggingTaskId: string | null;
  setDraggingTaskId: React.Dispatch<React.SetStateAction<string | null>>;
  activeStatusDropdownCardId: string | null;
  activeFormatDropdownCardId: string | null;
  activeTimeDropdownCardId: string | null;
  activeColorSelectorCardId: string | null;
  editingTaskField: { taskId: string; field: "title" | "desc" } | null;
  expandedCardId: string | null;
  setExpandedCardId: React.Dispatch<React.SetStateAction<string | null>>;
  columnScrollIndices: Record<string, number>;
  setColumnScrollIndices: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  updateVisibleCards: (container: HTMLDivElement) => void;
  getCalendarDaysDiff: (d: Date) => number;
  formatLocalDate: (d: Date) => string;
  handleDropTask: (
    taskId: string,
    projectId: string | number,
    oldColId: string | undefined,
    newColId: string,
    orderMap: Record<string, number>
  ) => void;
  taskCardSharedProps: any;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  projects,
  filteredKanbanTasks,
  groupingMode,
  isNightMode,
  headerBgStyle,
  draggingTaskId,
  setDraggingTaskId,
  activeStatusDropdownCardId,
  activeFormatDropdownCardId,
  activeTimeDropdownCardId,
  activeColorSelectorCardId,
  editingTaskField,
  expandedCardId,
  setExpandedCardId,
  columnScrollIndices,
  setColumnScrollIndices,
  updateVisibleCards,
  getCalendarDaysDiff,
  formatLocalDate,
  handleDropTask,
  taskCardSharedProps,
}) => {
  const [hoveredColumnId, setHoveredColumnId] = useState<string | null>(null);
  const [localKanbanTasks, setLocalKanbanTasks] = useState<SynthesizedTask[]>([]);

  const localKanbanTasksRef = useRef(localKanbanTasks);
  localKanbanTasksRef.current = localKanbanTasks;

  const groupingModeRef = useRef(groupingMode);
  groupingModeRef.current = groupingMode;

  const projectsRef = useRef(projects);
  projectsRef.current = projects;

  const hoveredColumnIdRef = useRef(hoveredColumnId);
  hoveredColumnIdRef.current = hoveredColumnId;

  const justFinishedDraggingRef = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragCardRef = useRef<HTMLDivElement>(null);
  const lastOverId = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(SmartMouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(SmartTouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const physicsRef = useRef({
    angle: 0,
    angularVelocity: 0,
    angleX: 0,
    angularVelocityX: 0,
    scaleY: 1,
    scaleX: 1,
    lastX: null as number | null,
    lastY: null as number | null,
    animationFrameId: null as number | null,
  });

  const lastPointerXRef = useRef<number | null>(null);
  const cachedOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const cachedWidthRef = useRef<number>(0);

  const alignToTopCenter = useCallback<Modifier>(({ transform }) => {
    if (cachedOffsetRef.current) {
      const width = cachedWidthRef.current || 280;
      const targetOffsetX = width / 2;
      const targetOffsetY = 12;

      const diffX = cachedOffsetRef.current.x - targetOffsetX;
      const diffY = cachedOffsetRef.current.y - targetOffsetY;

      return {
        ...transform,
        x: transform.x + diffX,
        y: transform.y + diffY,
      };
    }
    return transform;
  }, []);

  const getTaskColumnId = useCallback(
    (task: SynthesizedTask): string => {
      if (groupingModeRef.current === "estado") {
        return `status-${task.status || "Planificado"}`;
      }
      if (groupingModeRef.current === "prioridad") {
        const proj = projectsRef.current.find((p) => p.id === task.projectId);
        return `priority-${proj?.priority || "Sin Prioridad"}`;
      }
      if (groupingModeRef.current === "fecha") {
        const diff = getCalendarDaysDiff(task.dueDate);
        if (diff <= 0) return "hoy";
        if (diff === 1) return "manana";
        if (diff > 1 && diff <= 7) return "semana";
        return "mes";
      }
      if (groupingModeRef.current === "cliente") {
        const proj = projectsRef.current.find((p) => p.id === task.projectId);
        const client = proj?.client || "Cliente 1";
        const uniqueClients = Array.from(
          new Set(projectsRef.current.map((p) => p.client))
        ).slice(0, 4);
        const idx = uniqueClients.indexOf(client);
        return `client-${idx !== -1 ? idx : 0}`;
      }
      return "";
    },
    [getCalendarDaysDiff]
  );

  const customCollisionDetection = useCallback(
    (args: any) => {
      const pointerCollisions = pointerWithin(args).filter(
        (c) => c.id !== args.active.id
      );
      let overId = pointerCollisions.length > 0 ? pointerCollisions[0].id : null;

      if (overId != null) {
        const taskIdStr = overId as string;
        const task = localKanbanTasksRef.current.find((t) => t.id === taskIdStr);
        const resolvedColId = task ? getTaskColumnId(task) : taskIdStr;

        lastOverId.current = resolvedColId;
        return pointerCollisions;
      }

      const cornersCollisions = closestCorners(args).filter(
        (c) => c.id !== args.active.id
      );
      overId = cornersCollisions.length > 0 ? cornersCollisions[0].id : null;

      if (overId != null) {
        const taskIdStr = overId as string;
        const task = localKanbanTasksRef.current.find((t) => t.id === taskIdStr);
        const resolvedColId = task ? getTaskColumnId(task) : taskIdStr;

        lastOverId.current = resolvedColId;
        return cornersCollisions;
      }

      if (lastOverId.current) {
        if (boardRef.current && args.pointerCoordinates) {
          const boardRect = boardRef.current.getBoundingClientRect();
          const { x, y } = args.pointerCoordinates;
          if (
            y < boardRect.top ||
            y > boardRect.bottom ||
            x < boardRect.left ||
            x > boardRect.right
          ) {
            return [];
          }
        }
        return [{ id: lastOverId.current }];
      }

      return [];
    },
    [getTaskColumnId]
  );

  useEffect(() => {
    if (draggingTaskId) return;
    if (justFinishedDraggingRef.current) {
      justFinishedDraggingRef.current = false;
      return;
    }
    setLocalKanbanTasks(filteredKanbanTasks);
  }, [filteredKanbanTasks, draggingTaskId]);

  const isValidColumnId = (colId: string): boolean => {
    if (!colId) return false;
    if (groupingMode === "fecha") {
      return ["hoy", "manana", "semana", "mes"].includes(colId);
    }
    if (groupingMode === "cliente") {
      return colId.startsWith("client-");
    }
    if (groupingMode === "prioridad") {
      return [
        "priority-Alta",
        "priority-Media",
        "priority-Normal",
        "priority-Baja",
      ].includes(colId);
    }
    if (groupingMode === "estado") {
      return [
        "status-Planificado",
        "status-Pendiente",
        "status-En Proceso",
        "status-En Revisión",
        "status-Revisión",
        "status-Completado",
      ].includes(colId);
    }
    return false;
  };

  const updateTaskColumn = (
    task: SynthesizedTask,
    newColumnId: string
  ): SynthesizedTask => {
    if (groupingMode === "estado") {
      const status = newColumnId.replace("status-", "");
      return { ...task, status };
    }
    if (groupingMode === "fecha") {
      let newDueDate = new Date();
      if (newColumnId === "manana") {
        newDueDate.setDate(newDueDate.getDate() + 1);
      } else if (newColumnId === "semana") {
        newDueDate.setDate(newDueDate.getDate() + 4);
      } else if (newColumnId === "mes") {
        newDueDate.setDate(newDueDate.getDate() + 15);
      }
      return {
        ...task,
        fecha_programada: formatLocalDate(newDueDate),
        dueDate: newDueDate,
      };
    }
    return task;
  };

  const cleanupDrag = () => {
    if (
      typeof window !== "undefined" &&
      (window as any)._handleGlobalMouseMove
    ) {
      window.removeEventListener(
        "mousemove",
        (window as any)._handleGlobalMouseMove
      );
      (window as any)._handleGlobalMouseMove = null;
    }
    if (physicsRef.current.animationFrameId !== null) {
      cancelAnimationFrame(physicsRef.current.animationFrameId);
      physicsRef.current.animationFrameId = null;
    }
    setDraggingTaskId(null);
    hoveredColumnIdRef.current = null;
    setHoveredColumnId(null);
    lastPointerXRef.current = null;
    cachedOffsetRef.current = null;
    cachedWidthRef.current = 0;
    lastOverId.current = null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    lastOverId.current = null;
    setDraggingTaskId(active.id as string);
    const startColId = active.data.current?.colId || null;
    hoveredColumnIdRef.current = startColId;
    setHoveredColumnId(startColId);
    if (expandedCardId === active.id) {
      setExpandedCardId(null);
    }

    const activator = event.activatorEvent as any;
    let clientX: number | null = null;
    let clientY: number | null = null;

    if (activator) {
      if (typeof activator.clientX === "number") {
        clientX = activator.clientX;
        clientY = activator.clientY;
      } else if (activator.touches && activator.touches[0]) {
        clientX = activator.touches[0].clientX;
        clientY = activator.touches[0].clientY;
      } else if (activator.changedTouches && activator.changedTouches[0]) {
        clientX = activator.changedTouches[0].clientX;
        clientY = activator.changedTouches[0].clientY;
      }
    }

    const initialX = clientX;
    const initialY = clientY;
    lastPointerXRef.current = initialX;

    const rect = active.rect.current.initial;

    if (rect && clientX !== null && clientY !== null) {
      cachedOffsetRef.current = {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
      cachedWidthRef.current = rect.width;
    } else {
      cachedOffsetRef.current = {
        x: 140,
        y: 75,
      };
      cachedWidthRef.current = 280;
    }

    physicsRef.current = {
      angle: 0,
      angularVelocity: 0,
      angleX: 0,
      angularVelocityX: 0,
      scaleY: 1,
      scaleX: 1,
      lastX: initialX,
      lastY: initialY,
      animationFrameId: null,
    };

    const updatePhysics = () => {
      const state = physicsRef.current;
      const gravityForceZ = -state.angle * 0.16;
      state.angularVelocity += gravityForceZ;
      state.angularVelocity *= 0.85;
      state.angle += state.angularVelocity;
      state.angle = Math.max(-15, Math.min(15, state.angle));

      const gravityForceX = -state.angleX * 0.18;
      state.angularVelocityX += gravityForceX;
      state.angularVelocityX *= 0.82;
      state.angleX += state.angularVelocityX;
      state.angleX = Math.max(-12, Math.min(12, state.angleX));

      const speed = Math.sqrt(
        state.angularVelocity * state.angularVelocity +
          state.angularVelocityX * state.angularVelocityX
      );
      state.scaleY = 1 + Math.min(0.08, speed * 0.0045);
      state.scaleX = 1 - Math.min(0.04, speed * 0.0022);

      if (dragCardRef.current) {
        dragCardRef.current.style.transform = `perspective(1000px) scale(${
          1.04 * state.scaleX
        }, ${1.04 * state.scaleY}) rotateX(${state.angleX}deg) rotateY(${
          state.angle * 0.18
        }deg) rotateZ(${state.angle}deg)`;
      }

      state.animationFrameId = requestAnimationFrame(updatePhysics);
    };

    physicsRef.current.animationFrameId = requestAnimationFrame(updatePhysics);

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const state = physicsRef.current;
      if (state.lastX !== null && state.lastY !== null) {
        const deltaX = e.clientX - state.lastX;
        const deltaY = e.clientY - state.lastY;

        const torqueZ = -deltaX * 0.7;
        state.angularVelocity += torqueZ;

        const torqueX = deltaY * 0.45;
        state.angularVelocityX += torqueX;
      }
      state.lastX = e.clientX;
      state.lastY = e.clientY;
      lastPointerXRef.current = e.clientX;
    };

    if (typeof window !== "undefined") {
      window.addEventListener("mousemove", handleGlobalMouseMove);
      (window as any)._handleGlobalMouseMove = handleGlobalMouseMove;
    }

    playSound("click");
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
      if (hoveredColumnIdRef.current !== null) {
        hoveredColumnIdRef.current = null;
        setHoveredColumnId(null);
      }
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const overTask = localKanbanTasks.find((t) => t.id === overId);
    let overColId = overTask ? getTaskColumnId(overTask) : overId;

    if (!isValidColumnId(overColId)) return;

    const activeTask = localKanbanTasks.find((t) => t.id === activeId);
    if (activeTask) {
      const activeColId = getTaskColumnId(activeTask);
      if (activeColId !== overColId) {
        if (hoveredColumnIdRef.current !== overColId) {
          hoveredColumnIdRef.current = overColId;
          setHoveredColumnId(overColId);
        }
      }
    }

    setLocalKanbanTasks((prev) => {
      const activeTaskInPrev = prev.find((t) => t.id === activeId);
      if (!activeTaskInPrev) return prev;

      const activeColIdInPrev = getTaskColumnId(activeTaskInPrev);

      let overColIdInPrev = overId;
      const overTaskInPrev = prev.find((t) => t.id === overId);
      if (overTaskInPrev) {
        overColIdInPrev = getTaskColumnId(overTaskInPrev);
      }

      if (!isValidColumnId(overColIdInPrev)) return prev;

      if (activeColIdInPrev !== overColIdInPrev) {
        const activeIdx = prev.findIndex((t) => t.id === activeId);
        const overIdx = prev.findIndex((t) => t.id === overId);

        const updatedTasks = prev.map((t) => {
          if (t.id === activeId) {
            return updateTaskColumn(t, overColIdInPrev);
          }
          return t;
        });

        if (overIdx !== -1) {
          return arrayMove(updatedTasks, activeIdx, overIdx);
        }
        return updatedTasks;
      } else {
        const activeIdx = prev.findIndex((t) => t.id === activeId);
        const overIdx = prev.findIndex((t) => t.id === overId);
        if (activeIdx !== -1 && overIdx !== -1 && activeIdx !== overIdx) {
          return arrayMove(prev, activeIdx, overIdx);
        }
        return prev;
      }
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      cleanupDrag();
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = localKanbanTasks.find((t) => t.id === activeId);
    if (!activeTask) {
      cleanupDrag();
      return;
    }

    let overColId = overId;
    const overTask = localKanbanTasks.find((t) => t.id === overId);

    if (overTask) {
      overColId = getTaskColumnId(overTask);
    }

    if (!isValidColumnId(overColId)) {
      cleanupDrag();
      return;
    }

    let finalTasksState = [...localKanbanTasks];
    const activeIdx = finalTasksState.findIndex((t) => t.id === activeId);

    if (activeIdx !== -1) {
      const currentCol = getTaskColumnId(finalTasksState[activeIdx]);
      if (currentCol !== overColId) {
        finalTasksState[activeIdx] = updateTaskColumn(
          finalTasksState[activeIdx],
          overColId
        );
      }

      const overIdx = finalTasksState.findIndex((t) => t.id === overId);
      if (overIdx !== -1 && activeIdx !== overIdx) {
        finalTasksState = arrayMove(finalTasksState, activeIdx, overIdx);
      }
    }

    setLocalKanbanTasks(finalTasksState);

    const finalColTasks = finalTasksState.filter(
      (t) => getTaskColumnId(t) === overColId
    );
    const orderMap: Record<string, number> = {};

    finalColTasks.forEach((t, index) => {
      orderMap[t.id] = index * 10;
    });

    const parts = activeId.split("-");
    const projectId = parts[1];
    const taskNum = parts[2];

    let oldColId: string | undefined = undefined;
    const project = projects.find((p) => String(p.id) === String(projectId));
    const originalTask = project?.tasks?.find(
      (t) => String(t.id) === String(taskNum)
    );
    if (originalTask) {
      if (groupingMode === "estado") {
        oldColId = `status-${originalTask.status || "Planificado"}`;
      } else if (groupingMode === "prioridad") {
        oldColId = `priority-${project?.priority || "Sin Prioridad"}`;
      } else if (groupingMode === "fecha") {
        const origProgDate = originalTask.fecha_programada
          ? new Date(originalTask.fecha_programada + "T00:00:00")
          : new Date();
        const diff = getCalendarDaysDiff(origProgDate);
        if (diff <= 0) oldColId = "hoy";
        else if (diff === 1) oldColId = "manana";
        else if (diff > 1 && diff <= 7) oldColId = "semana";
        else oldColId = "mes";
      } else if (groupingMode === "cliente") {
        const uniqueClients = Array.from(
          new Set(projects.map((p) => p.client))
        ).slice(0, 4);
        const idx = uniqueClients.indexOf(project?.client || "");
        oldColId = `client-${idx !== -1 ? idx : 0}`;
      }
    }

    playSound(overColId !== oldColId ? "whoosh" : "pop");
    handleDropTask(activeId, projectId, oldColId, overColId, orderMap);

    justFinishedDraggingRef.current = true;
    cleanupDrag();
  };

  // Define columns dynamically based on groupingMode
  let tasks = localKanbanTasks.length > 0 ? localKanbanTasks : filteredKanbanTasks;
  if (groupingMode === "fecha") {
    tasks = tasks.filter((t) => t.status !== "Completado" && t.status !== "Completada");
  }
  let cols: {
    id: string;
    name: string;
    colorClass: string;
    badgeBg: string;
    badgeText: string;
    tasks: SynthesizedTask[];
  }[] = [];

  if (groupingMode === "fecha") {
    cols = [
      {
        id: "hoy",
        name: "Hoy",
        colorClass: "text-rose-450",
        badgeBg: "bg-rose-400/20",
        badgeText: "text-rose-300",
        tasks: tasks.filter((t) => getCalendarDaysDiff(t.dueDate) <= 0),
      },
      {
        id: "manana",
        name: "Mañana",
        colorClass: "text-amber-400/80",
        badgeBg: "bg-amber-400/20",
        badgeText: "text-amber-300",
        tasks: tasks.filter((t) => getCalendarDaysDiff(t.dueDate) === 1),
      },
      {
        id: "semana",
        name: "Esta Semana",
        colorClass: "text-cyan-400/80",
        badgeBg: "bg-cyan-400/20",
        badgeText: "text-cyan-300",
        tasks: tasks.filter((t) => {
          const diff = getCalendarDaysDiff(t.dueDate);
          return diff > 1 && diff <= 7;
        }),
      },
      {
        id: "mes",
        name: "Este Mes",
        colorClass: "text-slate-400",
        badgeBg: "bg-white/10",
        badgeText: "text-slate-400",
        tasks: tasks.filter((t) => {
          const diff = getCalendarDaysDiff(t.dueDate);
          return diff > 7 && diff <= 30;
        }),
      },
    ];
  } else if (groupingMode === "cliente") {
    const uniqueClients = Array.from(
      new Set(projects.map((p) => p.client))
    ).slice(0, 4);
    while (uniqueClients.length < 4) {
      uniqueClients.push(`Cliente ${uniqueClients.length + 1}`);
    }

    const colors = [
      { text: "text-rose-450", bg: "bg-rose-400/20", badge: "text-rose-300" },
      { text: "text-amber-400/85", bg: "bg-amber-400/20", badge: "text-amber-300" },
      { text: "text-cyan-400/85", bg: "bg-cyan-400/20", badge: "text-cyan-300" },
      { text: "text-slate-400", bg: "bg-white/10", badge: "text-slate-400" },
    ];

    cols = uniqueClients.map((client, idx) => {
      const cStyle = colors[idx % colors.length];
      return {
        id: `client-${idx}`,
        name: client,
        colorClass: cStyle.text,
        badgeBg: cStyle.bg,
        badgeText: cStyle.badge,
        tasks: tasks.filter((t) => {
          const proj = projects.find((p) => p.id === t.projectId);
          return proj ? proj.client === client : false;
        }),
      };
    });
  } else if (groupingMode === "prioridad") {
    const priorities = ["Alta", "Media", "Normal", "Baja"];
    const colors = [
      { text: "text-red-400/90", bg: "bg-red-400/20", badge: "text-red-300" },
      { text: "text-orange-400/90", bg: "bg-orange-400/20", badge: "text-orange-300" },
      { text: "text-blue-400/90", bg: "bg-blue-400/20", badge: "text-blue-300" },
      { text: "text-slate-400", bg: "bg-white/10", badge: "text-slate-400" },
    ];

    cols = priorities.map((priority, idx) => {
      const cStyle = colors[idx % colors.length];
      return {
        id: `priority-${priority}`,
        name: `Prioridad ${priority}`,
        colorClass: cStyle.text,
        badgeBg: cStyle.bg,
        badgeText: cStyle.badge,
        tasks: tasks.filter((t) => {
          const proj = projects.find((p) => p.id === t.projectId);
          const projPriority = proj?.priority || "Normal";
          return projPriority === priority;
        }),
      };
    });
  } else {
    // groupingMode === "estado"
    const statuses = ["Planificado", "En Proceso", "En Revisión", "Completado"];
    const colors = [
      { text: "text-slate-400", bg: "bg-slate-400/20", badge: "text-slate-300" },
      { text: "text-amber-400/85", bg: "bg-amber-400/20", badge: "text-amber-300" },
      { text: "text-purple-400/90", bg: "bg-purple-400/20", badge: "text-purple-300" },
      { text: "text-emerald-400/90", bg: "bg-emerald-400/20", badge: "text-emerald-300" },
    ];

    cols = statuses.map((status, idx) => {
      const cStyle = colors[idx % colors.length];
      return {
        id: `status-${status}`,
        name: status,
        colorClass: cStyle.text,
        badgeBg: cStyle.bg,
        badgeText: cStyle.badge,
        tasks: tasks.filter((t) => {
          if (status === "Planificado") {
            return t.status === "Planificado" || t.status === "Pendiente" || !t.status;
          }
          if (status === "En Revisión") {
            return t.status === "En Revisión" || t.status === "Revisión";
          }
          return t.status === status;
        }),
      };
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={cleanupDrag}
      autoScroll={{ threshold: { x: 0, y: 0.2 }, acceleration: 10 }}
    >
      <div
        ref={boardRef}
        className={`w-full h-full relative grid grid-cols-4 gap-5 pt-6 animate-fadeIn ${
          draggingTaskId ||
          activeStatusDropdownCardId !== null ||
          activeFormatDropdownCardId !== null ||
          activeTimeDropdownCardId !== null
            ? "overflow-visible z-30 is-dragging-active"
            : "overflow-hidden"
        }`}
      >
        {cols.map((col) => {
          const isHovered = hoveredColumnId === col.id;
          const colTasks = (
            localKanbanTasks.length > 0 ? localKanbanTasks : filteredKanbanTasks
          ).filter((t) => getTaskColumnId(t) === col.id);

          return (
            <KanbanColumn
              key={col.id}
              col={{ ...col, tasks: colTasks }}
              headerBgStyle={headerBgStyle}
              draggingTaskId={draggingTaskId}
              isHovered={isHovered}
              isNightMode={isNightMode}
              activeStatusDropdownCardId={activeStatusDropdownCardId}
              activeFormatDropdownCardId={activeFormatDropdownCardId}
              activeTimeDropdownCardId={activeTimeDropdownCardId}
              activeColorSelectorCardId={activeColorSelectorCardId}
              editingTaskField={editingTaskField}
              expandedCardId={expandedCardId}
              setExpandedCardId={setExpandedCardId}
              columnScrollIndices={columnScrollIndices}
              setColumnScrollIndices={setColumnScrollIndices}
              updateVisibleCards={updateVisibleCards}
              taskCardSharedProps={taskCardSharedProps}
            />
          );
        })}
      </div>

      {draggingTaskId && typeof document !== "undefined"
        ? createPortal(
            <DragOverlay
              adjustScale={false}
              dropAnimation={dropAnimation}
              modifiers={[alignToTopCenter]}
            >
              {(() => {
                const task = filteredKanbanTasks.find((t) => t.id === draggingTaskId);
                if (!task) return null;
                return (
                  <div
                    className="w-full pointer-events-none select-none"
                    style={{ height: 150 }}
                  >
                    <div
                      ref={dragCardRef}
                      className="task-card-wrapper w-full h-full shadow-[0_30px_60px_-15px_rgba(0,0,0,0.55)]"
                      style={{
                        transform: `perspective(1000px) scale(1.04) rotateX(0deg) rotateY(0deg) rotateZ(0deg)`,
                        transformOrigin: "center center",
                      }}
                    >
                      <TaskCardContent
                        {...taskCardSharedProps}
                        taskId={task.id}
                        projectId={task.projectId}
                        projectName={task.projectName}
                        taskTitle={task.taskTitle}
                        completedTasks={task.completedTasks}
                        totalTasks={task.totalTasks}
                        taskIndex={task.taskIndex}
                        desc={task.desc || ""}
                        forceCollapsed={true}
                      />
                    </div>
                  </div>
                );
              })()}
            </DragOverlay>,
            document.body
          )
        : null}
    </DndContext>
  );
};

export default KanbanBoard;
