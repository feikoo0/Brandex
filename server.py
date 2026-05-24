#!/usr/bin/env python3
"""
Braindex OS — Servidor Local
Conecta tu dashboard en tiempo real con Notion.
"""
import os, json, webbrowser, threading, time
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from urllib.request import Request, urlopen
from urllib.error import URLError
from dotenv import load_dotenv

# Acepta .env o .env.example
if os.path.exists(".env"):
    load_dotenv(".env")
elif os.path.exists(".env.example"):
    load_dotenv(".env.example")
else:
    load_dotenv()

TOKEN           = os.getenv("NOTION_TOKEN", "")
CLIENTES_DB     = os.getenv("CLIENTES_DB",     "2ea4e2b7e44b8097868fd0a57288464a")
PROYECTOS_DB    = os.getenv("PROYECTOS_DB",    "2eb4e2b7e44b803e8847c0f61206b7d9")
TAREAS_DB       = os.getenv("TAREAS_DB",       "8c818c775d9d49b7bc8229c6c664638b")
RECURSOS_DB     = os.getenv("RECURSOS_DB",     "3064e2b7e44b80d4955dd67229a4b6d3")
EQUIPO_DB       = os.getenv("EQUIPO_DB", os.getenv("EQUIPO_DB", ""))  # DB "Equipo"
PORT            = int(os.getenv("PORT", "8080"))
ADMIN_USER      = os.getenv("ADMIN_USER", "Feiko")
ADMIN_PASS      = os.getenv("ADMIN_PASS", "08e6003802A")
DEEPSEEK_KEY    = os.getenv("DEEPSEEK_API_KEY", "")
NOTION_VER   = "2022-06-28"
API          = "https://api.notion.com/v1"
DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"

# ── Notion API helper ────────────────────────────────────────────────────────
def notion(method, path, body=None):
    url = f"{API}{path}"
    data = json.dumps(body).encode() if body else None
    print(f"\n>>> NOTION REQ: {method} {url}")
    if body: print(f">>> BODY: {json.dumps(body, ensure_ascii=False)}")
    req = Request(url, data=data, method=method, headers={
        "Authorization": f"Bearer {TOKEN}",
        "Notion-Version": NOTION_VER,
        "Content-Type": "application/json"
    })
    try:
        with urlopen(req, timeout=15) as resp:
            res_body = resp.read()
            print(f"<<< NOTION RES: {resp.status}")
            return json.loads(res_body)
    except Exception as e:
        # Try to read the actual Notion error body for clearer error messages
        try:
            body_bytes = e.read() if hasattr(e, 'read') else None
            if body_bytes:
                notion_err = json.loads(body_bytes)
                msg = notion_err.get("message") or notion_err.get("error") or str(e)
                return {"error": msg}
        except Exception:
            pass
        return {"error": str(e)}

def query_db(db_id, sorts=None):
    pages, cursor = [], None
    while True:
        body = {"page_size": 100}
        if cursor: body["start_cursor"] = cursor
        if sorts:  body["sorts"] = sorts
        r = notion("POST", f"/databases/{db_id}/query", body)
        if "error" in r: break
        pages.extend(r.get("results", []))
        if not r.get("has_more"): break
        cursor = r.get("next_cursor")
    return pages

# ── Parsers ──────────────────────────────────────────────────────────────────
def txt(props, key):
    v = props.get(key, {})
    for t in ["title", "rich_text"]:
        lst = v.get(t, [])
        if lst: return lst[0].get("plain_text", lst[0].get("text", {}).get("content", ""))
    return ""

def sel(props, key):
    v = props.get(key, {})
    s = v.get("select") or v.get("status")
    return s.get("name", "") if s else ""

def msel(props, key):
    return [x["name"] for x in props.get(key, {}).get("multi_select", [])]

def url_prop(props, key):
    return props.get(key, {}).get("url", "") or ""

def num_prop(props, key):
    return props.get(key, {}).get("number") or 0

def date_prop(props, key):
    d = props.get(key, {}).get("date")
    return (d.get("start",""), d.get("end","")) if d else ("","")

def rels(props, key):
    """Return relation page IDs normalized to UUID format (with dashes).
    Notion sometimes returns them as 32-char hex without dashes; this ensures
    all IDs are consistent with the top-level p["id"] format used everywhere."""
    result = []
    for r in props.get(key, {}).get("relation", []):
        rid = r.get("id", "").replace("-", "")
        if len(rid) == 32:
            rid = f"{rid[:8]}-{rid[8:12]}-{rid[12:16]}-{rid[16:20]}-{rid[20:]}"
        if rid:
            result.append(rid)
    return result

def parse_client(p):
    props = p["properties"]
    return {
        "id":        p["id"],
        "nombre":    txt(props, "Nombre"),
        "potencial": sel(props, "Potencial"),
        "redes":     url_prop(props, "Redes"),
        "fuente":    sel(props, "Fuente"),
        "obs":       txt(props, "Observaciones"),
        "token":     txt(props, "Token"),
        "drive":     url_prop(props, "Drvie Cliente") or url_prop(props, "Drive Cliente"),
        "instagram": url_prop(props, "Instagram"),
        "facebook":  url_prop(props, "Facebook"),
        "tiktok":    url_prop(props, "Tik Tok") or url_prop(props, "TikTok"),
        "web":       url_prop(props, "Web"),
        "whatsapp":  url_prop(props, "WhatsApp Link") or url_prop(props, "WhatsApp"),
        "telefono":  props.get("Teléfono", {}).get("phone_number", "") or props.get("Telefono", {}).get("phone_number", ""),
        "celular":   props.get("Celular", {}).get("phone_number", ""),
        "url":       p.get("url","")
    }

def parse_project(p):
    props = p["properties"]
    fi, ff = date_prop(props, "Fecha Proyecto")
    return {
        "id":            p["id"],
        "nombre":        txt(props, "Nombre"),
        "cliente_ids":   rels(props, "Cliente"),
        "estadoProyecto":sel(props, "Estado Proyecto"),
        "estado":        sel(props, "Estado"),
        "area":          sel(props, "Área"),
        "formato":       sel(props, "Formato"),
        "prioridad":     sel(props, "Prioridad"),
        "ciclo":         sel(props, "Ciclo"),
        "esfuerzo":      sel(props, "Esfuerzo"),
        "plataformas":   msel(props, "Plataformas"),
        "fechaInicio":   fi,
        "fechaFin":      ff,
        "recursosDrive": url_prop(props, "Recursos DRIVE"),
        "costo":         num_prop(props, "Costo del Proyecto") or num_prop(props, "Costo"),
        "tarea_ids":     rels(props, "Tareas Proyecto"),
        "descripcion":   txt(props, "Descripción proyecto") or txt(props, "Descripción") or txt(props, "Descripcion") or "",
        "url":           p.get("url","")
    }

def parse_task(p):
    props = p["properties"]
    fp, _ = date_prop(props, "Fecha programada")
    fe, _ = date_prop(props, "Fecha de Entrega")
    return {
        "id":           p["id"],
        "titulo":       txt(props, "Titulo/Idea"),
        "estado":       sel(props, "Estado"),
        "area":         sel(props, "Área"),
        "asignado":     sel(props, "Asignado a"),
        "asignado_ids": rels(props, "Trabajador"),
        "formato":      sel(props, "Formato"),
        "esfuerzo":     sel(props, "Esfuerzo"),
        "prioridad":    sel(props, "Prioridad"),
        "plataformas":  msel(props, "Plataformas"),
        "contenido":    txt(props, "Contenido"),
        "copy":         txt(props, "Copy"),
        "adminNotes":   txt(props, "Notas Admin"),
        "notasCliente": txt(props, "Notas Cliente"),
        "fechaProg":    fp,
        "fechaEntrega": fe,
        "proyecto_ids": rels(props, "Proyectos") or rels(props, "Proyecto"),
        "cliente_ids":  rels(props, "Cliente") or rels(props, "Clientes"),
        "created":      p.get("created_time",""),
        "url":          p.get("url","")
    }

def parse_worker(p):
    props = p["properties"]
    nombre = txt(props, "Nombre") or txt(props, "Name") or "Sin nombre"
    return {
        "id":             p["id"],
        "nombre":         nombre,
        "rol":            sel(props, "Rol") or sel(props, "Role") or "",
        "disponibilidad": sel(props, "Disponibilidad") or "",
        "tarifa":         num_prop(props, "Tarifa") or num_prop(props, "Tarifa/hora") or 0,
        "especialidad":   msel(props, "Especialidad") or msel(props, "Skills") or [],
        "email":          props.get("Email", {}).get("email", "") or "",
        "telefono":       props.get("Teléfono", {}).get("phone_number", "") or
                          props.get("Telefono", {}).get("phone_number", "") or "",
        "contrato":       sel(props, "Tipo Contrato") or "",
        "portfolio":      url_prop(props, "Portfolio") or "",
        "notas":          txt(props, "Notas") or txt(props, "Observaciones") or "",
        "token":          txt(props, "Token Equipo") or txt(props, "Token") or "",
        "url":            p.get("url", ""),
        "created":        p.get("created_time", ""),
    }

def parse_recurso(p):
    props = p["properties"]
    # Generic parser: grab title + any text/url/select fields
    nombre = txt(props, "Nombre") or txt(props, "Name") or txt(props, "Titulo") or "Sin título"
    tipo = sel(props, "Tipo") or sel(props, "Categoría") or sel(props, "Categoria") or ""
    enlace = url_prop(props, "URL") or url_prop(props, "Enlace") or url_prop(props, "Link") or p.get("url","")
    desc = txt(props, "Descripción") or txt(props, "Descripcion") or txt(props, "Notas") or ""
    return {
        "id":      p["id"],
        "nombre":  nombre,
        "tipo":    tipo,
        "enlace":  enlace,
        "desc":    desc,
        "url":     p.get("url",""),
        "created": p.get("created_time","")
    }

# ── Sync: fetch everything ────────────────────────────────────────────────────
def build_sync():
    clientes_raw     = query_db(CLIENTES_DB)
    proyectos_raw    = query_db(PROYECTOS_DB)
    tareas_raw       = query_db(TAREAS_DB)
    recursos_raw     = query_db(RECURSOS_DB)
    trabajadores_raw = query_db(EQUIPO_DB) if EQUIPO_DB else []

    clientes     = [parse_client(p)   for p in clientes_raw]
    proyectos    = [parse_project(p)  for p in proyectos_raw]
    tareas       = [parse_task(p)     for p in tareas_raw]
    recursos     = [parse_recurso(p)  for p in recursos_raw]
    trabajadores = [parse_worker(p)   for p in trabajadores_raw]

    cli_by_id  = {c["id"]: c for c in clientes}
    proj_by_id = {p["id"]: p for p in proyectos}
    worker_by_id = {w["id"]: w for w in trabajadores}

    for p in proyectos:
        p["cliente"] = cli_by_id.get(p["cliente_ids"][0], {}).get("nombre","") if p["cliente_ids"] else ""

    for t in tareas:
        t["proyecto"] = proj_by_id.get(t["proyecto_ids"][0], {}).get("nombre","") if t["proyecto_ids"] else ""
        t["cliente"]  = cli_by_id.get(t["cliente_ids"][0],  {}).get("nombre","") if t["cliente_ids"] else ""
        if not t["cliente"] and t["proyecto_ids"]:
            proj = proj_by_id.get(t["proyecto_ids"][0], {})
            t["cliente"] = proj.get("cliente","")
            
        if t.get("asignado_ids"):
            w = worker_by_id.get(t["asignado_ids"][0])
            if w:
                t["asignado"] = w["nombre"]

    return {"clientes": clientes, "proyectos": proyectos, "tareas": tareas,
            "recursos": recursos, "trabajadores": trabajadores}

# ── HTTP Handler ──────────────────────────────────────────────────────────────
STATIC_DIR = os.path.dirname(os.path.abspath(__file__))

MIME = {
    ".html": "text/html; charset=utf-8",
    ".css":  "text/css",
    ".js":   "application/javascript",
    ".png":  "image/png",
    ".jpg":  "image/jpeg",
    ".svg":  "image/svg+xml",
}

class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args): pass

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_file(self, path, mime="text/html; charset=utf-8"):
        try:
            with open(path, "rb") as f:
                body = f.read()
            self.send_response(200)
            self.send_header("Content-Type", mime)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("X-Frame-Options", "SAMEORIGIN")
            self.end_headers()
            self.wfile.write(body)
        except FileNotFoundError:
            self.send_response(404); self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin","*")
        self.send_header("Access-Control-Allow-Methods","GET,POST,PATCH,OPTIONS")
        self.send_header("Access-Control-Allow-Headers","Content-Type")
        self.end_headers()

    def do_GET(self):
        p = urlparse(self.path).path
        print(f"DEBUG: GET {p}")

        if p == "/" or p == "/index.html":
            self.send_file(os.path.join(STATIC_DIR, "braindex-dashboard.html"))
        elif p == "/paquetes":
            self.send_file(os.path.join(STATIC_DIR, "brandex_paquetes_analisis_v4.html"))
        elif p == "/competidores":
            self.send_file(os.path.join(STATIC_DIR, "brandex_competidores.html"))
        elif p == "/api/sync":
            if not TOKEN:
                self.send_json({"error": "NOTION_TOKEN no configurado."}, 503)
            else:
                try:
                    self.send_json(build_sync())
                except Exception as e:
                    self.send_json({"error": str(e)}, 500)
        elif p == "/api/debug":
            r = notion("POST", f"/databases/{CLIENTES_DB}/query", {"page_size": 1})
            self.send_json({"token_preview": TOKEN[:20]+"...", "db_id": CLIENTES_DB, "notion_response": r})
        elif p == "/api/debug/tasks":
            r = notion("GET", f"/databases/{TAREAS_DB}")
            if "error" in r:
                self.send_json({"error": r["error"], "db_id": TAREAS_DB})
            else:
                props_schema = {}
                for k, v in r.get("properties",{}).items():
                    ptype = v.get("type","?")
                    info = {"type": ptype}
                    # For status/select, show valid options
                    if ptype == "status":
                        groups = v.get("status",{}).get("groups",[])
                        opts = []
                        for g in groups:
                            opts.extend([o.get("name","") for o in g.get("options",[])])
                        info["options"] = opts
                    elif ptype == "select":
                        info["options"] = [o.get("name","") for o in v.get("select",{}).get("options",[])]
                    props_schema[k] = info
                self.send_json({"db_id": TAREAS_DB, "properties": props_schema})
        elif p == "/api/debug/project":
            # Fetch the PROYECTOS_DB schema to show all property names and types
            r = notion("GET", f"/databases/{PROYECTOS_DB}")
            if "error" in r:
                self.send_json({"error": r["error"], "db_id": PROYECTOS_DB})
            else:
                props_schema = {k: v.get("type","?") for k, v in r.get("properties",{}).items()}
                self.send_json({
                    "db_id": PROYECTOS_DB,
                    "db_title": (r.get("title") or [{}])[0].get("plain_text",""),
                    "properties": props_schema,
                    "token_ok": bool(TOKEN)
                })
        elif p == "/api/focus":
            FOCUS_FILE = os.path.join(STATIC_DIR, "focus_config.json")
            if os.path.exists(FOCUS_FILE):
                try:
                    with open(FOCUS_FILE, "r") as f:
                        data = json.load(f)
                    self.send_json(data)
                except:
                    self.send_json([])
            else:
                self.send_json([])
        elif p == "/api/agent/config":
            self.send_json({"enabled": bool(DEEPSEEK_KEY)})
        else:
            self.send_response(404); self.end_headers()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        data = json.loads(self.rfile.read(length)) if length else {}
        p = urlparse(self.path).path
        print(f"DEBUG: POST {p}")

        if p == "/api/focus":
            FOCUS_FILE = os.path.join(STATIC_DIR, "focus_config.json")
            try:
                with open(FOCUS_FILE, "w") as f:
                    json.dump(data, f)
                self.send_json({"ok": True})
            except Exception as e:
                self.send_json({"error": str(e)}, 500)
        elif p == "/api/task/create":
            # ── Step 1: Create the page (cascade: status → select → safe-only) ──
            errors = []
            props = build_task_props(data, "status")
            r = notion("POST", "/pages", {"parent":{"database_id":TAREAS_DB},"properties":props})
            if "error" in r:
                errors.append(f"status: {r['error']}")
                props2 = build_task_props(data, "select")
                r2 = notion("POST", "/pages", {"parent":{"database_id":TAREAS_DB},"properties":props2})
                if "error" not in r2:
                    r = r2
                else:
                    errors.append(f"select: {r2['error']}")
                    props3 = _task_safe_props(data)
                    r3 = notion("POST", "/pages", {"parent":{"database_id":TAREAS_DB},"properties":props3})
                    if "error" not in r3:
                        r = r3
                    else:
                        errors.append(f"safe: {r3['error']}")
                        r = {"error": " | ".join(errors)}

            # ── Step 2: Guarantee relations are set via a dedicated PATCH ──────
            # Notion sometimes silently drops relation fields during page creation
            # (integration access / race condition). A standalone PATCH with ONLY
            # relation properties is always accepted when the pages are accessible.
            page_id = r.get("id", "")
            if page_id:
                rel_props = {}
                pid = to_uuid(_pick(data, "proyecto_id", "proyecto_ids"))
                if pid:
                    rel_props["Proyectos"] = {"relation": [{"id": pid}]}
                cid = to_uuid(_pick(data, "cliente_id", "cliente_ids"))
                if cid:
                    rel_props["Cliente"] = {"relation": [{"id": cid}]}
                if rel_props:
                    r_rel = notion("PATCH", f"/pages/{page_id}", {"properties": rel_props})
                    if "error" in r_rel:
                        print(f"⚠️  Relations PATCH failed for {page_id}: {r_rel['error']}")

            self.send_json({"ok": "error" not in r, "id": page_id or r.get("id",""), "error": r.get("error","")})
        elif p == "/api/project/create":
            errors = []
            r = None
            # Try 1: status type (most common in modern Notion DBs)
            props = build_proj_props(data, "status")
            r = notion("POST", "/pages", {"parent":{"database_id":PROYECTOS_DB},"properties":props})
            if "error" in r:
                errors.append(f"status: {r['error']}")
                # Try 2: select type (legacy Notion DBs)
                props2 = build_proj_props(data, "select")
                r2 = notion("POST", "/pages", {"parent":{"database_id":PROYECTOS_DB},"properties":props2})
                if "error" not in r2:
                    r = r2
                else:
                    errors.append(f"select: {r2['error']}")
                    # Try 3: only safe fields (title, date, number, url, relation)
                    props3 = _proj_safe_props(data)
                    r3 = notion("POST", "/pages", {"parent":{"database_id":PROYECTOS_DB},"properties":props3})
                    if "error" not in r3:
                        r = r3  # created successfully with minimal fields
                    else:
                        errors.append(f"safe: {r3['error']}")
                        # Try 4: absolute minimum — title only
                        nombre = (data.get("nombre") or "Nuevo Proyecto").strip()
                        props4 = {"Nombre": {"title":[{"text":{"content": nombre}}]}}
                        r4 = notion("POST", "/pages", {"parent":{"database_id":PROYECTOS_DB},"properties":props4})
                        if "error" not in r4:
                            r = r4
                        else:
                            errors.append(f"title-only: {r4['error']}")
                            r = {"error": " | ".join(errors)}
            self.send_json({"ok": "error" not in r, "id": r.get("id",""), "error": r.get("error","")})
        elif p == "/api/client/create":
            nombre = data.get("nombre", "Nuevo Cliente")
            props = {"Nombre": {"title":[{"text":{"content": nombre}}]}}
            r = notion("POST", "/pages", {"parent":{"database_id":CLIENTES_DB},"properties":props})
            self.send_json({"ok": "error" not in r, "id": r.get("id",""), "error": r.get("error","")})
        elif p == "/api/worker/create":
            if not EQUIPO_DB:
                self.send_json({"ok": False, "error": "EQUIPO_DB no configurada en .env.example"})
            else:
                props = build_worker_props(data)
                r = notion("POST", "/pages", {"parent":{"database_id":EQUIPO_DB},"properties":props})
                self.send_json({"ok": "error" not in r, "id": r.get("id",""), "error": r.get("error","")})

        elif p == "/api/auth/admin":
            # Verifica credenciales de admin — nunca enviar user/pass al frontend
            u = data.get("user","").strip()
            pw = data.get("pass","").strip()
            if u == ADMIN_USER and pw == ADMIN_PASS:
                self.send_json({"ok": True, "role": "admin", "nombre": ADMIN_USER})
            else:
                self.send_json({"ok": False, "error": "Credenciales incorrectas"}, 401)

        elif p == "/api/auth/token":
            # Busca el token en clientes y trabajadores
            token_input = data.get("token","").strip()
            if not token_input:
                self.send_json({"ok": False, "error": "Token vacío"}, 400)
            else:
                found = None
                # Buscar en clientes
                try:
                    clientes_raw = query_db(CLIENTES_DB)
                    for pg in clientes_raw:
                        c = parse_client(pg)
                        if c.get("token") and c["token"].strip() == token_input:
                            found = {"ok": True, "role": "cliente", "id": c["id"],
                                     "nombre": c["nombre"], "token": token_input}
                            break
                except: pass
                # Buscar en trabajadores si no encontrado
                if not found and EQUIPO_DB:
                    try:
                        trabajadores_raw = query_db(EQUIPO_DB)
                        for pg in trabajadores_raw:
                            w = parse_worker(pg)
                            if w.get("token") and w["token"].strip() == token_input:
                                # Determine role based on Worker "rol" field
                                worker_rol = (w.get("rol") or "").lower()
                                final_role = "admin" if "admin" in worker_rol else "diseno"
                                
                                found = {"ok": True, "role": final_role, "id": w["id"],
                                         "nombre": w["nombre"], "token": token_input}
                                break
                    except: pass
                if found:
                    self.send_json(found)
                else:
                    self.send_json({"ok": False, "error": "Token no válido"}, 401)

        elif p == "/api/token/set":
            record_type = data.get("type","")   # "client" o "worker"
            page_id     = data.get("id","")
            new_token   = data.get("token","").strip()
            if not page_id or not new_token:
                self.send_json({"ok": False, "error": "Faltan parámetros"}, 400)
            else:
                # Clientes → "Token", Equipo/Trabajadores → "Token Equipo"
                prop_name = "Token Equipo" if record_type == "worker" else "Token"
                props = {prop_name: {"rich_text":[{"text":{"content": new_token}}]}}
                r = notion("PATCH", f"/pages/{page_id}", {"properties": props})
                self.send_json({"ok": "error" not in r, "error": r.get("error","")})

        elif p == "/api/agent/chat":
            if not DEEPSEEK_KEY:
                self.send_json({"error": "DEEPSEEK_API_KEY no configurado en el servidor."}, 503)
                return
            messages = data.get("messages", [])
            system_prompt = {
                "role": "system",
                "content": """Eres el Agente Inteligente de Brandex OS. Tu objetivo es ayudar al usuario a gestionar sus proyectos, tareas y clientes en Notion.
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
                4. Identifica IDs de proyectos o clientes si el usuario los menciona por nombre.
                """
            }
            payload = {
                "model": "deepseek-chat",
                "messages": [system_prompt] + messages,
                "response_format": { "type": "json_object" }
            }
            try:
                req = Request(DEEPSEEK_URL, data=json.dumps(payload).encode(), method="POST", headers={
                    "Authorization": f"Bearer {DEEPSEEK_KEY}",
                    "Content-Type": "application/json"
                })
                with urlopen(req, timeout=30) as resp:
                    res_body = resp.read()
                    full_res = json.loads(res_body)
                    content_str = full_res["choices"][0]["message"]["content"]
                    self.send_json(json.loads(content_str))
            except Exception as e:
                self.send_json({"error": str(e)}, 500)
        else:
            self.send_response(404); self.end_headers()

    def do_PATCH(self):
        length = int(self.headers.get("Content-Length", 0))
        data = json.loads(self.rfile.read(length)) if length else {}
        p = urlparse(self.path).path

        if p == "/api/client/update":
            page_id = data.pop("id")
            props = {}
            if "redes"     in data: props["Redes"]        = {"url": data["redes"] or None}
            if "obs"       in data: props["Observaciones"] = {"rich_text":[{"text":{"content":data["obs"]}}]}
            if "potencial" in data: props["Potencial"]     = {"status":{"name":data["potencial"]}}
            if "fuente"    in data: props["Fuente"]        = {"select":{"name":data["fuente"]}}
            if "drive"     in data: props["Drvie Cliente"] = {"url": data["drive"] or None}
            r = notion("PATCH", f"/pages/{page_id}", {"properties":props})
            self.send_json({"ok": "error" not in r})
        elif p == "/api/task/update":
            page_id = data.get("id")
            if not page_id:
                return self.send_json({"ok": False, "error": "No task ID provided"})
            
            print(f"DEBUG: Updating Task {page_id} with data: {data}")
            props = build_task_update_props(data, "status")
            print(f"DEBUG: Final Task Props: {json.dumps(props, ensure_ascii=False)}")
            
            r = notion("PATCH", f"/pages/{page_id}", {"properties": props})
            
            ok = "error" not in r
            error = r.get("error", "")
            print(f"DEBUG: Task update result: {ok}")
            self.send_json({"ok": ok, "error": error})
        elif p == "/api/worker/update":
            page_id = data.pop("id")
            props = {}
            if "nombre"         in data and data["nombre"]:
                props["Nombre"]        = {"title":[{"text":{"content":data["nombre"]}}]}
            if "rol"            in data and data["rol"]:
                props["Rol"]           = {"select":{"name":data["rol"]}}
            if "disponibilidad" in data and data["disponibilidad"]:
                props["Disponibilidad"]= {"select":{"name":data["disponibilidad"]}}
            if "tarifa"         in data and data["tarifa"]:
                try: props["Tarifa"]   = {"number": float(data["tarifa"])}
                except: pass
            if "contrato"       in data and data["contrato"]:
                props["Tipo Contrato"] = {"select":{"name":data["contrato"]}}
            if "notas"          in data:
                props["Notas"]         = {"rich_text":[{"text":{"content":data["notas"]}}]}
            r = notion("PATCH", f"/pages/{page_id}", {"properties":props})
            self.send_json({"ok": "error" not in r, "error": r.get("error","")})
        elif p == "/api/project/update":
            page_id = data.get("id")
            if not page_id:
                return self.send_json({"ok": False, "error": "No project ID provided"})
            
            print(f"DEBUG: Updating Project {page_id} with data: {data}")
            props = build_proj_props(data, "status")
            print(f"DEBUG: Final Project Props: {json.dumps(props, ensure_ascii=False)}")
            
            r = notion("PATCH", f"/pages/{page_id}", {"properties": props})
            
            ok = "error" not in r
            error = r.get("error", "")
            print(f"DEBUG: Project update result: {ok}")
            self.send_json({"ok": ok, "error": error})
        else:
            self.send_response(404); self.end_headers()

# ── Property builders ─────────────────────────────────────────────────────────
def _pick(d, singular, plural):
    """Accept either singular string key or first element of plural list key."""
    v = d.get(singular) or ""
    if not v:
        arr = d.get(plural) or []
        v = arr[0] if arr else ""
    return v or None

def to_uuid(s):
    if not s: return ""
    s = s.replace("-", "")
    if len(s) == 32: return f"{s[:8]}-{s[8:12]}-{s[12:16]}-{s[16:20]}-{s[20:]}"
    return s

def _task_safe_props(d):
    """Build task properties using only unambiguous types (title, rich_text, date, relation)."""
    p = {"Titulo/Idea": {"title":[{"text":{"content":d.get("titulo","Nueva Tarea")}}]}}
    if d.get("contenido"):    p["Contenido"]        = {"rich_text":[{"text":{"content":d["contenido"]}}]}
    if d.get("fechaEntrega"): p["Fecha de Entrega"] = {"date":{"start":d["fechaEntrega"]}}
    if d.get("fechaProg"):    p["Fecha programada"] = {"date":{"start":d["fechaProg"]}}
    # Ensure IDs are formatted as UUIDv4 with dashes
    pid = to_uuid(_pick(d, "proyecto_id", "proyecto_ids"))
    if pid: p["Proyectos"] = {"relation":[{"id": pid}]}
    cid = to_uuid(_pick(d, "cliente_id", "cliente_ids"))
    if cid: p["Cliente"]   = {"relation":[{"id": cid}]}
    
    # Asignados (Trabajador relation)
    aids = d.get("asignado_ids") or []
    if aids:
        p["Trabajador"] = {"relation": [{"id": to_uuid(aid)} for aid in aids]}
    return p

def build_task_props(d, choice_type="status"):
    p = _task_safe_props(d)
    # "Estado" and other choice fields are 'status' type in this DB
    if d.get("estado"):
        p["Estado"] = {choice_type: {"name": d["estado"]}}
    
    CHOICE_FIELDS = [("area","Área"),("formato","Formato"),("esfuerzo","Esfuerzo"),("prioridad","Prioridad")]
    for key, prop in CHOICE_FIELDS:
        if d.get(key):
            p[prop] = {choice_type: {"name": d[key]}}
    
    if d.get("asignado"):    p["Asignado a"]  = {"select":{"name":d["asignado"]}}
    if d.get("plataformas"): p["Plataformas"] = {"multi_select":[{"name":x} for x in d["plataformas"]]}
    return p

def build_worker_props(d):
    p = {"Nombre": {"title":[{"text":{"content":d.get("nombre","Nuevo Trabajador")}}]}}
    if d.get("rol"):            p["Rol"]           = {"select":{"name":d["rol"]}}
    if d.get("disponibilidad"): p["Disponibilidad"]= {"select":{"name":d["disponibilidad"]}}
    if d.get("tarifa"):
        try: p["Tarifa"]       = {"number": float(d["tarifa"])}
        except: pass
    if d.get("contrato"):       p["Tipo Contrato"] = {"select":{"name":d["contrato"]}}
    if d.get("especialidad"):   p["Especialidad"]  = {"multi_select":[{"name":x} for x in d["especialidad"]]}
    if d.get("notas"):          p["Notas"]         = {"rich_text":[{"text":{"content":d["notas"]}}]}
    if d.get("portfolio"):      p["Portfolio"]      = {"url":d["portfolio"]}
    return p

def _proj_safe_props(d):
    """Build project properties using only unambiguous Notion field types
    (title, rich_text, relation, number, url, date) — always safe regardless of DB config."""
    p = {}
    if d.get("nombre"):
        p["Nombre"] = {"title":[{"text":{"content": d["nombre"]}}]}
    
    cid = (_pick(d, "cliente_id", "cliente_ids") or "").replace("-","")
    if len(cid) >= 32:
        p["Cliente"] = {"relation":[{"id": cid}]}
    
    if d.get("recursosDrive"):
        p["Recursos DRIVE"] = {"url": d["recursosDrive"]}
    
    if d.get("costo"):
        try: p["Costo del Proyecto"] = {"number": float(d["costo"])}
        except: pass
    
    fi = (d.get("fechaInicio") or "").strip()
    ff = (d.get("fechaFin") or "").strip()
    if fi or ff:
        p["Fecha Proyecto"] = {"date":{"start": fi or ff, "end": ff or None}}
    
    # Description — rich_text, always safe
    if d.get("descripcion"):
        p["Descripción proyecto"] = {"rich_text":[{"text":{"content": d["descripcion"]}}]}
    return p

def _proj_choice_props(d, choice_type="status"):
    """Build the status/select fields.
    Identified mapping for this specific DB: most choice fields are 'status'."""
    p = {}
    # Estado Proyecto — in this DB it is specifically 'select'
    if d.get("estadoProyecto"):
        p["Estado Proyecto"] = {"select": {"name": d["estadoProyecto"]}}
    
    # These fields were discovered to be 'status' type
    CHOICE_FIELDS = [("prioridad","Prioridad"),("area","Área"),("formato","Formato"),("ciclo","Ciclo"),("estado","Estado"),("esfuerzo","Esfuerzo")]
    for key, prop in CHOICE_FIELDS:
        if d.get(key):
            p[prop] = {choice_type: {"name": d[key]}}
            
    if d.get("plataformas"):
        p["Plataformas"] = {"multi_select":[{"name":x} for x in d["plataformas"] if x]}
    return p

def build_proj_props(d, choice_type="status"):
    p = _proj_safe_props(d)
    p.update(_proj_choice_props(d, choice_type))
    return p

def build_task_update_props(data, choice_type="status"):
    """Build PATCH props for updating an existing task.
    Identified choice_type as 'status' for this specific DB."""
    props = {}
    if data.get("titulo"):
        props["Titulo/Idea"] = {"title":[{"text":{"content":data["titulo"]}}]}
    
    if data.get("estado"):
        props["Estado"] = {choice_type: {"name": data["estado"]}}
    
    # These were previously incorrectly mapped as 'select'
    # Debug info shows they are 'status' type in this DB
    CHOICE_FIELDS = [("prioridad","Prioridad"),("formato","Formato"),("area","Área"),("esfuerzo","Esfuerzo")]
    for key, prop in CHOICE_FIELDS:
        if key in data and data[key]:
            props[prop] = {choice_type: {"name": data[key]}}

    if "asignado" in data:
        props["Asignado a"] = {"select":{"name":data["asignado"]}} if data["asignado"] else {"select":None}
    
    if "contenido" in data:
        props["Contenido"] = {"rich_text":[{"text":{"content":data["contenido"]}}]}
    if "admin_notes" in data:
        props["Notas Admin"] = {"rich_text":[{"text":{"content":data["admin_notes"]}}]}
    if "notasCliente" in data:
        props["Notas Cliente"] = {"rich_text":[{"text":{"content":data["notasCliente"]}}]}
    
    if data.get("fechaProg"):
        props["Fecha programada"] = {"date":{"start":data["fechaProg"]}}
    if data.get("fechaEntrega"):
        props["Fecha de Entrega"] = {"date":{"start":data["fechaEntrega"]}}
    
    if "proyecto_ids" in data or "proyecto_id" in data:
        pid = to_uuid(_pick(data, "proyecto_id", "proyecto_ids"))
        props["Proyectos"] = {"relation": [{"id": pid}] if pid else []}

    if "cliente_ids" in data or "cliente_id" in data:
        cid = to_uuid(_pick(data, "cliente_id", "cliente_ids"))
        props["Cliente"] = {"relation": [{"id": cid}] if cid else []}
        
    if "asignado_ids" in data:
        aids = data["asignado_ids"]
        props["Trabajador"] = {"relation": [{"id": to_uuid(aid)} for aid in aids]}

    return props

# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\n" + "="*50)
    print("  BRAINDEX OS — Servidor Local")
    print("="*50)
    if not TOKEN:
        print("\n  NOTION_TOKEN no configurado.")
        print("  Abre .env.example y agrega tu token.\n")
    else:
        print(f"\n  Token de Notion configurado")
    print(f"  Dashboard: http://localhost:{PORT}")
    print("  Para detener: Ctrl+C\n")

    def abrir():
        time.sleep(1.5)
        webbrowser.open(f"http://localhost:{PORT}")
    threading.Thread(target=abrir, daemon=True).start()

    try:
        server = HTTPServer(("localhost", PORT), Handler)
        server.serve_forever()
    except OSError:
        print(f"\n  ERROR: Puerto {PORT} ocupado. Cambia PORT en .env.example\n")
    except KeyboardInterrupt:
        print("\n  Servidor detenido. Hasta luego!")
