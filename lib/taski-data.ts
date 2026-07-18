// ─────────────────────────────────────────────────────────────────────────────
//  Brandex Master Data — Ported from Command Center v2
// ─────────────────────────────────────────────────────────────────────────────

export interface Package {
  id: string;
  icon: string;
  name: string;
  tag: string;
  tagColor: string;
  price: number;
  priceBefore: number;
  carruseles: number;
  posts: number;
  reels: number;
  totalPiezas: number;
  historias: string;
  memes: number;
  trends: number;
  costoSolo: number;
  costoColab: number;
  margen: number;
  tiempoTuyo: string;
  fotoIncluida: boolean;
  fotoTipo?: string;
  servicios: string[];
  noServicios: string[];
  mixRows: { label: string; quien: string; costo: number; tuyo: boolean }[];
  weeks: { i: string; t: string; by: string }[][];
}

export const PACKAGES: Record<string, Package> = {
  impulso: {
    id: "impulso", icon: "🚀", name: "Impulso", tag: "Económico", tagColor: "#f0a030",
    price: 1200, priceBefore: 1800, carruseles: 2, posts: 6, reels: 2, totalPiezas: 10,
    historias: "3–5/sem", memes: 1, trends: 1,
    costoSolo: 0, costoColab: 420, margen: 65, tiempoTuyo: "6–8h",
    fotoIncluida: false,
    servicios: ["Copywriting incluido", "Calendario de contenido", "1 meme o trend/mes"],
    noServicios: ["Estrategia de marca", "Fotografía profesional", "Reportes de métricas"],
    mixRows: [
      { label: "6 Posts", quien: "Diseñador $70×6", costo: 420, tuyo: false },
      { label: "2 Carruseles", quien: "Tú (Canva)", costo: 0, tuyo: true },
      { label: "2 Reels", quien: "Tú (CapCut)", costo: 0, tuyo: true },
      { label: "Estrategia", quien: "Tú (IA)", costo: 0, tuyo: true },
    ],
    weeks: [
      [{ i: "🎠", t: "Carrusel educativo", by: "Diseñador" }, { i: "🖼", t: "Post de diseño", by: "Diseñador" }, { i: "🤳", t: "2–3 Historias", by: "Mix" }],
      [{ i: "🎬", t: "Reel básico", by: "Tú" }, { i: "🖼", t: "Post de diseño", by: "Diseñador" }, { i: "😂", t: "Meme/trend", by: "Mix" }, { i: "🤳", t: "2 Historias CTA", by: "Mix" }],
      [{ i: "🎠", t: "Carrusel promo", by: "Diseñador" }, { i: "🖼", t: "2 Posts diseño", by: "Diseñador" }, { i: "🤳", t: "3 Historias", by: "Mix" }],
      [{ i: "🖼", t: "2 Posts diseño", by: "Diseñador" }, { i: "🎬", t: "Reel espontáneo", by: "Tú" }, { i: "🤳", t: "2–3 Historias", by: "Mix" }],
    ],
  },
  estandar: {
    id: "estandar", icon: "📦", name: "Estándar", tag: "Más popular", tagColor: "#4dd9ff",
    price: 2500, priceBefore: 4200, carruseles: 4, posts: 8, reels: 4, totalPiezas: 16,
    historias: "8/sem", memes: 2, trends: 2,
    costoSolo: 0, costoColab: 1180, margen: 53, tiempoTuyo: "4–5h",
    fotoIncluida: false,
    servicios: ["Copywriting incluido", "Calendario de contenido", "Estrategia de marca básica", "2 memes o trends/mes", "Reporte mensual de métricas"],
    noServicios: ["Fotografía (add-on +$1,500/bimestral)"],
    mixRows: [
      { label: "8 Posts", quien: "Diseñador $70×8", costo: 560, tuyo: false },
      { label: "4 Carruseles", quien: "2 Diseñador + 2 Tú", costo: 300, tuyo: false },
      { label: "4 Reels", quien: "2 Tú + 2 Editor", costo: 320, tuyo: false },
      { label: "Estrategia", quien: "Tú (IA)", costo: 0, tuyo: true },
    ],
    weeks: [
      [{ i: "🎬", t: "Reel educativo", by: "Editor" }, { i: "🎠", t: "Carrusel educativo", by: "Diseñador" }, { i: "🖼", t: "Post de diseño", by: "Diseñador" }, { i: "🤳", t: "3–4 Historias", by: "Mix" }],
      [{ i: "🖼", t: "2 Posts diseño", by: "Diseñador" }, { i: "🎬", t: "Reel BTS/trend", by: "Editor" }, { i: "😂", t: "Meme diseño", by: "Diseñador" }, { i: "🤳", t: "4 Historias", by: "Mix" }],
      [{ i: "🎠", t: "Carrusel autoridad", by: "Diseñador" }, { i: "🖼", t: "2 Posts diseño", by: "Diseñador" }, { i: "🎬", t: "Reel comercial", by: "Editor" }, { i: "🤳", t: "3–4 Historias", by: "Mix" }],
      [{ i: "🎠", t: "Carrusel promo", by: "Diseñador" }, { i: "🖼", t: "2 Posts diseño", by: "Diseñador" }, { i: "🎬", t: "Trend guiado", by: "Cliente+Editor" }, { i: "😂", t: "Espontáneo", by: "Mix" }, { i: "🤳", t: "3 Historias recap", by: "Mix" }],
    ],
  },
  pro: {
    id: "pro", icon: "⭐", name: "Pro", tag: "Recomendado", tagColor: "#5dde8a",
    price: 4500, priceBefore: 7200, carruseles: 4, posts: 12, reels: 6, totalPiezas: 22,
    historias: "Ilimitadas", memes: 3, trends: 3,
    costoSolo: 0, costoColab: 1860, margen: 59, tiempoTuyo: "3–4h",
    fotoIncluida: true, fotoTipo: "Sesión Completa bimestral",
    servicios: ["Copywriting incluido", "Calendario de contenido", "Estrategia de marca completa", "Sesión fotográfica bimestral", "3–4 memes, trends y espontáneo/mes", "Diseño de logo (1 propuesta)", "Reporte quincenal", "Gestión de comunidad básica"],
    noServicios: [],
    mixRows: [
      { label: "12 Posts", quien: "Diseñador $70×12", costo: 840, tuyo: false },
      { label: "4 Carruseles", quien: "Diseñador $150×4", costo: 600, tuyo: false },
      { label: "6 Reels", quien: "2 Tú + 4 Editor $100×4", costo: 420, tuyo: false },
      { label: "Estrategia", quien: "Tú (IA)", costo: 0, tuyo: true },
    ],
    weeks: [
      [{ i: "🎬", t: "Reel foto — Producto", by: "Editor" }, { i: "🎠", t: "Carrusel educativo", by: "Diseñador" }, { i: "📸", t: "Post fotográfico", by: "Sesión" }, { i: "🖼", t: "Post híbrido", by: "Foto+diseño" }, { i: "🤳", t: "Stories ilimitadas", by: "Mix" }],
      [{ i: "🎬", t: "Reel BTS sesión", by: "Editor" }, { i: "📸", t: "2 Posts foto", by: "Sesión" }, { i: "🖼", t: "2 Posts diseño", by: "Diseñador" }, { i: "😂", t: "Meme + trend", by: "Mix" }, { i: "🤳", t: "Stories activas", by: "Mix" }],
      [{ i: "🎠", t: "Carrusel autoridad", by: "Diseñador" }, { i: "🎬", t: "Reel factor humano", by: "Editor" }, { i: "📸", t: "Post fotográfico", by: "Sesión" }, { i: "🖼", t: "Post híbrido", by: "Foto+diseño" }, { i: "🤳", t: "Stories CTA", by: "Mix" }],
      [{ i: "🎬", t: "Trend guiado", by: "Cliente+Editor" }, { i: "🎠", t: "Carrusel promo", by: "Diseñador" }, { i: "📸", t: "Post fotográfico", by: "Sesión" }, { i: "🖼", t: "2 Posts diseño", by: "Diseñador" }, { i: "😂", t: "Espontáneo/meme", by: "Mix" }, { i: "🤳", t: "Stories cierre", by: "Mix" }],
    ],
  },
  premium: {
    id: "premium", icon: "💎", name: "Premium", tag: "Todo incluido", tagColor: "#c080ff",
    price: 6500, priceBefore: 10000, carruseles: 6, posts: 14, reels: 8, totalPiezas: 28,
    historias: "Ilimitadas", memes: 4, trends: 4,
    costoSolo: 0, costoColab: 2660, margen: 59, tiempoTuyo: "2–3h",
    fotoIncluida: true, fotoTipo: "Sesión Completa mensual",
    servicios: ["Copywriting incluido", "Calendario de contenido", "Estrategia de marca premium", "Sesión fotográfica mensual", "5–6 memes, trends y espontáneo/mes", "Logo + branding completo", "Reportes semanales + análisis", "Gestión de comunidad full"],
    noServicios: [],
    mixRows: [
      { label: "14 Posts", quien: "Diseñador $70×14", costo: 980, tuyo: false },
      { label: "6 Carruseles", quien: "Diseñador $150×6", costo: 900, tuyo: false },
      { label: "8 Reels", quien: "2 Tú + 6 Editor $130×6", costo: 780, tuyo: false },
      { label: "Estrategia", quien: "Tú (IA)", costo: 0, tuyo: true },
    ],
    weeks: [
      [{ i: "🎬", t: "Reel fotográfico", by: "Editor" }, { i: "🎠", t: "Carrusel educativo", by: "Diseñador" }, { i: "📸", t: "2 Posts foto", by: "Sesión" }, { i: "🖼", t: "Post híbrido", by: "Foto+diseño" }, { i: "🤳", t: "Stories diarias", by: "Mix" }],
      [{ i: "🎬", t: "Reel BTS", by: "Editor" }, { i: "🎬", t: "Trend guiado", by: "Cliente+Editor" }, { i: "📸", t: "2 Posts foto", by: "Sesión" }, { i: "🖼", t: "2 Posts diseño", by: "Diseñador" }, { i: "😂", t: "Meme + espontáneo", by: "Mix" }, { i: "🤳", t: "Stories activas", by: "Mix" }],
      [{ i: "🎠", t: "2 Carruseles", by: "Diseñador" }, { i: "🎬", t: "Reel factor humano", by: "Editor" }, { i: "📸", t: "2 Posts foto", by: "Sesión" }, { i: "🖼", t: "Post híbrido", by: "Foto+diseño" }, { i: "😂", t: "Trend guiado", by: "Cliente+Editor" }, { i: "🤳", t: "Stories CTA", by: "Mix" }],
      [{ i: "🎬", t: "2 Reels comerciales", by: "Editor" }, { i: "🎠", t: "Carrusel promo", by: "Diseñador" }, { i: "📸", t: "2 Posts foto", by: "Sesión" }, { i: "🖼", t: "2 Posts diseño", by: "Diseñador" }, { i: "😂", t: "Meme + espontáneo", by: "Mix" }, { i: "🤳", t: "Stories cierre", by: "Mix" }],
    ],
  },
};

export const CONTRACTS = [
  { id: "mensual", label: "Mensual", desc: "Sin contrato", discount: 0 },
  { id: "trimestral", label: "3 Meses", desc: "~10% descuento", discount: 0.10 },
  { id: "semestral", label: "6 Meses", desc: "~18% descuento", discount: 0.18 },
  { id: "anual", label: "12 Meses", desc: "~30% descuento", discount: 0.30 },
];

export const PHOTO_SESSIONS = [
  { id: "none", name: "Sin sesión fotográfica", duration: "", cost: 0, costFotografo: 0, fotos: "0", clips: "0", cats: 0 },
  { id: "express", name: "Sesión Express", duration: "1–2h", cost: 1350, costFotografo: 750, fotos: "20–35", clips: "5–8", cats: 3 },
  { id: "completa", name: "Sesión Completa", duration: "3–4h", cost: 2500, costFotografo: 1600, fotos: "50–70", clips: "12–18", cats: 6 },
  { id: "dia", name: "Día de Producción", duration: "6–8h", cost: 4500, costFotografo: 3200, fotos: "80–120", clips: "20–30", cats: 6 },
];

export const BIZ_TYPES = [
  { id: "general", label: "General / Otro" },
  { id: "cafe", label: "Cafetería / Brunch" },
  { id: "restaurante", label: "Restaurante" },
  { id: "barberia", label: "Barbería" },
  { id: "llantas", label: "Llantas / Auto" },
  { id: "ropa", label: "Ropa / Moda" },
];
