"""Phase 5 interface only.

Future GRPO-style work will group multiple patches for the same task and use
this deterministic verifier reward; it will not train from Anthropic outputs.
"""
from __future__ import annotations
def verifier_reward(passed: bool, iterations: int, max_iterations: int = 4) -> float:
    """Verifier pass plus a small efficiency bonus; no training implementation."""
    if not passed: return 0.0
    return 1.0 + 0.1 * max(0, max_iterations - iterations) / max(1, max_iterations)
