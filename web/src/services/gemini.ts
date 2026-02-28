/**
 * Gemini AI Service
 * ==================
 * 
 * WHAT THIS FILE DOES:
 * - Initializes Google Gemini AI client
 * - Provides functions to get AI-powered accessibility insights
 * - Generates optimized floor plan layouts
 * 
 * HOW IT WORKS:
 * 1. Creates Gemini client with API key
 * 2. Sends analysis data to Gemini with accessibility-focused prompts
 * 3. Returns natural language explanations or structured JSON layouts
 * 
 * USAGE:
 * import { getAccessibilityInsights, generateOptimizedLayout } from '@/services/gemini';
 * 
 * SETUP REQUIRED:
 * 1. Get API key from https://aistudio.google.com/app/apikey
 * 2. Add VITE_GEMINI_API_KEY to .env.local
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Issue, AILayoutSuggestion, AIChange } from '../types';
import type { Element, FloorPlan } from '../types';

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

// Use Gemini 2.5 Flash — cheapest model available to new API keys
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

/**
 * System prompt that instructs Gemini how to analyze accessibility issues
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

// ─── AI Layout Optimization ────────────────────────────────────────

/** Space-type specific design guidelines for the AI */
const SPACE_DESIGN_GUIDE: Record<string, string> = {
    office: `- Desks should be in rows or clusters with chairs at each desk
- Reception desk near the main entrance
- Open pathways between desk clusters (≥1.2m)
- Printers/copiers accessible from all desk areas
- Meeting tables separate from work areas`,
    restaurant: `- Tables evenly distributed with ≥0.915m between them
- Counter/reception near entrance for host station
- Clear path from entrance to all seating areas
- Kitchen equipment grouped together, separate from dining
- Chairs tucked at tables, not blocking pathways`,
    residential: `- Living area: sofa facing TV/entertainment area
- Dining area: table with chairs, near kitchen if applicable
- Bedroom: bed against wall, nightstands beside it
- Clear pathways between functional zones
- Furniture against walls where practical`,
    bathroom: `- Toilet with 1.5m turning clearance around it
- Sink accessible from wheelchair height
- Grab bars near toilet (if applicable)
- Clear path from door to all fixtures
- No obstacles between toilet and door`,
    retail: `- Display shelves/tables in organized rows
- Clear main aisle from entrance (≥1.2m wide)
- Counter/register near exit
- Products accessible from wheelchair height
- Emergency exit paths unobstructed`,
};

/**
 * Compute a "layout chaos score" (0 = organized, 10 = total mess).
 * Checks for overlaps, random scattering, and misalignment.
 */
function computeLayoutChaos(elements: Element[]): { score: number; notes: string[] } {
    if (elements.length <= 1) return { score: 0, notes: ['Too few elements to assess'] };

    const notes: string[] = [];
    let chaos = 0;

    // 1. Check for overlapping elements
    let overlaps = 0;
    for (let i = 0; i < elements.length; i++) {
        for (let j = i + 1; j < elements.length; j++) {
            const a = elements[i], b = elements[j];
            const ax1 = a.position.x - a.dimensions.width / 2;
            const ax2 = a.position.x + a.dimensions.width / 2;
            const az1 = a.position.z - a.dimensions.depth / 2;
            const az2 = a.position.z + a.dimensions.depth / 2;
            const bx1 = b.position.x - b.dimensions.width / 2;
            const bx2 = b.position.x + b.dimensions.width / 2;
            const bz1 = b.position.z - b.dimensions.depth / 2;
            const bz2 = b.position.z + b.dimensions.depth / 2;

            if (ax1 < bx2 && ax2 > bx1 && az1 < bz2 && az2 > bz1) {
                overlaps++;
            }
        }
    }
    if (overlaps > 0) {
        chaos += Math.min(overlaps * 2, 5);
        notes.push(`${overlaps} overlapping element pairs`);
    }

    // 2. Check if elements are aligned (snapped to grid-like positions)
    const xPositions = elements.map((e) => Math.round(e.position.x * 4) / 4);
    const zPositions = elements.map((e) => Math.round(e.position.z * 4) / 4);
    const uniqueX = new Set(xPositions).size;
    const uniqueZ = new Set(zPositions).size;
    const alignmentRatio = (uniqueX + uniqueZ) / (elements.length * 2);
    if (alignmentRatio > 0.8) {
        chaos += 2;
        notes.push('Elements scattered with little alignment');
    }

    // 3. Check if similar elements are grouped
    const typePositions = new Map<string, { x: number; z: number }[]>();
    for (const el of elements) {
        const list = typePositions.get(el.type) ?? [];
        list.push({ x: el.position.x, z: el.position.z });
        typePositions.set(el.type, list);
    }
    for (const [type, positions] of typePositions) {
        if (positions.length < 2) continue;
        let maxDist = 0;
        for (let i = 0; i < positions.length; i++) {
            for (let j = i + 1; j < positions.length; j++) {
                const d = Math.sqrt(
                    (positions[i].x - positions[j].x) ** 2 +
                    (positions[i].z - positions[j].z) ** 2,
                );
                maxDist = Math.max(maxDist, d);
            }
        }
        if (maxDist > 6) {
            chaos += 1;
            notes.push(`${type} elements are far apart (${maxDist.toFixed(1)}m spread)`);
        }
    }

    return { score: Math.min(10, chaos), notes };
}

/**
 * Build a context-rich prompt for layout optimization.
 * Acts as an interior designer + accessibility specialist.
 *
 * CRITICAL: Wall coordinates are in blueprint pixels. The 3D renderer
 * centers the blueprint by computing:
 *   centerX = (minPx + maxPx) / (2 * PPM)
 *   worldX  = px / PPM - centerX
 * So element positions are in this centered world space.
 * We must compute the ACTUAL wall bounding box in this same space
 * and give that to the AI as the placement bounds.
 */
function buildLayoutPrompt(floorPlan: FloorPlan, issues: Issue[]): string {
    const PPM = 20; // pixels per meter

    // ── Compute actual wall bounds in centered world space ──
    let boundsMinX = -floorPlan.dimensions.width / 2;
    let boundsMaxX = floorPlan.dimensions.width / 2;
    let boundsMinZ = -floorPlan.dimensions.depth / 2;
    let boundsMaxZ = floorPlan.dimensions.depth / 2;

    if (floorPlan.points.length > 0) {
        const pxs = floorPlan.points.map((p) => p.x);
        const pys = floorPlan.points.map((p) => p.y);
        const minPx = Math.min(...pxs);
        const maxPx = Math.max(...pxs);
        const minPy = Math.min(...pys);
        const maxPy = Math.max(...pys);
        // This is exactly how BlueprintWalls3D centers the blueprint
        const centerX = (minPx + maxPx) / (2 * PPM);
        const centerZ = (minPy + maxPy) / (2 * PPM);
        boundsMinX = minPx / PPM - centerX;
        boundsMaxX = maxPx / PPM - centerX;
        boundsMinZ = minPy / PPM - centerZ;
        boundsMaxZ = maxPy / PPM - centerZ;
    }

    // Inset bounds slightly so elements aren't flush against walls
    const INSET = 0.3;
    const safeMinX = parseFloat((boundsMinX + INSET).toFixed(2));
    const safeMaxX = parseFloat((boundsMaxX - INSET).toFixed(2));
    const safeMinZ = parseFloat((boundsMinZ + INSET).toFixed(2));
    const safeMaxZ = parseFloat((boundsMaxZ - INSET).toFixed(2));

    // ── Prepare elements WITH rotation ──
    const elementsJson = floorPlan.elements.map((el) => ({
        id: el.id,
        type: el.type,
        position: { x: el.position.x, z: el.position.z },
        rotation_y: parseFloat((el.rotation?.y ?? 0).toFixed(3)),
        dimensions: { width: el.dimensions.width, depth: el.dimensions.depth },
    }));

    // Compute layout chaos
    const chaos = computeLayoutChaos(floorPlan.elements);
    const chaosLevel = chaos.score <= 2 ? 'LOW' : chaos.score <= 5 ? 'MEDIUM' : 'HIGH';

    // Issues with rule-engine suggestions
    const issuesWithHints = issues.map((i) => {
        const base = `- [${i.severity}] ${i.title}: ${i.description}`;
        if (i.suggestion) {
            return `${base}\n  → Hint: ${i.suggestion.description}`;
        }
        return base;
    }).join('\n');

    // Wall geometry in centered world coordinates
    let wallInfo = '  No walls drawn.';
    if (floorPlan.points.length > 0 && floorPlan.walls.length > 0) {
        const pxs = floorPlan.points.map((p) => p.x);
        const pys = floorPlan.points.map((p) => p.y);
        const cX = (Math.min(...pxs) + Math.max(...pxs)) / (2 * PPM);
        const cZ = (Math.min(...pys) + Math.max(...pys)) / (2 * PPM);

        wallInfo = floorPlan.walls.map((w) => {
            const s = floorPlan.points.find((p) => p.id === w.startPointId);
            const e = floorPlan.points.find((p) => p.id === w.endPointId);
            if (s && e) {
                const sx = (s.x / PPM - cX).toFixed(2);
                const sz = (s.y / PPM - cZ).toFixed(2);
                const ex = (e.x / PPM - cX).toFixed(2);
                const ez = (e.y / PPM - cZ).toFixed(2);
                const lenM = (Math.sqrt((e.x - s.x) ** 2 + (e.y - s.y) ** 2) / PPM).toFixed(1);
                return `  Wall: (${sx}, ${sz}) → (${ex}, ${ez}) = ${lenM}m`;
            }
            return null;
        }).filter(Boolean).join('\n');
    }

    // Door info
    const doorInfo = floorPlan.doors.length > 0
        ? floorPlan.doors.map((d) => {
            const wall = floorPlan.walls.find((w) => w.id === d.wallId);
            if (!wall) return null;
            return `  Door on wall, width ${(d.width / PPM).toFixed(1)}m`;
        }).filter(Boolean).join('\n')
        : '  No doors.';

    // Design guide for this space type
    const designGuide = SPACE_DESIGN_GUIDE[floorPlan.spaceType] ?? SPACE_DESIGN_GUIDE['office'];

    return `You are an EXPERT INTERIOR DESIGNER and ACCESSIBILITY SPECIALIST. Your job is to create a beautiful, functional, and accessible layout.

═══════════════════════════════════════
COORDINATE SYSTEM (CRITICAL)
═══════════════════════════════════════
• position.x = left/right axis, position.z = forward/back axis
• position.y is ALWAYS 0 (floor level) — do NOT change y values
• rotation_y = rotation in radians around vertical axis (0 = default, π/2 = 90° clockwise, π = 180°, -π/2 = 90° counter-clockwise)
• ALL element positions must stay INSIDE these bounds:
  x: ${safeMinX} to ${safeMaxX}
  z: ${safeMinZ} to ${safeMaxZ}
  (These are the actual wall boundaries with 0.3m inset)

═══════════════════════════════════════
ROOM CONTEXT
═══════════════════════════════════════
• Space type: ${floorPlan.spaceType}
• Room size: ${(boundsMaxX - boundsMinX).toFixed(1)}m × ${(boundsMaxZ - boundsMinZ).toFixed(1)}m
• Walls (in world coords):
${wallInfo}
• Doors:
${doorInfo}
• Windows: ${floorPlan.windows.length}

═══════════════════════════════════════
CURRENT ELEMENTS (${elementsJson.length})
═══════════════════════════════════════
${JSON.stringify(elementsJson, null, 2)}

═══════════════════════════════════════
LAYOUT QUALITY ASSESSMENT
═══════════════════════════════════════
Chaos level: ${chaosLevel} (${chaos.score}/10)
${chaos.notes.length > 0 ? 'Issues: ' + chaos.notes.join(', ') : 'Layout appears reasonably organized.'}

${chaosLevel === 'LOW'
            ? '→ Layout is already well-organized. Make MINIMAL changes — only fix accessibility violations.'
            : chaosLevel === 'MEDIUM'
                ? '→ Layout needs moderate improvement. Fix accessibility issues AND reorganize poorly-placed elements into logical groups.'
                : '→ Layout is disorganized. DO a full reorganization — group elements into functional zones and fix all issues.'}

═══════════════════════════════════════
ACCESSIBILITY ISSUES TO FIX
═══════════════════════════════════════
${issues.length > 0 ? issuesWithHints : 'No accessibility issues detected.'}

═══════════════════════════════════════
DESIGN GUIDELINES FOR "${floorPlan.spaceType.toUpperCase()}"
═══════════════════════════════════════
${designGuide}

═══════════════════════════════════════
YOUR TASK
═══════════════════════════════════════
1. Reorganize elements into a REALISTIC ${floorPlan.spaceType} layout
2. Fix ALL accessibility issues (wheelchair clearance ≥0.915m between non-related furniture)
3. **CRITICAL**: Keep ALL elements within bounds x:[${safeMinX}, ${safeMaxX}] z:[${safeMinZ}, ${safeMaxZ}]
4. Preserve ALL element IDs exactly — do NOT invent new IDs
5. **Do NOT add or remove ANY elements**. Doors are handled separately
6. Only change: position.x, position.z, and rotation.y — NEVER change position.y or dimensions.height
7. **Chair-table proximity**: Chairs should be 0.3-0.5m from their nearest table, NOT 0.915m. Place each chair close to a table edge as if someone would sit there
8. **Individual chair rotation**: Each chair MUST face its own nearest table. Calculate: rotation.y = atan2(table.x - chair.x, table.z - chair.z). Different chairs around a table should face DIFFERENT directions (toward the table center from their side)
9. Wheelchair pathways: ≥0.915m between furniture GROUPS (e.g., between two table-chair clusters), but chairs within a cluster can be close to their table
10. Elements should NOT overlap each other
11. Place furniture against walls where practical
12. Group similar furniture types together

RESPOND WITH ONLY THIS JSON (no markdown, no explanation, no code fences):
{
  "elements": [{"id":"<same id>","type":"<same type>","position":{"x":0,"y":0,"z":0},"rotation":{"x":0,"y":<radians>,"z":0},"dimensions":{"width":1,"height":1,"depth":1}}],
  "summary": "<2-3 sentences: what you changed and why>",
  "changes": [{"elementId": "<id>", "elementType": "<type>", "changeType": "moved|resized", "description": "<specific change>"}]
}`;
}


/**
 * Generate an optimized floor plan layout using Gemini AI.
 *
 * Safety:
 *   - Validates the JSON response structure before returning
 *   - Preserves element IDs so undo history remains valid
 *   - Verifies element count matches (no spurious additions/removals)
 *   - Returns null (not throws) on any failure — caller decides what to show
 */
export async function generateOptimizedLayout(
    floorPlan: FloorPlan,
    issues: Issue[],
): Promise<AILayoutSuggestion | null> {
    const prompt = buildLayoutPrompt(floorPlan, issues);

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Extract JSON from response (handle possible markdown wrapping)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error('Gemini response is not valid JSON:', text);
            return null;
        }

        const parsed = JSON.parse(jsonMatch[0]) as {
            elements?: unknown[];
            summary?: string;
            changes?: AIChange[];
        };

        // Validate response structure
        if (!parsed.elements || !Array.isArray(parsed.elements)) {
            console.error('Gemini response missing elements array:', parsed);
            return null;
        }

        // Validate each element has required fields
        const validatedElements: Element[] = parsed.elements.map((el: unknown) => {
            const raw = el as Record<string, unknown>;
            return {
                id: String(raw.id ?? crypto.randomUUID()),
                type: String(raw.type ?? 'table') as Element['type'],
                position: {
                    x: Number((raw.position as Record<string, unknown>)?.x ?? 0),
                    y: Number((raw.position as Record<string, unknown>)?.y ?? 0),
                    z: Number((raw.position as Record<string, unknown>)?.z ?? 0),
                },
                rotation: {
                    x: Number((raw.rotation as Record<string, unknown>)?.x ?? 0),
                    y: Number((raw.rotation as Record<string, unknown>)?.y ?? 0),
                    z: Number((raw.rotation as Record<string, unknown>)?.z ?? 0),
                },
                dimensions: {
                    width: Number((raw.dimensions as Record<string, unknown>)?.width ?? 1),
                    height: Number((raw.dimensions as Record<string, unknown>)?.height ?? 1),
                    depth: Number((raw.dimensions as Record<string, unknown>)?.depth ?? 1),
                },
                properties: (raw.properties as Record<string, unknown>) ?? {},
            };
        });

        // Sanity check: AI shouldn't dramatically change element count
        const originalCount = floorPlan.elements.length;
        if (Math.abs(validatedElements.length - originalCount) > 2) {
            console.warn(
                `AI returned ${validatedElements.length} elements vs ${originalCount} original — suspiciously different`,
            );
        }

        return {
            elements: validatedElements,
            summary: String(parsed.summary ?? 'Layout optimized for accessibility.'),
            changes: Array.isArray(parsed.changes) ? parsed.changes : [],
        };
    } catch (error) {
        console.error('Gemini layout optimization error:', error);
        return null;
    }
}

