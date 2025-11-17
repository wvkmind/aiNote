#!/usr/bin/env python3
from PIL import Image
import sys

def convert_to_rgba(input_path, output_path):
    """Convert image to RGBA format"""
    img = Image.open(input_path)
    
    # Convert to RGBA if not already
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # Save as PNG with RGBA
    img.save(output_path, 'PNG')
    print(f"Converted {input_path} to RGBA format -> {output_path}")

if __name__ == '__main__':
    # Convert icon.png
    convert_to_rgba('icon.png', 'icon.png')
    
    # Convert all size variants
    sizes = [
        ('icon.png', 32, '32x32.png'),
        ('icon.png', 128, '128x128.png'),
        ('icon.png', 256, '128x128@2x.png'),
    ]
    
    for src, size, dest in sizes:
        img = Image.open(src)
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        img = img.resize((size, size), Image.Resampling.LANCZOS)
        img.save(dest, 'PNG')
        print(f"Created {dest} ({size}x{size})")
