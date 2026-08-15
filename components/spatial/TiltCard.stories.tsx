import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import TiltCard from './TiltCard';

const meta = {
  title: 'Spatial/TiltCard',
  component: TiltCard,
  tags: ['autodocs'],
  args: {
    children: (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <h4 style={{ margin: 0, color: '#ffffffd6', fontSize: '20px', fontWeight: 'bold' }}>Efecto 3D Giroscópico</h4>
        <p style={{ margin: '12px 0 0 0', color: '#ffffff6b', fontSize: '13px' }}>
          Pasa el cursor por encima para ver el efecto de inclinación tridimensional con brillo reflectante.
        </p>
      </div>
    ),
    maxTilt: 8,
    elevation: 'base',
    glowColor: 'rgba(58, 123, 213, 0.2)'
  }
} satisfies Meta<typeof TiltCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const HighlyInteractive: Story = {
  args: {
    maxTilt: 15,
    glowColor: 'rgba(139, 92, 246, 0.3)',
    elevation: 'elevated'
  }
};
