#!/usr/bin/env python3
"""Maintainer tool — regenerate the committed OCR test fixtures.

Renders clean, high-contrast PNGs of known English and Thai text for the OCR smoke test
(scripts/ocr-smoke.mjs) and the browser E2E. English uses DejaVu Sans (widely installed);
Thai uses Sarabun (a looped face), downloaded to a local cache if not already present.

Usage:  python3 scripts/gen-ocr-fixtures.py
Fixtures are committed so the smoke/E2E checks stay deterministic and offline.
"""
import os
import sys
import urllib.request

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "..", "tests", "fixtures", "ocr")
CACHE = os.path.join(HERE, "..", "node_modules", ".cache", "ocr-fixture-fonts")

ENG_TEXT = "The quick brown fox\njumps over the lazy dog."
THA_TEXT = "เด็กอ่านหนังสือ\nที่โรงเรียน"

DEJAVU_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/TTF/DejaVuSans.ttf",
]
DEJAVU_URL = "https://github.com/dejavu-fonts/dejavu-fonts/raw/master/ttf/DejaVuSans.ttf"
SARABUN_URL = "https://github.com/google/fonts/raw/main/ofl/sarabun/Sarabun-Regular.ttf"


def cached_download(url, filename):
    os.makedirs(CACHE, exist_ok=True)
    dest = os.path.join(CACHE, filename)
    if not os.path.exists(dest):
        print(f"Downloading {filename} ...")
        urllib.request.urlretrieve(url, dest)
    return dest


def load_font(size, candidates, url, filename):
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.truetype(cached_download(url, filename), size)


def render(text, font, out_path):
    padding, line_spacing = 60, 24
    dummy = Image.new("RGB", (10, 10), "white")
    draw = ImageDraw.Draw(dummy)
    lines = text.split("\n")
    widths, heights = [], []
    for line in lines:
        box = draw.textbbox((0, 0), line, font=font)
        widths.append(box[2] - box[0])
        heights.append(box[3] - box[1])
    width = max(widths) + padding * 2
    height = sum(heights) + line_spacing * (len(lines) - 1) + padding * 2

    img = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(img)
    y = padding
    for line, h in zip(lines, heights):
        draw.text((padding, y), line, fill="black", font=font)
        y += h + line_spacing
    img.save(out_path)
    print(f"wrote {out_path}  ({width}x{height})")


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    eng_font = load_font(64, DEJAVU_CANDIDATES, DEJAVU_URL, "DejaVuSans.ttf")
    tha_font = load_font(64, [], SARABUN_URL, "Sarabun-Regular.ttf")
    render(ENG_TEXT, eng_font, os.path.join(OUT_DIR, "eng.png"))
    render(THA_TEXT, tha_font, os.path.join(OUT_DIR, "tha.png"))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # noqa: BLE001
        print(f"gen-ocr-fixtures failed: {exc}", file=sys.stderr)
        sys.exit(1)
