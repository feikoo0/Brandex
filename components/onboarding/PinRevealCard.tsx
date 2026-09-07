"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Download, ArrowRight } from "lucide-react";
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="w-full flex flex-col"
    >
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-1.5">
        Tu llave de acceso
      </h2>
      <p className="text-[13px] text-[#ffffff6b] mb-8">
        Este PIN de 6 dígitos es la credencial única de tu espacio de trabajo.
      </p>

      {/* Dígitos de PIN en formato minimalista */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6">
        {pin.split("").map((digit, idx) => (
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
          onClick={handleCopyPin}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
            copied
              ? "bg-white/15 border-white text-white font-semibold"
              : "bg-transparent border-white/15 hover:border-white/30 text-[#ffffffb3] hover:text-white"
          }`}
        >
          {copied ? (
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
          onClick={handleDownloadBackup}
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
        onClick={() => {
          playSound("pop");
          onEnterWorkspace();
        }}
        className="w-full h-11 rounded-xl bg-white text-black hover:bg-white/90 font-semibold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <span>Entrar al Workspace</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
