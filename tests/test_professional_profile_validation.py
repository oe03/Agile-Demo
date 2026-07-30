# tests/test_professional_profile_validation.py
import os
import sys

sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "../src/OeKhyeJin/job-management"))
)

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def valid_professional_payload(**overrides):
    payload = {
        "summary": "Experienced software engineer with 5 years in web development.",
        "skills": "Python, JavaScript, SQL",
    }
    payload.update(overrides)
    return payload


# --- Summary field: 10 test cases ---
@pytest.mark.parametrize(
    "summary,should_be_valid",
    [
        ("", False),  # empty
        ("   ", False),  # whitespace only
        ("A", True),  # single character
        ("Experienced developer.", True),  # normal summary
        ("a" * 1000, True),  # very long summary
        ("Line1\nLine2\nLine3", True),  # multi-line text
        ("经验丰富的软件工程师", True),  # non-Latin characters
        ("5+ years, B.Sc. Computer Science.", True),  # punctuation and numbers
        ("   padded with spaces   ", True),  # padded but non-empty
        (
            "<script>alert(1)</script>",
            True,
        ),  # HTML tags (currently allowed, worth flagging for XSS review)
    ],
)
def test_summary_validation(summary, should_be_valid):
    response = client.post(
        "/validate-professional-profile",
        json=valid_professional_payload(summary=summary),
    )
    data = response.json()
    if should_be_valid:
        assert "summary" not in data["errors"]
    else:
        assert "summary" in data["errors"]


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
        ("a" * 200, True),  # very long single string
        ("技能一, 技能二", True),  # non-Latin characters
        ("   Python   ", True),  # padded but non-empty
    ],
)
def test_skills_validation(skills, should_be_valid):
    response = client.post(
        "/validate-professional-profile",
        json=valid_professional_payload(skills=skills),
    )
    data = response.json()
    if should_be_valid:
        assert "skills" not in data["errors"]
    else:
        assert "skills" in data["errors"]
