"""The default LLM path: summary agent -> LocalChatClient -> an Ollama-style HTTP server (faked here)."""
import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from tests.test_agent import ARTICLE


class FakeOllama(BaseHTTPRequestHandler):
    models_seen: list[str] = []
    loop_calls = 0

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        FakeOllama.models_seen.append(body["model"])
        if "tools" in body:  # the agent loop: first two tools together, then save
            FakeOllama.loop_calls += 1
            names = ["classify_article", "write_summary"] if FakeOllama.loop_calls == 1 else ["save_summary"]
            msg = {"role": "assistant", "content": "", "tool_calls": [
                {"id": f"c{i}", "type": "function",
                 "function": {"name": n, "arguments": json.dumps({"reason": "because", **({"length": "short"} if n == "write_summary" else {})})}}
                for i, n in enumerate(names)]}
        else:  # a structured "write the summary" call made inside a tool
            msg = {"role": "assistant", "content": json.dumps({"headline": "A headline", "summary": "A summary."})}
        out = json.dumps({"choices": [{"message": msg}], "usage": {"total_tokens": 10}}).encode()
        self.send_response(200); self.send_header("Content-Type", "application/json"); self.end_headers()
        self.wfile.write(out)

    def log_message(self, *a):
        pass


@pytest.fixture()
def ollama():
    FakeOllama.models_seen, FakeOllama.loop_calls = [], 0
    srv = HTTPServer(("127.0.0.1", 0), FakeOllama)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{srv.server_port}/v1"
    srv.shutdown()


def test_summarize_with_local_ollama_by_default(engine, ollama, monkeypatch):
    monkeypatch.delenv("LLM_PROVIDER", raising=False)
    monkeypatch.delenv("HF_API_KEY", raising=False)
    monkeypatch.setenv("LOCAL_LLM_URL", ollama)
    monkeypatch.setenv("LOCAL_LLM_MODEL", "qwen3:0.6b")
    with TestClient(create_app(engine=engine)) as c:
        r = c.post("/api/v1/summarize", json={"text": ARTICLE, "length": "short"})
    assert r.status_code == 200, r.text
    b = r.json()
    assert b["complete"] and b["summary"] == "A summary." and b["headline"] == "A headline"
    assert [t["tool"] for t in b["trace"]] == ["classify_article", "write_summary", "save_summary"]
    assert set(FakeOllama.models_seen) == {"qwen3:0.6b"}


def test_unreachable_ollama_gives_502_not_a_crash(engine, monkeypatch):
    monkeypatch.delenv("LLM_PROVIDER", raising=False)
    monkeypatch.setenv("LOCAL_LLM_URL", "http://127.0.0.1:9/v1")  # nothing listens here
    with TestClient(create_app(engine=engine)) as c:
        r = c.post("/api/v1/summarize", json={"text": ARTICLE})
    assert r.status_code == 502 and "Cannot reach the LLM server" in r.json()["detail"]
