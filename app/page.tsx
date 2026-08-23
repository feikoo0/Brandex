"use client";

import React, { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, ShieldCheck, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { loginWithCode } from "@/lib/api";
import { OtpInput, type OtpStatus } from "@/components/ui/OtpInput";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { playSound } from "@/app/taski/utils/audio";
import type { Role, LoginResponse } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const containerRef = useRef<HTMLDivElement>(null);
  const [pointerPos, setPointerPos] = useState({ x: "50%", y: "50%" });
  const [isHovered, setIsHovered] = useState(false);

  const [code, setCode] = useState("");
  const [status, setStatus] = useState<OtpStatus>("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Onboarding Modal State
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

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

  const handleVerifyCode = async (enteredCode: string) => {
    if (!enteredCode || enteredCode.length < 6 || loading) return;

    setLoading(true);
    setError(null);

    try {
      const data = await loginWithCode(enteredCode.trim());
      if (data.ok && data.role) {
        setStatus("success");
        setAuth(
          (data.role as Role) || "admin",
          data.id || "admin",
          data.nombre || "Usuario",
          data.token || "",
          data.workspaceId || "brandex-master"
        );

        // Transición fluida tras completar el anillo de éxito
        setTimeout(() => {
          router.push("/taski");
        }, 550);
      } else {
        setStatus("error");
        setError(data.error ?? "Llave de acceso no válida");
      }
    } catch (err: any) {
      setStatus("error");
      setError(err.message || "Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingSuccess = (res: LoginResponse) => {
    setIsOnboardingOpen(false);
    if (res && res.role && res.workspaceId) {
      setAuth(
        (res.role as Role) || "admin",
        res.id || "admin",
        res.nombre || "Usuario",
        res.token || "",
        res.workspaceId
      );
      router.push("/taski");
    }
  };

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
      {/* Fondo Interactivo con Patrón de Dots */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[#181817]" />

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

        <div className="absolute left-[calc(50%-6.25rem)] top-[-6.625rem] h-[22rem] w-[30rem] rotate-[32deg] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.045)_0%,rgba(255,255,255,0.018)_38%,transparent_72%)] blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-44 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.015),transparent)]" />
      </div>

      {/* Tarjeta Central (#181818, border-white/10, rounded-[24px]) */}
      <div className="relative z-10 w-full max-w-[420px] bg-[#181818] border border-white/10 rounded-[24px] p-7 md:p-9 shadow-2xl shadow-black/60 flex flex-col items-center">
        
        {/* Cabecera: Logo de Taski */}
        <div className="flex flex-col items-center justify-center gap-2.5 mb-7 text-center">
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 relative flex items-center justify-center">
              <Image
                src="/taski-icon.png"
                alt="Taski"
                width={40}
                height={40}
                className="object-contain"
                priority
              />
            </div>
            <span className="text-2xl font-bold tracking-tight text-[#ffffffd6]">
              Taski
            </span>
          </div>
          <p className="text-xs text-[#ffffff6b] max-w-[280px]">
            Ingresa tu llave de 6 dígitos para acceder al espacio de trabajo
          </p>
        </div>

        {/* OTP Input Component */}
        <div className="w-full flex flex-col items-center justify-center my-1">
          <OtpInput
            length={6}
            value={code}
            onChange={(val) => {
              setCode(val);
              if (status !== "idle") setStatus("idle");
              if (error) setError(null);
            }}
            onComplete={(val) => handleVerifyCode(val)}
            type="both"
            size="md"
            status={status}
            disabled={loading || status === "success"}
            autoFocus
          />

          {/* Feedback de estado */}
          <div className="min-h-[26px] mt-3 flex items-center justify-center">
            {loading && (
              <div className="flex items-center gap-2 text-xs text-white/50 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#3a7bd5]" />
                <span>Verificando llave...</span>
              </div>
            )}
            {status === "success" && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4" />
                <span>Acceso verificado • Iniciando Taski...</span>
              </div>
            )}
            {error && (
              <div className="text-xs text-rose-400 font-medium text-center">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Separador Fino */}
        <div className="w-full h-px bg-white/10 my-5" />

        {/* Disparador de Onboarding: Crear nuevo espacio */}
        <button
          type="button"
          onClick={() => {
            playSound("click");
            setIsOnboardingOpen(true);
          }}
          className="text-xs text-white/50 hover:text-white hover:underline transition-all flex items-center gap-1.5 cursor-pointer py-1"
        >
          <span>¿Eres nuevo?</span>
          <strong className="text-[#3a7bd5] font-semibold">Crear nuevo espacio</strong>
          <ArrowRight className="w-3 h-3 text-[#3a7bd5]" />
        </button>

      </div>

      {/* Modal de Onboarding & Encuesta Beta */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onSuccess={handleOnboardingSuccess}
      />
    </div>
  );
}
