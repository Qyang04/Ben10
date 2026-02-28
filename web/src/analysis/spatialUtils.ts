/**
 * Spatial Analysis Utilities
 * ==========================
 *
 * WHAT: Geometric helpers for accessibility rule checks.
 *   - Axis-aligned bounding boxes (AABB) for elements
 *   - Gap measurement between element pairs
 *   - Clearance checks (turning radius, door swing)
 *   - Blueprint ↔ meter unit conversion
 */

import type { Element, FloorPlan, BlueprintDoor, BlueprintPoint } from '../types';

// ─── Constants ──────────────────────────────────────────────────────

/** Blueprint coordinate scale: pixels per meter */
const PIXELS_PER_METER = 20;

// ─── AABB ───────────────────────────────────────────────────────────

export interface AABB {
    /** Element ID this box belongs to */
    elementId: string;
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    /** Y-axis values for height checks */
    minY: number;
    maxY: number;
}

/**
 * Compute an axis-aligned bounding box for an element.
 * Ignores rotation for simplicity — a conservative approximation
 * that works well for square/rectangular furniture.
 */
export function computeAABB(element: Element): AABB {
    const { x, y, z } = element.position;
    const { width, height, depth } = element.dimensions;
    const hw = width / 2;
    const hd = depth / 2;

    return {
        elementId: element.id,
        minX: x - hw,
        maxX: x + hw,
        minZ: z - hd,
        maxZ: z + hd,
        minY: y,
        maxY: y + height,
    };
}

/**
 * Compute AABBs for all elements in the floor plan.
 */
export function computeAllAABBs(elements: Element[]): AABB[] {
    return elements.map(computeAABB);
}

// ─── Gap Detection ──────────────────────────────────────────────────

export interface GapInfo {
    elementA: string;
    elementB: string;
    /** Shortest gap distance between the two AABBs (meters) */
    gap: number;
    /** Direction of the gap: 'x' (side-to-side) or 'z' (front-to-back) */
    axis: 'x' | 'z';
}

/**
 * Measure the gap between two AABBs.
 * Returns the shortest axis-aligned separation, or null if they overlap
 * or are too far to be a meaningful gap (>3m).
 */
export function measureGap(a: AABB, b: AABB): GapInfo | null {
    // Check X-axis gap (side by side)
    const gapX = Math.max(0, Math.max(a.minX, b.minX) < Math.min(a.maxX, b.maxX)
        ? 0 : Math.min(Math.abs(a.maxX - b.minX), Math.abs(b.maxX - a.minX)));

    // Check Z-axis gap (front to back)
    const gapZ = Math.max(0, Math.max(a.minZ, b.minZ) < Math.min(a.maxZ, b.maxZ)
        ? 0 : Math.min(Math.abs(a.maxZ - b.minZ), Math.abs(b.maxZ - a.minZ)));

    // They need to overlap on the OTHER axis to form a passage
    const overlapX = a.maxX > b.minX && b.maxX > a.minX;
    const overlapZ = a.maxZ > b.minZ && b.maxZ > a.minZ;

    if (overlapZ && gapX > 0 && gapX < 3) {
        return { elementA: a.elementId, elementB: b.elementId, gap: gapX, axis: 'x' };
    }
    if (overlapX && gapZ > 0 && gapZ < 3) {
        return { elementA: a.elementId, elementB: b.elementId, gap: gapZ, axis: 'z' };
    }

    return null;
}

/**
 * Find all narrow gaps between pairs of elements.
 * A "narrow" gap is anything under `threshold` meters.
 */
export function findNarrowGaps(elements: Element[], threshold: number): GapInfo[] {
    const boxes = computeAllAABBs(elements);
    const gaps: GapInfo[] = [];

    for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
            const gap = measureGap(boxes[i], boxes[j]);
            if (gap && gap.gap > 0 && gap.gap < threshold) {
                gaps.push(gap);
            }
        }
    }

    return gaps;
}

// ─── Clearance Checks ───────────────────────────────────────────────

/**
 * Check whether a circular turning area of `radius` meters
 * is clear around the given center position.
 * Returns IDs of elements whose AABBs intrude into the circle.
 */
export function checkTurningRadius(
    centerX: number,
    centerZ: number,
    radius: number,
    elements: Element[],
    excludeId: string,
): string[] {
    const intruders: string[] = [];
    for (const el of elements) {
        if (el.id === excludeId) continue;
        const box = computeAABB(el);
        // Nearest point on AABB to circle center
        const nearestX = Math.max(box.minX, Math.min(centerX, box.maxX));
        const nearestZ = Math.max(box.minZ, Math.min(centerZ, box.maxZ));
        const dist = Math.sqrt((centerX - nearestX) ** 2 + (centerZ - nearestZ) ** 2);
        if (dist < radius) {
            intruders.push(el.id);
        }
    }
    return intruders;
}

/**
 * Check clear floor space on each side of a door (along the wall axis).
 * Returns the clearance distance to the nearest element on each side.
 */
export function measureDoorClearance(
    doorCenterX: number,
    doorCenterZ: number,
    doorWidth: number,
    elements: Element[],
): { left: number; right: number } {
    let leftClear = Infinity;
    let rightClear = Infinity;
    const leftEdge = doorCenterX - doorWidth / 2;
    const rightEdge = doorCenterX + doorWidth / 2;

    for (const el of elements) {
        if (el.type === 'door' || el.type === 'wall') continue;
        const box = computeAABB(el);
        // Element to the left of the door
        if (box.maxX <= leftEdge) {
            leftClear = Math.min(leftClear, leftEdge - box.maxX);
        }
        // Element to the right of the door
        if (box.minX >= rightEdge) {
            rightClear = Math.min(rightClear, box.minX - rightEdge);
        }
    }

    return { left: leftClear, right: rightClear };
}

// ─── Blueprint Conversions ──────────────────────────────────────────

/**
 * Convert blueprint door width (pixels) to meters.
 */
export function blueprintDoorWidthMeters(door: BlueprintDoor): number {
    return door.width / PIXELS_PER_METER;
}

/**
 * Get the center position of a blueprint door in CENTERED world coords.
 *
 * CRITICAL: The 3D renderer centers the blueprint by computing:
 *   centerX = (minPx + maxPx) / (2 * PPM)
 *   worldX  = px / PPM - centerX
 * We must apply the same centering offset here so door coords match
 * the element positions in the scene.
 */
export function getBlueprintDoorCenter(
    door: BlueprintDoor,
    points: BlueprintPoint[],
    walls: { id: string; startPointId: string; endPointId: string }[],
): { x: number; z: number } | null {
    const wall = walls.find((w) => w.id === door.wallId);
    if (!wall) return null;
    const start = points.find((p) => p.id === wall.startPointId);
    const end = points.find((p) => p.id === wall.endPointId);
    if (!start || !end) return null;

    const wallLen = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
    if (wallLen === 0) return null;

    // Compute centering offset (same as BlueprintWalls3D)
    const allPxX = points.map((p) => p.x);
    const allPxY = points.map((p) => p.y);
    const centerX = (Math.min(...allPxX) + Math.max(...allPxX)) / (2 * PIXELS_PER_METER);
    const centerZ = (Math.min(...allPxY) + Math.max(...allPxY)) / (2 * PIXELS_PER_METER);

    const t = (door.offset + door.width / 2) / wallLen;
    const rawX = (start.x + t * (end.x - start.x)) / PIXELS_PER_METER;
    const rawZ = (start.y + t * (end.y - start.y)) / PIXELS_PER_METER;

    return {
        x: rawX - centerX,
        z: rawZ - centerZ,
    };
}

// ─── Element Queries ────────────────────────────────────────────────

/** Filter elements by type */
export function getElementsByType(fp: FloorPlan, type: Element['type']): Element[] {
    return fp.elements.filter((el) => el.type === type);
}

/** Check if floor plan has at least one element of given type */
export function hasElementOfType(fp: FloorPlan, type: Element['type']): boolean {
    return fp.elements.some((el) => el.type === type);
}
