import fs from "fs";
import path from "path";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function verify() {
  console.log("=== PROYECTOS RESTANTES EN FIREBASE ===");
  
  const v3Snap = await getDocs(collection(db, "v3_projects"));
  console.log(`\nDocumentos en 'v3_projects' (${v3Snap.size}):`);
  v3Snap.forEach((doc) => {
    const data = doc.data();
    console.log(` - ID: ${doc.id} | Title: "${data.title || data.nombre}" | Client: "${data.client || data.cliente}"`);
  });

  const pSnap = await getDocs(collection(db, "projects"));
  console.log(`\nDocumentos en 'projects' (${pSnap.size}):`);
  pSnap.forEach((doc) => {
    const data = doc.data();
    console.log(` - ID: ${doc.id} | Title: "${data.title || data.nombre}" | Client: "${data.client || data.cliente}"`);
  });

  const tSnap = await getDocs(collection(db, "tasks"));
  console.log(`\nTotal tareas restantes en 'tasks': ${tSnap.size}`);
  
  process.exit(0);
}

verify().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
