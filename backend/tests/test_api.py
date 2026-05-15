def test_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()


def test_signup_then_login(client):
    signup = client.post(
        "/auth/signup",
        json={"email": "alice@test.com", "password": "secret123", "name": "Alice"},
    )
    assert signup.status_code == 200, signup.text
    token = signup.json()["access_token"]
    assert token

    login = client.post(
        "/auth/login",
        json={"email": "alice@test.com", "password": "secret123"},
    )
    assert login.status_code == 200

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "alice@test.com"


def test_login_wrong_password_rejected(client):
    client.post(
        "/auth/signup",
        json={"email": "bob@test.com", "password": "right-one", "name": "Bob"},
    )
    bad = client.post(
        "/auth/login",
        json={"email": "bob@test.com", "password": "wrong-one"},
    )
    assert bad.status_code == 401


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
