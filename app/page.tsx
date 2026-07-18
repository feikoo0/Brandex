"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Users, UserCircle, ShieldCheck, KeyRound, ArrowRight, ChevronLeft } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { login, loginWithToken } from "@/lib/api";
import type { Role } from "@/lib/types";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useData } from "@/hooks/useData";

export default function LoginPage() {
  const router  = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  
  // Fetch data for demo selectors
  const { data } = useData();

  // States
  const [token,    setToken]    = useState("");
  const [usuario,  setUsuario]  = useState("");
  const [password, setPassword] = useState("");
  const [isTokenMode, setIsTokenMode] = useState(true);
  
  const [loading,  setLoading]  = useState(false);
  const [demoLoading, setDemoLoading] = useState<Role | null>(null);
  const [demoSelector, setDemoSelector] = useState<"diseno" | "cliente" | null>(null);
  const [error,    setError]    = useState<string | null>(null);

  // ── Unified navigation helper ─────────────────────────────────────────────
  const navigateByRole = (role: Role, id: string, nombre: string, userToken: string) => {
    setAuth(role, id, nombre, userToken);
    const dest: Record<Role, string> = {
      admin:   "/admin",
      diseno:  "/equipo",
      cliente: "/cliente",
    };
    router.push(dest[role] ?? "/admin");
  };

  // ── Token Login ───────────────────────────────────────────────────────────
  async function handleTokenSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const data = await loginWithToken(token.trim());
      if (data.ok && data.role) {
        navigateByRole(data.role as Role, data.id || "", data.nombre || "Usuario", token.trim());
      } else {
        setError(data.error ?? "Token no válido o no encontrado");
      }
    } catch (err: any) {
      setError(err.message || "Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }

  // ── Admin (User/Pass) Login ───────────────────────────────────────────────
  async function handleAdminSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!usuario.trim() || !password.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const data = await login(usuario.trim(), password.trim());
      if (data.ok && data.role) {
        navigateByRole(data.role as Role, data.id || "admin", data.nombre || usuario, data.token || "");
      } else {
        setError(data.error ?? "Credenciales incorrectas");
      }
    } catch (err: any) {
      setError(err.message || "No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }

  // ── Demo access ───────────────────────────────────────────────────────────
  function handleDemoAccess(role: Role, id: string, name: string) {
    setDemoLoading(role);
    // Para el demo usamos el id original como token falso para simular login
    navigateByRole(role, id, name, `demo-${id}`);
  }

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,.05)",
    border: "1.5px solid rgba(255,255,255,.08)",
    color: "#fff",
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 20 } }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c] overflow-hidden">
      {/* Background glow */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5 }}
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(circle at 50% 0%, rgba(58,123,213,.15) 0%, transparent 70%)" }}
      />

      <motion.div 
        variants={containerVariants} initial="hidden" animate="show"
        className="relative w-full max-w-sm px-6"
      >
        {/* Logo */}
        <motion.div variants={itemVariants} className="flex flex-col items-center mb-10">
          <Image src="/taski-logo.png" alt="Logo" width={100} height={100} className="drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]" />
        </motion.div>

        <AnimatePresence mode="wait">
          {demoSelector ? (
            <motion.div key="demo-selector" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#121216] border border-white/10 rounded-2xl p-4 max-h-[300px] flex flex-col">
              <div className="flex items-center mb-4">
                <button onClick={() => setDemoSelector(null)} className="text-white/40 hover:text-white transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="flex-1 text-center text-xs font-bold uppercase tracking-widest text-white/60">
                  Seleccionar {demoSelector === "cliente" ? "Cliente" : "Miembro"}
                </span>
                <div className="w-5" />
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-2" style={{ scrollbarWidth: "thin" }}>
                {!data ? (
                  <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
                ) : demoSelector === "cliente" ? (
                  data.clientes.map(c => (
                    <button key={c.id} onClick={() => handleDemoAccess("cliente", c.id, c.nombre)} className="w-full text-left p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold">{c.nombre.slice(0, 2).toUpperCase()}</div>
                      <span className="text-sm font-bold text-white/90 truncate">{c.nombre}</span>
                    </button>
                  ))
                ) : (
                  data.trabajadores.filter(w => w.rol !== "Admin").map(w => (
                    <button key={w.id} onClick={() => handleDemoAccess("diseno", w.id, w.nombre)} className="w-full text-left p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">{w.nombre.slice(0, 2).toUpperCase()}</div>
                      <span className="text-sm font-bold text-white/90 truncate">{w.nombre}</span>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          ) : isTokenMode ? (
            <motion.div key="token-mode" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <form onSubmit={handleTokenSubmit} className="space-y-4">
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-blue-400 transition-colors">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text" value={token} onChange={(e) => setToken(e.target.value)}
                    placeholder="Ingresa tu Token de Acceso" autoFocus
                    className="w-full pl-11 pr-4 py-4 rounded-2xl text-sm font-bold outline-none transition-all focus:border-blue-500/50 focus:shadow-[0_0_30px_rgba(58,123,213,0.1)]"
                    style={inputStyle}
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: "0 0 25px rgba(58,123,213,0.3)" }}
                  whileTap={{ scale: 0.98 }} type="submit" disabled={loading || !token.trim()}
                  className="w-full py-4 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #3a7bd5, #6aafff)", color: "#fff" }}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>ENTRAR AL SISTEMA <ArrowRight className="w-4 h-4" /></>
                  )}
                </motion.button>
              </form>
            </motion.div>
          ) : (
            <motion.div key="admin-mode" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <form onSubmit={handleAdminSubmit} className="space-y-3">
                <input
                  type="text" value={usuario} onChange={(e) => setUsuario(e.target.value)}
                  placeholder="Usuario Admin"
                  className="w-full px-4 py-4 rounded-2xl text-sm font-bold outline-none transition-all"
                  style={inputStyle}
                />
                <input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  className="w-full px-4 py-4 rounded-2xl text-sm font-bold outline-none transition-all"
                  style={inputStyle}
                />
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  type="submit" disabled={loading || !usuario.trim() || !password.trim()}
                  className="w-full py-4 rounded-2xl text-sm font-black flex items-center justify-center gap-2 bg-white text-black transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>ACCESO ADMINISTRADOR <ShieldCheck className="w-4 h-4" /></>
                  )}
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {error && !demoSelector && (
          <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-[11px] text-center mt-4 text-red-400 font-bold px-2 uppercase tracking-tight">
            {error}
          </motion.p>
        )}

        {/* Toggles */}
        {!demoSelector && (
          <>
            <motion.div variants={itemVariants} className="flex justify-center mt-6">
              <button 
                onClick={() => { setIsTokenMode(!isTokenMode); setError(null); }}
                className="text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white/60 transition-colors"
              >
                {isTokenMode ? "Acceso Administrador" : "Volver a Token"}
              </button>
            </motion.div>

            {/* Divider */}
            <motion.div variants={itemVariants} className="flex items-center gap-3 my-8">
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/10">Demos rápidos</span>
              <div className="flex-1 h-px bg-white/5" />
            </motion.div>

            {/* Demo buttons */}
            <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleDemoAccess("admin", "demo-admin", "Feiko")} disabled={!!demoLoading}
                className="flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all"
              >
                {demoLoading === "admin" ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5 text-emerald-400" />}
                <span className="text-[9px] font-black uppercase text-white/40">Admin</span>
              </button>

              <button
                onClick={() => setDemoSelector("diseno")} disabled={!!demoLoading}
                className="flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all"
              >
                {demoLoading === "diseno" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Users className="w-5 h-5 text-blue-400" />}
                <span className="text-[9px] font-black uppercase text-white/40">Equipo</span>
              </button>

              <button
                onClick={() => setDemoSelector("cliente")} disabled={!!demoLoading}
                className="flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all"
              >
                {demoLoading === "cliente" ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserCircle className="w-5 h-5 text-purple-400" />}
                <span className="text-[9px] font-black uppercase text-white/40">Cliente</span>
              </button>
            </motion.div>

            {/* Brandex v3 Canvas Route */}
            <motion.button
              onClick={() => router.push("/taski")}
              whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.2)" }}
              whileTap={{ scale: 0.98 }}
              className="w-full mt-4 py-4 rounded-2xl border border-white/5 bg-white/[0.02] text-white/60 hover:text-white transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest"
            >
              Lienzo Taski <ArrowRight className="w-3 h-3 text-white/60" />
            </motion.button>
          </>
        )}

        <motion.p variants={itemVariants} className="text-center text-[9px] font-bold mt-10 text-white/10 uppercase tracking-[0.2em]">
          Braindex OS v2.0 · Secured by Notion
        </motion.p>
      </motion.div>
    </div>
  );
}
