// Analysis Types

export type Severity = 'critical' | 'warning' | 'info';

export type SuggestionAction = 'move' | 'resize' | 'remove' | 'add';

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
    elementId: string;
    title: string;
    description: string;
    suggestion: Suggestion | null;
}

export interface Bottleneck {
    position: [number, number];
    width: number;
}

export interface PathResult {
    reachableZones: string[];
    unreachableZones: string[];
    pathPoints: [number, number, number][];
    bottlenecks: Bottleneck[];
}

export interface AnalysisResult {
    floorPlanId: string;
    timestamp: Date;
    score: number;
    issues: Issue[];
    wheelchairPath: PathResult;
    geminiInsights: string;
}
