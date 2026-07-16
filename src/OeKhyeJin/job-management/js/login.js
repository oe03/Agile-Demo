import { auth } from "../../../shared/firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const API_URL = "http://127.0.0.1:8000";

document.getElementById("togglePassword").addEventListener("click", () => {
  const passwordInput = document.getElementById("password");
  const toggleBtn = document.getElementById("togglePassword");
  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    toggleBtn.textContent = "Hide";
  } else {
    passwordInput.type = "password";
    toggleBtn.textContent = "Show";
  }
});

document.querySelectorAll("input").forEach((input) => {
  input.addEventListener("input", () => {
    input.classList.remove("invalid");
    const errorSpan = document.getElementById(`${input.id}Error`);
    if (errorSpan) errorSpan.textContent = "";
  });
});

function getFriendlyErrorMessage(code) {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later";
    case "auth/invalid-email":
      return "Please enter a valid email address";
    default:
      return "Something went wrong. Please try again";
  }
}

function clearFieldErrors() {
  document.getElementById("emailError").textContent = "";
  document.getElementById("passwordError").textContent = "";
  document.getElementById("email").classList.remove("invalid");
  document.getElementById("password").classList.remove("invalid");
}

function showFieldErrors(errors) {
  if (errors.email) {
    document.getElementById("emailError").textContent = errors.email;
    document.getElementById("email").classList.add("invalid");
  }
  if (errors.password) {
    document.getElementById("passwordError").textContent = errors.password;
    document.getElementById("password").classList.add("invalid");
  }
}

function redirectByRole(role) {
  if (role === "admin") {
    window.location.href = "admin-dashboard.html";
  } else if (role === "employer") {
    window.location.href = "employer-dashboard.html";
  } else {
    window.location.href = "jobseeker-homepage.html";
  }
}

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearFieldErrors();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const errorMsg = document.getElementById("errorMsg");
  errorMsg.textContent = "";

  try {
    // Step 1: Validate via Python backend
    const validateRes = await fetch(`${API_URL}/validate-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const validation = await validateRes.json();

    if (!validation.valid) {
      showFieldErrors(validation.errors);
      return;
    }

    // Step 2: Validation passed — attempt real Firebase login
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const idToken = await userCredential.user.getIdToken();

    // Step 3: Fetch role from backend
    const profileRes = await fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!profileRes.ok) throw new Error("Could not fetch user role");
    const profile = await profileRes.json();

    // Step 4: Redirect based on role
    redirectByRole(profile.role);
  } catch (error) {
    errorMsg.textContent = getFriendlyErrorMessage(error.code);
    console.error("Login error:", error.code, error.message);
  }
});
