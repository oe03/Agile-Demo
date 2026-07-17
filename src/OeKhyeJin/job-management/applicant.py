from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone

from firebase_setup import db, verify_token

router = APIRouter()

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