/**
 * GLB Export Hook Tests (RED phase — TDD)
 * =========================================
 * Tests for the useExportGLB hook.
 * These tests should FAIL until we implement the hook.
 */

import { describe, it, expect } from 'vitest';
import { exportSceneToGLB, prepareSceneForExport } from '../../hooks/useExportGLB';

describe('GLB Export', () => {
    describe('prepareSceneForExport', () => {
        it('should be a function', () => {
            expect(typeof prepareSceneForExport).toBe('function');
        });
    });

    describe('exportSceneToGLB', () => {
        it('should be a function', () => {
            expect(typeof exportSceneToGLB).toBe('function');
        });
    });
});
