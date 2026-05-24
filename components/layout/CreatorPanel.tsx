"use client";

import { useState, useEffect } from "react";
import { X, Check, Loader2, CheckSquare, Layers, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "@/lib/store";
import { useData, useCreateTask, useCreateProject } from "@/hooks/useData";
import {
  TASK_ESTADO_OPTS, TASK_PRIO_OPTS, PROJ_STATUS_OPTS, PROJ_PRIO_OPTS,
  ESFUERZOS, FORMATOS, PRIORITY_COLORS,
} from "@/lib/constants";
import { statusColor, cn } from "@/lib/utils";

export function CreatorPanel() {
  const creatorPanel = useUIStore((s) => s.creatorPanel);
  const closeCreator = useUIStore((s) => s.closeCreator);

  return (
    <AnimatePresence>
      {creatorPanel && (
        <motion.div
          key="creator-panel"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 300, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          className="flex-shrink-0 h-screen overflow-hidden border-l border-white/[0.06]"
          style={{ background: "#0b0b0e" }}
        >
          <div className="w-[300px] h-full flex flex-col">
            {creatorPanel === "task"
              ? <TaskCreator onClose={closeCreator} />
              : <ProjectCreator onClose={closeCreator} />
            }
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Task Creator ───────────────────────────────────────────────────────────────
function TaskCreator({ onClose }: { onClose: () => void }) {
  const { data } = useData();
  const createTask = useCreateTask();

  const [titulo,    setTitulo]    = useState("");
  const [estado,    setEstado]    = useState("Pendiente");
  const [prioridad, setPrioridad] = useState("Media");
  const [esfuerzo,  setEsfuerzo]  = useState("");
  const [formato,   setFormato]   = useState("");
  const [proyId,    setProyId]    = useState("");
  const [clienteId, setClienteId] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [isCreating, setIsCreating]    = useState(false);
  const [done, setDone]                = useState(false);

  const activeProjects = data?.proyectos.filter(p => p.nombre) ?? [];
  const clientes       = data?.clientes ?? [];

  const handleCreate = async () => {
    if (!titulo.trim() || isCreating) return;
    setIsCreating(true);
    try {
      await createTask.mutateAsync({
        titulo:       titulo.trim(),
        estado,
        prioridad,
        esfuerzo:     esfuerzo || undefined,
        formato:      formato  || undefined,
        proyecto_ids: proyId   ? [proyId]    : [],
        cliente_ids:  clienteId ? [clienteId] : [],
        fechaEntrega: fechaEntrega || undefined,
      } as any);
      setDone(true);
      setTimeout(() => {
        setTitulo(""); setEstado("Pendiente"); setPrioridad("Media");
        setEsfuerzo(""); setFormato(""); setProyId(""); setClienteId("");
        setFechaEntrega(""); setDone(false);
      }, 1400);
    } catch { /* noop */ } finally { setIsCreating(false); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3.5 border-b border-white/[0.06]" style={{ background: "#0b0b0e" }}>
        <div className="w-7 h-7 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0">
          <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
        </div>
        <span className="flex-1 text-xs font-black text-white uppercase tracking-wider">Nueva tarea</span>
        <button onClick={onClose}
          className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all">
          <X className="w-3.5 h-3.5 text-white/40" />
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3" style={{ scrollbarWidth: "thin" }}>

        {/* Título */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Título *</label>
          <textarea
            autoFocus
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleCreate(); } }}
            placeholder="Nombre de la tarea..."
            rows={2}
            className="w-full bg-white/5 border border-white/10 text-xs font-bold text-white placeholder-white/20 px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/40 resize-none transition-all"
          />
        </div>

        {/* Estado + Prioridad */}
        <div className="grid grid-cols-2 gap-2">
          <Field label="Estado">
            <Select value={estado} onChange={setEstado} color={statusColor(estado)}>
              {TASK_ESTADO_OPTS.map(o => <option key={o} value={o} className="bg-[#111]">{o}</option>)}
            </Select>
          </Field>
          <Field label="Prioridad">
            <Select value={prioridad} onChange={setPrioridad} color={PRIORITY_COLORS[prioridad]}>
              {TASK_PRIO_OPTS.map(o => <option key={o} value={o} className="bg-[#111]">{o}</option>)}
            </Select>
          </Field>
        </div>

        {/* Esfuerzo + Formato */}
        <div className="grid grid-cols-2 gap-2">
          <Field label="Esfuerzo">
            <Select value={esfuerzo} onChange={setEsfuerzo}>
              <option value="" className="bg-[#111]">—</option>
              {ESFUERZOS.map(o => <option key={o} value={o} className="bg-[#111]">{o}</option>)}
            </Select>
          </Field>
          <Field label="Formato">
            <Select value={formato} onChange={setFormato}>
              <option value="" className="bg-[#111]">—</option>
              {FORMATOS.map(o => <option key={o} value={o} className="bg-[#111]">{o}</option>)}
            </Select>
          </Field>
        </div>

        {/* Proyecto */}
        {activeProjects.length > 0 && (
          <Field label="Proyecto">
            <Select value={proyId} onChange={setProyId}>
              <option value="" className="bg-[#111]">Sin proyecto</option>
              {activeProjects.map(p => <option key={p.id} value={p.id} className="bg-[#111]">{p.nombre}</option>)}
            </Select>
          </Field>
        )}

        {/* Cliente */}
        {clientes.length > 0 && (
          <Field label="Cliente">
            <Select value={clienteId} onChange={setClienteId}>
              <option value="" className="bg-[#111]">Sin cliente</option>
              {clientes.map(c => <option key={c.id} value={c.id} className="bg-[#111]">{c.nombre}</option>)}
            </Select>
          </Field>
        )}

        {/* Fecha entrega */}
        <Field label="Fecha entrega">
          <input type="date" value={fechaEntrega} onChange={e => setFechaEntrega(e.target.value)}
            className="w-full bg-white/5 border border-white/5 text-[11px] font-bold px-2 py-1.5 rounded-lg focus:outline-none text-white/70" />
        </Field>
      </div>

      {/* Footer button */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-white/[0.06]">
        <button
          onClick={handleCreate}
          disabled={!titulo.trim() || isCreating}
          className={cn(
            "w-full py-3 rounded-xl text-xs font-black text-white flex items-center justify-center gap-2 transition-all",
            done ? "bg-green-600" : "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-40"
          )}>
          {done ? <><Check className="w-3.5 h-3.5" /> ¡Tarea creada!</>
            : isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <><CheckSquare className="w-3.5 h-3.5" /> Crear tarea</>
          }
        </button>
      </div>
    </div>
  );
}

// ── Project Creator (Wizard) ───────────────────────────────────────────────────
function ProjectCreator({ onClose }: { onClose: () => void }) {
  const { data } = useData();
  const createProject = useCreateProject();

  const [step, setStep] = useState(1);
  const [nombre, setNombre] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [template, setTemplate] = useState("scratch");
  const [workers, setWorkers] = useState<string[]>([]);
  const [tiempoEst, setTiempoEst] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [done, setDone] = useState(false);

  const clientes = data?.clientes ?? [];
  const team = data?.trabajadores ?? [];

  const handleCreate = async () => {
    if (!nombre.trim() || isCreating) return;
    setIsCreating(true);
    try {
      // In a real implementation we'd save team and estimated time too
      await createProject.mutateAsync({
        nombre: nombre.trim(),
        estadoProyecto: "🧠 Planificacion",
        prioridad: "MODERADO",
        cliente_ids: clienteId ? [clienteId] : [],
      } as any);
      setDone(true);
      setTimeout(() => {
        setStep(1); setNombre(""); setClienteId(""); setTemplate("scratch");
        setWorkers([]); setTiempoEst(""); setDone(false); onClose();
      }, 1400);
    } catch { /* noop */ } finally { setIsCreating(false); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 flex flex-col px-4 py-3.5 border-b border-white/[0.06]" style={{ background: "#0b0b0e" }}>
        <div className="flex items-center justify-between mb-2">
           <div className="flex items-center gap-2">
             <div className="w-7 h-7 rounded-full bg-purple-600/20 flex items-center justify-center">
               <Layers className="w-3.5 h-3.5 text-purple-400" />
             </div>
             <span className="text-xs font-black text-white uppercase tracking-wider">Nuevo proyecto</span>
           </div>
           <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all">
             <X className="w-3.5 h-3.5 text-white/40" />
           </button>
        </div>
        {/* Progress bar */}
        <div className="flex gap-1 mt-2">
          {[1,2,3,4].map(s => (
            <div key={s} className={cn("h-1 flex-1 rounded-full transition-all", s <= step ? "bg-purple-500" : "bg-white/10")} />
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-6" style={{ scrollbarWidth: "thin" }}>
        {step === 1 && (
          <div className="flex flex-col gap-4 animate-in slide-in-from-right-4 fade-in">
             <h3 className="text-sm font-black text-white mb-2">Paso 1: Contexto</h3>
             <Field label="Nombre del Proyecto *">
               <input autoFocus value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Rediseño Web..." className="w-full bg-white/5 border border-white/10 text-sm font-bold text-white px-3 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all" />
             </Field>
             {clientes.length > 0 && (
               <Field label="Cliente Asociado">
                 <Select value={clienteId} onChange={setClienteId}>
                   <option value="" className="bg-[#111]">Sin cliente interno</option>
                   {clientes.map(c => <option key={c.id} value={c.id} className="bg-[#111]">{c.nombre}</option>)}
                 </Select>
               </Field>
             )}
          </div>
        )}
        
        {step === 2 && (
          <div className="flex flex-col gap-4 animate-in slide-in-from-right-4 fade-in">
             <h3 className="text-sm font-black text-white mb-2">Paso 2: Estructura</h3>
             <div className="flex flex-col gap-2">
                <button onClick={() => setTemplate("scratch")} className={cn("p-4 rounded-xl border text-left transition-all", template === "scratch" ? "border-purple-500/50 bg-purple-500/10" : "border-white/10 bg-white/5 hover:border-white/20")}>
                  <p className="text-xs font-black text-white mb-1">Desde Cero</p>
                  <p className="text-[10px] text-white/50">Crea las fases y tareas manualmente.</p>
                </button>
                <button onClick={() => setTemplate("branding")} className={cn("p-4 rounded-xl border text-left transition-all", template === "branding" ? "border-purple-500/50 bg-purple-500/10" : "border-white/10 bg-white/5 hover:border-white/20")}>
                  <p className="text-xs font-black text-white mb-1">Plantilla: Branding</p>
                  <p className="text-[10px] text-white/50">Fases pre-cargadas de Research y Diseño.</p>
                </button>
                <button onClick={() => setTemplate("web")} className={cn("p-4 rounded-xl border text-left transition-all", template === "web" ? "border-purple-500/50 bg-purple-500/10" : "border-white/10 bg-white/5 hover:border-white/20")}>
                  <p className="text-xs font-black text-white mb-1">Plantilla: Desarrollo Web</p>
                  <p className="text-[10px] text-white/50">Fases de UX/UI, Frontend y QA.</p>
                </button>
             </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4 animate-in slide-in-from-right-4 fade-in">
             <h3 className="text-sm font-black text-white mb-2">Paso 3: Equipo Inicial</h3>
             <p className="text-xs text-white/50 mb-2">Selecciona a los responsables clave.</p>
             <div className="flex flex-col gap-2">
                {team.map(w => {
                  const isSel = workers.includes(w.id);
                  return (
                    <button key={w.id} onClick={() => setWorkers(prev => isSel ? prev.filter(id => id !== w.id) : [...prev, w.id])}
                      className={cn("p-3 rounded-xl border flex items-center justify-between transition-all", isSel ? "border-purple-500/50 bg-purple-500/10" : "border-white/10 bg-white/5")}>
                      <span className="text-xs font-bold text-white">{w.nombre}</span>
                      {isSel && <Check className="w-3.5 h-3.5 text-purple-400" />}
                    </button>
                  );
                })}
             </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-4 animate-in slide-in-from-right-4 fade-in">
             <h3 className="text-sm font-black text-white mb-2">Paso 4: Tiempo Estimado</h3>
             <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest bg-purple-400/10 p-2 rounded-lg mb-2">
               "No medimos horas de silla, medimos progreso."
             </p>
             <Field label="Estimación Total (Horas)">
               <input type="number" value={tiempoEst} onChange={e => setTiempoEst(e.target.value)} placeholder="Ej: 40" className="w-full bg-white/5 border border-white/10 text-lg font-black text-white px-3 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all text-center" />
             </Field>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 flex gap-2 px-4 pb-4 pt-4 border-t border-white/[0.06]">
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)} className="px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-white hover:bg-white/10 transition-all">
            Atrás
          </button>
        )}
        <button
          onClick={() => step < 4 ? setStep(s => s + 1) : handleCreate()}
          disabled={(step === 1 && !nombre.trim()) || isCreating}
          className={cn(
            "flex-1 py-3 rounded-xl text-xs font-black text-white flex items-center justify-center gap-2 transition-all",
            done ? "bg-green-600" : "bg-gradient-to-r from-purple-700 to-purple-500 hover:from-purple-600 hover:to-purple-400 disabled:opacity-40"
          )}>
          {done ? <><Check className="w-3.5 h-3.5" /> ¡Proyecto creado!</>
            : isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : step < 4 ? "Siguiente Paso" : <><Layers className="w-3.5 h-3.5" /> Crear Proyecto</>
          }
        </button>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

function Select({ value, onChange, color, children }: {
  value: string; onChange: (v: string) => void;
  color?: string; children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-white/5 border border-white/5 text-[11px] font-bold px-2 py-1.5 rounded-lg focus:outline-none appearance-none cursor-pointer"
      style={{ color: color || "rgba(255,255,255,0.7)" }}
    >
      {children}
    </select>
  );
}
