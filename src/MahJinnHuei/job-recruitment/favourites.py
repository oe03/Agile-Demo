# src/MahJinnHuei/job-recruitment/favourites.py
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from firebase_setup import db, verify_token

router = APIRouter()


class FavouriteCreate(BaseModel):
    jobId: str


def favourite_doc_id(uid: str, job_id: str) -> str:
    return f"{uid}_{job_id}"


@router.post("/favourites")
def add_favourite(data: FavouriteCreate, user=Depends(verify_token)):
    job_doc = db.collection("jobs").document(data.jobId).get()
    if not job_doc.exists:
        raise HTTPException(status_code=404, detail="Job not found")

    job_data = job_doc.to_dict()
    doc_id = favourite_doc_id(user["uid"], data.jobId)

    db.collection("favourites").document(doc_id).set(
        {
            "userId": user["uid"],
            "jobId": data.jobId,
            "jobTitle": job_data.get("title"),
            "companyName": job_data.get("companyName"),
            "salary": job_data.get("salary"),
            "location": job_data.get("location"),
            "savedAt": datetime.now(UTC),
        }
    )
    return {"message": "Job added to favourites"}


@router.delete("/favourites/{job_id}")
def remove_favourite(job_id: str, user=Depends(verify_token)):
    doc_id = favourite_doc_id(user["uid"], job_id)
    doc_ref = db.collection("favourites").document(doc_id)

    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="Favourite not found")

    doc_ref.delete()
    return {"message": "Job removed from favourites"}


@router.get("/favourites/mine")
def get_my_favourites(user=Depends(verify_token)):
    favs_ref = (
        db.collection("favourites")
        .where("userId", "==", user["uid"])
        .order_by("savedAt", direction="DESCENDING")
        .stream()
    )
    favourites = [{"id": doc.id, **doc.to_dict()} for doc in favs_ref]
    return favourites


@router.get("/favourites/check/{job_id}")
def check_favourite(job_id: str, user=Depends(verify_token)):
    doc_id = favourite_doc_id(user["uid"], job_id)
    doc = db.collection("favourites").document(doc_id).get()
    return {"isFavourited": doc.exists}
