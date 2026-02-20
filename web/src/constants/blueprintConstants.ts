/**
 * Blueprint Constants
 * ===================
 *
 * Grid, snapping, and default dimension values for the 2D blueprint editor.
 * All pixel values can be converted to meters via PIXELS_PER_METER.
 */

export const GRID_SIZE = 20;              // pixels per grid cell
export const PIXELS_PER_METER = 20;       // 1 meter = 20 pixels
export const SNAP_DISTANCE = 10;          // snap radius in pixels

// Wall defaults
export const DEFAULT_WALL_HEIGHT = 3;     // meters
export const DEFAULT_WALL_THICKNESS = 10; // pixels (~0.5m)

// Door defaults
export const DEFAULT_DOOR_WIDTH = 18;     // pixels (~0.9m)
export const DEFAULT_DOOR_HEIGHT = 2.1;   // meters

// Window defaults
export const DEFAULT_WINDOW_WIDTH = 20;   // pixels (1m)
export const DEFAULT_WINDOW_HEIGHT = 1.5; // meters
export const DEFAULT_WINDOW_ELEVATION = 1; // meters from floor

// Wall textures
export const WALL_TEXTURES = [
    { id: 'default', name: 'Default (Gray)', color: '#cbd5e1', roughness: 0.5 },
    { id: 'brick', name: 'Brick Red', color: '#8d4004', roughness: 0.9 },
    { id: 'concrete', name: 'Concrete', color: '#94a3b8', roughness: 0.8 },
    { id: 'drywall', name: 'White Drywall', color: '#f8fafc', roughness: 0.5 },
    { id: 'wood', name: 'Wood Panel', color: '#a05a2c', roughness: 0.6 },
    { id: 'dark', name: 'Dark Slate', color: '#334155', roughness: 0.7 },
] as const;

export type WallTextureId = (typeof WALL_TEXTURES)[number]['id'];
