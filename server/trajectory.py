"""Opt-in, local-only accepted-trajectory capture."""
from __future__ import annotations
import hashlib, json, os, re, time
from pathlib import Path
SECRET = re.compile(r"(?i)(api[_-]?key|token|password|secret)\s*([=:])\s*[^\s\"']+")
HOME_PATH = Path.home() / ".catalyst" / "trajectories"

def redact(value: str) -> str:
    value = str(value).replace(str(Path.home()), "<HOME>")
    return SECRET.sub(r"\1\2<REDACTED>", value)

def capture(payload: dict, enabled: bool = False, directory: Path = HOME_PATH) -> Path | None:
    if not enabled or not payload.get("accepted") or not payload.get("verifier_ok"):
        return None
    safe = {key: redact(json.dumps(value, ensure_ascii=False)) for key, value in payload.items() if key in {"prompt", "context_refs", "final_diff", "verifier_log"}}
    safe["created_at"] = time.time()
    digest = hashlib.sha256(json.dumps(safe, sort_keys=True).encode()).hexdigest()[:16]
    directory.mkdir(parents=True, exist_ok=True)
    target = directory / f"{digest}.json"
    target.write_text(json.dumps(safe, indent=2), encoding="utf-8")
    return target
