/**
 * AutoFitCamera Component
 * ========================
 * 
 * WHAT: Automatically positions the camera to frame all elements in the scene.
 * 
 * HOW: Computes bounding box of all scene meshes, calculates optimal camera
 * distance from FOV, animates camera to frame the scene.
 * 
 * WHEN: Frames once when a floor plan is loaded (by id).
 */

import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useFloorPlanStore } from '../../store';

export function AutoFitCamera() {
    const { camera, scene } = useThree();
    const floorPlanId = useFloorPlanStore((state) => state.floorPlan?.id ?? null);
    const lastFittedPlanId = useRef<string | null>(null);

    useEffect(() => {
        // Fit only once per loaded floor plan id.
        if (!floorPlanId) return;
        if (lastFittedPlanId.current === floorPlanId) return;
        lastFittedPlanId.current = floorPlanId;

        // Small delay to let R3F mount scene content after load.
        const timer = setTimeout(() => {
            const roots = [
                scene.getObjectByName('blueprint-3d'),
                scene.getObjectByName('floor-elements-3d'),
            ].filter(Boolean) as THREE.Object3D[];

            if (roots.length === 0) return;

            const box = new THREE.Box3();
            let hasMeshes = false;

            for (const root of roots) {
                root.traverse((child) => {
                    if (!(child as THREE.Mesh).isMesh) return;
                    const mesh = child as THREE.Mesh;
                    if (!mesh.geometry) return;

                    mesh.geometry.computeBoundingBox();
                    if (!mesh.geometry.boundingBox) return;

                    const worldBox = mesh.geometry.boundingBox
                        .clone()
                        .applyMatrix4(mesh.matrixWorld);
                    box.union(worldBox);
                    hasMeshes = true;
                });
            }

            if (!hasMeshes) return;

            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);

            // Calculate distance from FOV so the scene fits in view
            const fov = (camera as THREE.PerspectiveCamera).fov ?? 50;
            const distance = (maxDim / Math.sin((fov * Math.PI) / 360)) * 0.6;
            const minDistance = 8; // Don't zoom too close

            const finalDistance = Math.max(distance, minDistance);

            // Position camera at an elevated angle
            camera.position.set(
                center.x + finalDistance * 0.5,
                center.y + finalDistance * 0.5,
                center.z + finalDistance * 0.5
            );
            camera.lookAt(center);
            camera.updateProjectionMatrix();
        }, 150);

        return () => clearTimeout(timer);
    }, [floorPlanId, camera, scene]);

    return null; // This is a logic-only component
}
