# tests/test_interview_schedule_validation.py
import os
import sys

sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "../src/OeKhyeJin/job-management"))
)

import pytest
from fastapi.testclient import TestClient
from firebase_setup import verify_token
from main import app

# Fake a logged-in user so we can test field validation without needing a real token
app.dependency_overrides[verify_token] = lambda: {"uid": "test-employer-uid"}

client = TestClient(app)


def valid_interview_payload(**overrides):
    payload = {
        "interviewDate": "2026-08-15",
        "interviewTime": "14:30",
        "interviewLocation": "CariMakan HQ, Penang",
    }
    payload.update(overrides)
    return payload


def assert_field_result(response, field_name, should_be_valid):
    if should_be_valid:
        if response.status_code == 422:
            assert field_name not in response.json()["detail"]["errors"]
    else:
        assert response.status_code == 422
        assert field_name in response.json()["detail"]["errors"]


# --- Interview Date field: 10 test cases ---
@pytest.mark.parametrize(
    "interview_date,should_be_valid",
    [
        ("", False),  # empty
        ("   ", False),  # whitespace only
        ("2026-08-15", True),  # normal ISO date
        ("15/08/2026", True),  # alternate format (no strict format check)
        ("August 15, 2026", True),  # written-out date
        ("2026-13-45", True),  # invalid calendar date, but still non-empty (no calendar validation)
        ("a" * 50, True),  # long non-empty string
        ("2026-08-15 ", True),  # trailing space, still non-empty after strip
        ("15-08-2026", True),  # dash-separated alternate format
        ("Tomorrow", True),  # relative date text (currently allowed, no strict format check)
    ],
)
def test_interview_date_validation(interview_date, should_be_valid):
    response = client.put(
        "/applications/test-app-id/schedule-interview",
        json=valid_interview_payload(interviewDate=interview_date),
    )
    assert_field_result(response, "interviewDate", should_be_valid)


# --- Interview Time field: 10 test cases ---
@pytest.mark.parametrize(
    "interview_time,should_be_valid",
    [
        ("", False),  # empty
        ("   ", False),  # whitespace only
        ("14:30", True),  # normal 24-hour format
        ("2:30 PM", True),  # 12-hour format with AM/PM
        ("14:30:00", True),  # with seconds
        ("25:99", True),  # invalid time values, but still non-empty (no strict validation)
        ("a" * 50, True),  # long non-empty string
        ("14:30 ", True),  # trailing space, still non-empty after strip
        ("Morning", True),  # relative time text (currently allowed, no strict format check)
        ("2.30pm", True),  # unusual but non-empty format
    ],
)
def test_interview_time_validation(interview_time, should_be_valid):
    response = client.put(
        "/applications/test-app-id/schedule-interview",
        json=valid_interview_payload(interviewTime=interview_time),
    )
    assert_field_result(response, "interviewTime", should_be_valid)


# --- Interview Location field: 10 test cases ---
@pytest.mark.parametrize(
    "interview_location,should_be_valid",
    [
        ("", False),  # empty
        ("   ", False),  # whitespace only
        ("A", True),  # single character
        ("CariMakan HQ, Penang", True),  # normal location
        ("Zoom Meeting", True),  # virtual location
        ("吉隆坡总部", True),  # non-Latin characters
        ("a" * 200, True),  # very long location
        ("Office #12-3, Block B", True),  # symbols and numbers
        ("   padded with spaces   ", True),  # padded but non-empty
        ("!!!", True),  # symbols only (currently allowed)
    ],
)
def test_interview_location_validation(interview_location, should_be_valid):
    response = client.put(
        "/applications/test-app-id/schedule-interview",
        json=valid_interview_payload(interviewLocation=interview_location),
    )
    assert_field_result(response, "interviewLocation", should_be_valid)


# Clean up the override so it doesn't leak into other test files
def teardown_module():
    app.dependency_overrides.clear()
