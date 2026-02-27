import { PIXELS_PER_METER } from '../constants/blueprintConstants';
import type { BlueprintPoint, BlueprintWall } from '../types';

export type RoomPolygon = [number, number][];

/**
 * Compute the outer room polygon in world coordinates (x,z) based on
 * blueprint points + walls. Mirrors the adjacency/path logic from
 * BlueprintWalls3D/useRoomShape and applies the same centering offset.
 */
export function computeRoomPolygonWorld(
    points: BlueprintPoint[],
    walls: BlueprintWall[],
): RoomPolygon | null {
    if (points.length === 0 || walls.length < 3) return null;

    const adj = new Map<string, string[]>();
    for (const w of walls) {
        if (!adj.has(w.startPointId)) adj.set(w.startPointId, []);
        if (!adj.has(w.endPointId)) adj.set(w.endPointId, []);
        adj.get(w.startPointId)!.push(w.endPointId);
        adj.get(w.endPointId)!.push(w.startPointId);
    }

    const startNodeId = Array.from(adj.keys()).find((k) => (adj.get(k)?.length ?? 0) >= 2);
    if (!startNodeId) return null;

    const path = [startNodeId];
    const visited = new Set([startNodeId]);
    let curr = startNodeId;
    let prev: string | null = null;

    for (let i = 0; i < points.length * 2; i++) {
        const neighbors = adj.get(curr);
        if (!neighbors) break;
        const next = neighbors.find((n) => n !== prev);
        if (next === startNodeId && path.length > 2) break;
        if (next && !visited.has(next)) {
            visited.add(next);
            path.push(next);
            prev = curr;
            curr = next;
        } else {
            break;
        }
    }

    if (path.length < 3) return null;

    const pathPoints = path
        .map((id) => points.find((p) => p.id === id))
        .filter((p): p is BlueprintPoint => !!p);
    if (pathPoints.length !== path.length) return null;

    // Compute center in world units (same as BlueprintWalls3D)
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const centerX = (minX + maxX) / (2 * PIXELS_PER_METER);
    const centerZ = (minY + maxY) / (2 * PIXELS_PER_METER);

    // Convert blueprint (px) to world (m) and apply centering
    return pathPoints.map((pt) => [
        pt.x / PIXELS_PER_METER - centerX,
        pt.y / PIXELS_PER_METER - centerZ,
    ]);
}

/**
 * Point-in-polygon test (ray casting) for 2D room polygon.
 * Expects polygon in world (x,z).
 */
export function isPointInRoomPolygon(
    x: number,
    z: number,
    polygon: RoomPolygon | null,
): boolean {
    if (!polygon || polygon.length < 3) return true;

    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, zi] = polygon[i];
        const [xj, zj] = polygon[j];

        const intersect =
            zi > z !== zj > z &&
            x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-12) + xi;

        if (intersect) inside = !inside;
    }
    return inside;
}

