"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CheckCircle2,
  Smartphone,
  Globe,
  Utensils,
  Palette,
  Megaphone,
  Layers,
  ArrowRight,
  ArrowLeft,
  MessageCircle,
  Check,
} from "lucide-react";
import { playSound } from "@/app/taski/utils/audio";

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SERVICE_OPTIONS = [
  {
    id: "redes",
    label: "Redes Sociales & Growth",
    icon: Smartphone,
    desc: "Parrillas mensuales, reels 9:16 y gestión de comunidad enfocada en ventas",
  },
  {
    id: "web",
    label: "Desarrollo Web & Landing Pages",
    icon: Globe,
    desc: "Sitios web ultra rápidos en Next.js, diseño UI/UX y tiendas en línea",
  },
  {
    id: "menu",
    label: "Menús Digitales QR Interactivos",
    icon: Utensils,
    desc: "Menús sin contacto para restaurantes y bares con actualización inmediata",
  },
  {
    id: "flyers",
    label: "Flyers, Branding & Diseño",
    icon: Palette,
    desc: "Material publicitario listo para imprenta, Stories e identidad visual",
  },
  {
    id: "ads",
    label: "Pauta Digital (Meta & Google Ads)",
    icon: Megaphone,
    desc: "Campañas de captación, remarketing y maximización del retorno de inversión",
  },
  {
    id: "integral",
    label: "Estrategia 360° Completa",
    icon: Layers,
    desc: "Solución integral de diseño, desarrollo, pauta y redes para tu marca",
  },
];

export function QuoteModal({ isOpen, onClose }: QuoteModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedServices, setSelectedServices] = useState<string[]>(["redes"]);
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Reiniciar estado al abrir/cerrar
  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStep(1);
      setSubmitted(false);
    }, 300);
  };

  const toggleService = (id: string) => {
    try {
      playSound("click");
    } catch {}
    if (selectedServices.includes(id)) {
      if (selectedServices.length > 1) {
        setSelectedServices(selectedServices.filter((s) => s !== id));
      }
    } else {
      setSelectedServices([...selectedServices, id]);
    }
  };

  const handleNextStep = () => {
    if (selectedServices.length === 0) return;
    try {
      playSound("click");
    } catch {}
    setStep(2);
  };

  const handlePrevStep = () => {
    try {
      playSound("click");
    } catch {}
    setStep(1);
  };

  const handleSendWhatsapp = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      playSound("pop");
    } catch {}

    const servicesText = selectedServices
      .map((s) => SERVICE_OPTIONS.find((opt) => opt.id === s)?.label)
      .filter(Boolean)
      .join(", ");

    const text = `¡Hola Brandex! 👋%0A%0AQuiero cotizar un proyecto para mi marca:%0A• *Negocio:* ${encodeURIComponent(
      businessName || "No especificado"
    )}%0A• *Contacto:* ${encodeURIComponent(
      contactName || "No especificado"
    )}%0A• *Teléfono:* ${encodeURIComponent(
      phone || "No especificado"
    )}%0A• *Servicios de interés:* ${encodeURIComponent(
      servicesText
    )}%0A• *Detalles:* ${encodeURIComponent(notes || "Quiero más información sobre tiempos y costos.")}`;

    const whatsappUrl = `https://wa.me/5219999999999?text=${text}`;

    setSubmitted(true);

    setTimeout(() => {
      window.open(whatsappUrl, "_blank");
    }, 400);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop con desenfoque suave */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Modal Container Layer 2B */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="relative z-10 w-full max-w-[560px] bg-[#181818] border border-white/15 rounded-[28px] p-6 sm:p-8 shadow-2xl shadow-black/95 flex flex-col overflow-hidden"
          >
            {/* Botón Cerrar */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X className="w-4 h-4" />
            </button>

            {!submitted ? (
              <>
                {/* Indicador de Pasos en Píldora */}
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className={`h-1 flex-1 rounded-full transition-all ${
                      step >= 1 ? "bg-white" : "bg-white/15"
                    }`}
                  />
                  <div
                    className={`h-1 flex-1 rounded-full transition-all ${
                      step >= 2 ? "bg-white" : "bg-white/15"
                    }`}
                  />
                </div>

                {/* PASO 1: Selección de Servicios */}
                {step === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col"
                  >
                    <div className="mb-5">
                      <span className="text-[11px] font-mono text-white/50 uppercase tracking-wider block mb-1">
                        Paso 1 de 2
                      </span>
                      <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                        ¿Qué servicios necesita tu marca?
                      </h3>
                      <p className="text-xs text-[#ffffff6b] mt-1">
                        Elige uno o varios entregables para armar tu propuesta personalizada.
                      </p>
                    </div>

                    {/* Lista de Servicios Espaciosa */}
                    <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                      {SERVICE_OPTIONS.map((item) => {
                        const isSelected = selectedServices.includes(item.id);
                        const Icon = item.icon;
                        return (
                          <div
                            key={item.id}
                            onClick={() => toggleService(item.id)}
                            className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                              isSelected
                                ? "bg-white/10 border-white/30 text-white shadow-sm"
                                : "bg-[#222222]/60 border-white/10 text-white/70 hover:bg-[#222222] hover:border-white/20"
                            }`}
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? "bg-white text-black"
                                    : "bg-white/5 text-white/80"
                                }`}
                              >
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-white leading-tight">
                                  {item.label}
                                </p>
                                <p className="text-[11px] text-white/50 leading-tight mt-0.5 truncate">
                                  {item.desc}
                                </p>
                              </div>
                            </div>

                            {/* Checkbox circular */}
                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                                isSelected
                                  ? "bg-white border-white text-black"
                                  : "border-white/20 bg-transparent"
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Botón Continuar */}
                    <div className="pt-6 mt-2 border-t border-white/10 flex items-center justify-between">
                      <span className="text-xs text-white/50">
                        {selectedServices.length} servicio{selectedServices.length !== 1 ? "s" : ""}{" "}
                        seleccionado{selectedServices.length !== 1 ? "s" : ""}
                      </span>
                      <button
                        type="button"
                        onClick={handleNextStep}
                        className="px-6 py-2.5 rounded-full bg-white text-black font-semibold text-xs hover:bg-white/90 transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-black/40"
                      >
                        <span>Continuar</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* PASO 2: Datos de Contacto y Envío */}
                {step === 2 && (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col"
                  >
                    <div className="mb-4">
                      <span className="text-[11px] font-mono text-white/50 uppercase tracking-wider block mb-1">
                        Paso 2 de 2
                      </span>
                      <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                        Cuéntanos sobre tu negocio
                      </h3>
                      <p className="text-xs text-[#ffffff6b] mt-1">
                        Prepararemos una cotización clara con tiempos exactos y entregables.
                      </p>
                    </div>

                    {/* Servicios Seleccionados Resumen */}
                    <div className="flex flex-wrap gap-1.5 mb-4 p-2.5 rounded-xl bg-[#222222] border border-white/10">
                      {selectedServices.map((sId) => {
                        const sObj = SERVICE_OPTIONS.find((o) => o.id === sId);
                        return (
                          <span
                            key={sId}
                            className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/10 text-white font-medium"
                          >
                            {sObj?.label}
                          </span>
                        );
                      })}
                    </div>

                    <form onSubmit={handleSendWhatsapp} className="flex flex-col gap-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-white/70 mb-1">
                            Nombre de tu Marca o Negocio *
                          </label>
                          <input
                            type="text"
                            required
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            placeholder="Ej. Restaurante Bistro / Tienda Glow"
                            className="w-full bg-[#222222] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-white/70 mb-1">
                            Tu Nombre *
                          </label>
                          <input
                            type="text"
                            required
                            value={contactName}
                            onChange={(e) => setContactName(e.target.value)}
                            placeholder="Ej. Carlos Mendoza"
                            className="w-full bg-[#222222] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-white/70 mb-1">
                          Teléfono / WhatsApp *
                        </label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Ej. +52 999 123 4567"
                          className="w-full bg-[#222222] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-white/70 mb-1">
                          ¿Qué metas o requerimientos específicos tienes? (Opcional)
                        </label>
                        <textarea
                          rows={2}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Ej. Queremos renovar la carta con menú QR y aumentar ventas con pauta en Instagram..."
                          className="w-full bg-[#222222] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none transition-all resize-none"
                        />
                      </div>

                      {/* Acciones de Navegación del Formulario */}
                      <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={handlePrevStep}
                          className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Volver</span>
                        </button>

                        <button
                          type="submit"
                          className="px-6 py-2.5 rounded-full bg-white text-black font-semibold text-xs hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 shadow-lg shadow-black/40 cursor-pointer"
                        >
                          <MessageCircle className="w-4 h-4 fill-black text-black" />
                          <span>Enviar y Chatear por WhatsApp</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </>
            ) : (
              /* PASO 3: Confirmación / Éxito */
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">¡Solicitud lista!</h3>
                <p className="text-xs text-[#ffffff6b] max-w-sm mb-6 leading-relaxed">
                  Se ha generado tu mensaje estructurado en WhatsApp. Envíalo en la ventana abierta y un estratega de Brandex te responderá en minutos.
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-2.5 rounded-full bg-white text-black text-xs font-semibold hover:bg-white/90 transition-all cursor-pointer"
                >
                  Volver al sitio
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
