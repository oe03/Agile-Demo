from flask import Blueprint, render_template, request, redirect, url_for, session

from auth_utils import (
    validate_login_form,
    verify_password,
    is_account_locked,
    register_failed_attempt,
    reset_failed_attempts,
    MAX_FAILED_ATTEMPTS,
)
from firebase_config import get_db

login_bp = Blueprint("login", __name__)


@login_bp.route("/login", methods=["GET", "POST"])
def login():
    form_data = {"email": ""}
    errors = {}

    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        form_data["email"] = email

        # --- Subtask: validate the basic form fields ------------------
        result = validate_login_form(email, password)
        errors = result["errors"]

        if result["valid"]:
            # --- Subtask: account lockout / rate limiting -------------
            locked, remaining_seconds = is_account_locked(email)
            if locked:
                minutes = max(1, remaining_seconds // 60)
                errors["general"] = (
                    f"Too many failed attempts. This account is locked. "
                    f"Please try again in about {minutes} minute(s)."
                )
            else:
                db = get_db()
                user_doc = None
                user_data = None

                if db is not None:
                    matches = db.collection("users").where(
                        "email", "==", email
                    ).limit(1).get()
                    if len(matches) > 0:
                        user_doc = matches[0]
                        user_data = user_doc.to_dict()

                if user_data and verify_password(password, user_data.get("password_hash", "")):
                    # --- Subtask: create a user session ----------------
                    reset_failed_attempts(email)
                    session["user_id"] = user_doc.id
                    session["email"] = user_data.get("email")
                    session["full_name"] = user_data.get("full_name")
                    session["role"] = user_data.get("role", "job_seeker")

                    # --- Subtask: redirect based on role ---------------
                    if session["role"] == "employer":
                        return redirect(url_for("login.employer_dashboard"))
                    else:
                        return redirect(url_for("login.job_seeker_dashboard"))
                else:
                    attempts = register_failed_attempt(email)
                    remaining_tries = max(0, MAX_FAILED_ATTEMPTS - attempts)
                    if remaining_tries > 0:
                        errors["general"] = (
                            f"Incorrect email or password. "
                            f"{remaining_tries} attempt(s) remaining before lockout."
                        )
                    else:
                        errors["general"] = (
                            "Too many failed attempts. This account has been "
                            "temporarily locked. Please try again later."
                        )

    return render_template("login.html", form_data=form_data, errors=errors)


@login_bp.route("/dashboard/job-seeker")
def job_seeker_dashboard():
    if session.get("role") != "job_seeker":
        return redirect(url_for("login.login"))
    # Job listings are empty for now because Firebase has not been
    # populated with real job postings yet.
    jobs = []
    return render_template("dashboard.html", jobs=jobs, role_label="Job Seeker")


@login_bp.route("/dashboard/employer")
def employer_dashboard():
    if session.get("role") != "employer":
        return redirect(url_for("login.login"))
    jobs = []
    return render_template("dashboard.html", jobs=jobs, role_label="Employer")


@login_bp.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login.login"))
