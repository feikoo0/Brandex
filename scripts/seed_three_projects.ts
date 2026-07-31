import fs from "fs";
import path from "path";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, setDoc, doc, writeBatch } from "firebase/firestore";

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

const THREE_PROJECTS = [
  {
    id: 1001,
    title: "Jenny Rivera",
    client: "Jenny Rivera",
    package: "Branding Complete",
    desc: "Estrategia de marca, contenido digital e identidad visual de Jenny Rivera.",
    progress: "0 de 2 tareas",
    percent: "0%",
    gradient: "bg-purple-600",
    glow: "bg-purple-600",
    status: "Activo",
    statusColor: "bg-violet-500/10 border-violet-500/30 text-violet-400",
    burnRate: "0h / 40h",
    startDate: "Hoy",
    deadline: "Sin Fecha",
    daysRemaining: "14 días",
    briefCore: "Proyecto principal de Jenny Rivera.",
    priority: "Alta",
    cost: "$15,000",
    tasks: [
      {
        id: 10011,
        title: "Diseño de Logotipo e Identidad",
        desc: "Línea gráfica e identidad visual.",
        format: "Branding",
        formato: "Branding",
        time: "3 horas",
        status: "Planificado",
        statusColor: "bg-slate-500/20 border-slate-500/30 text-slate-300",
        subtasks: []
      },
      {
        id: 10012,
        title: "Estrategia de Contenidos Redes",
        desc: "Calendario editorial y piezas de contenido.",
        format: "Redes Sociales",
        formato: "Redes Sociales",
        time: "2 horas",
        status: "Planificado",
        statusColor: "bg-slate-500/20 border-slate-500/30 text-slate-300",
        subtasks: []
      }
    ]
  },
  {
    id: 1002,
    title: "Shohei Ohtani",
    client: "Shohei Ohtani",
    package: "Desarrollo Web",
    desc: "Sitio web interactivo y campaña digital de Shohei Ohtani.",
    progress: "0 de 1 tareas",
    percent: "0%",
    gradient: "bg-blue-600",
    glow: "bg-blue-600",
    status: "Activo",
    statusColor: "bg-violet-500/10 border-violet-500/30 text-violet-400",
    burnRate: "0h / 40h",
    startDate: "Hoy",
    deadline: "Sin Fecha",
    daysRemaining: "14 días",
    briefCore: "Campaña y desarrollo web para Ohtani.",
    priority: "Alta",
    cost: "$20,000",
    tasks: [
      {
        id: 10021,
        title: "Maquetación UI/UX Landing Page",
        desc: "Diseño responsive y componentes de alto impacto.",
        format: "UI/UX",
        formato: "UI/UX",
        time: "4 horas",
        status: "Planificado",
        statusColor: "bg-slate-500/20 border-slate-500/30 text-slate-300",
        subtasks: []
      }
    ]
  },
  {
    id: 1003,
    title: "Mandaditos",
    client: "Mandaditos",
    package: "UI/UX Design",
    desc: "Plataforma de logística y aplicación de entregas Mandaditos.",
    progress: "0 de 1 tareas",
    percent: "0%",
    gradient: "bg-emerald-600",
    glow: "bg-emerald-600",
    status: "Activo",
    statusColor: "bg-violet-500/10 border-violet-500/30 text-violet-400",
    burnRate: "0h / 40h",
    startDate: "Hoy",
    deadline: "Sin Fecha",
    daysRemaining: "14 días",
    briefCore: "Plataforma y flujo de envíos de Mandaditos.",
    priority: "Media",
    cost: "$12,000",
    tasks: [
      {
        id: 10031,
        title: "Flujo de Pedidos y Rastreo",
        desc: "Wireframes de la app de usuarios y repartidores.",
        format: "App Mobile",
        formato: "App Mobile",
        time: "3 horas",
        status: "Planificado",
        statusColor: "bg-slate-500/20 border-slate-500/30 text-slate-300",
        subtasks: []
      }
    ]
  }
];

async function seed() {
  console.log("=== SEMBRANDO 3 PROYECTOS ÚNICOS EN FIREBASE (/taski & notion_cache) ===");

  // Clean all existing v3_projects, projects, and tasks
  const collectionsToClean = ["v3_projects", "projects", "tasks"];
  for (const colName of collectionsToClean) {
    const snap = await getDocs(collection(db, colName));
    if (!snap.empty) {
      console.log(`Eliminando ${snap.size} documentos de '${colName}'...`);
      let batch = writeBatch(db);
      let count = 0;
      for (const d of snap.docs) {
        batch.delete(d.ref);
        count++;
        if (count % 450 === 0) {
          await batch.commit();
          batch = writeBatch(db);
        }
      }
      if (count % 450 !== 0) {
        await batch.commit();
      }
    }
  }

  const allTasks: any[] = [];
  const notionProjects: any[] = [];

  // Seed the 3 projects into v3_projects, projects, and tasks
  for (const proj of THREE_PROJECTS) {
    console.log(`Guardando proyecto '${proj.title}' (ID: ${proj.id})...`);
    await setDoc(doc(db, "v3_projects", String(proj.id)), proj);

    const nativeProj = {
      id: String(proj.id),
      nombre: proj.title,
      title: proj.title,
      client: proj.client,
      cliente: proj.client,
      package: proj.package,
      tipo_proyecto: proj.package,
      desc: proj.desc,
      status: proj.status,
      estado: proj.status,
      cost: proj.cost,
      precio: proj.cost,
      startDate: proj.startDate,
      deadline: proj.deadline,
      gradient: proj.gradient,
      fecha_creacion: new Date().toISOString()
    };
    await setDoc(doc(db, "projects", String(proj.id)), nativeProj);
    notionProjects.push(nativeProj);

    for (const t of proj.tasks) {
      const nativeTask = {
        id: String(t.id),
        title: t.title,
        nombre: t.title,
        project_id: String(proj.id),
        proyecto_id: String(proj.id),
        proyecto: proj.title,
        client: proj.client,
        cliente: proj.client,
        format: t.format,
        formato: t.formato,
        time: t.time,
        duracion: t.time,
        status: t.status,
        estado: t.status,
        done: false,
        fecha_creacion: new Date().toISOString()
      };
      await setDoc(doc(db, "tasks", String(t.id)), nativeTask);
      allTasks.push(nativeTask);
    }
  }

  // Update notion_cache/proyectos and notion_cache/tareas to match
  await setDoc(doc(db, "notion_cache", "proyectos"), {
    data: notionProjects,
    projects: notionProjects,
    lastUpdated: new Date().toISOString()
  });

  await setDoc(doc(db, "notion_cache", "tareas"), {
    data: allTasks,
    tasks: allTasks,
    lastUpdated: new Date().toISOString()
  });

  console.log("=== SINCRONIZACIÓN Y SEMBRADO COMPLETADO CON ÉXITO PARA LOS 3 PROYECTOS ===");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Error en seed:", err);
  process.exit(1);
});
