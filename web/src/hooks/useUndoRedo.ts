/**
 * useUndoRedo Hook
 * =================
 * 
 * Registers Ctrl+Z / Ctrl+Y keyboard shortcuts for undo/redo.
 * Returns canUndo/canRedo for UI button state.
 */

import { useEffect, useCallback } from 'react';
import { useFloorPlanStore } from '../store/floorPlanStore';

export function useUndoRedo() {
    const canUndo = useFloorPlanStore((state) => state.canUndo);
    const canRedo = useFloorPlanStore((state) => state.canRedo);
    const undo = useFloorPlanStore((state) => state.undo);
    const redo = useFloorPlanStore((state) => state.redo);

    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            // Ignore if user is typing in an input/textarea
            const target = event.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

            if ((event.ctrlKey || event.metaKey) && !event.shiftKey) {
                if (event.key === 'z') {
                    event.preventDefault();
                    undo();
                } else if (event.key === 'y') {
                    event.preventDefault();
                    redo();
                }
            }
            // Ctrl+Shift+Z also redo (Mac convention)
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'z') {
                event.preventDefault();
                redo();
            }
        },
        [undo, redo]
    );

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return { canUndo, canRedo, undo, redo };
}
