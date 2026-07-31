// src/OeKhyeJin/job-management/js/candidates.js
import { auth } from "../../../shared/firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const API_URL = "http://127.0.0.1:8000";
const REFRESH_INTERVAL_MS = 5000;

const STATUS_LABELS = {
  pending: "Pending Review",
  shortlisted: "Shortlisted",
  rejected: "Rejected",
  interview_scheduled: "Interview Scheduled",
};

let applicationsData = [];
let selectedAppId = null;
let currentAppId = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../../LoTzeKhang/user-authentication/login.html";
    return;
  }
  await loadApplications();
  setInterval(loadApplications, REFRESH_INTERVAL_MS);
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "../../LoTzeKhang/user-authentication/login.html";
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    window.location.reload();
  }
});

async function loadApplications() {
  const candidatesList = document.getElementById("candidatesList");

  try {
    const idToken = await auth.currentUser.getIdToken();
    const response = await fetch(`${API_URL}/applications/mine`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });

    if (!response.ok) throw new Error("Failed to load applications");
    applicationsData = await response.json();

    if (applicationsData.length === 0) {
      candidatesList.innerHTML = `<p class="empty-state">No applications yet.</p>`;
      document.getElementById(
        "detailPanel"
      ).innerHTML = `<p class="empty-state">Select a candidate on the left to view details.</p>`;
      return;
    }

    renderCandidateList();

    const stillExists = applicationsData.some(
      (app) => app.id === selectedAppId
    );
    selectCandidate(stillExists ? selectedAppId : applicationsData[0].id);
  } catch (error) {
    candidatesList.innerHTML = `<p class="empty-state">Failed to load applications.</p>`;
    console.error("Load applications error:", error);
  }
}

function renderCandidateList() {
  const candidatesList = document.getElementById("candidatesList");
  candidatesList.innerHTML = applicationsData
    .map((app) => renderCompactCard(app))
    .join("");

  document.querySelectorAll(".job-card-compact").forEach((card) => {
    card.addEventListener("click", () => {
      selectCandidate(card.getAttribute("data-id"));
    });
  });
}

function renderCompactCard(app) {
  const isActive = app.id === selectedAppId ? "active" : "";
  const statusLabel = STATUS_LABELS[app.status] || "Pending";

  return `
    <div class="job-card-compact ${isActive}" data-id="${app.id}">
      <h3>${escapeHtml(app.applicantName)}</h3>
      <div class="job-company">Applied for: ${escapeHtml(app.jobTitle)}</div>
      <div class="job-meta-compact">${escapeHtml(
        app.appliedTimeAgo
      )} · ${statusLabel}</div>
    </div>
  `;
}

function selectCandidate(appId) {
  selectedAppId = appId;
  const app = applicationsData.find((a) => a.id === appId);
  if (!app) return;

  document.querySelectorAll(".job-card-compact").forEach((card) => {
    card.classList.toggle("active", card.getAttribute("data-id") === appId);
  });

  renderDetailPanel(app);
}

function renderDetailPanel(app) {
  const detailPanel = document.getElementById("detailPanel");
  const statusLabel = STATUS_LABELS[app.status] || "Pending Review";

  const interviewInfoHtml =
    app.status === "interview_scheduled"
      ? `
    <div class="detail-section">
      <h3>Interview Details</h3>
      <p>${escapeHtml(app.interviewDate)} at ${escapeHtml(
          app.interviewTime
        )}</p>
      <p>${escapeHtml(app.interviewLocation)}</p>
    </div>
  `
      : "";

  const scheduleButtonHtml =
    app.status === "shortlisted"
      ? `<button class="schedule-btn" data-app-id="${app.id}">Schedule Interview</button>`
      : "";

  detailPanel.innerHTML = `
    <div class="detail-header">
      <div class="detail-header-top">
        <h2>${escapeHtml(app.applicantName)}</h2>
        <span class="status-badge status-${app.status}">${statusLabel}</span>
      </div>
      <div class="detail-company">${escapeHtml(app.applicantEmail)}</div>
    </div>

    <div class="detail-info-list">
      <div class="detail-info-item">Applied for: ${escapeHtml(
        app.jobTitle
      )}</div>
      <div class="detail-info-item">${escapeHtml(app.appliedTimeAgo)}</div>
    </div>

    ${
      app.coverNote
        ? `
    <div class="detail-section">
      <h3>Cover Note</h3>
      <p>${escapeHtml(app.coverNote)}</p>
    </div>
    `
        : ""
    }

    <div class="detail-section">
      <h3>Resume</h3>
      ${
        app.resumeUrl
          ? `<a href="${escapeHtml(
              app.resumeUrl
            )}" target="_blank" rel="noopener noreferrer" class="edit-btn">View Resume</a>`
          : `<p>No resume uploaded</p>`
      }
    </div>

    ${interviewInfoHtml}

    <div class="action-buttons">
      <button class="shortlist-btn" data-app-id="${app.id}">Shortlist</button>
      <button class="reject-btn" data-app-id="${app.id}">Reject</button>
    </div>

    ${scheduleButtonHtml}
  `;

  document.querySelector(".shortlist-btn").addEventListener("click", () => {
    updateStatus(app.id, "shortlisted");
  });
  document.querySelector(".reject-btn").addEventListener("click", () => {
    updateStatus(app.id, "rejected");
  });

  const scheduleBtn = document.querySelector(".schedule-btn");
  if (scheduleBtn) {
    scheduleBtn.addEventListener("click", () => {
      openInterviewModal(app.id);
    });
  }
}

async function updateStatus(applicationId, newStatus) {
  try {
    const idToken = await auth.currentUser.getIdToken();
    const response = await fetch(
      `${API_URL}/applications/${applicationId}/status`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      }
    );

    if (!response.ok) throw new Error("Failed to update status");

    await loadApplications();
  } catch (error) {
    console.error("Update status error:", error);
  }
}

function openInterviewModal(appId) {
  currentAppId = appId;
  document.getElementById("interviewModal").style.display = "flex";
  document.getElementById("interviewForm").reset();
  document.getElementById("interviewStatusMsg").textContent = "";
  ["interviewDate", "interviewTime", "interviewLocation"].forEach((id) => {
    document.getElementById(`${id}Error`).textContent = "";
    document.getElementById(id).classList.remove("invalid");
  });
}

function closeInterviewModal() {
  document.getElementById("interviewModal").style.display = "none";
  currentAppId = null;
}

document
  .getElementById("cancelInterviewBtn")
  .addEventListener("click", closeInterviewModal);

document
  .getElementById("interviewForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const interviewDate = document.getElementById("interviewDate").value;
    const interviewTime = document.getElementById("interviewTime").value;
    const interviewLocation =
      document.getElementById("interviewLocation").value;
    const statusMsg = document.getElementById("interviewStatusMsg");
    statusMsg.textContent = "";
    statusMsg.className = "status";

    let hasError = false;
    ["interviewDate", "interviewTime", "interviewLocation"].forEach((id) => {
      document.getElementById(`${id}Error`).textContent = "";
      document.getElementById(id).classList.remove("invalid");
    });

    if (!interviewDate) {
      document.getElementById("interviewDateError").textContent =
        "This field is required";
      document.getElementById("interviewDate").classList.add("invalid");
      hasError = true;
    }
    if (!interviewTime) {
      document.getElementById("interviewTimeError").textContent =
        "This field is required";
      document.getElementById("interviewTime").classList.add("invalid");
      hasError = true;
    }
    if (!interviewLocation.trim()) {
      document.getElementById("interviewLocationError").textContent =
        "This field is required";
      document.getElementById("interviewLocation").classList.add("invalid");
      hasError = true;
    }

    if (hasError) return;

    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch(
        `${API_URL}/applications/${currentAppId}/schedule-interview`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            interviewDate,
            interviewTime,
            interviewLocation,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(
          err.detail?.errors
            ? "Please check the form"
            : err.detail || "Failed to schedule interview"
        );
      }

      statusMsg.textContent = "Interview scheduled successfully";
      statusMsg.className = "status success";

      setTimeout(async () => {
        closeInterviewModal();
        await loadApplications();
      }, 1000);
    } catch (error) {
      statusMsg.textContent = error.message;
      statusMsg.className = "status error";
      console.error("Schedule interview error:", error);
    }
  });

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}
