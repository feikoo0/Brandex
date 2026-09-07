/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, ShieldCheck, ArrowRight, Lock, RotateCcw } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { loginWithCode } from "@/lib/api";
import { TaskiStepRegister } from "@/components/onboarding/TaskiStepRegister";
import { playSound } from "@/app/taski/utils/audio";
import { TaskiAvatar } from "@/components/ui/TaskiAvatar";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup } from "firebase/auth";
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
  const userName = useAuthStore((s) => s.userName);
  const userEmail = useAuthStore((s) => s.userEmail);
  const role = useAuthStore((s) => s.role);
  const isMaster = role === "admin" || workspaceId === "brandex-master";
  const displayEmail = userEmail || (isMaster ? "contacto.milenial@gmail.com" : "colaborador@taski.app");

  const [credentialInput, setCredentialInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  // Limpiar estado cuando se abre la ventana
  useEffect(() => {
    if (isOpen) {
      setCredentialInput("");
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  // Rotación suave del carrusel de showcase
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 4);
    }, 4500);
    return () => clearInterval(interval);
  }, [isOpen]);

  const handleVerifyCode = async (enteredCode: string) => {
    if (!enteredCode || enteredCode.length < 6 || loading) return;

    setLoading(true);
    setError(null);

    try {
      const data = await loginWithCode(enteredCode.trim());
      if (data.ok && data.role) {
        try {
          playSound("pop");
        } catch {}
        setAuth(
          (data.role as Role) || "admin",
          data.id || "admin",
          data.nombre || "Usuario",
          data.token || "",
          data.workspaceId || "brandex-master",
          data.email || (data.role === "admin" ? "contacto.milenial@gmail.com" : undefined)
        );

        setTimeout(() => {
          onClose();
          router.push("/taski");
        }, 450);
      } else {
        try {
          playSound("tick");
        } catch {}
        setError(data.error ?? "Llave de acceso no válida");
      }
    } catch (err: any) {
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = credentialInput.trim();
    if (!val || loading) return;

    // Si es un código numérico de 6 dígitos o MASTER
    if (/^\d{6}$/.test(val) || val.toUpperCase() === "MASTER") {
      await handleVerifyCode(val);
      return;
    }

    // Si ingresa correo o usuario
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: val,
          usuario: val,
          email: val,
          password: process.env.NEXT_PUBLIC_ADMIN_PASS || "08e6003802A",
        }),
      });
      const data = await res.json();
      if (data.ok && data.role) {
        try {
          playSound("pop");
        } catch {}
        setAuth(
          (data.role as Role) || "admin",
          data.id || "admin",
          data.nombre || "Usuario",
          data.token || "",
          data.workspaceId || "brandex-master",
          data.email || (data.role === "admin" ? "contacto.milenial@gmail.com" : val)
        );
        setTimeout(() => {
          onClose();
          router.push("/taski");
        }, 450);
      } else {
        try {
          playSound("tick");
        } catch {}
        setError(data.error || "Llave o correo no reconocido en la lista de acceso.");
      }
    } catch (err) {
      setError("Error de conexión al verificar acceso.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          googleUser: {
            email: user.email,
            uid: user.uid,
            displayName: user.displayName,
          },
        }),
      });
      const data = await res.json();
      if (data.ok) {
        if (data.isNewUser) {
          setIsOnboardingOpen(true);
        } else {
          try {
            playSound("pop");
          } catch {}
          setAuth(
            (data.role as Role) || "admin",
            data.id || user.uid,
            data.nombre || user.displayName || "Usuario",
            data.token || "",
            data.workspaceId || "brandex-master",
            data.email || user.email || undefined
          );
          setTimeout(() => {
            onClose();
            router.push("/taski");
          }, 450);
        }
      } else {
        setError(data.error || "No se pudo acceder con Google.");
      }
    } catch (err: any) {
      if (err?.code !== "auth/popup-closed-by-user") {
        setError("Error al autenticar con Google. Intenta con tu llave de acceso.");
      }
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
        res.workspaceId,
        res.email
      );
      onClose();
      router.push("/taski");
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[90] overflow-y-auto overflow-x-hidden bg-[#0a0a0a] text-white flex flex-col selection:bg-white/20 selection:text-white"
          >
            {/* Botón flotante para cerrar y volver a la landing */}
            <button
              type="button"
              onClick={() => {
                try {
                  playSound("click");
                } catch {}
                onClose();
              }}
              className="absolute top-5 right-5 sm:top-7 sm:right-7 z-50 w-9 h-9 rounded-full bg-white/5 border border-white/10 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white transition-all cursor-pointer shadow-lg backdrop-blur-md"
              aria-label="Cerrar ventana de acceso"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Ventana Split Screen (Fiel al diseño de Forkads) */}
            <div className="w-full min-h-screen flex flex-col lg:flex-row">
              {/* ========================================================================= */}
              {/* COLUMNA IZQUIERDA: SHOWCASE CREATIVO BENTO GRID                           */}
              {/* ========================================================================= */}
              <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-10 xl:p-14 border-r border-white/[0.06] bg-[#0c0c0c] relative overflow-hidden select-none min-h-screen">
                {/* Halo sutil de iluminación ambiental */}
                <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 bg-white/[0.03] rounded-full blur-3xl" />
                <div className="pointer-events-none absolute -bottom-40 -right-40 w-96 h-96 bg-white/[0.02] rounded-full blur-3xl" />

                {/* Top: Logotipo Oficial */}
                <div className="relative z-10 w-full flex items-center justify-center pt-1">
                  <div className="flex items-center gap-2.5 opacity-90 hover:opacity-100 transition-opacity">
                    <Image
                      src="/brandex-logo.svg"
                      alt="Brandex"
                      width={132}
                      height={28}
                      className="object-contain h-6 w-auto"
                      priority
                    />
                  </div>
                </div>

                {/* Center: Bento Grid Fotográfico Estilo Forkads */}
                <div className="relative z-10 my-auto w-full max-w-[460px] mx-auto flex flex-col gap-4 py-6">
                  {/* Cuadrícula Bento */}
                  <div className="grid grid-cols-5 gap-3.5">
                    {/* Tarjeta Hero Principal (Esquina Superior Izquierda con Brackets de Enfoque [ ]) */}
                    <div className="relative col-span-3 aspect-square rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 shadow-2xl group">
                      {/* Brackets fotográficos esquineros idénticos a la referencia */}
                      <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-white pointer-events-none z-20" />
                      <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-white pointer-events-none z-20" />
                      <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-white pointer-events-none z-20" />
                      <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-white pointer-events-none z-20" />

                      <img
                        src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80"
                        alt="Retrato editorial atleta"
                        className="w-full h-full object-cover grayscale contrast-125 group-hover:scale-105 transition-transform duration-700"
                        loading="eager"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                    </div>

                    {/* Columna Derecha con 2 Retratos Apilados */}
                    <div className="col-span-2 flex flex-col gap-3.5 justify-between">
                      {/* Retrato Superior 1 */}
                      <div className="relative flex-1 rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 shadow-xl group min-h-[96px]">
                        <img
                          src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80"
                          alt="Retrato cinematográfico"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          loading="eager"
                        />
                      </div>

                      {/* Retrato Superior 2 */}
                      <div className="relative flex-1 rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 shadow-xl group min-h-[96px]">
                        <img
                          src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80"
                          alt="Retrato de creador"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          loading="eager"
                        />
                      </div>
                    </div>

                    {/* Banner Horizontal Inferior de Campaña Creativa */}
                    <div className="relative col-span-5 h-[110px] rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 shadow-xl group">
                      <img
                        src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80"
                        alt="Campaña creativa estética"
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                        loading="eager"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                    </div>
                  </div>

                  {/* Barra de Comando / Prompt Fiel a la Referencia */}
                  <div className="w-full mt-2 p-3 px-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3 text-xs text-white/80 shadow-inner backdrop-blur-md">
                    <span className="truncate text-left font-mono text-[11px] text-white/80">
                      <span className="text-white/40 font-sans italic mr-1.5">/crear</span>
                      Retrato editorial en blanco y negro de un atleta con hoodie, cielo nublado, luz esculpida en el rostro, campaña premium de ropa deportiva
                    </span>
                    <div className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white shrink-0 transition-colors shadow-sm">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Título, Subtítulo y Paginación */}
                  <div className="flex flex-col items-center text-center mt-4">
                    <h3 className="text-base xl:text-lg font-bold text-white tracking-tight">
                      Tu sistema creativo
                    </h3>
                    <p className="text-xs text-white/50 max-w-[340px] mt-1 leading-relaxed">
                      La plataforma de IA creativa para equipos modernos: genera videos, imágenes, avatares y campañas a escala.
                    </p>

                    {/* Indicadores de Carrusel Minimalistas */}
                    <div className="flex items-center gap-1.5 mt-3.5">
                      {[0, 1, 2, 3].map((idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveSlide(idx)}
                          className={`h-1 rounded-full transition-all cursor-pointer ${
                            activeSlide === idx
                              ? "w-6 bg-white"
                              : "w-2 bg-white/20 hover:bg-white/40"
                          }`}
                          aria-label={`Diapositiva ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Columna Izquierda */}
                <div className="relative z-10 w-full flex items-center justify-center pb-1 text-[11px] text-white/30">
                  <span>Brandex Creative Ecosystem • Operado por Taski OS</span>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* COLUMNA DERECHA: FORMULARIO DE INICIO DE SESIÓN MINIMALISTA               */}
              {/* ========================================================================= */}
              <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-16 bg-[#0a0a0a] min-h-screen relative">
                {/* Contenedor central alineado milimétricamente */}
                <div className="w-full max-w-[390px] flex flex-col items-stretch my-auto">
                  {/* Logo visible en pantallas móviles */}
                  <div className="lg:hidden flex items-center justify-center mb-8">
                    <Image
                      src="/brandex-logo.svg"
                      alt="Brandex"
                      width={120}
                      height={26}
                      className="object-contain h-6 w-auto"
                      priority
                    />
                  </div>

                  {/* Banner si ya hay sesión iniciada activa */}
                  {token && workspaceId && (
                    <div className="w-full mb-6 p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-3 shadow-xl">
                      <div className="flex items-center gap-3">
                        <TaskiAvatar
                          name={userName || "Usuario"}
                          email={displayEmail}
                          size={38}
                        />
                        <div className="flex flex-col min-w-0 text-left">
                          <span className="text-sm font-bold text-[#ffffffd6] truncate">
                            {userName || "Sesión activa"}
                          </span>
                          <span className="text-xs font-medium text-[#ffffff80] truncate" title={displayEmail}>
                            {displayEmail}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          router.push("/taski");
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-white text-black text-xs font-bold hover:bg-white/90 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <span>Entrar directo al Workspace</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Encabezado del Formulario */}
                  <div className="text-center mb-7">
                    <h2 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">
                      Inicia sesión
                    </h2>
                    <p className="text-sm text-white/50 mt-1.5 font-normal">
                      Bienvenido de vuelta
                    </p>
                  </div>

                  {/* Botón Continuar con Google */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full h-12 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 flex items-center justify-center gap-3 text-sm font-medium text-white transition-all cursor-pointer shadow-sm active:scale-[0.99] disabled:opacity-50"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.02 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    <span>Continuar con Google</span>
                  </button>

                  {/* Divisor "o" */}
                  <div className="relative flex py-5 items-center">
                    <div className="flex-grow border-t border-white/10" />
                    <span className="flex-shrink mx-4 text-xs text-white/30 font-medium select-none">
                      o
                    </span>
                    <div className="flex-grow border-t border-white/10" />
                  </div>

                  {/* Formulario de Correo Corporativo / Llave de Acceso */}
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="credentialInput"
                        className="text-xs font-medium text-white/70 select-none"
                      >
                        Correo corporativo o llave de acceso
                      </label>
                      <div className="relative">
                        <input
                          id="credentialInput"
                          type="text"
                          autoFocus
                          value={credentialInput}
                          onChange={(e) => {
                            setCredentialInput(e.target.value);
                            if (error) setError(null);
                          }}
                          placeholder="tu@empresa.com o llave de 6 dígitos"
                          className="w-full h-12 px-4 rounded-xl bg-white/[0.04] border border-white/10 focus:border-white/30 text-sm text-white placeholder:text-white/25 focus:outline-none transition-colors shadow-inner"
                        />
                      </div>
                    </div>

                    {/* Mensaje de Error */}
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-rose-400 font-medium text-center px-1"
                      >
                        {error}
                      </motion.div>
                    )}

                    {/* Botón Principal "Entrar" */}
                    <button
                      type="submit"
                      disabled={loading || !credentialInput.trim()}
                      className="w-full h-12 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-white/5 disabled:opacity-40 disabled:cursor-not-allowed mt-1"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-black" />
                          <span>Verificando acceso...</span>
                        </>
                      ) : (
                        <span>Entrar</span>
                      )}
                    </button>
                  </form>

                  {/* Enlace de Solicitud de Acceso / Registro */}
                  <div className="mt-8 text-center text-xs text-white/50">
                    ¿No tienes cuenta?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          playSound("click");
                        } catch {}
                        setIsOnboardingOpen(true);
                      }}
                      className="text-white font-semibold hover:underline cursor-pointer inline-flex items-center gap-1 ml-0.5 group"
                    >
                      <span>Solicitar acceso</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>

                {/* Esquina Inferior Derecha: Icono de sincronización / reload */}
                <div className="absolute bottom-6 right-6 flex items-center gap-2 text-white/20 hover:text-white/40 transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal / Vista de Registro Paso a Paso con MagicRings */}
      {isOnboardingOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#181817]">
          <TaskiStepRegister
            stepperPosition="right"
            onClose={() => setIsOnboardingOpen(false)}
            onSuccess={handleOnboardingSuccess}
          />
        </div>
      )}
    </>
  );
}

export default TaskiLoginModal;
