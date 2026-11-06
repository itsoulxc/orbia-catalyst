"""Deterministic Phase 5 training-data validator and benchmark reporter.

This deliberately uses only the Python standard library so it can run in Colab,
CI, or an installed Catalyst runtime without loading a model.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any


REQUIRED = {"prompt", "response", "rating"}


def load_jsonl(path: Path) -> tuple[list[dict[str, Any]], list[str]]:
    rows: list[dict[str, Any]] = []
    errors: list[str] = []
    if not path.exists():
        return rows, [f"missing file: {path}"]
    for line_no, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not raw.strip():
            continue
        try:
            item = json.loads(raw)
        except json.JSONDecodeError as exc:
            errors.append(f"line {line_no}: invalid JSON ({exc.msg})")
            continue
        missing = REQUIRED - item.keys() if isinstance(item, dict) else REQUIRED
        if missing:
            errors.append(f"line {line_no}: missing {sorted(missing)}")
            continue
        if item["rating"] not in {"up", "down"}:
            errors.append(f"line {line_no}: rating must be up or down")
            continue
        if not str(item["prompt"]).strip() or not str(item["response"]).strip():
            errors.append(f"line {line_no}: prompt and response cannot be empty")
            continue
        rows.append(item)
    return rows, errors


def score(row: dict[str, Any]) -> dict[str, Any]:
    text = str(row["response"])
    checks = {
        "has_content": bool(text.strip()),
        "no_identity_filler": not bool(re.search(r"as an ai language model|i am an ai", text, re.I)),
        "fenced_code_when_present": ("```" not in text or bool(re.search(r"```[\w+-]*\s*\n[\s\S]*?```", text))),
    }
    passed = sum(checks.values())
    return {"id": row.get("id", ""), "rating": row["rating"], "score": passed / len(checks), "checks": checks}


def run(dataset: Path, output: Path) -> dict[str, Any]:
    rows, errors = load_jsonl(dataset)
    reports = [score(row) for row in rows]
    positives = [row for row in rows if row["rating"] == "up"]
    negatives = [row for row in rows if row["rating"] == "down"]
    report = {
        "dataset": str(dataset),
        "valid_rows": len(rows),
        "invalid_rows": len(errors),
        "positive_rows": len(positives),
        "negative_rows": len(negatives),
        "balance_ratio": round(min(len(positives), len(negatives)) / max(1, max(len(positives), len(negatives))), 3),
        "mean_structural_score": round(sum(item["score"] for item in reports) / max(1, len(reports)), 3),
        "errors": errors[:100],
        "rows": reports,
        "ready_for_training": bool(rows) and not errors and bool(positives) and bool(negatives),
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", default=r"D:\Catalyst\memory\self_training_dpo.jsonl")
    parser.add_argument("--output", default=r"D:\Catalyst\training\benchmark_report.json")
    args = parser.parse_args()
    result = run(Path(args.dataset), Path(args.output))
    print(json.dumps({key: value for key, value in result.items() if key not in {"rows", "errors"}}, indent=2))
    raise SystemExit(0 if result["ready_for_training"] else 1)
