"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Building2 } from "lucide-react";
import { playSound } from "../utils/audio";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface ClientItem {
  id: number;
  name: string;
  industry: string;
  logo: string;
  contactPerson: string;
  email: string;
  phone: string;
  totalBudget: string;
  paidAmount: string;
  pendingBalance: string;
  status: "VIP" | "Activo" | "Prospecto" | "Concluido";
  statusColor: string;
  sinceDate: string;
  website: string;
  notes: string;
}

interface CreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientCreated: (client: ClientItem) => void;
}

export default function CreateClientModal({
  isOpen,
  onClose,
  onClientCreated,
}: CreateClientModalProps) {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("Tecnología & Software");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"VIP" | "Activo" | "Prospecto" | "Concluido">("Activo");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      playSound("click");
      alert("Por favor ingresa el nombre del cliente.");
      return;
    }

    setIsSaving(true);
    playSound("pop");

    const newId = Date.now();
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const now = new Date();
    const sinceDate = `${months[now.getMonth()]} ${now.getFullYear()}`;

    let statusColor = "bg-blue-500/10 border-blue-500/30 text-blue-400";
    if (status === "VIP") statusColor = "bg-purple-500/10 border-purple-500/30 text-purple-400";
    if (status === "Prospecto") statusColor = "bg-amber-500/10 border-amber-500/30 text-amber-400";
    if (status === "Concluido") statusColor = "bg-zinc-500/10 border-zinc-500/30 text-zinc-400";

    const newClient: ClientItem = {
      id: newId,
      name: name.trim(),
      industry: industry.trim() || "General",
      logo: name.trim().charAt(0).toUpperCase(),
      contactPerson: contactPerson.trim() || "Contacto Principal",
      email: email.trim() || `${name.toLowerCase().replace(/\s+/g, '')}@ejemplo.com`,
      phone: phone.trim() || "+1 000 000 0000",
      totalBudget: "$0",
      paidAmount: "$0",
      pendingBalance: "$0",
      status,
      statusColor,
      sinceDate,
      website: website.trim() || `${name.toLowerCase().replace(/\s+/g, '')}.com`,
      notes: notes.trim(),
    };

    try {
      if (db) {
        await setDoc(doc(db, "v3_clients", String(newId)), newClient);
      }
    } catch (err) {
      console.error("Error saving new client to Firestore:", err);
    } finally {
      setIsSaving(false);
      onClientCreated(newClient);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            playSound("click");
            onClose();
          }}
          className="absolute inset-0 bg-black/80"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden z-10 text-white"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Crear nuevo cliente</h3>
                <p className="text-[11px] text-white/50">Agrega una empresa o cliente a la plataforma</p>
              </div>
            </div>
            <button
              onClick={() => {
                playSound("click");
                onClose();
              }}
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1">
                Nombre de la empresa / Cliente <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Acme Corp, Spotify, Red Bull..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 focus:border-emerald-500/50 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-white/30 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Industria / Sector</label>
                <input
                  type="text"
                  placeholder="Ej. Finanzas, Ecommerce..."
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 focus:border-emerald-500/50 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Estado de cuenta</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-[#262626] border border-white/10 focus:border-emerald-500/50 rounded-xl px-3 py-2 text-xs text-white outline-none"
                >
                  <option value="Activo">Activo</option>
                  <option value="VIP">VIP</option>
                  <option value="Prospecto">Prospecto</option>
                  <option value="Concluido">Concluido</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Contacto Principal</label>
                <input
                  type="text"
                  placeholder="Ej. Maria Lopez / Lead"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 focus:border-emerald-500/50 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="contacto@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 focus:border-emerald-500/50 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Teléfono</label>
                <input
                  type="text"
                  placeholder="+52 55 1234 5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 focus:border-emerald-500/50 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Sitio Web</label>
                <input
                  type="text"
                  placeholder="empresa.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 focus:border-emerald-500/50 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1">Notas / Observaciones</label>
              <textarea
                rows={2}
                placeholder="Detalles clave sobre el cliente..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-white/5 border border-white/10 focus:border-emerald-500/50 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10 mt-4">
              <button
                type="button"
                onClick={() => {
                  playSound("click");
                  onClose();
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:scale-95 transition-all shadow-[0_4px_14px_rgba(16,185,129,0.3)] disabled:opacity-50"
              >
                {isSaving ? "Guardando..." : "Crear cliente"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
