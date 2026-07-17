import os
import firebase_admin
from firebase_admin import credentials, firestore

# Dynamic absolute path to YOUR key inside your module folder
SERVICE_ACCOUNT_PATH = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")

# Safety guard: ONLY initialize if your leader's file hasn't done it yet!
if not firebase_admin._apps:
    cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred)
else:
    # If the app is already open, reuse it safely without crashing the backend
    firebase_admin.get_app()

db = firestore.client()