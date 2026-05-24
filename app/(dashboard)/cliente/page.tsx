"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuthStore } from "@/lib/store";
import { Check, Loader2 } from "lucide-react";
import { useData, useUpdateTask } from "@/hooks/useData";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";

// ── NATIVE SVG ICONS ──
const IconLayers = () => <svg className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>;
const IconCalendar = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
const IconMessage = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
const IconGrip = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1" /><circle cx="9" cy="5" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="19" r="1" /></svg>;
const IconFolder = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>;
const IconChevron = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;
const IconX = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
const IconBell = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>;
const IconCheckCircle = () => <svg className="w-4 h-4 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconUser = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IconInstagram = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>;
const IconFacebook = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>;
const IconTikTok = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5v3a3 3 0 0 1-3-3"/><line x1="13" y1="20" x2="13" y2="16"/></svg>;
const IconWhatsApp = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>;
const IconGlobe = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
const IconPhone = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;

// ── UTILS ──
const cn = (...classes: any[]) => classes.filter(Boolean).join(" ");
const fmt = (d?: string) => d ? new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) : "Sin fecha";

const COLUMNS = [
  { id: "aprobar", label: "Por Aprobar", color: "orange", states: ["Por hacer", "Modificar", "Revision"] },
  { id: "proceso", label: "En Producción", color: "blue", states: ["En proceso", "Aprobado", "Pendiente", "Por publicar", "Aprobación", "Esperando aprobación"] },
  { id: "hecho", label: "Listos / Publicados", color: "green", states: ["Hecho", "Publicado", "✅ Completado", "Completado"] },
];

// ── ATOMIC CARD ──
function TaskCard({ task, type, onClick }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      onClick={onClick}
      className={cn(
        "p-6 rounded-[2.5rem] border bg-[#121217] relative group cursor-pointer hover:-translate-y-1 transition-transform",
        type === "aprobar" ? "border-orange-500/30 shadow-lg shadow-orange-500/10" : type === "proceso" ? "border-blue-600/10 hover:border-blue-500/30" : "border-green-500/10 opacity-70 hover:opacity-100"
      )}
    >
      <div {...attributes} {...listeners} onClick={e => e.stopPropagation()} className="absolute top-5 right-5 opacity-20 hover:opacity-100 p-2 cursor-grab active:cursor-grabbing text-white">
        <IconGrip />
      </div>
      
      <div className="flex flex-col items-start text-left">
        <div className="text-[9px] font-black uppercase text-blue-400 bg-blue-400/10 px-3 py-1.5 rounded-full mb-3 flex items-center gap-1.5 tracking-wider">
          <IconLayers /> {task.formato || "Post"}
        </div>
        <h4 className="text-sm font-black mb-4 leading-snug text-white/90 w-[85%]">{task.titulo}</h4>
        
        {task.notasCliente && type !== "hecho" && (
          <div className="w-full mb-3 px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-[10px] font-bold text-orange-400 flex items-center gap-2">
            <IconMessage /> Nota enviada
          </div>
        )}

        <div className="text-[10px] font-bold text-white/40 flex items-center gap-1.5 mt-auto">
          <IconCalendar /> {fmt(task.fechaProg)}
        </div>
      </div>
    </div>
  );
}

// ── GLASSMORPHISM MODAL ──
function TaskModal({ task, onClose, onSaveNote, onApprove, isPendingApproval }: any) {
  const [localNote, setLocalNote] = useState(task.notasCliente || "");
  const [isEditing, setIsEditing] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-[#0e0e11]/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-8 pb-4">
          <div className="flex items-start justify-between mb-6">
            <div className="text-[10px] font-black uppercase text-blue-400 bg-blue-400/10 px-3 py-1.5 rounded-full flex items-center gap-2 tracking-wider">
              <IconLayers /> {task.formato || "Post"}
            </div>
            <button onClick={onClose} className="text-white/30 hover:text-white p-1 transition-colors"><IconX /></button>
          </div>
          
          <h2 className="text-2xl font-black mb-6 leading-tight">{task.titulo}</h2>
          
          <div className="flex items-center gap-6 text-xs font-bold text-white/50 mb-8 border-b border-white/5 pb-6">
            <div className="flex items-center gap-2"><IconCalendar /> Programado: {fmt(task.fechaProg)}</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" /> Estado: {task.estado}</div>
          </div>

          {task.contenido && (
            <div className="mb-8">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Copy / Contenido sugerido</h4>
              <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/5 text-sm text-white/70 italic leading-relaxed">
                "{task.contenido}"
              </div>
            </div>
          )}

          <div className="mb-4">
             <div className="flex items-center justify-between mb-3">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-400 flex items-center gap-2">
                 <IconMessage /> Tus Notas
               </h4>
             </div>
             
             {isEditing ? (
               <div className="p-1 rounded-3xl bg-gradient-to-r from-orange-500/20 to-orange-400/10">
                 <textarea 
                   autoFocus 
                   className="w-full bg-[#121217] rounded-[1.4rem] border-none text-sm text-white focus:ring-0 p-5 min-h-[100px] resize-none" 
                   value={localNote} 
                   onChange={e => setLocalNote(e.target.value)} 
                   placeholder="Escribe los cambios que necesitas..."
                 />
               </div>
             ) : (
               <div onClick={() => setIsEditing(true)} className="p-5 rounded-3xl bg-orange-500/5 border border-orange-500/10 text-sm text-white/70 leading-relaxed cursor-text hover:bg-orange-500/10 transition-colors min-h-[60px]">
                 {task.notasCliente || <span className="opacity-50">Añadir una nota o corrección...</span>}
               </div>
             )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-6 bg-white/[0.02] border-t border-white/5 flex gap-4 mt-auto">
          {isEditing ? (
            <>
              <button onClick={() => setIsEditing(false)} className="flex-1 py-4 rounded-2xl text-xs font-black bg-white/5 text-white/50 hover:bg-white/10 transition-colors">CANCELAR</button>
              <button onClick={() => { onSaveNote(localNote); setIsEditing(false); }} className="flex-1 py-4 rounded-2xl text-xs font-black bg-orange-500 text-white hover:bg-orange-400 transition-all shadow-lg shadow-orange-500/20">GUARDAR NOTA</button>
            </>
          ) : (
            <>
              <button onClick={() => setIsEditing(true)} className="flex-1 py-4 rounded-2xl text-xs font-black bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors">MODIFICAR / AÑADIR NOTA</button>
              {isPendingApproval && (
                <button onClick={onApprove} className="flex-1 py-4 rounded-2xl text-xs font-black bg-blue-600 text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2">
                  <IconCheckCircle /> APROBAR CONTENIDO
                </button>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}


// ── MAIN PAGE ──
export default function ClientePage() {
  const userId = useAuthStore((s) => s.userId) || "2f14e2b7-e44b-8078-833b-d40197b79a95";
  const { data, isLoading } = useData();
  const updateTask = useUpdateTask();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [localTasks, setLocalTasks] = useState<any[]>([]);
  const [syncingIds, setSyncingIds] = useState<string[]>([]);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    if (data?.tareas && syncingIds.length === 0) setLocalTasks(data.tareas);
  }, [data?.tareas, syncingIds]);

  const client = useMemo(() => data?.clientes.find(c => c.id === userId), [data, userId]);
  const myProjects = useMemo(() => {
    const list = (data?.proyectos ?? []).filter(p => userId && p.cliente_ids?.includes(userId));
    return {
      active: list.filter(p => p.estadoProyecto !== "Completado" && p.estadoProyecto !== "Finalizado"),
      completed: list.filter(p => p.estadoProyecto === "Completado" || p.estadoProyecto === "Finalizado"),
    };
  }, [data?.proyectos, userId]);

  useEffect(() => {
    if (!selectedProjectId && myProjects.active.length > 0) setSelectedProjectId(myProjects.active[0].id);
  }, [myProjects, selectedProjectId]);

  const selectedProject = useMemo(() => [...myProjects.active, ...myProjects.completed].find(p => p.id === selectedProjectId), [myProjects, selectedProjectId]);
  const projectTasks = useMemo(() => selectedProject ? localTasks.filter(t => t.proyecto_ids?.includes(selectedProject.id)) : [], [localTasks, selectedProject]);

  const progressPercentage = useMemo(() => {
    if (projectTasks.length === 0) return 0;
    const completed = projectTasks.filter(t => COLUMNS[2].states.includes(t.estado)).length;
    return Math.round((completed / projectTasks.length) * 100);
  }, [projectTasks]);

  const timelineEvents = useMemo(() => {
    // Generar eventos falsos basados en las tareas (como si fuera un registro real)
    const recent = [...projectTasks].sort((a,b) => new Date(b.created).getTime() - new Date(a.created).getTime()).slice(0, 5);
    return recent.map(t => ({
      id: t.id,
      text: `Actualización en "${t.titulo}"`,
      date: t.created,
      type: COLUMNS[2].states.includes(t.estado) ? 'done' : 'update'
    }));
  }, [projectTasks]);

  const findContainer = (id: string) => {
    if (COLUMNS.find(c => c.id === id)) return id;
    const task = localTasks.find(t => t.id === id);
    if (!task) return null;
    return COLUMNS.find(c => c.states.includes(task.estado))?.id;
  };

  const handleSaveNote = (taskId: string, text: string) => {
    setLocalTasks(prev => prev.map(t => t.id === taskId ? { ...t, notasCliente: text, estado: "Modificar" } : t));
    setSyncingIds(prev => [...prev, taskId]);
    setSelectedTask(null); // Cerrar modal al guardar
    updateTask.mutate({ id: taskId, estado: "Modificar", notasCliente: text }, {
      onSettled: () => setSyncingIds(prev => prev.filter(id => id !== taskId))
    });
  };

  const handleApprove = (taskId: string) => {
    setLocalTasks(prev => prev.map(t => t.id === taskId ? { ...t, estado: "Aprobado" } : t));
    setSyncingIds(prev => [...prev, taskId]);
    setSelectedTask(null); // Cerrar modal al aprobar
    updateTask.mutate({ id: taskId, estado: "Aprobado" }, {
      onSettled: () => setSyncingIds(prev => prev.filter(id => id !== taskId))
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as string;
    const overContainer = findContainer(over.id as string);
    if (!overContainer || overContainer === "hecho") return;

    let newState = COLUMNS.find(c => c.id === overContainer)?.states[0] || "Aprobado";
    if (overContainer === "proceso") newState = "Aprobado";
    if (overContainer === "aprobar") newState = "Por hacer";

    const task = localTasks.find(t => t.id === taskId);
    if (task && task.estado !== newState) {
      setLocalTasks(prev => prev.map(t => t.id === taskId ? { ...t, estado: newState } : t));
      setSyncingIds(prev => [...prev, taskId]);
      updateTask.mutate({ id: taskId, estado: newState }, {
        onSettled: () => setSyncingIds(prev => prev.filter(id => id !== taskId))
      });
    }
  };

  if (isLoading) return <div className="h-screen bg-[#0a0a0c] flex items-center justify-center text-blue-500 font-black tracking-widest">CARGANDO...</div>;

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0c] text-white font-sans">
      
      {/* ── SIDEBAR: TIMELINE & INFO ── */}
      <aside className="w-[300px] flex-shrink-0 flex flex-col border-r border-white/5 bg-[#0e0e11] z-20 overflow-hidden">
        {/* CABECERA (Fija) */}
        <div className="p-8 border-b border-white/5 text-center relative overflow-hidden flex-shrink-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none" />
          <div className="w-20 h-20 rounded-[2.5rem] bg-blue-600 flex items-center justify-center text-white font-black text-3xl mx-auto mb-5 shadow-2xl shadow-blue-600/20">{client?.nombre?.[0] || "C"}</div>
          <h1 className="text-lg font-black truncate">{client?.nombre}</h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-white/30 mt-2">Portal de Cliente</p>
        </div>

        {/* PANEL DE INFORMACIÓN (Fijo o Scroll dependiendo de diseño, aquí lo dejamos fijo) */}
        <div className="p-6 border-b border-white/5 flex-shrink-0">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2 mb-4">
            <IconUser /> Info del Cliente
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {client?.whatsapp && (
              <a href={client.whatsapp} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 hover:text-green-300 transition-colors border border-green-500/10">
                <IconWhatsApp /><span className="text-[10px] font-bold">WhatsApp</span>
              </a>
            )}
            {client?.instagram && (
              <a href={client.instagram} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 hover:text-pink-300 transition-colors border border-pink-500/10">
                <IconInstagram /><span className="text-[10px] font-bold">Instagram</span>
              </a>
            )}
            {client?.facebook && (
              <a href={client.facebook} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition-colors border border-blue-500/10">
                <IconFacebook /><span className="text-[10px] font-bold">Facebook</span>
              </a>
            )}
            {client?.tiktok && (
              <a href={client.tiktok} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors border border-white/5">
                <IconTikTok /><span className="text-[10px] font-bold">TikTok</span>
              </a>
            )}
            {client?.web && (
              <a href={client.web} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300 transition-colors border border-purple-500/10 col-span-2 justify-center">
                <IconGlobe /><span className="text-[10px] font-bold">Sitio Web</span>
              </a>
            )}
            {(client?.celular || client?.telefono) && (
              <div className="col-span-2 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 text-white/50 border border-white/5 mt-1">
                <IconPhone />
                <span className="text-[10px] font-bold select-all tracking-wider">{client.celular || client.telefono}</span>
              </div>
            )}
          </div>
        </div>

        {/* TIMELINE (Scrollable) */}
        <div className="p-8 flex-1 overflow-y-auto hide-scrollbar">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2 mb-6">
            <IconBell /> Actividad Reciente
          </h3>
          
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/5 before:to-transparent">
            {timelineEvents.map((ev, idx) => (
              <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className={cn("flex items-center justify-center w-6 h-6 rounded-full border-4 border-[#0e0e11] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow", ev.type === 'done' ? "bg-green-500" : "bg-blue-500")}>
                  {ev.type === 'done' && <Check className="w-3 h-3 text-[#0e0e11]" />}
                </div>
                <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-2xl bg-white/[0.02] border border-white/5 shadow">
                  <time className="font-bold text-[9px] text-white/30 uppercase">{fmt(ev.date)}</time>
                  <div className="text-[11px] font-bold text-white/70 mt-1 leading-snug">{ev.text}</div>
                </div>
              </div>
            ))}
            {timelineEvents.length === 0 && (
              <div className="text-xs text-white/20 italic text-center py-4">No hay actividad reciente.</div>
            )}
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

        {selectedProject ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            
            {/* ── PROJECT TABS ── */}
            <div className="px-10 pt-8 pb-4 overflow-x-auto flex gap-4 flex-shrink-0 z-10 hide-scrollbar">
               {myProjects.active.map(p => (
                 <div key={p.id} onClick={() => setSelectedProjectId(p.id)} className={cn("flex-shrink-0 px-6 py-3 rounded-full cursor-pointer transition-all border text-xs font-bold whitespace-nowrap", selectedProjectId === p.id ? "bg-white text-black border-white shadow-lg shadow-white/10" : "bg-white/[0.03] border-white/10 text-white/50 hover:text-white hover:bg-white/10")}>
                   {p.nombre}
                 </div>
               ))}
            </div>

            {/* ── PROJECT OVERVIEW HEADER ── */}
            <div className="px-10 py-8 flex flex-col gap-6 z-10">
               <div className="flex items-end justify-between">
                 <div>
                   <h2 className="text-4xl font-black tracking-tight mb-2">{selectedProject.nombre}</h2>
                   <p className="text-sm font-bold text-white/40 max-w-xl leading-relaxed">{selectedProject.descripcion || "Visualiza y aprueba el contenido de este proyecto en tiempo real."}</p>
                 </div>
                 
                 {/* Action Buttons */}
                 <div className="flex items-center gap-3">
                    {syncingIds.length > 0 && (
                      <div className="text-[10px] font-black uppercase text-blue-400 bg-blue-400/10 px-3 py-2 rounded-full flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" /> Guardando...
                      </div>
                    )}
                    {selectedProject.recursosDrive && (
                      <button onClick={() => window.open(selectedProject.recursosDrive, "_blank")} className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20">
                        <IconFolder /> Acceder a Drive <IconChevron />
                      </button>
                    )}
                 </div>
               </div>

               {/* Progress Bar */}
               <div className="w-full bg-white/5 rounded-3xl p-1 relative flex items-center h-4 overflow-hidden border border-white/5">
                 <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: progressPercentage + "%" }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"
                 />
                 <div className="absolute w-full text-center text-[9px] font-black mix-blend-difference text-white tracking-widest">{progressPercentage}% COMPLETADO</div>
               </div>
            </div>

            {/* ── KANBAN COLUMNS ── */}
            <div className="flex-1 overflow-x-auto flex px-10 pb-10 gap-6 items-start z-10 hide-scrollbar">
              {COLUMNS.map(col => (
                <Column key={col.id} id={col.id} label={col.label} color={col.color} count={projectTasks.filter(t => col.states.includes(t.estado)).length}>
                   <SortableContext id={col.id} items={projectTasks.filter(t => col.states.includes(t.estado)).map(t => t.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-4">
                        {projectTasks.filter(t => col.states.includes(t.estado)).map(task => (
                          <TaskCard 
                            key={task.id} 
                            task={task} 
                            type={col.id} 
                            onClick={() => setSelectedTask(task)}
                          />
                        ))}
                      </div>
                   </SortableContext>
                </Column>
              ))}
            </div>

          </DndContext>
        ) : (
           <div className="flex-1 flex flex-col items-center justify-center text-white/30">
              <IconLayers />
              <p className="text-sm font-bold mt-4">No hay proyectos activos.</p>
           </div>
        )}
      </main>

      {/* ── RENDER TASK MODAL ── */}
      <AnimatePresence>
        {selectedTask && (
          <TaskModal 
            task={selectedTask} 
            onClose={() => setSelectedTask(null)}
            onSaveNote={(text: string) => handleSaveNote(selectedTask.id, text)}
            onApprove={() => handleApprove(selectedTask.id)}
            isPendingApproval={COLUMNS[0].states.includes(selectedTask.estado)}
          />
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{__html: ".hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }"}} />
    </div>
  );
}

function Column({ id, label, color, count, children }: any) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className="w-[340px] flex-shrink-0 flex flex-col">
      <div className="flex items-center justify-between mb-6 px-2">
        <div className="flex items-center gap-3">
          <div className={cn("w-2 h-2 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]", color === "orange" ? "bg-orange-500 shadow-orange-500/50" : color === "blue" ? "bg-blue-500 shadow-blue-500/50" : "bg-green-500 shadow-green-500/50")} />
          <h3 className="text-xs font-black uppercase tracking-widest text-white/70">{label}</h3>
        </div>
        <div className="text-[10px] font-bold text-white/30 bg-white/5 px-2 py-1 rounded-full">{count}</div>
      </div>
      <div className="flex-1 min-h-[400px]">{children}</div>
    </div>
  );
}
