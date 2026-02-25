/**
 * Pillar Component
 * ================
 * Cylindrical structural column — key pathway obstruction detector.
 * Uses width as diameter.
 *
 * Default: 0.4 × 3.0 × 0.4m (cylinder r=0.2, h=3.0)
 */

import type { Element } from '../../types';

interface PillarProps {
    element: Element;
    isSelected: boolean;
}

export function Pillar({ element, isSelected }: PillarProps) {
    const { width, height } = element.dimensions;
    const radius = width / 2;
    const baseColor = isSelected ? '#3b82f6' : '#9ca3af';

    return (
        <group>
            {/* Main column */}
            <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[radius, radius, height, 16]} />
                <meshStandardMaterial
                    color={baseColor}
                    emissive={isSelected ? '#1d4ed8' : '#000000'}
                    emissiveIntensity={isSelected ? 0.15 : 0}
                    roughness={0.4}
                />
            </mesh>

            {/* Base cap */}
            <mesh position={[0, 0.02, 0]} castShadow>
                <cylinderGeometry args={[radius * 1.15, radius * 1.15, 0.04, 16]} />
                <meshStandardMaterial color={isSelected ? '#2563eb' : '#6b7280'} />
            </mesh>

            {/* Top cap */}
            <mesh position={[0, height - 0.02, 0]} castShadow>
                <cylinderGeometry args={[radius * 1.15, radius * 1.15, 0.04, 16]} />
                <meshStandardMaterial color={isSelected ? '#2563eb' : '#6b7280'} />
            </mesh>
        </group>
    );
}
