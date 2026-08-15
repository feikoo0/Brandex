import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import GlassPanel from './GlassPanel';

const meta: Meta<typeof GlassPanel> = {
  title: 'Spatial/GlassPanel',
  component: GlassPanel,
  tags: ['autodocs'],
  args: {
    children: (
      <div style={{ padding: '24px', color: '#ffffffd6' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Panel de Cristal Líquido</h3>
        <p style={{ margin: '8px 0 0 0', opacity: 0.7 }}>Este es el contenido renderizado dentro del GlassPanel.</p>
      </div>
    ),
  },
};

export default meta;
type Story = StoryObj<typeof GlassPanel>;

export const Base: Story = {
  args: {
    elevation: 'base',
    hoverable: true,
  },
};

export const Elevated: Story = {
  args: {
    elevation: 'elevated',
    glowColor: 'rgba(58, 123, 213, 0.25)',
    hoverable: true,
  },
};
