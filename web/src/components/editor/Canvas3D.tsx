/**
 * Canvas3D Component
 * ===================
 * 
 * WHAT THIS FILE DOES:
 * - Creates the main 3D scene using React Three Fiber
 * - Provides camera controls for orbiting/zooming the scene
 * - Renders a floor grid for spatial reference
 * - Manages orbit toggle (disabled during element drag)
 * - Improved lighting with shadows, fog, and ContactShadows
 * - Auto-fit camera on element changes
 * 
 * HOW IT WORKS:
 * 1. Canvas wraps the entire 3D scene
 * 2. OrbitControls lets users rotate/zoom (disabled during drag)
 * 3. Grid helper shows the floor plane
 * 4. Invisible ground mesh catches clicks for deselection
 * 5. ContactShadows adds realistic floor shadows
 * 6. Fog adds depth perception
 * 7. AutoFitCamera frames all elements automatically
 * 
 * USAGE:
 * <Canvas3D />
 */

import { useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, ContactShadows } from '@react-three/drei';
import { useFloorPlanStore } from '../../store';
import { FloorElements } from './FloorElements';
import { AutoFitCamera } from './AutoFitCamera';

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
            {/* Atmospheric fog for depth perception */}
            <fog attach="fog" args={['#0f172a', 30, 80]} />

            {/* Lighting — upgraded with proper shadow maps */}
            <ambientLight intensity={0.4} />
            <directionalLight
                position={[10, 15, 8]}
                intensity={1.2}
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-left={-20}
                shadow-camera-right={20}
                shadow-camera-top={20}
                shadow-camera-bottom={-20}
                shadow-camera-near={0.5}
                shadow-camera-far={50}
                shadow-bias={-0.0001}
            />
            {/* Fill light from opposite side */}
            <directionalLight position={[-5, 8, -5]} intensity={0.3} />

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

            {/* ContactShadows for realistic floor shadows */}
            <ContactShadows
                position={[0, 0.001, 0]}
                opacity={0.15}
                width={40}
                height={40}
                blur={3}
                far={15}
            />

            {/* 
             * Ground plane — catches pointer events for:
             * 1. Click-to-deselect when clicking empty space
             * 2. Provides a raycastable surface for the drag system
             * Subtle visible floor for realism
             */}
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, -0.01, 0]}
                onClick={handleGroundClick}
                receiveShadow
            >
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial
                    color="#1e293b"
                    roughness={0.92}
                    transparent
                    opacity={0.6}
                    depthWrite={false}
                    polygonOffset
                    polygonOffsetFactor={1}
                />
            </mesh>

            {/* Auto-fit camera to frame elements */}
            <AutoFitCamera />

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
