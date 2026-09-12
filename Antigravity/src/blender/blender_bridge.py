"""
blender_bridge.py - Unified CLI Bridge for Headless Blender Execution.
Entrypoint invoked by Blender:
  blender.exe -b [file.blend] -P blender_bridge.py -- [args]
"""

import argparse
import json
import os
import sys

# Ensure local blender module path is importable
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

import bpy
from mesh_builder import build_humanoid_base_mesh, build_relief_mesh_from_image
from material_pbr import create_pbr_material
from armature_rig import build_armature, attach_mesh_to_armature, synthesize_animations
from preview_renderer import render_preview_stills, render_turntable_frames
from skin_refiner import apply_refinements
from skin_exporter import export_game_assets


def parse_args():
    # Everything after '--' is user arguments
    raw_args = sys.argv
    if "--" in raw_args:
        cli_args = raw_args[raw_args.index("--") + 1:]
    else:
        cli_args = []

    parser = argparse.ArgumentParser(description="Blender SkinForge Engine")
    parser.add_argument("--action", choices=["create", "refine", "render", "export"], required=True)
    parser.add_argument("--image", type=str, default=None, help="Path to 2D reference image")
    parser.add_argument("--name", type=str, default="skin_asset", help="Asset identifier name")
    parser.add_argument("--type", choices=["character", "relief", "prop"], default="character")
    parser.add_argument("--params", type=str, default="{}", help="JSON string or file path containing parameters")
    parser.add_argument("--out-blend", type=str, default=None, help="Path to save project .blend file")
    parser.add_argument("--out-dir", type=str, default="./exports", help="Output directory for renders or exports")
    parser.add_argument("--turntable", action="store_true", help="Also render turntable motion frame sequence")

    return parser.parse_args(cli_args)


def load_params(param_str):
    if not param_str:
        return {}
    if os.path.exists(param_str):
        with open(param_str, "r") as f:
            return json.load(f)
    try:
        return json.loads(param_str)
    except Exception:
        return {}


def main():
    args = parse_args()
    params = load_params(args.params)
    print(f"\n=======================================================")
    print(f"[*] Blender SkinForge - Action: {args.action.upper()}")
    print(f"[*] Asset: {args.name} | Archetype: {args.type}")
    print(f"=======================================================\n")

    if args.action == "create":
        # Reset scene to clean slate
        bpy.ops.wm.read_factory_settings(use_empty=True)

        if args.type == "character":
            # 1. Build Base Mesh
            mesh_obj = build_humanoid_base_mesh(f"{args.name}_Mesh", params)

            # 2. Build Armature Rig
            arm_obj = build_armature(
                f"{args.name}_Rig",
                scale_height=float(params.get("height_scale", 1.0)),
                bulk=float(params.get("bulk", 1.0)),
                shoulder_w=float(params.get("shoulder_width", 1.0))
            )

            # 3. Attach mesh to armature
            attach_mesh_to_armature(mesh_obj, arm_obj)

            # 4. Synthesize Animations
            synthesize_animations(arm_obj)

            # 5. Apply Material
            mat = create_pbr_material(f"{args.name}_Material", args.image, params)
            mesh_obj.data.materials.append(mat)

        else:
            # Relief / Prop / Vehicle mode
            if args.image and os.path.exists(args.image):
                mesh_obj = build_relief_mesh_from_image(args.image, f"{args.name}_Mesh", params)
            else:
                mesh_obj = build_humanoid_base_mesh(f"{args.name}_Mesh", params)

            mat = create_pbr_material(f"{args.name}_Material", args.image, params)
            mesh_obj.data.materials.append(mat)

        # Save project .blend
        if args.out_blend:
            os.makedirs(os.path.dirname(os.path.abspath(args.out_blend)), exist_ok=True)
            bpy.ops.wm.save_as_mainfile(filepath=args.out_blend)
            print(f"[✓] Project saved to: {args.out_blend}")

        # Render preview stills
        preview_dir = args.out_dir
        render_preview_stills(preview_dir, base_name=args.name)
        if args.turntable:
            render_turntable_frames(preview_dir, base_name=args.name)

    elif args.action == "refine":
        # Refine active or loaded blend file
        apply_refinements(params)

        if args.out_blend:
            bpy.ops.wm.save_as_mainfile(filepath=args.out_blend)
            print(f"[✓] Refined project saved to: {args.out_blend}")

        # Re-render updated preview stills
        render_preview_stills(args.out_dir, base_name=args.name)

    elif args.action == "render":
        render_preview_stills(args.out_dir, base_name=args.name)
        if args.turntable:
            render_turntable_frames(args.out_dir, base_name=args.name)

    elif args.action == "export":
        manifest = export_game_assets(args.out_dir, skin_name=args.name)
        print(f"\n[★] Export complete: {manifest['files']}")

    print("\n[✓] SkinForge operation completed successfully.")


if __name__ == "__main__":
    main()
