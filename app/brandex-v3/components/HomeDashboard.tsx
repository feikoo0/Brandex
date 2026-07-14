"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Search, LayoutGrid, Table, CalendarDays, ExternalLink, ArrowRight, TrendingUp, ArrowUpRight, Wallet, Activity, Layers, Flag, Calendar, ChevronDown, Plus, Check, Clock } from "lucide-react";
import { Project, Task } from "./ProjectDashboard";
import TimeHeatmap from "./TimeHeatmap";
import { playSound } from "../utils/audio";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  DragMoveEvent,
  useDroppable,
  pointerWithin,
  closestCorners,
  defaultDropAnimation,
  DropAnimation
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  defaultAnimateLayoutChanges,
  AnimateLayoutChanges
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const dropAnimation: DropAnimation = {
  ...defaultDropAnimation,
  duration: 250,
  easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
};

const animateLayoutChanges: AnimateLayoutChanges = (args) => {
  const { isSorting, wasDragging } = args;
  if (isSorting || wasDragging) {
    return true;
  }
  return defaultAnimateLayoutChanges(args);
};

class SmartMouseSensor extends MouseSensor {
  static activators = [
    {
      eventName: 'onMouseDown' as const,
      handler: ({ nativeEvent: event }: { nativeEvent: MouseEvent }) => {
        const target = event.target as HTMLElement;
        const shouldIgnore = !!(
          target.closest('button') ||
          target.closest('input') ||
          target.closest('select') ||
          target.closest('textarea') ||
          target.closest('a') ||
          target.closest('[data-no-dnd]')
        );
        return !shouldIgnore;
      },
    },
  ];
}

class SmartTouchSensor extends TouchSensor {
  static activators = [
    {
      eventName: 'onTouchStart' as const,
      handler: ({ nativeEvent: event }: { nativeEvent: TouchEvent }) => {
        const target = event.target as HTMLElement;
        const shouldIgnore = !!(
          target.closest('button') ||
          target.closest('input') ||
          target.closest('select') ||
          target.closest('textarea') ||
          target.closest('a') ||
          target.closest('[data-no-dnd]')
        );
        return !shouldIgnore;
      },
    },
  ];
}

interface SynthesizedTask {
  id: string;
  projectName: string;
  projectId: number;
  taskTitle: string;
  completedTasks: number;
  totalTasks: number;
  taskIndex: number;
  dueDate: Date;
  fecha_programada: string;
  fecha_limite: string;
  fecha_creacion: string;
  status?: string;
  format?: string;
  time?: string;
  desc?: string;
  kanbanOrders?: Record<string, number>;
}

interface ColumnContainerProps {
  col: { id: string; name: string; colorClass: string; badgeBg: string; badgeText: string; tasks: SynthesizedTask[] };
  children: React.ReactNode;
  headerBgStyle: string;
  draggingTaskId: string | null;
  isHovered: boolean;
}

interface SortableTaskCardProps {
  t: SynthesizedTask;
  extraClass: string;
  renderTaskCard: (
    taskId: string,
    projectId: number,
    projectName: string,
    taskTitle: string,
    completedTasks: number,
    totalTasks: number,
    taskIndex?: number,
    desc?: string,
    columnId?: string,
    forceCollapsed?: boolean
  ) => React.ReactNode;
  colId: string;
}

// Contenedor Droppable para columnas vacías
function ColumnContainer({ col, children, headerBgStyle, draggingTaskId, isHovered }: ColumnContainerProps) {
  const { setNodeRef } = useDroppable({
    id: col.id,
  });

  return (
    <div
      ref={setNodeRef}
      data-column-id={col.id}
      className={`h-full relative rounded-2xl p-2.5 flex flex-col gap-2.5 transition-all duration-300 ${headerBgStyle} ${
        draggingTaskId
          ? isHovered
            ? "z-50 shadow-[0_20px_50px_rgba(0,0,0,0.35)] border border-dashed border-sky-500/40 bg-sky-500/[0.02]"
            : "z-10 border border-dashed border-white/[0.04]"
          : "border border-transparent"
      }`}
      style={{
        overflow: draggingTaskId ? "visible" : "hidden"
      }}
    >
      {children}
    </div>
  );
}

function SortableTaskCard({ t, extraClass, renderTaskCard, colId }: SortableTaskCardProps) {
  const taskIdComposite = t.id.startsWith("kt-") ? t.id : `kt-${t.projectId}-${t.id}`;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: taskIdComposite,
    data: {
      taskId: taskIdComposite,
      colId
    },
    animateLayoutChanges,
    transition: {
      duration: 250,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`task-card-wrapper relative shrink-0 ${isDragging ? 'is-dragging-card' : ''} ${extraClass}`}
      data-task-id={taskIdComposite}
    >
      <div className="w-full h-full">
        {renderTaskCard(taskIdComposite, t.projectId, t.projectName, t.taskTitle, t.completedTasks, t.totalTasks, t.taskIndex, t.desc || "", colId)}
      </div>
    </div>
  );
}

type ViewMode = "buscar" | "kanban" | "tabla" | "timeline";

interface HomeDashboardProps {
  projects: Project[];
  onSelectTab: (tab: string) => void;
  onSelectProject?: (projectId: number) => void;
  isNeumorphic: boolean;
  isNightMode: boolean;
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  viewFilterMode: "mio" | "equipo";
  groupingMode: "fecha" | "cliente" | "prioridad" | "estado";
  onUpdateProjects: React.Dispatch<React.SetStateAction<Project[]>>;
}


const updateVisibleCards = (container: HTMLDivElement) => {
  const children = container.children;
  const scrollTop = container.scrollTop;
  // Card height is 150px, gap is 10px. Total 160px.
  const topVisibleIndex = Math.round(scrollTop / 160);
  
  for (let i = 0; i < children.length; i++) {
    const child = children[i] as HTMLElement;
    child.classList.remove("card-pos-0", "card-pos-1", "card-pos-2");
    if (i === topVisibleIndex) {
      child.classList.add("card-pos-0");
    } else if (i === topVisibleIndex + 1) {
      child.classList.add("card-pos-1");
    } else if (i === topVisibleIndex + 2) {
      child.classList.add("card-pos-2");
    }
  }
};

export function HomeDashboard({
  projects,
  onSelectTab,
  onSelectProject,
  isNeumorphic,
  isNightMode,
  activeView,
  onViewChange,
  viewFilterMode,
  groupingMode,
  onUpdateProjects,
}: HomeDashboardProps) {
  const [dbSubView, setDbSubView] = useState<"proyectos" | "tareas">("proyectos");
  const [columnScrollIndices, setColumnScrollIndices] = useState<Record<string, number>>({});
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const [availableFormats, setAvailableFormats] = useState<string[]>([
    "Reel",
    "Post",
    "Portada",
    "Flyer",
    "Video",
    "Copywriting",
    "Branding"
  ]);

  const [activeStatusDropdownCardId, setActiveStatusDropdownCardId] = useState<string | null>(null);
  const [activeFormatDropdownCardId, setActiveFormatDropdownCardId] = useState<string | null>(null);
  const [isAddingNewFormat, setIsAddingNewFormat] = useState<boolean>(false);
  const [newFormatValue, setNewFormatValue] = useState<string>("");

  const [activeTimeDropdownCardId, setActiveTimeDropdownCardId] = useState<string | null>(null);
  const [isAddingCustomTime, setIsAddingCustomTime] = useState<boolean>(false);
  const [customTimeValue, setCustomTimeValue] = useState<string>("");
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [hoveredColumnId, setHoveredColumnId] = useState<string | null>(null);
  const boardRef = React.useRef<HTMLDivElement>(null);


  const formatLocalDate = (d: Date): string => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const handleDropTask = (taskId: string, projectId: number, oldColId: string | undefined, newColId: string, orderMap: Record<string, number>) => {
    const parts = taskId.split("-");
    const taskIdNum = parseInt(parts[2], 10);
    if (isNaN(taskIdNum)) return;

    if (groupingMode === "estado") {
      const status = newColId.replace("status-", "");
      onUpdateProjects(prev => prev.map(p => {
        // En lugar de solo mapear las tareas si el ID de proyecto coincide con el de la tarjeta movida,
        // ahora DEBEMOS actualizar el `kanbanOrder` para TODAS las tareas que estén en el `orderMap` (es decir, toda la columna destino),
        // independientemente del proyecto al que pertenezcan.
        const updatedTasks = p.tasks?.map(t => {
          let updatedTask = t;
          const fullTaskId = `kt-${p.id}-${t.id}`;

          // 1. Si la tarea está en el mapa, actualizamos su kanbanOrders para la vista actual
          if (orderMap[fullTaskId] !== undefined) {
            updatedTask = { 
              ...updatedTask, 
              kanbanOrders: { ...(updatedTask.kanbanOrders || {}), [groupingMode]: orderMap[fullTaskId] } 
            };
          }

          // 2. Si es la tarea ESPECÍFICA que se arrastró, actualizamos su estado
          if (p.id === projectId && t.id === taskIdNum) {
            if (status === "Revisión") {
              updatedTask = {
                ...updatedTask,
                status: "Pendiente" as const,
                statusColor: "bg-white/5 border border-white/10 text-white/60"
              };
            } else {
              updatedTask = {
                ...updatedTask,
                status: status as any,
                statusColor: status === "Completado" 
                  ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                  : status === "En Proceso"
                    ? "bg-amber-500/20 border-amber-500/30 text-amber-400"
                    : "bg-white/5 border border-white/10 text-white/60"
              };
            }
          }

          return updatedTask;
        }) || [];

        // Si este proyecto es el destino de un cambio a "Revisión", actualizar estado del proyecto
        if (p.id === projectId && status === "Revisión") {
          return {
            ...p,
            status: "En Revisión Interna",
            statusColor: "bg-yellow-500/10 border-yellow-500/30 text-yellow-500",
            tasks: updatedTasks
          };
        }

        return { ...p, tasks: updatedTasks };
      }));
    } else if (groupingMode === "prioridad") {
      const priority = newColId.replace("priority-", "");
      onUpdateProjects(prev => prev.map(p => {
        const updatedTasks = p.tasks?.map(t => {
          let updatedTask = t;
          const fullTaskId = `kt-${p.id}-${t.id}`;
          if (orderMap[fullTaskId] !== undefined) {
            updatedTask = { 
              ...updatedTask, 
              kanbanOrders: { ...(updatedTask.kanbanOrders || {}), [groupingMode]: orderMap[fullTaskId] } 
            };
          }
          return updatedTask;
        }) || [];
        
        if (p.id !== projectId) return { ...p, tasks: updatedTasks };
        return { ...p, priority, tasks: updatedTasks };
      }));
    } else if (groupingMode === "fecha") {
      const today = new Date();
      let targetDate = new Date();
      if (newColId === "manana") {
        targetDate.setDate(today.getDate() + 1);
      } else if (newColId === "semana") {
        targetDate.setDate(today.getDate() + 4);
      } else if (newColId === "mes") {
        targetDate.setDate(today.getDate() + 15);
      }
      const dateStr = formatLocalDate(targetDate);
      onUpdateProjects(prev => prev.map(p => {
        const updatedTasks = p.tasks?.map(t => {
          let updatedTask = t;
          const fullTaskId = `kt-${p.id}-${t.id}`;
          
          if (orderMap[fullTaskId] !== undefined) {
            updatedTask = { 
              ...updatedTask, 
              kanbanOrders: { ...(updatedTask.kanbanOrders || {}), [groupingMode]: orderMap[fullTaskId] } 
            };
          }

          if (p.id === projectId && t.id === taskIdNum) {
            updatedTask = { ...updatedTask, fecha_programada: dateStr };
          }
          
          return updatedTask;
        }) || [];
        return { ...p, tasks: updatedTasks };
      }));
    } else if (groupingMode === "cliente") {
      const uniqueClients = Array.from(new Set(projects.map(p => p.client))).slice(0, 4);
      while (uniqueClients.length < 4) {
        uniqueClients.push(`Cliente ${uniqueClients.length + 1}`);
      }
      const clientIdx = parseInt(newColId.replace("client-", ""), 10);
      const targetClient = uniqueClients[clientIdx];
      if (targetClient) {
        onUpdateProjects(prev => prev.map(p => {
          const updatedTasks = p.tasks?.map(t => {
            let updatedTask = t;
            const fullTaskId = `kt-${p.id}-${t.id}`;
            if (orderMap[fullTaskId] !== undefined) {
              updatedTask = { 
                ...updatedTask, 
                kanbanOrders: { ...(updatedTask.kanbanOrders || {}), [groupingMode]: orderMap[fullTaskId] } 
              };
            }
            return updatedTask;
          }) || [];

          if (p.id !== projectId) return { ...p, tasks: updatedTasks };
          return { ...p, client: targetClient, tasks: updatedTasks };
        }));
      }
    }
  };

  useEffect(() => {
    const formatsSet = new Set(availableFormats);
    projects.forEach(p => {
      p.tasks?.forEach(t => {
        if (t.format) {
          formatsSet.add(t.format);
        }
      });
    });
    setAvailableFormats(Array.from(formatsSet));
  }, [projects]);

  const updateTaskProperty = (projId: number, tId: number, key: string, value: any) => {
    onUpdateProjects(prev => prev.map(p => {
      if (p.id !== projId) return p;
      return {
        ...p,
        tasks: p.tasks?.map(t => {
          if (t.id !== tId) return t;
          return { ...t, [key]: value };
        })
      };
    }));
  };
  useEffect(() => {
    if (expandedCardId === null) {
      setActiveStatusDropdownCardId(null);
      setActiveFormatDropdownCardId(null);
      setIsAddingNewFormat(false);
      setNewFormatValue("");
      setActiveTimeDropdownCardId(null);
      setIsAddingCustomTime(false);
      setCustomTimeValue("");
    }
  }, [expandedCardId]);


  // LED counter stats calculations
  const totalProjects = projects.length;
  const totalTasks = projects.reduce((acc, p) => acc + (p.tasks?.length || 0), 0);
  const totalHours = projects.reduce((acc, p) => {
    if (p.burnRate) {
      const match = p.burnRate.match(/^(\d+)/);
      if (match) {
        return acc + parseInt(match[1], 10);
      }
    }
    return acc;
  }, 0);

  const kanbanTasks = React.useMemo(() => {
    const list: any[] = [];
    if (!projects) return list;
    
    projects.forEach(p => {
      if (p.tasks) {
        p.tasks.forEach((t, index) => {
          // Calculate completed tasks in the parent project
          const completedCount = p.tasks?.filter(tk => tk.status === "Completado").length || 0;
          const totalCount = p.tasks?.length || 0;

          // Dynamically distribute due dates based on task status or task ID if not set:
          const progDateStr = t.fecha_programada || (() => {
            let offset = 0;
            if (t.status === "Completado") {
              offset = 12; // Completado -> Este mes
            } else if (t.status === "En Proceso") {
              offset = 0; // En proceso -> Hoy
            } else {
              // Pending tasks are distributed:
              if (t.id % 3 === 0) offset = 1; // Tomorrow
              else if (t.id % 3 === 1) offset = 4; // This Week
              else offset = 15; // This Month
            }
            const d = new Date();
            d.setDate(d.getDate() + offset);
            return formatLocalDate(d);
          })();

          const limitDateStr = t.fecha_limite || t.deadline || progDateStr;

          const createdDateStr = t.fecha_creacion || (() => {
            const d = new Date();
            const offset = 2 + (t.id % 5);
            d.setDate(d.getDate() - offset);
            return formatLocalDate(d);
          })();

          const dueDate = new Date(progDateStr + "T00:00:00");

          list.push({
            id: `kt-${p.id}-${t.id}`,
            projectName: p.title,
            projectId: p.id,
            taskTitle: t.title,
            completedTasks: completedCount,
            totalTasks: totalCount,
            taskIndex: index + 1,
            dueDate,
            fecha_programada: progDateStr,
            fecha_limite: limitDateStr,
            fecha_creacion: createdDateStr,
            status: t.status,
            format: t.format,
            time: t.time,
            desc: t.desc,
            kanbanOrders: t.kanbanOrders
          });
        });
      }
    });

    // Ordenar globalmente por la vista actual (groupingMode)
    list.sort((a, b) => {
      // Usamos Infinity para que las tareas viejas sin reordenar queden al final en lugar de colarse en medio.
      // Si ambas son Infinity, las ordenamos por ID/índice para que el renderizado sea estable.
      const orderA = a.kanbanOrders?.[groupingMode] ?? Infinity;
      const orderB = b.kanbanOrders?.[groupingMode] ?? Infinity;
      
      if (orderA === Infinity && orderB === Infinity) {
        return a.taskIndex - b.taskIndex;
      }
      return orderA - orderB;
    });

    return list;
  }, [projects, groupingMode]);

  const filteredKanbanTasks = React.useMemo(() => {
    if (viewFilterMode === "mio") {
      return kanbanTasks.filter(t => {
        const parts = t.id.split("-");
        const taskIdNum = parseInt(parts[2] || "0", 10);
        return taskIdNum % 2 === 0;
      });
    }
    return kanbanTasks;
  }, [kanbanTasks, viewFilterMode]);

  const getCalendarDaysDiff = (targetDate: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  const [localKanbanTasks, setLocalKanbanTasks] = useState<SynthesizedTask[]>([]);
  
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

  const lastOverId = useRef<string | null>(null);

  const [dragRotation, setDragRotation] = useState(0);
  const lastPointerXRef = useRef<number | null>(null);
  const pointerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const customCollisionDetection = React.useCallback(
    (args: any) => {
      // Filtrar el elemento que se está arrastrando de las colisiones
      const pointerCollisions = pointerWithin(args).filter(c => c.id !== args.active.id);
      let overId = pointerCollisions.length > 0 ? pointerCollisions[0].id : null;

      if (overId != null) {
        const taskIdStr = overId as string;
        const task = localKanbanTasks.find(t => t.id === taskIdStr);
        const resolvedColId = task ? getTaskColumnId(task) : taskIdStr;
        
        lastOverId.current = resolvedColId;
        return pointerCollisions;
      }

      const cornersCollisions = closestCorners(args).filter(c => c.id !== args.active.id);
      overId = cornersCollisions.length > 0 ? cornersCollisions[0].id : null;

      if (overId != null) {
        const taskIdStr = overId as string;
        const task = localKanbanTasks.find(t => t.id === taskIdStr);
        const resolvedColId = task ? getTaskColumnId(task) : taskIdStr;
        
        lastOverId.current = resolvedColId;
        return cornersCollisions;
      }

      if (lastOverId.current) {
        return [{ id: lastOverId.current }];
      }

      return [];
    },
    [localKanbanTasks, projects, groupingMode]
  );

  useEffect(() => {
    setLocalKanbanTasks(filteredKanbanTasks);
  }, [filteredKanbanTasks]);

  const getTaskColumnId = (task: SynthesizedTask): string => {
    if (groupingMode === "estado") {
      return `status-${task.status || "Pendiente"}`;
    }
    if (groupingMode === "prioridad") {
      const proj = projects.find(p => p.id === task.projectId);
      return `priority-${proj?.priority || "Sin Prioridad"}`;
    }
    if (groupingMode === "fecha") {
      const diff = getCalendarDaysDiff(task.dueDate);
      if (diff <= 0) return "hoy";
      if (diff === 1) return "manana";
      if (diff > 1 && diff <= 7) return "semana";
      return "mes";
    }
    if (groupingMode === "cliente") {
      const proj = projects.find(p => p.id === task.projectId);
      const client = proj?.client || "Cliente 1";
      const uniqueClients = Array.from(new Set(projects.map(p => p.client))).slice(0, 4);
      const idx = uniqueClients.indexOf(client);
      return `client-${idx !== -1 ? idx : 0}`;
    }
    return "";
  };

  const updateTaskColumn = (task: SynthesizedTask, newColumnId: string): SynthesizedTask => {
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
      return { ...task, fecha_programada: formatLocalDate(newDueDate), dueDate: newDueDate };
    }
    return task;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setDraggingTaskId(active.id as string);
    setHoveredColumnId(active.data.current?.colId || null);
    if (expandedCardId === active.id) {
      setExpandedCardId(null);
    }
    
    // Inicializar coordenadas para el efecto tilt
    lastPointerXRef.current = event.pointerCoordinates?.x ?? null;
    setDragRotation(0);

    playSound('click');
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const currentPointerX = event.pointerCoordinates?.x;
    if (currentPointerX == null) return;

    if (lastPointerXRef.current !== null) {
      const deltaX = currentPointerX - lastPointerXRef.current;
      const rotation = Math.max(-12, Math.min(12, deltaX * 0.5));
      setDragRotation(rotation);
    }

    lastPointerXRef.current = currentPointerX;

    if (pointerTimeoutRef.current) {
      clearTimeout(pointerTimeoutRef.current);
    }
    pointerTimeoutRef.current = setTimeout(() => {
      setDragRotation(0);
    }, 100);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeTask = localKanbanTasks.find(t => t.id === activeId);
    if (!activeTask) return;

    const activeColId = getTaskColumnId(activeTask);
    
    let overColId = overId;
    const overTask = localKanbanTasks.find(t => t.id === overId);
    if (overTask) {
      overColId = getTaskColumnId(overTask);
    }

    if (activeColId !== overColId) {
      setHoveredColumnId(overColId);
      setLocalKanbanTasks(prev => {
        return prev.map(t => {
          if (t.id === activeId) {
            return updateTaskColumn(t, overColId);
          }
          return t;
        });
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    // Limpiar estados y referencias del efecto tilt
    if (pointerTimeoutRef.current) {
      clearTimeout(pointerTimeoutRef.current);
    }
    setDragRotation(0);
    lastPointerXRef.current = null;
    
    if (!over) {
      setDraggingTaskId(null);
      setHoveredColumnId(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = localKanbanTasks.find(t => t.id === activeId);
    if (!activeTask) {
      setDraggingTaskId(null);
      setHoveredColumnId(null);
      return;
    }

    let overColId = overId;
    let overIndex = -1;

    const overTask = localKanbanTasks.find(t => t.id === overId);
    
    // Obtener las tareas filtradas de la columna destino
    const targetColTasks = localKanbanTasks.filter(t => {
      let colId = getTaskColumnId(t);
      if (overTask) {
        return colId === getTaskColumnId(overTask);
      }
      return colId === overColId;
    });

    if (overTask) {
      overColId = getTaskColumnId(overTask);
      overIndex = targetColTasks.findIndex(t => t.id === overId);
    } else {
      overIndex = targetColTasks.length;
    }

    setLocalKanbanTasks(prev => {
      const activeIdxGlobal = prev.findIndex(t => t.id === activeId);
      const overIdxGlobal = prev.findIndex(t => t.id === overId);

      let updated = [...prev];
      if (activeIdxGlobal !== -1 && overIdxGlobal !== -1) {
        updated = arrayMove(prev, activeIdxGlobal, overIdxGlobal);
      }
      return updated;
    });

    // Calcular el orderMap con incrementos de 10
    const finalColTasks = localKanbanTasks.filter(t => getTaskColumnId(t) === overColId);
    const orderMap: Record<string, number> = {};
    
    const orderedTaskIds = finalColTasks.map(t => t.id);
    const activeIndexCol = orderedTaskIds.indexOf(activeId);
    if (activeIndexCol !== -1) {
      orderedTaskIds.splice(activeIndexCol, 1);
    }
    
    let dropIndex = overIndex !== -1 ? overIndex : orderedTaskIds.length;
    dropIndex = Math.max(0, Math.min(dropIndex, orderedTaskIds.length));
    orderedTaskIds.splice(dropIndex, 0, activeId);

    orderedTaskIds.forEach((id, index) => {
      orderMap[id] = index * 10;
    });

    const parts = activeId.split("-");
    const projectId = parseInt(parts[1], 10);
    const taskNum = parseInt(parts[2], 10);

    // Obtener oldColId buscando la tarea original
    let oldColId: string | undefined = undefined;
    const project = projects.find(p => p.id === projectId);
    const originalTask = project?.tasks?.find(t => t.id === taskNum);
    if (originalTask) {
      if (groupingMode === "estado") {
        oldColId = `status-${originalTask.status || "Pendiente"}`;
      } else if (groupingMode === "prioridad") {
        oldColId = `priority-${project?.priority || "Sin Prioridad"}`;
      } else if (groupingMode === "fecha") {
        const origProgDate = originalTask.fecha_programada ? new Date(originalTask.fecha_programada + "T00:00:00") : new Date();
        const diff = getCalendarDaysDiff(origProgDate);
        if (diff <= 0) oldColId = "hoy";
        else if (diff === 1) oldColId = "manana";
        else if (diff > 1 && diff <= 7) oldColId = "semana";
        else oldColId = "mes";
      } else if (groupingMode === "cliente") {
        const uniqueClients = Array.from(new Set(projects.map(p => p.client))).slice(0, 4);
        const idx = uniqueClients.indexOf(project?.client || "");
        oldColId = `client-${idx !== -1 ? idx : 0}`;
      }
    }

    playSound(overColId !== oldColId ? 'whoosh' : 'pop');
    handleDropTask(activeId, projectId, oldColId, overColId, orderMap);

    setDraggingTaskId(null);
    setHoveredColumnId(null);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const view = params.get("view") as ViewMode;
      if (view && ["buscar", "kanban", "tabla", "timeline"].includes(view)) {
        onViewChange(view);
      }
    }
  }, [onViewChange]);

  const renderTaskCard = (
    taskId: string, 
    projectId: number, 
    projectName: string, 
    taskTitle: string, 
    completedTasks: number, 
    totalTasks: number, 
    taskIndex?: number, 
    desc?: string, 
    columnId?: string,
    forceCollapsed?: boolean
  ) => {
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    // Retrieve project and client names dynamically
    const project = projects.find(p => p.id === projectId);
    const clientName = project?.client || "Cliente";
    const projName = project?.title || projectName;
    const task = project?.tasks?.find(t => `kt-${projectId}-${t.id}` === taskId);

    if (!task) return null;

    // 1. Programada Date calculation
    const progDate = (task.fecha_programada ? new Date(task.fecha_programada + "T00:00:00") : (() => {
      let offset = 0;
      if (task.status === "Completado") offset = 12;
      else if (task.status === "En Proceso") offset = 0;
      else {
        if (task.id % 3 === 0) offset = 1;
        else if (task.id % 3 === 1) offset = 4;
        else offset = 15;
      }
      const d = new Date();
      d.setDate(d.getDate() + offset);
      return d;
    })());

    const formattedProgDate = progDate.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
    const diffProgDays = getCalendarDaysDiff(progDate);
    let relativeProgLabel = "";
    if (diffProgDays === 0) {
      relativeProgLabel = "Hoy";
    } else if (diffProgDays === 1) {
      relativeProgLabel = "Mañana";
    } else if (diffProgDays === -1) {
      relativeProgLabel = "Ayer";
    } else if (diffProgDays < -1) {
      relativeProgLabel = `Hace ${Math.abs(diffProgDays)} días`;
    } else {
      relativeProgLabel = `En ${diffProgDays} días`;
    }

    // 2. Entrega (Deadline) Date calculation
    const limitDate = (task.fecha_limite ? new Date(task.fecha_limite + "T00:00:00") : (task.deadline ? new Date(task.deadline + "T00:00:00") : (() => {
      let offset = 0;
      if (task.status === "Completado") offset = 12;
      else if (task.status === "En Proceso") offset = 0;
      else {
        if (task.id % 3 === 0) offset = 1;
        else if (task.id % 3 === 1) offset = 4;
        else offset = 15;
      }
      const d = new Date();
      d.setDate(d.getDate() + offset);
      return d;
    })()));

    const formattedLimitDate = limitDate.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
    const diffLimitDays = getCalendarDaysDiff(limitDate);
    let relativeLimitLabel = "";
    if (diffLimitDays === 0) {
      relativeLimitLabel = "Hoy";
    } else if (diffLimitDays === 1) {
      relativeLimitLabel = "Mañana";
    } else if (diffLimitDays === -1) {
      relativeLimitLabel = "Venció ayer";
    } else if (diffLimitDays < -1) {
      relativeLimitLabel = `Venció hace ${Math.abs(diffLimitDays)} días`;
    } else {
      relativeLimitLabel = `Vence en ${diffLimitDays} días`;
    }

    // 3. Creacion Date calculation
    const createdDate = (task.fecha_creacion ? new Date(task.fecha_creacion + "T00:00:00") : (() => {
      const d = new Date();
      const offset = 2 + (task.id % 5);
      d.setDate(d.getDate() - offset);
      return d;
    })());

    const shortCreationDate = (() => {
      const diffDays = getCalendarDaysDiff(createdDate);
      const relativeDays = Math.abs(diffDays);
      if (diffDays === 0) return "Creado hoy";
      if (diffDays === -1) return "Creado ayer";
      return `Creado hace ${relativeDays} días`;
    })();

    const formattedCreationDate = (() => {
      const monthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
      const day = createdDate.getDate();
      const month = monthNames[createdDate.getMonth()];
      const diffDays = getCalendarDaysDiff(createdDate);
      const relativeDays = Math.abs(diffDays);
      
      let relativePart = "";
      if (diffDays === 0) relativePart = "hoy";
      else if (diffDays === -1) relativePart = "ayer";
      else relativePart = `hace ${relativeDays} días`;

      return `Creado el ${day} de ${month} • ${relativePart}`;
    })();

    const isDragging = draggingTaskId === taskId;
    const isAnyCardDragging = draggingTaskId !== null;
    const isExpanded = forceCollapsed ? false : (isDragging ? false : (expandedCardId === taskId));

    return (
      <div
        onClick={(e) => {
          if (isDragging) return;
          const isDeselecting = expandedCardId === taskId;
          const container = e.currentTarget.closest('.task-list-scroll');
          if (container) {
            // Set flag to ignore scroll resets during height transition (650ms)
            (container as any)._ignoreScrollCollapse = true;
            const ignoreTimeout = (container as any)._ignoreScrollTimeout;
            if (ignoreTimeout) clearTimeout(ignoreTimeout);
            (container as any)._ignoreScrollTimeout = setTimeout(() => {
              (container as any)._ignoreScrollCollapse = false;
            }, 650);

            if (isDeselecting) {
              container.classList.add('hover-disabled');
              const cooldownTimeout = (container as any)._clickCooldownTimeout;
              if (cooldownTimeout) clearTimeout(cooldownTimeout);
              
              if (columnId) {
                const colTopIndex = columnScrollIndices[columnId] || 0;
                const targetScroll = colTopIndex * 160;
                container.scrollTop = targetScroll;
              }
              
              (container as any)._clickCooldownTimeout = setTimeout(() => {
                container.classList.remove('hover-disabled');
                if (columnId) {
                  const colTopIndex = columnScrollIndices[columnId] || 0;
                  const targetScroll = colTopIndex * 160;
                  container.scrollTop = targetScroll;
                }
              }, 600);
            }
          }
          setExpandedCardId(prev => prev === taskId ? null : taskId);
        }}
        className={`task-card w-full h-full rounded-[24px] bg-gradient-to-br from-[hsl(60_1.6%_9%)] to-[hsl(60_1.6%_7%)] border p-3.5 pb-3 flex flex-col justify-between transition-all duration-300 ease-out cursor-grab group relative overflow-hidden select-text ${
          isDragging 
            ? "border-sky-500/30 shadow-[0_0_15px_rgba(14,165,233,0.15)] bg-slate-900" 
            : isAnyCardDragging
              ? "border-white/[0.03]"
              : "border-white/[0.03] hover:border-white/10 hover:scale-[1.02] active:scale-[0.99]"
        }`}
      >
        
        {/* Top Group: Project Title & Icon & Task Title */}
        <div className="flex flex-col relative z-10">
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] font-semibold text-slate-500 select-none truncate max-w-[85%]">
              {isExpanded ? formattedCreationDate : shortCreationDate}
            </span>
            <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 shrink-0 transform translate-x-1 group-hover:translate-x-0">
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 hover:text-white transition-colors duration-200" />
            </div>
          </div>
          
          {/* Slide-Up Task Title */}
          <h4 className="task-card-title text-[15px] font-bold text-white tracking-normal leading-snug mt-1">
            {taskTitle}
          </h4>

          {/* Client & Project details & Description visible on hover */}
          <div className="task-card-details flex flex-col gap-1 mt-1.5 select-none pointer-events-auto z-20">
            {desc && (
              <p className="text-[12px] text-white/90 font-medium leading-[18px] line-clamp-3 max-w-[95%] mt-0.5">
                {desc}
              </p>
            )}
          </div>
        </div>

        {/* Dynamic task metadata properties block visible when expanded */}
        {isExpanded && (
          <>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 mt-2.5 relative z-30 pointer-events-auto text-[12px] font-semibold text-slate-400">
              {/* 1. Status Pill (kept as the only true pill, made slightly smaller) */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveStatusDropdownCardId(prev => prev === taskId ? null : taskId);
                    setActiveFormatDropdownCardId(null);
                    setIsAddingNewFormat(false);
                  }}
                  className={`flex items-center gap-1 h-6 px-2 rounded-full border text-[11px] font-bold transition-all duration-200 select-none shadow-sm ${
                    task.status === "Completado" 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20" 
                      : task.status === "En Proceso"
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20"
                        : "bg-slate-500/10 border-slate-500/20 text-slate-400 hover:bg-slate-500/20"
                  }`}
                >
                  <Flag className="w-2.5 h-2.5 shrink-0" />
                  <span>{task.status}</span>
                  <ChevronDown className="w-2 h-2 opacity-65" />
                </button>

                {activeStatusDropdownCardId === taskId && (
                  <div className="absolute left-0 bottom-full mb-1.5 w-36 rounded-xl bg-slate-950 border border-white/10 shadow-2xl p-1.5 flex flex-col gap-0.5 z-40 animate-fadeIn">
                    {(["Pendiente", "En Proceso", "Completado"] as const).map((st) => (
                      <button
                        key={st}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateTaskProperty(projectId, task.id, "status", st);
                          setActiveStatusDropdownCardId(null);
                        }}
                        className={`text-left px-3 py-1.5 text-[12px] font-bold rounded-lg flex items-center justify-between hover:bg-white/[0.06] transition-colors ${
                          task.status === st ? "text-white bg-white/5" : "text-slate-400"
                        }`}
                      >
                        <span>{st}</span>
                        {task.status === st && <Check className="w-2.5 h-2.5 text-emerald-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Separator Bullet */}
              <span className="text-slate-700 font-bold select-none pointer-events-none">•</span>

              {/* 2. Format (Type) as selectable text */}
              <div className="relative flex items-center gap-1 shrink-0">
                <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0 select-none pointer-events-none" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveFormatDropdownCardId(prev => prev === taskId ? null : taskId);
                    setActiveStatusDropdownCardId(null);
                    setIsAddingNewFormat(false);
                  }}
                  className="hover:underline hover:text-white text-[12px] font-semibold text-slate-450 hover:underline transition-all duration-150 flex items-center gap-0.5 capitalize"
                >
                  <span>{task.format || "Formato"}</span>
                  <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                </button>

                {activeFormatDropdownCardId === taskId && (
                  <div className="absolute left-0 bottom-full mb-1.5 w-44 max-h-48 overflow-y-auto rounded-xl bg-slate-950 border border-white/10 shadow-2xl p-1.5 flex flex-col gap-0.5 z-40 animate-fadeIn hide-scrollbar">
                    {availableFormats.map((fmt) => (
                      <button
                        key={fmt}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateTaskProperty(projectId, task.id, "format", fmt);
                          setActiveFormatDropdownCardId(null);
                        }}
                        className={`text-left px-3 py-1.5 text-[12px] font-bold rounded-lg flex items-center justify-between hover:bg-white/[0.06] transition-colors ${
                          task.format?.toLowerCase() === fmt.toLowerCase() ? "text-white bg-white/5" : "text-slate-400"
                        }`}
                      >
                        <span className="capitalize">{fmt}</span>
                        {task.format?.toLowerCase() === fmt.toLowerCase() && <Check className="w-2.5 h-2.5 text-emerald-400" />}
                      </button>
                    ))}
                    <div className="border-t border-white/5 my-0.5" />
                    
                    {isAddingNewFormat ? (
                      <div className="px-3 py-1.5 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <input
                          type="text"
                          autoFocus
                          value={newFormatValue}
                          onChange={(e) => setNewFormatValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newFormatValue.trim()) {
                              e.stopPropagation();
                              const val = newFormatValue.trim();
                              updateTaskProperty(projectId, task.id, "format", val);
                              if (!availableFormats.includes(val)) {
                                setAvailableFormats(prev => [...prev, val]);
                              }
                              setNewFormatValue("");
                              setIsAddingNewFormat(false);
                              setActiveFormatDropdownCardId(null);
                            } else if (e.key === "Escape") {
                              setIsAddingNewFormat(false);
                            }
                          }}
                          placeholder="Nuevo tipo..."
                          className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[12px] text-white focus:outline-none focus:border-emerald-500 w-full"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsAddingNewFormat(true);
                        }}
                        className="text-left px-3 py-1.5 text-[12px] font-bold text-emerald-450 hover:bg-emerald-500/10 rounded-lg flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Agregar nuevo...</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Date Comparison block matching attached image mockup layout */}
            <div className="mt-2.5 pt-2.5 border-t border-white/[0.04] flex flex-col gap-1 text-[12px] z-30 pointer-events-auto relative">
              {/* Row 0: Tiempo */}
              <div className="flex justify-between items-center relative">
                <span className="text-slate-500 font-semibold select-none">Tiempo</span>
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTimeDropdownCardId(prev => prev === taskId ? null : taskId);
                      setActiveStatusDropdownCardId(null);
                      setActiveFormatDropdownCardId(null);
                      setIsAddingCustomTime(false);
                    }}
                    className="hover:underline hover:text-white text-[12px] font-semibold text-slate-300 hover:underline transition-all duration-150 flex items-center gap-1"
                  >
                    <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0 select-none pointer-events-none" />
                    <span>{task.time || "Tiempo"}</span>
                    <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                  </button>

                  {activeTimeDropdownCardId === taskId && (
                    <div className="absolute right-0 bottom-full mb-1.5 w-44 max-h-48 overflow-y-auto rounded-xl bg-slate-950 border border-white/10 shadow-2xl p-1.5 flex flex-col gap-0.5 z-40 animate-fadeIn hide-scrollbar">
                      {(["15 min", "30 min", "1 hora", "2 horas", "3 horas o más"] as const).map((tOpt) => (
                        <button
                          key={tOpt}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateTaskProperty(projectId, task.id, "time", tOpt);
                            setActiveTimeDropdownCardId(null);
                          }}
                          className={`text-left px-3 py-1.5 text-[12px] font-bold rounded-lg flex items-center justify-between hover:bg-white/[0.06] transition-colors ${
                            task.time === tOpt ? "text-white bg-white/5" : "text-slate-400"
                          }`}
                        >
                          <span>{tOpt}</span>
                          {task.time === tOpt && <Check className="w-2.5 h-2.5 text-emerald-400" />}
                        </button>
                      ))}
                      <div className="border-t border-white/5 my-0.5" />
                      
                      {isAddingCustomTime ? (
                        <div className="px-3 py-1.5 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <input
                            type="text"
                            autoFocus
                            value={customTimeValue}
                            onChange={(e) => setCustomTimeValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && customTimeValue.trim()) {
                                e.stopPropagation();
                                const val = customTimeValue.trim();
                                updateTaskProperty(projectId, task.id, "time", val);
                                setCustomTimeValue("");
                                setIsAddingCustomTime(false);
                                setActiveTimeDropdownCardId(null);
                              } else if (e.key === "Escape") {
                                setIsAddingCustomTime(false);
                              }
                            }}
                            placeholder="Ej. 45 min, 4 horas..."
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[12px] text-white focus:outline-none focus:border-emerald-500 w-full"
                          />
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsAddingCustomTime(true);
                          }}
                          className="text-left px-3 py-1.5 text-[12px] font-bold text-emerald-400 hover:bg-emerald-500/10 rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Tiempo personalizado</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {/* Row 1: Programada */}
              <div className="flex justify-between items-center relative">
                <span className="text-slate-500 font-semibold select-none">Programada</span>
                <div className="relative">
                  <input
                    type="date"
                    id={`date-picker-prog-${taskId}`}
                    className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
                    value={task.fecha_programada || formatLocalDate(progDate)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      updateTaskProperty(projectId, task.id, "fecha_programada", e.target.value);
                    }}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const picker = document.getElementById(`date-picker-prog-${taskId}`) as HTMLInputElement;
                      if (picker) {
                        if (typeof picker.showPicker === "function") picker.showPicker();
                        else picker.click();
                      }
                    }}
                    className="text-slate-300 hover:text-white hover:underline transition-colors font-semibold"
                  >
                    {relativeProgLabel} • {formattedProgDate}
                  </button>
                </div>
              </div>

              {/* Row 2: Entrega */}
              <div className="flex justify-between items-center relative">
                <span className="text-slate-500 font-semibold select-none">Entrega</span>
                <div className="relative">
                  <input
                    type="date"
                    id={`date-picker-limit-${taskId}`}
                    className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
                    value={task.fecha_limite || task.deadline || formatLocalDate(limitDate)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      updateTaskProperty(projectId, task.id, "fecha_limite", e.target.value);
                    }}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const picker = document.getElementById(`date-picker-limit-${taskId}`) as HTMLInputElement;
                      if (picker) {
                        if (typeof picker.showPicker === "function") picker.showPicker();
                        else picker.click();
                      }
                    }}
                    className={`hover:underline transition-colors font-semibold ${
                      diffLimitDays < 0 
                        ? "text-rose-450 hover:text-rose-350"
                        : diffLimitDays === 0
                          ? "text-amber-450 hover:text-amber-350"
                          : "text-slate-300 hover:text-white"
                    }`}
                  >
                    {relativeLimitLabel} • {formattedLimitDate}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}


        {/* Bottom Group: Progress Bar */}
        <div className="flex flex-col gap-1.5 mt-auto relative z-10">
          {/* Project & Client Row */}
          <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500 mb-0.5 select-none pointer-events-auto z-20">
            <span 
              data-no-dnd
              onClick={(e) => {
                e.stopPropagation();
                onSelectProject?.(projectId);
                onSelectTab("proyectos");
              }}
              className="hover:underline hover:text-white cursor-pointer transition-colors duration-150 truncate max-w-[65%]"
            >
              {projName}
            </span>
            <span 
              data-no-dnd
              onClick={(e) => {
                e.stopPropagation();
                onSelectTab("clientes");
              }}
              className="hover:underline hover:text-white cursor-pointer transition-colors duration-150 truncate max-w-[32%] text-right"
            >
              {clientName}
            </span>
          </div>

          {/* Segmented Progress Bar */}
          <div className="flex gap-1.5 w-full">
            {(project?.tasks || []).map((tk, idx) => {
              const segmentColor = 
                tk.status === "Completado" 
                   ? "bg-emerald-500" 
                   : tk.status === "En Proceso" 
                     ? "bg-amber-500" 
                     : isNightMode 
                       ? "bg-white/[0.08]" 
                       : "bg-black/[0.08]";
              return (
                <div
                  key={idx}
                  className={`h-1 flex-1 rounded-full transition-all duration-500 ${segmentColor}`}
                />
              );
            })}
          </div>
          {/* Progress Percent Text */}
          <div className="progress-text-row flex items-center justify-between w-full text-[10px] text-slate-500 font-semibold select-none pointer-events-none mt-0.5">
            <span className="capitalize">tarea {taskIndex || completedTasks} de {totalTasks}</span>
            <span>{progressPercent}%</span>
          </div>
        </div>
      </div>
    );
  };

  const headerBgStyle = isNightMode ? "bg-white/[0.03]" : "bg-black/[0.03]";
  const bgStyle = headerBgStyle;
  const r1BgStyle = isNightMode ? "bg-[#111113]" : "bg-[#f8fafc]";
  const r1BorderStyle = isNightMode ? "border border-white/10" : "border border-slate-200";
  const cardBgStyle = isNightMode ? "bg-white/[0.04]" : "bg-black/[0.04]";

  return (
    <div className={`w-full h-full flex flex-col gap-5 hide-scrollbar pb-6 pr-2 pt-1 ${
      draggingTaskId ? "overflow-visible is-dragging-active" : "overflow-y-auto"
    }`}>
      <style>{`
        .task-list-scroll {
          scroll-snap-type: y mandatory;
          scroll-behavior: smooth;
        }
        /* Disable scroll-snap while hovering so the browser does not re-snap
           during accordion height animations (prevents flickering) */
        .task-list-scroll:has(.task-card-wrapper:hover),
        .task-list-scroll.hover-disabled,
        .task-list-scroll.is-scrolling {
          scroll-snap-type: none !important;
        }



        /* During scrolling or cooldown, force all wrappers to 150px and disable hover scale/pointer events */
        .task-list-scroll.is-scrolling .task-card-wrapper,
        .task-list-scroll.hover-disabled .task-card-wrapper {
          height: 150px !important;
          pointer-events: none !important;
        }
        /* Reset card internals to defaults during scroll/cooldown */
        .task-list-scroll.is-scrolling .task-card-title,
        .task-list-scroll.hover-disabled .task-card-title {
          transform: translateY(22px) !important;
        }
        .task-list-scroll.is-scrolling .project-title,
        .task-list-scroll.hover-disabled .project-title {
          transform: translateY(0) !important;
          opacity: 1 !important;
        }
        .task-list-scroll.is-scrolling .task-card-details,
        .task-list-scroll.hover-disabled .task-card-details {
          opacity: 0 !important;
          transform: translateY(22px) !important;
        }

        /* Wrapper clips inner card content directionally */
        .task-card-wrapper {
          height: 150px;
          overflow: hidden;
          border-radius: 24px;
          opacity: 1;
          transition: height 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: height, opacity;
          scroll-snap-align: start;
          scroll-margin-top: 10px;
          touch-action: none;
        }
        .task-card-wrapper.is-dragging-card {
          transition: none !important;
        }


        /* Hovered card expands to 220px (+70px from 150px baseline) ONLY when NO card is expanded double */
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)) .card-pos-0:hover,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)) .card-pos-1:hover,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)) .card-pos-2:hover {
          height: 220px !important;
          transition-delay: 180ms !important;
        }

        /* Neighbors shrink by -35px each when hovering one of the visible cards, ONLY when NO card is expanded double */
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-0:hover) .card-pos-1,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-0:hover) .card-pos-2,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-1:hover) .card-pos-0,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-1:hover) .card-pos-2,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-2:hover) .card-pos-0,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-2:hover) .card-pos-1 {
          height: 115px !important;
          transition-delay: 180ms !important;
        }
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-0:hover) .card-pos-1 .task-card,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-0:hover) .card-pos-2 .task-card,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-1:hover) .card-pos-0 .task-card,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-1:hover) .card-pos-2 .task-card,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-2:hover) .card-pos-0 .task-card,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-2:hover) .card-pos-1 .task-card {
          padding: 12px 14px 12px 14px !important;
          transition-delay: 180ms !important;
        }

        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-0:hover) .card-pos-1 .task-card-details,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-0:hover) .card-pos-2 .task-card-details,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-1:hover) .card-pos-0 .task-card-details,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-1:hover) .card-pos-2 .task-card-details,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-2:hover) .card-pos-0 .task-card-details,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-2:hover) .card-pos-1 .task-card-details {
          display: none !important;
        }

        /* Inner card transitions */
        .task-card {
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s ease-out, background-color 0.3s ease-out !important;
          will-change: transform, opacity;
        }

        /* Keep full opacity on all task cards */
        .task-card-wrapper .task-card {
          opacity: 1 !important;
        }

        /* Task title for all unhovered shrunk neighbor cards is translated to 0px, ONLY when NO card is expanded double */
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-0:hover) .card-pos-1 .task-card-title,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-0:hover) .card-pos-2 .task-card-title,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-1:hover) .card-pos-0 .task-card-title,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-1:hover) .card-pos-2 .task-card-title,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-2:hover) .card-pos-0 .task-card-title,
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)):has(.card-pos-2:hover) .card-pos-1 .task-card-title {
          transform: translateY(0px) !important;
          transition-delay: 180ms !important;
        }

        /* Project title (base rules) */
        .project-title {
          opacity: 1 !important;
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease-in-out !important;
          transform: translateY(0) !important;
        }
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)) .task-card-wrapper:hover .project-title {
          opacity: 0 !important;
          transition: opacity 0.12s ease-out !important;
          transition-delay: 180ms !important;
        }

        /* Task title (base rules) */
        .task-card-title {
          transform: translateY(22px) !important;
          transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), color 0.3s ease-out !important;
          will-change: transform;
        }
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)) .task-card-wrapper:hover .task-card-title {
          transform: translateY(0px) !important;
          color: #ffffff !important;
          transition-delay: 180ms !important;
        }

        /* Details group (base rules) */
        .task-card-details {
          max-height: 0 !important;
          opacity: 0 !important;
          overflow: hidden;
          transform: translateY(22px) !important;
          transition: max-height 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease-out !important;
          will-change: max-height, transform;
        }
        .task-list-scroll:not(.is-scrolling):not(.hover-disabled):not(:has(.is-expanded-double)) .task-card-wrapper:hover .task-card-details {
          max-height: 80px !important;
          opacity: 1 !important;
          transform: translateY(0px) !important;
          transition-delay: 180ms !important;
        }

        /* =====================================================
           DOUBLE EXPANSION CLICK STATE STYLES
           ===================================================== */
        /* Disable scroll-snap during double expansion to prevent browser fight */
        .task-list-scroll:has(.is-expanded-double) {
          scroll-snap-type: none !important;
        }

        /* Heights and visibility states for click expansion */
        .task-card-wrapper.is-expanded-double {
          height: 335px !important;
        }
        .task-card-wrapper.is-shrunk-sibling {
          height: 115px !important;
        }
        .task-card-wrapper.is-hidden-sibling {
          height: 0px !important;
          opacity: 0 !important;
          pointer-events: none !important;
          margin-top: 0 !important;
          margin-bottom: 0 !important;
        }
        .task-card-wrapper.is-hidden-sibling:has(~ .is-expanded-double) {
          transform: translateY(-40px) !important;
        }
        .is-expanded-double ~ .task-card-wrapper.is-hidden-sibling {
          transform: translateY(40px) !important;
        }

        /* Inner card transitions under click expansion */
        .is-expanded-double .task-card-title {
          transform: translateY(0px) !important;
          color: #ffffff !important;
        }
        .is-expanded-double .task-card-details {
          max-height: 180px !important;
          opacity: 1 !important;
          transform: translateY(0px) !important;
        }

        .is-shrunk-sibling .task-card {
          padding: 12px 14px 12px 14px !important;
        }
        .is-shrunk-sibling .task-card-title {
          transform: translateY(0px) !important;
        }
        .is-shrunk-sibling .task-card-details {
          display: none !important;
        }

        /* Override scale transitions when active selection exists */
        .task-list-scroll:has(.is-expanded-double) .task-card {
          transform: none !important;
        }
        .task-list-scroll:has(.is-expanded-double) .is-expanded-double .task-card {
          cursor: pointer !important;
        }
      `}</style>
      {/* 5 Expanded Clean Simple Rectangles Grid */}
      <div className="w-full grid grid-cols-12 gap-5 items-start">
        
        {/* Left Section (9 Columns) */}
        <div className="col-span-9 flex flex-col gap-5">
          {/* Active View Content (Borderless) */}
          <div className={`w-full h-[550px] relative ${draggingTaskId ? "overflow-visible" : "overflow-hidden"}`}>
              {/* 0. SEARCH VIEW */}
              {activeView === "buscar" && (
                <div className="w-full h-full flex flex-col gap-4 pt-1 animate-fadeIn">
                  <div className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl ${cardBgStyle} border border-white/5`}>
                    <Search className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Buscar proyectos, tareas, archivos o recursos..."
                      className="bg-transparent border-none outline-none text-xs text-white w-full placeholder:text-slate-500"
                      autoFocus
                    />
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Búsquedas recientes</span>
                    <div className="flex flex-col gap-2">
                      <div className={`w-full h-11 rounded-xl ${headerBgStyle} px-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors`}>
                        <div className="flex items-center gap-3">
                          <LayoutGrid className="w-4 h-4 text-orange-400 shrink-0" />
                          <span className="text-xs font-semibold text-slate-300">Proyecto Brandex OS v3</span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Proyecto</span>
                      </div>
                      <div className={`w-full h-11 rounded-xl ${headerBgStyle} px-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors`}>
                        <div className="flex items-center gap-3">
                          <Table className="w-4 h-4 text-blue-400 shrink-0" />
                          <span className="text-xs font-semibold text-slate-300">Base de datos de Clientes</span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Tabla</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* 1. KANBAN VIEW */}
              {activeView === "kanban" && (() => {
                const tasks = filteredKanbanTasks;
                
                // Define columns dynamically based on groupingMode
                let cols: { id: string; name: string; colorClass: string; badgeBg: string; badgeText: string; tasks: any[] }[] = [];

                if (groupingMode === "fecha") {
                  cols = [
                    {
                      id: "hoy",
                      name: "Hoy",
                      colorClass: "text-rose-450",
                      badgeBg: "bg-rose-400/20",
                      badgeText: "text-rose-300",
                      tasks: tasks.filter(t => getCalendarDaysDiff(t.dueDate) <= 0)
                    },
                    {
                      id: "manana",
                      name: "Mañana",
                      colorClass: "text-amber-400/80",
                      badgeBg: "bg-amber-400/20",
                      badgeText: "text-amber-300",
                      tasks: tasks.filter(t => getCalendarDaysDiff(t.dueDate) === 1)
                    },
                    {
                      id: "semana",
                      name: "Esta Semana",
                      colorClass: "text-cyan-400/80",
                      badgeBg: "bg-cyan-400/20",
                      badgeText: "text-cyan-300",
                      tasks: tasks.filter(t => {
                        const diff = getCalendarDaysDiff(t.dueDate);
                        return diff > 1 && diff <= 7;
                      })
                    },
                    {
                      id: "mes",
                      name: "Este Mes",
                      colorClass: "text-slate-400",
                      badgeBg: "bg-white/10",
                      badgeText: "text-slate-400",
                      tasks: tasks.filter(t => {
                        const diff = getCalendarDaysDiff(t.dueDate);
                        return diff > 7 && diff <= 30;
                      })
                    }
                  ];
                } else if (groupingMode === "cliente") {
                  // Group by unique clients
                  const uniqueClients = Array.from(new Set(projects.map(p => p.client))).slice(0, 4);
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
                      tasks: tasks.filter(t => {
                        const proj = projects.find(p => p.id === t.projectId);
                        return proj ? proj.client === client : false;
                      })
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
                      tasks: tasks.filter(t => {
                        const proj = projects.find(p => p.id === t.projectId);
                        const projPriority = proj?.priority || "Normal";
                        return projPriority === priority;
                      })
                    };
                  });
                } else {
                  // groupingMode === "estado"
                  const statuses = ["Pendiente", "En Proceso", "Completado", "Revisión"];
                  const colors = [
                    { text: "text-rose-450", bg: "bg-rose-400/20", badge: "text-rose-300" },
                    { text: "text-amber-400/85", bg: "bg-amber-400/20", badge: "text-amber-300" },
                    { text: "text-emerald-400/90", bg: "bg-emerald-400/20", badge: "text-emerald-300" },
                    { text: "text-slate-400", bg: "bg-white/10", badge: "text-slate-400" },
                  ];

                  cols = statuses.map((status, idx) => {
                    const cStyle = colors[idx % colors.length];
                    return {
                      id: `status-${status}`,
                      name: status,
                      colorClass: cStyle.text,
                      badgeBg: cStyle.bg,
                      badgeText: cStyle.badge,
                      tasks: tasks.filter(t => {
                        if (status === "Revisión") {
                          const proj = projects.find(p => p.id === t.projectId);
                          return proj?.status === "En Revisión Interna";
                        }
                        return t.status === status;
                      })
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
                    autoScroll={{ threshold: { x: 0, y: 0.2 }, acceleration: 10 }}
                  >
                    <div 
                      ref={boardRef}
                      className={`w-full h-full relative grid grid-cols-4 gap-5 pt-1 animate-fadeIn ${
                        draggingTaskId ? "overflow-visible z-30 is-dragging-active" : "overflow-hidden"
                      }`}
                    >
                      {cols.map(col => {
                        const isHovered = hoveredColumnId === col.id;
                        const colTasks = (localKanbanTasks.length > 0 ? localKanbanTasks : filteredKanbanTasks)
                          .filter(t => getTaskColumnId(t) === col.id);
                        
                        return (
                          <ColumnContainer
                            key={col.id}
                            col={{ ...col, tasks: colTasks }}
                            headerBgStyle={headerBgStyle}
                            draggingTaskId={draggingTaskId}
                            isHovered={isHovered}
                          >
                            <div className="flex items-center justify-between px-1 mb-1 shrink-0">
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${col.colorClass}`}>{col.name}</span>
                              <span className={`w-4 h-4 rounded-full ${col.badgeBg} text-[9px] ${col.badgeText} flex items-center justify-center font-mono font-bold`}>{colTasks.length}</span>
                            </div>
                            
                            <SortableContext
                              id={col.id}
                              items={colTasks.map(t => t.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              <div 
                                ref={(el) => {
                                  if (el) {
                                    setTimeout(() => {
                                      updateVisibleCards(el);
                                    }, 0);
                                    const topIndex = Math.round(el.scrollTop / 160);
                                    setColumnScrollIndices(prev => {
                                      if (prev[col.id] === topIndex) return prev;
                                      return { ...prev, [col.id]: topIndex };
                                    });
                                  }
                                }}
                                className={`task-list-scroll relative h-[490px] hide-scrollbar flex flex-col gap-2.5 px-2 py-2.5 -mx-2 overflow-y-auto ${
                                  draggingTaskId 
                                    ? (isHovered ? "z-50" : "z-10") 
                                    : "z-10"
                                }`}
                                style={{
                                  overflowX: draggingTaskId ? "visible" : "hidden"
                                }}
                                onScroll={(e) => {
                                  const container = e.currentTarget;
                                  if ((container as any)._ignoreScrollCollapse) {
                                    return;
                                  }
                                  container.classList.add('is-scrolling', 'hover-disabled');
                                  setExpandedCardId(null);
                                  
                                  const scrollTimeout = (container as any)._scrollTimeout;
                                  if (scrollTimeout) clearTimeout(scrollTimeout);
                                  
                                  const cooldownTimeout = (container as any)._cooldownTimeout;
                                  if (cooldownTimeout) clearTimeout(cooldownTimeout);
                                  
                                  (container as any)._scrollTimeout = setTimeout(() => {
                                    container.classList.remove('is-scrolling');
                                    updateVisibleCards(container);
                                    
                                    const topIndex = Math.round(container.scrollTop / 160);
                                    setColumnScrollIndices(prev => {
                                      if (prev[col.id] === topIndex) return prev;
                                      return { ...prev, [col.id]: topIndex };
                                    });
                                    
                                    (container as any)._cooldownTimeout = setTimeout(() => {
                                      container.classList.remove('hover-disabled');
                                    }, 250);
                                  }, 150);
                                }}
                              >
                                {colTasks.map((t) => {
                                  const colTopIndex = columnScrollIndices[col.id] || 0;
                                  const isColumnExpanded = colTasks.some(tk => tk.id === expandedCardId);
                                  
                                  const tasksIdx = colTasks.findIndex(tk => tk.id === t.id);
                                  const relativeIndex = tasksIdx - colTopIndex;

                                  let extraClass = "";
                                  if (isColumnExpanded) {
                                    const expandedIdx = colTasks.findIndex(tk => tk.id === expandedCardId);
                                    const expandedRelativeIndex = expandedIdx - colTopIndex;
                                    
                                    if (t.id === expandedCardId) {
                                      extraClass = "is-expanded-double";
                                    } else if (relativeIndex < 0) {
                                      extraClass = "";
                                    } else {
                                      extraClass = "is-hidden-sibling";
                                      if (expandedRelativeIndex === 0 && relativeIndex === 1) {
                                        extraClass = "is-shrunk-sibling";
                                      } else if (expandedRelativeIndex === 1 && relativeIndex === 2) {
                                        extraClass = "is-shrunk-sibling";
                                      } else if (expandedRelativeIndex === 2 && relativeIndex === 1) {
                                        extraClass = "is-shrunk-sibling";
                                      }
                                    }
                                  }

                                  return (
                                    <SortableTaskCard
                                      key={`kt-${t.projectId}-${t.id}`}
                                      t={t}
                                      extraClass={extraClass}
                                      renderTaskCard={renderTaskCard}
                                      colId={col.id}
                                    />
                                  );
                                })}
                              </div>
                            </SortableContext>
                          </ColumnContainer>
                        );
                      })}
                    </div>

                    <DragOverlay adjustScale={false} dropAnimation={dropAnimation}>
                      {draggingTaskId ? (() => {
                        const parts = draggingTaskId.split("-");
                        const projectId = parseInt(parts[1], 10);
                        const taskIdNum = parseInt(parts[2], 10);
                        const task = kanbanTasks.find(t => t.id === taskIdNum && t.projectId === projectId);
                        if (!task) return null;
                        return (
                          <div 
                            className="task-card-wrapper pointer-events-none scale-[1.03] shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)]"
                            style={{ height: 150 }}
                          >
                            {renderTaskCard(draggingTaskId, task.projectId, task.projectName, task.taskTitle, task.completedTasks, task.totalTasks, task.taskIndex, task.desc, "", true)}
                          </div>
                        );
                      })() : null}
                    </DragOverlay>
                  </DndContext>
                );
              })()}

              {/* 2. TABLA / BASE DE DATOS VIEW */}
              {activeView === "tabla" && (
                <div className="w-full h-full flex flex-col gap-3 pt-1 animate-fadeIn overflow-hidden">
                  
                  {/* Sub-view Switcher Toggle */}
                  <div className="flex items-center gap-2 mb-1 shrink-0">
                    <button
                      onClick={() => setDbSubView("proyectos")}
                      className={`text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all ${
                        dbSubView === "proyectos"
                          ? "bg-white/10 border-white/20 text-white"
                          : "bg-transparent border-white/5 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Proyectos
                    </button>
                    <button
                      onClick={() => setDbSubView("tareas")}
                      className={`text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all ${
                        dbSubView === "tareas"
                          ? "bg-white/10 border-white/20 text-white"
                          : "bg-transparent border-white/5 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Tareas
                    </button>
                  </div>

                  {dbSubView === "proyectos" ? (
                    <div className="w-full h-[500px] overflow-y-auto hide-scrollbar flex flex-col gap-2">
                      {/* Table Header */}
                      <div className={`w-full h-9 rounded-xl ${headerBgStyle} px-4 flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0`}>
                        <div className="w-2/5">Proyecto</div>
                        <div className="w-1/5 text-center">Estado</div>
                        <div className="w-1/5 text-center">Presupuesto</div>
                        <div className="w-1/5 text-center">Progreso</div>
                        <div className="w-10 shrink-0 text-right">Detalle</div>
                      </div>
                      
                      {/* Project Rows */}
                      {projects.map(p => {
                        const isCompleted = p.status === "Completado";
                        const isPausado = p.status === "Pausado";
                        const statusColor = isCompleted
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : isPausado
                          ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                          : "bg-amber-500/20 text-amber-400 border-amber-500/30";

                        const dotColor = isCompleted
                          ? "bg-emerald-400"
                          : isPausado
                          ? "bg-rose-400"
                          : "bg-amber-400";

                        return (
                          <div key={p.id} className={`w-full h-12 rounded-xl ${cardBgStyle} px-4 flex items-center text-xs border border-white/5 shrink-0`}>
                            <div className="w-2/5 flex items-center gap-3">
                              <div className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0`} />
                              <span className="font-bold text-slate-200 truncate">{p.title}</span>
                            </div>
                            <div className="w-1/5 flex justify-center">
                              <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${statusColor}`}>
                                {p.status}
                              </span>
                            </div>
                            <div className="w-1/5 text-center font-mono font-bold text-slate-300">{p.cost || "$0"}</div>
                            <div className="w-1/5 flex flex-col gap-1 items-center px-2">
                              <span className="text-[9px] text-slate-400 font-bold">{p.percent || "0%"}</span>
                              <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden">
                                <div className="h-full bg-slate-400" style={{ width: p.percent || "0%" }} />
                              </div>
                            </div>
                            <div className="w-10 shrink-0 flex justify-end">
                              <button
                                onClick={() => {
                                  onSelectProject?.(p.id);
                                  onSelectTab("proyectos");
                                }}
                                className="text-slate-400 hover:text-white transition-colors p-1"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="w-full h-[500px] overflow-y-auto hide-scrollbar flex flex-col gap-2">
                      {/* Tasks Header */}
                      <div className={`w-full h-9 rounded-xl ${headerBgStyle} px-4 flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0`}>
                        <div className="w-2/5">Tarea</div>
                        <div className="w-1/5">Proyecto</div>
                        <div className="w-1/5 text-center">Formato</div>
                        <div className="w-1/5 text-center">Tiempo</div>
                        <div className="w-1/5 text-center">Estado</div>
                        <div className="w-10 shrink-0 text-right">Ir</div>
                      </div>

                      {/* Task Rows */}
                      {kanbanTasks.map(t => {
                        const isCompleted = t.status === "Completado";
                        const isProcess = t.status === "En Proceso";
                        const statusBadge = isCompleted
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                          : isProcess
                          ? "bg-amber-500/25 text-amber-400 border-amber-500/20"
                          : "bg-white/5 text-slate-400 border-white/5";

                        return (
                          <div key={t.id} className={`w-full h-12 rounded-xl ${cardBgStyle} px-4 flex items-center text-xs border border-white/5 shrink-0`}>
                            <div className="w-2/5 font-bold text-slate-200 truncate pr-2">{t.taskTitle}</div>
                            <div className="w-1/5 text-slate-400 truncate pr-2">{t.projectName}</div>
                            <div className="w-1/5 text-center text-slate-400 font-semibold uppercase text-[9px]">{t.format || "-"}</div>
                            <div className="w-1/5 text-center font-mono text-slate-300 font-semibold">{t.time || "-"}</div>
                            <div className="w-1/5 flex justify-center">
                              <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${statusBadge}`}>
                                {t.status}
                              </span>
                            </div>
                            <div className="w-10 shrink-0 flex justify-end">
                              <button
                                onClick={() => {
                                  onSelectProject?.(t.projectId);
                                  onSelectTab("proyectos");
                                }}
                                className="text-slate-400 hover:text-white transition-colors p-1"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 3. TIMELINE VIEW */}
              {activeView === "timeline" && (
                <div className="w-full h-full flex flex-col gap-3 pt-1 animate-fadeIn overflow-hidden">
                  {/* Timeline Header (Weeks indicator) */}
                  <div className={`w-full h-8 rounded-xl ${headerBgStyle} px-4 flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider`}>
                    <div className="w-1/4">Proyecto</div>
                    <div className="w-3/4 grid grid-cols-4 text-center border-l border-white/5 h-full items-center">
                      <span className="border-r border-white/5 h-full flex items-center justify-center">Sem 1</span>
                      <span className="border-r border-white/5 h-full flex items-center justify-center">Sem 2</span>
                      <span className="border-r border-white/5 h-full flex items-center justify-center">Sem 3</span>
                      <span className="h-full flex items-center justify-center">Sem 4</span>
                    </div>
                  </div>

                  {/* Timeline Project Rows */}
                  <div className="flex flex-col gap-2.5">
                    {/* Row 1: Diseño Brandex OS (Semana 1 - Semana 2) */}
                    <div className={`w-full h-12 rounded-xl ${cardBgStyle} px-4 flex items-center border border-white/5`}>
                      <div className="w-1/4 flex items-center gap-2 pr-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                        <span className="text-[10px] font-bold text-slate-200 truncate">Diseño Brandex</span>
                      </div>
                      <div className="w-3/4 h-full relative flex items-center border-l border-white/5">
                        <div className="absolute left-[2%] w-[46%] h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between px-2 cursor-pointer hover:bg-emerald-500/20 transition-colors" onClick={() => onSelectTab("proyectos")}>
                          <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-wider">100% Listo</span>
                          <ExternalLink className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Web Corporativa (Semana 2 - Semana 4) */}
                    <div className={`w-full h-12 rounded-xl ${cardBgStyle} px-4 flex items-center border border-white/5`}>
                      <div className="w-1/4 flex items-center gap-2 pr-2">
                        <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                        <span className="text-[10px] font-bold text-slate-200 truncate">Web Corp</span>
                      </div>
                      <div className="w-3/4 h-full relative flex items-center border-l border-white/5">
                        <div className="absolute left-[27%] w-[71%] h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-between px-2 cursor-pointer hover:bg-amber-500/20 transition-colors" onClick={() => onSelectTab("proyectos")}>
                          <span className="text-[8px] font-bold text-amber-400 uppercase tracking-wider">33% en desarrollo</span>
                          <ExternalLink className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                        </div>
                      </div>
                    </div>

                    {/* Row 3: Campaña Ads (Semana 3 - Semana 4) */}
                    <div className={`w-full h-12 rounded-xl ${cardBgStyle} px-4 flex items-center border border-white/5`}>
                      <div className="w-1/4 flex items-center gap-2 pr-2">
                        <div className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                        <span className="text-[10px] font-bold text-slate-200 truncate">Campaña Ads</span>
                      </div>
                      <div className="w-3/4 h-full relative flex items-center border-l border-white/5">
                        <div className="absolute left-[52%] w-[46%] h-6 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-between px-2 cursor-pointer hover:bg-orange-500/20 transition-colors" onClick={() => onSelectTab("proyectos")}>
                          <span className="text-[8px] font-bold text-orange-400 uppercase tracking-wider">Por empezar (0%)</span>
                          <ExternalLink className="w-2.5 h-2.5 text-orange-400 shrink-0" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          {/* Bottom Left Row: 2 Equal Rectangles - Expanded */}
          <div className="grid grid-cols-2 gap-5">
            {/* [R3] Bottom-Left Rectangle 1 - Expanded */}
            <div
              className={`h-[180px] rounded-[28px] ${bgStyle}`}
            />

            {/* [R4] Bottom-Left Rectangle 2 - Expanded */}
            <div
              className={`h-[180px] rounded-[28px] ${bgStyle}`}
            />
          </div>
        </div>

        {/* Right Section (3 Columns) */}
        <div className="col-span-3 flex flex-col gap-5">
          {/* [R5] Tall Right Rectangle - Expanded Downwards */}
          <div
            className={`w-full h-[550px] rounded-[28px] ${bgStyle} p-5 flex flex-col items-center justify-between overflow-hidden relative`}
          >
            {/* KPIs container */}
            <div className="w-full flex flex-col gap-4 items-center mt-1">
              {/* Row 1: LED Counters */}
              <div className="flex items-center justify-around w-full px-1">
                {/* Counter 1: Projects */}
                <div className="relative flex items-center pr-8">
                  <span 
                    className="tracking-tight transition-colors duration-500"
                    style={{ 
                      fontFamily: "'LedCounter', monospace", 
                      fontSize: "32px",
                      color: isNightMode ? '#fafafa' : '#0f172a',
                      textShadow: isNightMode
                        ? '0 0 16px rgba(255,255,255,0.2)'
                        : '0 0 12px rgba(0,0,0,0.05)'
                    }}
                  >
                    {String(totalProjects).padStart(2, '0')}
                  </span>
                  <span className={`absolute top-0 right-0 px-1 py-0.5 rounded-full text-[6px] font-bold tracking-widest uppercase transition-all duration-500 border ${
                    isNightMode
                      ? 'bg-neutral-900 border-neutral-800 text-neutral-300'
                      : 'bg-slate-100 border-slate-200 text-slate-800'
                  }`}>
                    proy.
                  </span>
                </div>

                {/* Divider */}
                <div className={`w-px h-6 self-center transition-colors duration-500 ${isNightMode ? 'bg-white/10' : 'bg-slate-200'}`} />

                {/* Counter 2: Tasks */}
                <div className="relative flex items-center pr-8">
                  <span 
                    className="tracking-tight transition-colors duration-500"
                    style={{ 
                      fontFamily: "'LedCounter', monospace", 
                      fontSize: "32px",
                      color: isNightMode ? '#fafafa' : '#0f172a',
                      textShadow: isNightMode
                        ? '0 0 16px rgba(255,255,255,0.2)'
                        : '0 0 12px rgba(0,0,0,0.05)'
                    }}
                  >
                    {String(totalTasks).padStart(2, '0')}
                  </span>
                  <span className={`absolute top-0 right-0 px-1 py-0.5 rounded-full text-[6px] font-bold tracking-widest uppercase transition-all duration-500 border ${
                    isNightMode
                      ? 'bg-neutral-900 border-neutral-800 text-neutral-300'
                      : 'bg-slate-100 border-slate-200 text-slate-800'
                  }`}>
                    tareas
                  </span>
                </div>

                {/* Divider */}
                <div className={`w-px h-6 self-center transition-colors duration-500 ${isNightMode ? 'bg-white/10' : 'bg-slate-200'}`} />

                {/* Counter 3: Hours */}
                <div className="relative flex items-center pr-9">
                  <span 
                    className="tracking-tight transition-colors duration-500"
                    style={{ 
                      fontFamily: "'LedCounter', monospace", 
                      fontSize: "32px",
                      color: isNightMode ? '#fafafa' : '#0f172a',
                      textShadow: isNightMode
                        ? '0 0 16px rgba(255,255,255,0.2)'
                        : '0 0 12px rgba(0,0,0,0.05)'
                    }}
                  >
                    {String(totalHours).padStart(3, '0')}
                  </span>
                  <span className={`absolute top-0 right-0 px-1 py-0.5 rounded-full text-[6px] font-bold tracking-widest uppercase transition-all duration-500 border ${
                    isNightMode
                      ? 'bg-neutral-900 border-neutral-800 text-neutral-300'
                      : 'bg-slate-100 border-slate-200 text-slate-800'
                  }`}>
                    horas
                  </span>
                </div>
              </div>

              {/* Row 2: Financial Stats Bar */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-2 w-full text-[9px] font-medium tracking-tight px-1.5 mt-0.5">
                {/* Metric 1: MRR Facturación */}
                <div className="flex items-center gap-1 shrink-0" title="Ingresos Mensuales Recurrentes">
                  <TrendingUp className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span className={isNightMode ? 'text-slate-200' : 'text-slate-700'}>
                    +$48.5k <span className="opacity-60 text-[7px] uppercase font-sans font-bold">MRR</span>
                  </span>
                </div>

                {/* Metric 2: Margen Operativo */}
                <div className="flex items-center gap-1 shrink-0" title="Margen Operativo Neto">
                  <ArrowUpRight className="w-3 h-3 text-sky-500 shrink-0" />
                  <span className={isNightMode ? 'text-slate-200' : 'text-slate-700'}>
                    68.5% <span className="opacity-60 text-[7px] uppercase font-sans font-bold">Margen</span>
                  </span>
                </div>

                {/* Metric 3: Por Cobrar */}
                <div className="flex items-center gap-1 shrink-0" title="Cuentas por Cobrar Pendientes">
                  <Wallet className="w-3 h-3 text-amber-500 shrink-0" />
                  <span className={isNightMode ? 'text-slate-200' : 'text-slate-700'}>
                    $18.2k <span className="opacity-60 text-[7px] uppercase font-sans font-bold">Cobro</span>
                  </span>
                </div>

                {/* Metric 4: Eficiencia Operativa */}
                <div className="flex items-center gap-1 shrink-0" title="Eficiencia de Entregables">
                  <Activity className="w-3 h-3 text-purple-500 shrink-0" />
                  <span className={isNightMode ? 'text-slate-200' : 'text-slate-700'}>
                    94.8% <span className="opacity-60 text-[7px] uppercase font-sans font-bold">Efic.</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Separator Line */}
            <div className={`w-full h-px transition-colors duration-500 ${isNightMode ? 'bg-white/5' : 'bg-slate-200'} my-1 shrink-0`} />

            {/* Time Heatmap */}
            <div className="w-full flex justify-center pb-1.5 scale-90 origin-center shrink-0">
              <div className="flex flex-col gap-1.5 items-center w-full">
                <span className={`text-[8px] font-bold uppercase tracking-widest ${isNightMode ? 'text-zinc-500' : 'text-slate-400'}`}>Actividad de Tareas</span>
                <TimeHeatmap 
                  tasks={projects.reduce<Task[]>((acc, p) => acc.concat(p.tasks || []), [])}
                  isNeumorphic={isNeumorphic}
                  isNightMode={isNightMode}
                />
              </div>
            </div>
          </div>

          {/* [R2] Top-Right Small Rectangle - Expanded */}
          <div
            className={`w-full h-[180px] rounded-[26px] ${bgStyle}`}
          />
        </div>

      </div>


    </div>
  );
}
