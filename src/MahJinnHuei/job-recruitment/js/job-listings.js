import { auth } from "../../../shared/firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const API_URL = "http://127.0.0.1:8000";

const JOB_TYPE_LABELS = {
  fulltime: "Full time",
  parttime: "Part time",
  internship: "Internship",
};

let jobsData = [];
let selectedJobId = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../../LoTzeKhang/user-authentication/login.html";
    return;
  }
  await loadJobs();
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  localStorage.clear();
  window.location.href = "../../LoTzeKhang/user-authentication/login.html";
});

async function loadJobs() {
  const jobsList = document.getElementById("jobsList");

  try {
    const response = await fetch(`${API_URL}/jobs`);
    if (!response.ok) throw new Error("Failed to load jobs");
    jobsData = await response.json();

    if (jobsData.length === 0) {
      jobsList.innerHTML = `<p class="empty-state">No jobs available right now.</p>`;
      return;
    }

    renderJobList();
    selectJob(jobsData[0].id);
  } catch (error) {
    jobsList.innerHTML = `<p class="empty-state">Failed to load jobs.</p>`;
    console.error("Load jobs error:", error);
  }
}

function renderJobList() {
  const jobsList = document.getElementById("jobsList");
  jobsList.innerHTML = jobsData.map((job) => renderCompactCard(job)).join("");

  document.querySelectorAll(".job-card-compact").forEach((card) => {
    card.addEventListener("click", () => {
      selectJob(card.getAttribute("data-id"));
    });
  });
}

function renderCompactCard(job) {
  const isActive = job.id === selectedJobId ? "active" : "";
  return `
    <div class="job-card-compact ${isActive}" data-id="${job.id}">
      <h3>${escapeHtml(job.title)}</h3>
      <div class="job-company">${escapeHtml(job.companyName)}</div>
      <div class="job-meta-compact">${escapeHtml(job.location)}</div>
      <div class="job-salary-compact">${escapeHtml(job.salary)}</div>
      <div class="posted-time">${escapeHtml(job.postedTimeAgo)}</div>
    </div>
  `;
}

function selectJob(jobId) {
  selectedJobId = jobId;
  const job = jobsData.find((j) => j.id === jobId);
  if (!job) return;

  document.querySelectorAll(".job-card-compact").forEach((card) => {
    card.classList.toggle("active", card.getAttribute("data-id") === jobId);
  });

  renderDetailPanel(job);
}

function renderDetailPanel(job) {
  const detailPanel = document.getElementById("detailPanel");
  const skillsHtml = (job.skills || [])
    .map((skill) => `<span class="skill-tag">${escapeHtml(skill)}</span>`)
    .join("");
  const jobTypeLabel = JOB_TYPE_LABELS[job.jobType] || job.jobType || "";

  detailPanel.innerHTML = `
      <div class="detail-header">
        <h2>${escapeHtml(job.title)}</h2>
        <div class="detail-company">${escapeHtml(job.companyName)}</div>
      </div>
  
      <div class="detail-info-list">
        <div class="detail-info-item">${escapeHtml(job.location)}</div>
        <div class="detail-info-item">${escapeHtml(jobTypeLabel)}</div>
        <div class="detail-info-item detail-salary">${escapeHtml(
          job.salary
        )} per month</div>
      </div>
  
      <div class="detail-posted posted-time">${escapeHtml(
        job.postedTimeAgo
      )}</div>
  
      <div class="detail-section">
        <h3>Job Description</h3>
        <p>${escapeHtml(job.description)}</p>
      </div>
  
      <div class="detail-section">
        <h3>Required Skills</h3>
        <div class="job-skills">${skillsHtml}</div>
      </div>
  
      <a href="apply-job.html?jobId=${escapeHtml(
        job.id
      )}&title=${encodeURIComponent(job.title)}&company=${encodeURIComponent(
    job.companyName
  )}" class="apply-btn">
        Apply
      </a>
    `;
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
