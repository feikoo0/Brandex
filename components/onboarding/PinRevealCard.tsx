"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { KeyRound, Copy, Check, Download, ArrowRight, ShieldAlert, Sparkles } from "lucide-react";
import { playSound } from "@/app/taski/utils/audio";

interface PinRevealCardProps {
  pin: string;
  userName: string;
  brandName?: string;
  email?: string;
  onEnterWorkspace: () => void;
}

export function PinRevealCard({
  pin,
  userName,
  brandName,
  email,
  onEnterWorkspace,
}: PinRevealCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyPin = () => {
    try {
      navigator.clipboard.writeText(pin);
      playSound("click");
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  const handleDownloadBackup = () => {
    playSound("click");
    const content = `=====================================================
          TASKI OS — CREDENCIALES DE ACCESO
=====================================================

Propietario: ${userName}
${brandName ? `Espacio / Marca: ${brandName}\n` : ""}${email ? `Correo: ${email}\n` : ""}
🔑 LLAVE DE ACCESO MAESTRA (PIN): ${pin}

Fecha de Creación: ${new Date().toLocaleString("es-ES")}

-----------------------------------------------------
INSTRUCCIONES DE ACCESO:
1. Abre Taski en cualquier navegador o dispositivo.
2. Ingresa tu PIN de 6 dígitos: ${pin}
3. Tus proyectos, clientes y tareas se sincronizarán
   automáticamente en la nube en tiempo real.

⚠️ IMPORTANTE: Mantén este archivo en un lugar seguro.
   Tu llave es tu acceso privado a tu espacio de trabajo.
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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-lg flex flex-col items-center text-center p-6 sm:p-8"
    >
      {/* Header Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-4">
        <Sparkles className="w-3.5 h-3.5" />
        <span>Espacio Creado con Éxito</span>
      </div>

      <h2 className="text-2xl sm:text-3xl font-extrabold text-[#ffffffd6] tracking-tight mb-2">
        Tu Llave de Acceso
      </h2>
      <p className="text-xs sm:text-sm text-[#ffffff6b] max-w-sm mb-6">
        Hola <strong className="text-white/90">{userName}</strong>, este PIN de 6 dígitos es la llave única de tu espacio de trabajo privado en la nube.
      </p>

      {/* Pin Display Box */}
      <div className="w-full p-6 rounded-2xl bg-[#141414] border border-white/10 shadow-2xl relative overflow-hidden flex flex-col items-center mb-6">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />

        <span className="text-[10px] uppercase font-bold tracking-widest text-[#ffffff6b] mb-3">
          Llave de 6 Dígitos
        </span>

        {/* PIN Digits */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 my-2">
          {pin.split("").map((digit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 + 0.1 }}
              className="w-10 h-14 sm:w-12 sm:h-16 rounded-xl bg-[#222222] border border-white/15 flex items-center justify-center text-2xl sm:text-3xl font-mono font-bold text-white shadow-inner"
            >
              {digit}
            </motion.div>
          ))}
        </div>

        {/* Actions under PIN */}
        <div className="flex items-center gap-2 mt-5">
          <button
            type="button"
            onClick={handleCopyPin}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              copied
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "bg-[#222222] hover:bg-white/10 text-[#ffffffd6] border border-white/10"
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>¡Copiada al portapapeles!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#3a7bd5]" />
                <span>Copiar Llave</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadBackup}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#222222] hover:bg-white/10 text-[#ffffffd6] border border-white/10 transition-all cursor-pointer"
            title="Descargar archivo de texto con tu llave"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Descargar .txt</span>
          </button>
        </div>
      </div>

      {/* Security Warning Callout */}
      <div className="w-full flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300/90 text-left text-xs mb-6">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-amber-300 font-semibold block mb-0.5">Resguarda tu Llave</strong>
          Guarda este PIN en tus notas o gestor de contraseñas. Es tu credencial para acceder a tus proyectos desde cualquier dispositivo.
        </div>
      </div>

      {/* Enter Workspace Primary Button */}
      <button
        type="button"
        onClick={() => {
          playSound("pop");
          onEnterWorkspace();
        }}
        className="w-full py-3.5 px-6 rounded-xl bg-[#3a7bd5] hover:bg-[#3470c2] active:scale-[0.99] text-white font-semibold text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <span>Entrar a mi Espacio Taski</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
