import { auth } from "../../../shared/firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const API_URL = "http://127.0.0.1:8000";

// Check URL for ?jobId=xxx to determine create vs edit mode
const urlParams = new URLSearchParams(window.location.search);
const editingJobId = urlParams.get("jobId");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../../LoTzeKhang/user-authentication/login.html";
    return;
  }

  if (editingJobId) {
    document.getElementById("formTitle").textContent = "Edit Job";
    document.getElementById("submitBtn").textContent = "Save Changes";
    await loadJobForEditing(editingJobId);
  }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  localStorage.clear();
  window.location.href = "../../LoTzeKhang/user-authentication/login.html";
});

document.getElementById("salary").addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/[^0-9]/g, "");
});

document.querySelectorAll("input, textarea, select").forEach((input) => {
  input.addEventListener("input", () => {
    input.classList.remove("invalid");
    const errorSpan = document.getElementById(`${input.id}Error`);
    if (errorSpan) errorSpan.textContent = "";

    const labelEl = document.querySelector(`label[for="${input.id}"]`);
    if (labelEl) labelEl.classList.remove("invalid");

    if (input.id === "salary") {
      document.querySelector(".prefix-box").classList.remove("invalid");
    }
  });
});

const fieldIds = [
  "companyName",
  "title",
  "description",
  "salary",
  "location",
  "jobType",
  "skills",
];

function clearFieldErrors() {
  fieldIds.forEach((id) => {
    document.getElementById(`${id}Error`).textContent = "";
    document.getElementById(id).classList.remove("invalid");
    const labelEl = document.querySelector(`label[for="${id}"]`);
    if (labelEl) labelEl.classList.remove("invalid");
  });
  document.querySelector(".prefix-box").classList.remove("invalid");
}

function showFieldErrors(errors) {
  Object.keys(errors).forEach((field) => {
    const errorEl = document.getElementById(`${field}Error`);
    const inputEl = document.getElementById(field);
    if (errorEl) errorEl.textContent = errors[field];
    if (inputEl) inputEl.classList.add("invalid");

    const labelEl = document.querySelector(`label[for="${field}"]`);
    if (labelEl) labelEl.classList.add("invalid");

    if (field === "salary") {
      document.querySelector(".prefix-box").classList.add("invalid");
    }
  });
}

// Fetches the existing job's data and fills in the form fields
async function loadJobForEditing(jobId) {
  const statusMsg = document.getElementById("statusMsg");

  try {
    const idToken = await auth.currentUser.getIdToken();
    const response = await fetch(`${API_URL}/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Failed to load job");
    }

    const job = await response.json();

    document.getElementById("companyName").value = job.companyName || "";
    document.getElementById("title").value = job.title || "";
    document.getElementById("description").value = job.description || "";
    document.getElementById("location").value = job.location || "";
    document.getElementById("jobType").value = job.jobType || "";
    document.getElementById("skills").value = (job.skills || []).join(", ");

    // Salary is stored as "RM 3000" — strip the prefix, keep just the digits
    const salaryDigitsOnly = (job.salary || "").replace(/[^0-9]/g, "");
    document.getElementById("salary").value = salaryDigitsOnly;

    // Manually trigger floating-label logic for pre-filled fields
    document.querySelectorAll("input, textarea, select").forEach((el) => {
      el.dispatchEvent(new Event("input"));
    });
  } catch (error) {
    statusMsg.textContent = error.message;
    statusMsg.className = "status error";
    console.error("Load job error:", error);
  }
}

document.getElementById("postJobForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearFieldErrors();

  const companyName = document.getElementById("companyName").value;
  const title = document.getElementById("title").value;
  const description = document.getElementById("description").value;
  const salaryDigits = document.getElementById("salary").value;
  const salary = `RM ${salaryDigits}`;
  const location = document.getElementById("location").value;
  const jobType = document.getElementById("jobType").value;
  const skills = document.getElementById("skills").value;
  const statusMsg = document.getElementById("statusMsg");
  statusMsg.textContent = "";
  statusMsg.className = "status";

  try {
    const validateRes = await fetch(`${API_URL}/validate-job`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName,
        title,
        description,
        salary: salaryDigits,
        location,
        jobType,
        skills,
      }),
    });
    const validation = await validateRes.json();

    if (!validation.valid) {
      showFieldErrors(validation.errors);
      return;
    }

    const idToken = await auth.currentUser.getIdToken();
    const payload = {
      companyName,
      title,
      description,
      salary,
      location,
      jobType,
      skills,
    };

    let response;
    if (editingJobId) {
      // Edit mode — update existing job
      response = await fetch(`${API_URL}/jobs/${editingJobId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });
    } else {
      // Create mode — new job
      response = await fetch(`${API_URL}/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });
    }

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Failed to save job");
    }

    if (editingJobId) {
      statusMsg.textContent = "Job updated successfully";
      statusMsg.className = "status success";
      setTimeout(() => {
        window.location.href = "employer-dashboard.html";
      }, 1000);
    } else {
      statusMsg.textContent = "Job posted successfully";
      statusMsg.className = "status success";
      setTimeout(() => {
        window.location.href = "employer-dashboard.html";
      }, 1000);
    }
  } catch (error) {
    statusMsg.textContent = error.message;
    statusMsg.className = "status error";
    console.error("Post job error:", error);
  }
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    // Page was restored from bfcache — force a full reload to re-check auth state
    window.location.reload();
  }
});
