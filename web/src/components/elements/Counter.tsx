/**
 * Counter Component
 * ==================
 * 
 * WHAT: Service counter (e.g., reception desk, cafe counter)
 * 
 * KEY PROPERTIES:
 * - dimensions.width: Counter length
 * - dimensions.height: Counter height (ADA max: 86cm for accessible section)
 * - dimensions.depth: Counter depth
 * 
 * ACCESSIBILITY NOTE:
 * ADA requires a lowered section (≤86cm) for wheelchair users
 */

import type { Element } from '../../types';

interface CounterProps {
    element: Element;
    isSelected: boolean;
}

export function Counter({ element, isSelected }: CounterProps) {
    const { width, height, depth } = element.dimensions;

    // Check if counter height is accessible (≤86cm)
    const isAccessible = height <= 0.86;

    return (
        <group>
            {/* Main counter surface */}
            <mesh position={[0, height, 0]} castShadow receiveShadow>
                <boxGeometry args={[width, 0.05, depth]} />
                <meshStandardMaterial
                    color={isSelected ? '#3b82f6' : isAccessible ? '#22c55e' : '#f59e0b'}
                    emissive={isSelected ? '#1d4ed8' : '#000000'}
                    emissiveIntensity={isSelected ? 0.2 : 0}
                />
            </mesh>

            {/* Counter base/cabinet */}
            <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[width, height - 0.05, depth - 0.1]} />
                <meshStandardMaterial
                    color={isSelected ? '#2563eb' : '#374151'}
                />
            </mesh>
        </group>
    );
}
