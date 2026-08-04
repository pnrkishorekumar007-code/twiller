import admin from "firebase-admin";
import { config } from "@config";

let firebaseApp: admin.app.App | null = null;

export function getFirebaseAdmin(): admin.app.App | null {
  if (firebaseApp) return firebaseApp;

  const apps = admin.getApps();
  if (apps.length > 0) {
    firebaseApp = apps[0];
    return firebaseApp;
  }

  if (!config.FIREBASE_SERVICE_ACCOUNT_KEY) {
    console.warn(
      "⚠️ FIREBASE_SERVICE_ACCOUNT_KEY is not set. Auth endpoints will return 500."
    );
    return null;
  }

  try {
    const serviceAccount = JSON.parse(config.FIREBASE_SERVICE_ACCOUNT_KEY);
    const cert = admin.credential?.cert ?? admin.cert;
    firebaseApp = admin.initializeApp({
      credential: cert(serviceAccount),
      storageBucket: "twiller-project.firebasestorage.app",
    });
  } catch (error) {
    console.error(
      "⚠️ Failed to initialize Firebase Admin SDK:",
      error
    );
    return null;
  }

  return firebaseApp;
}

export function getAuth() {
  const app = getFirebaseAdmin();
  return app ? admin.auth(app) : null;
}

export function getStorage() {
  const app = getFirebaseAdmin();
  return app ? admin.storage(app) : null;
}

export default getFirebaseAdmin;