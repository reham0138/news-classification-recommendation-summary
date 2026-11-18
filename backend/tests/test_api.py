LONG_SPORTS = "sports match result " * 20


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_meta(client):
    m = client.get("/api/v1/meta").json()
    assert set(m["categories"]) == {"sports", "business", "technology", "health", "politics", "weather"}
    assert m["corpus_size"] == 360
    assert "LinearSVC" in m["algorithm"]


def test_classify(client):
    r = client.post("/api/v1/classify", json={"text": LONG_SPORTS, "top_k": 2})
    assert r.status_code == 200
    body = r.json()
    assert body["top_category"] == "sports"
    assert len(body["predictions"]) == 2
    probs = [p["probability"] for p in body["predictions"]]
    assert probs == sorted(probs, reverse=True) and 0 <= probs[-1] <= probs[0] <= 1
    assert body["confident"] is True


def test_short_text_rejected(client):
    assert client.post("/api/v1/classify", json={"text": "too short"}).status_code == 422


def test_blank_text_rejected(client):
    assert client.post("/api/v1/classify", json={"text": "   "}).status_code == 422


def test_short_but_allowed_text_warns(client):
    r = client.post("/api/v1/classify", json={"text": "sports " * 40})  # 40 words
    assert r.status_code == 200 and r.json()["warnings"]


def test_analyze_returns_similar(client):
    r = client.post("/api/v1/analyze", json={"text": LONG_SPORTS, "top_k_similar": 4})
    body = r.json()
    assert len(body["similar"]) == 4
    assert all(a["category"] == "sports" for a in body["similar"])
    sims = [a["similarity"] for a in body["similar"]]
    assert sims == sorted(sims, reverse=True)


def test_analyze_same_category_filter(client):
    r = client.post("/api/v1/analyze", json={"text": LONG_SPORTS, "same_category": True, "top_k_similar": 10})
    assert {a["category"] for a in r.json()["similar"]} == {"sports"}


def test_search_and_category_filter(client):
    r = client.post("/api/v1/search", json={"query": "business", "top_k": 5})
    assert r.status_code == 200 and len(r.json()["results"]) == 5
    r = client.post("/api/v1/search", json={"query": "business", "category": "health"})
    assert {a["category"] for a in r.json()["results"]} == {"health"}
    assert client.post("/api/v1/search", json={"query": "x y", "category": "nope"}).status_code == 422


def test_cors_preflight(client):
    r = client.options(
        "/api/v1/classify",
        headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST",
                 "Access-Control-Request-Headers": "content-type"},
    )
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"
