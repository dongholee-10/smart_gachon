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


# ── Community: edit / delete by author only ─────────────────────────────────

def _signup(client, email, name):
    res = client.post(
        "/auth/signup",
        json={"email": email, "password": VALID_PASSWORD, "name": name},
    )
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


def _create_post(client, token, title="원본 제목", content="원본 본문"):
    res = client.post(
        "/community/posts",
        json={"title": title, "content": content, "ticker": "TST"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201, res.text
    return res.json()


def test_author_can_update_own_post(client):
    token = _signup(client, "author@test.com", "Author")
    post = _create_post(client, token)
    res = client.patch(
        f"/community/posts/{post['id']}",
        json={"title": "수정된 제목", "content": "수정된 본문"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["title"] == "수정된 제목"
    assert body["content"] == "수정된 본문"
    # 빠뜨린 ticker 는 유지
    assert body["ticker"] == "TST"


def test_other_user_cannot_update_post(client):
    author_token = _signup(client, "owner@test.com", "Owner")
    post = _create_post(client, author_token)

    intruder_token = _signup(client, "intruder@test.com", "Intruder")
    res = client.patch(
        f"/community/posts/{post['id']}",
        json={"title": "탈취 시도"},
        headers={"Authorization": f"Bearer {intruder_token}"},
    )
    assert res.status_code == 403


def test_anonymous_cannot_update_post(client):
    author_token = _signup(client, "owner2@test.com", "Owner2")
    post = _create_post(client, author_token)

    res = client.patch(
        f"/community/posts/{post['id']}",
        json={"title": "익명 시도"},
    )
    assert res.status_code == 401


def test_empty_payload_rejected(client):
    token = _signup(client, "owner3@test.com", "Owner3")
    post = _create_post(client, token)
    res = client.patch(
        f"/community/posts/{post['id']}",
        json={},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 400


def test_author_can_delete_own_post(client):
    token = _signup(client, "deleter@test.com", "Deleter")
    post = _create_post(client, token)

    res = client.delete(
        f"/community/posts/{post['id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 204

    # 목록에서 사라짐
    listing = client.get("/community/posts").json()
    assert all(p["id"] != post["id"] for p in listing)


def test_other_user_cannot_delete_post(client):
    author_token = _signup(client, "ownerX@test.com", "OwnerX")
    post = _create_post(client, author_token)

    intruder_token = _signup(client, "intruderX@test.com", "IntruderX")
    res = client.delete(
        f"/community/posts/{post['id']}",
        headers={"Authorization": f"Bearer {intruder_token}"},
    )
    assert res.status_code == 403


def test_delete_missing_post_returns_404(client):
    token = _signup(client, "ghost@test.com", "Ghost")
    res = client.delete(
        "/community/posts/999999",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 404
