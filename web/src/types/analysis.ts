// Analysis Types

export type Severity = 'critical' | 'warning' | 'info';

export type SuggestionAction = 'move' | 'resize' | 'remove' | 'add' | 'add-blueprint-door';

export type RuleCategory =
    | 'doorways'
    | 'pathways'
    | 'ramps'
    | 'counters'
    | 'bathroom'
    | 'elevators'
    | 'exits'
    | 'furniture';

export interface Suggestion {
    action: SuggestionAction;
    targetElementId: string;
    newValue: Record<string, unknown>;
    description: string;
}

export interface Issue {
    id: string;
    ruleId: string;
    severity: Severity;
    category: RuleCategory;
    /** Primary element this issue relates to */
    elementId: string;
    /** Additional elements involved (e.g. two elements forming a narrow gap) */
    elementIds: string[];
    title: string;
    description: string;
    /** ADA / ISO standard reference (e.g. "ADA 404.2.3") */
    standard: string;
    suggestion: Suggestion | null;
}

export interface AnalysisResult {
    floorPlanId: string;
    timestamp: Date;
    /** Accessibility score 0–100 */
    score: number;
    issues: Issue[];
    /** Gemini AI natural-language summary (loaded async) */
    geminiInsights: string;
}

/** Represents a single change the AI made to an element */
export interface AIChange {
    elementId: string;
    elementType: string;
    changeType: 'moved' | 'resized' | 'added' | 'removed';
    description: string;
}

/** Gemini-generated layout suggestion */
export interface AILayoutSuggestion {
    /** Modified elements array — complete replacement */
    elements: import('./floorPlan').Element[];
    /** Human-readable summary of what changed */
    summary: string;
    /** List of individual changes for preview */
    changes: AIChange[];
}
