/**
 * Wall Component
 * ===============
 * 
 * WHAT: 3D wall segment rendered as a box
 * 
 * KEY PROPERTIES:
 * - dimensions.width: Length of wall
 * - dimensions.height: Height of wall (usually 2.5-3m)
 * - dimensions.depth: Thickness of wall (usually 0.1-0.2m)
 */

import { useRef } from 'react';
import type { Mesh } from 'three';
import type { Element } from '../../types';

interface WallProps {
    element: Element;
    isSelected: boolean;
}

export function Wall({ element, isSelected }: WallProps) {
    const meshRef = useRef<Mesh>(null);
    const { width, height, depth } = element.dimensions;

    return (
        <mesh
            ref={meshRef}
            position={[0, height / 2, 0]} // Center vertically
            castShadow
            receiveShadow
        >
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial
                color={isSelected ? '#3b82f6' : '#94a3b8'}
                emissive={isSelected ? '#1d4ed8' : '#000000'}
                emissiveIntensity={isSelected ? 0.2 : 0}
            />
        </mesh>
    );
}
