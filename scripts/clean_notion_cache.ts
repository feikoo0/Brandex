import fs from "fs";
import path from "path";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf8");
  envConfig.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
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

const ALLOWED_NAMES = ["jenny rivera", "shohei ohtani", "ohtani", "mandaditos"];

async function cleanCache() {
  console.log("=== LIMPIANDO CACHÉ EN 'notion_cache' PARA CONSERVAR SOLO 3 PROYECTOS ===");

  // 1. Clean notion_cache/proyectos
  const projDocRef = doc(db, "notion_cache", "proyectos");
  const projSnap = await getDoc(projDocRef);

  if (projSnap.exists()) {
    const data = projSnap.data();
    const currentList: any[] = Array.isArray(data.data) ? data.data : Array.isArray(data.projects) ? data.projects : [];
    
    console.log(`Total proyectos encontrados en notion_cache/proyectos: ${currentList.length}`);

    const filteredProjects = currentList.filter((p: any) => {
      const name = (p.nombre || p.title || p.name || "").toLowerCase();
      const client = (p.cliente || p.client || "").toLowerCase();
      return ALLOWED_NAMES.some((target) => name.includes(target) || client.includes(target));
    });

    console.log(`Proyectos conservados en notion_cache/proyectos (${filteredProjects.length}):`);
    filteredProjects.forEach((p: any) => console.log(` - "${p.nombre || p.title}"`));

    await setDoc(projDocRef, { ...data, data: filteredProjects, projects: filteredProjects, lastUpdated: new Date().toISOString() });
  }

  // 2. Clean notion_cache/tareas
  const taskDocRef = doc(db, "notion_cache", "tareas");
  const taskSnap = await getDoc(taskDocRef);

  if (taskSnap.exists()) {
    const data = taskSnap.data();
    const currentTasks: any[] = Array.isArray(data.data) ? data.data : Array.isArray(data.tasks) ? data.tasks : [];

    console.log(`\nTotal tareas encontradas en notion_cache/tareas: ${currentTasks.length}`);

    const filteredTasks = currentTasks.filter((t: any) => {
      const projName = (t.proyecto || t.project || "").toLowerCase();
      const clientName = (t.cliente || t.client || "").toLowerCase();
      return ALLOWED_NAMES.some((target) => projName.includes(target) || clientName.includes(target));
    });

    console.log(`Tareas conservadas en notion_cache/tareas: ${filteredTasks.length}`);

    await setDoc(taskDocRef, { ...data, data: filteredTasks, tasks: filteredTasks, lastUpdated: new Date().toISOString() });
  }

  console.log("\n=== LIMPIERA DE notion_cache COMPLETADA EXITOSAMENTE ===");
  process.exit(0);
}

cleanCache().catch((err) => {
  console.error("Error en cleanCache:", err);
  process.exit(1);
});
