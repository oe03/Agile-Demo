// src/OeKhyeJin/job-management/js/company-profile.js
import { auth } from "../../../shared/firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const API_URL = "http://127.0.0.1:8000";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../../LoTzeKhang/user-authentication/login.html";
    return;
  }

  try {
    const idToken = await user.getIdToken();
    const response = await fetch(`${API_URL}/company/mine`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!response.ok) throw new Error("Failed to load company profile");
    const profile = await response.json();

    document.getElementById("companyDescription").value =
      profile.companyDescription || "";
    document.getElementById("companyLocation").value =
      profile.companyLocation || "";
    document.getElementById("companyContact").value =
      profile.companyContact || "";

    document
      .querySelectorAll("input, textarea")
      .forEach((el) => el.dispatchEvent(new Event("input")));
  } catch (error) {
    console.error("Load company profile error:", error);
  }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "../../LoTzeKhang/user-authentication/login.html";
});

document.querySelectorAll("input, textarea").forEach((input) => {
  input.addEventListener("input", () => {
    input.classList.remove("invalid");
    const errorSpan = document.getElementById(`${input.id}Error`);
    if (errorSpan) errorSpan.textContent = "";
  });
});

document
  .getElementById("companyProfileForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const companyDescription =
      document.getElementById("companyDescription").value;
    const companyLocation = document.getElementById("companyLocation").value;
    const companyContact = document.getElementById("companyContact").value;
    const statusMsg = document.getElementById("statusMsg");
    statusMsg.textContent = "";
    statusMsg.className = "status";

    ["companyDescription", "companyLocation", "companyContact"].forEach(
      (id) => {
        document.getElementById(`${id}Error`).textContent = "";
        document.getElementById(id).classList.remove("invalid");
      }
    );

    try {
      const validateRes = await fetch(`${API_URL}/validate-company-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyDescription,
          companyLocation,
          companyContact,
        }),
      });
      const validation = await validateRes.json();

      if (!validation.valid) {
        Object.keys(validation.errors).forEach((field) => {
          document.getElementById(`${field}Error`).textContent =
            validation.errors[field];
          document.getElementById(field).classList.add("invalid");
        });
        return;
      }

      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch(`${API_URL}/company/mine`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          companyDescription,
          companyLocation,
          companyContact,
        }),
      });

      if (!response.ok) throw new Error("Failed to update company profile");

      statusMsg.textContent = "Company profile updated successfully";
      statusMsg.className = "status success";
    } catch (error) {
      statusMsg.textContent = "Something went wrong. Please try again";
      statusMsg.className = "status error";
      console.error("Update company profile error:", error);
    }
  });

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    window.location.reload();
  }
});
