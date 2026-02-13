---
name: tdd-workflow
description: Test-Driven Development methodology and patterns for React, R3F, and Zustand testing. Use when writing tests or implementing features test-first.
---

# TDD Workflow Skill

## Philosophy
Write tests BEFORE implementation. Tests define the contract; implementation fulfills it.

## The Red-Green-Refactor Cycle

### 1. RED — Write a Failing Test
```typescript
// Example: testing a Zustand store action
import { useFloorPlanStore } from '@/store/floorPlanStore';

describe('floorPlanStore', () => {
  beforeEach(() => {
    useFloorPlanStore.setState({ elements: [] }); // reset
  });

  it('should add an element', () => {
    const { addElement } = useFloorPlanStore.getState();
    addElement({ id: '1', type: 'chair', position: [0, 0, 0] });
    
    const { elements } = useFloorPlanStore.getState();
    expect(elements).toHaveLength(1);
    expect(elements[0].type).toBe('chair');
  });
});
```

### 2. GREEN — Write Minimal Implementation
- Only write enough code to make the test pass
- Do not optimize or add extra features
- If a test passes without new code, the test is wrong

### 3. REFACTOR — Clean Up
- Extract shared logic into utilities
- Improve naming and readability
- Ensure strict TypeScript — no `any`
- Add JSDoc comments for complex functions

## Testing Patterns by Layer

### Zustand Stores
- Test actions by calling `getState()` methods directly
- Reset store state in `beforeEach` using `setState`
- Test derived state / selectors separately

### React Components
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { MyComponent } from './MyComponent';

it('renders and responds to clicks', () => {
  render(<MyComponent label="Click me" />);
  const button = screen.getByText('Click me');
  fireEvent.click(button);
  expect(screen.getByText('Clicked!')).toBeInTheDocument();
});
```

### R3F Components
- Use `@react-three/test-renderer` for 3D scene testing
- Test that meshes are created with correct geometry/material
- Test that `useFrame` callbacks update state correctly
- Mock `useThree` when testing components that depend on camera/scene

### Custom Hooks
```typescript
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

it('increments the counter', () => {
  const { result } = renderHook(() => useCounter());
  act(() => result.current.increment());
  expect(result.current.count).toBe(1);
});
```

## Coverage Target
- Aim for **80%+** coverage on new code
- Focus on behavior coverage, not line coverage
- Always test: happy path, edge cases, error states
