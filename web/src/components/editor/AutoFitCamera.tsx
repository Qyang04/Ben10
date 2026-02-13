/**
 * AutoFitCamera Component
 * ========================
 * 
 * WHAT: Automatically positions the camera to frame all elements in the scene.
 * 
 * HOW: Computes bounding box of all scene meshes, calculates optimal camera
 * distance from FOV, animates camera to frame the scene.
 * 
 * WHEN: Re-frames on element count change (add/remove).
 */

import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useFloorPlanStore } from '../../store';

export function AutoFitCamera() {
    const { camera, scene } = useThree();
    const elementCount = useFloorPlanStore(
        (state) => state.floorPlan?.elements.length ?? 0
    );
    const lastCount = useRef(elementCount);

    useEffect(() => {
        // Only refit when element count changes (add/remove)
        if (elementCount === lastCount.current && elementCount > 0) return;
        lastCount.current = elementCount;

        // Skip if no elements — keep the default camera position
        if (elementCount === 0) return;

        // Small delay to let R3F render the new element
        const timer = setTimeout(() => {
            const box = new THREE.Box3();
            let hasMeshes = false;

            scene.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    const mesh = child as THREE.Mesh;
                    if (mesh.geometry) {
                        mesh.geometry.computeBoundingBox();
                        if (mesh.geometry.boundingBox) {
                            const worldBox = mesh.geometry.boundingBox
                                .clone()
                                .applyMatrix4(mesh.matrixWorld);
                            box.union(worldBox);
                            hasMeshes = true;
                        }
                    }
                }
            });

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
        }, 100);

        return () => clearTimeout(timer);
    }, [elementCount, camera, scene]);

    return null; // This is a logic-only component
}
