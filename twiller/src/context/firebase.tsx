// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA-uxl5aNJXEVly3Jvu-RClGRKe3XlRXp0",
  authDomain: "twiller-ef0f4.firebaseapp.com",
  projectId: "twiller-ef0f4",
  storageBucket: "twiller-ef0f4.firebasestorage.app",
  messagingSenderId: "533211349682",
  appId: "1:533211349682:web:12eef1c81ffdb536f03fab"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
