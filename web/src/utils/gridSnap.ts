/**
 * Grid Snapping Utilities
 * ========================
 * 
 * WHAT THIS FILE DOES:
 * - Provides functions to snap positions to a grid
 * - Helps users align elements precisely
 * 
 * HOW IT WORKS:
 * - snapToGrid(value, gridSize) rounds to nearest grid point
 * - snapPosition(position, gridSize) snaps all 3 axes
 */

import type { Position } from '../types';

/**
 * Snap a single value to the nearest grid point
 * 
 * @param value - The value to snap
 * @param gridSize - Size of grid cells (default 0.5m)
 * @returns Snapped value
 * 
 * @example
 * snapToGrid(1.3, 0.5) // returns 1.5
 * snapToGrid(1.2, 0.5) // returns 1.0
 */
export function snapToGrid(value: number, gridSize: number = 0.5): number {
    return Math.round(value / gridSize) * gridSize;
}

/**
 * Snap a 3D position to the grid
 * 
 * @param position - The position to snap
 * @param gridSize - Size of grid cells (default 0.5m)
 * @returns New position snapped to grid
 */
export function snapPosition(position: Position, gridSize: number = 0.5): Position {
    return {
        x: snapToGrid(position.x, gridSize),
        y: snapToGrid(position.y, gridSize),
        z: snapToGrid(position.z, gridSize),
    };
}

/**
 * Check if a position is on the grid
 */
export function isOnGrid(position: Position, gridSize: number = 0.5): boolean {
    const snapped = snapPosition(position, gridSize);
    return (
        position.x === snapped.x &&
        position.y === snapped.y &&
        position.z === snapped.z
    );
}
