import { auth } from "../../../shared/firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const API_URL = "http://127.0.0.1:8000";
const REFRESH_INTERVAL_MS = 5000;

const JOB_TYPE_LABELS = {
  fulltime: "Full time",
  parttime: "Part time",
  internship: "Internship",
};

let jobsData = [];
let selectedJobId = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  document.getElementById("welcomeMsg").textContent = `Welcome, ${user.email}`;
  await loadMyJobs();
  setInterval(loadMyJobs, REFRESH_INTERVAL_MS);
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

async function loadMyJobs() {
  const jobsList = document.getElementById("jobsList");

  try {
    const idToken = await auth.currentUser.getIdToken();
    const response = await fetch(`${API_URL}/jobs/mine`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });

    if (!response.ok) throw new Error("Failed to load jobs");
    jobsData = await response.json();

    if (jobsData.length === 0) {
      jobsList.innerHTML = `<p class="empty-state">You haven't posted any jobs yet.</p>`;
      document.getElementById(
        "detailPanel"
      ).innerHTML = `<p class="empty-state">Select a job on the left to view details.</p>`;
      return;
    }

    renderJobList();

    const stillExists = jobsData.some((job) => job.id === selectedJobId);
    selectJob(stillExists ? selectedJobId : jobsData[0].id);
  } catch (error) {
    jobsList.innerHTML = `<p class="empty-state">Failed to load your job postings.</p>`;
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
        <div class="detail-header-top">
          <h2>${escapeHtml(job.title)}</h2>
          <a href="post-jobs.html?jobId=${escapeHtml(
            job.id
          )}" class="edit-btn">Edit</a>
        </div>
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
    `;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}
