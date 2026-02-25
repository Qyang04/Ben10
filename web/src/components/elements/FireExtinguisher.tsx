/**
 * FireExtinguisher Component
 * ==========================
 * Wall-mounted fire extinguisher on bracket.
 * Small but relevant for clearance around safety equipment.
 *
 * Default: 0.2 × 0.5 × 0.15m
 */

import type { Element } from '../../types';

interface FireExtinguisherProps {
    element: Element;
    isSelected: boolean;
}

export function FireExtinguisher({ element, isSelected }: FireExtinguisherProps) {
    const { width, height, depth } = element.dimensions;
    const bodyR = width * 0.35;
    const bodyH = height * 0.7;
    const baseColor = isSelected ? '#3b82f6' : '#dc2626';
    const metalColor = isSelected ? '#60a5fa' : '#a3a3a3';

    return (
        <group>
            {/* Wall bracket */}
            <mesh position={[0, height * 0.5, -depth / 2 + 0.01]} castShadow>
                <boxGeometry args={[width * 0.5, height * 0.15, 0.02]} />
                <meshStandardMaterial color={metalColor} metalness={0.6} roughness={0.3} />
            </mesh>

            {/* Main cylinder body */}
            <mesh position={[0, height * 0.35, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[bodyR, bodyR, bodyH, 12]} />
                <meshStandardMaterial
                    color={baseColor}
                    emissive={isSelected ? '#1d4ed8' : '#7f1d1d'}
                    emissiveIntensity={isSelected ? 0.15 : 0.05}
                    roughness={0.4}
                />
            </mesh>

            {/* Bottom cap */}
            <mesh position={[0, height * 0.35 - bodyH / 2, 0]} castShadow>
                <cylinderGeometry args={[bodyR, bodyR * 0.8, 0.02, 12]} />
                <meshStandardMaterial color={baseColor} />
            </mesh>

            {/* Valve / head */}
            <mesh position={[0, height * 0.75, 0]} castShadow>
                <cylinderGeometry args={[bodyR * 0.5, bodyR * 0.7, height * 0.12, 8]} />
                <meshStandardMaterial color={metalColor} metalness={0.7} roughness={0.2} />
            </mesh>

            {/* Handle / lever */}
            <mesh position={[0, height * 0.85, bodyR * 0.3]} castShadow>
                <boxGeometry args={[0.02, 0.06, bodyR * 0.8]} />
                <meshStandardMaterial color={metalColor} metalness={0.6} />
            </mesh>

            {/* Nozzle / hose */}
            <mesh position={[bodyR * 0.6, height * 0.7, 0]} castShadow>
                <cylinderGeometry args={[0.01, 0.015, height * 0.3, 6]} />
                <meshStandardMaterial color={isSelected ? '#1e40af' : '#1a1a1a'} />
            </mesh>
        </group>
    );
}
