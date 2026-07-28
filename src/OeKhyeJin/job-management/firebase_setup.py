# src/OeKhyeJin/job-management/firebase_setup.py
import os
from fastapi import HTTPException, Header
import firebase_admin
from firebase_admin import credentials, firestore, auth

# --- Initialize Firebase Admin SDK ---
# Use an absolute path so this works regardless of which folder
# the command (uvicorn, pytest, etc.) is run from
cred_path = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
cred = credentials.Certificate(cred_path)
firebase_admin.initialize_app(cred)
db = firestore.client()

# --- Verifies Firebase ID token sent from frontend ---
def verify_token(authorization: str = Header(...)):
    try:
        token = authorization.replace("Bearer ", "")
        decoded_token = auth.verify_id_token(token)
        return decoded_token  # contains uid, email, etc.
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")