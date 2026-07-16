import { auth } from "../../../shared/firebase-config.js";

const API_URL = "http://127.0.0.1:8000";

export async function postJob(title, company, description) {
  const idToken = await auth.currentUser.getIdToken();

  const response = await fetch(`${API_URL}/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ title, company, description }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "Failed to post job");
  }
  return response.json();
}

export async function getJobs() {
  const response = await fetch(`${API_URL}/jobs`);
  if (!response.ok) throw new Error("Failed to fetch jobs");
  return response.json();
}
