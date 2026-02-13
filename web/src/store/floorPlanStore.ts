import { create } from 'zustand';
import type { FloorPlan, Element } from '../types';

const MAX_HISTORY = 50;

interface FloorPlanState {
    // Current floor plan
    floorPlan: FloorPlan | null;

    // Selected element ID
    selectedElementId: string | null;

    // Undo/Redo history
    history: FloorPlan[];
    future: FloorPlan[];
    canUndo: boolean;
    canRedo: boolean;

    // Actions
    setFloorPlan: (floorPlan: FloorPlan) => void;
    addElement: (element: Element) => void;
    updateElement: (id: string, updates: Partial<Element>) => void;
    removeElement: (id: string) => void;
    selectElement: (id: string | null) => void;
    clearFloorPlan: () => void;
    undo: () => void;
    redo: () => void;
}

const createEmptyFloorPlan = (): FloorPlan => ({
    id: crypto.randomUUID(),
    userId: '',
    name: 'Untitled Floor Plan',
    spaceType: 'custom',
    createdAt: new Date(),
    updatedAt: new Date(),
    dimensions: {
        width: 10,
        depth: 10,
        height: 3,
    },
    elements: [],
    exits: [],
});

/**
 * Push current floor plan into history before a mutation.
 * Returns the new history array (capped at MAX_HISTORY).
 */
const pushHistory = (history: FloorPlan[], current: FloorPlan | null): FloorPlan[] => {
    if (!current) return history;
    const next = [...history, structuredClone(current)];
    if (next.length > MAX_HISTORY) {
        return next.slice(next.length - MAX_HISTORY);
    }
    return next;
};

export const useFloorPlanStore = create<FloorPlanState>((set) => ({
    floorPlan: createEmptyFloorPlan(),
    selectedElementId: null,
    history: [],
    future: [],
    canUndo: false,
    canRedo: false,

    setFloorPlan: (floorPlan) => set({ floorPlan }),

    addElement: (element) =>
        set((state) => {
            const newHistory = pushHistory(state.history, state.floorPlan);
            return {
                history: newHistory,
                future: [], // Clear redo on new mutation
                canUndo: newHistory.length > 0,
                canRedo: false,
                floorPlan: state.floorPlan
                    ? {
                        ...state.floorPlan,
                        elements: [...state.floorPlan.elements, element],
                        updatedAt: new Date(),
                    }
                    : null,
            };
        }),

    updateElement: (id, updates) =>
        set((state) => {
            const newHistory = pushHistory(state.history, state.floorPlan);
            return {
                history: newHistory,
                future: [],
                canUndo: newHistory.length > 0,
                canRedo: false,
                floorPlan: state.floorPlan
                    ? {
                        ...state.floorPlan,
                        elements: state.floorPlan.elements.map((el) =>
                            el.id === id ? { ...el, ...updates } : el
                        ),
                        updatedAt: new Date(),
                    }
                    : null,
            };
        }),

    removeElement: (id) =>
        set((state) => {
            const newHistory = pushHistory(state.history, state.floorPlan);
            return {
                history: newHistory,
                future: [],
                canUndo: newHistory.length > 0,
                canRedo: false,
                floorPlan: state.floorPlan
                    ? {
                        ...state.floorPlan,
                        elements: state.floorPlan.elements.filter((el) => el.id !== id),
                        updatedAt: new Date(),
                    }
                    : null,
                selectedElementId:
                    state.selectedElementId === id ? null : state.selectedElementId,
            };
        }),

    selectElement: (id) => set({ selectedElementId: id }),

    clearFloorPlan: () =>
        set({
            floorPlan: createEmptyFloorPlan(),
            selectedElementId: null,
            history: [],
            future: [],
            canUndo: false,
            canRedo: false,
        }),

    undo: () =>
        set((state) => {
            if (state.history.length === 0 || !state.floorPlan) return state;

            const newHistory = [...state.history];
            const previous = newHistory.pop()!;
            const newFuture = [structuredClone(state.floorPlan), ...state.future];

            return {
                floorPlan: previous,
                history: newHistory,
                future: newFuture,
                canUndo: newHistory.length > 0,
                canRedo: true,
            };
        }),

    redo: () =>
        set((state) => {
            if (state.future.length === 0 || !state.floorPlan) return state;

            const newFuture = [...state.future];
            const next = newFuture.shift()!;
            const newHistory = [...state.history, structuredClone(state.floorPlan)];

            return {
                floorPlan: next,
                history: newHistory,
                future: newFuture,
                canUndo: true,
                canRedo: newFuture.length > 0,
            };
        }),
}));
