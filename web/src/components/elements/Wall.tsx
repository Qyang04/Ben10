/**
 * Wall Component
 * ===============
 * 
 * WHAT: 3D wall segment rendered as a box with texture support
 * 
 * KEY PROPERTIES:
 * - dimensions.width: Length of wall
 * - dimensions.height: Height of wall (usually 2.5-3m)
 * - dimensions.depth: Thickness of wall (usually 0.1-0.2m)
 * - properties.texture: Texture ID from wallTextures config
 */

import { useRef, useMemo } from 'react';
import type { Mesh } from 'three';
import type { Element } from '../../types';
import { getWallTexture } from './wallTextures';

interface WallProps {
    element: Element;
    isSelected: boolean;
}

export function Wall({ element, isSelected }: WallProps) {
    const meshRef = useRef<Mesh>(null);
    const { width, height, depth } = element.dimensions;

    // Get texture from properties (fallback to 'default')
    const texture = useMemo(
        () => getWallTexture((element.properties.texture as string) || 'default'),
        [element.properties.texture]
    );

    return (
        <mesh
            ref={meshRef}
            position={[0, height / 2, 0]} // Center vertically
            castShadow
            receiveShadow
        >
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial
                color={isSelected ? '#3b82f6' : texture.color}
                emissive={isSelected ? '#1d4ed8' : '#000000'}
                emissiveIntensity={isSelected ? 0.2 : 0}
                roughness={texture.roughness}
                metalness={texture.metalness ?? 0}
                transparent={texture.opacity !== undefined && texture.opacity < 1}
                opacity={texture.opacity ?? 1}
            />
        </mesh>
    );
}
