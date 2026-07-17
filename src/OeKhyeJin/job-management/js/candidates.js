import { auth } from "../../../shared/firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const API_URL = "http://127.0.0.1:8000";
const REFRESH_INTERVAL_MS = 5000;

let applicationsData = [];
let selectedAppId = null;

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
  localStorage.clear();
  window.location.href = "../../LoTzeKhang/user-authentication/login.html";
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
  const statusLabel =
    {
      pending: "Pending",
      shortlisted: "Shortlisted",
      rejected: "Rejected",
    }[app.status] || "Pending";

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

  const statusLabel =
    {
      pending: "Pending Review",
      shortlisted: "Shortlisted",
      rejected: "Rejected",
    }[app.status] || "Pending Review";

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

    <div class="action-buttons">
      <button class="shortlist-btn" data-app-id="${app.id}">Shortlist</button>
      <button class="reject-btn" data-app-id="${app.id}">Reject</button>
    </div>
  `;

  document.querySelector(".shortlist-btn").addEventListener("click", () => {
    updateStatus(app.id, "shortlisted");
  });
  document.querySelector(".reject-btn").addEventListener("click", () => {
    updateStatus(app.id, "rejected");
  });
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

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    // Page was restored from bfcache — force a full reload to re-check auth state
    window.location.reload();
  }
});
