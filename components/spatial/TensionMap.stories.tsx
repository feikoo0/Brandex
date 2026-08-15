import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import TensionMap from './TensionMap';
import type { Task } from '@/lib/types';

// Obtener fechas relativas a la semana actual para que el TensionMap siempre muestre datos
const getRelativeDateStr = (offsetDays: number): string => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // lunes
  const monday = new Date(d.setDate(diff));
  const targetDay = new Date(monday.setDate(monday.getDate() + offsetDays));
  return targetDay.toISOString().split('T')[0];
};

const mockTasks: Task[] = [
  // Lunes: 1 reunión, 2 entregas (tensión baja-media)
  {
    id: '1',
    titulo: 'Reunión de Kickoff de Diseño',
    descripcion: 'Alineación inicial de marca.',
    fechaEntrega: getRelativeDateStr(0), // lunes
    estado: 'Completado',
    prioridad: 'Alta',
    formato: 'Reunión',
    proyecto_ids: ['1']
  } as any,
  {
    id: '2',
    titulo: 'Crear moodboard inicial',
    descripcion: 'Referencias estéticas.',
    fechaEntrega: getRelativeDateStr(0), // lunes
    estado: 'Completado',
    prioridad: 'Media',
    formato: 'post_imagen',
    proyecto_ids: ['1']
  } as any,
  {
    id: '3',
    titulo: 'Estructurar Wireframes base',
    descripcion: 'Layout de la aplicación.',
    fechaEntrega: getRelativeDateStr(0), // lunes
    estado: 'En Proceso',
    prioridad: 'Alta',
    formato: 'Figma',
    proyecto_ids: ['1']
  } as any,

  // Martes: 3 reuniones (tensión alta/roja)
  {
    id: '4',
    titulo: 'Llamada de feedback con Apple',
    descripcion: 'Revisión de prototipo.',
    fechaEntrega: getRelativeDateStr(1), // martes
    estado: 'Planificado',
    prioridad: 'Urgente',
    formato: 'Reunión',
    proyecto_ids: ['1']
  } as any,
  {
    id: '5',
    titulo: 'Reunión semanal de sincronía',
    descripcion: 'Puesta en común del equipo.',
    fechaEntrega: getRelativeDateStr(1), // martes
    estado: 'Planificado',
    prioridad: 'Baja',
    formato: 'Reunión',
    proyecto_ids: ['1']
  } as any,
  {
    id: '6',
    titulo: 'Brief de requerimientos técnicos',
    descripcion: 'Alineación de desarrollo.',
    fechaEntrega: getRelativeDateStr(1), // martes
    estado: 'Planificado',
    prioridad: 'Media',
    formato: 'Reunión',
    proyecto_ids: ['1']
  } as any,

  // Miércoles: 4 entregas de producción (tensión media, enfoque de desarrollo azul)
  {
    id: '7',
    titulo: 'Diseñar set de iconos tridimensionales',
    descripcion: 'Assets premium.',
    fechaEntrega: getRelativeDateStr(2), // miércoles
    estado: 'En Proceso',
    prioridad: 'Media',
    formato: 'post_imagen',
    proyecto_ids: ['1']
  } as any,
  {
    id: '8',
    titulo: 'Escribir estilos globales en CSS',
    descripcion: 'Esqueleto de tailwind.',
    fechaEntrega: getRelativeDateStr(2), // miércoles
    estado: 'En Proceso',
    prioridad: 'Alta',
    formato: 'Código',
    proyecto_ids: ['1']
  } as any,
  {
    id: '9',
    titulo: 'Crear animaciones de transición',
    descripcion: 'Framer motion.',
    fechaEntrega: getRelativeDateStr(2), // miércoles
    estado: 'Planificado',
    prioridad: 'Media',
    formato: 'Código',
    proyecto_ids: ['1']
  } as any,
  {
    id: '10',
    titulo: 'Optimizar carga de imágenes',
    descripcion: 'Ajuste de assets.',
    fechaEntrega: getRelativeDateStr(2), // miércoles
    estado: 'Planificado',
    prioridad: 'Baja',
    formato: 'Código',
    proyecto_ids: ['1']
  } as any,
];

const meta = {
  title: 'Spatial/TensionMap',
  component: TensionMap,
  tags: ['autodocs'],
  args: {
    tasks: mockTasks
  }
} satisfies Meta<typeof TensionMap>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
