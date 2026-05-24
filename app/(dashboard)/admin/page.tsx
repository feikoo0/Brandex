"use client";

import { useEffect } from "react";
import { useAuthStore, useUIStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useData } from "@/hooks/useData";

// Transitions
import { ViewTransition } from "@/components/layout/ViewTransition";

// Views
import { PulseView } from "@/components/views/PulseView";
import { EngineView } from "@/components/views/EngineView";
import { TasksView } from "@/components/views/TasksView";
import { ProjectsView } from "@/components/views/ProjectsView";
import { ClientsView } from "@/components/views/ClientsView";
import { CalendarView } from "@/components/views/CalendarView";
import { FinanzasView } from "@/components/views/FinanzasView";
import { PlaceholderView } from "@/components/views/PlaceholderView";
import { TalentView } from "@/components/views/TalentView";

// Icons for placeholders
import { 
  LineChart, 
  Users, 
  Database, 
  Key, 
  Kanban,
  GitMerge
} from "lucide-react";

export default function AdminPage() {
  const role   = useAuthStore((s) => s.role);
  const router = useRouter();
  const tab    = useUIStore((s) => s.activeTab);

  // Prefetch data as soon as the admin page loads
  useData();

  // Role guard
  useEffect(() => {
    if (role && role !== "admin") {
      router.replace(role === "diseno" ? "/equipo" : "/cliente");
    }
  }, [role, router]);

  // Render active tab
  function renderTab() {
    switch (tab) {
      case "pulse":     return <PulseView />;
      case "engine":    return <EngineView />;
      case "tareas":    return <TasksView />;
      case "proyectos": return <ProjectsView />;
      case "clientes":  return <ClientsView />;
      case "calendario":return <CalendarView />;
      case "finanzas":  return <FinanzasView />;
      
      // Placeholders for unfinished tabs
      case "pipeline":  return <PlaceholderView title="Pipeline de Ventas" icon={GitMerge} description="Seguimiento de prospectos y cierres comerciales integrado con Notion." />;
      case "timeline":  return <PlaceholderView title="Timeline Maestro" icon={Kanban} description="Visualización cronológica de todos los entregables y eventos del mes." />;
      case "talent":    return <TalentView />;
      case "analytics": return <PlaceholderView title="Analytics" icon={LineChart} description="Métricas clave de rendimiento, crecimiento de cuentas y rentabilidad por proyecto." />;
      case "recursos":  return <PlaceholderView title="Biblioteca de Recursos" icon={Database} description="Repositorio central de assets, guías maestras y bases de conocimiento." />;
      case "accesos":   return <PlaceholderView title="Centro de Accesos" icon={Key} description="Gestión segura de credenciales y accesos a plataformas de clientes." />;

      default:
        return (
          <div className="flex flex-col items-center justify-center h-64 gap-2">
            <p className="text-2xl font-black capitalize">{tab}</p>
            <p className="text-sm" style={{ color: "var(--txt3)" }}>
              Vista en configuración
            </p>
          </div>
        );
    }
  }

  return (
    <div className="min-h-full">
      <ViewTransition activeKey={tab}>
        {renderTab()}
      </ViewTransition>
    </div>
  );
}
