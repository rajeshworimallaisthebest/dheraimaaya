from PIL import Image
import os

# Disable decompression bomb check for large legitimate images
Image.MAX_IMAGE_PIXELS = None

# Load your source image (180MB, 13828×17280)
img = Image.open('Finalmosaic.png')  # Update this path

# Crop to 13824×17280 (removes 4px from width for clean tiling)
img = img.crop((0, 0, 13824, 17280))

# Create output directory
os.makedirs('public/mosaic', exist_ok=True)

# Split into 10 rows × 8 columns (80 tiles)
tile_size = 1728
rows = 10
cols = 8

for row in range(rows):
    for col in range(cols):
        left = col * tile_size
        top = row * tile_size
        right = left + tile_size
        bottom = top + tile_size
        
        tile = img.crop((left, top, right, bottom))
        tile.save(
            f'public/mosaic/tile_r{row}_c{col}.webp',
            'WEBP',
            quality=92,  # Higher quality for detail preservation
            method=6     # Best compression
        )
        print(f'✓ Saved tile_r{row}_c{col}.webp ({row*cols + col + 1}/80)')

print(f'\n✅ Created 80 tiles in public/mosaic/')
print(f'   Mosaic: 13824×17280 (8 cols × 10 rows)')
print(f'   Each tile: 1728×1728px')