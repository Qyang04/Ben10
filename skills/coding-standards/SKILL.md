---
name: coding-standards
description: TypeScript and React coding standards for the Ben10 project. Enforces strict typing, naming conventions, file organization, and React best practices.
---

# Coding Standards

## TypeScript Rules

### Strict Typing
- **Never** use `any`. Use `unknown` if the type is truly uncertain, then narrow.
- All function parameters and return types must be explicitly typed.
- Prefer `interface` for object shapes, `type` for unions/intersections.
- Use `readonly` for props and state that should not be mutated.

### Naming Conventions
| Element | Convention | Example |
|---|---|---|
| Components | PascalCase | `FloorPlanEditor` |
| Hooks | camelCase, `use` prefix | `useFloorPlan` |
| Stores | camelCase, `use` prefix + `Store` | `useFloorPlanStore` |
| Types/Interfaces | PascalCase | `FloorElement` |
| Constants | UPPER_SNAKE_CASE | `MAX_ZOOM_LEVEL` |
| Files (components) | PascalCase | `Canvas3D.tsx` |
| Files (utilities) | camelCase | `mathHelpers.ts` |

### Imports
- Group imports in order: React → Third-party → Local components → Local utils → Types
- Use absolute imports from `@/` alias when configured
- Named exports preferred over default exports

## React Rules

### Components
- Functional components only — no class components
- One component per file (exception: small, tightly-coupled helpers)
- Destructure props in the function signature
- Use `React.FC` or explicit return type, not implicit

### Hooks
- Custom hooks go in `web/src/hooks/` or colocated with their component
- Always specify dependency arrays for `useEffect`, `useMemo`, `useCallback`
- Clean up side effects in the `useEffect` return function

### Performance
- Use `React.memo` for components that receive stable props but re-render often
- Use `useMemo` for expensive computations
- Use `useCallback` for functions passed as props to memoized children
- In R3F: never create new objects (vectors, colors) inside `useFrame`

## File Organization
```
web/src/
├── components/        # UI components
│   ├── editor/        # 3D editor components
│   ├── elements/      # 3D object definitions
│   └── ui/            # Shared UI components (buttons, modals)
├── hooks/             # Custom React hooks
├── store/             # Zustand stores
├── services/          # Firebase, API, AI integrations
├── types/             # TypeScript interfaces (define here FIRST)
├── utils/             # Pure utility functions
└── constants/         # App-wide constants
```

## Git Commit Format
```
type(scope): description

feat(editor): add drag-and-drop for floor elements
fix(store): prevent double-update on element delete
refactor(components): extract SelectionRing to own file
```
Types: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`
