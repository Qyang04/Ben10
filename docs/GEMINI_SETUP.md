# Gemini CLI Setup for Ben10 Project

This setup is inspired by the `everything-claude-code` philosophy, adapted for Antigravity / Gemini CLI.

## 1. Rules (Always-Follow Guidelines)

Stored in `~/.gemini/GEMINI.md` and automatically loaded every session:
- **Stack:** React 19, Three.js (R3F), Zustand, Tailwind v4, Firebase
- **Conventions:** Functional components, strict TypeScript, hooks-based state
- **Workflow:** Always run `npm run lint` in `web/` before finishing tasks
- **Git:** Commit format `type(scope): description`
- **Testing:** TDD-first, 80%+ coverage, test behavior not implementation
- **Performance:** Cache objects in `useFrame`, use selectors, memoize
- **Security:** No secrets in code, validate inputs, check Firebase rules

## 2. Skills (Specialized Knowledge)

Located in `skills/*/SKILL.md`, auto-discovered by Antigravity:

| Skill | Description |
|---|---|
| `react-three-expert` | R3F patterns, performance, strict typing |
| `coding-standards` | TypeScript rules, naming conventions, file organization |
| `tdd-workflow` | Red-Green-Refactor cycle, testing patterns per layer |
| `security-review` | Firebase, React, and web security checklists |

## 3. Workflows (Slash Commands)

Located in `.agent/workflows/*.md`, trigger with `/workflow-name`:

| Workflow | Description |
|---|---|
| `/plan` | Analyze requirements → create implementation plan → get approval |
| `/tdd` | Write failing test → implement → refactor → verify coverage |
| `/code-review` | Review code for quality, security, performance |
| `/build-fix` | Diagnose and fix build errors, lint failures, type errors |
| `/verify` | Run full verification loop: lint + type-check + build + visual |

## 4. Usage Examples

```
# Planning a new feature
/plan "Add user authentication with Firebase Auth"

# Test-driven development
/tdd

# Review your code before committing
/code-review

# Fix build errors
/build-fix

# Full verification before deploy
/verify
```
