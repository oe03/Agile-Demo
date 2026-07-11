// src/shared/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDdE-5OlrGgVJABCDEYCaOpaXPhkbB76Js",
  authDomain: "job-portal-website-b8493.firebaseapp.com",
  projectId: "job-portal-website-b8493",
  storageBucket: "job-portal-website-b8493.firebasestorage.app",
  messagingSenderId: "81003426824",
  appId: "1:81003426824:web:7629cb194ea681d3540dbd",
  measurementId: "G-9720ZLYS2R",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
