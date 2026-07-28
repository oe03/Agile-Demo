# tests/test_job_validation.py
import os
import sys


sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "../src/OeKhyeJin/job-management"))
)

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def valid_job_payload(**overrides):
    """Base valid payload for /validate-job, with specific fields overridden per test."""
    payload = {
        "companyName": "OE Technologies",
        "title": "Software Engineer",
        "description": "Build and maintain web applications.",
        "salary": "3000",
        "location": "Penang, Malaysia",
        "jobType": "fulltime",
        "skills": "Python, JavaScript",
    }
    payload.update(overrides)
    return payload


# --- Company Name field: 10 test cases ---
@pytest.mark.parametrize(
    "company_name,should_be_valid",
    [
        ("", False),  # empty
        ("   ", False),  # whitespace only
        ("A", True),  # single character
        ("OE Technologies", True),  # normal name
        ("O'Brien & Co", True),  # apostrophe + ampersand
        ("Tech-Solutions", True),  # hyphen
        ("字节跳动", True),  # non-Latin characters
        ("a" * 100, True),  # very long name
        ("Company123", True),  # letters + numbers
        ("!!!", True),  # symbols (currently allowed)
    ],
)
def test_job_company_name_validation(company_name, should_be_valid):
    response = client.post("/validate-job", json=valid_job_payload(companyName=company_name))
    data = response.json()
    if should_be_valid:
        assert "companyName" not in data["errors"]
    else:
        assert "companyName" in data["errors"]


# --- Job Title field: 10 test cases ---
@pytest.mark.parametrize(
    "title,should_be_valid",
    [
        ("", False),  # empty
        ("   ", False),  # whitespace only
        ("A", True),  # single character
        ("Software Engineer", True),  # normal title
        ("Senior Dev (Remote)", True),  # parentheses
        ("Full-Stack Developer", True),  # hyphen
        ("软件工程师", True),  # non-Latin characters
        ("a" * 100, True),  # very long title
        ("Engineer123", True),  # letters + numbers
        ("!!!", True),  # symbols (currently allowed)
    ],
)
def test_job_title_validation(title, should_be_valid):
    response = client.post("/validate-job", json=valid_job_payload(title=title))
    data = response.json()
    if should_be_valid:
        assert "title" not in data["errors"]
    else:
        assert "title" in data["errors"]


# --- Description field: 10 test cases ---
@pytest.mark.parametrize(
    "description,should_be_valid",
    [
        ("", False),  # empty
        ("   ", False),  # whitespace only
        ("A", True),  # single character
        ("Build and maintain web apps.", True),  # normal description
        ("a" * 1000, True),  # very long description
        ("Line1\nLine2\nLine3", True),  # multi-line text
        ("Requires 3+ years experience.", True),  # normal with punctuation
        ("需要三年以上经验", True),  # non-Latin characters
        (
            "<script>alert(1)</script>",
            True,
        ),  # HTML/script tags (currently allowed, worth flagging for XSS review)
        ("   leading and trailing   ", True),  # padded but non-empty content
    ],
)
def test_job_description_validation(description, should_be_valid):
    response = client.post("/validate-job", json=valid_job_payload(description=description))
    data = response.json()
    if should_be_valid:
        assert "description" not in data["errors"]
    else:
        assert "description" in data["errors"]


# --- Salary field: 10 test cases ---
@pytest.mark.parametrize(
    "salary,should_be_valid",
    [
        ("", False),  # empty
        ("   ", False),  # whitespace only
        ("3000", True),  # normal numeric value
        ("0", True),  # zero (currently allowed)
        ("999999999", True),  # very large number
        ("abc", False),  # letters only
        ("3000.50", False),  # decimal point not allowed (isdigit() rejects it)
        ("3,000", False),  # comma not allowed
        ("-3000", False),  # negative sign not allowed
        ("3000 ", True),  # trailing space (fails isdigit after strip check inconsistency)
    ],
)
def test_job_salary_validation(salary, should_be_valid):
    response = client.post("/validate-job", json=valid_job_payload(salary=salary))
    data = response.json()
    if should_be_valid:
        assert "salary" not in data["errors"]
    else:
        assert "salary" in data["errors"]


# --- Location field: 10 test cases ---
@pytest.mark.parametrize(
    "location,should_be_valid",
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
def test_job_location_validation(location, should_be_valid):
    response = client.post("/validate-job", json=valid_job_payload(location=location))
    data = response.json()
    if should_be_valid:
        assert "location" not in data["errors"]
    else:
        assert "location" in data["errors"]


# --- Job Type field: 10 test cases ---
@pytest.mark.parametrize(
    "job_type,should_be_valid",
    [
        ("", False),  # empty
        ("   ", False),  # whitespace only
        ("fulltime", True),  # valid option
        ("parttime", True),  # valid option
        ("internship", True),  # valid option
        ("contract", True),  # unexpected value, currently accepted (backend only checks non-empty)
        ("Fulltime", True),  # different casing, currently accepted
        ("FULLTIME", True),  # all caps, currently accepted
        ("123", True),  # numeric string, currently accepted
        ("null", True),  # literal string "null", currently accepted
    ],
)
def test_job_type_validation(job_type, should_be_valid):
    response = client.post("/validate-job", json=valid_job_payload(jobType=job_type))
    data = response.json()
    if should_be_valid:
        assert "jobType" not in data["errors"]
    else:
        assert "jobType" in data["errors"]


# --- Skills field: 10 test cases ---
@pytest.mark.parametrize(
    "skills,should_be_valid",
    [
        ("", False),  # empty
        ("   ", False),  # whitespace only
        ("Python", True),  # single skill
        ("Python, JavaScript", True),  # multiple skills
        ("Python,JavaScript", True),  # no space after comma
        ("Python, JavaScript, React, Node.js, SQL", True),  # many skills
        ("C++", True),  # symbols in skill name
        (
            "Python, , JavaScript",
            True,
        ),  # extra comma (currently allowed, empty entries just get filtered)
        ("a" * 200, True),  # very long single string
        ("技能一, 技能二", True),  # non-Latin characters
    ],
)
def test_job_skills_validation(skills, should_be_valid):
    response = client.post("/validate-job", json=valid_job_payload(skills=skills))
    data = response.json()
    if should_be_valid:
        assert "skills" not in data["errors"]
    else:
        assert "skills" in data["errors"]
