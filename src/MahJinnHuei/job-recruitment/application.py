# src/OeKhyeJin/job-management/applicant.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from datetime import datetime, timezone
import re
import os
import uuid

from firebase_setup import db, verify_token

router = APIRouter()

EMAIL_REGEX = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
PHONE_REGEX = r"^[0-9]{9,10}$"

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploaded_resumes")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def time_ago(created_at: datetime) -> str:
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    diff_seconds = int((now - created_at).total_seconds())
    if diff_seconds < 0:
        diff_seconds = 0
    if diff_seconds < 60:
        return f"{diff_seconds}s ago"
    diff_minutes = diff_seconds // 60
    if diff_minutes < 60:
        return f"{diff_minutes}min ago"
    diff_hours = diff_minutes // 60
    if diff_hours < 24:
        return f"{diff_hours}h ago"
    diff_days = diff_hours // 24
    if diff_days == 1:
        return "Yesterday"
    if diff_days < 7:
        return f"{diff_days} days ago"
    return created_at.strftime("%d %b %Y")


class ApplicationValidation(BaseModel):
    fullName: str
    email: str
    contactNumber: str


# --- Validate application text fields ---
@router.post("/validate-application")
def validate_application(data: ApplicationValidation):
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

    if errors:
        return {"valid": False, "errors": errors}
    return {"valid": True, "errors": {}}


# --- Submit a job application (job seeker, requires login) ---
@router.post("/applications")
async def submit_application(
    jobId: str = Form(...),
    fullName: str = Form(...),
    email: str = Form(...),
    contactNumber: str = Form(...),
    coverNote: str = Form(""),
    resume: UploadFile = File(...),
    user=Depends(verify_token),
):
    errors = {}

    if not fullName.strip():
        errors["fullName"] = "This field is required"

    if not email.strip():
        errors["email"] = "This field is required"
    elif not re.match(EMAIL_REGEX, email):
        errors["email"] = "Please enter a valid email address"

    if not contactNumber.strip():
        errors["contactNumber"] = "This field is required"
    elif not re.match(PHONE_REGEX, contactNumber):
        errors["contactNumber"] = "Please enter a valid contact number (9-10 digits)"

    if resume.content_type != "application/pdf":
        errors["resumeFile"] = "Sorry, this file format is invalid. Please upload a PDF file"

    if errors:
        raise HTTPException(status_code=422, detail={"errors": errors})

    job_doc = db.collection("jobs").document(jobId).get()
    if not job_doc.exists:
        raise HTTPException(status_code=404, detail="Job not found")
    job_data = job_doc.to_dict()

    file_ext = os.path.splitext(resume.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    contents = await resume.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    resume_url = f"http://127.0.0.1:8000/resumes/{unique_filename}"

    doc_ref = db.collection("applications").document()
    doc_ref.set(
        {
            "jobId": jobId,
            "jobTitle": job_data.get("title"),
            "employerId": job_data.get("postedBy"),
            "applicantId": user["uid"],
            "applicantName": fullName,
            "applicantEmail": email,
            "contactNumber": contactNumber,
            "coverNote": coverNote,
            "resumeUrl": resume_url,
            "status": "pending",
            "appliedAt": datetime.now(timezone.utc),
        }
    )

    return {"id": doc_ref.id, "message": "Application submitted successfully"}


# --- Get all applications submitted to jobs posted by the logged-in employer ---
@router.get("/applications/mine")
def get_my_applications(user=Depends(verify_token)):
    profile_doc = db.collection("users").document(user["uid"]).get()
    if not profile_doc.exists:
        raise HTTPException(status_code=404, detail="User profile not found")

    profile = profile_doc.to_dict()
    if profile.get("role") != "employer":
        raise HTTPException(status_code=403, detail="Only employers can view applications")

    apps_ref = (
        db.collection("applications")
        .where("employerId", "==", user["uid"])
        .order_by("appliedAt", direction="DESCENDING")
        .stream()
    )

    applications = []
    for doc in apps_ref:
        data = doc.to_dict()
        data["appliedTimeAgo"] = time_ago(data["appliedAt"])
        applications.append({"id": doc.id, **data})

    return applications
