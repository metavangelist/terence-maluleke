#!/usr/bin/env python3
"""Build gallery preview + view JPEGs from assets/images originals."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "assets" / "images"
PREVIEW_DIR = ROOT / "assets" / "gallery-preview"
VIEW_DIR = ROOT / "assets" / "gallery-view"
MANIFEST = ROOT / "pages" / "gallery-assets.json"

PREVIEW_MAX = 920
PREVIEW_QUALITY = 58
VIEW_SCALE = 0.8
VIEW_MAX = 2800
VIEW_QUALITY = 82

sys.path.insert(0, str(ROOT / ".pydeps"))

from PIL import Image, ImageOps  # noqa: E402


def to_rgb(img: Image.Image) -> Image.Image:
    if img.mode in ("RGBA", "LA"):
        bg = Image.new("RGB", img.size, (236, 236, 234))
        bg.paste(img, mask=img.split()[-1])
        return bg
    if img.mode != "RGB":
        return img.convert("RGB")
    return img


def fit_max(img: Image.Image, max_edge: int) -> Image.Image:
    w, h = img.size
    longest = max(w, h)
    if longest <= max_edge:
        return img
    scale = max_edge / longest
    return img.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.Resampling.LANCZOS)


def scale_percent(img: Image.Image, percent: float, cap: int) -> Image.Image:
    w, h = img.size
    nw = max(1, int(w * percent))
    nh = max(1, int(h * percent))
    scaled = img.resize((nw, nh), Image.Resampling.LANCZOS)
    return fit_max(scaled, cap)


def process_file(src: Path) -> dict:
    stem = src.stem
    out_name = f"{stem}.jpg"
    preview_path = PREVIEW_DIR / out_name
    view_path = VIEW_DIR / out_name

    with Image.open(src) as raw:
        img = ImageOps.exif_transpose(raw)
        img = to_rgb(img)

        preview = fit_max(img, PREVIEW_MAX)
        preview.save(preview_path, "JPEG", quality=PREVIEW_QUALITY, optimize=True, progressive=True)

        view = scale_percent(img, VIEW_SCALE, VIEW_MAX)
        view.save(view_path, "JPEG", quality=VIEW_QUALITY, optimize=True, progressive=True)

    return {
        "file": src.name,
        "preview": f"assets/gallery-preview/{out_name}",
        "view": f"assets/gallery-view/{out_name}",
        "previewBytes": preview_path.stat().st_size,
        "viewBytes": view_path.stat().st_size,
    }


def main() -> None:
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    VIEW_DIR.mkdir(parents=True, exist_ok=True)

    entries = []
    for src in sorted(SRC_DIR.iterdir()):
        if src.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
            continue
        if src.name.startswith("."):
            continue
        print(f"  {src.name}")
        entries.append(process_file(src))

    manifest = {
        "previewMax": PREVIEW_MAX,
        "previewQuality": PREVIEW_QUALITY,
        "viewScale": VIEW_SCALE,
        "viewQuality": VIEW_QUALITY,
        "items": entries,
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"\nWrote {len(entries)} derivatives → {MANIFEST.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
