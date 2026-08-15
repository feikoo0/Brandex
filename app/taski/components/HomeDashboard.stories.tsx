import type { Meta, StoryObj } from '@storybook/react';
import { HomeDashboard } from './HomeDashboard';

const meta: Meta<typeof HomeDashboard> = {
  component: HomeDashboard,
};

export default meta;
type Story = StoryObj<typeof HomeDashboard>;

export const Default: Story = {
  args: {
    projects: [],
    onSelectTab: () => {},
    isNeumorphic: false,
    isNightMode: true,
    activeView: "kanban",
    onViewChange: () => {},
    viewFilterMode: "equipo",
    groupingMode: "fecha",
    onUpdateProjects: () => {},
  },
};