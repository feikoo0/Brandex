import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, writeBatch, collection, getDocs, deleteDoc } from "firebase/firestore";
import fs from "fs";

if (fs.existsSync(".env.local")) {
  const envContent = fs.readFileSync(".env.local", "utf8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
const databaseId = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || undefined;
const app = initializeApp(firebaseConfig);
const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);

const norm = (s: string | null | undefined) => (s || "").trim().toLowerCase();

function normalizeFormato(raw: string) {
  if (!raw) return "post_imagen";
  const n = norm(raw);
  if (n.includes("reel")) return "reel";
  if (n.includes("story") || n.includes("historia")) {
    if (n.includes("imagen") || n.includes("foto") || n.includes("img")) return "story_imagen";
    return "story";
  }
  if (n.includes("carrusel")) return "carrusel";
  if (n.includes("video")) return "video_horizontal";
  if (n.includes("post") || n.includes("imagen") || n.includes("portada")) return "post_imagen";
  return n.replace(/\s+/g, "_");
}

function mapProjectStatus(raw: string) {
  const n = norm(raw);
  if (n.includes("planific")) return "Planificación";
  if (n.includes("activo")) return "Activo";
  if (n.includes("revision") || n.includes("revisión")) return "En Revisión";
  if (n.includes("completad") || n.includes("hecho")) return "Completado";
  return "Planificación";
}

function mapTaskStatus(raw: string) {
  const n = norm(raw);
  if (n === "modificar") return "Cambios Solicitados";
  if (n.includes("proceso") || n.includes("curso")) return "En Proceso";
  if (n.includes("revision") || n.includes("revisión")) return "En Revisión";
  if (n.includes("hecho") || n.includes("completad") || n.includes("aprobad")) return "Completado";
  return "Pendiente";
}

function parseTaskEsfuerzo(raw: string) {
  const n = norm(raw);
  let esfuerzo = "Medio";
  let tiempoEstimado = "1h";

  if (n.includes("15 min") || n.includes("flash")) {
    esfuerzo = "Bajo";
    tiempoEstimado = "15 min";
  } else if (n.includes("30 min") || n.includes("corto")) {
    esfuerzo = "Bajo";
    tiempoEstimado = "30 min";
  } else if (n.includes("2 h") || n.includes("largo")) {
    esfuerzo = "Alto";
    tiempoEstimado = "2h";
  } else if (n.includes("3 h") || n.includes("maratón") || n.includes("maraton")) {
    esfuerzo = "Alto";
    tiempoEstimado = "+3h";
  } else if (n.includes("1 h") || n.includes("medio")) {
    esfuerzo = "Medio";
    tiempoEstimado = "1h";
  }

  return { esfuerzo, tiempoEstimado };
}

async function cleanCollection(collName: string) {
  const snap = await getDocs(collection(db, collName));
  const batch = writeBatch(db);
  snap.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

async function runCleanMigration() {
  console.log("=== INICIANDO MIGRACIÓN LIMPIA A COLECCIONES NATIVAS ===");

  // 0. Limpiar colecciones destino
  console.log("Limpiando colecciones destino existentes...");
  await Promise.all([
    cleanCollection("clients"),
    cleanCollection("workers"),
    cleanCollection("projects"),
    cleanCollection("tasks")
  ]);

  let cacheClientes = [];
  let cacheProyectos = [];
  let cacheTareas = [];
  let cacheTrabajadores = [];

  if (fs.existsSync("sync_dump.json")) {
    const dump = JSON.parse(fs.readFileSync("sync_dump.json", "utf8"));
    cacheClientes = dump.clientes || [];
    cacheProyectos = dump.proyectos || [];
    cacheTareas = dump.tareas || [];
    cacheTrabajadores = dump.trabajadores || [];
    console.log("-> Datos leídos desde sync_dump.json.");
  } else {
    const [cSnap, pSnap, tSnap, wSnap] = await Promise.all([
      getDoc(doc(db, "notion_cache", "clientes")),
      getDoc(doc(db, "notion_cache", "proyectos")),
      getDoc(doc(db, "notion_cache", "tareas")),
      getDoc(doc(db, "notion_cache", "trabajadores"))
    ]);
    cacheClientes = cSnap.exists() ? (cSnap.data().data || []) : [];
    cacheProyectos = pSnap.exists() ? (pSnap.data().data || []) : [];
    cacheTareas = tSnap.exists() ? (tSnap.data().data || []) : [];
    cacheTrabajadores = wSnap.exists() ? (wSnap.data().data || []) : [];
  }

  // 1. CLIENTES BATCH
  console.log("1/4 Migrando clientes...");
  const batch1 = writeBatch(db);
  for (const c of cacheClientes) {
    batch1.set(doc(db, "clients", c.id), {
      id: c.id,
      nombre: c.nombre || "Sin nombre",
      email: c.email || "",
      telefono: c.telefono || c.tel || c.celular || "",
      whatsapp: c.whatsapp || "",
      instagram: c.instagram || "",
      facebook: c.facebook || "",
      tiktok: c.tiktok || "",
      web: c.web || "",
      redes: c.redes || "",
      industria: c.industria || "",
      potencial: c.potencial || "",
      fuente: c.fuente || "",
      obs: c.obs || "",
      token: c.token || "",
      drive: c.drive || "",
      status: c.status || "Activo",
      contactPerson: c.contactPerson || "",
      url: c.url || "",
      created: c.created || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  await batch1.commit();

  // 2. TRABAJADORES BATCH
  console.log("2/4 Migrando trabajadores...");
  const batch2 = writeBatch(db);
  for (const w of cacheTrabajadores) {
    batch2.set(doc(db, "workers", w.id), {
      id: w.id,
      nombre: w.nombre || "Sin nombre",
      rol: w.rol || "",
      disponibilidad: w.disponibilidad || "Completa",
      tarifa: typeof w.tarifa === "number" ? w.tarifa : (parseFloat(w.tarifa) || 0),
      especialidad: Array.isArray(w.especialidad) ? w.especialidad : [],
      email: w.email || "",
      telefono: w.telefono || "",
      contrato: w.contrato || "",
      portfolio: w.portfolio || "",
      notas: w.notas || "",
      token: w.token || "",
      url: w.url || "",
      created: w.created || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  await batch2.commit();

  // 3. PROYECTOS BATCH
  console.log("3/4 Migrando proyectos...");
  const EXCLUDED_PROJECT_IDS = new Set([
    "3404e2b7-e44b-81c4-8d94-da02e17c0373", // "test proyecto v4"
    "3464e2b7-e44b-811c-a756-ef35363dfba9"  // "Portada El Avion De Las 3"
  ]);
  const MATCHED_CLIENT_MAP: Record<string, string> = {
    "2ec4e2b7-e44b-80d9-88a2-eb78e8e71e67": "32d4e2b7-e44b-8080-aefa-d9437b8bc314", // Codigo Distinto
    "3464e2b7-e44b-817b-8857-c3f6308d7563": "2f44e2b7-e44b-801a-a281-c8ae81cda8fa", // ZooPizza
    "3354e2b7-e44b-8186-9d2c-caf17fa6d57c": "32d4e2b7-e44b-8080-aefa-d9437b8bc314"  // Codigo Distinto
  };

  let projectsExcluded = 0;
  const batch3 = writeBatch(db);
  for (const p of cacheProyectos) {
    if (EXCLUDED_PROJECT_IDS.has(p.id)) {
      projectsExcluded++;
      console.log(`  [EXCLUIDO PROYECTO TEST] ${p.id} - "${p.nombre}"`);
      continue;
    }
    let finalClientId: string | null = null;
    if (MATCHED_CLIENT_MAP[p.id]) {
      finalClientId = MATCHED_CLIENT_MAP[p.id];
    } else if (p.cliente_ids && p.cliente_ids.length > 0) {
      finalClientId = p.cliente_ids[0];
    }

    batch3.set(doc(db, "projects", p.id), {
      id: p.id,
      nombre: p.nombre || "Sin nombre",
      cliente_id: finalClientId,
      estado: mapProjectStatus(p.estadoProyecto),
      area: p.area || "",
      prioridad: p.prioridad || "Media",
      ciclo: p.ciclo || "",
      esfuerzo: p.esfuerzo && norm(p.esfuerzo).includes("15 min") ? "Bajo" : "Medio",
      plataformas: Array.isArray(p.plataformas) ? p.plataformas : [],
      fechaInicio: p.fechaInicio || "",
      fechaFin: p.fechaFin || "",
      recursosDrive: p.recursosDrive || "",
      costo: typeof p.costo === "number" ? p.costo : (parseFloat(p.costo) || 0),
      descripcion: p.descripcion || "",
      url: p.url || "",
      created: p.created || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  await batch3.commit();

  // 4. TAREAS BATCH
  console.log("4/4 Migrando tareas...");
  let tasksExcluded = 0;
  let batch4 = writeBatch(db);
  let batchCount = 0;

  for (const t of cacheTareas) {
    if (norm(t.asignado) === "test") {
      tasksExcluded++;
      console.log(`  [EXCLUIDA TAREA TEST] ${t.id} - "${t.titulo}"`);
      continue;
    }
    const { esfuerzo, tiempoEstimado } = parseTaskEsfuerzo(t.esfuerzo);
    const proyectoId = Array.isArray(t.proyecto_ids) && t.proyecto_ids.length > 0 ? t.proyecto_ids[0] : (t.proyecto_id || "");

    batch4.set(doc(db, "tasks", t.id), {
      id: t.id,
      titulo: t.titulo || "Nueva Tarea",
      estado: mapTaskStatus(t.estado),
      area: t.area || "",
      proyecto_id: proyectoId,
      asignado_ids: Array.isArray(t.asignado_ids) ? t.asignado_ids : [],
      formato: normalizeFormato(t.formato),
      esfuerzo,
      tiempoEstimado,
      prioridad: t.prioridad || "Media",
      plataformas: Array.isArray(t.plataformas) ? t.plataformas : [],
      contenido: t.contenido || "",
      copy: t.copy || "",
      adminNotes: t.adminNotes || t.admin_notes || "",
      notasCliente: t.notasCliente || "",
      tiempoRealMins: typeof t.tiempoRealMins === "number" ? t.tiempoRealMins : null,
      fechaProg: t.fechaProg || "",
      fechaEntrega: t.fechaEntrega || "",
      color: t.color || null,
      created: t.created || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    batchCount++;
    if (batchCount >= 400) {
      await batch4.commit();
      batch4 = writeBatch(db);
      batchCount = 0;
    }
  }
  if (batchCount > 0) {
    await batch4.commit();
  }

  // VERIFICACIÓN CONTEOS
  console.log("\n==========================================");
  console.log("=== VERIFICACIÓN FINAL DE CONTEOS ===");
  console.log("==========================================");

  const [dbClients, dbWorkers, dbProjects, dbTasks] = await Promise.all([
    getDocs(collection(db, "clients")),
    getDocs(collection(db, "workers")),
    getDocs(collection(db, "projects")),
    getDocs(collection(db, "tasks"))
  ]);

  console.log(`CLIENTES     -> Original: ${cacheClientes.length} | Migrados: ${dbClients.size} | Diferencia: ${cacheClientes.length - dbClients.size}`);
  console.log(`TRABAJADORES -> Original: ${cacheTrabajadores.length} | Migrados: ${dbWorkers.size} | Diferencia: ${cacheTrabajadores.length - dbWorkers.size}`);
  console.log(`PROYECTOS    -> Original: ${cacheProyectos.length} | Migrados: ${dbProjects.size} | Excluidos test: ${projectsExcluded} | Diferencia: ${cacheProyectos.length - dbProjects.size}`);
  console.log(`TAREAS       -> Original: ${cacheTareas.length} | Migrados: ${dbTasks.size} | Excluidas test: ${tasksExcluded} | Diferencia: ${cacheTareas.length - dbTasks.size}`);
  
  const totalOriginal = cacheClientes.length + cacheTrabajadores.length + cacheProyectos.length + cacheTareas.length;
  const totalMigrado = dbClients.size + dbWorkers.size + dbProjects.size + dbTasks.size;
  const totalExcluidos = projectsExcluded + tasksExcluded;
  const diff = totalOriginal - totalMigrado;

  console.log("\n------------------------------------------");
  console.log(`TOTAL ORIGINAL DE REGISTROS: ${totalOriginal}`);
  console.log(`TOTAL MIGRADO A FIRESTORE:   ${totalMigrado}`);
  console.log(`TOTAL EXCLUIDOS (TESTING):   ${totalExcluidos}`);
  console.log(`DIFERENCIA EXACTA (ORIGINAL - MIGRADO): ${diff}`);
  console.log(`¿DIFERENCIA COINCIDE CON 5 EXCLUIDOS?: ${diff === 5 && totalExcluidos === 5 ? "✅ SÍ, 100% PERFECTO (DIFERENCIA = EXACTAMENTE 5)" : "❌ ERROR DE CONTEO"}`);
  console.log("------------------------------------------");
}

runCleanMigration().catch(console.error);
