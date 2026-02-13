/**
 * Wall Textures Configuration
 * ============================
 * 
 * Defines available wall materials as simple color + roughness combos.
 * No image/texture files needed — uses MeshStandardMaterial properties.
 */

export interface WallTexture {
    id: string;
    name: string;
    color: string;
    roughness: number;
    metalness?: number;
    opacity?: number;
}

export const WALL_TEXTURES: WallTexture[] = [
    { id: 'default', name: 'Default', color: '#94a3b8', roughness: 0.7 },
    { id: 'brick', name: 'Brick', color: '#b45a3c', roughness: 0.9 },
    { id: 'concrete', name: 'Concrete', color: '#9ca3af', roughness: 0.95 },
    { id: 'wood', name: 'Wood', color: '#a0825a', roughness: 0.8 },
    { id: 'glass', name: 'Glass', color: '#a5c8d8', roughness: 0.1, metalness: 0.3, opacity: 0.4 },
    { id: 'drywall', name: 'Drywall', color: '#e5e7eb', roughness: 0.85 },
];

/**
 * Get a wall texture by ID.
 * Falls back to 'default' if ID is not found.
 */
export function getWallTexture(id: string): WallTexture {
    return WALL_TEXTURES.find((t) => t.id === id) ?? WALL_TEXTURES[0];
}
