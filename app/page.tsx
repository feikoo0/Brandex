"use client";

import React, { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { login } from "@/lib/api";
import type { Role } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const containerRef = useRef<HTMLDivElement>(null);
  const [pointerPos, setPointerPos] = useState({ x: "50%", y: "50%" });
  const [isHovered, setIsHovered] = useState(false);

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPointerPos({ x: `${x}px`, y: `${y}px` });
    if (!isHovered) setIsHovered(true);
  }, [isHovered]);

  const handlePointerLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const navigateByRole = (role: Role, id: string, nombre: string, userToken: string) => {
    setAuth(role, id, nombre, userToken);
    const dest: Record<Role, string> = {
      admin: "/admin",
      diseno: "/equipo",
      cliente: "/cliente",
    };
    router.push(dest[role] ?? "/admin");
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!usuario.trim() || !password.trim()) {
      setError("Por favor ingresa tu correo y contraseña");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await login(usuario.trim(), password.trim());
      if (data.ok && data.role) {
        navigateByRole(data.role as Role, data.id || "admin", data.nombre || usuario, data.token || "");
      } else {
        setError(data.error ?? "Credenciales incorrectas");
      }
    } catch (err: any) {
      setError(err.message || "Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative min-h-screen w-full flex items-center justify-center bg-[#181817] px-4 py-8 select-none font-sans overflow-hidden"
      style={
        {
          "--agent-root-hero-pointer-x": pointerPos.x,
          "--agent-root-hero-pointer-y": pointerPos.y,
          "--agent-root-hero-hover-opacity": isHovered ? "0.6" : "0",
          "--color-sc-hero-dot": "rgba(255, 255, 255, 0.2)",
        } as React.CSSProperties
      }
    >
      {/* Fondo Interactivo con Patrón de Dots (Idéntico a Inicio en /taski) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {/* Capa 1: Fondo oscuro base */}
        <div className="absolute inset-0 bg-[#181817]" />

        {/* Capa 2: Grilla estática de dots enmascarada */}
        <div
          className="absolute inset-0 opacity-45"
          style={{
            maskImage:
              "linear-gradient(to right, transparent calc(50% - 28rem), black calc(50% - 18rem), black calc(50% + 18rem), transparent calc(50% + 28rem))",
            WebkitMaskImage:
              "linear-gradient(to right, transparent calc(50% - 28rem), black calc(50% - 18rem), black calc(50% + 18rem), transparent calc(50% + 28rem))",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle, var(--color-sc-hero-dot, rgba(255, 255, 255, 0.2)) 0.0625rem, transparent 0.0625rem), radial-gradient(circle, var(--color-sc-hero-dot, rgba(255, 255, 255, 0.2)) 0.0625rem, transparent 0.0625rem)",
              backgroundPosition: "0px 0px, 0.368rem 0.736rem",
              backgroundSize: "0.736rem 1.472rem",
              maskImage: "linear-gradient(black 0%, black 25%, rgba(0, 0, 0, 0.72) 50%, transparent 80%)",
              WebkitMaskImage: "linear-gradient(black 0%, black 25%, rgba(0, 0, 0, 0.72) 50%, transparent 80%)",
            }}
          />
        </div>

        {/* Capa 3: Grilla de dots interactiva con foco spotlight al mover el puntero */}
        <div
          className="absolute inset-0 transition-opacity duration-150 ease-[ease] motion-reduce:transition-none [@media(hover:none)]:hidden"
          style={{
            backgroundImage:
              "radial-gradient(circle, var(--color-sc-hero-dot, rgba(255, 255, 255, 0.2)) 0.0625rem, transparent 0.0625rem), radial-gradient(circle, var(--color-sc-hero-dot, rgba(255, 255, 255, 0.2)) 0.0625rem, transparent 0.0625rem)",
            backgroundPosition: "0px 0px, 0.368rem 0.736rem",
            backgroundSize: "0.736rem 1.472rem",
            maskImage:
              "radial-gradient(circle 14rem at var(--agent-root-hero-pointer-x, 50%) var(--agent-root-hero-pointer-y, 50%), black 0%, rgb(0 0 0 / 0.5) 42%, transparent 76%)",
            WebkitMaskImage:
              "radial-gradient(circle 14rem at var(--agent-root-hero-pointer-x, 50%) var(--agent-root-hero-pointer-y, 50%), black 0%, rgb(0 0 0 / 0.5) 42%, transparent 76%)",
            opacity: "var(--agent-root-hero-hover-opacity, 0)",
          }}
        />

        {/* Capa 4: Resplandor difuso superior */}
        <div className="absolute left-[calc(50%-6.25rem)] top-[-6.625rem] h-[22rem] w-[30rem] rotate-[32deg] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.045)_0%,rgba(255,255,255,0.018)_38%,transparent_72%)] blur-3xl" />

        {/* Capa 5: Degradado vertical sutil superior */}
        <div className="absolute inset-x-0 top-0 h-44 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.015),transparent)]" />
      </div>

      {/* Capa 2B: Tarjeta Central Redondeada (#181818, rounded-[24px]) */}
      <div className="relative z-10 w-full max-w-[390px] bg-[#181818] rounded-[24px] p-7 md:p-8">
        
        {/* Cabecera: Logo de Taski con el texto de Taski */}
        <div className="flex flex-col items-center justify-center gap-3 mb-7">
          <div className="flex items-center justify-center gap-3">
            <div className="w-9 h-9 relative flex items-center justify-center">
              <Image
                src="/taski-icon.png"
                alt="Taski"
                width={36}
                height={36}
                className="object-contain"
                priority
              />
            </div>
            <span className="text-2xl font-bold tracking-tight text-[#ffffffd6]">
              Taski
            </span>
          </div>
          <p className="text-xs text-[#ffffff6b]">
            Inicia sesión con tu cuenta
          </p>
        </div>

        {/* Formulario de Login */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campo Correo / Usuario (Capa 3: #222222, border-white/10, rounded-xl) */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#ffffff6b]">
              Correo o usuario
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 absolute left-3.5 text-white/30 pointer-events-none" />
              <input
                type="text"
                value={usuario}
                onChange={(e) => {
                  setUsuario(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="ejemplo@correo.com"
                className="w-full bg-[#222222] border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-sm text-[#ffffffd6] placeholder-white/30 outline-none focus:border-white/20 transition-colors"
                autoComplete="username"
              />
            </div>
          </div>

          {/* Campo Contraseña (Capa 3: #222222, border-white/10, rounded-xl) */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#ffffff6b]">
              Contraseña
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 absolute left-3.5 text-white/30 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="••••••••"
                className="w-full bg-[#222222] border border-white/10 rounded-xl pl-10 pr-10 py-3.5 text-sm text-[#ffffffd6] placeholder-white/30 outline-none focus:border-white/20 transition-colors"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 text-white/30 hover:text-white/70 transition-colors cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Mensaje de error */}
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium text-center">
              {error}
            </div>
          )}

          {/* Botón de Acción Principal (Azul Taski #3a7bd5) */}
          <button
            type="submit"
            disabled={loading || !usuario.trim() || !password.trim()}
            className="w-full py-3.5 px-4 bg-[#3a7bd5] hover:bg-[#316ec2] active:scale-[0.99] text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none mt-2 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Iniciar Sesión"
            )}
          </button>
        </form>

        {/* Separación Fina (h-px bg-white/10) */}
        <div className="h-px bg-white/10 my-6" />

        {/* Botón de Acceso Directo (Capa 3: #222222, border-white/10, rounded-xl) */}
        <button
          type="button"
          onClick={() => router.push("/taski")}
          className="w-full py-3.5 px-4 bg-[#222222] hover:bg-white/[0.08] active:scale-[0.99] text-[#ffffffd6] hover:text-white border border-white/10 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Acceso directo al lienzo Taski</span>
          <ArrowRight className="w-3.5 h-3.5 text-white/50" />
        </button>

      </div>
    </div>
  );
}
