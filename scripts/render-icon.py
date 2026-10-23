#!/usr/bin/env python3
"""Render desktop and tray sizes from the original high-resolution artwork."""

from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
SOURCE = ASSETS / "icon-source.png"


def render(size: int, sharpen: bool = False) -> Image.Image:
    with Image.open(SOURCE) as source:
        image = source.convert("RGBA").resize((size, size), Image.Resampling.LANCZOS)
    if sharpen:
        image = image.filter(ImageFilter.UnsharpMask(radius=0.8, percent=140, threshold=2))
    return image


def main() -> None:
    render(512).save(ASSETS / "icon.png", optimize=True)
    render(48, sharpen=True).save(ASSETS / "tray.png", optimize=True)


if __name__ == "__main__":
    main()
