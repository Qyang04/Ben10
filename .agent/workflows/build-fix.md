---
description: Diagnose and fix build errors, lint failures, or type errors
---

# Build Fix Workflow

Systematically resolve build and lint errors.

## Steps

// turbo
1. **Reproduce the Error**
   - Run `npm run lint` in the `web/` directory
   - Run `npx tsc --noEmit` in the `web/` directory to check types
   - Capture the full error output

2. **Categorize Errors**
   - **Type errors:** Missing types, incorrect generics, `any` usage
   - **Lint errors:** ESLint rule violations, import order, unused variables
   - **Build errors:** Missing dependencies, import resolution, Vite config issues
   - **Runtime errors:** Crashes, infinite loops, null references

3. **Fix in Priority Order**
   - Fix type errors first (they often cause cascading lint errors)
   - Fix import/dependency issues next
   - Fix lint violations last
   - For each fix: understand WHY it failed, don't just suppress the error

4. **Avoid Anti-Patterns**
   - ❌ Do NOT add `@ts-ignore` or `eslint-disable` unless absolutely necessary
   - ❌ Do NOT use `any` to fix type errors — find the correct type
   - ❌ Do NOT delete tests to fix test failures
   - ✅ DO add missing types to `web/src/types/`
   - ✅ DO update imports when moving files

// turbo
5. **Verify the Fix**
   - Run `npm run lint` again — must pass cleanly
   - Run `npx tsc --noEmit` again — must have zero errors
   - If there's a dev server running, confirm no runtime errors
