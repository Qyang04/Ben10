/**
 * Undo/Redo Store Tests (RED phase — TDD)
 * =========================================
 * Tests for the undo/redo functionality in the floorPlanStore.
 * These tests should FAIL until we implement undo/redo.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useFloorPlanStore } from '../../store/floorPlanStore';
import type { Element } from '../../types';

const createTestElement = (overrides: Partial<Element> = {}): Element => ({
    id: crypto.randomUUID(),
    type: 'table',
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { width: 1, height: 0.75, depth: 0.8 },
    properties: {},
    ...overrides,
});

describe('floorPlanStore — Undo/Redo', () => {
    beforeEach(() => {
        // Reset store to fresh state before each test
        const store = useFloorPlanStore.getState();
        store.clearFloorPlan();
    });

    it('should have undo and redo actions on the store', () => {
        const state = useFloorPlanStore.getState();
        expect(typeof state.undo).toBe('function');
        expect(typeof state.redo).toBe('function');
    });

    it('should have canUndo and canRedo state', () => {
        const state = useFloorPlanStore.getState();
        expect(state.canUndo).toBe(false);
        expect(state.canRedo).toBe(false);
    });

    it('should undo addElement', () => {
        const element = createTestElement();
        const store = useFloorPlanStore.getState();

        // Add an element
        store.addElement(element);
        expect(useFloorPlanStore.getState().floorPlan?.elements).toHaveLength(1);

        // Undo should remove it
        useFloorPlanStore.getState().undo();
        expect(useFloorPlanStore.getState().floorPlan?.elements).toHaveLength(0);
    });

    it('should redo after undo', () => {
        const element = createTestElement();
        const store = useFloorPlanStore.getState();

        store.addElement(element);
        useFloorPlanStore.getState().undo();
        expect(useFloorPlanStore.getState().floorPlan?.elements).toHaveLength(0);

        // Redo should restore it
        useFloorPlanStore.getState().redo();
        expect(useFloorPlanStore.getState().floorPlan?.elements).toHaveLength(1);
    });

    it('should undo updateElement', () => {
        const element = createTestElement();
        const store = useFloorPlanStore.getState();

        store.addElement(element);
        useFloorPlanStore.getState().updateElement(element.id, {
            position: { x: 5, y: 0, z: 5 },
        });

        expect(useFloorPlanStore.getState().floorPlan?.elements[0].position.x).toBe(5);

        // Undo should restore original position
        useFloorPlanStore.getState().undo();
        expect(useFloorPlanStore.getState().floorPlan?.elements[0].position.x).toBe(0);
    });

    it('should undo removeElement', () => {
        const element = createTestElement();
        const store = useFloorPlanStore.getState();

        store.addElement(element);
        useFloorPlanStore.getState().removeElement(element.id);
        expect(useFloorPlanStore.getState().floorPlan?.elements).toHaveLength(0);

        // Undo should restore the deleted element
        useFloorPlanStore.getState().undo();
        expect(useFloorPlanStore.getState().floorPlan?.elements).toHaveLength(1);
    });

    it('should clear redo future when a new mutation happens after undo', () => {
        const store = useFloorPlanStore.getState();

        store.addElement(createTestElement());
        store.addElement(createTestElement());
        useFloorPlanStore.getState().undo(); // undo second add
        expect(useFloorPlanStore.getState().canRedo).toBe(true);

        // New mutation should clear redo stack
        useFloorPlanStore.getState().addElement(createTestElement());
        expect(useFloorPlanStore.getState().canRedo).toBe(false);
    });

    it('should support multiple sequential undo operations', () => {
        const store = useFloorPlanStore.getState();

        store.addElement(createTestElement({ id: 'a' }));
        useFloorPlanStore.getState().addElement(createTestElement({ id: 'b' }));
        useFloorPlanStore.getState().addElement(createTestElement({ id: 'c' }));
        expect(useFloorPlanStore.getState().floorPlan?.elements).toHaveLength(3);

        useFloorPlanStore.getState().undo();
        expect(useFloorPlanStore.getState().floorPlan?.elements).toHaveLength(2);

        useFloorPlanStore.getState().undo();
        expect(useFloorPlanStore.getState().floorPlan?.elements).toHaveLength(1);

        useFloorPlanStore.getState().undo();
        expect(useFloorPlanStore.getState().floorPlan?.elements).toHaveLength(0);
    });

    it('should cap history at 50 entries', () => {
        const store = useFloorPlanStore.getState();

        // Add 60 elements — only last 50 should be in history
        for (let i = 0; i < 60; i++) {
            useFloorPlanStore.getState().addElement(createTestElement({ id: `el_${i}` }));
        }

        // Should be able to undo 50 times, not 60
        let undoCount = 0;
        while (useFloorPlanStore.getState().canUndo) {
            useFloorPlanStore.getState().undo();
            undoCount++;
        }
        expect(undoCount).toBe(50);
    });
});
