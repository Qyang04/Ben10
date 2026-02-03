// API Service Stub
// TODO: Phase 3 - Backend API calls for analysis

import type { FloorPlan, AnalysisResult } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

/**
 * Send floor plan for accessibility analysis
 * TODO: Implement in Phase 3
 */
export async function analyzeFloorPlan(_floorPlan: FloorPlan): Promise<AnalysisResult> {
    // TODO: POST to /analyze endpoint
    throw new Error('Not implemented - Phase 3');
}

/**
 * Get analysis result by ID
 * TODO: Implement in Phase 3
 */
export async function getAnalysisResult(_id: string): Promise<AnalysisResult> {
    // TODO: GET from /analyze/{id} endpoint
    throw new Error('Not implemented - Phase 3');
}

/**
 * Generate PDF report
 * TODO: Implement in Phase 7
 */
export async function generateReport(_floorPlanId: string): Promise<Blob> {
    // TODO: POST to /report endpoint
    throw new Error('Not implemented - Phase 7');
}

export { API_BASE };
