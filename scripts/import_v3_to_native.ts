import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, writeBatch } from "firebase/firestore";
import fs from "fs";

if (fs.existsSync(".env.local")) {
  const envContent = fs.readFileSync(".env.local", "utf8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      process.env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
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
const app = initializeApp(firebaseConfig);
const db = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID ? getFirestore(app, process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID) : getFirestore(app);

const norm = (s: string | null | undefined) => (s || "").trim().toLowerCase();

async function runImport() {
  console.log("=== IMPORTANDO v3_projects A COLECCIONES NATIVAS /projects Y /tasks ===");

  const [v3Snap, clientsSnap] = await Promise.all([
    getDocs(collection(db, "v3_projects")),
    getDocs(collection(db, "clients"))
  ]);

  const clientNameMap = new Map<string, string>();
  clientsSnap.docs.forEach(d => {
    clientNameMap.set(norm(d.data().nombre), d.id);
  });

  const batch = writeBatch(db);
  let projCount = 0;
  let taskCount = 0;

  v3Snap.docs.forEach(docSnap => {
    const p = docSnap.data();
    const projId = String(p.id || docSnap.id);
    const clientNameNorm = norm(p.client);
    const matchedClientId = clientNameMap.get(clientNameNorm) || null;

    // 1. Proyecto Doc
    const projRef = doc(db, "projects", projId);
    batch.set(projRef, {
      id: projId,
      nombre: p.title || p.nombre || "Sin nombre",
      cliente_id: matchedClientId,
      estado: p.status || "Activo",
      area: p.package || "General",
      prioridad: p.priority || "Media",
      ciclo: "Mensual",
      esfuerzo: "Medio",
      plataformas: [],
      fechaInicio: p.startDate || "",
      fechaFin: p.deadline || "",
      recursosDrive: "",
      costo: typeof p.cost === "number" ? p.cost : (parseFloat(String(p.cost || "0").replace(/[^0-9.]/g, "")) || 0),
      descripcion: p.desc || p.briefCore || "",
      url: "",
      created: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    projCount++;

    // 2. Tareas Hijas del Proyecto
    if (Array.isArray(p.tasks)) {
      p.tasks.forEach((t: any) => {
        const taskId = String(t.id || Date.now() + Math.random());
        const taskRef = doc(db, "tasks", taskId);
        batch.set(taskRef, {
          id: taskId,
          titulo: t.title || "Nueva Tarea",
          estado: t.status || "Pendiente",
          area: p.package || "General",
          proyecto_id: projId,
          asignado_ids: [],
          formato: norm(t.formato || t.format || "post_imagen"),
          esfuerzo: String(t.time || "").includes("15 min") ? "Bajo" : "Medio",
          tiempoEstimado: t.time || "1h",
          prioridad: "Media",
          plataformas: [],
          contenido: t.desc || "",
          copy: "",
          adminNotes: "",
          notasCliente: "",
          tiempoRealMins: 0,
          fechaProg: t.fecha_programada || "",
          fechaEntrega: t.fecha_programada || "",
          color: t.color || null,
          created: t.fecha_creacion || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        taskCount++;
      });
    }
  });

  await batch.commit();

  console.log(`\n✅ ¡IMPORTACIÓN COMPLETADA EXITOSAMENTE!`);
  console.log(`Proyectos importados desde v3_projects: ${projCount}`);
  console.log(`Tareas importadas desde v3_projects: ${taskCount}`);
}

runImport().catch(console.error);
