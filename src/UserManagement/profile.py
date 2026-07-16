from flask import Blueprint, render_template, request, redirect, url_for, session

from auth_utils import (
    validate_profile_form,
    hash_password,
    verify_password,
)
from firebase_config import get_db

profile_bp = Blueprint("profile", __name__)


@profile_bp.route("/profile", methods=["GET", "POST"])
def profile():
    if "user_id" not in session:
        return redirect(url_for("login.login"))

    db = get_db()
    errors = {}
    success_message = None

    # --- Subtask: retrieve current user information from the database
    user_data = {
        "full_name": session.get("full_name", ""),
        "email": session.get("email", ""),
        "contact_number": "",
        "role": session.get("role", "job_seeker"),
    }

    user_ref = None
    if db is not None:
        user_ref = db.collection("users").document(session["user_id"])
        snapshot = user_ref.get()
        if snapshot.exists:
            stored = snapshot.to_dict()
            user_data.update(
                {
                    "full_name": stored.get("full_name", user_data["full_name"]),
                    "email": stored.get("email", user_data["email"]),
                    "contact_number": stored.get("contact_number", ""),
                    "role": stored.get("role", user_data["role"]),
                }
            )

    if request.method == "POST":
        full_name = request.form.get("full_name", "").strip()
        contact_number = request.form.get("contact_number", "").strip()
        current_password = request.form.get("current_password", "")
        new_password = request.form.get("new_password", "")
        confirm_new_password = request.form.get("confirm_new_password", "")

        # keep the values on screen even if validation fails
        user_data["full_name"] = full_name
        user_data["contact_number"] = contact_number

        # --- Subtask: allow editing of full name and contact number --
        result = validate_profile_form(full_name, contact_number)
        errors = result["errors"]

        update_payload = {}
        wants_password_change = bool(current_password or new_password or confirm_new_password)

        # --- Subtask: allow password change ---------------------------
        if wants_password_change:
            stored_hash = None
            if db is not None and user_ref is not None:
                snapshot = user_ref.get()
                if snapshot.exists:
                    stored_hash = snapshot.to_dict().get("password_hash")

            if not current_password or not verify_password(current_password, stored_hash or ""):
                errors["current_password"] = "Current password is incorrect."
            elif len(new_password) < 8:
                errors["new_password"] = "New password must be at least 8 characters long."
            elif new_password != confirm_new_password:
                errors["confirm_new_password"] = "New passwords do not match."
            else:
                update_payload["password_hash"] = hash_password(new_password)

        if not errors:
            update_payload["full_name"] = full_name
            update_payload["contact_number"] = contact_number

            if db is not None and user_ref is not None:
                user_ref.update(update_payload)
            else:
                print("[profile] Firebase not connected. Would have updated:", update_payload)

            # keep the session display name in sync
            session["full_name"] = full_name

            # --- Subtask: success confirmation message -----------------
            success_message = "Your profile has been updated successfully."

    return render_template(
        "profile.html",
        user_data=user_data,
        errors=errors,
        success_message=success_message,
    )
