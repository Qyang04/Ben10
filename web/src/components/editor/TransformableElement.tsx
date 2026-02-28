/**
 * TransformableElement Component
 * ===============================
 *
 * WHAT THIS FILE DOES:
 * - Wraps an element to make it draggable in 3D space
 * - Uses raycaster + ground plane intersection (inspired by wedding repo)
 * - No gizmo arrows — directly click and drag on the ground plane
 * - Smooth continuous movement while dragging (no grid snapping)
 * - Left/right click + Q or E rotates element (yaw, 5° per press)
 * - Left/right click + W or S adjusts element height
 * - Left/right click + scroll wheel adjusts element width
 * - Constrains movement/rotation so elements cannot go beyond room walls
 *
 * HOW IT WORKS:
 * 1. Click element to select (shows selection ring)
 * 2. Pointer down → captures pointer, creates ground plane, calculates offset
 * 3. Pointer move → intersects ray with ground plane, applies offset (smooth movement)
 * 4. Pointer up → releases capture, commits position to store, re-enables orbit
 */

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useFloorPlanStore } from '../../store';
import { DimensionHandles } from './DimensionHandles';
import {
    computeRoomPolygonWorld,
    isPointInRoomPolygon,
    getWallCollisionSegments,
    doesElementFootprintIntersectWalls,
    type RoomPolygon,
} from '../../utils/roomGeometry';
import type { Element as FloorElement } from '../../types';

interface TransformableElementProps {
    elementId: string;
    children: React.ReactNode;
    position: [number, number, number];
    rotation: [number, number, number];
    isSelected: boolean;
    onSelect: () => void;
    onOrbitToggle?: (enabled: boolean) => void;
}

/** Internal drag state — kept as a ref to avoid re-renders during drag */
interface DragState {
    isDragging: boolean;
    plane: THREE.Plane;
    offset: THREE.Vector3;
    intersection: THREE.Vector3;
    pointerId: number | null;
    captureTarget: EventTarget | null;
}

const SELECTION_RING_COLOR = '#3b82f6'; // Blue ring
const HOVER_EMISSIVE = 0x1a3a5c; // Subtle blue glow
const ROTATE_KEY_STEP = (5 * Math.PI) / 180; // 5° per key press
const WIDTH_SCROLL_STEP = 0.1; // 0.1m width change per scroll "tick"
const HEIGHT_KEY_STEP = 0.1; // 0.1m height change per key press

export function TransformableElement({
    elementId,
    children,
    position,
    rotation,
    isSelected,
    onSelect,
    onOrbitToggle,
}: TransformableElementProps) {
    const groupRef = useRef<THREE.Group>(null);
    const updateElement = useFloorPlanStore((state) => state.updateElement);
    const floorPlan = useFloorPlanStore((state) => state.floorPlan);
    const element: FloorElement | null =
        floorPlan?.elements.find((el) => el.id === elementId) ?? null;
    const [isHovered, setIsHovered] = useState(false);
    const [localRotation, setLocalRotation] = useState<[number, number, number]>(rotation);
    // Tracks whether a mouse button is currently held on this element
    const rotateKeyActiveRef = useRef(false);
    // When true, global wheel is captured to adjust width (and prevent page scroll)
    const [isWidthAdjustActive, setIsWidthAdjustActive] = useState(false);

    // Drag state ref — mutable, no re-renders
    const dragState = useRef<DragState>({
        isDragging: false,
        plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), // Y-up ground plane
        offset: new THREE.Vector3(),
        intersection: new THREE.Vector3(),
        pointerId: null,
        captureTarget: null,
    });

    // Access the R3F scene internals
    const { gl } = useThree();

    // Room boundary polygon in world coordinates (x,z), derived from floorPlan.
    // useMemo + try/catch so geometry issues don't crash the app or cause sync-store loops.
    const roomPolygon: RoomPolygon | null = useMemo(() => {
        try {
            if (!floorPlan) return null;
            return computeRoomPolygonWorld(floorPlan.points, floorPlan.walls);
        } catch (err) {
            console.error('Failed to compute room polygon:', err);
            return null;
        }
    }, [floorPlan?.points, floorPlan?.walls]);

    // Wall collision segments (partition walls + outer walls, doors create gaps)
    const wallCollisionSegments = useMemo(() => {
        if (!floorPlan) return [];
        return getWallCollisionSegments(floorPlan.points, floorPlan.walls, floorPlan.doors);
    }, [floorPlan?.points, floorPlan?.walls, floorPlan?.doors]);

    // Other elements for collision checks (exclude self)
    const otherElements: FloorElement[] = useMemo(
        () =>
            floorPlan?.elements.filter(
                (el) => el.id !== elementId && !!el.dimensions,
            ) ?? [],
        [floorPlan?.elements, elementId],
    );

    const wrapRadians = useCallback((rad: number) => {
        const tau = Math.PI * 2;
        return ((rad % tau) + tau) % tau;
    }, []);

    const isPlacementAllowed = useCallback(
        (x: number, z: number, yaw: number): boolean => {
            if (!element) return true;
            const dims = element.dimensions;
            if (!dims) return true;

            // ── 1) Stay inside room polygon (if available) ──────────
            if (roomPolygon) {
                const { width, depth } = dims;
                const halfW = width / 2;
                const halfD = depth / 2;
                const cos = Math.cos(yaw);
                const sin = Math.sin(yaw);

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
                    if (!isPointInRoomPolygon(wx, wz, roomPolygon)) {
                        return false;
                    }
                }
            }

            // ── 2) Cannot cross partition or outer walls (doors are gaps) ──
            if (
                wallCollisionSegments.length > 0 &&
                doesElementFootprintIntersectWalls(
                    x,
                    z,
                    yaw,
                    dims.width,
                    dims.depth,
                    wallCollisionSegments,
                )
            ) {
                return false;
            }

            // ── 3) Prevent overlap with other elements ──────────────
            // Use AABB overlap with small clearance. Chair-table pairs can be
            // very close (seating), other pairs need a tiny gap to prevent overlap.
            const hw = dims.width / 2;
            const hd = dims.depth / 2;

            for (const other of otherElements) {
                if (!other.dimensions) continue;
                const ohw = other.dimensions.width / 2;
                const ohd = other.dimensions.depth / 2;

                // Check if this is a chair-table pair (they should sit close)
                const isSeatingPair =
                    (element.type === 'chair' && other.type === 'table') ||
                    (element.type === 'table' && other.type === 'chair');
                const clearance = isSeatingPair ? 0.01 : 0.02;

                // AABB overlap test (axis-aligned, ignores rotation for speed)
                const overlapX = (x - hw - clearance) < (other.position.x + ohw) &&
                    (x + hw + clearance) > (other.position.x - ohw);
                const overlapZ = (z - hd - clearance) < (other.position.z + ohd) &&
                    (z + hd + clearance) > (other.position.z - ohd);

                if (overlapX && overlapZ) {
                    return false;
                }
            }

            return true;
        },
        [element, roomPolygon, wallCollisionSegments, otherElements],
    );

    const isPlacementAllowedWithDims = useCallback(
        (
            x: number,
            z: number,
            yaw: number,
            dims: { width: number; height: number; depth: number },
        ): boolean => {
            // ── 1) Stay inside room polygon (if available) ──────────
            if (roomPolygon) {
                const { width, depth } = dims;
                const halfW = width / 2;
                const halfD = depth / 2;
                const cos = Math.cos(yaw);
                const sin = Math.sin(yaw);

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
                    if (!isPointInRoomPolygon(wx, wz, roomPolygon)) {
                        return false;
                    }
                }
            }

            // ── 2) Cannot cross partition or outer walls (doors are gaps) ──
            if (
                wallCollisionSegments.length > 0 &&
                doesElementFootprintIntersectWalls(
                    x,
                    z,
                    yaw,
                    dims.width,
                    dims.depth,
                    wallCollisionSegments,
                )
            ) {
                return false;
            }

            // ── 3) Prevent overlap with other elements ──────────────
            const hw = dims.width / 2;
            const hd = dims.depth / 2;
            for (const other of otherElements) {
                if (!other.dimensions) continue;
                const ohw = other.dimensions.width / 2;
                const ohd = other.dimensions.depth / 2;
                const isSeatingPair =
                    (element?.type === 'chair' && other.type === 'table') ||
                    (element?.type === 'table' && other.type === 'chair');
                const clearance = isSeatingPair ? 0.01 : 0.02;
                const oX = (x - hw - clearance) < (other.position.x + ohw) &&
                    (x + hw + clearance) > (other.position.x - ohw);
                const oZ = (z - hd - clearance) < (other.position.z + ohd) &&
                    (z + hd + clearance) > (other.position.z - ohd);
                if (oX && oZ) return false;
            }

            return true;
        },
        [roomPolygon, wallCollisionSegments, otherElements],
    );

    // Keep local rotation in sync with store.
    useEffect(() => {
        setLocalRotation(rotation);
    }, [rotation]);

    /**
     * Commit current visual position to the Zustand store
     */
    const commitPosition = useCallback(() => {
        if (!groupRef.current) return;
        const { x, y, z } = groupRef.current.position;
        updateElement(elementId, {
            position: {
                x: Number(x.toFixed(3)),
                y: Number(y.toFixed(3)),
                z: Number(z.toFixed(3)),
            },
        });
    }, [elementId, updateElement]);

    const commitRotation = useCallback((rot: [number, number, number]) => {
        updateElement(elementId, {
            rotation: {
                x: Number(rot[0].toFixed(6)),
                y: Number(rot[1].toFixed(6)),
                z: Number(rot[2].toFixed(6)),
            },
        });
    }, [elementId, updateElement]);

    // Keyboard rotation / height: Q / E / W / S while a mouse button is held on the selected element.
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isSelected || !rotateKeyActiveRef.current || !groupRef.current) return;
            const key = e.key.toLowerCase();
            if (key !== 'q' && key !== 'e' && key !== 'w' && key !== 's') return;

            e.preventDefault();

            if (key === 'q' || key === 'e') {
                const { x, z } = groupRef.current.position;
                const delta = key === 'q' ? -ROTATE_KEY_STEP : ROTATE_KEY_STEP;

                setLocalRotation((prev) => {
                    const nextYaw = wrapRadians(prev[1] + delta);
                    if (!isPlacementAllowed(x, z, nextYaw)) return prev;
                    const next: [number, number, number] = [prev[0], nextYaw, prev[2]];
                    commitRotation(next);
                    return next;
                });
            } else if (key === 'w' || key === 's') {
                if (!element || !element.dimensions) return;
                const dir = key === 'w' ? 1 : -1;
                const rawNext = element.dimensions.height + dir * HEIGHT_KEY_STEP;
                const nextHeight = Math.max(0.2, Number(rawNext.toFixed(2)));
                updateElement(elementId, {
                    dimensions: { ...element.dimensions, height: nextHeight },
                });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSelected, isPlacementAllowed, wrapRadians, commitRotation]);

    /**
     * POINTER DOWN — start drag
     * 1. If not selected, just select (don't start drag)
     * 2. If selected, begin drag: capture pointer, compute offset from ground
     */
    const handlePointerDown = useCallback(
        (event: THREE.Event & { stopPropagation: () => void; ray: THREE.Ray; pointerId: number; target: EventTarget; nativeEvent?: PointerEvent; button?: number }) => {
            event.stopPropagation();
            (event as any).nativeEvent?.preventDefault?.();

            const button = (event as any).button ?? 0;

            // Track that a mouse button is down on this element (for Q/E rotation and width adjust).
            if (button === 0 || button === 2) {
                rotateKeyActiveRef.current = true;
                // Only enable width adjustment when the element is already selected
                if (isSelected) {
                    setIsWidthAdjustActive(true);
                }
            }

            // First click selects, second left-click (while selected) starts drag.
            if (!isSelected) {
                onSelect();
                return;
            }

            if (button !== 0 || !groupRef.current) return;

            const state = dragState.current;

            // Calculate where the ray hits the ground plane
            if (event.ray.intersectPlane(state.plane, state.intersection)) {
                // Offset = current position minus hit point (so object doesn't jump)
                state.offset.copy(groupRef.current.position).sub(state.intersection);
            } else {
                state.offset.set(0, 0, 0);
            }

            state.isDragging = true;
            state.pointerId = event.pointerId;
            state.captureTarget = event.target;

            // Capture pointer for reliable tracking outside the mesh
            try {
                (event.target as Element)?.setPointerCapture?.(event.pointerId);
            } catch {
                // Pointer capture not supported in all environments
            }

            // Disable orbit controls while dragging
            onOrbitToggle?.(false);

            // Set grabbing cursor
            gl.domElement.style.cursor = 'grabbing';
        },
        [isSelected, onSelect, onOrbitToggle, gl]
    );

    /**
     * POINTER MOVE — update position during drag
     * Intersect ray with ground plane, apply offset, snap to grid
     */
    const handlePointerMove = useCallback(
        (event: THREE.Event & { stopPropagation: () => void; ray: THREE.Ray }) => {
            const state = dragState.current;
            if (!state.isDragging || !groupRef.current) return;

            event.stopPropagation();

            if (event.ray.intersectPlane(state.plane, state.intersection)) {
                // New position = intersection + offset (smooth, no grid snapping)
                const nextX = state.intersection.x + state.offset.x;
                const nextZ = state.intersection.z + state.offset.z;

                // Keep Y at current level (ground)
                const nextY = groupRef.current.position.y;

                // Reject movement that would push element beyond room walls
                // or cause overlap with other elements
                const yaw = localRotation[1];
                if (isPlacementAllowed(nextX, nextZ, yaw)) {
                    groupRef.current.position.set(nextX, nextY, nextZ);
                }
            }
        },
        [isPlacementAllowed, localRotation]
    );

    /**
     * POINTER UP — end drag
     * Release pointer capture, commit position, re-enable orbit
     */
    const handlePointerUp = useCallback(
        (event: THREE.Event & { stopPropagation: () => void; target: EventTarget; pointerId?: number; nativeEvent?: PointerEvent }) => {
            event.stopPropagation();
            (event as any).nativeEvent?.preventDefault?.();

            // Mouse button released → stop Q/E rotation & width adjustment eligibility.
            rotateKeyActiveRef.current = false;
            setIsWidthAdjustActive(false);

            const state = dragState.current;
            if (!state.isDragging) return;

            // Release pointer capture
            try {
                if (state.captureTarget && state.pointerId !== null) {
                    (state.captureTarget as Element)?.releasePointerCapture?.(state.pointerId);
                }
            } catch {
                // Ignore
            }

            state.isDragging = false;
            state.pointerId = null;
            state.captureTarget = null;

            // Commit final position to store
            commitPosition();

            // Re-enable orbit controls
            onOrbitToggle?.(true);

            // Reset cursor
            gl.domElement.style.cursor = isHovered ? 'grab' : 'auto';
        },
        [commitPosition, onOrbitToggle, gl, isHovered]
    );

    /**
     * Hover handlers — visual feedback + cursor
     */
    const handlePointerEnter = useCallback(() => {
        setIsHovered(true);
        if (!dragState.current.isDragging) {
            gl.domElement.style.cursor = 'grab';
        }
    }, [gl]);

    const handlePointerLeave = useCallback(() => {
        setIsHovered(false);
        if (!dragState.current.isDragging) {
            gl.domElement.style.cursor = 'auto';
        }
    }, [gl]);

    // Global wheel handler for width adjustment. Attached only while isWidthAdjustActive is true.
    useEffect(() => {
        if (!isWidthAdjustActive) return;

        const handleWheel = (e: WheelEvent) => {
            // Always prevent page scrolling while actively adjusting width.
            e.preventDefault();

            if (!isSelected || !element || !element.dimensions) return;

            const dir = Math.sign(e.deltaY);
            if (!dir) return;

            const rawNext = element.dimensions.width - dir * WIDTH_SCROLL_STEP;
            const nextWidth = Math.max(0.2, Number(rawNext.toFixed(2)));

            const yaw = groupRef.current?.rotation.y ?? element.rotation.y ?? 0;
            const x = groupRef.current?.position.x ?? element.position.x;
            const z = groupRef.current?.position.z ?? element.position.z;
            const nextDims = { ...element.dimensions, width: nextWidth };
            if (!isPlacementAllowedWithDims(x, z, yaw, nextDims)) return;

            updateElement(elementId, { dimensions: nextDims });
        };

        window.addEventListener('wheel', handleWheel, { passive: false });
        return () => window.removeEventListener('wheel', handleWheel);
    }, [isWidthAdjustActive, isSelected, element, elementId, updateElement, isPlacementAllowedWithDims]);

    return (
        <group
            ref={groupRef}
            position={position}
            rotation={localRotation}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={handlePointerDown as any}
            onPointerMove={handlePointerMove as any}
            onPointerUp={handlePointerUp as any}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
        >
            {/* The actual 3D element */}
            {children}

            {/* Selection ring — shown when selected */}
            {isSelected && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                    <ringGeometry args={[0.6, 0.72, 32]} />
                    <meshBasicMaterial
                        color={SELECTION_RING_COLOR}
                        transparent
                        opacity={0.7}
                        side={THREE.DoubleSide}
                        depthWrite={false}
                    />
                </mesh>
            )}

            {/* Dimension handles — shown when selected */}
            {isSelected && element && (
                <DimensionHandles
                    dimensions={element.dimensions}
                    onResize={(dim, value) => {
                        if (!element.dimensions) return;
                        const nextDims = { ...element.dimensions, [dim]: value };
                        // Height changes don't affect footprint; allow freely.
                        if (dim === 'width' || dim === 'depth') {
                            const yaw = groupRef.current?.rotation.y ?? element.rotation.y ?? 0;
                            const x = groupRef.current?.position.x ?? element.position.x;
                            const z = groupRef.current?.position.z ?? element.position.z;
                            if (!isPlacementAllowedWithDims(x, z, yaw, nextDims)) return;
                        }
                        updateElement(elementId, { dimensions: nextDims });
                    }}
                />
            )}

            {/* Hover highlight — subtle emissive glow */}
            {isHovered && !isSelected && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                    <ringGeometry args={[0.55, 0.65, 32]} />
                    <meshBasicMaterial
                        color={HOVER_EMISSIVE}
                        transparent
                        opacity={0.4}
                        side={THREE.DoubleSide}
                        depthWrite={false}
                    />
                </mesh>
            )}
        </group>
    );
}
