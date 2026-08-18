import { NextRequest, NextResponse } from "next/server";
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const ADMIN_USER = process.env.ADMIN_USER || "Feiko";
const ADMIN_PASS = process.env.ADMIN_PASS || "08e6003802A";

// ── GET ROUTER ───────────────────────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const p = `/api/${params.path.join("/")}`;

  if (p === "/api/sync") {
    try {
      const clientsSnap = await getDocs(collection(db, "clients"));
      const projectsSnap = await getDocs(collection(db, "projects"));
      const tasksSnap = await getDocs(collection(db, "tasks"));
      const membersSnap = await getDocs(collection(db, "members"));

      const clientes = clientsSnap.docs.map(d => ({ ...d.data(), id: d.id }));
      const proyectos = projectsSnap.docs.map(d => ({ ...d.data(), id: d.id }));
      const tareas = tasksSnap.docs.map(d => ({ ...d.data(), id: d.id }));
      const trabajadores = membersSnap.docs.map(d => ({ ...d.data(), id: d.id }));

      return NextResponse.json({
        ok: true,
        clientes,
        proyectos,
        tareas,
        trabajadores,
        recursos: [],
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
    }
  }

  if (p === "/api/agent/config") {
    return NextResponse.json({ enabled: !!process.env.DEEPSEEK_API_KEY });
  }

  if (p === "/api/debug") {
    return NextResponse.json({ ok: true, status: "ok", token_ok: true });
  }

  return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
}

// ── POST ROUTER ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  const p = `/api/${params.path.join("/")}`;

  let data: any = {};
  try {
    data = await req.json();
  } catch {}

  if (p === "/api/auth/admin") {
    const u = (data.user || "").trim();
    const pw = (data.pass || "").trim();
    if (u === ADMIN_USER && pw === ADMIN_PASS) {
      return NextResponse.json({ ok: true, role: "admin", nombre: ADMIN_USER });
    }
    return NextResponse.json({ ok: false, error: "Credenciales incorrectas" }, { status: 401 });
  }

  if (p === "/api/auth/token") {
    const tokenInput = (data.token || "").trim();
    if (!tokenInput) {
      return NextResponse.json({ ok: false, error: "Token vacío" }, { status: 400 });
    }

    try {
      // Buscar en clientes
      const clientsSnap = await getDocs(collection(db, "clients"));
      for (const d of clientsSnap.docs) {
        const c = d.data();
        if (c.token && c.token.trim() === tokenInput) {
          return NextResponse.json({ ok: true, role: "cliente", id: d.id, nombre: c.nombre || c.name, token: tokenInput });
        }
      }

      // Buscar en miembros
      const membersSnap = await getDocs(collection(db, "members"));
      for (const d of membersSnap.docs) {
        const m = d.data();
        if (m.token && m.token.trim() === tokenInput) {
          const role = (m.rol || m.role || "").toLowerCase().includes("admin") ? "admin" : "diseno";
          return NextResponse.json({ ok: true, role, id: d.id, nombre: m.nombre || m.name, token: tokenInput });
        }
      }
    } catch (e: any) {
      console.error("Error looking up token in Firestore:", e);
    }

    return NextResponse.json({ ok: false, error: "Token no válido" }, { status: 401 });
  }

  if (p === "/api/task/create") {
    try {
      const newId = "task-" + Date.now();
      const taskDoc = {
        ...data,
        id: newId,
        titulo: (data.titulo || data.title || "Nueva Tarea").trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };
      await setDoc(doc(db, "tasks", newId), taskDoc);
      return NextResponse.json({ ok: true, id: newId });
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: err.message || String(err) }, { status: 500 });
    }
  }

  if (p === "/api/project/create") {
    try {
      const newId = "proj-" + Date.now();
      const projDoc = {
        ...data,
        id: newId,
        nombre: (data.nombre || data.name || "Nuevo Proyecto").trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };
      await setDoc(doc(db, "projects", newId), projDoc);
      return NextResponse.json({ ok: true, id: newId });
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: err.message || String(err) }, { status: 500 });
    }
  }

  if (p === "/api/client/create") {
    try {
      const newId = "cli-" + Date.now();
      const clientDoc = {
        ...data,
        id: newId,
        nombre: (data.nombre || data.name || "Nuevo Cliente").trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };
      await setDoc(doc(db, "clients", newId), clientDoc);
      return NextResponse.json({ ok: true, id: newId });
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: err.message || String(err) }, { status: 500 });
    }
  }

  if (p === "/api/worker/create") {
    try {
      const newId = "mem-" + Date.now();
      const memberDoc = {
        ...data,
        id: newId,
        nombre: (data.nombre || data.name || "Nuevo Miembro").trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };
      await setDoc(doc(db, "members", newId), memberDoc);
      return NextResponse.json({ ok: true, id: newId });
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: err.message || String(err) }, { status: 500 });
    }
  }

  if (p === "/api/agent/chat") {
    const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
    if (!DEEPSEEK_KEY) {
      return NextResponse.json({ error: "DEEPSEEK_API_KEY no configurado en el servidor." }, { status: 503 });
    }

    const messages = data.messages || [];
    const systemPrompt = {
      role: "system",
      content: `Eres el Agente Inteligente de Taski. Tu objetivo es ayudar al usuario a gestionar sus proyectos, tareas y clientes de forma local y segura.`
    };

    try {
      const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${DEEPSEEK_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [systemPrompt, ...messages],
          response_format: { type: "json_object" }
        })
      });

      if (!res.ok) {
        return NextResponse.json({ error: `DeepSeek API returned ${res.status}` }, { status: res.status });
      }

      const fullRes = await res.json();
      const contentStr = fullRes.choices?.[0]?.message?.content || "{}";
      return NextResponse.json(JSON.parse(contentStr));
    } catch (err: any) {
      return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
}

// ── PATCH ROUTER ─────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  const p = `/api/${params.path.join("/")}`;

  let data: any = {};
  try {
    data = await req.json();
  } catch {}

  const pageId = String(data.id || "");
  if (!pageId) {
    return NextResponse.json({ ok: false, error: "No ID provided" }, { status: 400 });
  }

  if (p === "/api/client/update") {
    try {
      await updateDoc(doc(db, "clients", pageId), {
        ...data,
        updatedAt: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      return NextResponse.json({ ok: true });
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: err.message || String(err) }, { status: 500 });
    }
  }

  if (p === "/api/task/update") {
    try {
      await updateDoc(doc(db, "tasks", pageId), {
        ...data,
        updatedAt: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      return NextResponse.json({ ok: true });
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: err.message || String(err) }, { status: 500 });
    }
  }

  if (p === "/api/project/update") {
    try {
      await updateDoc(doc(db, "projects", pageId), {
        ...data,
        updatedAt: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      return NextResponse.json({ ok: true });
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: err.message || String(err) }, { status: 500 });
    }
  }

  if (p === "/api/worker/update") {
    try {
      await updateDoc(doc(db, "members", pageId), {
        ...data,
        updatedAt: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      return NextResponse.json({ ok: true });
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: err.message || String(err) }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
}

// ── DELETE ROUTER ────────────────────────────────────────────────────────────
export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
