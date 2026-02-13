/**
 * Wall Textures Tests (RED phase — TDD)
 * =======================================
 * Tests for the wall texture system.
 * These tests should FAIL until we implement wall textures.
 */

import { describe, it, expect } from 'vitest';
import { WALL_TEXTURES, getWallTexture } from '../wallTextures';

describe('Wall Textures', () => {
    it('should export a WALL_TEXTURES array', () => {
        expect(Array.isArray(WALL_TEXTURES)).toBe(true);
        expect(WALL_TEXTURES.length).toBeGreaterThanOrEqual(4);
    });

    it('should have a default texture', () => {
        const defaultTex = WALL_TEXTURES.find((t) => t.id === 'default');
        expect(defaultTex).toBeDefined();
        expect(defaultTex?.name).toBe('Default');
    });

    it('should have required properties on each texture', () => {
        for (const tex of WALL_TEXTURES) {
            expect(tex.id).toBeDefined();
            expect(tex.name).toBeDefined();
            expect(tex.color).toBeDefined();
            expect(typeof tex.roughness).toBe('number');
            expect(tex.roughness).toBeGreaterThanOrEqual(0);
            expect(tex.roughness).toBeLessThanOrEqual(1);
        }
    });

    it('should have brick, concrete, wood, and glass textures', () => {
        const ids = WALL_TEXTURES.map((t) => t.id);
        expect(ids).toContain('brick');
        expect(ids).toContain('concrete');
        expect(ids).toContain('wood');
        expect(ids).toContain('glass');
    });

    it('getWallTexture should return texture by id', () => {
        const brick = getWallTexture('brick');
        expect(brick).toBeDefined();
        expect(brick?.id).toBe('brick');
    });

    it('getWallTexture should return default for unknown id', () => {
        const result = getWallTexture('nonexistent');
        expect(result).toBeDefined();
        expect(result?.id).toBe('default');
    });
});
