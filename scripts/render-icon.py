#!/usr/bin/env python3
"""Draw the app icon and the tray glyph. Not the WhatsApp logo."""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets"
BG = (27, 58, 75, 255)
WHITE = (255, 255, 255, 255)
AMBER = (232, 161, 90, 255)


def bubble(draw: ImageDraw.ImageDraw, size: int, fill) -> None:
    left = size * 0.20
    top = size * 0.22
    right = size * 0.80
    bottom = size * 0.68
    draw.rounded_rectangle(
        (left, top, right, bottom),
        radius=size * 0.12,
        fill=fill,
    )
    tail = [
        (size * 0.30, size * 0.64),
        (size * 0.26, size * 0.82),
        (size * 0.48, size * 0.66),
    ]
    draw.polygon(tail, fill=fill)


def badge(draw: ImageDraw.ImageDraw, size: int) -> None:
    radius = size * 0.075
    cx = size * 0.72
    cy = size * 0.30
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=AMBER)


def app_icon(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=size * 0.22, fill=BG)
    bubble(draw, size, WHITE)
    badge(draw, size)
    return image


def tray_icon(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    outline = (20, 24, 28, 180)
    bubble(draw, size, outline)
    inset = size * 0.035
    left = size * 0.20 + inset
    top = size * 0.22 + inset
    right = size * 0.80 - inset
    bottom = size * 0.68 - inset
    draw.rounded_rectangle((left, top, right, bottom), radius=size * 0.10, fill=WHITE)
    tail = [
        (size * 0.32, size * 0.63),
        (size * 0.29, size * 0.78),
        (size * 0.46, size * 0.64),
    ]
    draw.polygon(tail, fill=WHITE)
    badge(draw, size)
    return image


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    app_icon(1024).resize((512, 512), Image.Resampling.LANCZOS).save(OUT / "icon.png")
    tray_icon(256).resize((48, 48), Image.Resampling.LANCZOS).save(OUT / "tray.png")


if __name__ == "__main__":
    main()
