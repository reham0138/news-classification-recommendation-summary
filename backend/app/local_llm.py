"""Minimal chat client for a local OpenAI-compatible server (Ollama). Standard library only.

It offers just `client.chat.completions.create(...)`, which is all app/agent.py uses,
and returns objects with the same attribute access (resp.choices[0].message.tool_calls, ...).
"""
import json
import urllib.error
import urllib.request
from types import SimpleNamespace


def _ns(x):
    if isinstance(x, dict):
        return SimpleNamespace(**{k: _ns(v) for k, v in x.items()})
    if isinstance(x, list):
        return [_ns(i) for i in x]
    return x


class LocalChatClient:
    def __init__(self, base_url: str, api_key: str = "local", timeout: float = 300):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))

    def _create(self, **kwargs):
        req = urllib.request.Request(
            f"{self.base_url}/chat/completions",
            data=json.dumps(kwargs).encode("utf-8"),
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {self.api_key}"},
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as r:
                data = json.load(r)
        except urllib.error.HTTPError as e:
            raise RuntimeError(f"LLM server returned {e.code}: {e.read().decode('utf-8', 'replace')[:300]}") from None
        except urllib.error.URLError as e:
            raise RuntimeError(f"Cannot reach the LLM server at {self.base_url}: {e.reason}") from None
        for choice in data.get("choices", []):
            choice.get("message", {}).setdefault("tool_calls", None)  # the agent reads this attribute
        return _ns(data)
