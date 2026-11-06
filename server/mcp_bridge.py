"""MCP bridge: JSON-RPC 2.0 stdio client for external MCP servers, plus a built-in
sandboxed filesystem toolset restricted to D:\\Catalyst."""
import os
import json
import subprocess
import threading
import itertools
from typing import Dict, Any, List, Optional

ROOT = os.path.abspath(r"D:\Catalyst")
WRITABLE = [os.path.join(ROOT, "builds"), os.path.join(ROOT, "storage"), os.path.join(ROOT, "projects")]


def _safe(path: str, write: bool = False) -> str:
    full = os.path.abspath(path if os.path.isabs(path) else os.path.join(ROOT, path))
    if not (full == ROOT or full.startswith(ROOT + os.sep)):
        raise PermissionError("Path outside workspace")
    if write and not any(full.startswith(w + os.sep) or full == w for w in WRITABLE):
        raise PermissionError("Writes are limited to builds, storage and projects")
    return full


BUILTIN_TOOLS = [
    {"name": "list_dir", "description": "List files in a workspace folder", "args": {"path": "string"}},
    {"name": "read_file", "description": "Read a text file (first 20000 chars)", "args": {"path": "string"}},
    {"name": "write_file", "description": "Write a text file inside builds/storage/projects", "args": {"path": "string", "content": "string"}},
]


def call_builtin(tool: str, args: Dict[str, Any]) -> Dict[str, Any]:
    if tool == "list_dir":
        p = _safe(args.get("path", "."))
        return {"entries": [{"name": n, "dir": os.path.isdir(os.path.join(p, n))} for n in sorted(os.listdir(p))[:200]]}
    if tool == "read_file":
        p = _safe(args["path"])
        with open(p, "r", encoding="utf-8", errors="ignore") as f:
            return {"content": f.read(20000)}
    if tool == "write_file":
        p = _safe(args["path"], write=True)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            f.write(args.get("content", ""))
        return {"written": p}
    raise ValueError(f"Unknown tool {tool}")


class StdioMcpClient:
    def __init__(self, command: List[str]):
        self.proc = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                     stderr=subprocess.DEVNULL, text=True, bufsize=1)
        self._ids = itertools.count(1)
        self._lock = threading.Lock()
        self.request("initialize", {"protocolVersion": "2024-11-05", "capabilities": {},
                                    "clientInfo": {"name": "catalyst", "version": "1.0"}})
        self._send({"jsonrpc": "2.0", "method": "notifications/initialized"})

    def _send(self, msg: Dict[str, Any]):
        self.proc.stdin.write(json.dumps(msg) + "\n")
        self.proc.stdin.flush()

    def request(self, method: str, params: Optional[Dict[str, Any]] = None) -> Any:
        with self._lock:
            rid = next(self._ids)
            self._send({"jsonrpc": "2.0", "id": rid, "method": method, "params": params or {}})
            while True:
                line = self.proc.stdout.readline()
                if not line:
                    raise RuntimeError("MCP server closed the connection")
                try:
                    msg = json.loads(line)
                except Exception:
                    continue
                if msg.get("id") == rid:
                    if "error" in msg:
                        raise RuntimeError(msg["error"].get("message", "MCP error"))
                    return msg.get("result")

    def close(self):
        try:
            self.proc.terminate()
        except Exception:
            pass


clients: Dict[str, StdioMcpClient] = {}
