// Floor Plan Types

export type SpaceType = 'cafe' | 'classroom' | 'clinic' | 'office' | 'custom';

/** Element types for palette-placed furniture (3D drag-and-drop) */
export type ElementType =
    | 'wall' | 'door' | 'ramp' | 'stairs'
    | 'table' | 'chair' | 'counter'
    | 'sofa' | 'shelf' | 'bed'
    | 'pillar' | 'reception_desk' | 'elevator'
    | 'toilet' | 'sink'
    | 'vending_machine' | 'fire_extinguisher';

export interface Position {
    x: number;
    y: number;
    z: number;
}

export interface Rotation {
    x: number;
    y: number;
    z: number;
}

export interface Dimensions {
    width: number;
    height: number;
    depth: number;
}

export interface Element {
    id: string;
    type: ElementType;
    position: Position;
    rotation: Rotation;
    dimensions: Dimensions;
    properties: Record<string, unknown>;
}

// ─── Blueprint Drawing Types (point-based wall system) ─────────────

/** Corner point shared between walls */
export interface BlueprintPoint {
    id: string;
    x: number; // pixels (PIXELS_PER_METER = 20)
    y: number;
}

/** Wall connecting two corner points */
export interface BlueprintWall {
    id: string;
    startPointId: string;
    endPointId: string;
    thickness: number; // pixels
    height: number;    // meters
    texture: string;   // texture ID (e.g. 'default', 'brick')
}

/** Door attached to a wall at an offset from startPoint */
export interface BlueprintDoor {
    id: string;
    wallId: string;
    offset: number; // distance from startPoint in pixels
    width: number;  // pixels
    height: number; // meters
    /** Hinge side when looking along wall start → end. Default: 'left'. */
    hinge?: 'left' | 'right';
    /** Swing direction relative to wall. Default: 'in'. */
    swing?: 'in' | 'out';
}

/** Window attached to a wall at an offset from startPoint */
export interface BlueprintWindow {
    id: string;
    wallId: string;
    offset: number;    // distance from startPoint in pixels
    width: number;     // pixels
    height: number;    // meters
    elevation: number; // height from ground in meters
}

// ─── Floor Plan ────────────────────────────────────────────────────

export interface FloorPlan {
    id: string;
    userId: string;
    name: string;
    spaceType: SpaceType;
    createdAt: Date;
    updatedAt: Date;
    dimensions: {
        width: number;
        depth: number;
        height: number;
    };
    // Blueprint drawing data (point-based walls, doors, windows)
    points: BlueprintPoint[];
    walls: BlueprintWall[];
    doors: BlueprintDoor[];
    windows: BlueprintWindow[];
    // Palette-placed furniture elements
    elements: Element[];
    exits: string[];
}
