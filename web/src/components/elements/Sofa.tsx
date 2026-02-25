/**
 * Sofa Component
 * ==============
 * 3-seat sofa with cushions, backrest, and armrests.
 * Key obstacle for clearance analysis in lounges and waiting areas.
 *
 * Default: 1.8 × 0.7 × 0.8m
 */

import type { Element } from '../../types';

interface SofaProps {
    element: Element;
    isSelected: boolean;
}

export function Sofa({ element, isSelected }: SofaProps) {
    const { width, height, depth } = element.dimensions;
    const armW = 0.08;
    const backT = 0.1;
    const cushionH = 0.12;
    const baseColor = isSelected ? '#3b82f6' : '#6b5b4f';
    const accentColor = isSelected ? '#2563eb' : '#5a4a3e';

    return (
        <group>
            {/* Base / frame */}
            <mesh position={[0, height * 0.3, 0]} castShadow receiveShadow>
                <boxGeometry args={[width, height * 0.6, depth]} />
                <meshStandardMaterial color={accentColor} />
            </mesh>

            {/* Seat cushion */}
            <mesh position={[0, height * 0.6 + cushionH / 2, backT / 2]} castShadow>
                <boxGeometry args={[width - armW * 2, cushionH, depth - backT]} />
                <meshStandardMaterial
                    color={baseColor}
                    emissive={isSelected ? '#1d4ed8' : '#000000'}
                    emissiveIntensity={isSelected ? 0.15 : 0}
                />
            </mesh>

            {/* Backrest */}
            <mesh position={[0, height * 0.6 + height * 0.35, -depth / 2 + backT / 2]} castShadow>
                <boxGeometry args={[width - armW * 2, height * 0.5, backT]} />
                <meshStandardMaterial color={baseColor} />
            </mesh>

            {/* Left armrest */}
            <mesh position={[-width / 2 + armW / 2, height * 0.6 + height * 0.15, 0]} castShadow>
                <boxGeometry args={[armW, height * 0.3, depth]} />
                <meshStandardMaterial color={accentColor} />
            </mesh>

            {/* Right armrest */}
            <mesh position={[width / 2 - armW / 2, height * 0.6 + height * 0.15, 0]} castShadow>
                <boxGeometry args={[armW, height * 0.3, depth]} />
                <meshStandardMaterial color={accentColor} />
            </mesh>
        </group>
    );
}
