"use client";

import { useState, useMemo } from "react";
import { useData } from "@/hooks/useData";
import { useUIStore } from "@/lib/store";
import { Loader2, UserPlus, GripVertical, AlertCircle } from "lucide-react";
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable, pointerWithin } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { STATUS_COLORS } from "@/lib/constants";
import type { Member } from "@/lib/types";

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

interface DroppableColProps {
  id: string;
  title: string;
  count: number;
  member?: Member | null;
  onMemberClick?: () => void;
  children: React.ReactNode;
}

function DroppableCol({ id, title, count, member, onMemberClick, children }: DroppableColProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  // Semáforo de disponibilidad
  const semaforoColor = useMemo(() => {
    if (!member) return null;
    if (member.semaforo === "sobrecargado") return "bg-rose-500 border-rose-500/40 shadow-rose-500/20";
    if (member.semaforo === "al_limite") return "bg-yellow-400 border-yellow-500/40 shadow-yellow-500/20";
    return "bg-emerald-400 border-emerald-500/40 shadow-emerald-500/20";
  }, [member?.semaforo]);

  return (
    <div
      ref={setNodeRef}
      className="w-[280px] flex flex-col rounded-2xl p-3 transition-colors shrink-0"
      style={{ background: isOver ? "rgba(58,123,213,.1)" : "rgba(255,255,255,.02)", border: `1px solid ${isOver ? "#3a7bd5" : "var(--border)"}` }}
    >
      <div className="flex flex-col gap-1.5 mb-3.5 px-1">
        <div className="flex items-center justify-between">
          <div
            onClick={onMemberClick}
            className={`flex items-center gap-2 min-w-0 ${onMemberClick ? "cursor-pointer group" : ""}`}
          >
            {member && semaforoColor && (
              <span
                className={`w-2.5 h-2.5 rounded-full border shadow-sm shrink-0 ${semaforoColor}`}
                title={`Disponibilidad: ${member.semaforo === "sobrecargado" ? "Sobrecargado" : member.semaforo === "al_limite" ? "Al límite" : "Disponible"}`}
              />
            )}
            <span className="text-xs font-black uppercase tracking-widest leading-none text-[#ffffffd6] group-hover:text-blue-400 transition-colors truncate max-w-[150px]">
              {title}
            </span>
            {member?.mood_semanal?.emoji && (
              <span className="text-xs shrink-0" title={`Mood semanal: ${member.mood_semanal.emoji}`}>
                {member.mood_semanal.emoji}
              </span>
            )}
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-white/60 font-bold shrink-0">
            {count}
          </span>
        </div>

        {/* Carga de trabajo Xh / Yh */}
        {member && (
          <div className="flex items-center justify-between text-[11px] text-[#ffffff6b] pl-4">
            <span className="font-semibold">
              {member.carga_horas_actual ?? 0}h / {member.capacidad_semanal ?? 40}h
              <span className="text-white/30 ml-1">({member.workloadPercent ?? 0}%)</span>
            </span>

            {typeof member.tareasSinEstimar === "number" && member.tareasSinEstimar > 0 && (
              <span
                className="flex items-center gap-1 text-[10px] text-amber-400/90 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20"
                title={`Carga incompleta — ${member.tareasSinEstimar} tarea(s) sin estimar`}
              >
                <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                <span>{member.tareasSinEstimar} sin estimar</span>
              </span>
            )}
          </div>
        )}
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

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const tasks = data?.tareas ?? [];
  const workers = data?.miembros ?? [];

  // Agrupamos tareas por asignado. "" -> Sin asignar.
  const cols = [
    { id: "unassigned", label: "Sin Asignar", name: "", member: null },
    ...workers.map(w => ({ id: String(w.id), label: w.nombre, name: w.nombre, member: w }))
  ];

  // For optimistic updates during drag
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const oldAssignee = active.data.current?.task.asignado || "";
    let newAssignee = over.id as string;
    if (newAssignee === "unassigned") {
      newAssignee = "";
    } else {
      const foundWorker = workers.find(w => String(w.id) === String(newAssignee) || w.nombre === newAssignee);
      if (foundWorker) newAssignee = foundWorker.nombre;
    }

    if (oldAssignee === newAssignee) return;

    await fetch("/api/task/update", {
      method: "PATCH",
      body: JSON.stringify({ id: taskId, asignado: newAssignee })
    });
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
                <DroppableCol 
                  key={col.id} 
                  id={col.id} 
                  title={col.label} 
                  count={colTasks.length}
                  member={col.member}
                  onMemberClick={col.member ? () => openModal({ type: "worker", id: String(col.member?.id) }) : undefined}
                >
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
