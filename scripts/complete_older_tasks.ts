import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, writeBatch } from "firebase/firestore";
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

async function runCompleteOlderTasks() {
  console.log("=== MARCANDO TAREAS DE PROYECTOS ANTERIORES COMO COMPLETADAS ===");

  const recentIds = new Set(["2", "3", "4", "5", "6", "8", "9"]);

  const [pSnap, tSnap] = await Promise.all([
    getDocs(collection(db, "projects")),
    getDocs(collection(db, "tasks"))
  ]);

  const allProjects = pSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  const allTasks = tSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

  // Identificar tareas pertenecientes a los 28 proyectos anteriores
  const olderTasksToUpdate = allTasks.filter(t => {
    const projId = String(t.proyecto_id);
    return !recentIds.has(projId) && t.estado !== "Completado";
  });

  console.log(`Tareas encontradas a actualizar a 'Completado': ${olderTasksToUpdate.length}`);

  let batch = writeBatch(db);
  let count = 0;
  let totalUpdated = 0;

  for (const t of olderTasksToUpdate) {
    const taskRef = doc(db, "tasks", t.id);
    batch.update(taskRef, {
      estado: "Completado",
      updatedAt: new Date().toISOString()
    });

    count++;
    totalUpdated++;

    if (count >= 400) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
  }

  console.log(`\n✅ ¡ÉXITO! Se marcaron ${totalUpdated} tareas como 'Completado'.`);
  console.log(`Las 17 tareas de tus 7 proyectos recientes permanecieron intactas.`);
}

runCompleteOlderTasks().catch(console.error);
