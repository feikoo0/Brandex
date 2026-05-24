"use client";

import { LucideIcon, Rocket } from "lucide-react";

interface PlaceholderViewProps {
  title: string;
  icon?: LucideIcon;
  description?: string;
}

export function PlaceholderView({ title, icon: Icon = Rocket, description }: PlaceholderViewProps) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] max-w-2xl mx-auto text-center px-6">
      <div className="relative mb-8">
        {/* Glow background */}
        <div className="absolute inset-0 bg-blue-500/20 blur-[80px] rounded-full" />
        
        <div className="relative w-20 h-20 rounded-[28px] glass flex items-center justify-center border-white/10 shadow-2xl">
          <Icon className="w-10 h-10 text-blue-400" />
        </div>
      </div>

      <h2 className="text-3xl font-black tracking-tight mb-3">
        {title}
      </h2>
      
      <p className="text-base leading-relaxed max-w-md mx-auto" style={{ color: "var(--txt2)" }}>
        {description || "Esta sección está siendo sincronizada con Notion. Vuelve pronto para ver las métricas y el progreso en tiempo real."}
      </p>

      <div className="mt-10 flex gap-3">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        <div className="w-2 h-2 rounded-full bg-blue-500/60 animate-pulse [animation-delay:200ms]" />
        <div className="w-2 h-2 rounded-full bg-blue-500/30 animate-pulse [animation-delay:400ms]" />
      </div>
    </div>
  );
}
