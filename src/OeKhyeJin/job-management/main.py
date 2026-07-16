import sys
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
 
# This path setup makes sure Python can read files across different member folders
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))
 
from loginsignup import router as loginsignup_router
from jobs import router as jobs_router
from applicant import router as applications_router
 
# Import your module's router explicitly
try:
   from src.MAHJINNHUEI.JobRecruitmentModule.Application import router as job_seeker_application_router
except ModuleNotFoundError:
   # Backup import logic in case workspace is opened inside the 'src' folder level
   from MAHJINNHUEI.JobRecruitmentModule.Application import router as job_seeker_application_router
 
app = FastAPI(title="Job Portal API")
 
app.add_middleware(
   CORSMiddleware,
   allow_origins=["http://127.0.0.1:5500", "http://localhost:5500"],
   allow_credentials=True,
   allow_methods=["*"],
   allow_headers=["*"],
)
 
# Connect your leader's routes
app.include_router(loginsignup_router)
app.include_router(jobs_router)
app.include_router(applications_router)
 
# Connect your job submission routes to the backend brain
app.include_router(job_seeker_application_router)
 
@app.get("/")
def root():
   return {"message": "Job Portal API is running"}
 