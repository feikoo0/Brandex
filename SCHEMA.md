# Arquitectura y Modelo de Datos de Taski (Firestore Native)

> **Nota para la IA y Desarrolladores**: Este documento es la fuente de verdad oficial del modelo de datos de Taski. **Todas las lecturas, escrituras, hooks y componentes operan de forma nativa sobre Firebase Firestore.**

---

## 1. Arquitectura General (Single Source of Truth)

Taski opera al 100% sobre **Google Cloud Firestore**. Se ha eliminado por completo cualquier dependencia con servidores intermediarios (Python/Notion).

### Colecciones Nativas de Firestore

| Colección | Identificador Documento | Propósito | Hook Principal |
| :--- | :--- | :--- | :--- |
| **`clients`** | `String` (ej. `"1"`, `"cli-178...`) | Directorio de marcas y clientes corporativos | `useClients()` |
| **`members`** | `String` (ej. `"1"`, `"mem-178...`) | Directorio de colaboradores y talento del equipo | `useMembers()` |
| **`projects`** | `String` (ej. `"1"`, `"proj-178...`) | Campañas, desarrollos web y proyectos agrupados | `useData()`, `useProjectSummary()` |
| **`tasks`** | `String` (ej. `"1"`, `"task-178...`) | Entregables atómicos de diseño, video, código y copia | `useData()` |
| **`sessions`** | `String` (ej. `"sess-178...`) | Registro de sesiones de tiempo reales (Maker Mode) | `useSessions()` |

---

## 2. Diagrama de Relaciones de Entidades

```mermaid
erDiagram
    CLIENT ||--o{ PROJECT : "posee (Project.cliente_ids)"
    CLIENT ||--o{ TASK : "solicita (Task.cliente_ids)"
    PROJECT ||--o{ TASK : "contiene (Task.proyecto_ids / Project.tarea_ids)"
    MEMBER ||--o{ TASK : "ejecuta (Task.asignado_ids)"
    TASK ||--o{ SESSION : "cronometra (Session.taskId)"
    MEMBER ||--o{ SESSION : "registra (Session.workerId)"
```

---

## 3. Matriz de Sincronización entre Componentes

| Colección | Propiedades Reactivas | Componentes que la Consumen | Efecto Visual / Lógica |
| :--- | :--- | :--- | :--- |
| **`clients`** | • `nombre`<br/>• `color` / `customColor`<br/>• `finanzas`<br/>• `status`<br/>• `industria` | • `ClientsDashboard.tsx`<br/>• `ClientCard.tsx`<br/>• `ProjectFullScreenView.tsx`<br/>• `EntityDetailView.tsx`<br/>• `FinanzasGlobalesDashboard.tsx` | 1. Refleja el color HSL corporativo en la portada.<br/>2. Llena el popover de clientes en proyectos y tareas.<br/>3. Alimenta los KPIs de Valor de Cartera y Facturación.<br/>4. Renderiza logos/avatares en las tarjetas de colaboradores asignados. |
| **`members`** | • `nombre`<br/>• `rol` / `specialty`<br/>• `color`<br/>• `skills`<br/>• `proyectos_asignados`<br/>• `disponibilidad` | • `TeamDashboard.tsx`<br/>• `MemberCard.tsx`<br/>• `ProjectFullScreenView.tsx`<br/>• `TaskCard.tsx`<br/>• `EntityDetailView.tsx` | 1. Llena el popover de asignados (`A` pill) en proyectos.<br/>2. Calcula % de Carga Laboral y tareas asignadas.<br/>3. Muestra las marcas vinculadas en la esquina inferior derecha.<br/>4. Genera catálogo de formas vectoriales de su especialidad. |
| **`projects`** | • `nombre`<br/>• `color`<br/>• `cliente_ids`<br/>• `asignado_ids`<br/>• `estadoProyecto`<br/>• `costo`<br/>• `fechaInicio` / `fechaFin` | • `ProjectDashboard.tsx`<br/>• `ProjectCard.tsx`<br/>• `ProjectFullScreenView.tsx`<br/>• `EntityProjectsKanban.tsx` | 1. Vincula el proyecto al cliente y acumula valor financiero.<br/>2. Actualiza la barra de progreso segmentada (`Tarea X de Y`).<br/>3. Al cambiar de estado, se mueve en tiempo real en los tableros Kanban.<br/>4. Sincroniza fechas en el calendario. |
| **`tasks`** | • `titulo`<br/>• `formato`<br/>• `esfuerzo`<br/>• `estado`<br/>• `proyecto_ids`<br/>• `cliente_ids`<br/>• `asignado_ids` | • `KanbanBoard.tsx`<br/>• `TaskCard.tsx`<br/>• `TaskModal.tsx`<br/>• `ProjectCoverFormats.tsx` | 1. Dibuja los iconos vectoriales de formato en las portadas de proyectos y colaboradores.<br/>2. Al marcar una tarea como *"Completado"*, avanza el progreso del proyecto.<br/>3. Reevalúa automáticamente el estado del proyecto. |
| **`sessions`** | • `startTime`<br/>• `endTime`<br/>• `durationSeconds`<br/>• `taskId`<br/>• `projectId`<br/>• `workerId` | • `useSessions.ts`<br/>• `EntityFinancesInsights.tsx`<br/>• `TaskCardSessions.tsx` | 1. Acumula horas reales invertidas por colaborador y cliente.<br/>2. Permite auditoría de rentabilidad en finanzas. |

---

## 4. Estándar de Colores e Identidad Visual (Single Source of Truth)

1. **Resolución de Colores**:
   - `getSingleSourceClientColor(client)` $\rightarrow$ resuelve `{ hslCss, hex, colorName }` de la marca.
   - `getSingleSourceProjectColor(project)` $\rightarrow$ resuelve `{ hslCss, hex, colorName }` del proyecto.
2. **Prioridad de Respaldo**:
   1. `entity.customColor` (`{ h, s, l }`).
   2. `entity.color` (string CSS directo `hsl(...)` o `hex`).
   3. `entity.colorName` (coincidencia en `PROJECT_COLOR_PALETTE`).
   4. Fallback por Hash determinista sobre el nombre (`hashStringToHue`).

---

## 5. Estándar Universal de Timestamps (`createdAt` y `updatedAt`)

Todas las entidades y colecciones (`clients`, `members`, `projects`, `tasks`, `sessions`) manejan timestamps de Firestore para trazabilidad, ordenamiento reactivo y auditoría:

| Propiedad | Tipo | Generación | Utilidad Principal |
| :--- | :--- | :--- | :--- |
| `createdAt` / `created_at` | `FieldValue` (`serverTimestamp()`) \| `Timestamp` | Asignado automáticamente al crear el documento | Ordenamiento de dashboards por *"Más recientes"*, onboarding y auditoría |
| `updatedAt` / `updated_at` | `FieldValue` (`serverTimestamp()`) \| `Timestamp` | Actualizado automáticamente en cada mutación | Disparador de alertas, detección de desincronización y caché reactivo |
