/**
 * Floor Plan Firestore Service
 * ==============================
 * 
 * WHAT THIS FILE DOES:
 * - Save floor plans to Firestore
 * - Load floor plans from Firestore
 * - List user's floor plans
 * 
 * HOW IT WORKS:
 * 1. Converts FloorPlan objects to Firestore-compatible format
 * 2. Stores in 'floorPlans' collection with user ID
 * 3. Provides CRUD operations for floor plans
 */

import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    query,
    where,
    deleteDoc,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import type { FloorPlan } from '../types';

const COLLECTION_NAME = 'floorPlans';

/**
 * Convert Firestore timestamps to Date objects
 */
function convertTimestamps(data: Record<string, unknown>): FloorPlan {
    return {
        ...data,
        createdAt: data.createdAt instanceof Timestamp
            ? data.createdAt.toDate()
            : new Date(data.createdAt as string),
        updatedAt: data.updatedAt instanceof Timestamp
            ? data.updatedAt.toDate()
            : new Date(data.updatedAt as string),
    } as FloorPlan;
}

/**
 * Save a floor plan to Firestore
 * Creates new or updates existing based on ID
 */
export async function saveFloorPlan(floorPlan: FloorPlan): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, floorPlan.id);

    await setDoc(docRef, {
        ...floorPlan,
        updatedAt: serverTimestamp(),
        createdAt: floorPlan.createdAt || serverTimestamp(),
    });
}

/**
 * Load a floor plan by ID
 */
export async function loadFloorPlan(id: string): Promise<FloorPlan | null> {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        return null;
    }

    return convertTimestamps(docSnap.data());
}

/**
 * List all floor plans for a user
 */
export async function listFloorPlans(userId: string): Promise<FloorPlan[]> {
    const q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => convertTimestamps(doc.data()));
}

/**
 * Delete a floor plan
 */
export async function deleteFloorPlan(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
}
