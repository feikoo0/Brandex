"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  QuickCreate — Picker de tipo (tarea vs proyecto)
//
//  Cuando el usuario elige, cierra el picker y abre el modal correspondiente
//  en modo "new" (crear).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { X, Layers, CheckSquare } from "lucide-react";
import { useUIStore } from "@/lib/store";

export function QuickCreate() {
  const qcOpen   = useUIStore((s) => s.qcOpen);
  const closeQC  = useUIStore((s) => s.closeQC);
  const openModal = useUIStore((s) => s.openModal);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (qcOpen) requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    else setVisible(false);
  }, [qcOpen]);

  function handleClose() {
    setVisible(false);
    setTimeout(closeQC, 200);
  }

  function handleSelect(type: "task" | "proyecto") {
    setVisible(false);
    // Small delay so the picker closes before the new modal opens
    setTimeout(() => {
      closeQC();
      openModal({ type, id: "new" });
    }, 160);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!qcOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: "fixed", inset: 0, zIndex: 940,
          background: `rgba(0,0,0,${visible ? 0.6 : 0})`,
          backdropFilter: visible ? "blur(10px)" : "blur(0px)",
          WebkitBackdropFilter: visible ? "blur(10px)" : "blur(0px)",
          transition: "all 0.22s ease",
        }}
      />

      {/* Picker card */}
      <div
        style={{
          position: "fixed", left: "50%", top: "50%", zIndex: 950,
          width: "calc(100% - 32px)", maxWidth: 380,
          transform: `translate(-50%,-50%) scale(${visible ? 1 : 0.86})`,
          opacity: visible ? 1 : 0,
          transition: "transform 0.26s cubic-bezier(0.34,1.46,0.64,1), opacity 0.18s ease",
          transformOrigin: "top right",
        }}
      >
        <div style={{ background:"rgba(16,16,20,.98)", border:"1px solid rgba(255,255,255,.1)", borderRadius:28, boxShadow:"0 40px 100px rgba(0,0,0,.8)", overflow:"hidden" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 18px 12px" }}>
            <span style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", color:"var(--txt3)" }}>
              ¿Qué quieres crear?
            </span>
            <button onClick={handleClose}
              style={{ display:"flex", alignItems:"center", justifyContent:"center", width:28, height:28, borderRadius:9, background:"rgba(255,255,255,.07)", border:"none", color:"var(--txt3)", cursor:"pointer" }}>
              <X style={{ width:13, height:13 }} />
            </button>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, padding:"0 16px 20px" }}>
            <PickerCard
              icon={<CheckSquare style={{ width:22, height:22, color:"#6aafff" }} />}
              label="Nueva Tarea"
              sub="Entregable, diseño, copy..."
              color="#3a7bd5"
              onClick={() => handleSelect("task")}
            />
            <PickerCard
              icon={<Layers style={{ width:22, height:22, color:"#bf5af2" }} />}
              label="Nuevo Proyecto"
              sub="Campaña, branding, web..."
              color="#7c3aed"
              onClick={() => handleSelect("proyecto")}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function PickerCard({ icon, label, sub, color, onClick }: {
  icon:    React.ReactNode;
  label:   string;
  sub:     string;
  color:   string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{ display:"flex", flexDirection:"column", alignItems:"flex-start", gap:10, padding:"16px 14px", borderRadius:18, background:`${color}14`, border:`1px solid ${color}28`, cursor:"pointer", textAlign:"left", transition:"all .14s ease" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = `${color}22`; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = `${color}14`; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}
    >
      <div style={{ width:40, height:40, borderRadius:13, background:`${color}22`, display:"flex", alignItems:"center", justifyContent:"center" }}>{icon}</div>
      <div>
        <div style={{ fontSize:13, fontWeight:700, color:"var(--txt)", marginBottom:2 }}>{label}</div>
        <div style={{ fontSize:11, color:"var(--txt3)" }}>{sub}</div>
      </div>
    </button>
  );
}
