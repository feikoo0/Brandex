"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Task } from "./ProjectDashboard";
import PillPortalDropdown from "./PillPortalDropdown";
import FormatoShape from "./FormatoShape";
import {
  FORMATOS_ESTANDAR,
  FORMATOS_CUSTOM,
  addCustomFormato,
  ProporcionFormat,
  TipoMedioFormat,
} from "../utils/formatos";

export interface FormatSelectorDropdownProps {
  isOpen: boolean;
  isInteractive?: boolean;
  isDimmed?: boolean;
  pillLabel: string;
  pillClassName: string;
  pillStyle?: React.CSSProperties;
  panelBgClass?: string;
  task: Task;
  projectId: string | number;
  updateTaskProperty: (projectId: string | number, taskId: string | number, property: string, value: any) => void;
  onToggle: (e: React.MouseEvent) => void;
  onClose: () => void;
}

export const FormatSelectorDropdown: React.FC<FormatSelectorDropdownProps> = ({
  isOpen,
  isInteractive = true,
  isDimmed = false,
  pillLabel,
  pillClassName,
  pillStyle,
  panelBgClass = "bg-[#0a0a0c]",
  task,
  projectId,
  updateTaskProperty,
  onToggle,
  onClose,
}) => {
  const [showCustomFormatForm, setShowCustomFormatForm] = useState(false);
  const [customFormatNombre, setCustomFormatNombre] = useState("");
  const [customFormatProp, setCustomFormatProp] = useState<ProporcionFormat>("9:16");
  const [customFormatTipo, setCustomFormatTipo] = useState<TipoMedioFormat>("video");

  return (
    <PillPortalDropdown
      isOpen={isOpen}
      isInteractive={isInteractive}
      isDimmed={isDimmed}
      pillLabel={pillLabel}
      pillClassName={pillClassName}
      pillStyle={pillStyle}
      panelBgClass={panelBgClass}
      onToggle={onToggle}
      onClose={onClose}
    >
      <div className="max-h-[75vh] overflow-y-auto custom-scrollbar flex flex-col gap-2 p-1 w-full">
        <div className="text-[10px] font-bold uppercase tracking-wider text-white/50 px-1">Formatos Estándar</div>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.values(FORMATOS_ESTANDAR).map((fmt) => {
            const isSelected =
              (task.formato || "").toLowerCase() === fmt.key ||
              (task.format || "").toLowerCase() === fmt.nombre.toLowerCase();
            return (
              <button
                key={fmt.key}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateTaskProperty(projectId, task.id, "formato", fmt.key);
                  updateTaskProperty(projectId, task.id, "format", fmt.nombre);
                  onClose();
                }}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all border text-left ${
                  isSelected
                    ? "bg-white/20 border-white/40 text-white shadow-sm"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <FormatoShape formatoObj={fmt} size="sm" />
                <span className="truncate">{fmt.nombre}</span>
              </button>
            );
          })}
        </div>

        {Object.values(FORMATOS_CUSTOM).length > 0 && (
          <>
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/50 px-1 mt-1">Personalizados</div>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.values(FORMATOS_CUSTOM).map((fmt) => {
                const isSelected = (task.formato || "").toLowerCase() === fmt.key;
                return (
                  <button
                    key={fmt.key}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateTaskProperty(projectId, task.id, "formato", fmt.key);
                      updateTaskProperty(projectId, task.id, "format", fmt.nombre);
                      onClose();
                    }}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all border text-left ${
                      isSelected
                        ? "bg-white/20 border-white/40 text-white shadow-sm"
                        : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <FormatoShape formatoObj={fmt} size="sm" />
                    <span className="truncate">{fmt.nombre}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Formulario Formato Personalizado */}
        <div className="mt-1 pt-2 border-t border-white/10">
          {!showCustomFormatForm ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowCustomFormatForm(true);
              }}
              className="w-full flex items-center justify-center gap-1 py-1 px-2 text-[11px] font-bold text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors cursor-pointer border-none"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Personalizado</span>
            </button>
          ) : (
            <div className="flex flex-col gap-2 p-1.5 bg-black/40 rounded-lg border border-white/15" onClick={(e) => e.stopPropagation()}>
              <div className="text-[10px] font-bold text-white/80">Nuevo Formato Personalizado</div>
              <input
                type="text"
                placeholder="Nombre (ej. Infografía)"
                value={customFormatNombre}
                onChange={(e) => setCustomFormatNombre(e.target.value)}
                className="bg-black/50 border border-white/20 rounded-md px-2 py-1 text-[11px] text-white focus:outline-none focus:border-sky-400"
              />
              <div className="flex gap-2">
                <div className="flex-1 flex flex-col gap-0.5">
                  <span className="text-[9px] text-white/60">Proporción</span>
                  <select
                    value={customFormatProp}
                    onChange={(e) => setCustomFormatProp(e.target.value as ProporcionFormat)}
                    className="bg-black/50 border border-white/20 rounded-md px-1 py-1 text-[10px] text-white focus:outline-none"
                  >
                    <option value="9:16">9:16 (Vert)</option>
                    <option value="4:5">4:5 (Port)</option>
                    <option value="1:1">1:1 (Cuad)</option>
                    <option value="16:9">16:9 (Horiz)</option>
                  </select>
                </div>
                <div className="flex-1 flex flex-col gap-0.5">
                  <span className="text-[9px] text-white/60">Tipo Medio</span>
                  <select
                    value={customFormatTipo}
                    onChange={(e) => setCustomFormatTipo(e.target.value as TipoMedioFormat)}
                    className="bg-black/50 border border-white/20 rounded-md px-1 py-1 text-[10px] text-white focus:outline-none"
                  >
                    <option value="video">Video</option>
                    <option value="imagen">Imagen</option>
                    <option value="carrusel">Carrusel</option>
                    <option value="texto">Texto</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-1.5 mt-1 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCustomFormatForm(false)}
                  className="px-2 py-0.5 rounded text-[10px] text-white/60 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!customFormatNombre.trim()) return;
                    const created = addCustomFormato(customFormatNombre.trim(), {
                      key: customFormatNombre.trim().toLowerCase(),
                      nombre: customFormatNombre.trim(),
                      proporcion: customFormatProp,
                      tipo_medio: customFormatTipo,
                      icono: "custom",
                    });
                    updateTaskProperty(projectId, task.id, "formato", created.key);
                    updateTaskProperty(projectId, task.id, "format", created.nombre);
                    setCustomFormatNombre("");
                    setShowCustomFormatForm(false);
                    onClose();
                  }}
                  className="px-2.5 py-0.5 rounded bg-sky-500 hover:bg-sky-400 text-[10px] font-bold text-slate-950 shadow"
                >
                  Guardar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PillPortalDropdown>
  );
};

export default FormatSelectorDropdown;
