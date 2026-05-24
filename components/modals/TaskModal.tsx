"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  TaskModal — Modal centrado para crear y editar tareas
//
//  taskId === "new"  → modo creación
//  taskId === "xxx"  → modo edición de tarea existente
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from "react";
import { X, Calendar, Loader2, ExternalLink, Play } from "lucide-react";
import { useData, useCreateTask, useUpdateTask } from "@/hooks/useData";
import { useUIStore } from "@/lib/store";
import { fmtDate, statusColor } from "@/lib/utils";
import { TASK_ESTADO_OPTS, TASK_PRIO_OPTS, ESFUERZOS, FORMATOS, AREAS, STATUS_COLORS, PRIORITY_COLORS } from "@/lib/constants";
import type { ModalEntry } from "@/lib/types";

interface Props {
  taskId:   string;           // "new" = create mode, else = edit
  parentId?: string;          // project id when creating inside a project
  isAdmin:  boolean;
  onClose:  () => void;
  openRelated?: (e: ModalEntry) => void;
}

export function TaskModal({ taskId, parentId, isAdmin, onClose, openRelated }: Props) {
  const { data }    = useData();
  const createTask  = useCreateTask();
  const updateTask  = useUpdateTask();
  const isCreate    = taskId === "new";
  const task        = isCreate ? null : (data?.tareas.find((t) => t.id === taskId) ?? null);

  const startTimer  = useUIStore(s => s.startTimer);
  const activeTimer = useUIStore(s => s.activeTimer);
  const isTimerActive = activeTimer?.taskId === taskId;

  // ── Form state ──────────────────────────────────────────────────────────────
  const [titulo,       setTitulo]       = useState(task?.titulo       ?? "");
  const [contenido,    setContenido]    = useState(task?.contenido    ?? "");
  const [estado,       setEstado]       = useState(task?.estado       ?? "Por hacer");
  const [prioridad,    setPrioridad]    = useState(task?.prioridad    ?? "Media");
  const [formato,      setFormato]      = useState(task?.formato      ?? "");
  const [area,         setArea]         = useState(task?.area         ?? "");
  const [esfuerzo,     setEsfuerzo]     = useState(task?.esfuerzo     ?? "");
  const [asignado,     setAsignado]     = useState(task?.asignado     ?? "");
  const [fechaProg,    setFechaProg]    = useState(task?.fechaProg    ?? "");
  const [fechaEntrega, setFechaEntrega] = useState(task?.fechaEntrega ?? "");
  const [proyectoId,   setProyectoId]   = useState(task?.proyecto_ids?.[0] ?? parentId ?? "");
  const [clienteId,    setClienteId]    = useState(task?.cliente_ids?.[0]  ?? "");
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");

  const titleRef        = useRef<HTMLTextAreaElement>(null);
  const dateFechaProg   = useRef<HTMLInputElement>(null);
  const dateFechaEnt    = useRef<HTMLInputElement>(null);

  // Auto-focus title on open
  useEffect(() => {
    setTimeout(() => titleRef.current?.focus(), 80);
  }, []);

  // Auto-resize title textarea
  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }

  const workers  = data?.trabajadores.map((w) => w.nombre)  ?? [];
  const projects = data?.proyectos  ?? [];
  const clients  = data?.clientes   ?? [];

  const selectedProj = projects.find((p) => p.id === proyectoId);
  const selectedCli  = clients.find((c)  => c.id === clienteId);
  const statusCol    = statusColor(estado);

  useEffect(() => {
    if (!isCreate || !parentId || !data) return;
    const parentProject = data.proyectos.find((p) => p.id === parentId);
    if (!parentProject) return;
    setProyectoId(parentProject.id);
    if (parentProject.cliente_ids?.[0]) setClienteId(parentProject.cliente_ids[0]);
  }, [data, isCreate, parentId]);

  async function handleSave() {
    if (!titulo.trim()) { setError("El título no puede estar vacío"); return; }
    setError("");
    setSaving(true);
    try {
      if (isCreate) {
        const p: Record<string, string> = { titulo: titulo.trim() };
        if (contenido)    p.contenido    = contenido;
        if (estado)       p.estado       = estado;
        if (prioridad)    p.prioridad    = prioridad;
        if (formato)      p.formato      = formato;
        if (area)         p.area         = area;
        if (esfuerzo)     p.esfuerzo     = esfuerzo;
        if (asignado)     p.asignado     = asignado;
        if (fechaProg)    p.fechaProg    = fechaProg;
        if (fechaEntrega) p.fechaEntrega = fechaEntrega;
        if (proyectoId)   p.proyecto_id  = proyectoId;
        if (clienteId)    p.cliente_id   = clienteId;
        await createTask.mutateAsync(p as never);
      } else {
        const u: Record<string, string> = { id: taskId };
        if (titulo       !== task?.titulo)       u.titulo       = titulo;
        if (contenido    !== task?.contenido)    u.contenido    = contenido;
        if (estado       !== task?.estado)       u.estado       = estado;
        if (prioridad    !== task?.prioridad)    u.prioridad    = prioridad;
        if (formato      !== task?.formato)      u.formato      = formato;
        if (area         !== task?.area)         u.area         = area;
        if (esfuerzo     !== task?.esfuerzo)     u.esfuerzo     = esfuerzo;
        if (asignado     !== task?.asignado)     u.asignado     = asignado;
        if (fechaProg    !== task?.fechaProg)    u.fechaProg    = fechaProg;
        if (fechaEntrega !== task?.fechaEntrega) u.fechaEntrega = fechaEntrega;
        if (proyectoId   !== task?.proyecto_ids?.[0]) u.proyecto_id = proyectoId;
        if (Object.keys(u).length > 1)
          await updateTask.mutateAsync(u as never);
      }
      onClose();
    } catch (err: any) {
      console.error("Error saving task:", err);
      setError("Error Notion: " + (err?.message || "Error desconocido"));
    } finally { setSaving(false); }
  }

  // ── Styles ───────────────────────────────────────────────────────────────────
  const s = {
    card: {
      position:     "relative" as const,
      background:   "rgba(14,14,18,.99)",
      borderLeft:   "1px solid rgba(255,255,255,.09)",
      boxShadow:    "-10px 0 40px rgba(0,0,0,0.5)",
      overflow:     "hidden",
      display:      "flex",
      flexDirection: "column" as const,
      height:       "100vh",
    },
    pill: (color = "rgba(255,255,255,.08)", textColor = "var(--txt2)"): React.CSSProperties => ({
      display:      "inline-flex",
      alignItems:   "center",
      gap:          5,
      padding:      "5px 12px",
      borderRadius: 999,
      fontSize:     12,
      fontWeight:   600,
      background:   color,
      color:        textColor,
      border:       "none",
      cursor:       isAdmin ? "pointer" : "default",
      whiteSpace:   "nowrap" as const,
      flex:         1,
      justifyContent: "space-between",
    }),
    select: (bg = "rgba(255,255,255,.06)", col = "var(--txt)"): React.CSSProperties => ({
      background:  bg,
      color:       col,
      border:      "none",
      borderRadius: 999,
      padding:     "4px 10px",
      fontSize:    12,
      fontWeight:  700,
      cursor:      isAdmin ? "pointer" : "default",
      outline:     "none",
      appearance:  "none" as never,
      pointerEvents: isAdmin ? "auto" : "none" as never,
      width:       "100%",
    }),
    propRow: {
      display:       "flex",
      alignItems:    "center",
      justifyContent: "space-between",
      padding:       "7px 0",
      borderBottom:  "1px solid rgba(255,255,255,.04)",
      gap:           16,
    } as React.CSSProperties,
    propLabel: {
      fontSize: 13,
      color:    "var(--txt3)",
      width:    "40%",
    } as React.CSSProperties,
    dateRow: {
      display:       "flex",
      flexDirection: "column" as const,
      gap:           6,
      padding:       "10px 14px",
      borderRadius:  16,
      background:    "rgba(255,255,255,.03)",
      border:        "1px solid rgba(255,255,255,.05)",
      cursor:        isAdmin ? "pointer" as const : "default" as const,
      flex:          1,
    } as React.CSSProperties,
  };

  const handleProjectChange = (id: string) => {
    setProyectoId(id);
    if (id) {
      const proj = projects.find(p => p.id === id);
      if (proj && proj.cliente_ids?.[0]) {
        setClienteId(proj.cliente_ids[0]);
      }
    }
  };

  return (
    <div style={s.card}>
      {/* ── Background Effects ── */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:"50%", background:"radial-gradient(circle at 50% 0%, rgba(10, 132, 255, 0.15) 0%, rgba(0,0,0,0) 70%)", pointerEvents:"none", zIndex:0 }} />
      <div style={{ position:"absolute", top:"5%", left:"45%", width:"30%", height:"20%", background:"radial-gradient(circle, rgba(100, 210, 255, 0.08) 0%, rgba(0,0,0,0) 60%)", filter:"blur(30px)", pointerEvents:"none", zIndex:0 }} className="animate-pulse" />

      {/* ── Top bar ── */}
      <div style={{ position:"relative", zIndex:10, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px 12px", borderBottom:"1px solid rgba(255,255,255,.05)", flexShrink: 0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {/* Estado chip */}
          {isAdmin ? (
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              style={{ ...s.select(`${statusCol}22`, statusCol), width: "auto" }}
            >
              {TASK_ESTADO_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <span style={{ ...s.pill(`${statusCol}22`, statusCol), flex: "none" }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:statusCol, display:"inline-block" }} />
              {estado}
            </span>
          )}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          {!isCreate && (
            <button 
              onClick={() => startTimer(taskId)}
              disabled={isTimerActive}
              style={{ display:"flex", alignItems:"center", gap:4, padding:"6px 12px", borderRadius:8, background: isTimerActive ? "rgba(16, 185, 129, 0.15)" : "rgba(255,255,255,.06)", color: isTimerActive ? "#10b981" : "var(--txt2)", fontSize:11, fontWeight:700, border:"none", cursor: isTimerActive ? "default" : "pointer" }}
            >
              <Play style={{ width:11, height:11 }} /> {isTimerActive ? "Timer Activo" : "Iniciar Timer"}
            </button>
          )}
          {!isCreate && task?.url && (
            <a href={task.url} target="_blank" rel="noreferrer"
              style={{ display:"flex", alignItems:"center", gap:4, padding:"6px 10px", borderRadius:8, background:"rgba(255,255,255,.06)", color:"var(--txt3)", fontSize:11, textDecoration:"none" }}>
              <ExternalLink style={{ width:11, height:11 }} /> Notion
            </a>
          )}
          <button onClick={onClose}
            style={{ display:"flex", alignItems:"center", justifyContent:"center", width:28, height:28, borderRadius:8, background:"rgba(255,255,255,.07)", border:"none", color:"var(--txt3)", cursor:"pointer", transition:"all .15s hover:bg-white/10" }}>
            <X style={{ width:14, height:14 }} />
          </button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ position:"relative", zIndex:10, flex:1, overflowY:"auto", padding:"30px 24px" }} className="custom-scrollbar">

        {/* Title */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom: 20 }}>
          {useUIStore.getState().parallelModals.length < 3 && (
            <button 
              onClick={() => openRelated?.({ type:"task", id:"new" })}
              style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", border: "none", color: "var(--txt2)", cursor: "pointer", marginBottom: 12, transition: "background 0.2s ease" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          )}
          <textarea
            ref={titleRef}
            value={titulo}
            onChange={(e) => { setTitulo(e.target.value); autoResize(e.target); }}
            onInput={(e) => autoResize(e.target as HTMLTextAreaElement)}
            placeholder="Nueva tarea"
            readOnly={!isAdmin}
            rows={1}
            style={{
              width:       "100%",
              boxSizing:   "border-box",
              fontSize:    24,
              fontWeight:  800,
              letterSpacing: "-.02em",
              lineHeight:  1.2,
              color:       titulo ? "var(--txt)" : "var(--txt3)",
              background:  "transparent",
              border:      "none",
              outline:     "none",
              resize:      "none",
              overflow:    "hidden",
              padding:     0,
              textAlign:   "center"
            }}
          />
        </div>

        {/* Description */}
        <textarea
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          placeholder="Agregar descripción o brief del contenido..."
          readOnly={!isAdmin}
          rows={3}
          style={{
            width:       "100%",
            boxSizing:   "border-box",
            fontSize:    13,
            lineHeight:  1.6,
            color:       "var(--txt2)",
            background:  "transparent",
            border:      "none",
            outline:     "none",
            resize:      "none",
            marginBottom: 20,
            padding:     0,
          }}
        />

        {/* Project + Client pills */}
        <div style={{ display:"flex", gap:12, marginBottom:24 }}>
          {/* Proyecto */}
          <div style={{ flex:"0 1 auto", minWidth: 160, display:"flex", alignItems:"center", gap:4, background: proyectoId ? "rgba(58,123,213,.15)" : "rgba(255,255,255,.05)", borderRadius: 999, border: "1px solid rgba(255,255,255,.05)" }}>
            {isAdmin ? (
              <select
                value={proyectoId}
                onChange={(e) => handleProjectChange(e.target.value)}
                style={{
                  ...s.pill("transparent", proyectoId ? "#6aafff" : "var(--txt3)"),
                  appearance: "none" as never,
                }}
              >
                <option value="">📁 Asignar proyecto</option>
                {projects.map((p) => <option key={p.id} value={p.id}>📁 {p.nombre}</option>)}
              </select>
            ) : selectedProj ? (
              <button 
                onClick={() => openRelated?.({ type:"proyecto", id:selectedProj.id })}
                style={{ ...s.pill("transparent", "#6aafff") }}
              >
                📁 {selectedProj.nombre}
              </button>
            ) : <span style={s.pill("transparent", "var(--txt3)")}>📁 Sin proyecto</span>}
            
            {isAdmin && (
              <button onClick={() => openRelated?.({ type:"proyecto", id:"new" })}
                style={{ width: 26, height: 26, borderRadius: "50%", background: proyectoId ? "rgba(106, 175, 255, 0.2)" : "rgba(255,255,255,.08)", border: "none", color: proyectoId ? "#6aafff" : "var(--txt3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginRight: 2 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
            )}
          </div>

          {/* Cliente */}
          <div style={{ flex:1, display:"flex", alignItems:"center", gap:4, background: clienteId ? "rgba(191,90,242,.15)" : "rgba(255,255,255,.05)", borderRadius: 999, border: "1px solid rgba(255,255,255,.05)" }}>
            {isAdmin ? (
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                style={{
                  ...s.pill("transparent", clienteId ? "#bf5af2" : "var(--txt3)"),
                  appearance: "none" as never,
                }}
              >
                <option value="">🏢 Agregar cliente</option>
                {clients.map((c) => <option key={c.id} value={c.id}>🏢 {c.nombre}</option>)}
              </select>
            ) : selectedCli ? (
              <button 
                onClick={() => openRelated?.({ type:"client", id:selectedCli.id })}
                style={{ ...s.pill("transparent", "#bf5af2") }}
              >
                🏢 {selectedCli.nombre}
              </button>
            ) : <span style={s.pill("transparent", "var(--txt3)")}>🏢 Sin cliente</span>}
            
            {isAdmin && (
              <button 
                onClick={() => openRelated?.({ type:"client", id:"new" })}
                style={{ width: 26, height: 26, borderRadius: "50%", background: clienteId ? "rgba(191, 90, 242, 0.2)" : "rgba(255,255,255,.08)", border: "none", color: clienteId ? "#bf5af2" : "var(--txt3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginRight: 2 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
            )}
          </div>
        </div>

        {/* Dates */}
        <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
          {/* Fecha programada */}
          <div style={s.dateRow} onClick={() => isAdmin && dateFechaProg.current?.showPicker()}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <Calendar style={{ width:12, height:12, color:"var(--txt3)" }} />
              <span style={{ fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:".08em", color:"var(--txt3)" }}>Programada</span>
            </div>
            <span style={{ fontSize:13, color: fechaProg ? "var(--txt)" : "var(--txt3)", fontWeight: fechaProg ? 700 : 500 }}>
              {fechaProg ? fmtDate(fechaProg) : "Asignar"}
            </span>
            <input ref={dateFechaProg} type="date" value={fechaProg}
              onChange={(e) => setFechaProg(e.target.value)}
              style={{ position:"absolute", opacity:0, pointerEvents:"none", width:0, height:0 }} />
          </div>

          {/* Fecha de entrega */}
          <div 
            style={{ 
              ...s.dateRow, 
              background: fechaEntrega ? "rgba(255, 159, 10, 0.08)" : s.dateRow.background, 
              cursor: (isAdmin && (!task?.fechaEntrega || isCreate)) ? "pointer" : "default", 
              opacity: (isAdmin && task?.fechaEntrega && !isCreate) ? 0.7 : 1 
            }} 
            onClick={() => (isAdmin && (!task?.fechaEntrega || isCreate)) && dateFechaEnt.current?.showPicker()}
          >
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <Calendar style={{ width:12, height:12, color: fechaEntrega ? "#ff9f0a" : "var(--txt3)" }} />
              <span style={{ fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:".08em", color: fechaEntrega ? "#ff9f0a" : "var(--txt3)" }}>
                Entrega {(isAdmin && task?.fechaEntrega && !isCreate) && "(Bloqueado)"}
              </span>
            </div>
            <span style={{ fontSize:13, color: fechaEntrega ? "#ff9f0a" : "var(--txt3)", fontWeight: fechaEntrega ? 700 : 500 }}>
              {fechaEntrega ? fmtDate(fechaEntrega) : "Asignar"}
            </span>
            <input 
              ref={dateFechaEnt} 
              type="date" 
              value={fechaEntrega}
              disabled={isAdmin && !!task?.fechaEntrega && !isCreate}
              onChange={(e) => setFechaEntrega(e.target.value)}
              style={{ position:"absolute", opacity:0, pointerEvents:"none", width:0, height:0 }} 
            />
          </div>
        </div>

        {/* Properties */}
        <div>
          <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", color:"var(--txt3)", marginBottom:8 }}>
            Propiedades
          </div>

          {[
            {
              label: "Prioridad",
              el: isAdmin
                ? <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} style={s.select()}>
                    <option value="">— Seleccionar —</option>
                    {TASK_PRIO_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                : <span style={{ fontSize:12, color:"var(--txt)", fontWeight:600 }}>{prioridad || "—"}</span>,
            },
            {
              label: "Asignado",
              el: isAdmin
                ? <select value={asignado} onChange={(e) => setAsignado(e.target.value)} style={s.select()}>
                    <option value="">—</option>
                    {workers.map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                : <span style={{ fontSize:12, color:"var(--txt)", fontWeight:600 }}>{asignado || "—"}</span>,
            },
            {
              label: "Formato",
              el: isAdmin
                ? <select value={formato} onChange={(e) => setFormato(e.target.value)} style={s.select()}>
                    <option value="">— Seleccionar —</option>
                    {FORMATOS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                : <span style={{ fontSize:12, color:"var(--txt)", fontWeight:600 }}>{formato || "—"}</span>,
            },
            {
              label: "Área",
              el: isAdmin
                ? <select value={area} onChange={(e) => setArea(e.target.value)} style={s.select()}>
                    <option value="">— Seleccionar —</option>
                    {AREAS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                : <span style={{ fontSize:12, color:"var(--txt)", fontWeight:600 }}>{area || "—"}</span>,
            },
            {
              label: "Esfuerzo",
              el: isAdmin
                ? <select value={esfuerzo} onChange={(e) => setEsfuerzo(e.target.value)} style={s.select()}>
                    <option value="">—</option>
                    {ESFUERZOS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                : <span style={{ fontSize:12, color:"var(--txt)", fontWeight:600 }}>{esfuerzo || "—"}</span>,
            },
          ].map((row, i, arr) => (
            <div key={row.label} style={{ ...s.propRow, borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,.04)" : "none" }}>
              <span style={s.propLabel}>{row.label}</span>
              {row.el}
            </div>
          ))}
        </div>

        {error && <p style={{ color:"#ff453a", fontSize:12, marginTop:12 }}>{error}</p>}
      </div>

      {/* ── Footer ── */}
      {isAdmin && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:8, padding:"14px 20px", borderTop:"1px solid rgba(255,255,255,.05)", flexShrink:0 }}>
          <button onClick={onClose} style={{ padding:"9px 16px", borderRadius:12, fontSize:13, fontWeight:600, background:"rgba(255,255,255,.07)", border:"none", color:"var(--txt2)", cursor:"pointer" }}>
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !titulo.trim()}
            style={{ padding:"9px 20px", borderRadius:12, fontSize:13, fontWeight:700, background:"linear-gradient(135deg,#3a7bd5,#6aafff)", color:"#fff", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:6, opacity:(saving || !titulo.trim()) ? 0.5 : 1 }}>
            {saving ? <><Loader2 style={{ width:13, height:13 }} />Guardando...</> : (isCreate ? "Crear tarea →" : "Guardar cambios →")}
          </button>
        </div>
      )}
    </div>
  );
}
