"""Deterministic local evaluator for Catalyst recipes.

Tasks are copied into a temporary directory before their check command runs;
this evaluator never executes checks in a fixture or user workspace directly.
An agent command is optional and receives task metadata through environment
variables, making the harness usable before the live edit protocol lands.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RESULTS = ROOT / "eval" / "results"
TASKS = ROOT / "eval" / "tasks"


def _rss_mb() -> float:
    try:
        import psutil
        return round(psutil.Process().memory_info().rss / 1024**2, 2)
    except ImportError:
        return 0.0


def _load_recipe(name: str) -> dict:
    if name == "baseline":
        return {"id": "baseline", "V": "off", "K": 1, "seed": 0, "temperature": 0}
    path = Path(name)
    if not path.is_file():
        path = ROOT / "config" / "recipes" / f"{name}.json"
    return json.loads(path.read_text(encoding="utf-8"))


def _task_paths(selector: str) -> list[Path]:
    paths = sorted(TASKS.glob("*/task.json"))
    if selector != "all":
        wanted = set(selector.split(","))
        paths = [path for path in paths if path.parent.name in wanted]
    return paths


def _run_task(task_path: Path, recipe: dict, agent_command: str | None) -> dict:
    task = json.loads(task_path.read_text(encoding="utf-8"))
    fixture = ROOT / "eval" / "fixtures" / task["fixture"]
    start, before = time.perf_counter(), _rss_mb()
    iterations = 0
    with tempfile.TemporaryDirectory(prefix="catalyst-eval-") as temp:
        work = Path(temp) / "workspace"
        shutil.copytree(fixture, work)
        max_iterations = int(recipe.get("K", 1)) if recipe.get("V", "off") != "off" else 1
        passed, logs = False, []
        for iterations in range(1, max_iterations + 1):
            env = {**os.environ, "CATALYST_EVAL_TASK": json.dumps(task), "CATALYST_EVAL_WORKSPACE": str(work), "CATALYST_EVAL_ITERATION": str(iterations)}
            if agent_command:
                generated = subprocess.run(agent_command, cwd=work, shell=True, capture_output=True, text=True, timeout=task.get("timeout_s", 120), env=env)
                logs.append((generated.stdout + generated.stderr)[-6000:])
            command = task["check"]
            if command.startswith("python ") or command.startswith("python3 "):
                command = f'"{sys.executable}" ' + command.split(" ", 1)[1]
            check = subprocess.run(command, cwd=work, shell=True, capture_output=True, text=True, timeout=task.get("timeout_s", 120))
            logs.append((check.stdout + check.stderr)[-6000:])
            passed = check.returncode == 0
            if passed or recipe.get("V", "off") == "off":
                break
    wall = time.perf_counter() - start
    tokens = 0  # populated by a real agent adapter; never infer or fabricate it
    return {"task_id": task["id"], "category": task["category"], "recipe_id": recipe.get("id", "unknown"), "passed": passed, "iterations": iterations, "wall_s": round(wall, 4), "tokens_out": tokens, "tok_per_s": 0.0 if not tokens else round(tokens / wall, 2), "peak_rss_mb": max(before, _rss_mb()), "log_tail": "\n".join(logs)[-6000:]}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--recipe", default="baseline")
    parser.add_argument("--tasks", default="all")
    parser.add_argument("--agent-command", help="Optional local command that edits CATALYST_EVAL_WORKSPACE")
    parser.add_argument("--run-id")
    args = parser.parse_args()
    recipe, task_paths = _load_recipe(args.recipe), _task_paths(args.tasks)
    if not task_paths:
        parser.error("No eval tasks selected")
    RESULTS.mkdir(parents=True, exist_ok=True)
    output = RESULTS / f"{args.run_id or uuid.uuid4().hex[:12]}.jsonl"
    with output.open("w", encoding="utf-8") as handle:
        for path in task_paths:
            record = _run_task(path, recipe, args.agent_command)
            handle.write(json.dumps(record, sort_keys=True) + "\n")
            print(f"{record['task_id']}: {'PASS' if record['passed'] else 'FAIL'}")
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
