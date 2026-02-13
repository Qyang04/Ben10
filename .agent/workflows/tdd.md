---
description: Test-driven development workflow — write tests first, then implement
---

# TDD Workflow

Follow the Red-Green-Refactor cycle to build features with confidence.

## Steps

1. **Define the Interface**
   - Before any implementation, define the TypeScript interface in `web/src/types/`
   - Specify all props, return types, and state shapes
   - This is the contract — implementation comes later

2. **Write Failing Tests (RED)**
   - Create test files alongside the component (e.g., `Component.test.tsx`)
   - Write tests that describe the expected behavior
   - Tests MUST fail at this point — if they pass, the test is wrong
   - Cover: happy path, edge cases, error states

3. **Implement Minimal Code (GREEN)**
   - Write the simplest code that makes ALL tests pass
   - Do NOT add extra features or optimizations yet
   - Follow existing patterns from `react-three-expert` skill

4. **Refactor (IMPROVE)**
   - Clean up the implementation without changing behavior
   - Extract reusable logic into hooks or utilities
   - Ensure TypeScript types are strict (no `any`)
   - Optimize performance (memoize, useCallback where needed)

5. **Verify Coverage**
   - All tests should pass
   - Aim for 80%+ coverage on new code

// turbo
6. **Lint Check**
   - Run `npm run lint` in `web/` directory
   - Fix any issues before completing
