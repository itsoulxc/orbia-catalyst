# Catalyst Efficiency Ladder — Implementation Plan

Audience: Codex (implementer). Owner: itsoulxc. Status: ready to implement.

## 0. Goal and non-goals

**Goal.** Make local coding agents on weak PCs as good as possible at real repo tasks, measured, without usage limits. Capability comes mainly from the verified agent loop, routing, and a progressive adapter pipeline. Raw model size is not the lever.

**Non-goals (this batch).**
- No pretraining or architecture research.
- No distillation from Anthropic models (license/ToS). Teachers must be open-licensed (Qwen-family etc.) or our own model outputs.
- No data leaves the machine without explicit opt-in. Default off.
- Do not promise a Sonnet-class local model. Promise measured pass-rate and tok/s curves.

**Definition of done for the batch.** Phases 0–2 merged and green; Phase 3 scaffolding in place behind a flag; Phase 4 pipeline runnable end to end on a toy adapter. Phase 5 is a stub with the interface only.

---

## 1. Core idea: the Mixing Table

Instead of picking one technique, treat each technique as an ingredient with on/off/parameter options. A **recipe** is one combination. The system tries recipes, scores each on the eval harness and the reference machine, and keeps the best per hardware tier. Recipes are data, not code, so new ingredients can be added without touching the loop.

### 1.1 Ingredients (columns of the table)

| Code | Ingredient | Options | Lever |
|---|---|---|---|
| `V` | Verifier loop | off / compile / compile+test / compile+test+lint+run | correctness |
| `K` | Max verify iterations | 1, 2, 4, 8 | correctness vs time |
| `S` | Speculative decoding | off / draft=spark-2.0 / draft=spark-2.1 | speed |
| `Q` | Quant | Q3_K_M / Q4_K_M / Q5_K_M / IQ4_XS | speed/memory vs quality |
| `C` | KV cache | f16 / q8_0 / q4_0 | memory, context |
| `P` | Prompt/repo cache | off / on (repo map + file prefix pinned) | speed |
| `R` | Retrieval context | none / repo-map / repo-map+symbol-graph | quality on big repos |
| `E` | Expert offload (MoE only) | off / hot-experts-in-RAM | fit on weak PCs |
| `D` | Adapter | none / LoRA-vN | quality (progressive) |
| `T` | Test-time sampling | greedy / best-of-N (N=2,4) with verifier pick | correctness |
| `X` | Router | single model / difficulty-router | cost, speed |

### 1.2 Mixing rules

- Each recipe = one value per column. Invalid combos are rejected by a `compat()` function (e.g. `E` requires an MoE model; `S` requires draft vocab match; `T` best-of-N with `V=off` is allowed but scored by a judge model only).
- **Search, not grid.** Use successive halving: start with all cheap recipes on a 30-task subset, keep the top 25%, re-run on the full suite, keep the top 3, then run the reference-machine benchmark on those.
- **Mutations.** Each generation, mutate the top recipes by changing one or two columns (evolutionary search). Cap at 6 generations per tier per run.
- **Pareto, not single score.** Keep the Pareto front over (pass_rate, tok_per_s, peak_RAM_GB). Ship one recipe per hardware tier from the front, chosen by a weighted score in `config/search.yaml`.

### 1.3 Creative combinations to seed the first search

These are hypotheses to test, not assumptions:
1. `V=compile+test, K=4, S=spark-2.0, Q=Q4, C=q8` on Zenith 2.1 — expected best quality per second.
2. `T=best-of-2 with V=compile+test` on Prism 2.1 — cheap extra correctness.
3. `X=difficulty-router` (Spark → Prism → Zenith, escalate on verifier fail) — expected largest cost win.
4. `R=symbol-graph` on tasks touching >5 files — expected quality on multi-file tasks.
5. `E=hot-experts` on any future MoE with Q3 — expected fit on 8 GB RAM.

---

## 2. Phases

### Phase 0 — Eval harness and reference machine (blocking)

Nothing else starts until this exists.

- `eval/tasks/` — ~200 tasks. Each task: `task.json` (prompt, repo snapshot ref, files, `check` command), and a fixture repo under `eval/fixtures/`. Mix: 60% single-file fixes, 25% multi-file features, 15% debugging with failing tests. Start with 40 hand-written tasks; Codex may generate more from git history of this repo with the check being the existing tests.
- `eval/run.py` — runs one recipe on a task set, writes `eval/results/<run_id>.jsonl`. Fields: `task_id, recipe_id, passed, iterations, wall_s, tokens_out, tok_per_s, peak_rss_mb`.
- `eval/reference_machine.md` + `eval/bench_hw.py` — captures hardware (CPU, RAM, bandwidth estimate via a memcpy micro-bench, GPU if any) and writes a `hw_profile.json`. Define three tiers:
  - `T0`: 8 GB RAM, no GPU (the weak-PC target)
  - `T1`: 16 GB RAM, iGPU/small GPU
  - `T2`: 32 GB+ or dGPU
- Determinism: fixed seed, temperature 0 for baseline runs.

**Acceptance:** `python eval/run.py --recipe baseline --tasks all` runs end to end and produces results; `bench_hw.py` writes a profile on this machine.

### Phase 1 — Verified loop (`V`, `K`)

Files: `server/agent_runtime.py`, new `server/verifier.py`.

- `verifier.py` exposes `verify(workspace, level) -> VerifyResult{ok, stage, log_tail}` with levels `compile`, `test`, `lint`, `run`. Each level is a configured command per project type (detected from repo files: `package.json`, `pyproject.toml`, `Cargo.toml`, `*.sln`). Commands are timeboxed and run in a sandboxed working copy, never on user files directly during search.
- The agent loop: edit → verify → if fail, feed `log_tail` (truncated to 1.5k tokens) back → retry up to `K`.
- Log every iteration to the eval record.

**Acceptance:** baseline vs `V=compile+test,K=4` on Spark 2.1 shows a pass-rate improvement on the suite; record the number in the results file. A regression of pass rate with `V` on is a bug.

### Phase 2 — Inference stack (`S`, `Q`, `C`, `P`, `E`)

Files: `server/engine_server.py`, `server/overload_guard.py`, `models/models_manifest.json`, new `server/hw_probe.py`.

- `hw_probe.py` reads `hw_profile.json` (or runs the probe) and returns a suggested `{quant, n_ctx, n_threads, kv_type, draft_model}` per model. Replace the fixed `n_threads` / `n_ctx` in the manifest with a probe-derived default and keep manifest values as overrides.
- Speculative decoding: wire `draft_model` through the engine server when the backend supports it; if not, make `S=off` the only valid value and log why.
- Prompt caching: pin the system prompt and repo-map prefix so the KV cache is reused across turns.
- `E` (expert offload): stub only in this batch, gated on MoE model metadata. Do not implement until a MoE model is in the manifest.
- Quant options: produce Q3/Q5/IQ4 variants of Spark 2.1 for the eval, using the existing conversion path. If conversion tooling is not present, skip and note it.

**Acceptance:** `hw_probe` returns sane values on this PC; tok/s and peak RSS are recorded for each `{S,Q,C}` combo on Spark and Prism; the best combo per tier is written to `config/recipes/T*.json`.

### Phase 3 — Router and search (`X`, `T`, and the mixing search)

Files: new `server/router.py`, `eval/search.py`, `config/search.yaml`, `config/recipes/`.

- `router.py`: difficulty classifier. Start with cheap signals: number of files touched by the prompt, presence of failing test output, prompt length, a keyword list. Route to Spark / Prism / Zenith. Escalate one tier on verifier failure. Log every routing decision.
- `T` best-of-N: N candidates from the same model, pick the one that passes the verifier; if none pass, pick the one with the fewest verifier errors.
- `eval/search.py`: implements the mixing table. Inputs: `config/search.yaml` (ingredient options, compat rules, weights, budgets). Algorithm: successive halving then up to 6 mutation generations, Pareto front, weighted pick per tier. Output: `config/recipes/T*.json` and `eval/results/search_<date>.md`.
- `compat()` lives in one function with unit tests.

**Acceptance:** `python eval/search.py --tier T0 --budget-minutes 120` completes and writes a recipe; the router beats single-model Prism on cost (tokens) at equal pass rate on the suite, or the result is recorded as negative.

### Phase 4 — Progressive adapter pipeline (`D`)

Files: new `training/` directory, `server/adapters.py`, `config/adapters.json`.

- **Trajectory capture** (`server/trajectory.py`): when a task ends with verifier pass and user accepts the edit, store `{prompt, context_refs, final_diff, verifier_log}` in `~/.catalyst/trajectories/` (local only). Opt-in setting `capture_trajectories`, default **off**. Redact paths/secrets with a regex pass before storing.
- **Dataset builder** (`training/build_dataset.py`): filters trajectories, dedups, produces SFT jsonl. Keep a held-out split of the eval suite; trajectories never enter eval.
- **Trainer** (`training/train_lora.py`): LoRA on the base model, config-driven. Runs on rented GPU or Colab — this batch only needs the script and a dry-run on a tiny model. Output: adapter file + metadata (`base_model`, `data_hash`, `eval_score`).
- **Gate** (`training/gate.py`): adapter is promoted only if eval pass rate ≥ base on the held-out suite and no per-category regression > 2 points. Otherwise rejected and logged.
- **Hot-swap** (`server/adapters.py`): load adapter by version, keep last two versions for rollback; `config/adapters.json` lists active version per model.

**Acceptance:** dry-run `build_dataset → train_lora (tiny) → gate → load → rollback` works end to end in a test; no real user data is touched by tests.

### Phase 5 — RL on verifiers (stub only in this batch)

- Define `training/rl_interface.py` with the reward function = verifier pass (+ small bonus for fewer iterations). No training code yet.
- Document the GRPO-style plan in this file's appendix when Phase 4 is proven.

---

## 3. Evaluation metrics (what "better" means)

Report every result with all of these, never a single number:

- `pass_rate` on the held-out suite (primary)
- `pass_rate_by_category` (single-file / multi-file / debugging)
- `tok_per_s` and `wall_s_median` on the tier's reference hardware
- `peak_rss_mb`
- `tokens_out_per_pass` (cost proxy)
- A recipe is only "better" if it is on the Pareto front and does not regress pass rate by more than 2 points against the current shipped recipe.

---

## 4. Rules for Codex

1. Phase 0 first. Do not tune anything before the harness and baseline exist.
2. One change per commit. Commit messages describe the ingredient or phase touched.
3. Never edit the held-out eval tasks to make a number go up. Add new tasks instead.
4. Every feature behind a config flag; default flags are the conservative value (`V=off` until Phase 1 passes its acceptance, `capture_trajectories=off` always by default).
5. Do not add network calls or telemetry. Local only.
6. If a step cannot run on this machine (no conversion tool, no GPU), implement the code path, mark the test `skip` with the reason, and say so in the PR body. Do not fake results.
7. Report negative results in `eval/results/` the same as positive ones.
8. Keep the Anthropic-distillation ban: no training data generated from Anthropic model outputs.

## 5. Open questions (answer before Phase 4)

- Which Qwen-family base for the adapter pipeline (sizes that fit T0 after quant)?
- Trajectory capture default: stays off, or ask once on first run?
- Target reference machine for T0 — is this laptop the T0 proxy, or do we need a real 8 GB box?

## Appendix A — Creative extensions to try later (not in this batch)

- **Model soup of adapters**: average two good adapters trained on different task slices, test if it beats either.
- **Verifier-as-draft**: use the cheap model to propose several patches and the compiler to choose — the search over patches becomes the speedup.
- **Repo-specific tiny model**: a 0.5B adapter trained only on this repo's style, routed to for edits in this repo.
- **Test generation as a training signal**: model writes tests for its own code; tests that fail on the base but pass after the fix become reward examples.
