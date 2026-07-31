# src/OeKhyeJin/job-management/jobs.py
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from firebase_setup import db, verify_token
from pydantic import BaseModel

router = APIRouter()


class JobValidation(BaseModel):
    companyName: str
    title: str
    description: str
    salary: str
    location: str
    jobType: str
    skills: str


class JobCreate(BaseModel):
    companyName: str
    title: str
    description: str
    salary: str
    location: str
    jobType: str
    skills: str


class JobUpdate(BaseModel):
    companyName: str
    title: str
    description: str
    salary: str
    location: str
    jobType: str
    skills: str


class JobStatusUpdate(BaseModel):
    status: str  # "open" or "closed"


def time_ago(created_at: datetime) -> str:
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=UTC)

    now = datetime.now(UTC)
    diff_seconds = int((now - created_at).total_seconds())

    diff_seconds = max(diff_seconds, 0)

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


@router.post("/validate-job")
def validate_job(data: JobValidation):
    errors = {}

    if not data.companyName.strip():
        errors["companyName"] = "This field is required"

    if not data.title.strip():
        errors["title"] = "This field is required"

    if not data.description.strip():
        errors["description"] = "This field is required"

    if not data.salary.strip():
        errors["salary"] = "This field is required"
    elif not data.salary.strip().isdigit():
        errors["salary"] = "Please enter digits only"

    if not data.location.strip():
        errors["location"] = "This field is required"

    if not data.jobType.strip():
        errors["jobType"] = "Please select job type"

    if not data.skills.strip():
        errors["skills"] = "This field is required"

    if errors:
        return {"valid": False, "errors": errors}
    return {"valid": True, "errors": {}}


@router.post("/jobs")
def create_job(job: JobCreate, user=Depends(verify_token)):
    profile_doc = db.collection("users").document(user["uid"]).get()
    if not profile_doc.exists:
        raise HTTPException(status_code=404, detail="User profile not found")

    profile = profile_doc.to_dict()
    if profile.get("role") != "employer":
        raise HTTPException(status_code=403, detail="Only employers can post jobs")

    skills_list = [s.strip() for s in job.skills.split(",") if s.strip()]

    doc_ref = db.collection("jobs").document()
    doc_ref.set(
        {
            "companyName": job.companyName,
            "title": job.title,
            "description": job.description,
            "salary": job.salary,
            "location": job.location,
            "jobType": job.jobType,
            "skills": skills_list,
            "postedBy": user["uid"],
            "employerName": profile.get("fullName"),
            "status": "open",
            "createdAt": datetime.now(UTC),
        }
    )
    return {"id": doc_ref.id, "message": "Job posted successfully"}


@router.get("/jobs")
def get_jobs():
    jobs_ref = db.collection("jobs").order_by("createdAt", direction="DESCENDING").stream()
    jobs = []
    for doc in jobs_ref:
        data = doc.to_dict()
        data["postedTimeAgo"] = time_ago(data["createdAt"])
        data.setdefault("status", "open")
        jobs.append({"id": doc.id, **data})
    return jobs


@router.get("/jobs/mine")
def get_my_jobs(user=Depends(verify_token)):
    jobs_ref = (
        db.collection("jobs")
        .where("postedBy", "==", user["uid"])
        .order_by("createdAt", direction="DESCENDING")
        .stream()
    )
    jobs = []
    for doc in jobs_ref:
        data = doc.to_dict()
        data["postedTimeAgo"] = time_ago(data["createdAt"])
        data.setdefault("status", "open")
        jobs.append({"id": doc.id, **data})
    return jobs


@router.get("/jobs/{job_id}")
def get_job(job_id: str, user=Depends(verify_token)):
    doc = db.collection("jobs").document(job_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Job not found")

    data = doc.to_dict()
    if data.get("postedBy") != user["uid"]:
        raise HTTPException(status_code=403, detail="You can only view your own job postings")

    data.setdefault("status", "open")
    return {"id": doc.id, **data}


@router.put("/jobs/{job_id}")
def update_job(job_id: str, job: JobUpdate, user=Depends(verify_token)):
    doc_ref = db.collection("jobs").document(job_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Job not found")

    existing = doc.to_dict()
    if existing.get("postedBy") != user["uid"]:
        raise HTTPException(status_code=403, detail="You can only edit your own job postings")

    skills_list = [s.strip() for s in job.skills.split(",") if s.strip()]

    doc_ref.update(
        {
            "companyName": job.companyName,
            "title": job.title,
            "description": job.description,
            "salary": job.salary,
            "location": job.location,
            "jobType": job.jobType,
            "skills": skills_list,
        }
    )
    return {"id": job_id, "message": "Job updated successfully"}


@router.put("/jobs/{job_id}/status")
def update_job_status(job_id: str, data: JobStatusUpdate, user=Depends(verify_token)):
    if data.status not in ["open", "closed"]:
        raise HTTPException(status_code=400, detail="Invalid status value")

    doc_ref = db.collection("jobs").document(job_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Job not found")

    existing = doc.to_dict()
    if existing.get("postedBy") != user["uid"]:
        raise HTTPException(status_code=403, detail="You can only update your own job postings")

    doc_ref.update({"status": data.status})
    return {"id": job_id, "message": f"Job marked as {data.status}"}
