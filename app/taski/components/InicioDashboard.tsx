"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/lib/store";
import { playSound } from "../utils/audio";
import { InlineLoader } from "generative-loaders";
import "generative-loaders/styles.css";

interface ProposedTask {
  id?: string;
  title: string;
  format?: string;
  formato?: string;
  time?: string;
  assignee?: string;
  status?: string;
}

export interface ProposalData {
  id: string;
  type: "project_proposal" | "template_proposal" | "task_batch_proposal";
  title?: string;
  name?: string;
  client?: string;
  package?: string;
  category?: string;
  desc?: string;
  priority?: string;
  cost?: string;
  deadline?: string;
  tasks?: ProposedTask[];
  status?: "pending" | "confirmed" | "discarded";
  createdResultId?: string;
}

interface ChatAction {
  tool: string;
  args: any;
  result: any;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  actions?: ChatAction[];
  proposals?: ProposalData[];
  tokensUsed?: number;
}

interface ModelOption {
  id: string;
  name: string;
  effort: string;
  model: string;
  temperature?: number;
  description: string;
}

const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: "taski-fast",
    name: "Taski Fast",
    effort: "Fast",
    model: "deepseek-v4-flash",
    temperature: 0.1,
    description: "Velocidad ultrarrápida, alta precisión y mínimo consumo (Recomendado)",
  },
  {
    id: "taski-medium",
    name: "Taski Medium",
    effort: "Medium",
    model: "deepseek-chat",
    temperature: 0.2,
    description: "Uso general equilibrado para organización y consultas diarias",
  },
  {
    id: "taski-high",
    name: "Taski High",
    effort: "High",
    model: "deepseek-v4-pro",
    temperature: 0.3,
    description: "Modo avanzado para planificación profunda y campañas extensas",
  },
];

const TOKEN_LIMIT_OPTIONS = [500, 1000, 1500, 2000];

const DEFAULT_SUGGESTIONS = [
  {
    title: "Proponer Proyecto con Tareas",
    prompt:
      "Arma una propuesta de proyecto para Nike llamada 'Campaña Primavera' con fecha de entrega el 30 de agosto y 3 entregables: Guión de Reels, Grabación y Edición.",
  },
  {
    title: "Crear Plantilla de Proyecto",
    prompt:
      "Crea una plantilla para Rediseño Web Ecommerce con 4 fases de entregables y tiempos estimados.",
  },
  {
    title: "Registrar Cliente",
    prompt:
      "Registra un nuevo cliente llamado 'Tesla' en la industria de Automotriz & Energía con presupuesto de $45,000.",
  },
  {
    title: "Consultar Estado General",
    prompt:
      "¿Cuáles son todos los proyectos y tareas que tenemos registrados actualmente en Taski?",
  },
];

export function InicioDashboard() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const tokenLimitRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [confirmingProposalId, setConfirmingProposalId] = useState<string | null>(null);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isTokenDropdownOpen, setIsTokenDropdownOpen] = useState(false);
  const [tokenLimit, setTokenLimit] = useState<number>(1000);
  const [selectedModel, setSelectedModel] = useState<ModelOption>(AVAILABLE_MODELS[0]);
  const [isMounted, setIsMounted] = useState(false);

  const [lastUsage, setLastUsage] = useState<{
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | null>(null);

  const workspaceId = useAuthStore((s) => s.workspaceId) || "brandex-master";
  const storageKey = `taski_copilot_messages_${workspaceId}`;

  // Load from localStorage after mount (prevents SSR hydration error)
  useEffect(() => {
    setIsMounted(true);
    try {
      const savedMessages = localStorage.getItem(storageKey);
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      } else {
        setMessages([]);
      }

      const savedTokenLimit = localStorage.getItem("taski_token_limit");
      if (savedTokenLimit) setTokenLimit(Number(savedTokenLimit));

      const savedModelId = localStorage.getItem("taski_selected_model");
      const found = AVAILABLE_MODELS.find((m) => m.id === savedModelId);
      if (found) setSelectedModel(found);
    } catch {}
  }, [storageKey]);

  // Auto-scroll on new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Persist messages to localStorage
  useEffect(() => {
    if (isMounted && typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages));
      } catch {}
    }
  }, [messages, isMounted, storageKey]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        modelDropdownRef.current &&
        !modelDropdownRef.current.contains(e.target as Node)
      ) {
        setIsModelDropdownOpen(false);
      }
      if (
        tokenLimitRef.current &&
        !tokenLimitRef.current.contains(e.target as Node)
      ) {
        setIsTokenDropdownOpen(false);
      }
    };
    if (isModelDropdownOpen || isTokenDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isModelDropdownOpen, isTokenDropdownOpen]);

  // Handle message sending (Sliding window: sends only last 6 messages)
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!query || isLoading) return;

    playSound("pop");
    setInputText("");

    const userMessage: ChatMessage = {
      id: "msg-" + Date.now(),
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    setIsLoading(true);

    try {
      const slidingWindow = updatedHistory.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const authState = useAuthStore.getState();
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: slidingWindow,
          model: selectedModel.model,
          temperature: selectedModel.temperature,
          maxTokens: tokenLimit,
          user: authState.userName || "Feiko",
          role: authState.role || "Admin",
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error del servidor (${res.status})`);
      }

      const data = await res.json();
      playSound("click");

      if (data.usage) {
        setLastUsage(data.usage);
      }

      let displayContent = data.message || "";
      if (!displayContent && Array.isArray(data.actions) && data.actions.length > 0) {
        const lastAction = data.actions[data.actions.length - 1];
        if (lastAction?.result?.message) {
          displayContent = lastAction.result.message;
        } else if (lastAction?.result?.error) {
          displayContent = `Error: ${lastAction.result.error}`;
        }
      }
      if (!displayContent) {
        displayContent = "Respuesta recibida sin contenido adicional.";
      }

      const assistantMessage: ChatMessage = {
        id: "msg-ai-" + Date.now(),
        role: "assistant",
        content: displayContent,
        timestamp: new Date().toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        actions: data.actions || [],
        proposals: (data.proposals || []).map((p: any) => ({
          ...p,
          status: p.status || "pending",
        })),
        tokensUsed: data.usage?.totalTokens,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error("Error communicating with Taski AI Agent:", err);
      const errorMessage: ChatMessage = {
        id: "msg-err-" + Date.now(),
        role: "assistant",
        content: `Error al procesar la solicitud: ${err.message || "Por favor verifica tu conexión o intenta de nuevo."}`,
        timestamp: new Date().toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewChat = () => {
    playSound("click");
    setMessages([]);
    setLastUsage(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("taski_copilot_messages");
    }
    textareaRef.current?.focus();
  };

  const handleSelectModel = (modelOpt: ModelOption) => {
    playSound("click");
    setSelectedModel(modelOpt);
    setIsModelDropdownOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("taski_selected_model", modelOpt.id);
    }
  };

  const handleSelectTokenLimit = (limit: number) => {
    playSound("click");
    setTokenLimit(limit);
    setIsTokenDropdownOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("taski_token_limit", String(limit));
    }
  };

  // ── CONFIRMAR PROPUESTA DE PROYECTO (Directo a Firestore) ──
  const handleConfirmProjectProposal = async (proposal: ProposalData, messageId: string) => {
    playSound("pop");
    setConfirmingProposalId(proposal.id);

    try {
      const newId = Date.now();
      const projIdStr = String(newId);
      const title = proposal.title || "Nuevo Proyecto";
      const client = proposal.client || "Cliente General";
      const packageType = proposal.package || "General";
      const desc = proposal.desc || "";
      const priority = proposal.priority || "Media";
      const cost = proposal.cost || "";
      const deadline = proposal.deadline || "Sin fecha";
      const startDate = new Date().toISOString().split("T")[0];

      const formattedTasks = (proposal.tasks || []).map((t, idx) => ({
        id: Number(newId) + idx + 1,
        title: t.title || `Tarea ${idx + 1}`,
        desc: "",
        format: t.format || "post_imagen",
        formato: t.format || "post_imagen",
        time: t.time || "2h",
        status: "Planificado",
        statusColor: "",
        deadline: deadline,
        assignee: t.assignee || "",
        subtasks: [],
      }));

      const totalTasks = formattedTasks.length;
      const progress = `0 de ${totalTasks} tareas`;
      const percent = "0%";

      const hue = Math.floor(Math.random() * 360);
      const customColor = { h: hue, s: 80, l: 60 };
      const hslCss = `hsl(${hue}, 80%, 60%)`;

      const projectDoc = {
        id: newId,
        title,
        nombre: title,
        client,
        cliente: client,
        package: packageType,
        desc,
        descripcion: desc,
        progress,
        percent,
        gradient: hslCss,
        glow: hslCss,
        customColor,
        customGradientStyle: hslCss,
        customGlowStyle: hslCss,
        status: "Activo",
        estado: "Activo",
        priority,
        prioridad: priority,
        cost,
        costo: parseFloat(String(cost).replace(/[^0-9.]/g, "")) || 0,
        burnRate: `0h / ${totalTasks * 4}h`,
        startDate,
        fechaInicio: startDate,
        deadline,
        fechaFin: deadline,
        briefCore: desc || "Core brief creado desde Taski AI",
        tasks: formattedTasks,
        fecha_creacion: new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };

      // 1. Guardar en v3_projects
      await setDoc(doc(db, "v3_projects", projIdStr), projectDoc);
      // 2. Guardar en projects
      await setDoc(doc(db, "projects", projIdStr), projectDoc);

      // 3. Guardar tareas en colección tasks
      for (const t of formattedTasks) {
        const taskDoc = {
          id: String(t.id),
          title: t.title,
          nombre: t.title,
          project_id: projIdStr,
          proyecto_id: projIdStr,
          client,
          cliente: client,
          format: t.format,
          formato: t.format,
          time: t.time,
          duracion: t.time,
          status: t.status,
          estado: t.status,
          assignee: t.assignee,
          fecha_limite: deadline,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        };
        await setDoc(doc(db, "tasks", String(t.id)), taskDoc);
      }

      // Actualizar estado del mensaje local a confirmed
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId && msg.proposals) {
            return {
              ...msg,
              proposals: msg.proposals.map((p) =>
                p.id === proposal.id
                  ? { ...p, status: "confirmed", createdResultId: projIdStr }
                  : p
              ),
            };
          }
          return msg;
        })
      );

      playSound("click");
    } catch (err) {
      console.error("Error al confirmar creación del proyecto:", err);
    } finally {
      setConfirmingProposalId(null);
    }
  };

  // ── CONFIRMAR PROPUESTA DE PLANTILLA (Directo a Firestore v3_templates) ──
  const handleConfirmTemplateProposal = async (proposal: ProposalData, messageId: string) => {
    playSound("pop");
    setConfirmingProposalId(proposal.id);

    try {
      const tmplId = "tmpl-" + Date.now();
      const tmplName = proposal.name || "Nueva Plantilla";
      const category = proposal.category || "General";
      const desc = proposal.desc || "";
      const tasks = (proposal.tasks || []).map((t) => ({
        title: t.title || "Tarea",
        format: t.format || "documento",
        formato: t.format || "documento",
        time: t.time || "2h",
      }));

      const templateDoc = {
        id: tmplId,
        name: tmplName,
        category,
        desc,
        tasksCount: tasks.length,
        tasks,
        isCustom: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };

      await setDoc(doc(db, "v3_templates", tmplId), templateDoc);

      // Guardar también en localStorage como backup
      if (typeof window !== "undefined") {
        try {
          const saved = localStorage.getItem("taski_v3_templates");
          const existing = saved ? JSON.parse(saved) : [];
          localStorage.setItem(
            "taski_v3_templates",
            JSON.stringify([templateDoc, ...existing])
          );
        } catch {}
      }

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId && msg.proposals) {
            return {
              ...msg,
              proposals: msg.proposals.map((p) =>
                p.id === proposal.id
                  ? { ...p, status: "confirmed", createdResultId: tmplId }
                  : p
              ),
            };
          }
          return msg;
        })
      );

      playSound("click");
    } catch (err) {
      console.error("Error al confirmar plantilla:", err);
    } finally {
      setConfirmingProposalId(null);
    }
  };

  // ── AJUSTAR PROPUESTA (Cargar prompt contextual) ──
  const handleAdjustProposal = (proposal: ProposalData) => {
    playSound("click");
    const targetName = proposal.title || proposal.name || "la propuesta";
    setInputText(`Ajustar la propuesta de "${targetName}": `);
    textareaRef.current?.focus();
  };

  // ── DESCARTAR PROPUESTA ──
  const handleDiscardProposal = (proposalId: string, messageId: string) => {
    playSound("click");
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId && msg.proposals) {
          return {
            ...msg,
            proposals: msg.proposals.map((p) =>
              p.id === proposalId ? { ...p, status: "discarded" } : p
            ),
          };
        }
        return msg;
      })
    );
  };

  // Helper to format assistant markdown text without emojis or blue colors
  const renderFormattedContent = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedParts = parts.map((part, pIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={pIdx} className="font-semibold text-[#ffffffd6]">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        return (
          <div key={idx} className="flex items-start gap-2 my-1 pl-2">
            <span className="text-white/40 mt-1 shrink-0 text-xs">•</span>
            <span className="text-[#ffffffd6] text-[14px] leading-relaxed">
              {formattedParts}
            </span>
          </div>
        );
      }

      if (line.trim().startsWith("#")) {
        return (
          <h4
            key={idx}
            className="font-semibold text-[14px] text-[#ffffffd6] mt-3 mb-1"
          >
            {formattedParts}
          </h4>
        );
      }

      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="text-[14px] text-[#ffffffd6] leading-relaxed my-0.5">
          {formattedParts}
        </p>
      );
    });
  };

  return (
    <div className="w-full max-w-3xl h-full flex flex-col justify-between mx-auto select-none py-2 gap-4">
      {/* ── Top Bar: Active Chat Controls (Nuevo Chat & Stats) ── */}
      {messages.length > 0 && (
        <div className="flex items-center justify-between px-1 shrink-0">
          <div className="text-[11px] text-[#ffffff40]">
            {lastUsage && <span>Último uso: {lastUsage.totalTokens} tokens</span>}
          </div>
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[12px] text-[#ffffff6b] hover:text-[#ffffffd6] bg-white/[0.03] hover:bg-white/5 border border-white/10 rounded-lg transition-all active:scale-95 cursor-pointer"
            title="Iniciar un nuevo chat limpio"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-70"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Nuevo chat</span>
          </button>
        </div>
      )}

      {/* ── Chat Messages / Options Stream ── */}
      <div className="flex-1 overflow-y-auto px-1 space-y-4 custom-scrollbar flex flex-col">
        {messages.length === 0 ? (
          <div className="my-auto flex flex-col items-center justify-center text-center py-4">
            <h3 className="text-2xl md:text-3xl font-medium tracking-tight text-white">
              ¿En qué puedo ayudarte hoy?
            </h3>
            <p className="text-[12px] md:text-[14px] text-[#ffffff6b] max-w-md mt-2 mb-8 leading-relaxed">
              Crea proyectos, organiza tareas, registra clientes o consulta el
              estado general de tu equipo.
            </p>

            {/* Options Cards for Creation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {DEFAULT_SUGGESTIONS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(item.prompt)}
                  className="flex flex-col items-start text-left p-4 rounded-2xl bg-[#181818] hover:bg-[#1f1f1f] border border-white/10 hover:border-white/20 transition-all group active:scale-[0.99] shadow-sm"
                >
                  <span className="text-[14px] font-medium text-[#ffffffd6] group-hover:text-white transition-colors mb-1">
                    {item.title}
                  </span>
                  <p className="text-[12px] text-[#ffffff6b] line-clamp-2 leading-relaxed">
                    {item.prompt}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) =>
              msg.role === "user" ? (
                <div
                  key={msg.id}
                  className="flex flex-col gap-1.5 items-end max-w-[85%] ml-auto"
                >
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-[#ffffff40] px-1">
                    Tú
                  </span>
                  <div className="p-3.5 px-4 rounded-2xl bg-[#222222] border border-white/10 text-[#ffffffd6] rounded-tr-sm">
                    <p className="text-[14px] leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                  <span className="text-[10px] text-[#ffffff40] px-1">
                    {msg.timestamp}
                  </span>
                </div>
              ) : (
                <div
                  key={msg.id}
                  className="flex flex-col gap-1.5 items-start w-full py-1"
                >
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-[#ffffff40] px-1">
                    Taski
                  </span>

                  {/* Respuesta directa sin rectángulo contenedor */}
                  <div className="w-full text-[#ffffffd6] px-1">
                    {renderFormattedContent(msg.content)}

                    {/* ── 1. TARJETAS DE PROPUESTAS INTERACTIVAS CON PLANTILLAS DE BOTONES ── */}
                    {msg.proposals && msg.proposals.length > 0 && (
                      <div className="mt-3 space-y-3 w-full">
                        {msg.proposals.map((prop) => {
                          const isConfirming = confirmingProposalId === prop.id;

                          // Caso: Propuesta de Proyecto
                          if (prop.type === "project_proposal") {
                            return (
                              <div
                                key={prop.id}
                                className="p-4 rounded-2xl bg-[#181818] border border-white/10 shadow-lg flex flex-col gap-3"
                              >
                                {/* Header de la Propuesta */}
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#ffffff6b] block">
                                      Propuesta de Proyecto
                                    </span>
                                    <h4 className="text-[16px] font-semibold text-white tracking-tight mt-0.5">
                                      {prop.title}
                                    </h4>
                                  </div>
                                  {prop.package && (
                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-white/5 border border-white/10 text-[#ffffffd6]">
                                      {prop.package}
                                    </span>
                                  )}
                                </div>

                                {/* Meta Info */}
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#ffffff6b]">
                                  <span>Cliente: <strong className="text-[#ffffffd6]">{prop.client}</strong></span>
                                  <span>Entrega: <strong className="text-[#ffffffd6]">{prop.deadline}</strong></span>
                                  {prop.cost && (
                                    <span>Presupuesto: <strong className="text-[#ffffffd6]">{prop.cost}</strong></span>
                                  )}
                                </div>

                                {prop.desc && (
                                  <p className="text-[12px] text-[#ffffff99] leading-relaxed bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                                    {prop.desc}
                                  </p>
                                )}

                                {/* Desglose de Entregables */}
                                {prop.tasks && prop.tasks.length > 0 && (
                                  <div className="space-y-1.5">
                                    <span className="text-[11px] font-medium text-[#ffffff6b] block">
                                      Entregables desglosados ({prop.tasks.length}):
                                    </span>
                                    <div className="space-y-1">
                                      {prop.tasks.map((t, tIdx) => (
                                        <div
                                          key={tIdx}
                                          className="p-2 rounded-xl bg-white/[0.025] border border-white/5 flex items-center justify-between gap-2"
                                        >
                                          <span className="text-[13px] text-[#ffffffd6]">
                                            {t.title}
                                          </span>
                                          <div className="flex items-center gap-1.5">
                                            {t.format && (
                                              <span className="text-[11px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/70">
                                                {t.format}
                                              </span>
                                            )}
                                            {t.time && (
                                              <span className="text-[11px] text-[#ffffff40]">
                                                {t.time}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* ── PLANTILLA DE BOTONES DE ACCIÓN ── */}
                                <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap">
                                  {prop.status === "confirmed" ? (
                                    <div className="w-full flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[12px]">
                                      <span className="font-medium">✓ Proyecto creado exitosamente en Taski</span>
                                      <span className="text-[11px] opacity-75">Sincronizado en Firestore</span>
                                    </div>
                                  ) : prop.status === "discarded" ? (
                                    <div className="text-[12px] text-white/40 italic py-1">
                                      Propuesta descartada
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handleConfirmProjectProposal(prop, msg.id)}
                                        disabled={isConfirming}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-black hover:bg-white/90 text-[13px] font-medium shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                                      >
                                        {isConfirming ? (
                                          <>
                                            <span className="w-2 h-2 rounded-full bg-black animate-ping" />
                                            <span>Creando en Taski...</span>
                                          </>
                                        ) : (
                                          <>
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              width="14"
                                              height="14"
                                              viewBox="0 0 24 24"
                                              fill="none"
                                              stroke="currentColor"
                                              strokeWidth="2.5"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                            >
                                              <polyline points="20 6 9 17 4 12"></polyline>
                                            </svg>
                                            <span>Confirmar y Crear en Taski</span>
                                          </>
                                        )}
                                      </button>

                                      <div className="flex items-center gap-1.5">
                                        <button
                                          onClick={() => handleAdjustProposal(prop)}
                                          className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#ffffffd6] text-[12px] transition-all active:scale-95 cursor-pointer"
                                        >
                                          Ajustar
                                        </button>
                                        <button
                                          onClick={() => handleDiscardProposal(prop.id, msg.id)}
                                          className="px-2.5 py-2 rounded-xl hover:bg-white/5 text-[#ffffff6b] hover:text-white text-[12px] transition-all active:scale-95 cursor-pointer"
                                        >
                                          Descartar
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          }

                          // Caso: Propuesta de Plantilla
                          if (prop.type === "template_proposal") {
                            return (
                              <div
                                key={prop.id}
                                className="p-4 rounded-2xl bg-[#181818] border border-white/10 shadow-lg flex flex-col gap-3"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#ffffff6b] block">
                                      Propuesta de Plantilla
                                    </span>
                                    <h4 className="text-[16px] font-semibold text-white tracking-tight mt-0.5">
                                      {prop.name}
                                    </h4>
                                  </div>
                                  {prop.category && (
                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-white/5 border border-white/10 text-[#ffffffd6]">
                                      {prop.category}
                                    </span>
                                  )}
                                </div>

                                {prop.desc && (
                                  <p className="text-[12px] text-[#ffffff99] leading-relaxed bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                                    {prop.desc}
                                  </p>
                                )}

                                {prop.tasks && prop.tasks.length > 0 && (
                                  <div className="space-y-1.5">
                                    <span className="text-[11px] font-medium text-[#ffffff6b] block">
                                      Tareas incluidas ({prop.tasks.length}):
                                    </span>
                                    <div className="space-y-1">
                                      {prop.tasks.map((t, tIdx) => (
                                        <div
                                          key={tIdx}
                                          className="p-2 rounded-xl bg-white/[0.025] border border-white/5 flex items-center justify-between gap-2"
                                        >
                                          <span className="text-[13px] text-[#ffffffd6]">
                                            {t.title}
                                          </span>
                                          <div className="flex items-center gap-1.5">
                                            {t.format && (
                                              <span className="text-[11px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/70">
                                                {t.format}
                                              </span>
                                            )}
                                            {t.time && (
                                              <span className="text-[11px] text-[#ffffff40]">
                                                {t.time}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Botones de Acción para Plantilla */}
                                <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap">
                                  {prop.status === "confirmed" ? (
                                    <div className="w-full flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[12px]">
                                      <span className="font-medium">✓ Plantilla guardada en Taski (v3_templates)</span>
                                      <span className="text-[11px] opacity-75">Disponible en Nuevo Proyecto</span>
                                    </div>
                                  ) : prop.status === "discarded" ? (
                                    <div className="text-[12px] text-white/40 italic py-1">
                                      Propuesta descartada
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handleConfirmTemplateProposal(prop, msg.id)}
                                        disabled={isConfirming}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-black hover:bg-white/90 text-[13px] font-medium shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                                      >
                                        {isConfirming ? (
                                          <>
                                            <span className="w-2 h-2 rounded-full bg-black animate-ping" />
                                            <span>Guardando...</span>
                                          </>
                                        ) : (
                                          <>
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              width="14"
                                              height="14"
                                              viewBox="0 0 24 24"
                                              fill="none"
                                              stroke="currentColor"
                                              strokeWidth="2.5"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                            >
                                              <polyline points="20 6 9 17 4 12"></polyline>
                                            </svg>
                                            <span>Guardar como Plantilla</span>
                                          </>
                                        )}
                                      </button>

                                      <div className="flex items-center gap-1.5">
                                        <button
                                          onClick={() => handleAdjustProposal(prop)}
                                          className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#ffffffd6] text-[12px] transition-all active:scale-95 cursor-pointer"
                                        >
                                          Ajustar
                                        </button>
                                        <button
                                          onClick={() => handleDiscardProposal(prop.id, msg.id)}
                                          className="px-2.5 py-2 rounded-xl hover:bg-white/5 text-[#ffffff6b] hover:text-white text-[12px] transition-all active:scale-95 cursor-pointer"
                                        >
                                          Descartar
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          }

                          return null;
                        })}
                      </div>
                    )}

                    {/* ── 2. VISUAL ACTION CARDS (Para herramientas ejecutadas directamente) ── */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="mt-3 space-y-2 w-full">
                        {msg.actions.map((act, aIdx) => {
                          if (act.result?.action === "project_created") {
                            const p = act.result.project;
                            return (
                              <div
                                key={aIdx}
                                className="p-3 rounded-xl bg-[#181818] border border-white/10 flex items-center justify-between gap-3"
                              >
                                <div>
                                  <span className="text-[14px] font-semibold text-[#ffffffd6] block">
                                    {p.title}
                                  </span>
                                  <div className="text-[12px] text-[#ffffff6b] mt-0.5">
                                    {p.client} • Entrega: {p.deadline}
                                  </div>
                                </div>
                                <span className="px-2 py-0.5 rounded-full text-[12px] bg-white/5 border border-white/10 text-white/80">
                                  {p.tasksCount} tareas
                                </span>
                              </div>
                            );
                          }

                          if (act.result?.action === "template_created") {
                            const tm = act.result.template;
                            return (
                              <div
                                key={aIdx}
                                className="p-3 rounded-xl bg-[#181818] border border-white/10 flex items-center justify-between gap-3"
                              >
                                <div>
                                  <span className="text-[14px] font-semibold text-[#ffffffd6] block">
                                    {tm.name}
                                  </span>
                                  <div className="text-[12px] text-[#ffffff6b] mt-0.5">
                                    {tm.category} • {tm.tasksCount} tareas predefinidas
                                  </div>
                                </div>
                                <span className="px-2 py-0.5 rounded-full text-[12px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                                  Plantilla guardada
                                </span>
                              </div>
                            );
                          }

                          if (act.result?.action === "task_created") {
                            const t = act.result.task;
                            return (
                              <div
                                key={aIdx}
                                className="p-2.5 rounded-xl bg-[#181818] border border-white/10 flex items-center justify-between gap-2"
                              >
                                <span className="text-[14px] text-[#ffffffd6] font-medium">
                                  {t.title}
                                </span>
                                <div className="flex items-center gap-1.5 text-[12px] text-[#ffffff6b]">
                                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                                    {t.format}
                                  </span>
                                  <span>{t.time}</span>
                                </div>
                              </div>
                            );
                          }

                          if (act.result?.action === "client_created") {
                            const c = act.result.client;
                            return (
                              <div
                                key={aIdx}
                                className="p-2.5 rounded-xl bg-[#181818] border border-white/10 flex items-center justify-between gap-2"
                              >
                                <span className="text-[14px] text-[#ffffffd6] font-medium">
                                  {c.name}
                                </span>
                                <span className="text-[12px] text-[#ffffffd6] px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                                  {c.status}
                                </span>
                              </div>
                            );
                          }

                          if (act.result?.action === "member_created") {
                            const m = act.result.member;
                            return (
                              <div
                                key={aIdx}
                                className="p-2.5 rounded-xl bg-[#181818] border border-white/10 flex items-center justify-between gap-2"
                              >
                                <span className="text-[14px] text-[#ffffffd6] font-medium">
                                  {m.name} ({m.role})
                                </span>
                                <span className="text-[12px] text-[#ffffffd6] px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                                  {m.availability}
                                </span>
                              </div>
                            );
                          }

                          return null;
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 px-1 text-[10px] text-[#ffffff40] mt-0.5">
                    <span>{msg.timestamp}</span>
                    {msg.tokensUsed !== undefined && (
                      <span>• {msg.tokensUsed} tokens</span>
                    )}
                  </div>
                </div>
              )
            )}

            {/* ── Loading Indicator ── */}
            {isLoading && (
              <div className="flex flex-col gap-1 items-start w-full py-1">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[#ffffff40] px-1">
                  Taski
                </span>
                <div className="text-[13px] text-[#ffffff6b] flex items-center gap-3 px-1 py-1">
                  <InlineLoader variant="aperture" size={20} />
                  <span>Generando respuesta con {selectedModel.name}...</span>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Chat Box Editor ── */}
      <div
        id="chat-box"
        className="w-full bg-[#1e1e1e] border border-white/10 focus-within:border-white/20 rounded-[24px] p-3.5 flex flex-col gap-3 shadow-2xl transition-all"
      >
        {/* Editor Input Area */}
        <div className="chat-editor-content w-full">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="Pregunta lo que quieras o pide un proyecto/plantilla…"
            disabled={isLoading}
            className="w-full min-h-[44px] bg-transparent text-[14px] text-[#ffffffd6] placeholder:text-[#ffffff40] resize-none focus:outline-none custom-scrollbar px-1 leading-relaxed"
          />
        </div>

        {/* Action Bar (Left Action + Right Model Pill & Upward Send Button) */}
        <div className="chat-editor-action flex items-center justify-between pt-1">
          {/* Left Action Area: Add button + Token Limit Selector */}
          <div className="left-area relative flex items-center gap-2" ref={tokenLimitRef}>
            <button
              type="button"
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white/90 hover:bg-white/10 border border-white/10 transition-all active:scale-95"
              title="Añadir opción o contexto"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 1024 1024"
                fill="currentColor"
              >
                <path d="M512.08192 133.44768c19.41504 0 35.14368 15.72864 35.14368 35.18464v320.47104h320.34816a35.18464 35.18464 0 0 1 0 70.36928h-320.3072v320.47104c0 17.94048-13.43488 32.768-30.80192 34.89792l-4.38272 0.28672a35.18464 35.18464 0 0 1-35.2256-35.18464V559.5136H156.30336a35.18464 35.18464 0 0 1 0-70.36928h320.63488V168.63232c0-17.94048 13.39392-32.768 30.72-34.93888l4.46464-0.24576z" />
              </svg>
            </button>

            {/* Token Limit Selector Button */}
            <button
              type="button"
              onClick={() => setIsTokenDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1 text-[12px] text-[#ffffffd6] hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all active:scale-95 cursor-pointer"
              title="Ajustar límite de tokens por respuesta"
            >
              <span>{tokenLimit} tokens</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="10"
                height="10"
                viewBox="0 0 1024 1024"
                fill="currentColor"
                className={`opacity-60 transition-transform duration-200 ${
                  isTokenDropdownOpen ? "rotate-180" : ""
                }`}
              >
                <path d="M482.95936 717.33248a36.864 36.864 0 0 0 52.0192-0.08192l285.696-285.696a36.864 36.864 0 1 0-52.10112-52.10112l-259.72736 259.6864-261.69344-259.80928a36.864 36.864 0 1 0-51.93728 52.34688l287.744 285.65504z" />
              </svg>
            </button>

            {/* Token Limit Dropdown */}
            {isTokenDropdownOpen && (
              <div className="absolute left-10 bottom-full mb-3 w-48 bg-[#181818] border border-white/10 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150">
                <div className="px-2.5 py-1 text-[11px] text-[#ffffff6b] border-b border-white/5">
                  Límite por respuesta
                </div>
                {TOKEN_LIMIT_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleSelectTokenLimit(opt)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[12px] transition-all ${
                      tokenLimit === opt
                        ? "bg-white/10 text-white font-medium"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span>{opt} tokens</span>
                    {tokenLimit === opt && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Area: Interactive Model selection pill + Circular Upward Send button */}
          <div className="right-area relative flex items-center gap-2.5" ref={modelDropdownRef}>
            {/* Popover Dropdown for Model Selection */}
            {isModelDropdownOpen && (
              <div className="absolute right-10 bottom-full mb-3 w-72 bg-[#181818] border border-white/10 rounded-2xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150">
                <div className="px-3 py-1.5 border-b border-white/5 text-[12px] text-[#ffffff6b]">
                  Modos de Taski
                </div>

                {AVAILABLE_MODELS.map((item) => {
                  const isSelected = selectedModel.id === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectModel(item)}
                      className={`w-full flex flex-col items-start text-left px-3 py-2 rounded-xl transition-all ${
                        isSelected
                          ? "bg-white/10 border border-white/15 text-white"
                          : "hover:bg-white/5 text-white/70 hover:text-white border border-transparent"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-0.5">
                        <span className="text-[14px] font-medium text-[#ffffffd6]">
                          {item.name}
                        </span>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        )}
                      </div>
                      <p className="text-[12px] text-[#ffffff6b] leading-normal">
                        {item.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Model Pill Trigger Button */}
            <button
              type="button"
              onClick={() => setIsModelDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-[12px] text-[#ffffffd6] hover:text-white transition-all active:scale-95 cursor-pointer"
              title="Cambiar modo de Taski"
            >
              <span className="font-medium text-[#ffffffd6]">
                {selectedModel.name}
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="11"
                height="11"
                viewBox="0 0 1024 1024"
                fill="currentColor"
                className={`opacity-60 transition-transform duration-200 ${
                  isModelDropdownOpen ? "rotate-180" : ""
                }`}
              >
                <path d="M482.95936 717.33248a36.864 36.864 0 0 0 52.0192-0.08192l285.696-285.696a36.864 36.864 0 1 0-52.10112-52.10112l-259.72736 259.6864-261.69344-259.80928a36.864 36.864 0 1 0-51.93728 52.34688l287.744 285.65504z" />
              </svg>
            </button>

            {/* Send Button Container */}
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isLoading}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                !inputText.trim() || isLoading
                  ? "bg-white/10 text-white/20 cursor-not-allowed"
                  : "bg-white text-black hover:bg-white/90 shadow-md active:scale-95 cursor-pointer"
              }`}
              title="Enviar mensaje"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 1024 1024"
                fill="currentColor"
              >
                <path d="M705.536 433.664a38.4 38.4 0 1 1-54.272 54.272L550.4 387.114667V729.6a38.4 38.4 0 0 1-76.8 0V387.114667l-100.864 100.821333a38.4 38.4 0 1 1-54.272-54.272l166.4-166.4a38.4 38.4 0 0 1 54.272 0l166.4 166.4z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
