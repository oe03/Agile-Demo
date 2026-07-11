// src/OeKhyeJin/job-management/js/signup.js
import { auth, db } from "../../../shared/firebase-config.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  doc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

document.getElementById("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value;
  const errorMsg = document.getElementById("errorMsg");

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Save extra profile info (role) in Firestore, linked by uid
    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
      role: role,
      createdAt: new Date(),
    });

    window.location.href = "dashboard.html";
  } catch (error) {
    errorMsg.textContent = error.message;
    console.error("Signup error:", error.code, error.message);
  }
});
