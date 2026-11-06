import os
from PyInstaller.utils.hooks import collect_all

datas = []
binaries = []
hiddenimports = [
    "uvicorn.logging",
    "uvicorn.loops.auto",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.lifespan.on",
]

for package in ("llama_cpp", "sse_starlette"):
    package_datas, package_binaries, package_hidden = collect_all(package)
    datas += package_datas
    binaries += package_binaries
    hiddenimports += package_hidden

project_root = os.path.abspath(os.path.join(SPECPATH, ".."))
web_dist = os.path.join(project_root, "dist")
if os.path.isdir(web_dist):
    datas.append((web_dist, "dist"))

analysis = Analysis(
    [os.path.join(project_root, "server", "engine_server.py")],
    pathex=[os.path.join(project_root, "server")],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    excludes=[
        "cv2", "pytesseract", "matplotlib", "pandas", "scipy", "pygame",
        "IPython", "jupyter", "notebook", "tkinter", "pytest", "torch",
        "transformers", "unsloth", "trl", "peft", "accelerate"
    ],
)
pyz = PYZ(analysis.pure)
exe = EXE(
    pyz,
    analysis.scripts,
    analysis.binaries,
    analysis.datas,
    [],
    name="catalyst-engine",
    console=False,
    icon=None,
    upx=True,
)
