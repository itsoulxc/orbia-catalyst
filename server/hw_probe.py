"""Hardware-profile collection and conservative local inference defaults."""
from __future__ import annotations

import json
import os
import platform
import shutil
import time
from pathlib import Path
from typing import Any

try:
    import psutil
except ImportError:  # keeps the evaluator usable in a minimal Python install
    psutil = None


ROOT = Path(__file__).resolve().parents[1]
PROFILE_PATH = ROOT / "eval" / "hw_profile.json"


def _bandwidth_mb_s() -> float:
    # A local memory copy is only an estimate, but it is portable and avoids
    # network or GPU dependencies.
    payload = bytearray(32 * 1024 * 1024)
    started = time.perf_counter()
    _ = payload[:]
    return round(len(payload) / max(time.perf_counter() - started, 0.001) / 1_000_000, 1)


def probe() -> dict[str, Any]:
    total = (psutil.virtual_memory().total if psutil else 8 * 1024**3)
    ram_gb = round(total / 1024**3, 1)
    physical = psutil.cpu_count(logical=False) if psutil else None
    logical = os.cpu_count() or 1
    has_gpu = bool(os.environ.get("CUDA_VISIBLE_DEVICES")) or shutil.which("nvidia-smi") is not None
    tier = "T2" if has_gpu or ram_gb >= 32 else "T1" if ram_gb >= 16 else "T0"
    return {"schema_version": 1, "cpu": platform.processor() or platform.machine(), "physical_cores": physical or logical, "logical_cores": logical, "ram_gb": ram_gb, "memory_bandwidth_estimate_mb_s": _bandwidth_mb_s(), "gpu_present": has_gpu, "tier": tier}


def write_profile(path: str | Path = PROFILE_PATH) -> dict[str, Any]:
    profile = probe()
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(profile, indent=2) + "\n", encoding="utf-8")
    return profile


def suggested(model_id: str, profile: dict[str, Any] | None = None, overrides: dict[str, Any] | None = None) -> dict[str, Any]:
    profile = profile or (json.loads(PROFILE_PATH.read_text()) if PROFILE_PATH.exists() else probe())
    ram, cores = float(profile.get("ram_gb", 8)), int(profile.get("logical_cores", 4))
    is_large = any(name in model_id for name in ("zenith", "apex"))
    result = {
        "quant": "Q3_K_M" if ram <= 8 and is_large else "Q4_K_M",
        "n_ctx": 4096 if ram <= 8 else 8192,
        "n_threads": max(1, min(cores - 1 if cores > 2 else cores, 8)),
        "kv_type": "q4_0" if ram <= 8 else "q8_0",
        "draft_model": "spark-2.0" if model_id != "spark-2.0" else None,
    }
    result.update(overrides or {})
    return result
