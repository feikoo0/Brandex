"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Smartphone,
  Globe,
  Utensils,
  Palette,
  Megaphone,
  Layers,
  Zap,
  Clock,
  MessageCircle,
  LogIn,
  Check,
  FolderDown,
  ThumbsUp,
  CalendarCheck2,
  FileCheck2,
  ShieldCheck,
} from "lucide-react";
import { TaskiLoginModal } from "./TaskiLoginModal";
import { QuoteModal } from "./QuoteModal";
import GradualBlur from "@/components/GradualBlur";
import Beams from "./Beams";
import { useAuthStore } from "@/lib/store";
import { playSound } from "@/app/taski/utils/audio";

interface BrandexLandingPageProps {
  initialOpenLogin?: boolean;
}

export function BrandexLandingPage({ initialOpenLogin = false }: BrandexLandingPageProps) {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const workspaceId = useAuthStore((s) => s.workspaceId);
  const hasSession = Boolean(token && workspaceId);

  const [isLoginOpen, setIsLoginOpen] = useState(initialOpenLogin);
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("servicios");
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (initialOpenLogin) {
      setIsLoginOpen(true);
    }
  }, [initialOpenLogin]);

  const handleOpenLogin = () => {
    try {
      playSound("click");
    } catch {}
    if (hasSession) {
      router.push("/taski");
    } else {
      setIsLoginOpen(true);
    }
  };

  const handleOpenQuote = () => {
    try {
      playSound("click");
    } catch {}
    setIsQuoteOpen(true);
  };

  const scrollToSection = (sectionId: string) => {
    try {
      playSound("click");
    } catch {}
    setActiveNav(sectionId);
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="brandex-landing-root min-h-screen w-full bg-[#181817] text-[#ffffffd6] relative flex flex-col overflow-x-hidden selection:bg-white/20 selection:text-white">
      
      {/* ========================================================================= */}
      {/* ATMÓSFERA DE ESTUDIO MONOCROMÁTICA (Layer 0 Canvas & Ambient Lighting)     */}
      {/* ========================================================================= */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden min-h-screen">
        {/* Base ultra profunda Layer 0 */}
        <div className="absolute inset-0 bg-[#181817]" />

        {/* Cono de iluminación cenital de estudio (luz blanca difusa de baja opacidad) */}
        <div
          className="absolute -top-32 inset-x-0 h-[700px] pointer-events-none opacity-40"
          style={{
            background:
              "radial-gradient(circle at 50% 15%, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 40%, transparent 75%)",
          }}
        />

        {/* Trama sutil de micropuntos técnicos */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* EFECTO BEAMS DE REACT BITS (Fondo completo de pantalla de inicio) */}
        <div className="absolute top-0 inset-x-0 h-screen min-h-[100dvh] pointer-events-none flex items-center justify-center overflow-hidden">
          <div className="w-full h-full relative">
            <Beams
              beamWidth={2}
              beamHeight={15}
              beamNumber={12}
              lightColor="#ffffff"
              speed={2}
              noiseIntensity={0.85}
              scale={0.2}
              rotation={0}
            />
          </div>
          {/* Desvanecimiento inferior suave hacia el canvas #181817 al scrollear a las siguientes secciones */}
          <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-b from-transparent via-[#181817]/60 to-[#181817] pointer-events-none" />
        </div>

        {/* Viñeta perimetral suave */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#181817]/90 via-[#181817]/40 to-transparent" />
      </div>

      {/* ========================================================================= */}
      {/* BARRA DE NAVEGACIÓN DINÁMICA (Píldora flotante arriba -> Barra de extremo a extremo al scrollear) */}
      {/* ========================================================================= */}
      <header
        className={`fixed inset-x-0 z-40 flex justify-center pointer-events-none transition-all duration-500 ease-out ${
          isScrolled
            ? "top-0 px-0"
            : "top-5 sm:top-6 px-4 sm:px-6"
        }`}
      >
        <div
          className={`pointer-events-auto flex items-center bg-gradient-to-b from-[#181817] via-[#181817]/95 to-transparent backdrop-blur-md transition-all duration-500 ease-out border ${
            isScrolled
              ? "w-full max-w-full rounded-none border-b-white/[0.08] border-t-transparent border-x-transparent px-6 sm:px-10 lg:px-12 py-3.5 sm:py-4 shadow-none justify-center"
              : "w-full max-w-[780px] rounded-full border-white/10 pl-6 pr-2.5 py-2 sm:py-2.5 shadow-xl shadow-black/30 justify-between"
          }`}
        >
          <div
            className={`flex items-center justify-between w-full transition-all duration-500 ease-out ${
              isScrolled
                ? "max-w-7xl mx-auto gap-6 sm:gap-10"
                : "gap-4 sm:gap-6 md:gap-8"
            }`}
          >
            {/* 1. Logotipo Oficial de Brandex */}
            <div className="flex items-center shrink-0 pr-1 sm:pr-2">
              <Image
                src="/brandex-logo.svg"
                alt="Brandex"
                width={125}
                height={28}
                priority
                style={{ height: "26px", width: "auto" }}
                className="object-contain object-left h-[26px] w-auto select-none opacity-95 hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              />
            </div>

            {/* 2. Opciones de Navegación Centrales */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => scrollToSection("servicios")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  activeNav === "servicios"
                    ? "bg-white/10 text-white border border-white/15"
                    : "text-[#ffffff80] hover:text-white hover:bg-white/5"
                }`}
              >
                Servicios
              </button>
              <button
                onClick={() => scrollToSection("experiencia-taski")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  activeNav === "experiencia-taski"
                    ? "bg-white/10 text-white border border-white/15"
                    : "text-[#ffffff80] hover:text-white hover:bg-white/5"
                }`}
              >
                Experiencia Taski
              </button>
              <button
                onClick={() => scrollToSection("proyectos")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  activeNav === "proyectos"
                    ? "bg-white/10 text-white border border-white/15"
                    : "text-[#ffffff80] hover:text-white hover:bg-white/5"
                }`}
              >
                Portafolio
              </button>
              <button
                onClick={() => scrollToSection("nosotros")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  activeNav === "nosotros"
                    ? "bg-white/10 text-white border border-white/15"
                    : "text-[#ffffff80] hover:text-white hover:bg-white/5"
                }`}
              >
                Nosotros
              </button>
              <button
                onClick={() => scrollToSection("contacto")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  activeNav === "contacto"
                    ? "bg-white/10 text-white border border-white/15"
                    : "text-[#ffffff80] hover:text-white hover:bg-white/5"
                }`}
              >
                Contacto
              </button>
            </nav>

            {/* 3. Acción Derecha: Botón de Comenzar Proyecto */}
            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={handleOpenQuote}
                className="px-4 sm:px-5 py-2 rounded-full text-xs font-semibold bg-white text-black hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <span>Comenzar proyecto</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* SECCIÓN HERO (Foco Limpio y Contundente en Brandex - Pantalla Completa) */}
      {/* ========================================================================= */}
      <section className="relative z-10 min-h-screen px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center pt-28 sm:pt-32 pb-16 sm:pb-20">
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
          
          {/* Badge Superior Monocromático */}
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[#ffffffd6] text-xs font-medium mb-6 shadow-sm"
          >
            <span>Agencia de Crecimiento Digital & Estrategia 360°</span>
          </motion.div>

          {/* Gran Título Hero Monocromático de Alta Jerarquía */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-[1.08] mb-6"
          >
            The Next Era
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-white/95 to-white/70">
              Digital Growth & Branding
            </span>
          </motion.h1>

          {/* Subtítulo Descriptivo */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-base sm:text-lg md:text-xl text-[#ffffff80] max-w-2xl font-normal leading-relaxed mb-10"
          >
            Potenciamos tu marca con contenido estratégico en redes, desarrollo web ultra rápido, menús interactivos QR y pauta publicitaria que convierte.
          </motion.p>

          {/* Botón Principal Único de Acción */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="flex items-center justify-center"
          >
            <button
              type="button"
              onClick={handleOpenQuote}
              className="px-8 py-3.5 rounded-full bg-white text-black font-semibold text-sm hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3 shadow-xl shadow-black/50 cursor-pointer group"
            >
              <span>Comenzar proyecto</span>
              <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>
          </motion.div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECCIÓN SERVICIOS (Limpia, Sin Botones Saturados, Título en 2 Líneas)     */}
      {/* ========================================================================= */}
      <section id="servicios" className="relative z-10 scroll-mt-28 py-20 px-4 sm:px-6 lg:px-8 border-t border-white/10 bg-[#141413]">
        <div className="max-w-7xl mx-auto">
          
          <div className="flex flex-col items-center text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white max-w-2xl leading-tight mb-4">
              Todo lo que tu marca necesita
              <br />
              para crear y crecer
            </h2>
            <p className="text-sm sm:text-base text-[#ffffff6b] max-w-xl">
              Estrategias y entregables de alta gama diseñados para captar clientes calificados y acelerar tus ventas comerciales.
            </p>
          </div>

          {/* Cuadrícula de Servicios sin botones repetitivos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* 1. Redes Sociales & Community */}
            <div className="p-7 rounded-[24px] bg-[#181818] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between shadow-sm">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#222222] border border-white/10 flex items-center justify-center text-white mb-5">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Redes Sociales & Growth
                </h3>
                <p className="text-xs text-[#ffffff6b] leading-relaxed mb-6">
                  Estrategia de contenidos mensuales, reels 9:16 de alto impacto, carruseles educativos, copies persuasivos y gestión de comunidad enfocada en ventas.
                </p>
                <ul className="space-y-2.5 text-xs text-white/70">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-white/80" />
                    <span>Parrilla mensual de contenido estratégico</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-white/80" />
                    <span>Edición de Reels & TikToks en formato 9:16</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-white/80" />
                    <span>Reportes de alcance e interacción real</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* 2. Desarrollo Web & Landing Pages */}
            <div className="p-7 rounded-[24px] bg-[#181818] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between shadow-sm">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#222222] border border-white/10 flex items-center justify-center text-white mb-5">
                  <Globe className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Desarrollo Web & Landing Pages
                </h3>
                <p className="text-xs text-[#ffffff6b] leading-relaxed mb-6">
                  Sitios web ultra rápidos construidos con tecnología moderna (Next.js, React), diseño UI/UX premium, catálogo de productos, pasarelas de pago y optimización SEO.
                </p>
                <ul className="space-y-2.5 text-xs text-white/70">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-white/80" />
                    <span>Diseño responsive 100% móvil y fluido</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-white/80" />
                    <span>Velocidad de carga instantánea (&lt;1s)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-white/80" />
                    <span>Integración directa con WhatsApp & Pasarelas</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* 3. Menús Digitales QR Interactivos */}
            <div className="p-7 rounded-[24px] bg-[#181818] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between shadow-sm">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#222222] border border-white/10 flex items-center justify-center text-white mb-5">
                  <Utensils className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Menús Digitales QR Interactivos
                </h3>
                <p className="text-xs text-[#ffffff6b] leading-relaxed mb-6">
                  La experiencia gastronómica ideal para restaurantes, cafeterías y bares. Menús dinámicos escaneables vía QR, fotos de alta calidad, filtros y cambios en tiempo real.
                </p>
                <ul className="space-y-2.5 text-xs text-white/70">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-white/80" />
                    <span>Actualización de precios y platillos inmediata</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-white/80" />
                    <span>Filtros vegetarianos, combos & promociones</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-white/80" />
                    <span>Códigos QR vectoriales de alta resolución para mesas</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* 4. Flyers, Branding & Diseño Gráfico */}
            <div className="p-7 rounded-[24px] bg-[#181818] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between shadow-sm">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#222222] border border-white/10 flex items-center justify-center text-white mb-5">
                  <Palette className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Flyers, Branding & Diseño Gráfico
                </h3>
                <p className="text-xs text-[#ffffff6b] leading-relaxed mb-6">
                  Diseño de alto impacto visual para eventos, promociones, volantes impresos, cartelería digital, branding integral, manuales de marca y material publicitario.
                </p>
                <ul className="space-y-2.5 text-xs text-white/70">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-white/80" />
                    <span>Flyers promocionales listos para imprenta en CMYK</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-white/80" />
                    <span>Formatos digitales adaptados a Stories y WhatsApp</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-white/80" />
                    <span>Identidad visual corporativa y papelería comercial</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* 5. Pauta Digital & Performance Ads */}
            <div className="p-7 rounded-[24px] bg-[#181818] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between shadow-sm">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#222222] border border-white/10 flex items-center justify-center text-white mb-5">
                  <Megaphone className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Pauta Digital (Meta & Google Ads)
                </h3>
                <p className="text-xs text-[#ffffff6b] leading-relaxed mb-6">
                  Campañas de anuncios pagados enfocadas en conversión real, captación de clientes calificados, remarketing y maximización del retorno sobre la inversión publicitaria.
                </p>
                <ul className="space-y-2.5 text-xs text-white/70">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-white/80" />
                    <span>Segmentación hiperlocal y por comportamiento</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-white/80" />
                    <span>Pruebas A/B continuas de creativos y copies</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-white/80" />
                    <span>Optimización semanal de presupuesto y ROAS</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* 6. Estrategia 360° & Producción Integral */}
            <div className="p-7 rounded-[24px] bg-[#181818] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between shadow-sm">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#222222] border border-white/10 flex items-center justify-center text-white mb-5">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Estrategia 360° & Producción Integral
                </h3>
                <p className="text-xs text-[#ffffff6b] leading-relaxed mb-6">
                  Solución integral para marcas que buscan delegar toda su presencia digital: dirección de arte, desarrollo de plataforma, creación constante de contenido y pauta de ventas.
                </p>
                <ul className="space-y-2.5 text-xs text-white/70">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-white/80" />
                    <span>Plan unificado de marketing y branding</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-white/80" />
                    <span>Atención y dirección creativa personalizada</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-white/80" />
                    <span>Entregas continuas coordinadas en tu portal</span>
                  </li>
                </ul>
              </div>
            </div>

          </div>

          {/* ÚNICO BOTÓN GLOBAL EN PÍLDORA (Sustituye a los 6 botones repetitivos) */}
          <div className="mt-14 flex justify-center">
            <button
              onClick={handleOpenQuote}
              className="px-8 py-3.5 rounded-full bg-white text-black font-semibold text-sm hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3 shadow-xl shadow-black/40 cursor-pointer group"
            >
              <span>Cotizar servicios para tu marca</span>
              <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECCIÓN EXPERIENCIA TASKI (Enfocada 100% en la Experiencia del CLIENTE)    */}
      {/* ========================================================================= */}
      <section id="experiencia-taski" className="relative z-10 scroll-mt-28 py-20 px-4 sm:px-6 lg:px-8 border-t border-white/10 bg-[#181817]">
        <div className="max-w-6xl mx-auto">
          
          <div className="flex flex-col items-center text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white max-w-3xl leading-tight mb-4">
              Tu marca con un portal propio:
              <br />
              cero caos, fechas garantizadas y aprobaciones en 1 clic
            </h2>
            <p className="text-sm sm:text-base text-[#ffffff6b] max-w-2xl leading-relaxed">
              Las agencias tradicionales te envían mensajes sueltos por WhatsApp, enlaces caídos de Drive y correos que se pierden. En Brandex, cada cliente cuenta con su propio portal en Taski para supervisar todo su proyecto sin estrés.
            </p>
          </div>

          {/* 4 Superpoderes de la Experiencia de Cliente */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
            
            {/* 1. Aprobaciones en 1 Clic */}
            <div className="p-6 rounded-[24px] bg-[#181818] border border-white/10 flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-[#222222] border border-white/10 flex items-center justify-center text-white mb-4">
                <ThumbsUp className="w-5 h-5 text-emerald-400" />
              </div>
              <h4 className="text-sm font-bold text-white mb-2">
                Aprobaciones en 1 Clic
              </h4>
              <p className="text-xs text-[#ffffff6b] leading-relaxed">
                Revisa cada reel, flyer o diseño desde tu móvil y apruébalo al instante para publicación, o deja notas precisas sobre el entregable.
              </p>
            </div>

            {/* 2. Cronograma en Vivo */}
            <div className="p-6 rounded-[24px] bg-[#181818] border border-white/10 flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-[#222222] border border-white/10 flex items-center justify-center text-white mb-4">
                <CalendarCheck2 className="w-5 h-5 text-white/80" />
              </div>
              <h4 className="text-sm font-bold text-white mb-2">
                Cronograma en Vivo
              </h4>
              <p className="text-xs text-[#ffffff6b] leading-relaxed">
                Sin sorpresas ni "¿cómo va mi diseño?". Ves el calendario exacto con las fechas de entrega y en qué etapa está cada pieza.
              </p>
            </div>

            {/* 3. Bóveda de Activos */}
            <div className="p-6 rounded-[24px] bg-[#181818] border border-white/10 flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-[#222222] border border-white/10 flex items-center justify-center text-white mb-4">
                <FolderDown className="w-5 h-5 text-white/80" />
              </div>
              <h4 className="text-sm font-bold text-white mb-2">
                Bóveda de Activos
              </h4>
              <p className="text-xs text-[#ffffff6b] leading-relaxed">
                Tus artes listos para imprenta, videos en 4K y enlaces QR quedan organizados para siempre en tu portal. Descárgalos cuando quieras.
              </p>
            </div>

            {/* 4. Sprints de 48 Horas */}
            <div className="p-6 rounded-[24px] bg-[#181818] border border-white/10 flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-[#222222] border border-white/10 flex items-center justify-center text-white mb-4">
                <Clock className="w-5 h-5 text-white/80" />
              </div>
              <h4 className="text-sm font-bold text-white mb-2">
                Sprints de 48 Horas
              </h4>
              <p className="text-xs text-[#ffffff6b] leading-relaxed">
                Trabajamos en entregables atómicos. En lugar de esperar un mes por resultados, recibes avances terminados y utilizables cada semana.
              </p>
            </div>

          </div>

          {/* PREVIEW AUTÉNTICO: Lo que el cliente ve en su portal de Taski */}
          <div className="rounded-[28px] bg-[#121212] border border-white/[0.08] p-6 sm:p-8 shadow-2xl shadow-black/80">
            
            {/* Header del Mockup de Cliente */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                <div>
                  <span className="text-sm font-bold text-white block">
                    Portal de Cliente • Bistro 24 Gourmet
                  </span>
                  <span className="text-[11px] text-[#ffffff6b]">
                    Tu espacio exclusivo de supervisión y descargas
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
                  2 entregables listos para aprobación
                </span>
              </div>
            </div>

            {/* Entregables en Supervisión de Cliente */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-6">
              
              {/* Tarjeta 1: Aprobación de Reel */}
              <div className="p-4 rounded-2xl bg-[#181818] border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] text-[#ffffff6b] mb-2">
                    <span className="text-white/60">Formato Reel 9:16</span>
                    <span className="text-amber-400 font-medium bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                      Pendiente aprobación
                    </span>
                  </div>
                  <h5 className="text-xs font-bold text-white mb-1">
                    Reel: Lanzamiento Menú Degustación
                  </h5>
                  <p className="text-[11px] text-[#ffffff6b] mb-4">
                    Edición dinámica con música en tendencia y corrección de color 4K.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    className="flex-1 py-1.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-white/90 transition-all flex items-center justify-center gap-1.5 cursor-default"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Aprobar Arte</span>
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-xl bg-[#222222] text-white/70 text-xs font-medium hover:text-white transition-all cursor-default"
                  >
                    Ajuste
                  </button>
                </div>
              </div>

              {/* Tarjeta 2: Menú QR Aprobado */}
              <div className="p-4 rounded-2xl bg-[#181818] border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] text-[#ffffff6b] mb-2">
                    <span className="text-white/60">Menú Digital QR</span>
                    <span className="text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Aprobado & En Línea
                    </span>
                  </div>
                  <h5 className="text-xs font-bold text-white mb-1">
                    Carta Digital sin Contacto v2.4
                  </h5>
                  <p className="text-[11px] text-[#ffffff6b] mb-4">
                    12,500 visitas acumuladas este mes. Actualizado con precios nuevos.
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs text-white/60 pt-2 border-t border-white/5">
                  <span>Entrega: Completada</span>
                  <span className="text-white font-mono font-medium">100% On-Time</span>
                </div>
              </div>

              {/* Tarjeta 3: Bóveda de Archivos */}
              <div className="p-4 rounded-2xl bg-[#181818] border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] text-[#ffffff6b] mb-2">
                    <span className="text-white/60">Bóveda de Archivos</span>
                    <span className="text-white/60 font-mono">12 archivos</span>
                  </div>
                  <h5 className="text-xs font-bold text-white mb-1">
                    Material Listo para Imprenta & Redes
                  </h5>
                  <p className="text-[11px] text-[#ffffff6b] mb-4">
                    Flyers CMYK en PDF de alta resolución, logos en vector y tipografías.
                  </p>
                </div>
                <div className="pt-2 border-t border-white/5">
                  <div className="w-full py-1.5 rounded-xl bg-[#222222] text-white text-xs font-medium flex items-center justify-center gap-1.5">
                    <FolderDown className="w-3.5 h-3.5 text-white/70" />
                    <span>Acceder a Descargas</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECCIÓN PORTAFOLIO (Entregables y Transformaciones Reales)                */}
      {/* ========================================================================= */}
      <section id="proyectos" className="relative z-10 scroll-mt-28 py-20 px-4 sm:px-6 lg:px-8 border-t border-white/10 bg-[#141413]">
        <div className="max-w-6xl mx-auto">
          
          <div className="flex flex-col items-center text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
              Casos Reales & Entregables de Alto Impacto
            </h2>
            <p className="text-sm text-[#ffffff6b] max-w-xl">
              Negocios gastronómicos, e-commerce y eventos que escalaron su presencia comercial con Brandex.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Caso 1: Gastronomía */}
            <div className="rounded-[24px] bg-[#181818] border border-white/10 p-6 flex flex-col justify-between">
              <div>
                <div className="h-36 rounded-2xl bg-[#202020] border border-white/10 flex flex-col items-center justify-center p-4 mb-5 text-center">
                  <Utensils className="w-7 h-7 text-white/70 mb-2" />
                  <span className="text-xs font-semibold text-white">Menú QR + Parrilla Reels 9:16</span>
                  <span className="text-[10px] text-white/40 mt-0.5">Bistro 24 Gourmet</span>
                </div>
                <span className="text-[11px] text-white/50 font-semibold uppercase tracking-wider block mb-1">
                  Gastronomía & Restaurantes
                </span>
                <h4 className="text-base font-bold text-white mb-2">
                  Transformación Digital de Carta & Experiencia en Mesa
                </h4>
                <p className="text-xs text-[#ffffff6b] leading-relaxed mb-4">
                  Digitalizamos la carta completa con menú interactivo QR de alta velocidad y producimos contenido de video semanal enfocado en el plato insignia.
                </p>
              </div>
              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                <span className="text-white/60">Ticket Promedio:</span>
                <span className="text-emerald-400 font-bold">+35% en 30 días</span>
              </div>
            </div>

            {/* Caso 2: E-Commerce */}
            <div className="rounded-[24px] bg-[#181818] border border-white/10 p-6 flex flex-col justify-between">
              <div>
                <div className="h-36 rounded-2xl bg-[#202020] border border-white/10 flex flex-col items-center justify-center p-4 mb-5 text-center">
                  <Globe className="w-7 h-7 text-white/70 mb-2" />
                  <span className="text-xs font-semibold text-white">Web Next.js + Meta Ads</span>
                  <span className="text-[10px] text-white/40 mt-0.5">Lumina Fashion Brand</span>
                </div>
                <span className="text-[11px] text-white/50 font-semibold uppercase tracking-wider block mb-1">
                  Moda & E-Commerce
                </span>
                <h4 className="text-base font-bold text-white mb-2">
                  Tienda Online Ultrarrápida & Pauta de Ventas
                </h4>
                <p className="text-xs text-[#ffffff6b] leading-relaxed mb-4">
                  Desarrollo de e-commerce con carga instantánea (&lt;0.8s), catálogo de productos sincronizado y estrategia de pauta Meta Ads orientada a conversión.
                </p>
              </div>
              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                <span className="text-white/60">Retorno Publicitario:</span>
                <span className="text-emerald-400 font-bold">4.8x ROAS Mensual</span>
              </div>
            </div>

            {/* Caso 3: Eventos */}
            <div className="rounded-[24px] bg-[#181818] border border-white/10 p-6 flex flex-col justify-between">
              <div>
                <div className="h-36 rounded-2xl bg-[#202020] border border-white/10 flex flex-col items-center justify-center p-4 mb-5 text-center">
                  <Palette className="w-7 h-7 text-white/70 mb-2" />
                  <span className="text-xs font-semibold text-white">Flyers CMYK + Campaña 360°</span>
                  <span className="text-[10px] text-white/40 mt-0.5">Sunset Beats Festival</span>
                </div>
                <span className="text-[11px] text-white/50 font-semibold uppercase tracking-wider block mb-1">
                  Eventos Masivos & Entretenimiento
                </span>
                <h4 className="text-base font-bold text-white mb-2">
                  Branding Integral, Cartelería & Pauta Hiperlocal
                </h4>
                <p className="text-xs text-[#ffffff6b] leading-relaxed mb-4">
                  Diseño de carteles impresos de gran formato, flyers para redes y campaña pagada con segmentación hiperlocal para venta de entradas.
                </p>
              </div>
              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                <span className="text-white/60">Venta de Boletos:</span>
                <span className="text-emerald-400 font-bold">Sold Out en 72 Horas</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECCIÓN NOSOTROS (El Manifiesto Brandex - Anti-Burocracia de Agencia)      */}
      {/* ========================================================================= */}
      <section id="nosotros" className="relative z-10 scroll-mt-28 py-20 px-4 sm:px-6 lg:px-8 border-t border-white/10 bg-[#181817]">
        <div className="max-w-5xl mx-auto rounded-[28px] bg-[#1f1f1f] border border-white/10 p-8 sm:p-14">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white mb-5 leading-tight">
              Creemos que las agencias tradicionales están rotas.
              <br />
              Por eso construimos Brandex.
            </h2>

            <p className="text-xs sm:text-sm text-[#ffffff80] leading-relaxed mb-8">
              Reuniones de dos horas que pudieron ser un mensaje, cobros por adelantado sin saber qué día recibirás tu material y semanas de silencio total. En Brandex operamos con mentalidad de software: entregables atómicos, comunicación directa, cumplimiento estricto de fechas y un sistema propio que garantiza que tu marca nunca detenga su crecimiento.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full pt-4 border-t border-white/10">
              <div className="p-4 rounded-2xl bg-white/[0.025] border border-white/10 text-center">
                <span className="text-2xl font-bold text-white block">+150</span>
                <span className="text-xs text-[#ffffff6b]">Proyectos Entregados</span>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.025] border border-white/10 text-center">
                <span className="text-2xl font-bold text-white block">100%</span>
                <span className="text-xs text-[#ffffff6b]">Entregas a Tiempo</span>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.025] border border-white/10 text-center">
                <span className="text-2xl font-bold text-white block">0 Fricción</span>
                <span className="text-xs text-[#ffffff6b]">Supervisión en tu Portal</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECCIÓN CONTACTO (Limpia, Sin Iconos Discordantes Arriba)                 */}
      {/* ========================================================================= */}
      <section id="contacto" className="relative z-10 scroll-mt-28 py-24 px-4 sm:px-6 lg:px-8 border-t border-white/10 bg-[#141413] text-center">
        <div className="max-w-3xl mx-auto flex flex-col items-center">
          
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
            ¿Listo para llevar tu marca al siguiente nivel?
          </h2>

          <p className="text-sm sm:text-base text-[#ffffff6b] max-w-xl mb-10 leading-relaxed">
            Cuéntanos qué necesitas y construyamos juntos una propuesta personalizada con entregables claros y fechas garantizadas.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={handleOpenQuote}
              className="px-8 py-3.5 rounded-full bg-white text-black font-bold text-sm hover:bg-white/90 hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5 shadow-xl shadow-black/40 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-black fill-black" />
              <span>Solicitar Cotización Inmediata</span>
            </button>
          </div>

          <div className="mt-8">
            <button
              type="button"
              onClick={handleOpenLogin}
              className="text-xs text-white/40 hover:text-white/80 transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>¿Ya eres cliente o colaborador? Acceder a Taski</span>
            </button>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* PIE DE PÁGINA (FOOTER)                                                   */}
      {/* ========================================================================= */}
      <footer className="relative z-10 px-6 sm:px-10 py-8 border-t border-white/10 bg-[#181817] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#ffffff50] w-full">
        <div className="flex items-center gap-3">
          <Image
            src="/brandex-logo.svg"
            alt="Brandex"
            width={100}
            height={22}
            className="object-contain h-5 w-auto opacity-70"
          />
          <span>•</span>
          <span>Marketing, Redes, Webs & Menús QR</span>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={() => scrollToSection("servicios")}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Servicios
          </button>
          <button
            onClick={() => scrollToSection("experiencia-taski")}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Experiencia Taski
          </button>
          <button
            onClick={() => scrollToSection("proyectos")}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Portafolio
          </button>
          <button
            onClick={() => scrollToSection("nosotros")}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Nosotros
          </button>
          <button
            onClick={handleOpenLogin}
            className="text-white hover:underline cursor-pointer font-medium"
          >
            Portal Clientes
          </button>
        </div>

        <p className="text-[11px] text-white/40">
          © {new Date().getFullYear()} Brandex. Todos los derechos reservados.
        </p>
      </footer>

      {/* GRADUAL BLUR INFERIOR (Efecto difuminado progresivo al scrollear la página) */}
      <GradualBlur
        target="page"
        position="bottom"
        height="8rem"
        strength={2.5}
        divCount={6}
        curve="bezier"
        responsive={true}
        mobileHeight="5rem"
        tabletHeight="6.5rem"
        desktopHeight="8rem"
        style={{ zIndex: 30 }}
      />

      {/* MODAL DE LOGIN TASKI (OTP 6 Dígitos) */}
      <TaskiLoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
      />

      {/* MODAL DE COTIZACIÓN PASO A PASO */}
      <QuoteModal
        isOpen={isQuoteOpen}
        onClose={() => setIsQuoteOpen(false)}
      />
    </div>
  );
}
