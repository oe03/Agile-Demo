// src/LoTzeKhang/user-authentication/js/profile.js
import { auth } from "../../../shared/firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
  updatePassword,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const API_URL = "http://127.0.0.1:8000";
let originalFullName = "";
let originalContactDigits = "";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../../OeKhyeJin/job-management/login.html";
    return;
  }

  document.getElementById("email").value = user.email;

  try {
    const idToken = await user.getIdToken();
    const response = await fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!response.ok) throw new Error("Failed to load profile");
    const profile = await response.json();

    originalFullName = profile.fullName || "";
    originalContactDigits = (profile.contactNumber || "")
      .replace(/[^0-9]/g, "")
      .replace(/^60/, "");

    document.getElementById("fullName").value = originalFullName;
    document.getElementById("contactNumber").value = originalContactDigits;

    document
      .querySelectorAll("input")
      .forEach((el) => el.dispatchEvent(new Event("input")));
  } catch (error) {
    console.error("Load profile error:", error);
  }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  localStorage.clear();
  window.location.href = "../../OeKhyeJin/job-management/login.html";
});

document.getElementById("contactNumber").addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/[^0-9]/g, "");
});

document.querySelectorAll("input").forEach((input) => {
  input.addEventListener("input", () => {
    input.classList.remove("invalid");
    const errorSpan = document.getElementById(`${input.id}Error`);
    if (errorSpan) errorSpan.textContent = "";
    if (input.id === "contactNumber") {
      document.getElementById("phoneCodeBox").classList.remove("invalid");
    }
  });
});

function setupPasswordToggle(inputId, buttonId) {
  document.getElementById(buttonId).addEventListener("click", () => {
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);
    if (input.type === "password") {
      input.type = "text";
      button.textContent = "Hide";
    } else {
      input.type = "password";
      button.textContent = "Show";
    }
  });
}

setupPasswordToggle("newPassword", "toggleNewPassword");
setupPasswordToggle("confirmPassword", "toggleConfirmPassword");

function clearErrors() {
  ["fullName", "contactNumber", "newPassword", "confirmPassword"].forEach(
    (id) => {
      document.getElementById(`${id}Error`).textContent = "";
      document.getElementById(id).classList.remove("invalid");
    }
  );
  document.getElementById("phoneCodeBox").classList.remove("invalid");
}

document.getElementById("profileForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearErrors();

  const fullName = document.getElementById("fullName").value;
  const contactNumberDigits = document.getElementById("contactNumber").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const statusMsg = document.getElementById("statusMsg");
  statusMsg.textContent = "";
  statusMsg.className = "status";

  let hasError = false;

  const wantsPasswordChange = newPassword.trim() || confirmPassword.trim();
  if (wantsPasswordChange) {
    if (!newPassword.trim()) {
      document.getElementById("newPasswordError").textContent =
        "This field is required";
      document.getElementById("newPassword").classList.add("invalid");
      hasError = true;
    } else if (newPassword.length < 6) {
      document.getElementById("newPasswordError").textContent =
        "Password must be at least 6 characters";
      document.getElementById("newPassword").classList.add("invalid");
      hasError = true;
    }

    if (!confirmPassword.trim()) {
      document.getElementById("confirmPasswordError").textContent =
        "This field is required";
      document.getElementById("confirmPassword").classList.add("invalid");
      hasError = true;
    } else if (newPassword && confirmPassword !== newPassword) {
      document.getElementById("confirmPasswordError").textContent =
        "Passwords do not match";
      document.getElementById("confirmPassword").classList.add("invalid");
      hasError = true;
    }
  }

  try {
    const validateRes = await fetch(`${API_URL}/validate-profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, contactNumber: contactNumberDigits }),
    });
    const validation = await validateRes.json();

    if (!validation.valid) {
      Object.keys(validation.errors).forEach((field) => {
        document.getElementById(`${field}Error`).textContent =
          validation.errors[field];
        document.getElementById(field).classList.add("invalid");
        if (field === "contactNumber") {
          document.getElementById("phoneCodeBox").classList.add("invalid");
        }
      });
      hasError = true;
    }

    if (hasError) return;

    const changedFullName = fullName !== originalFullName;
    const changedContact = contactNumberDigits !== originalContactDigits;
    const changedPassword = Boolean(newPassword);

    if (!changedFullName && !changedContact && !changedPassword) {
      statusMsg.textContent = "No changes to save";
      statusMsg.className = "status";
      return;
    }

    if (changedFullName || changedContact) {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch(`${API_URL}/users/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          fullName,
          contactNumber: `+60${contactNumberDigits}`,
        }),
      });
      if (!response.ok) throw new Error("Failed to update profile");

      originalFullName = fullName;
      originalContactDigits = contactNumberDigits;
    }

    if (changedPassword) {
      try {
        await updatePassword(auth.currentUser, newPassword);
      } catch (error) {
        if (error.code === "auth/requires-recent-login") {
          statusMsg.textContent =
            "Please log out and log in again before changing your password";
          statusMsg.className = "status error";
          return;
        }
        throw error;
      }
      document.getElementById("newPassword").value = "";
      document.getElementById("confirmPassword").value = "";
    }

    const changedCount = [
      changedFullName,
      changedContact,
      changedPassword,
    ].filter(Boolean).length;

    if (changedCount > 1) {
      statusMsg.textContent = "Profile updated successfully";
    } else if (changedFullName) {
      statusMsg.textContent = "Full name updated successfully";
    } else if (changedContact) {
      statusMsg.textContent = "Contact number updated successfully";
    } else if (changedPassword) {
      statusMsg.textContent = "Password updated successfully";
    }

    statusMsg.className = "status success";
  } catch (error) {
    statusMsg.textContent = "Something went wrong. Please try again";
    statusMsg.className = "status error";
    console.error("Update profile error:", error);
  }
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    // Page was restored from bfcache — force a full reload to re-check auth state
    window.location.reload();
  }
});
