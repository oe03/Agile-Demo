// src/LoTzeKhang/user-authentication/js/professional-profile.js
import { auth } from "../../../shared/firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const API_URL = "http://127.0.0.1:8000";
let educationCount = 0;
let experienceCount = 0;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  await loadProfile();
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    window.location.reload();
  }
});

async function loadProfile() {
  try {
    const idToken = await auth.currentUser.getIdToken();
    const response = await fetch(`${API_URL}/jobseeker-profile/mine`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!response.ok) throw new Error("Failed to load profile");
    const profile = await response.json();

    document.getElementById("summary").value = profile.summary || "";
    document.getElementById("skills").value = profile.skills || "";

    (profile.education || []).forEach((entry) => addEducationRow(entry));
    (profile.workExperience || []).forEach((entry) => addExperienceRow(entry));

    if (profile.resumeUrl) {
      document.getElementById(
        "currentResumeInfo"
      ).innerHTML = `Current resume: <a href="${
        profile.resumeUrl
      }" target="_blank" rel="noopener noreferrer">${escapeHtml(
        profile.resumeFilename || "View Resume"
      )}</a>`;
    }

    document
      .querySelectorAll("input, textarea")
      .forEach((el) => el.dispatchEvent(new Event("input")));
  } catch (error) {
    console.error("Load profile error:", error);
  }
}

function addEducationRow(data = {}) {
  const id = educationCount++;
  const container = document.getElementById("educationList");
  const row = document.createElement("div");
  row.className = "entry-card";
  row.dataset.entryId = id;
  row.innerHTML = `
    <button type="button" class="remove-entry-btn" data-remove-education="${id}">Remove</button>
    <div class="entry-card-grid">
      <div class="entry-field">
        <label>Institution</label>
        <input type="text" class="edu-institution" value="${escapeAttr(
          data.institution
        )}" />
      </div>
      <div class="entry-field">
        <label>Qualification</label>
        <input type="text" class="edu-qualification" value="${escapeAttr(
          data.qualification
        )}" />
      </div>
      <div class="entry-field">
        <label>Field of Study</label>
        <input type="text" class="edu-field" value="${escapeAttr(
          data.fieldOfStudy
        )}" />
      </div>
      <div class="entry-field">
        <label>Graduation Year</label>
        <input type="text" class="edu-year" value="${escapeAttr(
          data.graduationYear
        )}" />
      </div>
    </div>
  `;
  container.appendChild(row);

  row
    .querySelector(`[data-remove-education="${id}"]`)
    .addEventListener("click", () => {
      row.remove();
    });
}

function addExperienceRow(data = {}) {
  const id = experienceCount++;
  const container = document.getElementById("workExperienceList");
  const row = document.createElement("div");
  row.className = "entry-card";
  row.dataset.entryId = id;
  row.innerHTML = `
    <button type="button" class="remove-entry-btn" data-remove-experience="${id}">Remove</button>
    <div class="entry-card-grid">
      <div class="entry-field">
        <label>Company</label>
        <input type="text" class="exp-company" value="${escapeAttr(
          data.company
        )}" />
      </div>
      <div class="entry-field">
        <label>Position</label>
        <input type="text" class="exp-position" value="${escapeAttr(
          data.position
        )}" />
      </div>
      <div class="entry-field">
        <label>Start Date</label>
        <input type="text" class="exp-start" placeholder="e.g. Jan 2022" value="${escapeAttr(
          data.startDate
        )}" />
      </div>
      <div class="entry-field">
        <label>End Date</label>
        <input type="text" class="exp-end" placeholder="e.g. Present" value="${escapeAttr(
          data.endDate
        )}" />
      </div>
    </div>
    <div class="entry-field">
      <label>Description</label>
      <textarea class="exp-description" rows="2">${escapeHtml(
        data.description || ""
      )}</textarea>
    </div>
  `;
  container.appendChild(row);

  row
    .querySelector(`[data-remove-experience="${id}"]`)
    .addEventListener("click", () => {
      row.remove();
    });
}

document
  .getElementById("addEducationBtn")
  .addEventListener("click", () => addEducationRow());
document
  .getElementById("addExperienceBtn")
  .addEventListener("click", () => addExperienceRow());

document.querySelectorAll("input, textarea").forEach((input) => {
  input.addEventListener("input", () => {
    input.classList.remove("invalid");
    const errorSpan = document.getElementById(`${input.id}Error`);
    if (errorSpan) errorSpan.textContent = "";
  });
});

// --- Resume upload (uploads immediately on file selection) ---
const uploadBox = document.getElementById("uploadBox");
const resumeInput = document.getElementById("resumeFile");
const uploadText = document.getElementById("uploadText");

resumeInput.addEventListener("change", async () => {
  document.getElementById("resumeFileError").textContent = "";
  uploadBox.classList.remove("invalid");

  const file = resumeInput.files[0];
  if (!file) return;

  if (file.type !== "application/pdf") {
    document.getElementById("resumeFileError").textContent =
      "Sorry, this file format is invalid. Please upload a PDF file";
    uploadBox.classList.add("invalid");
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

  uploadText.textContent = "Uploading...";

  try {
    const idToken = await auth.currentUser.getIdToken();
    const formData = new FormData();
    formData.append("resume", file);

    const response = await fetch(`${API_URL}/jobseeker-profile/resume`, {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}` },
      body: formData,
    });

    if (!response.ok) throw new Error("Failed to upload resume");
    const result = await response.json();

    uploadText.textContent = "Click to upload your resume";
    document.getElementById(
      "currentResumeInfo"
    ).innerHTML = `Current resume: <a href="${
      result.resumeUrl
    }" target="_blank" rel="noopener noreferrer">${escapeHtml(
      result.resumeFilename
    )}</a>`;
  } catch (error) {
    document.getElementById("resumeFileError").textContent =
      "Failed to upload resume. Please try again";
    uploadBox.classList.add("invalid");
    uploadText.textContent = "Click to upload your resume";
    console.error("Resume upload error:", error);
  }
});

// --- Save profile fields (summary, education, experience, skills) ---
document
  .getElementById("professionalProfileForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const summary = document.getElementById("summary").value;
    const skills = document.getElementById("skills").value;
    const statusMsg = document.getElementById("statusMsg");
    statusMsg.textContent = "";
    statusMsg.className = "status";

    document.getElementById("summaryError").textContent = "";
    document.getElementById("skillsError").textContent = "";
    document.getElementById("summary").classList.remove("invalid");
    document.getElementById("skills").classList.remove("invalid");

    const education = Array.from(
      document.querySelectorAll("#educationList .entry-card")
    ).map((row) => ({
      institution: row.querySelector(".edu-institution").value,
      qualification: row.querySelector(".edu-qualification").value,
      fieldOfStudy: row.querySelector(".edu-field").value,
      graduationYear: row.querySelector(".edu-year").value,
    }));

    const workExperience = Array.from(
      document.querySelectorAll("#workExperienceList .entry-card")
    ).map((row) => ({
      company: row.querySelector(".exp-company").value,
      position: row.querySelector(".exp-position").value,
      startDate: row.querySelector(".exp-start").value,
      endDate: row.querySelector(".exp-end").value,
      description: row.querySelector(".exp-description").value,
    }));

    try {
      const validateRes = await fetch(
        `${API_URL}/validate-professional-profile`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ summary, skills }),
        }
      );
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
      const response = await fetch(`${API_URL}/jobseeker-profile/mine`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ summary, education, workExperience, skills }),
      });

      if (!response.ok) throw new Error("Failed to update profile");

      statusMsg.textContent = "Professional profile updated successfully";
      statusMsg.className = "status success";
    } catch (error) {
      statusMsg.textContent = "Something went wrong. Please try again";
      statusMsg.className = "status error";
      console.error("Update profile error:", error);
    }
  });

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

function escapeAttr(text) {
  return escapeHtml(text ?? "").replace(/"/g, "&quot;");
}
