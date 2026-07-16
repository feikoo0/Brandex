import { NextRequest, NextResponse } from "next/server";
import {
  notion,
  queryDb,
  toUuid,
  parseClient,
  parseProject,
  parseTask,
  parseWorker,
  buildTaskProps,
  buildProjProps,
  buildWorkerProps,
  buildTaskUpdateProps,
  syncAllData,
  getFocusConfig,
  setFocusConfig,
  updateCachedItem,
  addCachedItem,
  createLocalClient,
  updateLocalClient,
  createLocalProject,
  updateLocalProject,
  createLocalTask,
  updateLocalTask,
  createLocalWorker,
  updateLocalWorker
} from "@/lib/notionServer";

const CLIENTES_DB = process.env.CLIENTES_DB || "";
const PROYECTOS_DB = process.env.PROYECTOS_DB || "";
const TAREAS_DB = process.env.TAREAS_DB || "";
const EQUIPO_DB = process.env.EQUIPO_DB || "";
const ADMIN_USER = process.env.ADMIN_USER || "Feiko";
const ADMIN_PASS = process.env.ADMIN_PASS || "08e6003802A";

// ── GET ROUTER ───────────────────────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const p = `/api/${params.path.join("/")}`;
  console.log(`[route.ts] GET ${p}`);

  if (p === "/api/sync") {
    const force = req.nextUrl.searchParams.get("force") === "true";
    try {
      const data = await syncAllData(force);
      return NextResponse.json(data);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
    }
  }

  if (p === "/api/focus") {
    try {
      const data = await getFocusConfig();
      return NextResponse.json(data);
    } catch (err: any) {
      return NextResponse.json([], { status: 500 });
    }
  }

  if (p === "/api/agent/config") {
    return NextResponse.json({ enabled: !!process.env.DEEPSEEK_API_KEY });
  }

  if (p === "/api/debug") {
    try {
      const r = await queryDb(CLIENTES_DB);
      return NextResponse.json({ ok: true, status: "ok", token_ok: true, count: r.length });
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: err.message || String(err) }, { status: 500 });
    }
  }

  if (p === "/api/debug/tasks") {
    try {
      const r = await notion("GET", `/databases/${TAREAS_DB}`);
      if (r.error) return NextResponse.json({ error: r.error, db_id: TAREAS_DB }, { status: 500 });

      const propsSchema: Record<string, any> = {};
      for (const [k, v] of Object.entries(r.properties || {}) as any[]) {
        const ptype = v.type || "?";
        const info: any = { type: ptype };
        if (ptype === "multi_select") {
          info.options = (v.multi_select?.options || []).map((o: any) => o.name || "");
        } else if (ptype === "select") {
          info.options = (v.select?.options || []).map((o: any) => o.name || "");
        } else if (ptype === "status") {
          info.options = (v.status?.options || []).map((o: any) => o.name || "");
        }
        propsSchema[k] = info;
      }
      return NextResponse.json({ db_id: TAREAS_DB, properties: propsSchema });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  if (p === "/api/debug/project") {
    try {
      const r = await notion("GET", `/databases/${PROYECTOS_DB}`);
      if (r.error) return NextResponse.json({ error: r.error, db_id: PROYECTOS_DB }, { status: 500 });

      const propsSchema: Record<string, any> = {};
      for (const [k, v] of Object.entries(r.properties || {}) as any[]) {
        propsSchema[k] = v.type || "?";
      }
      return NextResponse.json({
        db_id: PROYECTOS_DB,
        db_title: r.title?.[0]?.plain_text || "",
        properties: propsSchema,
        token_ok: !!process.env.NOTION_TOKEN
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
}

// ── POST ROUTER ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  const p = `/api/${params.path.join("/")}`;
  console.log(`[route.ts] POST ${p}`);

  let data: any = {};
  try {
    data = await req.json();
  } catch {}

  if (p === "/api/focus") {
    try {
      const ok = await setFocusConfig(data);
      return NextResponse.json({ ok });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

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

    let found: any = null;

    // Buscar en clientes
    try {
      const clientesRaw = await queryDb(CLIENTES_DB);
      for (const pg of clientesRaw) {
        const c = parseClient(pg);
        if (c.token && c.token.trim() === tokenInput) {
          found = { ok: true, role: "cliente", id: c.id, nombre: c.nombre, token: tokenInput };
          break;
        }
      }
    } catch (e) {
      console.error("Error looking up token in clients:", e);
    }

    // Buscar en trabajadores si no encontrado
    if (!found && EQUIPO_DB) {
      try {
        const trabajadoresRaw = await queryDb(EQUIPO_DB);
        for (const pg of trabajadoresRaw) {
          const w = parseWorker(pg);
          if (w.token && w.token.trim() === tokenInput) {
            const workerRol = (w.rol || "").toLowerCase();
            const finalRole = workerRol.includes("admin") ? "admin" : "diseno";
            found = { ok: true, role: finalRole, id: w.id, nombre: w.nombre, token: tokenInput };
            break;
          }
        }
      } catch (e) {
        console.error("Error looking up token in workers:", e);
      }
    }

    if (found) {
      return NextResponse.json(found);
    }
    return NextResponse.json({ ok: false, error: "Token no válido" }, { status: 401 });
  }

  if (p === "/api/token/set") {
    const recordType = data.type; // "client" | "worker"
    const pageId = data.id;
    const newToken = (data.token || "").trim();

    if (!pageId || !newToken) {
      return NextResponse.json({ ok: false, error: "Faltan parámetros" }, { status: 400 });
    }

    try {
      if (recordType === "worker") {
        await updateLocalWorker(pageId, { token: newToken });
      } else {
        await updateLocalClient(pageId, { token: newToken });
      }
      return NextResponse.json({ ok: true });
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: err.message || String(err) }, { status: 500 });
    }
  }

  if (p === "/api/task/create") {
    try {
      const task = await createLocalTask(data);
      return NextResponse.json({ ok: true, id: task.id });
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: err.message || String(err) }, { status: 500 });
    }
  }

  if (p === "/api/project/create") {
    try {
      const proj = await createLocalProject(data);
      return NextResponse.json({ ok: true, id: proj.id });
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: err.message || String(err) }, { status: 500 });
    }
  }

  if (p === "/api/client/create") {
    try {
      const client = await createLocalClient(data);
      return NextResponse.json({ ok: true, id: client.id });
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: err.message || String(err) }, { status: 500 });
    }
  }

  if (p === "/api/worker/create") {
    try {
      const worker = await createLocalWorker(data);
      return NextResponse.json({ ok: true, id: worker.id });
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
      content: `Eres el Agente Inteligente de Brandex OS. Tu objetivo es ayudar al usuario a gestionar sus proyectos, tareas y clientes de forma local y segura.
ESTRUCTURA DE DATOS:
- Proyectos: nombre, cliente_id, estadoProyecto, prioridad, area, formato, fechaInicio, fechaFin, descripcion.
- Tareas: titulo, proyecto_id, estado, prioridad, area, formato, esfuerzo, asignado, contenido.
- Clientes: nombre.
VALORES VÁLIDOS (Status/Select):
- Estados Tarea: Sin empezar, En curso, En revisión, Hecho.
- Prioridad: Alta, Media, Baja.
- Esfuerzo: 1h, 2h, 4h, 8h, 16h, 32h.
REGLAS:
1. Siempre responde en JSON con este formato:
{
  "reply": "Texto para el usuario explicando qué vas a hacer o preguntando dudas",
  "plan": [
    { "action": "create_project", "data": { "nombre": "...", "prioridad": "Alta", ... } },
    { "action": "create_task", "data": { "titulo": "...", "esfuerzo": "2h", ... } }
  ]
}
2. Si no tienes suficiente información para una acción, NO la incluyas en el plan y pregunta en 'reply'.
3. El plan debe ser una lista de acciones atómicas.
4. Identifica IDs de proyectos o clientes si el usuario los menciona por nombre.`
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
  console.log(`[route.ts] PATCH ${p}`);

  let data: any = {};
  try {
    data = await req.json();
  } catch {}

  const pageId = data.id;
  if (!pageId) {
    return NextResponse.json({ ok: false, error: "No ID provided" }, { status: 400 });
  }

  if (p === "/api/client/update") {
    try {
      await updateLocalClient(pageId, data);
      return NextResponse.json({ ok: true });
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: err.message || String(err) }, { status: 500 });
    }
  }

  if (p === "/api/task/update") {
    try {
      await updateLocalTask(pageId, data);
      return NextResponse.json({ ok: true });
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: err.message || String(err) }, { status: 500 });
    }
  }

  if (p === "/api/project/update") {
    try {
      await updateLocalProject(pageId, data);
      return NextResponse.json({ ok: true });
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: err.message || String(err) }, { status: 500 });
    }
  }

  if (p === "/api/worker/update") {
    try {
      await updateLocalWorker(pageId, data);
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
