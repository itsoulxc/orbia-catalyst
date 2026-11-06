# Catalyst evaluation contract

Every model or adapter candidate should be scored on the same holdout tasks:

- tool-call validity
- patch conflict rate
- syntax/build pass rate
- test pass rate
- hallucinated-file rate
- recovery after a failed command
- unnecessary confirmation rate
- tokens and latency

Never promote a model because its prose looks better. Promote it only when it
improves task completion with equal or better safety evidence.
