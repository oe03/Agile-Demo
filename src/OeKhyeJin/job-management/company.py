# src/OeKhyeJin/job-management/company.py
from datetime import UTC, datetime
import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from firebase_setup import db, verify_token

router = APIRouter()

EMAIL_REGEX = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
PHONE_REGEX = r"^(\+?60|0)[0-9]{9,10}$"


class CompanyProfileValidation(BaseModel):
    companyDescription: str
    companyLocation: str
    companyContact: str


class CompanyProfileUpdate(BaseModel):
    companyDescription: str
    companyLocation: str
    companyContact: str


def is_valid_contact(value: str) -> bool:
    value = value.strip()
    return bool(re.match(EMAIL_REGEX, value)) or bool(re.match(PHONE_REGEX, value))


@router.post("/validate-company-profile")
def validate_company_profile(data: CompanyProfileValidation):
    errors = {}

    if not data.companyDescription.strip():
        errors["companyDescription"] = "This field is required"

    if not data.companyLocation.strip():
        errors["companyLocation"] = "This field is required"

    if not data.companyContact.strip():
        errors["companyContact"] = "This field is required"
    elif not is_valid_contact(data.companyContact):
        errors["companyContact"] = "Please enter a valid email or phone number format"

    if errors:
        return {"valid": False, "errors": errors}
    return {"valid": True, "errors": {}}


@router.get("/company/mine")
def get_my_company_profile(user=Depends(verify_token)):
    profile_doc = db.collection("users").document(user["uid"]).get()
    if not profile_doc.exists:
        raise HTTPException(status_code=404, detail="User profile not found")

    profile = profile_doc.to_dict()
    if profile.get("role") != "employer":
        raise HTTPException(status_code=403, detail="Only employers have a company profile")

    company_doc = db.collection("companies").document(user["uid"]).get()
    if not company_doc.exists:
        return {
            "companyDescription": "",
            "companyLocation": "",
            "companyContact": "",
        }

    return company_doc.to_dict()


@router.put("/company/mine")
def update_my_company_profile(data: CompanyProfileUpdate, user=Depends(verify_token)):
    profile_doc = db.collection("users").document(user["uid"]).get()
    if not profile_doc.exists:
        raise HTTPException(status_code=404, detail="User profile not found")

    profile = profile_doc.to_dict()
    if profile.get("role") != "employer":
        raise HTTPException(status_code=403, detail="Only employers can update a company profile")

    if not data.companyContact.strip() or not is_valid_contact(data.companyContact):
        raise HTTPException(
            status_code=422,
            detail={
                "errors": {"companyContact": "Please enter a valid email or phone number format"}
            },
        )

    doc_ref = db.collection("companies").document(user["uid"])
    doc_ref.set(
        {
            "companyDescription": data.companyDescription,
            "companyLocation": data.companyLocation,
            "companyContact": data.companyContact,
            "updatedAt": datetime.now(UTC),
        }
    )
    return {"message": "Company profile updated successfully"}


@router.get("/company/{employer_id}")
def get_company_profile(employer_id: str):
    """Public endpoint — lets job seekers view a company's profile via the employer's uid."""
    company_doc = db.collection("companies").document(employer_id).get()
    if not company_doc.exists:
        return {
            "companyDescription": "",
            "companyLocation": "",
            "companyContact": "",
        }
    return company_doc.to_dict()
