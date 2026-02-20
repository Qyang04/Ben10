import { create } from 'zustand';
import type {
    FloorPlan,
    Element,
    BlueprintPoint,
    BlueprintWall,
    BlueprintDoor,
    BlueprintWindow,
} from '../types';

const MAX_HISTORY = 50;

interface FloorPlanState {
    // Current floor plan
    floorPlan: FloorPlan | null;

    // Selected element ID (furniture or blueprint)
    selectedElementId: string | null;

    // Undo/Redo history
    history: FloorPlan[];
    future: FloorPlan[];
    canUndo: boolean;
    canRedo: boolean;

    // ─── Furniture Element Actions ───
    setFloorPlan: (floorPlan: FloorPlan) => void;
    addElement: (element: Element) => void;
    updateElement: (id: string, updates: Partial<Element>) => void;
    removeElement: (id: string) => void;
    selectElement: (id: string | null) => void;
    clearFloorPlan: () => void;

    // ─── Blueprint Actions ───
    /** Bulk-update all blueprint data (used by 2D editor). Pushes history. */
    setBlueprintData: (data: {
        points: BlueprintPoint[];
        walls: BlueprintWall[];
        doors: BlueprintDoor[];
        windows: BlueprintWindow[];
    }, pushToHistory?: boolean) => void;

    addBlueprintPoint: (point: BlueprintPoint) => void;
    addBlueprintWall: (wall: BlueprintWall) => void;
    addBlueprintDoor: (door: BlueprintDoor) => void;
    addBlueprintWindow: (window: BlueprintWindow) => void;
    updateBlueprintWall: (id: string, updates: Partial<BlueprintWall>) => void;
    updateBlueprintDoor: (id: string, updates: Partial<BlueprintDoor>) => void;
    updateBlueprintWindow: (id: string, updates: Partial<BlueprintWindow>) => void;
    removeBlueprintPoint: (id: string) => void;
    removeBlueprintWall: (id: string) => void;
    removeBlueprintDoor: (id: string) => void;
    removeBlueprintWindow: (id: string) => void;

    // ─── Undo / Redo ───
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
    points: [],
    walls: [],
    doors: [],
    windows: [],
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

/** Mutation helper: pushes history, clears future, applies updater to floorPlan */
const mutate = (
    state: FloorPlanState,
    updater: (fp: FloorPlan) => Partial<FloorPlan>,
    skipHistory = false,
) => {
    if (!state.floorPlan) return state;
    const newHistory = skipHistory ? state.history : pushHistory(state.history, state.floorPlan);
    return {
        history: newHistory,
        future: skipHistory ? state.future : [],
        canUndo: newHistory.length > 0,
        canRedo: skipHistory ? state.canRedo : false,
        floorPlan: {
            ...state.floorPlan,
            ...updater(state.floorPlan),
            updatedAt: new Date(),
        },
    };
};

export const useFloorPlanStore = create<FloorPlanState>((set) => ({
    floorPlan: createEmptyFloorPlan(),
    selectedElementId: null,
    history: [],
    future: [],
    canUndo: false,
    canRedo: false,

    setFloorPlan: (floorPlan) => set({ floorPlan }),

    // ─── Furniture Element Actions ────────────────────────────────

    addElement: (element) =>
        set((state) => mutate(state, (fp) => ({
            elements: [...fp.elements, element],
        }))),

    updateElement: (id, updates) =>
        set((state) => mutate(state, (fp) => ({
            elements: fp.elements.map((el) =>
                el.id === id ? { ...el, ...updates } : el
            ),
        }))),

    removeElement: (id) =>
        set((state) => ({
            ...mutate(state, (fp) => ({
                elements: fp.elements.filter((el) => el.id !== id),
            })),
            selectedElementId:
                state.selectedElementId === id ? null : state.selectedElementId,
        })),

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

    // ─── Blueprint Actions ────────────────────────────────────────

    setBlueprintData: (data, pushToHistory = true) =>
        set((state) => mutate(state, () => ({
            points: data.points,
            walls: data.walls,
            doors: data.doors,
            windows: data.windows,
        }), !pushToHistory)),

    addBlueprintPoint: (point) =>
        set((state) => mutate(state, (fp) => ({
            points: [...fp.points, point],
        }))),

    addBlueprintWall: (wall) =>
        set((state) => mutate(state, (fp) => ({
            walls: [...fp.walls, wall],
        }))),

    addBlueprintDoor: (door) =>
        set((state) => mutate(state, (fp) => ({
            doors: [...fp.doors, door],
        }))),

    addBlueprintWindow: (window) =>
        set((state) => mutate(state, (fp) => ({
            windows: [...fp.windows, window],
        }))),

    updateBlueprintWall: (id, updates) =>
        set((state) => mutate(state, (fp) => ({
            walls: fp.walls.map((w) => w.id === id ? { ...w, ...updates } : w),
        }))),

    updateBlueprintDoor: (id, updates) =>
        set((state) => mutate(state, (fp) => ({
            doors: fp.doors.map((d) => d.id === id ? { ...d, ...updates } : d),
        }))),

    updateBlueprintWindow: (id, updates) =>
        set((state) => mutate(state, (fp) => ({
            windows: fp.windows.map((w) => w.id === id ? { ...w, ...updates } : w),
        }))),

    removeBlueprintPoint: (id) =>
        set((state) => {
            if (!state.floorPlan) return state;
            // Cascade: remove walls connected to this point, then doors/windows on those walls
            const connectedWallIds = state.floorPlan.walls
                .filter((w) => w.startPointId === id || w.endPointId === id)
                .map((w) => w.id);
            return mutate(state, (fp) => ({
                points: fp.points.filter((p) => p.id !== id),
                walls: fp.walls.filter((w) => !connectedWallIds.includes(w.id)),
                doors: fp.doors.filter((d) => !connectedWallIds.includes(d.wallId)),
                windows: fp.windows.filter((w) => !connectedWallIds.includes(w.wallId)),
            }));
        }),

    removeBlueprintWall: (id) =>
        set((state) => mutate(state, (fp) => ({
            walls: fp.walls.filter((w) => w.id !== id),
            // Cascade: remove doors/windows attached to this wall
            doors: fp.doors.filter((d) => d.wallId !== id),
            windows: fp.windows.filter((w) => w.wallId !== id),
        }))),

    removeBlueprintDoor: (id) =>
        set((state) => mutate(state, (fp) => ({
            doors: fp.doors.filter((d) => d.id !== id),
        }))),

    removeBlueprintWindow: (id) =>
        set((state) => mutate(state, (fp) => ({
            windows: fp.windows.filter((w) => w.id !== id),
        }))),

    // ─── Undo / Redo ──────────────────────────────────────────────

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
