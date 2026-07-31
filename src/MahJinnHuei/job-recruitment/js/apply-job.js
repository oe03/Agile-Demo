// src/MahJinnHuei/job-recruitment/js/apply-job.js
import { auth } from "../../../shared/firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const API_URL = "http://127.0.0.1:8000";

const urlParams = new URLSearchParams(window.location.search);
const jobId = urlParams.get("jobId");
const companyName = urlParams.get("company") || "";

document.getElementById("jobSubtitle").textContent = companyName;

let hasExistingResume = false;
let existingResumeFilename = "";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../../LoTzeKhang/user-authentication/login.html";
    return;
  }

  try {
    const idToken = await user.getIdToken();
    const response = await fetch(`${API_URL}/jobseeker-profile/resume-info`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (response.ok) {
      const data = await response.json();
      hasExistingResume = data.hasResume;
      existingResumeFilename = data.resumeFilename;

      if (hasExistingResume) {
        showResumeReuseOption();
      }
    }
  } catch (error) {
    console.error("Check existing resume error:", error);
  }
});

function showResumeReuseOption() {
  const uploadBox = document.getElementById("uploadBox");
  const reuseBanner = document.createElement("div");
  reuseBanner.className = "reuse-resume-banner";
  reuseBanner.innerHTML = `
    <p>You have a saved resume: <strong>${escapeHtml(
      existingResumeFilename
    )}</strong></p>
    <button type="button" id="useExistingResumeBtn" class="use-existing-btn">Use this resume</button>
  `;
  uploadBox.parentElement.insertBefore(reuseBanner, uploadBox);

  document
    .getElementById("useExistingResumeBtn")
    .addEventListener("click", () => {
      document.getElementById("uploadText").textContent =
        existingResumeFilename;
      document.getElementById("uploadBox").classList.add("has-file");
      document.getElementById("uploadBox").dataset.useExisting = "true";
      reuseBanner.remove();
    });
}

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "../../LoTzeKhang/user-authentication/login.html";
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    window.location.reload();
  }
});

document.getElementById("contactNumber").addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/[^0-9]/g, "");
});

document.querySelectorAll("input, textarea").forEach((input) => {
  input.addEventListener("input", () => {
    input.classList.remove("invalid");
    const errorSpan = document.getElementById(`${input.id}Error`);
    if (errorSpan) errorSpan.textContent = "";
    if (input.id === "contactNumber") {
      document.getElementById("phoneCodeBox").classList.remove("invalid");
    }
  });
});

const uploadBox = document.getElementById("uploadBox");
const resumeInput = document.getElementById("resumeFile");
const uploadText = document.getElementById("uploadText");

resumeInput.addEventListener("change", () => {
  document.getElementById("resumeFileError").textContent = "";
  uploadBox.classList.remove("invalid");
  uploadBox.dataset.useExisting = "false";

  const file = resumeInput.files[0];
  if (!file) return;

  if (file.type !== "application/pdf") {
    document.getElementById("resumeFileError").textContent =
      "Sorry, this file format is invalid. Please upload a PDF file";
    uploadBox.classList.add("invalid");
    uploadText.textContent = "Click to upload your resume";
    uploadBox.classList.remove("has-file");
    resumeInput.value = "";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    document.getElementById("resumeFileError").textContent =
      "File is too large. Max 5MB";
    uploadBox.classList.add("invalid");
    resumeInput.value = "";
    return;
  }

  uploadText.textContent = file.name;
  uploadBox.classList.add("has-file");
});

const fieldIds = ["fullName", "email", "contactNumber"];

function clearFieldErrors() {
  fieldIds.forEach((id) => {
    document.getElementById(`${id}Error`).textContent = "";
    document.getElementById(id).classList.remove("invalid");
  });
  document.getElementById("phoneCodeBox").classList.remove("invalid");
  document.getElementById("resumeFileError").textContent = "";
  uploadBox.classList.remove("invalid");
}

function showFieldErrors(errors) {
  Object.keys(errors).forEach((field) => {
    const errorEl = document.getElementById(`${field}Error`);
    if (errorEl) errorEl.textContent = errors[field];

    const inputEl = document.getElementById(field);
    if (inputEl) inputEl.classList.add("invalid");

    if (field === "contactNumber") {
      document.getElementById("phoneCodeBox").classList.add("invalid");
    }
    if (field === "resumeFile") {
      uploadBox.classList.add("invalid");
    }
  });
}

document.getElementById("applyForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearFieldErrors();

  const fullName = document.getElementById("fullName").value;
  const email = document.getElementById("email").value;
  const contactNumberDigits = document.getElementById("contactNumber").value;
  const coverNote = document.getElementById("coverNote").value;
  const resumeFile = resumeInput.files[0];
  const usingExisting =
    document.getElementById("uploadBox").dataset.useExisting === "true";
  const statusMsg = document.getElementById("statusMsg");
  statusMsg.textContent = "";
  statusMsg.className = "status";

  if (!resumeFile && !usingExisting) {
    document.getElementById("resumeFileError").textContent =
      "Please upload your resume";
    uploadBox.classList.add("invalid");
  }

  try {
    const validateRes = await fetch(`${API_URL}/validate-application`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        email,
        contactNumber: contactNumberDigits,
      }),
    });
    const validation = await validateRes.json();

    if (!validation.valid || (!resumeFile && !usingExisting)) {
      showFieldErrors(validation.errors || {});
      return;
    }

    const idToken = await auth.currentUser.getIdToken();
    const formData = new FormData();
    formData.append("jobId", jobId);
    formData.append("fullName", fullName);
    formData.append("email", email);
    formData.append("contactNumber", `+60${contactNumberDigits}`);
    formData.append("coverNote", coverNote);

    if (usingExisting) {
      formData.append("useExistingResume", "true");
    } else {
      formData.append("resume", resumeFile);
    }

    const response = await fetch(`${API_URL}/applications`, {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}` },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json();
      if (err.detail && err.detail.errors) {
        showFieldErrors(err.detail.errors);
        return;
      }
      throw new Error(err.detail || "Failed to submit application");
    }

    statusMsg.textContent = "Application submitted successfully";
    statusMsg.className = "status success";
    setTimeout(() => {
      window.location.href = "job-listings.html";
    }, 1500);
  } catch (error) {
    statusMsg.textContent = error.message;
    statusMsg.className = "status error";
    console.error("Apply error:", error);
  }
});

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}
