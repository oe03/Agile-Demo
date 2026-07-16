import re
import time
import bcrypt

# ---------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
# Accepts formats like 012-3456789, +60123456789, 0123456789
PHONE_REGEX = re.compile(r"^(\+?\d{1,3}[- ]?)?\d{9,11}$")


def validate_registration_form(full_name, email, contact_number, role,
                                password, confirm_password):
    """
    Validates all registration fields.
    Returns a dict: {"valid": bool, "errors": {field: message}}
    """
    errors = {}

    if not full_name or len(full_name.strip()) < 2:
        errors["full_name"] = "Full name must be at least 2 characters long."

    if not email or not EMAIL_REGEX.match(email):
        errors["email"] = "Please enter a valid email address."

    cleaned_number = contact_number.replace(" ", "") if contact_number else ""
    if not contact_number or not PHONE_REGEX.match(cleaned_number):
        errors["contact_number"] = "Please enter a valid contact number."

    if role not in ("job_seeker", "employer"):
        errors["role"] = "Please select a valid user role."

    if not password or len(password) < 8:
        errors["password"] = "Password must be at least 8 characters long."
    elif not re.search(r"[A-Z]", password):
        errors["password"] = "Password must contain at least one uppercase letter."
    elif not re.search(r"[0-9]", password):
        errors["password"] = "Password must contain at least one number."

    if password != confirm_password:
        errors["confirm_password"] = "Passwords do not match."

    return {"valid": len(errors) == 0, "errors": errors}


def validate_login_form(email, password):
    errors = {}
    if not email or not EMAIL_REGEX.match(email):
        errors["email"] = "Please enter a valid email address."
    if not password:
        errors["password"] = "Password is required."
    return {"valid": len(errors) == 0, "errors": errors}


def validate_profile_form(full_name, contact_number):
    errors = {}
    if not full_name or len(full_name.strip()) < 2:
        errors["full_name"] = "Full name must be at least 2 characters long."

    cleaned_number = contact_number.replace(" ", "") if contact_number else ""
    if not contact_number or not PHONE_REGEX.match(cleaned_number):
        errors["contact_number"] = "Please enter a valid contact number."

    return {"valid": len(errors) == 0, "errors": errors}


# ---------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------
def hash_password(plain_password: str) -> str:
    """Hash a plain-text password with bcrypt before it is stored."""
    hashed = bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check a plain-text password against a stored bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except (ValueError, TypeError):
        return False


# ---------------------------------------------------------------------
# Account lockout / rate limiting for login attempts
# ---------------------------------------------------------------------
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_SECONDS = 15 * 60  # 15 minutes

# In-memory tracker: { email: {"attempts": int, "locked_until": timestamp} }
# NOTE: For production this should live in Firestore/Redis instead of
# memory, so it survives server restarts and works across instances.
_login_attempts = {}


def is_account_locked(email: str):
    record = _login_attempts.get(email)
    if not record:
        return False, 0

    locked_until = record.get("locked_until", 0)
    if locked_until and time.time() < locked_until:
        remaining = int(locked_until - time.time())
        return True, remaining

    return False, 0


def register_failed_attempt(email: str):
    record = _login_attempts.setdefault(email, {"attempts": 0, "locked_until": 0})
    record["attempts"] += 1

    if record["attempts"] >= MAX_FAILED_ATTEMPTS:
        record["locked_until"] = time.time() + LOCKOUT_DURATION_SECONDS

    return record["attempts"]


def reset_failed_attempts(email: str):
    if email in _login_attempts:
        del _login_attempts[email]
