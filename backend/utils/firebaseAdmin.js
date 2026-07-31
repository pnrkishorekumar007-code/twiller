import admin from "firebase-admin";

let firebaseApp = null;

function getFirebaseAdmin() {
  if (firebaseApp) return firebaseApp;

  const apps = admin.getApps();
  if (apps.length > 0) {
    firebaseApp = apps[0];
    return firebaseApp;
  }

  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    console.warn(
      "⚠️ FIREBASE_SERVICE_ACCOUNT_KEY is not set. Password reset will be unavailable."
    );
    return null;
  }

  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    const cert = admin.credential?.cert ?? admin.cert;
    firebaseApp = admin.initializeApp({
      credential: cert(serviceAccount),
    });
  } catch (error) {
    console.error("⚠️ Failed to initialize Firebase Admin SDK:", error);
    return null;
  }

  return firebaseApp;
}

export default getFirebaseAdmin;
