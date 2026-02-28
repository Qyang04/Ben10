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

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, ContactShadows, PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import { useFloorPlanStore } from '../../store';
import { FloorElements } from './FloorElements';
import { AutoFitCamera } from './AutoFitCamera';
import { SceneExporter, ExportButtonUI } from './ExportButton';
import BlueprintWalls3D from '../elements/BlueprintWalls3D';
import { WheelchairPath } from './WheelchairPath';
import { findWheelchairPath, type PathPoint, type PathfindingResult } from '../../analysis/wheelchairPathfinding';
import {
    computeRoomPolygonWorld,
    isPointInRoomPolygon,
    getWallCollisionSegments,
    doesPathCrossWalls,
    isPointInWall,
    type RoomPolygon,
    type WallCollisionSegment,
} from '../../utils/roomGeometry';
import type { Element as FloorElement } from '../../types';

// Walk-mode collision tuning
// Very small radius/padding so users can get quite close to elements.
const WALK_PERSON_RADIUS = 0.08; // effective radius of the walking person (m)
const WALK_EXTRA_PADDING = 0.01; // extra clearance around elements (m)

/**
 * Scene component containing all 3D objects and helpers
 * Separated from Canvas for cleaner code organization
 */
function Scene({
    onExportReady,
    shortWalls,
    mode,
    resetToken,
    pathfindingMode,
}: {
    onExportReady: (fn: (filename: string) => Promise<void>) => void;
    shortWalls: boolean;
    mode: 'orbit' | 'fps';
    resetToken: number;
    pathfindingMode: boolean;
}) {
    const { camera, gl } = useThree();
    const floorPlan = useFloorPlanStore((state) => state.floorPlan);
    const selectElement = useFloorPlanStore((state) => state.selectElement);
    const [orbitEnabled, setOrbitEnabled] = useState(true);
    const [walkStart, setWalkStart] = useState<[number, number] | null>(null);
    const [walkStarted, setWalkStarted] = useState(false);
    const [walkPointer, setWalkPointer] = useState<[number, number] | null>(null);
    const [walkPointerValid, setWalkPointerValid] = useState(true);

    // Pathfinding state
    const [pfStart, setPfStart] = useState<PathPoint | null>(null);
    const [pfEnd, setPfEnd] = useState<PathPoint | null>(null);
    const [pfResult, setPfResult] = useState<PathfindingResult | null>(null);

    // Room boundary and elements for walk-mode collision checks
    const roomPolygon: RoomPolygon | null = useMemo(() => {
        if (!floorPlan) return null;
        try {
            return computeRoomPolygonWorld(floorPlan.points, floorPlan.walls);
        } catch (err) {
            console.error('Failed to compute room polygon for FPS walk:', err);
            return null;
        }
    }, [floorPlan?.points, floorPlan?.walls]);

    const walkElements: FloorElement[] = useMemo(
        () => floorPlan?.elements.filter((el) => !!el.dimensions) ?? [],
        [floorPlan?.elements],
    );

    // Wall collision segments for walk mode (walls block, doors create gaps)
    const wallCollisionSegments = useMemo(() => {
        if (!floorPlan) return [];
        return getWallCollisionSegments(floorPlan.points, floorPlan.walls, floorPlan.doors);
    }, [floorPlan?.points, floorPlan?.walls, floorPlan?.doors]);

    // Shared validation: can the walking person stand at (x,z) without intersecting elements, walls, or leaving the room?
    const canStandAt = useCallback(
        (x: number, z: number): boolean => {
            if (roomPolygon && !isPointInRoomPolygon(x, z, roomPolygon)) return false;
            if (isPointInWall(x, z, wallCollisionSegments, WALK_PERSON_RADIUS)) return false;

            for (const el of walkElements) {
                if (!el.dimensions) continue;
                const ex = el.position.x;
                const ez = el.position.z;
                const elementRadius =
                    0.5 * Math.sqrt(el.dimensions.width ** 2 + el.dimensions.depth ** 2);
                const minDist = WALK_PERSON_RADIUS + elementRadius + WALK_EXTRA_PADDING;
                const dx = x - ex;
                const dz = z - ez;
                if (dx * dx + dz * dz < minDist * minDist) {
                    return false;
                }
            }

            return true;
        },
        [roomPolygon, walkElements, wallCollisionSegments],
    );

    // Reset camera when walk/orbit mode toggles
    useEffect(() => {
        if (mode === 'fps') {
            // Entering walk mode: top-down view, like 2D map
            camera.position.set(0, 15, 0.01);
            camera.lookAt(0, 0, 0);
        } else {
            // Exiting walk mode: centered isometric view
            camera.position.set(10, 10, 10);
            camera.lookAt(0, 0, 0);
        }
    }, [camera, resetToken, mode]);

    // When entering walk mode, reset any previous start and pointer so user always re-chooses.
    useEffect(() => {
        if (mode === 'fps') {
            setWalkStart(null);
            setWalkStarted(false);
            setWalkPointer(null);
            setWalkPointerValid(true);
        }
    }, [mode]);

    // Pointer lock handling:
    // - In FPS mode, a double-click on the canvas will lock the pointer (mouse look).
    // - When leaving FPS mode, pointer lock is automatically released.
    useEffect(() => {
        const canvas = gl?.domElement as HTMLElement | undefined;
        if (!canvas) return;

        if (mode === 'fps') {
            const handleDblClick = () => {
                if (!document.pointerLockElement) {
                    try {
                        canvas.requestPointerLock();
                    } catch {
                        // ignore
                    }
                }
            };
            canvas.addEventListener('dblclick', handleDblClick);
            return () => {
                canvas.removeEventListener('dblclick', handleDblClick);
            };
        } else if (mode === 'orbit' && document.pointerLockElement) {
            try {
                document.exitPointerLock();
            } catch {
                // ignore
            }
        }
    }, [mode, gl]);

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
    const handleGroundClick = useCallback(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (event: any) => {
            // ── Pathfinding mode: click to set start/end ──
            if (pathfindingMode && event?.point && event.button === 0) {
                const { x, z } = event.point;
                if (!pfStart) {
                    setPfStart({ x, z });
                    setPfEnd(null);
                    setPfResult(null);
                } else if (!pfEnd) {
                    const endPt: PathPoint = { x, z };
                    setPfEnd(endPt);
                    // Compute path immediately
                    const result = findWheelchairPath(
                        pfStart, endPt, roomPolygon, wallCollisionSegments, walkElements,
                    );
                    setPfResult(result);
                } else {
                    // Reset: click again starts a new pair
                    setPfStart({ x, z });
                    setPfEnd(null);
                    setPfResult(null);
                }
                return;
            }

            selectElement(null);

            // In walk mode, first click on floor confirms starting position.
            if (mode === 'fps' && !walkStarted && event?.point && event.button === 0) {
                const { x, z } = event.point;
                if (!canStandAt(x, z)) return;
                setWalkStart([x, z]);
                setWalkStarted(true);
                setWalkPointer(null);
                setWalkPointerValid(true);
            }
        },
        [selectElement, mode, walkStarted, canStandAt, pathfindingMode, pfStart, pfEnd, roomPolygon, wallCollisionSegments, walkElements],
    );

    /**
     * First-person walk controller — simple WASD movement with collision.
     * Mouse look is handled by PointerLockControls when mode === 'fps'.
     */
    function FirstPersonController({
        start,
        polygon,
        elements,
        wallSegments,
    }: {
        start: [number, number] | null;
        polygon: RoomPolygon | null;
        elements: FloorElement[];
        wallSegments: WallCollisionSegment[];
    }) {
        const { camera } = useThree();

        // Initialize camera position roughly at eye height, looking toward origin.
        useState(() => {
            const startX = start?.[0] ?? 0;
            const startZ =
                start?.[1] ?? (floorPlan?.dimensions.depth ? floorPlan.dimensions.depth / 2 : 5);
            camera.position.set(startX, 1.6, startZ);
            camera.lookAt(startX, 1.2, startZ - 1);
            return null;
        });

        const keysRef = useRef<Record<string, boolean>>({});

        const handleKeyDown = useCallback((e: KeyboardEvent) => {
            keysRef.current[e.code] = true;
        }, []);

        const handleKeyUp = useCallback((e: KeyboardEvent) => {
            keysRef.current[e.code] = false;
        }, []);

        useState(() => {
            window.addEventListener('keydown', handleKeyDown);
            window.addEventListener('keyup', handleKeyUp);
            return () => {
                window.removeEventListener('keydown', handleKeyDown);
                window.removeEventListener('keyup', handleKeyUp);
            };
        });

        const canMoveTo = (x: number, z: number): boolean => {
            // Stay inside room polygon if available
            if (polygon && !isPointInRoomPolygon(x, z, polygon)) return false;

            // Block walking through walls (doors create gaps)
            if (
                wallSegments.length > 0 &&
                doesPathCrossWalls(camera.position.x, camera.position.z, x, z, wallSegments, WALK_PERSON_RADIUS)
            ) {
                return false;
            }

            // Simple circular collision against each element footprint
            for (const el of elements) {
                if (!el.dimensions) continue;
                const ex = el.position.x;
                const ez = el.position.z;
                const elementRadius =
                    0.5 * Math.sqrt(el.dimensions.width ** 2 + el.dimensions.depth ** 2);
                const minDist = WALK_PERSON_RADIUS + elementRadius + WALK_EXTRA_PADDING;
                const dx = x - ex;
                const dz = z - ez;
                if (dx * dx + dz * dz < minDist * minDist) {
                    return false;
                }
            }

            return true;
        };

        useFrame((_, delta) => {
            const speed = 3; // meters per second
            const moveDistance = speed * delta;

            const forward = new THREE.Vector3();
            camera.getWorldDirection(forward);
            forward.y = 0;
            forward.normalize();

            const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

            const nextPosition = camera.position.clone();

            if (keysRef.current['KeyW']) {
                nextPosition.addScaledVector(forward, moveDistance);
            }
            if (keysRef.current['KeyS']) {
                nextPosition.addScaledVector(forward, -moveDistance);
            }
            if (keysRef.current['KeyA']) {
                nextPosition.addScaledVector(right, -moveDistance);
            }
            if (keysRef.current['KeyD']) {
                nextPosition.addScaledVector(right, moveDistance);
            }
            const rotateSpeed = 1.5;
            const yAxis = new THREE.Vector3(0, 1, 0);
            if (keysRef.current['ArrowLeft']) {
                camera.rotateOnWorldAxis(yAxis, rotateSpeed * delta);
            }
            if (keysRef.current['ArrowRight']) {
                camera.rotateOnWorldAxis(yAxis, -rotateSpeed * delta);
            }

            // Apply horizontal collision constraints
            if (canMoveTo(nextPosition.x, nextPosition.z)) {
                camera.position.copy(nextPosition);
            }
        });

        return null;
    }

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
                // Show a red pointer under the mouse when choosing a start position in walk mode
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onPointerMove={(event: any) => {
                    if (mode === 'fps' && !walkStarted && event?.point) {
                        const { x, z } = event.point;
                        setWalkPointer([x, z]);
                        setWalkPointerValid(canStandAt(x, z));
                    }
                }}
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

            {/* Walk start pointer (preview) */}
            {mode === 'fps' && !walkStarted && walkPointer && (
                <mesh position={[walkPointer[0], 0.05, walkPointer[1]]}>
                    <cylinderGeometry args={[0.15, 0.0, 0.05, 20]} />
                    <meshStandardMaterial color={walkPointerValid ? '#22c55e' : '#ef4444'} />
                </mesh>
            )}

            {/* Auto-fit camera to frame elements (orbit view only) */}
            {mode === 'orbit' && <AutoFitCamera />}

            {/* Scene exporter — invisible, just provides export function */}
            <SceneExporter onReady={onExportReady} />

            {/* Blueprint walls/doors/windows from 2D drawing — key by plan id so New gives a fresh mount */}
            <BlueprintWalls3D key={floorPlan?.id ?? 'no-plan'} shortWalls={shortWalls} />

            {/* Palette-placed furniture elements */}
            <FloorElements onOrbitToggle={handleOrbitToggle} />

            {/* Wheelchair pathfinding visualization */}
            {pathfindingMode && (
                <WheelchairPath
                    start={pfStart}
                    end={pfEnd}
                    path={pfResult?.path ?? null}
                    found={pfResult?.found ?? false}
                />
            )}

            {/* Camera controls */}
            {mode === 'orbit' || !walkStarted || !walkStart ? (
                <OrbitControls
                    makeDefault
                    enabled={orbitEnabled}
                    minPolarAngle={0}
                    maxPolarAngle={Math.PI / 2.1} // Prevent flipping below floor
                    minDistance={2}
                    maxDistance={50}
                    target={[0, 0, 0]}
                />
            ) : (
                <>
                    {/* WASD movement handled by FirstPersonController; mouse look by PointerLockControls */}
                    <FirstPersonController
                        start={walkStart}
                        polygon={roomPolygon}
                        elements={walkElements}
                        wallSegments={wallCollisionSegments}
                    />
                    <PointerLockControls makeDefault />
                </>
            )}
        </>
    );
}

/**
 * Main Canvas3D component
 * Wraps the Three.js scene in a React Three Fiber Canvas
 * Export button is rendered as a DOM overlay OUTSIDE the Canvas
 */
export default function Canvas3D() {
    const floorPlan = useFloorPlanStore((state) => state.floorPlan);
    const [exporting, setExporting] = useState(false);
    const exportFnRef = useRef<((filename: string) => Promise<void>) | null>(null);
    const [shortWalls, setShortWalls] = useState(false);
    const [viewMode3D, setViewMode3D] = useState<'orbit' | 'fps'>('orbit');
    const [cameraResetToken, setCameraResetToken] = useState(0);
    const [pathfindingMode, setPathfindingMode] = useState(false);

    const handleExportReady = useCallback((fn: (filename: string) => Promise<void>) => {
        exportFnRef.current = fn;
    }, []);

    const handleExport = useCallback(async () => {
        if (!exportFnRef.current) return;
        setExporting(true);
        try {
            const filename = `${floorPlan?.name || 'floor-plan'}.glb`;
            await exportFnRef.current(filename);
        } catch (error) {
            console.error('GLB export failed:', error);
        } finally {
            setExporting(false);
        }
    }, [floorPlan?.name]);

    const toggleShortWalls = useCallback(() => {
        setShortWalls((prev) => !prev);
    }, []);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
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
                <Scene
                    onExportReady={handleExportReady}
                    shortWalls={shortWalls}
                    mode={viewMode3D}
                    resetToken={cameraResetToken}
                    pathfindingMode={pathfindingMode}
                />
            </Canvas>

            {/* Export button — rendered as DOM overlay, NOT inside the 3D scene */}
            <ExportButtonUI exporting={exporting} onExport={handleExport} />

            {/* Wall height toggle — switches between full and shortened 3D walls */}
            <button
                type="button"
                onClick={toggleShortWalls}
                style={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    zIndex: 20,
                    background: shortWalls ? '#6366f1' : '#334155',
                    color: 'white',
                    border: '1px solid #475569',
                    padding: '8px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 500,
                }}
            >
                {shortWalls ? 'Full-height walls' : 'Short walls view'}
            </button>

            {/* 3D view mode toggle: Orbit vs FPS walk */}
            <button
                type="button"
                onClick={() => {
                    setViewMode3D((prev) => {
                        const next = prev === 'orbit' ? 'fps' : 'orbit';
                        // When leaving FPS walk mode, explicitly exit pointer lock
                        if (prev === 'fps' && next === 'orbit') {
                            try {
                                if (document.pointerLockElement) {
                                    document.exitPointerLock();
                                }
                            } catch {
                                // ignore
                            }
                        }
                        // Always reset camera to centered view when toggling walk/orbit
                        setCameraResetToken((t) => t + 1);
                        return next;
                    });
                }}
                style={{
                    position: 'absolute',
                    top: 16,
                    left: 150,
                    zIndex: 20,
                    background: viewMode3D === 'fps' ? '#22c55e' : '#334155',
                    color: 'white',
                    border: '1px solid #475569',
                    padding: '8px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 500,
                }}
            >
                {viewMode3D === 'fps' ? 'Exit walk mode' : 'Enter walk mode'}
            </button>

            {/* Pathfinding toggle */}
            <button
                type="button"
                onClick={() => setPathfindingMode((prev) => !prev)}
                style={{
                    position: 'absolute',
                    top: 16,
                    left: 290,
                    zIndex: 20,
                    background: pathfindingMode ? '#8b5cf6' : '#334155',
                    color: 'white',
                    border: '1px solid #475569',
                    padding: '8px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 500,
                }}
            >
                {pathfindingMode ? '♿ Pathfinding ON' : '♿ Pathfinding'}
            </button>

            {/* Pathfinding instructions */}
            {pathfindingMode && (
                <div
                    style={{
                        position: 'absolute',
                        top: 52,
                        left: 290,
                        zIndex: 20,
                        padding: '6px 10px',
                        borderRadius: 8,
                        background: 'rgba(139,92,246,0.9)',
                        border: '1px solid #a78bfa',
                        color: 'white',
                        fontSize: 11,
                        maxWidth: 220,
                    }}
                >
                    Click floor to set start → then end point
                </div>
            )}

            {/* Element manipulation help */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 64, // leave room above Export GLB button
                    left: 16,
                    zIndex: 10,
                    padding: '6px 10px',
                    borderRadius: 8,
                    background: 'rgba(15,23,42,0.9)',
                    border: '1px solid #334155',
                    color: '#cbd5f5',
                    fontSize: 11,
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-line',
                    maxWidth: 320,
                }}
            >
                {'Element: hold left/right click + Q/E to rotate\nElement: hold left/right click + W/S to adjust height\nElement: hold left/right click + scroll to adjust width'}
            </div>
        </div>
    );
}
