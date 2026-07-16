import os
import firebase_admin
from firebase_admin import credentials, firestore

_firebase_app = None
db = None

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SERVICE_ACCOUNT_FILE = os.path.join(BASE_DIR, "Firebase_Key.json")


def init_firebase():
    global _firebase_app, db

    if _firebase_app is not None:
        return db

    try:
        cred = credentials.Certificate(SERVICE_ACCOUNT_FILE)

        _firebase_app = firebase_admin.initialize_app(cred)
        db = firestore.client()

        print("[firebase_config] Firebase initialized successfully.")

    except Exception as error:
        print("[firebase_config] Firebase initialization failed:")
        print(error)
        db = None

    return db


def get_db():
    global db

    if db is None:
        db = init_firebase()

    return db
