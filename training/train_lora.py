"""Config-driven LoRA entry point. Dry-run writes only metadata, not weights."""
from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path
def train(dataset: Path, output: Path, base_model: str, dry_run: bool = False) -> Path:
    digest = hashlib.sha256(dataset.read_bytes()).hexdigest()
    metadata = {"base_model":base_model,"data_hash":digest,"eval_score":None,"dry_run":dry_run,"license_policy":"open_licensed_or_own_outputs_only"}
    output.parent.mkdir(parents=True, exist_ok=True); output.write_text(json.dumps(metadata, indent=2)+"\n",encoding="utf-8")
    if not dry_run: raise RuntimeError("Real training requires an explicitly configured local/approved GPU environment.")
    return output
if __name__ == "__main__":
    p=argparse.ArgumentParser(); p.add_argument("--dataset",type=Path,required=True);p.add_argument("--output",type=Path,required=True);p.add_argument("--base-model",required=True);p.add_argument("--dry-run",action="store_true");a=p.parse_args();print(train(a.dataset,a.output,a.base_model,a.dry_run))
