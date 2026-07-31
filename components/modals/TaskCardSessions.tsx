"use client";

import React, { useState, useEffect } from "react";
import { useSessions, useTaskSessions } from "@/hooks/useSessions";
import { Play, Square, Plus, Clock, Bot, User, ShieldCheck, Search, AlertTriangle, ChevronDown, Loader2 } from "lucide-react";
import type { SessionOrigin } from "@/lib/types";

interface TaskCardSessionsProps {
  taskId: string;
  projectId: string;
  clientId?: string | null;
  workerId?: string | null;
}

// Origen Badge Helper
function getOriginBadge(origin: SessionOrigin) {
  switch (origin) {
    case "agent_self":
      return { label: "Agente Self", icon: <Bot className="w-3 h-3 text-purple-400" />, color: "bg-purple-500/10 text-purple-400 border-purple-500/20" };
    case "agent_research":
      return { label: "Agente Research", icon: <Search className="w-3 h-3 text-cyan-400" />, color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" };
    case "agent_qa_visual":
      return { label: "Agente QA Visual", icon: <ShieldCheck className="w-3 h-3 text-emerald-400" />, color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
    default:
      return { label: "Manual", icon: <User className="w-3 h-3 text-blue-400" />, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
  }
}

export function TaskCardSessions({ taskId, projectId, clientId, workerId }: TaskCardSessionsProps) {
  const { activeSession, startSession, endSession, addManualSession } = useSessions();
  const { sessions, isLoading, hasMore, loadMore, refetch } = useTaskSessions(taskId, 10);

  const isCurrentTaskActive = activeSession?.task_id === String(taskId);
  const [elapsedSecs, setElapsedSecs] = useState<number>(0);
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Manual Form State
  const [manualMins, setManualMins] = useState<string>("30");
  const [manualSummary, setManualSummary] = useState<string>("");

  // Contador en vivo mientras la sesión activa pertenezca a esta tarea
  useEffect(() => {
    if (!isCurrentTaskActive || !activeSession?.startTime) return;
    const startMs = activeSession.startTime.toMillis ? activeSession.startTime.toMillis() : new Date(activeSession.startTime).getTime();
    
    const interval = setInterval(() => {
      const secs = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      setElapsedSecs(secs);
    }, 1000);

    return () => clearInterval(interval);
  }, [isCurrentTaskActive, activeSession]);

  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleStart = async (origin: SessionOrigin = "manual") => {
    await startSession({ taskId, projectId, clientId, workerId, origin });
    refetch();
  };

  const handleEnd = async () => {
    await endSession();
    refetch();
  };

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseInt(manualMins, 10) || 30;
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - mins * 60 * 1000);

    await addManualSession({
      taskId,
      projectId,
      clientId,
      workerId,
      startDate,
      endDate,
      summary: manualSummary,
    });

    setShowManualModal(false);
    setManualSummary("");
    refetch();
  };

  return (
    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
      {/* Header & Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-black uppercase tracking-wider text-white/80">Historial de Sesiones</h4>
        </div>

        <button
          onClick={() => setShowManualModal(!showManualModal)}
          className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white/60 flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          Sesión Manual
        </button>
      </div>

      {/* Control Activo / Botón de Inicio */}
      <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
        {isCurrentTaskActive ? (
          <>
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <div>
                <div className="text-[10px] uppercase font-extrabold tracking-wider text-cyan-400">Sesión en Curso</div>
                <div className="text-lg font-black tracking-widest text-white font-mono">{formatTimer(elapsedSecs)}</div>
              </div>
            </div>

            <button
              onClick={handleEnd}
              className="px-4 py-2 rounded-xl text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition-all flex items-center gap-1.5"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Finalizar
            </button>
          </>
        ) : (
          <>
            <span className="text-xs text-white/40 font-medium">
              {activeSession ? "Hay una sesión activa en otra tarea" : "Sin sesión activa en esta tarea"}
            </span>

            <button
              onClick={() => handleStart("manual")}
              className="px-4 py-2 rounded-xl text-xs font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 transition-all flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Iniciar Sesión
            </button>
          </>
        )}
      </div>

      {/* Modal / Formulario Manual Desplegable */}
      {showManualModal && (
        <form onSubmit={handleSaveManual} className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-3">
          <div className="text-xs font-bold text-white/70">Registrar Sesión Pasada (Manual)</div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-white/40 font-bold uppercase">Duración (Mins):</label>
            <input
              type="number"
              min="1"
              max="600"
              value={manualMins}
              onChange={(e) => setManualMins(e.target.value)}
              className="w-20 px-2 py-1 rounded-lg bg-black/40 border border-white/10 text-xs font-bold text-white outline-none"
            />
          </div>
          <input
            type="text"
            placeholder="Notas u objetivos de la sesión..."
            value={manualSummary}
            onChange={(e) => setManualSummary(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white placeholder:text-white/30 outline-none"
          />
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowManualModal(false)}
              className="px-3 py-1 rounded-lg text-xs font-medium text-white/50 hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-500 text-white hover:bg-blue-600"
            >
              Guardar Sesión
            </button>
          </div>
        </form>
      )}

      {/* Lista de Sesiones Históricas (Paginada) */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-4 text-white/30">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span className="text-xs">Cargando sesiones...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-4 text-xs text-white/30 font-medium">
            No hay sesiones registradas para esta tarea aún.
          </div>
        ) : (
          sessions.map((s) => {
            const badge = getOriginBadge(s.origin);
            const dateStr = s.startTime?.toDate
              ? s.startTime.toDate().toLocaleDateString("es-ES", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
              : "Fecha no disponible";

            return (
              <div key={s.id} className="p-2.5 rounded-xl bg-white/[0.015] border border-white/5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className={`px-2 py-0.5 rounded-md border text-[10px] font-bold flex items-center gap-1 ${badge.color}`}>
                    {badge.icon}
                    <span>{badge.label}</span>
                  </div>

                  <span className="font-bold text-white/80">{s.durationMins} min</span>
                  {s.summary && <span className="text-white/40 truncate max-w-[160px] text-[11px]">- {s.summary}</span>}
                </div>

                <div className="flex items-center gap-2">
                  {s.status === "completada_forzada" && (
                    <span className="text-[9px] font-bold text-amber-400 flex items-center gap-0.5" title="Auto-cerrada por inactividad (heartbeat timeout)">
                      <AlertTriangle className="w-3 h-3" /> Forzada
                    </span>
                  )}
                  <span className="text-[10px] text-white/30 font-mono">{dateStr}</span>
                </div>
              </div>
            );
          })
        )}

        {/* Botón Paginado: Cargar Más */}
        {hasMore && (
          <button
            onClick={loadMore}
            className="w-full py-2 rounded-xl text-xs font-bold text-white/50 hover:text-white bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-1 mt-2"
          >
            <span>Cargar más sesiones</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
