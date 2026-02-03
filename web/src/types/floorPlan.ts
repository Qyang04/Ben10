// Floor Plan Types

export type SpaceType = 'cafe' | 'classroom' | 'clinic' | 'office' | 'custom';

export type ElementType = 'wall' | 'door' | 'ramp' | 'stairs' | 'table' | 'chair' | 'counter';

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
    elements: Element[];
    exits: string[];
}
