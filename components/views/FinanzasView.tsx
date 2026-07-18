"use client";

import { useState } from "react";
import { PACKAGES, CONTRACTS, PHOTO_SESSIONS } from "@/lib/taski-data";
import { Calculator, Package, TrendingUp, DollarSign, Wallet } from "lucide-react";

export function FinanzasView() {
  const [selPkg, setSelPkg] = useState("estandar");
  const [selContract, setSelContract] = useState("mensual");
  const [addFoto, setAddFoto] = useState(false);
  const [fotoType, setFotoType] = useState("express");

  const P = PACKAGES[selPkg];
  const C = CONTRACTS.find((c) => c.id === selContract)!;
  const monthlyPrice = Math.round(P.price * (1 - C.discount));
  
  const photo = PHOTO_SESSIONS.find((s) => s.id === fotoType)!;
  const fotoAdd = addFoto ? photo.cost : 0;
  const totalMensual = monthlyPrice + fotoAdd;
  
  const meses = selContract === "trimestral" ? 3 : selContract === "semestral" ? 6 : selContract === "anual" ? 12 : 1;
  const totalContrato = totalMensual * meses;
  const ahorroVsBase = (P.price + (addFoto ? photo.cost : 0)) * meses - totalContrato;
  
  const costoOp = P.costoColab + (addFoto ? photo.costFotografo : 0);
  const ganancia = totalMensual - costoOp;
  const margenReal = Math.round((ganancia / totalMensual) * 100);

  const inputStyle = "w-full px-4 py-2.5 rounded-xl glass text-sm font-medium outline-none focus:border-white/20 transition-all appearance-none";

  return (
    <div className="p-6 h-full flex flex-col overflow-y-auto custom-scrollbar">
      <div className="mb-8">
        <h2 className="text-2xl font-black tracking-tight">Finanzas & Cotizador</h2>
        <p className="text-sm" style={{ color: "var(--txt3)" }}>
          Calcula márgenes y genera proyecciones comerciales
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calculator column */}
        <div className="space-y-6">
          <div className="glass p-6 rounded-3xl border-white/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/10">
                <Calculator className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black tracking-tight">Cotizador Rápido</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">PAQUETE</label>
                <div className="relative">
                  <select 
                    value={selPkg} 
                    onChange={(e) => setSelPkg(e.target.value)}
                    className={inputStyle}
                  >
                    {Object.values(PACKAGES).map(p => (
                      <option key={p.id} value={p.id} className="bg-[#111]">{p.icon} {p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">CONTRATO</label>
                <div className="relative">
                  <select 
                    value={selContract} 
                    onChange={(e) => setSelContract(e.target.value)}
                    className={inputStyle}
                  >
                    {CONTRACTS.map(c => (
                      <option key={c.id} value={c.id} className="bg-[#111]">{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="addFoto"
                    checked={addFoto} 
                    onChange={(e) => setAddFoto(e.target.checked)}
                    className="w-4 h-4 rounded-md border-white/10 bg-white/5 checked:bg-blue-500 transition-all cursor-pointer"
                  />
                  <label htmlFor="addFoto" className="text-sm font-bold cursor-pointer">Sesión Fotográfica</label>
                </div>
                {addFoto && <span className="text-xs font-black text-blue-400">+ ${photo.cost.toLocaleString()}</span>}
              </div>
              {addFoto && (
                <select 
                  value={fotoType} 
                  onChange={(e) => setFotoType(e.target.value)}
                  className={inputStyle}
                >
                  {PHOTO_SESSIONS.filter(s => s.id !== "none").map(s => (
                    <option key={s.id} value={s.id} className="bg-[#111]">📸 {s.name} ({s.duration})</option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-white/2 flex flex-col items-center border border-white/5">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Precio Mensual</span>
                <span className="text-2xl font-black text-blue-400">${totalMensual.toLocaleString()}</span>
              </div>
              <div className="p-4 rounded-2xl bg-white/2 flex flex-col items-center border border-white/5">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Total {meses}m</span>
                <span className="text-2xl font-black text-white">${totalContrato.toLocaleString()}</span>
              </div>
            </div>
            {ahorroVsBase > 0 && (
              <div className="mt-4 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-[11px] font-bold text-center">
                Ahorro total para el cliente: ${ahorroVsBase.toLocaleString()} ({(C.discount * 100).toFixed(0)}%)
              </div>
            )}
          </div>

          <div className="glass p-6 rounded-3xl border-white/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/10">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black tracking-tight">Tu Margen de Ganancia</h3>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Costo OP</div>
                <div className="text-lg font-black text-orange-400">${costoOp.toLocaleString()}</div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Ganancia</div>
                <div className="text-lg font-black text-green-400">${ganancia.toLocaleString()}</div>
              </div>
              <div className="space-y-1 text-right">
                <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Margen Real</div>
                <div className={`text-lg font-black ${margenReal > 50 ? "text-green-400" : "text-orange-400"}`}>
                  {margenReal}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info column */}
        <div className="space-y-6">
          <div className="glass p-6 rounded-3xl border-white/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/10">
                <DollarSign className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black tracking-tight">Estructura del Paquete</h3>
            </div>
            
            <div className="space-y-4">
              {P.mixRows.map((row, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-white/2 border border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black uppercase tracking-wider text-white/40">{row.label}</span>
                    <span className="text-sm font-bold">{row.quien}</span>
                  </div>
                  <span className={`text-xs font-black ${row.costo === 0 ? "text-green-400" : "text-white/60"}`}>
                    ${row.costo.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass p-6 rounded-3xl border-white/5 bg-blue-500/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[60px] -mr-16 -mt-16" />
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <Wallet className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black tracking-tight">Resumen Ejecutivo</h3>
            </div>
            <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--txt2)" }}>
              El paquete <span className="font-bold text-white">{P.name}</span> tiene un margen operativo del <span className="font-bold text-green-400">{P.margen}%</span>. 
              Requiere aproximadamente <span className="font-bold text-white">{P.tiempoTuyo}</span> de tu tiempo mensual para gestión estratégica.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Feed/mes</div>
                <div className="text-lg font-black">{P.totalPiezas} piezas</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Historias</div>
                <div className="text-lg font-black">{P.historias}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
