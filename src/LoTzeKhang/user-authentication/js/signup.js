import { auth } from "../../../shared/firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

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

// Restrict contact number field to digits only
document.getElementById("contactNumber").addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/[^0-9]/g, "");
});

// Clear field errors as user types/selects
document.querySelectorAll("input, select").forEach((input) => {
  input.addEventListener("input", () => {
    input.classList.remove("invalid");
    const errorSpan = document.getElementById(`${input.id}Error`);
    if (errorSpan) errorSpan.textContent = "";

    const labelEl = document.querySelector(`label[for="${input.id}"]`);
    if (labelEl) labelEl.classList.remove("invalid");

    if (input.id === "contactNumber") {
      document.getElementById("phoneCodeBox").classList.remove("invalid");
    }
  });
});

function clearFieldErrors() {
  ["fullName", "email", "contactNumber", "password", "role"].forEach((id) => {
    document.getElementById(`${id}Error`).textContent = "";
    document.getElementById(id).classList.remove("invalid");
    const labelEl = document.querySelector(`label[for="${id}"]`);
    if (labelEl) labelEl.classList.remove("invalid");
  });
  document.getElementById("phoneCodeBox").classList.remove("invalid");
}

function showFieldErrors(errors) {
  Object.keys(errors).forEach((field) => {
    const errorEl = document.getElementById(`${field}Error`);
    const inputEl = document.getElementById(field);
    if (errorEl) errorEl.textContent = errors[field];
    if (inputEl) inputEl.classList.add("invalid");

    const labelEl = document.querySelector(`label[for="${field}"]`);
    if (labelEl) labelEl.classList.add("invalid");

    if (field === "contactNumber") {
      document.getElementById("phoneCodeBox").classList.add("invalid");
    }
  });
}

// Maps raw Firebase error codes to friendly, user-facing messages
function getFriendlyErrorMessage(code) {
  switch (code) {
    case "auth/email-already-in-use":
      return "Email address is taken. Please try another.";
    case "auth/invalid-email":
      return "Please enter a valid email address";
    case "auth/weak-password":
      return "Password is too weak. Please choose a stronger one.";
    default:
      return "Something went wrong. Please try again";
  }
}

document.getElementById("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearFieldErrors();

  const fullName = document.getElementById("fullName").value;
  const email = document.getElementById("email").value;
  const contactNumberDigits = document.getElementById("contactNumber").value;
  const contactNumber = `+60${contactNumberDigits}`;
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value;
  const errorMsg = document.getElementById("errorMsg");
  errorMsg.textContent = "";

  try {
    // Step 1: Validate via Python backend
    const validateRes = await fetch(`${API_URL}/validate-signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        email,
        contactNumber: contactNumberDigits,
        password,
        role,
      }),
    });
    const validation = await validateRes.json();

    if (!validation.valid) {
      showFieldErrors(validation.errors);
      return;
    }

    // Step 2: Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const idToken = await userCredential.user.getIdToken();

    // Step 3: Save profile via backend
    const response = await fetch(`${API_URL}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ fullName, contactNumber, role }),
    });

    if (!response.ok) throw new Error("Failed to save profile");

    // Step 4: Sign out immediately, redirect to login page
    await signOut(auth);
    window.location.href = "login.html?signup=success";
  } catch (error) {
    console.error("Signup error:", error.code, error.message);

    if (error.code === "auth/email-already-in-use") {
      // Show under the email field specifically, like other validation errors
      document.getElementById("emailError").textContent =
        getFriendlyErrorMessage(error.code);
      document.getElementById("email").classList.add("invalid");
      const emailLabel = document.querySelector('label[for="email"]');
      if (emailLabel) emailLabel.classList.add("invalid");
    } else {
      errorMsg.textContent = getFriendlyErrorMessage(error.code);
    }
  }
});
