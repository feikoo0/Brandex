import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import KPICard from './KPICard';

const meta = {
  title: 'Spatial/KPICard',
  component: KPICard,
  tags: ['autodocs'],
  args: {
    label: 'Eficiencia Semanal',
    value: '94.2%',
    subtext: '+4.3% vs semana anterior',
    trend: 'up',
    trendColor: 'green',
    glowColor: 'rgba(16, 185, 129, 0.2)'
  }
} satisfies Meta<typeof KPICard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AlertStatus: Story = {
  args: {
    label: 'Fricción Detectada',
    value: 'Alta',
    subtext: '3 bloqueos en el pipeline',
    trend: 'down',
    trendColor: 'red',
    glowColor: 'rgba(244, 63, 94, 0.25)'
  }
};

export const NeutralStatus: Story = {
  args: {
    label: 'Tareas Completadas',
    value: '18 / 24',
    subtext: 'Dentro de la media habitual',
    trend: 'neutral',
    trendColor: 'neutral',
    glowColor: 'rgba(255, 255, 255, 0.05)'
  }
};
