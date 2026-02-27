/**
 * BlueprintWalls3D — Renders point-based wall data as 3D meshes
 * ===============================================================
 *
 * Converts the 2D blueprint (points, walls, doors, windows) into
 * Three.js geometry. Ported from the wedding repo's Room3D.jsx.
 *
 * Features:
 * - Walls rendered as box meshes between corner points
 * - Door/window openings split walls into segments
 * - Transparent glass panels for windows
 * - Floor mesh generated from room shape (closed wall polygon)
 * - Material cache for wall textures
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useFloorPlanStore } from '../../store';
import {
    PIXELS_PER_METER,
    DEFAULT_WALL_HEIGHT,
    WALL_TEXTURES,
} from '../../constants/blueprintConstants';
import type {
    BlueprintPoint,
    BlueprintWall,
    BlueprintDoor,
    BlueprintWindow,
} from '../../types';

// ─── Material Cache ────────────────────────────────────────────────

const materialCache = new Map<string, THREE.MeshStandardMaterial>();

function getWallMaterial(textureId: string): THREE.MeshStandardMaterial {
    if (materialCache.has(textureId)) return materialCache.get(textureId)!;
    const tex = WALL_TEXTURES.find((t) => t.id === textureId) ?? WALL_TEXTURES[0];
    const mat = new THREE.MeshStandardMaterial({
        color: tex.color,
        roughness: tex.roughness,
        metalness: 0.1,
    });
    materialCache.set(textureId, mat);
    return mat;
}

const windowGlassMaterial = new THREE.MeshStandardMaterial({
    color: '#87ceeb',
    transparent: true,
    opacity: 0.3,
    roughness: 0.1,
    metalness: 0.8,
});

const cornerPostMaterial = new THREE.MeshStandardMaterial({ color: '#64748b' });

// Shorter visual wall height cap for optional "short walls" view in 3D.
// This only affects rendering, not blueprint data or measurements.
const WALL_VIEW_MAX_HEIGHT = 1.0; // meters

// ─── Wall Segment ──────────────────────────────────────────────────

interface WallSegmentProps {
    length: number;
    height: number;
    thickness: number;
    position: [number, number, number];
    texture: string;
}

const WallSegmentMesh = React.memo(function WallSegmentMesh({
    length, height, thickness, position, texture,
}: WallSegmentProps) {
    const material = useMemo(() => getWallMaterial(texture), [texture]);
    return (
        <mesh position={position} castShadow receiveShadow material={material}>
            <boxGeometry args={[length, height, thickness]} />
        </mesh>
    );
});

// ─── Complex Wall (splits around door/window openings) ─────────────

interface ComplexWallProps {
    wall: BlueprintWall;
    start: BlueprintPoint;
    end: BlueprintPoint;
    wallDoors: BlueprintDoor[];
    wallWindows: BlueprintWindow[];
}

interface BlueprintWalls3DProps {
    /** When true, clamp visual wall height so furniture is easier to see. */
    shortWalls?: boolean;
}

const ComplexWallMesh = React.memo(function ComplexWallMesh({
    wall, start, end, wallDoors, wallWindows,
}: ComplexWallProps) {
    const { totalLength, thickness, angle, midX, midY, segments } = useMemo(() => {
        const len = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2) / PIXELS_PER_METER;
        const thick = wall.thickness / PIXELS_PER_METER;
        const baseHeight = wall.height || DEFAULT_WALL_HEIGHT;
        const h = baseHeight; // actual blueprint height; any view clamping happens at parent level
        const ang = Math.atan2(end.y - start.y, end.x - start.x);
        const mx = (start.x + end.x) / 2 / PIXELS_PER_METER;
        const my = (start.y + end.y) / 2 / PIXELS_PER_METER;

        // Combine & sort openings by offset
        const openings = [
            ...wallDoors.map((d) => ({
                type: 'DOOR' as const, offset: d.offset, width: d.width,
                height: d.height, elevation: 0,
            })),
            ...wallWindows.map((w) => ({
                type: 'WINDOW' as const, offset: w.offset, width: w.width,
                height: w.height, elevation: w.elevation || 0,
            })),
        ].sort((a, b) => a.offset - b.offset);

        const segs: { length: number; height: number; centerX: number; centerY: number }[] = [];
        let currentPos = 0;

        for (const op of openings) {
            const opStart = (op.offset - op.width / 2) / PIXELS_PER_METER;
            const opEnd = (op.offset + op.width / 2) / PIXELS_PER_METER;
            const opWidth = op.width / PIXELS_PER_METER;

            // Wall segment before opening
            if (opStart > currentPos) {
                const segLen = opStart - currentPos;
                segs.push({ length: segLen, height: h, centerX: currentPos + segLen / 2, centerY: h / 2 });
            }

            // Opening segments
            if (op.type === 'WINDOW') {
                // Sill below window
                if (op.elevation > 0) {
                    segs.push({
                        length: opWidth, height: op.elevation,
                        centerX: opStart + opWidth / 2, centerY: op.elevation / 2,
                    });
                }
                // Header above window
                const topH = h - (op.elevation + op.height);
                if (topH > 0) {
                    segs.push({
                        length: opWidth, height: topH,
                        centerX: opStart + opWidth / 2, centerY: h - topH / 2,
                    });
                }
            } else {
                // Header above door
                const topH = h - op.height;
                if (topH > 0) {
                    segs.push({
                        length: opWidth, height: topH,
                        centerX: opStart + opWidth / 2, centerY: h - topH / 2,
                    });
                }
            }

            currentPos = opEnd;
        }

        // Final segment after last opening
        if (currentPos < len) {
            const segLen = len - currentPos;
            segs.push({ length: segLen, height: h, centerX: currentPos + segLen / 2, centerY: h / 2 });
        }

        return { totalLength: len, thickness: thick, height: h, angle: ang, midX: mx, midY: my, segments: segs };
    }, [wall, start, end, wallDoors, wallWindows]);

    return (
        <group position={[midX, 0, midY]} rotation={[0, -angle, 0]}>
            {segments.map((seg, idx) => (
                <WallSegmentMesh
                    key={`${wall.id}-${idx}`}
                    length={seg.length}
                    height={seg.height}
                    thickness={thickness}
                    position={[seg.centerX - totalLength / 2, seg.centerY, 0]}
                    texture={wall.texture}
                />
            ))}
        </group>
    );
});

// ─── Window Glass ──────────────────────────────────────────────────

interface WindowGlassProps {
    window: BlueprintWindow;
    start: BlueprintPoint;
    end: BlueprintPoint;
}

const WindowGlass = React.memo(function WindowGlass({ window: win, start, end }: WindowGlassProps) {
    const { angle, cx, cy, width, height, elevation } = useMemo(() => {
        const ang = Math.atan2(end.y - start.y, end.x - start.x);
        const dx = Math.cos(ang) * win.offset;
        const dy = Math.sin(ang) * win.offset;
        return {
            angle: ang,
            cx: (start.x + dx) / PIXELS_PER_METER,
            cy: (start.y + dy) / PIXELS_PER_METER,
            width: win.width / PIXELS_PER_METER,
            height: win.height,
            elevation: win.elevation || 0,
        };
    }, [win, start, end]);

    return (
        <group position={[cx, 0, cy]} rotation={[0, -angle, 0]}>
            <mesh position={[0, elevation + height / 2, 0]} receiveShadow material={windowGlassMaterial}>
                <boxGeometry args={[width, height, 0.01]} />
            </mesh>
        </group>
    );
});

// ─── Floor Mesh ────────────────────────────────────────────────────

function useRoomShape(
    points: BlueprintPoint[],
    walls: BlueprintWall[],
): THREE.Shape | null {
    return useMemo(() => {
        if (walls.length < 3) return null;

        // Build adjacency map
        const adj = new Map<string, string[]>();
        for (const w of walls) {
            if (!adj.has(w.startPointId)) adj.set(w.startPointId, []);
            if (!adj.has(w.endPointId)) adj.set(w.endPointId, []);
            adj.get(w.startPointId)!.push(w.endPointId);
            adj.get(w.endPointId)!.push(w.startPointId);
        }

        const startNodeId = Array.from(adj.keys()).find((k) => (adj.get(k)?.length ?? 0) >= 2);
        if (!startNodeId) return null;

        // Trace path
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
            } else break;
        }

        if (path.length < 3) return null;

        const pathPoints = path
            .map((id) => points.find((p) => p.id === id))
            .filter((p): p is BlueprintPoint => !!p);
        if (pathPoints.length !== path.length) return null;

        const shape = new THREE.Shape();
        shape.moveTo(pathPoints[0].x / PIXELS_PER_METER, -pathPoints[0].y / PIXELS_PER_METER);
        for (let i = 1; i < pathPoints.length; i++) {
            shape.lineTo(pathPoints[i].x / PIXELS_PER_METER, -pathPoints[i].y / PIXELS_PER_METER);
        }
        shape.closePath();
        return shape;
    }, [points, walls]);
}

const FloorMesh = React.memo(function FloorMesh({
    points, walls,
}: { points: BlueprintPoint[]; walls: BlueprintWall[] }) {
    const shape = useRoomShape(points, walls);
    if (!shape) return null;
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
            <shapeGeometry args={[shape]} />
            <meshStandardMaterial color="#1e293b" side={THREE.DoubleSide} />
        </mesh>
    );
});

// ─── Corner Posts ──────────────────────────────────────────────────

const CornerPost = React.memo(function CornerPost({
    point, connectedWalls,
}: { point: BlueprintPoint; connectedWalls: BlueprintWall[] }) {
    const maxHeight = useMemo(() => {
        if (connectedWalls.length === 0) return DEFAULT_WALL_HEIGHT;
        return Math.max(...connectedWalls.map((w) => w.height || DEFAULT_WALL_HEIGHT));
    }, [connectedWalls]);

    const geometry = useMemo(
        () => new THREE.CylinderGeometry(0.1, 0.1, maxHeight, 12),
        [maxHeight],
    );

    return (
        <mesh
            position={[point.x / PIXELS_PER_METER, maxHeight / 2, point.y / PIXELS_PER_METER]}
            material={cornerPostMaterial}
            geometry={geometry}
        />
    );
});

// ─── Main Component ────────────────────────────────────────────────

export default function BlueprintWalls3D({ shortWalls = false }: BlueprintWalls3DProps) {
    const floorPlan = useFloorPlanStore((s) => s.floorPlan);

    const points = useMemo(() => floorPlan?.points ?? [], [floorPlan?.points]);
    const walls = useMemo(() => floorPlan?.walls ?? [], [floorPlan?.walls]);
    const doors = useMemo(() => floorPlan?.doors ?? [], [floorPlan?.doors]);
    const windows = useMemo(() => floorPlan?.windows ?? [], [floorPlan?.windows]);

    // Pre-compute wall data
    const wallData = useMemo(() =>
        walls.map((wall) => {
            const s = points.find((p) => p.id === wall.startPointId);
            const e = points.find((p) => p.id === wall.endPointId);
            if (!s || !e) return null;
            return {
                wall, start: s, end: e,
                wallDoors: doors.filter((d) => d.wallId === wall.id),
                wallWindows: windows.filter((w) => w.wallId === wall.id),
            };
        }).filter(Boolean) as {
            wall: BlueprintWall; start: BlueprintPoint; end: BlueprintPoint;
            wallDoors: BlueprintDoor[]; wallWindows: BlueprintWindow[];
        }[],
        [walls, points, doors, windows],
    );

    // Pre-compute point connections for corner posts
    const pointConnections = useMemo(() =>
        points,
        [points],
    );

    // Compute center for centering the blueprint in the scene
    const center = useMemo(() => {
        if (points.length === 0) return [0, 0, 0] as const;
        const xs = points.map((p) => p.x);
        const ys = points.map((p) => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        return [
            (minX + maxX) / (2 * PIXELS_PER_METER),
            0,
            (minY + maxY) / (2 * PIXELS_PER_METER),
        ] as const;
    }, [points]);

    if (walls.length === 0) return null;

    // When shortWalls is true, clamp visual wall and corner-post heights
    const wallHeightScale = shortWalls ? Math.min(WALL_VIEW_MAX_HEIGHT / DEFAULT_WALL_HEIGHT, 1) : 1;

    return (
        <group
            name="blueprint-3d"
            position={[-center[0], 0, -center[2]]}
            scale={[1, wallHeightScale, 1]}
        >
            {/* Walls */}
            {wallData.map(({ wall, start, end, wallDoors, wallWindows }) => (
                <ComplexWallMesh
                    key={wall.id}
                    wall={wall}
                    start={start}
                    end={end}
                    wallDoors={wallDoors}
                    wallWindows={wallWindows}
                />
            ))}

            {/* Window Glass */}
            {wallData.map(({ start, end, wallWindows }) =>
                wallWindows.map((win) => (
                    <WindowGlass key={win.id} window={win} start={start} end={end} />
                )),
            )}

            {/* Corner Posts */}
            {pointConnections.map((point) => {
                const connectedWalls = walls.filter(
                    (w) => w.startPointId === point.id || w.endPointId === point.id,
                );
                if (connectedWalls.length === 0) return null;
                return (
                    <CornerPost key={point.id} point={point} connectedWalls={connectedWalls} />
                );
            })}

            {/* Floor Mesh */}
            <FloorMesh points={points} walls={walls} />
        </group>
    );
}
