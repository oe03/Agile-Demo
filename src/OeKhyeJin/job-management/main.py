# src/OeKhyeJin/job-management/main.py
import os
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "../../LoTzeKhang/user-authentication"))
)

sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "../../MahJinnHuei/job-recruitment"))
)

from applicant import router as applications_router
from company import router as company_router
from favourites import router as favourites_router
from jobs import router as jobs_router
from jobseeker_profile import router as jobseeker_profile_router
from loginsignup import router as loginsignup_router

app = FastAPI(title="Job Portal API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500", "http://localhost:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(loginsignup_router)
app.include_router(jobs_router)
app.include_router(applications_router)
app.include_router(company_router)
app.include_router(favourites_router)
app.include_router(jobseeker_profile_router)

resumes_path = os.path.join(os.path.dirname(__file__), "uploaded_resumes")
os.makedirs(resumes_path, exist_ok=True)
app.mount("/resumes", StaticFiles(directory=resumes_path), name="resumes")

profile_resumes_path = os.path.join(
    os.path.dirname(__file__), "../../LoTzeKhang/user-authentication/profile_resumes"
)
os.makedirs(profile_resumes_path, exist_ok=True)
app.mount("/profile-resumes", StaticFiles(directory=profile_resumes_path), name="profile-resumes")


@app.get("/")
def root():
    return {"message": "Job Portal API is running"}
