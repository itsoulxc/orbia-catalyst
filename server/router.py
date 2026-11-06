"""Feature-flagged, explainable task routing (Phase 3 scaffold)."""
from __future__ import annotations
from dataclasses import dataclass, asdict
from typing import Any

@dataclass(frozen=True)
class RoutingDecision:
    model_id: str
    reason: str
    score: int
    escalated: bool = False

def route(prompt: str, files_touched: int = 0, verifier_failed: bool = False, enabled: bool = False) -> RoutingDecision:
    if not enabled:
        return RoutingDecision("prism-2.1", "router_disabled", 0)
    text = prompt.lower()
    score = (2 if files_touched > 5 else 0) + (2 if len(prompt) > 1200 else 0)
    score += sum(1 for word in ("failing test", "debug", "migration", "security", "refactor") if word in text)
    score += 2 if verifier_failed else 0
    model = "spark-2.1" if score <= 1 else "prism-2.1" if score <= 3 else "zenith-2.1"
    return RoutingDecision(model, "difficulty_signals", score, verifier_failed)

def route_log(decision: RoutingDecision) -> dict[str, Any]:
    return asdict(decision)
