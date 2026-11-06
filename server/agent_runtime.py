"""Shared Phase 6-10 agent runtime primitives.

The runtime is deliberately model-agnostic: models propose typed actions, while
Catalyst validates permissions, executes bounded tools, records evidence, and
can replay the trajectory for evaluation.
"""
from __future__ import annotations

import hashlib
import json
import os
import subprocess
import time
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Callable


@dataclass(frozen=True)
class ToolSpec:
    name: str
    description: str
    side_effect: bool
    requires_confirmation: bool


TOOL_REGISTRY = {
    "workspace.inspect": ToolSpec("workspace.inspect", "List workspace files", False, False),
    "workspace.search": ToolSpec("workspace.search", "Search text in workspace", False, False),
    "workspace.patch": ToolSpec("workspace.patch", "Apply one exact text replacement", True, True),
    "workspace.verify": ToolSpec("workspace.verify", "Run a safe project verification", True, True),
    "git.diff": ToolSpec("git.diff", "Read the current git diff", False, False),
}

AGENT_ROLES = [
    {"id": "explorer", "name": "Explorer", "purpose": "Map the repository and identify relevant files."},
    {"id": "planner", "name": "Planner", "purpose": "Turn the request into ordered, testable steps."},
    {"id": "implementer", "name": "Implementer", "purpose": "Propose or apply the smallest safe patch."},
    {"id": "tester", "name": "Tester", "purpose": "Run allowed checks and collect evidence."},
    {"id": "reviewer", "name": "Reviewer", "purpose": "Review the diff for regressions and risk."},
]


@dataclass
class Action:
    tool: str
    arguments: dict[str, Any]
    confirmation: bool = False


class Policy:
    def __init__(self, root: str, allow_network: bool = False):
        self.root = os.path.abspath(root)
        self.allow_network = allow_network

    def check(self, action: Action) -> tuple[bool, str]:
        spec = TOOL_REGISTRY.get(action.tool)
        if not spec:
            return False, f"Unknown tool: {action.tool}"
        if spec.requires_confirmation and not action.confirmation:
            return False, f"Confirmation required for {action.tool}"
        target = action.arguments.get("path") or action.arguments.get("file")
        if target:
            candidate = os.path.abspath(os.path.join(self.root, str(target)))
            if os.path.commonpath([self.root, candidate]) != self.root:
                return False, "Path escapes the workspace"
        return True, "allowed"


class TrajectoryLog:
    def __init__(self, directory: str):
        self.path = Path(directory) / "agent_trajectories.jsonl"
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def record(self, event: dict[str, Any]) -> None:
        event = {"timestamp": time.time(), **event}
        with self.path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(event, ensure_ascii=False) + "\n")


def model_route(hardware: dict[str, Any], task: str) -> dict[str, Any]:
    """Select a safe tier; difficult tasks may request escalation explicitly."""
    text = task.lower()
    difficult = any(word in text for word in ("architect", "migrate", "debug", "refactor", "security"))
    recommended = hardware.get("recommended_model", "prism-2.0")
    if difficult and recommended in {"spark-2.0", "prism-2.0"}:
        recommended = "zenith-2.0"
    return {"model_id": recommended, "reason": "task_complexity" if difficult else "hardware_fit"}


def action_digest(action: Action) -> str:
    payload = json.dumps(asdict(action), sort_keys=True).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()
