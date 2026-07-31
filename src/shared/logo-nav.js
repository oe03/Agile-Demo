// src/shared/js/logo-nav.js

// Reads the role saved at login time and points the logo link
// to the correct "home" page for that role — works identically
// no matter which page includes this script, since paths are root-relative.
export function initLogoNav() {
  const logo = document.getElementById("logoLink");
  if (!logo) return;

  const role = localStorage.getItem("role");

  if (role === "employer") {
    logo.href = "/src/OeKhyeJin/job-management/employer-dashboard.html";
  } else if (role === "admin") {
    logo.href = "/src/OeKhyeJin/job-management/admin-dashboard.html";
  } else {
    logo.href = "/src/MahJinnHuei/job-recruitment/job-listings.html";
  }
}
