# tests/test_application_validation.py
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../src/OeKhyeJin/job-management")))

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


# --- Full Name field: 10 test cases ---
@pytest.mark.parametrize("full_name,should_be_valid", [
    ("", False),                      # empty
    ("   ", False),                   # whitespace only
    ("A", True),                      # single character
    ("John Doe", True),               # normal name
    ("O'Brien", True),                # apostrophe
    ("Jean-Luc", True),               # hyphen
    ("张伟", True),                    # non-Latin characters
    ("a" * 100, True),                # very long name
    ("John123", True),                # letters + numbers (currently allowed)
    ("!!!", True),                    # symbols (currently allowed, flags a gap if you want stricter rules)
])
def test_application_fullname_validation(full_name, should_be_valid):
    response = client.post("/validate-application", json={
        "fullName": full_name,
        "email": "test@example.com",
        "contactNumber": "123456789",
    })
    data = response.json()
    if should_be_valid:
        assert "fullName" not in data["errors"]
    else:
        assert "fullName" in data["errors"]


# --- Email field: 10 test cases ---
@pytest.mark.parametrize("email,should_be_valid", [
    ("", False),                          # empty
    ("   ", False),                       # whitespace only
    ("notanemail", False),                # no @ or domain
    ("test@", False),                     # missing domain
    ("@example.com", False),              # missing local part
    ("test@example", False),              # missing TLD
    ("test@example.com", True),           # normal valid email
    ("test.name@example.com", True),      # dot in local part
    ("test+tag@example.com", True),       # plus addressing
    ("TEST@EXAMPLE.COM", True),           # uppercase
])
def test_application_email_validation(email, should_be_valid):
    response = client.post("/validate-application", json={
        "fullName": "John Doe",
        "email": email,
        "contactNumber": "123456789",
    })
    data = response.json()
    if should_be_valid:
        assert "email" not in data["errors"]
    else:
        assert "email" in data["errors"]


# --- Contact Number field: 10 test cases ---
@pytest.mark.parametrize("contact_number,should_be_valid", [
    ("", False),                      # empty
    ("   ", False),                   # whitespace only
    ("12345", False),                 # too short (< 9 digits)
    ("12345678", False),              # 8 digits, still too short
    ("123456789", True),              # 9 digits, minimum valid
    ("1234567890", True),             # 10 digits, valid
    ("12345678901", False),           # 11 digits, too long
    ("abcdefghi", False),             # letters only
    ("123-456-789", False),           # contains hyphens
    ("123 456 789", False),           # contains spaces
])
def test_application_contact_number_validation(contact_number, should_be_valid):
    response = client.post("/validate-application", json={
        "fullName": "John Doe",
        "email": "test@example.com",
        "contactNumber": contact_number,
    })
    data = response.json()
    if should_be_valid:
        assert "contactNumber" not in data["errors"]
    else:
        assert "contactNumber" in data["errors"]