import { auth } from "../../../shared/firebase-config.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const API_URL = "http://127.0.0.1:8000";

const jobsListEl = document.getElementById("jobsList");
const detailPanelEl = document.getElementById("detailPanel");

let allJobs = [];
let activeJobId = null;

// Helper function to escape HTML safely
function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatJobType(jobType) {
  if (!jobType) return "N/A";
  const map = { fulltime: "Full Time", parttime: "Part Time", internship: "Internship" };
  return map[jobType.toLowerCase().replace(/\s/g, "")] || jobType || "N/A";
}

// ------------------------------------------------------------------
// Fetch all jobs (Streams live Firestore dataset via local backend)
// ------------------------------------------------------------------
async function loadJobs() {
  try {
    const response = await fetch(`${API_URL}/jobs`);
    if (!response.ok) throw new Error("Failed to load jobs");
    
    const jobs = await response.json();
    
    // 🟢 Fixed: Loose fallback check ensures user-created docs aren't filtered out if 'postedBy' is missing
    allJobs = jobs.filter(job => !job.postedBy || job.postedBy !== 'system_seed');

    if (allJobs.length === 0) {
      jobsListEl.innerHTML = `<p class="empty-state" style="padding:20px; text-align:center; color:#6B7C93;">No job postings available right now.</p>`;
      if (detailPanelEl) detailPanelEl.innerHTML = `<p style="padding:20px; text-align:center; color:#6B7C93;">Select a vacancy card.</p>`;
      return;
    }

    renderJobsList();

    // Auto-select the first job entry in the matrix view
    if (allJobs.length > 0) {
      selectJob(allJobs[0].id);
    }
  } catch (error) {
    jobsListEl.innerHTML = `<p class="empty-state" style="color:red; padding:20px; text-align:center;">Could not load jobs from backend.</p>`;
    console.error("Load jobs error:", error);
  }
}

// ------------------------------------------------------------------
// Subtask 1 (list preview): compact cards on the left
// ------------------------------------------------------------------
function renderJobsList() {
  if (!jobsListEl) return;
  
  jobsListEl.innerHTML = allJobs
    .map(
      (job) => `
      <div class="job-card-compact ${job.id === activeJobId ? "active" : ""}" data-job-id="${job.id}">
        <h3>${escapeHtml(job.title)}</h3>
        <div class="job-company">${escapeHtml(job.companyName)}</div>
        <div class="job-meta-compact">${escapeHtml(job.location)} &middot; ${escapeHtml(formatJobType(job.jobType))}</div>
        <div class="job-salary-compact">${escapeHtml(job.salary || job.salaryRange || "Competitive")}</div>
      </div>
    `
    )
    .join("");

  document.querySelectorAll(".job-card-compact").forEach((card) => {
    card.addEventListener("click", () => selectJob(card.dataset.jobId));
  });
}

// ------------------------------------------------------------------
// Subtasks 1, 2, 3, 4: full detail panel on the right
// ------------------------------------------------------------------
function selectJob(jobId) {
  activeJobId = jobId;
  renderJobsList(); 

  const job = allJobs.find((j) => j.id === jobId);
  if (!job) return;

  const skillsHtml = (job.skills || [])
    .map((skill) => `<span class="skill-tag">${escapeHtml(skill)}</span>`)
    .join("");

  if (!detailPanelEl) return;

  detailPanelEl.innerHTML = `
    <div class="detail-header">
      <h2>${escapeHtml(job.title)}</h2>
      <div class="detail-company">${escapeHtml(job.companyName)}</div>

      <div class="detail-info-list">
        <div class="detail-info-item"><strong>Job Type:</strong> ${escapeHtml(formatJobType(job.jobType))}</div>
        <div class="detail-info-item"><strong>Location:</strong> ${escapeHtml(job.location)}</div>
        <div class="detail-info-item detail-salary"><strong>Salary:</strong> ${escapeHtml(job.salary || job.salaryRange || "Competitive")}</div>
      </div>
      <div class="detail-posted">Posted ${escapeHtml(job.postedTimeAgo || "recently")}</div>
    </div>

    <div class="detail-section">
      <h3>Job Description</h3>
      <p style="white-space: pre-wrap; line-height: 1.6;">${escapeHtml(job.description)}</p>
    </div>

    <div class="detail-section">
      <h3>Required Skills</h3>
      <div class="job-skills">${skillsHtml || "<span class='empty-state'>No specific skills listed</span>"}</div>
    </div>

    <div class="detail-section">
      <h3>Company Information</h3>
      <p><strong>Company:</strong> ${escapeHtml(job.companyName)}<br>
      <strong>Posted by:</strong> ${escapeHtml(job.employerName || "Employer")}</p>
    </div>

    <div style="margin-top: 32px;">
      <a class="apply-btn" href="apply-job.html?jobId=${job.id}">Apply Now</a>
    </div>
  `;
}

// ------------------------------------------------------------------
// Runtime Initialization & Session Check Setup
// ------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  window.escapeHtml = escapeHtml;

  const mockToken = localStorage.getItem("token");
  const mockRole = localStorage.getItem("role");

  // 🟢 Fixed 1: Updated directory target sequence to cleanly reach your leader's folder space
  if (!mockToken || String(mockRole).toLowerCase().trim() !== "job seeker") {
    console.warn("No valid session token found. Redirecting to login...");
    window.location.href = "../../../OeKhyeJin/job-management/login.html";
  } else {
    loadJobs();
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      localStorage.clear();
      try {
        await signOut(auth);
      } catch (err) {
        console.log("Firebase auth signout skipped or already cleared.");
      }
      // 🟢 Fixed 2: Matches the correct relative location of the landing page
      window.location.href = "../../../OeKhyeJin/job-management/login.html";
    });
  }
});