"""Agent tests with a scripted fake LLM: they check the loop, tools and stop conditions, not LLM quality."""
import json
from types import SimpleNamespace as NS

import pytest
from fastapi.testclient import TestClient

from app.agent import SummaryAgent
from app.main import create_app

ARTICLE = "sports match result " * 20  # 60 words; FakeEmbedder maps it to the 'sports' centroid


def call(name, _id=None, **args):
    return NS(id=_id or f"c-{name}", function=NS(name=name, arguments=json.dumps(args)))


def step(*calls, tokens=100):
    return NS(choices=[NS(message=NS(content="", tool_calls=list(calls)))], usage=NS(total_tokens=tokens))


def plain(text="done", tokens=100):
    return NS(choices=[NS(message=NS(content=text, tool_calls=None))], usage=NS(total_tokens=tokens))


class FakeLLM:
    """chat.completions.create: calls with `tools` pop the next scripted agent step;
    structured tool calls (response_format) get canned JSON."""

    def __init__(self, script, tool_tokens=50, boom_on=None, error_message="LLM unavailable"):
        self.script, self.tool_tokens, self.boom_on = list(script), tool_tokens, boom_on
        self.error_message = error_message
        self.calls, self.chat = [], NS(completions=NS(create=self._create))

    def _create(self, **kw):
        self.calls.append(kw)
        if self.boom_on is not None and len(self.calls) == self.boom_on:
            raise RuntimeError(self.error_message)
        if "tools" in kw:
            return self.script.pop(0) if self.script else step(call("get_article_overview", reason="loop"))
        name = kw["response_format"]["json_schema"]["name"]
        body = ({"points": ["Point A.", "Point B.", " "]} if name == "key_points"
                else {"headline": "A headline", "summary": "A summary."})
        return NS(choices=[NS(message=NS(content="<think></think>" + json.dumps(body), tool_calls=None))],
                  usage=NS(total_tokens=self.tool_tokens))


def agent(engine, llm, **kw):
    return SummaryAgent(engine, llm, "Qwen/Qwen3-32B", **kw)


def test_happy_path(engine):
    llm = FakeLLM([
        step(call("get_article_overview", reason="look"), call("classify_article", reason="category")),
        step(call("find_related_articles", count=2, reason="related")),
        step(call("extract_key_points", count=4, reason="points")),
        step(call("write_summary", length="short", reason="write")),
        step(call("save_summary", reason="finish")),
    ])
    r = agent(engine, llm).run(ARTICLE)
    assert r.complete and r.stop_reason == "Saved the summary"
    assert (r.headline, r.summary) == ("A headline", "A summary.")
    assert r.key_points == ["Point A.", "Point B."]          # blank point dropped, <think> stripped
    assert r.category == "sports" and r.category_confident is True
    assert len(r.related) == 2 and all(x["category"] == "sports" for x in r.related)
    assert [t["tool"] for t in r.trace] == ["get_article_overview", "classify_article", "find_related_articles",
                                            "extract_key_points", "write_summary", "save_summary"]
    assert r.trace[0]["reason"] == "look" and "reason" not in r.trace[2]["args"]
    assert r.tokens_used == 5 * 100 + 2 * 50                  # loop tokens + tool-internal LLM tokens
    # the article reaches the tool prompts inside tags, flagged as untrusted; /no_think added for Qwen3
    tool_prompt = next(c for c in llm.calls if "tools" not in c)["messages"][0]["content"]
    assert all("tool_choice" not in c for c in llm.calls)
    assert "<article>" in tool_prompt and "untrusted" in tool_prompt and tool_prompt.endswith("/no_think")
    # the agent loop never sees more than the 300-char preview
    loop_text = json.dumps([c["messages"] for c in llm.calls if "tools" in c])
    assert ARTICLE.strip() not in loop_text


def test_recovers_from_tool_errors(engine):
    llm = FakeLLM([
        step(call("save_summary", reason="too early")),                       # error: no summary yet
        step(call("does_not_exist", reason="oops")),                          # unknown tool
        step(call("write_summary", length="huge", reason="bad enum")),        # invalid argument
        step(call("write_summary", length="detailed", focus="results", reason="ok")),
        step(call("save_summary", reason="finish")),
    ])
    r = agent(engine, llm).run(ARTICLE)
    assert r.complete and r.steps == 5
    tool_msgs = [m["content"] for c in llm.calls[-1:] for m in c["messages"] if m["role"] == "tool"]
    assert "no summary yet" in tool_msgs[0] and "unknown tool" in tool_msgs[1] and "length must be" in tool_msgs[2]


def test_malformed_arguments_do_not_crash(engine):
    bad = NS(id="x", function=NS(name="write_summary", arguments="{not json"))
    r = agent(engine, FakeLLM([step(bad), step(call("write_summary", length="short", reason="r")),
                               step(call("save_summary", reason="r"))])).run(ARTICLE)
    assert r.complete


def test_max_steps_returns_partial(engine):
    llm = FakeLLM([step(call("write_summary", length="short", reason="w"))] + [])  # then loops on overview
    r = agent(engine, llm, max_steps=3).run(ARTICLE)
    assert not r.complete and r.steps == 3 and r.stop_reason.startswith("Reached the maximum number of steps")
    assert r.summary == "A summary." and "draft" in r.stop_reason


def test_token_budget_stops(engine):
    llm = FakeLLM([step(call("write_summary", length="short", reason="w"), tokens=900)], tool_tokens=200)
    r = agent(engine, llm, token_budget=1000).run(ARTICLE)
    assert not r.complete and r.stop_reason.startswith("Reached the token budget") and r.steps == 1


def test_model_stops_on_its_own(engine):
    r = agent(engine, FakeLLM([step(call("write_summary", length="short", reason="w")), plain()])).run(ARTICLE)
    assert r.complete and r.stop_reason.startswith("Saved the summary using the structured fallback") and r.summary


def test_unsupported_tool_calling_uses_direct_summary_fallback(engine):
    llm = FakeLLM(
        [],
        boom_on=1,
        error_message="LLM server returned 400: gemma3:1b does not support tools",
    )
    r = SummaryAgent(engine, llm, "gemma3:1b").run(ARTICLE, "one_sentence")

    assert r.complete
    assert r.summary == "A summary."
    assert r.stop_reason == "Saved the summary using the no-tools fallback"
    assert [item["tool"] for item in r.trace] == ["write_summary", "save_summary"]
    assert r.trace[0]["args"] == {"length": "one_sentence"}
    assert "tools" in llm.calls[0]  # first attempt identifies the provider limitation
    assert all("tools" not in request for request in llm.calls[1:])
    assert len([request for request in llm.calls if "response_format" in request]) == 2
    summary_prompt = llm.calls[-1]["messages"][0]["content"]
    assert "Preserve important names, decisions, outcomes, figures" in summary_prompt
    assert "Point A." in summary_prompt


def test_llm_failure_is_captured(engine):
    r = agent(engine, FakeLLM([step(call("get_article_overview", reason="r"))], boom_on=1)).run(ARTICLE)
    assert not r.complete and r.stop_reason.startswith("Error: LLM unavailable") and r.summary is None


def test_concurrent_runs_do_not_share_state(engine):
    a = agent(engine, FakeLLM([step(call("write_summary", length="short", reason="w"))]))
    r1 = a.run(ARTICLE, "short")
    r2 = a.run(ARTICLE, "short")
    assert r1.trace and r2.trace and r1.trace is not r2.trace


# ------------------------------------------------------------------ endpoint
def _client(engine, llm):
    return TestClient(create_app(engine=engine, llm_client=llm))


def test_endpoint_happy(engine):
    llm = FakeLLM([step(call("classify_article", reason="c")), step(call("write_summary", length="short", reason="w")),
                   step(call("save_summary", reason="s"))])
    with _client(engine, llm) as c:
        r = c.post("/api/v1/summarize", json={"text": ARTICLE, "length": "short"})
    assert r.status_code == 200
    b = r.json()
    assert b["complete"] and b["summary"] == "A summary." and b["category"] == "sports"
    assert [t["tool"] for t in b["trace"]] == ["classify_article", "write_summary", "save_summary"]


def test_endpoint_without_api_key(engine, monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "huggingface")
    monkeypatch.delenv("HF_API_KEY", raising=False)
    with TestClient(create_app(engine=engine)) as c:
        assert c.post("/api/v1/summarize", json={"text": ARTICLE}).status_code == 503
        assert c.post("/api/v1/classify", json={"text": ARTICLE}).status_code == 200  # rest still works


def test_endpoint_502_when_nothing_produced(engine):
    with _client(engine, FakeLLM([], boom_on=1)) as c:
        r = c.post("/api/v1/summarize", json={"text": ARTICLE})
    assert r.status_code == 502 and "LLM unavailable" in r.json()["detail"]


def test_endpoint_validates_input(engine):
    with _client(engine, FakeLLM([])) as c:
        assert c.post("/api/v1/summarize", json={"text": "too short"}).status_code == 422
        assert c.post("/api/v1/summarize", json={"text": ARTICLE, "length": "epic"}).status_code == 422
