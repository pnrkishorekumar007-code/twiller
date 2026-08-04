import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDZVBo7ytlMi3rePajuUjyKLrmnbOV3LFw",
  authDomain: "twiller-247bf.firebaseapp.com",
  projectId: "twiller-247bf",
  storageBucket: "twiller-247bf.firebasestorage.app",
  messagingSenderId: "951309643548",
  appId: "1:951309643548:web:bee5f2562ff2208b3694d9",
  measurementId: "G-9EGSK4T81Y",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Analytics is browser-only; guard so SSR / Node build does not crash.
if (typeof window !== "undefined") {
  isSupported().then((ok) => {
    if (ok) getAnalytics(app);
  });
}

// Dedicated app + auth for Firebase Phone Auth (language-change SMS OTP).
// signInWithPhoneNumber signs in a *phone* user; running it on a separate Auth
// instance keeps the user's normal email/password session on `auth` untouched.
export const phoneAuth = getAuth(initializeApp(app.options, "phone-verifier"));
export default app;
