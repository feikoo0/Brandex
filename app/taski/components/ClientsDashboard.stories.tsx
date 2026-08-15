import type { Meta, StoryObj } from '@storybook/react';
import { ClientsDashboard } from './ClientsDashboard';
import { Project } from './ProjectDashboard';

// Mock simple de proyectos para pasarle al ClientsDashboard
const mockProjects: Project[] = [
  {
    id: 1,
    title: "Rediseño de App Móvil",
    client: "Apple Inc.",
    package: "Premium",
    desc: "Rediseño del flujo principal de navegación y vistas 3D de la app.",
    progress: "3 de 5 tareas",
    percent: "60%",
    gradient: "from-blue-600 to-indigo-500",
    glow: "bg-blue-600",
    status: "Activo",
    statusColor: "bg-blue-500/10 border-blue-500/30 text-blue-400",
    burnRate: "12h / 40h",
    startDate: "01 Ago",
    deadline: "30 Ago",
    daysRemaining: "A Tiempo",
    briefCore: "Entrega interactiva 3D alineada a metas de marca.",
    priority: "Alta",
    cost: "$15,000",
    tasks: []
  },
  {
    id: 2,
    title: "Campaña Web Interactiva",
    client: "Nike",
    package: "Estratégico",
    desc: "Landing page tridimensional interactiva para nuevos tenis deportivos.",
    progress: "1 de 4 tareas",
    percent: "25%",
    gradient: "from-emerald-600 to-teal-500",
    glow: "bg-emerald-600",
    status: "Activo",
    statusColor: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    burnRate: "4h / 30h",
    startDate: "05 Ago",
    deadline: "15 Sep",
    daysRemaining: "A Tiempo",
    briefCore: "Visualizador WebGL optimizado.",
    priority: "Media",
    cost: "$12,000",
    tasks: []
  }
];

const meta = {
  title: 'Dashboard/ClientsDashboard',
  component: ClientsDashboard,
  tags: ['autodocs'],
  args: {
    projects: mockProjects,
    onUpdateProjects: () => {},
    isNeumorphic: true,
    isNightMode: true
  }
} satisfies Meta<typeof ClientsDashboard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LightMode: Story = {
  args: {
    isNightMode: false
  }
};