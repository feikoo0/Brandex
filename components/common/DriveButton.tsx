"use client";

import React, { useState, useRef, useEffect } from "react";
import { Link2, MoreVertical, ExternalLink, Plus, Edit2, Trash2, Check, X, FolderGit2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface DriveLinkItem {
  id: string;
  label: string;
  url: string;
}

interface DriveButtonProps {
  links: DriveLinkItem[];
  onAddLink?: (link: { label: string; url: string }) => Promise<void> | void;
  onUpdateLink?: (id: string, updated: { label: string; url: string }) => Promise<void> | void;
  onDeleteLink?: (id: string) => Promise<void> | void;
  readOnly?: boolean;
  className?: string;
}

export function DriveButton({
  links = [],
  onAddLink,
  onUpdateLink,
  onDeleteLink,
  readOnly = false,
  className = "",
}: DriveButtonProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
        setIsDeletingId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleStartEdit = (link: DriveLinkItem) => {
    setEditingLinkId(link.id);
    setEditLabel(link.label);
    setEditUrl(link.url);
    setActiveMenuId(null);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editLabel.trim() || !editUrl.trim()) return;
    if (onUpdateLink) {
      let formattedUrl = editUrl.trim();
      if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
        formattedUrl = `https://${formattedUrl}`;
      }
      await onUpdateLink(id, { label: editLabel.trim(), url: formattedUrl });
    }
    setEditingLinkId(null);
  };

  const handleCreateNew = async () => {
    if (!newLabel.trim() || !newUrl.trim()) return;
    if (onAddLink) {
      let formattedUrl = newUrl.trim();
      if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
        formattedUrl = `https://${formattedUrl}`;
      }
      await onAddLink({ label: newLabel.trim(), url: formattedUrl });
    }
    setNewLabel("");
    setNewUrl("");
    setIsAddingNew(false);
  };

  const handleDelete = async (id: string) => {
    if (onDeleteLink) {
      await onDeleteLink(id);
    }
    setIsDeletingId(null);
    setActiveMenuId(null);
  };

  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      {/* List of Drive Buttons */}
      <div className="flex flex-wrap gap-2 items-center">
        {links.map((link) => {
          const isEditing = editingLinkId === link.id;
          const isMenuOpen = activeMenuId === link.id;

          if (isEditing) {
            return (
              <div
                key={link.id}
                className="flex items-center gap-2 p-2 rounded-xl bg-[#181818] border border-white/20 w-full max-w-sm"
              >
                <div className="flex-1 flex flex-col gap-1">
                  <input
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    placeholder="Nombre del link (ej. Assets de Marca)"
                    className="px-2.5 py-1 text-xs rounded-lg bg-[#222222] border border-white/10 text-[#ffffffd6] placeholder:text-[#ffffff40] outline-none focus:border-white/30"
                    autoFocus
                  />
                  <input
                    type="url"
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    placeholder="URL de Google Drive"
                    className="px-2.5 py-1 text-xs rounded-lg bg-[#222222] border border-white/10 text-[#ffffffd6] placeholder:text-[#ffffff40] outline-none focus:border-white/30"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(link.id)}
                    className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-colors"
                    title="Guardar cambios"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingLinkId(null)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#ffffff6b] border border-white/10 transition-colors"
                    title="Cancelar"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={link.id}
              className="relative inline-flex items-center group rounded-xl bg-[#222222] hover:bg-[#282828] border border-white/10 hover:border-white/20 transition-all duration-200 shadow-sm"
            >
              {/* Main Button (Opens Google Drive) */}
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 pl-3 pr-2 py-2 text-xs font-medium text-[#ffffffd6] hover:text-white transition-colors"
                title={`Abrir ${link.label} en Google Drive`}
              >
                <FolderGit2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate max-w-[140px] sm:max-w-[180px]">{link.label}</span>
                <ExternalLink className="w-3 h-3 text-[#ffffff40] group-hover:text-[#ffffff6b] transition-colors" />
              </a>

              {/* Context Menu Button */}
              {!readOnly && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(isMenuOpen ? null : link.id);
                    setIsDeletingId(null);
                  }}
                  className="p-2 text-[#ffffff6b] hover:text-[#ffffffd6] hover:bg-white/5 rounded-r-xl transition-colors border-l border-white/5"
                  title="Opciones de link"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Dropdown Popover */}
              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div
                    ref={menuRef}
                    initial={{ opacity: 0, scale: 0.95, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1 z-50 min-w-[170px] p-1.5 rounded-2xl bg-[#181818] border border-white/15 shadow-2xl shadow-black/80 flex flex-col gap-0.5"
                  >
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-[#ffffffd6] hover:bg-white/10 transition-colors"
                      onClick={() => setActiveMenuId(null)}
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#ffffff6b]" />
                      <span>Abrir carpeta</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => handleStartEdit(link)}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-[#ffffffd6] hover:bg-white/10 transition-colors text-left w-full"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#ffffff6b]" />
                      <span>Cambiar link</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNew(true);
                        setActiveMenuId(null);
                      }}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-[#ffffffd6] hover:bg-white/10 transition-colors text-left w-full"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-400" />
                      <span>Agregar otro link</span>
                    </button>

                    <div className="h-px bg-white/10 my-1" />

                    {isDeletingId === link.id ? (
                      <div className="flex items-center justify-between px-2 py-1 bg-rose-500/10 rounded-xl border border-rose-500/30">
                        <span className="text-[11px] font-bold text-rose-400">¿Eliminar?</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDelete(link.id)}
                            className="px-1.5 py-0.5 rounded bg-rose-500 text-white text-[10px] font-bold hover:bg-rose-600 transition-colors"
                          >
                            Sí
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsDeletingId(null)}
                            className="px-1.5 py-0.5 rounded bg-white/10 text-white/70 text-[10px] hover:bg-white/20 transition-colors"
                          >
                            No
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsDeletingId(link.id)}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition-colors text-left w-full"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>Eliminar</span>
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Add Link Button (When not adding) */}
        {!readOnly && !isAddingNew && (
          <button
            type="button"
            onClick={() => setIsAddingNew(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-dashed border-white/15 hover:border-white/30 text-xs font-medium text-[#ffffff6b] hover:text-[#ffffffd6] transition-all duration-200 select-none"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" />
            <span>{links.length === 0 ? "Vincular Google Drive" : "Agregar link"}</span>
          </button>
        )}
      </div>

      {/* Inline Form to Add New Link */}
      <AnimatePresence>
        {isAddingNew && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 rounded-2xl bg-[#181818] border border-white/15 flex flex-col gap-2 max-w-sm mt-1 shadow-xl"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#ffffff6b]">
              Nuevo enlace de Google Drive
            </span>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Etiqueta (ej. Brief, Contrato, Assets)"
              className="px-3 py-1.5 text-xs rounded-xl bg-[#222222] border border-white/10 text-[#ffffffd6] placeholder:text-[#ffffff40] outline-none focus:border-white/30"
              autoFocus
            />
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              className="px-3 py-1.5 text-xs rounded-xl bg-[#222222] border border-white/10 text-[#ffffffd6] placeholder:text-[#ffffff40] outline-none focus:border-white/30"
            />
            <div className="flex items-center justify-end gap-2 mt-1">
              <button
                type="button"
                onClick={() => {
                  setIsAddingNew(false);
                  setNewLabel("");
                  setNewUrl("");
                }}
                className="px-3 py-1 text-xs rounded-xl bg-white/5 hover:bg-white/10 text-[#ffffff6b] hover:text-[#ffffffd6] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateNew}
                disabled={!newLabel.trim() || !newUrl.trim()}
                className="px-3 py-1 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
