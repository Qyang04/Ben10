/**
 * Elevator Component
 * ==================
 * Elevator car outline with door opening indicator.
 * Key for multi-floor accessibility — requires specific clearance.
 *
 * Default: 1.5 × 2.4 × 1.5m
 */

import type { Element } from '../../types';

interface ElevatorProps {
    element: Element;
    isSelected: boolean;
}

export function Elevator({ element, isSelected }: ElevatorProps) {
    const { width, height, depth } = element.dimensions;
    const wallT = 0.05;
    const doorW = width * 0.7;
    const doorH = height * 0.85;
    const wallColor = isSelected ? '#3b82f6' : '#71717a';
    const doorColor = isSelected ? '#60a5fa' : '#a1a1aa';
    const floorColor = isSelected ? '#2563eb' : '#52525b';

    return (
        <group>
            {/* Floor */}
            <mesh position={[0, wallT / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[width, wallT, depth]} />
                <meshStandardMaterial color={floorColor} />
            </mesh>

            {/* Back wall */}
            <mesh position={[0, height / 2, -depth / 2 + wallT / 2]} castShadow>
                <boxGeometry args={[width, height, wallT]} />
                <meshStandardMaterial
                    color={wallColor}
                    emissive={isSelected ? '#1d4ed8' : '#000000'}
                    emissiveIntensity={isSelected ? 0.15 : 0}
                />
            </mesh>

            {/* Left wall */}
            <mesh position={[-width / 2 + wallT / 2, height / 2, 0]} castShadow>
                <boxGeometry args={[wallT, height, depth]} />
                <meshStandardMaterial color={wallColor} />
            </mesh>

            {/* Right wall */}
            <mesh position={[width / 2 - wallT / 2, height / 2, 0]} castShadow>
                <boxGeometry args={[wallT, height, depth]} />
                <meshStandardMaterial color={wallColor} />
            </mesh>

            {/* Door frame — left section above door */}
            <mesh position={[-(doorW / 2 + (width - doorW) / 4), height / 2, depth / 2 - wallT / 2]} castShadow>
                <boxGeometry args={[(width - doorW) / 2, height, wallT]} />
                <meshStandardMaterial color={wallColor} />
            </mesh>

            {/* Door frame — right section */}
            <mesh position={[(doorW / 2 + (width - doorW) / 4), height / 2, depth / 2 - wallT / 2]} castShadow>
                <boxGeometry args={[(width - doorW) / 2, height, wallT]} />
                <meshStandardMaterial color={wallColor} />
            </mesh>

            {/* Door frame — top (above door opening) */}
            <mesh position={[0, doorH + (height - doorH) / 2, depth / 2 - wallT / 2]} castShadow>
                <boxGeometry args={[doorW, height - doorH, wallT]} />
                <meshStandardMaterial color={wallColor} />
            </mesh>

            {/* Door panels (closed) */}
            <mesh position={[-doorW / 4, doorH / 2, depth / 2 - wallT / 2]} castShadow>
                <boxGeometry args={[doorW / 2 - 0.02, doorH, wallT * 0.5]} />
                <meshStandardMaterial color={doorColor} metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh position={[doorW / 4, doorH / 2, depth / 2 - wallT / 2]} castShadow>
                <boxGeometry args={[doorW / 2 - 0.02, doorH, wallT * 0.5]} />
                <meshStandardMaterial color={doorColor} metalness={0.6} roughness={0.3} />
            </mesh>
        </group>
    );
}
