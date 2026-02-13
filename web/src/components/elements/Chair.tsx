/**
 * Chair Component
 * ================
 * 
 * WHAT: 3D chair (furniture element)
 * 
 * KEY PROPERTIES:
 * - dimensions.width: Chair width (typically 0.45m)
 * - dimensions.height: Chair seat height (typically 0.45m)
 * - dimensions.depth: Chair depth
 */

import type { Element } from '../../types';

interface ChairProps {
    element: Element;
    isSelected: boolean;
}

export function Chair({ element, isSelected }: ChairProps) {
    const { width, height, depth } = element.dimensions;
    const legHeight = height;
    const legSize = 0.03;
    const backHeight = 0.4;

    return (
        <group>
            {/* Seat */}
            <mesh position={[0, height, 0]} castShadow receiveShadow>
                <boxGeometry args={[width, 0.03, depth]} />
                <meshStandardMaterial
                    color={isSelected ? '#3b82f6' : '#4a5568'}
                    emissive={isSelected ? '#1d4ed8' : '#000000'}
                    emissiveIntensity={isSelected ? 0.2 : 0}
                />
            </mesh>

            {/* Backrest */}
            <mesh position={[0, height + backHeight / 2, -depth / 2 + 0.02]} castShadow>
                <boxGeometry args={[width, backHeight, 0.03]} />
                <meshStandardMaterial color={isSelected ? '#3b82f6' : '#4a5568'} />
            </mesh>

            {/* Legs */}
            {[
                [-width / 2 + legSize, legHeight / 2, -depth / 2 + legSize],
                [width / 2 - legSize, legHeight / 2, -depth / 2 + legSize],
                [-width / 2 + legSize, legHeight / 2, depth / 2 - legSize],
                [width / 2 - legSize, legHeight / 2, depth / 2 - legSize],
            ].map((pos, i) => (
                <mesh key={i} position={pos as [number, number, number]} castShadow>
                    <boxGeometry args={[legSize, legHeight, legSize]} />
                    <meshStandardMaterial color={isSelected ? '#2563eb' : '#2d3748'} />
                </mesh>
            ))}
        </group>
    );
}
