/**
 * DimensionHandles Component
 * ===========================
 * 
 * WHAT: Renders interactive measurement handles on selected elements.
 * Shows exact dimensions (e.g., "← 2.50m →") and lets users drag to resize.
 * 
 * HOW:
 * - 3 axis-aligned handle pairs (arrows + labels)
 * - Color-coded: Red=Width(X), Green=Height(Y), Blue=Depth(Z)
 * - Edge-based resize: drag one edge, opposite stays fixed
 * - Raycaster drag on camera-aligned plane → delta mapped to axis
 * - Snaps to 0.1m increments during resize
 * - Updates element.dimensions via store on drag end
 * 
 * CRITICAL FOR ACCESSIBILITY:
 * Users must verify door widths ≥ 81.5cm for ADA compliance.
 * This component makes dimensions immediately visible and adjustable.
 */
/* eslint-disable react-refresh/only-export-components */

import { useRef, useMemo, useCallback, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

// ─── Exported Utilities (tested in DimensionHandles.test.ts) ───

export interface AxisConfig {
    dimension: 'width' | 'height' | 'depth';
    label: string;
    color: string;
    /** Unit vector for this axis in world space */
    axis: THREE.Vector3;
}

export const AXIS_CONFIG: AxisConfig[] = [
    { dimension: 'width', label: 'W', color: '#ef4444', axis: new THREE.Vector3(1, 0, 0) },
    { dimension: 'height', label: 'H', color: '#22c55e', axis: new THREE.Vector3(0, 1, 0) },
    { dimension: 'depth', label: 'D', color: '#3b82f6', axis: new THREE.Vector3(0, 0, 1) },
];

/**
 * Format a dimension value for display.
 * Values ≥ 1m → meters (e.g., "2.50m")
 * Values < 1m → centimeters (e.g., "81.5cm")
 */
export function formatDimension(meters: number): string {
    if (meters === 0) return '0cm';
    if (meters < 1) {
        const cm = meters * 100;
        return `${cm.toFixed(1)}cm`;
    }
    return `${meters.toFixed(2)}m`;
}

/**
 * Snap a dimension to 0.1m increments with a minimum of 0.1m.
 */
export function snapDimension(value: number): number {
    const snapped = Math.round(value * 10) / 10;
    return Math.max(0.1, snapped);
}

// ─── Component ───

interface DimensionHandlesProps {
    dimensions: { width: number; height: number; depth: number };
    onResize: (dimension: 'width' | 'height' | 'depth', newValue: number) => void;
}

/** Cached vectors — never allocate inside render/callbacks */
const _intersection = new THREE.Vector3();
const _dragPlane = new THREE.Plane();
const _startPoint = new THREE.Vector3();

interface DragInfo {
    axis: AxisConfig;
    startValue: number;
    startHit: THREE.Vector3;
    sign: 1 | -1;
}

export function DimensionHandles({ dimensions, onResize }: DimensionHandlesProps) {
    const { camera } = useThree();
    const dragRef = useRef<DragInfo | null>(null);
    const [activeDrag, setActiveDrag] = useState<string | null>(null);

    // Memoize handle positions from dimensions
    const handles = useMemo(() => {
        return AXIS_CONFIG.map((axis) => {
            const size = dimensions[axis.dimension];
            // Offset from center to each edge along the axis
            const halfSize = size / 2;

            // Position the label at center of the axis
            const labelPos = axis.axis.clone().multiplyScalar(0);
            // For height, offset up by half
            if (axis.dimension === 'height') {
                labelPos.y = halfSize;
            }

            // Two handle endpoints
            const posEnd = axis.axis.clone().multiplyScalar(halfSize);
            const negEnd = axis.axis.clone().multiplyScalar(-halfSize);

            // For height: shift endpoints up
            if (axis.dimension === 'height') {
                // Height goes from 0 to height, center is at height/2
                posEnd.y = size;
                negEnd.y = 0;
                labelPos.y = size / 2;
            }

            return {
                axis,
                size,
                posEnd,
                negEnd,
                labelPos,
            };
        });
    }, [dimensions]);

    const handlePointerDown = useCallback(
        (axis: AxisConfig, sign: 1 | -1) => (event: THREE.Event & { stopPropagation: () => void; ray: THREE.Ray }) => {
            event.stopPropagation();

            // Create drag plane perpendicular to the camera, passing through the hit point
            const cameraDir = camera.getWorldDirection(new THREE.Vector3());
            if (event.ray.intersectPlane(
                _dragPlane.setFromNormalAndCoplanarPoint(cameraDir, event.ray.origin.clone().add(event.ray.direction.clone().multiplyScalar(10))),
                _startPoint
            )) {
                // Actually, set the plane through the current position
                _dragPlane.setFromNormalAndCoplanarPoint(cameraDir, _startPoint);
            }

            dragRef.current = {
                axis,
                startValue: dimensions[axis.dimension],
                startHit: _startPoint.clone(),
                sign,
            };
            setActiveDrag(`${axis.dimension}_${sign}`);
        },
        [camera, dimensions]
    );

    const handlePointerMove = useCallback(
        (event: THREE.Event & { stopPropagation: () => void; ray: THREE.Ray }) => {
            if (!dragRef.current) return;
            event.stopPropagation();

            const drag = dragRef.current;
            if (event.ray.intersectPlane(_dragPlane, _intersection)) {
                // Calculate delta along the axis
                const delta = _intersection.clone().sub(drag.startHit);
                const axisDelta = delta.dot(drag.axis.axis) * drag.sign;

                const newValue = snapDimension(drag.startValue + axisDelta);
                onResize(drag.axis.dimension, newValue);
            }
        },
        [onResize]
    );

    const handlePointerUp = useCallback(
        (event: THREE.Event & { stopPropagation: () => void }) => {
            event.stopPropagation();
            dragRef.current = null;
            setActiveDrag(null);
        },
        []
    );

    return (
        <group>
            {handles.map(({ axis, size, posEnd, negEnd, labelPos }) => (
                <group key={axis.dimension}>
                    {/* Dimension line */}
                    <line>
                        <bufferGeometry>
                            <bufferAttribute
                                attach="attributes-position"
                                args={[new Float32Array([
                                    negEnd.x, negEnd.y, negEnd.z,
                                    posEnd.x, posEnd.y, posEnd.z,
                                ]), 3]}
                                count={2}
                                itemSize={3}
                            />
                        </bufferGeometry>
                        <lineBasicMaterial
                            color={axis.color}
                            linewidth={2}
                            transparent
                            opacity={activeDrag && activeDrag !== `${axis.dimension}_1` && activeDrag !== `${axis.dimension}_-1` ? 0.3 : 0.8}
                        />
                    </line>

                    {/* Positive end handle (sphere) */}
                    <mesh
                        position={posEnd}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        onPointerDown={handlePointerDown(axis, 1) as any}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        onPointerMove={handlePointerMove as any}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        onPointerUp={handlePointerUp as any}
                    >
                        <sphereGeometry args={[0.08, 8, 8]} />
                        <meshBasicMaterial color={axis.color} />
                    </mesh>

                    {/* Negative end handle (sphere) */}
                    <mesh
                        position={negEnd}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        onPointerDown={handlePointerDown(axis, -1) as any}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        onPointerMove={handlePointerMove as any}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        onPointerUp={handlePointerUp as any}
                    >
                        <sphereGeometry args={[0.08, 8, 8]} />
                        <meshBasicMaterial color={axis.color} />
                    </mesh>

                    {/* Dimension label */}
                    <Html
                        position={[labelPos.x, labelPos.y, labelPos.z]}
                        center
                        style={{
                            pointerEvents: 'none',
                            userSelect: 'none',
                        }}
                    >
                        <div style={{
                            background: axis.color,
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            fontFamily: 'monospace',
                            whiteSpace: 'nowrap',
                            opacity: 0.9,
                        }}>
                            {axis.label} {formatDimension(size)}
                        </div>
                    </Html>
                </group>
            ))}
        </group>
    );
}
