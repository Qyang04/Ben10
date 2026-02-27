/**
 * Ramp Component
 * ===============
 * 
 * WHAT: 3D ramp for wheelchair/accessibility access
 * 
 * KEY PROPERTIES:
 * - dimensions.width: Ramp width  
 * - dimensions.height: Rise (vertical height)
 * - dimensions.depth: Run (horizontal length)
 * 
 * ACCESSIBILITY NOTE:
 * Slope must be ≤ 8.33% (1:12 ratio) for ADA compliance
 * slope = height / depth
 */

import type { Element } from '../../types';
import { isSlopeAccessible } from '../../utils/geometry';

interface RampProps {
    element: Element;
    isSelected: boolean;
}

export function Ramp({ element, isSelected }: RampProps) {
    const { width, height, depth } = element.dimensions;

    // Calculate if ramp slope is accessible (≤ 8.33% for ADA)
    const isAccessible = isSlopeAccessible(height, depth);

    return (
        <group>
            {/* Ramp surface - simplified as a box for now */}
            <mesh
                // Center the ramp geometry around the element's origin so
                // the pivot/selection ring are at the ramp's visual center.
                position={[0, height / 2, 0]}
                rotation={[Math.atan2(height, depth), 0, 0]}
                castShadow
                receiveShadow
            >
                <boxGeometry args={[width, 0.05, Math.sqrt(height * height + depth * depth)]} />
                <meshStandardMaterial
                    color={isSelected ? '#3b82f6' : isAccessible ? '#22c55e' : '#f59e0b'}
                    emissive={isSelected ? '#1d4ed8' : '#000000'}
                    emissiveIntensity={isSelected ? 0.2 : 0}
                />
            </mesh>

            {/* Slope indicator text would go here in future */}
        </group>
    );
}
