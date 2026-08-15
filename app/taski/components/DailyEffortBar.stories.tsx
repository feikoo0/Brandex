import type { Meta, StoryObj } from '@storybook/react';
import DailyEffortBar from './DailyEffortBar';

const meta: Meta<typeof DailyEffortBar> = {
  component: DailyEffortBar,
};

export default meta;
type Story = StoryObj<typeof DailyEffortBar>;

export const Default: Story = {
  args: {
    todayEffort: {
      verde: 4,
      naranja: 2,
      gris: 2,
      excedente: 0,
      maxVal: 8,
      verdeCount: 2,
      naranjaCount: 1,
      nextTask: { title: "Diseñar Banner", hours: 2 },
      total: 6,
      tasksVerde: [],
      tasksNaranja: [],
    },
    limiteHorasDia: 8,
    isNightMode: true,
  },
};