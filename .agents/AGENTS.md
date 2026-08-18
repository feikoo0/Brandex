# Rules for Taski Development

## Dev Server & Build Management

To prevent desynchronization errors and 404 resource crashes in the Next.js development server:

1. **Avoid running `npm run build` or `next build` while `npm run dev` is active.**
   - Running them concurrently overwrites `.next` manifests and compiled assets, causing the running development server to return `404` for all hot-reloaded chunks requested by the browser.
2. **Checking Types and Linting Safely**:
   - To verify code formatting and compilation validity, do NOT run `npm run build`.
   - Instead, use the following non-modifying commands:
     - Check TypeScript compiler errors: `npx tsc --noEmit`
     - Check ESLint issues: `npm run lint`
3. **Recovery Procedure**:
   - If a build check is run and causes 404 styling/javascript issues on the client:
     - Stop the running development server process.
     - Clean the Next.js cache directory: `rm -rf .next`
     - Restart the server: `npm run dev`


## Taski Aesthetic & Design System Protocol (Official Defaults)

To maintain complete visual harmony across all views, components, and future implementations in Taski:

### 1. Layered Surface Hierarchy & Exact Colors
* **Layer 0 (Outer Frame / Base Canvas):** `#181817` (`bg-[#181817]`).
* **Layer 1 (Main Work Canvas / View Container):**
  - Background: `#121212` (`bg-[#121212]`).
  - Outline / Stroke: `border-white/[0.08]` (`rgba(255, 255, 255, 0.08)`).
  - Corner Radius: `rounded-[24px]` (24px).
* **Layer 2A (Module Columns & Section Blocks, e.g. Sessions Module):**
  - Background: `#1f1f1f` (`bg-[#1f1f1f]`).
  - Corner Radius: `rounded-[28px]` (28px).
* **Layer 2B (Cards & Containers):**
  - Background: `#181818` (`bg-[#181818]`).
  - Stroke: `border border-white/10` (`rgba(255, 255, 255, 0.10)`).
  - Corner Radius: `rounded-[24px]` / `rounded-3xl`.
* **Layer 3 (Inputs, Sub-panels & Secondary Action Controls):**
  - Background: `#222222` (`bg-[#222222]`).
  - Stroke: `border border-white/10`.
  - Corner Radius: `rounded-xl` (12px).
* **Layer 4 (Micro-Cards, Feed Items & Session Cards):**
  - Resting Background: `bg-white/[0.025]` (`rgba(255, 255, 255, 0.025)`).
  - Hover Background: `hover:bg-white/[0.045]` (`rgba(255, 255, 255, 0.045)`).
  - Corner Radius: `rounded-2xl` (16px).

### 2. Navigation & Sidebar Defaults
* **Sidebar Base:** `bg-transparent` directly over Layer 0 (`#181817`).
* **"Nuevo proyecto" Button & Active Nav Item:** `bg-white/10` with `border-[#ffffff1f]` (`rgba(255, 255, 255, 0.12)`).
* **Nav Item Hover:** `bg-white/5` (`rgba(255, 255, 255, 0.05)`).
* **Nav Item Resting:** `bg-transparent`.

### 3. Crisp Stroke Lines & Outlines (Trazos Finos)
* All cards, pills, buttons, inputs, and popovers MUST have a crisp, fine stroke border (`border border-white/10` or `border-white/[0.08]`).
* Dividers: `border-white/5` or `border-white/10` (`h-px bg-white/10`).
* Shadows: Subtle and soft (`shadow-sm` or `shadow-2xl shadow-black/50` for floating modals/cards), avoiding neon glowing drop-shadows.

### 4. Typography & Text Contrast Palette
* **Primary / Header Text:** MUST use `text-[#ffffffd6]` (`rgba(255, 255, 255, 0.84)`), NEVER pure `#ffffff`.
* **Muted Subtext & Secondary Labels:** `text-[#ffffff6b]` (`rgba(255, 255, 255, 0.42)`) or `text-white/40`.
* **Action Accent Color:** `var(--blue)` (`#3a7bd5`) or solid `#1c1c24` with fine stroke.
* **Semantic Status Pills:**
  - Urgente = `bg-rose-500/20 text-rose-400 border-rose-500/40`
  - Alta = `bg-orange-500/20 text-orange-400 border-orange-500/40`
  - Media = `bg-yellow-500/20 text-yellow-400 border-yellow-500/40`
  - Baja / Completado = `bg-emerald-500/20 text-emerald-400 border-emerald-500/40`

### 5. Project Card Architecture
* **Style 1 (Portada):** Top banner in solid project color (`projColor`) containing white stroke outline task format shapes (`ProjectCoverFormats`), bottom dark body `#1a1a1a` with title in `text-[#ffffffd6]`, client name + date in `text-[#ffffff6b]`, and bottom segmented progress bar (`Tarea X de Y` + flex segments).
* **Style 2 (Color Completo):** Full vibrant project color background, top meta `Cliente • Entrega X`, white stroke format icon box, title + subtitle, and bottom segmented progress bar.


## Figma Integration Protocol

1. **Authentication**: Conectado mediante `FIGMA_PERSONAL_ACCESS_TOKEN` almacenado en `.env.local` para el usuario Feiko (`contacto.milenial@gmail.com`).
2. **Lectura de Diseños**: Al recibir la URL de un archivo de Figma (`https://www.figma.com/design/:file_key/...`), Antigravity extraerá las capas, coordenadas, espaciados y vectores a través de la API REST de Figma (`https://api.figma.com/v1/files/:file_key`).
3. **Conversión a Código**: Traducir directamente los marcos y formas de Figma a componentes React + Tailwind CSS preservando dimensiones, curvaturas y paletas exactas.


## Taski Pure Firestore Data Model & Real-Time Sync Protocol

Taski opera de forma 100% nativa sobre Google Cloud Firestore como Fuente Única de Verdad (Single Source of Truth). Queda **estrictamente prohibido** reintroducir sincronizadores de Notion o servidores intermediarios externos.

### 1. Colecciones Oficiales de Firestore
* **`clients`**: Documentos con datos de marcas (`nombre`, `color`, `customColor`, `finanzas`, `status`, `industria`, `drive_links`, `notas_internas`).
* **`members`**: Documentos con datos de colaboradores (`nombre`, `rol`, `color`, `skills`, `proyectos_asignados`, `disponibilidad`, `drive_links`).
* **`projects`**: Documentos de campañas y proyectos (`nombre`, `color`, `cliente_ids`, `asignado_ids`, `estadoProyecto`, `costo`, `fechaInicio`, `fechaFin`).
* **`tasks`**: Documentos de entregables atómicos (`titulo`, `formato`, `esfuerzo`, `estado`, `proyecto_ids`, `cliente_ids`, `asignado_ids`).
* **`sessions`**: Registro de sesiones de tiempo reales (`startTime`, `endTime`, `durationSeconds`, `taskId`, `projectId`, `workerId`).

### 2. Hooks Oficiales
* `useClients()` (`@/hooks/useClients`): Gestión y escucha en tiempo real de `clients`.
* `useMembers()` (`@/hooks/useMembers`): Gestión y escucha en tiempo real de `members`.
* `useData()` (`@/hooks/useData`): Caché reactiva unificada (TanStack Query) alimentada exclusivamente por Firestore.
* `useProjectSummary(id)` (`@/hooks/useProjectSummary`): Resolución automática de cliente (`clientName`, `client`), tareas asociadas, progreso porcentual y formatos.
* `useSessions()` (`@/hooks/useSessions`): Cronómetro en vivo y persistencia de sesiones.

### 3. Reglas de Propagación y Sincronización
1. **Colores de Marca y Proyectos**: Cualquier componente que renderice una portada, borde o punto de color DEBE usar `getSingleSourceClientColor(client)` o `getSingleSourceProjectColor(project)`.
2. **Formatos Vectoriales en Portada**: Las formas de portada (`ProjectCoverFormats`) deben leer dinámicamente las tareas asociadas (`tasks.map(t => t.formato)`) o el catálogo de la especialidad del miembro.
3. **Selectores de Clientes y Miembros**: Todo popover o dropdown de selección (e.g. en `ProjectFullScreenView`, `ProjectModal`, `TaskModal`) debe consumir directamente `useClients()` y `useMembers()`.
4. **Barras de Progreso**: El progreso de un proyecto (`Tarea X de Y`) se calcula reactivamente como `tareas.filter(t => t.estado === 'Completado').length / tareas.length`.
5. **Timestamps Obligatorios en todas las Colecciones**: Toda creación (`createdAt: serverTimestamp()`, `created_at: serverTimestamp()`) y toda actualización (`updatedAt: serverTimestamp()`, `updated_at: serverTimestamp()`) DEBE persistir timestamps oficiales de Firestore en `clients`, `members`, `projects`, `tasks` y `sessions` para permitir ordenamiento por recientes, alertas y trazabilidad de sincronización.

