import os
import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
import bcrypt

import firebase_admin
from firebase_admin import credentials, firestore

# ------------------------------------------------------------------
# FIREBASE SETUP
# ------------------------------------------------------------------
SERVICE_ACCOUNT_PATH = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")

if not firebase_admin._apps:
    cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred)

db = firestore.client()

# ------------------------------------------------------------------
# ROUTER INITIALIZATION & ROUTING SETUP
# ------------------------------------------------------------------
router = APIRouter()
app = router

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploaded_resumes")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {"pdf", "docx"}
MAX_FILE_SIZE_MB = 5

class LoginRequest(BaseModel):
    email: str
    password: str

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

# ------------------------------------------------------------------
# 1. LOGIN ROUTE
# ------------------------------------------------------------------
@app.post("/validate-login")
async def login_endpoint(data: LoginRequest):
    if not data.email or not data.password:
        return {"status": "error", "message": "Email and password required"}
        
    users_ref = db.collection("users").where("email", "==", data.email.strip()).limit(1).stream()
    user_doc = None
    for doc in users_ref:
        user_doc = doc
        break
        
    if not user_doc:
        return {"status": "error", "message": "User not found"}
        
    user_info = user_doc.to_dict()
    db_hash = user_info.get("password_hash") or user_info.get("password")
    
    if not db_hash or not verify_password(data.password, db_hash):
        return {"status": "error", "message": "Password mismatch"}
        
    raw_role = user_info.get("role", "job_seeker").lower().replace(" ", "")
    frontend_role = "Job Seeker" if "seeker" in raw_role else "Employer"

    return {
        "status": "success",
        "token": f"live_session_{user_doc.id}",
        "uid": user_doc.id,
        "role": frontend_role,
        "user": {
            "email": user_info.get("email"),
            "displayName": user_info.get("full_name") or user_info.get("fullName") or "User"
        }
    }

# ------------------------------------------------------------------
# 2. JOBS STREAMING ROUTE
# ------------------------------------------------------------------
@app.get("/jobs")
def get_all_jobs():
    jobs_ref = db.collection("jobs").stream()
    jobs_list = []
    
    for doc in jobs_ref:
        job_data = doc.to_dict()
        job_data["id"] = doc.id
        
        if "salary" in job_data and "salaryRange" not in job_data:
            job_data["salaryRange"] = job_data["salary"]
            
        jobs_list.append(job_data)
        
    return jobs_list

# ------------------------------------------------------------------
# 3. APPLICATION SUBMISSION ROUTE
# ------------------------------------------------------------------
@app.post("/applications")
async def submit_application(
    jobId: str = Form(...),
    userId: str = Form(...),  # ✅ Correctly configured form tracking element
    fullName: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    coverLetter: str = Form(""),
    resume: UploadFile = File(...),
):
    ext = resume.filename.rsplit(".", 1)[-1].lower() if "." in resume.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only PDF or DOCX allowed")

    contents = await resume.read()
    stored_filename = f"{uuid.uuid4()}.{ext}"
    with open(os.path.join(UPLOAD_DIR, stored_filename), "wb") as f:
        f.write(contents)

    doc_ref = db.collection("applications").document()
    doc_ref.set({
        "jobId": jobId,
        "userId": userId,
        "fullName": fullName,
        "email": email,
        "phone": phone,
        "coverLetter": coverLetter,
        "resumeFilename": resume.filename,
        "resumePath": f"uploaded_resumes/{stored_filename}",
        "status": "Submitted",
        "appliedAt": firestore.SERVER_TIMESTAMP,  # 🟢 Fixed: Uses Firebase native server timestamp to prevent serialization errors
    })
    return {"status": "success", "id": doc_ref.id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("Application:app", host="127.0.0.1", port=8000, reload=True)