#!/usr/bin/env python3
"""Maintainer tool — generate the PWA / apple-touch PNG icons in public/.

Draws a clean icon matching favicon.svg (cream rounded tile, "od" in charcoal + red, a green dot
and a blue underline) at the sizes installability needs. Committed so the build/offline story stays
self-contained (no icon is ever fetched). Regenerate: python3 scripts/gen-pwa-icons.py
"""
import os

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(HERE, "..", "public")

CREAM = "#faf7f5"
CHARCOAL = "#2c3e50"
RED = "#c0392b"
GREEN = "#1e8449"
BLUE = "#1f618d"

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
]


def load_font(size):
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def rounded_mask(size, radius):
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return mask


def draw_icon(size, safe=1.0, rounded=True):
    """safe<1 shrinks the art into the maskable safe zone; the cream fills the whole tile."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    if rounded:
        # rounded cream tile
        radius = int(size * 0.22)
        draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=CREAM)
    else:
        draw.rectangle([0, 0, size - 1, size - 1], fill=CREAM)

    cx, cy = size / 2, size / 2
    font = load_font(int(size * 0.44 * safe))
    text = "od"
    box = draw.textbbox((0, 0), text, font=font)
    tw, th = box[2] - box[0], box[3] - box[1]
    tx = cx - tw / 2 - box[0]
    ty = cy - th / 2 - box[1]

    # split-color letters: "o" charcoal, "d" red
    o_box = draw.textbbox((tx, ty), "o", font=font)
    draw.text((tx, ty), "o", font=font, fill=CHARCOAL)
    draw.text((o_box[2] - o_box[0] + tx, ty), "d", font=font, fill=RED)

    # green dot (above) + blue underline (below), scaled into the safe zone
    r = size * 0.045 * safe
    draw.ellipse([cx - r, cy - size * 0.30 * safe - r, cx + r, cy - size * 0.30 * safe + r], fill=GREEN)
    bar_w, bar_h = size * 0.42 * safe, max(2, size * 0.035 * safe)
    by = cy + size * 0.28 * safe
    draw.rounded_rectangle(
        [cx - bar_w / 2, by, cx + bar_w / 2, by + bar_h], radius=bar_h / 2, fill=BLUE
    )
    return img


def save(img, name):
    path = os.path.join(PUBLIC, name)
    img.save(path)
    print(f"wrote {name} ({img.size[0]}x{img.size[1]})")


def main():
    os.makedirs(PUBLIC, exist_ok=True)
    save(draw_icon(192), "pwa-192x192.png")
    save(draw_icon(512), "pwa-512x512.png")
    # maskable: full-bleed tile, art inside the 80% safe zone, no rounding (launcher masks it)
    save(draw_icon(512, safe=0.8, rounded=False), "pwa-maskable-512x512.png")
    # apple-touch: opaque, rounded by iOS itself → use a square (no transparency)
    save(draw_icon(180, rounded=False), "apple-touch-icon-180x180.png")


if __name__ == "__main__":
    main()
