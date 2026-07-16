"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Braindex OS — Zustand Global Store
//
//  Separado en dos slices:
//  1. authStore — role, user info, login/logout
//  2. uiStore   — tab activo, estado de modales, sort, calendario
//
//  Los datos de la aplicación (tareas, proyectos, etc.) viven en TanStack Query
//  (hooks/useData.ts) para caching y background refresh automático.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role, AdminTab, CalView, ModalEntry } from "./types";

export type ViewLevel = 'home' | 'project' | 'task' | 'client' | 'member' | 'admin' | 'all_projects' | 'all_tasks' | 'agent' | 'new_project' | 'new_task';

export interface ScratchpadPin {
  id: string;
  projectId: string;
  content: string;
  created: string;
}

export interface ViewEntry {
  level: ViewLevel;
  id?: string;
}

// ── Auth Store ────────────────────────────────────────────────────────────────
interface AuthState {
  role:      Role | null;
  userId:    string | null;
  userName:  string | null;
  token:     string | null;

  setAuth: (role: Role, id: string, name: string, token: string) => void;
  logout:  () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      role:     null,
      userId:   null,
      userName: null,
      token:    null,

      setAuth: (role, userId, userName, token) =>
        set({ role, userId, userName, token }),

      logout: () =>
        set({ role: null, userId: null, userName: null, token: null }),
    }),
    { name: "braindex-auth" }   // persisted in localStorage
  )
);

// ── UI Store ──────────────────────────────────────────────────────────────────
interface UIState {
  // Navigation
  activeTab:   AdminTab;
  filterPid:   string | null;        // filter tasks by project id

  // Calendar
  calView:    CalView;
  calMonth:   number;                // 0 = current month

  // Entity modal (detail panel)
  parallelModals: ModalEntry[];      // up to 3 modals side-by-side
  modalStack:     ModalEntry[];      // breadcrumb history

  // Dynamic Canvas
  activeProjectId: string | null;
  viewStack: ViewEntry[];
  pushView: (view: ViewEntry) => void;
  popView: () => void;
  popTo: (index: number) => void;
  goToHome: () => void;


  // Quick-create overlay
  qcOpen:      boolean;
  qcType:      "task" | "proyecto" | null;

  // Creator panel (slide-in column to the right of ProgressPanel)
  creatorPanel: "task" | "project" | null;

  // Smart Mode
  isSmartMode: boolean;

  // Timer
  activeTimer: { taskId: string; startTime: number } | null;
  startTimer: (taskId: string) => void;
  stopTimer: () => { taskId: string; durationMins: number } | null;

  // Pinned Items (Master Canvas & Timeline)
  pinnedProjects: string[];
  pinnedTasks: string[];
  togglePinProject: (projectId: string) => void;
  movePinnedProject: (projectId: string, direction: 'up' | 'down') => void;
  autoSortPinnedProjects: (projects: any[]) => void;
  togglePinTask: (taskId: string) => void;

  // Actions
  setTab:           (tab: AdminTab) => void;
  setFilterPid:     (pid: string | null) => void;
  setCalView:       (v: CalView) => void;
  setCalMonth:      (offset: number) => void;
  setActiveProject: (id: string | null) => void;
  openModal:        (entry: ModalEntry) => void;
  closeParallelModal: (entryToClose: ModalEntry) => void;
  closeModal:       () => void;
  goBack:           () => void;
  openQC:           (type: "task" | "proyecto") => void;
  closeQC:          () => void;
  openCreator:      (type: "task" | "project") => void;
  closeCreator:     () => void;
  toggleSmartMode:  () => void;
  // Spatial Dashboard State
  dashboardMode: 'god' | 'maker';
  toggleDashboardMode: () => void;
  // Progressive Disclosure
  expandedProjectId: string | null;
  expandedChildTaskId: string | null;
  setExpandedProject: (id: string | null) => void;
  setExpandedChildTask: (id: string | null) => void;
  // Scratchpad Pins
  scratchpadPins: ScratchpadPin[];
  addPin: (projectId: string, content: string) => void;
  removePin: (pinId: string) => void;
  // Agent state
  agentMessages: { role: 'user' | 'assistant', content: string, plan?: any[] }[];
  setAgentMessages: (msgs: any[]) => void;
  addAgentMessage: (msg: any) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
  activeTab:  "pulse",
  filterPid:  null,
  calView:    "day",
  calMonth:   0,

  agentMessages: [],
  setAgentMessages: (msgs) => set({ agentMessages: msgs }),
  addAgentMessage: (msg) => set((s) => ({ agentMessages: [...s.agentMessages, msg] })),
  activeTimer: null,
  startTimer: (taskId) => set({ activeTimer: { taskId, startTime: Date.now() } }),
  stopTimer: () => {
    let result = null;
    set((state) => {
      if (state.activeTimer) {
        const durationMs = Date.now() - state.activeTimer.startTime;
        const durationMins = Math.round(durationMs / 60000);
        result = { taskId: state.activeTimer.taskId, durationMins };
      }
      return { activeTimer: null };
    });
    return result;
  },

  parallelModals: [],
  modalStack: [],
  activeProjectId: null,
  viewStack: [{ level: 'home' }],
  qcOpen:       false,
  qcType:       null,
  creatorPanel: null,
  isSmartMode:  true,

  pinnedProjects: [],
  pinnedTasks: [],
  
  togglePinProject: (projectId) => set((state) => {
    const isPinned = state.pinnedProjects.includes(projectId);
    if (isPinned) {
      return { pinnedProjects: state.pinnedProjects.filter(id => id !== projectId) };
    } else {
      return { pinnedProjects: [...state.pinnedProjects, projectId] };
    }
  }),

  movePinnedProject: (projectId, direction) => set((state) => {
    const idx = state.pinnedProjects.indexOf(projectId);
    if (idx === -1) return state;
    if (direction === 'up' && idx > 0) {
      const newArr = [...state.pinnedProjects];
      [newArr[idx - 1], newArr[idx]] = [newArr[idx], newArr[idx - 1]];
      return { pinnedProjects: newArr };
    }
    if (direction === 'down' && idx < state.pinnedProjects.length - 1) {
      const newArr = [...state.pinnedProjects];
      [newArr[idx + 1], newArr[idx]] = [newArr[idx], newArr[idx + 1]];
      return { pinnedProjects: newArr };
    }
    return state;
  }),

  autoSortPinnedProjects: (projects) => set((state) => {
    const sortedIds = [...state.pinnedProjects].sort((a, b) => {
      const pA = projects.find(p => p.id === a);
      const pB = projects.find(p => p.id === b);
      if (!pA || !pB) return 0;
      return pA.nombre.localeCompare(pB.nombre);
    });
    return { pinnedProjects: sortedIds };
  }),

  togglePinTask: (taskId) => set((state) => {
    const isPinned = state.pinnedTasks.includes(taskId);
    if (isPinned) {
      return { pinnedTasks: state.pinnedTasks.filter(id => id !== taskId) };
    } else {
      return { pinnedTasks: [...state.pinnedTasks, taskId] };
    }
  }),

  pushView: (view) => set((s) => {
    const newStack = [...s.viewStack, view];
    const activePid = view.level === 'project' ? view.id : s.activeProjectId;
    return { viewStack: newStack, activeProjectId: activePid || null, filterPid: activePid || null };
  }),

  popView: () => set((s) => {
    if (s.viewStack.length <= 1) return s;
    const newStack = s.viewStack.slice(0, -1);
    let activePid = null;
    for (let i = newStack.length - 1; i >= 0; i--) {
      if (newStack[i].level === 'project') {
        activePid = newStack[i].id || null;
        break;
      }
    }
    return { viewStack: newStack, activeProjectId: activePid, filterPid: activePid };
  }),

  popTo: (index) => set((s) => {
    if (index < 0 || index >= s.viewStack.length) return s;
    const newStack = s.viewStack.slice(0, index + 1);
    let activePid = null;
    for (let i = newStack.length - 1; i >= 0; i--) {
      if (newStack[i].level === 'project') {
        activePid = newStack[i].id || null;
        break;
      }
    }
    return { viewStack: newStack, activeProjectId: activePid, filterPid: activePid };
  }),

  goToHome: () => set({ viewStack: [{ level: 'home' }], activeProjectId: null, filterPid: null }),

  setTab: (tab) => set({ activeTab: tab, filterPid: null }),
  setActiveProject: (id) => set({ 
    activeProjectId: id, 
    filterPid: id,
    viewStack: id ? [{ level: 'home' }, { level: 'project', id }] : [{ level: 'home' }] 
  }),

  setFilterPid: (pid) => set({ filterPid: pid }),

  setCalView: (calView) => set({ calView }),

  setCalMonth: (offset) => set({ calMonth: offset }),

  openModal: (entry) => set((s) => {
    // If opening a completely new context and parallelModals is empty, or
    // if the user clicks a reference from an already open modal, we push.
    // Ensure we don't open more than 3 side-by-side.
    // If the entry is identical to an already open one, ignore to prevent dupes.
    const isEditingDupe = s.parallelModals.some(m => m.type === entry.type && m.id === entry.id && m.id !== "new");
    if (isEditingDupe) return s;

    let newModals = [...s.parallelModals, entry];
    if (newModals.length > 3) {
      newModals = newModals.slice(-3); // Keep only the latest 3
    }
    return {
      parallelModals: newModals,
      modalStack: s.parallelModals.length > 0 ? [...s.modalStack, s.parallelModals[s.parallelModals.length - 1]] : s.modalStack,
    };
  }),

  closeParallelModal: (entryToClose) => set((s) => {
    const newModals = s.parallelModals.filter(m => !(m.type === entryToClose.type && m.id === entryToClose.id));
    return { parallelModals: newModals };
  }),

  closeModal: () => set({ parallelModals: [], modalStack: [] }),

  goBack: () => {
    // Behavior change: goBack either closes the last parallel modal or goes back in breadcrumb history.
    const modals = get().parallelModals;
    if (modals.length > 1) {
      set({ parallelModals: modals.slice(0, -1) });
      return;
    }
    const stack = get().modalStack;
    if (!stack.length) { get().closeModal(); return; }
    const prev  = stack[stack.length - 1];
    set({ parallelModals: [prev], modalStack: stack.slice(0, -1) });
  },

  openQC:  (type) => set({ qcOpen: true,  qcType: type }),
  closeQC: ()     => set({ qcOpen: false, qcType: null }),

  openCreator:  (type) => set({ creatorPanel: type }),
  closeCreator: ()     => set({ creatorPanel: null }),

  toggleSmartMode: () => set((s) => ({ isSmartMode: !s.isSmartMode })),
  dashboardMode: 'god',
  toggleDashboardMode: () => set((s) => ({ dashboardMode: s.dashboardMode === 'god' ? 'maker' : 'god' })),
  expandedProjectId: null,
  expandedChildTaskId: null,
  setExpandedProject: (id) => set({ expandedProjectId: id }),
  setExpandedChildTask: (id) => set({ expandedChildTaskId: id }),
  scratchpadPins: [],
  addPin: (projectId, content) => set((s) => ({
    scratchpadPins: [
      ...s.scratchpadPins,
      {
        id: "pin-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
        projectId,
        content,
        created: new Date().toISOString(),
      }
    ]
  })),
  removePin: (pinId) => set((s) => ({
    scratchpadPins: s.scratchpadPins.filter(p => p.id !== pinId)
  })),
    }),
    { name: "braindex-ui" }
  )
);
