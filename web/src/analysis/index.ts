export { analyzeFloorPlan, computeScore } from './analyzeFloorPlan';
export { ALL_RULES } from './accessibilityRules';
export type { AccessibilityRule } from './accessibilityRules';
export { applyFixes, countFixableIssues } from './applyFixes';
export type { FixResult } from './applyFixes';
export {
    computeAABB,
    computeAllAABBs,
    findNarrowGaps,
    checkTurningRadius,
    measureDoorClearance,
    getElementsByType,
    hasElementOfType,
} from './spatialUtils';
export type { AABB, GapInfo } from './spatialUtils';
