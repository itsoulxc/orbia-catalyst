from __future__ import annotations
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "server"))
from hw_probe import write_profile

if __name__ == "__main__":
    print(write_profile())
