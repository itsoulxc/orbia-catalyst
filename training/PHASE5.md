# Phase 5: training and evaluation

Run the dataset gate before any Colab fine-tuning:

```powershell
python training/benchmark.py
```

The command writes `training/benchmark_report.json` and exits non-zero when the
dataset is malformed, empty, or contains only one preference class. This keeps
small or contaminated feedback sets from being mistaken for a useful training
corpus.

The current PyTorch adapter is a preference calibrator, not a replacement for
the base language model. For QLoRA training, export only validated rows and
keep a held-out evaluation split. Compare tool-call accuracy, patch validity,
test-pass rate, hallucinated-file rate, and recovery-after-failure rate.
