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
      "⚠️ FIREBASE_SERVICE_ACCOUNT_KEY is not set. Auth endpoints (/register, /loggedinuser, etc.) will return 500. Add it to the server environment and redeploy."
    );
    return null;
  }

  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    const cert = admin.credential?.cert ?? admin.cert;
    firebaseApp = admin.initializeApp({
      credential: cert(serviceAccount),
      // Must match src/context/firebase.tsx's storageBucket exactly so
      // getStorage(app).bucket() resolves the same bucket the client uses.
      storageBucket: "twiller-247bf.firebasestorage.app",
    });
  } catch (error) {
    console.error(
      "⚠️ Failed to initialize Firebase Admin SDK. The FIREBASE_SERVICE_ACCOUNT_KEY env var is likely missing or is not a valid single-line JSON (check for line breaks / quotes):",
      error
    );
    return null;
  }

  return firebaseApp;
}

export default getFirebaseAdmin;
