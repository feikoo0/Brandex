import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

const NOTION_VER = "2022-06-28";
const API_URL = "https://api.notion.com/v1";

const NOTION_TOKEN = process.env.NOTION_TOKEN || "";
const CLIENTES_DB = process.env.CLIENTES_DB || "";
const PROYECTOS_DB = process.env.PROYECTOS_DB || "";
const TAREAS_DB = process.env.TAREAS_DB || "";
const RECURSOS_DB = process.env.RECURSOS_DB || "";
const EQUIPO_DB = process.env.EQUIPO_DB || "";

// ── Notion Fetch Helper ──────────────────────────────────────────────────────
export async function notion(method: string, path: string, body?: any) {
  const url = `${API_URL}${path}`;
  console.log(`\n>>> NOTION SERVER REQ: ${method} ${url}`);

  const headers: Record<string, string> = {
    "Authorization": `Bearer ${NOTION_TOKEN}`,
    "Notion-Version": NOTION_VER,
    "Content-Type": "application/json"
  };

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    console.log(`<<< NOTION SERVER RES: ${res.status}`);

    if (!res.ok) {
      let errText = "";
      try {
        const errJson = await res.json();
        errText = errJson.message || errJson.error || JSON.stringify(errJson);
      } catch {
        errText = await res.text();
      }
      return { error: errText || `HTTP error ${res.status}` };
    }

    return await res.json();
  } catch (err: any) {
    console.error(`Notion request error:`, err);
    return { error: err.message || String(err) };
  }
}

// ── Query Database with Pagination ───────────────────────────────────────────
export async function queryDb(dbId: string, sorts?: any[]) {
  if (!dbId) {
    throw new Error("Database ID is not configured");
  }
  const pages: any[] = [];
  let cursor: string | undefined = undefined;

  while (true) {
    const body: any = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    if (sorts) body.sorts = sorts;

    const r = await notion("POST", `/databases/${dbId}/query`, body);
    if (r.error) {
      throw new Error(`Error querying database ${dbId}: ${r.error}`);
    }

    pages.push(...(r.results || []));
    if (!r.has_more) break;
    cursor = r.next_cursor;
  }
  return pages;
}

// ── Helper Utilities for Notion Properties ──────────────────────────────────
function txt(props: any, key: string): string {
  const v = props[key] || {};
  for (const t of ["title", "rich_text"] as const) {
    const lst = v[t];
    if (Array.isArray(lst) && lst.length > 0) {
      return lst[0].plain_text || lst[0].text?.content || "";
    }
  }
  return "";
}

function sel(props: any, key: string): string {
  const v = props[key] || {};
  const s = v.select || v.status;
  return s ? s.name || "" : "";
}

function msel(props: any, key: string): string[] {
  const v = props[key] || {};
  const list = v.multi_select || [];
  return list.map((x: any) => x.name || "");
}

function url_prop(props: any, key: string): string {
  const v = props[key] || {};
  return v.url || "";
}

function num_prop(props: any, key: string): number {
  const v = props[key] || {};
  return v.number || 0;
}

function date_prop(props: any, key: string): [string, string] {
  const d = props[key]?.date;
  return d ? [d.start || "", d.end || ""] : ["", ""];
}

function rels(props: any, key: string): string[] {
  const list = props[key]?.relation || [];
  const result: string[] = [];
  for (const r of list) {
    let rid = (r.id || "").replace(/-/g, "");
    if (rid.length === 32) {
      rid = `${rid.slice(0, 8)}-${rid.slice(8, 12)}-${rid.slice(12, 16)}-${rid.slice(16, 20)}-${rid.slice(20)}`;
    }
    if (rid) {
      result.push(rid);
    }
  }
  return result;
}

export function toUuid(s?: string): string {
  if (!s) return "";
  const clean = s.replace(/-/g, "");
  if (clean.length === 32) {
    return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
  }
  return s;
}

// ── Parsers ──────────────────────────────────────────────────────────────────
export function parseClient(p: any) {
  const props = p.properties || {};
  return {
    id:        p.id,
    nombre:    txt(props, "Nombre"),
    potencial: sel(props, "Potencial"),
    redes:     url_prop(props, "Redes"),
    fuente:    sel(props, "Fuente"),
    obs:       txt(props, "Observaciones"),
    token:     txt(props, "Token"),
    drive:     url_prop(props, "Drvie Cliente") || url_prop(props, "Drive Cliente"),
    instagram: url_prop(props, "Instagram"),
    facebook:  url_prop(props, "Facebook"),
    tiktok:    url_prop(props, "Tik Tok") || url_prop(props, "TikTok"),
    web:       url_prop(props, "Web"),
    whatsapp:  url_prop(props, "WhatsApp Link") || url_prop(props, "WhatsApp"),
    telefono:  props["Teléfono"]?.phone_number || props["Telefono"]?.phone_number || "",
    celular:   props["Celular"]?.phone_number || "",
    url:       p.url || ""
  };
}

export function parseProject(p: any) {
  const props = p.properties || {};
  const [fi, ff] = date_prop(props, "Fecha Proyecto");
  return {
    id:            p.id,
    nombre:        txt(props, "Nombre"),
    cliente_ids:   rels(props, "Cliente"),
    estadoProyecto:sel(props, "Estado Proyecto"),
    estado:        sel(props, "Estado"),
    area:          sel(props, "Área"),
    formato:       sel(props, "Formato"),
    prioridad:     sel(props, "Prioridad"),
    ciclo:         sel(props, "Ciclo"),
    esfuerzo:      sel(props, "Esfuerzo"),
    plataformas:   msel(props, "Plataformas"),
    fechaInicio:   fi,
    fechaFin:      ff,
    recursosDrive: url_prop(props, "Recursos DRIVE"),
    costo:         num_prop(props, "Costo del Proyecto") || num_prop(props, "Costo"),
    tarea_ids:     rels(props, "Tareas Proyecto"),
    descripcion:   txt(props, "Descripción proyecto") || txt(props, "Descripción") || txt(props, "Descripcion") || "",
    url:           p.url || ""
  };
}

export function parseTask(p: any) {
  const props = p.properties || {};
  const [fp] = date_prop(props, "Fecha programada");
  const [fe] = date_prop(props, "Fecha de Entrega");
  
  const proyecto_ids = rels(props, "Proyectos").length > 0 ? rels(props, "Proyectos") : rels(props, "Proyecto");
  const cliente_ids = rels(props, "Cliente").length > 0 ? rels(props, "Cliente") : rels(props, "Clientes");

  return {
    id:           p.id,
    titulo:       txt(props, "Titulo/Idea"),
    estado:       sel(props, "Estado"),
    area:         sel(props, "Área"),
    asignado:     sel(props, "Asignado a"),
    asignado_ids: rels(props, "Trabajador"),
    formato:      sel(props, "Formato"),
    esfuerzo:     sel(props, "Esfuerzo"),
    prioridad:    sel(props, "Prioridad"),
    plataformas:  msel(props, "Plataformas"),
    contenido:    txt(props, "Contenido"),
    copy:         txt(props, "Copy"),
    adminNotes:   txt(props, "Notas Admin"),
    notasCliente: txt(props, "Notas Cliente"),
    fechaProg:    fp,
    fechaEntrega: fe,
    proyecto_ids,
    cliente_ids,
    created:      p.created_time || "",
    url:          p.url || ""
  };
}

export function parseWorker(p: any) {
  const props = p.properties || {};
  const nombre = txt(props, "Nombre") || txt(props, "Name") || "Sin nombre";
  return {
    id:             p.id,
    nombre,
    rol:            sel(props, "Rol") || sel(props, "Role") || "",
    disponibilidad: sel(props, "Disponibilidad") || "",
    tarifa:         num_prop(props, "Tarifa") || num_prop(props, "Tarifa/hora") || 0,
    especialidad:   msel(props, "Especialidad") || msel(props, "Skills") || [],
    email:          props["Email"]?.email || "",
    telefono:       props["Teléfono"]?.phone_number || props["Telefono"]?.phone_number || "",
    contrato:       sel(props, "Tipo Contrato") || "",
    portfolio:      url_prop(props, "Portfolio") || "",
    notas:          txt(props, "Notas") || txt(props, "Observaciones") || "",
    token:          txt(props, "Token Equipo") || txt(props, "Token") || "",
    url:            p.url || "",
    created:        p.created_time || ""
  };
}

export function parseRecurso(p: any) {
  const props = p.properties || {};
  const nombre = txt(props, "Nombre") || txt(props, "Name") || txt(props, "Titulo") || "Sin título";
  const tipo = sel(props, "Tipo") || sel(props, "Categoría") || sel(props, "Categoria") || "";
  const enlace = url_prop(props, "URL") || url_prop(props, "Enlace") || url_prop(props, "Link") || p.url || "";
  const desc = txt(props, "Descripción") || txt(props, "Descripcion") || txt(props, "Notas") || "";
  return {
    id:      p.id,
    nombre,
    tipo,
    enlace,
    desc,
    url:     p.url || "",
    created: p.created_time || ""
  };
}

// ── Property Builders ────────────────────────────────────────────────────────
function _pick(d: any, singular: string, plural: string): string | null {
  const v = d[singular] || "";
  if (!v) {
    const arr = d[plural] || [];
    const val = arr[0] || "";
    return val || null;
  }
  return v || null;
}

function _task_safe_props(d: any) {
  const p: any = {
    "Titulo/Idea": { title: [{ text: { content: d.titulo || "Nueva Tarea" } }] }
  };
  if (d.contenido) {
    p["Contenido"] = { rich_text: [{ text: { content: d.contenido } }] };
  }
  if (d.fechaEntrega) {
    p["Fecha de Entrega"] = { date: { start: d.fechaEntrega } };
  }
  if (d.fechaProg) {
    p["Fecha programada"] = { date: { start: d.fechaProg } };
  }
  
  const pid = toUuid(_pick(d, "proyecto_id", "proyecto_ids") || "");
  if (pid) {
    p["Proyectos"] = { relation: [{ id: pid }] };
  }
  
  const cid = toUuid(_pick(d, "cliente_id", "cliente_ids") || "");
  if (cid) {
    p["Cliente"] = { relation: [{ id: cid }] };
  }
  
  const aids = d.asignado_ids || [];
  if (aids.length > 0) {
    p["Trabajador"] = { relation: aids.map((aid: string) => ({ id: toUuid(aid) })) };
  }
  return p;
}

export function buildTaskProps(d: any, choice_type = "status") {
  const p = _task_safe_props(d);
  if (d.estado) {
    p["Estado"] = { [choice_type]: { name: d.estado } };
  }
  
  const CHOICE_FIELDS = [
    ["area", "Área"],
    ["formato", "Formato"],
    ["esfuerzo", "Esfuerzo"],
    ["prioridad", "Prioridad"]
  ];
  for (const [key, prop] of CHOICE_FIELDS) {
    if (d[key]) {
      p[prop] = { [choice_type]: { name: d[key] } };
    }
  }
  
  if (d.asignado) {
    p["Asignado a"] = { select: { name: d.asignado } };
  }
  if (d.plataformas) {
    p["Plataformas"] = { multi_select: d.plataformas.map((x: string) => ({ name: x })) };
  }
  return p;
}

export function buildWorkerProps(d: any) {
  const p: any = {
    "Nombre": { title: [{ text: { content: d.nombre || "Nuevo Trabajador" } }] }
  };
  if (d.rol) {
    p["Rol"] = { select: { name: d.rol } };
  }
  if (d.disponibilidad) {
    p["Disponibilidad"] = { select: { name: d.disponibilidad } };
  }
  if (d.tarifa !== undefined) {
    try {
      p["Tarifa"] = { number: parseFloat(d.tarifa) };
    } catch {}
  }
  if (d.contrato) {
    p["Tipo Contrato"] = { select: { name: d.contrato } };
  }
  if (d.especialidad) {
    p["Especialidad"] = { multi_select: d.especialidad.map((x: string) => ({ name: x })) };
  }
  if (d.notas) {
    p["Notas"] = { rich_text: [{ text: { content: d.notas } }] };
  }
  if (d.portfolio) {
    p["Portfolio"] = { url: d.portfolio };
  }
  return p;
}

function _proj_safe_props(d: any) {
  const p: any = {};
  if (d.nombre) {
    p["Nombre"] = { title: [{ text: { content: d.nombre } }] };
  }
  
  const cid = (toUuid(_pick(d, "cliente_id", "cliente_ids") || "")).replace(/-/g, "");
  if (cid.length >= 32) {
    p["Cliente"] = { relation: [{ id: cid }] };
  }
  
  if (d.recursosDrive) {
    p["Recursos DRIVE"] = { url: d.recursosDrive };
  }
  
  if (d.costo !== undefined) {
    try {
      p["Costo del Proyecto"] = { number: parseFloat(d.costo) };
    } catch {}
  }
  
  const fi = (d.fechaInicio || "").trim();
  const ff = (d.fechaFin || "").trim();
  if (fi || ff) {
    p["Fecha Proyecto"] = { date: { start: fi || ff, end: ff || null } };
  }
  
  if (d.descripcion) {
    p["Descripción proyecto"] = { rich_text: [{ text: { content: d.descripcion } }] };
  }
  return p;
}

function _proj_choice_props(d: any, choice_type = "status") {
  const p: any = {};
  if (d.estadoProyecto) {
    p["Estado Proyecto"] = { select: { name: d.estadoProyecto } };
  }
  
  const CHOICE_FIELDS = [
    ["prioridad", "Prioridad"],
    ["area", "Área"],
    ["formato", "Formato"],
    ["ciclo", "Ciclo"],
    ["estado", "Estado"],
    ["esfuerzo", "Esfuerzo"]
  ];
  for (const [key, prop] of CHOICE_FIELDS) {
    if (d[key]) {
      p[prop] = { [choice_type]: { name: d[key] } };
    }
  }
  
  if (d.plataformas) {
    p["Plataformas"] = { multi_select: d.plataformas.filter(Boolean).map((x: string) => ({ name: x })) };
  }
  return p;
}

export function buildProjProps(d: any, choice_type = "status") {
  const p = _proj_safe_props(d);
  Object.assign(p, _proj_choice_props(d, choice_type));
  return p;
}

export function buildTaskUpdateProps(data: any, choice_type = "status") {
  const props: any = {};
  if (data.titulo) {
    props["Titulo/Idea"] = { title: [{ text: { content: data.titulo } }] };
  }
  if (data.estado) {
    props["Estado"] = { [choice_type]: { name: data.estado } };
  }
  
  const CHOICE_FIELDS = [
    ["prioridad", "Prioridad"],
    ["formato", "Formato"],
    ["area", "Área"],
    ["esfuerzo", "Esfuerzo"]
  ];
  for (const [key, prop] of CHOICE_FIELDS) {
    if (key in data && data[key]) {
      props[prop] = { [choice_type]: { name: data[key] } };
    }
  }
  
  if ("asignado" in data) {
    props["Asignado a"] = data.asignado ? { select: { name: data.asignado } } : { select: null };
  }
  if ("contenido" in data) {
    props["Contenido"] = { rich_text: [{ text: { content: data.contenido } }] };
  }
  if ("admin_notes" in data) {
    props["Notas Admin"] = { rich_text: [{ text: { content: data.admin_notes } }] };
  }
  if ("notasCliente" in data) {
    props["Notas Cliente"] = { rich_text: [{ text: { content: data.notasCliente } }] };
  }
  
  if (data.fechaProg) {
    props["Fecha programada"] = { date: { start: data.fechaProg } };
  }
  if (data.fechaEntrega) {
    props["Fecha de Entrega"] = { date: { start: data.fechaEntrega } };
  }
  
  if ("proyecto_ids" in data || "proyecto_id" in data) {
    const pid = toUuid(_pick(data, "proyecto_id", "proyecto_ids") || "");
    props["Proyectos"] = { relation: pid ? [{ id: pid }] : [] };
  }
  if ("cliente_ids" in data || "cliente_id" in data) {
    const cid = toUuid(_pick(data, "cliente_id", "cliente_ids") || "");
    props["Cliente"] = { relation: cid ? [{ id: cid }] : [] };
  }
  if ("asignado_ids" in data) {
    const aids = data.asignado_ids || [];
    props["Trabajador"] = { relation: aids.map((aid: string) => ({ id: toUuid(aid) })) };
  }
  return props;
}

// ── Firestore Cache Helpers ──────────────────────────────────────────────────
async function getCacheDoc(docName: string) {
  try {
    const docRef = doc(db, "notion_cache", docName);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data().data || null;
    }
  } catch (err) {
    console.error(`Error reading cache doc ${docName}:`, err);
  }
  return null;
}

async function setCacheDoc(docName: string, data: any) {
  try {
    const docRef = doc(db, "notion_cache", docName);
    await setDoc(docRef, {
      data,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error(`Error writing cache doc ${docName}:`, err);
  }
}

// Updates an item in the Firestore cache array immediately
export async function updateCachedItem(docName: string, id: string, fieldsToUpdate: any) {
  const currentData = await getCacheDoc(docName);
  if (Array.isArray(currentData)) {
    const updated = currentData.map((item: any) => {
      if (item.id === id) {
        return { ...item, ...fieldsToUpdate };
      }
      return item;
    });
    await setCacheDoc(docName, updated);
  }
}

// Appends an item to the Firestore cache array immediately
export async function addCachedItem(docName: string, newItem: any) {
  const currentData = await getCacheDoc(docName) || [];
  if (Array.isArray(currentData)) {
    await setCacheDoc(docName, [...currentData, newItem]);
  }
}

// ── Mock Fallback Data ────────────────────────────────────────────────────────
const MOCK_CLIENTES = [
  {
    id: "c1",
    nombre: "Café de Especialidad Esquina",
    potencial: "Alto",
    redes: "https://instagram.com/cafeesquina",
    fuente: "Instagram",
    obs: "Cliente interesado en expandir su marca con reels gastronómicos y contenido estético.",
    token: "TOK-CAF-01",
    drive: "https://drive.google.com/drive/folders/cafe",
    instagram: "https://instagram.com/cafeesquina",
    facebook: "https://facebook.com/cafeesquina",
    tiktok: "https://tiktok.com/@cafeesquina",
    web: "https://cafeesquina.com",
    whatsapp: "https://wa.me/521234567890",
    telefono: "+52 1 234 567 890",
    celular: "+52 1 234 567 890",
    url: ""
  },
  {
    id: "c2",
    nombre: "FitLife Gym & Studio",
    potencial: "Alto",
    redes: "https://instagram.com/fitlifegym",
    fuente: "Recomendación",
    obs: "Cadena de gimnasios boutique. Enfoque en captación de leads mediante desafíos de 30 días.",
    token: "TOK-FIT-02",
    drive: "https://drive.google.com/drive/folders/fitlife",
    instagram: "https://instagram.com/fitlifegym",
    facebook: "https://facebook.com/fitlifegym",
    tiktok: "https://tiktok.com/@fitlifegym",
    web: "https://fitlifegym.com",
    whatsapp: "https://wa.me/521234567891",
    telefono: "+52 1 234 567 891",
    celular: "+52 1 234 567 891",
    url: ""
  },
  {
    id: "c3",
    nombre: "Moda Atemporal Co.",
    potencial: "Medio",
    redes: "https://instagram.com/modatemporal",
    fuente: "Web",
    obs: "Tienda de ropa sustentable. Requiere fotografía minimalista de producto y carruseles informativos.",
    token: "TOK-MOD-03",
    drive: "https://drive.google.com/drive/folders/moda",
    instagram: "https://instagram.com/modatemporal",
    facebook: "",
    tiktok: "https://tiktok.com/@modatemporal",
    web: "https://modatemporal.co",
    whatsapp: "https://wa.me/521234567892",
    telefono: "+52 1 234 567 892",
    celular: "+52 1 234 567 892",
    url: ""
  }
];

const MOCK_PROYECTOS = [
  {
    id: "p1",
    nombre: "Campaña Brunch de Verano",
    cliente_ids: ["c1"],
    estadoProyecto: "Activo",
    estado: "En curso",
    area: "Social Media",
    formato: "Reels",
    prioridad: "Alta",
    ciclo: "Mensual",
    esfuerzo: "Medio",
    plataformas: ["Instagram", "TikTok"],
    fechaInicio: "2026-07-01",
    fechaFin: "2026-07-31",
    recursosDrive: "https://drive.google.com/drive/folders/cafe-brunch",
    costo: 1800,
    tarea_ids: ["t1", "t2"],
    descripcion: "Estrategia de posicionamiento de los nuevos desayunos fríos y postres frutales.",
    url: ""
  },
  {
    id: "p2",
    nombre: "Desafío Transformación 30 Días",
    cliente_ids: ["c2"],
    estadoProyecto: "Activo",
    estado: "En curso",
    area: "Social Media",
    formato: "Posts",
    prioridad: "Alta",
    ciclo: "Mensual",
    esfuerzo: "Alto",
    plataformas: ["Instagram", "Facebook"],
    fechaInicio: "2026-07-05",
    fechaFin: "2026-08-05",
    recursosDrive: "https://drive.google.com/drive/folders/fitlife-desafio",
    costo: 2500,
    tarea_ids: ["t3", "t4", "t5"],
    descripcion: "Campaña publicitaria orgánica para promover el programa de transformación de verano.",
    url: ""
  },
  {
    id: "p3",
    nombre: "Lanzamiento Colección Lino",
    cliente_ids: ["c3"],
    estadoProyecto: "Activo",
    estado: "Planificación",
    area: "Diseño",
    formato: "Branding",
    prioridad: "Media",
    ciclo: "Trimestral",
    esfuerzo: "Medio",
    plataformas: ["Instagram", "Web"],
    fechaInicio: "2026-07-15",
    fechaFin: "2026-08-15",
    recursosDrive: "https://drive.google.com/drive/folders/moda-lino",
    costo: 3500,
    tarea_ids: ["t6"],
    descripcion: "Sesión fotográfica de producto y diseño de catálogo digital para la nueva temporada.",
    url: ""
  }
];

const MOCK_TAREAS = [
  {
    id: "t1",
    titulo: "Planificar Guiones de Reels de Bebidas Frías",
    estado: "Pendiente",
    area: "Social Media",
    asignado: "Feiko de Jong",
    asignado_ids: ["w1"],
    formato: "Reels",
    esfuerzo: "Bajo",
    prioridad: "Alta",
    plataformas: ["Instagram", "TikTok"],
    contenido: "Escribir 3 guiones enfocados en el latte helado y el cold brew de coco.",
    copy: "El verano sabe mejor con un cold brew bien helado. 🥥☕ ¿Ya probaste nuestro cold brew de coco?",
    adminNotes: "Asegurar que se grabe con buena luz natural en la terraza.",
    notasCliente: "Por favor, destacar que usamos leche vegetal sin costo extra.",
    fechaProg: "2026-07-14",
    fechaEntrega: "2026-07-18",
    proyecto_ids: ["p1"],
    cliente_ids: ["c1"],
    created: "2026-07-13T10:00:00Z",
    url: ""
  },
  {
    id: "t2",
    titulo: "Edición de Video: Elaboración de Croissants",
    estado: "En Proceso",
    area: "Video",
    asignado: "Santiago Pérez",
    asignado_ids: ["w2"],
    formato: "Reels",
    esfuerzo: "Medio",
    prioridad: "Media",
    plataformas: ["Instagram"],
    contenido: "Video de ritmo rápido mostrando las capas del croissant al morderlo.",
    copy: "Capas de perfección crujiente recién salidas de nuestro horno. 🥐✨ Ven por el tuyo antes de que se acaben.",
    adminNotes: "Utilizar música en tendencia de estilo lofi acústico.",
    notasCliente: "",
    fechaProg: "2026-07-15",
    fechaEntrega: "2026-07-20",
    proyecto_ids: ["p1"],
    cliente_ids: ["c1"],
    created: "2026-07-13T11:00:00Z",
    url: ""
  },
  {
    id: "t3",
    titulo: "Diseñar Carrusel: 5 Errores Comunes al Entrenar",
    estado: "Completado",
    area: "Diseño",
    asignado: "Karla Mendoza",
    asignado_ids: ["w3"],
    formato: "Posts",
    esfuerzo: "Alto",
    prioridad: "Alta",
    plataformas: ["Instagram", "Facebook"],
    contenido: "Diseñar 6 slides educativos con contraste oscuro y tipografías grandes en negrita.",
    copy: "Evita estos 5 errores comunes para acelerar tus resultados. Guardar este post para tu próxima rutina. 💪🔥",
    adminNotes: "Mantener colores corporativos de FitLife: amarillo flúor y negro mate.",
    notasCliente: "El logo del gym debe estar en la última diapositiva.",
    fechaProg: "2026-07-10",
    fechaEntrega: "2026-07-13",
    proyecto_ids: ["p2"],
    cliente_ids: ["c2"],
    created: "2026-07-09T09:00:00Z",
    url: ""
  },
  {
    id: "t4",
    titulo: "Grabar Testimoniales de Alumnos Reales",
    estado: "Revisión",
    area: "Social Media",
    asignado: "Feiko de Jong",
    asignado_ids: ["w1"],
    formato: "Reels",
    esfuerzo: "Alto",
    prioridad: "Alta",
    plataformas: ["Instagram", "TikTok"],
    contenido: "Entrevistar a 3 alumnos que completaron el desafío anterior sobre su progreso.",
    copy: "La motivación te hace empezar, el hábito te mantiene. Escucha la historia de Sofía, Carlos y Ana. 🌟🏋️‍♂️",
    adminNotes: "Editar subtítulos llamativos con colores contrastantes.",
    notasCliente: "Muy buen video, se ve excelente.",
    fechaProg: "2026-07-12",
    fechaEntrega: "2026-07-16",
    proyecto_ids: ["p2"],
    cliente_ids: ["c2"],
    created: "2026-07-10T14:00:00Z",
    url: ""
  },
  {
    id: "t5",
    titulo: "Calendario de Stories Semanal - FitLife",
    estado: "En Proceso",
    area: "Social Media",
    asignado: "Santiago Pérez",
    asignado_ids: ["w2"],
    formato: "Posts",
    esfuerzo: "Bajo",
    prioridad: "Baja",
    plataformas: ["Instagram"],
    contenido: "Estructura diaria de historias: encuestas de hábitos, tips rápidos, y llamadas a la acción.",
    copy: "",
    adminNotes: "Configurar stickers interactivos en Instagram para fomentar respuestas.",
    notasCliente: "",
    fechaProg: "2026-07-14",
    fechaEntrega: "2026-07-15",
    proyecto_ids: ["p2"],
    cliente_ids: ["c2"],
    created: "2026-07-13T15:00:00Z",
    url: ""
  },
  {
    id: "t6",
    titulo: "Propuesta Estética Catálogo Digital Lino",
    estado: "Pendiente",
    area: "Diseño",
    asignado: "Karla Mendoza",
    asignado_ids: ["w3"],
    formato: "Branding",
    esfuerzo: "Medio",
    prioridad: "Media",
    plataformas: ["Instagram", "Web"],
    contenido: "Definición de paleta de colores (tonos tierra, beige, oliva) y retícula tipográfica.",
    copy: "",
    adminNotes: "Alinear con la identidad orgánica y minimalista de la marca.",
    notasCliente: "",
    fechaProg: "2026-07-16",
    fechaEntrega: "2026-07-22",
    proyecto_ids: ["p3"],
    cliente_ids: ["c3"],
    created: "2026-07-14T08:00:00Z",
    url: ""
  }
];

const MOCK_TRABAJADORES = [
  {
    id: "w1",
    nombre: "Feiko de Jong",
    rol: "Director Creativo",
    disponibilidad: "Completa",
    tarifa: 50,
    especialidad: ["Estrategia", "Copywriting", "Branding"],
    email: "feiko@brandex.co",
    telefono: "+52 1 55 1234 5678",
    contrato: "Socio",
    portfolio: "https://brandex.co/team/feiko",
    notas: "Coordinador de proyectos y contacto principal de clientes.",
    token: "TOK-FEI-01",
    url: "",
    created: "2026-07-01T00:00:00Z"
  },
  {
    id: "w2",
    nombre: "Santiago Pérez",
    rol: "Editor Audiovisual",
    disponibilidad: "Parcial",
    tarifa: 35,
    especialidad: ["Video", "TikTok", "Motion Graphics"],
    email: "santiago@brandex.co",
    telefono: "+52 1 55 8765 4321",
    contrato: "Freelance",
    portfolio: "https://brandex.co/team/santiago",
    notas: "Editor principal de Reels, TikToks y contenido interactivo de video.",
    token: "TOK-SAN-02",
    url: "",
    created: "2026-07-01T00:00:00Z"
  },
  {
    id: "w3",
    nombre: "Karla Mendoza",
    rol: "Diseñadora de Marca",
    disponibilidad: "Completa",
    tarifa: 40,
    especialidad: ["Diseño", "Branding", "Carruseles"],
    email: "karla@brandex.co",
    telefono: "+52 1 55 9876 5432",
    contrato: "Nómina",
    portfolio: "https://brandex.co/team/karla",
    notas: "Responsable de identidades visuales y post de alto impacto.",
    token: "TOK-KAR-03",
    url: "",
    created: "2026-07-01T00:00:00Z"
  }
];

const MOCK_RECURSOS = [
  {
    id: "r1",
    nombre: "Plantillas de CapCut Pro para Reels",
    tipo: "Herramienta",
    enlace: "https://capcut.com/brandex-templates",
    desc: "Plantillas prediseñadas con cortes sincronizados para videos de comida y lifestyle.",
    url: "",
    created: "2026-07-05T00:00:00Z"
  },
  {
    id: "r2",
    nombre: "Paletas de Color Orgánicas - Verano 2026",
    tipo: "Diseño",
    enlace: "https://coolors.co/brandex-summer",
    desc: "Códigos hexadecimales sugeridos para marcas sustentables y cafeterías.",
    url: "",
    created: "2026-07-08T00:00:00Z"
  },
  {
    id: "r3",
    nombre: "Kit de Tipografías Sans-Serif Elegantes",
    tipo: "Recurso",
    enlace: "https://fonts.google.com/specimen/Space+Grotesk",
    desc: "Enlace y pesos recomendados para cabeceras y display de alto contraste.",
    url: "",
    created: "2026-07-10T00:00:00Z"
  }
];

// ── Sync All Data (Firestore Direct, No Notion) ──────────────────────
export async function syncAllData(forceSync = false) {
  const [c, p, t, r, w] = await Promise.all([
    getCacheDoc("clientes"),
    getCacheDoc("proyectos"),
    getCacheDoc("tareas"),
    getCacheDoc("recursos"),
    getCacheDoc("trabajadores")
  ]);
  
  // If all exist in cache and have items, return them immediately
  if (c && p && t && r && w && (c.length > 0 || p.length > 0)) {
    console.log(">>> Syncing from Firestore Cache (Instant load)");
    return {
      clientes: c,
      proyectos: p,
      tareas: t,
      recursos: r,
      trabajadores: w
    };
  }

  console.log(">>> No cache exists. Writing premium mock data to Firestore Cache.");
  await Promise.all([
    setCacheDoc("clientes", MOCK_CLIENTES),
    setCacheDoc("proyectos", MOCK_PROYECTOS),
    setCacheDoc("tareas", MOCK_TAREAS),
    setCacheDoc("recursos", MOCK_RECURSOS),
    setCacheDoc("trabajadores", MOCK_TRABAJADORES)
  ]);

  return {
    clientes: MOCK_CLIENTES,
    proyectos: MOCK_PROYECTOS,
    tareas: MOCK_TAREAS,
    recursos: MOCK_RECURSOS,
    trabajadores: MOCK_TRABAJADORES
  };
}

// ── GET/POST Focus Configuration ─────────────────────────────────────────────
export async function getFocusConfig() {
  const docRef = doc(db, "notion_cache", "settings");
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data().focusPins || [];
    }
  } catch (err) {
    console.error("Error reading focus config:", err);
  }
  return [];
}

export async function setFocusConfig(focusPins: any[]) {
  const docRef = doc(db, "notion_cache", "settings");
  try {
    await setDoc(docRef, { focusPins }, { merge: true });
    return true;
  } catch (err) {
    console.error("Error writing focus config:", err);
    return false;
  }
}

// ── Direct Local CRUD Operations (Bypassing Notion entirely) ──────────────────

export function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function createLocalClient(data: any) {
  const newClient = {
    id: generateId(),
    nombre: data.nombre || "Nuevo Cliente",
    potencial: data.potencial || "Alto",
    redes: data.redes || "",
    fuente: data.fuente || "Instagram",
    obs: data.obs || "",
    token: data.token || `TOK-${(data.nombre || "CLI").slice(0, 3).toUpperCase()}-${Math.floor(Math.random() * 100)}`,
    drive: data.drive || "",
    instagram: data.instagram || "",
    facebook: data.facebook || "",
    tiktok: data.tiktok || "",
    web: data.web || "",
    whatsapp: data.whatsapp || "",
    telefono: data.telefono || "",
    celular: data.celular || "",
    url: ""
  };
  await addCachedItem("clientes", newClient);
  return newClient;
}

export async function updateLocalClient(id: string, data: any) {
  const fields: any = {};
  if ("nombre" in data) fields.nombre = data.nombre;
  if ("redes" in data) fields.redes = data.redes;
  if ("obs" in data) fields.obs = data.obs;
  if ("potencial" in data) fields.potencial = data.potencial;
  if ("fuente" in data) fields.fuente = data.fuente;
  if ("drive" in data) fields.drive = data.drive;
  if ("instagram" in data) fields.instagram = data.instagram;
  if ("facebook" in data) fields.facebook = data.facebook;
  if ("tiktok" in data) fields.tiktok = data.tiktok;
  if ("web" in data) fields.web = data.web;
  if ("whatsapp" in data) fields.whatsapp = data.whatsapp;
  if ("telefono" in data) fields.telefono = data.telefono;
  if ("celular" in data) fields.celular = data.celular;
  if ("token" in data) fields.token = data.token;

  await updateCachedItem("clientes", id, fields);
  return { id, ...fields };
}

export async function createLocalProject(data: any) {
  const newProj = {
    id: generateId(),
    nombre: data.nombre || "Nuevo Proyecto",
    cliente_ids: Array.isArray(data.cliente_ids) ? data.cliente_ids : (data.cliente_id ? [data.cliente_id] : []),
    estadoProyecto: data.estadoProyecto || "Activo",
    estado: data.estado || "En curso",
    area: data.area || "",
    formato: data.formato || "",
    prioridad: data.prioridad || "Media",
    ciclo: data.ciclo || "Mensual",
    esfuerzo: data.esfuerzo || "Medio",
    plataformas: Array.isArray(data.plataformas) ? data.plataformas : [],
    fechaInicio: data.fechaInicio || "",
    fechaFin: data.fechaFin || "",
    recursosDrive: data.recursosDrive || "",
    costo: parseFloat(data.costo) || 0,
    tarea_ids: Array.isArray(data.tarea_ids) ? data.tarea_ids : [],
    descripcion: data.descripcion || "",
    url: ""
  };
  await addCachedItem("proyectos", newProj);
  return newProj;
}

export async function updateLocalProject(id: string, data: any) {
  const fields: any = {};
  if ("nombre" in data) fields.nombre = data.nombre;
  if ("cliente_ids" in data) fields.cliente_ids = data.cliente_ids;
  else if ("cliente_id" in data) fields.cliente_ids = data.cliente_id ? [data.cliente_id] : [];
  if ("estadoProyecto" in data) fields.estadoProyecto = data.estadoProyecto;
  if ("estado" in data) fields.estado = data.estado;
  if ("area" in data) fields.area = data.area;
  if ("formato" in data) fields.formato = data.formato;
  if ("prioridad" in data) fields.prioridad = data.prioridad;
  if ("ciclo" in data) fields.ciclo = data.ciclo;
  if ("esfuerzo" in data) fields.esfuerzo = data.esfuerzo;
  if ("plataformas" in data) fields.plataformas = data.plataformas;
  if ("fechaInicio" in data) fields.fechaInicio = data.fechaInicio;
  if ("fechaFin" in data) fields.fechaFin = data.fechaFin;
  if ("recursosDrive" in data) fields.recursosDrive = data.recursosDrive;
  if ("costo" in data) fields.costo = parseFloat(data.costo) || 0;
  if ("tarea_ids" in data) fields.tarea_ids = data.tarea_ids;
  if ("descripcion" in data) fields.descripcion = data.descripcion;

  await updateCachedItem("proyectos", id, fields);
  return { id, ...fields };
}

export async function createLocalTask(data: any) {
  const pids = Array.isArray(data.proyecto_ids) ? data.proyecto_ids : (data.proyecto_id ? [data.proyecto_id] : []);
  const cids = Array.isArray(data.cliente_ids) ? data.cliente_ids : (data.cliente_id ? [data.cliente_id] : []);
  const taskId = generateId();

  const newTask = {
    id: taskId,
    titulo: data.titulo || "Nueva Tarea",
    estado: data.estado || "Pendiente",
    area: data.area || "",
    asignado: data.asignado || "",
    asignado_ids: Array.isArray(data.asignado_ids) ? data.asignado_ids : (data.asignado_id ? [data.asignado_id] : []),
    formato: data.formato || "",
    esfuerzo: data.esfuerzo || "Medio",
    prioridad: data.prioridad || "Media",
    plataformas: Array.isArray(data.plataformas) ? data.plataformas : [],
    contenido: data.contenido || "",
    copy: data.copy || "",
    adminNotes: data.adminNotes || data.admin_notes || "",
    notasCliente: data.notasCliente || "",
    fechaProg: data.fechaProg || "",
    fechaEntrega: data.fechaEntrega || "",
    proyecto_ids: pids,
    cliente_ids: cids,
    created: new Date().toISOString(),
    url: ""
  };
  await addCachedItem("tareas", newTask);

  // Link task inside project if project exists
  if (pids.length > 0) {
    for (const pid of pids) {
      const currentProjects = await getCacheDoc("proyectos") || [];
      const proj = currentProjects.find((p: any) => p.id === pid);
      if (proj) {
        const updatedTaskIds = Array.from(new Set([...(proj.tarea_ids || []), taskId]));
        await updateCachedItem("proyectos", pid, { tarea_ids: updatedTaskIds });
      }
    }
  }

  return newTask;
}

export async function updateLocalTask(id: string, data: any) {
  const fields: any = {};
  if ("titulo" in data) fields.titulo = data.titulo;
  if ("estado" in data) fields.estado = data.estado;
  if ("area" in data) fields.area = data.area;
  if ("asignado" in data) fields.asignado = data.asignado;
  if ("asignado_ids" in data) fields.asignado_ids = data.asignado_ids;
  if ("formato" in data) fields.formato = data.formato;
  if ("esfuerzo" in data) fields.esfuerzo = data.esfuerzo;
  if ("prioridad" in data) fields.prioridad = data.prioridad;
  if ("plataformas" in data) fields.plataformas = data.plataformas;
  if ("contenido" in data) fields.contenido = data.contenido;
  if ("copy" in data) fields.copy = data.copy;
  if ("adminNotes" in data) fields.adminNotes = data.adminNotes;
  if ("admin_notes" in data) fields.adminNotes = data.admin_notes;
  if ("notasCliente" in data) fields.notasCliente = data.notasCliente;
  if ("fechaProg" in data) fields.fechaProg = data.fechaProg;
  if ("fechaEntrega" in data) fields.fechaEntrega = data.fechaEntrega;
  if ("proyecto_ids" in data) fields.proyecto_ids = data.proyecto_ids;
  if ("cliente_ids" in data) fields.cliente_ids = data.cliente_ids;

  await updateCachedItem("tareas", id, fields);
  return { id, ...fields };
}

export async function createLocalWorker(data: any) {
  const newWorker = {
    id: generateId(),
    nombre: data.nombre || "Nuevo Trabajador",
    rol: data.rol || "",
    disponibilidad: data.disponibilidad || "Completa",
    tarifa: parseFloat(data.tarifa) || 0,
    especialidad: Array.isArray(data.especialidad) ? data.especialidad : [],
    email: data.email || "",
    telefono: data.telefono || "",
    contrato: data.contrato || "",
    portfolio: data.portfolio || "",
    notas: data.notas || "",
    token: data.token || `TOK-WRK-${Math.floor(Math.random() * 1000)}`,
    url: "",
    created: new Date().toISOString()
  };
  await addCachedItem("trabajadores", newWorker);
  return newWorker;
}

export async function updateLocalWorker(id: string, data: any) {
  const fields: any = {};
  if ("nombre" in data) fields.nombre = data.nombre;
  if ("rol" in data) fields.rol = data.rol;
  if ("disponibilidad" in data) fields.disponibilidad = data.disponibilidad;
  if ("tarifa" in data) fields.tarifa = parseFloat(data.tarifa) || 0;
  if ("especialidad" in data) fields.especialidad = data.especialidad;
  if ("email" in data) fields.email = data.email;
  if ("telefono" in data) fields.telefono = data.telefono;
  if ("contrato" in data) fields.contrato = data.contrato;
  if ("portfolio" in data) fields.portfolio = data.portfolio;
  if ("notas" in data) fields.notas = data.notas;
  if ("token" in data) fields.token = data.token;

  await updateCachedItem("trabajadores", id, fields);
  return { id, ...fields };
}

