"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ArrowRight,
  X,
  Link as LinkIcon,
  Upload,
  FileText,
  Loader2,
  Trash2,
  Copy,
  Download,
  KeyRound,
} from "lucide-react";
import { MagicRingsBackground } from "./MagicRingsBackground";
import { createWorkspaceWithSurvey } from "@/lib/api";
import { playSound } from "@/app/taski/utils/audio";
import { useAuthStore } from "@/lib/store";
import type { LoginResponse, Role } from "@/lib/types";

export interface TaskiStepRegisterProps {
  onClose?: () => void;
  onSuccess?: (res: LoginResponse) => void;
  stepperPosition?: "left" | "right";
}

const TEAM_SIZE_OPTIONS = ["Solo yo", "2-10", "11-50", "51-200", "200+"];

const INDUSTRY_OPTIONS = [
  "Publicidad y medios",
  "E-commerce",
  "Moda y estilo de vida",
  "Entretenimiento",
  "Tecnología",
  "Otro",
];

const STEPS = [
  {
    stepNumber: 1,
    title: "Tu equipo",
    subtitle: "Quiénes son y qué construyen.",
  },
  {
    stepNumber: 2,
    title: "Workspace",
    subtitle: "El nombre con el que trabajará tu equipo.",
  },
  {
    stepNumber: 3,
    title: "Miembros",
    subtitle: "Invita a quién crea contigo.",
  },
  {
    stepNumber: 4,
    title: "Brand AI",
    subtitle: "El contexto que hace on-brand cada generación.",
  },
];

export function TaskiStepRegister({
  onClose,
  onSuccess,
  stepperPosition = "left",
}: TaskiStepRegisterProps) {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  // Form state
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [companyName, setCompanyName] = useState<string>("");
  const [teamSize, setTeamSize] = useState<string>("2-10");
  const [industry, setIndustry] = useState<string>("Publicidad y medios");

  const [workspaceName, setWorkspaceName] = useState<string>("");
  const [isWorkspaceEdited, setIsWorkspaceEdited] = useState<boolean>(false);

  // Step 3: Members
  const [memberInput, setMemberInput] = useState<string>("");
  const [membersList, setMembersList] = useState<string[]>([]);

  // Step 4: Brand AI
  const [linkInput, setLinkInput] = useState<string>("");
  const [brandLinks, setBrandLinks] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<
    { name: string; size: string }[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status & Success
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<LoginResponse | null>(null);
  const [copiedPin, setCopiedPin] = useState<boolean>(false);

  // Auto-fill workspace name based on company name unless manually changed
  useEffect(() => {
    if (!isWorkspaceEdited) {
      setWorkspaceName(companyName ? `${companyName} Studio` : "");
    }
  }, [companyName, isWorkspaceEdited]);

  const handleAddMember = () => {
    const trimmed = memberInput.trim().toLowerCase();
    if (!trimmed) return;
    if (!trimmed.includes("@") || !trimmed.includes(".")) {
      setErrorMessage("Por favor ingresa un correo electrónico válido");
      return;
    }
    if (membersList.includes(trimmed)) {
      setErrorMessage("Este correo ya fue agregado");
      return;
    }
    playSound("click");
    setMembersList((prev) => [...prev, trimmed]);
    setMemberInput("");
    setErrorMessage(null);
  };

  const handleRemoveMember = (emailToRemove: string) => {
    playSound("tick");
    setMembersList((prev) => prev.filter((m) => m !== emailToRemove));
  };

  const handleAddLink = () => {
    const trimmed = linkInput.trim();
    if (!trimmed) return;
    playSound("click");
    setBrandLinks((prev) => [...prev, trimmed]);
    setLinkInput("");
  };

  const handleRemoveLink = (linkToRemove: string) => {
    playSound("tick");
    setBrandLinks((prev) => prev.filter((l) => l !== linkToRemove));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    playSound("pop");
    const newItems: { name: string; size: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const sizeMb = (f.size / (1024 * 1024)).toFixed(1);
      newItems.push({ name: f.name, size: `${sizeMb} MB` });
    }
    setUploadedFiles((prev) => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveFile = (fileName: string) => {
    playSound("tick");
    setUploadedFiles((prev) => prev.filter((f) => f.name !== fileName));
  };

  const handleNext = () => {
    setErrorMessage(null);
    playSound("click");

    if (currentStep === 1) {
      if (!companyName.trim()) {
        setErrorMessage("Por favor ingresa el nombre de la empresa");
        return;
      }
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      if (!workspaceName.trim()) {
        setErrorMessage("Por favor ingresa el nombre de tu workspace");
        return;
      }
      setCurrentStep(3);
      return;
    }

    if (currentStep === 3) {
      if (memberInput.trim()) {
        handleAddMember();
      }
      setCurrentStep(4);
      return;
    }

    if (currentStep === 4) {
      handleSubmitRegistration();
    }
  };

  const handlePrev = () => {
    setErrorMessage(null);
    playSound("click");
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    } else if (onClose) {
      onClose();
    } else {
      router.push("/");
    }
  };

  const handleSubmitRegistration = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    playSound("pop");

    try {
      const payload = {
        name: companyName.trim() || "Usuario Taski",
        companyName: companyName.trim(),
        workspaceName: workspaceName.trim() || `${companyName.trim()} Workspace`,
        brandName: companyName.trim(),
        teamSize,
        industry,
        members: membersList,
        brandLinks,
        brandFiles: uploadedFiles.map((f) => ({ name: f.name })),
        specialty: industry,
      };

      const res = await createWorkspaceWithSurvey(payload);
      if (res && res.ok && res.pin) {
        playSound("click");
        setCreatedResult(res);
        if (res.token && res.workspaceId) {
          setAuth(
            (res.role as Role) || "admin",
            res.id || "admin",
            companyName.trim() || res.nombre || "Usuario",
            res.token,
            res.workspaceId
          );
        }
      } else {
        setErrorMessage(res?.error || "No se pudo crear el workspace. Intenta nuevamente.");
      }
    } catch (err: any) {
      console.error("Error creating workspace:", err);
      setErrorMessage(err.message || "Error al conectar con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPin = (pin: string) => {
    try {
      navigator.clipboard.writeText(pin);
      playSound("click");
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2500);
    } catch {}
  };

  const handleDownloadBackup = (pin: string) => {
    playSound("click");
    const content = `=====================================================
TASKI OS — CREDENCIALES DE ACCESO
=====================================================

Empresa: ${companyName || "Mi Empresa"}
Workspace: ${workspaceName || "Estudio Nova"}
🔑 LLAVE DE ACCESO MAESTRA (PIN): ${pin}

Fecha de Registro: ${new Date().toLocaleString("es-ES")}

-----------------------------------------------------
INSTRUCCIONES DE ACCESO:
1. Abre Taski en cualquier navegador o dispositivo.
2. Ingresa tu PIN de 6 dígitos: ${pin}
3. Tus proyectos, clientes y tareas se sincronizan en la nube.
=====================================================`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `taski-llave-acceso-${pin}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleEnterWorkspace = () => {
    playSound("pop");
    if (onSuccess && createdResult) {
      onSuccess(createdResult);
    } else {
      router.push("/taski");
    }
  };

  const isStep1Valid = companyName.trim().length > 0;
  const isStep2Valid = workspaceName.trim().length > 0;

  return (
    <div className="min-h-screen w-full bg-[#101010] text-[#ffffffd6] relative flex flex-col overflow-x-hidden selection:bg-white/20 selection:text-white">
      {/* Contenedor Split Screen directo: IZQUIERDA (Stepper) y DERECHA (Formulario directo en el fondo) */}
      <div
        className={`w-full min-h-screen flex flex-col ${
          stepperPosition === "right" ? "md:flex-row-reverse" : "md:flex-row"
        }`}
      >
        {/* ========================================================================= */}
        {/* COLUMNA IZQUIERDA: LOGO BRANDEX + STEPPER + MAGICRINGS + CARD DE VALOR    */}
        {/* ========================================================================= */}
        <div className="w-full md:w-[380px] lg:w-[420px] shrink-0 relative flex flex-col justify-between p-7 sm:p-9 md:p-12 border-b md:border-b-0 md:border-r border-white/5 bg-[#121212]/90 backdrop-blur-md overflow-hidden z-20">
          {/* Fondo interactivo animado MagicRings */}
          <MagicRingsBackground speed={0.65} opacity={0.75} />

          {/* Top: Logo Oficial Brandex */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center">
              <Image
                src="/brandex-logo.svg"
                alt="Brandex"
                width={138}
                height={32}
                className="object-contain h-7 w-auto opacity-95 hover:opacity-100 transition-opacity"
                priority
              />
            </div>

            {/* Botón cerrar para móvil */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="md:hidden w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Middle: Stepper Vertical Fiel a Forkads */}
          <div className="relative z-10 my-10 md:my-auto flex flex-col gap-8">
            {STEPS.map((s, idx) => {
              const isDone = currentStep > s.stepNumber || createdResult !== null;
              const isActive = currentStep === s.stepNumber && createdResult === null;

              return (
                <div key={s.stepNumber} className="relative flex items-start gap-4">
                  {/* Línea vertical conectora continua */}
                  {idx < STEPS.length - 1 && (
                    <div
                      className={`absolute left-[11px] top-[26px] w-px h-[calc(100%+14px)] transition-colors duration-300 ${
                        isDone ? "bg-white/40" : "bg-white/10"
                      }`}
                    />
                  )}

                  {/* Nodo indicador fiel al diseño original */}
                  <div className="relative z-10 shrink-0">
                    {isDone ? (
                      /* Estado Hecho: Círculo blanco con checkmark negro */
                      <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center shadow-md">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    ) : isActive ? (
                      /* Estado Activo: Anillo fino exterior con punto sólido concéntrico */
                      <div className="w-6 h-6 rounded-full border border-white/80 flex items-center justify-center bg-black/60 shadow-[0_0_10px_rgba(255,255,255,0.15)]">
                        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      </div>
                    ) : (
                      /* Estado Inactivo: Anillo tenue con punto sutil */
                      <div className="w-6 h-6 rounded-full border border-white/20 bg-transparent flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                      </div>
                    )}
                  </div>

                  {/* Título y subtítulo en 2 líneas */}
                  <div className="flex flex-col pt-0.5 select-none">
                    <span
                      className={`text-[14px] font-medium leading-tight transition-colors ${
                        isActive
                          ? "text-white"
                          : isDone
                          ? "text-[#ffffffd6]"
                          : "text-white/40"
                      }`}
                    >
                      {s.title}
                    </span>
                    <span
                      className={`text-[12px] leading-snug mt-1 transition-colors ${
                        isActive
                          ? "text-[#ffffff80]"
                          : isDone
                          ? "text-[#ffffff6b]"
                          : "text-white/25"
                      }`}
                    >
                      {s.subtitle}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom: Tarjeta de valor */}
          <div className="relative z-10 rounded-2xl border border-white/10 bg-white/[0.025] p-4.5 backdrop-blur-md">
            <h4 className="text-[14px] font-semibold text-white mb-1.5">
              Tu sistema creativo
            </h4>
            <p className="text-[12px] text-[#ffffff6b] leading-relaxed">
              La plataforma de IA creativa para equipos modernos: genera videos,
              imágenes, avatares y campañas a escala.
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMNA DERECHA: FORMULARIO DIRECTAMENTE EN EL FONDO (SIN RECTÁNGULO CARD) */}
        {/* ========================================================================= */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10 md:p-16 lg:p-20 overflow-y-auto relative z-10 bg-[#101010]">
          {/* Botón cerrar para Desktop */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="hidden md:flex absolute top-8 right-8 w-8 h-8 rounded-full bg-white/5 border border-white/10 items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer z-30"
              aria-label="Cerrar registro"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Contenedor fluido sin marco artificial */}
          <div className="max-w-[460px] w-full mx-auto flex flex-col my-auto">
            {/* ================================================================= */}
            {/* PASO FINAL: LLAVE DE ACCESO ARMONIOSA Y MINIMALISTA               */}
            {/* ================================================================= */}
            {createdResult ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col"
              >
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-1.5">
                  Tu llave de acceso
                </h2>
                <p className="text-[13px] text-[#ffffff6b] mb-8">
                  Este PIN de 6 dígitos es la credencial única de tu espacio de trabajo.
                </p>

                {/* Dígitos de PIN en formato minimalista */}
                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6">
                  {(createdResult.pin || "000000").split("").map((digit, idx) => (
                    <div
                      key={idx}
                      className="w-11 h-14 sm:w-12 sm:h-15 rounded-xl border border-white/20 bg-transparent flex items-center justify-center text-2xl font-mono font-bold text-white shadow-inner"
                    >
                      {digit}
                    </div>
                  ))}
                </div>

                {/* Botones de acción secundaria (Copiar y Descargar .txt) */}
                <div className="flex items-center justify-center gap-2.5 mb-6">
                  <button
                    type="button"
                    onClick={() => handleCopyPin(createdResult.pin || "000000")}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                      copiedPin
                        ? "bg-white/15 border-white text-white font-semibold"
                        : "bg-transparent border-white/15 hover:border-white/30 text-[#ffffffb3] hover:text-white"
                    }`}
                  >
                    {copiedPin ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>¡PIN Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar llave</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadBackup(createdResult.pin || "000000")}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-transparent border border-white/15 hover:border-white/30 text-[#ffffffb3] hover:text-white transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar .txt</span>
                  </button>
                </div>

                <p className="text-[11px] text-[#ffffff40] text-center mb-8 leading-relaxed">
                  Guarda este PIN en tus notas seguras. Es tu llave privada para ingresar a tu espacio desde cualquier dispositivo.
                </p>

                {/* Botón primario blanco idéntico a todos los pasos */}
                <button
                  type="button"
                  onClick={handleEnterWorkspace}
                  className="w-full h-11 rounded-xl bg-white text-black hover:bg-white/90 font-semibold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Entrar al Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            ) : (
              /* ================================================================= */
              /* PASOS 1 A 4: DIRECTAMENTE SOBRE EL FONDO                          */
              /* ================================================================= */
              <div className="flex flex-col">
                {/* Banner de error */}
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium text-center"
                  >
                    {errorMessage}
                  </motion.div>
                )}

                <AnimatePresence mode="wait">
                  {/* ===================================================== */}
                  {/* PASO 1: SOBRE TU EQUIPO (Imagen 1)                   */}
                  {/* ===================================================== */}
                  {currentStep === 1 && (
                    <motion.div
                      key="step-1"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col"
                    >
                      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-1.5">
                        Sobre tu equipo
                      </h2>
                      <p className="text-[13px] text-[#ffffff6b] mb-8">
                        Ayúdanos a personalizar tu espacio creativo.
                      </p>

                      {/* Campo 1: Nombre de la empresa */}
                      <div className="flex flex-col mb-6">
                        <label className="text-[12px] font-medium text-[#ffffffd6] mb-2">
                          Nombre de la empresa
                        </label>
                        <input
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleNext()}
                          placeholder="Acme studio"
                          autoFocus
                          className="w-full h-11 px-4 rounded-xl bg-transparent border border-white/15 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/40 transition-colors"
                        />
                      </div>

                      {/* Campo 2: Tamaño del equipo (Píldoras solo con fondo limpio) */}
                      <div className="flex flex-col mb-6">
                        <label className="text-[12px] font-medium text-[#ffffffd6] mb-2.5">
                          Tamaño del equipo
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          {TEAM_SIZE_OPTIONS.map((opt) => {
                            const isSelected = teamSize === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                  playSound("click");
                                  setTeamSize(opt);
                                }}
                                className={`px-4 py-2 rounded-full text-xs transition-all cursor-pointer ${
                                  isSelected
                                    ? "bg-white text-black font-semibold shadow-sm"
                                    : "bg-transparent text-[#ffffffb3] hover:text-white border border-white/15 hover:border-white/30"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Campo 3: Industria (Píldoras solo con fondo limpio) */}
                      <div className="flex flex-col mb-8">
                        <label className="text-[12px] font-medium text-[#ffffffd6] mb-2.5">
                          Industria
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          {INDUSTRY_OPTIONS.map((ind) => {
                            const isSelected = industry === ind;
                            return (
                              <button
                                key={ind}
                                type="button"
                                onClick={() => {
                                  playSound("click");
                                  setIndustry(ind);
                                }}
                                className={`px-4 py-2 rounded-full text-xs transition-all cursor-pointer ${
                                  isSelected
                                    ? "bg-white text-black font-semibold shadow-sm"
                                    : "bg-transparent text-[#ffffffb3] hover:text-white border border-white/15 hover:border-white/30"
                                }`}
                              >
                                {ind}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Botones de navegación inferiores */}
                      <div className="flex items-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handlePrev}
                          className="px-5 py-2.5 rounded-xl bg-transparent hover:bg-white/10 border border-white/15 text-xs font-medium text-white/50 hover:text-white transition-colors cursor-pointer"
                        >
                          Atrás
                        </button>
                        <button
                          type="button"
                          onClick={handleNext}
                          disabled={!isStep1Valid}
                          className={`flex-1 h-10 rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                            !isStep1Valid
                              ? "bg-transparent border border-white/10 text-white/30 cursor-not-allowed"
                              : "bg-white text-black hover:bg-white/90 shadow-md active:scale-95"
                          }`}
                        >
                          Continuar
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* ===================================================== */}
                  {/* PASO 2: NOMBRA TU WORKSPACE (Imagen 2)                */}
                  {/* ===================================================== */}
                  {currentStep === 2 && (
                    <motion.div
                      key="step-2"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col"
                    >
                      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-1.5">
                        Nombra tu workspace
                      </h2>
                      <p className="text-[13px] text-[#ffffff6b] mb-8">
                        Así te encontrará tu equipo en Brandex.
                      </p>

                      {/* Campo 1: Nombre del workspace */}
                      <div className="flex flex-col mb-6">
                        <label className="text-[12px] font-medium text-[#ffffffd6] mb-2">
                          Nombre del workspace
                        </label>
                        <input
                          type="text"
                          value={workspaceName}
                          onChange={(e) => {
                            setIsWorkspaceEdited(true);
                            setWorkspaceName(e.target.value);
                          }}
                          onKeyDown={(e) => e.key === "Enter" && handleNext()}
                          placeholder="Estudio Nova"
                          autoFocus
                          className="w-full h-11 px-4 rounded-xl bg-transparent border border-white/15 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/40 transition-colors"
                        />
                        <span className="text-[11px] text-[#ffffff6b] mt-1.5">
                          Puedes cambiarlo después.
                        </span>
                      </div>

                      {/* Micro-tarjeta de preview en vivo */}
                      <div className="rounded-xl bg-transparent border border-white/15 p-3.5 flex items-center gap-3.5 mb-8">
                        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-bold text-sm text-white/80 shrink-0">
                          {(workspaceName || companyName || "B").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-white">
                            {workspaceName || "Estudio Nova"}
                          </span>
                          <span className="text-xs text-[#ffffff6b]">
                            Así se llamará tu organización.
                          </span>
                        </div>
                      </div>

                      {/* Botones de navegación inferiores */}
                      <div className="flex items-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handlePrev}
                          className="px-5 py-2.5 rounded-xl bg-transparent hover:bg-white/10 border border-white/15 text-xs font-medium text-white/50 hover:text-white transition-colors cursor-pointer"
                        >
                          Atrás
                        </button>
                        <button
                          type="button"
                          onClick={handleNext}
                          disabled={!isStep2Valid}
                          className={`flex-1 h-10 rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                            !isStep2Valid
                              ? "bg-transparent border border-white/10 text-white/30 cursor-not-allowed"
                              : "bg-white text-black hover:bg-white/90 shadow-md active:scale-95"
                          }`}
                        >
                          Continuar
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* ===================================================== */}
                  {/* PASO 3: INVITA A TU EQUIPO (Imagen 3)                 */}
                  {/* ===================================================== */}
                  {currentStep === 3 && (
                    <motion.div
                      key="step-3"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col"
                    >
                      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-1.5">
                        Invita a tu equipo
                      </h2>
                      <p className="text-[13px] text-[#ffffff6b] mb-8">
                        Agrega miembros por email. También puedes hacerlo después.
                      </p>

                      {/* Input de correo */}
                      <div className="flex flex-col mb-6">
                        <input
                          type="email"
                          value={memberInput}
                          onChange={(e) => setMemberInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === ",") {
                              e.preventDefault();
                              handleAddMember();
                            }
                          }}
                          placeholder="nombre@empresa.com"
                          autoFocus
                          className="w-full h-11 px-4 rounded-xl bg-transparent border border-white/15 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/40 transition-colors"
                        />
                      </div>

                      {/* Chips de miembros agregados */}
                      {membersList.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 mb-6 max-h-32 overflow-y-auto">
                          {membersList.map((m) => (
                            <div
                              key={m}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/15 bg-transparent text-xs text-white"
                            >
                              <span className="font-mono text-[11px]">{m}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(m)}
                                className="text-white/40 hover:text-white"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Botones de navegación: Atrás | Continuar | Omitir -> */}
                      <div className="flex items-center gap-3 pt-4">
                        <button
                          type="button"
                          onClick={handlePrev}
                          className="px-5 py-2.5 rounded-xl bg-transparent hover:bg-white/10 border border-white/15 text-xs font-medium text-white/50 hover:text-white transition-colors cursor-pointer"
                        >
                          Atrás
                        </button>
                        <button
                          type="button"
                          onClick={handleNext}
                          className="flex-1 h-10 rounded-xl bg-white text-black hover:bg-white/90 text-xs font-semibold shadow-md active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                        >
                          Continuar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            playSound("click");
                            setCurrentStep(4);
                          }}
                          className="px-3 py-2 text-xs font-medium text-white/50 hover:text-white transition-colors cursor-pointer flex items-center gap-1 group"
                        >
                          <span>Omitir</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* ===================================================== */}
                  {/* PASO 4: ENTRENA TU BRAND AI (Imagen 4)                */}
                  {/* ===================================================== */}
                  {currentStep === 4 && (
                    <motion.div
                      key="step-4"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col"
                    >
                      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-1.5">
                        Entrena tu Brand AI
                      </h2>
                      <p className="text-[13px] text-[#ffffff6b] leading-relaxed mb-6">
                        Dale contexto a nuestra AI sobre tu marca. Mientras más sepa,
                        más inteligente se vuelve el modo Agent, generando contenido
                        verdaderamente on-brand.
                      </p>

                      {/* Sección 1: Pega un link */}
                      <div className="rounded-xl border border-white/15 bg-transparent p-4 mb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <LinkIcon className="w-4 h-4 text-white/80" />
                          <span className="text-xs font-semibold text-white">
                            Pega un link
                          </span>
                        </div>
                        <p className="text-[11px] text-[#ffffff6b] mb-3">
                          Shopify, Instagram, TikTok, tu web, cualquier URL con
                          contenido de tu marca
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="url"
                            value={linkInput}
                            onChange={(e) => setLinkInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddLink();
                              }
                            }}
                            placeholder="yourstore.myshopify.com"
                            className="flex-1 h-9 px-3.5 rounded-xl bg-transparent border border-white/15 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-white/40 transition-colors"
                          />
                          <button
                            type="button"
                            onClick={handleAddLink}
                            className="h-9 px-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-medium text-white transition-all cursor-pointer"
                          >
                            Agregar
                          </button>
                        </div>

                        {/* Badges de links */}
                        {brandLinks.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-2">
                            {brandLinks.map((l) => (
                              <div
                                key={l}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/15 bg-transparent text-[11px] text-white/90"
                              >
                                <span className="truncate max-w-[220px]">{l}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLink(l)}
                                  className="text-white/40 hover:text-white"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Sección 2: Arrastra archivos */}
                      <div className="rounded-xl border border-white/15 bg-transparent p-6 flex flex-col items-center justify-center text-center gap-1.5 mb-6 relative">
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          onChange={handleFileSelect}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                        />
                        <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 mb-0.5">
                          <Upload className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-semibold text-white">
                          Arrastra archivos o haz clic para elegir
                        </span>
                        <span className="text-[11px] text-[#ffffff6b]">
                          PDFs, imágenes, videos, brand guides, lookbooks, campañas...
                        </span>

                        {uploadedFiles.length > 0 && (
                          <div className="w-full flex flex-col gap-1.5 mt-2 z-20">
                            {uploadedFiles.map((file) => (
                              <div
                                key={file.name}
                                className="flex items-center justify-between px-3 py-1.5 rounded-lg border border-white/15 bg-transparent text-xs text-left"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                  <span className="text-white truncate">
                                    {file.name}
                                  </span>
                                  <span className="text-[10px] text-white/40">
                                    ({file.size})
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveFile(file.name);
                                  }}
                                  className="text-white/40 hover:text-rose-400 p-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Botones de navegación inferiores */}
                      <div className="flex items-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handlePrev}
                          disabled={isSubmitting}
                          className="px-5 py-2.5 rounded-xl bg-transparent hover:bg-white/10 border border-white/15 text-xs font-medium text-white/50 hover:text-white transition-colors cursor-pointer"
                        >
                          Atrás
                        </button>
                        <button
                          type="button"
                          onClick={handleSubmitRegistration}
                          disabled={isSubmitting}
                          className="flex-1 h-10 rounded-xl bg-white text-black hover:bg-white/90 text-xs font-semibold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                              <span>Creando...</span>
                            </>
                          ) : (
                            <span>Continuar</span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleSubmitRegistration}
                          disabled={isSubmitting}
                          className="px-3 py-2 text-xs font-medium text-white/50 hover:text-white transition-colors cursor-pointer flex items-center gap-1 group"
                        >
                          <span>Omitir</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskiStepRegister;
