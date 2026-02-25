/**
 * VendingMachine Component
 * ========================
 * Standard vending machine box — hallway obstacle.
 * Important for pathway width analysis.
 *
 * Default: 0.8 × 1.8 × 0.7m
 */

import type { Element } from '../../types';

interface VendingMachineProps {
    element: Element;
    isSelected: boolean;
}

export function VendingMachine({ element, isSelected }: VendingMachineProps) {
    const { width, height, depth } = element.dimensions;
    const baseColor = isSelected ? '#3b82f6' : '#374151';
    const screenColor = isSelected ? '#60a5fa' : '#1e3a5f';
    const dispenserColor = isSelected ? '#93c5fd' : '#1f2937';

    return (
        <group>
            {/* Main body */}
            <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[width, height, depth]} />
                <meshStandardMaterial
                    color={baseColor}
                    emissive={isSelected ? '#1d4ed8' : '#000000'}
                    emissiveIntensity={isSelected ? 0.15 : 0}
                    roughness={0.6}
                    metalness={0.3}
                />
            </mesh>

            {/* Display / glass panel */}
            <mesh position={[0, height * 0.6, depth / 2 + 0.005]} castShadow>
                <boxGeometry args={[width * 0.85, height * 0.55, 0.01]} />
                <meshStandardMaterial
                    color={screenColor}
                    transparent
                    opacity={0.7}
                    roughness={0.1}
                    metalness={0.4}
                />
            </mesh>

            {/* Dispenser slot */}
            <mesh position={[0, height * 0.12, depth / 2 + 0.005]}>
                <boxGeometry args={[width * 0.6, height * 0.12, 0.01]} />
                <meshStandardMaterial color={dispenserColor} />
            </mesh>

            {/* Top accent strip */}
            <mesh position={[0, height * 0.95, depth / 2 + 0.005]}>
                <boxGeometry args={[width * 0.9, height * 0.04, 0.01]} />
                <meshStandardMaterial color={isSelected ? '#93c5fd' : '#ef4444'} />
            </mesh>
        </group>
    );
}
