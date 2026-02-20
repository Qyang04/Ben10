/**
 * Dimension Handles Tests (RED phase — TDD)
 * ==========================================
 * Tests for dimension formatting, snap logic, and axis config.
 * These tests should FAIL until we implement the module.
 */

import { describe, it, expect } from 'vitest';
import {
    formatDimension,
    snapDimension,
    AXIS_CONFIG,
    type AxisConfig,
} from '../DimensionHandles';

describe('DimensionHandles — Utilities', () => {
    describe('formatDimension', () => {
        it('should format meters with 2 decimal places', () => {
            expect(formatDimension(2.5)).toBe('2.50m');
        });

        it('should format small values in centimeters', () => {
            expect(formatDimension(0.815)).toBe('81.5cm');
        });

        it('should format zero', () => {
            expect(formatDimension(0)).toBe('0cm');
        });

        it('should format values just under 1m as centimeters', () => {
            expect(formatDimension(0.99)).toBe('99.0cm');
        });

        it('should format values at 1m as meters', () => {
            expect(formatDimension(1)).toBe('1.00m');
        });
    });

    describe('snapDimension', () => {
        it('should snap to 0.1m increments', () => {
            expect(snapDimension(2.34)).toBe(2.3);
        });

        it('should round up at midpoint', () => {
            expect(snapDimension(2.35)).toBe(2.4);
        });

        it('should enforce a minimum dimension of 0.1m', () => {
            expect(snapDimension(0.02)).toBe(0.1);
        });

        it('should not allow negative dimensions', () => {
            expect(snapDimension(-1)).toBe(0.1);
        });
    });

    describe('AXIS_CONFIG', () => {
        it('should define width, height, and depth axes', () => {
            expect(AXIS_CONFIG).toHaveLength(3);
            const keys = AXIS_CONFIG.map((a: AxisConfig) => a.dimension);
            expect(keys).toContain('width');
            expect(keys).toContain('height');
            expect(keys).toContain('depth');
        });

        it('should have a color for each axis', () => {
            for (const axis of AXIS_CONFIG) {
                expect(axis.color).toBeDefined();
                expect(typeof axis.color).toBe('string');
            }
        });

        it('should have a label for each axis', () => {
            for (const axis of AXIS_CONFIG) {
                expect(axis.label).toBeDefined();
            }
        });

        it('should use red for width, green for height, blue for depth', () => {
            const width = AXIS_CONFIG.find((a: AxisConfig) => a.dimension === 'width');
            const height = AXIS_CONFIG.find((a: AxisConfig) => a.dimension === 'height');
            const depth = AXIS_CONFIG.find((a: AxisConfig) => a.dimension === 'depth');
            expect(width?.color).toBe('#ef4444');
            expect(height?.color).toBe('#22c55e');
            expect(depth?.color).toBe('#3b82f6');
        });
    });
});
