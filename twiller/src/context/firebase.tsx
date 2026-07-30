import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA-uxl5aNJXEVly3Jvu-RClGRKe3XlRXp0",
  authDomain: "twiller-project.firebaseapp.com",
  projectId: "twiller-project",
  storageBucket: "twiller-project.firebasestorage.app",
  messagingSenderId: "533211349682",
  appId: "1:533211349682:web:12eef1c81ffdb536f03fab",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
