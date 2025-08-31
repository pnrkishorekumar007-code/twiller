
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDrTpShJJmZUcxiHZ9o0m9ckctDFdL2VtM",
  authDomain: "twiller-13163.firebaseapp.com",
  projectId: "twiller-13163",
  storageBucket: "twiller-13163.firebasestorage.app",
  messagingSenderId: "1018495859922",
  appId: "1:1018495859922:web:bfc66538ba8433b5cc810b",
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
