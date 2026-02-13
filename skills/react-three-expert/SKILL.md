---
name: react-three-expert
description: Expert React 19, Three.js (R3F), Zustand, and TypeScript development guide. Use for implementing features, fixing bugs, or refactoring in the 'web' directory.
---

# React Three Expert

## Overview
This skill provides expert guidance for developing in the `Ben10` project, a React 19 application with a heavy focus on 3D manipulation using Three.js (via `@react-three/fiber`). It enforces architectural standards, performance best practices, and strict typing.

## Core Stack & Standards
- **Framework:** React 19 + Vite
- **3D Engine:** Three.js + `@react-three/fiber` (R3F) + `@react-three/drei`
- **State Management:** Zustand (Global state), React Context (Localized 3D state if needed)
- **Styling:** Tailwind CSS v4
- **Language:** TypeScript (Strict mode)

## Architecture & Directory Structure
- `web/src/components/`: Reusable UI components.
- `web/src/components/editor/`: 3D Canvas and Editor-specific logic (e.g., `Canvas3D.tsx`).
- `web/src/components/elements/`: 3D Object definitions (e.g., `Chair.tsx`, `Table.tsx`).
- `web/src/store/`: Zustand stores (e.g., `floorPlanStore.ts` for app state).
- `web/src/services/`: External integrations (Firebase, AI, API).
- `web/src/types/`: Shared TypeScript interfaces. **Always define types here first.**

## Development Workflow

### 1. Analysis & Type Definition
Before writing component code, define the data structures.
- Check `web/src/types/` for existing types.
- Create new interfaces for props and state.
- **Rule:** Avoid `any`. Use strict types or generics.

### 2. State Management (Zustand)
- Prefer global state in `web/src/store/` for data shared between the 3D scene and the UI overlay.
- Use `useStore = create<State>((set, get) => ({ ... }))` pattern.
- **Rule:** Do not prop-drill more than 2 levels. Use the store.

### 3. 3D Implementation (R3F)
- Isolate 3D logic in components under `components/editor` or `components/elements`.
- Use `useThree()` to access the R3F state (camera, scene, renderer).
- Use `useFrame((state, delta) => { ... })` for animations. **Never use `setInterval` or `requestAnimationFrame` directly.**
- Use `@react-three/drei` for common helpers (OrbitControls, TransformControls, etc.).
- **Performance:** Memoize geometries and materials if reused.

### 4. Verification
- After implementation, always run the linter to catch errors early.
- **Command:** `npm run lint` (inside `web/` directory).
- Fix all linting errors before considering the task complete.

## Common Patterns

### Zustand Store
```typescript
import { create } from 'zustand';

interface AppState {
  count: number;
  increment: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));
```

### R3F Component
```typescript
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';

export const RotatingBox = () => {
  const meshRef = useRef<Mesh>(null);
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
};
```