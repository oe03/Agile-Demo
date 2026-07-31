# tests/test_company_profile_validation.py
import os
import sys

sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "../src/OeKhyeJin/job-management"))
)

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def valid_company_payload(**overrides):
    payload = {
        "companyDescription": "We build great software.",
        "companyLocation": "Penang, Malaysia",
        "companyContact": "hr@company.com",
    }
    payload.update(overrides)
    return payload


# --- Company Description field: 10 test cases ---
@pytest.mark.parametrize(
    "company_description,should_be_valid",
    [
        ("", False),  # empty
        ("   ", False),  # whitespace only
        ("A", True),  # single character
        ("We build great software.", True),  # normal description
        ("a" * 1000, True),  # very long description
        ("Line1\nLine2\nLine3", True),  # multi-line text
        ("我们是一家科技公司", True),  # non-Latin characters
        (
            "<script>alert(1)</script>",
            True,
        ),  # HTML tags (currently allowed, worth flagging for XSS review)
        ("   padded with spaces   ", True),  # padded but non-empty
        ("Est. 2020, 50+ employees.", True),  # punctuation and numbers
    ],
)
def test_company_description_validation(company_description, should_be_valid):
    response = client.post(
        "/validate-company-profile",
        json=valid_company_payload(companyDescription=company_description),
    )
    data = response.json()
    if should_be_valid:
        assert "companyDescription" not in data["errors"]
    else:
        assert "companyDescription" in data["errors"]


# --- Company Location field: 10 test cases ---
@pytest.mark.parametrize(
    "company_location,should_be_valid",
    [
        ("", False),  # empty
        ("   ", False),  # whitespace only
        ("A", True),  # single character
        ("Penang, Malaysia", True),  # normal location
        ("Kuala Lumpur", True),  # two words
        ("Remote", True),  # single word
        ("吉隆坡", True),  # non-Latin characters
        ("a" * 100, True),  # very long location
        ("Location123", True),  # letters + numbers
        ("!!!", True),  # symbols (currently allowed)
    ],
)
def test_company_location_validation(company_location, should_be_valid):
    response = client.post(
        "/validate-company-profile",
        json=valid_company_payload(companyLocation=company_location),
    )
    data = response.json()
    if should_be_valid:
        assert "companyLocation" not in data["errors"]
    else:
        assert "companyLocation" in data["errors"]


# --- Company Contact field: 10 test cases (must be valid email OR valid Malaysian phone) ---
@pytest.mark.parametrize(
    "company_contact,should_be_valid",
    [
        ("", False),  # empty
        ("   ", False),  # whitespace only
        ("sdadasda", False),  # random text, not email or phone
        ("hr@company.com", True),  # valid email
        ("hr.team@company.co", True),  # valid email with subdomain-like TLD
        ("0123456789", True),  # valid local phone (10 digits)
        ("01123456789", True),  # valid local phone (11 digits)
        ("+60123456789", True),  # valid phone with country code
        ("12345", False),  # too short to be a valid phone, not an email
        ("not-an-email@", False),  # malformed email
    ],
)
def test_company_contact_validation(company_contact, should_be_valid):
    response = client.post(
        "/validate-company-profile",
        json=valid_company_payload(companyContact=company_contact),
    )
    data = response.json()
    if should_be_valid:
        assert "companyContact" not in data["errors"]
    else:
        assert "companyContact" in data["errors"]
