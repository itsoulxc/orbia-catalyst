"""Resource checks used before and during local inference."""
import os
import psutil
from typing import Dict, Any

RAM_WARN_PCT = 93.0
RAM_WARN_FREE_MB = 750
RAM_CRIT_PCT = 97.0
RAM_CRIT_FREE_MB = 350
CPU_WARN_PCT = 94.0
CPU_CRIT_PCT = 99.0
DISK_CRIT_FREE_MB = 300

# Approximate working-set requirement per model (MB), including KV cache headroom
MODEL_RAM_MB = {
    "spark-2.1": 1500,
    "spark-2.0": 700,
    "prism-2.0": 1500,
    "zenith-2.0": 2600,
    "apex-1.2": 5600,
}


def snapshot() -> Dict[str, Any]:
    vm = psutil.virtual_memory()
    try:
        disk_free = psutil.disk_usage(os.path.abspath(os.environ.get("CATALYST_HOME", os.getcwd()))).free / (1024 * 1024)
    except Exception:
        disk_free = 10 ** 6
    return {
        "ram_percent": vm.percent,
        "ram_free_mb": int(vm.available / (1024 * 1024)),
        "ram_total_mb": int(vm.total / (1024 * 1024)),
        "cpu_percent": psutil.cpu_percent(interval=None),
        "disk_free_mb": int(disk_free),
    }


def evaluate() -> Dict[str, Any]:
    s = snapshot()
    reasons = []
    level = "ok"
    if s["ram_percent"] >= RAM_CRIT_PCT or s["ram_free_mb"] < RAM_CRIT_FREE_MB:
        level = "critical"
        reasons.append(f"Memory exhausted ({s['ram_percent']:.0f}% used, {s['ram_free_mb']} MB free)")
    elif s["ram_percent"] >= RAM_WARN_PCT or s["ram_free_mb"] < RAM_WARN_FREE_MB:
        level = "warning"
        reasons.append(f"Memory running low ({s['ram_percent']:.0f}% used, {s['ram_free_mb']} MB free)")
    if s["disk_free_mb"] < DISK_CRIT_FREE_MB:
        level = "critical"
        reasons.append(f"Disk nearly full on D: ({s['disk_free_mb']} MB free)")
    if s["cpu_percent"] >= CPU_CRIT_PCT and level != "critical":
        level = "warning" if level == "ok" else level
        reasons.append(f"CPU saturated ({s['cpu_percent']:.0f}%)")
    elif s["cpu_percent"] >= CPU_WARN_PCT and level == "ok":
        level = "warning"
        reasons.append(f"CPU load high ({s['cpu_percent']:.0f}%)")
    return {"level": level, "reasons": reasons, **s}


def preflight(model_id: str, model_loaded: bool) -> Dict[str, Any]:
    """Can the machine run this task right now?"""
    state = evaluate()
    # A mapped model still needs KV-cache and generation headroom.
    needed = 350 if model_loaded else MODEL_RAM_MB.get(model_id, 1500)
    if state["level"] == "critical":
        state["level"] = "critical"
        state["can_proceed"] = False
    else:
        state["can_proceed"] = True
        if not model_loaded and state["ram_free_mb"] < needed:
            state["level"] = "warning"
            state["reasons"].append(
                f"Model may page to disk: about {needed} MB recommended, {state['ram_free_mb']} MB available"
            )
    return state
