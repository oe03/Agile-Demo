# tests/test_signup_validation.py
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
def test_fullname_validation(full_name, should_be_valid):
    response = client.post("/validate-signup", json={
        "fullName": full_name,
        "email": "test@example.com",
        "contactNumber": "123456789",
        "password": "password123",
        "role": "jobseeker",
    })
    data = response.json()
    if should_be_valid:
        assert "fullName" not in data["errors"]
    else:
        assert "fullName" in data["errors"]


# --- Email field: 10 test cases ---
@pytest.mark.parametrize("email,should_be_valid", [
    ("", False),                          # empty
    ("notanemail", False),                # no @ or domain
    ("test@", False),                     # missing domain
    ("@example.com", False),              # missing local part
    ("test@example", False),              # missing TLD
    ("test@example.com", True),           # normal valid email
    ("test.name@example.com", True),      # dot in local part
    ("test+tag@example.com", True),       # plus addressing
    ("TEST@EXAMPLE.COM", True),           # uppercase
    ("test@sub.example.com", True),       # subdomain
])
def test_email_validation(email, should_be_valid):
    response = client.post("/validate-signup", json={
        "fullName": "John Doe",
        "email": email,
        "contactNumber": "123456789",
        "password": "password123",
        "role": "jobseeker",
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
    ("123-456-789", False),           # contains hyphens (regex expects digits only)
    ("123 456 789", False),           # contains spaces
])
def test_contact_number_validation(contact_number, should_be_valid):
    response = client.post("/validate-signup", json={
        "fullName": "John Doe",
        "email": "test@example.com",
        "contactNumber": contact_number,
        "password": "password123",
        "role": "jobseeker",
    })
    data = response.json()
    if should_be_valid:
        assert "contactNumber" not in data["errors"]
    else:
        assert "contactNumber" in data["errors"]


# --- Password field: 10 test cases ---
@pytest.mark.parametrize("password,should_be_valid", [
    ("", False),                      # empty
    ("     ", False),                 # whitespace only
    ("12345", False),                 # 5 chars, too short
    ("123456", True),                 # exactly 6 chars, boundary valid
    ("password", True),               # normal password
    ("P@ssw0rd!", True),              # special characters
    ("a" * 100, True),                # very long password
    ("      abcdef", True),           # leading whitespace but valid content
    ("123456789012345", True),        # long numeric password
    ("pw", False),                    # 2 chars, too short
])
def test_password_validation(password, should_be_valid):
    response = client.post("/validate-signup", json={
        "fullName": "John Doe",
        "email": "test@example.com",
        "contactNumber": "123456789",
        "password": password,
        "role": "jobseeker",
    })
    data = response.json()
    if should_be_valid:
        assert "password" not in data["errors"]
    else:
        assert "password" in data["errors"]


# --- Role field: 10 test cases ---
@pytest.mark.parametrize("role,should_be_valid", [
    ("", False),                      # empty
    ("   ", False),                   # whitespace only
    ("jobseeker", True),              # valid role
    ("employer", True),               # valid role
    ("admin", True),                  # currently accepted by backend (flags a gap: should admin be blocked here?)
    ("Jobseeker", True),              # different casing, currently accepted (backend doesn't normalize case)
    ("JOBSEEKER", True),              # all caps, currently accepted
    ("manager", True),                # unexpected role, currently accepted (backend only checks non-empty)
    ("123", True),                    # numeric string, currently accepted
    ("null", True),                   # literal string "null", currently accepted
])
def test_role_validation(role, should_be_valid):
    response = client.post("/validate-signup", json={
        "fullName": "John Doe",
        "email": "test@example.com",
        "contactNumber": "123456789",
        "password": "password123",
        "role": role,
    })
    data = response.json()
    if should_be_valid:
        assert "role" not in data["errors"]
    else:
        assert "role" in data["errors"]