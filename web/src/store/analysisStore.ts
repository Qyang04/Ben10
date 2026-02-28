/**
 * Analysis Store
 * ===============
 *
 * Zustand store managing the analysis state:
 *   - Run analysis (synchronous, client-side)
 *   - Quick Fix: apply deterministic fixes from suggestions
 *   - AI Optimize: generate Gemini-powered layout, preview & apply
 *   - Gemini insights (async)
 */

import { create } from 'zustand';
import type { FloorPlan, AnalysisResult, Issue, AILayoutSuggestion } from '../types';
import { analyzeFloorPlan } from '../analysis';
import { getAccessibilityInsights, generateOptimizedLayout } from '../services/gemini';
import { applyFixes, countFixableIssues } from '../analysis/applyFixes';
import type { FixResult } from '../analysis/applyFixes';

/** Minimal store interface for applyFixes */
interface FloorPlanStoreActions {
    updateElement: (id: string, updates: Partial<import('../types').Element>) => void;
    addElement: (element: import('../types').Element) => void;
    removeElement: (id: string) => void;
    addBlueprintDoor: (door: import('../types').BlueprintDoor) => void;
}

interface AnalysisState {
    result: AnalysisResult | null;
    isAnalyzing: boolean;
    geminiInsights: string | null;
    isLoadingInsights: boolean;

    // Quick Fix
    lastFixResult: FixResult | null;
    fixableCount: number;

    // AI Layout Optimization
    aiLayout: AILayoutSuggestion | null;
    isGeneratingLayout: boolean;
    aiLayoutError: string | null;

    /** Run all accessibility rules against the floor plan */
    runAnalysis: (floorPlan: FloorPlan) => void;

    /** Fetch Gemini AI insights for the current issues */
    fetchGeminiInsights: (issues: Issue[]) => Promise<void>;

    /** Apply all deterministic fixes from issue suggestions */
    applyQuickFixes: (floorPlan: FloorPlan, store: FloorPlanStoreActions) => FixResult;

    /** Generate AI-optimized layout via Gemini */
    generateAILayout: (floorPlan: FloorPlan) => Promise<void>;

    /** Apply the AI-generated layout to the floor plan */
    applyAILayout: (store: { setFloorPlan: (fp: FloorPlan) => void }, currentFp: FloorPlan) => void;

    /** Dismiss the AI layout suggestion */
    dismissAILayout: () => void;

    /** Clear all analysis results */
    clear: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
    result: null,
    isAnalyzing: false,
    geminiInsights: null,
    isLoadingInsights: false,
    lastFixResult: null,
    fixableCount: 0,
    aiLayout: null,
    isGeneratingLayout: false,
    aiLayoutError: null,

    runAnalysis: (floorPlan) => {
        set({ isAnalyzing: true });
        const result = analyzeFloorPlan(floorPlan);
        set({
            result,
            isAnalyzing: false,
            fixableCount: countFixableIssues(result.issues),
            // Clear fix result on re-analysis, but KEEP AI layout so user can
            // navigate away and come back without losing the generated plan
            lastFixResult: null,
        });
    },

    fetchGeminiInsights: async (issues) => {
        set({ isLoadingInsights: true });
        try {
            const insights = await getAccessibilityInsights(issues);
            set((state) => ({
                isLoadingInsights: false,
                geminiInsights: insights,
                result: state.result
                    ? { ...state.result, geminiInsights: insights }
                    : null,
            }));
        } catch {
            set({
                isLoadingInsights: false,
                geminiInsights: 'Unable to load AI insights.',
            });
        }
    },

    applyQuickFixes: (floorPlan, store) => {
        const { result } = get();
        if (!result) return { applied: 0, skipped: 0, details: [], iterations: 0 };

        const fixResult = applyFixes(result.issues, floorPlan.elements, store);
        set({ lastFixResult: fixResult });
        return fixResult;
    },

    generateAILayout: async (floorPlan) => {
        const { result } = get();
        if (!result) return;

        set({ isGeneratingLayout: true, aiLayoutError: null });
        try {
            const layout = await generateOptimizedLayout(floorPlan, result.issues);
            if (layout) {
                set({ aiLayout: layout, isGeneratingLayout: false });
            } else {
                set({
                    isGeneratingLayout: false,
                    aiLayoutError: 'AI could not generate a valid layout. Please try again.',
                });
            }
        } catch {
            set({
                isGeneratingLayout: false,
                aiLayoutError: 'Failed to connect to AI service. Please check your API key.',
            });
        }
    },

    applyAILayout: (store, currentFp) => {
        const { aiLayout } = get();
        if (!aiLayout) return;

        // Merge AI positions/rotations onto original elements to preserve
        // heights, properties, and other fields AI may not have returned.
        const aiElementMap = new Map(aiLayout.elements.map((e) => [e.id, e]));
        const mergedElements = currentFp.elements.map((original) => {
            const ai = aiElementMap.get(original.id);
            if (!ai) return original; // AI didn't touch this element
            return {
                ...original,
                position: {
                    x: ai.position.x,
                    y: original.position.y, // PRESERVE original height
                    z: ai.position.z,
                },
                rotation: {
                    x: original.rotation.x, // preserve
                    y: ai.rotation?.y ?? original.rotation.y, // use AI rotation
                    z: original.rotation.z, // preserve
                },
                dimensions: {
                    width: ai.dimensions?.width ?? original.dimensions.width,
                    height: original.dimensions.height, // PRESERVE original height
                    depth: ai.dimensions?.depth ?? original.dimensions.depth,
                },
            };
        });

        const updatedFp: FloorPlan = {
            ...currentFp,
            elements: mergedElements,
            updatedAt: new Date(),
        };
        store.setFloorPlan(updatedFp);
        set({ aiLayout: null });
    },

    dismissAILayout: () => {
        set({ aiLayout: null, aiLayoutError: null });
    },

    clear: () => set({
        result: null,
        geminiInsights: null,
        isAnalyzing: false,
        isLoadingInsights: false,
        lastFixResult: null,
        fixableCount: 0,
        aiLayout: null,
        isGeneratingLayout: false,
        aiLayoutError: null,
    }),
}));
