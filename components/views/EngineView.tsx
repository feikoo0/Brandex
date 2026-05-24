"use client";

import { useState } from "react";
import { useData } from "@/hooks/useData";
import { TASK_ESTADO_OPTS, STATUS_COLORS } from "@/lib/constants";
import { useUIStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Loader2, Plus, MoreHorizontal, GripVertical } from "lucide-react";
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable, pointerWithin } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

// ── DND Componentes ──
function DraggableTask({ task, onClick }: { task: any; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 rounded-xl glass hover:border-white/20 transition-all cursor-pointer group flex flex-col gap-2 ${isDragging ? "shadow-2xl z-50 ring-2 ring-blue-500" : ""}`}
    >
      <div className="flex items-start gap-2">
        <div {...listeners} {...attributes} className="mt-0.5 cursor-grab active:cursor-grabbing text-white/20 hover:text-white/50">
          <GripVertical className="w-4 h-4" />
        </div>
        <div onClick={onClick} className="flex-1 text-xs font-bold leading-snug group-hover:text-blue-400 transition-colors">
          {task.titulo || "Sin título"}
        </div>
      </div>
      <div className="flex items-center justify-between pl-6" onClick={onClick}>
        <div className="flex items-center gap-1.5">
          {task.formato && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-white/40 border border-white/5">
              {task.formato}
            </span>
          )}
        </div>
        <div className="text-[10px] font-medium text-white/30 italic">
          {task.asignado || "Sin asignar"}
        </div>
      </div>
    </div>
  );
}

function DroppableCol({ id, title, count, color, children }: { id: string, title: string, count: number, color: string, children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className="w-[280px] flex flex-col rounded-2xl p-3 transition-colors"
      style={{ background: isOver ? "rgba(255,255,255,.05)" : "rgba(255,255,255,.02)", border: `1px solid ${isOver ? color : "var(--border)"}` }}
    >
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
          <span className="text-xs font-black uppercase tracking-widest leading-none">
            {title}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-white/40 font-bold">
            {count}
          </span>
        </div>
        <MoreHorizontal className="w-4 h-4 text-white/20" />
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar min-h-[100px]">
        {children}
      </div>
    </div>
  );
}

export function EngineView() {
  const { data, isLoading } = useData();
  const openModal = useUIStore((s) => s.openModal);
  const [activeTask, setActiveTask] = useState<any | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const tasks = data?.tareas ?? [];

  const cols = TASK_ESTADO_OPTS.map((status) => ({
    id: status,
    label: status,
    color: STATUS_COLORS[status] || "#333",
  }));

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const oldStatus = active.data.current?.task.estado || "";
    const newStatus = over.id as string;

    if (oldStatus === newStatus) return;

    await fetch("/api/task/update", {
      method: "PATCH",
      body: JSON.stringify({ id: taskId, estado: newStatus })
    });
  };

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Engine — Kanban</h2>
          <p className="text-sm" style={{ color: "var(--txt3)" }}>
            Gestiona el flujo de trabajo en tiempo real
          </p>
        </div>
        <button 
          onClick={() => openModal({ type: "task", id: "new" })}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: "var(--blue)", color: "#fff" }}
        >
          <Plus className="w-4 h-4" />
          Nueva Tarea
        </button>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <DndContext 
          collisionDetection={pointerWithin}
          onDragStart={(e) => setActiveTask(e.active.data.current?.task)}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full min-w-max pb-4">
            {cols.map((col) => {
              const colTasks = tasks.filter(t => t.estado === col.id);
              return (
                <DroppableCol key={col.id} id={col.id} title={col.label} count={colTasks.length} color={col.color}>
                  {colTasks.map(t => (
                    <DraggableTask key={t.id} task={t} onClick={() => openModal({ type: "task", id: t.id })} />
                  ))}
                  {colTasks.length === 0 && (
                    <div className="py-12 flex flex-col items-center justify-center opacity-20">
                      <div className="w-8 h-8 rounded-lg border-2 border-dashed border-current mb-2" />
                      <span className="text-[10px] font-bold">VACÍO</span>
                    </div>
                  )}
                </DroppableCol>
              );
            })}
          </div>

          <DragOverlay>
            {activeTask ? (
              <div className="p-3 bg-black rounded-xl border border-white/20 shadow-2xl opacity-90 scale-105">
                <div className="text-xs font-bold text-white mb-2">{activeTask.titulo}</div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
