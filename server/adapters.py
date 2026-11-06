"""Adapter registry with local versioned load and rollback semantics."""
from __future__ import annotations
import json
from pathlib import Path

class AdapterRegistry:
    def __init__(self, path: str | Path):
        self.path = Path(path); self.path.parent.mkdir(parents=True, exist_ok=True)
        self.data = json.loads(self.path.read_text()) if self.path.exists() else {"active": {}, "history": {}}
    def activate(self, model: str, version: str) -> None:
        previous = self.data["active"].get(model)
        history = self.data["history"].setdefault(model, [])
        if previous and previous != version: history.append(previous)
        self.data["history"][model] = history[-2:]
        self.data["active"][model] = version; self.save()
    def rollback(self, model: str) -> str | None:
        history = self.data["history"].get(model, [])
        if not history: return None
        prior = history.pop(); current = self.data["active"].get(model)
        if current: history.append(current)
        self.data["history"][model] = history[-2:]; self.data["active"][model] = prior; self.save(); return prior
    def active(self, model: str) -> str | None: return self.data["active"].get(model)
    def save(self): self.path.write_text(json.dumps(self.data, indent=2) + "\n")
