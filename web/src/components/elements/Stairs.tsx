/**
 * Stairs Component
 * =================
 * 
 * WHAT: 3D staircase for level changes
 * 
 * KEY PROPERTIES:
 * - dimensions.width: Stair width
 * - dimensions.height: Total rise (vertical height)
 * - dimensions.depth: Total run (horizontal length)
 * 
 * ACCESSIBILITY NOTE:
 * Stairs are NOT accessible for wheelchairs - ramps are required
 * This component visually indicates inaccessibility
 */

import type { Element } from '../../types';

interface StairsProps {
    element: Element;
    isSelected: boolean;
}

export function Stairs({ element, isSelected }: StairsProps) {
    const { width, height, depth } = element.dimensions;

    // Calculate step dimensions
    const stepCount = Math.ceil(height / 0.18); // ~18cm per step (ADA standard)
    const stepHeight = height / stepCount;
    const stepDepth = depth / stepCount;

    return (
        <group>
            {/* Generate individual steps */}
            {Array.from({ length: stepCount }).map((_, i) => (
                <mesh
                    key={i}
                    position={[0, stepHeight * i + stepHeight / 2, stepDepth * i + stepDepth / 2]}
                    castShadow
                    receiveShadow
                >
                    <boxGeometry args={[width, stepHeight, stepDepth]} />
                    <meshStandardMaterial
                        color={isSelected ? '#3b82f6' : '#64748b'}
                        emissive={isSelected ? '#1d4ed8' : '#000000'}
                        emissiveIntensity={isSelected ? 0.2 : 0}
                    />
                </mesh>
            ))}

            {/* Warning indicator - stairs are not wheelchair accessible */}
            <mesh position={[0, height + 0.1, depth / 2]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.3, 0.3]} />
                <meshBasicMaterial color="#ef4444" />
            </mesh>
        </group>
    );
}
