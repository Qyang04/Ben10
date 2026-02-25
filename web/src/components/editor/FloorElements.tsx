/**
 * FloorElements Component
 * ========================
 * 
 * WHAT THIS FILE DOES:
 * - Renders all elements from the floor plan store as 3D objects
 * - Maps element types to their respective 3D components
 * - Handles element selection
 * - Passes orbit toggle callback to TransformableElement for drag support
 * 
 * HOW IT WORKS:
 * 1. Reads elements array from Zustand store
 * 2. Maps each element to the correct 3D component (Wall, Door, etc.)
 * 3. Wraps each element in TransformableElement for raycaster-based dragging
 * 4. Forwards onOrbitToggle so dragging can disable camera orbit
 */

import { useFloorPlanStore } from '../../store';
import type { Element } from '../../types';
import { Wall } from '../elements/Wall';
import { Door } from '../elements/Door';
import { Ramp } from '../elements/Ramp';
import { Stairs } from '../elements/Stairs';
import { Table } from '../elements/Table';
import { Chair } from '../elements/Chair';
import { Counter } from '../elements/Counter';
import { Sofa } from '../elements/Sofa';
import { Shelf } from '../elements/Shelf';
import { Bed } from '../elements/Bed';
import { Pillar } from '../elements/Pillar';
import { ReceptionDesk } from '../elements/ReceptionDesk';
import { Elevator } from '../elements/Elevator';
import { Toilet } from '../elements/Toilet';
import { Sink } from '../elements/Sink';
import { VendingMachine } from '../elements/VendingMachine';
import { FireExtinguisher } from '../elements/FireExtinguisher';
import { TransformableElement } from './TransformableElement';

/**
 * Component map - links element types to React components
 */
const ELEMENT_COMPONENTS: Record<string, React.FC<{ element: Element; isSelected: boolean }>> = {
    wall: Wall,
    door: Door,
    ramp: Ramp,
    stairs: Stairs,
    table: Table,
    chair: Chair,
    counter: Counter,
    sofa: Sofa,
    shelf: Shelf,
    bed: Bed,
    pillar: Pillar,
    reception_desk: ReceptionDesk,
    elevator: Elevator,
    toilet: Toilet,
    sink: Sink,
    vending_machine: VendingMachine,
    fire_extinguisher: FireExtinguisher,
};

interface FloorElementsProps {
    onOrbitToggle?: (enabled: boolean) => void;
}

/**
 * Renders all floor plan elements as 3D objects
 * Each element is wrapped in TransformableElement for raycaster-based dragging
 */
export function FloorElements({ onOrbitToggle }: FloorElementsProps) {
    const floorPlan = useFloorPlanStore((state) => state.floorPlan);
    const selectedElementId = useFloorPlanStore((state) => state.selectedElementId);
    const selectElement = useFloorPlanStore((state) => state.selectElement);

    if (!floorPlan) return null;

    return (
        <group>
            {floorPlan.elements.map((element) => {
                const Component = ELEMENT_COMPONENTS[element.type];

                if (!Component) {
                    console.warn(`Unknown element type: ${element.type}`);
                    return null;
                }

                const isSelected = selectedElementId === element.id;

                return (
                    <TransformableElement
                        key={element.id}
                        elementId={element.id}
                        position={[element.position.x, element.position.y, element.position.z]}
                        rotation={[element.rotation.x, element.rotation.y, element.rotation.z]}
                        isSelected={isSelected}
                        onSelect={() => selectElement(element.id)}
                        onOrbitToggle={onOrbitToggle}
                    >
                        <Component
                            element={element}
                            isSelected={isSelected}
                        />
                    </TransformableElement>
                );
            })}
        </group>
    );
}
