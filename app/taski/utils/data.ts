import { Project, Task } from '../components/ProjectDashboard';

export const INITIAL_PROJECT_TASKS: Record<number, Task[]> = {
  1: [
    { 
      id: 101, 
      title: "Diseño de Grid y Layout", 
      desc: "Definición del sistema de rejilla espacial y alineación de componentes del sistema operativo.", 
      format: "Figma Grid", 
      time: "4.5h", 
      status: "Completado", 
      statusColor: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
      subtasks: [
        { id: 1, text: "Configurar baseline grid de 8px", done: true },
        { id: 2, text: "Alinear tarjetas del dashboard", done: true },
        { id: 3, text: "Establecer márgenes de ventanas", done: true }
      ]
    },
    { 
      id: 102, 
      title: "Animaciones Framer Motion", 
      desc: "Implementar transiciones de página, layout animations en tarjetas y micro-interacciones hover.", 
      format: "Framer API", 
      time: "8h", 
      status: "En Proceso", 
      statusColor: "bg-orange-500/10 border-orange-500/30 text-orange-400",
      subtasks: [
        { id: 1, text: "Layout animation en expansión de tarjetas", done: true },
        { id: 2, text: "Stagger en lista de tareas", done: false },
        { id: 3, text: "Hover scale en botones liquid glass", done: false }
      ]
    },
    { 
      id: 103, 
      title: "Filtros de Cristal (Glassmorphism)", 
      desc: "Ajustar backdrop-filters, opacidades y bordes radiales para lograr el efecto de cristal oscuro premium.", 
      format: "Tailwind CSS", 
      time: "5h", 
      status: "Planificado", 
      statusColor: "bg-white/5 border-white/10 text-white/60",
      attachmentUrl: "/taski-icon.png",
      subtasks: [
        { id: 1, text: "Crear variables de ruido y gradientes", done: false },
        { id: 2, text: "Aplicar backdrop-blur-3xl a modales", done: false },
        { id: 3, text: "Refinar bordes transparentes con pseudo-elementos", done: false }
      ]
    }
  ],
  2: [
    { 
      id: 201, 
      title: "Modelado 3D de Tenis", 
      desc: "Escaneo y optimización de malla 3D del calzado para web en formato glTF.", 
      format: "Blender", 
      time: "12h", 
      status: "Completado", 
      statusColor: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
      subtasks: [
        { id: 1, text: "Retopología de malla", done: true },
        { id: 2, text: "Bakeado de texturas 4K", done: true }
      ]
    },
    { 
      id: 202, 
      title: "Integración Three.js", 
      desc: "Cargar modelo en canvas web con iluminación HDRI y controles de órbita.", 
      format: "Three.js / R3F", 
      time: "8h", 
      status: "En Proceso", 
      statusColor: "bg-orange-500/10 border-orange-500/30 text-orange-400",
      subtasks: [
        { id: 1, text: "Configurar escena y cámara", done: true },
        { id: 2, text: "Añadir environment map", done: false },
        { id: 3, text: "Programar rotación con scroll", done: false }
      ]
    }
  ],
  3: [
    { 
      id: 301, 
      title: "Arquitectura de Carrito Flotante", 
      desc: "Estado global para manejar ítems agregados, totales y persistencia local.", 
      format: "Zustand", 
      time: "6h", 
      status: "Completado", 
      statusColor: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
      subtasks: [
        { id: 1, text: "Crear store global", done: true },
        { id: 2, text: "Conectar botones 'Agregar a carrito'", done: true }
      ]
    },
    { 
      id: 302, 
      title: "Pasarela Crypto Stripe", 
      desc: "Integración de API de cobro automatizado en smart contracts.", 
      format: "Stripe API", 
      time: "15h", 
      status: "En Proceso", 
      statusColor: "bg-orange-500/10 border-orange-500/30 text-orange-400",
      subtasks: [
        { id: 1, text: "Conectar SDK de Stripe Node", done: true },
        { id: 2, text: "Firmar transacciones con Web3Provider", done: false },
        { id: 3, text: "Manejar callbacks de pago fallido", done: false }
      ]
    },
  ]
};

export const getFallbackTasks = (projectId: number): Task[] => [
  { 
    id: projectId * 1000 + 1, 
    title: "Definición del Concepto", 
    desc: "Bocetado rápido de la idea inicial y flujos clave del entregable.", 
    format: "Boceto", 
    time: "3h", 
    status: "Completado", 
    statusColor: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    subtasks: [
      { id: 1, text: "Investigación de referencias", done: true },
      { id: 2, text: "Croquis preliminares", done: true }
    ]
  },
  { 
    id: projectId * 1000 + 2, 
    title: "Desarrollo del Entregable", 
    desc: "Maquetación del entregable principal en base al brief y guías de marca.", 
    format: "Diseño Web", 
    time: "6h", 
    status: "En Proceso", 
    statusColor: "bg-orange-500/10 border-orange-500/30 text-orange-400",
    subtasks: [
      { id: 1, text: "Estructurar HTML semántico", done: true },
      { id: 2, text: "Aplicar estilos base", done: false },
      { id: 3, text: "Ajustar responsive", done: false }
    ]
  },
  { 
    id: projectId * 1000 + 3, 
    title: "Revisión QA", 
    desc: "Pruebas de calidad en múltiples dispositivos y verificación de accesibilidad.", 
    format: "Testing", 
    time: "2h", 
    status: "Planificado", 
    statusColor: "bg-white/5 border-white/10 text-white/60",
    subtasks: [
      { id: 1, text: "Test en dispositivos móviles", done: false },
      { id: 2, text: "Auditoría Lighthouse", done: false }
    ]
  }
];

export const INITIAL_PROJECTS: Project[] = [
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

export const getDynamicProgress = (project: Project | null) => {
  if (!project) return { progress: "0 de 0 tareas", percent: "0%" };
  if (!project.tasks || project.tasks.length === 0) {
    return { progress: project.progress, percent: project.percent };
  }
  const totalSubtasks = project.tasks.reduce((sum, task) => sum + task.subtasks.length, 0);
  const doneSubtasks = project.tasks.reduce((sum, task) => sum + task.subtasks.filter(st => st.done).length, 0);
  
  if (totalSubtasks === 0) {
    const totalTasks = project.tasks.length;
    const doneTasks = project.tasks.filter(t => t.status === "Completado").length;
    return { 
      progress: `${doneTasks} de ${totalTasks} tareas`, 
      percent: totalTasks > 0 ? `${Math.round((doneTasks / totalTasks) * 100)}%` : "0%" 
    };
  }
  
  return {
    progress: `${doneSubtasks} de ${totalSubtasks} tareas`,
    percent: `${Math.round((doneSubtasks / totalSubtasks) * 100)}%`
  };
};

const formatLocalDateHelper = (d: Date): string => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const autoEvaluateProjectStatus = <T extends { tasks?: any[]; status?: string; statusColor?: string; progress?: string; percent?: string }>(project: T): T => {
  if (!project.tasks || project.tasks.length === 0) return project;

  // Migrate any legacy "Pendiente" task statuses to "Planificado" & lock stable dates/colors
  const migratedTasks = project.tasks.map((t: any) => {
    let status = t.status;
    if (status === "Pendiente" || !status) {
      status = "Planificado";
    }

    let statusColor = t.statusColor;
    if (!statusColor || statusColor.includes("white/5") || statusColor === "bg-white") {
      if (status === "Completado") statusColor = "bg-emerald-500/20 border-emerald-500/30 text-emerald-400";
      else if (status === "En Proceso") statusColor = "bg-amber-500/20 border-amber-500/30 text-amber-400";
      else if (status === "En Revisión" || status === "Revisión") statusColor = "bg-purple-500/20 border-purple-500/30 text-purple-400";
      else statusColor = "bg-slate-500/20 border-slate-500/30 text-slate-300";
    }

    let fecha_programada = t.fecha_programada;
    if (!fecha_programada) {
      let offset = 0;
      if (status === "Completado") offset = 12;
      else if (status === "En Proceso") offset = 0;
      else {
        const numId = Number(t.id) || 0;
        if (numId % 3 === 0) offset = 1;
        else if (numId % 3 === 1) offset = 4;
        else offset = 15;
      }
      const d = new Date();
      d.setDate(d.getDate() + offset);
      fecha_programada = formatLocalDateHelper(d);
    }

    return {
      ...t,
      status,
      statusColor,
      fecha_programada
    };
  });

  const totalTasks = migratedTasks.length;
  const completedTasks = migratedTasks.filter(
    (t: any) => t.status === "Completado" || t.status === "Completada"
  ).length;

  const isAllTasksCompleted = totalTasks > 0 && completedTasks === totalTasks;

  const progress = `${completedTasks} de ${totalTasks} tareas`;
  const percent = `${Math.round((completedTasks / totalTasks) * 100)}%`;

  if (isAllTasksCompleted) {
    return {
      ...project,
      tasks: migratedTasks,
      status: "Completado",
      statusColor: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
      progress,
      percent: "100%"
    };
  } else if (project.status === "Completado") {
    // Revert project status if a task was changed from completed back to in-process/planned
    return {
      ...project,
      tasks: migratedTasks,
      status: "Activo",
      statusColor: "bg-violet-500/10 border-violet-500/30 text-violet-400",
      progress,
      percent
    };
  }

  return {
    ...project,
    tasks: migratedTasks,
    progress,
    percent
  };
};
