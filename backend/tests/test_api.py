def test_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()


VALID_PASSWORD = "Hunter2!ab"


def test_signup_then_login(client):
    signup = client.post(
        "/auth/signup",
        json={"email": "alice@test.com", "password": VALID_PASSWORD, "name": "Alice"},
    )
    assert signup.status_code == 200, signup.text
    token = signup.json()["access_token"]
    assert token

    login = client.post(
        "/auth/login",
        json={"email": "alice@test.com", "password": VALID_PASSWORD},
    )
    assert login.status_code == 200

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "alice@test.com"


def test_login_wrong_password_rejected(client):
    client.post(
        "/auth/signup",
        json={"email": "bob@test.com", "password": VALID_PASSWORD, "name": "Bob"},
    )
    bad = client.post(
        "/auth/login",
        json={"email": "bob@test.com", "password": "Wrong-One!9"},
    )
    assert bad.status_code == 401


import pytest


@pytest.mark.parametrize(
    "weak_password,reason",
    [
        ("Short1!", "7글자 — 길이 부족"),
        ("alllower1!a", "대문자 없음"),
        ("ALLUPPER1!A", "소문자 없음"),
        ("NoDigitsHere!", "숫자 없음"),
        ("NoSpecial123A", "특수문자 없음"),
    ],
)
def test_signup_rejects_weak_password(client, weak_password, reason):
    res = client.post(
        "/auth/signup",
        json={
            "email": f"weak-{abs(hash(weak_password))}@test.com",
            "password": weak_password,
            "name": "X",
        },
    )
    assert res.status_code == 422, f"{reason}: {res.text}"


def test_analyze_news_with_text_blob(client):
    payload = {
        "text": "Company faces investigation after earnings decline and revenue decline.",
        "ticker": "TEST",
    }
    response = client.post("/analyze", json=payload)
    assert response.status_code == 200, response.text

    data = response.json()
    assert data["ticker"] == "TEST"
    assert data["risk_score"] >= 60
    assert "explanation" in data
    assert data["score"] == data["risk_score"]


def test_analyze_news_with_title_content(client):
    payload = {
        "title": "Company faces lawsuit",
        "content": "The company was sued and is under investigation by regulators.",
        "ticker": "TEST2",
    }
    response = client.post("/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["risk_level"] in {"Low", "Medium", "High"}

    fetched = client.get(f"/analyze/results/{data['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["id"] == data["id"]


def test_report_generation(client):
    analyze = client.post(
        "/analyze",
        json={"text": "Bankruptcy filing and CEO resigns amid fraud investigation."},
    )
    result_id = analyze.json()["id"]

    report = client.post("/report", json={"result_id": result_id})
    assert report.status_code == 200, report.text
    body = report.json()
    assert body["result_id"] == result_id
    assert "summary" in body and "recommendation" in body
