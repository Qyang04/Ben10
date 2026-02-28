/**
 * Wheelchair Pathfinding Engine
 * ==============================
 *
 * A* pathfinding on a 2D grid overlaid on the room polygon.
 * Determines if a wheelchair (width ≥ 0.915m / 36") can navigate
 * between two points, avoiding walls, elements, and out-of-bounds areas.
 *
 * Reuses:
 *   - isPointInRoomPolygon() from roomGeometry
 *   - isPointInWall() from roomGeometry
 *   - computeAllAABBs() from spatialUtils
 */

import type { Element } from '../types';
import {
    isPointInRoomPolygon,
    isPointInWall,
    type RoomPolygon,
    type WallCollisionSegment,
} from '../utils/roomGeometry';
import { computeAllAABBs, type AABB } from '../analysis/spatialUtils';

// ─── Types ──────────────────────────────────────────────────────────

export interface PathPoint {
    x: number;
    z: number;
}

export interface PathfindingResult {
    /** The path from start to end, or null if no route */
    path: PathPoint[] | null;
    /** Whether a valid path was found */
    found: boolean;
    /** Grid cells explored (for debug) */
    explored: number;
}

// ─── Grid A* ────────────────────────────────────────────────────────

const CELL_SIZE = 0.2; // meters per grid cell
const DIAG_COST = Math.SQRT2;

interface GridNode {
    row: number;
    col: number;
    g: number;     // cost from start
    h: number;     // heuristic to end
    f: number;     // g + h
    parent: GridNode | null;
}

function heuristic(r1: number, c1: number, r2: number, c2: number): number {
    // Octile distance (accounts for diagonal movement)
    const dx = Math.abs(c1 - c2);
    const dz = Math.abs(r1 - r2);
    return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
}

/**
 * Build a boolean occupancy grid over the room bounding box.
 * true = cell is walkable, false = blocked.
 */
function buildOccupancyGrid(
    minX: number,
    minZ: number,
    cols: number,
    rows: number,
    roomPolygon: RoomPolygon | null,
    wallSegments: WallCollisionSegment[],
    aabbs: AABB[],
    clearance: number,
): boolean[][] {
    const halfClear = clearance / 2;
    const grid: boolean[][] = [];

    for (let r = 0; r < rows; r++) {
        const row: boolean[] = [];
        for (let c = 0; c < cols; c++) {
            const wx = minX + c * CELL_SIZE + CELL_SIZE / 2;
            const wz = minZ + r * CELL_SIZE + CELL_SIZE / 2;

            // Must be inside room
            if (roomPolygon && !isPointInRoomPolygon(wx, wz, roomPolygon)) {
                row.push(false);
                continue;
            }

            // Must not be inside a wall (using wheelchair half-width as person radius)
            if (isPointInWall(wx, wz, wallSegments, halfClear)) {
                row.push(false);
                continue;
            }

            // Must not overlap any element (inflated by clearance)
            let blocked = false;
            for (const aabb of aabbs) {
                if (
                    wx >= aabb.minX - halfClear &&
                    wx <= aabb.maxX + halfClear &&
                    wz >= aabb.minZ - halfClear &&
                    wz <= aabb.maxZ + halfClear
                ) {
                    blocked = true;
                    break;
                }
            }

            row.push(!blocked);
        }
        grid.push(row);
    }

    return grid;
}

/**
 * A* search on the occupancy grid.
 */
function astar(
    grid: boolean[][],
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number,
    rows: number,
    cols: number,
): { path: [number, number][] | null; explored: number } {
    // Validate start/end
    if (
        startRow < 0 || startRow >= rows || startCol < 0 || startCol >= cols ||
        endRow < 0 || endRow >= rows || endCol < 0 || endCol >= cols
    ) {
        return { path: null, explored: 0 };
    }
    if (!grid[startRow][startCol] || !grid[endRow][endCol]) {
        return { path: null, explored: 0 };
    }

    const openSet: GridNode[] = [];
    const closedSet = new Set<number>();
    const key = (r: number, c: number) => r * cols + c;

    const startNode: GridNode = {
        row: startRow, col: startCol,
        g: 0, h: heuristic(startRow, startCol, endRow, endCol),
        f: 0, parent: null,
    };
    startNode.f = startNode.g + startNode.h;
    openSet.push(startNode);

    // 8-directional neighbors
    const dirs = [
        [-1, 0], [1, 0], [0, -1], [0, 1],   // cardinal
        [-1, -1], [-1, 1], [1, -1], [1, 1],  // diagonal
    ];

    let explored = 0;
    const MAX_ITERATIONS = 50000; // safety cap

    while (openSet.length > 0 && explored < MAX_ITERATIONS) {
        // Find node with lowest f
        let bestIdx = 0;
        for (let i = 1; i < openSet.length; i++) {
            if (openSet[i].f < openSet[bestIdx].f) bestIdx = i;
        }
        const current = openSet.splice(bestIdx, 1)[0];
        explored++;

        // Reached goal?
        if (current.row === endRow && current.col === endCol) {
            // Reconstruct path
            const path: [number, number][] = [];
            let node: GridNode | null = current;
            while (node) {
                path.push([node.row, node.col]);
                node = node.parent;
            }
            path.reverse();
            return { path, explored };
        }

        closedSet.add(key(current.row, current.col));

        for (const [dr, dc] of dirs) {
            const nr = current.row + dr;
            const nc = current.col + dc;

            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
            if (!grid[nr][nc]) continue;
            if (closedSet.has(key(nr, nc))) continue;

            // For diagonal movement, both adjacent cardinals must also be open
            if (dr !== 0 && dc !== 0) {
                if (!grid[current.row + dr][current.col] || !grid[current.row][current.col + dc]) {
                    continue;
                }
            }

            const moveCost = (dr !== 0 && dc !== 0) ? DIAG_COST : 1;
            const tentG = current.g + moveCost;

            // Check if already in open set with better g
            const existingIdx = openSet.findIndex((n) => n.row === nr && n.col === nc);
            if (existingIdx >= 0) {
                if (tentG < openSet[existingIdx].g) {
                    openSet[existingIdx].g = tentG;
                    openSet[existingIdx].f = tentG + openSet[existingIdx].h;
                    openSet[existingIdx].parent = current;
                }
                continue;
            }

            const h = heuristic(nr, nc, endRow, endCol);
            openSet.push({
                row: nr, col: nc,
                g: tentG, h, f: tentG + h,
                parent: current,
            });
        }
    }

    return { path: null, explored };
}

/**
 * Simplify path by removing redundant collinear points.
 */
function simplifyPath(path: PathPoint[]): PathPoint[] {
    if (path.length <= 2) return path;
    const result: PathPoint[] = [path[0]];

    for (let i = 1; i < path.length - 1; i++) {
        const prev = result[result.length - 1];
        const next = path[i + 1];
        const curr = path[i];

        // Check if prev→curr→next are collinear
        const dx1 = curr.x - prev.x;
        const dz1 = curr.z - prev.z;
        const dx2 = next.x - curr.x;
        const dz2 = next.z - curr.z;
        const cross = Math.abs(dx1 * dz2 - dz1 * dx2);

        if (cross > 0.001) {
            result.push(curr);
        }
    }

    result.push(path[path.length - 1]);
    return result;
}

// ─── Main Export ────────────────────────────────────────────────────

/** Default wheelchair clearance: 36 inches = 0.915m */
export const WHEELCHAIR_CLEARANCE = 0.915;

/**
 * Find a wheelchair-accessible path between two points.
 */
export function findWheelchairPath(
    start: PathPoint,
    end: PathPoint,
    roomPolygon: RoomPolygon | null,
    wallSegments: WallCollisionSegment[],
    elements: Element[],
    clearance: number = WHEELCHAIR_CLEARANCE,
): PathfindingResult {
    // Filter elements that block movement (exclude doors, ramps, stairs)
    const blockingElements = elements.filter(
        (e) => !['door', 'ramp', 'stairs'].includes(e.type),
    );
    const aabbs = computeAllAABBs(blockingElements);

    // Compute grid bounds from room polygon or elements
    let minX = Math.min(start.x, end.x) - 2;
    let maxX = Math.max(start.x, end.x) + 2;
    let minZ = Math.min(start.z, end.z) - 2;
    let maxZ = Math.max(start.z, end.z) + 2;

    // Expand to cover all elements
    for (const aabb of aabbs) {
        minX = Math.min(minX, aabb.minX - 1);
        maxX = Math.max(maxX, aabb.maxX + 1);
        minZ = Math.min(minZ, aabb.minZ - 1);
        maxZ = Math.max(maxZ, aabb.maxZ + 1);
    }

    // Expand to cover room polygon
    if (roomPolygon) {
        for (const [px, pz] of roomPolygon) {
            minX = Math.min(minX, px - 0.5);
            maxX = Math.max(maxX, px + 0.5);
            minZ = Math.min(minZ, pz - 0.5);
            maxZ = Math.max(maxZ, pz + 0.5);
        }
    }

    const cols = Math.ceil((maxX - minX) / CELL_SIZE);
    const rows = Math.ceil((maxZ - minZ) / CELL_SIZE);

    // Safety: don't create absurdly large grids
    if (cols * rows > 200000) {
        return { path: null, found: false, explored: 0 };
    }

    // Build occupancy grid
    const grid = buildOccupancyGrid(minX, minZ, cols, rows, roomPolygon, wallSegments, aabbs, clearance);

    // Convert world coords to grid coords
    const startCol = Math.floor((start.x - minX) / CELL_SIZE);
    const startRow = Math.floor((start.z - minZ) / CELL_SIZE);
    const endCol = Math.floor((end.x - minX) / CELL_SIZE);
    const endRow = Math.floor((end.z - minZ) / CELL_SIZE);

    // Run A*
    const result = astar(grid, startRow, startCol, endRow, endCol, rows, cols);

    if (!result.path) {
        return { path: null, found: false, explored: result.explored };
    }

    // Convert grid path back to world coordinates
    const worldPath: PathPoint[] = result.path.map(([r, c]) => ({
        x: minX + c * CELL_SIZE + CELL_SIZE / 2,
        z: minZ + r * CELL_SIZE + CELL_SIZE / 2,
    }));

    // Simplify path (remove redundant collinear points)
    const simplified = simplifyPath(worldPath);

    return { path: simplified, found: true, explored: result.explored };
}
