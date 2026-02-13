/**
 * useUndoRedo Hook Tests (RED phase — TDD)
 * ==========================================
 * Tests for the keyboard shortcut hook.
 * These tests should FAIL until we implement the hook.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUndoRedo } from '../useUndoRedo';
import { useFloorPlanStore } from '../../store/floorPlanStore';

describe('useUndoRedo hook', () => {
    beforeEach(() => {
        useFloorPlanStore.getState().clearFloorPlan();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should return canUndo and canRedo booleans', () => {
        const { result } = renderHook(() => useUndoRedo());
        expect(typeof result.current.canUndo).toBe('boolean');
        expect(typeof result.current.canRedo).toBe('boolean');
    });

    it('should register keydown listener on mount', () => {
        const addSpy = vi.spyOn(document, 'addEventListener');
        renderHook(() => useUndoRedo());
        expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should remove keydown listener on unmount', () => {
        const removeSpy = vi.spyOn(document, 'removeEventListener');
        const { unmount } = renderHook(() => useUndoRedo());
        unmount();
        expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });
});
