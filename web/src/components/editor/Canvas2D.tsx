/**
 * Canvas2D — SVG-based 2D Blueprint Drawing Editor
 * ===================================================
 *
 * Full drawing tool modeled after the wedding repo's FloorplanEditor.
 * Uses SVG for 2D rendering with:
 * - Drawing modes: SELECT, DRAW (walls), DOOR, WINDOW, PAN
 * - Point-to-point wall system (walls share corner points)
 * - Door/window placement on walls (offset-based)
 * - Pan/zoom via mouse wheel + Space+drag
 * - Grid snapping for precise placement
 * - Keyboard shortcuts (V, P, D, W, H, Space, Del, Esc)
 * - Live wall measurements in meters
 * - Ghost previews for drawing & placement
 *
 * Data flows through the Zustand floorPlanStore (setBlueprintData).
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useFloorPlanStore } from '../../store';
import {
    GRID_SIZE,
    PIXELS_PER_METER,
    SNAP_DISTANCE,
    DEFAULT_WALL_HEIGHT,
    DEFAULT_WALL_THICKNESS,
    DEFAULT_DOOR_WIDTH,
    DEFAULT_DOOR_HEIGHT,
    DEFAULT_WINDOW_WIDTH,
    DEFAULT_WINDOW_HEIGHT,
    DEFAULT_WINDOW_ELEVATION,
    WALL_TEXTURES,
} from '../../constants/blueprintConstants';
import {
    pointToLineDistance,
    checkOverlap,
} from '../../utils/blueprintUtils';
import type {
    BlueprintPoint,
    BlueprintWall,
    BlueprintDoor,
    BlueprintWindow,
} from '../../types';
import type { DrawingMode } from '../../utils/blueprintUtils';

interface GhostOpening {
    x: number;
    y: number;
    wallId: string;
    angle: number;
    valid: boolean;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

// ─── Component ─────────────────────────────────────────────────────

export default function Canvas2D() {
    const svgRef = useRef<SVGSVGElement>(null);

    // Store
    const floorPlan = useFloorPlanStore((s) => s.floorPlan);
    const setBlueprintData = useFloorPlanStore((s) => s.setBlueprintData);

    // Blueprint data (local mirror for perf — batch to store on pointerUp)
    const points = useMemo(() => floorPlan?.points ?? [], [floorPlan?.points]);
    const walls = useMemo(() => floorPlan?.walls ?? [], [floorPlan?.walls]);
    const doors = useMemo(() => floorPlan?.doors ?? [], [floorPlan?.doors]);
    const windows = useMemo(() => floorPlan?.windows ?? [], [floorPlan?.windows]);

    // Drawing mode
    const [mode, setMode] = useState<DrawingMode>('DRAW');

    // Viewport state
    const [pan, setPan] = useState({ x: 200, y: 200 });
    const [zoom, setZoom] = useState(1);
    const [isPanning, setIsPanning] = useState(false);
    const [isSpacePressed, setIsSpacePressed] = useState(false);

    // Selection state
    const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
    const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
    const [selectedDoorId, setSelectedDoorId] = useState<string | null>(null);
    const [selectedWindowId, setSelectedWindowId] = useState<string | null>(null);

    // Drag state
    const [draggingPointId, setDraggingPointId] = useState<string | null>(null);
    const [draggingWallId, setDraggingWallId] = useState<string | null>(null);
    const [draggingDoorId, setDraggingDoorId] = useState<string | null>(null);
    const [draggingWindowId, setDraggingWindowId] = useState<string | null>(null);
    const [lastMousePos, setLastMousePos] = useState<{ x: number; y: number } | null>(null);
    const hasSavedHistoryRef = useRef(false);

    // Draw mode state
    const [activeDrawId, setActiveDrawId] = useState<string | null>(null);
    const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

    // Ghost opening for door/window placement
    const [ghostOpening, setGhostOpening] = useState<GhostOpening | null>(null);
    const [hoverWallId, setHoverWallId] = useState<string | null>(null);

    // ─── Helpers ───

    const getPoint = useCallback((id: string) => points.find((p) => p.id === id), [points]);

    const getMousePosition = useCallback((evt: React.PointerEvent | PointerEvent) => {
        if (!svgRef.current) return { x: 0, y: 0 };
        const CTM = svgRef.current.getScreenCTM();
        if (!CTM) return { x: 0, y: 0 };
        const screenX = (evt.clientX - CTM.e) / CTM.a;
        const screenY = (evt.clientY - CTM.f) / CTM.d;
        return {
            x: (screenX - pan.x) / zoom,
            y: (screenY - pan.y) / zoom,
        };
    }, [pan, zoom]);

    const getSnappedPosition = useCallback((evt: React.PointerEvent | PointerEvent) => {
        const pos = getMousePosition(evt);
        return {
            x: Math.round(pos.x / GRID_SIZE) * GRID_SIZE,
            y: Math.round(pos.y / GRID_SIZE) * GRID_SIZE,
        };
    }, [getMousePosition]);

    /** Commit current blueprint data to the store */
    const commitToStore = useCallback((
        p: BlueprintPoint[],
        w: BlueprintWall[],
        d: BlueprintDoor[],
        win: BlueprintWindow[],
        pushHistory = true,
    ) => {
        setBlueprintData({ points: p, walls: w, doors: d, windows: win }, pushHistory);
    }, [setBlueprintData]);

    // ─── Zoom ───

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const scaleFactor = 0.001;
        const delta = -e.deltaY * scaleFactor;
        const newZoom = Math.min(Math.max(0.1, zoom + delta * zoom), 5);

        if (!svgRef.current) return;
        const CTM = svgRef.current.getScreenCTM();
        if (!CTM) return;

        const mouseX = (e.clientX - CTM.e) / CTM.a;
        const mouseY = (e.clientY - CTM.f) / CTM.d;

        const worldX = (mouseX - pan.x) / zoom;
        const worldY = (mouseY - pan.y) / zoom;

        setPan({
            x: mouseX - worldX * newZoom,
            y: mouseY - worldY * newZoom,
        });
        setZoom(newZoom);
    }, [pan, zoom]);

    // ─── Pointer Move ───

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (isPanning) {
            setPan((prev) => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
            return;
        }

        const mousePos = getMousePosition(e);
        const snapped = getSnappedPosition(e);
        setCursorPos(snapped);

        // Door/Window ghost placement
        if (mode === 'DOOR' || mode === 'WINDOW') {
            let closestDist = 20 / zoom;
            let foundWallId: string | null = null;
            let foundPos = { x: 0, y: 0 };
            let foundAngle = 0;
            let wallStart: BlueprintPoint | undefined;

            for (const wall of walls) {
                const start = getPoint(wall.startPointId);
                const end = getPoint(wall.endPointId);
                if (!start || !end) continue;
                const { distance, x, y } = pointToLineDistance(
                    mousePos.x, mousePos.y,
                    start.x, start.y, end.x, end.y,
                );
                if (distance < closestDist) {
                    closestDist = distance;
                    foundWallId = wall.id;
                    foundPos = { x, y };
                    foundAngle = Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI);
                    wallStart = start;
                }
            }

            if (foundWallId && wallStart) {
                const dist = Math.sqrt(
                    (foundPos.x - wallStart.x) ** 2 + (foundPos.y - wallStart.y) ** 2,
                );
                const width = mode === 'DOOR' ? DEFAULT_DOOR_WIDTH : DEFAULT_WINDOW_WIDTH;
                const { hasCollision } = checkOverlap(
                    foundWallId, dist, width,
                    mode === 'DOOR' ? 'DOOR' : 'WINDOW',
                    doors, windows,
                );
                setGhostOpening({ ...foundPos, wallId: foundWallId, angle: foundAngle, valid: !hasCollision });
                setHoverWallId(foundWallId);
            } else {
                setGhostOpening(null);
                setHoverWallId(null);
            }
        }

        // SELECT: drag operations
        if (mode === 'SELECT') {
            const draggingOpeningId = draggingDoorId || draggingWindowId;
            if (draggingOpeningId) {
                const isDoor = !!draggingDoorId;
                const list = isDoor ? doors : windows;
                const item = list.find((x) => x.id === draggingOpeningId);
                const wall = walls.find((w) => w.id === (item as BlueprintDoor | BlueprintWindow | undefined)?.wallId);
                if (item && wall) {
                    const start = getPoint(wall.startPointId);
                    const end = getPoint(wall.endPointId);
                    if (start && end) {
                        const { offsetRatio } = pointToLineDistance(mousePos.x, mousePos.y, start.x, start.y, end.x, end.y);
                        const wallLength = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
                        const proposedOffset = Math.max(0, Math.min(wallLength, offsetRatio * wallLength));

                        if (!hasSavedHistoryRef.current) {
                            commitToStore(points, walls, doors, windows, true);
                            hasSavedHistoryRef.current = true;
                        }

                        if (isDoor) {
                            const updatedDoors = doors.map((d) => d.id === draggingDoorId ? { ...d, offset: proposedOffset } : d);
                            commitToStore(points, walls, updatedDoors, windows, false);
                        } else {
                            const updatedWindows = windows.map((w) => w.id === draggingWindowId ? { ...w, offset: proposedOffset } : w);
                            commitToStore(points, walls, doors, updatedWindows, false);
                        }
                    }
                }
            } else if (draggingPointId) {
                if (!hasSavedHistoryRef.current) {
                    commitToStore(points, walls, doors, windows, true);
                    hasSavedHistoryRef.current = true;
                }
                const updatedPoints = points.map((p) =>
                    p.id === draggingPointId ? { ...p, x: snapped.x, y: snapped.y } : p,
                );
                commitToStore(updatedPoints, walls, doors, windows, false);
            } else if (draggingWallId && lastMousePos) {
                const dx = snapped.x - lastMousePos.x;
                const dy = snapped.y - lastMousePos.y;
                if (dx !== 0 || dy !== 0) {
                    if (!hasSavedHistoryRef.current) {
                        commitToStore(points, walls, doors, windows, true);
                        hasSavedHistoryRef.current = true;
                    }
                    const wall = walls.find((w) => w.id === draggingWallId);
                    if (wall) {
                        const updatedPoints = points.map((p) => {
                            if (p.id === wall.startPointId || p.id === wall.endPointId) {
                                return { ...p, x: p.x + dx, y: p.y + dy };
                            }
                            return p;
                        });
                        commitToStore(updatedPoints, walls, doors, windows, false);
                        setLastMousePos(snapped);
                    }
                }
            }
        }
    }, [isPanning, getMousePosition, getSnappedPosition, mode, zoom, walls, doors, windows, points,
        getPoint, draggingDoorId, draggingWindowId, draggingPointId, draggingWallId, lastMousePos,
        commitToStore]);

    // ─── Pointer Up ───

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        setIsPanning(false);
        setDraggingPointId(null);
        setDraggingWallId(null);
        setDraggingDoorId(null);
        setDraggingWindowId(null);
        setLastMousePos(null);
        hasSavedHistoryRef.current = false;
        if (e.target instanceof Element) {
            (e.target as SVGElement).releasePointerCapture(e.pointerId);
        }
    }, []);

    // ─── Background Click ───

    const handleBackgroundClick = useCallback((e: React.PointerEvent) => {
        // Pan
        if (mode === 'PAN' || isSpacePressed || e.button === 1) {
            setIsPanning(true);
            (e.target as SVGElement).setPointerCapture(e.pointerId);
            return;
        }

        if (mode === 'SELECT') {
            setSelectedWallId(null);
            setSelectedPointId(null);
            setSelectedDoorId(null);
            setSelectedWindowId(null);
        } else if (mode === 'DRAW') {
            const snapped = getSnappedPosition(e);

            // Check for near-existing point snap
            let snapPointId: string | null = null;
            for (const p of points) {
                const dist = Math.sqrt((p.x - snapped.x) ** 2 + (p.y - snapped.y) ** 2);
                if (dist < SNAP_DISTANCE) {
                    snapPointId = p.id;
                    break;
                }
            }

            const newPoint: BlueprintPoint = snapPointId
                ? points.find((p) => p.id === snapPointId)!
                : { id: generateId(), x: snapped.x, y: snapped.y };

            const newPoints = snapPointId ? [...points] : [...points, newPoint];
            let newWalls = [...walls];

            if (activeDrawId && activeDrawId !== newPoint.id) {
                // Check for duplicate wall
                const exists = walls.some((w) =>
                    (w.startPointId === activeDrawId && w.endPointId === newPoint.id) ||
                    (w.startPointId === newPoint.id && w.endPointId === activeDrawId),
                );
                if (!exists) {
                    const newWall: BlueprintWall = {
                        id: generateId(),
                        startPointId: activeDrawId,
                        endPointId: newPoint.id,
                        thickness: DEFAULT_WALL_THICKNESS,
                        height: DEFAULT_WALL_HEIGHT,
                        texture: 'default',
                    };
                    newWalls = [...newWalls, newWall];
                }
            }

            commitToStore(newPoints, newWalls, doors, windows, true);
            setActiveDrawId(newPoint.id);
        } else if ((mode === 'DOOR' || mode === 'WINDOW') && ghostOpening && ghostOpening.valid) {
            const wall = walls.find((w) => w.id === ghostOpening.wallId);
            if (wall) {
                const start = getPoint(wall.startPointId);
                if (start) {
                    const dist = Math.sqrt(
                        (ghostOpening.x - start.x) ** 2 + (ghostOpening.y - start.y) ** 2,
                    );

                    if (mode === 'DOOR') {
                        const newDoor: BlueprintDoor = {
                            id: generateId(),
                            wallId: wall.id,
                            offset: dist,
                            width: DEFAULT_DOOR_WIDTH,
                            height: DEFAULT_DOOR_HEIGHT,
                        };
                        commitToStore(points, walls, [...doors, newDoor], windows, true);
                    } else {
                        const newWindow: BlueprintWindow = {
                            id: generateId(),
                            wallId: wall.id,
                            offset: dist,
                            width: DEFAULT_WINDOW_WIDTH,
                            height: DEFAULT_WINDOW_HEIGHT,
                            elevation: DEFAULT_WINDOW_ELEVATION,
                        };
                        commitToStore(points, walls, doors, [...windows, newWindow], true);
                    }
                }
            }
        }
    }, [mode, isSpacePressed, getSnappedPosition, points, walls, doors, windows, activeDrawId,
        ghostOpening, getPoint, commitToStore]);

    // ─── Element Click Handlers ───

    const handlePointDown = useCallback((e: React.PointerEvent, pointId: string) => {
        if (mode === 'PAN' || isSpacePressed || e.button === 1 || mode === 'DOOR' || mode === 'WINDOW') return;
        e.stopPropagation();

        if (mode === 'SELECT') {
            setSelectedWallId(null);
            setSelectedDoorId(null);
            setSelectedWindowId(null);
            setSelectedPointId(pointId);
            setDraggingPointId(pointId);
            (e.target as SVGElement).setPointerCapture(e.pointerId);
        } else if (mode === 'DRAW') {
            if (activeDrawId === pointId) {
                setActiveDrawId(null);
            } else if (activeDrawId) {
                const exists = walls.some((w) =>
                    (w.startPointId === activeDrawId && w.endPointId === pointId) ||
                    (w.startPointId === pointId && w.endPointId === activeDrawId),
                );
                if (!exists) {
                    const newWall: BlueprintWall = {
                        id: generateId(),
                        startPointId: activeDrawId,
                        endPointId: pointId,
                        thickness: DEFAULT_WALL_THICKNESS,
                        height: DEFAULT_WALL_HEIGHT,
                        texture: 'default',
                    };
                    commitToStore(points, [...walls, newWall], doors, windows, true);
                }
                setActiveDrawId(pointId);
            } else {
                setActiveDrawId(pointId);
            }
        }
    }, [mode, isSpacePressed, activeDrawId, walls, points, doors, windows, commitToStore]);

    const handleWallDown = useCallback((e: React.PointerEvent, wallId: string) => {
        if (mode === 'PAN' || isSpacePressed || e.button === 1 || mode === 'DOOR' || mode === 'WINDOW') return;
        e.stopPropagation();
        if (mode === 'SELECT') {
            const snapped = getSnappedPosition(e);
            setSelectedWallId(wallId);
            setSelectedPointId(null);
            setSelectedDoorId(null);
            setSelectedWindowId(null);
            setDraggingWallId(wallId);
            setLastMousePos(snapped);
            (e.target as SVGElement).setPointerCapture(e.pointerId);
        }
    }, [mode, isSpacePressed, getSnappedPosition]);

    const handleDoorDown = useCallback((e: React.PointerEvent, doorId: string) => {
        if (mode === 'PAN' || isSpacePressed || e.button === 1 || mode === 'DOOR' || mode === 'WINDOW') return;
        e.stopPropagation();
        if (mode === 'SELECT') {
            setSelectedDoorId(doorId);
            setSelectedWallId(null);
            setSelectedPointId(null);
            setSelectedWindowId(null);
            setDraggingDoorId(doorId);
            (e.target as SVGElement).setPointerCapture(e.pointerId);
        }
    }, [mode, isSpacePressed]);

    const handleWindowDown = useCallback((e: React.PointerEvent, winId: string) => {
        if (mode === 'PAN' || isSpacePressed || e.button === 1 || mode === 'DOOR' || mode === 'WINDOW') return;
        e.stopPropagation();
        if (mode === 'SELECT') {
            setSelectedWindowId(winId);
            setSelectedDoorId(null);
            setSelectedWallId(null);
            setSelectedPointId(null);
            setDraggingWindowId(winId);
            (e.target as SVGElement).setPointerCapture(e.pointerId);
        }
    }, [mode, isSpacePressed]);

    // ─── Delete Selection ───

    const deleteSelection = useCallback(() => {
        if (selectedWallId) {
            commitToStore(
                points,
                walls.filter((w) => w.id !== selectedWallId),
                doors.filter((d) => d.wallId !== selectedWallId),
                windows.filter((w) => w.wallId !== selectedWallId),
                true,
            );
            setSelectedWallId(null);
        } else if (selectedPointId) {
            const connectedWallIds = walls
                .filter((w) => w.startPointId === selectedPointId || w.endPointId === selectedPointId)
                .map((w) => w.id);
            commitToStore(
                points.filter((p) => p.id !== selectedPointId),
                walls.filter((w) => !connectedWallIds.includes(w.id)),
                doors.filter((d) => !connectedWallIds.includes(d.wallId)),
                windows.filter((w) => !connectedWallIds.includes(w.wallId)),
                true,
            );
            setSelectedPointId(null);
        } else if (selectedDoorId) {
            commitToStore(points, walls, doors.filter((d) => d.id !== selectedDoorId), windows, true);
            setSelectedDoorId(null);
        } else if (selectedWindowId) {
            commitToStore(points, walls, doors, windows.filter((w) => w.id !== selectedWindowId), true);
            setSelectedWindowId(null);
        }
    }, [selectedWallId, selectedPointId, selectedDoorId, selectedWindowId,
        points, walls, doors, windows, commitToStore]);

    // ─── Keyboard Shortcuts ───

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !e.repeat) {
                setIsSpacePressed(true);
            }

            const active = document.activeElement?.tagName;
            if (active === 'INPUT' || active === 'TEXTAREA') return;

            switch (e.key.toLowerCase()) {
                case 'v':
                    setMode('SELECT');
                    setActiveDrawId(null);
                    break;
                case 'p':
                    setMode('DRAW');
                    setSelectedWallId(null);
                    setSelectedPointId(null);
                    break;
                case 'd':
                    setMode('DOOR');
                    setSelectedWallId(null);
                    setSelectedPointId(null);
                    break;
                case 'w':
                    setMode('WINDOW');
                    setSelectedWallId(null);
                    setSelectedPointId(null);
                    break;
                case 'h':
                    setMode('PAN');
                    setSelectedWallId(null);
                    setSelectedPointId(null);
                    setActiveDrawId(null);
                    break;
                case 'escape':
                    setActiveDrawId(null);
                    setMode('SELECT');
                    break;
            }

            if (mode === 'SELECT' && (e.key === 'Delete' || e.key === 'Backspace')) {
                deleteSelection();
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                setIsSpacePressed(false);
                setIsPanning(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [mode, deleteSelection]);

    // ─── Active point for drawing ───
    const activePoint = activeDrawId ? getPoint(activeDrawId) : null;

    // ─── Cursor ───
    const cursor = useMemo(() => {
        if (isPanning) return 'grabbing';
        if (mode === 'PAN' || isSpacePressed) return 'grab';
        if (mode === 'DRAW') return 'crosshair';
        if (mode === 'DOOR' || mode === 'WINDOW') return 'copy';
        if (draggingWallId || draggingPointId || draggingDoorId || draggingWindowId) return 'move';
        return 'default';
    }, [isPanning, mode, isSpacePressed, draggingWallId, draggingPointId, draggingDoorId, draggingWindowId]);

    // ─── Render ────────────────────────────────────────────────────

    return (
        <div style={{
            width: '100%', height: '100%', position: 'relative',
            overflow: 'hidden', userSelect: 'none', background: '#1e1e2e',
        }}>
            {/* Grid Background */}
            <div
                style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.15,
                    backgroundImage:
                        `linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)`,
                    backgroundSize: `${GRID_SIZE * zoom}px ${GRID_SIZE * zoom}px`,
                    backgroundPosition: `${pan.x}px ${pan.y}px`,
                }}
            />

            {/* SVG Canvas */}
            <svg
                ref={svgRef}
                style={{ width: '100%', height: '100%', touchAction: 'none', cursor }}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerDown={handleBackgroundClick}
                onWheel={handleWheel}
                onContextMenu={(e) => e.preventDefault()}
            >
                <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                    {/* ── Walls ── */}
                    {walls.map((wall) => {
                        const start = getPoint(wall.startPointId);
                        const end = getPoint(wall.endPointId);
                        if (!start || !end) return null;
                        const isSelected = wall.id === selectedWallId;
                        const isDragging = wall.id === draggingWallId;
                        const isHovered = (mode === 'DOOR' || mode === 'WINDOW') && hoverWallId === wall.id;
                        const tex = WALL_TEXTURES.find((t) => t.id === (wall.texture || 'default'));
                        const strokeColor = isSelected ? '#ef4444'
                            : isDragging ? '#3b82f6'
                                : isHovered ? '#60a5fa'
                                    : tex?.color ?? '#94a3b8';

                        return (
                            <g key={wall.id} onPointerDown={(e) => handleWallDown(e, wall.id)}>
                                {/* Invisible hit area */}
                                <line x1={start.x} y1={start.y} x2={end.x} y2={end.y}
                                    stroke="transparent" strokeWidth={30}
                                    style={{ cursor: mode === 'SELECT' && !isSpacePressed ? 'move' : 'pointer' }}
                                />
                                {/* Visible wall */}
                                <line x1={start.x} y1={start.y} x2={end.x} y2={end.y}
                                    stroke={strokeColor} strokeWidth={wall.thickness}
                                    strokeLinecap="round"
                                    style={{ opacity: isSelected ? 1 : 0.8, transition: 'opacity 0.2s' }}
                                />
                            </g>
                        );
                    })}

                    {/* ── Windows ── */}
                    {walls.map((wall) => {
                        const start = getPoint(wall.startPointId);
                        const end = getPoint(wall.endPointId);
                        if (!start || !end) return null;
                        const angle = Math.atan2(end.y - start.y, end.x - start.x);
                        return windows.filter((w) => w.wallId === wall.id).map((win) => {
                            const dx = Math.cos(angle) * win.offset;
                            const dy = Math.sin(angle) * win.offset;
                            const cx = start.x + dx;
                            const cy = start.y + dy;
                            const isSelected = selectedWindowId === win.id;
                            return (
                                <g key={win.id}
                                    transform={`translate(${cx}, ${cy}) rotate(${angle * 180 / Math.PI})`}
                                    onPointerDown={(e) => handleWindowDown(e, win.id)}
                                    style={{ cursor: mode === 'SELECT' ? 'move' : 'default' }}
                                >
                                    <rect x={-win.width / 2} y={-wall.thickness / 2 - 1}
                                        width={win.width} height={wall.thickness + 2}
                                        fill="#1e1e2e" stroke={isSelected ? '#ef4444' : 'none'} strokeWidth={2}
                                    />
                                    <line x1={-win.width / 2} y1={-2} x2={win.width / 2} y2={-2}
                                        stroke="#60a5fa" strokeWidth={1.5} />
                                    <line x1={-win.width / 2} y1={2} x2={win.width / 2} y2={2}
                                        stroke="#60a5fa" strokeWidth={1.5} />
                                </g>
                            );
                        });
                    })}

                    {/* ── Doors ── */}
                    {walls.map((wall) => {
                        const start = getPoint(wall.startPointId);
                        const end = getPoint(wall.endPointId);
                        if (!start || !end) return null;
                        const angle = Math.atan2(end.y - start.y, end.x - start.x);
                        return doors.filter((d) => d.wallId === wall.id).map((door) => {
                            const dx = Math.cos(angle) * door.offset;
                            const dy = Math.sin(angle) * door.offset;
                            const cx = start.x + dx;
                            const cy = start.y + dy;
                            const isSelected = selectedDoorId === door.id;
                            return (
                                <g key={door.id}
                                    transform={`translate(${cx}, ${cy}) rotate(${angle * 180 / Math.PI})`}
                                    onPointerDown={(e) => handleDoorDown(e, door.id)}
                                    style={{ cursor: mode === 'SELECT' ? 'move' : 'default' }}
                                >
                                    <rect x={-door.width / 2} y={-wall.thickness / 2 - 2}
                                        width={door.width} height={wall.thickness + 4}
                                        fill="#1e1e2e"
                                    />
                                    <rect x={-door.width / 2} y={-wall.thickness / 2}
                                        width={door.width} height={wall.thickness}
                                        fill={isSelected ? '#ef4444' : '#a78bfa'}
                                        opacity={isSelected ? 0.8 : 0.5}
                                        stroke={isSelected ? '#fff' : 'none'} strokeWidth={2}
                                    />
                                    {/* Swing arc */}
                                    <path
                                        d={`M ${-door.width / 2} ${-wall.thickness / 2} Q ${-door.width / 2} ${-door.width} ${door.width / 2} ${-door.width}`}
                                        fill="none" stroke="#a78bfa" strokeWidth={1} strokeDasharray="2 2"
                                    />
                                </g>
                            );
                        });
                    })}

                    {/* ── Ghost Opening (placement preview) ── */}
                    {ghostOpening && (
                        <g transform={`translate(${ghostOpening.x}, ${ghostOpening.y}) rotate(${ghostOpening.angle})`}
                            style={{ pointerEvents: 'none' }}>
                            <rect x={-10} y={-6} width={20} height={12}
                                fill={ghostOpening.valid ? '#60a5fa' : '#ef4444'} opacity={0.7} />
                        </g>
                    )}

                    {/* ── Ghost Wall (draw mode preview) ── */}
                    {mode === 'DRAW' && activePoint && cursorPos && (
                        <line
                            x1={activePoint.x} y1={activePoint.y}
                            x2={cursorPos.x} y2={cursorPos.y}
                            stroke="#6366f1" strokeWidth={4} strokeDasharray="8 4"
                            style={{ opacity: 0.6, pointerEvents: 'none' }}
                        />
                    )}

                    {/* ── Points ── */}
                    {points.map((point) => {
                        const isSelected = selectedPointId === point.id;
                        const isActive = activeDrawId === point.id;
                        const isDragging = draggingPointId === point.id;
                        const r = isSelected || isActive || isDragging ? 8 : 6;
                        const fill = isSelected ? '#ef4444'
                            : isActive ? '#10b981'
                                : isDragging ? '#3b82f6'
                                    : '#e2e8f0';
                        return (
                            <circle key={point.id} cx={point.x} cy={point.y}
                                r={r} fill={fill} stroke="#0f172a" strokeWidth={2}
                                style={{
                                    cursor: mode === 'SELECT' && !isSpacePressed ? 'move' : 'default',
                                    transition: 'all 0.2s',
                                }}
                                onPointerDown={(e) => handlePointDown(e, point.id)}
                            />
                        );
                    })}

                    {/* ── Wall Measurements ── */}
                    {walls.map((wall) => {
                        const start = getPoint(wall.startPointId);
                        const end = getPoint(wall.endPointId);
                        if (!start || !end) return null;
                        const mx = (start.x + end.x) / 2;
                        const my = (start.y + end.y) / 2;
                        const length = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
                        const meters = (length / PIXELS_PER_METER).toFixed(1);
                        return (
                            <text key={`m-${wall.id}`} x={mx} y={my - 10}
                                textAnchor="middle"
                                fill={wall.id === selectedWallId ? '#ef4444' : '#94a3b8'}
                                fontSize="10"
                                style={{ pointerEvents: 'none', userSelect: 'none', fontFamily: 'monospace' }}
                            >
                                {meters}m
                            </text>
                        );
                    })}
                </g>
            </svg>

            {/* ── Drawing Toolbar ── */}
            <div style={{
                position: 'absolute', bottom: 16, left: 16,
                display: 'flex', gap: 4, background: '#1e293b',
                borderRadius: 8, padding: 4, border: '1px solid #334155',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}>
                {([
                    { m: 'SELECT' as DrawingMode, icon: '⬆️', label: 'Select (V)', key: 'V' },
                    { m: 'DRAW' as DrawingMode, icon: '✏️', label: 'Draw Wall (P)', key: 'P' },
                    { m: 'DOOR' as DrawingMode, icon: '🚪', label: 'Place Door (D)', key: 'D' },
                    { m: 'WINDOW' as DrawingMode, icon: '🪟', label: 'Place Window (W)', key: 'W' },
                    { m: 'PAN' as DrawingMode, icon: '🤚', label: 'Pan (H)', key: 'H' },
                ]).map(({ m, icon, label }) => (
                    <button key={m} title={label}
                        onClick={() => { setMode(m); setActiveDrawId(null); }}
                        style={{
                            padding: '6px 10px', borderRadius: 6, fontSize: 16,
                            border: 'none', cursor: 'pointer',
                            background: mode === m ? '#6366f1' : 'transparent',
                            color: mode === m ? '#fff' : '#94a3b8',
                            transition: 'all 0.2s',
                        }}
                    >
                        {icon}
                    </button>
                ))}
            </div>

            {/* ── Mode Label ── */}
            <div style={{
                position: 'absolute', top: 12, left: 12,
                background: '#334155', color: '#e2e8f0',
                padding: '4px 12px', borderRadius: 6, fontSize: 12,
                fontFamily: 'monospace', pointerEvents: 'none',
            }}>
                {mode === 'DRAW' ? '✏️ Click to draw walls • Click existing point to connect'
                    : mode === 'DOOR' ? '🚪 Hover near a wall and click to place a door'
                        : mode === 'WINDOW' ? '🪟 Hover near a wall and click to place a window'
                            : mode === 'PAN' ? '🤚 Drag to pan • Scroll to zoom'
                                : mode === 'SELECT' ? '⬆️ Click elements to select • Drag to move'
                                    : ''}
            </div>

            {/* ── Info ── */}
            <div style={{
                position: 'absolute', bottom: 16, right: 16,
                pointerEvents: 'none', textAlign: 'right',
            }}>
                <div style={{
                    color: '#94a3b8', fontSize: 11, fontFamily: 'monospace',
                }}>
                    {points.length} points · {walls.length} walls · {doors.length} doors · {windows.length} windows
                </div>
            </div>
        </div>
    );
}
