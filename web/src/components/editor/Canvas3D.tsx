/**
 * Canvas3D Component
 * ===================
 * 
 * WHAT THIS FILE DOES:
 * - Creates the main 3D scene using React Three Fiber
 * - Provides camera controls for orbiting/zooming the scene
 * - Renders a floor grid for spatial reference
 * - Manages orbit toggle (disabled during element drag)
 * - Ground plane mesh for click-to-deselect
 * 
 * HOW IT WORKS:
 * 1. Canvas wraps the entire 3D scene
 * 2. OrbitControls lets users rotate/zoom (disabled during drag)
 * 3. Grid helper shows the floor plane
 * 4. Invisible ground mesh catches clicks for deselection
 * 5. Elements from the store are rendered as 3D objects
 * 
 * USAGE:
 * <Canvas3D />
 */

import { useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { useFloorPlanStore } from '../../store';
import { FloorElements } from './FloorElements';

/**
 * Scene component containing all 3D objects and helpers
 * Separated from Canvas for cleaner code organization
 */
function Scene() {
    const floorPlan = useFloorPlanStore((state) => state.floorPlan);
    const selectElement = useFloorPlanStore((state) => state.selectElement);
    const [orbitEnabled, setOrbitEnabled] = useState(true);

    /**
     * Toggle orbit controls on/off
     * Called by TransformableElement during drag start/end
     */
    const handleOrbitToggle = useCallback((enabled: boolean) => {
        setOrbitEnabled(enabled);
    }, []);

    /**
     * Click on empty ground → deselect current element
     */
    const handleGroundClick = useCallback(() => {
        selectElement(null);
    }, [selectElement]);

    return (
        <>
            {/* Lighting */}
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} castShadow />

            {/* Environment for realistic reflections */}
            <Environment preset="city" />

            {/* Floor Grid - helps visualize the space */}
            <Grid
                position={[0, 0, 0]}
                args={[floorPlan?.dimensions.width || 10, floorPlan?.dimensions.depth || 10]}
                cellSize={1}
                cellThickness={0.5}
                cellColor="#6b7280"
                sectionSize={5}
                sectionThickness={1}
                sectionColor="#3b82f6"
                fadeDistance={30}
                infiniteGrid
            />

            {/* 
             * Invisible ground plane — catches pointer events for:
             * 1. Click-to-deselect when clicking empty space
             * 2. Provides a raycastable surface for the drag system
             */}
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, -0.01, 0]}
                onClick={handleGroundClick}
                receiveShadow
            >
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial
                    transparent
                    opacity={0}
                    depthWrite={false}
                />
            </mesh>

            {/* Render all floor plan elements */}
            <FloorElements onOrbitToggle={handleOrbitToggle} />

            {/* Camera controls — disabled during element drag */}
            <OrbitControls
                makeDefault
                enabled={orbitEnabled}
                minPolarAngle={0}
                maxPolarAngle={Math.PI / 2.1} // Prevent flipping below floor
                minDistance={2}
                maxDistance={50}
                target={[0, 0, 0]}
            />
        </>
    );
}

/**
 * Main Canvas3D component
 * Wraps the Three.js scene in a React Three Fiber Canvas
 */
export default function Canvas3D() {
    return (
        <Canvas
            shadows
            camera={{
                position: [10, 10, 10], // Isometric-ish view
                fov: 50,
                near: 0.1,
                far: 1000,
            }}
            style={{ background: '#0f172a' }} // Dark blue background
        >
            <Scene />
        </Canvas>
    );
}
