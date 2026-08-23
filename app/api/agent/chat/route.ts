import { NextRequest, NextResponse } from "next/server";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const DEEPSEEK_API_KEY =
  process.env.DEEPSEEK_API_KEY || "sk-c07607530d874d61826befb80952a641";

// ── DEFINICIÓN DE HERRAMIENTAS (OPENAI / DEEPSEEK COMPATIBLE) ────────────────
const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_client_tasks",
      description:
        "Obtiene las tareas reales registradas en Firestore para un cliente o proyecto específico. DEBES llamarla obligatoriamente antes de mencionar o detallar tareas de cualquier marca o proyecto.",
      parameters: {
        type: "object",
        properties: {
          client_id: {
            type: "string",
            description: "ID del cliente (ej. 'cli-123') o nombre de la marca (ej. 'Nike', 'Tesla', 'Apple')",
          },
          project_id: {
            type: "string",
            description: "ID o nombre opcional del proyecto específico para filtrar aún más las tareas",
          },
          include_completed: {
            type: "boolean",
            description: "Si es true, incluye también tareas completadas/archivadas. Por defecto es false (solo tareas activas/pendientes).",
          },
        },
        required: ["client_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_active_projects",
      description:
        "Lista todos los proyectos activos o en curso en Firestore con sus IDs, nombres, marcas asociadas y estado. Útil para identificar qué proyectos o clientes existen cuando el usuario no especifica un nombre exacto.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task_template",
      description:
        "Crea una plantilla de tareas para un cliente/proyecto. Solo debe usarse DESPUÉS de haber llamado get_client_tasks o list_active_projects en el mismo turno o turnos recientes, para asegurar que el client_id/project_id referenciado existe de verdad.",
      parameters: {
        type: "object",
        properties: {
          client_id: {
            type: "string",
            description:
              "ID real del cliente, obtenido de una tool de lectura previa, nunca inventado",
          },
          project_id: {
            type: "string",
            description: "ID real del proyecto, opcional",
          },
          tasks: {
            type: "array",
            description: "Lista de tareas propuestas para la plantilla",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                format: { type: "string" },
                assignee: {
                  type: "string",
                  description:
                    "Nombre de un miembro real del equipo (Sin, Edwin, Yordy, Maria, Andrés)",
                },
                deadline: { type: "string", description: "Fecha ISO opcional" },
              },
              required: ["title", "format"],
            },
          },
        },
        required: ["client_id", "tasks"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_workspace_summary",
      description:
        "Obtiene un resumen en tiempo real de todos los proyectos, tareas, clientes y colaboradores actuales en Taski.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_project",
      description:
        "Crea un nuevo proyecto en Taski. Opcionalmente puede incluir una lista inicial de tareas.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título o nombre del proyecto" },
          client: {
            type: "string",
            description: "Nombre del cliente asociado o marca (ej. Nike, Apple, etc.)",
          },
          package: {
            type: "string",
            description: "Área o tipo de proyecto (ej. Branding, Social Media, UI/UX, Estratégico, Video, etc.)",
          },
          desc: { type: "string", description: "Descripción o core brief del proyecto" },
          priority: {
            type: "string",
            enum: ["Urgente", "Alta", "Media", "Baja"],
            description: "Prioridad del proyecto",
          },
          status: {
            type: "string",
            enum: ["Activo", "En Proceso", "En Revisión", "Completado", "Pausado"],
            description: "Estado inicial del proyecto",
          },
          cost: { type: "string", description: "Costo o presupuesto estimado (ej. $15,000 MXN)" },
          startDate: {
            type: "string",
            description: "Fecha de inicio en formato YYYY-MM-DD o texto amigable (ej. 20 Ago)",
          },
          deadline: {
            type: "string",
            description: "Fecha límite o de entrega en formato YYYY-MM-DD o texto amigable (ej. 30 Ago)",
          },
          tasks: {
            type: "array",
            description: "Lista de tareas iniciales del proyecto",
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "Título del entregable/tarea" },
                format: {
                  type: "string",
                  description: "Formato (ej. post_imagen, carrusel, reels, historia, branding, video_largo, web, etc.)",
                },
                time: { type: "string", description: "Tiempo estimado (ej. 2h, 4h, 1h 30m)" },
                status: {
                  type: "string",
                  enum: ["Planificado", "En Proceso", "En Revisión", "Completado", "Pausado"],
                },
                assignee: { type: "string", description: "Nombre del responsable asignado" },
                deadline: { type: "string", description: "Fecha límite de la tarea" },
              },
              required: ["title"],
            },
          },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_project",
      description: "Actualiza los datos de un proyecto existente.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "ID del proyecto o nombre exacto del proyecto a modificar" },
          title: { type: "string", description: "Nuevo título" },
          client: { type: "string", description: "Nuevo cliente" },
          status: {
            type: "string",
            enum: ["Activo", "En Proceso", "En Revisión", "Completado", "Pausado"],
          },
          priority: {
            type: "string",
            enum: ["Urgente", "Alta", "Media", "Baja"],
          },
          startDate: { type: "string", description: "Nueva fecha de inicio" },
          deadline: { type: "string", description: "Nueva fecha de entrega" },
          cost: { type: "string", description: "Nuevo presupuesto o costo" },
          desc: { type: "string", description: "Nueva descripción o brief" },
        },
        required: ["projectId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_project",
      description: "Elimina un proyecto y sus tareas asociadas de Taski.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "ID o nombre del proyecto a eliminar" },
        },
        required: ["projectId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Crea una tarea o entregable individual en Taski.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título del entregable o tarea" },
          projectId: { type: "string", description: "ID o nombre del proyecto al que pertenece" },
          client: { type: "string", description: "Nombre del cliente" },
          format: {
            type: "string",
            description: "Formato (ej. post_imagen, carrusel, reels, historia, branding, video_largo, web, etc.)",
          },
          time: { type: "string", description: "Tiempo estimado (ej. 2h, 1.5h, 45m)" },
          status: {
            type: "string",
            enum: ["Planificado", "En Proceso", "En Revisión", "Completado", "Pausado"],
          },
          priority: {
            type: "string",
            enum: ["Urgente", "Alta", "Media", "Baja"],
          },
          deadline: { type: "string", description: "Fecha límite de entrega (YYYY-MM-DD)" },
          assignee: { type: "string", description: "Nombre o ID del miembro asignado" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task",
      description: "Actualiza el estado, responsable, formato o detalles de una tarea existente.",
      parameters: {
        type: "object",
        properties: {
          taskId: { type: "string", description: "ID de la tarea o título exacto" },
          status: {
            type: "string",
            enum: ["Planificado", "En Proceso", "En Revisión", "Completado", "Pausado"],
          },
          title: { type: "string", description: "Nuevo título" },
          time: { type: "string", description: "Nueva duración estimada" },
          format: { type: "string", description: "Nuevo formato" },
          assignee: { type: "string", description: "Nuevo responsable" },
          deadline: { type: "string", description: "Nueva fecha límite" },
        },
        required: ["taskId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_task",
      description: "Elimina una tarea de Taski.",
      parameters: {
        type: "object",
        properties: {
          taskId: { type: "string", description: "ID o título de la tarea a eliminar" },
        },
        required: ["taskId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_client",
      description: "Registra una nueva marca o cliente en el directorio de Taski.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nombre de la marca o cliente" },
          industry: { type: "string", description: "Industria o giro (ej. Tecnología, Moda, Deportes, etc.)" },
          status: {
            type: "string",
            enum: ["Activo", "VIP", "Pausa", "Lead", "Inactivo"],
          },
          contactPerson: { type: "string", description: "Persona de contacto y cargo" },
          email: { type: "string", description: "Email de contacto" },
          totalBudget: { type: "string", description: "Presupuesto de contrato (ej. $35,000)" },
          notes: { type: "string", description: "Notas internas sobre la marca" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_client",
      description: "Actualiza los datos de un cliente en Taski.",
      parameters: {
        type: "object",
        properties: {
          clientId: { type: "string", description: "ID o nombre del cliente" },
          name: { type: "string", description: "Nuevo nombre" },
          industry: { type: "string", description: "Nueva industria" },
          status: { type: "string", enum: ["Activo", "VIP", "Pausa", "Lead", "Inactivo"] },
          notes: { type: "string", description: "Nuevas notas internas" },
          totalBudget: { type: "string", description: "Nuevo monto de contrato" },
        },
        required: ["clientId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_member",
      description: "Registra un nuevo colaborador o usuario en el equipo de Taski.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nombre completo del colaborador" },
          role: { type: "string", description: "Rol o cargo (ej. Lead UI/UX, Editor de Video, Copywriter, 3D Artist)" },
          skills: {
            type: "array",
            items: { type: "string" },
            description: "Habilidades técnicas (ej. Figma, After Effects, Three.js)",
          },
          availability: {
            type: "string",
            enum: ["Disponible", "En Proyecto", "Carga Máxima", "Vacaciones"],
          },
          email: { type: "string", description: "Email del miembro" },
          hourlyRate: { type: "number", description: "Tarifa por hora en USD" },
        },
        required: ["name", "role"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_project",
      description:
        "Genera una propuesta visual interactiva de un proyecto o campaña con su desglose de tareas, tiempos y formatos para que el usuario la revise y confirme con botones interactivos antes de crearla en Firestore.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título de la propuesta de proyecto" },
          client: { type: "string", description: "Marca o cliente asociado" },
          package: { type: "string", description: "Tipo de proyecto (ej. Branding, Rediseño Web, Social Media, Estratégico)" },
          desc: { type: "string", description: "Descripción o alcance del proyecto" },
          priority: { type: "string", enum: ["Urgente", "Alta", "Media", "Baja"] },
          cost: { type: "string", description: "Presupuesto estimado (ej. $25,000)" },
          deadline: { type: "string", description: "Fecha de entrega propuesta" },
          tasks: {
            type: "array",
            description: "Desglose de tareas entregables (mínimo 1 tarea, adaptado a lo que el usuario pida)",
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "Título del entregable" },
                format: { type: "string", description: "Formato (ej. reel, post_imagen, carrusel, story, video_horizontal, diseno_ui, documento)" },
                time: { type: "string", description: "Tiempo estimado (ej. 1h, 2h, 4h)" },
                assignee: { type: "string", description: "Responsable sugerido" },
              },
              required: ["title", "format", "time"],
            },
          },
        },
        required: ["title", "client", "tasks"],
      },
    },
  },
];

// ── EJECUTOR DE HERRAMIENTAS DIRECTO EN FIRESTORE ───────────────────────────
async function executeAgentTool(name: string, args: any) {
  try {
    if (name === "get_client_tasks") {
      const targetQuery = (args.client_id || "").trim();
      if (!targetQuery) {
        return {
          success: false,
          error: "parametro_invalido",
          message: "Debes proporcionar el client_id o nombre de la marca a consultar.",
        };
      }

      // 1. Buscar cliente en la colección 'clients'
      const clientsSnap = await getDocs(collection(db, "clients"));
      const allClients: any[] = [];
      clientsSnap.forEach((d) => allClients.push({ id: d.id, ...d.data() }));

      const lowerTarget = targetQuery.toLowerCase();
      // Coincidencia exacta por ID o nombre
      let matchedClient = allClients.find(
        (c) =>
          c.id === targetQuery ||
          (c.nombre && c.nombre.toLowerCase() === lowerTarget) ||
          (c.name && c.name.toLowerCase() === lowerTarget)
      );

      // Si no hay exacta, coincidencia parcial
      if (!matchedClient) {
        matchedClient = allClients.find(
          (c) =>
            (c.nombre && c.nombre.toLowerCase().includes(lowerTarget)) ||
            (c.name && c.name.toLowerCase().includes(lowerTarget))
        );
      }

      // Si NO se encuentra el cliente en Firestore, retornar error explícito
      if (!matchedClient) {
        return {
          success: false,
          error: "cliente_no_encontrado",
          searched: targetQuery,
          message: `No se encontró ningún cliente registrado con el nombre o ID "${targetQuery}" en Firestore. Consulta 'list_active_projects' para ver las marcas registradas o solicita aclaración al usuario.`,
        };
      }

      const clientCanonicalId = String(matchedClient.id);
      const clientCanonicalName = matchedClient.nombre || matchedClient.name || targetQuery;

      // 2. Consultar tareas de Firestore
      const tasksSnap = await getDocs(collection(db, "tasks"));
      const includeCompleted = Boolean(args.include_completed);
      const targetProjectId = args.project_id ? String(args.project_id).toLowerCase().trim() : null;

      const completedStatuses = new Set([
        "completado",
        "hecho",
        "aprobado",
        "entregado",
        "archivado",
        "finalizado",
      ]);

      const matchingTasks: any[] = [];

      tasksSnap.forEach((t) => {
        const d = t.data();
        const tId = t.id;

        // Comprobación de cliente
        const tClientIds = Array.isArray(d.cliente_ids)
          ? d.cliente_ids.map(String)
          : d.cliente_id
          ? [String(d.cliente_id)]
          : [];
        const tClientName = (d.client || d.cliente || "").toLowerCase();

        const matchesClient =
          tClientIds.includes(clientCanonicalId) ||
          tClientName === clientCanonicalName.toLowerCase() ||
          (matchedClient.nombre && tClientName === matchedClient.nombre.toLowerCase()) ||
          (matchedClient.name && tClientName === matchedClient.name.toLowerCase());

        if (!matchesClient) return;

        // Comprobación opcional de proyecto
        if (targetProjectId) {
          const tProjIds = Array.isArray(d.proyecto_ids)
            ? d.proyecto_ids.map((p: any) => String(p).toLowerCase())
            : d.proyecto_id
            ? [String(d.proyecto_id).toLowerCase()]
            : d.project_id
            ? [String(d.project_id).toLowerCase()]
            : [];
          const tProjName = (d.proyecto || d.project || "").toLowerCase();

          const matchesProject =
            tProjIds.includes(targetProjectId) ||
            tProjName === targetProjectId ||
            tProjName.includes(targetProjectId);

          if (!matchesProject) return;
        }

        // Filtro de tareas activas vs completadas
        const rawStatus = (d.status || d.estado || "Planificado").toLowerCase().trim();
        if (!includeCompleted && completedStatuses.has(rawStatus)) {
          return;
        }

        matchingTasks.push({
          id: tId,
          title: d.title || d.titulo || d.nombre || "Tarea sin título",
          format: d.format || d.formato || "post_imagen",
          status: d.status || d.estado || "Planificado",
          time: d.time || d.duracion || d.esfuerzo || "2h",
          assignee: d.assignee || d.asignado || "Sin asignar",
          deadline: d.deadline || d.fecha_limite || d.fechaEntrega || "Sin fecha",
          projectId: d.project_id || d.proyecto_id || (Array.isArray(d.proyecto_ids) ? d.proyecto_ids[0] : "") || "",
        });
      });

      // Limitar a 20 tareas para no inflar tokens
      const returnedTasks = matchingTasks.slice(0, 20);

      return {
        success: true,
        client: {
          id: clientCanonicalId,
          name: clientCanonicalName,
          industry: matchedClient.industria || matchedClient.industry || "",
        },
        filter: {
          includeCompleted,
          projectId: targetProjectId || null,
        },
        totalFound: matchingTasks.length,
        returnedCount: returnedTasks.length,
        tasks: returnedTasks,
      };
    }

    if (name === "list_active_projects") {
      const projectsSnap = await getDocs(collection(db, "projects"));

      const allProjects: any[] = [];
      const completedStatuses = new Set([
        "completado",
        "archivado",
        "cancelado",
        "finalizado",
      ]);

      projectsSnap.forEach((d) => {
        allProjects.push({ id: d.id, ...d.data() });
      });

      const activeProjects = allProjects
        .filter((p) => {
          const st = (p.status || p.estado || p.estadoProyecto || "Activo").toLowerCase().trim();
          return !completedStatuses.has(st);
        })
        .slice(0, 25)
        .map((p) => ({
          id: p.id,
          title: p.title || p.nombre || "Proyecto",
          client: p.client || p.cliente || p.clientName || "General",
          status: p.status || p.estado || p.estadoProyecto || "Activo",
          priority: p.priority || p.prioridad || "Media",
          deadline: p.deadline || p.fechaFin || "Sin fecha",
          tasksCount: Array.isArray(p.tasks)
            ? p.tasks.length
            : Array.isArray(p.tarea_ids)
            ? p.tarea_ids.length
            : 0,
        }));

      return {
        success: true,
        count: activeProjects.length,
        projects: activeProjects,
      };
    }

    if (name === "create_task_template") {
      const rawTasks = args.tasks;

      // ── COMPUERTA 1: Validación de tareas no vacías ──
      if (!Array.isArray(rawTasks) || rawTasks.length === 0) {
        return {
          success: false,
          error: "plantilla_vacia",
          message:
            "La lista de tareas no puede estar vacía. Debes proporcionar al menos 1 tarea con 'title' y 'format'.",
        };
      }

      const targetClientId = (args.client_id || "").trim();
      if (!targetClientId) {
        return {
          success: false,
          error: "cliente_invalido",
          message:
            "Debes proporcionar un 'client_id' válido obtenido de una consulta previa a Firestore.",
        };
      }

      // ── COMPUERTA 2: Validación de cliente existente en Firestore ──
      const clientsSnap = await getDocs(collection(db, "clients"));
      const allClients: any[] = [];
      clientsSnap.forEach((d) => allClients.push({ id: d.id, ...d.data() }));

      const lowerTargetClient = targetClientId.toLowerCase();
      let matchedClient = allClients.find(
        (c) =>
          c.id === targetClientId ||
          (c.nombre && c.nombre.toLowerCase() === lowerTargetClient) ||
          (c.name && c.name.toLowerCase() === lowerTargetClient)
      );

      if (!matchedClient) {
        matchedClient = allClients.find(
          (c) =>
            (c.nombre && c.nombre.toLowerCase().includes(lowerTargetClient)) ||
            (c.name && c.name.toLowerCase().includes(lowerTargetClient))
        );
      }

      if (!matchedClient) {
        return {
          success: false,
          error: "cliente_no_encontrado",
          searched: targetClientId,
          message: `El cliente "${targetClientId}" no existe en Firestore. Consulta primero 'get_client_tasks' o 'list_active_projects' para obtener el client_id real.`,
        };
      }

      const clientCanonicalId = String(matchedClient.id);
      const clientCanonicalName =
        matchedClient.nombre || matchedClient.name || targetClientId;

      // ── COMPUERTA 3: Validación de proyecto (si se proporciona) ──
      let matchedProject: any = null;
      const targetProjectId = (args.project_id || "").trim();

      if (targetProjectId) {
        const projectsSnap = await getDocs(collection(db, "projects"));
        const allProjects: any[] = [];
        projectsSnap.forEach((d) => allProjects.push({ id: d.id, ...d.data() }));

        const lowerProj = targetProjectId.toLowerCase();
        matchedProject = allProjects.find(
          (p) =>
            p.id === targetProjectId ||
            (p.nombre && p.nombre.toLowerCase() === lowerProj) ||
            (p.title && p.title.toLowerCase() === lowerProj)
        );

        if (!matchedProject) {
          matchedProject = allProjects.find(
            (p) =>
              (p.nombre && p.nombre.toLowerCase().includes(lowerProj)) ||
              (p.title && p.title.toLowerCase().includes(lowerProj))
          );
        }

        if (!matchedProject) {
          return {
            success: false,
            error: "proyecto_no_encontrado",
            searched: targetProjectId,
            message: `El proyecto "${targetProjectId}" no existe en Firestore.`,
          };
        }

        // Verificar que el proyecto pertenezca al mismo cliente
        const pClientIds = Array.isArray(matchedProject.cliente_ids)
          ? matchedProject.cliente_ids.map(String)
          : matchedProject.cliente_id
          ? [String(matchedProject.cliente_id)]
          : [];
        const pClientName = (
          matchedProject.cliente ||
          matchedProject.client ||
          ""
        ).toLowerCase();

        const isLinkedToClient =
          pClientIds.includes(clientCanonicalId) ||
          pClientName === clientCanonicalName.toLowerCase() ||
          (matchedClient.nombre &&
            pClientName === matchedClient.nombre.toLowerCase()) ||
          (matchedClient.name &&
            pClientName === matchedClient.name.toLowerCase());

        if (!isLinkedToClient) {
          return {
            success: false,
            error: "proyecto_invalido",
            message: `El proyecto "${
              matchedProject.nombre || matchedProject.title || targetProjectId
            }" no pertenece al cliente "${clientCanonicalName}".`,
          };
        }
      }

      // ── COMPUERTA 4: Verificación de asignados (members) ──
      const membersSnap = await getDocs(collection(db, "members"));
      const validMembersSet = new Set<string>([
        "sin",
        "edwin",
        "yordy",
        "maria",
        "maría",
        "andrés",
        "andres",
        "carlos mendoza",
        "sofía valenzuela",
        "sofia valenzuela",
        "mateo ríos",
        "mateo rios",
        "elena rostova",
        "lucas silva",
      ]);

      membersSnap.forEach((d) => {
        const m = d.data();
        if (d.id) validMembersSet.add(d.id.toLowerCase());
        if (m.nombre) validMembersSet.add(m.nombre.toLowerCase());
        if (m.name) validMembersSet.add(m.name.toLowerCase());
      });

      const createdTasks: any[] = [];
      const warnings: any[] = [];
      const timestampBase = Date.now();

      // ── ESCRITURA EN FIRESTORE (Colección 'tasks') ──
      for (let idx = 0; idx < rawTasks.length; idx++) {
        const t = rawTasks[idx];
        const taskId = `task-${timestampBase}-${idx}`;
        const taskTitle = (t.title || `Tarea ${idx + 1}`).trim();
        const rawFormat = (t.format || "post_imagen").toLowerCase().trim();
        const rawAssignee = (t.assignee || "").trim();

        let isAssigneeValid = true;
        if (rawAssignee) {
          isAssigneeValid = validMembersSet.has(rawAssignee.toLowerCase());
          if (!isAssigneeValid) {
            warnings.push({
              taskId,
              taskTitle,
              assignee: rawAssignee,
              warning: `El responsable '${rawAssignee}' no corresponde a un miembro registrado del equipo.`,
            });
          }
        }

        const taskDoc = {
          id: taskId,
          title: taskTitle,
          titulo: taskTitle,
          nombre: taskTitle,
          format: rawFormat,
          formato: rawFormat,
          estado: "Planificado",
          status: "Planificado",
          duracion: "2h",
          time: "2h",
          esfuerzo: "2h",
          prioridad: "Media",
          cliente: clientCanonicalName,
          client: clientCanonicalName,
          cliente_id: clientCanonicalId,
          cliente_ids: [clientCanonicalId],
          project_id: matchedProject ? String(matchedProject.id) : "",
          proyecto_id: matchedProject ? String(matchedProject.id) : "",
          proyecto_ids: matchedProject ? [String(matchedProject.id)] : [],
          asignado: rawAssignee,
          assignee: rawAssignee,
          fechaEntrega: t.deadline || "",
          fecha_limite: t.deadline || "",
          fechaProg: new Date().toISOString().split("T")[0],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        };

        await setDoc(doc(db, "tasks", taskId), taskDoc);

        createdTasks.push({
          id: taskId,
          title: taskTitle,
          format: rawFormat,
          status: "Planificado",
          assignee: rawAssignee || "Sin asignar",
          assignee_invalido: !isAssigneeValid,
          deadline: t.deadline || "Sin fecha",
        });
      }

      // Si tiene proyecto asociado, sincronizar el array de tareas en projects
      if (matchedProject) {
        try {
          const projRef = doc(db, "projects", String(matchedProject.id));
          const projSnap = await getDoc(projRef);
          if (projSnap.exists()) {
            const pData = projSnap.data();
            const currentTasks = Array.isArray(pData.tasks) ? pData.tasks : [];
            const currentTaskIds = Array.isArray(pData.tarea_ids)
              ? pData.tarea_ids
              : [];

            const newTasksToAdd = createdTasks.map((ct) => ({
              id: ct.id,
              title: ct.title,
              format: ct.format,
              formato: ct.format,
              time: "2h",
              status: ct.status,
              deadline: ct.deadline,
              assignee: ct.assignee,
            }));

            await updateDoc(projRef, {
              tasks: [...currentTasks, ...newTasksToAdd],
              tarea_ids: [
                ...currentTaskIds,
                ...createdTasks.map((ct) => ct.id),
              ],
              updatedAt: serverTimestamp(),
              updated_at: serverTimestamp(),
            });
          }
        } catch (e) {
          console.warn("Could not sync task template with project doc:", e);
        }
      }

      return {
        success: true,
        action: "task_template_created",
        client: {
          id: clientCanonicalId,
          name: clientCanonicalName,
        },
        project: matchedProject
          ? {
              id: String(matchedProject.id),
              name: matchedProject.nombre || matchedProject.title,
            }
          : null,
        count: createdTasks.length,
        created_task_ids: createdTasks.map((t) => t.id),
        tasks: createdTasks,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    }

    if (name === "get_workspace_summary") {
      const [projectsSnap, tasksSnap, clientsSnap, membersSnap] = await Promise.all([
        getDocs(collection(db, "projects")),
        getDocs(collection(db, "tasks")),
        getDocs(collection(db, "clients")),
        getDocs(collection(db, "members")),
      ]);

      const projectsList: any[] = [];
      projectsSnap.forEach((d) => projectsList.push({ id: d.id, ...d.data() }));

      const tasksList: any[] = [];
      tasksSnap.forEach((d) => tasksList.push({ id: d.id, ...d.data() }));

      const clientsList: any[] = [];
      clientsSnap.forEach((d) => clientsList.push({ id: d.id, ...d.data() }));

      const membersList: any[] = [];
      membersSnap.forEach((d) => membersList.push({ id: d.id, ...d.data() }));

      return {
        success: true,
        summary: {
          totalProjects: projectsList.length,
          totalTasks: tasksList.length,
          totalClients: clientsList.length,
          totalMembers: membersList.length,
          projects: projectsList.map((p) => ({
            id: p.id,
            title: p.title || p.nombre,
            client: p.client || p.cliente,
            status: p.status || p.estado,
            priority: p.priority || p.prioridad,
            deadline: p.deadline || p.fechaFin,
            tasksCount: (p.tasks || []).length,
          })),
          clients: clientsList.map((c) => ({
            id: c.id,
            name: c.nombre || c.name,
            status: c.status,
            industry: c.industria || c.industry,
          })),
          members: membersList.map((m) => ({
            id: m.id,
            name: m.nombre || m.name,
            role: m.rol || m.role,
            status: m.disponibilidad || m.status,
          })),
        },
      };
    }

    if (name === "create_project") {
      const projSnap = await getDocs(collection(db, "projects"));
      let maxId = 0;
      projSnap.forEach((d) => {
        const numId = Number(d.id);
        if (!isNaN(numId) && numId > maxId) maxId = numId;
      });
      const newId = maxId > 0 ? maxId + 1 : Date.now();
      const projIdStr = String(newId);

      const title = (args.title || "Nuevo Proyecto").trim();
      const client = (args.client || "Cliente General").trim();
      const packageType = args.package || "Estratégico";
      const desc = args.desc || "";
      const priority = args.priority || "Media";
      const status = args.status || "Activo";
      const cost = args.cost || "$0";
      const startDate = args.startDate || "Hoy";
      const deadline = args.deadline || "Sin Fecha";

      const rawTasks = args.tasks || [];
      const formattedTasks = rawTasks.map((t: any, idx: number) => {
        const taskId = Date.now() + idx;
        return {
          id: taskId,
          title: t.title || "Tarea",
          desc: "",
          format: t.format || "post_imagen",
          formato: t.format || "post_imagen",
          time: t.time || "2h",
          status: t.status || "Planificado",
          statusColor: "",
          deadline: t.deadline || deadline,
          assignee: t.assignee || "",
          subtasks: [],
        };
      });

      const totalTasks = formattedTasks.length;
      const completedTasks = formattedTasks.filter((t: any) => t.status === "Completado").length;
      const progress = `${completedTasks} de ${totalTasks} tareas`;
      const percent = totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}%` : "0%";

      // Random vibrant HSL color for the project
      const hue = Math.floor(Math.random() * 360);
      const customColor = { h: hue, s: 80, l: 60 };
      const hslCss = `hsl(${hue}, 80%, 60%)`;

      const projectDoc = {
        id: newId,
        title,
        nombre: title,
        client,
        cliente: client,
        package: packageType,
        desc,
        descripcion: desc,
        progress,
        percent,
        gradient: hslCss,
        glow: hslCss,
        customColor,
        customGradientStyle: hslCss,
        customGlowStyle: hslCss,
        status,
        estado: status,
        priority,
        prioridad: priority,
        cost,
        costo: parseFloat(String(cost).replace(/[^0-9.]/g, "")) || 0,
        burnRate: `0h / ${totalTasks * 4}h`,
        startDate,
        fechaInicio: startDate,
        deadline,
        fechaFin: deadline,
        briefCore: desc || "Core brief creado por Taski AI",
        tasks: formattedTasks,
        fecha_creacion: new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };

      // 1. Guardar en colección projects
      await setDoc(doc(db, "projects", projIdStr), projectDoc);

      // 2. Guardar tareas en colección tasks
      for (const t of formattedTasks) {
        const taskDoc = {
          id: String(t.id),
          title: t.title,
          nombre: t.title,
          project_id: projIdStr,
          proyecto_id: projIdStr,
          client,
          cliente: client,
          format: t.format,
          formato: t.format,
          time: t.time,
          duracion: t.time,
          status: t.status,
          estado: t.status,
          assignee: t.assignee,
          fecha_limite: t.deadline,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        };
        await setDoc(doc(db, "tasks", String(t.id)), taskDoc);
      }

      return {
        success: true,
        action: "project_created",
        project: {
          id: newId,
          title,
          client,
          status,
          priority,
          startDate,
          deadline,
          tasksCount: totalTasks,
          cost,
          customColor,
        },
      };
    }

    if (name === "update_project") {
      const projSnap = await getDocs(collection(db, "projects"));
      let targetDocId = args.projectId;

      // Buscar por nombre si no es un ID directo
      projSnap.forEach((d) => {
        const data = d.data();
        if (
          d.id === args.projectId ||
          data.title?.toLowerCase() === args.projectId?.toLowerCase() ||
          data.nombre?.toLowerCase() === args.projectId?.toLowerCase()
        ) {
          targetDocId = d.id;
        }
      });

      const updateData: any = {
        updatedAt: serverTimestamp(),
        updated_at: serverTimestamp(),
      };

      if (args.title) {
        updateData.title = args.title;
        updateData.nombre = args.title;
      }
      if (args.client) {
        updateData.client = args.client;
        updateData.cliente = args.client;
      }
      if (args.status) {
        updateData.status = args.status;
        updateData.estado = args.status;
        updateData.estadoProyecto = args.status;
      }
      if (args.priority) {
        updateData.priority = args.priority;
        updateData.prioridad = args.priority;
      }
      if (args.startDate) {
        updateData.startDate = args.startDate;
        updateData.fechaInicio = args.startDate;
      }
      if (args.deadline) {
        updateData.deadline = args.deadline;
        updateData.fechaFin = args.deadline;
      }
      if (args.cost) {
        updateData.cost = args.cost;
        updateData.costo = parseFloat(String(args.cost).replace(/[^0-9.]/g, "")) || 0;
      }
      if (args.desc) {
        updateData.desc = args.desc;
        updateData.descripcion = args.desc;
        updateData.briefCore = args.desc;
      }

      await updateDoc(doc(db, "projects", String(targetDocId)), updateData);

      return {
        success: true,
        action: "project_updated",
        projectId: targetDocId,
        updates: args,
      };
    }

    if (name === "delete_project") {
      const projIdStr = String(args.projectId);
      await deleteDoc(doc(db, "projects", projIdStr)).catch(() => {});

      // Borrar tareas asociadas
      const tasksSnap = await getDocs(collection(db, "tasks"));
      const deletePromises: Promise<any>[] = [];
      tasksSnap.forEach((t) => {
        const d = t.data();
        if (String(d.project_id) === projIdStr || String(d.proyecto_id) === projIdStr) {
          deletePromises.push(deleteDoc(t.ref));
        }
      });
      await Promise.all(deletePromises);

      return {
        success: true,
        action: "project_deleted",
        projectId: projIdStr,
      };
    }

    if (name === "create_task") {
      const taskId = "task-" + Date.now();
      const title = (args.title || "Nueva Tarea").trim();
      const projectId = args.projectId ? String(args.projectId) : "";
      const client = args.client || "";
      const format = args.format || "post_imagen";
      const time = args.time || "1h";
      const status = args.status || "Planificado";
      const deadline = args.deadline || "";
      const assignee = args.assignee || "";

      const taskDoc = {
        id: taskId,
        title,
        nombre: title,
        project_id: projectId,
        proyecto_id: projectId,
        client,
        cliente: client,
        format,
        formato: format,
        time,
        duracion: time,
        status,
        estado: status,
        fecha_limite: deadline,
        asignado: assignee,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };

      await setDoc(doc(db, "tasks", taskId), taskDoc);

      // Si tiene proyecto asignado, actualizar también el doc del proyecto
      if (projectId) {
        try {
          const projRef = doc(db, "projects", projectId);
          const projSnap = await getDoc(projRef);
          if (projSnap.exists()) {
            const pData = projSnap.data();
            const currentTasks = pData.tasks || [];
            const updatedTasks = [
              ...currentTasks,
              {
                id: Date.now(),
                title,
                format,
                formato: format,
                time,
                status,
                deadline,
                assignee,
                subtasks: [],
              },
            ];
            await updateDoc(projRef, {
              tasks: updatedTasks,
              updatedAt: serverTimestamp(),
            });
          }
        } catch (e) {
          console.warn("Could not sync task with projects:", e);
        }
      }

      return {
        success: true,
        action: "task_created",
        task: {
          id: taskId,
          title,
          projectId,
          client,
          format,
          time,
          status,
          deadline,
          assignee,
        },
      };
    }

    if (name === "update_task") {
      const taskId = String(args.taskId);
      const updateData: any = {
        updatedAt: serverTimestamp(),
        updated_at: serverTimestamp(),
      };

      if (args.title) {
        updateData.title = args.title;
        updateData.nombre = args.title;
      }
      if (args.status) {
        updateData.status = args.status;
        updateData.estado = args.status;
      }
      if (args.time) {
        updateData.time = args.time;
        updateData.duracion = args.time;
      }
      if (args.format) {
        updateData.format = args.format;
        updateData.formato = args.format;
      }
      if (args.assignee) {
        updateData.asignado = args.assignee;
      }
      if (args.deadline) {
        updateData.fecha_limite = args.deadline;
      }

      await updateDoc(doc(db, "tasks", taskId), updateData);

      return {
        success: true,
        action: "task_updated",
        taskId,
        updates: args,
      };
    }

    if (name === "delete_task") {
      await deleteDoc(doc(db, "tasks", String(args.taskId)));
      return {
        success: true,
        action: "task_deleted",
        taskId: args.taskId,
      };
    }

    if (name === "create_client") {
      const clientId = "cli-" + Date.now();
      const name = (args.name || "Nuevo Cliente").trim();
      const industry = args.industry || "Servicios";
      const status = args.status || "Activo";
      const totalBudget = args.totalBudget || "$0";
      const notes = args.notes || "";
      const contactPerson = args.contactPerson || "";
      const email = args.email || "";

      const clientDoc = {
        id: clientId,
        nombre: name,
        name,
        logo: name.charAt(0).toUpperCase(),
        industria: industry,
        industry,
        plan_contratado: "crecimiento",
        estado_relacion: "activo",
        status,
        statusColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
        color: "hsl(217, 91%, 60%)",
        colorName: "Azul Eléctrico",
        fecha_inicio: new Date().toISOString().split("T")[0],
        sinceDate: "Reciente",
        contacto: {
          persona: contactPerson,
          email,
          telefono: "",
          whatsapp: "",
        },
        contactPerson,
        email,
        drive_links: [],
        notas_internas: notes,
        notes,
        totalBudget,
        paidAmount: "$0",
        pendingBalance: totalBudget,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };

      await setDoc(doc(db, "clients", clientId), clientDoc);

      return {
        success: true,
        action: "client_created",
        client: {
          id: clientId,
          name,
          industry,
          status,
          totalBudget,
          contactPerson,
        },
      };
    }

    if (name === "update_client") {
      const clientId = String(args.clientId);
      const updateData: any = {
        updatedAt: serverTimestamp(),
        updated_at: serverTimestamp(),
      };

      if (args.name) {
        updateData.nombre = args.name;
        updateData.name = args.name;
      }
      if (args.industry) {
        updateData.industria = args.industry;
        updateData.industry = args.industry;
      }
      if (args.status) {
        updateData.status = args.status;
      }
      if (args.notes) {
        updateData.notas_internas = args.notes;
        updateData.notes = args.notes;
      }
      if (args.totalBudget) {
        updateData.totalBudget = args.totalBudget;
      }

      await updateDoc(doc(db, "clients", clientId), updateData);

      return {
        success: true,
        action: "client_updated",
        clientId,
        updates: args,
      };
    }

    if (name === "create_member") {
      const memberId = "mem-" + Date.now();
      const name = (args.name || "Nuevo Miembro").trim();
      const role = args.role || "Especialista";
      const skills = args.skills || [];
      const availability = args.availability || "Disponible";
      const email = args.email || "";
      const hourlyRate = args.hourlyRate || 40;

      const memberDoc = {
        id: memberId,
        nombre: name,
        name,
        rol: role,
        role,
        email,
        avatar: name.slice(0, 2).toUpperCase(),
        specialty: "Diseño",
        color: "hsl(271, 91%, 65%)",
        colorName: "Púrpura",
        skills,
        proyectos_asignados: [],
        drive_links: [],
        disponibilidad: availability,
        status: availability,
        statusColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
        notas_internas: "",
        tarifa_hora: hourlyRate,
        rating: "5.0",
        completedTasks: 0,
        totalHoursLogged: 0,
        workloadPercent: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };

      await setDoc(doc(db, "members", memberId), memberDoc);

      return {
        success: true,
        action: "member_created",
        member: {
          id: memberId,
          name,
          role,
          skills,
          availability,
        },
      };
    }

function ensureDefaultTasks(rawTasks: any[], title: string, category: string): any[] {
  if (Array.isArray(rawTasks) && rawTasks.length > 0) {
    return rawTasks;
  }
  // Generador de respaldo para evitar plantillas o proyectos vacíos bajo cualquier circunstancia
  const lower = (title + " " + category).toLowerCase();
  if (lower.includes("web") || lower.includes("app") || lower.includes("ui") || lower.includes("dev")) {
    return [
      { title: "Arquitectura de Información y Wireframes", format: "diseno_ui", time: "2h" },
      { title: "Diseño UI y Componentes en Figma", format: "diseno_ui", time: "4h" },
      { title: "Desarrollo Frontend y Responsividad", format: "documento", time: "4h" },
      { title: "Pruebas de Calidad (QA) y Despliegue", format: "documento", time: "1h" },
    ];
  }
  if (lower.includes("brand") || lower.includes("logo") || lower.includes("identidad")) {
    return [
      { title: "Moodboard y Concepto Estratégico", format: "documento", time: "2h" },
      { title: "Propuestas de Logotipo y Tipografía", format: "post_imagen", time: "3h" },
      { title: "Manual de Identidad y Paleta de Color", format: "documento", time: "2h" },
      { title: "Exportación de Assets y Mockups", format: "post_imagen", time: "1h" },
    ];
  }
  if (lower.includes("video") || lower.includes("reel") || lower.includes("tiktok") || lower.includes("redes") || lower.includes("social")) {
    return [
      { title: "Guion y Escaleta de Contenido", format: "documento", time: "1h" },
      { title: "Grabación o Curaduría de Metraje", format: "reel", time: "2h" },
      { title: "Edición Dinámica, Subtítulos y Efectos", format: "reel", time: "3h" },
      { title: "Publicación y Copys para Redes", format: "carrusel", time: "1h" },
    ];
  }
  return [
    { title: "Definición de Objetivos y Alcance", format: "documento", time: "1h" },
    { title: "Investigación y Estructura de Trabajo", format: "documento", time: "2h" },
    { title: "Producción de Entregables Principales", format: "post_imagen", time: "3h" },
    { title: "Revisión Final y Entrega", format: "documento", time: "1h" },
  ];
}

    if (name === "propose_project") {
      const title = (args.title || "Nuevo Proyecto").trim();
      const client = (args.client || "Cliente General").trim();
      const pkg = args.package || "General";
      const desc = args.desc || "";
      const priority = args.priority || "Media";
      const cost = args.cost || "";
      const deadline = args.deadline || "Sin fecha";
      const safeTasks = ensureDefaultTasks(args.tasks, title, pkg);
      const tasks = safeTasks.map((t: any, idx: number) => ({
        id: "temp-task-" + idx,
        title: t.title || `Tarea ${idx + 1}`,
        format: t.format || "post_imagen",
        time: t.time || "2h",
        assignee: t.assignee || "",
        status: "Planificado",
      }));

      return {
        success: true,
        action: "project_proposed",
        proposal: {
          id: "prop-" + Date.now(),
          type: "project_proposal",
          title,
          client,
          package: pkg,
          desc,
          priority,
          cost,
          deadline,
          tasks,
        },
      };
    }

    return { error: `Herramienta '${name}' no reconocida.` };
  } catch (err: any) {
    console.error(`Error ejecutando tool ${name}:`, err);
    return { error: err.message || String(err) };
  }
}

// ── BLOQUE ESTÁTICO: SYSTEM PROMPT DE TASKI (CONTEXT CACHING OPTIMIZADO) ─────
const TASKI_STATIC_SYSTEM_PROMPT = `Eres el Asistente Operativo Inteligente de Taski (Brandex Platform).
Tu misión es gestionar, consultar y planificar proyectos, tareas, plantillas, clientes y colaboradores en toda la plataforma a través de herramientas especializadas.

REGLA DURA ANTI-ALUCINACIÓN (OBLIGATORIA E INVIOLABLE):
1. Queda TERMINANTEMENTE PROHIBIDO inventar, asumir, adivinar o recordar tareas, proyectos, clientes o IDs de memoria conversacional previa.
2. ANTES de mencionar, detallar o manipular tareas de cualquier cliente o proyecto, DEBES llamar primero a 'get_client_tasks' o 'list_active_projects' para consultar los datos reales en Firestore.
3. Si 'get_client_tasks' devuelve 'cliente_no_encontrado', informa explícitamente al usuario que no existe ese cliente registrado y sugiere marcas/proyectos existentes usando 'list_active_projects'. NUNCA inventes entregables si la consulta falla o si el cliente no existe.
4. Si el cliente existe pero no tiene tareas, informa con claridad que actualmente no tiene tareas asignadas.
5. Nunca llames a 'create_task_template' con una lista de tareas vacía o con un 'client_id' que no provenga de una tool de lectura previa ('get_client_tasks' o 'list_active_projects') en la conversación.

REGLAS PARA PLANTILLAS Y PROYECTOS (PROHIBICIÓN DE LISTAS VACÍAS):
- Queda TERMINANTEMENTE PROHIBIDO crear o proponer plantillas o proyectos con 0 tareas o lista vacía.
- Si el usuario solicita un número específico de tareas (ej. 1 sola tarea, 2 tareas, etc.), respeta EXACTAMENTE la cantidad y los requerimientos que te pida.
- Si el usuario no especifica la cantidad, desglosa de 3 a 5 tareas lógicas y secuenciales.
- Cada tarea DEBE tener:
  1. 'title': Nombre profesional y específico de la tarea o entregable.
  2. 'format': Formato del catálogo ("reel", "post_imagen", "carrusel", "story", "video_horizontal", "diseno_ui", "documento").
  3. 'time': Tiempo estimado realista (ej. "1h", "2h", "4h", "1d").

PROTOCOLO PARA CREACIÓN DE PLANTILLAS DE TAREAS Y PROYECTOS:
- Cuando el usuario te pida una plantilla de tareas para un cliente o proyecto (ej. "Crea una plantilla para ZooPizza", "Haz una plantilla de 3 tareas para..."):
  1. Consulta primero Firestore con 'get_client_tasks' o 'list_active_projects' para verificar que la marca/cliente exista y obtener su 'client_id' canónico.
  2. Si el cliente NO existe (error 'cliente_no_encontrado'), NO intentes crear nada: informa explícitamente al usuario que no existe ese cliente registrado en Taski y pregúntale si desea registrarlo primero usando 'create_client'.
  3. Si el cliente SÍ existe, ejecuta 'create_task_template' con el 'client_id' real verificado y la lista de tareas desglosada ('title', 'format', 'assignee', 'deadline').
  4. Al recibir el resultado exitoso de 'create_task_template', responde confirmando detalladamente las tareas creadas con sus títulos, formatos, responsables y los IDs reales devueltos ('created_task_ids'). NUNCA uses respuestas genéricas sin detalles ni IDs.
- Cuando el usuario te pida crear, armar o diseñar un NUEVO PROYECTO o CAMPAÑA (ej. "Hazme un proyecto para Nike...", "Crea una campaña de..."), usa 'propose_project' para generar la propuesta previa.
- Si el usuario te indica explícitamente "Crea directamente el proyecto", "Confirmo", o "Procede a crear el proyecto", usa 'create_project'.
- Para crear clientes o miembros, usa 'create_client' o 'create_member'.

PROTOCOLO INTERNO DE PENSAMIENTO Y RESPUESTA (Ahorro de Tokens y Máxima Eficiencia):
Antes de responder cualquier cosa, hazte estas tres preguntas internamente (NO las escribas):
1. ¿Qué está pidiendo realmente, debajo de lo que escribió?
2. ¿Cuál es la respuesta más útil — no la más completa?
3. ¿Necesito consultar Firestore con tools antes de responder?

Luego responde así:
- Directo, sin introducción ni cierre de relleno.
- Tan corto o largo como lo requiera la respuesta, no el tema.
- Sin frameworks, metodologías ni estructuras a menos que yo las pida.
- Sin mezclar temas que yo no mezclé.
- Si algo es ambiguo o falta información clave (como fechas o cliente), haz una sola pregunta precisa antes de responder.
- REGLA ESTRICTA: NO USES NINGÚN EMOJI en tus respuestas, resúmenes ni títulos.

USO DE HERRAMIENTAS:
- No digas que creaste, consultaste o propusiste algo si no ejecutaste la herramienta correspondiente.
- Al presentar una propuesta, resume sintéticamente en 1 o 2 líneas la idea clave, ya que la tarjeta visual se encargará de mostrar los detalles estructurados y botones de acción.`;

// ── BLOQUE DINÁMICO: CONTEXTO EN TIEMPO DE EJECUCIÓN ─────────────────────────
function buildDynamicContext(contextData?: {
  user?: string;
  role?: string;
  activeClient?: string;
  activeProject?: string;
}): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const lines = [
    `[CONTEXTO DINÁMICO DE EJECUCIÓN]`,
    `- Fecha actual del sistema: ${dateStr}, ${timeStr}`,
    `- Usuario activo: ${contextData?.user || "Feiko"} (Rol: ${contextData?.role || "Admin"})`,
  ];

  if (contextData?.activeClient) {
    lines.push(`- Cliente activo en pantalla: ${contextData.activeClient}`);
  }
  if (contextData?.activeProject) {
    lines.push(`- Proyecto activo en pantalla: ${contextData.activeProject}`);
  }

  lines.push(
    `- RECORDATORIO OBLIGATORIO: Consulta Firestore mediante tools ('get_client_tasks' o 'list_active_projects') antes de citar o asumir tareas o proyectos específicos.`
  );

  return lines.join("\n");
}

// ── HANDLER PRINCIPAL POST ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const incomingMessages = body.messages || [];

    if (!incomingMessages || incomingMessages.length === 0) {
      return NextResponse.json(
        { error: "No messages provided" },
        { status: 400 }
      );
    }

    // Ventana de Contexto Deslizante (Sliding Window): últimos 6 mensajes para ahorrar tokens
    const recentMessages = incomingMessages.slice(-6);

    const dynamicContext = buildDynamicContext({
      user: body.user,
      role: body.role,
      activeClient: body.activeClient,
      activeProject: body.activeProject,
    });

    let messageHistory = [
      { role: "system", content: TASKI_STATIC_SYSTEM_PROMPT },
      { role: "system", content: dynamicContext },
      ...recentMessages,
    ];

    const actionsPerformed: any[] = [];
    let iterations = 0;
    const maxIterations = 5;
    let finalAssistantMessage = "";
    const maxTokensLimit =
      typeof body.maxTokens === "number" && body.maxTokens > 0
        ? body.maxTokens
        : 1000;

    const totalUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };

    const VALID_MODELS = [
      "deepseek-v4-flash",
      "deepseek-chat",
      "deepseek-v4-pro",
      "deepseek-reasoner",
    ];
    let requestedModel = VALID_MODELS.includes(body.model)
      ? body.model
      : "deepseek-chat";

    const requestedTemp =
      typeof body.temperature === "number"
        ? body.temperature
        : requestedModel === "deepseek-reasoner"
        ? undefined
        : 0.3;

    while (iterations < maxIterations) {
      iterations++;

      const payload: any = {
        model: requestedModel,
        messages: messageHistory,
        max_tokens: maxTokensLimit,
      };

      if (requestedModel !== "deepseek-reasoner") {
        payload.tools = AGENT_TOOLS;
        payload.tool_choice = "auto";
        if (requestedTemp !== undefined) {
          payload.temperature = requestedTemp;
        }
      }

      let res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      // Fallback a deepseek-chat en caso de que un modelo V4 experimental retorne error de disponibilidad
      if (!res.ok && requestedModel !== "deepseek-chat") {
        const fallbackPayload = {
          ...payload,
          model: "deepseek-chat",
        };
        const fallbackRes = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(fallbackPayload),
        });
        if (fallbackRes.ok) {
          res = fallbackRes;
          requestedModel = "deepseek-chat";
        }
      }

      if (!res.ok) {
        const errText = await res.text();
        console.error("DeepSeek API error:", res.status, errText);
        return NextResponse.json(
          { error: `Error en DeepSeek API (${res.status}): ${errText}` },
          { status: res.status }
        );
      }

      const responseData = await res.json();

      if (responseData.usage) {
        totalUsage.promptTokens += responseData.usage.prompt_tokens || 0;
        totalUsage.completionTokens += responseData.usage.completion_tokens || 0;
        totalUsage.totalTokens += responseData.usage.total_tokens || 0;
      }

      const choice = responseData.choices?.[0];
      const message = choice?.message;

      if (!message) {
        break;
      }

      // Si el modelo solicitó llamar a una o varias herramientas
      if (message.tool_calls && message.tool_calls.length > 0) {
        messageHistory.push(message);

        for (const toolCall of message.tool_calls) {
          const fnName = toolCall.function.name;
          let fnArgs = {};
          try {
            fnArgs = JSON.parse(toolCall.function.arguments || "{}");
          } catch {}

          const result = await executeAgentTool(fnName, fnArgs);
          actionsPerformed.push({
            tool: fnName,
            args: fnArgs,
            result,
          });

          messageHistory.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: fnName,
            content: JSON.stringify(result),
          });
        }
      } else {
        finalAssistantMessage = message.content || "";
        break;
      }
    }

    if (!finalAssistantMessage.trim() && actionsPerformed.length > 0) {
      const lastAction = actionsPerformed[actionsPerformed.length - 1];
      if (lastAction.result?.error) {
        finalAssistantMessage = `Aviso: ${lastAction.result.message || lastAction.result.error}`;
      } else if (lastAction.tool === "create_task_template" && lastAction.result?.success) {
        const createdCount = lastAction.result.count || 0;
        const clientName = lastAction.result.client?.name || "el cliente";
        const taskIds = (lastAction.result.created_task_ids || []).join(", ");
        finalAssistantMessage = `Se crearon correctamente ${createdCount} tareas para ${clientName} (IDs: ${taskIds}).`;
      }
    }

    const proposals = actionsPerformed
      .filter((a) => a.result?.proposal)
      .map((a) => a.result.proposal);

    return NextResponse.json({
      message: finalAssistantMessage,
      actions: actionsPerformed,
      proposals,
      usage: totalUsage,
      maxTokens: maxTokensLimit,
    });
  } catch (err: any) {
    console.error("Agent chat route fatal error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error in Taski AI Agent" },
      { status: 500 }
    );
  }
}
