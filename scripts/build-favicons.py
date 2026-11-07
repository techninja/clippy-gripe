"""
Generate all favicon sizes from scripts/assets/clippy.png.
Crop box (225,140)→(605,520) isolates Clippy's eyes uncomfortably close.
Output: src/favicon.ico, src/favicon-{16,32}x{16,32}.png,
        src/apple-touch-icon.png, src/android-chrome-{192,512}x{192,512}.png
"""

from PIL import Image
from pathlib import Path

SRC   = Path(__file__).parent / 'assets' / 'clippy.png'
DEST  = Path(__file__).parent.parent / 'src'

# Crop coords — eyes region, 380x380 square
CROP = (225, 140, 605, 520)

TEAL  = (0, 128, 128, 255)
WHITE = (255, 255, 255, 255)

img  = Image.open(SRC).convert('RGBA')
crop = img.crop(CROP)

def composite(im, size, bg):
    canvas = Image.new('RGBA', (size, size), bg)
    resized = im.resize((size, size), Image.LANCZOS)
    canvas.paste(resized, mask=resized.split()[3])
    return canvas.convert('RGB')

# favicon.ico — 16, 32, 48 embedded
frames = [composite(crop, s, WHITE) for s in (16, 32, 48)]
frames[0].save(DEST / 'favicon.ico', format='ICO',
               sizes=[(s, s) for s in (16, 32, 48)], append_images=frames[1:])

# PNG favicons — white bg for browser tab sizes
composite(crop, 16,  WHITE).save(DEST / 'favicon-16x16.png',  optimize=True)
composite(crop, 32,  WHITE).save(DEST / 'favicon-32x32.png',  optimize=True)

# Touch / homescreen icons — teal bg matches theme-color
composite(crop, 180, TEAL).save(DEST / 'apple-touch-icon.png',          optimize=True)
composite(crop, 192, TEAL).save(DEST / 'android-chrome-192x192.png',    optimize=True)
composite(crop, 512, TEAL).save(DEST / 'android-chrome-512x512.png',    optimize=True)

print('✓ Favicons written to src/')
