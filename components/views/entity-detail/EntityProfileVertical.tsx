"use client";

import React, { useState } from "react";
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  MessageSquare, 
  ExternalLink, 
  ChevronLeft, 
  Edit3, 
  Check, 
  X,
  Share2,
  Calendar,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DriveButton } from "@/components/common/DriveButton";
import type { Client, Member, DriveLink } from "@/lib/types";
import { playSound } from "@/app/taski/utils/audio";
import { PROJECT_COLOR_PALETTE, getSingleSourceColor, getSingleSourceClientColor, cn } from "@/lib/utils";

interface EntityProfileVerticalProps {
  entity: Client | Member;
  type: "client" | "member" | "user";
  onBack: () => void;
  onUpdateEntity: (updated: Partial<Client | Member>) => Promise<void> | void;
  className?: string;
}

export function EntityProfileVertical({
  entity,
  type,
  onBack,
  onUpdateEntity,
  className = "",
}: EntityProfileVerticalProps) {
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [phone, setPhone] = useState(
    (entity as Client).contacto?.telefono || (entity as Client).tel || (entity as Member).telefono || ""
  );
  const [email, setEmail] = useState(entity.email || (entity as Client).contacto?.email || "");
  const [whatsapp, setWhatsapp] = useState((entity as Client).contacto?.whatsapp || "");
  const [status, setStatus] = useState(entity.status || (type === "client" ? "Activo" : "Disponible"));
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  const entityColor = getSingleSourceColor(entity).hslCss;

  const clientStatuses = ["VIP", "Activo", "Pausa", "Prospecto", "Cerrado"];
  const memberStatuses = ["Disponible", "En Proyecto", "Carga Máxima", "Vacaciones"];
  const availableStatuses = type === "client" ? clientStatuses : memberStatuses;

  const handleSaveContact = async () => {
    if (type === "client") {
      await onUpdateEntity({
        email,
        tel: phone,
        contacto: {
          persona: (entity as Client).contacto?.persona || (entity as Client).contactPerson || "",
          telefono: phone,
          email,
          whatsapp,
        },
      } as Partial<Client>);
    } else {
      await onUpdateEntity({
        email,
        telefono: phone,
      } as Partial<Member>);
    }
    setIsEditingContact(false);
    playSound('pop');
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus);
    setIsChangingStatus(false);
    await onUpdateEntity({
      status: newStatus,
      disponibilidad: newStatus,
      estado_relacion: newStatus.toLowerCase() as any,
    });
    playSound('click');
  };

  const handleAddDriveLink = async (link: { label: string; url: string }) => {
    const newId = "dl-" + Date.now();
    const currentLinks = entity.drive_links || [];
    const updated = [...currentLinks, { id: newId, ...link }];
    await onUpdateEntity({ drive_links: updated });
    playSound('pop');
  };

  const handleUpdateDriveLink = async (id: string, updatedLink: { label: string; url: string }) => {
    const currentLinks = entity.drive_links || [];
    const updated = currentLinks.map((l) => (l.id === id ? { ...l, ...updatedLink } : l));
    await onUpdateEntity({ drive_links: updated });
    playSound('click');
  };

  const handleDeleteDriveLink = async (id: string) => {
    const currentLinks = entity.drive_links || [];
    const updated = currentLinks.filter((l) => l.id !== id);
    await onUpdateEntity({ drive_links: updated });
    playSound('trash');
  };

  return (
    <div className={`flex flex-col justify-between p-6 rounded-[28px] bg-[#1f1f1f] border border-white/10 shadow-2xl relative overflow-hidden text-[#ffffffd6] h-full ${className}`}>
      {/* Visual Accent */}
      <div className="absolute top-0 left-0 w-48 h-48 bg-blue-500/[0.04] rounded-full blur-3xl pointer-events-none -ml-20 -mt-20" />

      <div>
        {/* Back Button & Top Action */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#ffffff6b] hover:text-[#ffffffd6] border border-white/10 transition-all select-none"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Volver</span>
          </button>

          {/* Status Dropdown Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsChangingStatus((prev) => !prev)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer select-none ${
                status.toLowerCase().includes("vip") || status.toLowerCase().includes("alianza")
                  ? "bg-purple-500/20 text-purple-400 border-purple-500/40"
                  : status.toLowerCase().includes("activo") || status.toLowerCase().includes("disponible")
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                  : status.toLowerCase().includes("pausa") || status.toLowerCase().includes("en proyecto")
                  ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/40"
                  : "bg-rose-500/20 text-rose-400 border-rose-500/40"
              }`}
            >
              {status}
            </button>

            {isChangingStatus && (
              <div className="absolute right-0 top-full mt-2 z-50 min-w-[140px] p-1.5 rounded-2xl bg-[#181818] border border-white/15 shadow-2xl flex flex-col gap-1">
                {availableStatuses.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleStatusChange(st)}
                    className="px-3 py-1.5 text-xs rounded-xl text-left text-[#ffffffd6] hover:bg-white/10 transition-colors"
                  >
                    {st}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Avatar & Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div
            className="w-20 h-20 rounded-3xl border border-white/15 shadow-xl flex items-center justify-center mb-3 overflow-hidden text-2xl font-black text-white"
            style={{ backgroundColor: entityColor || "#282828" }}
          >
            {(entity as Member).avatar && (entity as Member).avatar!.length <= 3 ? (
              <span>{(entity as Member).avatar}</span>
            ) : (entity as Client).logo && (entity as Client).logo!.length <= 3 ? (
              <span>{(entity as Client).logo}</span>
            ) : type === "client" ? (
              <span>{(entity.nombre || "C").slice(0, 1).toUpperCase()}</span>
            ) : (
              <span>{(entity.nombre || "M").slice(0, 2).toUpperCase()}</span>
            )}
          </div>

          <h2 className="text-xl font-bold text-[#ffffffd6] tracking-tight">
            {entity.nombre || (entity as any).name}
          </h2>

          <p className="text-xs text-[#ffffff6b] mt-0.5">
            {type === "client" 
              ? ((entity as Client).industria || (entity as Client).industry || "Cliente Asociado")
              : ((entity as Member).rol || (entity as Member).role || "Especialista")}
          </p>

          {type === "client" && (entity as Client).plan_contratado && (
            <span className="mt-2.5 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Plan {(entity as Client).plan_contratado}
            </span>
          )}

          {type === "member" && (entity as Member).specialty && (
            <span className="mt-2.5 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/10 text-white/80 border border-white/10">
              {(entity as Member).specialty}
            </span>
          )}
        </div>

        {/* Color de Marca / Color de Perfil Selector */}
        <div className="p-4 rounded-2xl bg-[#181818] border border-white/10 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#ffffff6b]">
              {type === "client" ? "Color de Marca" : "Color del Colaborador"}
            </span>
            <span className="text-[11px] font-medium text-white/60">
              {entity.colorName || "Predeterminado"}
            </span>
          </div>
          <div className="flex items-center flex-wrap gap-2">
            {PROJECT_COLOR_PALETTE.map((preset) => {
              const currentHsl = getSingleSourceColor(entity).hslCss;
              const isSelected =
                entity.color === preset.hslStr ||
                entity.colorName === preset.name ||
                currentHsl === preset.hslStr;

              return (
                <button
                  key={preset.name}
                  type="button"
                  title={preset.name}
                  onClick={async () => {
                    playSound("click");
                    await onUpdateEntity({
                      color: preset.hslStr,
                      colorName: preset.name,
                    } as any);
                  }}
                  className={cn(
                    "w-5 h-5 rounded-full bg-gradient-to-br transition-all cursor-pointer border",
                    preset.gradient,
                    isSelected
                      ? "border-white scale-125 shadow-md ring-2 ring-white/30"
                      : "border-transparent opacity-60 hover:opacity-100 hover:scale-110"
                  )}
                />
              );
            })}
          </div>
        </div>

        {/* Contact Info Section */}
        <div className="p-4 rounded-2xl bg-[#181818] border border-white/10 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#ffffff6b]">
              Datos de Contacto
            </span>
            <button
              type="button"
              onClick={() => setIsEditingContact((prev) => !prev)}
              className="text-[#ffffff6b] hover:text-[#ffffffd6] p-1 rounded-lg hover:bg-white/5 transition-colors"
              title="Editar contacto"
            >
              {isEditingContact ? <X className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
            </button>
          </div>

          {isEditingContact ? (
            <div className="flex flex-col gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Correo electrónico"
                className="px-3 py-1.5 text-xs rounded-xl bg-[#222222] border border-white/10 text-[#ffffffd6] placeholder:text-[#ffffff40] outline-none"
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Teléfono"
                className="px-3 py-1.5 text-xs rounded-xl bg-[#222222] border border-white/10 text-[#ffffffd6] placeholder:text-[#ffffff40] outline-none"
              />
              {type === "client" && (
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="WhatsApp"
                  className="px-3 py-1.5 text-xs rounded-xl bg-[#222222] border border-white/10 text-[#ffffffd6] placeholder:text-[#ffffff40] outline-none"
                />
              )}
              <button
                type="button"
                onClick={handleSaveContact}
                className="mt-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Guardar</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 text-xs text-[#ffffffd6]">
              {email && (
                <div className="flex items-center gap-2.5">
                  <Mail className="w-3.5 h-3.5 text-[#ffffff6b] shrink-0" />
                  <a href={`mailto:${email}`} className="truncate hover:text-blue-400 transition-colors">
                    {email}
                  </a>
                </div>
              )}
              {phone && (
                <div className="flex items-center gap-2.5">
                  <Phone className="w-3.5 h-3.5 text-[#ffffff6b] shrink-0" />
                  <a href={`tel:${phone}`} className="truncate hover:text-blue-400 transition-colors">
                    {phone}
                  </a>
                </div>
              )}
              {whatsapp && (
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <a
                    href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate hover:text-emerald-400 transition-colors"
                  >
                    WhatsApp Chat
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Google Drive Links Section */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#ffffff6b]">
            Carpetas & Recursos de Drive
          </span>
          <DriveButton
            links={entity.drive_links || []}
            onAddLink={handleAddDriveLink}
            onUpdateLink={handleUpdateDriveLink}
            onDeleteLink={handleDeleteDriveLink}
          />
        </div>
      </div>

      {/* Footer Meta */}
      <div className="pt-4 border-t border-white/5 text-[11px] text-[#ffffff6b] flex items-center justify-between mt-6">
        <span>ID: {entity.id}</span>
        <span>BrandexOS v3</span>
      </div>
    </div>
  );
}
