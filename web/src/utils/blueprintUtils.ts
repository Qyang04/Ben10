/**
 * Blueprint Drawing Utilities
 * ============================
 *
 * Shared utility functions and types for the 2D blueprint editor.
 * Extracted from Canvas2D to satisfy react-refresh/only-export-components.
 */

import type {
    BlueprintDoor,
    BlueprintWindow,
} from '../types';

// ─── Types ─────────────────────────────────────────────────────────

export type DrawingMode = 'SELECT' | 'DRAW' | 'PAN' | 'DOOR' | 'WINDOW';

// ─── Utilities ─────────────────────────────────────────────────────

/** Calculate distance from point (px,py) to line segment (x1,y1)→(x2,y2) */
export function pointToLineDistance(
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number,
) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx: number, yy: number;
    if (param < 0) { xx = x1; yy = y1; }
    else if (param > 1) { xx = x2; yy = y2; }
    else { xx = x1 + param * C; yy = y1 + param * D; }

    const dx = px - xx;
    const dy = py - yy;
    return { distance: Math.sqrt(dx * dx + dy * dy), x: xx, y: yy, offsetRatio: param };
}

/** Check if a new door/window overlaps existing openings on a wall */
export function checkOverlap(
    wallId: string,
    offset: number,
    width: number,
    type: 'DOOR' | 'WINDOW',
    doors: BlueprintDoor[],
    windows: BlueprintWindow[],
    excludeId?: string,
): { hasCollision: boolean } {
    const min = offset - width / 2;
    const max = offset + width / 2;

    // Check against opposite type
    const blockers = type === 'DOOR'
        ? windows.filter((w) => w.wallId === wallId)
        : doors.filter((d) => d.wallId === wallId);
    for (const b of blockers) {
        const bMin = b.offset - b.width / 2;
        const bMax = b.offset + b.width / 2;
        if (Math.max(min, bMin) < Math.min(max, bMax)) return { hasCollision: true };
    }

    // Check against same type
    const sameType = type === 'DOOR'
        ? doors.filter((d) => d.wallId === wallId && d.id !== excludeId)
        : windows.filter((w) => w.wallId === wallId && w.id !== excludeId);
    for (const s of sameType) {
        const sMin = s.offset - s.width / 2;
        const sMax = s.offset + s.width / 2;
        if (Math.max(min, sMin) < Math.min(max, sMax)) return { hasCollision: true };
    }

    return { hasCollision: false };
}
