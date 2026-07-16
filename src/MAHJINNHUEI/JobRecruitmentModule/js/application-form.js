const API_URL = "http://127.0.0.1:8000";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("applicationForm");
  const errorBanner = document.getElementById("errorBanner");
  const emailInput = document.getElementById("email");
  const nameInput = document.getElementById("fullName");
  const phoneInput = document.getElementById("phone");

  // 1. Extract jobId from the URL query string
  const urlParams = new URLSearchParams(window.location.search);
  const jobId = urlParams.get("jobId");

  if (!jobId) {
    if (errorBanner) {
      errorBanner.textContent = "Error: Missing target job identifier link context.";
      errorBanner.style.display = "block";
    }
    return;
  }

  // 🟢 SESSION RETRIEVAL
  let nestedUser = {};
  try {
    const userStorage = localStorage.getItem("user");
    if (userStorage) nestedUser = JSON.parse(userStorage);
  } catch (e) {
    console.log("Parsing 'user' item failed, falling back to flat keys.");
  }

  // Look for any possible key naming conventions from the authentication payload
  const activeUserEmail = nestedUser.email || localStorage.getItem("email") || localStorage.getItem("userEmail");
  const activeUserName = nestedUser.displayName || nestedUser.full_name || localStorage.getItem("displayName") || localStorage.getItem("fullName");
  const activeUserPhone = nestedUser.contact_number || localStorage.getItem("phone") || localStorage.getItem("contactNumber");
  const activeUserId = localStorage.getItem("uid") || localStorage.getItem("userId");

  // 🟢 SMART AUTO-FILL OR MANUAL FALLBACK
  // If data exists, fill and lock it down. If not, leave it wide open for typing!
  if (activeUserEmail && emailInput) {
    emailInput.value = activeUserEmail;
    emailInput.readOnly = true; 
    emailInput.style.backgroundColor = "#EAECEE"; 
    emailInput.style.color = "#566573";
    emailInput.style.cursor = "not-allowed";
  } else if (emailInput) {
    emailInput.placeholder = "Enter your email address";
  }

  if (activeUserName && nameInput) {
    nameInput.value = activeUserName;
  } else if (nameInput) {
    nameInput.placeholder = "Enter your full name";
  }

  if (activeUserPhone && phoneInput) {
    phoneInput.value = activeUserPhone;
  } else if (phoneInput) {
    phoneInput.placeholder = "e.g., +60123456789";
  }

  // 2. Form Submission Handling
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBanner.style.display = "none";

    const fileInput = document.getElementById("resume");
    const resumeFile = fileInput.files[0];

    if (!resumeFile) {
      errorBanner.textContent = "Please select a resume file to upload.";
      errorBanner.style.display = "block";
      return;
    }

    const formData = new FormData();
    formData.append("jobId", jobId);
    formData.append("userId", activeUserId || "guest_applicant"); 
    formData.append("fullName", nameInput.value.trim());
    formData.append("email", emailInput.value.trim());
    formData.append("phone", phoneInput.value.trim());
    formData.append("coverLetter", document.getElementById("coverLetter").value.trim());
    formData.append("resume", resumeFile);

    try {
      const response = await fetch(`${API_URL}/applications`, {
        method: "POST",
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.status === "success") {
        window.location.href = "application-confirmation.html";
      } else {
        throw new Error(result.detail || "Submission encountered a server error.");
      }
    } catch (err) {
      errorBanner.textContent = err.message || "Unable to connect to backend server.";
      errorBanner.style.display = "block";
    }
  });
});