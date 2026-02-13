/**
 * Door Component
 * ===============
 * 
 * WHAT: 3D door frame with opening
 * 
 * KEY PROPERTIES:
 * - dimensions.width: Door opening width (ADA requires ≥81.5cm)
 * - dimensions.height: Door height (usually 2.1m)
 * - dimensions.depth: Door frame thickness
 * 
 * ACCESSIBILITY NOTE:
 * Width < 81.5cm will be flagged as inaccessible for wheelchairs
 */

import { useRef } from 'react';
import type { Mesh } from 'three';
import type { Element } from '../../types';

interface DoorProps {
    element: Element;
    isSelected: boolean;
}

export function Door({ element, isSelected }: DoorProps) {
    const meshRef = useRef<Mesh>(null);
    const { width, height, depth } = element.dimensions;

    // Check if door is too narrow for wheelchair access
    const isAccessible = width >= 0.815; // 81.5cm ADA minimum

    return (
        <group>
            {/* Door frame */}
            <mesh
                ref={meshRef}
                position={[0, height / 2, 0]}
                castShadow
                receiveShadow
            >
                <boxGeometry args={[width, height, depth]} />
                <meshStandardMaterial
                    color={isSelected ? '#3b82f6' : isAccessible ? '#22c55e' : '#ef4444'}
                    emissive={isSelected ? '#1d4ed8' : '#000000'}
                    emissiveIntensity={isSelected ? 0.2 : 0}
                    transparent
                    opacity={0.7}
                />
            </mesh>

            {/* Door opening indicator line */}
            <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[width, depth * 2]} />
                <meshBasicMaterial color={isAccessible ? '#22c55e' : '#ef4444'} />
            </mesh>
        </group>
    );
}
