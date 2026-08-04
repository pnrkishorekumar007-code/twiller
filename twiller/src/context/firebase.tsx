import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

function getFirebaseConfig() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    return null;
  }
  return {
    apiKey,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

let app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;
let _phoneAuth: Auth | null = null;

function ensureFirebaseInitialized() {
  if (app) return;
  const config = getFirebaseConfig();
  if (!config) {
    // During build or if env not set - create dummy exports that throw on use
    const err = new Error("Firebase not configured: set NEXT_PUBLIC_FIREBASE_API_KEY etc. in .env.local");
    const throwingProxy = new Proxy({}, {
      get() { throw err; }
    });
    _auth = throwingProxy as unknown as Auth;
    _db = throwingProxy as unknown as Firestore;
    _storage = throwingProxy as unknown as FirebaseStorage;
    _phoneAuth = throwingProxy as unknown as Auth;
    return;
  }
  app = getApps().length ? getApps()[0] : initializeApp(config);
  _auth = getAuth(app);
  _db = getFirestore(app);
  _storage = getStorage(app);
  _phoneAuth = getAuth(initializeApp(app.options, "phone-verifier"));
}

// Initialize immediately (will be no-op if config missing)
ensureFirebaseInitialized();

// Export as non-null - they'll throw at runtime if not initialized
export const auth: Auth = _auth!;
export const db: Firestore = _db!;
export const storage: FirebaseStorage = _storage!;
export const phoneAuth: Auth = _phoneAuth!;
export default app;
