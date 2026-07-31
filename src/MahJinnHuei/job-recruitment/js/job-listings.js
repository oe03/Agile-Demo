// src/MahJinnHuei/job-recruitment/js/job-listings.js
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
let filteredJobsData = [];
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
  window.location.href = "../../LoTzeKhang/user-authentication/login.html";
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    window.location.reload();
  }
});

async function loadJobs() {
  const jobsList = document.getElementById("jobsList");

  try {
    const response = await fetch(`${API_URL}/jobs`);
    if (!response.ok) throw new Error("Failed to load jobs");
    jobsData = await response.json();
    filteredJobsData = jobsData;

    if (jobsData.length === 0) {
      jobsList.innerHTML = `<p class="empty-state">No jobs available right now.</p>`;
      return;
    }

    renderJobList();
    await selectJob(jobsData[0].id);
  } catch (error) {
    jobsList.innerHTML = `<p class="empty-state">Failed to load jobs.</p>`;
    console.error("Load jobs error:", error);
  }
}

function renderJobList() {
  const jobsList = document.getElementById("jobsList");

  if (filteredJobsData.length === 0) {
    jobsList.innerHTML = `<p class="empty-state">No jobs match your search.</p>`;
    return;
  }

  jobsList.innerHTML = filteredJobsData
    .map((job) => renderCompactCard(job))
    .join("");

  document.querySelectorAll(".job-card-compact").forEach((card) => {
    card.addEventListener("click", () => {
      selectJob(card.getAttribute("data-id"));
    });
  });
}

function renderCompactCard(job) {
  const isActive = job.id === selectedJobId ? "active" : "";
  const status = job.status || "open";
  const isClosed = status === "closed";

  return `
    <div class="job-card-compact ${isActive} ${
    isClosed ? "closed" : ""
  }" data-id="${job.id}">
      <div class="job-card-top-row">
        <h3>${escapeHtml(job.title)}</h3>
        ${
          isClosed
            ? `<span class="status-badge status-closed">Application Closed</span>`
            : ""
        }
      </div>
      <div class="job-company">${escapeHtml(job.companyName)}</div>
      <div class="job-meta-compact">${escapeHtml(job.location)}</div>
      <div class="job-salary-compact">${escapeHtml(job.salary)}</div>
      <div class="posted-time">${escapeHtml(job.postedTimeAgo)}</div>
    </div>
  `;
}

document.getElementById("searchInput").addEventListener("input", (e) => {
  const searchTerm = e.target.value.toLowerCase().trim();

  if (!searchTerm) {
    filteredJobsData = jobsData;
  } else {
    filteredJobsData = jobsData.filter((job) => {
      const title = (job.title || "").toLowerCase();
      const company = (job.companyName || "").toLowerCase();
      const location = (job.location || "").toLowerCase();
      return (
        title.includes(searchTerm) ||
        company.includes(searchTerm) ||
        location.includes(searchTerm)
      );
    });
  }

  renderJobList();

  if (filteredJobsData.length > 0) {
    selectJob(filteredJobsData[0].id);
  } else {
    document.getElementById(
      "detailPanel"
    ).innerHTML = `<p class="empty-state">No jobs match your search.</p>`;
  }
});

async function selectJob(jobId) {
  selectedJobId = jobId;
  const job = jobsData.find((j) => j.id === jobId);
  if (!job) return;

  document.querySelectorAll(".job-card-compact").forEach((card) => {
    card.classList.toggle("active", card.getAttribute("data-id") === jobId);
  });

  await renderDetailPanel(job);
}

async function renderDetailPanel(job) {
  const detailPanel = document.getElementById("detailPanel");
  const skillsHtml = (job.skills || [])
    .map((skill) => `<span class="skill-tag">${escapeHtml(skill)}</span>`)
    .join("");
  const jobTypeLabel = JOB_TYPE_LABELS[job.jobType] || job.jobType || "";
  const status = job.status || "open";
  const isClosed = status === "closed";

  const applyButtonHtml = isClosed
    ? `<button class="apply-btn apply-btn-disabled" disabled>Application Closed</button>`
    : `<a href="apply-job.html?jobId=${escapeHtml(
        job.id
      )}&company=${encodeURIComponent(
        job.companyName
      )}" class="apply-btn">Apply</a>`;

  let companyInfoHtml = "";
  try {
    const response = await fetch(`${API_URL}/company/${job.postedBy}`);
    if (response.ok) {
      const companyProfile = await response.json();
      if (
        companyProfile.companyDescription ||
        companyProfile.companyLocation ||
        companyProfile.companyContact
      ) {
        companyInfoHtml = `
          <div class="detail-section">
            <h3>Company Information</h3>
            ${
              companyProfile.companyDescription
                ? `<p>${escapeHtml(companyProfile.companyDescription)}</p>`
                : ""
            }
            ${
              companyProfile.companyLocation
                ? `<p><strong>Location:</strong> ${escapeHtml(
                    companyProfile.companyLocation
                  )}</p>`
                : ""
            }
            ${
              companyProfile.companyContact
                ? `<p><strong>Contact:</strong> ${escapeHtml(
                    companyProfile.companyContact
                  )}</p>`
                : ""
            }
          </div>
        `;
      }
    }
  } catch (error) {
    console.error("Load company profile error:", error);
  }

  let isFavourited = false;
  try {
    const idToken = await auth.currentUser.getIdToken();
    const favResponse = await fetch(`${API_URL}/favourites/check/${job.id}`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (favResponse.ok) {
      const favData = await favResponse.json();
      isFavourited = favData.isFavourited;
    }
  } catch (error) {
    console.error("Check favourite error:", error);
  }

  const favouriteButtonHtml = `
    <button class="favourite-btn ${
      isFavourited ? "favourited" : ""
    }" data-job-id="${job.id}" data-favourited="${isFavourited}">
      ${isFavourited ? "★ Saved" : "☆ Save"}
    </button>
  `;

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

    ${companyInfoHtml}

    <div class="detail-action-row">
      ${applyButtonHtml}
      ${favouriteButtonHtml}
    </div>
  `;

  document
    .querySelector(".favourite-btn")
    .addEventListener("click", async (e) => {
      const jobId = e.target.getAttribute("data-job-id");
      const currentlyFavourited =
        e.target.getAttribute("data-favourited") === "true";
      await toggleFavourite(jobId, currentlyFavourited);
      await renderDetailPanel(job);
    });
}

async function toggleFavourite(jobId, currentlyFavourited) {
  try {
    const idToken = await auth.currentUser.getIdToken();

    if (currentlyFavourited) {
      await fetch(`${API_URL}/favourites/${jobId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });
    } else {
      await fetch(`${API_URL}/favourites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ jobId }),
      });
    }
  } catch (error) {
    console.error("Toggle favourite error:", error);
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}
