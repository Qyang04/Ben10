---
description: Run a full verification loop — lint, type-check, and visual confirmation
---

# Verification Workflow

Run the complete quality gate to confirm changes are production-ready.

## Steps

// turbo
1. **Lint Check**
   - Run `npm run lint` in the `web/` directory
   - Must pass with zero warnings and zero errors

// turbo
2. **Type Check**
   - Run `npx tsc --noEmit` in the `web/` directory
   - Must complete with zero errors

// turbo
3. **Build Check**
   - Run `npm run build` in the `web/` directory
   - Must complete successfully with no errors

4. **Visual Verification** (if applicable)
   - If changes affect the UI or 3D scene:
     - Start the dev server with `npm run dev` in `web/`
     - Open the app in the browser
     - Verify the changes visually
     - Check browser console for runtime errors

5. **Report Results**
   - Summarize: ✅ Passed / ❌ Failed for each check
   - If any failures, list the specific errors and recommend fixes
