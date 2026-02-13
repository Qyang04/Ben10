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
import { useFloorPlanStore } from '../store';
import { saveFloorPlan, loadFloorPlan } from '../services/floorPlanService';
import type { Element, ElementType } from '../types';

/**
 * Element templates for the palette
 * Defines default dimensions for each element type
 */
const ELEMENT_TEMPLATES: Record<ElementType, Omit<Element, 'id'>> = {
    wall: {
        type: 'wall',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: { width: 3, height: 2.5, depth: 0.15 },
        properties: {},
    },
    door: {
        type: 'door',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: { width: 0.9, height: 2.1, depth: 0.1 },
        properties: {},
    },
    ramp: {
        type: 'ramp',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: { width: 1.2, height: 0.3, depth: 3.6 }, // 1:12 ratio
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
        properties: {},
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
};

/**
 * Element Palette - Left sidebar for adding elements
 */
function ElementPalette() {
    const addElement = useFloorPlanStore((state) => state.addElement);

    const handleAddElement = (type: ElementType) => {
        const template = ELEMENT_TEMPLATES[type];
        const newElement: Element = {
            ...template,
            id: crypto.randomUUID(),
            position: {
                x: Math.random() * 4 - 2, // Random x between -2 and 2
                y: 0,
                z: Math.random() * 4 - 2, // Random z between -2 and 2
            },
        };
        addElement(newElement);
    };

    return (
        <aside className="w-64 bg-slate-800 border-r border-slate-700 p-4 flex flex-col">
            <h2 className="text-sm font-semibold text-slate-400 uppercase mb-4">
                Elements
            </h2>
            <div className="space-y-2 flex-1">
                {(Object.keys(ELEMENT_TEMPLATES) as ElementType[]).map((type) => (
                    <button
                        key={type}
                        onClick={() => handleAddElement(type)}
                        className="w-full px-4 py-3 bg-slate-700 rounded-lg text-left hover:bg-slate-600 transition-colors capitalize"
                    >
                        + {type}
                    </button>
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
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

    /**
     * Handle save to Firestore
     * WHAT: Saves current floor plan to Firebase
     * WHY: Persist user's work across sessions
     */
    const handleSave = async () => {
        if (!floorPlan) return;

        setIsSaving(true);
        setSaveStatus('idle');

        try {
            // For now, use a demo user ID (would come from auth in production)
            const floorPlanToSave = {
                ...floorPlan,
                userId: 'demo-user',
            };
            await saveFloorPlan(floorPlanToSave);
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
     * Handle load from Firestore
     * WHAT: Loads floor plan by ID from Firebase
     * WHY: Restore previously saved work
     */
    const handleLoad = async () => {
        if (!floorPlan?.id) return;

        try {
            const loaded = await loadFloorPlan(floorPlan.id);
            if (loaded) {
                setFloorPlan(loaded);
                alert('Floor plan loaded successfully!');
            } else {
                alert('No saved floor plan found with this ID');
            }
        } catch (error) {
            console.error('Load failed:', error);
            alert('Failed to load floor plan');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col">
            {/* Header */}
            <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/" className="text-xl font-bold text-blue-400">
                        AccessAI
                    </Link>
                    <span className="text-slate-500">|</span>
                    <span className="text-slate-300">{floorPlan?.name || 'Untitled'}</span>
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

            {/* Main Content */}
            <div className="flex-1 flex">
                {/* Left Sidebar - Element Palette */}
                <ElementPalette />

                {/* 3D Canvas Area */}
                <main className="flex-1">
                    <Canvas3D />
                </main>

                {/* Right Sidebar - Properties */}
                <PropertiesPanel />
            </div>
        </div>
    );
}
