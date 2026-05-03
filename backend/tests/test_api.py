from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root():
    response = client.get("/")

    assert response.status_code == 200
    assert "message" in response.json()


def test_analyze_news():
    payload = {
        "title": "Company faces investigation after earnings decline",
        "content": "The company reported a revenue decline and is now under investigation by regulators.",
        "ticker": "TEST"
    }

    response = client.post("/analyze", json=payload)

    assert response.status_code == 200

    data = response.json()

    assert data["ticker"] == "TEST"
    assert "risk_score" in data
    assert "risk_level" in data
    assert "explanation" in data