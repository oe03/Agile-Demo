from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime
import re

from firebase_setup import db, verify_token

router = APIRouter()

# --- Regex patterns ---
EMAIL_REGEX = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
PHONE_REGEX = r"^[0-9]{9,10}$"


# --- Data models ---
class LoginValidation(BaseModel):
    email: str
    password: str


class SignupValidation(BaseModel):
    fullName: str
    email: str
    contactNumber: str
    password: str
    role: str


class UserProfile(BaseModel):
    fullName: str
    contactNumber: str
    role: str  # "jobseeker" or "employer"


# --- Login validation ---
@router.post("/validate-login")
def validate_login(data: LoginValidation):
    errors = {}

    if not data.email.strip():
        errors["email"] = "This field is required"
    elif not re.match(EMAIL_REGEX, data.email):
        errors["email"] = "Please enter a valid email address"

    if not data.password.strip():
        errors["password"] = "This field is required"
    elif len(data.password) < 6:
        errors["password"] = "Password must be at least 6 characters"

    if errors:
        return {"valid": False, "errors": errors}
    return {"valid": True, "errors": {}}


# --- Signup validation ---
@router.post("/validate-signup")
def validate_signup(data: SignupValidation):
    errors = {}

    if not data.fullName.strip():
        errors["fullName"] = "This field is required"

    if not data.email.strip():
        errors["email"] = "This field is required"
    elif not re.match(EMAIL_REGEX, data.email):
        errors["email"] = "Please enter a valid email address"

    if not data.contactNumber.strip():
        errors["contactNumber"] = "This field is required"
    elif not re.match(PHONE_REGEX, data.contactNumber):
        errors["contactNumber"] = "Please enter a valid contact number (9-10 digits)"

    if not data.password.strip():
        errors["password"] = "This field is required"
    elif len(data.password) < 6:
        errors["password"] = "Password must be at least 6 characters"

    if not data.role.strip():
        errors["role"] = "Please select your user role"

    if errors:
        return {"valid": False, "errors": errors}
    return {"valid": True, "errors": {}}


# --- Save user profile (called right after Firebase Auth signup) ---
@router.post("/users")
def create_user_profile(profile: UserProfile, user=Depends(verify_token)):
    doc_ref = db.collection("users").document(user["uid"])
    doc_ref.set(
        {
            "fullName": profile.fullName,
            "email": user.get("email"),
            "contactNumber": profile.contactNumber,
            "role": profile.role,
            "createdAt": datetime.utcnow(),
        }
    )
    return {"message": "Profile created", "role": profile.role}


# --- Get current logged-in user's profile (used for role-based redirect) ---
@router.get("/users/me")
def get_my_profile(user=Depends(verify_token)):
    doc = db.collection("users").document(user["uid"]).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="User profile not found")
    return doc.to_dict()


class ProfileUpdate(BaseModel):
    fullName: str
    contactNumber: str


class ProfileValidation(BaseModel):
    fullName: str
    contactNumber: str


@router.post("/validate-profile")
def validate_profile(data: ProfileValidation):
    errors = {}

    if not data.fullName.strip():
        errors["fullName"] = "This field is required"

    if not data.contactNumber.strip():
        errors["contactNumber"] = "This field is required"
    elif not re.match(PHONE_REGEX, data.contactNumber):
        errors["contactNumber"] = "Please enter a valid contact number (9-10 digits)"

    if errors:
        return {"valid": False, "errors": errors}
    return {"valid": True, "errors": {}}


@router.put("/users/me")
def update_my_profile(profile: ProfileUpdate, user=Depends(verify_token)):
    doc_ref = db.collection("users").document(user["uid"])
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="User profile not found")

    doc_ref.update(
        {
            "fullName": profile.fullName,
            "contactNumber": profile.contactNumber,
        }
    )
    return {"message": "Profile updated successfully"}
