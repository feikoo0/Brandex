"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { ListTodo, Columns, CheckCircle2, Play, Hourglass, ArrowRight, ArrowLeft } from "lucide-react";
import type { Task, Worker } from "@/lib/types";
import { DONE_STATES } from "@/lib/constants";
import { useUpdateTask } from "@/hooks/useData";
import ChildTaskCard from "./ChildTaskCard";
import GlassPanel from "./GlassPanel";
import { cn } from "@/lib/utils";

interface MakerModeViewProps {
  tasks: Task[];
  workers: Worker[];
  userId: string | null;
  userName: string | null;
}

export default function MakerModeView({
  tasks,
  workers,
  userId,
  userName,
}: MakerModeViewProps) {
  const updateTaskMut = useUpdateTask();

  // Filter tasks assigned to current user
  const myTasks = useMemo(() => {
    return tasks.filter((t) => {
      const isAssignedById = userId && t.asignado_ids?.includes(userId);
      const isAssignedByName = userName && t.asignado?.toLowerCase().includes(userName.toLowerCase());
      return isAssignedById || isAssignedByName;
    });
  }, [tasks, userId, userName]);

  // Split tasks into Kanban columns
  const kanbanColumns = useMemo(() => {
    const todo: Task[] = [];
    const inProgress: Task[] = [];
    const done: Task[] = [];

    myTasks.forEach((t) => {
      if (DONE_STATES.has(t.estado)) {
        done.push(t);
      } else if (t.estado === "En proceso" || t.estado === "Modificar") {
        inProgress.push(t);
      } else {
        todo.push(t);
      }
    });

    return { todo, inProgress, done };
  }, [myTasks]);

  const handleMoveState = (taskId: string, currentEstado: string, direction: "next" | "prev") => {
    let nextState = currentEstado;
    const isCompleted = DONE_STATES.has(currentEstado);

    if (direction === "next") {
      if (isCompleted) return;
      if (currentEstado === "En proceso") {
        nextState = "Hecho";
      } else {
        nextState = "En proceso";
      }
    } else {
      if (isCompleted) {
        nextState = "En proceso";
      } else if (currentEstado === "En proceso") {
        nextState = "Pendiente";
      }
    }

    updateTaskMut.mutate({ id: taskId, estado: nextState });
  };

  return (
    <div className="flex-1 min-h-0 w-full grid grid-cols-1 lg:grid-cols-12 gap-4 pb-4">
      {/* Left Column: Personal Queue List (4 cols) */}
      <GlassPanel className="lg:col-span-4 p-5 flex flex-col min-h-0 bg-white/[0.01]">
        <div className="flex items-center gap-2 mb-4 border-b border-white/[0.05] pb-3 select-none">
          <ListTodo className="w-5 h-5 text-blue-400" />
          <h2 className="text-sm font-black uppercase text-white tracking-wider">
            Mi Cola de Trabajo
          </h2>
          <span className="ml-auto bg-blue-600/20 text-blue-400 border border-blue-500/10 text-[10px] font-black px-2 py-0.5 rounded-full">
            {myTasks.filter(t => !DONE_STATES.has(t.estado)).length} pendientes
          </span>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
          {myTasks.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 select-none">
              <CheckCircle2 className="w-10 h-10 text-neutral-600 mb-2 stroke-[1.5px]" />
              <p className="text-xs text-neutral-500 font-medium">
                ¡Estás al día! No tienes tareas asignadas.
              </p>
            </div>
          ) : (
            myTasks.map((task) => {
              const taskOwner = workers.find((w) => task.asignado_ids?.includes(w.id));
              return (
                <ChildTaskCard
                  key={task.id}
                  task={task}
                  owner={taskOwner}
                  isMakerMode={true}
                />
              );
            })
          )}
        </div>
      </GlassPanel>

      {/* Right: Kanban Columns (8 cols) */}
      <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0">
        {/* Column 1: Todo */}
        <GlassPanel className="p-4 flex flex-col min-h-0 bg-white/[0.01]">
          <div className="flex items-center gap-2 mb-4 border-b border-white/[0.05] pb-2.5 select-none">
            <Hourglass className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-black uppercase text-white tracking-wider">
              Por Hacer
            </h3>
            <span className="ml-auto text-[10px] font-bold text-neutral-500">
              {kanbanColumns.todo.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
            {kanbanColumns.todo.map((task) => (
              <div key={task.id} className="relative group">
                <ChildTaskCard task={task} owner={undefined} isMakerMode={true} />
                <button
                  onClick={() => handleMoveState(task.id, task.estado, "next")}
                  className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-blue-600/30 border border-blue-500/20 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-600/50"
                  title="Empezar tarea"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </GlassPanel>

        {/* Column 2: In Progress */}
        <GlassPanel className="p-4 flex flex-col min-h-0 bg-white/[0.01]">
          <div className="flex items-center gap-2 mb-4 border-b border-white/[0.05] pb-2.5 select-none">
            <Play className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-black uppercase text-white tracking-wider">
              En Progreso
            </h3>
            <span className="ml-auto text-[10px] font-bold text-neutral-500">
              {kanbanColumns.inProgress.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
            {kanbanColumns.inProgress.map((task) => (
              <div key={task.id} className="relative group">
                <ChildTaskCard task={task} owner={undefined} isMakerMode={true} />
                <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleMoveState(task.id, task.estado, "prev")}
                    className="p-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-white"
                    title="Regresar a Por Hacer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleMoveState(task.id, task.estado, "next")}
                    className="p-1.5 rounded-lg bg-green-600/30 border border-green-500/20 text-green-400 hover:bg-green-600/50"
                    title="Completar tarea"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>

        {/* Column 3: Done */}
        <GlassPanel className="p-4 flex flex-col min-h-0 bg-white/[0.01]">
          <div className="flex items-center gap-2 mb-4 border-b border-white/[0.05] pb-2.5 select-none">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-black uppercase text-white tracking-wider">
              Completado
            </h3>
            <span className="ml-auto text-[10px] font-bold text-neutral-500">
              {kanbanColumns.done.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
            {kanbanColumns.done.map((task) => (
              <div key={task.id} className="relative group">
                <ChildTaskCard task={task} owner={undefined} isMakerMode={true} />
                <button
                  onClick={() => handleMoveState(task.id, task.estado, "prev")}
                  className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-white"
                  title="Regresar a En Progreso"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
