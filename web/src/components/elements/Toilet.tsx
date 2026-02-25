/**
 * Toilet Component
 * ================
 * Toilet bowl + tank + seat for bathroom accessibility analysis.
 * Critical for clearance checks around bathroom fixtures.
 *
 * Default: 0.4 × 0.4 × 0.7m
 */

import type { Element } from '../../types';

interface ToiletProps {
    element: Element;
    isSelected: boolean;
}

export function Toilet({ element, isSelected }: ToiletProps) {
    const { width, height, depth } = element.dimensions;
    const baseColor = isSelected ? '#3b82f6' : '#f0f0f0';
    const accentColor = isSelected ? '#2563eb' : '#d4d4d4';

    return (
        <group>
            {/* Bowl base */}
            <mesh position={[0, height * 0.3, depth * 0.1]} castShadow receiveShadow>
                <cylinderGeometry args={[width * 0.45, width * 0.4, height * 0.6, 12]} />
                <meshStandardMaterial
                    color={baseColor}
                    emissive={isSelected ? '#1d4ed8' : '#000000'}
                    emissiveIntensity={isSelected ? 0.15 : 0}
                    roughness={0.2}
                    metalness={0.1}
                />
            </mesh>

            {/* Seat rim */}
            <mesh position={[0, height * 0.6, depth * 0.1]} castShadow>
                <torusGeometry args={[width * 0.35, 0.03, 8, 16]} />
                <meshStandardMaterial color={accentColor} roughness={0.3} />
            </mesh>

            {/* Tank */}
            <mesh position={[0, height * 0.6, -depth * 0.35]} castShadow>
                <boxGeometry args={[width * 0.85, height * 0.65, depth * 0.25]} />
                <meshStandardMaterial color={baseColor} roughness={0.2} />
            </mesh>

            {/* Flush handle */}
            <mesh position={[width * 0.35, height * 0.85, -depth * 0.35]} castShadow>
                <boxGeometry args={[0.08, 0.03, 0.05]} />
                <meshStandardMaterial color={isSelected ? '#93c5fd' : '#c0c0c0'} metalness={0.7} />
            </mesh>
        </group>
    );
}
