"use client";

import { useState, useRef, useEffect } from "react";
import { useUIStore } from "@/lib/store";
import { useData, useCreateProject, useCreateTask } from "@/hooks/useData";
import { CanvasLayout } from "./CanvasLayout";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { Sparkles, Send, Bot, User, CheckCircle2, AlertCircle, Play, Trash2, ChevronLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function AgentCanvas() {
  const { data } = useData();
  const createProject = useCreateProject();
  const createTask = useCreateTask();
  
  const agentMessages = useUIStore(s => s.agentMessages);
  const addAgentMessage = useUIStore(s => s.addAgentMessage);
  const goToHome = useUIStore(s => s.goToHome);
  
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [agentMessages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg = { role: 'user', content: input };
    addAgentMessage(userMsg);
    setInput("");
    setIsLoading(true);

    try {
      const cleanMessages = [...agentMessages, userMsg].map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: cleanMessages })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        addAgentMessage({ role: 'assistant', content: `Error (${res.status}): ${errData.error || "Fallo en el servidor."}` });
        return;
      }
      const result = await res.json();
      
      if (result.error) {
        addAgentMessage({ role: 'assistant', content: `Error: ${result.error}` });
      } else {
        addAgentMessage({ role: 'assistant', content: result.reply, plan: result.plan });
      }
    } catch (e) {
      console.error("Agent Error:", e);
      addAgentMessage({ role: 'assistant', content: "Error de conexión con el agente. Asegúrate de que el servidor Python esté corriendo en el puerto 8787." });
    } finally {
      setIsLoading(false);
    }
  };

  const executePlan = async (plan: any[]) => {
    for (const action of plan) {
      if (action.action === "create_project") {
        await createProject.mutateAsync(action.data);
      } else if (action.action === "create_task") {
        await createTask.mutateAsync(action.data);
      }
    }
    addAgentMessage({ role: 'assistant', content: "✅ ¡Plan ejecutado con éxito! He actualizado Notion con los nuevos registros." });
  };

  const leftBlock = (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-col gap-4">
        <div className="mt-2">
          <h1 className="text-2xl font-black text-white leading-none">Pulse Agent</h1>
          <p className="text-[10px] font-bold text-[#4ade80] uppercase tracking-widest mt-2">AI Assistant</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-4" ref={scrollRef}>
        {agentMessages.length === 0 && (
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <p className="text-sm text-white/60 leading-relaxed">
              Hola, soy el agente inteligente de Brandex OS. Puedo ayudarte a crear proyectos, organizar tareas y gestionar clientes usando lenguaje natural.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["Crea un proyecto para Coca Cola", "Planifica 5 tareas de diseño", "Nuevo cliente: Apple"].map(t => (
                <button key={t} onClick={() => setInput(t)} className="text-[10px] font-bold text-white/40 bg-white/5 px-3 py-1.5 rounded-lg hover:text-white hover:bg-white/10 transition-all border border-white/5">
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {agentMessages.map((m, i) => (
          <div key={i} className={cn(
            "flex flex-col gap-2 max-w-[90%]",
            m.role === 'user' ? "ml-auto items-end" : "items-start"
          )}>
            <div className={cn(
              "p-4 rounded-2xl text-sm leading-relaxed",
              m.role === 'user' ? "bg-blue-600 text-white" : "bg-white/5 text-white/80 border border-white/10"
            )}>
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-white/40 text-xs font-bold animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Pensando...
          </div>
        )}
      </div>

      <div className="relative mt-auto">
        <input 
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Escribe una orden..."
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-blue-500/50 transition-all pr-14"
        />
        <button 
          onClick={handleSend}
          disabled={isLoading}
          className="absolute right-2 top-2 bottom-2 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white hover:bg-blue-500 transition-all disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const centerBlock = (
    <div className="flex flex-col gap-6 h-full">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5" /> Plan de Acción
      </h3>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-2">
        {agentMessages.filter(m => m.plan).slice(-1).map((m, i) => (
          <div key={i} className="flex flex-col gap-4">
            {m.plan?.map((action: any, ai: number) => (
              <div key={ai} className="bg-white/5 border border-white/10 p-5 rounded-2xl relative group overflow-hidden">
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-blue-500/50" />
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                    {action.action.replace("_", " ")}
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-white/20" />
                </div>
                <div className="flex flex-col gap-2">
                  {Object.entries(action.data).map(([k, v]: [string, any]) => (
                    <div key={k} className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-white/40 capitalize">{k}</span>
                      <span className="text-[11px] font-bold text-white/80">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            <div className="mt-4 flex gap-3">
              <button 
                onClick={() => executePlan(m.plan!)}
                className="flex-1 bg-[#4ade80] text-[#10241b] py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:scale-[1.02] transition-all shadow-[0_0_20px_rgba(74,222,128,0.2)]"
              >
                <Play className="w-4 h-4 fill-[#10241b]" /> Ejecutar Cambios en Notion
              </button>
              <button className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/40 hover:text-red-500 hover:border-red-500/20 transition-all">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}

        {!agentMessages.some(m => m.plan) && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 opacity-40">
             <Bot className="w-16 h-16 mb-4" />
             <p className="text-sm font-medium">Esperando instrucciones para generar un plan...</p>
          </div>
        )}
      </div>
    </div>
  );

  const rightBlock = (
    <div className="flex flex-col gap-6">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-white/50 flex items-center gap-2">
        <AlertCircle className="w-3.5 h-3.5" /> Notas de Seguridad
      </h3>
      <div className="flex flex-col gap-4">
        <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl">
          <p className="text-[11px] text-yellow-500/80 leading-relaxed font-bold">
            El agente NO realizará cambios directos. Siempre verás el plan a la izquierda antes de confirmar la ejecución hacia Notion.
          </p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
          <p className="text-[11px] text-blue-500/80 leading-relaxed font-bold">
            Usa el agente para automatizar tareas repetitivas o planeación de proyectos complejos en segundos.
          </p>
        </div>
      </div>
    </div>
  );

  return <CanvasLayout leftBlock={leftBlock} centerBlock={centerBlock} rightBlock={rightBlock} />;
}
