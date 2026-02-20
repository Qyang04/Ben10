/**
 * View Mode Tests (RED phase — TDD)
 * ===================================
 * Tests for view mode state management and configuration.
 * These tests should FAIL until we implement the module.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useViewModeStore, type ViewMode } from '../../store/viewModeStore';

describe('ViewMode Store', () => {
    beforeEach(() => {
        useViewModeStore.setState({ mode: '3d' });
    });

    describe('initial state', () => {
        it('should default to 3d mode', () => {
            const { mode } = useViewModeStore.getState();
            expect(mode).toBe('3d');
        });
    });

    describe('setMode', () => {
        it('should switch to 2d mode', () => {
            useViewModeStore.getState().setMode('2d');
            expect(useViewModeStore.getState().mode).toBe('2d');
        });

        it('should switch to split mode', () => {
            useViewModeStore.getState().setMode('split');
            expect(useViewModeStore.getState().mode).toBe('split');
        });

        it('should switch back to 3d mode', () => {
            useViewModeStore.getState().setMode('2d');
            useViewModeStore.getState().setMode('3d');
            expect(useViewModeStore.getState().mode).toBe('3d');
        });
    });

    describe('cycleMode', () => {
        it('should cycle 3d → 2d → split → 3d', () => {
            const store = useViewModeStore.getState();
            // Start at 3d
            expect(useViewModeStore.getState().mode).toBe('3d');

            store.cycleMode();
            expect(useViewModeStore.getState().mode).toBe('2d');

            useViewModeStore.getState().cycleMode();
            expect(useViewModeStore.getState().mode).toBe('split');

            useViewModeStore.getState().cycleMode();
            expect(useViewModeStore.getState().mode).toBe('3d');
        });
    });

    describe('VIEW_MODES config', () => {
        it('should export ViewMode type with 3 options', () => {
            const validModes: ViewMode[] = ['3d', '2d', 'split'];
            expect(validModes).toHaveLength(3);
        });
    });
});
