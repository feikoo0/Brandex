"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { NoteSquircleCard } from "./NoteSquircleCard";
import type { NoteDoc } from "@/lib/types";

interface SortableNoteSquircleCardProps {
  note: NoteDoc;
  onSelect: (note: NoteDoc) => void;
  onDelete?: (id: string, e: React.MouseEvent) => void;
  onTogglePin?: (id: string, e: React.MouseEvent) => void;
  onToggleComplete?: (id: string, isCompleted: boolean, e: React.MouseEvent) => void;
  isNightMode?: boolean;
  isActive?: boolean;
  className?: string;
  disabled?: boolean;
  projects?: any[];
}

export function SortableNoteSquircleCard({
  note,
  onSelect,
  onDelete,
  onTogglePin,
  onToggleComplete,
  isNightMode = true,
  isActive = false,
  className = "",
  disabled = false,
  projects,
}: SortableNoteSquircleCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: note.id,
    disabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.25 : 1,
    touchAction: "none",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`touch-none select-none relative ${isDragging ? "z-50" : ""}`}
    >
      <NoteSquircleCard
        note={note}
        onSelect={onSelect}
        onDelete={onDelete}
        onTogglePin={onTogglePin}
        onToggleComplete={onToggleComplete}
        isNightMode={isNightMode}
        isActive={isActive}
        className={className}
        projects={projects}
      />
    </div>
  );
}
