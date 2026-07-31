export type ProporcionFormat = '9:16' | '4:5' | '1:1' | '16:9';
export type TipoMedioFormat = 'video' | 'imagen' | 'carrusel' | 'texto';

export interface FormatoConfig {
  key: string;
  nombre: string;
  proporcion: ProporcionFormat;
  tipo_medio: TipoMedioFormat;
  icono: string;
}

export const FORMATOS_ESTANDAR: Record<string, FormatoConfig> = {
  reel: {
    key: "reel",
    nombre: "Reel",
    proporcion: "9:16",
    tipo_medio: "video",
    icono: "play",
  },
  story: {
    key: "story",
    nombre: "Story",
    proporcion: "9:16",
    tipo_medio: "video",
    icono: "play",
  },
  story_imagen: {
    key: "story_imagen",
    nombre: "Story Imagen",
    proporcion: "9:16",
    tipo_medio: "imagen",
    icono: "imagen",
  },
  post_imagen: {
    key: "post_imagen",
    nombre: "Post Imagen",
    proporcion: "1:1",
    tipo_medio: "imagen",
    icono: "imagen",
  },
  post_video: {
    key: "post_video",
    nombre: "Post Video",
    proporcion: "1:1",
    tipo_medio: "video",
    icono: "play",
  },
  carrusel: {
    key: "carrusel",
    nombre: "Carrusel",
    proporcion: "4:5",
    tipo_medio: "carrusel",
    icono: "carrusel",
  },
  video_horizontal: {
    key: "video_horizontal",
    nombre: "Video Horizontal",
    proporcion: "16:9",
    tipo_medio: "video",
    icono: "play",
  },
};

export const FORMATOS_CUSTOM: Record<string, FormatoConfig> = {};

export function getFormato(key?: string | null): FormatoConfig | null {
  if (!key) return null;
  let normalizedKey = key.trim().toLowerCase();
  
  // Normalización de plurales y sinónimos comunes
  if (normalizedKey === "reels") normalizedKey = "reel";
  if (
    normalizedKey === "story_imagen" ||
    normalizedKey === "story imagen" ||
    normalizedKey === "stories_imagen" ||
    normalizedKey === "stories imagen" ||
    normalizedKey === "story_img" ||
    normalizedKey === "story img" ||
    normalizedKey === "story_foto" ||
    normalizedKey === "story foto"
  ) {
    normalizedKey = "story_imagen";
  }
  if (normalizedKey === "stories" || normalizedKey === "story_video" || normalizedKey === "story video") normalizedKey = "story";
  if (normalizedKey === "posts") normalizedKey = "post_imagen";
  if (normalizedKey === "post") normalizedKey = "post_imagen";
  if (normalizedKey === "carruseles") normalizedKey = "carrusel";
  if (normalizedKey === "videos" || normalizedKey === "video") normalizedKey = "video_horizontal";
  
  if (FORMATOS_ESTANDAR[normalizedKey]) {
    return FORMATOS_ESTANDAR[normalizedKey];
  }
  
  if (FORMATOS_CUSTOM[normalizedKey]) {
    return FORMATOS_CUSTOM[normalizedKey];
  }
  
  // Direct matching fallback by key name if formatting differs
  const matchEst = Object.values(FORMATOS_ESTANDAR).find(
    f => f.key.toLowerCase() === normalizedKey || f.nombre.toLowerCase() === normalizedKey
  );
  if (matchEst) return matchEst;

  const matchCust = Object.values(FORMATOS_CUSTOM).find(
    f => f.key.toLowerCase() === normalizedKey || f.nombre.toLowerCase() === normalizedKey
  );
  if (matchCust) return matchCust;

  return null;
}

export function addCustomFormato(key: string, config: FormatoConfig): FormatoConfig {
  const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '_');
  const newConfig = { ...config, key: cleanKey };
  FORMATOS_CUSTOM[cleanKey] = newConfig;
  return newConfig;
}
