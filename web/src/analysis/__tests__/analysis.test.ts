/**
 * Analysis Engine Tests
 * =====================
 *
 * Tests the accessibility rules and scoring logic.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { analyzeFloorPlan, computeScore } from '../analyzeFloorPlan';
import { ALL_RULES, resetIssueCounter } from '../accessibilityRules';
import type { FloorPlan, Element } from '../../types';

// ─── Helpers ────────────────────────────────────────────────────────

function makeFloorPlan(overrides: Partial<FloorPlan> = {}): FloorPlan {
    return {
        id: 'test-fp',
        userId: 'test-user',
        name: 'Test Floor Plan',
        spaceType: 'office',
        createdAt: new Date(),
        updatedAt: new Date(),
        dimensions: { width: 10, depth: 10, height: 3 },
        points: [],
        walls: [],
        doors: [],
        windows: [],
        elements: [],
        exits: [],
        ...overrides,
    };
}

function makeElement(type: Element['type'], overrides: Partial<Element> = {}): Element {
    return {
        id: crypto.randomUUID(),
        type,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: { width: 1, height: 1, depth: 1 },
        properties: {},
        ...overrides,
    };
}

function getRule(id: string) {
    return ALL_RULES.find((r) => r.id === id)!;
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('Analysis Engine', () => {
    beforeEach(() => {
        resetIssueCounter();
    });

    describe('computeScore', () => {
        it('returns 100 for no issues', () => {
            expect(computeScore([])).toBe(100);
        });

        it('deducts 15 per critical', () => {
            const issues = [
                { severity: 'critical' as const, id: '1', ruleId: 'r', category: 'doorways' as const, elementId: '', elementIds: [], title: '', description: '', standard: '', suggestion: null },
                { severity: 'critical' as const, id: '2', ruleId: 'r', category: 'doorways' as const, elementId: '', elementIds: [], title: '', description: '', standard: '', suggestion: null },
            ];
            expect(computeScore(issues)).toBe(70);
        });

        it('deducts 8 per warning', () => {
            const issues = [
                { severity: 'warning' as const, id: '1', ruleId: 'r', category: 'doorways' as const, elementId: '', elementIds: [], title: '', description: '', standard: '', suggestion: null },
            ];
            expect(computeScore(issues)).toBe(92);
        });

        it('deducts 3 per info', () => {
            const issues = [
                { severity: 'info' as const, id: '1', ruleId: 'r', category: 'furniture' as const, elementId: '', elementIds: [], title: '', description: '', standard: '', suggestion: null },
            ];
            expect(computeScore(issues)).toBe(97);
        });

        it('clamps to 0', () => {
            const issues = Array.from({ length: 10 }, (_, i) => ({
                severity: 'critical' as const, id: String(i), ruleId: 'r', category: 'doorways' as const,
                elementId: '', elementIds: [], title: '', description: '', standard: '', suggestion: null,
            }));
            expect(computeScore(issues)).toBe(0);
        });
    });

    describe('no-exit rule', () => {
        it('flags when no doors exist', () => {
            const fp = makeFloorPlan();
            const issues = getRule('no-exit').check(fp);
            expect(issues).toHaveLength(1);
            expect(issues[0].severity).toBe('critical');
        });

        it('passes when a palette door exists', () => {
            const fp = makeFloorPlan({
                elements: [makeElement('door', { dimensions: { width: 0.9, height: 2.1, depth: 0.1 } })],
            });
            const issues = getRule('no-exit').check(fp);
            expect(issues).toHaveLength(0);
        });

        it('passes when a blueprint door exists', () => {
            const fp = makeFloorPlan({
                doors: [{ id: 'bd1', wallId: 'w1', offset: 10, width: 18, height: 2.1 }],
            });
            const issues = getRule('no-exit').check(fp);
            expect(issues).toHaveLength(0);
        });
    });

    describe('door-width rule', () => {
        it('flags doors narrower than 0.81m', () => {
            const fp = makeFloorPlan({
                elements: [makeElement('door', { dimensions: { width: 0.7, height: 2.1, depth: 0.1 } })],
            });
            const issues = getRule('door-width').check(fp);
            expect(issues).toHaveLength(1);
            expect(issues[0].severity).toBe('critical');
            expect(issues[0].standard).toBe('ADA 404.2.3');
        });

        it('passes compliant doors', () => {
            const fp = makeFloorPlan({
                elements: [makeElement('door', { dimensions: { width: 0.9, height: 2.1, depth: 0.1 } })],
            });
            const issues = getRule('door-width').check(fp);
            expect(issues).toHaveLength(0);
        });
    });

    describe('ramp-slope rule', () => {
        it('flags ramps steeper than 1:12', () => {
            const fp = makeFloorPlan({
                elements: [makeElement('ramp', { dimensions: { width: 1.2, height: 0.5, depth: 2.0 } })],
            });
            const issues = getRule('ramp-slope').check(fp);
            expect(issues).toHaveLength(1);
            expect(issues[0].severity).toBe('critical');
            expect(issues[0].suggestion).toBeTruthy();
        });

        it('passes compliant ramps (1:12 or gentler)', () => {
            const fp = makeFloorPlan({
                elements: [makeElement('ramp', { dimensions: { width: 1.2, height: 0.3, depth: 3.6 } })],
            });
            const issues = getRule('ramp-slope').check(fp);
            expect(issues).toHaveLength(0);
        });
    });

    describe('ramp-width rule', () => {
        it('flags narrow ramps', () => {
            const fp = makeFloorPlan({
                elements: [makeElement('ramp', { dimensions: { width: 0.8, height: 0.3, depth: 3.6 } })],
            });
            const issues = getRule('ramp-width').check(fp);
            expect(issues).toHaveLength(1);
            expect(issues[0].severity).toBe('warning');
        });
    });

    describe('ramp-missing rule', () => {
        it('flags stairs without ramp or elevator', () => {
            const fp = makeFloorPlan({
                elements: [makeElement('stairs')],
            });
            const issues = getRule('ramp-missing').check(fp);
            expect(issues).toHaveLength(1);
            expect(issues[0].severity).toBe('warning');
        });

        it('passes when ramp exists', () => {
            const fp = makeFloorPlan({
                elements: [makeElement('stairs'), makeElement('ramp')],
            });
            const issues = getRule('ramp-missing').check(fp);
            expect(issues).toHaveLength(0);
        });

        it('passes when elevator exists', () => {
            const fp = makeFloorPlan({
                elements: [makeElement('stairs'), makeElement('elevator')],
            });
            const issues = getRule('ramp-missing').check(fp);
            expect(issues).toHaveLength(0);
        });
    });

    describe('counter-height rule', () => {
        it('flags high counters', () => {
            const fp = makeFloorPlan({
                elements: [makeElement('counter', { dimensions: { width: 2, height: 1.0, depth: 0.6 } })],
            });
            const issues = getRule('counter-height').check(fp);
            expect(issues).toHaveLength(1);
            expect(issues[0].severity).toBe('warning');
        });

        it('flags high reception desks', () => {
            const fp = makeFloorPlan({
                elements: [makeElement('reception_desk', { dimensions: { width: 2, height: 1.1, depth: 0.7 } })],
            });
            const issues = getRule('counter-height').check(fp);
            expect(issues).toHaveLength(1);
        });

        it('passes compliant counters', () => {
            const fp = makeFloorPlan({
                elements: [makeElement('counter', { dimensions: { width: 2, height: 0.85, depth: 0.6 } })],
            });
            const issues = getRule('counter-height').check(fp);
            expect(issues).toHaveLength(0);
        });
    });

    describe('elevator-size rule', () => {
        it('flags small elevators', () => {
            const fp = makeFloorPlan({
                elements: [makeElement('elevator', { dimensions: { width: 1.0, height: 2.4, depth: 1.0 } })],
            });
            const issues = getRule('elevator-size').check(fp);
            expect(issues).toHaveLength(1);
            expect(issues[0].severity).toBe('warning');
        });

        it('passes compliant elevators', () => {
            const fp = makeFloorPlan({
                elements: [makeElement('elevator', { dimensions: { width: 1.5, height: 2.4, depth: 1.5 } })],
            });
            const issues = getRule('elevator-size').check(fp);
            expect(issues).toHaveLength(0);
        });
    });

    describe('table-clearance rule', () => {
        it('flags low tables', () => {
            const fp = makeFloorPlan({
                elements: [makeElement('table', { dimensions: { width: 1.2, height: 0.6, depth: 0.8 } })],
            });
            const issues = getRule('table-clearance').check(fp);
            expect(issues).toHaveLength(1);
            expect(issues[0].severity).toBe('info');
        });

        it('passes standard-height tables', () => {
            const fp = makeFloorPlan({
                elements: [makeElement('table', { dimensions: { width: 1.2, height: 0.75, depth: 0.8 } })],
            });
            const issues = getRule('table-clearance').check(fp);
            expect(issues).toHaveLength(0);
        });
    });

    describe('pathway-width rule', () => {
        it('flags narrow gaps between elements', () => {
            // Two tables side by side with only 0.5m gap
            const fp = makeFloorPlan({
                elements: [
                    makeElement('table', {
                        id: 'table-a',
                        position: { x: 0, y: 0, z: 0 },
                        dimensions: { width: 1.0, height: 0.75, depth: 2.0 },
                    }),
                    makeElement('table', {
                        id: 'table-b',
                        position: { x: 1.5, y: 0, z: 0 },
                        dimensions: { width: 1.0, height: 0.75, depth: 2.0 },
                    }),
                ],
            });
            const issues = getRule('pathway-width').check(fp);
            // Gap = 1.5 - 0.5 - 0.5 = 0.5m, which is < 0.915m
            expect(issues).toHaveLength(1);
            expect(issues[0].severity).toBe('critical');
        });

        it('passes when elements are far apart', () => {
            const fp = makeFloorPlan({
                elements: [
                    makeElement('table', {
                        position: { x: 0, y: 0, z: 0 },
                        dimensions: { width: 1.0, height: 0.75, depth: 2.0 },
                    }),
                    makeElement('table', {
                        position: { x: 3, y: 0, z: 0 },
                        dimensions: { width: 1.0, height: 0.75, depth: 2.0 },
                    }),
                ],
            });
            const issues = getRule('pathway-width').check(fp);
            expect(issues).toHaveLength(0);
        });
    });

    describe('analyzeFloorPlan orchestrator', () => {
        it('returns AnalysisResult with correct shape', () => {
            const fp = makeFloorPlan();
            const result = analyzeFloorPlan(fp);

            expect(result.floorPlanId).toBe('test-fp');
            expect(typeof result.score).toBe('number');
            expect(result.score).toBeGreaterThanOrEqual(0);
            expect(result.score).toBeLessThanOrEqual(100);
            expect(Array.isArray(result.issues)).toBe(true);
            expect(result.timestamp).toBeInstanceOf(Date);
        });

        it('produces issues for non-compliant floor plan', () => {
            const fp = makeFloorPlan({
                elements: [
                    // Narrow door
                    makeElement('door', { dimensions: { width: 0.6, height: 2.1, depth: 0.1 } }),
                    // Steep ramp
                    makeElement('ramp', { dimensions: { width: 1.2, height: 1.0, depth: 3.0 } }),
                    // High counter
                    makeElement('counter', { dimensions: { width: 2, height: 1.0, depth: 0.6 } }),
                ],
            });
            const result = analyzeFloorPlan(fp);

            expect(result.issues.length).toBeGreaterThanOrEqual(3);
            expect(result.score).toBeLessThan(100);
        });

        it('deduplicates issues', () => {
            const fp = makeFloorPlan();
            const result = analyzeFloorPlan(fp);

            // Check no duplicate (ruleId + elementId) combos
            const keys = result.issues.map((i) => `${i.ruleId}:${i.elementId}`);
            expect(new Set(keys).size).toBe(keys.length);
        });

        it('perfect score for fully compliant floor plan', () => {
            const fp = makeFloorPlan({
                elements: [
                    makeElement('door', {
                        position: { x: -5, y: 0, z: 0 },
                        dimensions: { width: 0.9, height: 2.1, depth: 0.1 },
                    }),
                    makeElement('ramp', {
                        position: { x: 5, y: 0, z: 0 },
                        dimensions: { width: 1.2, height: 0.3, depth: 3.6 },
                    }),
                    makeElement('table', {
                        position: { x: 0, y: 0, z: 5 },
                        dimensions: { width: 1.2, height: 0.75, depth: 0.8 },
                    }),
                    makeElement('counter', {
                        position: { x: 0, y: 0, z: -5 },
                        dimensions: { width: 2, height: 0.85, depth: 0.6 },
                    }),
                ],
            });
            const result = analyzeFloorPlan(fp);
            expect(result.score).toBe(100);
        });
    });
});
