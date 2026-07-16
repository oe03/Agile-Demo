import datetime
from flask import Blueprint, render_template, request, redirect, url_for, session

from auth_utils import validate_registration_form, hash_password
from firebase_config import get_db

register_bp = Blueprint("register", __name__)


@register_bp.route("/register", methods=["GET", "POST"])
def register():
    form_data = {
        "full_name": "",
        "email": "",
        "contact_number": "",
        "role": "job_seeker"
    }
    errors = {}

    if request.method == "POST":
        full_name = request.form.get("full_name", "").strip()
        email = request.form.get("email", "").strip().lower()
        contact_number = request.form.get("contact_number", "").strip()
        role = request.form.get("role", "job_seeker")
        password = request.form.get("password", "")
        confirm_password = request.form.get("confirm_password", "")

        # keep values so the user doesn't have to retype everything
        form_data = {
            "full_name": full_name,
            "email": email,
            "contact_number": contact_number,
            "role": role
        }

        # --- Subtask: display appropriate error messages -------------
        result = validate_registration_form(
            full_name, email, contact_number, role, password, confirm_password
        )
        errors = result["errors"]

        if result["valid"]:
            db = get_db()

            # Check email isn't already registered (only possible once
            # Firebase is actually connected / populated)
            if db is not None:
                existing = db.collection("users").where(
                    "email", "==", email
                ).limit(1).get()
                if len(existing) > 0:
                    errors["email"] = "This email is already registered."

            if not errors:
                # --- Subtask: hash the password before storing ------
                hashed_pw = hash_password(password)

                new_user = {
                    "full_name": full_name,
                    "email": email,
                    "contact_number": contact_number,
                    "role": role,
                    "password_hash": hashed_pw,
                    "created_at": datetime.datetime.utcnow().isoformat()
                }

                if db is not None:
                    db.collection("users").add(new_user)
                else:
                    # Firebase not connected yet (placeholder key in
                    # use) - fall back so the flow can still be
                    # demonstrated end-to-end.
                    print("[register] Firebase not connected. "
                          "Would have saved:", new_user)

                return redirect(url_for("register.register_success"))

    return render_template("register.html", form_data=form_data, errors=errors)


@register_bp.route("/register/success")
def register_success():
    return render_template("register_success.html")
