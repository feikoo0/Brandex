"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  X,
  Folder,
  Check,
  Unlink,
  ChevronDown,
  ArrowRight
} from "lucide-react";
import { RichNoteToolbar, ActiveFormatsState } from "./RichNoteToolbar";
import type { NoteDoc } from "@/lib/types";
import { playSound } from "@/app/taski/utils/audio";
import { getSingleSourceProjectColor } from "@/lib/utils";
import { SmoothInput } from "@/components/ui/SmoothInput";

interface NoteExpandedModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: NoteDoc | null;
  onUpdateNote: (noteId: string, updates: Partial<NoteDoc>) => void;
  onDeleteNote?: (noteId: string) => void;
  onConvertToTask?: (note: NoteDoc) => void;
  projects?: any[];
  allTasks?: any[];
  isNightMode?: boolean;
}

// Helper para convertir Markdown simple existente a HTML al inicializar el editor
function convertLegacyMarkdownToHtml(text: string): string {
  if (!text || text.trim() === "" || text === "<p><br></p>") {
    return "";
  }
  if (/<(p|h1|h2|h3|ul|ol|li|b|strong|i|em|u|s|blockquote|div|span)[^>]*>/i.test(text)) {
    return text;
  }
  return text
    .replace(/^#\s+(.*)$/gm, "<h1>$1</h1>")
    .replace(/^##\s+(.*)$/gm, "<h2>$1</h2>")
    .replace(/^###\s+(.*)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
    .replace(/\*(.*?)\*/g, "<i>$1</i>")
    .replace(/^-\s+(.*)$/gm, "<li>$1</li>")
    .replace(/^>\s+(.*)$/gm, "<blockquote>$1</blockquote>")
    .replace(/\n/g, "<br>");
}

// Helper para obtener timestamp numérico de ordenamiento por más reciente
function getRecencyTimestamp(item: any): number {
  if (!item) return 0;
  if (item.updatedAt?.toMillis) return item.updatedAt.toMillis();
  if (item.updated_at?.toMillis) return item.updated_at.toMillis();
  if (item.createdAt?.toMillis) return item.createdAt.toMillis();
  if (item.created_at?.toMillis) return item.created_at.toMillis();
  if (item.updatedAt) {
    const t = new Date(item.updatedAt).getTime();
    if (!isNaN(t)) return t;
  }
  if (item.createdAt) {
    const t = new Date(item.createdAt).getTime();
    if (!isNaN(t)) return t;
  }
  if (item.fechaInicio) {
    const t = new Date(item.fechaInicio).getTime();
    if (!isNaN(t)) return t;
  }
  if (typeof item.id === "number") return item.id;
  if (typeof item.id === "string" && !isNaN(Number(item.id))) return Number(item.id);
  return 0;
}

export function NoteExpandedModal({
  isOpen,
  onClose,
  note,
  onUpdateNote,
  onConvertToTask,
  projects = [],
  allTasks = [],
  isNightMode = true,
}: NoteExpandedModalProps) {
  const [title, setTitle] = useState(note?.title || "");
  const [contentHtml, setContentHtml] = useState("");
  const [currentBlockType, setCurrentBlockType] = useState<"p" | "h1" | "h2" | "ul" | "ol" | "blockquote">("p");
  const [activeFormats, setActiveFormats] = useState<ActiveFormatsState>({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    list: false,
    numbered: false,
    quote: false,
  });
  const [isCompleted, setIsCompleted] = useState<boolean>(!!note?.isCompleted);
  const [isLinkDropdownOpen, setIsLinkDropdownOpen] = useState(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const linkDropdownRef = useRef<HTMLDivElement>(null);

  // Proyectos ordenados de arriba a abajo por los más recientes
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const timeA = getRecencyTimestamp(a);
      const timeB = getRecencyTimestamp(b);
      return timeB - timeA;
    });
  }, [projects]);

  const attachedProject = useMemo(() => {
    if (!note?.projectId && !note?.projectTitle) return null;
    return (
      projects.find((p: any) => String(p.id) === String(note?.projectId)) ||
      projects.find(
        (p: any) =>
          (p.nombre || p.title)?.toLowerCase().trim() ===
          note?.projectTitle?.toLowerCase().trim()
      ) ||
      (note?.projectTitle ? { nombre: note.projectTitle } : null)
    );
  }, [projects, note?.projectId, note?.projectTitle]);

  const attachedProjectColor = useMemo(() => {
    if (!attachedProject) return null;
    return getSingleSourceProjectColor(attachedProject);
  }, [attachedProject]);

  // Tareas de un proyecto ordenadas también de más recientes a más antiguas
  const getProjectTasks = useCallback(
    (proj: any) => {
      let tasksList = Array.isArray(proj.tasks) ? [...proj.tasks] : [];
      if (tasksList.length === 0 && Array.isArray(allTasks)) {
        tasksList = allTasks.filter(
          (t) => String(t.projectId || t.proyecto_id || t.proyecto_ids?.[0]) === String(proj.id)
        );
      }
      return tasksList.sort((a, b) => {
        const timeA = getRecencyTimestamp(a);
        const timeB = getRecencyTimestamp(b);
        return timeB - timeA;
      });
    },
    [allTasks]
  );

  // Inspector de cursor en tiempo real para detectar el estilo activo en el bloque actual
  const updateActiveStyles = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || !selection.anchorNode || !editorRef.current) return;

    let node: Node | null = selection.anchorNode;
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }

    let detectedBlock: "p" | "h1" | "h2" | "ul" | "ol" | "blockquote" = "p";
    let curr: Node | null = node;
    while (curr && curr !== editorRef.current) {
      const tag = (curr as HTMLElement).tagName?.toLowerCase();
      if (tag === "h1") {
        detectedBlock = "h1";
        break;
      }
      if (tag === "h2" || tag === "h3") {
        detectedBlock = "h2";
        break;
      }
      if (tag === "ul" || (tag === "li" && curr.parentElement?.tagName.toLowerCase() === "ul")) {
        detectedBlock = "ul";
        break;
      }
      if (tag === "ol" || (tag === "li" && curr.parentElement?.tagName.toLowerCase() === "ol")) {
        detectedBlock = "ol";
        break;
      }
      if (tag === "blockquote") {
        detectedBlock = "blockquote";
        break;
      }
      curr = curr.parentNode;
    }
    setCurrentBlockType(detectedBlock);

    try {
      setActiveFormats({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        strikeThrough: document.queryCommandState("strikeThrough"),
        list: detectedBlock === "ul",
        numbered: detectedBlock === "ol",
        quote: detectedBlock === "blockquote",
      });
    } catch {
      // Ignorar errores en nodos no editables
    }
  }, []);

  const lastNoteIdRef = useRef<string | null>(null);

  // Sincronizar estado local y enfocar título SOLO la primera vez que se abre la nota
  useEffect(() => {
    if (!isOpen || !note) {
      lastNoteIdRef.current = null;
      return;
    }

    const isNewNoteOpen = lastNoteIdRef.current !== note.id;
    lastNoteIdRef.current = note.id;

    if (isNewNoteOpen) {
      // Primera vez que se abre esta nota
      setTitle(note.title || "Nueva Nota");
      const html = convertLegacyMarkdownToHtml(note.content || "");
      setContentHtml(html);
      setIsCompleted(!!note.isCompleted);

      if (editorRef.current) {
        editorRef.current.innerHTML = html;
      }

      // Auto-focus en el título SOLO UNA VEZ al abrir la ventana
      const timer = setTimeout(() => {
        if (titleInputRef.current && document.activeElement !== editorRef.current) {
          titleInputRef.current.focus();
          if (note.title === "Nueva Nota" || !note.title) {
            titleInputRef.current.select();
          }
        }
        updateActiveStyles();
      }, 50);

      return () => clearTimeout(timer);
    } else {
      // Actualización de la misma nota mientras está abierta (ej. auto-save reactivo de Firestore)
      // NUNCA robar el foco ni sobrescribir lo que el usuario está escribiendo activamente
      const isEditingTitle = document.activeElement === titleInputRef.current;
      const isEditingContent =
        editorRef.current?.contains(document.activeElement) ||
        document.activeElement === editorRef.current;

      if (!isEditingTitle && note.title !== undefined) {
        setTitle(note.title);
      }

      if (!isEditingContent && note.content !== undefined) {
        const html = convertLegacyMarkdownToHtml(note.content);
        setContentHtml(html);
        if (editorRef.current && editorRef.current.innerHTML !== html) {
          editorRef.current.innerHTML = html;
        }
      }

      setIsCompleted(!!note.isCompleted);
    }
  }, [isOpen, note, updateActiveStyles]);

  // Debounced auto-save a Firestore
  const triggerAutoSave = (updates: Partial<NoteDoc>) => {
    if (!note?.id) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      onUpdateNote(note.id, updates);
    }, 400);
  };

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (linkDropdownRef.current && !linkDropdownRef.current.contains(e.target as Node)) {
        setIsLinkDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Manejador de formateo WYSIWYG real en contentEditable
  const handleFormatClick = (format: "bold" | "italic" | "underline" | "strikeThrough" | "list" | "numbered" | "quote") => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    switch (format) {
      case "bold":
        document.execCommand("bold", false);
        break;
      case "italic":
        document.execCommand("italic", false);
        break;
      case "underline":
        document.execCommand("underline", false);
        break;
      case "strikeThrough":
        document.execCommand("strikeThrough", false);
        break;
      case "list":
        document.execCommand("insertUnorderedList", false);
        break;
      case "numbered":
        document.execCommand("insertOrderedList", false);
        break;
      case "quote":
        document.execCommand("formatBlock", false, "<blockquote>");
        break;
    }

    const newHtml = editorRef.current.innerHTML;
    setContentHtml(newHtml);
    triggerAutoSave({ content: newHtml });
    setTimeout(updateActiveStyles, 50);
  };

  // Manejador de cambio de bloque (Texto, Título, Subtítulo, etc.) con retención de cursor
  const handleBlockTypeChange = (type: "p" | "h1" | "h2" | "ul" | "ol" | "blockquote") => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    setCurrentBlockType(type);

    if (type === "ul") {
      document.execCommand("insertUnorderedList", false);
    } else if (type === "ol") {
      document.execCommand("insertOrderedList", false);
    } else if (type === "blockquote") {
      document.execCommand("formatBlock", false, "<blockquote>");
    } else if (type === "h1") {
      document.execCommand("formatBlock", false, "<h1>");
    } else if (type === "h2") {
      document.execCommand("formatBlock", false, "<h2>");
    } else {
      document.execCommand("formatBlock", false, "<p>");
    }

    const newHtml = editorRef.current.innerHTML;
    setContentHtml(newHtml);
    triggerAutoSave({ content: newHtml });
    setTimeout(updateActiveStyles, 50);
  };

  // Manejador de teclas: Flujo natural estilo macOS Notes
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Al presionar Enter en un Título o Subtítulo, pasar automáticamente a Texto normal (<p>)
    if (e.key === "Enter" && !e.shiftKey) {
      const selection = window.getSelection();
      if (selection && selection.anchorNode && editorRef.current) {
        let node: Node | null = selection.anchorNode;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
        let blockTag = "";
        let curr: Node | null = node;
        while (curr && curr !== editorRef.current) {
          const tag = (curr as HTMLElement).tagName?.toLowerCase();
          if (tag === "h1" || tag === "h2" || tag === "h3") {
            blockTag = tag;
            break;
          }
          curr = curr.parentNode;
        }

        if (blockTag === "h1" || blockTag === "h2" || blockTag === "h3") {
          e.preventDefault();
          document.execCommand("insertParagraph", false);
          document.execCommand("formatBlock", false, "<p>");
          setCurrentBlockType("p");
          const newHtml = editorRef.current.innerHTML;
          setContentHtml(newHtml);
          triggerAutoSave({ content: newHtml });
          setTimeout(updateActiveStyles, 50);
          return;
        }
      }
    }

    // Atajos de teclado rápidos
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      handleFormatClick("bold");
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
      e.preventDefault();
      handleFormatClick("italic");
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "u") {
      e.preventDefault();
      handleFormatClick("underline");
    }
  };

  // Píldora y dropdown de vinculación a tarea/proyecto (a la derecha de la barra de formato)
  const linkPillSlot = (
    <div className="relative flex items-center" ref={linkDropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsLinkDropdownOpen(!isLinkDropdownOpen);
          playSound("pop");
        }}
        style={
          attachedProjectColor
            ? {
                backgroundColor: `hsl(${attachedProjectColor.h} ${attachedProjectColor.s}% ${attachedProjectColor.l}% / 0.18)`,
                borderColor: `hsl(${attachedProjectColor.h} ${attachedProjectColor.s}% ${attachedProjectColor.l}% / 0.4)`,
                color: isNightMode
                  ? `hsl(${attachedProjectColor.h} ${Math.min(attachedProjectColor.s, 70)}% 90%)`
                  : `hsl(${attachedProjectColor.h} ${attachedProjectColor.s}% 25%)`,
              }
            : undefined
        }
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold border transition-all cursor-pointer ${
          attachedProjectColor
            ? ""
            : isNightMode
            ? "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
            : "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"
        }`}
      >
        <Folder
          className="w-3 h-3 shrink-0"
          style={attachedProjectColor ? { color: attachedProjectColor.hslCss } : { opacity: 0.6 }}
        />
        <span className="max-w-[240px] truncate">
          {note?.taskTitle
            ? `${note.projectTitle ? note.projectTitle + " • " : ""}${note.taskTitle}`
            : note?.projectTitle || "Vincular"}
        </span>
        <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
      </button>

      {/* Dropdown de vinculación monocromático con proyectos y tareas más recientes primero */}
      {isLinkDropdownOpen && (
        <div
          className={`absolute right-0 top-full mt-1.5 z-50 w-72 max-h-64 overflow-y-auto custom-scrollbar p-1.5 rounded-2xl border shadow-2xl backdrop-blur-2xl animate-fadeIn ${
            isNightMode ? "bg-[#1c1c1f] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
            Vincular a Tarea o Proyecto (Más recientes)
          </div>

          <button
            type="button"
            onClick={() => {
              if (note?.id) {
                onUpdateNote(note.id, {
                  taskId: null,
                  taskTitle: null,
                  projectId: null,
                  projectTitle: null,
                });
              }
              setIsLinkDropdownOpen(false);
              playSound("click");
            }}
            className={`w-full px-2.5 py-1.5 rounded-xl text-[13px] flex items-center gap-2 transition-colors text-left cursor-pointer ${
              isNightMode ? "hover:bg-white/10 text-white/70" : "hover:bg-slate-100 text-slate-700"
            }`}
          >
            <Unlink className="w-3.5 h-3.5 text-white/50" />
            <span>Desvincular (Nota Libre)</span>
          </button>

          <div className="h-px bg-white/10 my-1" />

          {sortedProjects.map((p) => {
            const projectTasks = getProjectTasks(p);
            return (
              <div key={p.id} className="space-y-0.5 my-1">
                <button
                  type="button"
                  onClick={() => {
                    if (note?.id) {
                      onUpdateNote(note.id, {
                        projectId: String(p.id),
                        projectTitle: p.title || p.nombre,
                        taskId: null,
                        taskTitle: null,
                      });
                    }
                    setIsLinkDropdownOpen(false);
                    playSound("click");
                  }}
                  className={`w-full px-2 py-1.5 rounded-lg text-[13px] font-semibold flex items-center justify-between transition-colors text-left cursor-pointer ${
                    isNightMode ? "hover:bg-white/10 text-white" : "hover:bg-slate-100 text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate flex-1 min-w-0 pr-2">
                    <Folder className="w-3.5 h-3.5 text-white/60 shrink-0" />
                    <span className="truncate">{p.title || p.nombre}</span>
                  </div>
                  {projectTasks.length > 0 && (
                    <span className="text-[10px] text-white/40 font-normal shrink-0">
                      {projectTasks.length} {projectTasks.length === 1 ? "tarea" : "tareas"}
                    </span>
                  )}
                </button>

                {projectTasks.map((t: any) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      if (note?.id) {
                        onUpdateNote(note.id, {
                          projectId: String(p.id),
                          projectTitle: p.title || p.nombre,
                          taskId: String(t.id),
                          taskTitle: t.title || t.titulo,
                        });
                      }
                      setIsLinkDropdownOpen(false);
                      playSound("click");
                    }}
                    className={`w-full pl-6 pr-2 py-1 rounded-lg text-[12px] flex items-center gap-2 transition-colors text-left cursor-pointer ${
                      note?.taskId === String(t.id)
                        ? "bg-white/15 text-white font-bold"
                        : isNightMode
                        ? "hover:bg-white/5 text-white/70 hover:text-white"
                        : "hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white/60 shrink-0" />
                    <span className="truncate">{t.title || t.titulo}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (!isOpen || !note) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Window: Superficie neutra y limpia */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className={`relative z-10 w-full max-w-[600px] max-h-[88vh] flex flex-col rounded-[28px] border shadow-2xl overflow-hidden p-6 ${
          isNightMode
            ? "bg-[#181818] border-white/10 text-white shadow-black/90"
            : "bg-white border-slate-200 text-slate-900 shadow-xl"
        }`}
      >
        {/* 1. CABECERA PRINCIPAL: SQUIRCLE + TÍTULO AUTO-FOCUSED + BOTÓN CERRAR EN LA ESQUINA SUPERIOR DERECHA */}
        <div className="flex items-center justify-between gap-3 mb-2 shrink-0">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => {
                const newStatus = !isCompleted;
                setIsCompleted(newStatus);
                triggerAutoSave({ isCompleted: newStatus });
                playSound(newStatus ? "pop" : "click");
              }}
              title={isCompleted ? "Marcar como pendiente" : "Marcar como completada"}
              className={`w-4 h-4 rounded-[6px] flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                isCompleted
                  ? "bg-white text-black shadow-sm"
                  : isNightMode
                  ? "border border-white/30 hover:border-white"
                  : "border border-slate-300 hover:border-slate-800"
              }`}
            >
              {isCompleted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
            </button>

            <SmoothInput
              ref={titleInputRef}
              type="text"
              unstyled
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                triggerAutoSave({ title: e.target.value });
              }}
              placeholder="Título de la nota…"
              wrapperClassName="w-full flex-1"
              caretClassName="bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
              className={`text-[16px] font-bold ${
                isCompleted
                  ? "line-through text-white/40"
                  : isNightMode
                  ? "text-[#ffffffd6] placeholder:text-white/30"
                  : "text-slate-900 placeholder:text-slate-400"
              }`}
            />
          </div>

          {/* Botón de Cerrar Ventana en la esquina superior derecha */}
          <button
            type="button"
            onClick={() => {
              onClose();
              playSound("pop");
            }}
            title="Cerrar ventana"
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
              isNightMode
                ? "bg-white/5 hover:bg-white/15 text-white/70 hover:text-white border border-white/10"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            <X className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>

        <div className="h-px bg-white/5 my-1" />

        {/* 2. TOOLBAR CON BOTÓN DE VINCULAR A LA DERECHA + LIENZO DE ESCRITURA WYSIWYG */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
          {/* Toolbar WYSIWYG con Píldora de Vinculación a la derecha */}
          <RichNoteToolbar
            currentBlockType={currentBlockType}
            onBlockTypeChange={handleBlockTypeChange}
            onFormatClick={handleFormatClick}
            activeFormats={activeFormats}
            rightSlot={linkPillSlot}
            isNightMode={isNightMode}
          />

          {/* Lienzo de Escritura WYSIWYG Puro */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => {
              const newHtml = e.currentTarget.innerHTML;
              setContentHtml(newHtml);
              triggerAutoSave({ content: newHtml });
              updateActiveStyles();
            }}
            onKeyDown={handleEditorKeyDown}
            onKeyUp={updateActiveStyles}
            onMouseUp={updateActiveStyles}
            onSelect={updateActiveStyles}
            className={`w-full min-h-[260px] bg-transparent outline-none border-none ring-0 shadow-none focus:outline-none focus:ring-0 focus:border-none focus:shadow-none select-text text-[14px] leading-relaxed p-0 ${
              isNightMode ? "text-[#ffffffd6]" : "text-slate-800"
            } [&_h1]:text-[22px] [&_h1]:font-bold [&_h1]:text-white [&_h1]:my-2 [&_h2]:text-[18px] [&_h2]:font-semibold [&_h2]:text-white/90 [&_h2]:my-1.5 [&_h3]:text-[16px] [&_h3]:font-medium [&_h3]:text-white/80 [&_p]:my-1 [&_p]:text-[14px] [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1 [&_blockquote]:border-l-2 [&_blockquote]:border-white/30 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:my-2 [&_blockquote]:text-white/70`}
            data-placeholder="Escribe tus apuntes, notas o ideas aquí…"
          />
        </div>

        {/* 3. FOOTER: BOTÓN BLANCO "GUARDAR NOTA" & ACCIÓN SECUNDARIA */}
        <div className="pt-3 mt-2 border-t border-white/5 flex items-center justify-between gap-3 shrink-0">
          {onConvertToTask ? (
            <button
              type="button"
              onClick={() => {
                const currentContent = editorRef.current?.innerHTML || contentHtml;
                onUpdateNote(note.id, {
                  title,
                  content: currentContent,
                  isCompleted,
                });
                onConvertToTask(note);
                onClose();
                playSound("pop");
              }}
              className="text-[13px] font-medium text-white/40 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Convertir en Tarea</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={() => {
              const currentContent = editorRef.current?.innerHTML || contentHtml;
              onUpdateNote(note.id, {
                title,
                content: currentContent,
                isCompleted,
              });
              playSound("pop");
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-white hover:bg-white/90 text-black text-[14px] font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Guardar Nota</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
