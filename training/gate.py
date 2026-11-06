"""Promotion gate: no aggregate or category regression beyond policy."""
from __future__ import annotations
def promote(base: dict, candidate: dict, max_category_regression: float = 0.02) -> tuple[bool, str]:
    if candidate.get("pass_rate", 0) < base.get("pass_rate", 0): return False, "aggregate pass rate regressed"
    for category, base_score in base.get("pass_rate_by_category", {}).items():
        if candidate.get("pass_rate_by_category", {}).get(category, 0) < base_score - max_category_regression:
            return False, f"{category} regressed by more than two points"
    return True, "promoted"
