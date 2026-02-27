/**
 * TransformableElement Component
 * ===============================
 *
 * WHAT THIS FILE DOES:
 * - Wraps an element to make it draggable in 3D space
 * - Uses raycaster + ground plane intersection (inspired by wedding repo)
 * - No gizmo arrows — directly click and drag on the ground plane
 * - Grid snaps in real-time while dragging
 * - Right/left click + scroll wheel rotates element (yaw)
 * - Constrains movement/rotation so elements cannot go beyond room walls
 *
 * HOW IT WORKS:
 * 1. Click element to select (shows selection ring)
 * 2. Pointer down → captures pointer, creates ground plane, calculates offset
 * 3. Pointer move → intersects ray with ground plane, applies offset, snaps to grid
 * 4. Pointer up → releases capture, commits position to store, re-enables orbit
 */

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useFloorPlanStore } from '../../store';
import { snapToGrid } from '../../utils/gridSnap';
import { DimensionHandles } from './DimensionHandles';
import { computeRoomPolygonWorld, isPointInRoomPolygon, type RoomPolygon } from '../../utils/roomGeometry';
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

const SNAP_INCREMENT = 0.5; // 0.5m grid
const SELECTION_RING_COLOR = '#3b82f6'; // Blue ring
const HOVER_EMISSIVE = 0x1a3a5c; // Subtle blue glow
const ROTATE_WHEEL_SENSITIVITY = 0.005; // radians per wheel delta unit

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
    const [wheelRotateActive, setWheelRotateActive] = useState(false);
    const [localRotation, setLocalRotation] = useState<[number, number, number]>(rotation);
    const interactionModeRef = useRef<'none' | 'rotateHold'>('none');
    const rotationStartRef = useRef<[number, number, number]>(rotation);

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

            // ── 2) Prevent overlap with other elements ──────────────
            const selfRadius = 0.5 * Math.sqrt(dims.width ** 2 + dims.depth ** 2);

            for (const other of otherElements) {
                if (!other.dimensions) continue;
                const ox = other.position.x;
                const oz = other.position.z;
                const otherRadius =
                    0.5 * Math.sqrt(other.dimensions.width ** 2 + other.dimensions.depth ** 2);

                const dx = x - ox;
                const dz = z - oz;
                const distSq = dx * dx + dz * dz;
                const minDist = selfRadius + otherRadius;

                if (distSq < minDist * minDist) {
                    return false;
                }
            }

            return true;
        },
        [element, roomPolygon, otherElements],
    );

    // Keep local rotation in sync with store unless actively rotating.
    useEffect(() => {
        if (wheelRotateActive) return;
        setLocalRotation(rotation);
    }, [rotation, wheelRotateActive]);

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

    const handleWheelRotate = useCallback((e: WheelEvent) => {
        if (!wheelRotateActive) return;
        e.preventDefault();

        if (!groupRef.current) return;
        const { x, z } = groupRef.current.position;

        const delta = -e.deltaY * ROTATE_WHEEL_SENSITIVITY;
        setLocalRotation((prev) => {
            const nextYaw = wrapRadians(prev[1] + delta);
            if (!isPlacementAllowed(x, z, nextYaw)) return prev;
            return [prev[0], nextYaw, prev[2]];
        });
    }, [wheelRotateActive, wrapRadians, isPlacementAllowed]);

    useEffect(() => {
        if (!wheelRotateActive) return;

        gl.domElement.addEventListener('wheel', handleWheelRotate, { passive: false });
        gl.domElement.style.cursor = 'grabbing';
        return () => {
            gl.domElement.removeEventListener('wheel', handleWheelRotate as any);
            gl.domElement.style.cursor = isHovered ? 'grab' : 'auto';
        };
    }, [gl, handleWheelRotate, wheelRotateActive, isHovered]);

    const hasRotationChanged = useCallback((a: [number, number, number], b: [number, number, number]) => {
        const eps = 1e-6;
        return (
            Math.abs(a[0] - b[0]) > eps ||
            Math.abs(a[1] - b[1]) > eps ||
            Math.abs(a[2] - b[2]) > eps
        );
    }, []);

    /**
     * POINTER DOWN — start drag
     * 1. If not selected, just select (don't start drag)
     * 2. If selected, begin drag: capture pointer, compute offset from ground
     */
    const handlePointerDown = useCallback(
        (event: THREE.Event & { stopPropagation: () => void; ray: THREE.Ray; pointerId: number; target: EventTarget; nativeEvent?: PointerEvent; button?: number }) => {
            event.stopPropagation();
            (event as any).nativeEvent?.preventDefault?.();

            const button = (event as any).button;

            // Right-click OR left-click (hold): grab to rotate with scroll wheel.
            // Left-click also selects first; if already selected, you can still drag (and wheel-rotate while dragging).
            if (button === 2 || (button === 0 && !isSelected)) {
                if (!isSelected) onSelect();
                interactionModeRef.current = 'rotateHold';
                rotationStartRef.current = localRotation;
                setWheelRotateActive(true);
                onOrbitToggle?.(false);
                try {
                    (event.target as Element)?.setPointerCapture?.(event.pointerId);
                } catch {
                    // ignore
                }
                return;
            }

            // First click selects, second click (while selected) starts drag
            if (!isSelected) {
                onSelect();
                return;
            }

            if (!groupRef.current) return;

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

            // Enable wheel-rotate while the element is held (left button drag).
            rotationStartRef.current = localRotation;
            setWheelRotateActive(true);
        },
        [isSelected, onSelect, onOrbitToggle, gl, localRotation]
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
                // New position = intersection + offset, snapped to grid
                const nextX = snapToGrid(state.intersection.x + state.offset.x, SNAP_INCREMENT);
                const nextZ = snapToGrid(state.intersection.z + state.offset.z, SNAP_INCREMENT);

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

            // Finish rotate-hold mode (right click OR left click while selecting)
            if (interactionModeRef.current === 'rotateHold') {
                interactionModeRef.current = 'none';
                setWheelRotateActive(false);

                // Release pointer capture (best effort)
                try {
                    if ((event.target as Element)?.hasPointerCapture?.(event.pointerId as number)) {
                        (event.target as Element)?.releasePointerCapture?.(event.pointerId as number);
                    }
                } catch {
                    // ignore
                }

                if (hasRotationChanged(rotationStartRef.current, localRotation)) {
                    commitRotation(localRotation);
                }
                onOrbitToggle?.(true);
                return;
            }

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

            // Commit rotation once if wheel was used during hold/drag
            setWheelRotateActive(false);
            if (hasRotationChanged(rotationStartRef.current, localRotation)) {
                commitRotation(localRotation);
            }

            // Re-enable orbit controls
            onOrbitToggle?.(true);

            // Reset cursor
            gl.domElement.style.cursor = isHovered ? 'grab' : 'auto';
        },
        [commitPosition, onOrbitToggle, gl, isHovered, commitRotation, localRotation, hasRotationChanged]
    );

    /**
     * Hover handlers — visual feedback + cursor
     */
    const handlePointerEnter = useCallback(() => {
        setIsHovered(true);
        if (!dragState.current.isDragging && !wheelRotateActive) {
            gl.domElement.style.cursor = 'grab';
        }
    }, [gl, wheelRotateActive]);

    const handlePointerLeave = useCallback(() => {
        setIsHovered(false);
        if (!dragState.current.isDragging && !wheelRotateActive) {
            gl.domElement.style.cursor = 'auto';
        }
    }, [gl, wheelRotateActive]);

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
                        updateElement(elementId, {
                            dimensions: { ...element.dimensions, [dim]: value },
                        });
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
