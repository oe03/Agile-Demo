import { auth } from "../../../shared/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const API_URL = "http://127.0.0.1:8000";

const urlParams = new URLSearchParams(window.location.search);
const applicationId = urlParams.get("id");

const card = document.getElementById("confirmationCard");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  if (!applicationId) {
    card.innerHTML = `<p class="status">No application reference provided.</p>`;
    return;
  }

  await loadApplication(applicationId);
});

// --- Subtask 4: Display Submission Confirmation ---
async function loadApplication(id) {
  try {
    const idToken = await auth.currentUser.getIdToken();
    const response = await fetch(`${API_URL}/applications/${id}`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Failed to load application");
    }

    const app = await response.json();

    card.innerHTML = `
      <h1>Application Submitted 🎉</h1>
      <p class="subtitle">Thank you for applying for <strong>${app.jobTitle}</strong> at ${app.companyName}.</p>

      <div class="ref-box">
        <div class="ref-label">Your Reference Number</div>
        <div class="ref-number">${app.referenceNumber}</div>
      </div>

      <ul class="summary-list">
        <li><strong>Name:</strong> ${app.fullName}</li>
        <li><strong>Email:</strong> ${app.email}</li>
        <li><strong>Phone:</strong> ${app.phone}</li>
        <li><strong>Resume:</strong> ${app.resumeFilename}</li>
        <li><strong>Status:</strong> ${app.status}</li>
      </ul>

      <a class="btn-primary" href="job-listings.html">Back to Job Listings</a>
    `;
  } catch (error) {
    card.innerHTML = `<p class="status">${error.message}</p>`;
    console.error("Load application error:", error);
  }
}