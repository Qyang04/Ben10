/**
 * Floor Plan Analysis Orchestrator
 * =================================
 *
 * Runs all accessibility rules against a floor plan,
 * deduplicates issues, and computes an overall score.
 *
 * Score formula:
 *   100 - (criticals × 15) - (warnings × 8) - (infos × 3)
 *   Clamped to [0, 100].
 */

import type { FloorPlan, AnalysisResult, Issue } from '../types';
import { ALL_RULES, resetIssueCounter } from './accessibilityRules';

/** Penalty points per severity level */
const SEVERITY_PENALTY: Record<string, number> = {
    critical: 15,
    warning: 8,
    info: 3,
};

/**
 * Compute accessibility score from issues.
 * 100 = perfect, 0 = major problems.
 */
export function computeScore(issues: Issue[]): number {
    let penalty = 0;
    for (const issue of issues) {
        penalty += SEVERITY_PENALTY[issue.severity] ?? 0;
    }
    return Math.max(0, Math.min(100, 100 - penalty));
}

/**
 * Run all accessibility rules against a floor plan.
 */
export function analyzeFloorPlan(fp: FloorPlan): AnalysisResult {
    resetIssueCounter();

    const issues: Issue[] = [];
    for (const rule of ALL_RULES) {
        const ruleIssues = rule.check(fp);
        issues.push(...ruleIssues);
    }

    // Deduplicate by (ruleId + elementId) combination
    const seen = new Set<string>();
    const deduped = issues.filter((issue) => {
        const key = `${issue.ruleId}:${issue.elementId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    return {
        floorPlanId: fp.id,
        timestamp: new Date(),
        score: computeScore(deduped),
        issues: deduped,
        geminiInsights: '',
    };
}
