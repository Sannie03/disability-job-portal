"""Render Unicode text (Vietnamese) on OpenCV frames using PIL."""

import cv2
import numpy as np
from PIL import ImageFont, ImageDraw, Image

# Load font once
_FONT_PATH = "C:/Windows/Fonts/arial.ttf"
_font_cache = {}


def _get_font(size):
    if size not in _font_cache:
        try:
            _font_cache[size] = ImageFont.truetype(_FONT_PATH, size)
        except OSError:
            _font_cache[size] = ImageFont.load_default()
    return _font_cache[size]


def put_text(frame, text, position, font_size=20, color=(255, 255, 255), bold=False):
    """Draw Unicode text on an OpenCV frame.

    Args:
        frame: OpenCV BGR image (modified in-place)
        text: Unicode string (supports Vietnamese)
        position: (x, y) tuple
        font_size: font size in pixels
        color: BGR tuple (OpenCV format)
        bold: if True, draw text slightly bolder
    """
    # Convert BGR → RGB for PIL
    pil_img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    draw = ImageDraw.Draw(pil_img)
    font = _get_font(font_size)

    # Convert BGR color to RGB for PIL
    rgb_color = (color[2], color[1], color[0])

    draw.text(position, text, font=font, fill=rgb_color)

    if bold:
        draw.text((position[0] + 1, position[1]), text, font=font, fill=rgb_color)

    # Convert RGB → BGR back to OpenCV
    result = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    np.copyto(frame, result)
