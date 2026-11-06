import os
import sys
import time
import urllib.request
import json

MODELS = [
    {
        "id": "spark-2.0",
        "name": "Spark 2.0 (0.5B)",
        "file": "catalyst-spark-2.0-q4_k_m.gguf",
        "url": "https://huggingface.co/Qwen/Qwen2.5-Coder-0.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-0.5b-instruct-q4_k_m.gguf",
        "expected_size_mb": 398,
        "role": "Fast coding side chat and micro-tasks"
    },
    {
        "id": "prism-2.0",
        "name": "Prism 2.0 (1.5B)",
        "file": "catalyst-prism-2.0-q4_k_m.gguf",
        "url": "https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf",
        "expected_size_mb": 1050,
        "role": "Daily coding, scripts, and small features"
    },
    {
        "id": "zenith-2.0",
        "name": "Zenith 2.0 (3B)",
        "file": "catalyst-zenith-2.0-q4_k_m.gguf",
        "url": "https://huggingface.co/Qwen/Qwen2.5-Coder-3B-Instruct-GGUF/resolve/main/qwen2.5-coder-3b-instruct-q4_k_m.gguf",
        "expected_size_mb": 1900,
        "role": "Multi-file coding, games, and structured reasoning"
    }
]

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MODELS_DIR = os.path.join(PROJECT_ROOT, "models")
STATUS_FILE = os.path.join(MODELS_DIR, "models_manifest.json")

def update_manifest(model_states):
    try:
        with open(STATUS_FILE, "w", encoding="utf-8") as f:
            json.dump(model_states, f, indent=2)
    except Exception as e:
        print(f"Error saving manifest: {e}")

def merge_manifest(state):
    try:
        existing = []
        if os.path.exists(STATUS_FILE):
            with open(STATUS_FILE, "r", encoding="utf-8") as f:
                existing = json.load(f)
        merged = [item for item in existing if item.get("id") != state.get("id")]
        merged.append(state)
        update_manifest(merged)
    except Exception:
        update_manifest([state])

def download_file(url, target_path, status_callback=None):
    temp_path = target_path + ".tmp"
    headers = {"User-Agent": "OrbiaCatalyst/1.0"}
    req = urllib.request.Request(url, headers=headers)
    
    start_pos = 0
    if os.path.exists(temp_path):
        start_pos = os.path.getsize(temp_path)
        req.add_header("Range", f"bytes={start_pos}-")
        print(f"Resuming download from byte {start_pos}...")
    
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            content_length = response.headers.get("Content-Length")
            total_size = int(content_length) + start_pos if content_length else 0
            
            mode = "ab" if start_pos > 0 else "wb"
            downloaded = start_pos
            last_report = time.time()
            
            with open(temp_path, mode) as f:
                while True:
                    chunk = response.read(1024 * 512) # 512KB chunks
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)
                    
                    if time.time() - last_report > 2.0:
                        last_report = time.time()
                        mb = downloaded / (1024 * 1024)
                        percent = (downloaded / total_size * 100) if total_size > 0 else 0
                        print(f"Progress: {mb:.1f} MB ({percent:.1f}%)")
                        if status_callback:
                            status_callback(downloaded, total_size)
                            
        # Rename tmp to final
        if os.path.exists(target_path):
            os.remove(target_path)
        os.rename(temp_path, target_path)
        print(f"Successfully downloaded to {target_path}")
        return True
    except Exception as e:
        print(f"Download failed: {e}")
        return False

def main():
    os.makedirs(MODELS_DIR, exist_ok=True)
    manifest = []
    
    # Check what to download from CLI args or do the primary models
    filter_id = sys.argv[1] if len(sys.argv) > 1 else None
    
    for m in MODELS:
        if filter_id and m["id"] != filter_id:
            continue
            
        target = os.path.join(MODELS_DIR, m["file"])
        state = {
            "id": m["id"],
            "name": m["name"],
            "file": m["file"],
            "path": target,
            "role": m["role"],
            "expected_size_mb": m["expected_size_mb"],
            "status": "ready" if os.path.exists(target) else "pending",
            "downloaded_bytes": os.path.getsize(target) if os.path.exists(target) else 0
        }
        
        if os.path.exists(target):
            print(f"Model already present: {m['name']} ({os.path.getsize(target)/(1024*1024):.1f} MB)")
            manifest.append(state)
            continue
            
        print(f"\n==========================================")
        print(f"Starting download: {m['name']}")
        print(f"Target: {target}")
        print(f"==========================================")
        
        state["status"] = "downloading"
        merge_manifest(state)
        
        success = download_file(m["url"], target)
        if success:
            state["status"] = "ready"
            state["downloaded_bytes"] = os.path.getsize(target)
        else:
            state["status"] = "error"
            
        manifest.append(state)
        merge_manifest(state)

    print("\nModel sync finished. Manifest updated.")

if __name__ == "__main__":
    main()
