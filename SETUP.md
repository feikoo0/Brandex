# Braindex OS v2 — Guía de instalación

## Requisitos previos

Verifica que tienes instalado:

```bash
node --version   # necesitas v18 o superior
npm --version    # cualquier versión reciente
python3 --version # para el server.py
```

Si no tienes Node.js, descárgalo de: https://nodejs.org (elige la versión LTS)

---

## 1. Mueve los archivos del proyecto

Coloca esta carpeta `taski/` donde prefieras, por ejemplo:
```
~/Documentos/taski/
```

Tu `server.py` debe estar **en la carpeta padre** (un nivel arriba), así:
```
~/Documentos/
  taski/     ← este proyecto Next.js
  server.py        ← tu backend Python existente
  .env.example
```

---

## 2. Instala dependencias de Node.js

```bash
cd taski
npm install
```

Esto instalará: Next.js, Tailwind, Zustand, TanStack Query, Lucide React, Radix UI.
Tarda ~2 minutos la primera vez.

---

## 3. Configura las variables de entorno

```bash
cp .env.local.example .env.local
```

El archivo `.env.local` ya viene configurado para apuntar a tu Python server en
`http://localhost:8787`. Si usas un puerto distinto, edita esa línea.

---

## 4. Instala shadcn/ui (componentes de alta gama)

```bash
npx shadcn@latest init
```

Cuando te pregunte, responde:
- Style: `Default`
- Base color: `Slate`
- CSS variables: `Yes`

Luego agrega los componentes que necesitas:
```bash
npx shadcn@latest add button input select textarea dialog tooltip badge
```

---

## 5. Arranca el sistema

Necesitas **dos terminales**:

### Terminal 1 — Python backend (tu server.py existente)
```bash
cd ..           # sube un nivel a donde está server.py
python3 server.py
# debe mostrar: "BRAINDEX OS — Servidor Local" en http://localhost:8787
```

### Terminal 2 — Next.js frontend
```bash
cd taski
npm run dev
# abre http://localhost:3000
```

---

## 6. Abre el navegador

Ve a: **http://localhost:3000**

Verás la pantalla de login. Ingresa cualquier token que tengas registrado
en tu base de datos de Notion (los mismos que usabas antes).

---

## Estructura del proyecto

```
taski/
├── app/
│   ├── page.tsx                  # Login / role picker
│   ├── layout.tsx                # Root layout + providers
│   ├── providers.tsx             # TanStack Query provider
│   └── (dashboard)/
│       ├── layout.tsx            # Sidebar + topbar + EntityModal
│       ├── admin/page.tsx        # Dashboard del admin
│       ├── equipo/page.tsx       # Vista del equipo
│       └── cliente/page.tsx      # Vista del cliente
├── components/
│   ├── layout/
│   │   ├── AppSidebar.tsx        # Sidebar con navegación por rol
│   │   └── Topbar.tsx            # Header con botón "+" para admin
│   ├── modals/
│   │   └── EntityModal.tsx       # Panel de detalle (tarea/proyecto/cliente)
│   └── views/
│       └── PulseView.tsx         # Dashboard principal del admin
├── lib/
│   ├── types.ts                  # Todos los tipos TypeScript
│   ├── constants.ts              # ESTADO_OPTS, PRIO_OPTS, colores...
│   ├── utils.ts                  # Helpers (cn, fmtDate, greeting...)
│   ├── api.ts                    # Cliente HTTP → Python server
│   └── store.ts                  # Zustand: authStore + uiStore
└── hooks/
    └── useData.ts                # TanStack Query: sync, mutations
```

---

## Cómo agregar una nueva vista

1. Crea el componente en `components/views/MiVista.tsx`
2. Importa y agrega el `case` en `app/(dashboard)/admin/page.tsx`:

```tsx
// En admin/page.tsx
import { MiVista } from "@/components/views/MiVista";

// Dentro de renderTab():
case "mi-tab":
  return <MiVista />;
```

3. Agrega la entrada al sidebar en `lib/constants.ts`:

```ts
{ tab: "mi-tab", label: "Mi Vista" }
```

---

## Migrar un endpoint de Python a Next.js

Cuando quieras mover lógica de `server.py` a Next.js:

1. Crea `app/api/task/create/route.ts`
2. Next.js lo usará automáticamente para `/api/task/create`
3. El `rewrite` en `next.config.ts` solo actúa si no existe un archivo local

```ts
// app/api/task/create/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const data = await req.json();
  const notionToken = process.env.NOTION_TOKEN!;
  // ... lógica de Notion aquí
  return NextResponse.json({ ok: true });
}
```

---

## Deploy a Vercel (cuando estés listo)

```bash
npm install -g vercel
vercel
```

Agrega en el dashboard de Vercel → Settings → Environment Variables:
- `NOTION_TOKEN` = tu token de Notion (cuando migres los endpoints)

---

## Preguntas frecuentes

**¿Por qué no veo datos?**
→ Verifica que `server.py` está corriendo en el puerto 8787.
→ Abre http://localhost:8787/api/sync en el navegador y revisa la respuesta.

**¿Error "Cannot find module"?**
→ Corre `npm install` de nuevo.

**¿Error de TypeScript en el editor?**
→ Corre `npx tsc --noEmit` para ver los errores exactos.
