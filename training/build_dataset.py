"""Build an SFT dataset from opt-in local trajectories only."""
from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

def build(source: Path, output: Path) -> int:
    seen, rows = set(), []
    for path in sorted(source.glob("*.json")):
        item = json.loads(path.read_text(encoding="utf-8"))
        if not item.get("prompt") or not item.get("final_diff"): continue
        digest = hashlib.sha256((item["prompt"] + item["final_diff"]).encode()).hexdigest()
        if digest in seen: continue
        seen.add(digest); rows.append({"messages":[{"role":"user","content":item["prompt"]},{"role":"assistant","content":item["final_diff"]}]})
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text("".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")
    return len(rows)
if __name__ == "__main__":
    p=argparse.ArgumentParser(); p.add_argument("--source", type=Path, required=True); p.add_argument("--output", type=Path, required=True); a=p.parse_args(); print(build(a.source,a.output))
