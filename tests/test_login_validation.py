# tests/test_login_validation.py
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../src/OeKhyeJin/job-management")))

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


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
def test_login_email_validation(email, should_be_valid):
    response = client.post("/validate-login", json={
        "email": email,
        "password": "password123",
    })
    data = response.json()
    if should_be_valid:
        assert "email" not in data["errors"]
    else:
        assert "email" in data["errors"]


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
def test_login_password_validation(password, should_be_valid):
    response = client.post("/validate-login", json={
        "email": "test@example.com",
        "password": password,
    })
    data = response.json()
    if should_be_valid:
        assert "password" not in data["errors"]
    else:
        assert "password" in data["errors"]