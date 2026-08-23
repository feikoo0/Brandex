"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  Rocket,
  Users,
  KeyRound,
  Check,
  Search,
  SlidersHorizontal,
  Sparkles,
  Layers,
  Bot,
  Wrench,
  Clock,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Building,
  Target,
  FileText,
  X,
  RefreshCw,
  Eye,
  Lock,
  Globe,
  Radio,
} from "lucide-react";
import { collection, onSnapshot, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSystemFeatures, FeatureAudience, FeatureFlag } from "@/hooks/useSystemFeatures";
import { playSound } from "@/app/taski/utils/audio";

interface SurveyDoc {
  id: string;
  name?: string;
  brand?: string;
  email?: string;
  specialty?: string;
  goals?: string[];
  teamSize?: string;
  pin?: string;
  workspaceId?: string;
  createdAt?: string;
}

interface WorkspaceDoc {
  id: string;
  pin?: string;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
}

export function SuperAdminView() {
  const { features, updateFeatureAudience, toggleFeatureEnabled, isLoading: isFeaturesLoading } = useSystemFeatures();

  const [activeTab, setActiveTab] = useState<"features" | "users" | "security">("features");
  const [featureCategory, setFeatureCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Surveys & Workspaces State
  const [surveys, setSurveys] = useState<SurveyDoc[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceDoc[]>([]);
  const [isLoadingSurveys, setIsLoadingSurveys] = useState<boolean>(true);

  // Selected Survey for Detail Modal
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyDoc | null>(null);

  // Copied state for PINs
  const [copiedPin, setCopiedPin] = useState<string | null>(null);

  // Load surveys and workspaces in real time
  useEffect(() => {
    setIsLoadingSurveys(true);
    const surveysQuery = query(collection(db, "onboarding_surveys"), orderBy("createdAt", "desc"));
    const workspacesQuery = query(collection(db, "workspaces"), orderBy("createdAt", "desc"));

    const unsubSurveys = onSnapshot(
      surveysQuery,
      (snapshot) => {
        const list: SurveyDoc[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setSurveys(list);
        setIsLoadingSurveys(false);
      },
      (err) => {
        console.error("Error al cargar onboarding_surveys:", err);
        setIsLoadingSurveys(false);
      }
    );

    const unsubWorkspaces = onSnapshot(
      workspacesQuery,
      (snapshot) => {
        const list: WorkspaceDoc[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setWorkspaces(list);
      },
      (err) => {
        console.error("Error al cargar workspaces:", err);
      }
    );

    return () => {
      unsubSurveys();
      unsubWorkspaces();
    };
  }, []);

  const handleCopy = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
      playSound("click");
      setCopiedPin(id);
      setTimeout(() => setCopiedPin(null), 2000);
    } catch {}
  };

  const filteredSurveys = useMemo(() => {
    if (!searchQuery.trim()) return surveys;
    const q = searchQuery.toLowerCase();
    return surveys.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.brand?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.pin?.includes(q) ||
        s.specialty?.toLowerCase().includes(q)
    );
  }, [surveys, searchQuery]);

  const filteredFeatures = useMemo(() => {
    const list = Object.values(features);
    if (featureCategory === "all") return list;
    return list.filter((f) => f.category === featureCategory);
  }, [features, featureCategory]);

  const activeFeaturesCount = useMemo(() => {
    return Object.values(features).filter((f) => f.enabled).length;
  }, [features]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "ia":
        return <Bot className="w-4 h-4 text-purple-400" />;
      case "modulos":
        return <Layers className="w-4 h-4 text-[#3a7bd5]" />;
      case "herramientas":
        return <Wrench className="w-4 h-4 text-amber-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-emerald-400" />;
    }
  };

  const getAudienceBadge = (audience: FeatureAudience) => {
    switch (audience) {
      case "master":
        return {
          label: "Solo Master",
          icon: <Lock className="w-3 h-3 text-rose-400" />,
          className: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        };
      case "beta":
        return {
          label: "Usuarios Beta",
          icon: <Radio className="w-3 h-3 text-amber-400" />,
          className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        };
      case "all":
        return {
          label: "Público General",
          icon: <Globe className="w-3 h-3 text-emerald-400" />,
          className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        };
    }
  };

  return (
    <div className="w-full h-full flex flex-col gap-6 overflow-y-auto custom-scrollbar p-6 bg-[#121212] text-[#ffffffd6]">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-[#181818] border border-white/10 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 via-purple-600 to-indigo-600 p-[2px] shadow-lg flex items-center justify-center">
            <div className="w-full h-full rounded-2xl bg-[#181817] flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#ffffffd6]">
                Consola SuperAdmin
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                Llave Maestra 159789
              </span>
            </div>
            <p className="text-xs text-[#ffffff6b] mt-0.5">
              Control de lanzamientos en vivo ("Push Interno"), feature flags y directorio de usuarios beta
            </p>
          </div>
        </div>

        {/* Global Stats Cards */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col px-4 py-2 rounded-2xl bg-white/[0.03] border border-white/10">
            <span className="text-[10px] uppercase font-bold text-[#ffffff6b]">Usuarios Beta</span>
            <span className="text-lg font-bold text-white leading-tight">{surveys.length}</span>
          </div>
          <div className="flex flex-col px-4 py-2 rounded-2xl bg-white/[0.03] border border-white/10">
            <span className="text-[10px] uppercase font-bold text-[#ffffff6b]">Workspaces</span>
            <span className="text-lg font-bold text-[#3a7bd5] leading-tight">{workspaces.length}</span>
          </div>
          <div className="flex flex-col px-4 py-2 rounded-2xl bg-white/[0.03] border border-white/10">
            <span className="text-[10px] uppercase font-bold text-[#ffffff6b]">Flags Activas</span>
            <span className="text-lg font-bold text-emerald-400 leading-tight">
              {activeFeaturesCount}/{Object.keys(features).length}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <button
          type="button"
          onClick={() => {
            setActiveTab("features");
            playSound("click");
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "features"
              ? "bg-white/10 text-white border border-white/15 shadow-sm"
              : "text-[#ffffff6b] hover:text-white hover:bg-white/5"
          }`}
        >
          <Rocket className="w-4 h-4 text-[#3a7bd5]" />
          <span>Control de Lanzamientos ("Push Interno")</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("users");
            playSound("click");
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "users"
              ? "bg-white/10 text-white border border-white/15 shadow-sm"
              : "text-[#ffffff6b] hover:text-white hover:bg-white/5"
          }`}
        >
          <Users className="w-4 h-4 text-purple-400" />
          <span>Directorio de Usuarios Beta & Encuestas ({surveys.length})</span>
        </button>
      </div>

      {/* ── TAB 1: CONTROL DE LANZAMIENTOS (FEATURE FLAGS) ── */}
      {activeTab === "features" && (
        <div className="flex flex-col gap-6">
          {/* Categorías & Filtro */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              {[
                { id: "all", label: "Todas las Funciones" },
                { id: "modulos", label: "Módulos Principales" },
                { id: "ia", label: "IA & Copilot" },
                { id: "herramientas", label: "Herramientas" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setFeatureCategory(cat.id);
                    playSound("click");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    featureCategory === cat.id
                      ? "bg-[#3a7bd5]/20 text-[#3a7bd5] border border-[#3a7bd5]/40"
                      : "bg-[#181818] text-[#ffffff6b] hover:text-white border border-white/5"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="text-xs text-[#ffffff6b]">
              💡 Cambia el alcance de una función para liberarla al instante sin hacer deploy.
            </div>
          </div>

          {/* Grid de Feature Flags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFeatures.map((feat) => {
              const badge = getAudienceBadge(feat.audience);

              return (
                <motion.div
                  key={feat.id}
                  layout
                  className="p-5 rounded-2xl bg-[#181818] border border-white/10 flex flex-col justify-between gap-4 shadow-md transition-all hover:border-white/20"
                >
                  {/* Top: Icon + Title + Switch */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                        {getCategoryIcon(feat.category)}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-[#ffffffd6]">{feat.label}</h3>
                          <span
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${badge.className}`}
                          >
                            {badge.icon}
                            <span>{badge.label}</span>
                          </span>
                        </div>
                        <p className="text-xs text-[#ffffff6b] mt-1 line-clamp-2">{feat.description}</p>
                      </div>
                    </div>

                    {/* Master Switch */}
                    <button
                      type="button"
                      onClick={async () => {
                        playSound("pop");
                        await toggleFeatureEnabled(feat.id);
                      }}
                      className={`relative w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer shrink-0 ${
                        feat.enabled ? "bg-[#3a7bd5]" : "bg-white/10"
                      }`}
                      title={feat.enabled ? "Desactivar función globalmente" : "Activar función"}
                    >
                      <motion.div
                        layout
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className={`w-5 h-5 rounded-full bg-white shadow-md ${
                          feat.enabled ? "ml-auto" : "mr-auto"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Bottom: Segmented Audience Selector (Master vs Beta vs All) */}
                  <div className="flex flex-col gap-1.5 pt-3 border-t border-white/5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#ffffff6b]">
                      Alcance de Lanzamiento ("Push Interno")
                    </span>
                    <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#222222] border border-white/10">
                      {[
                        { id: "master", label: "🔒 Solo Master", tooltip: "Solo visible en Brandex" },
                        { id: "beta", label: "🧪 Betas + Master", tooltip: "Visible para usuarios beta" },
                        { id: "all", label: "🌍 Público General", tooltip: "Disponible para todos" },
                      ].map((opt) => {
                        const isSelected = feat.audience === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={async () => {
                              playSound("click");
                              await updateFeatureAudience(feat.id, opt.id as FeatureAudience);
                            }}
                            className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all cursor-pointer text-center truncate ${
                              isSelected
                                ? "bg-white/15 text-white border border-white/20 shadow-sm"
                                : "text-[#ffffff6b] hover:text-white hover:bg-white/5"
                            }`}
                            title={opt.tooltip}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 2: DIRECTORIO DE USUARIOS BETA & ENCUESTAS ── */}
      {activeTab === "users" && (
        <div className="flex flex-col gap-4">
          {/* Barra de Búsqueda */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative w-full max-w-md">
              <Search className="w-4 h-4 text-[#ffffff6b] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, marca, correo o PIN..."
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#181818] border border-white/10 text-xs text-[#ffffffd6] placeholder-[#ffffff40] focus:outline-none focus:border-[#3a7bd5] transition-all"
              />
            </div>

            <div className="text-xs text-[#ffffff6b]">
              Mostrando {filteredSurveys.length} de {surveys.length} usuarios registrados
            </div>
          </div>

          {/* Tabla de Usuarios Beta */}
          <div className="w-full rounded-2xl bg-[#181818] border border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-semibold text-[#ffffff6b] uppercase tracking-wider">
                    <th className="py-3 px-4">Usuario</th>
                    <th className="py-3 px-4">Marca / Empresa</th>
                    <th className="py-3 px-4">Especialidad</th>
                    <th className="py-3 px-4">Objetivos Clave</th>
                    <th className="py-3 px-4">Equipo</th>
                    <th className="py-3 px-4">PIN Asignado</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-[#ffffffd6]">
                  {filteredSurveys.length > 0 ? (
                    filteredSurveys.map((survey) => (
                      <tr
                        key={survey.id}
                        className="hover:bg-white/[0.02] transition-colors group cursor-default"
                      >
                        {/* Usuario */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 p-[1.5px] shrink-0">
                              <div className="w-full h-full rounded-full bg-[#181817] flex items-center justify-center text-xs font-bold text-white">
                                {survey.name ? survey.name.charAt(0).toUpperCase() : "U"}
                              </div>
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-white truncate">
                                {survey.name || "Sin nombre"}
                              </span>
                              <span className="text-[11px] text-[#ffffff6b] truncate">
                                {survey.email || "Sin correo"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Marca */}
                        <td className="py-3.5 px-4 font-medium text-white/90">
                          {survey.brand || "Personal"}
                        </td>

                        {/* Especialidad */}
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/[0.04] border border-white/10 text-white/80">
                            {survey.specialty || "General"}
                          </span>
                        </td>

                        {/* Objetivos */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                            {survey.goals && survey.goals.length > 0 ? (
                              survey.goals.slice(0, 2).map((g, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#3a7bd5]/15 text-[#3a7bd5] border border-[#3a7bd5]/25 truncate"
                                >
                                  {g}
                                </span>
                              ))
                            ) : (
                              <span className="text-[#ffffff40] text-[11px]">No especificado</span>
                            )}
                            {survey.goals && survey.goals.length > 2 && (
                              <span className="text-[10px] text-[#ffffff6b]">
                                +{survey.goals.length - 2}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Equipo */}
                        <td className="py-3.5 px-4 text-[#ffffff6b]">
                          {survey.teamSize || "1 persona"}
                        </td>

                        {/* PIN */}
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleCopy(survey.pin || "000000", survey.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#222222] hover:bg-white/10 border border-white/10 text-xs font-mono font-bold text-white transition-all cursor-pointer"
                            title="Copiar llave PIN"
                          >
                            <KeyRound className="w-3 h-3 text-[#3a7bd5]" />
                            <span>{survey.pin || "N/A"}</span>
                            {copiedPin === survey.id && (
                              <Check className="w-3 h-3 text-emerald-400 ml-1" />
                            )}
                          </button>
                        </td>

                        {/* Acción */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSurvey(survey);
                              playSound("click");
                            }}
                            className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/15 border border-white/10 text-xs font-semibold text-white transition-all cursor-pointer"
                          >
                            Ver Ficha
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#ffffff40]">
                        {isLoadingSurveys ? "Cargando respuestas de encuestas..." : "No se encontraron usuarios beta registrados"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: FICHA DETALLADA DE ENCUESTA ── */}
      <AnimatePresence>
        {selectedSurvey && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSurvey(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg rounded-3xl bg-[#181818] border border-white/10 p-6 shadow-2xl z-10 flex flex-col gap-5 text-[#ffffffd6]"
            >
              {/* Header Modal */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-500 p-[1.5px]">
                    <div className="w-full h-full rounded-2xl bg-[#181817] flex items-center justify-center text-sm font-bold text-white">
                      {selectedSurvey.name ? selectedSurvey.name.charAt(0).toUpperCase() : "U"}
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-base font-bold text-white">{selectedSurvey.name}</h2>
                    <span className="text-xs text-[#ffffff6b]">{selectedSurvey.email}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSurvey(null)}
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#ffffff6b] hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#222222] border border-white/10 flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase text-[#ffffff6b]">Marca / Agencia</span>
                  <span className="text-xs font-semibold text-white">{selectedSurvey.brand || "Personal"}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#222222] border border-white/10 flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase text-[#ffffff6b]">Especialidad</span>
                  <span className="text-xs font-semibold text-white">{selectedSurvey.specialty || "General"}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#222222] border border-white/10 flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase text-[#ffffff6b]">Tamaño de Equipo</span>
                  <span className="text-xs font-semibold text-white">{selectedSurvey.teamSize || "1 persona"}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#222222] border border-white/10 flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase text-[#ffffff6b]">PIN de Acceso</span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#3a7bd5]">{selectedSurvey.pin || "N/A"}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedSurvey.pin || "", "modal-pin")}
                      className="text-[10px] text-white/60 hover:text-white underline cursor-pointer"
                    >
                      {copiedPin === "modal-pin" ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Objetivos Seleccionados */}
              <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-[#222222] border border-white/10">
                <span className="text-[10px] font-bold uppercase text-[#ffffff6b]">
                  Objetivos que busca en Taski
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSurvey.goals && selectedSurvey.goals.length > 0 ? (
                    selectedSurvey.goals.map((g, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#3a7bd5]/20 text-[#3a7bd5] border border-[#3a7bd5]/30"
                      >
                        {g}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[#ffffff40]">Ninguno seleccionado</span>
                  )}
                </div>
              </div>

              {/* Footer Meta */}
              <div className="flex items-center justify-between text-[11px] text-[#ffffff6b] pt-2 border-t border-white/5">
                <span>ID de Workspace: {selectedSurvey.workspaceId || "ws_" + selectedSurvey.pin}</span>
                <span>Registrado: {selectedSurvey.createdAt ? new Date(selectedSurvey.createdAt).toLocaleDateString("es-ES") : "Reciente"}</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
export default SuperAdminView;
