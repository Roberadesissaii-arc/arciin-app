import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, serverTimestamp, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase - only initialize if an app hasn't been initialized
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Get Firebase services with new cache configuration
const projectFirestore = getFirestore(app);

// No need for enableIndexedDbPersistence - it's handled automatically with the new API
// The cache is configured when initializing Firestore

const projectAuth = getAuth(app);
const projectStorage = getStorage(app);

// Timestamp
const timestamp = serverTimestamp;

export { 
  projectFirestore, 
  projectAuth, 
  projectStorage, 
  timestamp,
  serverTimestamp 
}; 