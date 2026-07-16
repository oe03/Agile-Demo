from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from loginsignup import router as loginsignup_router
from jobs import router as jobs_router
from applicant import router as applications_router

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

@app.get("/")
def root():
    return {"message": "Job Portal API is running"}