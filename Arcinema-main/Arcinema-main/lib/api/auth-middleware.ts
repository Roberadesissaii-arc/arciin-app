// lib/api/auth-middleware.ts
// SECURITY: Proper authentication middleware using Firebase Admin SDK
// This replaces the insecure x-user-email header approach

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminFirestore: Firestore | null = null;

// Initialize Firebase Admin SDK (server-side only)
function getAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  // Check if already initialized
  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    return adminApp;
  }

  // Initialize with service account
  // NOTE: You need to set FIREBASE_ADMIN_SERVICE_ACCOUNT as an environment variable
  // containing the JSON service account key, OR use individual env vars
  const serviceAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT)
    : {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      };

  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    throw new Error('Firebase Admin SDK credentials not configured. Please set FIREBASE_ADMIN_SERVICE_ACCOUNT or individual env vars.');
  }

  adminApp = initializeApp({
    credential: cert(serviceAccount as any),
  });

  return adminApp;
}

function getAdminAuth(): Auth {
  if (adminAuth) {
    return adminAuth;
  }
  adminAuth = getAuth(getAdminApp());
  return adminAuth;
}

function getAdminFirestore(): Firestore {
  if (adminFirestore) {
    return adminFirestore;
  }
  adminFirestore = getFirestore(getAdminApp());
  return adminFirestore;
}

/**
 * Verify Firebase ID token from Authorization header
 * Returns the decoded token with user information
 */
export async function verifyIdToken(request: NextRequest): Promise<{
  uid: string;
  email?: string;
  [key: string]: any;
} | null> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const idToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    
    return decodedToken;
  } catch (error) {
    // Token verification failed
    return null;
  }
}

/**
 * Check if user is admin by checking Firestore user document
 */
export async function isUserAdmin(uid: string): Promise<boolean> {
  try {
    const db = getAdminFirestore();
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return false;
    }
    
    const userData = userDoc.data();
    return userData?.isAdmin === true;
  } catch (error) {
    return false;
  }
}

/**
 * Middleware to require authentication
 * Returns user info if authenticated, null otherwise
 */
export async function requireAuth(request: NextRequest): Promise<{
  uid: string;
  email?: string;
  [key: string]: any;
} | null> {
  const decodedToken = await verifyIdToken(request);
  return decodedToken;
}

/**
 * Middleware to require admin access
 * Returns user info if admin, null otherwise
 */
export async function requireAdmin(request: NextRequest): Promise<{
  uid: string;
  email?: string;
  [key: string]: any;
} | null> {
  const decodedToken = await verifyIdToken(request);
  
  if (!decodedToken) {
    return null;
  }
  
  const isAdmin = await isUserAdmin(decodedToken.uid);
  
  if (!isAdmin) {
    return null;
  }
  
  return decodedToken;
}

/**
 * Create unauthorized response
 */
export function createUnauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Unauthorized - Authentication required' },
    { status: 401 }
  );
}

/**
 * Create forbidden response
 */
export function createForbiddenResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Forbidden - Admin access required' },
    { status: 403 }
  );
}

