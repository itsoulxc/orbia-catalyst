"""Local, time-bounded verification for disposable workspaces.

The verifier never writes to its target; callers must pass a copied workspace
when evaluating generated edits.  Commands are deliberately conservative and
can be extended per project in ``config/verifier.json``.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

MAX_LOG_CHARS = 6_000  # approximately 1,500 tokens
DEFAULT_TIMEOUT_S = 120
LEVELS = ("compile", "test", "lint", "run")


@dataclass(frozen=True)
class VerifyResult:
    ok: bool
    stage: str
    log_tail: str
    returncode: int = 0


def _config(root: Path) -> dict:
    candidates = (root / "config" / "verifier.json", Path(__file__).resolve().parents[1] / "config" / "verifier.json")
    for path in candidates:
        if path.is_file():
            try:
                return json.loads(path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                pass
    return {}


def detect_project_type(workspace: str | Path) -> str:
    root = Path(workspace)
    if (root / "package.json").is_file():
        return "node"
    if (root / "pyproject.toml").is_file() or (root / "pytest.ini").is_file():
        return "python"
    if (root / "Cargo.toml").is_file():
        return "rust"
    if any(root.glob("*.sln")):
        return "dotnet"
    return "unknown"


def _commands(workspace: Path, level: str) -> Iterable[tuple[str, list[str]]]:
    config = _config(workspace)
    project = detect_project_type(workspace)
    configured = config.get(project, {}).get(level)
    if configured:
        yield level, configured if isinstance(configured, list) else [configured]
        return
    defaults = {
        "node": {"compile": ["npm", "run", "build", "--if-present"], "test": ["npm", "test", "--", "--runInBand"], "lint": ["npm", "run", "lint", "--if-present"], "run": ["npm", "run", "start", "--if-present"]},
        "python": {"compile": ["python", "-m", "compileall", "-q", "."], "test": ["python", "-m", "pytest", "-q"], "lint": ["python", "-m", "ruff", "check", "."]},
        "rust": {"compile": ["cargo", "check", "--quiet"], "test": ["cargo", "test", "--quiet"], "lint": ["cargo", "clippy", "--", "-D", "warnings"]},
        "dotnet": {"compile": ["dotnet", "build", "--nologo"], "test": ["dotnet", "test", "--nologo"]},
    }
    command = defaults.get(project, {}).get(level)
    if command:
        yield level, command


def verify(workspace: str | Path, level: str = "compile+test", timeout_s: int = DEFAULT_TIMEOUT_S) -> VerifyResult:
    """Run configured stages and return a bounded failure log.

    ``level`` accepts one stage or a ``+`` separated progression.  Missing
    commands are a successful no-op so unknown project types remain usable.
    """
    root = Path(workspace).resolve()
    if not root.is_dir():
        return VerifyResult(False, "workspace", f"Workspace does not exist: {root}", 2)
    stages = [stage for stage in level.split("+") if stage in LEVELS]
    if not stages and level != "off":
        return VerifyResult(False, "configuration", f"Unknown verification level: {level}", 2)
    for stage in stages:
        commands = list(_commands(root, stage))
        for _, command in commands:
            # Windows Store aliases are commonly present without a usable
            # interpreter.  The running interpreter is always the safe one.
            if command and command[0].lower() in {"python", "python3"}:
                command = [sys.executable, *command[1:]]
            try:
                completed = subprocess.run(command, cwd=root, text=True, capture_output=True, timeout=timeout_s, shell=False)
            except FileNotFoundError:
                return VerifyResult(False, stage, f"Verifier command is unavailable: {command[0]}", 127)
            except subprocess.TimeoutExpired as error:
                output = (error.stdout or "") + (error.stderr or "")
                return VerifyResult(False, stage, (output + f"\nTimed out after {timeout_s}s")[-MAX_LOG_CHARS:], 124)
            output = ((completed.stdout or "") + (completed.stderr or "")).strip()
            if completed.returncode:
                return VerifyResult(False, stage, output[-MAX_LOG_CHARS:], completed.returncode)
    return VerifyResult(True, stages[-1] if stages else "off", "", 0)
