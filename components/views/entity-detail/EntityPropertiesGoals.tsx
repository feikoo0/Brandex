"use client";

import React, { useState } from "react";
import { 
  FileText, 
  Calendar, 
  Sparkles, 
  Tag, 
  Target, 
  Edit3, 
  Check, 
  X, 
  Plus, 
  CheckSquare, 
  Square 
} from "lucide-react";
import type { Client, Member } from "@/lib/types";
import { playSound } from "@/app/taski/utils/audio";

interface EntityPropertiesGoalsProps {
  entity: Client | Member;
  type: "client" | "member" | "user";
  onUpdateEntity: (updated: Partial<Client | Member>) => Promise<void> | void;
  className?: string;
}

export function EntityPropertiesGoals({
  entity,
  type,
  onUpdateEntity,
  className = "",
}: EntityPropertiesGoalsProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState(entity.notas_internas || (entity as any).notes || "");
  const [newSkill, setNewSkill] = useState("");
  const [isAddingSkill, setIsAddingSkill] = useState(false);

  const skillsList = (entity as Member).skills || [];
  const sinceDate = (entity as Client).sinceDate || (entity as Client).fecha_inicio || "Ene 2024";

  const handleSaveNotes = async () => {
    await onUpdateEntity({
      notas_internas: notes,
      notes: notes,
    } as any);
    setIsEditingNotes(false);
    playSound('pop');
  };

  const handleAddSkill = async () => {
    if (!newSkill.trim()) return;
    const current = (entity as Member).skills || [];
    const updated = [...current, newSkill.trim()];
    await onUpdateEntity({ skills: updated } as any);
    setNewSkill("");
    setIsAddingSkill(false);
    playSound('pop');
  };

  const handleRemoveSkill = async (skillToRemove: string) => {
    const current = (entity as Member).skills || [];
    const updated = current.filter((s) => s !== skillToRemove);
    await onUpdateEntity({ skills: updated } as any);
    playSound('trash');
  };

  return (
    <div className={`flex flex-col justify-between p-5 rounded-[24px] bg-[#181818] border border-white/10 shadow-xl text-[#ffffffd6] h-full ${className}`}>
      <div className="flex flex-col gap-4">
        {/* Header: Dates & Properties */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-[#ffffff6b]">
              {type === "client" ? "Cliente desde:" : "Ingreso al equipo:"}
            </span>
            <strong className="text-xs font-semibold text-[#ffffffd6]">{sinceDate}</strong>
          </div>

          <span className="text-[11px] font-bold uppercase tracking-wider text-[#ffffff40]">
            Propiedades & Metas
          </span>
        </div>

        {/* Skills / Tags Section (For Members or Clients) */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#ffffff6b]">
              {type === "client" ? "Categorías de Servicio" : "Especialidades & Skills"}
            </span>
            {!isAddingSkill && (
              <button
                type="button"
                onClick={() => setIsAddingSkill(true)}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
              >
                <Plus className="w-3 h-3" />
                <span>Agregar</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 items-center">
            {skillsList.map((skill) => (
              <span
                key={skill}
                className="group inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[#ffffffd6] transition-colors"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  className="opacity-40 group-hover:opacity-100 hover:text-rose-400 transition-opacity ml-0.5"
                  title="Eliminar skill"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {isAddingSkill && (
              <div className="inline-flex items-center gap-1">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Nueva skill..."
                  className="px-2 py-0.5 text-xs rounded-lg bg-[#222222] border border-white/20 text-[#ffffffd6] outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddSkill();
                    if (e.key === "Escape") setIsAddingSkill(false);
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="p-1 rounded bg-blue-600 text-white text-xs"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingSkill(false)}
                  className="p-1 rounded bg-white/10 text-white/60 text-xs"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Internal Notes Section (Safe explicit edit) */}
        <div className="flex flex-col gap-2 mt-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#ffffff6b]">
              Notas Internas (Admin Only)
            </span>
            <button
              type="button"
              onClick={() => {
                if (isEditingNotes) {
                  setIsEditingNotes(false);
                } else {
                  setIsEditingNotes(true);
                }
              }}
              className="text-[#ffffff6b] hover:text-[#ffffffd6] p-1 rounded-lg hover:bg-white/5 transition-colors"
              title="Editar notas"
            >
              {isEditingNotes ? <X className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
            </button>
          </div>

          {isEditingNotes ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Escribe notas internas confidenciales..."
                rows={3}
                className="w-full p-2.5 rounded-xl bg-[#222222] border border-white/15 text-xs text-[#ffffffd6] placeholder:text-[#ffffff40] outline-none focus:border-white/30 resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingNotes(false)}
                  className="px-3 py-1 rounded-lg text-xs bg-white/5 text-[#ffffff6b] hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="px-3 py-1 rounded-lg text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Guardar Notas</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-white/[0.025] border border-white/5 text-xs text-[#ffffffd6]/80 leading-relaxed min-h-[60px]">
              {notes ? notes : <span className="text-[#ffffff40] italic">Sin notas registradas.</span>}
            </div>
          )}
        </div>
      </div>

      {/* Target Objectives Pill */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-[#ffffff6b]">
        <div className="flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-emerald-400" />
          <span>Objetivo Q3: 100% entregas a tiempo</span>
        </div>
        <span className="text-emerald-400 font-semibold">En progreso</span>
      </div>
    </div>
  );
}
