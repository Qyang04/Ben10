/**
 * Firebase Service Configuration
 * ================================
 * 
 * WHAT THIS FILE DOES:
 * - Initializes Firebase app with your project credentials
 * - Exports Firebase services (Auth, Firestore, Storage) for use across the app
 * 
 * HOW IT WORKS:
 * 1. Reads config from environment variables (VITE_FIREBASE_*)
 * 2. Initializes Firebase app instance (singleton)
 * 3. Creates service instances that other files can import
 * 
 * USAGE IN OTHER FILES:
 * import { auth, db, storage } from '@/services/firebase';
 * 
 * SETUP REQUIRED:
 * 1. Create a Firebase project at https://console.firebase.google.com
 * 2. Copy config values to .env.local file
 * 3. Enable Auth, Firestore, and Storage in Firebase Console
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration from environment variables
// These values come from Firebase Console > Project Settings > Your Apps
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase (singleton pattern - prevents re-initialization)
// getApps() returns array of initialized apps, if empty we initialize new one
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

/**
 * Firebase Auth - User authentication
 * Used for: Google sign-in, user sessions
 */
export const auth = getAuth(app);

/**
 * Firestore Database - NoSQL document storage
 * Used for: Saving floor plans, analysis results
 */
export const db = getFirestore(app);

/**
 * Firebase Storage - File/blob storage
 * Used for: AR scan uploads, PDF reports
 */
export const storage = getStorage(app);

// Export app instance if needed for advanced use
export { app };
