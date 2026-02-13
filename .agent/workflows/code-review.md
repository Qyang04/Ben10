---
description: Review code for quality, security, performance, and maintainability
---

# Code Review Workflow

Perform a thorough code review acting as a senior engineer.

## Steps

1. **Identify Scope**
   - Determine which files to review (recent changes, specific PR, or a directory)
   - If not specified, review the last set of modified files

2. **Check Code Quality**
   - [ ] No `any` types — all values are strictly typed
   - [ ] No `console.log` left in production code
   - [ ] Functions are small and single-purpose (<50 lines)
   - [ ] File organization follows project structure (`components/`, `store/`, `types/`, `services/`)
   - [ ] No prop drilling beyond 2 levels — use Zustand store instead
   - [ ] Named exports preferred over default exports

3. **Check React/R3F Patterns**
   - [ ] Functional components with hooks only
   - [ ] `useFrame` for animations — no `setInterval` or raw `requestAnimationFrame`
   - [ ] `useThree` for scene access
   - [ ] Geometries and materials memoized if reused
   - [ ] Effects cleaned up in `useEffect` return

4. **Check State Management**
   - [ ] Zustand stores use `create<State>` with proper typing
   - [ ] No unnecessary re-renders (selectors used properly)
   - [ ] Derived state computed outside the store when possible

5. **Check Security**
   - [ ] No secrets or API keys in source code
   - [ ] User input sanitized before rendering
   - [ ] Firebase rules checked if data access changed
   - [ ] No `dangerouslySetInnerHTML` without sanitization

6. **Check Performance**
   - [ ] Large lists use virtualization
   - [ ] Images/assets are optimized
   - [ ] No expensive computations in render path
   - [ ] React.memo used where appropriate for 3D scene children

7. **Report Findings**
   - Categorize issues as: 🔴 Critical | 🟡 Warning | 🔵 Suggestion
   - Provide specific fix recommendations with code examples
