/**
 * Accessibility Rules
 * ====================
 *
 * 12 rules checking ADA/ISO 21542 compliance:
 *
 * Doorways:   door-width, door-clearance
 * Pathways:   pathway-width
 * Ramps:      ramp-slope, ramp-width, ramp-missing
 * Counters:   counter-height, table-clearance
 * Bathroom:   toilet-clearance
 * Elevators:  elevator-size
 * Exits:      no-exit
 * Furniture:  (table-clearance covered above)
 */

import type { FloorPlan, Issue, RuleCategory, Severity, Suggestion, Element } from '../types';
import {
    findNarrowGaps,
    getElementsByType,
    hasElementOfType,
    checkTurningRadius,
    blueprintDoorWidthMeters,
    computeAABB,
} from './spatialUtils';

// ─── Rule Interface ─────────────────────────────────────────────────

export interface AccessibilityRule {
    id: string;
    name: string;
    category: RuleCategory;
    /** Run the rule check; returns zero or more issues */
    check: (fp: FloorPlan) => Issue[];
}

// ─── Helpers ────────────────────────────────────────────────────────

let issueCounter = 0;

function makeIssue(
    ruleId: string,
    severity: Severity,
    category: RuleCategory,
    elementId: string,
    elementIds: string[],
    title: string,
    description: string,
    standard: string,
    suggestion: Suggestion | null = null,
): Issue {
    issueCounter++;
    return {
        id: `${ruleId}-${issueCounter}`,
        ruleId,
        severity,
        category,
        elementId,
        elementIds,
        title,
        description,
        standard,
        suggestion,
    };
}

/** Reset counter between analysis runs */
export function resetIssueCounter(): void {
    issueCounter = 0;
}

// ─── ADA Thresholds ─────────────────────────────────────────────────

/** ADA 404.2.3 — min clear door width 32" (0.813m) */
const MIN_DOOR_WIDTH = 0.81;

/** ADA 403.5.1 — min accessible route width 36" (0.915m) */
const MIN_PATHWAY_WIDTH = 0.915;

/** ADA 405.2 — max ramp slope 1:12 (rise/run) */
const MAX_RAMP_SLOPE = 1 / 12;

/** ADA 405.5 — min ramp width 36" (0.915m) */
const MIN_RAMP_WIDTH = 0.915;

/** ADA 904.4 — max service counter height 34" (0.865m) */
const MAX_COUNTER_HEIGHT = 0.865;

/** ADA 604.3 — min turning radius for wheelchair 60" (1.524m) */
const MIN_TURNING_RADIUS = 1.5;

/** ADA 407.4.1 — min elevator car size 54"×54" (1.37m) */
const MIN_ELEVATOR_SIZE = 1.37;

/** ADA 306.3 — min knee clearance height 27" (0.685m → rounded to 0.69) */
const MIN_TABLE_KNEE_HEIGHT = 0.69;

// ─── Rules ──────────────────────────────────────────────────────────

const doorWidthRule: AccessibilityRule = {
    id: 'door-width',
    name: 'Door Width',
    category: 'doorways',
    check(fp) {
        const issues: Issue[] = [];

        // Check palette-placed doors
        for (const el of getElementsByType(fp, 'door')) {
            if (el.dimensions.width < MIN_DOOR_WIDTH) {
                issues.push(makeIssue(
                    this.id, 'critical', this.category,
                    el.id, [el.id],
                    'Door too narrow',
                    `Door width is ${el.dimensions.width.toFixed(2)}m — must be ≥${MIN_DOOR_WIDTH}m (32") for wheelchair access.`,
                    'ADA 404.2.3',
                    { action: 'resize', targetElementId: el.id, newValue: { width: MIN_DOOR_WIDTH }, description: `Widen door to ${MIN_DOOR_WIDTH}m` },
                ));
            }
        }

        // Check blueprint doors
        for (const door of fp.doors) {
            const widthM = blueprintDoorWidthMeters(door);
            if (widthM < MIN_DOOR_WIDTH) {
                issues.push(makeIssue(
                    this.id, 'critical', this.category,
                    door.id, [door.id],
                    'Blueprint door too narrow',
                    `Blueprint door width is ${widthM.toFixed(2)}m — must be ≥${MIN_DOOR_WIDTH}m (32") for wheelchair access.`,
                    'ADA 404.2.3',
                ));
            }
        }

        return issues;
    },
};

const pathwayWidthRule: AccessibilityRule = {
    id: 'pathway-width',
    name: 'Pathway Width',
    category: 'pathways',
    check(fp) {
        const narrowGaps = findNarrowGaps(fp.elements, MIN_PATHWAY_WIDTH);
        return narrowGaps.map((gap) => {
            // Decide which element to move: pick the smaller one (by footprint area)
            const elA = fp.elements.find((e) => e.id === gap.elementA);
            const elB = fp.elements.find((e) => e.id === gap.elementB);
            let suggestion: Suggestion | null = null;

            if (elA && elB) {
                const areaA = elA.dimensions.width * elA.dimensions.depth;
                const areaB = elB.dimensions.width * elB.dimensions.depth;
                const moveTarget = areaA <= areaB ? elA : elB;
                const shiftNeeded = parseFloat((MIN_PATHWAY_WIDTH - gap.gap + 0.05).toFixed(2));

                // Move along the gap axis
                if (gap.axis === 'x') {
                    // Move smaller element further in the x direction (away from the other)
                    const otherEl = moveTarget === elA ? elB : elA;
                    const direction = moveTarget.position.x > otherEl.position.x ? 1 : -1;
                    suggestion = {
                        action: 'move',
                        targetElementId: moveTarget.id,
                        newValue: { x: parseFloat((moveTarget.position.x + direction * shiftNeeded).toFixed(2)) },
                        description: `Move ${moveTarget.type} ${shiftNeeded}m to create wheelchair clearance`,
                    };
                } else {
                    const otherEl = moveTarget === elA ? elB : elA;
                    const direction = moveTarget.position.z > otherEl.position.z ? 1 : -1;
                    suggestion = {
                        action: 'move',
                        targetElementId: moveTarget.id,
                        newValue: { z: parseFloat((moveTarget.position.z + direction * shiftNeeded).toFixed(2)) },
                        description: `Move ${moveTarget.type} ${shiftNeeded}m to create wheelchair clearance`,
                    };
                }
            }

            return makeIssue(
                this.id, 'critical', this.category,
                gap.elementA, [gap.elementA, gap.elementB],
                'Pathway too narrow',
                `Gap between elements is ${gap.gap.toFixed(2)}m — must be ≥${MIN_PATHWAY_WIDTH}m (36") for wheelchair passage.`,
                'ADA 403.5.1',
                suggestion,
            );
        });
    },
};

const rampSlopeRule: AccessibilityRule = {
    id: 'ramp-slope',
    name: 'Ramp Slope',
    category: 'ramps',
    check(fp) {
        const issues: Issue[] = [];
        for (const el of getElementsByType(fp, 'ramp')) {
            const slope = el.dimensions.height / el.dimensions.depth;
            if (slope > MAX_RAMP_SLOPE) {
                const ratio = Math.round(1 / slope);
                const neededDepth = el.dimensions.height / MAX_RAMP_SLOPE;
                issues.push(makeIssue(
                    this.id, 'critical', this.category,
                    el.id, [el.id],
                    'Ramp too steep',
                    `Ramp slope is 1:${ratio} — must be ≤1:12. Current rise ${el.dimensions.height.toFixed(2)}m over ${el.dimensions.depth.toFixed(2)}m run.`,
                    'ADA 405.2',
                    { action: 'resize', targetElementId: el.id, newValue: { depth: parseFloat(neededDepth.toFixed(2)) }, description: `Extend ramp to ${neededDepth.toFixed(2)}m depth for 1:12 slope` },
                ));
            }
        }
        return issues;
    },
};

const rampWidthRule: AccessibilityRule = {
    id: 'ramp-width',
    name: 'Ramp Width',
    category: 'ramps',
    check(fp) {
        const issues: Issue[] = [];
        for (const el of getElementsByType(fp, 'ramp')) {
            if (el.dimensions.width < MIN_RAMP_WIDTH) {
                issues.push(makeIssue(
                    this.id, 'warning', this.category,
                    el.id, [el.id],
                    'Ramp too narrow',
                    `Ramp width is ${el.dimensions.width.toFixed(2)}m — should be ≥${MIN_RAMP_WIDTH}m (36").`,
                    'ADA 405.5',
                    { action: 'resize', targetElementId: el.id, newValue: { width: MIN_RAMP_WIDTH }, description: `Widen ramp to ${MIN_RAMP_WIDTH}m` },
                ));
            }
        }
        return issues;
    },
};

const rampMissingRule: AccessibilityRule = {
    id: 'ramp-missing',
    name: 'Ramp or Elevator Missing',
    category: 'ramps',
    check(fp) {
        const hasStairs = hasElementOfType(fp, 'stairs');
        const hasRamp = hasElementOfType(fp, 'ramp');
        const hasElevator = hasElementOfType(fp, 'elevator');

        if (hasStairs && !hasRamp && !hasElevator) {
            const stairsEl = getElementsByType(fp, 'stairs')[0];
            // Place ramp adjacent to stairs (offset 2m in x)
            return [makeIssue(
                this.id, 'warning', this.category,
                stairsEl.id, [stairsEl.id],
                'Stairs without ramp or elevator',
                'Floor plan has stairs but no ramp or elevator — wheelchair users cannot access other levels.',
                'ADA 206.2',
                {
                    action: 'add', targetElementId: '',
                    newValue: {
                        type: 'ramp',
                        position: {
                            x: parseFloat((stairsEl.position.x + stairsEl.dimensions.width / 2 + 1.5).toFixed(2)),
                            z: stairsEl.position.z,
                        },
                    },
                    description: 'Add a ramp adjacent to stairs for wheelchair access',
                },
            )];
        }
        return [];
    },
};

const counterHeightRule: AccessibilityRule = {
    id: 'counter-height',
    name: 'Counter Height',
    category: 'counters',
    check(fp) {
        const issues: Issue[] = [];
        const counterTypes: Array<'counter' | 'reception_desk'> = ['counter', 'reception_desk'];
        for (const type of counterTypes) {
            for (const el of getElementsByType(fp, type)) {
                if (el.dimensions.height > MAX_COUNTER_HEIGHT) {
                    issues.push(makeIssue(
                        this.id, 'warning', this.category,
                        el.id, [el.id],
                        'Counter too high',
                        `${type === 'reception_desk' ? 'Reception desk' : 'Counter'} height is ${el.dimensions.height.toFixed(2)}m — should be ≤${MAX_COUNTER_HEIGHT}m (34") for wheelchair users.`,
                        'ADA 904.4',
                        { action: 'resize', targetElementId: el.id, newValue: { height: MAX_COUNTER_HEIGHT }, description: `Lower to ${MAX_COUNTER_HEIGHT}m` },
                    ));
                }
            }
        }
        return issues;
    },
};

const toiletClearanceRule: AccessibilityRule = {
    id: 'toilet-clearance',
    name: 'Toilet Turning Clearance',
    category: 'bathroom',
    check(fp) {
        const issues: Issue[] = [];
        const radius = MIN_TURNING_RADIUS / 2;
        for (const el of getElementsByType(fp, 'toilet')) {
            const intruders = checkTurningRadius(
                el.position.x, el.position.z,
                radius,
                fp.elements,
                el.id,
            );
            if (intruders.length > 0) {
                // Move the first intruding element outward from toilet center
                const firstIntruder = fp.elements.find((e) => e.id === intruders[0]);
                let suggestion: Suggestion | null = null;
                if (firstIntruder) {
                    const dx = firstIntruder.position.x - el.position.x;
                    const dz = firstIntruder.position.z - el.position.z;
                    const dist = Math.sqrt(dx * dx + dz * dz) || 0.01;
                    // Push element to just outside the turning radius + half its size
                    const intruderBox = computeAABB(firstIntruder);
                    const intruderHalf = Math.max(
                        (intruderBox.maxX - intruderBox.minX) / 2,
                        (intruderBox.maxZ - intruderBox.minZ) / 2,
                    );
                    const pushDist = radius + intruderHalf + 0.1;
                    suggestion = {
                        action: 'move',
                        targetElementId: firstIntruder.id,
                        newValue: {
                            x: parseFloat((el.position.x + (dx / dist) * pushDist).toFixed(2)),
                            z: parseFloat((el.position.z + (dz / dist) * pushDist).toFixed(2)),
                        },
                        description: `Move ${firstIntruder.type} away from toilet to clear turning radius`,
                    };
                }
                issues.push(makeIssue(
                    this.id, 'critical', this.category,
                    el.id, [el.id, ...intruders],
                    'Insufficient toilet clearance',
                    `Toilet needs ${MIN_TURNING_RADIUS}m (60") turning diameter — nearby elements block the turning circle.`,
                    'ADA 604.3',
                    suggestion,
                ));
            }
        }
        return issues;
    },
};

const elevatorSizeRule: AccessibilityRule = {
    id: 'elevator-size',
    name: 'Elevator Car Size',
    category: 'elevators',
    check(fp) {
        const issues: Issue[] = [];
        for (const el of getElementsByType(fp, 'elevator')) {
            const { width, depth } = el.dimensions;
            if (width < MIN_ELEVATOR_SIZE || depth < MIN_ELEVATOR_SIZE) {
                issues.push(makeIssue(
                    this.id, 'warning', this.category,
                    el.id, [el.id],
                    'Elevator too small',
                    `Elevator car is ${width.toFixed(2)}×${depth.toFixed(2)}m — should be ≥${MIN_ELEVATOR_SIZE}×${MIN_ELEVATOR_SIZE}m (54"×54").`,
                    'ADA 407.4.1',
                    { action: 'resize', targetElementId: el.id, newValue: { width: MIN_ELEVATOR_SIZE, depth: MIN_ELEVATOR_SIZE }, description: `Enlarge to ${MIN_ELEVATOR_SIZE}×${MIN_ELEVATOR_SIZE}m` },
                ));
            }
        }
        return issues;
    },
};

const noExitRule: AccessibilityRule = {
    id: 'no-exit',
    name: 'No Accessible Exit',
    category: 'exits',
    check(fp) {
        const hasPaletteDoor = hasElementOfType(fp, 'door');
        const hasBlueprintDoor = fp.doors.length > 0;
        if (!hasPaletteDoor && !hasBlueprintDoor) {
            // Prefer adding a blueprint door on an existing wall
            if (fp.walls.length > 0 && fp.points.length > 0) {
                // Find the longest wall to place the door on
                let longestWall = fp.walls[0];
                let longestLen = 0;
                for (const wall of fp.walls) {
                    const start = fp.points.find((p) => p.id === wall.startPointId);
                    const end = fp.points.find((p) => p.id === wall.endPointId);
                    if (start && end) {
                        const len = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
                        if (len > longestLen) {
                            longestLen = len;
                            longestWall = wall;
                        }
                    }
                }
                // Place door centered on the wall, 18px wide (≈0.9m at 20px/m)
                const doorWidthPx = 18;
                const offset = Math.max(0, (longestLen - doorWidthPx) / 2);
                return [makeIssue(
                    this.id, 'critical', this.category,
                    '', [],
                    'No exit/entrance detected',
                    'No door found in the floor plan — every accessible space must have at least one accessible entrance.',
                    'ADA 206.4',
                    {
                        action: 'add-blueprint-door', targetElementId: longestWall.id,
                        newValue: {
                            wallId: longestWall.id,
                            offset: Math.round(offset),
                            width: doorWidthPx,
                            height: 2.1,
                        },
                        description: 'Add a door on the longest wall for accessible entry/exit',
                    },
                )];
            }

            // Fallback: no walls drawn yet, add as palette element
            return [makeIssue(
                this.id, 'critical', this.category,
                '', [],
                'No exit/entrance detected',
                'No door or wall found — draw walls in 2D view first, or add a door element.',
                'ADA 206.4',
                {
                    action: 'add', targetElementId: '',
                    newValue: { type: 'door' },
                    description: 'Add a door element (or draw walls first for better placement)',
                },
            )];
        }
        return [];
    },
};

const tableClearanceRule: AccessibilityRule = {
    id: 'table-clearance',
    name: 'Table Knee Clearance',
    category: 'furniture',
    check(fp) {
        const issues: Issue[] = [];
        for (const el of getElementsByType(fp, 'table')) {
            // Knee clearance = underside of table top
            // Table height from element is the total table height (legs + surface)
            // The clearance is height - surface thickness (~0.05m)
            const kneeHeight = el.dimensions.height - 0.05;
            if (kneeHeight < MIN_TABLE_KNEE_HEIGHT) {
                issues.push(makeIssue(
                    this.id, 'info', this.category,
                    el.id, [el.id],
                    'Low table knee clearance',
                    `Table knee clearance is ${kneeHeight.toFixed(2)}m — should be ≥${MIN_TABLE_KNEE_HEIGHT}m (27") for wheelchair access underneath.`,
                    'ADA 306.3',
                    { action: 'resize', targetElementId: el.id, newValue: { height: MIN_TABLE_KNEE_HEIGHT + 0.05 }, description: `Raise table to ${(MIN_TABLE_KNEE_HEIGHT + 0.05).toFixed(2)}m` },
                ));
            }
        }
        return issues;
    },
};

const doorClearanceRule: AccessibilityRule = {
    id: 'door-clearance',
    name: 'Door Maneuvering Clearance',
    category: 'doorways',
    check(fp) {
        const issues: Issue[] = [];
        // Check palette-placed doors — need 0.46m (18") clear on latch side
        const MIN_SIDE_CLEARANCE = 0.46;
        for (const el of getElementsByType(fp, 'door')) {
            const clearanceRadius = el.dimensions.width / 2 + MIN_SIDE_CLEARANCE;
            const intruders = checkTurningRadius(
                el.position.x, el.position.z,
                clearanceRadius,
                fp.elements,
                el.id,
            );
            // Filter out walls (walls next to doors are normal)
            const obstacles = intruders.filter((id) => {
                const obstacle = fp.elements.find((e: Element) => e.id === id);
                return obstacle && obstacle.type !== 'wall';
            });
            if (obstacles.length > 0) {
                // Move the first obstructing element away from the door
                const firstObstacle = fp.elements.find((e) => e.id === obstacles[0]);
                let suggestion: Suggestion | null = null;
                if (firstObstacle) {
                    const dx = firstObstacle.position.x - el.position.x;
                    const dz = firstObstacle.position.z - el.position.z;
                    const dist = Math.sqrt(dx * dx + dz * dz) || 0.01;
                    const obstacleBox = computeAABB(firstObstacle);
                    const obstacleHalf = Math.max(
                        (obstacleBox.maxX - obstacleBox.minX) / 2,
                        (obstacleBox.maxZ - obstacleBox.minZ) / 2,
                    );
                    const pushDist = clearanceRadius + obstacleHalf + 0.05;
                    suggestion = {
                        action: 'move',
                        targetElementId: firstObstacle.id,
                        newValue: {
                            x: parseFloat((el.position.x + (dx / dist) * pushDist).toFixed(2)),
                            z: parseFloat((el.position.z + (dz / dist) * pushDist).toFixed(2)),
                        },
                        description: `Move ${firstObstacle.type} ${MIN_SIDE_CLEARANCE}m away from door`,
                    };
                }
                issues.push(makeIssue(
                    this.id, 'warning', this.category,
                    el.id, [el.id, ...obstacles],
                    'Door clearance obstructed',
                    `Elements within ${MIN_SIDE_CLEARANCE}m (18") of door — wheelchair users need clear maneuvering space.`,
                    'ADA 404.2.4',
                    suggestion,
                ));
            }
        }
        return issues;
    },
};

// ─── Exported Rule Registry ─────────────────────────────────────────

export const ALL_RULES: AccessibilityRule[] = [
    doorWidthRule,
    doorClearanceRule,
    pathwayWidthRule,
    rampSlopeRule,
    rampWidthRule,
    rampMissingRule,
    counterHeightRule,
    toiletClearanceRule,
    elevatorSizeRule,
    noExitRule,
    tableClearanceRule,
];
