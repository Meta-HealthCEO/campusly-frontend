import { create } from 'zustand';
import type { LessonMaterialKind, LessonPhase } from '@/types/lesson';

interface DrawerState {
  open: boolean;
  kind: LessonMaterialKind | null;
  phase: LessonPhase | null;
  materialId: string | null;
}

interface WorkspaceState {
  drawer: DrawerState;
  dirty: boolean;
  openDrawer: (phase: LessonPhase, kind?: LessonMaterialKind, materialId?: string) => void;
  closeDrawer: () => void;
  setKind: (kind: LessonMaterialKind) => void;
  markDirty: (dirty?: boolean) => void;
}

export const useLessonWorkspaceStore = create<WorkspaceState>((set) => ({
  drawer: { open: false, kind: null, phase: null, materialId: null },
  dirty: false,
  openDrawer: (phase: LessonPhase, kind?: LessonMaterialKind, materialId?: string) =>
    set({ drawer: { open: true, phase, kind: kind ?? null, materialId: materialId ?? null } }),
  closeDrawer: () =>
    set({ drawer: { open: false, kind: null, phase: null, materialId: null } }),
  setKind: (kind) =>
    set((s) => ({ drawer: { ...s.drawer, kind } })),
  markDirty: (dirty = true) => set({ dirty }),
}));
