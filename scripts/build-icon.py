#!/usr/bin/env python3
"""从 2048×2048 appico.png 生成 macOS .icns 和 Windows .ico"""
import os
import shutil
import subprocess
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "appico.png"
BUILD = ROOT / "build"
ICONSET = BUILD / "icon.iconset"

ICNS_SIZES = [
    (16, "16x16"),
    (32, "16x16@2x"),  # 16pt @2x = 32
    (32, "32x32"),
    (64, "32x32@2x"),
    (128, "128x128"),
    (256, "128x128@2x"),
    (256, "256x256"),
    (512, "256x256@2x"),
    (512, "512x512"),
    (1024, "512x512@2x"),
]

ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]


def main() -> None:
    BUILD.mkdir(exist_ok=True)
    if not SRC.exists():
        raise SystemExit(f"找不到源图标 {SRC}")

    img = Image.open(SRC).convert("RGBA")
    print(f"源图: {img.size} {img.mode}")

    # 1) 生成 macOS .icns
    if ICONSET.exists():
        shutil.rmtree(ICONSET)
    ICONSET.mkdir()
    for size, name in ICNS_SIZES:
        resized = img.resize((size, size), Image.LANCZOS)
        resized.save(ICONSET / f"icon_{name}.png", "PNG")
    print(f"iconset 已生成: {ICONSET}")

    icns = BUILD / "icon.icns"
    subprocess.run(
        ["iconutil", "-c", "icns", str(ICONSET), "-o", str(icns)],
        check=True,
    )
    print(f"✓ 生成 {icns}")

    # 2) 生成 Windows .ico
    ico = BUILD / "icon.ico"
    base = Image.open(SRC)
    base.save(ico, format="ICO", sizes=[(s, s) for s in ICO_SIZES])
    print(f"✓ 生成 {ico}")

    # 3) 同步一份 1024×1024 给 electron-builder 兜底
    img.resize((1024, 1024), Image.LANCZOS).save(BUILD / "icon.png", "PNG")
    print(f"✓ 生成 {BUILD / 'icon.png'} (1024×1024)")

    # 清理中间目录
    shutil.rmtree(ICONSET)
    print("完成。")


if __name__ == "__main__":
    main()
