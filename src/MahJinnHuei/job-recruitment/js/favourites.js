// src/MahJinnHuei/job-recruitment/js/favourites.js
import { auth } from "../../../shared/firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const API_URL = "http://127.0.0.1:8000";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../../LoTzeKhang/user-authentication/login.html";
    return;
  }
  await loadFavourites();
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

async function loadFavourites() {
  const favouritesList = document.getElementById("favouritesList");

  try {
    const idToken = await auth.currentUser.getIdToken();
    const response = await fetch(`${API_URL}/favourites/mine`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });

    if (!response.ok) throw new Error("Failed to load favourites");
    const favourites = await response.json();

    if (favourites.length === 0) {
      favouritesList.innerHTML = `<p class="empty-state">You haven't saved any jobs yet.</p>`;
      return;
    }

    favouritesList.innerHTML = favourites
      .map((fav) => renderFavouriteCard(fav))
      .join("");

    document.querySelectorAll(".fav-menu-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const dropdown = btn.nextElementSibling;
        document.querySelectorAll(".fav-dropdown.open").forEach((d) => {
          if (d !== dropdown) d.classList.remove("open");
        });
        dropdown.classList.toggle("open");
      });
    });

    document.querySelectorAll(".delete-fav-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const jobId = e.target.getAttribute("data-job-id");
        await removeFavourite(jobId);
      });
    });

    document.addEventListener("click", () => {
      document
        .querySelectorAll(".fav-dropdown.open")
        .forEach((d) => d.classList.remove("open"));
    });
  } catch (error) {
    favouritesList.innerHTML = `<p class="empty-state">Failed to load your saved jobs.</p>`;
    console.error("Load favourites error:", error);
  }
}

function renderFavouriteCard(fav) {
  return `
      <div class="job-card-compact">
        <div class="job-card-top-row">
          <h3>${escapeHtml(fav.jobTitle)}</h3>
          <div class="fav-menu">
            <button class="fav-menu-btn" data-job-id="${fav.jobId}">⋯</button>
            <div class="fav-dropdown">
              <button class="delete-fav-btn" data-job-id="${
                fav.jobId
              }">Delete</button>
            </div>
          </div>
        </div>
        <div class="job-company">${escapeHtml(fav.companyName)}</div>
        <div class="job-meta-compact">${escapeHtml(fav.location)}</div>
        <div class="job-salary-compact">${escapeHtml(fav.salary)}</div>
        <div class="favourite-card-actions">
          <a href="apply-job.html?jobId=${escapeHtml(
            fav.jobId
          )}&company=${encodeURIComponent(
    fav.companyName
  )}" class="apply-btn">Apply</a>
        </div>
      </div>
    `;
}

async function removeFavourite(jobId) {
  try {
    const idToken = await auth.currentUser.getIdToken();
    await fetch(`${API_URL}/favourites/${jobId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${idToken}` },
    });
    await loadFavourites();
  } catch (error) {
    console.error("Remove favourite error:", error);
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}
