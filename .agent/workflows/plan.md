---
description: Plan and design a feature implementation before writing code
---

# Implementation Planning Workflow

Follow these steps to create a thorough implementation plan before coding.

## Steps

1. **Gather Requirements**
   - Read the user's request carefully
   - Identify affected files by searching the codebase (`web/src/`)
   - Check `web/src/types/` for relevant existing types
   - Check `web/src/store/` for relevant Zustand stores

2. **Analyze Impact**
   - List all files that need to be created or modified
   - Identify dependencies between changes
   - Note any breaking changes or migration needs

3. **Create the Plan**
   - Write an `implementation_plan.md` artifact with:
     - **Goal:** What the feature does
     - **Proposed Changes:** Grouped by component, with file paths
     - **New Types:** Any TypeScript interfaces needed
     - **State Changes:** Zustand store modifications
     - **Verification:** How to confirm it works

4. **Get Approval**
   - Present the plan to the user for review before coding
   - If rejected, revise and re-present

5. **Execute**
   - Implement changes in dependency order (types → store → components → pages)
   - Follow the `react-three-expert` skill patterns

// turbo
6. **Verify**
   - Run `npm run lint` in the `web/` directory
   - Fix any errors before marking complete
