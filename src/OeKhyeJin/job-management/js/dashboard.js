// src/OeKhyeJin/job-management/js/dashboard.js
import { auth } from "../../../shared/firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById(
      "welcomeMsg"
    ).textContent = `Welcome, ${user.email}!`;
  } else {
    // Not logged in — redirect to login
    window.location.href = "login.html";
  }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});
