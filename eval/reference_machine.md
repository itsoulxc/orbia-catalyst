# Reference-machine protocol

Run `python eval/bench_hw.py` on every reference machine before evaluating a
recipe.  The generated `eval/hw_profile.json` records CPU, memory, a local
memory-copy bandwidth estimate, GPU presence and the inferred tier:

| Tier | Target |
| --- | --- |
| T0 | 8 GB RAM, no GPU |
| T1 | 16 GB RAM, iGPU or small GPU |
| T2 | 32 GB+ RAM or dedicated GPU |

Never compare throughput across machines without attaching both profile files.
