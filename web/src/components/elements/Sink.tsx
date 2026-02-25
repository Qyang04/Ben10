/**
 * Sink Component
 * ==============
 * Wall-mounted or pedestal sink basin.
 * Important for bathroom accessibility (height, clearance).
 *
 * Default: 0.5 × 0.85 × 0.45m
 */

import type { Element } from '../../types';

interface SinkProps {
    element: Element;
    isSelected: boolean;
}

export function Sink({ element, isSelected }: SinkProps) {
    const { width, height, depth } = element.dimensions;
    const basinH = 0.08;
    const pedestalW = 0.12;
    const baseColor = isSelected ? '#3b82f6' : '#f0f0f0';
    const accentColor = isSelected ? '#2563eb' : '#c0c0c0';

    return (
        <group>
            {/* Pedestal / pipe column */}
            <mesh position={[0, height * 0.4, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[pedestalW / 2, pedestalW * 0.6, height * 0.8, 8]} />
                <meshStandardMaterial color={baseColor} roughness={0.2} />
            </mesh>

            {/* Basin top */}
            <mesh position={[0, height - basinH / 2, depth * 0.05]} castShadow>
                <boxGeometry args={[width, basinH, depth]} />
                <meshStandardMaterial
                    color={baseColor}
                    emissive={isSelected ? '#1d4ed8' : '#000000'}
                    emissiveIntensity={isSelected ? 0.15 : 0}
                    roughness={0.15}
                    metalness={0.1}
                />
            </mesh>

            {/* Basin bowl (indent visual) */}
            <mesh position={[0, height - 0.01, depth * 0.05]} castShadow>
                <cylinderGeometry args={[width * 0.35, width * 0.35, 0.04, 16]} />
                <meshStandardMaterial color={isSelected ? '#1e40af' : '#e0e0e0'} roughness={0.1} />
            </mesh>

            {/* Faucet */}
            <mesh position={[0, height + 0.08, -depth * 0.3]} castShadow>
                <cylinderGeometry args={[0.015, 0.015, 0.16, 8]} />
                <meshStandardMaterial color={accentColor} metalness={0.8} roughness={0.2} />
            </mesh>

            {/* Faucet spout (horizontal) */}
            <mesh position={[0, height + 0.15, -depth * 0.15]} rotation={[Math.PI / 4, 0, 0]} castShadow>
                <cylinderGeometry args={[0.012, 0.012, 0.12, 8]} />
                <meshStandardMaterial color={accentColor} metalness={0.8} roughness={0.2} />
            </mesh>
        </group>
    );
}
