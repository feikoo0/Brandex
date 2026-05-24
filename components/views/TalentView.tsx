"use client";

import { useState } from "react";
import { useData } from "@/hooks/useData";
import { useUIStore } from "@/lib/store";
import { Loader2, UserPlus, GripVertical } from "lucide-react";
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable, pointerWithin } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { STATUS_COLORS } from "@/lib/constants";

// ── Components para DND ──
function DraggableTask({ task, onClick }: { task: any; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };
  const col = STATUS_COLORS[task.estado] || "#333";

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
        <div className="flex gap-1">
          {task.formato && <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/40 border border-white/5">{task.formato}</span>}
          {task.prioridad && <span className="text-[9px] px-1.5 py-0.5 rounded border border-white/5 text-white/70">{task.prioridad}</span>}
        </div>
        <div style={{ background: col, width: 8, height: 8, borderRadius: "50%" }} />
      </div>
    </div>
  );
}

function DroppableCol({ id, title, count, children }: { id: string, title: string, count: number, children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className="w-[280px] flex flex-col rounded-2xl p-3 transition-colors"
      style={{ background: isOver ? "rgba(58,123,213,.1)" : "rgba(255,255,255,.02)", border: `1px solid ${isOver ? "#3a7bd5" : "var(--border)"}` }}
    >
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-widest leading-none text-white/70">
            {title}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-white/40 font-bold">
            {count}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar min-h-[100px]">
        {children}
      </div>
    </div>
  );
}

export function TalentView() {
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
  const workers = data?.trabajadores ?? [];

  // Agrupamos tareas por asignado. "" -> Sin asignar.
  const cols = [
    { id: "unassigned", label: "Sin Asignar", name: "" },
    ...workers.map(w => ({ id: w.nombre, label: w.nombre, name: w.nombre }))
  ];

  // For optimistic updates during drag
  // In a real app we'd dispatch to mutation, but since Notion takes time, 
  // maybe we just rely on refetching. But wait, we can just call an API to update.
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const oldAssignee = active.data.current?.task.asignado || "";
    let newAssignee = over.id as string;
    if (newAssignee === "unassigned") newAssignee = "";

    if (oldAssignee === newAssignee) return;

    // TODO: Update via API hook here
    await fetch("/api/task/update", {
      method: "PATCH",
      body: JSON.stringify({ id: taskId, asignado: newAssignee })
    });
    // Invalida cache en tu setup actual (el useData auto re-fetcheará pronto si cambias de tab)
    // o el usuario puede darle "Sincronizar"
  };

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Talento — Asignación</h2>
          <p className="text-sm" style={{ color: "var(--txt3)" }}>
            Asigna tareas al equipo arrastrando y soltando
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <DndContext 
          collisionDetection={pointerWithin} 
          onDragStart={(e) => setActiveTask(e.active.data.current?.task)}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full min-w-max pb-4">
            {cols.map((col) => {
              const colTasks = tasks.filter(t => (t.asignado || "") === col.name);
              return (
                <DroppableCol key={col.id} id={col.id} title={col.label} count={colTasks.length}>
                  {colTasks.map(t => (
                    <DraggableTask key={t.id} task={t} onClick={() => openModal({ type: "task", id: t.id })} />
                  ))}
                  {colTasks.length === 0 && (
                    <div className="py-8 flex flex-col items-center justify-center opacity-20 border-2 border-dashed border-white/10 rounded-xl">
                      <span className="text-[10px] font-bold">Sin tareas</span>
                    </div>
                  )}
                </DroppableCol>
              );
            })}
          </div>

          <DragOverlay>
            {activeTask ? (
              <div className="p-3 rounded-xl bg-black border border-white/20 shadow-2xl opacity-90 scale-105">
                <div className="text-xs font-bold text-white mb-2">{activeTask.titulo}</div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
