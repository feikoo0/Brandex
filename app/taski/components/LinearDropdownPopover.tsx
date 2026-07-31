"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Check, Plus } from "lucide-react";
import { playSound } from "../utils/audio";

export interface PopoverOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  color?: string;
  badge?: string;
}

interface LinearDropdownPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  placeholder?: string;
  shortcutKey?: string;
  selectedValue?: string;
  onSelect: (value: string) => void;
  options: PopoverOption[];
  onAddNew?: () => void;
  addNewLabel?: string;
  align?: "left" | "right";
  position?: "bottom" | "top";
}

export default function LinearDropdownPopover({
  isOpen,
  onClose,
  title = "Change option…",
  placeholder = "Filter options…",
  shortcutKey = "S",
  selectedValue,
  onSelect,
  options,
  onAddNew,
  addNewLabel,
  align = "left",
  position = "bottom"
}: LinearDropdownPopoverProps) {
  const [search, setSearch] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setFocusedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % (filteredOptions.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 + filteredOptions.length) % (filteredOptions.length || 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredOptions[focusedIndex]) {
        handleOptionClick(filteredOptions[focusedIndex].id);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (!search && e.key >= "1" && e.key <= "9") {
      const idx = parseInt(e.key, 10) - 1;
      if (options[idx]) {
        e.preventDefault();
        handleOptionClick(options[idx].id);
      }
    }
  };

  const handleOptionClick = (id: string) => {
    playSound("click");
    onSelect(id);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={popoverRef}
        initial={{ opacity: 0, scale: 0.96, y: position === "top" ? 4 : -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: position === "top" ? 4 : -4 }}
        transition={{ duration: 0.12, ease: "easeOut" }}
        className={`absolute z-[600] min-w-[210px] w-64 bg-[#18181c] border border-[#2b2b32] shadow-2xl rounded-xl overflow-hidden text-xs text-[#f4f4f5] select-none ${
          position === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5"
        } ${
          align === "right" ? "right-0" : "left-0"
        }`}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="p-2 border-b border-[#24242a] bg-[#141416] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-3.5 h-3.5 text-[#686873] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setFocusedIndex(0);
              }}
              className="w-full bg-transparent border-none outline-none ring-0 focus:outline-none focus:ring-0 focus:border-none focus-visible:outline-none focus-visible:ring-0 shadow-none focus:shadow-none text-xs text-[#f4f4f5] placeholder-[#555560] p-0"
            />
          </div>
          {shortcutKey && (
            <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono text-[#71717a] bg-[#222226] border border-[#2b2b32]">
              {shortcutKey}
            </kbd>
          )}
        </div>

        {/* Options List */}
        <div className="max-h-56 overflow-y-auto custom-scrollbar p-1 space-y-0.5">
          {filteredOptions.map((opt, idx) => {
            const isSelected = selectedValue === opt.id || selectedValue === opt.label;
            const isFocused = focusedIndex === idx;

            return (
              <div
                key={opt.id}
                onClick={() => handleOptionClick(opt.id)}
                onMouseEnter={() => setFocusedIndex(idx)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                  isFocused ? "bg-[#24242c] text-white" : "text-[#a1a1aa] hover:text-white hover:bg-[#1f1f24]"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {opt.icon && <span className="shrink-0 flex items-center">{opt.icon}</span>}
                  <span className={`truncate text-xs ${isSelected ? "font-bold text-white" : "font-medium"}`}>
                    {opt.label}
                  </span>
                  {opt.badge && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-[#2a2a34] text-[#a1a1aa]">
                      {opt.badge}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  {opt.shortcut && (
                    <kbd className="px-1 py-0.2 rounded text-[9px] font-mono text-[#686873] bg-[#222226]">
                      {opt.shortcut}
                    </kbd>
                  )}
                </div>
              </div>
            );
          })}

          {filteredOptions.length === 0 && (
            <div className="p-3 text-center text-xs text-[#686873]">
              No results found
            </div>
          )}
        </div>

        {/* Add New Footer Button (Optional) */}
        {onAddNew && (
          <div className="p-1 border-t border-[#24242a] bg-[#141416]">
            <button
              type="button"
              onClick={() => {
                playSound("click");
                onAddNew();
                onClose();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-400 hover:bg-[#1f2722] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{addNewLabel || "Create new"}</span>
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
