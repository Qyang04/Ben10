/**
 * Bed Component
 * =============
 * Bed with frame, mattress, and headboard.
 * Key for bedroom/clinic accessibility analysis.
 *
 * Default: 1.4 × 0.5 × 2.0m
 */

import type { Element } from '../../types';

interface BedProps {
    element: Element;
    isSelected: boolean;
}

export function Bed({ element, isSelected }: BedProps) {
    const { width, height, depth } = element.dimensions;
    const frameH = height * 0.4;
    const mattressH = height * 0.5;
    const headboardH = height * 1.2;
    const legSize = 0.06;
    const baseColor = isSelected ? '#3b82f6' : '#d4c5a9';
    const frameColor = isSelected ? '#2563eb' : '#8B7355';

    return (
        <group>
            {/* Frame rails */}
            <mesh position={[0, frameH / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[width, frameH, depth]} />
                <meshStandardMaterial color={frameColor} />
            </mesh>

            {/* Mattress */}
            <mesh position={[0, frameH + mattressH / 2, 0.02]} castShadow>
                <boxGeometry args={[width - 0.04, mattressH, depth - 0.04]} />
                <meshStandardMaterial
                    color={baseColor}
                    emissive={isSelected ? '#1d4ed8' : '#000000'}
                    emissiveIntensity={isSelected ? 0.15 : 0}
                />
            </mesh>

            {/* Headboard */}
            <mesh position={[0, headboardH / 2, -depth / 2 + 0.04]} castShadow>
                <boxGeometry args={[width, headboardH, 0.06]} />
                <meshStandardMaterial color={frameColor} />
            </mesh>

            {/* Legs */}
            {[
                [-width / 2 + legSize, 0, -depth / 2 + legSize],
                [width / 2 - legSize, 0, -depth / 2 + legSize],
                [-width / 2 + legSize, 0, depth / 2 - legSize],
                [width / 2 - legSize, 0, depth / 2 - legSize],
            ].map((pos, i) => (
                <mesh key={i} position={pos as [number, number, number]} castShadow>
                    <boxGeometry args={[legSize, frameH, legSize]} />
                    <meshStandardMaterial color={frameColor} />
                </mesh>
            ))}
        </group>
    );
}
