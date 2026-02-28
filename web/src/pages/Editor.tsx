/**
 * Editor Page
 * ============
 * 
 * WHAT THIS FILE DOES:
 * - Main editor interface with 3D canvas and control panels
 * - Left sidebar: Element palette for adding objects
 * - Center: 3D canvas for viewing/editing floor plan
 * - Right sidebar: Properties panel for selected element
 * 
 * HOW IT WORKS:
 * 1. ElementPalette lets users add new elements
 * 2. Canvas3D renders the 3D scene
 * 3. PropertiesPanel shows/edits selected element
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Canvas3D } from '../components/editor';
import Canvas2D from '../components/editor/Canvas2D';
import { useFloorPlanStore } from '../store';
import { useViewModeStore } from '../store/viewModeStore';
import { saveFloorPlan, loadFloorPlan, listFloorPlans, deleteFloorPlan } from '../services/floorPlanService';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { WALL_TEXTURES } from '../components/elements/wallTextures';
import type { Element, FloorPlan } from '../types';

/**
 * Element templates for the palette
 * Defines default dimensions for each element type
 */
/**
 * Palette element types — furniture and indoor obstacles.
 * Walls/doors/windows are created via the 2D drawing tool.
 */
type PaletteElementType =
    | 'ramp' | 'stairs'
    | 'table' | 'round_table' | 'chair' | 'counter' | 'sofa' | 'shelf' | 'bed'
    | 'pillar' | 'reception_desk' | 'elevator'
    | 'toilet' | 'sink'
    | 'vending_machine' | 'fire_extinguisher';

const ELEMENT_TEMPLATES: Record<PaletteElementType, Omit<Element, 'id'>> = {
    ramp: {
        type: 'ramp',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: { width: 1.2, height: 0.3, depth: 3.6 },
        properties: {},
    },
    stairs: {
        type: 'stairs',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: { width: 1, height: 1.5, depth: 2 },
        properties: {},
    },
    table: {
        type: 'table',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: { width: 1.2, height: 0.75, depth: 0.8 },
        properties: { shape: 'rectangular' },
    },
    round_table: {
        type: 'table',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: { width: 1.2, height: 0.75, depth: 1.2 },
        properties: { shape: 'round' },
    },
    chair: {
        type: 'chair',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: { width: 0.45, height: 0.45, depth: 0.45 },
        properties: {},
    },
    counter: {
        type: 'counter',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: { width: 2, height: 0.9, depth: 0.6 },
        properties: {},
    },
    sofa: {
        type: 'sofa',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: { width: 1.8, height: 0.7, depth: 0.8 },
        properties: {},
    },
    shelf: {
        type: 'shelf',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: { width: 0.9, height: 1.8, depth: 0.4 },
        properties: {},
    },
    bed: {
        type: 'bed',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: { width: 1.4, height: 0.5, depth: 2.0 },
        properties: {},
    },
    pillar: {
        type: 'pillar',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: { width: 0.4, height: 3.0, depth: 0.4 },
        properties: {},
    },
    reception_desk: {
        type: 'reception_desk',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: { width: 2.0, height: 1.1, depth: 0.7 },
        properties: {},
    },
    elevator: {
        type: 'elevator',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: { width: 1.5, height: 2.4, depth: 1.5 },
        properties: {},
    },
    toilet: {
        type: 'toilet',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: { width: 0.4, height: 0.4, depth: 0.7 },
        properties: {},
    },
    sink: {
        type: 'sink',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: { width: 0.5, height: 0.85, depth: 0.45 },
        properties: {},
    },
    vending_machine: {
        type: 'vending_machine',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: { width: 0.8, height: 1.8, depth: 0.7 },
        properties: {},
    },
    fire_extinguisher: {
        type: 'fire_extinguisher',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: { width: 0.2, height: 0.5, depth: 0.15 },
        properties: {},
    },
};

/** Palette categories for grouped display */
const PALETTE_CATEGORIES: { label: string; items: PaletteElementType[] }[] = [
    { label: 'Accessibility', items: ['ramp', 'stairs', 'elevator'] },
    { label: 'Furniture', items: ['table', 'round_table', 'chair', 'sofa', 'bed', 'counter', 'shelf'] },
    { label: 'Infrastructure', items: ['pillar', 'reception_desk'] },
    { label: 'Fixtures', items: ['toilet', 'sink', 'vending_machine'] },
    { label: 'Safety', items: ['fire_extinguisher'] },
];

/** Display labels for types that need formatting */
const ELEMENT_LABELS: Partial<Record<PaletteElementType, string>> = {
    round_table: 'Round Table',
    reception_desk: 'Reception Desk',
    vending_machine: 'Vending Machine',
    fire_extinguisher: 'Fire Extinguisher',
};

/**
 * Element Palette - Left sidebar for adding elements
 */
function ElementPalette() {
    const addElement = useFloorPlanStore((state) => state.addElement);

    const handleAddElement = (type: PaletteElementType) => {
        const template = ELEMENT_TEMPLATES[type];
        const newElement: Element = {
            ...template,
            id: crypto.randomUUID(),
            position: {
                x: Math.random() * 4 - 2,
                y: 0,
                z: Math.random() * 4 - 2,
            },
        };
        addElement(newElement);
    };

    return (
        <aside className="w-64 bg-slate-800 border-r border-slate-700 p-4 flex flex-col overflow-y-auto">
            <h2 className="text-sm font-semibold text-slate-400 uppercase mb-4">
                Elements
            </h2>
            <div className="space-y-4 flex-1">
                {PALETTE_CATEGORIES.map((cat) => (
                    <div key={cat.label}>
                        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2 tracking-wider">
                            {cat.label}
                        </h3>
                        <div className="space-y-1">
                            {cat.items.map((type) => (
                                <button
                                    key={type}
                                    onClick={() => handleAddElement(type)}
                                    className="w-full px-3 py-2 bg-slate-700 rounded-lg text-left text-sm hover:bg-slate-600 transition-colors capitalize"
                                >
                                    + {ELEMENT_LABELS[type] || type.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <p className="text-xs text-slate-500 mt-4">
                Click to add element to scene
            </p>
        </aside>
    );
}

/**
 * Properties Panel - Right sidebar for editing selected element
 */
function PropertiesPanel() {
    const selectedElementId = useFloorPlanStore((state) => state.selectedElementId);
    const floorPlan = useFloorPlanStore((state) => state.floorPlan);
    const updateElement = useFloorPlanStore((state) => state.updateElement);
    const removeElement = useFloorPlanStore((state) => state.removeElement);

    const selectedElement = floorPlan?.elements.find(
        (el) => el.id === selectedElementId
    );

    if (!selectedElement) {
        return (
            <aside className="w-72 bg-slate-800 border-l border-slate-700 p-4">
                <h2 className="text-sm font-semibold text-slate-400 uppercase mb-4">
                    Properties
                </h2>
                <p className="text-slate-500 text-sm">
                    Click an element in the 3D view to edit its properties
                </p>
            </aside>
        );
    }

    const handleDimensionChange = (key: 'width' | 'height' | 'depth', value: number) => {
        updateElement(selectedElement.id, {
            dimensions: { ...selectedElement.dimensions, [key]: value },
        });
    };

    const handlePositionChange = (key: 'x' | 'y' | 'z', value: number) => {
        updateElement(selectedElement.id, {
            position: { ...selectedElement.position, [key]: value },
        });
    };

    const radToDeg = (rad: number) => (rad * 180) / Math.PI;
    const degToRad = (deg: number) => (deg * Math.PI) / 180;
    const wrapDeg360 = (deg: number) => {
        const d = ((deg % 360) + 360) % 360;
        return d === 0 && deg !== 0 ? 360 : d;
    };

    const yawDeg = wrapDeg360(Math.round(radToDeg(selectedElement.rotation.y)));

    return (
        <aside className="w-72 bg-slate-800 border-l border-slate-700 p-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase mb-4">
                Properties
            </h2>

            {/* Element type */}
            <div className="mb-4">
                <span className="text-xs text-slate-500">Type</span>
                <p className="text-white capitalize font-medium">{selectedElement.type}</p>
            </div>

            {/* Dimensions */}
            <div className="mb-4">
                <span className="text-xs text-slate-500 block mb-2">Dimensions (m)</span>
                {(['width', 'height', 'depth'] as const).map((dim) => (
                    <div key={dim} className="flex items-center gap-2 mb-2">
                        <label className="text-slate-400 text-sm w-16 capitalize">{dim}</label>
                        <input
                            type="number"
                            step="0.1"
                            value={selectedElement.dimensions[dim]}
                            onChange={(e) => handleDimensionChange(dim, parseFloat(e.target.value) || 0)}
                            className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                        />
                    </div>
                ))}
            </div>

            {/* Position */}
            <div className="mb-4">
                <span className="text-xs text-slate-500 block mb-2">Position (m)</span>
                {(['x', 'y', 'z'] as const).map((axis) => (
                    <div key={axis} className="flex items-center gap-2 mb-2">
                        <label className="text-slate-400 text-sm w-16 uppercase">{axis}</label>
                        <input
                            type="number"
                            step="0.5"
                            value={selectedElement.position[axis]}
                            onChange={(e) => handlePositionChange(axis, parseFloat(e.target.value) || 0)}
                            className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                        />
                    </div>
                ))}
            </div>

            {/* Rotation (Yaw) */}
            <div className="mb-4">
                <span className="text-xs text-slate-500 block mb-2">Rotation (°)</span>
                <div className="flex items-center gap-2 mb-2">
                    <label className="text-slate-400 text-sm w-16">Yaw</label>
                    <input
                        type="range"
                        min={0}
                        max={360}
                        step={1}
                        value={yawDeg}
                        onChange={(e) => {
                            const deg = parseFloat(e.target.value);
                            if (!Number.isFinite(deg)) return;
                            updateElement(selectedElement.id, {
                                rotation: { ...selectedElement.rotation, y: degToRad(deg) },
                            });
                        }}
                        className="flex-1"
                    />
                    <input
                        type="number"
                        min={0}
                        max={360}
                        step="1"
                        value={yawDeg}
                        onChange={(e) => {
                            const deg = parseFloat(e.target.value);
                            if (!Number.isFinite(deg)) return;
                            const clamped = Math.min(360, Math.max(0, deg));
                            updateElement(selectedElement.id, {
                                rotation: { ...selectedElement.rotation, y: degToRad(clamped) },
                            });
                        }}
                        className="w-20 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            const next = wrapDeg360(yawDeg - 90);
                            updateElement(selectedElement.id, {
                                rotation: { ...selectedElement.rotation, y: degToRad(next) },
                            });
                        }}
                        className="flex-1 px-3 py-2 bg-slate-700 rounded-lg text-sm hover:bg-slate-600 transition-colors"
                    >
                        -90°
                    </button>
                    <button
                        onClick={() => {
                            const next = wrapDeg360(yawDeg + 90);
                            updateElement(selectedElement.id, {
                                rotation: { ...selectedElement.rotation, y: degToRad(next) },
                            });
                        }}
                        className="flex-1 px-3 py-2 bg-slate-700 rounded-lg text-sm hover:bg-slate-600 transition-colors"
                    >
                        +90°
                    </button>
                </div>
            </div>

            {/* Wall texture picker — only for walls */}
            {selectedElement.type === 'wall' && (
                <div className="mb-4">
                    <span className="text-xs text-slate-500 block mb-2">Wall Texture</span>
                    <select
                        value={(selectedElement.properties.texture as string) || 'default'}
                        onChange={(e) =>
                            updateElement(selectedElement.id, {
                                properties: { ...selectedElement.properties, texture: e.target.value },
                            })
                        }
                        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-2 text-white text-sm"
                    >
                        {WALL_TEXTURES.map((tex) => (
                            <option key={tex.id} value={tex.id}>
                                {tex.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Delete button */}
            <button
                onClick={() => removeElement(selectedElement.id)}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
            >
                Delete Element
            </button>
        </aside>
    );
}

/**
 * Main Editor Page Component
 */
export default function Editor() {
    const floorPlan = useFloorPlanStore((state) => state.floorPlan);
    const setFloorPlan = useFloorPlanStore((state) => state.setFloorPlan);
    const clearFloorPlan = useFloorPlanStore((state) => state.clearFloorPlan);
    const { canUndo, canRedo, undo, redo } = useUndoRedo();
    const viewMode = useViewModeStore((state) => state.mode);
    const setViewMode = useViewModeStore((state) => state.setMode);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
    const [isLoadPickerOpen, setIsLoadPickerOpen] = useState(false);
    const [isLoadingList, setIsLoadingList] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [availablePlans, setAvailablePlans] = useState<FloorPlan[]>([]);
    const [isEditingName, setIsEditingName] = useState(false);
    const [nameDraft, setNameDraft] = useState('');

    /**
     * Handle save to Firestore
     * WHAT: Saves current floor plan to Firebase
     * WHY: Persist user's work across sessions
     */
    const handleSave = async () => {
        if (!floorPlan) return;

        // Ask for a name only the first time (new/unnamed floor plan)
        let name = floorPlan.name;
        if (!name || name.trim() === '') {
            const input = window.prompt('Name this floor plan:', name || 'Untitled Floor Plan');
            if (!input) {
                // User cancelled or left blank → abort save
                return;
            }
            name = input.trim();
            if (!name) return;
        }

        setIsSaving(true);
        setSaveStatus('idle');

        try {
            // For now, use a demo user ID (would come from auth in production)
            const floorPlanToSave = {
                ...floorPlan,
                name,
                userId: 'demo-user',
            };
            await saveFloorPlan(floorPlanToSave);
            // Update local store so header reflects the saved name
            setFloorPlan(floorPlanToSave);
            setSaveStatus('saved');

            // Reset status after 2 seconds
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error('Save failed:', error);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    /**
     * Open load dialog and fetch list of saved floor plans
     * WHAT: Shows all saved records so user can pick which to open
     * WHY: Let user choose which floor plan to display
     */
    const handleLoad = async () => {
        setIsLoadPickerOpen(true);
        setIsLoadingList(true);
        setLoadError(null);
        try {
            // TODO: replace demo-user with real auth user ID
            const plans = await listFloorPlans('demo-user');
            // Sort by most recently created first
            const sorted = [...plans].sort(
                (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
            );
            setAvailablePlans(sorted);
            if (plans.length === 0) {
                setLoadError('No saved floor plans found for this user.');
            }
        } catch (error) {
            console.error('Load failed:', error);
            setLoadError('Failed to load saved floor plans.');
        } finally {
            setIsLoadingList(false);
        }
    };

    const handleBeginEditName = () => {
        if (!floorPlan) return;
        setIsEditingName(true);
        setNameDraft(floorPlan.name || 'Untitled Floor Plan');
    };

    const handleCommitNameEdit = async () => {
        if (!floorPlan) {
            setIsEditingName(false);
            return;
        }
        const trimmed = nameDraft.trim();
        if (!trimmed) {
            setIsEditingName(false);
            return;
        }
        const updated: FloorPlan = { ...floorPlan, name: trimmed };

        setIsSaving(true);
        setSaveStatus('idle');
        try {
            const toSave = {
                ...updated,
                userId: updated.userId || 'demo-user',
            };
            await saveFloorPlan(toSave);
            setFloorPlan(toSave);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error('Auto-save name failed:', error);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
            setIsEditingName(false);
        }
    };

    const handleSelectFloorPlan = async (planId: string) => {
        try {
            const loaded = await loadFloorPlan(planId);
            if (loaded) {
                setFloorPlan(loaded);
                setIsLoadPickerOpen(false);
            } else {
                setLoadError('Selected floor plan could not be found.');
            }
        } catch (error) {
            console.error('Load selected floor plan failed:', error);
            setLoadError('Failed to load selected floor plan.');
        }
    };

    const handleNew = () => {
        clearFloorPlan();
        setSaveStatus('idle');
        setIsLoadPickerOpen(false);
        setLoadError(null);
        setAvailablePlans([]);
    };

    const handleDeletePlan = async (planId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await deleteFloorPlan(planId);
            setAvailablePlans((prev) => prev.filter((p) => p.id !== planId));
            if (floorPlan?.id === planId) {
                clearFloorPlan();
                setSaveStatus('idle');
            }
        } catch (err) {
            console.error('Delete floor plan failed:', err);
            setLoadError('Failed to delete floor plan.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col relative">
            {/* Header */}
            <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/" className="text-xl font-bold text-blue-400">
                        AccessAI
                    </Link>
                    <span className="text-slate-500">|</span>
                    {isEditingName ? (
                        <input
                            autoFocus
                            value={nameDraft}
                            onChange={(e) => setNameDraft(e.target.value)}
                            onBlur={handleCommitNameEdit}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleCommitNameEdit();
                                } else if (e.key === 'Escape') {
                                    setIsEditingName(false);
                                }
                            }}
                            className="bg-slate-700 text-slate-100 text-sm px-2 py-1 rounded border border-slate-500 outline-none"
                        />
                    ) : (
                        <button
                            type="button"
                            onClick={handleBeginEditName}
                            className="text-slate-300 hover:text-white text-sm underline-offset-2 hover:underline"
                        >
                            {floorPlan?.name || 'Untitled Floor Plan'}
                        </button>
                    )}
                    <span className="text-xs text-slate-500">
                        ({floorPlan?.elements.length || 0} elements)
                    </span>
                    {/* Save status indicator */}
                    {saveStatus === 'saved' && (
                        <span className="text-xs text-green-400">✓ Saved</span>
                    )}
                    {saveStatus === 'error' && (
                        <span className="text-xs text-red-400">✗ Save failed</span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {/* Undo/Redo buttons */}
                    <button
                        onClick={undo}
                        disabled={!canUndo}
                        className={`px-3 py-2 rounded-lg transition-colors ${canUndo ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                            }`}
                        title="Undo (Ctrl+Z)"
                    >
                        ↩
                    </button>
                    <button
                        onClick={redo}
                        disabled={!canRedo}
                        className={`px-3 py-2 rounded-lg transition-colors ${canRedo ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                            }`}
                        title="Redo (Ctrl+Y)"
                    >
                        ↪
                    </button>
                    <span className="text-slate-600">|</span>
                    {/* View Mode Toggle */}
                    {(['3d', '2d', 'split'] as const).map((m) => (
                        <button
                            key={m}
                            onClick={() => setViewMode(m)}
                            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${viewMode === m
                                ? 'bg-blue-500 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                            title={`${m.toUpperCase()} view`}
                        >
                            {m === '3d' ? '🧊 3D' : m === '2d' ? '📐 2D' : '⬛ Split'}
                        </button>
                    ))}
                    <span className="text-slate-600">|</span>
                    <button
                        onClick={handleNew}
                        className="px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
                    >
                        New
                    </button>
                    <button
                        onClick={handleLoad}
                        className="px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
                    >
                        Load
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`px-4 py-2 rounded-lg transition-colors ${isSaving
                            ? 'bg-slate-600 cursor-not-allowed'
                            : 'bg-slate-700 hover:bg-slate-600'
                            }`}
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <Link
                        to="/analysis"
                        className="px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-400 transition-colors"
                    >
                        Analyze
                    </Link>
                </div>
            </header>

            {/* Load Floor Plan Picker Overlay */}
            {isLoadPickerOpen && (
                <div className="fixed inset-0 z-40 flex items-start justify-center pt-20 bg-black/40">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-full max-w-md p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-semibold text-slate-100">
                                Saved floor plans
                            </h2>
                            <button
                                type="button"
                                onClick={() => setIsLoadPickerOpen(false)}
                                className="text-slate-400 hover:text-slate-200 text-sm"
                            >
                                ✕
                            </button>
                        </div>

                        {isLoadingList ? (
                            <p className="text-slate-400 text-sm">Loading floor plans...</p>
                        ) : availablePlans.length === 0 ? (
                            <p className="text-slate-500 text-sm">
                                {loadError || 'No saved floor plans found.'}
                            </p>
                        ) : (
                            <ul className="space-y-1 max-h-64 overflow-y-auto">
                                {availablePlans.map((plan) => (
                                    <li key={plan.id} className="flex items-stretch gap-1">
                                        <button
                                            type="button"
                                            onClick={() => handleSelectFloorPlan(plan.id)}
                                            className="flex-1 text-left px-3 py-2 rounded-md bg-slate-700 hover:bg-slate-600 transition-colors"
                                        >
                                            <div className="text-sm font-medium text-slate-100">
                                                {plan.name || 'Untitled'}
                                            </div>
                                            <div className="text-xs text-slate-400">
                                                {plan.spaceType} · {plan.elements.length} elements
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => handleDeletePlan(plan.id, e)}
                                            className="p-2 rounded-md bg-slate-700 hover:bg-red-600/80 text-slate-400 hover:text-white transition-colors shrink-0"
                                            title="Remove this floor plan"
                                            aria-label="Remove this floor plan"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="3 6 5 6 21 6" />
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                <line x1="10" y1="11" x2="10" y2="17" />
                                                <line x1="14" y1="11" x2="14" y2="17" />
                                            </svg>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {loadError && availablePlans.length > 0 && (
                            <p className="text-xs text-red-400 mt-2">{loadError}</p>
                        )}
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex">
                {/* Left Sidebar - Element Palette */}
                <ElementPalette />

                {/* Canvas Area — both views always mounted, visibility via CSS
                     (matches wedding repo pattern: prevents WebGL context
                      destruction and preserves camera state on view switch) */}
                <main className="flex-1 relative">
                    {/* 2D View — always mounted */}
                    <div
                        className="absolute inset-0 transition-all duration-500"
                        style={{
                            ...(viewMode === '2d'
                                ? { zIndex: 10, opacity: 1 }
                                : viewMode === 'split'
                                    ? { width: '50%', zIndex: 10, opacity: 1, borderRight: '1px solid #334155' }
                                    : { zIndex: 0, opacity: 0, pointerEvents: 'none' as const }
                            )
                        }}
                    >
                        <Canvas2D />
                        {viewMode === '2d' && (
                            <span className="absolute top-3 right-3 bg-blue-500 text-white text-xs font-semibold uppercase px-2 py-1 rounded shadow-md">
                                2D Active
                            </span>
                        )}
                    </div>

                    {/* 3D View — always mounted */}
                    <div
                        className="absolute inset-0 transition-all duration-500"
                        style={{
                            ...(viewMode === '3d'
                                ? { zIndex: 10, opacity: 1 }
                                : viewMode === 'split'
                                    ? { left: '50%', width: '50%', zIndex: 10, opacity: 1 }
                                    : { zIndex: 0, opacity: 0, pointerEvents: 'none' as const }
                            )
                        }}
                    >
                        <Canvas3D />
                        {viewMode === '3d' && (
                            <span className="absolute top-3 right-3 bg-blue-500 text-white text-xs font-semibold uppercase px-2 py-1 rounded shadow-md">
                                3D Active
                            </span>
                        )}
                    </div>
                </main>

                {/* Right Sidebar - Properties */}
                <PropertiesPanel />
            </div>
        </div>
    );
}
