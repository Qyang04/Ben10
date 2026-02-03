/**
 * Gemini AI Service
 * ==================
 * 
 * WHAT THIS FILE DOES:
 * - Initializes Google Gemini AI client
 * - Provides functions to get AI-powered accessibility insights
 * 
 * HOW IT WORKS:
 * 1. Creates Gemini client with API key
 * 2. Sends analysis data to Gemini with accessibility-focused prompts
 * 3. Returns natural language explanations of issues
 * 
 * USAGE:
 * import { getAccessibilityInsights } from '@/services/gemini';
 * const insights = await getAccessibilityInsights(issues);
 * 
 * SETUP REQUIRED:
 * 1. Get API key from https://aistudio.google.com/app/apikey
 * 2. Add VITE_GEMINI_API_KEY to .env.local
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Issue } from '../types';

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

// Use Gemini 1.5 Flash for fast responses
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

/**
 * System prompt that instructs Gemini how to analyze accessibility issues
 * This shapes Gemini's responses to be helpful and actionable
 */
const ACCESSIBILITY_SYSTEM_PROMPT = `You are an accessibility expert analyzing indoor spaces for wheelchair accessibility and safety compliance.

When given a list of accessibility issues, provide:
1. A brief summary of the overall accessibility status
2. Clear explanations of why each issue matters
3. Practical suggestions for fixing each issue
4. Priority order for addressing issues

Use simple, friendly language. Reference ADA and ISO standards when relevant.`;

/**
 * Get natural language insights about accessibility issues
 * 
 * @param issues - Array of detected accessibility issues
 * @returns Natural language summary and recommendations
 */
export async function getAccessibilityInsights(issues: Issue[]): Promise<string> {
    if (issues.length === 0) {
        return 'Great news! No accessibility issues were detected in this floor plan.';
    }

    const issueDescriptions = issues
        .map((issue, i) => `${i + 1}. [${issue.severity.toUpperCase()}] ${issue.title}: ${issue.description}`)
        .join('\n');

    const prompt = `${ACCESSIBILITY_SYSTEM_PROMPT}

Analyze these accessibility issues found in an indoor space:

${issueDescriptions}

Provide a helpful summary and recommendations.`;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error('Gemini API error:', error);
        return 'Unable to generate AI insights at this time. Please check your API key.';
    }
}

/**
 * Get AI explanation for a specific issue
 * 
 * @param issue - Single accessibility issue to explain
 * @returns Detailed explanation and fix suggestion
 */
export async function explainIssue(issue: Issue): Promise<string> {
    const prompt = `${ACCESSIBILITY_SYSTEM_PROMPT}

Explain this accessibility issue in detail:
- Issue: ${issue.title}
- Description: ${issue.description}
- Severity: ${issue.severity}

Provide:
1. Why this matters for people with disabilities
2. Relevant ADA/accessibility standards
3. Step-by-step fix recommendation`;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error('Gemini API error:', error);
        return 'Unable to generate explanation. Please try again.';
    }
}
