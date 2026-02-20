/**
 * ExportButton Component
 * =======================
 * 
 * WHAT: A button that exports the current 3D scene as a .glb file.
 * 
 * ARCHITECTURE:
 * - SceneExporter: A tiny invisible R3F component that lives inside
 *   the Canvas and exposes the export function via a callback ref.
 * - ExportButton: A standard DOM button rendered OUTSIDE the Canvas
 *   as a positioned overlay. Receives the export function from the ref.
 *
 * This two-part design avoids using drei's <Html> component (which
 * caused the button to render at world-origin on the floor plane).
 */

import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { exportSceneToGLB, downloadBlob } from '../../hooks/useExportGLB';

// ─── SceneExporter (lives INSIDE the Canvas) ───────────────────────

interface SceneExporterProps {
    /** Callback to register the export function with the parent */
    onReady: (exportFn: (filename: string) => Promise<void>) => void;
}

/**
 * Invisible R3F component that exposes a scene export function.
 * Must be rendered inside a <Canvas>.
 */
export function SceneExporter({ onReady }: SceneExporterProps) {
    const { scene } = useThree();

    useEffect(() => {
        const exportFn = async (filename: string) => {
            const blob = await exportSceneToGLB(scene);
            downloadBlob(blob, filename);
        };
        onReady(exportFn);
    }, [scene, onReady]);

    return null; // Renders nothing — just provides the export function
}

// ─── ExportButtonUI (lives OUTSIDE the Canvas) ─────────────────────

/**
 * ExportButtonUI — The visible button element.
 * Render this as a DOM overlay outside the Canvas.
 */
export function ExportButtonUI({
    exporting,
    onExport,
}: {
    exporting: boolean;
    onExport: () => void;
}) {
    return (
        <button
            onClick={onExport}
            disabled={exporting}
            style={{
                position: 'absolute',
                bottom: 16,
                right: 16,
                zIndex: 20,
                background: exporting ? '#475569' : '#334155',
                color: 'white',
                border: '1px solid #475569',
                padding: '8px 16px',
                borderRadius: 8,
                cursor: exporting ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
            }}
        >
            {exporting ? '⏳ Exporting...' : '📦 Export GLB'}
        </button>
    );
}
