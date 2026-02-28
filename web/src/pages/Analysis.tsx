/**
 * Analysis Page
 * ==============
 *
 * Displays accessibility analysis results with two action sections:
 *   1. Quick Fix — deterministic auto-fix via rule suggestions
 *   2. AI Optimization — Gemini-powered layout redesign with preview
 */

import { useEffect, useMemo, useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFloorPlanStore } from '../store';
import { useAnalysisStore } from '../store/analysisStore';
import type { Issue, RuleCategory, Severity, AIChange } from '../types';
import { generateAccessibilityReport } from '../services/pdfReport';

// ─── Constants ──────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<Severity, { icon: string; color: string; bg: string; label: string }> = {
    critical: { icon: '🔴', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/40', label: 'Critical' },
    warning: { icon: '🟡', color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/40', label: 'Warning' },
    info: { icon: '🔵', color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/40', label: 'Info' },
};

const CATEGORY_LABELS: Record<RuleCategory, string> = {
    doorways: '🚪 Doorways',
    pathways: '🛤️ Pathways',
    ramps: '♿ Ramps & Elevators',
    counters: '🪵 Counters & Surfaces',
    bathroom: '🚿 Bathroom',
    elevators: '🛗 Elevators',
    exits: '🚨 Exits',
    furniture: '🪑 Furniture',
};

// ─── Score Badge ────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
    const color = score >= 80 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400';
    const ringColor = score >= 80 ? 'stroke-green-400' : score >= 50 ? 'stroke-yellow-400' : 'stroke-red-400';
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-32 h-32">
                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#334155" strokeWidth="8" />
                    <circle
                        cx="50" cy="50" r="45"
                        fill="none"
                        className={ringColor}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-3xl font-bold ${color}`}>{score}</span>
                </div>
            </div>
            <p className="text-sm text-slate-400 mt-2">Accessibility Score</p>
        </div>
    );
}

// ─── Severity Summary Bar ───────────────────────────────────────────

function SeveritySummary({ issues }: { issues: Issue[] }) {
    const counts = useMemo(() => {
        const c = { critical: 0, warning: 0, info: 0 };
        for (const issue of issues) { c[issue.severity]++; }
        return c;
    }, [issues]);

    return (
        <div className="flex gap-4">
            {(Object.entries(counts) as [Severity, number][]).map(([sev, count]) => (
                <div key={sev} className={`px-4 py-2 rounded-lg border ${SEVERITY_CONFIG[sev].bg} flex items-center gap-2`}>
                    <span>{SEVERITY_CONFIG[sev].icon}</span>
                    <span className={`font-bold ${SEVERITY_CONFIG[sev].color}`}>{count}</span>
                    <span className="text-slate-400 text-sm">{SEVERITY_CONFIG[sev].label}</span>
                </div>
            ))}
        </div>
    );
}

// ─── Quick Fix Panel ────────────────────────────────────────────────

function QuickFixPanel() {
    const floorPlan = useFloorPlanStore((s) => s.floorPlan);
    const updateElement = useFloorPlanStore((s) => s.updateElement);
    const addElement = useFloorPlanStore((s) => s.addElement);
    const removeElement = useFloorPlanStore((s) => s.removeElement);
    const addBlueprintDoor = useFloorPlanStore((s) => s.addBlueprintDoor);
    const fixableCount = useAnalysisStore((s) => s.fixableCount);
    const lastFixResult = useAnalysisStore((s) => s.lastFixResult);
    const applyQuickFixes = useAnalysisStore((s) => s.applyQuickFixes);
    const runAnalysis = useAnalysisStore((s) => s.runAnalysis);
    const [showDetails, setShowDetails] = useState(false);

    const handleQuickFix = useCallback(() => {
        if (!floorPlan) return;
        applyQuickFixes(floorPlan, { updateElement, addElement, removeElement, addBlueprintDoor });
        // Re-run analysis after fixes to update score
        setTimeout(() => {
            const updatedFp = useFloorPlanStore.getState().floorPlan;
            if (updatedFp) runAnalysis(updatedFp);
        }, 150);
    }, [floorPlan, applyQuickFixes, updateElement, addElement, removeElement, addBlueprintDoor, runAnalysis]);

    if (fixableCount === 0 && !lastFixResult) return null;

    return (
        <div className="bg-slate-800 border border-emerald-500/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                    🔧 Quick Fix
                </h3>
                {!lastFixResult && (
                    <button
                        onClick={handleQuickFix}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors"
                    >
                        Fix {fixableCount} Issue{fixableCount !== 1 ? 's' : ''}
                    </button>
                )}
            </div>

            {!lastFixResult && (
                <p className="text-slate-400 text-sm">
                    {fixableCount} issue{fixableCount !== 1 ? 's' : ''} can be auto-fixed
                    (resize doors, lower counters, extend ramps, etc.).
                    Changes are undo-able with Ctrl+Z in the editor.
                </p>
            )}

            {lastFixResult && (
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-emerald-400 text-lg">✅</span>
                        <span className="text-emerald-400 font-medium">
                            {lastFixResult.applied} fix{lastFixResult.applied !== 1 ? 'es' : ''} applied
                        </span>
                        {lastFixResult.skipped > 0 && (
                            <span className="text-slate-500 text-sm">
                                ({lastFixResult.skipped} skipped)
                            </span>
                        )}
                    </div>
                    {lastFixResult.details.length > 0 && (
                        <button
                            onClick={() => setShowDetails(!showDetails)}
                            className="text-xs text-slate-500 hover:text-slate-400 underline"
                        >
                            {showDetails ? 'Hide details' : 'Show details'}
                        </button>
                    )}
                    {showDetails && (
                        <ul className="mt-2 text-xs text-slate-400 space-y-1">
                            {lastFixResult.details.map((d, i) => (
                                <li key={i}>• {d}</li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── AI Change Item ─────────────────────────────────────────────────

function ChangeItem({ change }: { change: AIChange }) {
    const icons: Record<string, string> = {
        moved: '↔️',
        resized: '📐',
        added: '➕',
        removed: '🗑️',
    };
    return (
        <div className="flex items-center gap-3 py-2 border-b border-slate-700 last:border-0">
            <span>{icons[change.changeType] ?? '🔄'}</span>
            <div>
                <span className="text-slate-300 text-sm font-medium">{change.elementType}</span>
                <span className="text-slate-500 text-sm ml-2">({change.changeType})</span>
                <p className="text-slate-400 text-xs">{change.description}</p>
            </div>
        </div>
    );
}

// ─── AI Optimization Panel ──────────────────────────────────────────

function AIOptimizationPanel() {
    const floorPlan = useFloorPlanStore((s) => s.floorPlan);
    const setFloorPlan = useFloorPlanStore((s) => s.setFloorPlan);
    const aiLayout = useAnalysisStore((s) => s.aiLayout);
    const isGenerating = useAnalysisStore((s) => s.isGeneratingLayout);
    const error = useAnalysisStore((s) => s.aiLayoutError);
    const generateAILayout = useAnalysisStore((s) => s.generateAILayout);
    const applyAILayout = useAnalysisStore((s) => s.applyAILayout);
    const dismissAILayout = useAnalysisStore((s) => s.dismissAILayout);
    const runAnalysis = useAnalysisStore((s) => s.runAnalysis);
    const navigate = useNavigate();

    const handleGenerate = useCallback(() => {
        if (floorPlan) generateAILayout(floorPlan);
    }, [floorPlan, generateAILayout]);

    // Apply & go to editor
    const handleApplyAndGo = useCallback(() => {
        if (!floorPlan) return;
        applyAILayout({ setFloorPlan }, floorPlan);
        setTimeout(() => {
            const updatedFp = useFloorPlanStore.getState().floorPlan;
            if (updatedFp) {
                runAnalysis(updatedFp);
                navigate('/editor');
            }
        }, 100);
    }, [floorPlan, applyAILayout, setFloorPlan, runAnalysis, navigate]);

    // Apply & stay to see new score
    const handleApplyAndStay = useCallback(() => {
        if (!floorPlan) return;
        applyAILayout({ setFloorPlan }, floorPlan);
        setTimeout(() => {
            const updatedFp = useFloorPlanStore.getState().floorPlan;
            if (updatedFp) runAnalysis(updatedFp);
        }, 100);
    }, [floorPlan, applyAILayout, setFloorPlan, runAnalysis]);

    return (
        <div className="bg-slate-800 border border-purple-500/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                    ✨ AI Layout Optimization
                </h3>
                {!aiLayout && !isGenerating && (
                    <button
                        onClick={handleGenerate}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-colors"
                    >
                        🪄 Redesign Layout
                    </button>
                )}
            </div>

            {!aiLayout && !isGenerating && !error && (
                <p className="text-slate-400 text-sm">
                    AI will analyze your layout and reorganize elements into a more practical,
                    accessible arrangement. Already organized layouts get minimal changes.
                    You&apos;ll preview all changes before applying.
                </p>
            )}

            {isGenerating && (
                <div className="flex items-center gap-3 text-slate-400 py-6">
                    <div className="animate-spin w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full" />
                    <span className="text-sm">AI is designing an optimized layout...</span>
                </div>
            )}

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mt-2">
                    <p className="text-red-400 text-sm">{error}</p>
                    <button
                        onClick={handleGenerate}
                        className="mt-2 text-xs text-slate-400 hover:text-slate-300 underline"
                    >
                        Try again
                    </button>
                </div>
            )}

            {aiLayout && (
                <div className="space-y-4">
                    {/* Summary */}
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                        <p className="text-purple-300 text-sm leading-relaxed">{aiLayout.summary}</p>
                    </div>

                    {/* Changes list */}
                    {aiLayout.changes.length > 0 && (
                        <div>
                            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                                📋 Proposed Changes ({aiLayout.changes.length})
                            </h4>
                            <div className="bg-slate-900 rounded-lg p-3 max-h-56 overflow-y-auto">
                                {aiLayout.changes.map((change, i) => (
                                    <ChangeItem key={i} change={change} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={handleApplyAndGo}
                            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-colors"
                        >
                            ✅ Apply & Edit
                        </button>
                        <button
                            onClick={handleApplyAndStay}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
                        >
                            📊 Apply & View Score
                        </button>
                        <button
                            onClick={handleGenerate}
                            className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
                        >
                            🔄 Regenerate
                        </button>
                        <button
                            onClick={dismissAILayout}
                            className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors text-slate-400"
                        >
                            ❌ Dismiss
                        </button>
                    </div>
                    <p className="text-xs text-slate-500">
                        Applying replaces element positions. Walls/doors/windows stay unchanged. You can undo in the editor (Ctrl+Z).
                    </p>
                </div>
            )}
        </div>
    );
}

// ─── Issue Card ─────────────────────────────────────────────────────

function IssueCard({ issue }: { issue: Issue }) {
    const config = SEVERITY_CONFIG[issue.severity];
    return (
        <div className={`p-4 rounded-lg border ${config.bg} mb-3`}>
            <div className="flex items-start gap-3">
                <span className="text-lg">{config.icon}</span>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-white">{issue.title}</h4>
                        {issue.standard && (
                            <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300">
                                {issue.standard}
                            </span>
                        )}
                    </div>
                    <p className="text-slate-300 text-sm">{issue.description}</p>
                    {issue.suggestion && (
                        <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs text-slate-500">💡 Suggestion:</span>
                            <span className="text-xs text-emerald-400">{issue.suggestion.description}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Grouped Issues ─────────────────────────────────────────────────

function GroupedIssues({ issues }: { issues: Issue[] }) {
    const grouped = useMemo(() => {
        const groups = new Map<RuleCategory, Issue[]>();
        for (const issue of issues) {
            const list = groups.get(issue.category) || [];
            list.push(issue);
            groups.set(issue.category, list);
        }
        return groups;
    }, [issues]);

    if (issues.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-xl font-semibold text-green-400 mb-2">
                    No accessibility issues found!
                </h3>
                <p className="text-slate-400">
                    This floor plan meets all checked ADA accessibility standards.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {Array.from(grouped.entries()).map(([category, categoryIssues]) => (
                <div key={category}>
                    <h3 className="text-sm font-semibold text-slate-400 uppercase mb-3 tracking-wider">
                        {CATEGORY_LABELS[category] || category}
                        <span className="ml-2 text-slate-500">({categoryIssues.length})</span>
                    </h3>
                    {categoryIssues.map((issue) => (
                        <IssueCard key={issue.id} issue={issue} />
                    ))}
                </div>
            ))}
        </div>
    );
}

// ─── Gemini Insights Panel ──────────────────────────────────────────

function GeminiPanel() {
    const geminiInsights = useAnalysisStore((s) => s.geminiInsights);
    const isLoading = useAnalysisStore((s) => s.isLoadingInsights);
    const fetchInsights = useAnalysisStore((s) => s.fetchGeminiInsights);
    const issues = useAnalysisStore((s) => s.result?.issues ?? []);

    const handleFetch = useCallback(() => {
        fetchInsights(issues);
    }, [fetchInsights, issues]);

    return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                    💬 AI Insights (Gemini)
                </h3>
                {!geminiInsights && !isLoading && (
                    <button
                        onClick={handleFetch}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-medium transition-colors"
                    >
                        Generate Summary
                    </button>
                )}
            </div>

            {isLoading && (
                <div className="flex items-center gap-3 text-slate-400">
                    <div className="animate-spin w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full" />
                    <span className="text-sm">Generating insights...</span>
                </div>
            )}

            {geminiInsights && !isLoading && (
                <div className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                    {geminiInsights}
                </div>
            )}

            {!geminiInsights && !isLoading && (
                <p className="text-slate-500 text-sm">
                    Get an AI-powered summary of the accessibility issues.
                </p>
            )}
        </div>
    );
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function Analysis() {
    const floorPlan = useFloorPlanStore((s) => s.floorPlan);
    const result = useAnalysisStore((s) => s.result);
    const isAnalyzing = useAnalysisStore((s) => s.isAnalyzing);
    const runAnalysis = useAnalysisStore((s) => s.runAnalysis);
    const navigate = useNavigate();

    const handleExportPDF = useCallback(() => {
        if (!result) return;
        generateAccessibilityReport(result, floorPlan?.name ?? 'Floor Plan');
    }, [result, floorPlan?.name]);

    useEffect(() => {
        if (!floorPlan) return;
        const walls = floorPlan.walls ?? [];
        const elements = floorPlan.elements ?? [];
        if (walls.length < 3 || elements.length === 0) {
            navigate('/editor', { replace: true });
            return;
        }
        if (!result && !isAnalyzing) {
            runAnalysis(floorPlan);
        }
    }, [floorPlan, result, isAnalyzing, runAnalysis, navigate]);

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            {/* Header */}
            <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/" className="text-xl font-bold text-blue-400">AccessAI</Link>
                    <span className="text-slate-500">|</span>
                    <span className="text-slate-300">Analysis Results</span>
                </div>
                <div className="flex items-center gap-3">
                    {floorPlan && (
                        <button
                            onClick={() => runAnalysis(floorPlan)}
                            className="px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors text-sm"
                        >
                            🔄 Re-analyze
                        </button>
                    )}
                    {result && (
                        <button
                            onClick={handleExportPDF}
                            className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors text-sm font-medium"
                        >
                            📄 Export PDF
                        </button>
                    )}
                    <Link to="/editor" className="px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors">
                        Back to Editor
                    </Link>
                </div>
            </header>

            {/* Content */}
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {isAnalyzing && (
                    <div className="text-center py-16">
                        <div className="animate-spin w-10 h-10 border-3 border-blue-400 border-t-transparent rounded-full mx-auto mb-4" />
                        <p className="text-slate-400">Running accessibility analysis...</p>
                    </div>
                )}

                {result && !isAnalyzing && (
                    <div className="space-y-8">
                        {/* Score + Summary */}
                        <div className="flex items-start gap-8">
                            <ScoreBadge score={result.score} />
                            <div className="flex-1 space-y-4">
                                <h2 className="text-2xl font-bold text-white">
                                    {result.score >= 80 ? 'Good accessibility! ✅'
                                        : result.score >= 50 ? 'Needs improvement ⚠️'
                                            : 'Major issues found 🚨'}
                                </h2>
                                <SeveritySummary issues={result.issues} />
                                <p className="text-slate-400 text-sm">
                                    Analyzed {floorPlan?.elements.length ?? 0} elements
                                    and {floorPlan?.doors.length ?? 0} blueprint doors
                                    against 11 ADA accessibility rules.
                                </p>
                            </div>
                        </div>

                        {/* Section 1: Quick Fix */}
                        <QuickFixPanel />

                        {/* Issues list */}
                        <GroupedIssues issues={result.issues} />

                        {/* Gemini insights */}
                        {result.issues.length > 0 && <GeminiPanel />}

                        {/* Section 2: AI Optimization */}
                        {result.issues.length > 0 && <AIOptimizationPanel />}
                    </div>
                )}

                {!result && !isAnalyzing && (
                    <div className="text-center text-slate-500 py-16">
                        <div className="text-6xl mb-4">📊</div>
                        <p className="text-lg">No floor plan loaded</p>
                        <p className="text-sm mt-2">
                            Go to the{' '}
                            <Link to="/editor" className="text-blue-400 underline">Editor</Link>{' '}
                            to create a floor plan first.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
