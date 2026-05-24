"use client";

import { useUIStore } from "@/lib/store";
import { useData } from "@/hooks/useData";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export function Breadcrumbs() {
  const viewStack = useUIStore(s => s.viewStack);
  const popTo = useUIStore(s => s.popTo);
  const { data } = useData();

  if (viewStack.length === 0) return null;

  const renderLabel = (view: any) => {
    switch (view.level) {
      case 'home': return 'Home';
      case 'project': {
        const p = data?.proyectos.find(p => p.id === view.id);
        return p?.nombre || 'Proyecto';
      }
      case 'task': {
        const t = data?.tareas.find(t => t.id === view.id);
        return t?.titulo || 'Tarea';
      }
      case 'client': {
        const c = data?.clientes.find(c => c.id === view.id);
        return c?.nombre || 'Cliente';
      }
      case 'all_projects': return 'Todos los Proyectos';
      case 'all_tasks': return 'Todas las Tareas';
      case 'agent': return 'Pulse Agent';
      case 'new_project': return 'Nuevo Proyecto';
      case 'new_task': return 'Nueva Tarea';
      default: return view.level;
    }
  };

  return (
    <nav className="flex items-center gap-1.5 py-1">
      {viewStack.map((view, i) => {
        const isLast = i === viewStack.length - 1;
        return (
          <div key={i} className="flex items-center gap-1.5">
            <button 
              onClick={() => popTo(i)}
              disabled={isLast}
              className={cn(
                "text-[11px] font-black uppercase tracking-[0.2em] transition-all",
                isLast 
                  ? "text-[#4ade80] cursor-default" 
                  : "text-gray-400 dark:text-white/30 hover:dark:text-white hover:text-gray-900 cursor-pointer"
              )}
            >
              {renderLabel(view)}
            </button>
            {!isLast && <ChevronRight className="w-3 h-3 text-gray-300 dark:text-white/10" />}
          </div>
        );
      })}
    </nav>
  );
}
