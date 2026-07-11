// src/OeKhyeJin/job-management/js/test-connection.js
import { auth, db } from "../../../shared/firebase-config.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  collection,
  addDoc,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

console.log("Firebase auth object:", auth);
console.log("Firebase db object:", db);

// Test button handlers
document.getElementById("testAuthBtn").addEventListener("click", async () => {
  try {
    const result = await createUserWithEmailAndPassword(
      auth,
      "test@example.com",
      "test123456"
    );
    console.log("Auth working! User created:", result.user.uid);
  } catch (error) {
    console.error("Auth error:", error.code, error.message);
  }
});

document
  .getElementById("testFirestoreBtn")
  .addEventListener("click", async () => {
    try {
      const docRef = await addDoc(collection(db, "jobs"), {
        title: "Test Job",
        company: "Test Co",
        createdAt: new Date(),
      });
      console.log("Firestore working! Document written with ID:", docRef.id);
    } catch (error) {
      console.error("Firestore error:", error.code, error.message);
    }
  });
