import { PIXELS_PER_METER } from '../constants/blueprintConstants';
import type { BlueprintPoint, BlueprintWall, BlueprintDoor, Element as FloorElement } from '../types';

export type RoomPolygon = [number, number][];

/** Solid wall segment in world (x,z) that blocks walk-through. Doors create gaps. */
export type WallCollisionSegment = { ax: number; az: number; bx: number; bz: number };

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
    // Need at least 3 points to form a floor polygon (allow pathPoints.length >= 3 even if some IDs didn't match)
    if (pathPoints.length < 3) return null;

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

/**
 * Check whether an element's footprint (center + corners) stays inside
 * the given room polygon. Expects:
 * - element.position.{x,z} in world meters
 * - element.rotation.y as yaw in radians
 * - element.dimensions.{width,depth} in meters
 *
 * If polygon is null/degenerate or element has no dimensions, this
 * returns true (no constraint).
 */
export function isElementInsideRoomPolygon(
    element: FloorElement,
    polygon: RoomPolygon | null,
): boolean {
    if (!polygon || polygon.length < 3) return true;
    if (!element.dimensions) return true;

    const { width, depth } = element.dimensions;
    const halfW = width / 2;
    const halfD = depth / 2;
    const yaw = element.rotation?.y ?? 0;
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const x = element.position.x;
    const z = element.position.z;

    const samplePoints: [number, number][] = [
        [0, 0], // center
        [-halfW, -halfD],
        [halfW, -halfD],
        [halfW, halfD],
        [-halfW, halfD],
    ];

    for (const [lx, lz] of samplePoints) {
        const wx = x + lx * cos - lz * sin;
        const wz = z + lx * sin + lz * cos;
        if (!isPointInRoomPolygon(wx, wz, polygon)) {
            return false;
        }
    }

    return true;
}

/**
 * Compute solid wall segments for walk-mode collision.
 * Doors create gaps; the player can walk through door openings but not through walls.
 * Returns segments in world (x,z) with the same centering as computeRoomPolygonWorld.
 */
export function getWallCollisionSegments(
    points: BlueprintPoint[],
    walls: BlueprintWall[],
    doors: BlueprintDoor[],
): WallCollisionSegment[] {
    if (points.length === 0 || walls.length === 0) return [];

    const pointById = new Map(points.map((p) => [p.id, p] as const));

    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const centerX = (minX + maxX) / (2 * PIXELS_PER_METER);
    const centerZ = (minY + maxY) / (2 * PIXELS_PER_METER);

    const toWorld = (px: number, py: number): [number, number] => [
        px / PIXELS_PER_METER - centerX,
        py / PIXELS_PER_METER - centerZ,
    ];

    const segments: WallCollisionSegment[] = [];

    for (const wall of walls) {
        const start = pointById.get(wall.startPointId);
        const end = pointById.get(wall.endPointId);
        if (!start || !end) continue;

        const [ax, az] = toWorld(start.x, start.y);
        const [bx, bz] = toWorld(end.x, end.y);

        const wallLenPx = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
        if (wallLenPx < 1e-6) continue;

        const wallDoors = doors.filter((d) => d.wallId === wall.id);
        const openings: { tStart: number; tEnd: number }[] = wallDoors.map((d) => {
            const dStart = Math.max(0, (d.offset - d.width / 2) / wallLenPx);
            const dEnd = Math.min(1, (d.offset + d.width / 2) / wallLenPx);
            return { tStart: dStart, tEnd: dEnd };
        });
        openings.sort((a, b) => a.tStart - b.tStart);

        let t = 0;
        for (const op of openings) {
            if (op.tStart > t + 1e-6) {
                const tEnd = Math.min(op.tStart, 1);
                const segAx = ax + t * (bx - ax);
                const segAz = az + t * (bz - az);
                const segBx = ax + tEnd * (bx - ax);
                const segBz = az + tEnd * (bz - az);
                segments.push({ ax: segAx, az: segAz, bx: segBx, bz: segBz });
            }
            t = Math.max(t, op.tEnd);
        }
        if (t < 1 - 1e-6) {
            const segAx = ax + t * (bx - ax);
            const segAz = az + t * (bz - az);
            segments.push({ ax: segAx, az: segAz, bx, bz });
        }
    }

    return segments;
}

/**
 * Check if the path from (fromX, fromZ) to (toX, toZ) crosses any solid wall segment.
 */
export function doesPathCrossWalls(
    fromX: number,
    fromZ: number,
    toX: number,
    toZ: number,
    wallSegments: WallCollisionSegment[],
): boolean {
    for (const seg of wallSegments) {
        if (segmentsIntersect(fromX, fromZ, toX, toZ, seg.ax, seg.az, seg.bx, seg.bz)) {
            return true;
        }
    }
    return false;
}

function segmentsIntersect(
    p1x: number,
    p1z: number,
    p2x: number,
    p2z: number,
    q1x: number,
    q1z: number,
    q2x: number,
    q2z: number,
): boolean {
    const dpx = p2x - p1x;
    const dpz = p2z - p1z;
    const dqx = q2x - q1x;
    const dqz = q2z - q1z;

    const denom = dpx * dqz - dpz * dqx;
    if (Math.abs(denom) < 1e-10) {
        return false;
    }

    const t = ((q1x - p1x) * dqz - (q1z - p1z) * dqx) / denom;
    const u = ((q1x - p1x) * dpz - (q1z - p1z) * dpx) / denom;

    const eps = 1e-6;
    if (t >= -eps && t <= 1 + eps && u >= -eps && u <= 1 + eps) {
        return true;
    }
    return false;
}

