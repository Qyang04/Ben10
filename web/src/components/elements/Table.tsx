/**
 * Table Component
 * ================
 * 
 * WHAT: 3D table (furniture element)
 * 
 * KEY PROPERTIES:
 * - dimensions.width: Table width
 * - dimensions.height: Table height (typically 0.75m)
 * - dimensions.depth: Table depth
 */

import type { Element } from '../../types';

interface TableProps {
    element: Element;
    isSelected: boolean;
}

export function Table({ element, isSelected }: TableProps) {
    const { width, height, depth } = element.dimensions;
    const legHeight = height - 0.05;
    const legSize = 0.05;

    return (
        <group>
            {/* Table top */}
            <mesh position={[0, height, 0]} castShadow receiveShadow>
                <boxGeometry args={[width, 0.05, depth]} />
                <meshStandardMaterial
                    color={isSelected ? '#3b82f6' : '#8b5a2b'}
                    emissive={isSelected ? '#1d4ed8' : '#000000'}
                    emissiveIntensity={isSelected ? 0.2 : 0}
                />
            </mesh>

            {/* Table legs */}
            {[
                [-width / 2 + legSize, legHeight / 2, -depth / 2 + legSize],
                [width / 2 - legSize, legHeight / 2, -depth / 2 + legSize],
                [-width / 2 + legSize, legHeight / 2, depth / 2 - legSize],
                [width / 2 - legSize, legHeight / 2, depth / 2 - legSize],
            ].map((pos, i) => (
                <mesh key={i} position={pos as [number, number, number]} castShadow>
                    <boxGeometry args={[legSize, legHeight, legSize]} />
                    <meshStandardMaterial color={isSelected ? '#3b82f6' : '#5c3d1e'} />
                </mesh>
            ))}
        </group>
    );
}
