/**
 * Shelf Component
 * ===============
 * Tall bookshelf/cabinet with multiple shelves.
 * Significant obstacle for wheelchair clearance.
 *
 * Default: 0.9 × 1.8 × 0.4m
 */

import type { Element } from '../../types';

interface ShelfProps {
    element: Element;
    isSelected: boolean;
}

export function Shelf({ element, isSelected }: ShelfProps) {
    const { width, height, depth } = element.dimensions;
    const panelT = 0.02;
    const shelfCount = 4;
    const baseColor = isSelected ? '#3b82f6' : '#8B6914';
    const accentColor = isSelected ? '#2563eb' : '#6B4F0A';

    const shelves: [number, number, number][] = [];
    for (let i = 0; i <= shelfCount; i++) {
        shelves.push([0, (i / shelfCount) * height, 0]);
    }

    return (
        <group>
            {/* Back panel */}
            <mesh position={[0, height / 2, -depth / 2 + panelT / 2]} castShadow receiveShadow>
                <boxGeometry args={[width, height, panelT]} />
                <meshStandardMaterial color={accentColor} />
            </mesh>

            {/* Left side */}
            <mesh position={[-width / 2 + panelT / 2, height / 2, 0]} castShadow>
                <boxGeometry args={[panelT, height, depth]} />
                <meshStandardMaterial color={baseColor} />
            </mesh>

            {/* Right side */}
            <mesh position={[width / 2 - panelT / 2, height / 2, 0]} castShadow>
                <boxGeometry args={[panelT, height, depth]} />
                <meshStandardMaterial color={baseColor} />
            </mesh>

            {/* Shelf boards */}
            {shelves.map((pos, i) => (
                <mesh key={i} position={pos} castShadow receiveShadow>
                    <boxGeometry args={[width, panelT, depth]} />
                    <meshStandardMaterial
                        color={baseColor}
                        emissive={isSelected ? '#1d4ed8' : '#000000'}
                        emissiveIntensity={isSelected ? 0.15 : 0}
                    />
                </mesh>
            ))}
        </group>
    );
}
