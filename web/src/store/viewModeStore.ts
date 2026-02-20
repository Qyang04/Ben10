/**
 * View Mode Store
 * ================
 * 
 * WHAT: Manages the current editor view mode (2D / 3D / Split).
 * WHY: Separate store keeps view logic decoupled from floor plan data.
 * 
 * Modes:
 * - '3d': Standard 3D perspective view (default)
 * - '2d': Top-down orthographic view for precise placement
 * - 'split': Side-by-side 2D + 3D view
 */

import { create } from 'zustand';

export type ViewMode = '3d' | '2d' | 'split';

const MODE_CYCLE: ViewMode[] = ['3d', '2d', 'split'];

interface ViewModeState {
    mode: ViewMode;
    setMode: (mode: ViewMode) => void;
    cycleMode: () => void;
}

export const useViewModeStore = create<ViewModeState>((set) => ({
    mode: '3d',

    setMode: (mode) => set({ mode }),

    cycleMode: () =>
        set((state) => {
            const currentIndex = MODE_CYCLE.indexOf(state.mode);
            const nextIndex = (currentIndex + 1) % MODE_CYCLE.length;
            return { mode: MODE_CYCLE[nextIndex] };
        }),
}));
