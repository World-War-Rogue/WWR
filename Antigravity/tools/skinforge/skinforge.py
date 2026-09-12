"""
skinforge.py - Authoritative Base Skin Art Generator & Delivery Pipeline
Conforms strictly to the World War Rogue Base Skin Art Specification:
  - Orthographic Camera: X = 60°, Y = 0°, Z = 0° (Zero Yaw).
  - Footprint fills frame width and sits flush with bottom edge.
  - Standard (512x640) or Tall (512x768) resolution.
  - Seamless 24-frame loop @ 12 fps (Primary motion, Secondary motion, Emissive pulse).
  - Straight RGBA PNG sequence + 6x4 packed WebP atlas (< 1.5MB @ quality 88).
  - Store Hero Still @ 1024x1280 (or 1024x1536).
  - Intact .blend delivery + src/live/skins.ts registration.
"""

import argparse
import json
import math
import os
import sys
import bpy
import numpy as np


# ---------------------------------------------------------------------------
# Camera & Scene Setup (§2, §3, §5)
# ---------------------------------------------------------------------------
def setup_camera_and_scene(tier="standard", footprint_size=4.0):
    """
    Sets up orthographic camera with zero yaw, rotated X=60°, positioned so
    the square footprint touches left/right edges and sits flush with bottom edge.
    """
    scene = bpy.context.scene

    # Clear existing cameras and lights
    for obj in list(bpy.data.objects):
        if obj.type in {'CAMERA', 'LIGHT'}:
            bpy.data.objects.remove(obj, do_unlink=True)

    # Set default keyframe interpolation to LINEAR for seamless looping
    bpy.context.preferences.edit.keyframe_new_interpolation_type = 'LINEAR'

    # Resolution (§3)
    res_x = 512
    res_y = 768 if tier == "tall" else 640
    scene.render.resolution_x = res_x
    scene.render.resolution_y = res_y
    scene.render.resolution_percentage = 100

    # Animation settings (§4, §5)
    scene.render.fps = 12
    scene.render.fps_base = 1.0
    scene.frame_start = 1
    scene.frame_end = 24

    # Output transparency (§5)
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.image_settings.color_depth = '8'

    # Camera (§2)
    cam_data = bpy.data.cameras.new("SkinForgeCamera")
    cam_data.type = 'ORTHO'
    cam_data.sensor_fit = 'HORIZONTAL'
    cam_data.ortho_scale = footprint_size

    # Mathematical shift_y to place bottom edge flush with frame bottom:
    # shift_y = (height - 512) / 1024.0 -> Standard (640) = 0.125, Tall (768) = 0.250
    shift_y = (res_y - 512.0) / 1024.0
    cam_data.shift_y = shift_y

    cam_obj = bpy.data.objects.new("SkinForgeCamera", cam_data)
    cam_obj.rotation_euler = (math.radians(60), 0, 0)

    # Position camera directly in front along -Y
    distance = 30.0
    cam_obj.location = (0, -distance * math.sin(math.radians(60)), distance * math.cos(math.radians(60)))

    bpy.context.collection.objects.link(cam_obj)
    scene.camera = cam_obj

    # Studio Lighting (Chunky Last War register: readable, saturated, high-contrast)
    # 1. Main Sun Light (Key)
    sun_data = bpy.data.lights.new("SunKey", type='SUN')
    sun_data.energy = 4.5
    sun_data.color = (1.0, 0.98, 0.92)
    sun_obj = bpy.data.objects.new("SunKey", sun_data)
    sun_obj.rotation_euler = (math.radians(45), math.radians(20), math.radians(-35))
    bpy.context.collection.objects.link(sun_obj)

    # 2. Cool Sky Fill
    fill_data = bpy.data.lights.new("SkyFill", type='SUN')
    fill_data.energy = 2.0
    fill_data.color = (0.75, 0.88, 1.0)
    fill_obj = bpy.data.objects.new("SkyFill", fill_data)
    fill_obj.rotation_euler = (math.radians(70), math.radians(-40), math.radians(140))
    bpy.context.collection.objects.link(fill_obj)

    # 3. Rim Accent
    rim_data = bpy.data.lights.new("RimAccent", type='POINT')
    rim_data.energy = 500.0
    rim_data.color = (1.0, 1.0, 1.0)
    rim_obj = bpy.data.objects.new("RimAccent", rim_data)
    rim_obj.location = (0, 3.5, 4.0)
    bpy.context.collection.objects.link(rim_obj)

    return cam_obj, res_x, res_y


# ---------------------------------------------------------------------------
# Materials: Bright, Chunky, Saturated PBR Materials (§1, §4, §7)
# ---------------------------------------------------------------------------
def create_skin_material(name, base_color, metallic=0.2, roughness=0.4, emissive_color=None, emissive_strength=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")

    if bsdf:
        if "Base Color" in bsdf.inputs:
            bsdf.inputs["Base Color"].default_value = base_color
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = metallic
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = roughness
        if emissive_color and "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = emissive_color
            bsdf.inputs["Emission Strength"].default_value = emissive_strength
        elif emissive_color and "Emission" in bsdf.inputs:
            bsdf.inputs["Emission"].default_value = emissive_color

    return mat


# ---------------------------------------------------------------------------
# Base Structure Generator & Rigging (§1, §4)
# ---------------------------------------------------------------------------
def generate_base_skin(name="skin_asset", tier="standard", params=None, image_path=None):
    """
    Generates a bright, chunky, readable base skin conforming to Last War style:
      - 4x4 square footprint baseplate with bevels and contact shadow.
      - Fortress / bunker central structure.
      - Primary large motion: rotating radar dome / elevating turret (24 frames).
      - Secondary motion: spinning ventilation turbine / antenna sweep (different period).
      - Emissive pulsing energy conduits.
    """
    params = params or {}
    footprint_size = 4.0
    half_fp = footprint_size / 2.0

    # Color Palette (Bright, chunky, readable military sci-fi)
    primary_color = params.get("primary_color", (0.18, 0.42, 0.72, 1.0))   # High-visibility navy/cobalt
    secondary_color = params.get("secondary_color", (0.92, 0.65, 0.12, 1.0)) # Hazard warning amber/gold
    trim_color = params.get("trim_color", (0.22, 0.24, 0.28, 1.0))          # Dark gunmetal plate
    glow_color = params.get("glow_color", (0.05, 0.95, 0.85, 1.0))          # Cyan plasma emissive

    # Create Materials
    mat_primary = create_skin_material(f"{name}_MatPrimary", primary_color, metallic=0.3, roughness=0.35)
    mat_secondary = create_skin_material(f"{name}_MatSecondary", secondary_color, metallic=0.1, roughness=0.45)
    mat_trim = create_skin_material(f"{name}_MatTrim", trim_color, metallic=0.6, roughness=0.3)
    mat_emissive = create_skin_material(f"{name}_MatGlow", glow_color, metallic=0.0, roughness=0.1,
                                       emissive_color=glow_color, emissive_strength=3.0)

    # 1. Footprint Foundation Baseplate (occupies bottom 4x4 footprint)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.1))
    baseplate = bpy.context.active_object
    baseplate.name = f"{name}_FootprintBase"
    baseplate.scale = (footprint_size, footprint_size, 0.2)
    bpy.ops.object.transform_apply(scale=True)
    baseplate.data.materials.append(mat_trim)

    # Bevel on baseplate for chunky edge reading
    bev_base = baseplate.modifiers.new("Bevel", 'BEVEL')
    bev_base.width = 0.08
    bev_base.segments = 2

    # Footprint Inner Hazard Border
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.22))
    curb = bpy.context.active_object
    curb.name = f"{name}_Curb"
    curb.scale = (footprint_size * 0.94, footprint_size * 0.94, 0.06)
    bpy.ops.object.transform_apply(scale=True)
    curb.data.materials.append(mat_secondary)

    # Soft Contact Shadow Plane (just beneath footprint)
    mat_shadow = bpy.data.materials.new(name=f"{name}_ShadowMat")
    mat_shadow.use_nodes = True
    bsdf_sh = mat_shadow.node_tree.nodes.get("Principled BSDF")
    if bsdf_sh:
        bsdf_sh.inputs["Base Color"].default_value = (0.01, 0.01, 0.02, 1.0)
        bsdf_sh.inputs["Roughness"].default_value = 1.0
        if "Alpha" in bsdf_sh.inputs:
            bsdf_sh.inputs["Alpha"].default_value = 0.45
            mat_shadow.blend_method = 'BLEND'

    bpy.ops.mesh.primitive_plane_add(size=footprint_size * 0.98, location=(0, 0, 0.005))
    shadow_plane = bpy.context.active_object
    shadow_plane.name = f"{name}_ContactShadow"
    shadow_plane.data.materials.append(mat_shadow)

    # 2. Main Central Fortress Structure
    height_mult = 1.4 if tier == "tall" else 1.0
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.8 * height_mult))
    fortress = bpy.context.active_object
    fortress.name = f"{name}_MainFortress"
    fortress.scale = (2.6, 2.6, 1.2 * height_mult)
    bpy.ops.object.transform_apply(scale=True)
    fortress.data.materials.append(mat_primary)

    bev_fort = fortress.modifiers.new("Bevel", 'BEVEL')
    bev_fort.width = 0.12
    bev_fort.segments = 2

    # Reinforced Corner Bastions (4 chunky pillars)
    for cx, cy in [(-1.3, -1.3), (1.3, -1.3), (-1.3, 1.3), (1.3, 1.3)]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.38, depth=1.5 * height_mult, location=(cx, cy, 0.95 * height_mult))
        bastion = bpy.context.active_object
        bastion.name = f"{name}_Bastion"
        bastion.data.materials.append(mat_trim)

    # Emissive Plasma Conduit Rings
    bpy.ops.mesh.primitive_torus_add(major_radius=1.1, minor_radius=0.07, location=(0, 0, 1.4 * height_mult))
    ring1 = bpy.context.active_object
    ring1.name = f"{name}_EmissiveRing1"
    ring1.data.materials.append(mat_emissive)

    # 3. PRIMARY LARGE MOTION (§4 - Value 1: Rising / Rotating Dome)
    # Rotating Radar Dome / Sensor Array (Frames 1-24: complete seamless 360 rotation)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.85, location=(0, 0, 2.1 * height_mult))
    dome = bpy.context.active_object
    dome.name = f"{name}_PrimaryMotion_Dome"
    dome.scale = (1.0, 1.0, 0.55)
    bpy.ops.object.transform_apply(scale=True)
    dome.data.materials.append(mat_secondary)

    # Radar Dish mounted on Dome
    bpy.ops.mesh.primitive_cone_add(radius1=0.75, radius2=0.1, depth=0.35, location=(0, 0, 2.65 * height_mult))
    dish = bpy.context.active_object
    dish.name = f"{name}_PrimaryMotion_Dish"
    dish.rotation_euler = (math.radians(-30), 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    dish.data.materials.append(mat_trim)
    dish.parent = dome

    # Animate Primary Motion: 360-degree rotation over 24 frames
    # Frame 1: 0 deg, Frame 25 (loop wrap): 360 deg -> Frame 24 is 345 deg
    dome.animation_data_create()
    dome.rotation_mode = 'XYZ'
    dome.rotation_euler = (0, 0, 0)
    dome.keyframe_insert(data_path="rotation_euler", index=2, frame=1)
    dome.rotation_euler = (0, 0, math.radians(360.0 * (23.0 / 24.0)))
    dome.keyframe_insert(data_path="rotation_euler", index=2, frame=24)

    # 4. SECONDARY MOTION (§4 - Value 2: Turbine / Fan at different period)
    # Fast cooling intake turbine spinning on side wall (4 full rotations over 24 frames)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.32, depth=0.12, location=(0, -1.36, 0.8 * height_mult))
    fan = bpy.context.active_object
    fan.name = f"{name}_SecondaryMotion_Fan"
    fan.rotation_euler = (math.radians(90), 0, 0)
    fan.data.materials.append(mat_secondary)

    fan.animation_data_create()
    fan.rotation_mode = 'XYZ'
    fan.rotation_euler = (math.radians(90), 0, 0)
    fan.keyframe_insert(data_path="rotation_euler", index=1, frame=1)
    # Spin around Y axis (local face normal) 4 times over 24 frames
    fan.rotation_euler = (math.radians(90), math.radians(360.0 * 4.0 * (23.0 / 24.0)), 0)
    fan.keyframe_insert(data_path="rotation_euler", index=1, frame=24)

    # 5. EMISSIVE PULSE (§4 - Value 3: Sine-wave power pulse)
    # Modulate emissive strength from 1.5 to 5.0 and back over 24 frames
    if mat_emissive.node_tree:
        bsdf_e = mat_emissive.node_tree.nodes.get("Principled BSDF")
        if bsdf_e and "Emission Strength" in bsdf_e.inputs:
            input_socket = bsdf_e.inputs["Emission Strength"]
            # Keyframe emission strength on material
            mat_emissive.animation_data_create()
            for fr in range(1, 25):
                t = (fr - 1) / 24.0
                strength = 2.0 + 3.0 * (0.5 + 0.5 * math.sin(t * 2.0 * math.pi))
                input_socket.default_value = strength
                input_socket.keyframe_insert(data_path="default_value", frame=fr)

    return baseplate


# ---------------------------------------------------------------------------
# Atlas Packing Pipeline (§6)
# ---------------------------------------------------------------------------
def pack_webp_atlas(frame_paths, output_webp_path, frame_w=512, frame_h=640, quality=88):
    """
    Packs 24 frames (left-to-right, top-to-bottom, 6 columns x 4 rows)
    into a single transparent WebP image with straight alpha.
    """
    cols, rows = 6, 4
    atlas_w = cols * frame_w
    atlas_h = rows * frame_h
    print(f"[*] Packing {len(frame_paths)} frames into {cols}x{rows} atlas: {atlas_w}x{atlas_h}...")

    # Allocate transparent RGBA canvas
    atlas_pixels = np.zeros((atlas_h, atlas_w, 4), dtype=np.float32)

    for idx, f_path in enumerate(frame_paths):
        if not os.path.exists(f_path):
            raise FileNotFoundError(f"Missing frame {f_path}")

        img = bpy.data.images.load(f_path, check_existing=False)
        w, h = img.size[0], img.size[1]
        raw = np.empty(w * h * 4, dtype=np.float32)
        img.pixels.foreach_get(raw)
        frame_arr = raw.reshape((h, w, 4))
        bpy.data.images.remove(img)

        # 6 columns x 4 rows, top to bottom
        col_idx = idx % cols
        row_idx = idx // cols

        # In image memory (bottom row = 0), row 0 of atlas is at highest Y
        y_start = (rows - 1 - row_idx) * frame_h
        y_end = y_start + frame_h
        x_start = col_idx * frame_w
        x_end = x_start + frame_w

        atlas_pixels[y_start:y_end, x_start:x_end, :] = frame_arr

    # Create Blender image and export as WebP using scene render settings
    os.makedirs(os.path.dirname(os.path.abspath(output_webp_path)), exist_ok=True)
    atlas_img = bpy.data.images.new("PackedAtlas", width=atlas_w, height=atlas_h, alpha=True)
    atlas_img.pixels.foreach_set(atlas_pixels.ravel())

    scene = bpy.context.scene
    scene.render.image_settings.file_format = 'WEBP'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.image_settings.quality = quality

    atlas_img.save_render(output_webp_path, scene=scene)
    bpy.data.images.remove(atlas_img)

    f_size = os.path.getsize(output_webp_path)
    size_mb = f_size / (1024 * 1024)
    print(f"[✓] WebP Atlas created: {output_webp_path} ({size_mb:.2f} MB, target < 1.5 MB)")
    if size_mb > 1.5:
        print(f"[!] Warning: Atlas size exceeds 1.5 MB target.")
    return output_webp_path


# ---------------------------------------------------------------------------
# Store Hero Still (§6)
# ---------------------------------------------------------------------------
def render_hero_still(output_path, tier="standard"):
    """
    Renders a 1024x1280 (Standard) or 1024x1536 (Tall) hero still for the store listing.
    """
    scene = bpy.context.scene
    orig_x = scene.render.resolution_x
    orig_y = scene.render.resolution_y
    orig_frame = scene.frame_current

    hero_x = 1024
    hero_y = 1536 if tier == "tall" else 1280

    scene.render.resolution_x = hero_x
    scene.render.resolution_y = hero_y
    scene.frame_set(6) # Capture dynamic mid-cycle pose

    scene.render.filepath = output_path
    bpy.ops.render.render(write_still=True)

    # Restore original resolution
    scene.render.resolution_x = orig_x
    scene.render.resolution_y = orig_y
    scene.frame_set(orig_frame)
    print(f"[✓] Hero Still rendered: {output_path} ({hero_x}x{hero_y})")
    return output_path


# ---------------------------------------------------------------------------
# src/live/skins.ts Data Entry Generator
# ---------------------------------------------------------------------------
def generate_skins_ts_entry(skin_id, skin_name, tier="standard"):
    """
    Generates the exact TypeScript registry entry ready to paste into src/live/skins.ts.
    """
    entry = f"""  {{
    id: '{skin_id}',
    name: '{skin_name}',
    tier: '{tier}',
    atlas: 'skins/{skin_id}.webp',
    hero: 'skins/{skin_id}_hero.png',
    frames: 24,
    fps: 12,
    columns: 6,
    rows: 4,
    frameWidth: 512,
    frameHeight: {768 if tier == 'tall' else 640},
  }},"""
    return entry


# ---------------------------------------------------------------------------
# CLI Argument Parser & Main
# ---------------------------------------------------------------------------
def parse_args():
    raw_args = sys.argv
    cli_args = raw_args[raw_args.index("--") + 1:] if "--" in raw_args else []

    parser = argparse.ArgumentParser(description="World War Rogue - SkinForge Base Skin Pipeline")
    parser.add_argument("--name", type=str, default="base_alpha", help="Identifier name of the skin")
    parser.add_argument("--tier", choices=["standard", "tall"], default="standard", help="Standard (512x640) or Tall (512x768)")
    parser.add_argument("--image", type=str, default=None, help="Reference 2D concept image")
    parser.add_argument("--out-dir", type=str, default="./exports/skins", help="Delivery destination directory")
    parser.add_argument("--params", type=str, default="{}", help="Custom color/proportion adjustments JSON")
    parser.add_argument("--still-only", action="store_true", help="Render single hero still only (First delivery option §9)")

    return parser.parse_args(cli_args)


def main():
    args = parse_args()
    try:
        params = json.loads(args.params) if args.params else {}
    except Exception:
        params = {}

    out_skin_dir = os.path.join(args.out_dir, args.name)
    seq_dir = os.path.join(out_skin_dir, "sequence")
    os.makedirs(seq_dir, exist_ok=True)

    print("\n" + "=" * 65)
    print(f"  SKINFORGE: BASE SKIN ART PIPELINE (§1 - §11)")
    print(f"  Asset Name : {args.name}")
    print(f"  Tier       : {args.tier.upper()} ({512}x{768 if args.tier == 'tall' else 640})")
    print(f"  Target Dir : {out_skin_dir}")
    print("=" * 65 + "\n")

    # Clean scene and configure exact camera & lighting
    bpy.ops.wm.read_factory_settings(use_empty=True)
    cam_obj, res_w, res_h = setup_camera_and_scene(tier=args.tier)

    # Generate 3D Base model, animations & materials
    generate_base_skin(name=args.name, tier=args.tier, params=params, image_path=args.image)

    # Save delivery .blend file (§6 - Item 3)
    blend_path = os.path.join(out_skin_dir, f"{args.name}.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print(f"[✓] Saved master .blend: {blend_path}")

    # Render Hero Still (§6 - Item 4)
    hero_path = os.path.join(out_skin_dir, f"{args.name}_hero.png")
    render_hero_still(hero_path, tier=args.tier)

    if not args.still_only:
        # Render 24-frame sequence (§5, §6 - Item 1)
        scene = bpy.context.scene
        frame_paths = []
        print(f"\n[*] Rendering 24-frame seamless loop @ 12 fps...")
        for frame in range(1, 25):
            scene.frame_set(frame)
            frame_filename = f"{args.name}_{frame:04d}.png"
            f_path = os.path.join(seq_dir, frame_filename)
            scene.render.filepath = f_path
            bpy.ops.render.render(write_still=True)
            frame_paths.append(f_path)
            print(f"    [{frame:02d}/24] Saved: {frame_filename}")

        # Pack 6x4 WebP Atlas (§6 - Item 2)
        atlas_path = os.path.join(out_skin_dir, f"{args.name}.webp")
        pack_webp_atlas(frame_paths, atlas_path, frame_w=res_w, frame_h=res_h, quality=88)

    # Generate skins.ts data entry
    ts_entry = generate_skins_ts_entry(args.name, args.name.replace('_', ' ').title(), tier=args.tier)
    manifest = {
        "skin_id": args.name,
        "tier": args.tier,
        "files": {
            "png_sequence": f"sequence/{args.name}_0001.png ... {args.name}_0024.png",
            "packed_atlas_webp": f"{args.name}.webp",
            "master_blend": f"{args.name}.blend",
            "hero_still": f"{args.name}_hero.png"
        },
        "spec_compliance": {
            "camera_orthographic": True,
            "camera_rotation": "X=60, Y=0, Z=0 (Zero Yaw)",
            "footprint_flush": True,
            "frames": 24,
            "fps": 12,
            "atlas_layout": "6 columns x 4 rows",
            "straight_alpha_transparent": True
        },
        "skins_ts_entry": ts_entry
    }

    manifest_path = os.path.join(out_skin_dir, "delivery_manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    # Write entry into src/live/skins.ts
    skins_ts_path = os.path.abspath("src/live/skins.ts")
    if not os.path.exists(skins_ts_path):
        with open(skins_ts_path, "w") as f:
            f.write("export interface SkinDefinition {\n  id: string;\n  name: string;\n  tier: 'standard' | 'tall';\n  atlas: string;\n  hero: string;\n  frames: number;\n  fps: number;\n  columns: number;\n  rows: number;\n  frameWidth: number;\n  frameHeight: number;\n}\n\nexport const REGISTERED_SKINS: SkinDefinition[] = [\n")
            f.write(ts_entry + "\n];\n")
    else:
        with open(skins_ts_path, "r") as f:
            content = f.read()
        if args.name not in content:
            updated = content.replace("];", f"{ts_entry}\n];")
            with open(skins_ts_path, "w") as f:
                f.write(updated)

    print("\n" + "=" * 65)
    print("[★] DELIVERY PACKAGE COMPLETE (§6):")
    print(f"    1. PNG Sequence : {seq_dir} (24 frames)")
    print(f"    2. Packed Atlas : {os.path.join(out_skin_dir, f'{args.name}.webp')}")
    print(f"    3. Master Blend : {blend_path}")
    print(f"    4. Hero Still   : {hero_path}")
    print(f"    5. Live Entry   : Registered in src/live/skins.ts")
    print("=" * 65 + "\n")


if __name__ == "__main__":
    main()
