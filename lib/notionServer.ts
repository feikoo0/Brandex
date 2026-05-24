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
  if (!dbId) return [];
  const pages: any[] = [];
  let cursor: string | undefined = undefined;

  while (true) {
    const body: any = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    if (sorts) body.sorts = sorts;

    const r = await notion("POST", `/databases/${dbId}/query`, body);
    if (r.error) {
      console.error(`Error querying database ${dbId}:`, r.error);
      break;
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

// ── Sync All Data (Firestore first, or Notion overwrite) ──────────────────────
export async function syncAllData(forceSync = false) {
  if (!forceSync) {
    const [c, p, t, r, w] = await Promise.all([
      getCacheDoc("clientes"),
      getCacheDoc("proyectos"),
      getCacheDoc("tareas"),
      getCacheDoc("recursos"),
      getCacheDoc("trabajadores")
    ]);
    
    // If all exist in cache, return them immediately
    if (c && p && t && r && w) {
      console.log(">>> Syncing from Firestore Cache (Instant load)");
      return {
        clientes: c,
        proyectos: p,
        tareas: t,
        recursos: r,
        trabajadores: w
      };
    }
    console.log(">>> Cache miss, triggering full Notion sync");
  } else {
    console.log(">>> Force Sync requested: querying Notion databases");
  }

  // Query Notion
  const [cRaw, pRaw, tRaw, rRaw, wRaw] = await Promise.all([
    queryDb(CLIENTES_DB),
    queryDb(PROYECTOS_DB),
    queryDb(TAREAS_DB),
    queryDb(RECURSOS_DB),
    queryDb(EQUIPO_DB)
  ]);

  // Parse Notion data
  const clientes = cRaw.map(parseClient);
  const proyectos = pRaw.map(parseProject);
  const tareas = tRaw.map(parseTask);
  const recursos = rRaw.map(parseRecurso);
  const trabajadores = wRaw.map(parseWorker);

  // Write parsed data to Firestore cache in parallel
  await Promise.all([
    setCacheDoc("clientes", clientes),
    setCacheDoc("proyectos", proyectos),
    setCacheDoc("tareas", tareas),
    setCacheDoc("recursos", recursos),
    setCacheDoc("trabajadores", trabajadores)
  ]);

  return {
    clientes,
    proyectos,
    tareas,
    recursos,
    trabajadores
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
