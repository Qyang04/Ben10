/**
 * Apply Fixes
 * ============
 *
 * Deterministic fix applicator with iterative cascading protection.
 * Takes issues with suggestions and applies them to the floor plan
 * via store actions (undo-compatible).
 *
 * Safety:
 *   - Each fix uses updateElement/addElement which pushes to undo history
 *   - User can Ctrl+Z to revert any fix
 *   - Only applies fixes for issues that have a non-null suggestion
 *   - Validates element exists before modifying
 *   - Iterates up to 3 times to prevent cascading issues
 */

import type { Issue, Element, BlueprintDoor } from '../types';
import { findNarrowGaps } from './spatialUtils';

/** Result of applying fixes */
export interface FixResult {
    applied: number;
    skipped: number;
    details: string[];
    iterations: number;
}

/** Store interface — only the actions we need */
interface StoreActions {
    updateElement: (id: string, updates: Partial<Element>) => void;
    addElement: (element: Element) => void;
    removeElement: (id: string) => void;
    addBlueprintDoor: (door: BlueprintDoor) => void;
}

/** Default dimensions for auto-added elements */
const ADD_DEFAULTS: Record<string, Partial<Element>> = {
    ramp: {
        type: 'ramp',
        dimensions: { width: 1.2, height: 0.3, depth: 3.6 },
        position: { x: 2, y: 0, z: 0 },
    },
    door: {
        type: 'door',
        dimensions: { width: 0.9, height: 2.1, depth: 0.1 },
        position: { x: 0, y: 0, z: 0 },
    },
    elevator: {
        type: 'elevator',
        dimensions: { width: 1.5, height: 2.4, depth: 1.5 },
        position: { x: 3, y: 0, z: 0 },
    },
};

/** Min pathway width for cascading check */
const MIN_PATHWAY = 0.915;
/** Max iterations to prevent infinite loops */
const MAX_ITERATIONS = 3;

/**
 * Apply all fixable suggestions from analysis issues.
 * Runs iteratively to check for cascading issues (e.g., moving element A
 * creates a new narrow gap with element C).
 */
export function applyFixes(
    issues: Issue[],
    elements: Element[],
    store: StoreActions,
): FixResult {
    const result: FixResult = { applied: 0, skipped: 0, details: [], iterations: 1 };
    const elementIds = new Set(elements.map((e) => e.id));

    // Track all position/dimension changes so we can simulate the layout
    const positionOverrides = new Map<string, { x: number; y: number; z: number }>();
    const dimensionOverrides = new Map<string, { width: number; height: number; depth: number }>();

    for (const issue of issues) {
        if (!issue.suggestion) {
            result.skipped++;
            continue;
        }

        const { action, targetElementId, newValue } = issue.suggestion;

        switch (action) {
            case 'resize': {
                if (!targetElementId || !elementIds.has(targetElementId)) {
                    result.skipped++;
                    result.details.push(`Skip resize: element ${targetElementId} not found`);
                    break;
                }
                const el = elements.find((e) => e.id === targetElementId)!;
                const newDims = {
                    ...el.dimensions,
                    ...(newValue as Record<string, number>),
                };
                store.updateElement(targetElementId, { dimensions: newDims });
                dimensionOverrides.set(targetElementId, newDims);
                result.applied++;
                result.details.push(`Resized ${issue.title}`);
                break;
            }

            case 'move': {
                if (!targetElementId || !elementIds.has(targetElementId)) {
                    result.skipped++;
                    result.details.push(`Skip move: element ${targetElementId} not found`);
                    break;
                }
                const el = elements.find((e) => e.id === targetElementId)!;
                const newPos = {
                    ...el.position,
                    ...(newValue as Record<string, number>),
                };
                store.updateElement(targetElementId, { position: newPos });
                positionOverrides.set(targetElementId, newPos);
                result.applied++;
                result.details.push(`Moved ${issue.title}`);
                break;
            }

            case 'add': {
                const newVal = newValue as Record<string, unknown>;
                const type = String(newVal.type ?? '');
                const defaults = ADD_DEFAULTS[type];
                if (!defaults) {
                    result.skipped++;
                    result.details.push(`Skip add: unknown type "${type}"`);
                    break;
                }
                const suggestedPos = newVal.position as Record<string, number> | undefined;
                const newElement: Element = {
                    id: crypto.randomUUID(),
                    type: defaults.type as Element['type'],
                    position: {
                        x: suggestedPos?.x ?? (defaults.position?.x ?? 0),
                        y: suggestedPos?.y ?? (defaults.position?.y ?? 0),
                        z: suggestedPos?.z ?? (defaults.position?.z ?? 0),
                    },
                    rotation: { x: 0, y: 0, z: 0 },
                    dimensions: { width: 1, height: 1, depth: 1, ...defaults.dimensions },
                    properties: {},
                };
                store.addElement(newElement);
                result.applied++;
                result.details.push(`Added ${type}`);
                break;
            }

            case 'add-blueprint-door': {
                const doorData = newValue as Record<string, unknown>;
                const wallId = String(doorData.wallId ?? '');
                if (!wallId) {
                    result.skipped++;
                    result.details.push('Skip add-blueprint-door: no wallId');
                    break;
                }
                const bpDoor: BlueprintDoor = {
                    id: crypto.randomUUID(),
                    wallId,
                    offset: Number(doorData.offset ?? 0),
                    width: Number(doorData.width ?? 18),
                    height: Number(doorData.height ?? 2.1),
                };
                store.addBlueprintDoor(bpDoor);
                result.applied++;
                result.details.push('Added door on wall');
                break;
            }

            case 'remove': {
                if (!targetElementId || !elementIds.has(targetElementId)) {
                    result.skipped++;
                    break;
                }
                store.removeElement(targetElementId);
                result.applied++;
                result.details.push('Removed element');
                break;
            }

            default:
                result.skipped++;
        }
    }

    // ── Iterative cascading check ───────────────────────────────────
    // Build a virtual element list with the applied changes and check
    // if any new narrow gaps were created.
    if (result.applied > 0) {
        let virtualElements = elements.map((el) => ({
            ...el,
            position: positionOverrides.get(el.id) ?? el.position,
            dimensions: dimensionOverrides.get(el.id) ?? el.dimensions,
        }));

        for (let iter = 0; iter < MAX_ITERATIONS - 1; iter++) {
            const newGaps = findNarrowGaps(virtualElements, MIN_PATHWAY);
            if (newGaps.length === 0) break;

            result.iterations++;
            // Fix each new gap by nudging the smaller element further
            for (const gap of newGaps) {
                const elA = virtualElements.find((e) => e.id === gap.elementA);
                const elB = virtualElements.find((e) => e.id === gap.elementB);
                if (!elA || !elB) continue;

                const areaA = elA.dimensions.width * elA.dimensions.depth;
                const areaB = elB.dimensions.width * elB.dimensions.depth;
                const moveTarget = areaA <= areaB ? elA : elB;
                const otherEl = moveTarget === elA ? elB : elA;
                const shift = parseFloat((MIN_PATHWAY - gap.gap + 0.05).toFixed(2));

                if (gap.axis === 'x') {
                    const dir = moveTarget.position.x > otherEl.position.x ? 1 : -1;
                    const newX = parseFloat((moveTarget.position.x + dir * shift).toFixed(2));
                    store.updateElement(moveTarget.id, { position: { ...moveTarget.position, x: newX } });
                    moveTarget.position = { ...moveTarget.position, x: newX };
                } else {
                    const dir = moveTarget.position.z > otherEl.position.z ? 1 : -1;
                    const newZ = parseFloat((moveTarget.position.z + dir * shift).toFixed(2));
                    store.updateElement(moveTarget.id, { position: { ...moveTarget.position, z: newZ } });
                    moveTarget.position = { ...moveTarget.position, z: newZ };
                }
                result.applied++;
                result.details.push(`Cascade fix: moved ${moveTarget.type} to avoid new gap`);
            }

            // Rebuild virtual layout for next iteration
            virtualElements = virtualElements.map((el) => ({ ...el }));
        }
    }

    return result;
}

/**
 * Count how many issues have applicable suggestions.
 */
export function countFixableIssues(issues: Issue[]): number {
    return issues.filter((i) => i.suggestion !== null).length;
}
