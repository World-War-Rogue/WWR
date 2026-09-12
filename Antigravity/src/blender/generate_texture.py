"""
generate_texture.py - Generates a synthetic military camo / concept texture for testing.
"""

import sys
import os
import bpy

def generate_texture(output_path, width=512, height=512):
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    img = bpy.data.images.new("CamoTexture", width=width, height=height)
    pixels = []
    for y in range(height):
        for x in range(width):
            # Procedural camo banding
            v1 = (x // 32) % 2
            v2 = (y // 32) % 2
            v3 = ((x + y) // 48) % 3
            if v3 == 0:
                # Tactical olive drab
                pixels.extend([0.22, 0.32, 0.18, 1.0])
            elif v3 == 1:
                # Mud brown
                pixels.extend([0.38, 0.28, 0.18, 1.0])
            elif (v1 + v2) % 2 == 0:
                # Armor metal gray
                pixels.extend([0.45, 0.45, 0.48, 1.0])
            else:
                # Charcoal black
                pixels.extend([0.12, 0.12, 0.14, 1.0])

    img.pixels.foreach_set(pixels)
    img.filepath_raw = output_path
    img.file_format = 'PNG'
    img.save()
    print(f"[✓] Generated synthetic texture at: {output_path}")

if __name__ == "__main__":
    out = sys.argv[-1] if len(sys.argv) > 1 and not sys.argv[-1].startswith("-") else "./assets/inputs/sample_camo.png"
    generate_texture(out)
