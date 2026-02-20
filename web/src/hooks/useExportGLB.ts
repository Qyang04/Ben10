/**
 * useExportGLB Hook
 * ==================
 * 
 * WHAT: Exports the current 3D scene as a .glb file for sharing/review.
 * 
 * HOW:
 * 1. Clones the scene
 * 2. Strips non-exportable objects (lights, cameras, helpers, ShaderMaterials)
 * 3. Sanitizes remaining materials (removes unsupported textures)
 * 4. Uses three.js GLTFExporter to produce a binary .glb blob
 * 5. Triggers a browser download
 */

import { useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

// ─── Helpers ───────────────────────────────────────────────────────

/**
 * Check if a texture has a valid image source for GLB export.
 * GLTFExporter only accepts: HTMLImageElement, HTMLCanvasElement,
 * ImageBitmap, or OffscreenCanvas.
 */
function isExportableTexture(texture: THREE.Texture | null): boolean {
    if (!texture) return false;
    const src = texture.image;
    if (!src) return false;
    return (
        src instanceof HTMLImageElement ||
        src instanceof HTMLCanvasElement ||
        src instanceof ImageBitmap ||
        (typeof OffscreenCanvas !== 'undefined' && src instanceof OffscreenCanvas)
    );
}

/**
 * Check if a material is exportable by GLTFExporter.
 * Only MeshStandardMaterial and MeshPhysicalMaterial are supported.
 * ShaderMaterial, RawShaderMaterial, etc. are NOT supported.
 */
function isExportableMaterial(mat: THREE.Material): boolean {
    return (
        mat instanceof THREE.MeshStandardMaterial ||
        mat instanceof THREE.MeshPhysicalMaterial ||
        mat instanceof THREE.MeshBasicMaterial ||
        mat instanceof THREE.MeshLambertMaterial ||
        mat instanceof THREE.MeshPhongMaterial
    );
}

/**
 * Check if a mesh should be removed (uses unsupported material).
 */
function hasUnsupportedMaterial(mesh: THREE.Mesh): boolean {
    if (Array.isArray(mesh.material)) {
        return mesh.material.some((m) => !isExportableMaterial(m));
    }
    return !isExportableMaterial(mesh.material);
}

/** All texture map keys on MeshStandardMaterial */
const TEXTURE_KEYS = [
    'map', 'normalMap', 'roughnessMap', 'metalnessMap',
    'aoMap', 'emissiveMap', 'alphaMap', 'bumpMap',
    'displacementMap', 'lightMap', 'envMap',
] as const;

/**
 * Sanitize a material — strip any texture map that uses an
 * unsupported image type (DataTexture, render targets, HDR, etc.)
 */
function sanitizeMaterial(mat: THREE.Material): void {
    const record = mat as unknown as Record<string, unknown>;
    for (const key of TEXTURE_KEYS) {
        const tex = record[key] as THREE.Texture | null | undefined;
        if (tex && !isExportableTexture(tex)) {
            record[key] = null;
            mat.needsUpdate = true;
        }
    }
}

// ─── Scene Preparation ────────────────────────────────────────────

/** Object types to always strip */
const STRIP_TYPES = new Set([
    'AmbientLight', 'DirectionalLight', 'SpotLight', 'PointLight',
    'HemisphereLight', 'RectAreaLight',
    'Camera', 'PerspectiveCamera', 'OrthographicCamera',
    'GridHelper', 'AxesHelper', 'ArrowHelper', 'BoxHelper',
    'Line', 'LineLoop', 'LineSegments',
]);

/**
 * Prepare the scene for GLB export:
 * 1. Removes lights, cameras, helpers
 * 2. Removes meshes with ShaderMaterial (Grid, ContactShadows, Environment sky)
 * 3. Sanitizes remaining materials (strips unsupported textures)
 */
export function prepareSceneForExport(scene: THREE.Object3D): THREE.Object3D {
    const clone = scene.clone(true);
    const toRemove: THREE.Object3D[] = [];

    clone.traverse((child) => {
        // Strip by type
        if (
            STRIP_TYPES.has(child.type) ||
            child instanceof THREE.Light ||
            child instanceof THREE.Camera ||
            child.userData?.isHelper
        ) {
            toRemove.push(child);
            return;
        }

        // Strip meshes with unsupported materials (ShaderMaterial, etc.)
        if (child instanceof THREE.Mesh && hasUnsupportedMaterial(child)) {
            toRemove.push(child);
            return;
        }

        // Sanitize exportable meshes — remove bad textures
        if (child instanceof THREE.Mesh) {
            if (Array.isArray(child.material)) {
                child.material.forEach(sanitizeMaterial);
            } else if (child.material) {
                sanitizeMaterial(child.material);
            }
        }
    });

    for (const obj of toRemove) {
        obj.removeFromParent();
    }

    return clone;
}

// ─── Export Function ──────────────────────────────────────────────

/**
 * Export a scene to GLB binary format.
 * Returns a Blob containing the .glb data.
 */
export async function exportSceneToGLB(scene: THREE.Object3D): Promise<Blob> {
    const exporter = new GLTFExporter();
    const prepared = prepareSceneForExport(scene);
    const options = { binary: true };

    // Use parseAsync (three.js ≥ 0.160)
    if (typeof exporter.parseAsync === 'function') {
        const result = await exporter.parseAsync(prepared, options);
        if (result instanceof ArrayBuffer) {
            return new Blob([result], { type: 'model/gltf-binary' });
        }
        const json = JSON.stringify(result);
        return new Blob([json], { type: 'model/gltf+json' });
    }

    // Fallback: callback-based parse
    return new Promise<Blob>((resolve, reject) => {
        exporter.parse(
            prepared,
            (result) => {
                if (result instanceof ArrayBuffer) {
                    resolve(new Blob([result], { type: 'model/gltf-binary' }));
                } else {
                    const json = JSON.stringify(result);
                    resolve(new Blob([json], { type: 'model/gltf+json' }));
                }
            },
            (error) => reject(error),
            options,
        );
    });
}

// ─── Download ─────────────────────────────────────────────────────

/**
 * Trigger a browser file download from a Blob.
 * Appends an anchor to the DOM and defers cleanup to ensure
 * the browser has time to start the download.
 */
export function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 1000);
}

// ─── Hook ─────────────────────────────────────────────────────────

/**
 * Hook for exporting the current R3F scene as a GLB file.
 * Must be used inside a Canvas component.
 */
export function useExportGLB() {
    const { scene } = useThree();

    const exportGLB = useCallback(async (filename = 'floor-plan.glb') => {
        const blob = await exportSceneToGLB(scene);
        downloadBlob(blob, filename);
        return blob;
    }, [scene]);

    return { exportGLB };
}
