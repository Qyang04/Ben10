/**
 * WheelchairPath Component
 * =========================
 *
 * 3D visualization of a wheelchair-accessible path:
 *   - Green cylinder = start marker
 *   - Red cylinder = end marker
 *   - Green line = valid path (slightly above floor)
 *   - Red dashed line = no route found
 */

import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import type { PathPoint } from '../../analysis/wheelchairPathfinding';

interface WheelchairPathProps {
    start: PathPoint | null;
    end: PathPoint | null;
    path: PathPoint[] | null;
    found: boolean;
}

const PATH_Y = 0.05;  // height above floor
const MARKER_RADIUS = 0.12;
const MARKER_HEIGHT = 0.3;

export function WheelchairPath({ start, end, path, found }: WheelchairPathProps) {
    // Convert path to Vector3 tuples for drei <Line>
    const pathPoints = useMemo(() => {
        if (!path || path.length < 2) return null;
        return path.map((p) => [p.x, PATH_Y, p.z] as [number, number, number]);
    }, [path]);

    // Direct line between start and end (for "no route" indicator)
    const directLine = useMemo(() => {
        if (!start || !end) return null;
        return [
            [start.x, PATH_Y, start.z] as [number, number, number],
            [end.x, PATH_Y, end.z] as [number, number, number],
        ];
    }, [start, end]);

    return (
        <group>
            {/* Start marker — green cylinder */}
            {start && (
                <mesh position={[start.x, MARKER_HEIGHT / 2, start.z]}>
                    <cylinderGeometry args={[MARKER_RADIUS, MARKER_RADIUS, MARKER_HEIGHT, 16]} />
                    <meshStandardMaterial
                        color="#22c55e"
                        emissive="#22c55e"
                        emissiveIntensity={0.4}
                        transparent
                        opacity={0.85}
                    />
                </mesh>
            )}

            {/* End marker — red cylinder */}
            {end && (
                <mesh position={[end.x, MARKER_HEIGHT / 2, end.z]}>
                    <cylinderGeometry args={[MARKER_RADIUS, MARKER_RADIUS, MARKER_HEIGHT, 16]} />
                    <meshStandardMaterial
                        color="#ef4444"
                        emissive="#ef4444"
                        emissiveIntensity={0.4}
                        transparent
                        opacity={0.85}
                    />
                </mesh>
            )}

            {/* Valid path — green glowing line */}
            {pathPoints && found && (
                <Line
                    points={pathPoints}
                    color="#22c55e"
                    lineWidth={4}
                    transparent
                    opacity={0.9}
                />
            )}

            {/* No route — red dashed line between start and end */}
            {directLine && !found && start && end && (
                <Line
                    points={directLine}
                    color="#ef4444"
                    lineWidth={3}
                    dashed
                    dashSize={0.2}
                    gapSize={0.15}
                    transparent
                    opacity={0.7}
                />
            )}

            {/* No route label — small red X at midpoint */}
            {!found && start && end && (
                <mesh position={[(start.x + end.x) / 2, 0.3, (start.z + end.z) / 2]}>
                    <sphereGeometry args={[0.08, 8, 8]} />
                    <meshStandardMaterial
                        color="#ef4444"
                        emissive="#ef4444"
                        emissiveIntensity={0.6}
                    />
                </mesh>
            )}
        </group>
    );
}
