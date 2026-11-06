"""Phase-3 compatibility and Pareto primitives; search is deliberately gated."""
from __future__ import annotations
import argparse, json
from pathlib import Path
from typing import Iterable

def compat(recipe: dict, model: dict | None = None) -> tuple[bool, str]:
    model = model or {}
    if recipe.get("E") != "off" and not model.get("moe", False): return False, "expert offload requires MoE metadata"
    if recipe.get("S") != "off" and recipe.get("S") == recipe.get("model_id"): return False, "draft must differ from target"
    if recipe.get("K", 1) < 1: return False, "K must be positive"
    return True, "ok"

def pareto(records: Iterable[dict]) -> list[dict]:
    items = list(records)
    def dominates(a, b):
        return (a["pass_rate"] >= b["pass_rate"] and a["tok_per_s"] >= b["tok_per_s"] and a["peak_ram_gb"] <= b["peak_ram_gb"] and (a["pass_rate"] > b["pass_rate"] or a["tok_per_s"] > b["tok_per_s"] or a["peak_ram_gb"] < b["peak_ram_gb"]))
    return [a for a in items if not any(dominates(b, a) for b in items if b is not a)]

def main():
    parser = argparse.ArgumentParser(); parser.add_argument("--tier", required=True); parser.add_argument("--budget-minutes", type=int, required=True); args = parser.parse_args()
    config = Path(__file__).resolve().parents[1] / "config" / "search.yaml"
    # Avoid silently claiming benchmarks from a disabled or model-less harness.
    if "enabled: true" not in config.read_text(encoding="utf-8"):
        raise SystemExit("Search is disabled by config/search.yaml; enable only after providing a local agent command.")
    raise SystemExit("Search runner requires a local agent adapter; compatibility and Pareto utilities are ready.")
if __name__ == "__main__": main()
