<div align="center">
  <img src="public/orbia-logo.svg" width="96" height="96" alt="Orbia Catalyst Logo" />
  <h1>Orbia Catalyst</h1>
  <p><strong>Autonomous, air-gapped local coding studio & agent runtime.</strong></p>
  <p>100% private on your own hardware · Zero required cloud calls · Zero telemetry</p>
</div>

---

## ⚡ Overview

**Orbia Catalyst** is an open-source, local-first coding assistant and execution studio for Windows. It couples a native on-device inference runtime (`llama.cpp` engine) with repository-wide autonomous planning, real file inspection, interactive web/canvas synthesis, and self-learning preference memory.

- **Air-Gapped & Private:** Keeps every prompt, workspace context, and token strictly on your machine.
- **Multi-Tier Local GGUF Runtime:** Seamlessly switch between quantized tiers:
  - **Spark 2.0 (0.5B)** – Ultra-fast micro-tasks, syntax lookups, and side chat.
  - **Prism 2.0 (1.5B)** – Daily full-stack code synthesis, playable canvas apps, and shaders.
  - **Zenith 2.0 (3B)** – Structured multi-file reasoning and architectural planning.
  - **Apex 1.2 (7B)** – Master-tier deep reasoning and complex refactoring.
- **Overload Guard:** Real-time memory, VRAM, and CPU concurrency tracking preventing system stutter.
- **Model Context Protocol (MCP):** Native MCP bridge for local filesystem and tooling integration.
- **Custom Frameless Installer:** Standalone Windows installer with automated hardware detection and safe mid-install rollback.

---

## 🚀 Quick Start

### 1. Requirements
- **OS:** Windows 10 / 11 (x64)
- **Node.js:** v20+
- **Python:** 3.11+ (with `llama-cpp-python`, `fastapi`, `uvicorn`, `sse-starlette`, `psutil`)
- **Rust:** (optional, only needed if rebuilding the standalone installer)

### 2. Running Frontend
```powershell
npm install
npm run dev
```

### 3. Running Backend Engine
```powershell
python -m uvicorn server.engine_server:app --host 127.0.0.1 --port 8008
```

### 4. Fetching Local Models
Quantized GGUF models reside in the `models/` directory:
```powershell
python scripts/download_models.py
```

---

## 📦 Building the Standalone Installer

To compile the self-contained native installer executable:

```powershell
.\packaging\build-installer.ps1
```

The resulting binary will be placed at:
```
release\installer\Catalyst-Setup.exe
```

---

## 🛡️ License

This project is available under the [Orbia Catalyst Personal Use License](LICENSE).

You may view, download, copy, and modify the files for personal, private, and
noncommercial use. Commercial use, selling, public reuploads, mirrors,
redistribution, and sharing modified versions require prior written permission
from the copyright holder.
