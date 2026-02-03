import { create } from 'zustand';
import type { FloorPlan, Element } from '../types';

interface FloorPlanState {
    // Current floor plan
    floorPlan: FloorPlan | null;

    // Selected element ID
    selectedElementId: string | null;

    // Actions
    setFloorPlan: (floorPlan: FloorPlan) => void;
    addElement: (element: Element) => void;
    updateElement: (id: string, updates: Partial<Element>) => void;
    removeElement: (id: string) => void;
    selectElement: (id: string | null) => void;
    clearFloorPlan: () => void;
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

export const useFloorPlanStore = create<FloorPlanState>((set) => ({
    floorPlan: createEmptyFloorPlan(),
    selectedElementId: null,

    setFloorPlan: (floorPlan) => set({ floorPlan }),

    addElement: (element) =>
        set((state) => ({
            floorPlan: state.floorPlan
                ? {
                    ...state.floorPlan,
                    elements: [...state.floorPlan.elements, element],
                    updatedAt: new Date(),
                }
                : null,
        })),

    updateElement: (id, updates) =>
        set((state) => ({
            floorPlan: state.floorPlan
                ? {
                    ...state.floorPlan,
                    elements: state.floorPlan.elements.map((el) =>
                        el.id === id ? { ...el, ...updates } : el
                    ),
                    updatedAt: new Date(),
                }
                : null,
        })),

    removeElement: (id) =>
        set((state) => ({
            floorPlan: state.floorPlan
                ? {
                    ...state.floorPlan,
                    elements: state.floorPlan.elements.filter((el) => el.id !== id),
                    updatedAt: new Date(),
                }
                : null,
            selectedElementId:
                state.selectedElementId === id ? null : state.selectedElementId,
        })),

    selectElement: (id) => set({ selectedElementId: id }),

    clearFloorPlan: () =>
        set({
            floorPlan: createEmptyFloorPlan(),
            selectedElementId: null,
        }),
}));
