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
      status: "Pendiente", 
      statusColor: "bg-white/5 border-white/10 text-white/60",
      attachmentUrl: "/TASKI ICON.png",
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
    status: "Pendiente", 
    statusColor: "bg-white/5 border-white/10 text-white/60",
    subtasks: [
      { id: 1, text: "Test en dispositivos móviles", done: false },
      { id: 2, text: "Auditoría Lighthouse", done: false }
    ]
  }
];

export const INITIAL_PROJECTS: Project[] = [
  { id: 1, title: "Taski Redesign", client: "Apple Inc.", package: "Premium", desc: "Implementación de interfaz espacial e iteración del motor de diseño con animaciones avanzadas en Next.js.", progress: "12 de 24 tareas", percent: "50%", gradient: "from-blue-600 to-cyan-400", glow: "bg-blue-600", status: "Revisión", statusColor: "bg-yellow-500/10 border-yellow-500/30 text-yellow-500", burnRate: "32h / 48h", deadline: "15 Ago", daysRemaining: "2 Días", briefCore: "Iteración completa del sistema operativo. Fokus en animaciones 60fps y glassmorphism avanzado.", priority: "Alta", cost: "$12,000", tasks: INITIAL_PROJECT_TASKS[1] },
  { id: 2, title: "Marketing Campaign", client: "Nike", package: "Estratégico", desc: "Desarrollo de landing page interactiva y optimización de assets 3D para la nueva línea de calzado.", progress: "5 de 15 tareas", percent: "33%", gradient: "from-orange-600 to-red-500", glow: "bg-red-500", status: "Activo", statusColor: "bg-blue-500/10 border-blue-500/30 text-blue-500", burnRate: "12h / 40h", deadline: "22 Ago", daysRemaining: "9 Días", briefCore: "Campaña interactiva para tenis de correr. Integración de modelos 3D y scroll-jacking.", priority: "Media", cost: "$8,500", tasks: INITIAL_PROJECT_TASKS[2] },
  { id: 3, title: "E-Commerce Platform", client: "Tesla", package: "Enterprise", desc: "Integración de pasarela de pagos y rediseño del flujo de carrito de compras con WebGL.", progress: "18 de 20 tareas", percent: "90%", gradient: "from-purple-600 to-pink-500", glow: "bg-purple-500", status: "Activo", statusColor: "bg-emerald-500/10 border-emerald-500/30 text-emerald-500", burnRate: "85h / 90h", deadline: "5 Ago", daysRemaining: "Crítico", briefCore: "Actualización de sistema de pagos cripto y carrito de compras flotante con WebGL.", priority: "Urgente", cost: "$25,000", tasks: INITIAL_PROJECT_TASKS[3] },
  { id: 4, title: "Mobile App MVP", client: "Airbnb", package: "Starter", desc: "Creación de prototipo funcional con mapas interactivos y reservaciones en tiempo real.", progress: "2 de 10 tareas", percent: "20%", gradient: "from-emerald-700 to-emerald-500", glow: "bg-emerald-600", status: "Revisión", statusColor: "bg-rose-500/10 border-rose-500/30 text-rose-500", burnRate: "4h / 20h", deadline: "30 Ago", daysRemaining: "A Tiempo", briefCore: "Prototipo rápido en React Native. Priorizar la vista de mapas y filtrado.", priority: "Baja", cost: "$4,200", tasks: getFallbackTasks(4) },
  { id: 5, title: "AI Dashboard", client: "OpenAI", package: "Estratégico", desc: "Visualización de datos masivos y diseño de paneles de control con componentes de cristal.", progress: "8 de 8 tareas", percent: "100%", gradient: "from-slate-600 to-slate-400", glow: "bg-slate-500", status: "Completado", statusColor: "bg-white/10 border-white/30 text-white", burnRate: "60h / 60h", deadline: "Entregado", daysRemaining: "-", briefCore: "Dashboard hiper-detallado oscuro. Visualización masiva de nodos y analíticas AI.", priority: "Media", cost: "$15,000", tasks: getFallbackTasks(5) },
  { id: 6, title: "Fintech Mobile Wallet", client: "Stripe", package: "Premium", desc: "Rediseño completo de la interfaz de billetera móvil con animaciones de transacciones.", progress: "3 de 12 tareas", percent: "25%", gradient: "from-indigo-600 to-blue-400", glow: "bg-indigo-500", status: "Activo", statusColor: "bg-indigo-500/10 border-indigo-500/30 text-indigo-500", burnRate: "10h / 50h", deadline: "10 Sep", daysRemaining: "20 Días", briefCore: "Nueva UI para wallet crypto/fiat. Enfoque en micro-interacciones de pago.", priority: "Alta", cost: "$18,500", tasks: getFallbackTasks(6) },
  { id: 7, title: "Web3 NFT Marketplace", client: "OpenSea", package: "Enterprise", desc: "Desarrollo de plataforma de subastas descentralizada con smart contracts integrados.", progress: "15 de 30 tareas", percent: "50%", gradient: "from-fuchsia-600 to-rose-400", glow: "bg-fuchsia-500", status: "Activo", statusColor: "bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-500", burnRate: "120h / 200h", deadline: "1 Oct", daysRemaining: "40 Días", briefCore: "Mercado descentralizado. UI oscura, neón y transacciones gas-less.", priority: "Alta", cost: "$35,000", tasks: getFallbackTasks(7) },
  { id: 8, title: "Healthcare Portal", client: "Mayo Clinic", package: "Enterprise", desc: "Portal de pacientes seguro con telemedicina en tiempo real y expedientes médicos.", progress: "20 de 25 tareas", percent: "80%", gradient: "from-teal-700 to-cyan-600", glow: "bg-teal-600", status: "Revisión", statusColor: "bg-cyan-500/10 border-cyan-500/30 text-cyan-500", burnRate: "180h / 200h", deadline: "12 Ago", daysRemaining: "5 Días", briefCore: "Portal de pacientes HIPAA-compliant. Interfaz clínica limpia y clara.", priority: "Urgente", cost: "$40,000", tasks: getFallbackTasks(8) },
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
