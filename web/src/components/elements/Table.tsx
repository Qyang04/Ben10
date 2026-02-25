/**
 * Table Component
 * ================
 * 
 * WHAT: 3D table — supports rectangular and round shapes.
 * Inspired by wedding repo's round table concept.
 * 
 * KEY PROPERTIES:
 * - dimensions.width: Table width (or diameter for round)
 * - dimensions.height: Table height (typically 0.75m)
 * - dimensions.depth: Table depth (ignored for round)
 * - properties.shape: 'rectangular' (default) | 'round'
 */

import type { Element } from '../../types';

interface TableProps {
    element: Element;
    isSelected: boolean;
}

export function Table({ element, isSelected }: TableProps) {
    const { width, height, depth } = element.dimensions;
    const shape = (element.properties?.shape as string) || 'rectangular';
    const isRound = shape === 'round';
    const topColor = isSelected ? '#3b82f6' : '#8b5a2b';
    const legColor = isSelected ? '#3b82f6' : '#5c3d1e';
    const legSize = 0.05;
    const topH = 0.05;
    const legHeight = height - topH;

    if (isRound) {
        const radius = width / 2;
        return (
            <group>
                {/* Round table top */}
                <mesh position={[0, height, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[radius, radius, topH, 24]} />
                    <meshStandardMaterial
                        color={topColor}
                        emissive={isSelected ? '#1d4ed8' : '#000000'}
                        emissiveIntensity={isSelected ? 0.2 : 0}
                    />
                </mesh>

                {/* Central pedestal */}
                <mesh position={[0, legHeight / 2, 0]} castShadow>
                    <cylinderGeometry args={[legSize * 1.5, legSize * 2, legHeight, 8]} />
                    <meshStandardMaterial color={legColor} />
                </mesh>

                {/* Base plate */}
                <mesh position={[0, 0.02, 0]} castShadow>
                    <cylinderGeometry args={[radius * 0.5, radius * 0.5, 0.04, 16]} />
                    <meshStandardMaterial color={legColor} />
                </mesh>
            </group>
        );
    }

    // Rectangular table (original design)
    return (
        <group>
            {/* Table top */}
            <mesh position={[0, height, 0]} castShadow receiveShadow>
                <boxGeometry args={[width, topH, depth]} />
                <meshStandardMaterial
                    color={topColor}
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
                    <meshStandardMaterial color={legColor} />
                </mesh>
            ))}
        </group>
    );
}
