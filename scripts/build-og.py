"""
Compose OG image (1200x630) for clippy.gripe.
Layout: teal desktop bg, Word 97 window chrome, speech bubble, Clippy bottom-right.
Output: src/og.png
"""

from PIL import Image, ImageDraw, ImageFont
import sys

W, H = 1200, 630

# ── Colors (from desktop.css / word.css) ─────────────────────────────────────
TEAL        = (0, 128, 128)
WIN_NAVY    = (0, 0, 128)
SILVER      = (192, 192, 192)
WHITE       = (255, 255, 255)
BLACK       = (0, 0, 0)
GRAY_DARK   = (128, 128, 128)
PAPER       = (255, 255, 255)

# ── Canvas ────────────────────────────────────────────────────────────────────
img = Image.new('RGB', (W, H), TEAL)
d   = ImageDraw.Draw(img)

# ── Fonts ─────────────────────────────────────────────────────────────────────
def font(size, bold=False):
    candidates = [
        f'/usr/share/fonts/truetype/liberation/LiberationSans{"-Bold" if bold else "-Regular"}.ttf',
        f'/usr/share/fonts/truetype/dejavu/DejaVuSans{"-Bold" if bold else ""}.ttf',
        '/usr/share/fonts/truetype/freefont/FreeSans.ttf',
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()

f_title   = font(13, bold=True)
f_menu    = font(12)
f_paper   = font(15)
f_bubble  = font(22, bold=True)
f_url     = font(18)

# ── Word window dimensions ────────────────────────────────────────────────────
WX, WY   = 60, 55       # window top-left
WW, WH   = 780, 430     # window size
TITLE_H  = 22
MENU_H   = 20
PAPER_PAD = 36

# Titlebar
d.rectangle([WX, WY, WX+WW, WY+TITLE_H], fill=WIN_NAVY)
# Win98 bevel: white top/left, dark bottom/right
d.line([WX, WY, WX+WW, WY], fill=WHITE)
d.line([WX, WY, WX, WY+TITLE_H], fill=WHITE)
d.line([WX+WW, WY, WX+WW, WY+TITLE_H], fill=GRAY_DARK)
d.line([WX, WY+TITLE_H, WX+WW, WY+TITLE_H], fill=GRAY_DARK)
# Icon
d.rectangle([WX+4, WY+4, WX+16, WY+16], fill=WHITE, outline=BLACK)
# Title text
d.text((WX+22, WY+4), 'Document1 - Microsoft Word', font=f_title, fill=WHITE)
# Titlebar buttons — _, □, ✕
for i, lbl in enumerate(['_', '□', '✕']):
    bx = WX + WW - 18 - (18*i) - (4*i)
    by = WY + 3
    d.rectangle([bx, by, bx+16, by+14], fill=SILVER)
    d.line([bx, by, bx+16, by], fill=WHITE)
    d.line([bx, by, bx, by+14], fill=WHITE)
    d.line([bx+16, by, bx+16, by+14], fill=GRAY_DARK)
    d.line([bx, by+14, bx+16, by+14], fill=GRAY_DARK)
    d.text((bx+3, by+1), lbl, font=font(9), fill=BLACK)

# Menubar
MY = WY + TITLE_H
d.rectangle([WX, MY, WX+WW, MY+MENU_H], fill=SILVER)
d.line([WX, MY+MENU_H, WX+WW, MY+MENU_H], fill=GRAY_DARK)
for i, item in enumerate(['File', 'Edit', 'View', 'Insert', 'Format', 'Tools', 'Table', 'Window', 'Help']):
    mx = WX + 6 + i * 62
    d.text((mx, MY+3), item, font=f_menu, fill=BLACK)

# Paper
PY = MY + MENU_H
PH = WH - TITLE_H - MENU_H
d.rectangle([WX, PY, WX+WW, PY+PH], fill=PAPER, outline=GRAY_DARK)
# Placeholder text — faint, like the real app
d.text((WX+PAPER_PAD, PY+PAPER_PAD), 'Start typing...', font=f_paper, fill=(180, 180, 180))

# Window drop shadow
for offset in range(1, 5):
    alpha = 60 - offset * 12
    d.line([WX+offset, WY+WH+offset, WX+WW+offset, WY+WH+offset], fill=(0,0,0))
    d.line([WX+WW+offset, WY+offset, WX+WW+offset, WY+WH+offset], fill=(0,0,0))

# ── Clippy ────────────────────────────────────────────────────────────────────
clippy_src = Image.open('/home/techninja/Documents/clippy.png').convert('RGBA')
CLIPPY_H = 280
ratio = CLIPPY_H / clippy_src.height
clippy = clippy_src.resize((int(clippy_src.width * ratio), CLIPPY_H), Image.LANCZOS)
CX = W - clippy.width - 30
CY = H - clippy.height - 20
img.paste(clippy, (CX, CY), clippy)

# ── Speech bubble ─────────────────────────────────────────────────────────────
TEXT = 'Tell me everything...'
bbox = d.textbbox((0, 0), TEXT, font=f_bubble)
TW, TH = bbox[2] - bbox[0], bbox[3] - bbox[1]
PAD = 16
BW, BH = TW + PAD*2, TH + PAD*2
# Position bubble above Clippy's eyes, clear of the notepad
BX = CX - BW - 10
BY = CY - BH - 30
# Bubble fill + border
d.rounded_rectangle([BX, BY, BX+BW, BY+BH], radius=8, fill=WHITE, outline=BLACK, width=2)
# Tail pointing down-right toward Clippy's face
tail_tip = (CX + 30, CY + 20)
tail_base_l = (BX + BW - 30, BY + BH)
tail_base_r = (BX + BW - 10, BY + BH)
d.polygon([tail_base_l, tail_tip, tail_base_r], fill=WHITE)
# Outer border lines (skip the base so bubble border shows clean)
d.line([tail_base_l, tail_tip], fill=BLACK, width=2)
d.line([tail_tip, tail_base_r], fill=BLACK, width=2)
# Erase the bubble bottom border between the tail bases
d.line([tail_base_l, tail_base_r], fill=WHITE, width=3)
d.text((BX+PAD, BY+PAD), TEXT, font=f_bubble, fill=BLACK)

# ── URL watermark ─────────────────────────────────────────────────────────────
url = 'clippy.gripe'
ub = d.textbbox((0, 0), url, font=f_url)
d.text((W - (ub[2]-ub[0]) - 16, H - 28), url, font=f_url, fill=(255,255,255,180))

# ── Save ──────────────────────────────────────────────────────────────────────
out = 'src/og.png'
img.save(out, optimize=True)
print(f'Saved {out} ({img.width}x{img.height})')
