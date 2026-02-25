/**
 * ReceptionDesk Component
 * =======================
 * Reception counter with front panel and desk surface.
 * Important for counter height accessibility checks (≤86cm).
 *
 * Default: 2.0 × 1.1 × 0.7m
 */

import type { Element } from '../../types';

interface ReceptionDeskProps {
    element: Element;
    isSelected: boolean;
}

export function ReceptionDesk({ element, isSelected }: ReceptionDeskProps) {
    const { width, height, depth } = element.dimensions;
    const panelT = 0.04;
    const deskT = 0.05;
    const deskH = height * 0.7;
    const baseColor = isSelected ? '#3b82f6' : '#5c4033';
    const surfaceColor = isSelected ? '#60a5fa' : '#d4c5a9';

    return (
        <group>
            {/* Front panel (full height) */}
            <mesh position={[0, height / 2, depth / 2 - panelT / 2]} castShadow receiveShadow>
                <boxGeometry args={[width, height, panelT]} />
                <meshStandardMaterial
                    color={baseColor}
                    emissive={isSelected ? '#1d4ed8' : '#000000'}
                    emissiveIntensity={isSelected ? 0.15 : 0}
                />
            </mesh>

            {/* Counter surface (higher section) */}
            <mesh position={[0, height - deskT / 2, depth * 0.15]} castShadow>
                <boxGeometry args={[width, deskT, depth * 0.4]} />
                <meshStandardMaterial color={surfaceColor} />
            </mesh>

            {/* Desk surface (lower, accessible section) */}
            <mesh position={[0, deskH, -depth * 0.1]} castShadow>
                <boxGeometry args={[width * 0.4, deskT, depth * 0.6]} />
                <meshStandardMaterial color={surfaceColor} />
            </mesh>

            {/* Left side panel */}
            <mesh position={[-width / 2 + panelT / 2, height / 2, 0]} castShadow>
                <boxGeometry args={[panelT, height, depth]} />
                <meshStandardMaterial color={baseColor} />
            </mesh>

            {/* Right side panel */}
            <mesh position={[width / 2 - panelT / 2, height / 2, 0]} castShadow>
                <boxGeometry args={[panelT, height, depth]} />
                <meshStandardMaterial color={baseColor} />
            </mesh>
        </group>
    );
}
