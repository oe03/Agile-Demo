# src/LoTzeKhang/user-authentication/jobseeker_profile.py
import os
import uuid
from datetime import UTC, datetime

import anyio
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from firebase_setup import db, verify_token
from pydantic import BaseModel

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "profile_resumes")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class EducationEntry(BaseModel):
    institution: str
    qualification: str
    fieldOfStudy: str
    graduationYear: str


class WorkExperienceEntry(BaseModel):
    company: str
    position: str
    startDate: str
    endDate: str
    description: str = ""


class ProfessionalProfileUpdate(BaseModel):
    summary: str
    education: list[EducationEntry]
    workExperience: list[WorkExperienceEntry]
    skills: str


class ProfessionalProfileValidation(BaseModel):
    summary: str
    skills: str


@router.post("/validate-professional-profile")
def validate_professional_profile(data: ProfessionalProfileValidation):
    errors = {}

    if not data.summary.strip():
        errors["summary"] = "This field is required"

    if not data.skills.strip():
        errors["skills"] = "This field is required"

    if errors:
        return {"valid": False, "errors": errors}
    return {"valid": True, "errors": {}}


@router.get("/jobseeker-profile/mine")
def get_my_professional_profile(user=Depends(verify_token)):
    doc = db.collection("jobSeekerProfiles").document(user["uid"]).get()
    if not doc.exists:
        return {
            "summary": "",
            "education": [],
            "workExperience": [],
            "skills": "",
            "resumeUrl": "",
            "resumeFilename": "",
        }
    return doc.to_dict()


@router.put("/jobseeker-profile/mine")
def update_my_professional_profile(data: ProfessionalProfileUpdate, user=Depends(verify_token)):
    doc_ref = db.collection("jobSeekerProfiles").document(user["uid"])
    doc_ref.set(
        {
            "summary": data.summary,
            "education": [e.model_dump() for e in data.education],
            "workExperience": [w.model_dump() for w in data.workExperience],
            "skills": data.skills,
            "updatedAt": datetime.now(UTC),
        },
        merge=True,
    )
    return {"message": "Professional profile updated successfully"}


@router.post("/jobseeker-profile/resume")
async def upload_profile_resume(resume: UploadFile = File(...), user=Depends(verify_token)):
    if resume.content_type != "application/pdf":
        raise HTTPException(
            status_code=422,
            detail={
                "errors": {
                    "resumeFile": "Sorry, this file format is invalid. Please upload a PDF file"
                }
            },
        )

    file_ext = os.path.splitext(resume.filename or "")[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    contents = await resume.read()
    async with await anyio.open_file(file_path, "wb") as f:
        await f.write(contents)

    resume_url = f"http://127.0.0.1:8000/profile-resumes/{unique_filename}"

    doc_ref = db.collection("jobSeekerProfiles").document(user["uid"])
    doc_ref.set(
        {
            "resumeUrl": resume_url,
            "resumeFilename": resume.filename,
            "updatedAt": datetime.now(UTC),
        },
        merge=True,
    )
    return {
        "message": "Resume uploaded successfully",
        "resumeUrl": resume_url,
        "resumeFilename": resume.filename,
    }


@router.get("/jobseeker-profile/resume-info")
def get_resume_info(user=Depends(verify_token)):
    doc = db.collection("jobSeekerProfiles").document(user["uid"]).get()
    if not doc.exists:
        return {"hasResume": False, "resumeUrl": "", "resumeFilename": ""}

    data = doc.to_dict()
    resume_url = data.get("resumeUrl", "")
    return {
        "hasResume": bool(resume_url),
        "resumeUrl": resume_url,
        "resumeFilename": data.get("resumeFilename", ""),
    }
