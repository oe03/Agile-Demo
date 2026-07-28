import os
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

# Add LoTzeKhang's user-authentication folder so we can bare-import loginsignup.py from there
sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "../../LoTzeKhang/user-authentication"))
)

from applicant import router as applications_router
from jobs import router as jobs_router
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

resumes_path = os.path.join(os.path.dirname(__file__), "uploaded_resumes")
os.makedirs(resumes_path, exist_ok=True)
app.mount("/resumes", StaticFiles(directory=resumes_path), name="resumes")


@app.get("/")
def root():
    return {"message": "Job Portal API is running"}
