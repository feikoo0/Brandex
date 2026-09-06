"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ProgressPanel } from "@/components/layout/ProgressPanel";
import { CreatorPanel } from "@/components/layout/CreatorPanel";
import { EntityModal } from "@/components/modals/EntityModal";
import { QuickCreate } from "@/components/modals/QuickCreate";
import { useAuthStore } from "@/lib/store";
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = useAuthStore((s) => s.role);
  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const router = useRouter();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    if (hasHydrated && !token) {
      router.replace("/");
    }
  }, [hasHydrated, token, router]);

  // Si no ha terminado de hidratar o no hay rol todavía, mostramos el cargador en lugar de redirigir erróneamente
  if (!hasHydrated || !role) {
    return (
      <div className="h-screen bg-[#181817] flex items-center justify-center text-white/50 text-xs">
        Cargando acceso...
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(e) => window.dispatchEvent(new CustomEvent("global-drag-start", { detail: e }))}
      onDragOver={(e) => window.dispatchEvent(new CustomEvent("global-drag-over", { detail: e }))}
      onDragEnd={(e) => window.dispatchEvent(new CustomEvent("global-drag-end", { detail: e }))}
    >
      <div className="flex flex-col h-screen w-full overflow-hidden bg-[#0a0a0c]">
        {/* Top Navbar (Horizontal Navigation) */}
        {role !== "cliente" && <Topbar />}
        
        <div className="flex flex-1 min-w-0 overflow-hidden relative">
          <main className="flex-1 overflow-y-auto relative">
            {children}
          </main>

          {role === "admin" && (
            <>
              <ProgressPanel />
              <CreatorPanel />
            </>
          )}
        </div>

        <EntityModal />
        <QuickCreate />
      </div>
    </DndContext>
  );
}
