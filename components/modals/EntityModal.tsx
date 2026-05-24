"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  EntityModal — Overlay que abre modales como panel lateral derecho
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useUIStore, useAuthStore } from "@/lib/store";
import { TaskModal }    from "./TaskModal";
import { ProjectModal } from "./ProjectModal";
import { ClientDetail } from "./ClientDetail";
import { WorkerDetail } from "./WorkerDetail";
import type { ModalEntry } from "@/lib/types";

export function EntityModal() {
  const parallelModals = useUIStore((s) => s.parallelModals);
  const closeModal     = useUIStore((s) => s.closeModal);
  const openModal      = useUIStore((s) => s.openModal);
  const role           = useAuthStore((s) => s.role);
  const isAdmin        = role === "admin";

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (parallelModals.length > 0) {
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
    }
  }, [parallelModals]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parallelModals]);

  if (parallelModals.length === 0) return null;

  function handleClose() {
    setVisible(false);
    setTimeout(closeModal, 220);
  }

  function handleOpenRelated(entry: ModalEntry) {
    openModal(entry);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position:             "fixed",
          inset:                0,
          zIndex:               960,
          background:           `rgba(0,0,0,${visible ? 0.4 : 0})`,
          backdropFilter:       visible ? "blur(4px)" : "blur(0px)",
          WebkitBackdropFilter: visible ? "blur(4px)" : "blur(0px)",
          transition:           "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className="dark:bg-black/40 bg-gray-900/20"
      />

      {/* Right-aligned flex container */}
      <div
        style={{
          position:        "fixed",
          inset:           0,
          zIndex:          970,
          display:         "flex",
          justifyContent:  "flex-end", // Align to right
          alignItems:      "stretch",  // Full height
          pointerEvents:   "none",
          overflowX:       "hidden",
        }}
      >
        {parallelModals.map((modal, i) => {
          // Calculate offset so multiple panels stack cleanly
          const isLast = i === parallelModals.length - 1;
          const offsetRight = isLast ? 0 : (parallelModals.length - 1 - i) * 40;

          return (
            <div
              key={`${modal.type}-${modal.id}-${i}`}
              style={{
                width:           modal.type === "proyecto" ? "80vw" : "600px",
                maxWidth:        modal.type === "proyecto" ? "1200px" : "100vw",
                flexShrink:      0,
                position:        "absolute",
                right:           offsetRight,
                top:             0,
                bottom:          0,
                transform:       `translateX(${visible ? 0 : 100}%)`,
                opacity:         visible ? 1 : 0,
                transition:      `transform 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.05}s, opacity 0.3s ease ${i * 0.05}s`,
                pointerEvents:   "auto",
                boxShadow:       "-10px 0 40px rgba(0,0,0,0.2)",
              }}
              className="dark:bg-[#0a0a0c] bg-white border-l dark:border-white/10 border-black/10"
            >
              {modal.type === "task" && (
                <TaskModal
                  taskId={modal.id}
                  parentId={modal.parentId}
                  isAdmin={isAdmin}
                  onClose={() => {
                    const state = useUIStore.getState();
                    if (state.parallelModals.length > 1) {
                      state.closeParallelModal(modal);
                    } else {
                      handleClose();
                    }
                  }}
                  openRelated={handleOpenRelated}
                />
              )}
              {modal.type === "proyecto" && (
                <ProjectModal
                  projectId={modal.id}
                  isAdmin={isAdmin}
                  onClose={() => {
                    const state = useUIStore.getState();
                    if (state.parallelModals.length > 1) {
                      state.closeParallelModal(modal);
                    } else {
                      handleClose();
                    }
                  }}
                  openRelated={handleOpenRelated}
                />
              )}
              {modal.type === "client" && (
                <ClientDetail
                  id={modal.id}
                  isAdmin={isAdmin}
                  onClose={() => {
                    const state = useUIStore.getState();
                    if (state.parallelModals.length > 1) {
                      state.closeParallelModal(modal);
                    } else {
                      handleClose();
                    }
                  }}
                  openRelated={handleOpenRelated}
                />
              )}
              {modal.type === "worker" && (
                <WorkerDetail
                  id={modal.id}
                  isAdmin={isAdmin}
                  onClose={() => {
                    const state = useUIStore.getState();
                    if (state.parallelModals.length > 1) {
                      state.closeParallelModal(modal);
                    } else {
                      handleClose();
                    }
                  }}
                  openRelated={handleOpenRelated}
                />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
