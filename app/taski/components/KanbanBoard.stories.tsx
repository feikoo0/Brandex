import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { KanbanBoard } from './KanbanBoard';
import { Project } from './ProjectDashboard';
import { SynthesizedTask } from './KanbanColumn';

const mockProjects: Project[] = [
  {
    id: 1,
    title: "Proyecto Alfa",
    client: "Apple Inc.",
    package: "Premium",
    desc: "Descripción del proyecto...",
    progress: "1 de 3 tareas",
    percent: "33%",
    gradient: "from-blue-600 to-indigo-500",
    glow: "bg-blue-600",
    status: "Activo",
    statusColor: "bg-blue-500/10 border-blue-500/30 text-blue-400",
    burnRate: "12h / 40h",
    startDate: "01 Ago",
    deadline: "30 Ago",
    daysRemaining: "A Tiempo",
    briefCore: "Core brief...",
    priority: "Alta",
    cost: "$10,000",
    tasks: []
  }
];

const mockTasks: SynthesizedTask[] = [
  {
    id: "101",
    taskTitle: "Definir Arquitectura 3D",
    desc: "Alinear detalles del visualizador WebGL.",
    format: "post_imagen",
    time: "4h",
    status: "En Proceso",
    projectId: 1,
    projectName: "Proyecto Alfa",
    completedTasks: 1,
    totalTasks: 3,
    taskIndex: 0,
    dueDate: new Date(),
    fecha_programada: "2026-08-20",
    fecha_limite: "2026-08-30",
    fecha_creacion: "2026-08-01",
  },
  {
    id: "102",
    taskTitle: "Aprobar Mockups de Interfaces",
    desc: "Presentar pantallas clave al cliente.",
    format: "Reunión",
    time: "2h",
    status: "Planificado",
    projectId: 1,
    projectName: "Proyecto Alfa",
    completedTasks: 1,
    totalTasks: 3,
    taskIndex: 1,
    dueDate: new Date(),
    fecha_programada: "2026-08-22",
    fecha_limite: "2026-08-30",
    fecha_creacion: "2026-08-01",
  }
];

const meta = {
  title: 'Dashboard/KanbanBoard',
  component: KanbanBoard,
  tags: ['autodocs'],
  args: {
    projects: mockProjects,
    filteredKanbanTasks: mockTasks,
    groupingMode: 'estado',
    isNightMode: true,
    headerBgStyle: 'bg-[#181817]',
    draggingTaskId: null,
    setDraggingTaskId: () => {},
    activeStatusDropdownCardId: null,
    activeFormatDropdownCardId: null,
    activeTimeDropdownCardId: null,
    activeColorSelectorCardId: null,
    editingTaskField: null,
    expandedCardId: null,
    setExpandedCardId: () => {},
    columnScrollIndices: {},
    setColumnScrollIndices: () => {},
    updateVisibleCards: () => {},
    getCalendarDaysDiff: () => 0,
    formatLocalDate: () => "Hoy",
    handleDropTask: () => {},
    taskCardSharedProps: {}
  }
} satisfies Meta<typeof KanbanBoard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};