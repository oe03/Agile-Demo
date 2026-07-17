// src/shared/account-menu.js
export function initAccountMenu() {
  const trigger = document.getElementById("accountMenuBtn");
  const dropdown = document.getElementById("accountDropdown");
  if (!trigger || !dropdown) return;

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && e.target !== trigger) {
      dropdown.classList.remove("open");
    }
  });
}
