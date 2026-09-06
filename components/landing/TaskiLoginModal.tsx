"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, ShieldCheck, ArrowRight, Lock } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { loginWithCode } from "@/lib/api";
import { OtpInput, type OtpStatus } from "@/components/ui/OtpInput";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { playSound } from "@/app/taski/utils/audio";
import type { Role, LoginResponse } from "@/lib/types";

interface TaskiLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TaskiLoginModal({ isOpen, onClose }: TaskiLoginModalProps) {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const token = useAuthStore((s) => s.token);
  const workspaceId = useAuthStore((s) => s.workspaceId);

  const [code, setCode] = useState("");
  const [status, setStatus] = useState<OtpStatus>("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Limpiar estado cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setCode("");
      setStatus("idle");
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  const handleVerifyCode = async (enteredCode: string) => {
    if (!enteredCode || enteredCode.length < 6 || loading) return;

    setLoading(true);
    setError(null);

    try {
      const data = await loginWithCode(enteredCode.trim());
      if (data.ok && data.role) {
        setStatus("success");
        try {
          playSound("pop");
        } catch {}
        setAuth(
          (data.role as Role) || "admin",
          data.id || "admin",
          data.nombre || "Usuario",
          data.token || "",
          data.workspaceId || "brandex-master"
        );

        setTimeout(() => {
          onClose();
          router.push("/taski");
        }, 550);
      } else {
        setStatus("error");
        try {
          playSound("tick");
        } catch {}
        setError(data.error ?? "Llave de acceso no válida");
      }
    } catch (err: any) {
      setStatus("error");
      try {
        playSound("tick");
      } catch {}
      const rawMsg = err?.message || "";
      let cleanMsg = rawMsg;
      if (rawMsg.includes('{"ok":false') || rawMsg.includes('"error":')) {
        try {
          const jsonMatch = rawMsg.match(/\{.*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.error) cleanMsg = parsed.error;
          }
        } catch {}
      }
      setError(cleanMsg || "Esta llave no está en la lista de acceso.");
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
      onClose();
      router.push("/taski");
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop con Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="relative z-10 w-full max-w-[420px] bg-[#181818] border border-white/15 rounded-[28px] p-7 md:p-9 shadow-2xl shadow-black/90 flex flex-col items-center overflow-hidden"
            >
              {/* Botón Cerrar */}
              <button
                type="button"
                onClick={onClose}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                aria-label="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Halo sutil de fondo monocromático */}
              <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 bg-gradient-to-b from-white/10 to-transparent rounded-full blur-3xl" />

              {/* Cabecera */}
              <div className="flex flex-col items-center justify-center gap-2.5 mb-6 text-center">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 relative flex items-center justify-center p-1.5 rounded-xl bg-white/5 border border-white/10 shadow-inner">
                    <Image
                      src="/taski-icon.png"
                      alt="Taski"
                      width={36}
                      height={36}
                      className="object-contain"
                      priority
                    />
                  </div>
                  <div className="text-left">
                    <span className="text-xl font-bold tracking-tight text-[#ffffffd6] block">
                      Taski OS
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-white/60 font-semibold block">
                      Portal Operativo Interno
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[#ffffff6b] max-w-[280px] mt-1">
                  Ingresa tu llave de acceso de 6 dígitos para acceder al espacio de trabajo
                </p>
              </div>

              {/* Si ya hay sesión activa */}
              {token && workspaceId && (
                <div className="w-full mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <p className="text-xs text-emerald-400 font-medium mb-2">
                    Tienes una sesión iniciada activa
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      router.push("/taski");
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-emerald-500 text-black text-xs font-semibold hover:bg-emerald-400 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Entrar directo al Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

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
                    <div className="flex items-center gap-2 text-xs text-white/60 animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>Verificando llave de acceso...</span>
                    </div>
                  )}
                  {status === "success" && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Acceso verificado • Iniciando Taski...</span>
                    </div>
                  )}
                  {error && (
                    <div className="text-xs text-rose-400 font-medium text-center max-w-[320px]">
                      {error}
                    </div>
                  )}
                </div>
              </div>

              {/* Separador Fino */}
              <div className="w-full h-px bg-white/10 my-4" />

              {/* Disparador de Onboarding */}
              <button
                type="button"
                onClick={() => {
                  try {
                    playSound("click");
                  } catch {}
                  setIsOnboardingOpen(true);
                }}
                className="text-xs text-white/50 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer py-1 group"
              >
                <span>¿No tienes una llave?</span>
                <strong className="text-white group-hover:underline font-semibold flex items-center gap-1">
                  Crear nuevo espacio
                  <ArrowRight className="w-3 h-3 text-white group-hover:translate-x-0.5 transition-transform" />
                </strong>
              </button>

              <div className="mt-4 flex items-center gap-1.5 text-[10px] text-white/30">
                <Lock className="w-3 h-3" />
                <span>Acceso seguro cifrado Brandex Ecosystem</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Onboarding & Creación de Espacio */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onSuccess={handleOnboardingSuccess}
      />
    </>
  );
}
