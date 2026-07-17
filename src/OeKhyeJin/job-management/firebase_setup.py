from fastapi import HTTPException, Header
import firebase_admin
from firebase_admin import credentials, firestore, auth

# --- Initialize Firebase Admin SDK ---
cred = credentials.Certificate("serviceAccountKey.json")
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