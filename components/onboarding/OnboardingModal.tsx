"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  User,
  Building2,
  Mail,
  Palette,
  Film,
  Code2,
  Megaphone,
  Briefcase,
  Layers,
  Clock,
  Kanban,
  DollarSign,
  Users2,
  Loader2,
} from "lucide-react";
import { PinRevealCard } from "./PinRevealCard";
import { createWorkspaceWithSurvey } from "@/lib/api";
import { playSound } from "@/app/taski/utils/audio";
import type { LoginResponse, OnboardingSurveyData } from "@/lib/types";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    name?: string;
    email?: string;
    googleUid?: string;
  };
  onSuccess: (res: LoginResponse) => void;
}

const SPECIALTIES = [
  { id: "diseno", title: "Diseño UI/UX & Spatial", icon: Palette, desc: "Interfaces, sistemas de diseño y prototipos" },
  { id: "motion", title: "Motion & 3D", icon: Film, desc: "Animaciones, video, VFX y modelado" },
  { id: "dev", title: "Desarrollo Frontend", icon: Code2, desc: "Apps web, componentes y producto" },
  { id: "marketing", title: "Agencia de Marketing", icon: Megaphone, desc: "Campañas, contenido y branding" },
  { id: "freelance", title: "Freelancer Independiente", icon: Briefcase, desc: "Proyectos propios y clientes directos" },
];

const USE_CASES = [
  { id: "entregables", label: "Control de entregables y formatos de marca", icon: Layers },
  { id: "tiempo", label: "Cronometraje de tiempo y sesiones en vivo", icon: Clock },
  { id: "tableros", label: "Tableros visuales Kanban y organización", icon: Kanban },
  { id: "finanzas", label: "Finanzas, presupuestos y cotizaciones", icon: DollarSign },
];

const TEAM_SIZES = [
  { id: "1", label: "Solo yo (Freelance)" },
  { id: "2-5", label: "2 a 5 personas" },
  { id: "6-15", label: "6 a 15 personas" },
  { id: "15+", label: "Más de 15 personas" },
];

export function OnboardingModal({
  isOpen,
  onClose,
  initialData,
  onSuccess,
}: OnboardingModalProps) {
  const [step, setStep] = useState<number>(1);
  const [name, setName] = useState<string>("");
  const [brandName, setBrandName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [googleUid, setGoogleUid] = useState<string>("");
  const [specialty, setSpecialty] = useState<string>("diseno");
  const [useCases, setUseCases] = useState<string[]>(["entregables", "tiempo"]);
  const [teamSize, setTeamSize] = useState<string>("1");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<LoginResponse | null>(null);

  useEffect(() => {
    if (initialData) {
      if (initialData.name) setName(initialData.name);
      if (initialData.email) setEmail(initialData.email);
      if (initialData.googleUid) setGoogleUid(initialData.googleUid);
    }
  }, [initialData]);

  if (!isOpen) return null;

  const toggleUseCase = (id: string) => {
    playSound("click");
    setUseCases((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleNextStep = () => {
    playSound("click");
    setError(null);
    if (step === 1) {
      if (!name.trim()) {
        setError("Por favor ingresa tu nombre");
        return;
      }
    }
    setStep((prev) => Math.min(4, prev + 1));
  };

  const handlePrevStep = () => {
    playSound("click");
    setError(null);
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmitSurvey = async () => {
    playSound("click");
    setIsSubmitting(true);
    setError(null);

    const surveyPayload: OnboardingSurveyData = {
      name: name.trim() || "Usuario Taski",
      brandName: brandName.trim(),
      email: email.trim(),
      googleUid: googleUid.trim(),
      specialty,
      useCases,
      teamSize,
    };

    try {
      const res = await createWorkspaceWithSurvey(surveyPayload);
      if (res && res.ok && res.pin) {
        setCreatedResult(res);
      } else {
        setError(res.error || "No se pudo crear el workspace");
      }
    } catch (err: any) {
      console.error("Error al registrar workspace:", err);
      setError(err.message || "Error al conectar con el servidor");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-md"
        onClick={() => !isSubmitting && !createdResult && onClose()}
      />

      {/* Modal Dialog Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-lg bg-[#181818] border border-white/10 rounded-[28px] shadow-2xl overflow-hidden z-10 my-auto"
      >
        {/* If workspace was created, show the PinRevealCard */}
        {createdResult ? (
          <PinRevealCard
            pin={createdResult.pin || "000000"}
            userName={name || "Usuario Taski"}
            brandName={brandName}
            email={email}
            onEnterWorkspace={() => onSuccess(createdResult)}
          />
        ) : (
          <div className="p-6 sm:p-8 flex flex-col">
            {/* Top Bar: Icon + Step indicator + Close button */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#222222] border border-white/10 flex items-center justify-center">
                  <Image src="/taski-icon.png" alt="Taski" width={20} height={20} className="object-contain" priority />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#ffffffd6] tracking-tight">
                    Acceso Beta Taski
                  </span>
                  <span className="text-[10px] text-[#ffffff6b]">
                    Paso {step} de 4
                  </span>
                </div>
              </div>

              {/* Segmented Step Progress Bar */}
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === step
                        ? "w-6 bg-[#3a7bd5]"
                        : i < step
                        ? "w-3 bg-white/40"
                        : "w-3 bg-white/10"
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-[#222222] hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium text-center">
                {error}
              </div>
            )}

            {/* Step 1: Perfil */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col gap-4"
              >
                <div>
                  <h3 className="text-xl font-bold text-[#ffffffd6] mb-1">
                    Cuéntanos sobre ti
                  </h3>
                  <p className="text-xs text-[#ffffff6b]">
                    Información básica para personalizar tu espacio de trabajo.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#ffffff6b] mb-1.5 block">
                      Tu Nombre <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ej. Sofia Ramos"
                        className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#222222] border border-white/10 text-sm text-[#ffffffd6] placeholder:text-white/30 focus:outline-none focus:border-[#3a7bd5]"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#ffffff6b] mb-1.5 block">
                      Nombre de tu Marca o Agencia (Opcional)
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        placeholder="Ej. Studio Nova"
                        className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#222222] border border-white/10 text-sm text-[#ffffffd6] placeholder:text-white/30 focus:outline-none focus:border-[#3a7bd5]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#ffffff6b] mb-1.5 block">
                      Correo Electrónico (Para recuperación de llave)
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="sofia@ejemplo.com"
                        className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#222222] border border-white/10 text-sm text-[#ffffffd6] placeholder:text-white/30 focus:outline-none focus:border-[#3a7bd5]"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Especialidad */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col gap-4"
              >
                <div>
                  <h3 className="text-xl font-bold text-[#ffffffd6] mb-1">
                    ¿Cuál es tu especialidad principal?
                  </h3>
                  <p className="text-xs text-[#ffffff6b]">
                    Configuraremos los formatos y herramientas según tu rol.
                  </p>
                </div>

                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {SPECIALTIES.map((item) => {
                    const isSelected = specialty === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          playSound("click");
                          setSpecialty(item.id);
                        }}
                        className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#3a7bd5]/15 border-[#3a7bd5] text-white"
                            : "bg-[#222222] border-white/10 hover:bg-white/[0.06] text-[#ffffffd6]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              isSelected ? "bg-[#3a7bd5] text-white" : "bg-white/5 text-white/60"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-semibold block">{item.title}</span>
                            <span className="text-[10px] text-[#ffffff6b] block">{item.desc}</span>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#3a7bd5]" />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 3: Objetivos */}
            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col gap-4"
              >
                <div>
                  <h3 className="text-xl font-bold text-[#ffffffd6] mb-1">
                    ¿Qué buscas resolver en Taski?
                  </h3>
                  <p className="text-xs text-[#ffffff6b]">
                    Selecciona todas las áreas que te interesen.
                  </p>
                </div>

                <div className="flex flex-col gap-2.5">
                  {USE_CASES.map((item) => {
                    const isSelected = useCases.includes(item.id);
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleUseCase(item.id)}
                        className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#3a7bd5]/15 border-[#3a7bd5] text-white"
                            : "bg-[#222222] border-white/10 hover:bg-white/[0.06] text-[#ffffffd6]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              isSelected ? "bg-[#3a7bd5] text-white" : "bg-white/5 text-white/60"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-medium">{item.label}</span>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                            isSelected
                              ? "bg-[#3a7bd5] border-[#3a7bd5] text-white"
                              : "border-white/20 bg-transparent"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 4: Tamaño del Equipo */}
            {step === 4 && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col gap-4"
              >
                <div>
                  <h3 className="text-xl font-bold text-[#ffffffd6] mb-1">
                    ¿Cuál es el tamaño de tu equipo?
                  </h3>
                  <p className="text-xs text-[#ffffff6b]">
                    Nos ayuda a calcular capacidades de carga de trabajo.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {TEAM_SIZES.map((item) => {
                    const isSelected = teamSize === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          playSound("click");
                          setTeamSize(item.id);
                        }}
                        className={`p-4 rounded-xl border text-center flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#3a7bd5]/15 border-[#3a7bd5] text-white shadow-md shadow-blue-500/10"
                            : "bg-[#222222] border-white/10 hover:bg-white/[0.06] text-[#ffffffd6]"
                        }`}
                      >
                        <Users2 className={`w-5 h-5 ${isSelected ? "text-[#3a7bd5]" : "text-white/40"}`} />
                        <span className="text-xs font-semibold">{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-[11px] text-white/50 leading-relaxed text-center mt-2">
                  Al completar, generaremos automáticamente tu **Llave Maestra de 6 dígitos** para acceder a tu espacio privado.
                </div>
              </motion.div>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-white/10">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-[#222222] hover:bg-white/10 text-white/80 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Atrás</span>
                </button>
              ) : (
                <div />
              )}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-5 py-2.5 rounded-xl bg-[#3a7bd5] hover:bg-[#3470c2] text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
                >
                  <span>Siguiente</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmitSurvey}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#3a7bd5] hover:bg-[#3470c2] disabled:opacity-50 text-white text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ml-auto shadow-lg shadow-blue-500/20"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Generando tu espacio...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Crear mi Espacio & Generar PIN</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
